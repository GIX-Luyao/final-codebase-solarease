import React from 'react'
import './StepIndicator.css'

const STEPS = [
  { num: 1, title: 'Location' },
  { num: 2, title: 'ROI Estimation' },
  { num: 3, title: 'Threat Points' },
  { num: 4, title: 'Cooperative Surplus' },
  { num: 5, title: 'Nash Bargaining' },
  { num: 6, title: 'Results' }
]

export default function StepIndicator({ currentStep, onStepClick }) {
  return (
    <div className="step-indicator">
      <div className="step-indicator-inner">
        {STEPS.map((step, i) => {
          const isCompleted = currentStep > step.num
          const isCurrent = currentStep === step.num
          const isUpcoming = currentStep < step.num

          return (
            <React.Fragment key={step.num}>
              <div
                className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                onClick={() => isCompleted && onStepClick?.(step.num)}
                role={isCompleted ? 'button' : undefined}
                tabIndex={isCompleted ? 0 : undefined}
              >
                <div className="step-circle">
                  {isCompleted ? (
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="step-num">{step.num}</span>
                  )}
                </div>
                <span className="step-title">{step.title}</span>
              </div>

              {i < STEPS.length - 1 && (
                <div className={`step-connector ${currentStep > step.num ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
