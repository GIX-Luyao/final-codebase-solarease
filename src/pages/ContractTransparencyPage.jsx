import React from 'react';
import './ContractTransparencyPage.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ContractTransparency from '../components/ContractTransparency';

export default function ContractTransparencyPage() {
  return (
    <div className="contract-page">
      <Header />

      <section className="contract-hero">
        <div className="contract-hero-inner">
          <h1 className="contract-hero-title">
            Contract <span className="highlight">Transparency</span>
          </h1>
          <p className="contract-hero-subtitle">
            Upload your PPA contract for AI-powered analysis. Get plain-language summaries, extracted key terms, and risk assessments.
          </p>
        </div>
      </section>

      <div className="contract-content">
        <ContractTransparency />
      </div>

      <Footer />
    </div>
  );
}
