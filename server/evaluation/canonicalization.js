/**
 * Canonicalization utilities for normalizing contract analysis outputs.
 * This module handles the normalization of risk flags and key terms
 * to enable meaningful comparison across non-deterministic LLM runs.
 */

const { SEVERITY_LEVELS, KEY_TERM_FIELDS } = require('./types')

/**
 * Normalize a string for comparison purposes.
 * - Lowercases
 * - Trims whitespace
 * - Normalizes multiple spaces to single space
 * - Removes punctuation for comparison
 *
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"()[\]{}]/g, '')
}

/**
 * Normalize a section reference for comparison.
 * Handles variations like "Section 4.2", "section 4.2", "§4.2", "4.2"
 * Also normalizes exhibit references and removes descriptive suffixes.
 *
 * @param {string} section - Section reference to normalize
 * @returns {string} Normalized section reference
 */
function normalizeSection(section) {
  if (!section || typeof section !== 'string') return 'unspecified'

  let normalized = section.toLowerCase().trim()

  // Remove common prefixes
  normalized = normalized.replace(/^(section|sec\.?|§)\s*/gi, '')

  // Normalize exhibit references: "exhibit 1, pricing" -> "exhibit-1"
  // Extract exhibit number and keep it simple
  const exhibitMatch = normalized.match(/exhibit\s*(\d+)/i)
  const exhibitPart = exhibitMatch ? `exhibit-${exhibitMatch[1]}` : ''

  // Extract section/subsection numbers, normalizing formats:
  // "section 4(d)", "section 4.d", "section 4d", "item 4(d)" -> "4d"
  // "section 2(c)", "section 2.c" -> "2c"
  const sectionMatch = normalized.match(/(?:section|item|part)\s*(\d+)[\s.(-]*([a-z])?[)\s]?/i)
  let sectionPart = ''
  if (sectionMatch) {
    sectionPart = sectionMatch[1] + (sectionMatch[2] || '')
  } else {
    // Try to extract standalone numbers like "3(d)" or "2.1" that aren't exhibit numbers
    // Look for patterns after exhibit reference or at end of string
    const afterExhibit = exhibitMatch
      ? normalized.slice(normalized.indexOf(exhibitMatch[0]) + exhibitMatch[0].length)
      : normalized
    const numberMatch = afterExhibit.match(/(\d+)[\s.(-]*([a-z])?[)\s]?/i)
    if (numberMatch) {
      sectionPart = numberMatch[1] + (numberMatch[2] || '')
    }
  }

  // Build canonical section reference
  const parts = []
  if (exhibitPart) parts.push(exhibitPart)
  if (sectionPart) parts.push(sectionPart)

  return parts.length > 0 ? parts.join('-') : 'unspecified'
}

/**
 * Normalize a risk term name for comparison.
 * Handles variations in naming like "Escalation Rate" vs "escalation rate" vs "Price Escalation"
 *
 * @param {string} term - Term name to normalize
 * @returns {string} Normalized term name
 */
function normalizeTerm(term) {
  if (!term || typeof term !== 'string') return 'unknown'

  const normalized = normalizeString(term)

  // Map common variations to canonical forms
  const termMappings = {
    'escalation rate': 'escalation-rate',
    'price escalation': 'escalation-rate',
    'annual escalation': 'escalation-rate',
    'rate escalation': 'escalation-rate',
    'termination clause': 'termination',
    'termination': 'termination',
    'early termination': 'termination',
    'contract termination': 'termination',
    'performance guarantee': 'performance-guarantee',
    'performance': 'performance-guarantee',
    'output guarantee': 'performance-guarantee',
    'system performance': 'performance-guarantee',
    'om responsibility': 'maintenance',
    'maintenance': 'maintenance',
    'operations maintenance': 'maintenance',
    'om': 'maintenance',
    'price per kwh': 'price',
    'pricing': 'price',
    'energy price': 'price',
    'kwh price': 'price',
    'capacity': 'capacity',
    'system size': 'capacity',
    'system capacity': 'capacity',
    'term length': 'term-length',
    'contract term': 'term-length',
    'agreement term': 'term-length',
    'duration': 'term-length',
    'warranty': 'warranty',
    'limited warranty': 'warranty',
    'liability': 'liability',
    'limitation of liability': 'liability',
    'indemnification': 'indemnification',
    'indemnity': 'indemnification',
    'force majeure': 'force-majeure',
    'insurance': 'insurance'
  }

  // Check for exact matches first
  if (termMappings[normalized]) {
    return termMappings[normalized]
  }

  // Check for partial matches
  for (const [pattern, canonical] of Object.entries(termMappings)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return canonical
    }
  }

  // Return normalized version if no mapping found
  return normalized.replace(/\s+/g, '-')
}

/**
 * Create a canonical identifier for a risk flag.
 * Uses term + section to create a unique identity.
 *
 * @param {Object} risk - Risk flag object
 * @param {string} risk.term - Risk term
 * @param {string} risk.section - Section reference
 * @returns {string} Canonical identifier
 */
function createCanonicalRiskId(risk) {
  const term = normalizeTerm(risk.term)
  const section = normalizeSection(risk.section)
  return `${term}@${section}`
}

/**
 * Canonicalize a risk flag for comparison.
 *
 * @param {Object} risk - Risk flag object
 * @returns {Object} Canonical risk representation
 */
function canonicalizeRisk(risk) {
  return {
    term: normalizeTerm(risk.term),
    severity: (risk.severity || 'low').toLowerCase(),
    section: normalizeSection(risk.section),
    canonicalId: createCanonicalRiskId(risk),
    originalTerm: risk.term,
    originalIssue: risk.issue,
    originalSection: risk.section,
    evidence: risk.evidence || null
  }
}

/**
 * Get a nested value from an object using dot notation.
 *
 * @param {Object} obj - Object to extract from
 * @param {string} path - Dot-notation path (e.g., "parties.buyer")
 * @returns {*} The value at the path, or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

/**
 * Normalize a key term value for comparison.
 * Handles "Not specified" and extracts core semantic values.
 *
 * @param {string} value - Key term value
 * @returns {string} Normalized value
 */
function normalizeKeyTermValue(value) {
  if (!value || typeof value !== 'string') return 'not-specified'

  const normalized = value.trim().toLowerCase()

  // Normalize variations of "not specified" - also match values that START with these phrases
  // or contain them as the primary content (before parenthetical explanations)
  if (
    normalized === 'not specified' ||
    normalized === 'not found' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'unknown' ||
    normalized === 'unspecified' ||
    normalized === '' ||
    normalized.startsWith('not specified') ||
    normalized.startsWith('not found') ||
    /^(blank|to be filled|to be determined|tbd|tba)/i.test(normalized)
  ) {
    return 'not-specified'
  }

  // Extract core value for common patterns:
  // "Optional (see Exhibit 4...)" -> "optional"
  // "Optional, as per Exhibit 4" -> "optional"
  if (/^optional/i.test(normalized)) {
    return 'optional'
  }

  // "Seller (as referenced in...)" -> "seller"
  // "Purchaser (per section...)" -> "purchaser"
  if (/^(seller|purchaser|buyer)/i.test(normalized)) {
    const match = normalized.match(/^(seller|purchaser|buyer)/i)
    return match[1].toLowerCase()
  }

  // Extract numeric values with units for terms like capacity, price
  // "500 kW DC" or "500kW" -> "500 kw"
  const numericMatch = normalized.match(/^[\d,.]+\s*(kw|mw|kwh|mwh|years?|days?|%|\$)?/i)
  if (numericMatch) {
    return numericMatch[0].replace(/\s+/g, ' ').toLowerCase()
  }

  // For term length, extract just the years/term structure
  // "Twenty (20) years initial term with..." -> "20 years initial term"
  const termMatch = normalized.match(
    /(?:twenty\s*\(?20\)?|twenty|20)\s*years?\s*(?:initial\s*)?term/i
  )
  if (termMatch) {
    return '20 years initial term'
  }

  // Remove parenthetical explanations for comparison
  // "Value (additional context)" -> "value"
  const withoutParens = value.trim().replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (withoutParens.length > 0 && withoutParens.length < value.length * 0.7) {
    return withoutParens.toLowerCase()
  }

  return value.trim().toLowerCase()
}

/**
 * Check if a key term value is considered "specified".
 *
 * @param {string} value - Key term value
 * @returns {boolean} Whether the value is specified
 */
function isKeyTermSpecified(value) {
  return normalizeKeyTermValue(value) !== 'not-specified'
}

/**
 * Extract all key terms from an analysis result as a flat object.
 *
 * @param {Object} result - Analysis result
 * @returns {Object.<string, string>} Flat key term object
 */
function extractKeyTerms(result) {
  const keyTerms = {}

  for (const field of KEY_TERM_FIELDS) {
    const value = getNestedValue(result.keyTerms, field)
    keyTerms[field] = normalizeKeyTermValue(value)
  }

  return keyTerms
}

/**
 * Group risks by their canonical ID across multiple runs.
 *
 * @param {Object[]} results - Array of analysis results
 * @returns {Map<string, Object[]>} Map of canonical ID to array of risk instances
 */
function groupRisksByCanonicalId(results) {
  const riskGroups = new Map()

  for (let runIndex = 0; runIndex < results.length; runIndex++) {
    const result = results[runIndex]
    const risks = result.riskFlags || []

    for (const risk of risks) {
      const canonical = canonicalizeRisk(risk)

      if (!riskGroups.has(canonical.canonicalId)) {
        riskGroups.set(canonical.canonicalId, [])
      }

      riskGroups.get(canonical.canonicalId).push({
        ...canonical,
        runIndex,
        originalRisk: risk
      })
    }
  }

  return riskGroups
}

/**
 * Group key term values by field across multiple runs.
 *
 * @param {Object[]} results - Array of analysis results
 * @returns {Map<string, string[]>} Map of field name to array of values per run
 */
function groupKeyTermsByField(results) {
  const termGroups = new Map()

  for (const field of KEY_TERM_FIELDS) {
    termGroups.set(field, [])
  }

  for (const result of results) {
    for (const field of KEY_TERM_FIELDS) {
      const value = getNestedValue(result.keyTerms, field)
      termGroups.get(field).push(normalizeKeyTermValue(value))
    }
  }

  return termGroups
}

module.exports = {
  normalizeString,
  normalizeSection,
  normalizeTerm,
  createCanonicalRiskId,
  canonicalizeRisk,
  getNestedValue,
  normalizeKeyTermValue,
  isKeyTermSpecified,
  extractKeyTerms,
  groupRisksByCanonicalId,
  groupKeyTermsByField,
  KEY_TERM_FIELDS
}
