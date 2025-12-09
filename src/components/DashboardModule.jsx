import React, { useState, useMemo } from 'react'
import './DashboardModule.css'
import { buildCashflow, npv, irr } from '../lib/finance'

function KPI({ label, value, hint }){
  return (
    <div className="kpi">
      <div className="kpi-value" aria-hidden>{value}</div>
      <div className="kpi-label">{label}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
      <div className="kpi-micro">Updated: <span className="kpi-time">now</span></div>
    </div>
  )
}

function SimpleBar({ value, max=20, unit='yrs' }){
  const pct = Math.max(0, Math.min(100, (value/max)*100))
  return (
    <div className="simple-bar">
      <div className="bar-track"><div className="bar-fill" style={{width: pct + '%'}}/></div>
      <div className="bar-label">{value}{unit}</div>
    </div>
  )
}

export default function DashboardModule({ initSizeA=100, initSizeB=200, initCostPerKW=1200, initEnergyPrice=0.12, flashTrigger=0 }){
  // Inputs for ROI simulator (defaults from earlier mock data)
  const [sizeA, setSizeA] = useState(initSizeA) // kW
  const [sizeB, setSizeB] = useState(initSizeB) // kW (what-if)
  const [costPerKW, setCostPerKW] = useState(initCostPerKW)
  const [energyPrice, setEnergyPrice] = useState(initEnergyPrice) // $/kWh
  // More explicit financial parameters exposed for accuracy and testing
  const [productionPerKW, setProductionPerKW] = useState(1200) // kWh per kW per year
  const [discountRate, setDiscountRate] = useState(0.06)
  const [opexPct, setOpexPct] = useState(0.01)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  // productionPerKW now stateful and editable by user

  const metrics = useMemo(()=>{
    function compute(size){
      const totalCost = size * costPerKW
      const annualProduction = size * productionPerKW
      const annualValue = annualProduction * energyPrice
      const payback = annualValue > 0 ? +(totalCost / annualValue).toFixed(1) : Infinity
      const roi = +( (annualValue*1.0) / totalCost * 100 ).toFixed(1)
      const feasibility = Math.max(0, Math.min(100, Math.round(100 - payback*4)))
      return { size, totalCost, annualProduction, annualValue, payback, roi, feasibility }
    }
    return { a: compute(sizeA), b: compute(sizeB) }
  }, [sizeA,sizeB,costPerKW,energyPrice])
       const [flashActive, setFlashActive] = React.useState(false)
       React.useEffect(() => {
         if (!flashTrigger) return
         setFlashActive(true)
         const t = setTimeout(() => setFlashActive(false), 1200)
         return () => clearTimeout(t)
       }, [flashTrigger])
     
  const glossary = {
    'PPA': 'Power Purchase Agreement — a contract to buy electricity at a fixed price over time.',
    'IRR': 'Internal Rate of Return — the annualized effective compounded return rate of an investment.',
    'REC': 'Renewable Energy Certificate — tradable certificate representing proof that energy was generated from renewable sources.',
    'Payback': 'The time it takes for cumulative savings to equal the upfront cost.'
  }
  const [term, setTerm] = useState('PPA')

  // Update local inputs when props change
  React.useEffect(()=>{
    setSizeA(initSizeA)
    setSizeB(initSizeB)
    setCostPerKW(initCostPerKW)
    setEnergyPrice(initEnergyPrice)
  }, [initSizeA, initSizeB, initCostPerKW, initEnergyPrice])

  async function generateAISummary(){
    setAiLoading(true)
    setAiResult(null)
    try{
      const payload = {
        prompt: `Summarize this solar simulation and provide recommendations. Baseline: ${metrics.a.size}kW, Scenario: ${metrics.b.size}kW, deltaCapacity:${metrics.b.size-metrics.a.size}kW, deltaAnnualSavings:${Math.round(metrics.b.annualValue-metrics.a.annualValue)}, paybackA:${metrics.a.payback}, paybackB:${metrics.b.payback}`
      }
      const res = await fetch('http://localhost:3000/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if(!res.ok){
        const text = await res.text()
        throw new Error('AI server error: ' + text)
      }
      const data = await res.json()
      setAiResult(data?.result || 'No summary returned')
    }catch(err){
      setAiResult('Error generating summary: ' + (err.message||err))
    }finally{ setAiLoading(false) }
  }

  // Financial utilities: moved to `src/lib/finance.js` and imported above

  const financials = useMemo(()=>{
    const aCF = buildCashflow(metrics.a.size, costPerKW, productionPerKW, energyPrice, 25, opexPct)
    const bCF = buildCashflow(metrics.b.size, costPerKW, productionPerKW, energyPrice, 25, opexPct)
    const aIRR = irr(aCF)
    const bIRR = irr(bCF)
    const aNPV = npv(discountRate, aCF)
    const bNPV = npv(discountRate, bCF)
    return { aIRR, bIRR, aNPV, bNPV, aCF, bCF }
  }, [metrics, costPerKW, energyPrice, productionPerKW, discountRate, opexPct])

  // Small sparkline component (renders a tiny bar chart for quick visual of near-term cashflows)
  function Sparkline({ data=[] }){
    if(!data || data.length === 0) return null
    const max = Math.max(...data.map(Math.abs)) || 1
    return (
      <svg className="sparkline" viewBox={`0 0 ${data.length*12} 36`} width={data.length*12} height="36" aria-hidden>
        {data.map((v,i)=>{
          const h = Math.round((v / max) * 30)
          const x = i*12 + 4
          const y = 34 - h
          return <rect key={i} x={x} y={y} width={8} height={Math.max(2,h)} rx={2} fill="#0da2e7" />
        })}
      </svg>
    )
  }

  return (
    <section className="dashboard-module">
      <div className="dm-inner">
        <div className="dm-left">
          <div className="kpi-row">
            <KPI label="Capacity (A)" value={`${metrics.a.size} kW`} hint="Baseline" />
            <KPI label="Capacity (B)" value={`${metrics.b.size} kW`} hint="Scenario" />
            <KPI label="Feasibility" value={`${metrics.b.feasibility}%`} hint="Scenario score" />
          </div>

          <div className="cards-row">
            <div className="card card-anim">
              <div className="card-title">Payback (Scenario)</div>
              <SimpleBar value={metrics.b.payback} max={20} unit=" yrs" />
              <div className="card-spark">
                <Sparkline data={financials.bCF.slice(1,7)} />
              </div>
            </div>

            <div className="card card-anim">
              <div className="card-title">Estimated Annual Savings</div>
              <div className="card-value">${Math.round(metrics.b.annualValue).toLocaleString()}</div>
            </div>

            <div className="card card-anim">
              <div className="card-title">Estimated Cost</div>
              <div className="card-value">${Math.round(metrics.b.totalCost).toLocaleString()}</div>
            </div>
          </div>

            <div style={{marginTop:12}} className="cards-row">
              <div className="card card-anim">
                <div className="card-title">Scenario IRR</div>
                <div className="card-value">{financials.bIRR ? (Math.round(financials.bIRR*1000)/10)+'%' : 'n/a'}</div>
              </div>
              <div className="card card-anim">
                <div className="card-title">Scenario NPV ({Math.round(discountRate*100)}% discount)</div>
                <div className="card-value">${Math.round(financials.bNPV).toLocaleString()}</div>
              </div>
            </div>

        </div>

        <div className="dm-right">
          <h4>ROI Simulator (What-if)</h4>
          <div className="sim-row">
            <div className="sim-grid">
              <div>
                <label>Baseline size (kW)</label>
                <input type="number" value={sizeA} onChange={e=>setSizeA(+e.target.value)} />
              </div>
              <div>
                <label>Scenario size (kW)</label>
                <input type="number" value={sizeB} onChange={e=>setSizeB(+e.target.value)} />
              </div>
              <div>
                <label>Cost per kW ($)</label>
                <input type="number" value={costPerKW} onChange={e=>setCostPerKW(+e.target.value)} />
              </div>
              <div>
                <label>Energy price ($/kWh)</label>
                <input type="number" step="0.01" value={energyPrice} onChange={e=>setEnergyPrice(+e.target.value)} />
              </div>
              <div>
                <label>Production (kWh/kW/yr)</label>
                <input type="number" step="10" value={productionPerKW} onChange={e=>setProductionPerKW(+e.target.value)} />
              </div>
              <div>
                <label>Discount rate (%)</label>
                <input type="number" step="0.1" value={discountRate*100} onChange={e=>setDiscountRate(+e.target.value/100)} />
              </div>
              <div>
                <label>Opex (% of cap / yr)</label>
                <input type="number" step="0.1" value={opexPct*100} onChange={e=>setOpexPct(+e.target.value/100)} />
              </div>
            </div>
          </div>

          <div className="sim-delta">
            <div>Delta Capacity: <strong>{metrics.b.size - metrics.a.size} kW</strong></div>
            <div>Delta Annual Savings: <strong>${Math.round(metrics.b.annualValue - metrics.a.annualValue)}</strong></div>
            <div>Delta Payback (yrs): <strong>{(metrics.b.payback - metrics.a.payback).toFixed(1)}</strong></div>
          </div>

          <div style={{marginTop:12}}>
            <button className="cta-apply" onClick={generateAISummary} disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Generate AI Summary'}</button>
          </div>

          <div className="ai-explain">
            <h5>AI Agent — Explain Mode</h5>
            <select value={term} onChange={e=>setTerm(e.target.value)}>
              {Object.keys(glossary).map(k=> <option key={k} value={k}>{k}</option>)}
            </select>
            <div className="explain-box">{glossary[term]}</div>
            {aiLoading && <div style={{marginTop:8}}>Loading AI summary…</div>}
            {aiResult && <div style={{marginTop:8, whiteSpace:'pre-wrap'}} className="explain-box">{aiResult}</div>}
          </div>

        </div>
      </div>
    </section>
  )
}
