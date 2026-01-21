/**
 * Sentinel Risk Set Evaluation Module
 *
 * Evaluates contract analysis against curated "sentinel" risks:
 * - must_detect: risks that should be flagged (sentinel positives)
 * - must_not_detect: risks that should NOT be flagged (false-positive traps)
 *
 * Metrics:
 * - Recall: proportion of must-detect risks detected at least once
 * - False Positive Rate: proportion of must-not-detect risks incorrectly detected
 * - Per-item detection rates and hallucination tracking
 */

const fs = require('fs')
const path = require('path')
const { normalizeTerm } = require('./canonicalization')

/**
 * Default directory for sentinel spec files
 */
const SENTINEL_SPECS_DIR = path.join(__dirname, 'sentinel', 'specs')

/**
 * Minimum detection runs to consider for "consistently hallucinated" check
 */
const MIN_RUNS_FOR_HALLUCINATION_CHECK = 2

/**
 * Threshold for "consistently hallucinated" (80% of detections are not-found)
 */
const HALLUCINATION_CONSISTENCY_THRESHOLD = 0.8

/**
 * Load a sentinel spec for a given contract hash.
 *
 * @param {string} contractHash - Hash of the contract
 * @param {string} [specPath] - Optional override path to spec file
 * @returns {Object|null} Sentinel spec or null if not found
 */
function loadSentinelSpec(contractHash, specPath = null) {
  const filePath = specPath || path.join(SENTINEL_SPECS_DIR, `${contractHash}.json`)

  try {
    if (!fs.existsSync(filePath)) {
      return null
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`Failed to load sentinel spec from ${filePath}:`, err.message)
    return null
  }
}

/**
 * Normalize an alias for matching.
 * Uses the existing term normalization logic.
 *
 * @param {string} alias - Alias string to normalize
 * @returns {string} Normalized alias
 */
function normalizeAlias(alias) {
  if (!alias || typeof alias !== 'string') return ''
  return alias.toLowerCase().trim().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
}

/**
 * Check if a risk matches a sentinel item.
 *
 * Matching criteria (in order of preference):
 * 1. Canonical ID match (exact or term portion matches)
 * 2. Risk term contains any alias (case-insensitive)
 * 3. Alias appears in canonical ID
 *
 * @param {Object} risk - Risk object with canonicalId, term, etc.
 * @param {Object} sentinelItem - Sentinel item with id and aliases
 * @returns {boolean} Whether the risk matches the sentinel item
 */
function riskMatchesSentinel(risk, sentinelItem) {
  const { aliases = [] } = sentinelItem

  // Normalize risk identifiers
  const canonicalId = (risk.canonicalId || '').toLowerCase()
  const riskTerm = normalizeAlias(risk.term || risk.originalTerm || '')
  const normalizedCanonicalTerm = normalizeTerm(risk.term || risk.originalTerm || '')

  for (const alias of aliases) {
    const normalizedAlias = normalizeAlias(alias)
    if (!normalizedAlias) continue

    // Check 1: Canonical ID contains the alias
    if (canonicalId.includes(normalizedAlias.replace(/\s+/g, '-'))) {
      return true
    }

    // Check 2: Risk term contains the alias
    if (riskTerm.includes(normalizedAlias)) {
      return true
    }

    // Check 3: Alias contains the normalized canonical term
    if (normalizedAlias.includes(normalizedCanonicalTerm)) {
      return true
    }

    // Check 4: Normalized canonical term contains alias words
    const aliasWords = normalizedAlias.split(' ').filter((w) => w.length > 2)
    const termWords = riskTerm.split(' ').filter((w) => w.length > 2)
    const matchingWords = aliasWords.filter(
      (aw) => termWords.some((tw) => tw.includes(aw) || aw.includes(tw))
    )
    if (aliasWords.length > 0 && matchingWords.length >= Math.ceil(aliasWords.length * 0.6)) {
      return true
    }
  }

  return false
}

/**
 * Find all risks in a single run that match a sentinel item.
 *
 * @param {Object[]} riskFlags - Array of risk flags from one run
 * @param {Object} sentinelItem - Sentinel item to match
 * @returns {Object[]} Matching risks
 */
function findMatchingRisks(riskFlags, sentinelItem) {
  return riskFlags.filter((risk) => riskMatchesSentinel(risk, sentinelItem))
}

/**
 * Check if a sentinel item's detections are consistently hallucinated.
 *
 * @param {Object[]} allDetections - All risk detections across runs for this sentinel
 * @param {Object[]} hallucinationResults - Hallucination results from hallucination module
 * @returns {boolean} True if consistently hallucinated
 */
function isConsistentlyHallucinated(allDetections, hallucinationResults) {
  if (allDetections.length < MIN_RUNS_FOR_HALLUCINATION_CHECK) {
    return false
  }

  // Build a map of hallucination results by evidence
  const hallucinationMap = new Map()
  for (const h of hallucinationResults) {
    if (h.evidence) {
      hallucinationMap.set(h.evidence.toLowerCase().trim(), h)
    }
  }

  // Count how many detections have "not-found" match type
  let notFoundCount = 0
  for (const detection of allDetections) {
    const evidence = (detection.evidence || '').toLowerCase().trim()
    const hallResult = hallucinationMap.get(evidence)

    if (hallResult && hallResult.matchType === 'not-found') {
      notFoundCount++
    } else if (!hallResult && detection.evidence) {
      // If no hallucination result found for this evidence, check if evidence is very short
      // or missing - treat as potential hallucination
      if (detection.evidence.length < 20) {
        notFoundCount++
      }
    }
  }

  const hallucinationRatio = notFoundCount / allDetections.length
  return hallucinationRatio >= HALLUCINATION_CONSISTENCY_THRESHOLD
}

/**
 * Evaluate a single sentinel item across all runs.
 *
 * @param {Object} sentinelItem - Sentinel item (must_detect or must_not_detect)
 * @param {Object[]} results - Array of analysis results from all runs
 * @param {Object[]} hallucinationResults - Hallucination detection results
 * @returns {Object} Evaluation result for this sentinel item
 */
function evaluateSentinelItem(sentinelItem, results, hallucinationResults) {
  const totalRuns = results.length
  const allDetections = []
  const detectedRunIndices = new Set()

  for (let runIndex = 0; runIndex < results.length; runIndex++) {
    const result = results[runIndex]
    const riskFlags = result.riskFlags || []
    const matchingRisks = findMatchingRisks(riskFlags, sentinelItem)

    if (matchingRisks.length > 0) {
      detectedRunIndices.add(runIndex)
      for (const risk of matchingRisks) {
        allDetections.push({
          runIndex,
          ...risk
        })
      }
    }
  }

  const detectedRuns = detectedRunIndices.size
  const detectionRate = detectedRuns / totalRuns
  const consistentlyHallucinated = isConsistentlyHallucinated(allDetections, hallucinationResults)

  return {
    id: sentinelItem.id,
    notes: sentinelItem.notes || null,
    aliases: sentinelItem.aliases || [],
    detected_runs: detectedRuns,
    total_runs: totalRuns,
    detection_rate: Math.round(detectionRate * 1000) / 1000,
    consistently_hallucinated: consistentlyHallucinated,
    detections: allDetections.map((d) => ({
      runIndex: d.runIndex,
      term: d.term || d.originalTerm,
      severity: d.severity,
      section: d.section || d.originalSection,
      evidence: d.evidence ? d.evidence.substring(0, 100) + (d.evidence.length > 100 ? '...' : '') : null
    }))
  }
}

/**
 * Run sentinel evaluation on analysis results.
 *
 * @param {Object} options - Evaluation options
 * @param {Object[]} options.results - Array of analysis results from multiple runs
 * @param {string} options.contractHash - Hash of the contract
 * @param {Object[]} options.hallucinationResults - Hallucination detection results
 * @param {string} [options.specPath] - Optional override path to sentinel spec
 * @returns {Object|null} Sentinel evaluation results or null if no spec exists
 */
function evaluateSentinel({ results, contractHash, hallucinationResults, specPath }) {
  // Load the sentinel spec
  const spec = loadSentinelSpec(contractHash, specPath)

  if (!spec) {
    return null
  }

  const mustDetect = spec.must_detect || []
  const mustNotDetect = spec.must_not_detect || []

  // Evaluate must_detect items
  const mustDetectResults = mustDetect.map((item) =>
    evaluateSentinelItem(item, results, hallucinationResults)
  )

  // Evaluate must_not_detect items
  const mustNotDetectResults = mustNotDetect.map((item) =>
    evaluateSentinelItem(item, results, hallucinationResults)
  )

  // Calculate metrics
  const detectedMustDetect = mustDetectResults.filter((r) => r.detected_runs > 0).length
  const recall = mustDetect.length > 0 ? detectedMustDetect / mustDetect.length : 1

  const detectedMustNotDetect = mustNotDetectResults.filter((r) => r.detected_runs > 0).length
  const falsePositiveRate = mustNotDetect.length > 0
    ? detectedMustNotDetect / mustNotDetect.length
    : 0

  // Identify issues
  const missedMustDetect = mustDetectResults.filter((r) => r.detected_runs === 0)
  const triggeredTraps = mustNotDetectResults.filter((r) => r.detected_runs > 0)
  const consistentlyHallucinatedItems = [
    ...mustDetectResults.filter((r) => r.consistently_hallucinated),
    ...mustNotDetectResults.filter((r) => r.consistently_hallucinated)
  ]

  return {
    contract_hash: contractHash,
    contract_name: spec.contract_name || null,
    recall: Math.round(recall * 1000) / 1000,
    false_positive_rate: Math.round(falsePositiveRate * 1000) / 1000,
    must_detect: mustDetectResults,
    must_not_detect: mustNotDetectResults,
    summary: {
      total_must_detect: mustDetect.length,
      detected_must_detect: detectedMustDetect,
      total_must_not_detect: mustNotDetect.length,
      detected_must_not_detect: detectedMustNotDetect,
      missed_must_detect: missedMustDetect.map((r) => r.id),
      triggered_traps: triggeredTraps.map((r) => r.id),
      consistently_hallucinated: consistentlyHallucinatedItems.map((r) => r.id)
    }
  }
}

/**
 * Check if a sentinel spec exists for a given contract.
 *
 * @param {string} contractHash - Hash of the contract
 * @param {string} [specPath] - Optional override path
 * @returns {boolean} Whether a spec exists
 */
function sentinelSpecExists(contractHash, specPath = null) {
  const filePath = specPath || path.join(SENTINEL_SPECS_DIR, `${contractHash}.json`)
  return fs.existsSync(filePath)
}

module.exports = {
  loadSentinelSpec,
  evaluateSentinel,
  sentinelSpecExists,
  riskMatchesSentinel,
  findMatchingRisks,
  isConsistentlyHallucinated,
  SENTINEL_SPECS_DIR
}
