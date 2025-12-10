/* Simple proxy server to call OpenAI API securely from local dev.
   IMPORTANT: Do NOT commit your API key. Create a `.env` file in the project root with
   OPENAI_API_KEY=sk-...

   Run with: `node server/index.js` (or `npm run api` if you add the script)
*/
const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')
const { spawn } = require('child_process')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const OPENAI_KEY = process.env.OPENAI_API_KEY
if(!OPENAI_KEY){
  console.warn('Warning: OPENAI_API_KEY not set in environment. Create .env with OPENAI_API_KEY=sk-...')
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

const PORT = process.env.PORT || 3000
app.listen(PORT, ()=> console.log(`API proxy listening on http://localhost:${PORT}`))
