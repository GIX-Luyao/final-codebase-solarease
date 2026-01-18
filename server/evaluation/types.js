/**
 * Types and constants for the PPA contract analysis evaluation harness.
 * This module defines the data structures used throughout the evaluation system.
 */

/**
 * Severity levels for risk flags
 * @type {Object.<string, number>}
 */
const SEVERITY_LEVELS = {
  low: 1,
  medium: 2,
  high: 3
}

/**
 * Severity variance threshold for flagging unreliable risks
 */
const SEVERITY_VARIANCE_THRESHOLD = 2

/**
 * Stability threshold below which a risk is considered unreliable
 */
const STABILITY_THRESHOLD = 0.8

/**
 * Minimum evidence length to be considered valid (characters)
 */
const MIN_EVIDENCE_LENGTH = 20

/**
 * Default number of sampling runs
 */
const DEFAULT_SAMPLE_COUNT = 5

/**
 * Key terms that should be tracked for consistency
 */
const KEY_TERM_FIELDS = [
  'parties.buyer',
  'parties.seller',
  'termLength',
  'capacity',
  'pricePerKwh',
  'escalationRate',
  'performanceGuarantee',
  'omResponsibility',
  'terminationClause'
]

/**
 * @typedef {Object} RiskFlag
 * @property {'high'|'medium'|'low'} severity - Risk severity level
 * @property {string} term - Name of the concerning term
 * @property {string} issue - Brief explanation of the risk
 * @property {string} [section] - Section reference in the contract
 * @property {string} evidence - Exact quote from the contract supporting this risk
 */

/**
 * @typedef {Object} KeyTerms
 * @property {{buyer: string, seller: string}} parties
 * @property {string} termLength
 * @property {string} capacity
 * @property {string} pricePerKwh
 * @property {string} escalationRate
 * @property {string} performanceGuarantee
 * @property {string} omResponsibility
 * @property {string} terminationClause
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} summary - Plain-language overview
 * @property {KeyTerms} keyTerms - Extracted contract terms
 * @property {RiskFlag[]} riskFlags - Identified risks
 * @property {string} [disclaimer] - Legal disclaimer
 * @property {string} [fileName] - Source file name
 */

/**
 * @typedef {Object} CanonicalRisk
 * @property {string} term - Normalized term name
 * @property {'high'|'medium'|'low'} severity - Risk severity
 * @property {string} section - Section reference (normalized)
 * @property {string} canonicalId - Unique identifier for this risk type
 */

/**
 * @typedef {Object} RiskStabilityMetrics
 * @property {string} canonicalId - The canonical risk identifier
 * @property {string} term - Risk term name
 * @property {number} presenceCount - Number of runs where this risk appeared
 * @property {number} totalRuns - Total number of runs
 * @property {number} stability - Presence stability (presenceCount / totalRuns)
 * @property {string[]} severitiesObserved - All severity levels observed
 * @property {number} severityVariance - Max severity difference observed
 * @property {boolean} isReliable - Whether this risk passes reliability thresholds
 * @property {string[]} issues - Different issue descriptions observed
 * @property {string[]} sections - Different sections observed
 */

/**
 * @typedef {Object} KeyTermConsistency
 * @property {string} field - The key term field name
 * @property {Map<string, number>} values - Map of observed values to their counts
 * @property {number} specifiedCount - Number of runs where value was specified
 * @property {number} notSpecifiedCount - Number of runs where value was "Not specified"
 * @property {boolean} isConsistent - Whether the value is consistent across runs
 * @property {string} mostCommonValue - The most frequently observed value
 */

/**
 * @typedef {Object} HallucinationResult
 * @property {boolean} isHallucination - Whether this is a hallucination
 * @property {string} reason - Explanation of the finding
 * @property {string} evidence - The evidence string that was checked
 * @property {string} term - The risk term
 */

/**
 * @typedef {Object} RegressionResult
 * @property {'FAIL'|'WARN'|'PASS'} status - Regression check status
 * @property {string} type - Type of regression detected
 * @property {string} description - Human-readable description
 * @property {Object} [details] - Additional details about the regression
 */

/**
 * @typedef {Object} EvaluationReport
 * @property {string} evaluationId - Unique identifier for this evaluation
 * @property {string} timestamp - ISO timestamp of evaluation
 * @property {string} contractHash - Hash of the contract text
 * @property {number} sampleCount - Number of runs performed
 * @property {Object} stability - Stability metrics
 * @property {RiskStabilityMetrics[]} stability.risks - Risk stability metrics
 * @property {KeyTermConsistency[]} stability.keyTerms - Key term consistency metrics
 * @property {number} stability.overallScore - Overall stability score (0-1)
 * @property {Object} hallucinations - Hallucination detection results
 * @property {HallucinationResult[]} hallucinations.detected - Detected hallucinations
 * @property {number} hallucinations.count - Total hallucination count
 * @property {Object} [regression] - Regression results (if baseline provided)
 * @property {RegressionResult[]} regression.results - Individual regression results
 * @property {'PASS'|'WARN'|'FAIL'} regression.overallStatus - Overall regression status
 * @property {Object} summary - High-level summary
 * @property {string[]} summary.unreliableRisks - List of unreliable risk terms
 * @property {string[]} summary.severityFlips - List of risks with severity variance
 * @property {string[]} summary.inconsistentTerms - List of inconsistent key terms
 * @property {AnalysisResult[]} rawResults - All raw analysis results
 */

module.exports = {
  SEVERITY_LEVELS,
  SEVERITY_VARIANCE_THRESHOLD,
  STABILITY_THRESHOLD,
  MIN_EVIDENCE_LENGTH,
  DEFAULT_SAMPLE_COUNT,
  KEY_TERM_FIELDS
}
