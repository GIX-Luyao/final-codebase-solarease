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

// Constants for ROI calculations
const PRODUCTION_PER_KW = 1200 // kWh per kW per year (typical for residential)
const WATTS_PER_SQFT = 15 // Approximate watts per sq ft of roof
const SELF_USE_RATIO = 0.7 // 70% self-consumption, 30% export
const EXPORT_RATE = 0.04 // $/kWh for net metering export
const OPEX_PCT = 0.01 // 1% of capital per year for O&M
const DISCOUNT_RATE = 0.06 // 6% discount rate for NPV

/**
 * Calculate individual ROI for a participant
 */
export function calculateIndividualROI({
  annualUsage,
  roofArea,
  energyPrice,
  costPerKW,
  participantId,
  participantName,
  years = 25
}) {
  // Calculate system size based on roof area (kW)
  const systemSize = (roofArea * WATTS_PER_SQFT) / 1000

  // Annual generation (kWh)
  const annualGeneration = systemSize * PRODUCTION_PER_KW

  // Determine self-use vs export
  const selfUseKwh = Math.min(annualGeneration * SELF_USE_RATIO, annualUsage)
  const exportKwh = Math.max(0, annualGeneration - selfUseKwh)

  // Calculate savings and revenue
  const selfUseSavings = Math.round(selfUseKwh * energyPrice)
  const exportRevenue = Math.round(exportKwh * EXPORT_RATE)
  const annualSavings = selfUseSavings + exportRevenue

  // Upfront cost
  const upfrontCost = Math.round(systemSize * costPerKW)

  // Payback period
  const paybackYears = annualSavings > 0 ? upfrontCost / annualSavings : Infinity

  // Build cashflow for NPV/IRR
  const cashflows = buildCashflow(systemSize, costPerKW, PRODUCTION_PER_KW, energyPrice, years, OPEX_PCT)
  const npvValue = npv(DISCOUNT_RATE, cashflows)
  const irrValue = irr(cashflows)

  // 25-year total value (simple sum)
  const totalValue25yr = annualSavings * years - upfrontCost

  return {
    participantId,
    participantName,
    systemSize,
    annualGeneration: Math.round(annualGeneration),
    selfUseKwh: Math.round(selfUseKwh),
    exportKwh: Math.round(exportKwh),
    selfUseSavings,
    exportRevenue,
    annualSavings,
    upfrontCost,
    paybackYears,
    npv: npvValue,
    irr: irrValue,
    totalValue25yr
  }
}

/**
 * Calculate self-use savings for a given usage and generation
 */
export function calculateSelfUseSavings(annualGeneration, annualUsage, energyPrice) {
  const selfUseKwh = Math.min(annualGeneration * SELF_USE_RATIO, annualUsage)
  return selfUseKwh * energyPrice
}

/**
 * Calculate export revenue from excess generation
 */
export function calculateExportRevenue(annualGeneration, annualUsage, exportRate = EXPORT_RATE) {
  const selfUseKwh = Math.min(annualGeneration * SELF_USE_RATIO, annualUsage)
  const exportKwh = Math.max(0, annualGeneration - selfUseKwh)
  return exportKwh * exportRate
}

/**
 * Calculate cooperative bonus from group purchasing and shared infrastructure
 */
export function calculateCooperativeBonus(totalSystemSize, participantCount) {
  // Economies of scale: larger systems get better pricing
  const scaleBonus = Math.min(0.15, totalSystemSize * 0.0005) // Up to 15% bonus

  // Group purchasing power: more participants = better deals
  const groupBonus = Math.min(0.10, participantCount * 0.02) // Up to 10% bonus

  return scaleBonus + groupBonus // Combined bonus percentage
}

/**
 * Calculate cooperative value for a community solar project
 */
export function calculateCooperativeValue({
  participants,
  roiData,
  ppaPrice,
  ppaTerm,
  sharedCosts,
  totalThreatPoints
}) {
  // Total generation from all participants
  const totalGeneration = roiData.reduce((sum, roi) => sum + (roi.annualGeneration || 0), 0)

  // Total system size
  const totalSystemSize = roiData.reduce((sum, roi) => sum + (roi.systemSize || 0), 0)

  // PPA revenue over term
  const ppaRevenue = totalGeneration * ppaPrice * ppaTerm

  // Cooperative bonus from economies of scale
  const bonusRate = calculateCooperativeBonus(totalSystemSize, participants.length)
  const cooperationBonus = ppaRevenue * bonusRate

  // Total cooperative value
  const totalCooperativeValue = ppaRevenue + cooperationBonus - (sharedCosts || 0)

  // Surplus over standalone values
  const surplus = totalCooperativeValue - totalThreatPoints
  const surplusPct = totalThreatPoints > 0 ? (surplus / totalThreatPoints) * 100 : 0

  return {
    totalGeneration,
    totalSystemSize,
    ppaRevenue: Math.round(ppaRevenue),
    cooperationBonus: Math.round(cooperationBonus),
    bonusRate,
    totalCooperativeValue: Math.round(totalCooperativeValue),
    surplus: Math.round(surplus),
    surplusPct
  }
}

/**
 * Calculate Nash Bargaining allocation for a participant
 */
export function calculateNashAllocation({
  participantThreatPoint,
  totalThreatPoints,
  surplus,
  weight = 1,
  totalWeight
}) {
  // Each participant gets their threat point plus a weighted share of surplus
  const surplusShare = (weight / totalWeight) * surplus
  const allocation = participantThreatPoint + surplusShare

  return {
    threatPoint: participantThreatPoint,
    surplusShare,
    allocation,
    gain: surplusShare,
    weight
  }
}
