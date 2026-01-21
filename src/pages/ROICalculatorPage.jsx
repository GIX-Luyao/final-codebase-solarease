import React from 'react'
import './ROICalculatorPage.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ROICalculatorWizard from '../components/roi-calculator/ROICalculatorWizard'

export default function ROICalculatorPage() {
  return (
    <div className="roi-calculator-page">
      <Header />

      <section className="calc-hero">
        <div className="calc-hero-inner">
          <h1 className="calc-hero-title">
            Community Solar<br />
            <span className="highlight">ROI Calculator</span>
          </h1>
          <p className="calc-hero-subtitle">
            Calculate fair allocations for your community solar project using Nash Bargaining.
            Add participants, estimate individual ROI, and discover how cooperation creates more value.
          </p>
        </div>
      </section>

      <section className="calc-content">
        <ROICalculatorWizard />
      </section>

      <Footer />
    </div>
  )
}
