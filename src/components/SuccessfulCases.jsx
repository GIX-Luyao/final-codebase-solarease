import React, { useRef } from 'react';
import './SuccessfulCases.css';

export default function SuccessfulCases(){
  const trackRef = useRef(null);

  function scrollBy(offset){
    if(!trackRef.current) return;
    trackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  }

  const cases = [
    { title: 'Quincy Rooftop Park', location: 'Quincy, WA', stat: '12.5 MW', body: 'A cooperative purchase reduced cost by 18% and unlocked municipal sites for large-scale deployment.', image: '/images/case1.jpg' },
    { title: 'East Wenatchee Schools', location: 'East Wenatchee, WA', stat: '8.3 MW', body: 'District-wide installations with community financing and reduced energy bills across multiple facilities.', image: '/images/case2.jpg' },
    { title: 'Malaga Microgrid', location: 'Malaga, WA', stat: '5.7 MW', body: 'A public-private partnership used the platform to align stakeholders and secure funding for resilient infrastructure.', image: '/images/case3.jpg' },
    { title: 'Yakima Solar Farm', location: 'Hot Springs, MT', stat: '15.2 MW', body: 'Community-led initiative with collective bargaining that secured favorable PPA terms and long-term stability.', image: '/images/case4.jpg' }
  ];

  return (
    <section className="successful-cases">
      <div className="section-header">
        <h2 className="section-title">Successful <span className="highlight">cases</span></h2>
        <p className="section-subtitle">Real projects that used SolarEase to negotiate and deploy solar at scale</p>
      </div>

      <div className="successful-inner">
        <div className="carousel-wrap">
          <button className="carousel-nav prev" onClick={() => scrollBy(-380)} aria-label="Previous">‹</button>
          <div className="carousel-viewport">
            <div className="carousel-track" ref={trackRef}>
              {cases.map((c, i) => (
                <div className="case-card" key={i}>
                  <div className="case-image">
                    <img src={c.image} alt={c.title} />
                  </div>
                  <div className="case-content">
                    <div className="case-location">{c.location}</div>
                    <div className="case-head">
                      <div className="case-title">{c.title}</div>
                      <div className="case-stat">{c.stat}</div>
                    </div>
                    <div className="case-body">{c.body}</div>
                    <button className="case-read-more">Read More →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="carousel-nav next" onClick={() => scrollBy(380)} aria-label="Next">›</button>
        </div>
      </div>
    </section>
  )
}
