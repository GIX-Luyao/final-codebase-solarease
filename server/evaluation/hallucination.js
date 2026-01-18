/**
 * Hallucination detection for contract analysis evaluation.
 * Detects when AI-generated risk flags are not properly grounded in the contract text.
 */

const { MIN_EVIDENCE_LENGTH } = require('./types')

/**
 * Normalize text for fuzzy matching.
 * - Lowercases
 * - Normalizes whitespace
 * - Removes extra punctuation
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeForMatching(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[""'']/g, '"')
    .replace(/[–—]/g, '-')
    .trim()
}

/**
 * Check if evidence text appears verbatim (or near-verbatim) in the contract.
 * Allows for minor whitespace and punctuation differences.
 *
 * @param {string} evidence - Evidence quote from the risk flag
 * @param {string} contractText - Full contract text
 * @returns {Object} Match result with details
 */
function checkEvidenceInContract(evidence, contractText) {
  if (!evidence || !contractText) {
    return {
      found: false,
      matchType: 'missing',
      reason: 'Evidence or contract text is missing'
    }
  }

  const normalizedEvidence = normalizeForMatching(evidence)
  const normalizedContract = normalizeForMatching(contractText)

  // Exact match after normalization
  if (normalizedContract.includes(normalizedEvidence)) {
    return {
      found: true,
      matchType: 'exact',
      reason: 'Evidence found verbatim in contract'
    }
  }

  // Try word-by-word matching with some flexibility
  const evidenceWords = normalizedEvidence.split(' ').filter((w) => w.length > 2)
  const contractWords = new Set(normalizedContract.split(' '))

  // Calculate word overlap
  const matchingWords = evidenceWords.filter((w) => contractWords.has(w))
  const overlapRatio = evidenceWords.length > 0 ? matchingWords.length / evidenceWords.length : 0

  // High overlap (>90%) might indicate paraphrasing
  if (overlapRatio > 0.9) {
    return {
      found: true,
      matchType: 'near-match',
      reason: `High word overlap (${(overlapRatio * 100).toFixed(0)}%) suggests paraphrase`,
      overlapRatio
    }
  }

  // Try finding key phrases (3+ consecutive words)
  const phrases = extractKeyPhrases(normalizedEvidence, 3)
  const foundPhrases = phrases.filter((phrase) => normalizedContract.includes(phrase))
  const phraseMatchRatio = phrases.length > 0 ? foundPhrases.length / phrases.length : 0

  if (phraseMatchRatio > 0.5) {
    return {
      found: true,
      matchType: 'partial',
      reason: `${foundPhrases.length}/${phrases.length} key phrases found in contract`,
      phraseMatchRatio,
      foundPhrases
    }
  }

  // Moderate overlap might be acceptable for technical terms
  if (overlapRatio > 0.6) {
    return {
      found: false,
      matchType: 'weak',
      reason: `Moderate word overlap (${(overlapRatio * 100).toFixed(0)}%) - may be inaccurate paraphrase`,
      overlapRatio
    }
  }

  return {
    found: false,
    matchType: 'not-found',
    reason: 'Evidence not found in contract text',
    overlapRatio
  }
}

/**
 * Extract key phrases (N consecutive words) from text.
 *
 * @param {string} text - Text to extract phrases from
 * @param {number} n - Number of consecutive words per phrase
 * @returns {string[]} Array of phrases
 */
function extractKeyPhrases(text, n) {
  const words = text.split(' ').filter((w) => w.length > 0)
  const phrases = []

  for (let i = 0; i <= words.length - n; i++) {
    phrases.push(words.slice(i, i + n).join(' '))
  }

  return phrases
}

/**
 * Check if evidence is too short to reasonably support a claim.
 *
 * @param {string} evidence - Evidence string
 * @returns {Object} Validation result
 */
function checkEvidenceLength(evidence) {
  if (!evidence || typeof evidence !== 'string') {
    return {
      valid: false,
      reason: 'No evidence provided'
    }
  }

  const trimmed = evidence.trim()

  if (trimmed.length === 0) {
    return {
      valid: false,
      reason: 'Evidence is empty'
    }
  }

  if (trimmed.length < MIN_EVIDENCE_LENGTH) {
    return {
      valid: false,
      reason: `Evidence too short (${trimmed.length} chars < ${MIN_EVIDENCE_LENGTH} minimum)`
    }
  }

  // Check word count
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount < 4) {
    return {
      valid: false,
      reason: `Evidence has too few words (${wordCount} words < 4 minimum)`
    }
  }

  return {
    valid: true,
    length: trimmed.length,
    wordCount
  }
}

/**
 * Detect hallucination for a single risk flag.
 *
 * @param {Object} risk - Risk flag object (must have evidence field)
 * @param {string} contractText - Full contract text
 * @returns {Object} Hallucination detection result
 */
function detectHallucination(risk, contractText) {
  const result = {
    term: risk.term,
    severity: risk.severity,
    section: risk.section,
    issue: risk.issue,
    evidence: risk.evidence,
    isHallucination: false,
    reasons: []
  }

  // Check 1: Evidence must exist
  if (!risk.evidence) {
    result.isHallucination = true
    result.reasons.push('Missing evidence field')
    return result
  }

  // Check 2: Evidence must be long enough
  const lengthCheck = checkEvidenceLength(risk.evidence)
  if (!lengthCheck.valid) {
    result.isHallucination = true
    result.reasons.push(lengthCheck.reason)
    return result
  }

  // Check 3: Evidence must appear in contract
  const matchCheck = checkEvidenceInContract(risk.evidence, contractText)
  if (!matchCheck.found) {
    result.isHallucination = true
    result.reasons.push(matchCheck.reason)
    result.matchDetails = matchCheck
  }

  // Include match details even for non-hallucinations
  result.matchType = matchCheck.matchType
  result.matchDetails = matchCheck

  return result
}

/**
 * Detect hallucinations across all risk flags in a single run result.
 *
 * @param {Object} result - Analysis result
 * @param {string} contractText - Full contract text
 * @returns {Object} Hallucination detection results
 */
function detectAllHallucinations(result, contractText) {
  const risks = result.riskFlags || []
  const detections = []
  let hallucinationCount = 0

  for (const risk of risks) {
    const detection = detectHallucination(risk, contractText)
    detections.push(detection)
    if (detection.isHallucination) {
      hallucinationCount++
    }
  }

  return {
    totalRisks: risks.length,
    hallucinationCount,
    hallucinationRate: risks.length > 0 ? hallucinationCount / risks.length : 0,
    detections,
    hasHallucinations: hallucinationCount > 0
  }
}

/**
 * Aggregate hallucination detection across multiple runs.
 *
 * @param {Object[]} results - Array of analysis results
 * @param {string} contractText - Full contract text
 * @returns {Object} Aggregated hallucination results
 */
function aggregateHallucinationDetection(results, contractText) {
  const allDetections = []
  let totalRisks = 0
  let totalHallucinations = 0

  for (let runIndex = 0; runIndex < results.length; runIndex++) {
    const result = results[runIndex]
    const detection = detectAllHallucinations(result, contractText)

    for (const d of detection.detections) {
      allDetections.push({
        ...d,
        runIndex
      })
    }

    totalRisks += detection.totalRisks
    totalHallucinations += detection.hallucinationCount
  }

  // Group hallucinations by term
  const hallucinationsByTerm = new Map()
  for (const d of allDetections) {
    if (d.isHallucination) {
      const term = d.term || 'unknown'
      if (!hallucinationsByTerm.has(term)) {
        hallucinationsByTerm.set(term, [])
      }
      hallucinationsByTerm.get(term).push(d)
    }
  }

  // Find recurring hallucinations (appear in multiple runs)
  const recurringHallucinations = []
  for (const [term, detections] of hallucinationsByTerm) {
    const uniqueRuns = new Set(detections.map((d) => d.runIndex)).size
    if (uniqueRuns > 1) {
      recurringHallucinations.push({
        term,
        occurrences: detections.length,
        uniqueRuns,
        reasons: [...new Set(detections.flatMap((d) => d.reasons))]
      })
    }
  }

  return {
    totalRisks,
    totalHallucinations,
    hallucinationRate: totalRisks > 0 ? totalHallucinations / totalRisks : 0,
    hallucinationsByTerm: Object.fromEntries(hallucinationsByTerm),
    recurringHallucinations,
    allDetections: allDetections.filter((d) => d.isHallucination)
  }
}

module.exports = {
  normalizeForMatching,
  checkEvidenceInContract,
  checkEvidenceLength,
  detectHallucination,
  detectAllHallucinations,
  aggregateHallucinationDetection,
  extractKeyPhrases
}
