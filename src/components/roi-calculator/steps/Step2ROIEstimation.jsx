import React, { useEffect, useMemo } from 'react'
import './Step2ROIEstimation.css'
import SummaryCard from '../shared/SummaryCard'
import { calculateIndividualROI } from '../../../lib/finance'

export default function Step2ROIEstimation({
  participants,
  roiData,
  setRoiData,
  onNext,
  onBack
}) {
  // Calculate ROI for each participant
  const calculatedROIs = useMemo(() => {
    return participants.map(p => {
      const annualUsage = parseFloat(p.annualUsage) || 0
      const roofArea = parseFloat(p.roofArea) || 0
      const energyPrice = parseFloat(p.energyPrice) || 0.12
      const costPerKW = parseFloat(p.costPerKW) || 1200

      return calculateIndividualROI({
        annualUsage,
        roofArea,
        energyPrice,
        costPerKW,
        participantId: p.id,
        participantName: p.name || `Participant ${participants.indexOf(p) + 1}`
      })
    })
  }, [participants])

  // Update parent state
  useEffect(() => {
    setRoiData(calculatedROIs)
  }, [calculatedROIs, setRoiData])

  // Aggregated stats
  const totals = useMemo(() => {
    return calculatedROIs.reduce((acc, roi) => ({
      totalSystemSize: acc.totalSystemSize + (roi.systemSize || 0),
      totalGeneration: acc.totalGeneration + (roi.annualGeneration || 0),
      totalSavings: acc.totalSavings + (roi.annualSavings || 0),
      totalUpfront: acc.totalUpfront + (roi.upfrontCost || 0)
    }), { totalSystemSize: 0, totalGeneration: 0, totalSavings: 0, totalUpfront: 0 })
  }, [calculatedROIs])

  const avgPayback = calculatedROIs.length > 0
    ? calculatedROIs.reduce((sum, roi) => sum + (roi.paybackYears || 0), 0) / calculatedROIs.length
    : 0

  return (
    <div className="step-container step-2">
      <div className="step-header">
        <h2 className="step-title">Individual ROI Estimation</h2>
        <p className="step-subtitle">
          Review the calculated return on investment for each participant based on their inputs.
          These values will be used to determine standalone value (threat points) in the next step.
        </p>
      </div>

      <div className="step-2-content">
        {/* Summary Cards */}
        <div className="roi-summary-grid">
          <SummaryCard
            title="Total System Size"
            value={`${totals.totalSystemSize.toFixed(1)} kW`}
            subtitle="Combined solar capacity"
            variant="highlight"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M12 2L4 11h16L12 2z" />
              </svg>
            }
          />

          <SummaryCard
            title="Annual Generation"
            value={`${totals.totalGeneration.toLocaleString()} kWh`}
            subtitle="Combined energy production"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
          />

          <SummaryCard
            title="Annual Savings"
            value={`$${totals.totalSavings.toLocaleString()}`}
            subtitle="Combined yearly savings"
            variant="success"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />

          <SummaryCard
            title="Avg Payback"
            value={`${avgPayback.toFixed(1)} yrs`}
            subtitle="Average payback period"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        </div>

        {/* Individual ROI Details */}
        <div className="roi-details-section">
          <h3 className="section-title">Individual Breakdown</h3>

          <div className="roi-table">
            <div className="roi-table-header">
              <div className="roi-col name">Participant</div>
              <div className="roi-col">System Size</div>
              <div className="roi-col">Generation</div>
              <div className="roi-col">Self-Use Savings</div>
              <div className="roi-col">Export Revenue</div>
              <div className="roi-col">Upfront Cost</div>
              <div className="roi-col">Payback</div>
            </div>

            {calculatedROIs.map((roi, index) => (
              <div className="roi-table-row" key={roi.participantId}>
                <div className="roi-col name">
                  <span className="row-num">#{index + 1}</span>
                  {roi.participantName}
                </div>
                <div className="roi-col">{roi.systemSize?.toFixed(1)} kW</div>
                <div className="roi-col">{roi.annualGeneration?.toLocaleString()} kWh</div>
                <div className="roi-col">${roi.selfUseSavings?.toLocaleString()}</div>
                <div className="roi-col">${roi.exportRevenue?.toLocaleString()}</div>
                <div className="roi-col">${roi.upfrontCost?.toLocaleString()}</div>
                <div className="roi-col highlight">{roi.paybackYears?.toFixed(1)} yrs</div>
              </div>
            ))}
          </div>
        </div>

        {/* NPV/IRR Details */}
        <div className="financial-metrics">
          <h3 className="section-title">Financial Metrics (25-Year Analysis)</h3>
          <div className="metrics-grid">
            {calculatedROIs.map((roi, index) => (
              <div className="metric-card" key={roi.participantId}>
                <div className="metric-card-header">
                  <span className="metric-num">#{index + 1}</span>
                  <span className="metric-name">{roi.participantName}</span>
                </div>
                <div className="metric-row">
                  <span>NPV (6% discount)</span>
                  <span className={roi.npv >= 0 ? 'positive' : 'negative'}>
                    ${Math.round(roi.npv || 0).toLocaleString()}
                  </span>
                </div>
                <div className="metric-row">
                  <span>IRR</span>
                  <span className="positive">
                    {roi.irr ? `${(roi.irr * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="metric-row">
                  <span>25-Year Value</span>
                  <span className="highlight">
                    ${Math.round(roi.totalValue25yr || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
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
          View Threat Points
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
