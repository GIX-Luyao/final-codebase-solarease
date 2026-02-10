const { buildCashflow, npv, irr } = require('../src/lib/finance')

function run(){
  const size = 100
  const costPerKW = 1200
  const productionPerKW = 1200
  const energyPrice = 0.12
  const opexPct = 0.01
  const cf = buildCashflow(size, costPerKW, productionPerKW, energyPrice, 25, opexPct)
  console.log('Cashflows length:', cf.length)
  console.log('First cashflows:', cf.slice(0,4))
  const irrVal = irr(cf)
  const npvVal = npv(0.06, cf)
  console.log('IRR:', irrVal === null ? 'n/a' : (Math.round(irrVal*1000)/10)+'%')
  console.log('NPV @6%:', Math.round(npvVal))
}

run()
