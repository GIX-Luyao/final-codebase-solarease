import React, { useEffect, useState } from 'react';
import './LocationROI.css';
import SolarAIAgent from '../lib/SolarAIAgent';

// Props:
// - selectedLocation: string
// - onSelectLocation(name)
export default function LocationROI({ selectedLocation, onSelectLocation, onRunSimulation }){
  const locations = ['Quincy, WA','East Wenatchee, WA','Malaga, WA','Yakima, WA']
  const [aiAgent] = useState(() => new SolarAIAgent());
  const [smartRecommendations, setSmartRecommendations] = useState([]);
  const [showAutoFill, setShowAutoFill] = useState(false);
  const [roiInputs, setRoiInputs] = useState({
    estimatedRooftops: 125,
    averageSystemSize: 75,
    costPerKW: 1200
  });

  // Initialize smart features on component mount
  useEffect(() => {
    const recommendations = aiAgent.getContextualRecommendations('roi-simulator');
    setSmartRecommendations(recommendations);
    
    // Check if we should auto-fill or auto-calculate
    const autoData = aiAgent.shouldAutoCalculate();
    if (autoData.autoROI && autoData.prefillData.location) {
      // Auto-select location if we have it
      const matchingLocation = locations.find(loc => 
        loc.toLowerCase().includes(autoData.prefillData.location.toLowerCase())
      );
      if (matchingLocation && matchingLocation !== selectedLocation) {
        setShowAutoFill(true);
      }
    }
  }, []);

  // Handle smart auto-fill suggestion
  function handleAutoFill() {
    const prefillData = aiAgent.getSmartPreFillData();
    
    if (prefillData.location) {
      const matchingLocation = locations.find(loc => 
        loc.toLowerCase().includes(prefillData.location.toLowerCase())
      );
      if (matchingLocation) {
        onSelectLocation && onSelectLocation(matchingLocation);
      }
    }
    
    if (prefillData.systemSize) {
      setRoiInputs(prev => ({
        ...prev,
        averageSystemSize: prefillData.systemSize,
        estimatedRooftops: Math.max(1, Math.round(prefillData.systemSize / 75)) // Estimate rooftops
      }));
    }
    
    setShowAutoFill(false);
    
    // Track this action
    aiAgent.trackInteraction('auto_fill_used', { type: 'roi_calculator' });
  }

  // Share ROI context with AI agent when location changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedLocation) {
      const roiData = {
        location: selectedLocation,
        systemSize: 75, // Default from the UI
        estimatedCapacity: 9.4,
        annualSavings: 1300000,
        paybackPeriod: calculatePaybackPeriod(selectedLocation),
        timestamp: new Date().toISOString()
      };
      
      // Store in localStorage for AI agent to access
      localStorage.setItem('soli_roi_context', JSON.stringify(roiData));
      
      // Trigger custom event for AI agent
      window.dispatchEvent(new CustomEvent('roiDataUpdated', { detail: roiData }));
    }
  }, [selectedLocation]);

  function calculatePaybackPeriod(location) {
    const paybackMap = {
      'Quincy, WA': 7.2,
      'East Wenatchee, WA': 7.8,
      'Malaga, WA': 8.1,
      'Yakima, WA': 7.5
    };
    return paybackMap[location] || 8.0;
  }

  // Handle smart recommendation actions
  function handleSmartAction(recommendation) {
    if (recommendation.action === 'auto-fill-roi') {
      handleAutoFill();
    } else if (recommendation.action === 'suggest-negotiation') {
      // Navigate to negotiation tool or show suggestion
      window.dispatchEvent(new CustomEvent('navigateToNegotiation', { 
        detail: { fromROI: true, roiData: getCurrentROIData() }
      }));
    }
    
    aiAgent.trackInteraction('smart_action_used', { 
      action: recommendation.action,
      type: recommendation.type 
    });
  }
  
  // Get current ROI calculation data
  function getCurrentROIData() {
    const totalCapacity = roiInputs.estimatedRooftops * roiInputs.averageSystemSize / 1000; // MW
    const totalCost = roiInputs.estimatedRooftops * roiInputs.averageSystemSize * roiInputs.costPerKW;
    const annualProduction = totalCapacity * 1200000; // kWh (assuming 1200 kWh/kW/year)
    const annualSavings = annualProduction * 0.12; // Assuming $0.12/kWh
    
    return {
      location: selectedLocation,
      totalCapacity,
      totalCost,
      annualSavings,
      estimatedRooftops: roiInputs.estimatedRooftops,
      averageSystemSize: roiInputs.averageSystemSize,
      costPerKW: roiInputs.costPerKW
    };
  }

  return (
    <section className="location-roi">
      <div className="location-roi-inner">
        {/* Smart Recommendations Bar */}
        {(smartRecommendations.length > 0 || showAutoFill) && (
          <div className="smart-recommendations">
            <div className="smart-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Soli's Smart Suggestions
            </div>
            
            {showAutoFill && (
              <div className="smart-suggestion auto-fill">
                <p>I can pre-fill your calculator with data from your previous analysis!</p>
                <div className="suggestion-actions">
                  <button className="use-autofill" onClick={handleAutoFill}>
                    Auto-Fill Data
                  </button>
                  <button className="dismiss-autofill" onClick={() => setShowAutoFill(false)}>
                    Not now
                  </button>
                </div>
              </div>
            )}
            
            {smartRecommendations.map((rec, i) => (
              <div key={i} className={`smart-suggestion ${rec.type}`}>
                <p>{rec.message}</p>
                {rec.action && (
                  <button 
                    className="suggestion-action"
                    onClick={() => handleSmartAction(rec)}
                  >
                    {rec.action.replace('auto-fill-', '').replace('-', ' ')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="location-panel">
          <div className="locations-list">
            {locations.map(loc => (
              <button
                key={loc}
                className={"loc-card" + (selectedLocation === loc ? ' selected' : '')}
                onClick={() => onSelectLocation && onSelectLocation(loc)}
              >{loc}</button>
            ))}
          </div>
        </div>

        <div className="roi-panel">
          <div className="roi-header">ROI Analysis</div>

          <div className="roi-controls">
            <div className="ctrl-block">
              <label>Estimated rooftops / sites</label>
              <input 
                className="roi-input" 
                type="number"
                value={roiInputs.estimatedRooftops}
                onChange={(e) => setRoiInputs(prev => ({...prev, estimatedRooftops: parseInt(e.target.value) || 125}))}
              />
            </div>
            <div className="ctrl-block">
              <label>Average system size (kW)</label>
              <input 
                className="roi-input" 
                type="number"
                value={roiInputs.averageSystemSize}
                onChange={(e) => setRoiInputs(prev => ({...prev, averageSystemSize: parseInt(e.target.value) || 75}))}
              />
            </div>
            <div className="ctrl-block">
              <label>Estimated cost per kW</label>
              <input 
                className="roi-input" 
                type="number"
                value={roiInputs.costPerKW}
                onChange={(e) => setRoiInputs(prev => ({...prev, costPerKW: parseInt(e.target.value) || 1200}))}
              />
            </div>
          </div>

          <div className="roi-results">
            <div className="result-row">
              <div className="r-label">Estimated Capacity</div>
              <div className="r-value">{(roiInputs.estimatedRooftops * roiInputs.averageSystemSize / 1000).toFixed(1)} MW</div>
            </div>
            <div className="result-row">
              <div className="r-label">Annual Savings</div>
              <div className="r-value">${((roiInputs.estimatedRooftops * roiInputs.averageSystemSize * 1200 * 0.12) / 1000000).toFixed(1)}M</div>
            </div>
            <div className="result-row">
              <div className="r-label">CO₂ Offset</div>
              <div className="r-value">6,200 tons</div>
            </div>

            <button className="cta-apply sim-cta" onClick={() => onRunSimulation && onRunSimulation()}>
              Run Full Simulation
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
