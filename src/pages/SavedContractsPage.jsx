import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './SavedContractsPage.css'

export default function SavedContractsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { authFetch } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const res = await authFetch('http://localhost:3000/api/contracts')
      if (!res.ok) {
        throw new Error('Failed to fetch contracts')
      }
      const data = await res.json()
      setContracts(data.contracts)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const viewContract = async (id) => {
    try {
      setDetailLoading(true)
      const res = await authFetch(`http://localhost:3000/api/contracts/${id}`)
      if (!res.ok) {
        throw new Error('Failed to fetch contract details')
      }
      const data = await res.json()
      setSelectedContract(data.contract)
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const deleteContract = async (id) => {
    try {
      const res = await authFetch(`http://localhost:3000/api/contracts/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error('Failed to delete contract')
      }
      setContracts(contracts.filter(c => c.id !== id))
      if (selectedContract?.id === id) {
        setSelectedContract(null)
      }
      setDeleteConfirm(null)
    } catch (err) {
      setError(err.message)
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

  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'risk-high'
      case 'medium': return 'risk-medium'
      case 'low': return 'risk-low'
      default: return 'risk-low'
    }
  }

  return (
    <div className="saved-contracts-page">
      <Header />
      <main className="saved-contracts-main">
        <div className="saved-contracts-container">
          <div className="page-header">
            <h1>Saved Contracts</h1>
            <button
              className="analyze-new-btn"
              onClick={() => navigate('/contract-transparency')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Analyze New Contract
            </button>
          </div>

          {error && (
            <div className="error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          <div className="contracts-layout">
            {/* Contract List */}
            <div className="contracts-list">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading contracts...</p>
                </div>
              ) : contracts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                  </div>
                  <h3>No Saved Contracts</h3>
                  <p>Analyze a contract and save it to view it here later.</p>
                  <button
                    className="start-btn"
                    onClick={() => navigate('/contract-transparency')}
                  >
                    Analyze a Contract
                  </button>
                </div>
              ) : (
                contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className={`contract-item ${selectedContract?.id === contract.id ? 'active' : ''}`}
                    onClick={() => viewContract(contract.id)}
                  >
                    <div className="contract-item-header">
                      <div className="contract-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                        </svg>
                      </div>
                      <div className="contract-info">
                        <h4>{contract.file_name}</h4>
                        <span className="contract-date">{formatDate(contract.created_at)}</span>
                      </div>
                    </div>
                    {contract.summary && (
                      <p className="contract-summary">{contract.summary.substring(0, 100)}...</p>
                    )}
                    <div className="contract-actions">
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(contract.id)
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

            {/* Contract Detail */}
            <div className="contract-detail">
              {detailLoading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading details...</p>
                </div>
              ) : selectedContract ? (
                <div className="detail-content">
                  <div className="detail-header">
                    <h2>{selectedContract.file_name}</h2>
                    <span className="detail-date">{formatDate(selectedContract.created_at)}</span>
                  </div>

                  {selectedContract.summary && (
                    <div className="detail-section">
                      <h3>Summary</h3>
                      <p>{selectedContract.summary}</p>
                    </div>
                  )}

                  {selectedContract.key_terms && (
                    <div className="detail-section">
                      <h3>Key Terms</h3>
                      <div className="terms-grid">
                        {selectedContract.key_terms.parties && (
                          <>
                            <div className="term-item">
                              <span className="term-label">Buyer</span>
                              <span className="term-value">{selectedContract.key_terms.parties.buyer || 'Not specified'}</span>
                            </div>
                            <div className="term-item">
                              <span className="term-label">Seller</span>
                              <span className="term-value">{selectedContract.key_terms.parties.seller || 'Not specified'}</span>
                            </div>
                          </>
                        )}
                        <div className="term-item">
                          <span className="term-label">Term Length</span>
                          <span className="term-value">{selectedContract.key_terms.termLength || 'Not specified'}</span>
                        </div>
                        <div className="term-item">
                          <span className="term-label">Price per kWh</span>
                          <span className="term-value">{selectedContract.key_terms.pricePerKwh || 'Not specified'}</span>
                        </div>
                        <div className="term-item">
                          <span className="term-label">Escalation Rate</span>
                          <span className="term-value">{selectedContract.key_terms.escalationRate || 'Not specified'}</span>
                        </div>
                        <div className="term-item">
                          <span className="term-label">Capacity</span>
                          <span className="term-value">{selectedContract.key_terms.capacity || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedContract.risk_flags && selectedContract.risk_flags.length > 0 && (
                    <div className="detail-section">
                      <h3>Risk Flags</h3>
                      <div className="risks-list">
                        {selectedContract.risk_flags.map((risk, index) => (
                          <div key={index} className={`risk-item ${getSeverityClass(risk.severity)}`}>
                            <div className="risk-header">
                              <span className={`severity-badge ${getSeverityClass(risk.severity)}`}>
                                {risk.severity?.toUpperCase() || 'LOW'}
                              </span>
                              <span className="risk-term">{risk.term}</span>
                            </div>
                            <p className="risk-issue">{risk.issue}</p>
                            {risk.evidence && (
                              <div className="risk-evidence">
                                <span className="evidence-label">Evidence:</span>
                                <blockquote>"{risk.evidence}"</blockquote>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-detail">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <p>Select a contract to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Contract?</h3>
              <p>This action cannot be undone. The saved analysis will be permanently deleted.</p>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={() => deleteContract(deleteConfirm)}>
                  Delete
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
