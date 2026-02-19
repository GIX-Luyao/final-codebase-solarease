import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import Header from '../components/Header';
import Hero from '../components/Hero';
import InputForm from '../components/InputForm';
import CTASection from '../components/CTASection';
import SuccessfulCases from '../components/SuccessfulCases';
import Footer from '../components/Footer';

export default function HomePage(){
  const navigate = useNavigate();

  const openSoliChat = () => {
    // Dispatch event to open the AI chatbot
    window.dispatchEvent(new CustomEvent('openAIAssistant'));
  };

  return (
    <div className="home-page">
      <Header />
      <Hero />

      {/* Mobile Soli Card - Only visible on mobile */}
      <div className="content-wrapper">
        <div className="mobile-soli-card" onClick={openSoliChat}>
          <div className="soli-card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="5" fill="#FDB813" stroke="#FDB813" strokeWidth="2"/>
              <line x1="12" y1="1" x2="12" y2="4" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="20" x2="12" y2="23" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              <line x1="1" y1="12" x2="4" y2="12" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20" y1="12" x2="23" y2="12" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="soli-card-content">
            <h3>Chat with Soli</h3>
            <p>Your AI solar energy assistant</p>
          </div>
          <div className="soli-card-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="content-wrapper">
        <InputForm
          onNavigateToNegotiation={() => navigate('/roi-calculator')}
          onNavigateToContract={() => navigate('/contract-transparency')}
        />
      </div>

      <div className="content-wrapper">
        <CTASection />
      </div>

      <div className="content-wrapper">
        <SuccessfulCases />
      </div>

      <div className="content-wrapper">
        <Footer />
      </div>
    </div>
  );
}
