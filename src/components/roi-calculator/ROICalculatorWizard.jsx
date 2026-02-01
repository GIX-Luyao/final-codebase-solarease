import React, { useState, useCallback } from 'react'
import './ROICalculatorWizard.css'
import StepIndicator from './StepIndicator'
import Step1Location from './steps/Step1Location'
import Step2ROIEstimation from './steps/Step2ROIEstimation'
import Step3ThreatPoints from './steps/Step3ThreatPoints'
import Step4CooperativeSurplus from './steps/Step4CooperativeSurplus'
import Step5NashBargaining from './steps/Step5NashBargaining'
import Step6Results from './steps/Step6Results'

const INITIAL_PARTICIPANT = {
  id: Date.now(),
  name: '',
  address: '',
  annualUsage: '',
  roofArea: '',
  energyPrice: 0.12,
  costPerKW: 1200
}

export default function ROICalculatorWizard() {
  // Current step (1-6)
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Participants
  const [participants, setParticipants] = useState([
    { ...INITIAL_PARTICIPANT, id: 1 },
    { ...INITIAL_PARTICIPANT, id: 2 }
  ])

  // Step 2: Calculated ROIs per participant
  const [roiData, setRoiData] = useState([])

  // Step 3: Threat points (standalone values)
  const [threatPoints, setThreatPoints] = useState([])

  // Step 4: PPA configuration and cooperative value
  const [ppaConfig, setPpaConfig] = useState({
    ppaPrice: 0.15,
    ppaTerm: 20,
    sharedCosts: 0
  })
  const [cooperativeValue, setCooperativeValue] = useState(null)

  // Step 5: Nash bargaining results
  const [nashResults, setNashResults] = useState(null)
  const [weights, setWeights] = useState([])

  // Step 6: AI summary
  const [aiSummary, setAiSummary] = useState('')

  // Navigation
  const goNext = useCallback(() => {
    setCurrentStep(s => Math.min(s + 1, 6))
  }, [])

  const goBack = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 1))
  }, [])

  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step)
    }
  }, [])

  // Participant management
  const addParticipant = useCallback(() => {
    setParticipants(prev => [
      ...prev,
      { ...INITIAL_PARTICIPANT, id: Date.now() }
    ])
  }, [])

  const removeParticipant = useCallback((id) => {
    setParticipants(prev => {
      if (prev.length <= 2) return prev
      return prev.filter(p => p.id !== id)
    })
  }, [])

  const updateParticipant = useCallback((id, field, value) => {
    setParticipants(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    )
  }, [])

  // Render current step
  const renderStep = () => {
    const commonProps = {
      onNext: goNext,
      onBack: goBack
    }

    switch (currentStep) {
      case 1:
        return (
          <Step1Location
            {...commonProps}
            participants={participants}
            addParticipant={addParticipant}
            removeParticipant={removeParticipant}
            updateParticipant={updateParticipant}
          />
        )

      case 2:
        return (
          <Step2ROIEstimation
            {...commonProps}
            participants={participants}
            roiData={roiData}
            setRoiData={setRoiData}
          />
        )

      case 3:
        return (
          <Step3ThreatPoints
            {...commonProps}
            participants={participants}
            roiData={roiData}
            threatPoints={threatPoints}
            setThreatPoints={setThreatPoints}
          />
        )

      case 4:
        return (
          <Step4CooperativeSurplus
            {...commonProps}
            participants={participants}
            roiData={roiData}
            threatPoints={threatPoints}
            ppaConfig={ppaConfig}
            setPpaConfig={setPpaConfig}
            cooperativeValue={cooperativeValue}
            setCooperativeValue={setCooperativeValue}
          />
        )

      case 5:
        return (
          <Step5NashBargaining
            {...commonProps}
            participants={participants}
            threatPoints={threatPoints}
            cooperativeValue={cooperativeValue}
            ppaConfig={ppaConfig}
            weights={weights}
            setWeights={setWeights}
            nashResults={nashResults}
            setNashResults={setNashResults}
          />
        )

      case 6:
        return (
          <Step6Results
            {...commonProps}
            participants={participants}
            roiData={roiData}
            threatPoints={threatPoints}
            cooperativeValue={cooperativeValue}
            ppaConfig={ppaConfig}
            nashResults={nashResults}
            aiSummary={aiSummary}
            setAiSummary={setAiSummary}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="roi-wizard">
      <StepIndicator
        currentStep={currentStep}
        onStepClick={goToStep}
      />
      <div className="wizard-content">
        {renderStep()}
      </div>
    </div>
  )
}
