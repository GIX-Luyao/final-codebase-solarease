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

/**
 * Generate a sentinel spec template from evaluation results.
 *
 * Creates a spec based on reliable risks (stability >= threshold) from the evaluation.
 * The generated spec includes must_detect items with aliases derived from observed
 * risk terms, and empty must_not_detect for manual curation.
 *
 * @param {Object} options - Generation options
 * @param {Object} options.evaluation - Evaluation report object
 * @param {string} [options.contractName] - Optional contract name
 * @param {number} [options.stabilityThreshold=0.6] - Minimum stability for must_detect
 * @returns {Object} Generated sentinel spec
 */
function generateSpecFromEvaluation({ evaluation, contractName, stabilityThreshold = 0.6 }) {
  const contractHash = evaluation.contractHash
  const stabilityRisks = evaluation.stability?.risks || []

  // Filter to reliable risks based on stability threshold
  const reliableRisks = stabilityRisks.filter((risk) => risk.stability >= stabilityThreshold)

  // Group similar risks to avoid duplicates
  const riskGroups = new Map()

  for (const risk of reliableRisks) {
    // Use normalized term as the grouping key
    const normalizedTerm = normalizeTerm(risk.term || '')
    const baseKey = normalizedTerm.split('-')[0] // Get first part for grouping

    if (!riskGroups.has(baseKey)) {
      riskGroups.set(baseKey, {
        terms: new Set(),
        issues: new Set(),
        bestRisk: risk
      })
    }

    const group = riskGroups.get(baseKey)
    group.terms.add(risk.term)

    // Collect issue variants as potential aliases
    if (risk.issueVariants) {
      for (const variant of risk.issueVariants) {
        // Extract key phrases from the issue description
        const keyPhrases = extractKeyPhrases(variant)
        keyPhrases.forEach((p) => group.issues.add(p))
      }
    }

    // Keep the risk with highest stability
    if (risk.stability > group.bestRisk.stability) {
      group.bestRisk = risk
    }
  }

  // Build must_detect items
  const mustDetect = []
  for (const [key, group] of riskGroups) {
    const risk = group.bestRisk
    const id = normalizeTerm(risk.term || key).replace(/\s+/g, '_')

    // Build aliases from term variants
    const aliases = new Set()
    for (const term of group.terms) {
      aliases.add(term.toLowerCase())
      // Add simplified versions
      const simplified = term.toLowerCase()
        .replace(/[\/\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (simplified !== term.toLowerCase()) {
        aliases.add(simplified)
      }
    }

    // Extract key words from the term
    const termWords = risk.term.toLowerCase().split(/[\s\/\-]+/).filter((w) => w.length > 3)
    termWords.forEach((w) => aliases.add(w))

    mustDetect.push({
      id,
      aliases: Array.from(aliases).slice(0, 8), // Limit aliases
      notes: risk.issueVariants?.[0]?.substring(0, 100) || `Detected with ${Math.round(risk.stability * 100)}% stability`
    })
  }

  return {
    contract_hash: contractHash,
    contract_name: contractName || 'Contract',
    must_detect: mustDetect,
    must_not_detect: [
      {
        id: 'example_false_positive',
        aliases: ['example term that should not be flagged'],
        notes: 'PLACEHOLDER: Add terms that exist in the contract but should NOT be flagged as risks'
      }
    ]
  }
}

/**
 * Extract key phrases from an issue description.
 *
 * @param {string} text - Issue description text
 * @returns {string[]} Key phrases
 */
function extractKeyPhrases(text) {
  if (!text) return []

  const phrases = []

  // Look for quoted terms
  const quoted = text.match(/"([^"]+)"/g)
  if (quoted) {
    phrases.push(...quoted.map((q) => q.replace(/"/g, '').toLowerCase()))
  }

  // Look for terms in common patterns
  const patterns = [
    /(?:the\s+)?(\w+(?:\s+\w+){0,2})\s+(?:is|are)\s+(?:not\s+)?(?:specified|defined|provided)/gi,
    /(?:no|missing|undefined)\s+(\w+(?:\s+\w+){0,2})/gi,
    /(\w+(?:\s+\w+){0,2})\s+(?:missing|undefined|blank)/gi
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[1].toLowerCase().trim()
      if (phrase.length > 3 && phrase.length < 40) {
        phrases.push(phrase)
      }
    }
  }

  return phrases
}

/**
 * Save a sentinel spec to the specs directory.
 *
 * @param {Object} spec - Sentinel spec object
 * @param {string} [outputPath] - Optional override path
 * @returns {string} Path where spec was saved
 */
function saveSentinelSpec(spec, outputPath = null) {
  const filePath = outputPath || path.join(SENTINEL_SPECS_DIR, `${spec.contract_hash}.json`)

  // Ensure directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, JSON.stringify(spec, null, 2))
  return filePath
}

module.exports = {
  loadSentinelSpec,
  evaluateSentinel,
  sentinelSpecExists,
  riskMatchesSentinel,
  findMatchingRisks,
  isConsistentlyHallucinated,
  generateSpecFromEvaluation,
  saveSentinelSpec,
  SENTINEL_SPECS_DIR
}
