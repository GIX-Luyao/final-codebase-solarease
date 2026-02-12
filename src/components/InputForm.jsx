import React from 'react';
import './InputForm.css';

const iconRoi = '/svg/Button.svg';
const iconAi = '/svg/Button (2).svg';
const iconContract = '/svg/Button (1).svg';

// More exact DOM mapping for Input form container and nested frames
export default function InputForm({ onNavigateToContract, onNavigateToRoi }) {
  return (
    <section className="input-form-container">
      <div className="Input-form frame">
        <div className="Text-input rectangle" />

        <div className="Input-form-inner frame">
          {/* Horizontal container: title + subtitle */}
          <div className="Horizontal-container frame header-row">
            <div className="Button frame title-frame">Powerful Features for <span className="highlight">Community Empowerment</span></div>
            <div className="Horizontal-container frame subtitle-frame">Everything you need to make informed decisions about solar energy investments</div>
          </div>

          {/* Number input / feature grid area */}
          <div className="Number-input frame features-area">
            {/* Left column feature box */}
            <div className="Container frame feature-column clickable" onClick={onNavigateToRoi}>
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconRoi} alt="ROI Simulator" width="24" height="24" />
                </div>
              </div>
              <div className="feature-text">
                <div className="Text-input frame feature-title">ROI</div>
                <div className="Container frame feature-desc">Visualize costs, benefits, and payback periods with transparent, data-driven projections tailored to your community.</div>
              </div>
            </div>

            {/* Middle column */}
            <div className="Container frame feature-column clickable" onClick={() => window.dispatchEvent(new CustomEvent('openAIAssistant'))}>
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconAi} alt="AI Assistant" width="24" height="24" />
                </div>
              </div>
              <div className="feature-text">
                <div className="Text-input frame feature-title">AI ASSISTANT</div>
                <div className="Container frame feature-desc">Get plain-language explanations of complex energy economics, policy incentives, and technical terms in real-time.</div>
              </div>
            </div>

            {/* Right column */}
            <div className="Container frame feature-column clickable" onClick={onNavigateToContract}>
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconContract} alt="Contract Transparency" width="24" height="24" />
                </div>
              </div>
              <div className="feature-text">
                <div className="Text-input frame feature-title">CONTRACT</div>
                <div className="Container frame feature-desc">Understand complex agreements with auto-generated summaries that explain terms in simple language.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
