import React, { useEffect, useMemo } from 'react'
import './Step3ThreatPoints.css'
import SummaryCard from '../shared/SummaryCard'

export default function Step3ThreatPoints({
  participants,
  roiData,
  threatPoints,
  setThreatPoints,
  onNext,
  onBack
}) {
  // Calculate threat points (standalone values) from ROI data
  const calculatedThreatPoints = useMemo(() => {
    return roiData.map(roi => ({
      participantId: roi.participantId,
      participantName: roi.participantName,
      // Threat point = NPV of going alone (25-year standalone value)
      threatPoint: roi.npv || 0,
      // Alternative metric: just annual savings * years
      annualSavings: roi.annualSavings || 0,
      totalValue25yr: roi.totalValue25yr || 0,
      systemSize: roi.systemSize || 0
    }))
  }, [roiData])

  // Update parent state
  useEffect(() => {
    setThreatPoints(calculatedThreatPoints)
  }, [calculatedThreatPoints, setThreatPoints])

  // Totals
  const totalThreatPoints = calculatedThreatPoints.reduce(
    (sum, tp) => sum + tp.threatPoint,
    0
  )

  const totalAnnualSavings = calculatedThreatPoints.reduce(
    (sum, tp) => sum + tp.annualSavings,
    0
  )

  // Get max for visualization
  const maxThreatPoint = Math.max(...calculatedThreatPoints.map(tp => tp.threatPoint), 1)

  return (
    <div className="step-container step-3">
      <div className="step-header">
        <h2 className="step-title">Nash Threat Points</h2>
        <p className="step-subtitle">
          The threat point (or disagreement point) represents each participant's fallback value
          if they choose not to cooperate. This is their standalone solar investment NPV.
        </p>
      </div>

      <div className="step-3-content">
        {/* Explanation Card */}
        <div className="threat-explanation">
          <div className="explanation-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="explanation-content">
            <h4>What is a Threat Point?</h4>
            <p>
              In Nash Bargaining, the threat point (also called BATNA - Best Alternative To Negotiated Agreement)
              is the value each party can achieve without cooperation. Participants will only accept
              a cooperative deal if it gives them <strong>more</strong> than their threat point.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="threat-summary-grid">
          <SummaryCard
            title="Total Threat Points"
            value={`$${Math.round(totalThreatPoints).toLocaleString()}`}
            subtitle="Combined standalone NPV"
            variant="warning"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />

          <SummaryCard
            title="Combined Annual Savings"
            value={`$${totalAnnualSavings.toLocaleString()}`}
            subtitle="If everyone goes alone"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />

          <SummaryCard
            title="Participants"
            value={calculatedThreatPoints.length}
            subtitle="Each with standalone value"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
        </div>

        {/* Threat Points Visualization */}
        <div className="threat-visual-section">
          <h3 className="section-title">Threat Point Breakdown</h3>

          <div className="threat-bars">
            {calculatedThreatPoints.map((tp, index) => {
              const pct = maxThreatPoint > 0 ? (tp.threatPoint / maxThreatPoint) * 100 : 0
              const shareOfTotal = totalThreatPoints > 0
                ? ((tp.threatPoint / totalThreatPoints) * 100).toFixed(1)
                : 0

              return (
                <div className="threat-bar-item" key={tp.participantId}>
                  <div className="threat-bar-header">
                    <div className="threat-bar-name">
                      <span className="tp-num">#{index + 1}</span>
                      {tp.participantName}
                    </div>
                    <div className="threat-bar-value">
                      ${Math.round(tp.threatPoint).toLocaleString()}
                      <span className="share-badge">{shareOfTotal}%</span>
                    </div>
                  </div>

                  <div className="threat-bar-track">
                    <div
                      className="threat-bar-fill"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>

                  <div className="threat-bar-details">
                    <span>System: {tp.systemSize.toFixed(1)} kW</span>
                    <span>Annual Savings: ${tp.annualSavings.toLocaleString()}</span>
                    <span>25-Yr Value: ${Math.round(tp.totalValue25yr).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cooperative Potential */}
        <div className="cooperative-potential">
          <div className="potential-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="potential-content">
            <h4>Ready for Cooperation</h4>
            <p>
              With threat points established, we can now explore cooperative options.
              Any deal must give each participant <strong>at least ${Math.round(totalThreatPoints / calculatedThreatPoints.length).toLocaleString()}</strong> (average)
              to be accepted. The next step will show how much additional value
              cooperation can create through a Power Purchase Agreement (PPA).
            </p>
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
        <button className="nav-btn next" onClick={onNext}>
          Configure PPA
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
