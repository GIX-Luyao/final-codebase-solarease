import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ROISimulatorPage.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LocationROI from '../components/LocationROI';
import DashboardModule from '../components/DashboardModule';

export default function ROISimulatorPage() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = React.useState('Quincy, WA');
  const dashboardRef = React.useRef(null);
  const [flashTrigger, setFlashTrigger] = React.useState(0);
  const [simLoading, setSimLoading] = React.useState(false);
  const [showDashboardContent, setShowDashboardContent] = React.useState(false);

  const locDefaults = {
    'Quincy, WA': { sizeA: 100, sizeB: 200, costPerKW: 1200, energyPrice: 0.12 },
    'East Wenatchee, WA': { sizeA: 80, sizeB: 150, costPerKW: 1250, energyPrice: 0.115 },
    'Malaga, WA': { sizeA: 60, sizeB: 120, costPerKW: 1300, energyPrice: 0.11 },
    'Yakima, WA': { sizeA: 90, sizeB: 160, costPerKW: 1220, energyPrice: 0.118 }
  };

  const defaults = locDefaults[selectedLocation] || locDefaults['Quincy, WA'];

  return (
    <div className="roi-simulator-page">
      <Header />
      
      <section className="roi-hero">
        <div className="roi-hero-inner">
          <h1 className="roi-hero-title">
            Ready to Transform Your<br />
            <span className="highlight">Community's Energy Future?</span>
          </h1>
          <p className="roi-hero-subtitle">
            Advanced map-based interface for precise solar ROI calculations with community aggregation analysis
          </p>
        </div>
      </section>

      <div className="roi-content">
        <div className="location-section-wrapper">
          <div className="location-section-card">
            <div className="location-header">
              <div className="location-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="#07C0D5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#07C0D5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="location-title">Location Selection</h3>
                <p className="location-desc">Enter your address to unlock analysis tools</p>
              </div>
            </div>

            <LocationROI
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
              onRunSimulation={() => {
                setSimLoading(true);
                setShowDashboardContent(false);
                setTimeout(() => {
                  setShowDashboardContent(true);
                  setFlashTrigger(f => f + 1);
                  setSimLoading(false);
                  setTimeout(() => {
                    if (dashboardRef.current) {
                      dashboardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 50);
                }, 1400);
              }}
            />
          </div>
        </div>

        <div className="dashboard-wrapper" ref={dashboardRef}>
          {simLoading && (
            <div className="sim-overlay">
              <div className="sim-loader">
                <div className="loader-ring" />
                <div className="loader-bars">
                  <span className="bar bar-1" />
                  <span className="bar bar-2" />
                  <span className="bar bar-3" />
                </div>
                <div className="loader-text">Analyzing community solar potential...</div>
              </div>
            </div>
          )}

          {showDashboardContent && (
            <DashboardModule
              selectedLocation={selectedLocation}
              flashTrigger={flashTrigger}
              defaults={defaults}
            />
          )}
        </div>

        <div className="roi-bottom-section">
          <div className="roi-cards-row">
            <div className="roi-info-card">
              <h3 className="card-title">ROI Analysis</h3>
              <p className="card-subtitle">Compare Alone vs Together</p>
              <div className="toggle-wrapper">
                <label className="toggle-label">
                  <input type="checkbox" className="toggle-input" />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="chart-placeholder">
                <div className="chart-line" />
                <div className="legend-row">
                  <span className="legend-item"><span className="dot community" /> Community Solar</span>
                  <span className="legend-item"><span className="dot individual" /> Individual Solar</span>
                  <span className="legend-item"><span className="dot situation" /> Situation Ready</span>
                  <span className="legend-item"><span className="dot rcwe" /> RCW-e + community</span>
                </div>
              </div>
              <button className="run-sim-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 3L11 8L5 13V3Z" fill="currentColor" />
                </svg>
                Run Simulation
              </button>
            </div>

            <div className="roi-info-card">
              <h3 className="card-title">PPA Summary</h3>
              <p className="card-subtitle">Upload your Power Purchase Agreement</p>
              <div className="upload-area">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="#07C0D5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M38 32V38C38 39.0609 37.5786 40.0783 36.8284 40.8284C36.0783 41.5786 35.0609 42 34 42H14C12.9391 42 11.9217 41.5786 11.1716 40.8284C10.4214 40.0783 10 39.0609 10 38V32" stroke="#07C0D5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="upload-text">Upload PPA Document</p>
                <p className="upload-subtext">PDF, DOC up to 10MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
