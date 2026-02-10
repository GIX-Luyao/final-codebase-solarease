import React from 'react';
import EvaluationReport from '../components/EvaluationReport';
import './AIEvaluationPage.css';

export default function AIEvaluationPage() {
  return (
    <div className="ai-evaluation-page">
      <nav className="evaluation-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <h1>SolarEase AI Evaluation</h1>
            <p>Performance Testing & Analysis</p>
          </div>
          <div className="nav-actions">
            <a href="/" className="nav-link">← Back to SolarEase</a>
          </div>
        </div>
      </nav>
      
      <main className="evaluation-main">
        <EvaluationReport />
      </main>
    </div>
  );
}