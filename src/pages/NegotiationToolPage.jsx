import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NegotiationToolPage.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NegotiationTool from '../components/NegotiationTool';

export default function NegotiationToolPage() {
  const navigate = useNavigate();

  return (
    <div className="negotiation-tool-page">
      <Header />
      
      <section className="negotiation-hero">
        <div className="negotiation-hero-inner">
          <h1 className="negotiation-hero-title">
            Nash Bargaining <span className="highlight">Negotiation Tool</span>
          </h1>
          <p className="negotiation-hero-subtitle">
            Fair allocation of cooperative surplus using game theory principles for Power Purchase Agreements
          </p>
        </div>
      </section>

      <div className="negotiation-content">
        <NegotiationTool />
      </div>

      <Footer />
    </div>
  );
}
