import React, { useState, useEffect } from 'react'
import './NegotiationTool.css'
import SolarAIAgent from '../lib/SolarAIAgent'
import { API_URL } from '../config'

export default function NegotiationTool() {
  const [aiAgent] = useState(() => new SolarAIAgent());
  const [smartRecommendations, setSmartRecommendations] = useState([]);
  const [showAutoFill, setShowAutoFill] = useState(false);
  
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

  // Initialize smart features
  useEffect(() => {
    const recommendations = aiAgent.getContextualRecommendations('negotiation-tool');
    setSmartRecommendations(recommendations);
    
    const autoData = aiAgent.shouldAutoCalculate();
    if (autoData.autoNegotiation && autoData.prefillData.name) {
      setShowAutoFill(true);
    }
    
    // Listen for navigation from ROI tool
    const handleROINavigation = (event) => {
      if (event.detail.fromROI) {
        handleAutoFillFromROI(event.detail.roiData);
      }
    };
    
    window.addEventListener('navigateToNegotiation', handleROINavigation);
    return () => window.removeEventListener('navigateToNegotiation', handleROINavigation);
  }, []);

  // Auto-fill from ROI data
  function handleAutoFillFromROI(roiData) {
    if (!roiData) return;
    
    const prefillData = aiAgent.getSmartPreFillData();
    const estimatedParticipants = Math.min(4, Math.max(2, Math.round(roiData.estimatedRooftops / 30))); // Estimate participants
    
    // Create participants based on ROI analysis
    const newParticipants = [];
    for (let i = 0; i < estimatedParticipants; i++) {
      newParticipants.push({
        name: i === 0 && prefillData.name ? prefillData.name : '',
        address: i === 0 && prefillData.address ? prefillData.address : '',
        annual_generation_kwh: roiData.averageSystemSize * 1200, // kWh/year estimate
        energy_price_per_kwh: 0.12,
        upfront_cost: roiData.averageSystemSize * roiData.costPerKW
      });
    }
    
    setParticipants(newParticipants);
    
    // Show smart suggestion
    setSmartRecommendations(prev => [{
      type: 'auto-fill',
      message: `I've set up a ${estimatedParticipants}-participant negotiation based on your ${roiData.location} ROI analysis!`,
      action: 'review-setup'
    }, ...prev]);
    
    aiAgent.trackInteraction('auto_fill_from_roi', { participantCount: estimatedParticipants });
  }

  // Handle smart auto-fill
  function handleAutoFill() {
    const prefillData = aiAgent.getSmartPreFillData();
    
    if (prefillData.name || prefillData.systemSize) {
      const updatedParticipants = [...participants];
      
      // Fill first participant with user data
      if (prefillData.name) updatedParticipants[0].name = prefillData.name;
      if (prefillData.address) updatedParticipants[0].address = prefillData.address;
      if (prefillData.annualGeneration) updatedParticipants[0].annual_generation_kwh = prefillData.annualGeneration;
      if (prefillData.upfrontCost) updatedParticipants[0].upfront_cost = prefillData.upfrontCost;
      
      setParticipants(updatedParticipants);
    }
    
    setShowAutoFill(false);
    aiAgent.trackInteraction('auto_fill_used', { type: 'negotiation_tool' });
  }

  // Handle smart recommendation actions
  function handleSmartAction(recommendation) {
    if (recommendation.action === 'auto-fill-negotiation') {
      handleAutoFill();
    } else if (recommendation.action === 'smart-participant-suggestion') {
      // Add suggested number of participants
      while (participants.length < 4) {
        addParticipant();
      }
    } else if (recommendation.action === 'review-setup') {
      // Just dismiss the recommendation
      setSmartRecommendations(prev => prev.filter(r => r !== recommendation));
    }
    
    aiAgent.trackInteraction('smart_action_used', { 
      action: recommendation.action,
      type: recommendation.type 
    });
  }
  
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

      const res = await fetch(`${API_URL}/api/negotiate`, {
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
      // Enhanced AI explanation with more context
      const participantSummary = result.participants.map(p => 
        `${p.name}: receives $${Math.round(p.allocation/1000)}K (${Math.round(p.gain/1000)}K gain from cooperation)`
      ).join('; ')
      
      // Store negotiation context for AI agent
      const negotiationContext = {
        participants: result.participants,
        totalSurplus: result.total_surplus,
        ppaPrice: ppaPrice,
        ppaTerm: ppaTerm,
        participantCount: result.participants.length,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('soli_negotiation_context', JSON.stringify(negotiationContext));
      
      const enhancedPrompt = `You're Soli, the personalized solar energy agent from SolarEase. 

The user just completed a Nash Bargaining negotiation with these results:
${participantSummary}
Total cooperative surplus: $${Math.round(result.total_surplus/1000)}K over ${ppaTerm} years
PPA price: $${ppaPrice}/kWh

Context for personalization:
- This user has shown interest in community solar and fair allocation
- They successfully used our negotiation tool with ${result.participants.length} participants
- Focus on why this specific result is fair and beneficial

Your response should:
1. Congratulate them on running a successful negotiation
2. Explain why the Nash solution is optimal and fair
3. Highlight the specific benefits of their cooperation vs going solo
4. Encourage next steps (like finding more community members or moving forward)

Keep it conversational, encouraging, and under 150 words. Be specific to their numbers but avoid being too technical. Show that you understand their situation personally.`
      
      const res = await fetch(`${API_URL}/api/enhanced-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Explain my Nash bargaining results`,
          systemPrompt: enhancedPrompt,
          conversationHistory: [],
          userProfile: JSON.parse(localStorage.getItem('soli_user_profile') || '{}'),
          contextualData: { 
            negotiations: [negotiationContext],
            roiData: JSON.parse(localStorage.getItem('soli_roi_context') || 'null')
          }
        })
      })
      
      const data = await res.json()
      setAiExplanation(data.result || 'Congratulations on running a successful Nash bargaining negotiation! This solution ensures everyone benefits fairly from cooperation.')
      setShowAI(true)
      
      // Track this interaction
      window.dispatchEvent(new CustomEvent('aiExplanationGenerated', { 
        detail: { type: 'negotiation', context: negotiationContext }
      }));
      
    } catch (err) {
      setAiExplanation('Great job on your negotiation! The Nash bargaining solution ensures everyone gets a fair share of the cooperative benefits. Each participant receives more than they would going alone, making this a win-win situation.')
      setShowAI(true)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <section className="negotiation-tool">
      <div className="negotiation-inner">
        {/* Smart Recommendations */}
        {(smartRecommendations.length > 0 || showAutoFill) && (
          <div className="smart-recommendations">
            <div className="smart-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Soli's Negotiation Insights
            </div>
            
            {showAutoFill && (
              <div className="smart-suggestion auto-fill">
                <p>I can pre-fill your participant info from your profile!</p>
                <div className="suggestion-actions">
                  <button className="use-autofill" onClick={handleAutoFill}>
                    Auto-Fill My Info
                  </button>
                  <button className="dismiss-autofill" onClick={() => setShowAutoFill(false)}>
                    Not now
                  </button>
                </div>
              </div>
            )}
            
            {smartRecommendations.map((rec, i) => (
              <div key={i} className={`smart-suggestion ${rec.type}`}>
                <p>{rec.message}</p>
                {rec.action && (
                  <button 
                    className="suggestion-action"
                    onClick={() => handleSmartAction(rec)}
                  >
                    {rec.action.replace('auto-fill-', '').replace('-', ' ')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
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
