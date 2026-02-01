import React, { useMemo, useEffect } from 'react'
import './Step4CooperativeSurplus.css'
import SummaryCard from '../shared/SummaryCard'
import NumberInput from '../shared/NumberInput'
import { calculateCooperativeValue } from '../../../lib/finance'

export default function Step4CooperativeSurplus({
  participants,
  roiData,
  threatPoints,
  ppaConfig,
  setPpaConfig,
  cooperativeValue,
  setCooperativeValue,
  onNext,
  onBack
}) {
  // Calculate cooperative value based on PPA config
  const calculatedCoopValue = useMemo(() => {
    const totalThreatPoints = threatPoints.reduce((sum, tp) => sum + tp.threatPoint, 0)

    return calculateCooperativeValue({
      participants,
      roiData,
      ppaPrice: parseFloat(ppaConfig.ppaPrice) || 0.15,
      ppaTerm: parseInt(ppaConfig.ppaTerm) || 20,
      sharedCosts: parseFloat(ppaConfig.sharedCosts) || 0,
      totalThreatPoints
    })
  }, [participants, roiData, ppaConfig, threatPoints])

  // Update parent state
  useEffect(() => {
    setCooperativeValue(calculatedCoopValue)
  }, [calculatedCoopValue, setCooperativeValue])

  const handleConfigChange = (field, value) => {
    setPpaConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const totalThreatPoints = threatPoints.reduce((sum, tp) => sum + tp.threatPoint, 0)

  return (
    <div className="step-container step-4">
      <div className="step-header">
        <h2 className="step-title">Cooperative Surplus</h2>
        <p className="step-subtitle">
          Configure the Power Purchase Agreement (PPA) terms and see how much additional value
          cooperation creates compared to individual investments.
        </p>
      </div>

      <div className="step-4-content">
        <div className="step-4-grid">
          {/* PPA Configuration */}
          <div className="ppa-config-section">
            <h3 className="section-title">PPA Configuration</h3>

            <div className="config-fields">
              <div className="config-field">
                <label>PPA Price ($/kWh)</label>
                <div className="input-with-hint">
                  <NumberInput
                    step={0.01}
                    min={0}
                    value={ppaConfig.ppaPrice}
                    onChange={(e) => handleConfigChange('ppaPrice', e.target.value)}
                  />
                  <span className="input-hint">Typical range: $0.10-$0.20</span>
                </div>
              </div>

              <div className="config-field">
                <label>PPA Term (years)</label>
                <div className="input-with-hint">
                  <NumberInput
                    min={1}
                    max={30}
                    step={1}
                    value={ppaConfig.ppaTerm}
                    onChange={(e) => handleConfigChange('ppaTerm', e.target.value)}
                  />
                  <span className="input-hint">Common terms: 15, 20, 25 years</span>
                </div>
              </div>

              <div className="config-field">
                <label>Shared Infrastructure Costs ($)</label>
                <div className="input-with-hint">
                  <NumberInput
                    min={0}
                    step={100}
                    value={ppaConfig.sharedCosts}
                    onChange={(e) => handleConfigChange('sharedCosts', e.target.value)}
                  />
                  <span className="input-hint">Grid connection, metering, etc.</span>
                </div>
              </div>
            </div>

            {/* PPA Benefits */}
            <div className="ppa-benefits">
              <h4>Why PPA Cooperation?</h4>
              <ul>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Better PPA rates through bulk negotiation
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Shared infrastructure reduces per-unit costs
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Risk diversification across participants
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Access to larger, more efficient systems
                </li>
              </ul>
            </div>
          </div>

          {/* Cooperative Value Results */}
          <div className="coop-results-section">
            <h3 className="section-title">Value Comparison</h3>

            <div className="value-comparison">
              <div className="comparison-item standalone">
                <div className="comparison-label">Standalone Value</div>
                <div className="comparison-amount">${Math.round(totalThreatPoints).toLocaleString()}</div>
                <div className="comparison-desc">Sum of individual NPVs</div>
              </div>

              <div className="comparison-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              <div className="comparison-item cooperative">
                <div className="comparison-label">Cooperative Value</div>
                <div className="comparison-amount">${Math.round(calculatedCoopValue.totalCooperativeValue).toLocaleString()}</div>
                <div className="comparison-desc">{ppaConfig.ppaTerm}-year PPA value</div>
              </div>
            </div>

            <div className="surplus-highlight">
              <div className="surplus-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="surplus-content">
                <div className="surplus-label">Cooperative Surplus</div>
                <div className="surplus-value">
                  +${Math.round(calculatedCoopValue.surplus).toLocaleString()}
                </div>
                <div className="surplus-percent">
                  {calculatedCoopValue.surplusPct > 0 ? '+' : ''}{calculatedCoopValue.surplusPct.toFixed(1)}% more than going alone
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="coop-breakdown">
              <div className="breakdown-item">
                <span>Total Generation</span>
                <span>{calculatedCoopValue.totalGeneration?.toLocaleString()} kWh/yr</span>
              </div>
              <div className="breakdown-item">
                <span>PPA Revenue ({ppaConfig.ppaTerm} yrs)</span>
                <span>${Math.round(calculatedCoopValue.ppaRevenue).toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span>Cooperation Bonus</span>
                <span className="highlight">+${Math.round(calculatedCoopValue.cooperationBonus).toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span>Shared Costs</span>
                <span className="negative">-${Math.round(ppaConfig.sharedCosts || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ready for Nash */}
        <div className="nash-ready-card">
          <div className="nash-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8m-4-4h8" />
            </svg>
          </div>
          <div className="nash-content">
            <h4>Ready for Fair Allocation</h4>
            <p>
              With a surplus of <strong>${Math.round(calculatedCoopValue.surplus).toLocaleString()}</strong>,
              we can now use Nash Bargaining to fairly distribute the cooperative value among participants.
              The next step will calculate each participant's share based on their contributions and threat points.
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
        <button
          className="nav-btn next"
          onClick={onNext}
          disabled={calculatedCoopValue.surplus <= 0}
        >
          Run Nash Bargaining
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
