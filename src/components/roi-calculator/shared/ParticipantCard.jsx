import React from 'react'
import './ParticipantCard.css'
import NumberInput from './NumberInput'

export default function ParticipantCard({
  participant,
  index,
  onUpdate,
  onRemove,
  canRemove = true,
  readonly = false,
  showRoiFields = false,
  roiData = null
}) {
  const handleChange = (field, value) => {
    if (!readonly && onUpdate) {
      onUpdate(participant.id, field, value)
    }
  }

  return (
    <div className="participant-card">
      <div className="participant-card-head">
        <span className="participant-num">#{index + 1}</span>
        {participant.name && (
          <span className="participant-name-badge">{participant.name}</span>
        )}
        {canRemove && !readonly && onRemove && (
          <button
            className="participant-remove-btn"
            onClick={() => onRemove(participant.id)}
            aria-label="Remove participant"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="participant-fields">
        <div className="field-row">
          <label>Name</label>
          <input
            type="text"
            placeholder="Household name"
            value={participant.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={readonly}
          />
        </div>

        <div className="field-row">
          <label>Address</label>
          <input
            type="text"
            placeholder="123 Main St, City, State"
            value={participant.address}
            onChange={(e) => handleChange('address', e.target.value)}
            disabled={readonly}
          />
        </div>

        <div className="field-grid">
          <div className="field-row">
            <label>Annual Usage (kWh)</label>
            <NumberInput
              placeholder="12000"
              value={participant.annualUsage}
              onChange={(e) => handleChange('annualUsage', e.target.value)}
              disabled={readonly}
              min={0}
              step={100}
            />
          </div>

          <div className="field-row">
            <label>Roof Area (sq ft)</label>
            <NumberInput
              placeholder="500"
              value={participant.roofArea}
              onChange={(e) => handleChange('roofArea', e.target.value)}
              disabled={readonly}
              min={0}
              step={50}
            />
          </div>
        </div>

        <div className="field-grid">
          <div className="field-row">
            <label>Energy Price ($/kWh)</label>
            <NumberInput
              step={0.01}
              value={participant.energyPrice}
              onChange={(e) => handleChange('energyPrice', e.target.value)}
              disabled={readonly}
              min={0}
            />
          </div>

          <div className="field-row">
            <label>Cost per kW ($)</label>
            <NumberInput
              value={participant.costPerKW}
              onChange={(e) => handleChange('costPerKW', e.target.value)}
              disabled={readonly}
              min={0}
              step={50}
            />
          </div>
        </div>
      </div>

      {showRoiFields && roiData && (
        <div className="participant-roi-section">
          <div className="roi-divider" />
          <div className="roi-metrics">
            <div className="roi-metric">
              <span className="roi-metric-label">System Size</span>
              <span className="roi-metric-value">{roiData.systemSize?.toFixed(1) || 0} kW</span>
            </div>
            <div className="roi-metric">
              <span className="roi-metric-label">Annual Generation</span>
              <span className="roi-metric-value">{roiData.annualGeneration?.toLocaleString() || 0} kWh</span>
            </div>
            <div className="roi-metric">
              <span className="roi-metric-label">Annual Savings</span>
              <span className="roi-metric-value highlight">${roiData.annualSavings?.toLocaleString() || 0}</span>
            </div>
            <div className="roi-metric">
              <span className="roi-metric-label">Payback Period</span>
              <span className="roi-metric-value">{roiData.paybackYears?.toFixed(1) || 0} yrs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
