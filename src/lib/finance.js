// Financial utilities: cashflow builder, NPV, IRR (ES module)
export function buildCashflow(size, costPerKW, productionPerKW, energyPrice, years=25, opexPct=0.01){
  const capital = size * costPerKW
  const annualProduction = size * productionPerKW
  const annualRevenue = annualProduction * energyPrice
  const cashflows = [-capital]
  for(let y=1;y<=years;y++){
    const opex = capital * opexPct
    const net = annualRevenue - opex
    cashflows.push(net)
  }
  return cashflows
}

export function npv(rate, cashflows){
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1+rate, i), 0)
}

export function irr(cashflows){
  let low = -0.9, high = 1.0
  function _npv(r){ return npv(r, cashflows) }
  let npvLow = _npv(low)
  let npvHigh = _npv(high)
  if(npvLow * npvHigh > 0) return null
  for(let i=0;i<80;i++){
    const mid = (low+high)/2
    const npvMid = _npv(mid)
    if(Math.abs(npvMid) < 1e-6) return mid
    if(npvLow * npvMid < 0){ high = mid; npvHigh = npvMid } else { low = mid; npvLow = npvMid }
  }
  return (low+high)/2
}
