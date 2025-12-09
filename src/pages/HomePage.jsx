import React from 'react';
import './HomePage.css';
import Header from '../components/Header';
import Hero from '../components/Hero';
import InputForm from '../components/InputForm';
import Pagination from '../components/Pagination';
import LocationROI from '../components/LocationROI';
// InteractiveMap removed per UI request - map portion removed from HomePage
import SuccessfulCases from '../components/SuccessfulCases';
import Footer from '../components/Footer';
import DashboardModule from '../components/DashboardModule';
import NegotiationTool from '../components/NegotiationTool';

export default function HomePage(){
  const [selectedLocation, setSelectedLocation] = React.useState('Quincy, WA')
  const dashboardRef = React.useRef(null)
  const [flashTrigger, setFlashTrigger] = React.useState(0)
  const [simLoading, setSimLoading] = React.useState(false)
  const [showDashboardContent, setShowDashboardContent] = React.useState(false) // hidden until first run
  const [showNegotiation, setShowNegotiation] = React.useState(false)
  const negotiationRef = React.useRef(null)

  // Simple defaults per location (could be loaded from a data file)
  const locDefaults = {
    'Quincy, WA': { sizeA: 100, sizeB: 200, costPerKW:1200, energyPrice:0.12 },
    'East Wenatchee, WA': { sizeA: 80, sizeB: 150, costPerKW:1250, energyPrice:0.115 },
    'Malaga, WA': { sizeA: 60, sizeB: 120, costPerKW:1300, energyPrice:0.11 },
    'Yakima, WA': { sizeA: 90, sizeB: 160, costPerKW:1220, energyPrice:0.118 }
  }

  const defaults = locDefaults[selectedLocation] || locDefaults['Quincy, WA']

  return (
    <div className="home-page">
      <Header />
      <Hero />

      <div className="content-wrapper">
        <InputForm onNavigateToNegotiation={() => {
          setShowNegotiation(true)
          setTimeout(() => {
            if (negotiationRef.current) {
              negotiationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }, 100)
        }} />
      </div>

      <div className="content-wrapper">
        <Pagination />
      </div>

      <div className="content-wrapper">
        <LocationROI
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          onRunSimulation={() => {
            setSimLoading(true)
            setShowDashboardContent(false)
            // simulate a short loading/compute phase
            setTimeout(() => {
              setShowDashboardContent(true)
              setFlashTrigger(f => f + 1)
              setSimLoading(false)
              setTimeout(() => {
                if (dashboardRef.current) {
                  dashboardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }, 50)
            }, 1400)
          }}
        />
      </div>

      <div className="content-wrapper" ref={dashboardRef}>
        {simLoading && (
          <div className="sim-overlay">
            <div className="sim-loader">
              <div className="loader-ring" />
              <div className="loader-bars">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="loader-text">Running full simulation…</div>
            </div>
          </div>
        )}
        {showDashboardContent && (
          <DashboardModule
            key={selectedLocation}
            initSizeA={defaults.sizeA}
            initSizeB={defaults.sizeB}
            initCostPerKW={defaults.costPerKW}
            initEnergyPrice={defaults.energyPrice}
            flashTrigger={flashTrigger}
          />
        )}
      </div>

      <div className="content-wrapper">
        <SuccessfulCases />
      </div>

      {showNegotiation && (
        <div className="content-wrapper" ref={negotiationRef}>
          <NegotiationTool />
        </div>
      )}

      <div className="content-wrapper">
        <Footer />
      </div>
    </div>
  )
}
