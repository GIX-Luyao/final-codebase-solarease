import React, { useState, useEffect } from 'react';
import './EvaluationReport.css';
import AIEvaluationAgent from '../lib/AIEvaluationAgent';
import SolarAIAgent from '../lib/SolarAIAgent';

export default function EvaluationReport() {
  const [evaluationAgent] = useState(() => new AIEvaluationAgent(new SolarAIAgent()));
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Run comprehensive evaluation
      await evaluationAgent.runEvaluation();
      
      // Generate detailed report
      const detailedReport = evaluationAgent.generateReport();
      setReport(detailedReport);
      
    } catch (error) {
      console.error('Report generation failed:', error);
      setReport({ error: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate report on component mount
  useEffect(() => {
    generateReport();
  }, []);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getGradeFromScore = (score) => {
    if (score >= 0.9) return { grade: 'A+', color: '#059669' };
    if (score >= 0.8) return { grade: 'A', color: '#059669' };
    if (score >= 0.7) return { grade: 'B', color: '#d97706' };
    if (score >= 0.6) return { grade: 'C', color: '#dc2626' };
    return { grade: 'F', color: '#dc2626' };
  };

  if (isGenerating) {
    return (
      <div className="evaluation-report">
        <div className="report-header">
          <h1>AI Agent Evaluation Report</h1>
          <p>Comprehensive Performance Analysis</p>
        </div>
        <div className="generating-report">
          <div className="loading-spinner"></div>
          <h2>Generating Evaluation Report...</h2>
          <p>Running comprehensive AI agent tests and analysis</p>
        </div>
      </div>
    );
  }

  if (!report || report.error) {
    return (
      <div className="evaluation-report">
        <div className="report-header">
          <h1>AI Agent Evaluation Report</h1>
          <p>Comprehensive Performance Analysis</p>
        </div>
        <div className="report-error">
          <h2>Unable to Generate Report</h2>
          <p>{report?.error || 'Unknown error occurred'}</p>
          <button onClick={generateReport} className="retry-btn">
            Retry Report Generation
          </button>
        </div>
      </div>
    );
  }

  const overallGrade = getGradeFromScore(report.summary.overallScore);

  return (
    <div className="evaluation-report">
      {/* Header */}
      <div className="report-header">
        <div className="header-content">
          <div>
            <h1>AI Agent Evaluation Report</h1>
            <p>Comprehensive Performance Analysis for SolarEase AI Assistant "Soli"</p>
            <div className="report-meta">
              <span>Generated: {formatTimestamp(report.timestamp)}</span>
              <span>Duration: {(report.duration / 1000).toFixed(1)}s</span>
              <span>Tests: {report.totalTests}</span>
            </div>
          </div>
          <div className="overall-grade">
            <div className="grade-circle" style={{ backgroundColor: overallGrade.color }}>
              <span className="grade-text">{overallGrade.grade}</span>
            </div>
            <div className="grade-score">{(report.summary.overallScore * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="report-section">
        <h2>Executive Summary</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Overall Performance</h3>
            <div className="score-display">
              <span className="score-value" style={{ color: overallGrade.color }}>
                {(report.summary.overallScore * 100).toFixed(1)}%
              </span>
              <span className="score-label">Overall Score</span>
            </div>
            <p>
              The AI agent demonstrates {report.summary.overallScore >= 0.8 ? 'excellent' : 
                report.summary.overallScore >= 0.7 ? 'good' : 
                report.summary.overallScore >= 0.6 ? 'acceptable' : 'poor'} 
              performance across all evaluation criteria.
            </p>
          </div>

          <div className="summary-card">
            <h3>Test Results</h3>
            <div className="test-stats">
              <div className="stat">
                <span className="stat-value passed">{report.passedTests}</span>
                <span className="stat-label">Passed</span>
              </div>
              <div className="stat">
                <span className="stat-value failed">{report.failedTests}</span>
                <span className="stat-label">Failed</span>
              </div>
              <div className="stat">
                <span className="stat-value">{(report.summary.passRate * 100).toFixed(0)}%</span>
                <span className="stat-label">Pass Rate</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>Performance Highlights</h3>
            <div className="highlights">
              {report.summary.strengths.length > 0 ? (
                <ul className="strengths-list">
                  {report.summary.strengths.map((strength, index) => (
                    <li key={index} className="strength-item">✓ {strength}</li>
                  ))}
                </ul>
              ) : (
                <p>No significant strengths identified</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="report-section">
        <h2>Key Performance Metrics</h2>
        <div className="metrics-dashboard">
          <div className="metric-group">
            <h3>Response Quality</h3>
            <div className="metrics-row">
              <div className="metric-item">
                <span className="metric-label">Relevance</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill" 
                    style={{ 
                      width: `${(report.metrics.responseRelevance?.average || 0) * 100}%`,
                      backgroundColor: '#10b981'
                    }}
                  ></div>
                </div>
                <span className="metric-value">
                  {((report.metrics.responseRelevance?.average || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Response Time</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill" 
                    style={{ 
                      width: `${Math.min(100, (2000 - (report.metrics.responseTime?.average || 0)) / 20)}%`,
                      backgroundColor: '#f59e0b'
                    }}
                  ></div>
                </div>
                <span className="metric-value">
                  {(report.metrics.responseTime?.average || 0).toFixed(0)}ms
                </span>
              </div>
            </div>
          </div>

          <div className="metric-group">
            <h3>Personalization & Context</h3>
            <div className="metrics-row">
              <div className="metric-item">
                <span className="metric-label">Personalization</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill" 
                    style={{ 
                      width: `${(report.metrics.personalizationScore?.average || 0) * 100}%`,
                      backgroundColor: '#3b82f6'
                    }}
                  ></div>
                </div>
                <span className="metric-value">
                  {((report.metrics.personalizationScore?.average || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Context Awareness</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill" 
                    style={{ 
                      width: `${(report.metrics.contextAwareness?.average || 0) * 100}%`,
                      backgroundColor: '#8b5cf6'
                    }}
                  ></div>
                </div>
                <span className="metric-value">
                  {((report.metrics.contextAwareness?.average || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Performance */}
      <section className="report-section">
        <h2>Performance by Test Category</h2>
        <div className="category-breakdown">
          {Object.entries(report.summary.categoricalPerformance).map(([category, performance]) => {
            const categoryGrade = getGradeFromScore(performance.score);
            return (
              <div key={category} className="category-item">
                <div className="category-header">
                  <h3>{category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                  <div className="category-grade" style={{ backgroundColor: categoryGrade.color }}>
                    {categoryGrade.grade}
                  </div>
                </div>
                <div className="category-stats">
                  <div className="category-score">
                    <span className="score-number">{(performance.score * 100).toFixed(1)}%</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{ 
                          width: `${performance.score * 100}%`,
                          backgroundColor: categoryGrade.color
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="category-tests">
                    <span>{performance.passed}/{performance.total} tests passed</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed Test Results */}
      <section className="report-section">
        <h2>Detailed Test Results</h2>
        <div className="test-results-detailed">
          {report.testResults.map((test, index) => (
            <div key={index} className={`test-detail ${test.passed ? 'passed' : 'failed'}`}>
              <div className="test-summary">
                <div className="test-info">
                  <h4>{test.scenario}</h4>
                  <span className="test-category-tag">{test.category}</span>
                </div>
                <div className="test-result-badge">
                  <span className={`result-status ${test.passed ? 'passed' : 'failed'}`}>
                    {test.passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                  <span className="result-score">{(test.scores.overall * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="test-metrics-breakdown">
                <div className="breakdown-item">
                  <span>Relevance</span>
                  <span>{(test.scores.relevance * 100).toFixed(1)}%</span>
                </div>
                <div className="breakdown-item">
                  <span>Personalization</span>
                  <span>{(test.scores.personalization * 100).toFixed(1)}%</span>
                </div>
                <div className="breakdown-item">
                  <span>Context</span>
                  <span>{(test.scores.contextAwareness * 100).toFixed(1)}%</span>
                </div>
                <div className="breakdown-item">
                  <span>Behavior</span>
                  <span>{(test.scores.behaviorCompliance * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              {test.errors.length > 0 && (
                <div className="test-errors-summary">
                  <strong>Issues Found:</strong>
                  <ul>
                    {test.errors.map((error, i) => (
                      <li key={i}>{error.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <section className="report-section">
          <h2>Improvement Recommendations</h2>
          <div className="recommendations-grid">
            {report.recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-card priority-${rec.priority}`}>
                <div className="rec-header">
                  <span className={`priority-badge priority-${rec.priority}`}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <h4>{rec.category.toUpperCase()}</h4>
                </div>
                <div className="rec-content">
                  <p className="rec-issue"><strong>Issue:</strong> {rec.issue}</p>
                  <p className="rec-suggestion"><strong>Suggestion:</strong> {rec.suggestion}</p>
                  <p className="rec-target"><strong>Target:</strong> {rec.targetMetric}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Test Objectives Summary */}
      <section className="report-section">
        <h2>Test Objectives & Validation</h2>
        <div className="objectives-summary">
          <div className="objective-item">
            <h4>Subsystem Tested</h4>
            <p>AI Agent (Soli) - Core conversational intelligence and personalization engine</p>
          </div>
          <div className="objective-item">
            <h4>User Experience Addressed</h4>
            <p>Personalized solar energy guidance, contextual recommendations, and intelligent conversation flow</p>
          </div>
          <div className="objective-item">
            <h4>Critical Assumptions Validated</h4>
            <ul>
              <li>Users understand AI-generated solar recommendations</li>
              <li>Personalization improves user engagement and satisfaction</li>
              <li>Context awareness enhances response relevance</li>
              <li>AI can handle diverse user expertise levels appropriately</li>
            </ul>
          </div>
          <div className="objective-item">
            <h4>Test Methodology</h4>
            <p>Automated scenario-based testing with quantitative metrics across {report.totalTests} test cases covering beginner users, expert users, community solar guidance, ROI analysis, memory retention, and error handling.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="report-footer">
        <p>Report generated by SolarEase AI Evaluation System</p>
        <button 
          onClick={() => window.print()} 
          className="print-report-btn"
        >
          Print Report
        </button>
      </div>
    </div>
  );
}