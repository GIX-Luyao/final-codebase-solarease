import React, { useState } from 'react'
import './Step6Results.css'
import SummaryCard from '../shared/SummaryCard'
import { API_URL } from '../../../config'

export default function Step6Results({
  participants,
  roiData,
  threatPoints,
  cooperativeValue,
  ppaConfig,
  nashResults,
  aiSummary,
  setAiSummary,
  onBack
}) {
  const [aiLoading, setAiLoading] = useState(false)

  const generateAISummary = async () => {
    setAiLoading(true)
    try {
      const participantSummary = nashResults?.participants?.map(p =>
        `${p.name}: gets $${Math.round(p.allocation / 1000)}K (${Math.round(p.gain / 1000)}K more than going solo)`
      ).join(', ')

      const prompt = `You're Soli from SolarEase. Write a friendly summary of this community solar ROI analysis (under 150 words):

${participants.length} households participating in a ${ppaConfig.ppaTerm}-year PPA at $${ppaConfig.ppaPrice}/kWh.

Nash Bargaining Results:
${participantSummary}

Total cooperative value: $${Math.round(nashResults?.total_value / 1000)}K
Surplus created: $${Math.round(nashResults?.total_surplus / 1000)}K

Explain why this is a good deal for everyone, celebrate the cooperation benefits, and give 2 quick tips for moving forward. Be encouraging! No headers, no hashtags, just natural paragraphs.`

      const res = await fetch(`${API_URL}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: 'Community solar ROI calculator results summary'
        })
      })

      if (!res.ok) throw new Error('AI request failed')

      const data = await res.json()
      setAiSummary(data.result || 'Summary generated successfully.')
    } catch (err) {
      setAiSummary(`Great news! Your community solar project shows excellent potential. By working together, all ${participants.length} participants will receive more value than going it alone. The Nash Bargaining solution ensures everyone gets a fair share based on their contributions. Consider scheduling a community meeting to discuss next steps and reach out to local solar installers for quotes.`)
    } finally {
      setAiLoading(false)
    }
  }

  const exportResults = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      participants: participants.map((p, i) => ({
        name: p.name || `Participant ${i + 1}`,
        address: p.address,
        annualUsage: p.annualUsage,
        roofArea: p.roofArea,
        roi: roiData[i],
        threatPoint: threatPoints[i]?.threatPoint,
        allocation: nashResults?.participants?.[i]?.allocation,
        gain: nashResults?.participants?.[i]?.gain
      })),
      ppaConfig,
      cooperativeValue,
      nashResults,
      aiSummary
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roi-analysis-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const headers = ['Name', 'Address', 'Annual Usage (kWh)', 'System Size (kW)', 'Threat Point ($)', 'Allocation ($)', 'Gain ($)', 'Share (%)']

    const rows = participants.map((p, i) => {
      const allocation = nashResults?.participants?.[i]?.allocation || 0
      const totalAllocation = nashResults?.participants?.reduce((sum, np) => sum + np.allocation, 0) || 1
      return [
        p.name || `Participant ${i + 1}`,
        p.address || '',
        p.annualUsage || 0,
        roiData[i]?.systemSize?.toFixed(1) || 0,
        Math.round(threatPoints[i]?.threatPoint || 0),
        Math.round(allocation),
        Math.round(nashResults?.participants?.[i]?.gain || 0),
        ((allocation / totalAllocation) * 100).toFixed(1)
      ]
    })

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roi-analysis-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalAllocation = nashResults?.participants?.reduce((sum, p) => sum + p.allocation, 0) || 0

  return (
    <div className="step-container step-6">
      <div className="step-header">
        <h2 className="step-title">Analysis Complete</h2>
        <p className="step-subtitle">
          Review your community solar ROI analysis, get an AI-powered summary, and export results.
        </p>
      </div>

      <div className="step-6-content">
        {/* Summary Cards */}
        <div className="results-summary-grid">
          <SummaryCard
            title="Participants"
            value={participants.length}
            subtitle="Community members"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />

          <SummaryCard
            title="PPA Term"
            value={`${ppaConfig.ppaTerm} yrs`}
            subtitle={`@ $${ppaConfig.ppaPrice}/kWh`}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          />

          <SummaryCard
            title="Total Value"
            value={`$${Math.round(totalAllocation).toLocaleString()}`}
            subtitle="Cooperative value"
            variant="highlight"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />

          <SummaryCard
            title="Surplus Created"
            value={`$${Math.round(nashResults?.total_surplus || 0).toLocaleString()}`}
            subtitle="Extra value from cooperation"
            variant="success"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            }
          />
        </div>

        {/* Allocation Table */}
        <div className="allocation-table-section">
          <h3 className="section-title">Final Allocations</h3>

          <div className="allocation-table">
            <div className="table-header">
              <div className="table-col">#</div>
              <div className="table-col name">Name</div>
              <div className="table-col">Threat Point</div>
              <div className="table-col">Allocation</div>
              <div className="table-col">Gain</div>
              <div className="table-col">Share</div>
            </div>

            {nashResults?.participants?.map((p, i) => {
              const sharePct = totalAllocation > 0
                ? ((p.allocation / totalAllocation) * 100).toFixed(1)
                : 0

              return (
                <div className="table-row" key={i}>
                  <div className="table-col num">{i + 1}</div>
                  <div className="table-col name">{p.name}</div>
                  <div className="table-col">${Math.round(p.threat_point).toLocaleString()}</div>
                  <div className="table-col allocation">${Math.round(p.allocation).toLocaleString()}</div>
                  <div className="table-col gain">+${Math.round(p.gain).toLocaleString()}</div>
                  <div className="table-col share">{sharePct}%</div>
                </div>
              )
            })}

            <div className="table-footer">
              <div className="table-col">&nbsp;</div>
              <div className="table-col name">Total</div>
              <div className="table-col">
                ${Math.round(threatPoints.reduce((sum, tp) => sum + (tp.threatPoint || 0), 0)).toLocaleString()}
              </div>
              <div className="table-col allocation">${Math.round(totalAllocation).toLocaleString()}</div>
              <div className="table-col gain">+${Math.round(nashResults?.total_surplus || 0).toLocaleString()}</div>
              <div className="table-col share">100%</div>
            </div>
          </div>
        </div>

        {/* AI Summary Section */}
        <div className="ai-summary-section">
          <div className="ai-header">
            <h3 className="section-title">AI Analysis</h3>
            <button
              className="ai-generate-btn"
              onClick={generateAISummary}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <span className="spinner-small" />
                  Generating...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  {aiSummary ? 'Regenerate' : 'Generate AI Summary'}
                </>
              )}
            </button>
          </div>

          {aiSummary && (
            <div className="ai-summary-content">
              <div className="ai-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              </div>
              <div className="ai-text">
                <div className="ai-name">Soli's Summary</div>
                {aiSummary.split('\n').map((line, i) => {
                  const cleanLine = line.replace(/###|##|#/g, '').trim()
                  return cleanLine && <p key={i}>{cleanLine}</p>
                })}
              </div>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="export-section">
          <h3 className="section-title">Export Results</h3>
          <div className="export-buttons">
            <button className="export-btn" onClick={exportCSV}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download CSV
            </button>
            <button className="export-btn" onClick={exportResults}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download JSON
            </button>
          </div>
        </div>
      </div>

      <div className="step-navigation">
        <button className="nav-btn back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <div className="finish-message">
          Analysis complete! Export your results above.
        </div>
      </div>
    </div>
  )
}
