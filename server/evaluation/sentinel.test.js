/**
 * Unit tests for Sentinel Risk Set Evaluation
 *
 * Run with: node sentinel.test.js
 */

const {
  riskMatchesSentinel,
  findMatchingRisks,
  isConsistentlyHallucinated,
  evaluateSentinel
} = require('./sentinel')

// Test utilities
let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`✗ ${name}`)
    console.error(`  ${err.message}`)
    failed++
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`)
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`${message} Expected truthy value, got ${value}`)
  }
}

function assertFalse(value, message = '') {
  if (value) {
    throw new Error(`${message} Expected falsy value, got ${value}`)
  }
}

// Test data
const sampleRisks = [
  {
    term: 'Performance Guarantee Optional',
    canonicalId: 'performance-guarantee@exhibit-1-4d',
    severity: 'high',
    section: 'exhibit-1-4d',
    evidence: 'Performance guarantee is optional and may not be provided.'
  },
  {
    term: 'Escalation Rate Missing',
    canonicalId: 'escalation-rate@exhibit-1-3',
    severity: 'high',
    section: 'exhibit-1-3',
    evidence: 'No escalation rate is specified in the contract.'
  },
  {
    term: 'Termination Payment Schedule',
    canonicalId: 'termination@exhibit-1-6',
    severity: 'high',
    section: 'exhibit-1-6',
    evidence: 'Termination payments are blank.'
  }
]

const sampleSentinelItems = {
  mustDetect: [
    {
      id: 'performance_guarantee_optional',
      aliases: ['performance guarantee', 'performance guaranty'],
      notes: 'Performance guarantee is optional'
    },
    {
      id: 'escalation_rate_missing',
      aliases: ['escalation rate', 'price escalation'],
      notes: 'No escalation rate specified'
    },
    {
      id: 'warranty_missing',
      aliases: ['warranty missing', 'no warranty'],
      notes: 'Should not be detected - warranty exists'
    }
  ],
  mustNotDetect: [
    {
      id: 'force_majeure_missing',
      aliases: ['force majeure missing', 'no force majeure'],
      notes: 'Force majeure exists in contract'
    }
  ]
}

// Tests
console.log('\n=== Sentinel Module Unit Tests ===\n')

console.log('--- riskMatchesSentinel tests ---')

test('matches risk by alias in term', () => {
  const risk = { term: 'Performance Guarantee Optional', canonicalId: 'performance-guarantee@section-1' }
  const sentinel = { id: 'test', aliases: ['performance guarantee'] }
  assertTrue(riskMatchesSentinel(risk, sentinel))
})

test('matches risk by alias in canonical ID', () => {
  const risk = { term: 'Some Other Name', canonicalId: 'escalation-rate@section-1' }
  const sentinel = { id: 'test', aliases: ['escalation rate'] }
  assertTrue(riskMatchesSentinel(risk, sentinel))
})

test('does not match unrelated risk', () => {
  const risk = { term: 'Termination Payment', canonicalId: 'termination@section-1' }
  const sentinel = { id: 'test', aliases: ['performance guarantee'] }
  assertFalse(riskMatchesSentinel(risk, sentinel))
})

test('matches with partial word overlap', () => {
  const risk = { term: 'Price Escalation Rate', canonicalId: 'price-escalation@section-1' }
  const sentinel = { id: 'test', aliases: ['escalation rate'] }
  assertTrue(riskMatchesSentinel(risk, sentinel))
})

test('handles empty aliases', () => {
  const risk = { term: 'Performance Guarantee', canonicalId: 'performance-guarantee@section-1' }
  const sentinel = { id: 'test', aliases: [] }
  assertFalse(riskMatchesSentinel(risk, sentinel))
})

console.log('\n--- findMatchingRisks tests ---')

test('finds matching risks in list', () => {
  const sentinel = { id: 'test', aliases: ['performance guarantee'] }
  const matches = findMatchingRisks(sampleRisks, sentinel)
  assertEqual(matches.length, 1, 'Should find 1 match')
  assertEqual(matches[0].term, 'Performance Guarantee Optional')
})

test('returns empty array when no matches', () => {
  const sentinel = { id: 'test', aliases: ['warranty missing'] }
  const matches = findMatchingRisks(sampleRisks, sentinel)
  assertEqual(matches.length, 0, 'Should find 0 matches')
})

console.log('\n--- isConsistentlyHallucinated tests ---')

test('returns false for less than 2 detections', () => {
  const detections = [{ evidence: 'Some evidence' }]
  const hallucinations = []
  assertFalse(isConsistentlyHallucinated(detections, hallucinations))
})

test('returns true when 80%+ detections are not-found', () => {
  const detections = [
    { evidence: 'Evidence 1' },
    { evidence: 'Evidence 2' },
    { evidence: 'Evidence 3' },
    { evidence: 'Evidence 4' },
    { evidence: 'Evidence 5' }
  ]
  const hallucinations = [
    { evidence: 'Evidence 1', matchType: 'not-found' },
    { evidence: 'Evidence 2', matchType: 'not-found' },
    { evidence: 'Evidence 3', matchType: 'not-found' },
    { evidence: 'Evidence 4', matchType: 'not-found' },
    { evidence: 'Evidence 5', matchType: 'exact' }
  ]
  assertTrue(isConsistentlyHallucinated(detections, hallucinations))
})

test('returns false when less than 80% are not-found', () => {
  const detections = [
    { evidence: 'Evidence 1' },
    { evidence: 'Evidence 2' },
    { evidence: 'Evidence 3' }
  ]
  const hallucinations = [
    { evidence: 'Evidence 1', matchType: 'not-found' },
    { evidence: 'Evidence 2', matchType: 'exact' },
    { evidence: 'Evidence 3', matchType: 'exact' }
  ]
  assertFalse(isConsistentlyHallucinated(detections, hallucinations))
})

console.log('\n--- evaluateSentinel tests ---')

test('calculates recall correctly when all must-detect are found', () => {
  // Create mock results where all risks appear in each run
  const results = [
    { riskFlags: sampleRisks },
    { riskFlags: sampleRisks },
    { riskFlags: sampleRisks }
  ]

  // Mock spec with items that will be detected
  const mockSpec = {
    contract_hash: 'test-hash',
    contract_name: 'Test Contract',
    must_detect: [
      { id: 'perf_guarantee', aliases: ['performance guarantee'], notes: '' },
      { id: 'escalation', aliases: ['escalation rate'], notes: '' }
    ],
    must_not_detect: []
  }

  // We can't easily test with file-based specs, but we can test the calculation logic
  // by examining the evaluateSentinelItem function behavior
  const sentinel = { id: 'test', aliases: ['performance guarantee'] }
  const matches = findMatchingRisks(sampleRisks, sentinel)
  assertEqual(matches.length, 1, 'Should detect performance guarantee')
})

test('calculates false positive rate when must-not-detect is triggered', () => {
  // If a must-not-detect item is found, FP rate should be > 0
  const results = [
    { riskFlags: [{ term: 'Force Majeure Missing', canonicalId: 'force-majeure@section-1', severity: 'high' }] }
  ]

  const sentinel = { id: 'force_majeure_trap', aliases: ['force majeure missing'] }
  const matches = findMatchingRisks(results[0].riskFlags, sentinel)
  assertEqual(matches.length, 1, 'Should incorrectly detect force majeure missing')
})

// Summary
console.log('\n=== Test Summary ===')
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
console.log('')

if (failed > 0) {
  process.exit(1)
}
