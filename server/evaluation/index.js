/**
 * PPA Contract Analysis Evaluation Harness
 *
 * This module provides tools to evaluate the reliability and consistency
 * of AI-powered contract analysis across non-deterministic LLM runs.
 *
 * Features:
 * - Multi-run sampling for stability measurement
 * - Risk canonicalization for meaningful comparison
 * - Stability metrics (presence stability, severity variance)
 * - Hallucination detection (evidence grounding)
 * - Sentinel risk evaluation (must-detect/must-not-detect correctness)
 * - Regression detection between versions
 * - Human-readable and machine-readable reports
 */

const { DEFAULT_SAMPLE_COUNT } = require('./types')
const { runMultipleSamples, generateEvaluationId, hashContract, truncateContract } = require('./sampler')
const { computeAllRiskStabilities, computeAllKeyTermConsistencies, computeOverallStabilityScore, getStabilitySummary } = require('./stability')
const { aggregateHallucinationDetection } = require('./hallucination')
const { evaluateSentinel, sentinelSpecExists } = require('./sentinel')
const { compareEvaluations } = require('./regression')
const { generateJsonReport, generateHumanReadableReport, generateQuickSummary, generateCIOutput } = require('./reporter')

/**
 * Run a full evaluation of contract analysis.
 *
 * @param {Function} callAI - AI calling function (same signature as server's callAI)
 * @param {string} contractText - The contract text to analyze
 * @param {Object} options - Evaluation options
 * @param {number} options.sampleCount - Number of runs (default: 5)
 * @param {number} options.temperature - LLM temperature (default: 0.3)
 * @param {number} options.maxTokens - Max tokens (default: 2000)
 * @param {Object} options.baseline - Optional baseline evaluation for regression comparison
 * @param {boolean} options.sentinel - Enable sentinel evaluation (default: true if spec exists)
 * @param {string} options.sentinelSpec - Optional override path to sentinel spec file
 * @param {Function} options.onProgress - Optional progress callback
 * @returns {Promise<Object>} Evaluation results
 */
async function runEvaluation(callAI, contractText, options = {}) {
  const {
    sampleCount = DEFAULT_SAMPLE_COUNT,
    temperature = 0.3,
    maxTokens = 2000,
    baseline = null,
    sentinel = null, // null = auto-detect, true = require, false = disable
    sentinelSpec = null,
    onProgress = null
  } = options

  const evaluationId = generateEvaluationId()

  // Truncate contract if needed
  const truncated = truncateContract(contractText)

  // Run multiple samples
  const samplingResults = await runMultipleSamples(callAI, truncated.text, {
    sampleCount,
    temperature,
    maxTokens,
    onProgress
  })

  // Compute stability metrics
  const riskStabilities = computeAllRiskStabilities(samplingResults.results)
  const keyTermConsistencies = computeAllKeyTermConsistencies(samplingResults.results)
  const overallStabilityScore = computeOverallStabilityScore(riskStabilities, keyTermConsistencies)
  const stabilitySummary = getStabilitySummary(riskStabilities, keyTermConsistencies)

  // Detect hallucinations
  const hallucinationResults = aggregateHallucinationDetection(samplingResults.results, truncated.text)

  // Run sentinel evaluation if enabled
  let sentinelResults = null
  const shouldRunSentinel = sentinel === true ||
    (sentinel === null && sentinelSpecExists(samplingResults.contractHash, sentinelSpec))

  if (shouldRunSentinel) {
    sentinelResults = evaluateSentinel({
      results: samplingResults.results,
      contractHash: samplingResults.contractHash,
      hallucinationResults: hallucinationResults.allDetections || [],
      specPath: sentinelSpec
    })
  }

  // Generate JSON report
  const jsonReport = generateJsonReport({
    evaluationId,
    contractHash: samplingResults.contractHash,
    sampleCount: samplingResults.successCount,
    riskStabilities,
    keyTermConsistencies,
    overallStabilityScore,
    stabilitySummary,
    hallucinationResults,
    sentinelResults,
    regressionResults: null, // Will be added if baseline provided
    rawResults: samplingResults.results,
    contractText: truncated.text,
    options: { temperature, maxTokens }
  })

  // Run regression comparison if baseline provided
  if (baseline) {
    jsonReport.regression = compareEvaluations(baseline, jsonReport)
  }

  // Generate human-readable report
  const humanReadableReport = generateHumanReadableReport(jsonReport)

  // Generate quick summary
  const quickSummary = generateQuickSummary(jsonReport)

  // Generate CI output
  const ciOutput = generateCIOutput(jsonReport)

  return {
    evaluationId,
    jsonReport,
    humanReadableReport,
    quickSummary,
    ciOutput,
    raw: {
      samplingResults,
      riskStabilities,
      keyTermConsistencies,
      hallucinationResults,
      sentinelResults
    }
  }
}

/**
 * Compare two evaluation reports for regression.
 *
 * @param {Object} baselineReport - Baseline JSON report
 * @param {Object} newReport - New JSON report
 * @returns {Object} Regression comparison results
 */
function runRegressionComparison(baselineReport, newReport) {
  return compareEvaluations(baselineReport, newReport)
}

/**
 * Load an evaluation from a saved JSON file.
 *
 * @param {string} jsonString - JSON string of saved evaluation
 * @returns {Object} Parsed evaluation report
 */
function loadEvaluation(jsonString) {
  const report = JSON.parse(jsonString)

  if (!report.evaluationId || !report.stability || !report.hallucinations) {
    throw new Error('Invalid evaluation report format')
  }

  return report
}

/**
 * Create a minimal evaluation result from a single run (for quick checks).
 * This is useful when you want to check a single run without full sampling.
 *
 * @param {Object} singleResult - Single analysis result
 * @param {string} contractText - Contract text
 * @returns {Object} Minimal evaluation
 */
function createSingleRunEvaluation(singleResult, contractText) {
  const evaluationId = generateEvaluationId()

  const riskStabilities = computeAllRiskStabilities([singleResult])
  const keyTermConsistencies = computeAllKeyTermConsistencies([singleResult])
  const hallucinationResults = aggregateHallucinationDetection([singleResult], contractText)

  return {
    evaluationId,
    sampleCount: 1,
    contractHash: hashContract(contractText),
    stability: {
      risks: riskStabilities,
      keyTerms: keyTermConsistencies,
      overallScore: 1.0, // Single run has perfect consistency with itself
      note: 'Single run evaluation - stability metrics are not meaningful'
    },
    hallucinations: {
      detected: hallucinationResults.allDetections,
      hallucinationCount: hallucinationResults.totalHallucinations,
      hallucinationRate: hallucinationResults.hallucinationRate
    },
    result: singleResult
  }
}

// Export all modules for fine-grained access
module.exports = {
  // Main evaluation function
  runEvaluation,

  // Regression comparison
  runRegressionComparison,

  // Utilities
  loadEvaluation,
  createSingleRunEvaluation,

  // Sub-modules for direct access
  types: require('./types'),
  canonicalization: require('./canonicalization'),
  stability: require('./stability'),
  hallucination: require('./hallucination'),
  sentinel: require('./sentinel'),
  regression: require('./regression'),
  sampler: require('./sampler'),
  reporter: require('./reporter')
}
