import React from 'react';
import './Pagination.css';

export default function Pagination() {
  return (
    <section className="pagination-container">
      <div className="pagination-inner">
        <div className="section-header">
          <h2 className="section-title">Regional <span className="highlight">Impact Map</span></h2>
          <p className="section-subtitle">Washington State: 1.2 GW potential across 150+ communities</p>
        </div>

        <div className="cards-row">
          <div className="map-card">
            <div className="map-card-head">
              <div className="location">Quincy, WA</div>
              <div className="active-pill">Active</div>
            </div>
            <div className="map-card-body">
              <div className="metric-row">
                <div className="metric">
                  <div className="m-label">Capacity</div>
                  <div className="m-val">12.5 MW</div>
                </div>
                <div className="metric">
                  <div className="m-label">Annual Savings</div>
                  <div className="m-val">$1.2M</div>
                </div>
              </div>
              <div className="metric-row">
                <div className="metric">
                  <div className="m-label">CO₂ Offset</div>
                  <div className="m-val">8,500 tons</div>
                </div>
                <div className="metric">
                  <div className="m-label">ROI</div>
                  <div className="m-val">18.5%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="map-card">{/* repeated simplified card */}
            <div className="map-card-head">
              <div className="location">East Wenatchee, WA</div>
              <div className="active-pill">Active</div>
            </div>
            <div className="map-card-body">
              <div className="metric-row">
                <div className="metric"><div className="m-label">Capacity</div><div className="m-val">8.3 MW</div></div>
                <div className="metric"><div className="m-label">Annual Savings</div><div className="m-val">$780K</div></div>
              </div>
              <div className="metric-row">
                <div className="metric"><div className="m-label">CO₂ Offset</div><div className="m-val">5,600 tons</div></div>
                <div className="metric"><div className="m-label">ROI</div><div className="m-val">16.2%</div></div>
              </div>
            </div>
          </div>

          <div className="map-card">
            <div className="map-card-head">
              <div className="location">Malaga, WA</div>
              <div className="active-pill pill-alt">Planning</div>
            </div>
            <div className="map-card-body">
              <div className="metric-row">
                <div className="metric"><div className="m-label">Capacity</div><div className="m-val">5.7 MW</div></div>
                <div className="metric"><div className="m-label">Annual Savings</div><div className="m-val">$520K</div></div>
              </div>
              <div className="metric-row">
                <div className="metric"><div className="m-label">CO₂ Offset</div><div className="m-val">3,900 tons</div></div>
                <div className="metric"><div className="m-label">ROI</div><div className="m-val">14.8%</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
