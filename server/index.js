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
const { spawn } = require('child_process')
const multer = require('multer')
const pdfParse = require('pdf-parse')
require('dotenv').config()

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
app.use(cors())
app.use(express.json())

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
      "section": "Section reference if found"
    }
  ]
}

Risk severity guidelines:
- HIGH: Terms that could result in significant financial loss or legal liability (e.g., very high escalation rates >3%, one-sided termination clauses, missing performance guarantees)
- MEDIUM: Terms that are less favorable than typical but not severely problematic (e.g., escalation rates 2-3%, limited warranty periods)
- LOW: Minor concerns or areas that could be improved (e.g., vague language, missing but non-critical details)`

    const userPrompt = `Analyze this PPA contract and extract key terms and risk flags:

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
