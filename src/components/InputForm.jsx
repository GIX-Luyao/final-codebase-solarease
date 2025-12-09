import React from 'react';
import './InputForm.css';
import iconRoi from '../../svg/Button.svg';
import iconAi from '../../svg/Button (2).svg';
import iconMap from '../../svg/Container.svg';
import iconCollab from '../../svg/Horizontal container.svg';
import iconNegotiate from '../../svg/Button (3).svg';
import iconContract from '../../svg/Button (1).svg';

// More exact DOM mapping for Input form container and nested frames
export default function InputForm({ onNavigateToNegotiation }) {
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
            <div className="Container frame feature-column">
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconRoi} alt="ROI Simulator" width="24" height="24" />
                </div>
              </div>
              <div className="Text-input frame feature-title">ROI Simulator</div>
              <div className="Container frame feature-desc">Visualize costs, benefits, and payback periods with transparent, data-driven projections tailored to your community.</div>
            </div>

            {/* Middle column */}
            <div className="Container frame feature-column">
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconAi} alt="AI Assistant" width="24" height="24" />
                </div>
              </div>
              <div className="Text-input frame feature-title">AI Assistant</div>
              <div className="Container frame feature-desc">Get plain-language explanations of complex energy economics, policy incentives, and technical terms in real-time.</div>
            </div>

            {/* Right column */}
            <div className="Container frame feature-column">
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconMap} alt="Multi-Community Mapping" width="24" height="24" />
                </div>
              </div>
              <div className="Text-input frame feature-title">Multi-Community Mapping</div>
              <div className="Container frame feature-desc">Compare solar potential across neighboring areas and explore joint project opportunities on an interactive map.</div>
            </div>

            {/* Additional rows matching JSON (second row of features) */}
            <div className="Container frame feature-column">
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconCollab} alt="Collaboration Tools" width="24" height="24" />
                </div>
              </div>
              <div className="Text-input frame feature-title">Collaboration Tools</div>
              <div className="Container frame feature-desc">Simulate combined ROI when partnering with nearby communities and discover complementary energy profiles.</div>
            </div>

            <div className="Container frame feature-column clickable" onClick={onNavigateToNegotiation}>
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconNegotiate} alt="Negotiation Support" width="24" height="24" />
                </div>
              </div>
              <div className="Text-input frame feature-title">Negotiation Support</div>
              <div className="Container frame feature-desc">Generate PPA scenarios and visualize benefit splits to negotiate fairly with corporate energy buyers.</div>
            </div>

            <div className="Container frame feature-column">
              <div className="Button-container frame">
                <div className="Button frame icon-box">
                  <img src={iconContract} alt="Contract Transparency" width="24" height="24" />
                </div>
              </div>
              <div className="Text-input frame feature-title">Contract Transparency</div>
              <div className="Container frame feature-desc">Understand complex agreements with auto-generated summaries that explain terms in simple language.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
