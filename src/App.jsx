import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ROISimulatorPage from './pages/ROISimulatorPage'
import NegotiationToolPage from './pages/NegotiationToolPage'
import './index.css'

export default function App(){
  return (
    <Router>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/roi-simulator" element={<ROISimulatorPage />} />
          <Route path="/negotiation-tool" element={<NegotiationToolPage />} />
        </Routes>
      </div>
    </Router>
  )
}
