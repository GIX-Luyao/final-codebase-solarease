/**
 * Stability metrics computation for contract analysis evaluation.
 * Measures consistency of risk flags and key terms across multiple LLM runs.
 */

const {
  SEVERITY_LEVELS,
  SEVERITY_VARIANCE_THRESHOLD,
  STABILITY_THRESHOLD
} = require('./types')

const {
  groupRisksByCanonicalId,
  groupKeyTermsByField,
  normalizeKeyTermValue,
  isKeyTermSpecified
} = require('./canonicalization')

/**
 * Calculate the severity variance for a set of severity values.
 * Returns the difference between max and min severity levels.
 *
 * @param {string[]} severities - Array of severity strings
 * @returns {number} Severity variance (0, 1, or 2)
 */
function calculateSeverityVariance(severities) {
  if (!severities || severities.length === 0) return 0

  const levels = severities.map((s) => SEVERITY_LEVELS[s.toLowerCase()] || 1)
  const max = Math.max(...levels)
  const min = Math.min(...levels)

  return max - min
}

/**
 * Compute stability metrics for a single risk across all runs.
 *
 * @param {string} canonicalId - The canonical risk identifier
 * @param {Object[]} instances - All instances of this risk across runs
 * @param {number} totalRuns - Total number of evaluation runs
 * @returns {Object} Risk stability metrics
 */
function computeRiskStability(canonicalId, instances, totalRuns) {
  const presenceCount = new Set(instances.map((i) => i.runIndex)).size
  const stability = presenceCount / totalRuns

  const severities = instances.map((i) => i.severity)
  const uniqueSeverities = [...new Set(severities)]
  const severityVariance = calculateSeverityVariance(severities)

  const issues = [...new Set(instances.map((i) => i.originalIssue).filter(Boolean))]
  const sections = [...new Set(instances.map((i) => i.section).filter(Boolean))]
  const terms = [...new Set(instances.map((i) => i.originalTerm).filter(Boolean))]

  // A risk is reliable if:
  // 1. Stability >= threshold (appears consistently)
  // 2. Severity variance < threshold (no wild swings)
  const isReliable =
    stability >= STABILITY_THRESHOLD && severityVariance < SEVERITY_VARIANCE_THRESHOLD

  // Determine the consensus severity (most common)
  const severityCounts = {}
  for (const sev of severities) {
    severityCounts[sev] = (severityCounts[sev] || 0) + 1
  }
  const consensusSeverity = Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  return {
    canonicalId,
    term: terms[0] || canonicalId,
    presenceCount,
    totalRuns,
    stability,
    severitiesObserved: uniqueSeverities,
    severityVariance,
    isReliable,
    consensusSeverity,
    issues,
    sections,
    instances
  }
}

/**
 * Compute stability metrics for all risks across multiple runs.
 *
 * @param {Object[]} results - Array of analysis results from multiple runs
 * @returns {Object[]} Array of risk stability metrics
 */
function computeAllRiskStabilities(results) {
  const totalRuns = results.length
  const riskGroups = groupRisksByCanonicalId(results)
  const stabilities = []

  for (const [canonicalId, instances] of riskGroups) {
    stabilities.push(computeRiskStability(canonicalId, instances, totalRuns))
  }

  // Sort by stability descending, then by severity variance ascending
  stabilities.sort((a, b) => {
    if (a.stability !== b.stability) return b.stability - a.stability
    return a.severityVariance - b.severityVariance
  })

  return stabilities
}

/**
 * Compute consistency metrics for a single key term field.
 *
 * @param {string} field - Field name
 * @param {string[]} values - All values observed across runs
 * @returns {Object} Key term consistency metrics
 */
function computeKeyTermConsistency(field, values) {
  const totalRuns = values.length

  // Count occurrences of each value
  const valueCounts = new Map()
  let specifiedCount = 0
  let notSpecifiedCount = 0

  for (const value of values) {
    const normalized = normalizeKeyTermValue(value)
    valueCounts.set(normalized, (valueCounts.get(normalized) || 0) + 1)

    if (isKeyTermSpecified(value)) {
      specifiedCount++
    } else {
      notSpecifiedCount++
    }
  }

  // Find most common value
  let mostCommonValue = 'not-specified'
  let maxCount = 0
  for (const [value, count] of valueCounts) {
    if (count > maxCount) {
      maxCount = count
      mostCommonValue = value
    }
  }

  // Calculate consistency: highest single value count / total runs
  const consistencyScore = maxCount / totalRuns

  // A term is consistent if one value appears in >= 80% of runs
  const isConsistent = consistencyScore >= STABILITY_THRESHOLD

  // Get all unique values (excluding most common for variance display)
  const uniqueValues = [...valueCounts.keys()]
  const variantValues = uniqueValues.filter((v) => v !== mostCommonValue)

  return {
    field,
    totalRuns,
    specifiedCount,
    notSpecifiedCount,
    mostCommonValue,
    consistencyScore,
    isConsistent,
    uniqueValues,
    variantValues,
    valueCounts: Object.fromEntries(valueCounts)
  }
}

/**
 * Compute consistency metrics for all key terms across multiple runs.
 *
 * @param {Object[]} results - Array of analysis results from multiple runs
 * @returns {Object[]} Array of key term consistency metrics
 */
function computeAllKeyTermConsistencies(results) {
  const termGroups = groupKeyTermsByField(results)
  const consistencies = []

  for (const [field, values] of termGroups) {
    consistencies.push(computeKeyTermConsistency(field, values))
  }

  return consistencies
}

/**
 * Compute an overall stability score for the evaluation.
 *
 * Uses a weighted approach that:
 * - Filters out one-off risks (noise) when computing average stability
 * - Weights risk stability by presence count (more appearances = more weight)
 * - Focuses on "core risks" that appear in multiple runs
 *
 * Components:
 * - Weighted average risk stability (40%) - ignores single-occurrence risks
 * - Proportion of reliable risks among multi-occurrence risks (30%)
 * - Average key term consistency (30%)
 *
 * @param {Object[]} riskStabilities - Risk stability metrics
 * @param {Object[]} keyTermConsistencies - Key term consistency metrics
 * @returns {number} Overall stability score (0-1)
 */
function computeOverallStabilityScore(riskStabilities, keyTermConsistencies) {
  // Filter to risks that appeared more than once (reduce noise from one-off detections)
  const multiOccurrenceRisks = riskStabilities.filter((r) => r.presenceCount > 1)

  // Weighted average risk stability (weighted by presence count)
  // Risks that appear more often contribute more to the score
  let avgRiskStability = 1
  if (multiOccurrenceRisks.length > 0) {
    const totalWeight = multiOccurrenceRisks.reduce((sum, r) => sum + r.presenceCount, 0)
    const weightedSum = multiOccurrenceRisks.reduce(
      (sum, r) => sum + r.stability * r.presenceCount,
      0
    )
    avgRiskStability = weightedSum / totalWeight
  }

  // Proportion of reliable risks (among multi-occurrence risks only)
  const reliableRiskCount = multiOccurrenceRisks.filter((r) => r.isReliable).length
  const reliableRiskProportion =
    multiOccurrenceRisks.length > 0 ? reliableRiskCount / multiOccurrenceRisks.length : 1

  // Average key term consistency
  const avgKeyTermConsistency =
    keyTermConsistencies.length > 0
      ? keyTermConsistencies.reduce((sum, k) => sum + k.consistencyScore, 0) /
        keyTermConsistencies.length
      : 1

  // Weighted average
  const overallScore =
    avgRiskStability * 0.4 + reliableRiskProportion * 0.3 + avgKeyTermConsistency * 0.3

  return Math.round(overallScore * 1000) / 1000
}

/**
 * Get a summary of stability issues.
 *
 * @param {Object[]} riskStabilities - Risk stability metrics
 * @param {Object[]} keyTermConsistencies - Key term consistency metrics
 * @returns {Object} Summary of issues
 */
function getStabilitySummary(riskStabilities, keyTermConsistencies) {
  const unreliableRisks = riskStabilities
    .filter((r) => !r.isReliable)
    .map((r) => ({
      term: r.term,
      stability: r.stability,
      severityVariance: r.severityVariance,
      reason:
        r.stability < STABILITY_THRESHOLD
          ? `Low stability (${(r.stability * 100).toFixed(0)}%)`
          : `High severity variance (${r.severitiesObserved.join(' vs ')})`
    }))

  const severityFlips = riskStabilities
    .filter((r) => r.severityVariance >= SEVERITY_VARIANCE_THRESHOLD)
    .map((r) => ({
      term: r.term,
      severities: r.severitiesObserved,
      variance: r.severityVariance
    }))

  const inconsistentTerms = keyTermConsistencies
    .filter((k) => !k.isConsistent)
    .map((k) => ({
      field: k.field,
      consistencyScore: k.consistencyScore,
      variants: k.uniqueValues
    }))

  return {
    unreliableRisks,
    severityFlips,
    inconsistentTerms,
    reliableRiskCount: riskStabilities.filter((r) => r.isReliable).length,
    totalRiskCount: riskStabilities.length,
    consistentTermCount: keyTermConsistencies.filter((k) => k.isConsistent).length,
    totalTermCount: keyTermConsistencies.length
  }
}

module.exports = {
  calculateSeverityVariance,
  computeRiskStability,
  computeAllRiskStabilities,
  computeKeyTermConsistency,
  computeAllKeyTermConsistencies,
  computeOverallStabilityScore,
  getStabilitySummary
}
