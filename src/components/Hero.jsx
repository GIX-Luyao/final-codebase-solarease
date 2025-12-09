import React from 'react';
import './Hero.css';

// The structure below mirrors the Figma JSON hierarchy for the "Button" frame and nested Card
export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-background">
          <img src="/images/Rating.jpg" alt="" className="bg-rating" />
          <div className="bg-linear" />
          <div className="bg-radial" />
        </div>

        <div className="hero-content">
          <div className="Button frame">
            <div className="Container rectangle" />
            <div className="Text-input rectangle" />

            <div className="Card frame">
              <div className="Card-inner frame">
                {/* Text input (headline) frame */}
                <div className="Text-input frame headline-frame">
                  <div className="Power-Your-Future-text text">Power Your Future With<br/><span className="highlight">Data-Driven Solar</span></div>
                </div>

                {/* Table (paragraph) frame */}
                <div className="Table frame">
                  <div className="Table-text text">SolarEase empowers local communities to make informed, collective
                    decisions about solar energy investments. Translate complex data into actionable insights and negotiate on equal footing with corporate buyers.</div>
                </div>

                {/* Button container frame with two buttons */}
                <div className="Button-container frame">
                  <div className="Button primary frame">
                    <div className="start-text">Start Your Simulation</div>
                    <div className="Text-input-container frame">
                      <div className="icon-frame frame" />
                    </div>
                  </div>

                  <div className="Button outline frame">
                    <div className="contact-text">Contact us</div>
                  </div>
                </div>

                {/* Horizontal container with stats */}
                <div className="Horizontal-container frame stats-frame">
                  <div className="Button-container stat-1 frame">
                    <div className="stat-content">
                      <div className="text-100">100+</div>
                      <div className="label">Communities</div>
                    </div>
                  </div>

                  <div className="Button-container stat-2 frame">
                    <div className="stat-content">
                      <div className="text-2m">$2M+</div>
                      <div className="label">ROI Generated</div>
                    </div>
                  </div>

                  <div className="Button-container stat-3 frame">
                    <div className="stat-content">
                      <div className="text-50mw">50MW</div>
                      <div className="label">Solar Capacity</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
