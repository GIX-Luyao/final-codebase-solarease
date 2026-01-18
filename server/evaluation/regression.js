/**
 * Regression detection for contract analysis evaluation.
 * Compares baseline version analysis with new version to detect:
 * - Missing HIGH risks
 * - Severity downgrades
 * - New HIGH risks
 * - Material summary changes
 */

const { SEVERITY_LEVELS, STABILITY_THRESHOLD } = require('./types')
const { canonicalizeRisk, normalizeString } = require('./canonicalization')

/**
 * Extract reliable high-severity risks from stability metrics.
 * Only considers risks that appear consistently across runs.
 *
 * @param {Object[]} riskStabilities - Risk stability metrics from evaluation
 * @returns {Map<string, Object>} Map of canonical ID to risk info
 */
function extractReliableHighRisks(riskStabilities) {
  const highRisks = new Map()

  for (const risk of riskStabilities) {
    // Consider a risk as "reliably high" if:
    // 1. It has high stability (appears in most runs)
    // 2. Its consensus severity is "high"
    // 3. OR it appears with "high" severity in any run with good stability
    const isReliablyPresent = risk.stability >= STABILITY_THRESHOLD * 0.9 // Slightly relaxed threshold
    const hasHighSeverity = risk.severitiesObserved.includes('high')
    const consensusIsHigh = risk.consensusSeverity === 'high'

    if (isReliablyPresent && (consensusIsHigh || (hasHighSeverity && risk.stability >= 0.6))) {
      highRisks.set(risk.canonicalId, {
        term: risk.term,
        consensusSeverity: risk.consensusSeverity,
        stability: risk.stability,
        canonicalId: risk.canonicalId
      })
    }
  }

  return highRisks
}

/**
 * Extract consensus severities from stability metrics.
 *
 * @param {Object[]} riskStabilities - Risk stability metrics
 * @returns {Map<string, string>} Map of canonical ID to consensus severity
 */
function extractConsensusSeverities(riskStabilities) {
  const severities = new Map()

  for (const risk of riskStabilities) {
    if (risk.stability >= STABILITY_THRESHOLD * 0.7) {
      // Include reasonably stable risks
      severities.set(risk.canonicalId, risk.consensusSeverity)
    }
  }

  return severities
}

/**
 * Check for HIGH risks that disappeared between versions.
 *
 * @param {Object[]} baselineStabilities - Baseline risk stabilities
 * @param {Object[]} newStabilities - New version risk stabilities
 * @returns {Object[]} Array of regression results for missing risks
 */
function checkMissingHighRisks(baselineStabilities, newStabilities) {
  const results = []

  const baselineHighRisks = extractReliableHighRisks(baselineStabilities)
  const newRiskIds = new Set(newStabilities.map((r) => r.canonicalId))

  for (const [canonicalId, riskInfo] of baselineHighRisks) {
    // Check if this risk appears at all in the new version
    const newRisk = newStabilities.find((r) => r.canonicalId === canonicalId)

    if (!newRisk) {
      results.push({
        status: 'FAIL',
        type: 'missing-high-risk',
        description: `HIGH risk "${riskInfo.term}" disappeared in new version`,
        details: {
          canonicalId,
          term: riskInfo.term,
          baselineStability: riskInfo.stability,
          wasConsensusSeverity: riskInfo.consensusSeverity
        }
      })
    } else if (newRisk.stability < STABILITY_THRESHOLD * 0.5) {
      // Risk exists but appears very inconsistently
      results.push({
        status: 'FAIL',
        type: 'destabilized-high-risk',
        description: `HIGH risk "${riskInfo.term}" became unstable (${(newRisk.stability * 100).toFixed(0)}% vs ${(riskInfo.stability * 100).toFixed(0)}%)`,
        details: {
          canonicalId,
          term: riskInfo.term,
          baselineStability: riskInfo.stability,
          newStability: newRisk.stability
        }
      })
    }
  }

  return results
}

/**
 * Check for severity downgrades between versions.
 *
 * @param {Object[]} baselineStabilities - Baseline risk stabilities
 * @param {Object[]} newStabilities - New version risk stabilities
 * @returns {Object[]} Array of regression results for downgrades
 */
function checkSeverityDowngrades(baselineStabilities, newStabilities) {
  const results = []

  const baselineSeverities = extractConsensusSeverities(baselineStabilities)
  const newSeverities = extractConsensusSeverities(newStabilities)

  for (const [canonicalId, baselineSeverity] of baselineSeverities) {
    const newSeverity = newSeverities.get(canonicalId)

    if (!newSeverity) continue // Missing risks handled separately

    const baselineLevel = SEVERITY_LEVELS[baselineSeverity] || 1
    const newLevel = SEVERITY_LEVELS[newSeverity] || 1

    if (newLevel < baselineLevel) {
      // Find the term name for better reporting
      const baselineRisk = baselineStabilities.find((r) => r.canonicalId === canonicalId)
      const term = baselineRisk?.term || canonicalId

      results.push({
        status: 'FAIL',
        type: 'severity-downgrade',
        description: `Risk "${term}" downgraded from ${baselineSeverity.toUpperCase()} to ${newSeverity.toUpperCase()}`,
        details: {
          canonicalId,
          term,
          oldSeverity: baselineSeverity,
          newSeverity
        }
      })
    }
  }

  return results
}

/**
 * Check for new HIGH risks that appeared in the new version.
 *
 * @param {Object[]} baselineStabilities - Baseline risk stabilities
 * @param {Object[]} newStabilities - New version risk stabilities
 * @returns {Object[]} Array of regression results for new risks
 */
function checkNewHighRisks(baselineStabilities, newStabilities) {
  const results = []

  const baselineRiskIds = new Set(baselineStabilities.map((r) => r.canonicalId))
  const newHighRisks = extractReliableHighRisks(newStabilities)

  for (const [canonicalId, riskInfo] of newHighRisks) {
    if (!baselineRiskIds.has(canonicalId)) {
      results.push({
        status: 'WARN',
        type: 'new-high-risk',
        description: `New HIGH risk "${riskInfo.term}" appeared in new version`,
        details: {
          canonicalId,
          term: riskInfo.term,
          severity: riskInfo.consensusSeverity,
          stability: riskInfo.stability
        }
      })
    }
  }

  return results
}

/**
 * Extract key concepts/terms from a summary for comparison.
 *
 * @param {string} summary - Summary text
 * @returns {Set<string>} Set of key terms
 */
function extractSummaryConcepts(summary) {
  if (!summary || typeof summary !== 'string') return new Set()

  const normalized = normalizeString(summary)

  // Extract significant terms (>4 chars, not stopwords)
  const stopwords = new Set([
    'this',
    'that',
    'with',
    'from',
    'have',
    'will',
    'would',
    'could',
    'should',
    'been',
    'being',
    'their',
    'there',
    'about',
    'which',
    'where',
    'these',
    'those',
    'through',
    'between',
    'under',
    'over',
    'also',
    'than',
    'then',
    'some',
    'such',
    'other',
    'into',
    'only',
    'very',
    'just',
    'more',
    'most',
    'both',
    'each',
    'during',
    'before',
    'after',
    'while'
  ])

  const terms = normalized
    .split(/\s+/)
    .filter((term) => term.length > 4 && !stopwords.has(term))
    .map((term) => term.replace(/[^a-z0-9]/g, ''))
    .filter((term) => term.length > 4)

  return new Set(terms)
}

/**
 * Check if summary meaning has materially changed.
 *
 * @param {string[]} baselineSummaries - Summaries from baseline runs
 * @param {string[]} newSummaries - Summaries from new version runs
 * @returns {Object[]} Array of regression results
 */
function checkSummaryChanges(baselineSummaries, newSummaries) {
  const results = []

  // Extract concepts from all summaries
  const baselineConcepts = new Set()
  for (const summary of baselineSummaries) {
    for (const concept of extractSummaryConcepts(summary)) {
      baselineConcepts.add(concept)
    }
  }

  const newConcepts = new Set()
  for (const summary of newSummaries) {
    for (const concept of extractSummaryConcepts(summary)) {
      newConcepts.add(concept)
    }
  }

  // Find concepts that disappeared
  const missingConcepts = [...baselineConcepts].filter((c) => !newConcepts.has(c))

  // Find new concepts that appeared
  const addedConcepts = [...newConcepts].filter((c) => !baselineConcepts.has(c))

  // Calculate Jaccard similarity
  const intersection = [...baselineConcepts].filter((c) => newConcepts.has(c)).length
  const union = new Set([...baselineConcepts, ...newConcepts]).size
  const similarity = union > 0 ? intersection / union : 1

  // Warn if similarity is below threshold (significant change)
  if (similarity < 0.6) {
    results.push({
      status: 'WARN',
      type: 'summary-material-change',
      description: `Summary meaning may have materially changed (${(similarity * 100).toFixed(0)}% concept overlap)`,
      details: {
        similarity,
        missingConcepts: missingConcepts.slice(0, 10),
        addedConcepts: addedConcepts.slice(0, 10),
        baselineConceptCount: baselineConcepts.size,
        newConceptCount: newConcepts.size
      }
    })
  } else if (similarity < 0.8 && (missingConcepts.length > 3 || addedConcepts.length > 3)) {
    results.push({
      status: 'WARN',
      type: 'summary-notable-change',
      description: `Summary has notable changes (${(similarity * 100).toFixed(0)}% concept overlap)`,
      details: {
        similarity,
        missingConcepts: missingConcepts.slice(0, 5),
        addedConcepts: addedConcepts.slice(0, 5)
      }
    })
  }

  return results
}

/**
 * Perform full regression comparison between baseline and new evaluation.
 *
 * @param {Object} baselineEval - Baseline evaluation report
 * @param {Object} newEval - New version evaluation report
 * @returns {Object} Regression comparison results
 */
function compareEvaluations(baselineEval, newEval) {
  const results = []

  // Check for missing HIGH risks (FAIL)
  results.push(
    ...checkMissingHighRisks(baselineEval.stability.risks, newEval.stability.risks)
  )

  // Check for severity downgrades (FAIL)
  results.push(
    ...checkSeverityDowngrades(baselineEval.stability.risks, newEval.stability.risks)
  )

  // Check for new HIGH risks (WARN)
  results.push(...checkNewHighRisks(baselineEval.stability.risks, newEval.stability.risks))

  // Check for summary material changes (WARN)
  const baselineSummaries = baselineEval.rawResults.map((r) => r.summary)
  const newSummaries = newEval.rawResults.map((r) => r.summary)
  results.push(...checkSummaryChanges(baselineSummaries, newSummaries))

  // Determine overall status
  let overallStatus = 'PASS'
  const failCount = results.filter((r) => r.status === 'FAIL').length
  const warnCount = results.filter((r) => r.status === 'WARN').length

  if (failCount > 0) {
    overallStatus = 'FAIL'
  } else if (warnCount > 0) {
    overallStatus = 'WARN'
  }

  return {
    overallStatus,
    failCount,
    warnCount,
    passCount: results.length - failCount - warnCount,
    results,
    comparison: {
      baselineEvaluationId: baselineEval.evaluationId,
      newEvaluationId: newEval.evaluationId,
      baselineSampleCount: baselineEval.sampleCount,
      newSampleCount: newEval.sampleCount
    }
  }
}

module.exports = {
  extractReliableHighRisks,
  extractConsensusSeverities,
  checkMissingHighRisks,
  checkSeverityDowngrades,
  checkNewHighRisks,
  checkSummaryChanges,
  extractSummaryConcepts,
  compareEvaluations
}
