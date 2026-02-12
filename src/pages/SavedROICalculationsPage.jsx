import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useROICalculations, useROICalculation, useDeleteROICalculation } from '../hooks/useROICalculations'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './SavedROICalculationsPage.css'

export default function SavedROICalculationsPage() {
  const [selectedCalculationId, setSelectedCalculationId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const navigate = useNavigate()

  // React Query hooks
  const { data: calculations = [], isLoading, error: listError, isError } = useROICalculations()
  const { data: selectedCalculation, isLoading: detailLoading, error: detailError } = useROICalculation(selectedCalculationId)
  const deleteCalculationMutation = useDeleteROICalculation()

  // Only show error banner for delete errors (list errors are handled inline)
  const showErrorBanner = deleteCalculationMutation.error?.message

  const handleDelete = async (id) => {
    try {
      await deleteCalculationMutation.mutateAsync(id)
      if (selectedCalculationId === id) {
        setSelectedCalculationId(null)
      }
      setDeleteConfirm(null)
    } catch (err) {
      // Error handled by mutation
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getParticipantCount = (calc) => {
    if (calc.participants && Array.isArray(calc.participants)) {
      return calc.participants.length
    }
    return 0
  }

  const formatCurrency = (value) => {
    if (!value) return '$0'
    return `$${Math.round(parseFloat(value)).toLocaleString()}`
  }

  return (
    <div className="saved-roi-page">
      <Header />
      <main className="saved-roi-main">
        <div className="saved-roi-container">
          <div className="page-header">
            <h1>Saved ROI Calculations</h1>
            <button
              className="new-calculation-btn"
              onClick={() => navigate('/roi-calculator')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Calculation
            </button>
          </div>

          {showErrorBanner && (
            <div className="error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {showErrorBanner}
            </div>
          )}

          <div className="calculations-layout">
            {/* Calculations List */}
            <div className="calculations-list">
              {isLoading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading calculations...</p>
                </div>
              ) : isError ? (
                <div className="empty-state">
                  <div className="empty-icon error-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <h3>Unable to Load</h3>
                  <p>{listError?.message || 'Could not load your saved calculations. The server may need to be restarted.'}</p>
                  <button
                    className="start-btn"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              ) : calculations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h3>No Saved Calculations</h3>
                  <p>Complete an ROI calculation and save it to view it here later.</p>
                  <button
                    className="start-btn"
                    onClick={() => navigate('/roi-calculator')}
                  >
                    Start ROI Calculator
                  </button>
                </div>
              ) : (
                calculations.map((calc) => (
                  <div
                    key={calc.id}
                    className={`calculation-item ${selectedCalculationId === calc.id ? 'active' : ''}`}
                    onClick={() => setSelectedCalculationId(calc.id)}
                  >
                    <div className="calculation-item-header">
                      <div className="calculation-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </div>
                      <div className="calculation-info">
                        <h4>{calc.name}</h4>
                        <span className="calculation-date">{formatDate(calc.created_at)}</span>
                      </div>
                    </div>
                    <div className="calculation-meta">
                      <span className="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        {getParticipantCount(calc)} participants
                      </span>
                      <span className="meta-item value">
                        {formatCurrency(calc.cooperative_value)}
                      </span>
                    </div>
                    <div className="calculation-actions">
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(calc.id)
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculation Detail */}
            <div className="calculation-detail">
              {detailLoading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading details...</p>
                </div>
              ) : selectedCalculation ? (
                <div className="detail-content">
                  <div className="detail-header">
                    <h2>{selectedCalculation.name}</h2>
                    <span className="detail-date">{formatDate(selectedCalculation.created_at)}</span>
                  </div>

                  {/* Summary Cards */}
                  <div className="detail-section">
                    <h3>Overview</h3>
                    <div className="overview-grid">
                      <div className="overview-item">
                        <span className="overview-label">Participants</span>
                        <span className="overview-value">{getParticipantCount(selectedCalculation)}</span>
                      </div>
                      <div className="overview-item">
                        <span className="overview-label">Cooperative Value</span>
                        <span className="overview-value highlight">{formatCurrency(selectedCalculation.cooperative_value)}</span>
                      </div>
                      {selectedCalculation.nash_results?.total_surplus && (
                        <div className="overview-item">
                          <span className="overview-label">Surplus Created</span>
                          <span className="overview-value success">{formatCurrency(selectedCalculation.nash_results.total_surplus)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PPA Configuration */}
                  {selectedCalculation.ppa_config && (
                    <div className="detail-section">
                      <h3>PPA Configuration</h3>
                      <div className="config-grid">
                        <div className="config-item">
                          <span className="config-label">PPA Price</span>
                          <span className="config-value">${selectedCalculation.ppa_config.ppaPrice}/kWh</span>
                        </div>
                        <div className="config-item">
                          <span className="config-label">Term Length</span>
                          <span className="config-value">{selectedCalculation.ppa_config.ppaTerm} years</span>
                        </div>
                        {selectedCalculation.ppa_config.sharedCosts > 0 && (
                          <div className="config-item">
                            <span className="config-label">Shared Costs</span>
                            <span className="config-value">{formatCurrency(selectedCalculation.ppa_config.sharedCosts)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Participants */}
                  {selectedCalculation.participants && selectedCalculation.participants.length > 0 && (
                    <div className="detail-section">
                      <h3>Participants</h3>
                      <div className="participants-list">
                        {selectedCalculation.participants.map((participant, index) => (
                          <div key={index} className="participant-item">
                            <div className="participant-header">
                              <span className="participant-num">{index + 1}</span>
                              <span className="participant-name">{participant.name || `Participant ${index + 1}`}</span>
                            </div>
                            {participant.address && (
                              <span className="participant-address">{participant.address}</span>
                            )}
                            <div className="participant-details">
                              {participant.annualUsage && (
                                <span className="participant-detail">
                                  {participant.annualUsage.toLocaleString()} kWh/yr
                                </span>
                              )}
                              {participant.roofArea && (
                                <span className="participant-detail">
                                  {participant.roofArea} sq ft roof
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nash Results */}
                  {selectedCalculation.nash_results?.participants && (
                    <div className="detail-section">
                      <h3>Nash Bargaining Results</h3>
                      <div className="nash-table">
                        <div className="nash-header">
                          <span>Participant</span>
                          <span>Threat Point</span>
                          <span>Allocation</span>
                          <span>Gain</span>
                        </div>
                        {selectedCalculation.nash_results.participants.map((p, index) => (
                          <div key={index} className="nash-row">
                            <span className="nash-name">{p.name}</span>
                            <span>{formatCurrency(p.threat_point)}</span>
                            <span className="nash-allocation">{formatCurrency(p.allocation)}</span>
                            <span className="nash-gain">+{formatCurrency(p.gain)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {selectedCalculation.ai_summary && (
                    <div className="detail-section">
                      <h3>AI Summary</h3>
                      <div className="ai-summary-box">
                        {selectedCalculation.ai_summary.split('\n').map((line, i) => {
                          const cleanLine = line.replace(/###|##|#/g, '').trim()
                          return cleanLine && <p key={i}>{cleanLine}</p>
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-detail">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <p>Select a calculation to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Calculation?</h3>
              <p>This action cannot be undone. The saved calculation will be permanently deleted.</p>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteCalculationMutation.isPending}
                >
                  {deleteCalculationMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
