import React, { useState, useEffect, useRef } from 'react';
import './AIEvaluationPanel.css';
import AIEvaluationAgent from '../lib/AIEvaluationAgent';
import SolarAIAgent from '../lib/SolarAIAgent';

export default function AIEvaluationPanel({ isOpen, onClose }) {
  const [evaluationAgent] = useState(() => new AIEvaluationAgent(new SolarAIAgent()));
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [liveMetrics, setLiveMetrics] = useState({});
  const [testProgress, setTestProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState('');
  const resultsRef = useRef(null);

  const testCategories = [
    { id: 'beginner_user', name: 'Beginner User Experience', description: 'Tests AI responses for new solar users' },
    { id: 'expert_user', name: 'Expert User Experience', description: 'Tests technical depth for experienced users' },
    { id: 'community_solar', name: 'Community Solar Guidance', description: 'Tests community solar recommendation quality' },
    { id: 'roi_analysis', name: 'ROI Analysis Accuracy', description: 'Tests financial analysis and recommendations' },
    { id: 'memory_context', name: 'Memory & Context', description: 'Tests conversation continuity and personalization' },
    { id: 'error_handling', name: 'Error Handling', description: 'Tests graceful handling of ambiguous inputs' }
  ];

  // Initialize with all categories selected
  useEffect(() => {
    setSelectedCategories(testCategories.map(cat => cat.id));
  }, []);

  // Run evaluation
  const runEvaluation = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setResults(null);
    setTestProgress(0);
    
    try {
      // Setup progress tracking
      const totalCategories = selectedCategories.length;
      let completedCategories = 0;

      const updateProgress = () => {
        completedCategories++;
        setTestProgress((completedCategories / totalCategories) * 100);
      };

      // Mock progress updates for demonstration
      const progressInterval = setInterval(() => {
        if (completedCategories < totalCategories) {
          updateProgress();
          setCurrentTest(`Testing ${testCategories.find(cat => cat.id === selectedCategories[completedCategories - 1])?.name || 'AI responses'}...`);
        }
      }, 2000);

      // Run actual evaluation
      const evaluationResults = await evaluationAgent.runEvaluation({
        categories: selectedCategories.length > 0 ? selectedCategories : undefined
      });

      clearInterval(progressInterval);
      setTestProgress(100);
      setCurrentTest('Evaluation Complete');
      setResults(evaluationResults);
      setLiveMetrics(evaluationResults.metrics);

    } catch (error) {
      console.error('Evaluation failed:', error);
      setResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  // Toggle category selection
  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Format metric value for display
  const formatMetric = (value, type = 'percentage') => {
    if (value === undefined || value === null) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'time':
        return `${value.toFixed(0)}ms`;
      case 'decimal':
        return value.toFixed(3);
      default:
        return value.toString();
    }
  };

  // Get status color based on score
  const getStatusColor = (score) => {
    if (score >= 0.8) return '#22c55e'; // green
    if (score >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  // Export results
  const exportResults = () => {
    if (!results) return;
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ai_evaluation_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!isOpen) return null;

  return (
    <div className="ai-evaluation-overlay">
      <div className="ai-evaluation-panel">
        <div className="evaluation-header">
          <div>
            <h2>AI Agent Evaluation</h2>
            <p>Comprehensive testing of AI performance and user experience</p>
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="evaluation-content">
          {/* Test Configuration */}
          <div className="test-config">
            <h3>Test Configuration</h3>
            <div className="category-selection">
              <p>Select test categories to run:</p>
              <div className="category-grid">
                {testCategories.map(category => (
                  <div 
                    key={category.id} 
                    className={`category-card ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="category-header">
                      <span className="category-checkbox">
                        {selectedCategories.includes(category.id) ? '✓' : '○'}
                      </span>
                      <h4>{category.name}</h4>
                    </div>
                    <p>{category.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="run-controls">
              <button 
                className="run-evaluation-btn"
                onClick={runEvaluation}
                disabled={isRunning || selectedCategories.length === 0}
              >
                {isRunning ? 'Running Evaluation...' : 'Run Evaluation'}
              </button>
              <span className="selected-count">
                {selectedCategories.length} of {testCategories.length} categories selected
              </span>
            </div>
          </div>

          {/* Progress Indicator */}
          {isRunning && (
            <div className="test-progress">
              <div className="progress-header">
                <h3>Running Tests</h3>
                <span className="progress-percentage">{testProgress.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${testProgress}%` }}
                ></div>
              </div>
              <p className="current-test">{currentTest}</p>
            </div>
          )}

          {/* Live Metrics */}
          {Object.keys(liveMetrics).length > 0 && (
            <div className="live-metrics">
              <h3>Key Metrics Overview</h3>
              <div className="metrics-grid">
                <div className="metric-card-ai-panel">
                  <div className="metric-label">Response Relevance</div>
                  <div className="metric-value" style={{ color: getStatusColor(liveMetrics.responseRelevance?.average || 0) }}>
                    {formatMetric(liveMetrics.responseRelevance?.average)}
                  </div>
                </div>
                <div className="metric-card-ai-panel">
                  <div className="metric-label">Personalization</div>
                  <div className="metric-value" style={{ color: getStatusColor(liveMetrics.personalizationScore?.average || 0) }}>
                    {formatMetric(liveMetrics.personalizationScore?.average)}
                  </div>
                </div>
                <div className="metric-card-ai-panel">
                  <div className="metric-label">Context Awareness</div>
                  <div className="metric-value" style={{ color: getStatusColor(liveMetrics.contextAwareness?.average || 0) }}>
                    {formatMetric(liveMetrics.contextAwareness?.average)}
                  </div>
                </div>
                <div className="metric-card-ai-panel">
                  <div className="metric-label">Response Time</div>
                  <div className="metric-value">
                    {formatMetric(liveMetrics.responseTime?.average, 'time')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results && !results.error && (
            <div className="evaluation-results" ref={resultsRef}>
              <div className="results-header">
                <h3>Evaluation Results</h3>
                <div className="results-actions">
                  <button className="export-btn" onClick={exportResults}>
                    Export Results
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="results-summary">
                <div className="eval-summary-cards">
                  <div className="eval-summary-card">
                    <div className="eval-summary-label">Overall Score</div>
                    <div className="eval-summary-value" style={{ color: getStatusColor(results.summary.overallScore) }}>
                      {formatMetric(results.summary.overallScore)}
                    </div>
                  </div>
                  <div className="eval-summary-card">
                    <div className="eval-summary-label">Tests Passed</div>
                    <div className="eval-summary-value">
                      {results.passedTests}/{results.totalTests}
                    </div>
                  </div>
                  <div className="eval-summary-card">
                    <div className="eval-summary-label">Pass Rate</div>
                    <div className="eval-summary-value" style={{ color: getStatusColor(results.summary.passRate) }}>
                      {formatMetric(results.summary.passRate)}
                    </div>
                  </div>
                  <div className="eval-summary-card">
                    <div className="eval-summary-label">Avg Response Time</div>
                    <div className="eval-summary-value">
                      {formatMetric(results.summary.averageResponseTime, 'time')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Performance */}
              <div className="category-performance">
                <h4>Performance by Category</h4>
                <div className="category-results">
                  {Object.entries(results.summary.categoricalPerformance).map(([categoryId, performance]) => {
                    const category = testCategories.find(cat => cat.id === categoryId);
                    return (
                      <div key={categoryId} className="category-result">
                        <div className="category-info">
                          <h5>{category?.name || categoryId}</h5>
                          <p>{performance.passed}/{performance.total} tests passed</p>
                        </div>
                        <div className="category-score">
                          <div className="score-bar">
                            <div 
                              className="score-fill" 
                              style={{ 
                                width: `${performance.score * 100}%`,
                                backgroundColor: getStatusColor(performance.score)
                              }}
                            ></div>
                          </div>
                          <span style={{ color: getStatusColor(performance.score) }}>
                            {formatMetric(performance.score)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Test Results */}
              <div className="detailed-results">
                <h4>Detailed Test Results</h4>
                <div className="test-results-list">
                  {results.testResults.map((test, index) => (
                    <div key={index} className={`test-result ${test.passed ? 'passed' : 'failed'}`}>
                      <div className="test-header">
                        <div>
                          <h5>{test.scenario}</h5>
                          <span className="test-category">{test.category}</span>
                        </div>
                        <div className="test-status">
                          <span className={`status-badge ${test.passed ? 'passed' : 'failed'}`}>
                            {test.passed ? 'PASSED' : 'FAILED'}
                          </span>
                          <span className="test-score">
                            {formatMetric(test.scores.overall)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="test-details">
                        <div className="score-breakdown">
                          <div className="score-item">
                            <span>Relevance:</span>
                            <span>{formatMetric(test.scores.relevance)}</span>
                          </div>
                          <div className="score-item">
                            <span>Personalization:</span>
                            <span>{formatMetric(test.scores.personalization)}</span>
                          </div>
                          <div className="score-item">
                            <span>Context:</span>
                            <span>{formatMetric(test.scores.contextAwareness)}</span>
                          </div>
                          <div className="score-item">
                            <span>Behavior:</span>
                            <span>{formatMetric(test.scores.behaviorCompliance)}</span>
                          </div>
                        </div>
                        
                        {test.errors.length > 0 && (
                          <div className="test-errors">
                            <h6>Errors:</h6>
                            {test.errors.map((error, i) => (
                              <div key={i} className="error-item">
                                <span className="error-message">{error.error}</span>
                                {error.message && <span className="error-context">Input: "{error.message}"</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="test-metrics">
                          <span>Duration: {test.duration}ms</span>
                          <span>Responses: {test.responses.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {results.summary.recommendations.length > 0 && (
                <div className="recommendations">
                  <h4>Improvement Recommendations</h4>
                  <div className="recommendations-list">
                    {results.summary.recommendations.map((rec, index) => (
                      <div key={index} className="recommendation-item">
                        <div className="rec-priority">{rec.priority}</div>
                        <div className="rec-content">
                          <h6>{rec.category}</h6>
                          <p>{rec.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {results && results.error && (
            <div className="evaluation-error">
              <h3>Evaluation Error</h3>
              <p>{results.error}</p>
              <button onClick={() => setResults(null)}>Clear Error</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}