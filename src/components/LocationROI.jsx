import React from 'react';
import './LocationROI.css';

// Props:
// - selectedLocation: string
// - onSelectLocation(name)
export default function LocationROI({ selectedLocation, onSelectLocation, onRunSimulation }){
  const locations = ['Quincy, WA','East Wenatchee, WA','Malaga, WA','Yakima, WA']

  return (
    <section className="location-roi">
      <div className="location-roi-inner">
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
              <input className="roi-input" defaultValue="125" />
            </div>
            <div className="ctrl-block">
              <label>Average system size (kW)</label>
              <input className="roi-input" defaultValue="75" />
            </div>
            <div className="ctrl-block">
              <label>Estimated cost per kW</label>
              <input className="roi-input" defaultValue="$1,200" />
            </div>
          </div>

          <div className="roi-results">
            <div className="result-row">
              <div className="r-label">Estimated Capacity</div>
              <div className="r-value">9.4 MW</div>
            </div>
            <div className="result-row">
              <div className="r-label">Annual Savings</div>
              <div className="r-value">$1.3M</div>
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
