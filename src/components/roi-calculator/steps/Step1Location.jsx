import React from 'react'
import './Step1Location.css'
import ParticipantCard from '../shared/ParticipantCard'

export default function Step1Location({
  participants,
  addParticipant,
  removeParticipant,
  updateParticipant,
  onNext
}) {
  // Validate that we have at least 2 participants with required data
  const isValid = participants.filter(p =>
    p.annualUsage && p.roofArea
  ).length >= 2

  return (
    <div className="step-container step-1">
      <div className="step-header">
        <h2 className="step-title">Add Community Participants</h2>
        <p className="step-subtitle">
          Enter information for each household or business participating in the community solar project.
          You need at least 2 participants to proceed.
        </p>
      </div>

      <div className="step-1-content">
        <div className="participants-header">
          <div className="participants-count">
            <span className="count-number">{participants.length}</span>
            <span className="count-label">Participants</span>
          </div>
          <button className="add-participant-btn" onClick={addParticipant}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Participant
          </button>
        </div>

        <div className="participants-grid">
          {participants.map((participant, index) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              index={index}
              onUpdate={updateParticipant}
              onRemove={removeParticipant}
              canRemove={participants.length > 2}
            />
          ))}
        </div>

        <div className="step-1-info">
          <div className="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div className="info-text">
            <strong>Tip:</strong> For best results, provide accurate annual energy usage (check your utility bill)
            and roof area available for solar panels. The cost per kW typically ranges from $1,000-$1,500 for residential installations.
          </div>
        </div>
      </div>

      <div className="step-navigation">
        <div /> {/* Empty div for spacing */}
        <button
          className="nav-btn next"
          onClick={onNext}
          disabled={!isValid}
        >
          Calculate ROI
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
