import './Pagination.css';

export default function Pagination() {
  return (
    <section className="pagination-container">
      <div className="pagination-inner">
        <div className="section-header">
          <div className="title">Regional Impact Map</div>
          <div className="subtitle">See how communities across Washington State are transforming their energy future</div>
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
                  <div className="m-val">12.5 MW</div>
                  <div className="m-label">Capacity</div>
                </div>
                <div className="metric">
                  <div className="m-val">$1.2M</div>
                  <div className="m-label">Annual Savings</div>
                </div>
                <div className="metric">
                  <div className="m-val">8,500 tons</div>
                  <div className="m-label">CO₂ Offset</div>
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
                <div className="metric"><div className="m-val">8.3 MW</div><div className="m-label">Capacity</div></div>
                <div className="metric"><div className="m-val">$780K</div><div className="m-label">Annual Savings</div></div>
                <div className="metric"><div className="m-val">5,600 tons</div><div className="m-label">CO₂ Offset</div></div>
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
                <div className="metric"><div className="m-val">5.7 MW</div><div className="m-label">Capacity</div></div>
                <div className="metric"><div className="m-val">$520K</div><div className="m-label">Annual Savings</div></div>
                <div className="metric"><div className="m-val">3,900 tons</div><div className="m-label">CO₂ Offset</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
