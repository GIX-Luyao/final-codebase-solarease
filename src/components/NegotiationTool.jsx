import React, { useState } from 'react'
import './NegotiationTool.css'

export default function NegotiationTool() {
  const [participants, setParticipants] = useState([
    { name: '', address: '', annual_generation_kwh: '', energy_price_per_kwh: 0.12, upfront_cost: '' },
    { name: '', address: '', annual_generation_kwh: '', energy_price_per_kwh: 0.12, upfront_cost: '' }
  ])
  
  const [ppaPrice, setPpaPrice] = useState(0.15)
  const [ppaTerm, setPpaTerm] = useState(20)
  const [sharedCosts, setSharedCosts] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiExplanation, setAiExplanation] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  function addParticipant() {
    setParticipants([...participants, { 
      name: '', 
      address: '', 
      annual_generation_kwh: '', 
      energy_price_per_kwh: 0.12, 
      upfront_cost: '' 
    }])
  }

  function removeParticipant(index) {
    if (participants.length > 2) {
      setParticipants(participants.filter((_, i) => i !== index))
    }
  }

  function updateParticipant(index, field, value) {
    const updated = [...participants]
    updated[index][field] = value
    setParticipants(updated)
  }

  async function runNegotiation() {
    // Validate inputs
    const validParticipants = participants.filter(p => 
      p.annual_generation_kwh && p.upfront_cost
    )
    
    if (validParticipants.length < 2) {
      alert('Please provide at least 2 participants with complete data (annual generation and upfront cost)')
      return
    }

    setLoading(true)
    setResult(null)
    setShowAI(false)
    setAiExplanation('')

    try {
      const payload = {
        participants: validParticipants.map(p => ({
          name: p.name || 'Unnamed',
          address: p.address || '',
          annual_generation_kwh: parseFloat(p.annual_generation_kwh) || 0,
          energy_price_per_kwh: parseFloat(p.energy_price_per_kwh) || 0.12,
          upfront_cost: parseFloat(p.upfront_cost) || 0,
          discount_rate: 0.06,
          years: 25
        })),
        ppa_price: parseFloat(ppaPrice),
        ppa_term: parseInt(ppaTerm),
        shared_costs: parseFloat(sharedCosts) || 0
      }

      const res = await fetch('http://localhost:3000/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Negotiation failed')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function generateAIExplanation() {
    if (!result || !result.participants) return
    
    setAiLoading(true)
    try {
      const participantSummary = result.participants.map(p => 
        `${p.name}: gets $${Math.round(p.allocation/1000)}K (${Math.round(p.gain/1000)}K more than going solo)`
      ).join(', ')
      
      const prompt = `You're Soli from SolarEase. Explain this Nash Bargaining result in a friendly, conversational way (under 120 words):

${participantSummary}
Total surplus: $${Math.round(result.total_surplus/1000)}K from ${ppaTerm}yr PPA

Tell them why this split is fair and how everyone wins by cooperating. Be encouraging and personal. No headers, no hashtags, no bullet points - just 2-3 short paragraphs.`
      
      const res = await fetch('http://localhost:3000/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          context: 'Nash Bargaining negotiation for community solar PPA'
        })
      })
      
      const data = await res.json()
      setAiExplanation(data.result || 'No explanation available')
      setShowAI(true)
    } catch (err) {
      setAiExplanation('Error generating explanation: ' + err.message)
      setShowAI(true)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <section className="negotiation-tool">
      <div className="negotiation-inner">
        {/* Left panel: Inputs */}
        <div className="nego-left">
          <div className="nego-panel">
            <div className="panel-head">
              <h3 className="panel-title">Participants</h3>
              <button className="add-btn" onClick={addParticipant}>+ Add</button>
            </div>

            <div className="participants-list">
              {participants.map((p, i) => (
                <div className="participant-card" key={i}>
                  <div className="card-head">
                    <span className="card-num">#{i + 1}</span>
                    {participants.length > 2 && (
                      <button className="remove-btn" onClick={() => removeParticipant(i)}>×</button>
                    )}
                  </div>
                  
                  <div className="input-row">
                    <label>Name</label>
                    <input 
                      type="text" 
                      placeholder="Household name"
                      value={p.name}
                      onChange={(e) => updateParticipant(i, 'name', e.target.value)}
                    />
                  </div>
                  
                  <div className="input-row">
                    <label>Address</label>
                    <input 
                      type="text" 
                      placeholder="123 Main St"
                      value={p.address}
                      onChange={(e) => updateParticipant(i, 'address', e.target.value)}
                    />
                  </div>
                  
                  <div className="input-grid">
                    <div className="input-row">
                      <label>Annual Generation (kWh)</label>
                      <input 
                        type="number" 
                        placeholder="12000"
                        value={p.annual_generation_kwh}
                        onChange={(e) => updateParticipant(i, 'annual_generation_kwh', e.target.value)}
                      />
                    </div>
                    
                    <div className="input-row">
                      <label>Upfront Cost ($)</label>
                      <input 
                        type="number" 
                        placeholder="15000"
                        value={p.upfront_cost}
                        onChange={(e) => updateParticipant(i, 'upfront_cost', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="input-row">
                    <label>Energy Price ($/kWh)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={p.energy_price_per_kwh}
                      onChange={(e) => updateParticipant(i, 'energy_price_per_kwh', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PPA Terms */}
          <div className="nego-panel">
            <h3 className="panel-title">Cooperative Deal Terms</h3>
            
            <div className="input-grid-2">
              <div className="input-row">
                <label>PPA Price ($/kWh)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={ppaPrice}
                  onChange={(e) => setPpaPrice(e.target.value)}
                />
              </div>
              
              <div className="input-row">
                <label>PPA Term (years)</label>
                <input 
                  type="number"
                  value={ppaTerm}
                  onChange={(e) => setPpaTerm(e.target.value)}
                />
              </div>
              
              <div className="input-row">
                <label>Shared Costs ($)</label>
                <input 
                  type="number"
                  value={sharedCosts}
                  onChange={(e) => setSharedCosts(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button className="run-nego-btn" onClick={runNegotiation} disabled={loading}>
            {loading ? 'Computing...' : 'Run Nash Bargaining'}
          </button>
        </div>

        {/* Right panel: Results */}
        <div className="nego-right">
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Computing fair allocation...</p>
            </div>
          )}

          {result && !loading && (
            <>
              {result.error ? (
                <div className="error-box">
                  <h3>Error</h3>
                  <p>{result.error}</p>
                </div>
              ) : (
                <>
                  <div className="results-header">
                    <h3 className="results-title">Fair Allocation</h3>
                    <div className="surplus-badge">
                      Total Surplus: ${result.total_surplus?.toFixed(0).toLocaleString()}
                    </div>
                  </div>

                  <div className="allocations-list">
                    {result.participants?.map((p, i) => (
                      <div className="alloc-card" key={i}>
                        <div className="alloc-head">
                          <div className="alloc-name">{p.name}</div>
                          <div className="alloc-value">${p.allocation.toFixed(0).toLocaleString()}</div>
                        </div>
                        
                        <div className="alloc-details">
                          <div className="detail-row">
                            <span className="detail-label">Fallback (Threat Point)</span>
                            <span className="detail-value">${p.threat_point.toFixed(0).toLocaleString()}</span>
                          </div>
                          
                          <div className="detail-row gain-row">
                            <span className="detail-label">Gain from Cooperation</span>
                            <span className="detail-value gain">${p.gain.toFixed(0).toLocaleString()}</span>
                          </div>
                          
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${Math.min(100, (p.allocation / result.total_surplus) * 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        {p.address && <div className="alloc-address">{p.address}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="ai-section">
                    <button className="ai-btn" onClick={generateAIExplanation} disabled={aiLoading}>
                      {aiLoading ? 'Generating...' : 'Explain Fairness with AI'}
                    </button>
                    
                    {showAI && aiExplanation && (
                      <div className="ai-explanation">
                        <div className="ai-label">💡 Soli's Take on Fairness</div>
                        <div className="ai-content">
                          {aiExplanation.split('\n').map((line, i) => {
                            const cleanLine = line.replace(/###|##|#/g, '').trim();
                            return cleanLine && <p key={i}>{cleanLine}</p>
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {!result && !loading && (
            <div className="empty-state">
              <h3>No Results Yet</h3>
              <p>Add participants and run Nash Bargaining to see fair allocations</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
