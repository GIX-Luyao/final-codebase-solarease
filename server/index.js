/* Simple proxy server to call OpenAI/Azure OpenAI API securely from local dev.
   IMPORTANT: Do NOT commit your API key. Create a `.env` file in the project root.

   For OpenAI:
   OPENAI_API_KEY=sk-...

   For Azure OpenAI (takes priority if configured):
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_KEY=your-azure-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_OPENAI_API_VERSION=2024-02-15-preview

   Run with: `node server/index.js` (or `npm run api` if you add the script)
*/
const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { spawn } = require('child_process')
const { Pool } = require('pg')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const fs = require('fs').promises
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// Import routes
const authRoutes = require('./routes/auth')
const contractRoutes = require('./routes/contracts')

// Import evaluation harness
const evaluation = require('./evaluation')

// Configure multer for file uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF and TXT files are allowed.'))
    }
  }
})

const app = express()

// CORS configuration with credentials support
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(cookieParser())
app.use(express.json())

// Add cache-busting headers to prevent browser caching issues
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

// Mount auth and contract routes
app.use('/api/auth', authRoutes)
app.use('/api/contracts', contractRoutes)

// OpenAI configuration
const OPENAI_KEY = process.env.OPENAI_API_KEY

// Azure OpenAI configuration
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_KEY = process.env.AZURE_OPENAI_KEY
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'

// Determine which provider to use
const useAzure = AZURE_ENDPOINT && AZURE_KEY && AZURE_DEPLOYMENT

if (useAzure) {
  console.log('Using Azure OpenAI Services')
  console.log(`  Endpoint: ${AZURE_ENDPOINT}`)
  console.log(`  Deployment: ${AZURE_DEPLOYMENT}`)
} else if (OPENAI_KEY) {
  console.log('Using OpenAI API')
} else {
  console.warn('Warning: No AI provider configured. Set either OPENAI_API_KEY or Azure OpenAI environment variables.')
}

// Helper function to call OpenAI or Azure OpenAI
async function callAI(messages, options = {}) {
  const {
    maxTokens = 500,
    temperature = 0.7
  } = options

  if (useAzure) {
    // Azure OpenAI API
    const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_KEY
      },
      body: JSON.stringify({
        messages,
        max_tokens: maxTokens,
        temperature
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Azure API error: ${response.status}`)
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content
  } else {
    // Standard OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content
  }
}

// Mock contract data for demo when database is not available
const mockContracts = [
  {
    id: 1,
    user_id: 1,
    filename: 'Community_Solar_PPA_2024.pdf',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    user_id: 1,
    filename: 'Residential_Solar_Agreement.pdf',
    created_at: '2024-01-10T14:20:00Z'
  }
];

// Database connection with fallback
let pool = null;
let dbConnected = false;

async function initializeDatabase() {
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'solarease-db.postgres.database.azure.com',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'solarease',
      user: process.env.DB_USER || 'solarease_admin',
      password: process.env.DB_PASSWORD || 'SolarEase2024!',
      ssl: { rejectUnauthorized: false }
    };

    pool = new Pool(dbConfig);
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    dbConnected = true;
    console.log('✓ Connected to PostgreSQL database');
    
    // Create tables
    await createTables();
    
  } catch (err) {
    console.log('⚠️  Database not available, using mock data for demo');
    dbConnected = false;
  }
}

// Initialize database
initializeDatabase();

// Create contracts table
async function createTables() {
  if (!dbConnected) return;
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        filename VARCHAR(255),
        file_data TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert sample data if table is empty
    const result = await pool.query('SELECT COUNT(*) FROM contracts');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO contracts (user_id, filename, file_data) VALUES
        (1, 'Community_Solar_PPA_2024.pdf', 'Sample PPA contract content'),
        (1, 'Residential_Solar_Agreement.pdf', 'Sample residential agreement')
      `);
      console.log('✓ Sample contract data inserted');
    }
  } catch (err) {
    console.error('Database setup error:', err.message);
  }
}

// Chat endpoint with conversational context
app.post('/api/chat', async (req, res) => {
  try {
    const messages = req.body.messages || []

    const systemPrompt = {
      role: 'system',
      content: `You are Soli, a friendly and knowledgeable solar energy assistant for SolarEase, a community solar platform. Your role is to help communities and individuals understand solar energy investments, ROI calculations, community solar projects, Power Purchase Agreements (PPAs), and negotiation strategies.

Key responsibilities:
- Explain solar energy concepts in simple, accessible language
- Help users understand ROI, NPV, IRR, and payback periods
- Guide users on community solar vs individual solar benefits
- Explain PPA terms and negotiation strategies
- Provide information about solar incentives and policies
- Encourage collective action and community empowerment
- Be encouraging and supportive of sustainable energy transitions

Tone: Friendly, professional, encouraging, and informative. Keep responses concise (2-3 paragraphs max) unless more detail is specifically requested.

Do not provide financial advice or make guarantees about returns. Always encourage users to consult with qualified professionals for specific decisions.`
    }

    const text = await callAI([systemPrompt, ...messages], { maxTokens: 500, temperature: 0.7 })
    res.json({ result: text || 'Sorry, I could not generate a response.' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Simple AI endpoint for quick explanations (legacy)
app.post('/api/ai', async (req, res) => {
  try {
    const prompt = req.body.prompt || ''
    const context = req.body.context || 'solar energy analysis'

    const systemPrompt = `You are a helpful solar energy analyst. Provide clear, concise explanations about ${context}. Keep responses focused and practical.`

    const text = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], { maxTokens: 500, temperature: 0.7 })

    res.json({ result: text || 'No response generated.' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Enhanced AI agent endpoint with personalization and context
app.post('/api/enhanced-chat', async (req, res) => {
  try {
    const { message, systemPrompt, conversationHistory, userProfile, contextualData } = req.body;
    
    // Build enhanced context for the AI
    let enhancedSystemPrompt = systemPrompt;
    
    // Add contextual awareness
    if (contextualData.roiData) {
      enhancedSystemPrompt += `\n\nUser's Current ROI Analysis:
- Location: ${contextualData.roiData.location}
- System Size: ${contextualData.roiData.systemSize}kW
- Cost: $${contextualData.roiData.cost?.toLocaleString()}
- Payback: ${contextualData.roiData.paybackPeriod} years
Use this data to provide specific, relevant advice.`;
    }
    
    if (contextualData.negotiations.length > 0) {
      const lastNeg = contextualData.negotiations[contextualData.negotiations.length - 1];
      enhancedSystemPrompt += `\n\nUser's Recent Negotiation:
- Participants: ${lastNeg.participantCount}
- Total Value: $${lastNeg.totalValue?.toLocaleString()}
Reference this experience when discussing negotiations or community solar.`;
    }
    
    enhancedSystemPrompt += `\n\nPersonalization Rules:
- User has had ${userProfile.interactions} interactions with you
- Preferred style: ${userProfile.preferences.communicationStyle}
- Detail preference: ${userProfile.preferences.detailLevel}
- Interested topics: ${userProfile.preferences.topics.join(', ') || 'general solar topics'}

Remember: You're Soli, an AI agent, not just an API. Be proactive, suggest tools, and help users take next steps. If relevant, encourage them to try the ROI Simulator or Negotiation Tool.`;

    // Build conversation with enhanced context
    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...conversationHistory.slice(-10), // Last 10 messages for context
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({ 
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 600,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });
    
    const data = await response.json();
    const aiResponse = data?.choices?.[0]?.message?.content || 'I apologize, but I encountered an issue. How can I help you with solar energy today?';
    
    // Generate contextual suggestions
    const suggestions = generateContextualSuggestions(message, userProfile, contextualData);
    
    // Generate follow-up questions
    const followUps = generateFollowUps(message, aiResponse, userProfile);
    
    res.json({ 
      result: aiResponse,
      suggestions,
      followUps
    });
    
  } catch (err) {
    console.error('Enhanced chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to generate contextual suggestions
function generateContextualSuggestions(userMessage, userProfile, contextualData) {
  const suggestions = [];
  const lowerMessage = userMessage.toLowerCase();
  
  // ROI-focused suggestions
  if (lowerMessage.includes('roi') || lowerMessage.includes('cost') || lowerMessage.includes('return')) {
    if (!contextualData.roiData) {
      suggestions.push("Calculate your ROI");
    } else {
      suggestions.push("Compare community vs individual solar");
    }
  }
  
  // Community solar suggestions
  if (lowerMessage.includes('community') || lowerMessage.includes('together') || lowerMessage.includes('group')) {
    suggestions.push("Try the Negotiation Tool");
    if (contextualData.roiData) {
      suggestions.push("Analyze community benefits for your location");
    }
  }
  
  // Location-based suggestions
  if (lowerMessage.includes('washington') || lowerMessage.includes('quincy') || lowerMessage.includes('wenatchee')) {
    suggestions.push("View location-specific incentives");
    suggestions.push("See successful local projects");
  }
  
  // If no specific suggestions, provide general ones based on user profile
  if (suggestions.length === 0) {
    if (userProfile.preferences.topics.includes('ROI')) {
      suggestions.push("Update your ROI calculation");
    }
    if (userProfile.preferences.topics.includes('community_solar')) {
      suggestions.push("Find community partners");
    }
    suggestions.push("Explore Washington state incentives");
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

// Helper function to generate follow-up questions
function generateFollowUps(userMessage, aiResponse, userProfile) {
  const followUps = [];
  const lowerMessage = userMessage.toLowerCase();
  
  // Based on user experience level
  if (userProfile.interactions < 3) {
    followUps.push("What other solar topics interest you?");
  }
  
  // Based on message content
  if (lowerMessage.includes('cost') && !lowerMessage.includes('roi')) {
    followUps.push("Would you like to see a detailed ROI breakdown?");
  }
  
  if (lowerMessage.includes('community') && userProfile.interactions > 2) {
    followUps.push("Are you ready to start building a community solar group?");
  }
  
  // Default follow-ups
  if (followUps.length === 0) {
    followUps.push("Would you like to explore this topic further?");
    followUps.push("Can I help you with any calculations?");
  }
  
  return followUps.slice(0, 2);
}

// Nash Bargaining negotiation endpoint
app.post('/api/negotiate', async (req, res) => {
  try {
    const { participants, ppa_price, ppa_term, shared_costs = 0, weights = null } = req.body

    // Validate inputs
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ error: 'At least 2 participants required' })
    }

    // Prepare data for Python solver
    const inputData = {
      participants,
      ppa_price: ppa_price || 0.15,
      ppa_term: ppa_term || 20,
      shared_costs: shared_costs || 0,
      weights: weights || null
    }

    // Determine Python command based on platform
    const isWindows = process.platform === 'win32'
    const pythonCmd = isWindows ? 'python' : 'python3'

    // Call Python solver
    const python = spawn(pythonCmd, ['-c', `
import sys
import json
from server.nash_solver import nash_bargaining_solver, compute_threat_point, compute_cooperative_surplus

# Read input from stdin
input_data = json.loads(sys.stdin.read())

participants = input_data['participants']
ppa_price = input_data['ppa_price']
ppa_term = input_data['ppa_term']
shared_costs = input_data['shared_costs']
weights = input_data.get('weights')

# Compute threat points for each participant
threat_points = []
for p in participants:
    threat_point = compute_threat_point(
        annual_generation_kwh=p.get('annual_generation_kwh', 0),
        energy_price_per_kwh=p.get('energy_price_per_kwh', 0.12),
        upfront_cost=p.get('upfront_cost', 0),
        discount_rate=p.get('discount_rate', 0.06),
        years=p.get('years', 25)
    )
    threat_points.append(threat_point)

# Compute cooperative surplus
total_surplus = compute_cooperative_surplus(participants, ppa_price, ppa_term, shared_costs)

# Solve Nash Bargaining
result = nash_bargaining_solver(threat_points, total_surplus, weights)

# Add participant metadata
result['participants'] = [
    {
        'name': p.get('name', f'Participant {i+1}'),
        'address': p.get('address', ''),
        'annual_generation_kwh': p.get('annual_generation_kwh', 0),
        'threat_point': threat_points[i],
        'allocation': result['allocations'][i] if 'allocations' in result else threat_points[i],
        'gain': result['gains'][i] if 'gains' in result else 0
    }
    for i, p in enumerate(participants)
]

print(json.dumps(result))
`])

    let output = ''
    let errorOutput = ''
    let responded = false

    // Handle spawn errors (e.g., Python not found)
    python.on('error', (err) => {
      if (responded) return
      responded = true
      console.error('Python spawn error:', err.message)
      // Fall back to JavaScript calculation
      const jsResult = calculateNashLocally(inputData)
      res.json(jsResult)
    })

    python.stdout.on('data', (data) => {
      output += data.toString()
    })

    python.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    // Send input data to Python process
    python.stdin.write(JSON.stringify(inputData))
    python.stdin.end()

    python.on('close', (code) => {
      if (responded) return
      responded = true

      if (code !== 0) {
        console.error('Python error:', errorOutput)
        // Fall back to JavaScript calculation
        const jsResult = calculateNashLocally(inputData)
        res.json(jsResult)
        return
      }

      try {
        const result = JSON.parse(output)
        res.json(result)
      } catch (e) {
        // Fall back to JavaScript calculation
        const jsResult = calculateNashLocally(inputData)
        res.json(jsResult)
      }
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Contracts endpoint to fetch user contracts from database
app.get('/api/contracts', async (req, res) => {
  try {
    const userId = req.query.userId || '1';

    if (dbConnected) {
      // First, try to create the contracts table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contracts (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          filename VARCHAR(255),
          content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          file_size INTEGER,
          contract_type VARCHAR(100)
        )
      `);

      // Insert sample data if table is empty
      const countResult = await pool.query('SELECT COUNT(*) FROM contracts WHERE user_id = $1', [userId]);
      if (parseInt(countResult.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO contracts (user_id, filename, content, file_size, contract_type) VALUES
          ($1, 'SolarCity_PPA_Agreement_2026.pdf', 'Sample PPA contract content', 2456, 'PPA'),
          ($1, 'Community_Solar_Terms.pdf', 'Community solar agreement terms', 1834, 'Community Solar'),
          ($1, 'Residential_Lease_Agreement.pdf', 'Solar panel lease agreement', 3124, 'Lease')
        `, [userId]);
      }

      const query = 'SELECT * FROM contracts WHERE user_id = $1 ORDER BY created_at DESC';
      const result = await pool.query(query, [userId]);

      res.json({
        contracts: result.rows,
        count: result.rowCount,
        source: 'database'
      });
    } else {
      // Use mock data when database is not available
      res.json({
        contracts: mockContracts.filter(c => c.user_id.toString() === userId),
        count: mockContracts.filter(c => c.user_id.toString() === userId).length,
        source: 'mock'
      });
    }

  } catch (err) {
    console.error('Database query error:', err);
    // Fallback to mock data on any error
    res.json({
      contracts: mockContracts.filter(c => c.user_id.toString() === (req.query.userId || '1')),
      count: mockContracts.filter(c => c.user_id.toString() === (req.query.userId || '1')).length,
      source: 'mock_fallback'
    });
  }
});

// Get specific contract by ID
app.get('/api/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.query.userId || '1';

    const query = 'SELECT * FROM contracts WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [contractId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({
      error: 'Failed to fetch contract',
      details: err.message
    });
  }
});

// ADMIN API ENDPOINTS - For demonstrating live database operations
// Database status endpoint
app.get('/api/admin/database-status', async (req, res) => {
  try {
    if (!dbConnected && !pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Test database with simple query
    const result = await pool.query(`
      SELECT
        version() as version,
        current_timestamp as current_time,
        pg_database_size(current_database()) as database_size,
        current_database() as database_name
    `);

    const status = result.rows[0];

    res.json({
      host: 'solarease-db.postgres.database.azure.com',
      port: 5432,
      database: status.database_name,
      version: status.version,
      current_time: status.current_time,
      database_size: parseInt(status.database_size),
      connected: true
    });
  } catch (err) {
    console.error('Database status error:', err);
    res.status(500).json({
      error: 'Database query failed',
      details: err.message,
      connected: false
    });
  }
});

// Admin contracts endpoint - full CRUD operations
app.get('/api/admin/contracts', async (req, res) => {
  try {
    if (!dbConnected && !pool) {
      return res.json({
        contracts: mockContracts,
        source: 'mock',
        error: 'Database not connected, using mock data'
      });
    }

    const result = await pool.query(`
      SELECT id, user_id, filename, content, contract_type, created_at,
             LENGTH(content) as content_length
      FROM contracts
      ORDER BY created_at DESC
    `);

    res.json({
      contracts: result.rows,
      count: result.rowCount,
      source: 'database'
    });
  } catch (err) {
    console.error('Admin contracts query error:', err);
    // Fallback to mock data
    res.json({
      contracts: mockContracts,
      count: mockContracts.length,
      source: 'mock_fallback',
      error: err.message
    });
  }
});

// Add new contract (admin)
app.post('/api/admin/contracts', async (req, res) => {
  try {
    const { user_id, filename, content, contract_type } = req.body;

    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const result = await pool.query(`
      INSERT INTO contracts (user_id, filename, content, contract_type)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [user_id, filename, content || '', contract_type || 'PPA']);

    res.json({
      success: true,
      contract: result.rows[0],
      message: 'Contract inserted successfully'
    });
  } catch (err) {
    console.error('Admin contract insert error:', err);
    res.status(500).json({
      error: 'Failed to insert contract',
      details: err.message
    });
  }
});

// Delete contract (admin)
app.delete('/api/admin/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const result = await pool.query(`
      DELETE FROM contracts WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({
      success: true,
      deleted_id: result.rows[0].id,
      message: 'Contract deleted successfully'
    });
  } catch (err) {
    console.error('Admin contract delete error:', err);
    res.status(500).json({
      error: 'Failed to delete contract',
      details: err.message
    });
  }
});

// JavaScript fallback for Nash Bargaining calculation
function calculateNashLocally(inputData) {
  const { participants, ppa_price, ppa_term, shared_costs, weights } = inputData

  // Calculate threat points (standalone NPV for each participant)
  const threatPoints = participants.map(p => {
    const annualGeneration = p.annual_generation_kwh || 0
    const energyPrice = p.energy_price_per_kwh || 0.12
    const upfrontCost = p.upfront_cost || 0
    const discountRate = p.discount_rate || 0.06
    const years = p.years || 25

    // Simple NPV calculation
    const annualRevenue = annualGeneration * energyPrice
    let npv = -upfrontCost
    for (let y = 1; y <= years; y++) {
      npv += annualRevenue / Math.pow(1 + discountRate, y)
    }
    return Math.max(0, npv)
  })

  // Calculate total cooperative value
  const totalGeneration = participants.reduce((sum, p) => sum + (p.annual_generation_kwh || 0), 0)
  const totalCooperativeValue = totalGeneration * ppa_price * ppa_term - (shared_costs || 0)

  // Calculate surplus
  const totalThreatPoints = threatPoints.reduce((sum, tp) => sum + tp, 0)
  const surplus = Math.max(0, totalCooperativeValue - totalThreatPoints)

  // Nash Bargaining: divide surplus according to weights (default equal)
  const effectiveWeights = weights || participants.map(() => 1)
  const totalWeight = effectiveWeights.reduce((sum, w) => sum + w, 0)

  const allocations = threatPoints.map((tp, i) => {
    const weight = effectiveWeights[i] || 1
    const surplusShare = (weight / totalWeight) * surplus
    return tp + surplusShare
  })

  const gains = allocations.map((alloc, i) => alloc - threatPoints[i])

  return {
    allocations,
    gains,
    total_surplus: surplus,
    total_value: totalCooperativeValue,
    participants: participants.map((p, i) => ({
      name: p.name || `Participant ${i + 1}`,
      address: p.address || '',
      annual_generation_kwh: p.annual_generation_kwh || 0,
      threat_point: threatPoints[i],
      allocation: allocations[i],
      gain: gains[i]
    }))
  }
}

// Contract analysis endpoint
app.post('/api/analyze-contract', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    let contractText = ''

    // Extract text from PDF or read TXT directly
    if (req.file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer)
        contractText = pdfData.text
        console.log(`PDF parsed: ${pdfData.numpages} pages, ${contractText.length} chars`)
      } catch (pdfErr) {
        console.error('PDF parsing error:', pdfErr.message)
        return res.status(400).json({ error: 'Could not parse PDF. Please ensure the file is not corrupted or password-protected.' })
      }
    } else {
      contractText = req.file.buffer.toString('utf-8')
    }

    if (!contractText || contractText.trim().length < 100) {
      return res.status(400).json({ error: 'Contract appears to be empty or too short to analyze.' })
    }

    // Truncate very long contracts to fit within token limits
    const maxChars = 15000
    if (contractText.length > maxChars) {
      contractText = contractText.substring(0, maxChars) + '\n\n[Contract text truncated for analysis...]'
    }

    const systemPrompt = `You are an expert legal analyst specializing in Power Purchase Agreements (PPAs) for solar energy projects. Analyze contracts and provide clear, accurate information to help community members understand their agreements.

CRITICAL: For every risk flag, you MUST include an "evidence" field containing an EXACT quote from the contract that supports the risk. This quote must appear verbatim in the contract text.

Always respond with valid JSON in this exact format:
{
  "summary": "A 2-3 sentence plain-language overview of what this agreement means",
  "keyTerms": {
    "parties": { "buyer": "name or 'Not specified'", "seller": "name or 'Not specified'" },
    "termLength": "duration or 'Not specified'",
    "capacity": "system size or 'Not specified'",
    "pricePerKwh": "price or 'Not specified'",
    "escalationRate": "rate or 'Not specified'",
    "performanceGuarantee": "guarantee or 'Not specified'",
    "omResponsibility": "who maintains or 'Not specified'",
    "terminationClause": "terms or 'Not specified'"
  },
  "riskFlags": [
    {
      "severity": "high|medium|low",
      "term": "Name of concerning term",
      "issue": "Brief explanation of why this is flagged",
      "section": "Section reference if found",
      "evidence": "EXACT quote from the contract supporting this risk flag"
    }
  ]
}

Risk severity guidelines:
- HIGH: Terms that could result in significant financial loss or legal liability (e.g., very high escalation rates >3%, one-sided termination clauses, missing performance guarantees)
- MEDIUM: Terms that are less favorable than typical but not severely problematic (e.g., escalation rates 2-3%, limited warranty periods)
- LOW: Minor concerns or areas that could be improved (e.g., vague language, missing but non-critical details)

IMPORTANT RULES:
1. Every risk flag MUST have an "evidence" field with an exact quote from the contract
2. If you cannot find exact supporting text for a risk, do NOT include that risk
3. The evidence must be long enough to be meaningful (at least a full clause or sentence)
4. Do not paraphrase - copy the exact text from the contract`

    const userPrompt = `Analyze this PPA contract and extract key terms and risk flags. Remember: every risk flag MUST include an exact "evidence" quote from the contract.

---CONTRACT TEXT---
${contractText}
---END CONTRACT---

Provide your analysis as JSON.`

    const aiResponse = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 2000, temperature: 0.3 })

    if (!aiResponse) {
      return res.status(500).json({ error: 'Failed to get analysis from AI' })
    }

    // Parse the JSON response from AI
    let analysis
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      let jsonStr = aiResponse
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }
      analysis = JSON.parse(jsonStr.trim())
    } catch (parseErr) {
      console.error('Failed to parse AI response:', aiResponse)
      return res.status(500).json({ error: 'Failed to parse contract analysis' })
    }

    // Add disclaimer
    analysis.disclaimer = 'This analysis is informational only, not legal advice. Consult a qualified attorney for final decisions regarding any contract.'
    analysis.fileName = req.file.originalname

    res.json(analysis)

  } catch (err) {
    console.error('Contract analysis error:', err)
    if (err.message?.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message })
    }
    res.status(500).json({ error: 'Failed to analyze contract: ' + err.message })
  }
})

// ============================================================================
// EVALUATION HARNESS ENDPOINTS
// ============================================================================

/**
 * Run evaluation on a contract with multiple sampling runs.
 * POST /api/evaluate-contract
 *
 * Body (multipart/form-data):
 * - contract: PDF or TXT file
 * - sampleCount: Number of runs (default: 5)
 * - temperature: LLM temperature (default: 0.3)
 *
 * Returns: Full evaluation report (JSON)
 */
app.post('/api/evaluate-contract', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    let contractText = ''

    // Extract text from PDF or read TXT directly
    if (req.file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer)
        contractText = pdfData.text
      } catch (pdfErr) {
        return res.status(400).json({ error: 'Could not parse PDF.' })
      }
    } else {
      contractText = req.file.buffer.toString('utf-8')
    }

    if (!contractText || contractText.trim().length < 100) {
      return res.status(400).json({ error: 'Contract appears to be empty or too short.' })
    }

    // Parse options from body
    const sampleCount = parseInt(req.body.sampleCount) || 5
    const parsedTemp = parseFloat(req.body.temperature)
    const temperature = isNaN(parsedTemp) ? 0.3 : parsedTemp

    // Parse sentinel options
    let sentinel = null // null = auto-detect
    if (req.body.sentinel === 'true') sentinel = true
    else if (req.body.sentinel === 'false') sentinel = false
    const sentinelSpec = req.body.sentinelSpec || null

    console.log(`Starting evaluation: ${sampleCount} samples, temp=${temperature}`)

    // Run evaluation
    const result = await evaluation.runEvaluation(callAI, contractText, {
      sampleCount,
      temperature,
      sentinel,
      sentinelSpec,
      onProgress: (progress) => {
        console.log(`Evaluation progress: ${progress.completed}/${progress.total}`)
      }
    })

    // Return the full report
    res.json({
      evaluationId: result.evaluationId,
      quickSummary: result.quickSummary,
      ciOutput: result.ciOutput,
      report: result.jsonReport
    })

  } catch (err) {
    console.error('Evaluation error:', err)
    res.status(500).json({ error: 'Evaluation failed: ' + err.message })
  }
})

/**
 * Compare two evaluations for regression detection.
 * POST /api/compare-evaluations
 *
 * Body (JSON):
 * - baseline: Baseline evaluation JSON report
 * - current: Current evaluation JSON report
 *
 * Returns: Regression comparison results
 */
app.post('/api/compare-evaluations', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { baseline, current } = req.body

    if (!baseline || !current) {
      return res.status(400).json({ error: 'Both baseline and current evaluations required' })
    }

    const regressionResults = evaluation.runRegressionComparison(baseline, current)

    res.json({
      overallStatus: regressionResults.overallStatus,
      failCount: regressionResults.failCount,
      warnCount: regressionResults.warnCount,
      results: regressionResults.results,
      comparison: regressionResults.comparison
    })

  } catch (err) {
    console.error('Comparison error:', err)
    res.status(500).json({ error: 'Comparison failed: ' + err.message })
  }
})

/**
 * Get human-readable report for an evaluation.
 * POST /api/evaluation-report
 *
 * Body (JSON):
 * - evaluation: Evaluation JSON report
 * - format: 'text' | 'json' (default: 'text')
 *
 * Returns: Formatted report
 */
app.post('/api/evaluation-report', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { evaluation: evalReport, format = 'text' } = req.body

    if (!evalReport) {
      return res.status(400).json({ error: 'Evaluation report required' })
    }

    if (format === 'text') {
      const textReport = evaluation.reporter.generateHumanReadableReport(evalReport)
      res.type('text/plain').send(textReport)
    } else {
      res.json(evalReport)
    }

  } catch (err) {
    console.error('Report generation error:', err)
    res.status(500).json({ error: 'Report generation failed: ' + err.message })
  }
})

/**
 * Quick single-run analysis with hallucination check.
 * POST /api/analyze-contract-with-check
 *
 * Same as /api/analyze-contract but includes hallucination detection.
 */
app.post('/api/analyze-contract-with-check', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    let contractText = ''

    if (req.file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer)
        contractText = pdfData.text
      } catch (pdfErr) {
        return res.status(400).json({ error: 'Could not parse PDF.' })
      }
    } else {
      contractText = req.file.buffer.toString('utf-8')
    }

    if (!contractText || contractText.trim().length < 100) {
      return res.status(400).json({ error: 'Contract appears to be empty or too short.' })
    }

    // Truncate if needed
    const maxChars = 15000
    if (contractText.length > maxChars) {
      contractText = contractText.substring(0, maxChars) + '\n\n[Contract text truncated...]'
    }

    // Run single analysis using the evaluation sampler (with evidence requirement)
    const result = await evaluation.sampler.runSingleAnalysis(callAI, contractText, {
      maxTokens: 2000,
      temperature: 0.3
    })

    // Check for hallucinations
    const hallucinationCheck = evaluation.hallucination.detectAllHallucinations(result, contractText)

    // Add disclaimer and filename
    result.disclaimer = 'This analysis is informational only, not legal advice.'
    result.fileName = req.file.originalname

    res.json({
      ...result,
      _evaluation: {
        hallucinationCheck: {
          hasHallucinations: hallucinationCheck.hasHallucinations,
          hallucinationCount: hallucinationCheck.hallucinationCount,
          details: hallucinationCheck.detections.filter(d => d.isHallucination)
        }
      }
    })

  } catch (err) {
    console.error('Analysis error:', err)
    res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
})

// Multer error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' })
    }
    return res.status(400).json({ error: err.message })
  }
  next(err)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, ()=> console.log(`API proxy listening on http://localhost:${PORT}`))
