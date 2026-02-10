import React, { useState, useEffect } from 'react'
import './Step5NashBargaining.css'
import SummaryCard from '../shared/SummaryCard'
import NumberInput from '../shared/NumberInput'
import { API_URL } from '../../../config'

export default function Step5NashBargaining({
  participants,
  threatPoints,
  cooperativeValue,
  ppaConfig,
  weights,
  setWeights,
  nashResults,
  setNashResults,
  onNext,
  onBack
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize weights if not set
  useEffect(() => {
    if (weights.length !== participants.length) {
      setWeights(participants.map(() => 1))
    }
  }, [participants.length, weights.length, setWeights])

  const updateWeight = (index, value) => {
    const newWeights = [...weights]
    newWeights[index] = Math.max(0.1, parseFloat(value) || 1)
    setWeights(newWeights)
  }

  const runNashBargaining = async () => {
    setLoading(true)
    setError(null)

    try {
      // Prepare payload for API
      const payload = {
        participants: participants.map((p, i) => ({
          name: p.name || `Participant ${i + 1}`,
          address: p.address || '',
          annual_generation_kwh: parseFloat(p.annualUsage) || 0,
          energy_price_per_kwh: parseFloat(p.energyPrice) || 0.12,
          upfront_cost: parseFloat(p.costPerKW) * (parseFloat(p.roofArea) * 0.015) || 0,
          discount_rate: 0.06,
          years: ppaConfig.ppaTerm
        })),
        ppa_price: parseFloat(ppaConfig.ppaPrice),
        ppa_term: parseInt(ppaConfig.ppaTerm),
        shared_costs: parseFloat(ppaConfig.sharedCosts) || 0,
        weights: weights.length > 0 ? weights : null
      }

      const res = await fetch(`${API_URL}/api/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Negotiation failed')
      }

      const data = await res.json()
      setNashResults(data)
    } catch (err) {
      setError(err.message)
      // Fallback: calculate locally if API fails
      const localResults = calculateLocalNash()
      setNashResults(localResults)
    } finally {
      setLoading(false)
    }
  }

  // Local Nash calculation fallback
  const calculateLocalNash = () => {
    const totalThreatPoints = threatPoints.reduce((sum, tp) => sum + tp.threatPoint, 0)
    const surplus = cooperativeValue?.surplus || 0
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)

    const participantResults = threatPoints.map((tp, i) => {
      const weight = weights[i] || 1
      const surplusShare = (weight / totalWeight) * surplus
      const allocation = tp.threatPoint + surplusShare

      return {
        name: tp.participantName,
        threat_point: tp.threatPoint,
        allocation: allocation,
        gain: surplusShare,
        weight: weight,
        share_pct: ((allocation / cooperativeValue?.totalCooperativeValue) * 100) || 0
      }
    })

    return {
      participants: participantResults,
      total_surplus: surplus,
      total_value: cooperativeValue?.totalCooperativeValue || 0
    }
  }

  // Run calculation on first load
  useEffect(() => {
    if (!nashResults && cooperativeValue) {
      runNashBargaining()
    }
  }, [cooperativeValue])

  const totalAllocation = nashResults?.participants?.reduce(
    (sum, p) => sum + p.allocation,
    0
  ) || 0

  return (
    <div className="step-container step-5">
      <div className="step-header">
        <h2 className="step-title">Nash Bargaining Solver</h2>
        <p className="step-subtitle">
          Adjust bargaining weights and run the solver to calculate fair allocations.
          Each participant receives their threat point plus a share of the surplus.
        </p>
      </div>

      <div className="step-5-content">
        {/* Weights Configuration */}
        <div className="weights-section">
          <h3 className="section-title">Bargaining Weights</h3>
          <p className="weights-desc">
            Adjust weights to reflect negotiating power, contribution, or other factors.
            Higher weights mean larger shares of the surplus.
          </p>

          <div className="weights-grid">
            {participants.map((p, i) => (
              <div className="weight-card" key={p.id}>
                <div className="weight-header">
                  <span className="weight-num">#{i + 1}</span>
                  <span className="weight-name">{p.name || `Participant ${i + 1}`}</span>
                </div>
                <div className="weight-input-row">
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={weights[i] || 1}
                    onChange={(e) => updateWeight(i, e.target.value)}
                  />
                  <NumberInput
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={weights[i] || 1}
                    onChange={(e) => updateWeight(i, e.target.value)}
                    className="weight-number"
                  />
                </div>
                <div className="weight-threat">
                  Threat Point: ${Math.round(threatPoints[i]?.threatPoint || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <button
            className="run-solver-btn"
            onClick={runNashBargaining}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small" />
                Computing...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Nash Solver
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {error && (
          <div className="error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>API Error: {error}. Using local calculation.</span>
          </div>
        )}

        {nashResults && !loading && (
          <div className="nash-results-section">
            <h3 className="section-title">Fair Allocations</h3>

            {/* Summary Cards */}
            <div className="nash-summary-grid">
              <SummaryCard
                title="Total Cooperative Value"
                value={`$${Math.round(nashResults.total_value || totalAllocation).toLocaleString()}`}
                subtitle={`${ppaConfig.ppaTerm}-year PPA value`}
                variant="highlight"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8m-4-4h8" />
                  </svg>
                }
              />

              <SummaryCard
                title="Total Surplus Distributed"
                value={`$${Math.round(nashResults.total_surplus || 0).toLocaleString()}`}
                subtitle="Shared among all participants"
                variant="success"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                }
              />
            </div>

            {/* Allocation Cards */}
            <div className="allocations-grid">
              {nashResults.participants?.map((p, i) => {
                const sharePct = totalAllocation > 0
                  ? ((p.allocation / totalAllocation) * 100).toFixed(1)
                  : 0

                return (
                  <div className="allocation-card" key={i}>
                    <div className="alloc-header">
                      <div className="alloc-name">
                        <span className="alloc-num">#{i + 1}</span>
                        {p.name}
                      </div>
                      <div className="alloc-share">{sharePct}%</div>
                    </div>

                    <div className="alloc-value">
                      ${Math.round(p.allocation).toLocaleString()}
                    </div>

                    <div className="alloc-progress">
                      <div
                        className="alloc-progress-fill"
                        style={{ width: `${sharePct}%` }}
                      />
                    </div>

                    <div className="alloc-details">
                      <div className="alloc-detail">
                        <span>Threat Point</span>
                        <span>${Math.round(p.threat_point).toLocaleString()}</span>
                      </div>
                      <div className="alloc-detail gain">
                        <span>Gain from Coop</span>
                        <span>+${Math.round(p.gain).toLocaleString()}</span>
                      </div>
                      <div className="alloc-detail">
                        <span>Weight</span>
                        <span>{(p.weight || weights[i] || 1).toFixed(1)}x</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Fairness Indicator */}
            <div className="fairness-indicator">
              <div className="fairness-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18M5 8l7 4 7-4M5 12l7 4 7-4M5 16l7 4 7-4" />
                </svg>
              </div>
              <div className="fairness-content">
                <h4>Nash Bargaining Fairness</h4>
                <p>
                  This allocation satisfies Nash's axioms of fairness: each participant gets at least their
                  threat point (individual rationality), and the surplus is divided to maximize the product
                  of gains (Nash bargaining solution).
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="step-loading">
            <div className="spinner" />
            <p>Computing Nash Bargaining solution...</p>
          </div>
        )}
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
          disabled={!nashResults || loading}
        >
          View Results
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
