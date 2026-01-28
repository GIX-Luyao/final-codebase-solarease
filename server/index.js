/* Simple proxy server to call OpenAI API securely from local dev.
   IMPORTANT: Do NOT commit your API key. Create a `.env` file in the project root with
   OPENAI_API_KEY=sk-...

   Run with: `node server/index.js` (or `npm run api` if you add the script)
*/
const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')
const { spawn } = require('child_process')
const { Pool } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const app = express()
app.use(cors())
app.use(express.json())

// Add cache-busting headers to prevent browser caching issues
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

const OPENAI_KEY = process.env.OPENAI_API_KEY
if(!OPENAI_KEY){
  console.warn('Warning: OPENAI_API_KEY not set in environment. Create .env with OPENAI_API_KEY=sk-...')
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({ 
        model: 'gpt-4o-mini',
        messages: [systemPrompt, ...messages],
        max_tokens: 500,
        temperature: 0.7
      })
    })
    
    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
    res.json({ result: text })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Simple AI endpoint for quick explanations (legacy)
app.post('/api/ai', async (req, res) => {
  try{
    const prompt = req.body.prompt || ''
    const context = req.body.context || 'solar energy analysis'
    
    const systemPrompt = `You are a helpful solar energy analyst. Provide clear, concise explanations about ${context}. Keep responses focused and practical.`
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({ 
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })
    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content || JSON.stringify(data)
    res.json({ result: text })
  }catch(err){
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
    
    // Call Python solver (use arch -arm64 to ensure arm64 python is used on Apple Silicon)
    const python = spawn('arch', ['-arm64', 'python3', '-c', `
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
      if (code !== 0) {
        console.error('Python error:', errorOutput)
        return res.status(500).json({ error: 'Nash solver failed', details: errorOutput })
      }
      
      try {
        const result = JSON.parse(output)
        res.json(result)
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse solver output', details: output })
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

const PORT = process.env.PORT || 3000
app.listen(PORT, ()=> console.log(`API proxy listening on http://localhost:${PORT}`))
