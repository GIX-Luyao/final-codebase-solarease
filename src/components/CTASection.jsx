import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CTASection.css';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <div className="cta-inner">
        <h2 className="cta-title">Ready to Transform Your <span className="highlight">Community's Energy Future?</span></h2>
        <p className="cta-subtitle">Advanced map-based interface for precise solar ROI calculations with community aggregation analysis</p>
        
        <button className="cta-button" onClick={() => navigate('/roi-simulator')}>
          Start ROI Calculator
          <span className="arrow">→</span>
        </button>

        <div className="cta-features">
          <div className="cta-feature-card">
            <div className="feature-icon">
              <img src="/svg/Container copy.svg" alt="AI Analysis" width="24" height="24" />
            </div>
            <h3 className="feature-title">AI-Powered Analysis</h3>
            <p className="feature-desc">Advanced algorithms for precise ROI calculations</p>
          </div>

          <div className="cta-feature-card">
            <div className="feature-icon">
              <img src="/svg/Card (1).svg" alt="Community Aggregation" width="24" height="24" />
            </div>
            <h3 className="feature-title">Community Aggregation</h3>
            <p className="feature-desc">Compare individual vs community solar benefits</p>
          </div>

          <div className="cta-feature-card">
            <div className="feature-icon">
              <img src="/svg/Card.svg" alt="Interactive Mapping" width="24" height="24" />
            </div>
            <h3 className="feature-title">Interactive Mapping</h3>
            <p className="feature-desc">Draw custom areas for precise analysis</p>
          </div>
        </div>
      </div>
    </section>
  );
}
