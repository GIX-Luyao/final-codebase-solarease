import React, { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import './ContractTransparency.css'

export default function ContractTransparency() {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef(null)
  const { isAuthenticated, authFetch } = useAuth()

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer?.files?.[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileInput = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile) => {
    setError(null)

    const validTypes = ['application/pdf', 'text/plain']
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or TXT file')
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (selectedFile.size > maxSize) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setFile(selectedFile)
  }

  const removeFile = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setSaved(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const analyzeContract = async () => {
    if (!file) return

    setAnalyzing(true)
    setError(null)
    setResult(null)
    setSaved(false)

    try {
      const formData = new FormData()
      formData.append('contract', file)

      const res = await fetch('http://localhost:3000/api/analyze-contract', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to analyze contract')
    } finally {
      setAnalyzing(false)
    }
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  const saveAnalysis = async () => {
    if (!result || !isAuthenticated) return

    setSaving(true)
    try {
      const res = await authFetch('http://localhost:3000/api/contracts', {
        method: 'POST',
        body: JSON.stringify({
          fileName: result.fileName || file?.name || 'Untitled Contract',
          summary: result.summary,
          keyTerms: result.keyTerms,
          riskFlags: result.riskFlags
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
    } catch (err) {
      setError(err.message || 'Failed to save analysis')
    } finally {
      setSaving(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
    <section className="contract-transparency">
      <div className="contract-inner">
        {/* Left Panel - Upload */}
        <div className="contract-left">
          <div className="contract-panel">
            <h3 className="panel-title">Upload Contract</h3>

            <div
              className={`dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleFileInput}
                className="file-input"
              />

              {!file ? (
                <>
                  <div className="dropzone-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17,8 12,3 7,8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="dropzone-text">
                    {dragActive ? 'Drop your file here' : 'Drag & drop your contract here'}
                  </p>
                  <p className="dropzone-subtext">or click to browse</p>
                  <p className="dropzone-formats">Supported: PDF, TXT (max 10MB)</p>
                </>
              ) : (
                <div className="file-preview">
                  <div className="file-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                  </div>
                  <div className="file-info">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{formatFileSize(file.size)}</p>
                  </div>
                  <button className="remove-file-btn" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              className="analyze-btn"
              onClick={analyzeContract}
              disabled={!file || analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Contract'}
            </button>
          </div>

          {/* Help Section */}
          <div className="contract-panel help-panel">
            <h4 className="help-title">What We Extract</h4>
            <ul className="help-list">
              <li>
                <span className="help-icon">*</span>
                <span>Contract parties and their roles</span>
              </li>
              <li>
                <span className="help-icon">*</span>
                <span>Term length and pricing details</span>
              </li>
              <li>
                <span className="help-icon">*</span>
                <span>Performance guarantees and O&M terms</span>
              </li>
              <li>
                <span className="help-icon">*</span>
                <span>Risk flags with severity ratings</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="contract-right">
          {analyzing && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Analyzing contract...</p>
              <p className="loading-subtext">This may take a moment for longer documents</p>
            </div>
          )}

          {!result && !analyzing && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>
              <h3>No Analysis Yet</h3>
              <p>Upload a PPA contract to see key terms, risks, and a plain-language summary</p>
            </div>
          )}

          {result && !analyzing && (
            <div className="results-container">
              {/* Summary Card */}
              <div className="result-card summary-card">
                <div className="card-header">
                  <h3 className="card-title">Summary</h3>
                  {result.fileName && <span className="file-badge">{result.fileName}</span>}
                </div>
                <p className="summary-text">{result.summary}</p>
              </div>

              {/* Key Terms Panel */}
              <div className="result-card">
                <h3 className="card-title">Key Terms</h3>
                <div className="terms-grid">
                  {result.keyTerms?.parties && (
                    <>
                      <div className="term-item">
                        <span className="term-label">Buyer</span>
                        <span className="term-value">{result.keyTerms.parties.buyer || 'Not specified'}</span>
                      </div>
                      <div className="term-item">
                        <span className="term-label">Seller</span>
                        <span className="term-value">{result.keyTerms.parties.seller || 'Not specified'}</span>
                      </div>
                    </>
                  )}
                  <div className="term-item">
                    <span className="term-label">Term Length</span>
                    <span className="term-value">{result.keyTerms?.termLength || 'Not specified'}</span>
                  </div>
                  <div className="term-item">
                    <span className="term-label">System Capacity</span>
                    <span className="term-value">{result.keyTerms?.capacity || 'Not specified'}</span>
                  </div>
                  <div className="term-item">
                    <span className="term-label">Price per kWh</span>
                    <span className="term-value">{result.keyTerms?.pricePerKwh || 'Not specified'}</span>
                  </div>
                  <div className="term-item">
                    <span className="term-label">Escalation Rate</span>
                    <span className="term-value">{result.keyTerms?.escalationRate || 'Not specified'}</span>
                  </div>
                  <div className="term-item">
                    <span className="term-label">Performance Guarantee</span>
                    <span className="term-value">{result.keyTerms?.performanceGuarantee || 'Not specified'}</span>
                  </div>
                  <div className="term-item">
                    <span className="term-label">O&M Responsibility</span>
                    <span className="term-value">{result.keyTerms?.omResponsibility || 'Not specified'}</span>
                  </div>
                  <div className="term-item full-width">
                    <span className="term-label">Termination Clause</span>
                    <span className="term-value">{result.keyTerms?.terminationClause || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Risk Flags Section */}
              {result.riskFlags && result.riskFlags.length > 0 && (
                <div className="result-card">
                  <h3 className="card-title">Risk Flags</h3>
                  <div className="risks-list">
                    {result.riskFlags.map((risk, index) => (
                      <div className={`risk-item ${getSeverityClass(risk.severity)}`} key={index}>
                        <div className="risk-header">
                          <span className={`severity-badge ${getSeverityClass(risk.severity)}`}>
                            {risk.severity?.toUpperCase() || 'LOW'}
                          </span>
                          <span className="risk-term">{risk.term}</span>
                        </div>
                        <p className="risk-issue">{risk.issue}</p>
                        {risk.section && (
                          <span className="risk-section">Reference: {risk.section}</span>
                        )}
                        {risk.evidence && (
                          <div className="risk-evidence">
                            <span className="evidence-label">Evidence from contract:</span>
                            <blockquote className="evidence-quote">"{risk.evidence}"</blockquote>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                {isAuthenticated && (
                  <button
                    className={`action-btn save-btn ${saved ? 'saved' : ''}`}
                    onClick={saveAnalysis}
                    disabled={saving || saved}
                  >
                    {saved ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Saved
                      </>
                    ) : saving ? (
                      'Saving...'
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save Analysis
                      </>
                    )}
                  </button>
                )}
                <button className="action-btn" onClick={copyShareLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Share Link
                </button>
                <button className="action-btn secondary" onClick={removeFile}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Analyze Another
                </button>
              </div>

              {/* Disclaimer */}
              {result.disclaimer && (
                <div className="disclaimer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  {result.disclaimer}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
