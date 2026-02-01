/**
 * Multi-run sampling for contract analysis evaluation.
 * Runs the analysis multiple times to capture non-deterministic behavior.
 */

const crypto = require('crypto')
const { DEFAULT_SAMPLE_COUNT } = require('./types')

/**
 * Generate a hash of the contract text for identification.
 *
 * @param {string} contractText - The contract text
 * @returns {string} SHA-256 hash (first 16 chars)
 */
function hashContract(contractText) {
  return crypto.createHash('sha256').update(contractText).digest('hex').substring(0, 16)
}

/**
 * Generate a unique evaluation ID.
 *
 * @returns {string} Unique identifier
 */
function generateEvaluationId() {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(4).toString('hex')
  return `eval-${timestamp}-${random}`
}

/**
 * Create the system prompt for contract analysis with evidence requirement.
 *
 * @returns {string} System prompt
 */
function createAnalysisSystemPrompt() {
  return `You are an expert legal analyst specializing in Power Purchase Agreements (PPAs) for solar energy projects. Analyze contracts and provide clear, accurate information to help community members understand their agreements.

CRITICAL: For every risk flag, you MUST include an "evidence" field containing an EXACT quote from the contract that supports the risk. This quote must appear verbatim in the contract text.

Always respond with valid JSON in this exact format:
{
  "summary": "A 2-3 sentence plain-language overview of what this agreement means",
  "keyTerms": {
    "parties": { "buyer": "name or 'Not specified'", "seller": "name or 'Not specified'" },
    "termLength": "duration or 'Not specified'",
    "capacity": "system size or 'Not specified'",
    "pricePerKwh": "price or 'Not specified'",
    "escalationRate": "rate or 'Not specified'",
    "performanceGuarantee": "guarantee or 'Not specified'",
    "omResponsibility": "who maintains or 'Not specified'",
    "terminationClause": "terms or 'Not specified'"
  },
  "riskFlags": [
    {
      "severity": "high|medium|low",
      "term": "Name of concerning term",
      "issue": "Brief explanation of why this is flagged",
      "section": "Section reference if found",
      "evidence": "EXACT quote from the contract supporting this risk flag"
    }
  ]
}

Risk severity guidelines:
- HIGH: Terms that could result in significant financial loss or legal liability (e.g., very high escalation rates >3%, one-sided termination clauses, missing performance guarantees)
- MEDIUM: Terms that are less favorable than typical but not severely problematic (e.g., escalation rates 2-3%, limited warranty periods)
- LOW: Minor concerns or areas that could be improved (e.g., vague language, missing but non-critical details)

IMPORTANT RULES:
1. Every risk flag MUST have an "evidence" field with an exact quote from the contract
2. If you cannot find exact supporting text for a risk, do NOT include that risk
3. The evidence must be long enough to be meaningful (at least a full clause or sentence)
4. Do not paraphrase - copy the exact text from the contract`
}

/**
 * Create the user prompt for contract analysis.
 *
 * @param {string} contractText - The contract text to analyze
 * @returns {string} User prompt
 */
function createAnalysisUserPrompt(contractText) {
  return `Analyze this PPA contract and extract key terms and risk flags. Remember: every risk flag MUST include an exact "evidence" quote from the contract.

---CONTRACT TEXT---
${contractText}
---END CONTRACT---

Provide your analysis as JSON.`
}

/**
 * Parse the AI response to extract JSON.
 *
 * @param {string} response - Raw AI response
 * @returns {Object} Parsed analysis result
 */
function parseAIResponse(response) {
  if (!response) {
    throw new Error('Empty AI response')
  }

  // Extract JSON from response (handle markdown code blocks if present)
  let jsonStr = response
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  return JSON.parse(jsonStr.trim())
}

/**
 * Run a single analysis pass.
 *
 * @param {Function} callAI - AI calling function
 * @param {string} contractText - Contract text to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis result
 */
async function runSingleAnalysis(callAI, contractText, options = {}) {
  const { maxTokens = 2000, temperature = 0.3 } = options

  const systemPrompt = createAnalysisSystemPrompt()
  const userPrompt = createAnalysisUserPrompt(contractText)

  const response = await callAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { maxTokens, temperature }
  )

  const result = parseAIResponse(response)

  return {
    ...result,
    _meta: {
      timestamp: new Date().toISOString(),
      temperature
    }
  }
}

/**
 * Run multiple analysis passes for a contract.
 *
 * @param {Function} callAI - AI calling function
 * @param {string} contractText - Contract text to analyze
 * @param {Object} options - Sampling options
 * @returns {Promise<Object>} Sampling results
 */
async function runMultipleSamples(callAI, contractText, options = {}) {
  const {
    sampleCount = DEFAULT_SAMPLE_COUNT,
    maxTokens = 2000,
    temperature = 0.3,
    concurrency = 2, // Run 2 at a time to balance speed vs rate limits
    onProgress = null
  } = options

  const results = []
  const errors = []
  const startTime = Date.now()

  // Run samples with controlled concurrency
  for (let i = 0; i < sampleCount; i += concurrency) {
    const batch = []
    const batchSize = Math.min(concurrency, sampleCount - i)

    for (let j = 0; j < batchSize; j++) {
      const runIndex = i + j
      batch.push(
        runSingleAnalysis(callAI, contractText, { maxTokens, temperature })
          .then((result) => {
            results.push({ runIndex, result, success: true })
            if (onProgress) {
              onProgress({ completed: results.length, total: sampleCount, runIndex })
            }
          })
          .catch((error) => {
            errors.push({ runIndex, error: error.message })
            if (onProgress) {
              onProgress({
                completed: results.length,
                total: sampleCount,
                runIndex,
                error: error.message
              })
            }
          })
      )
    }

    await Promise.all(batch)

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < sampleCount) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const endTime = Date.now()

  // Sort results by run index
  results.sort((a, b) => a.runIndex - b.runIndex)

  return {
    contractHash: hashContract(contractText),
    sampleCount,
    successCount: results.length,
    errorCount: errors.length,
    durationMs: endTime - startTime,
    results: results.map((r) => r.result),
    errors,
    options: { maxTokens, temperature }
  }
}

/**
 * Truncate contract text if needed.
 *
 * @param {string} contractText - Original contract text
 * @param {number} maxChars - Maximum characters
 * @returns {Object} Truncated text and metadata
 */
function truncateContract(contractText, maxChars = 15000) {
  if (contractText.length <= maxChars) {
    return {
      text: contractText,
      truncated: false,
      originalLength: contractText.length
    }
  }

  return {
    text: contractText.substring(0, maxChars) + '\n\n[Contract text truncated for analysis...]',
    truncated: true,
    originalLength: contractText.length,
    truncatedLength: maxChars
  }
}

module.exports = {
  hashContract,
  generateEvaluationId,
  createAnalysisSystemPrompt,
  createAnalysisUserPrompt,
  parseAIResponse,
  runSingleAnalysis,
  runMultipleSamples,
  truncateContract
}
