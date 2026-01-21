/**
 * Report generation for contract analysis evaluation.
 * Produces both machine-readable JSON and human-readable summaries.
 */

const { STABILITY_THRESHOLD, SEVERITY_VARIANCE_THRESHOLD } = require('./types')

/**
 * Format a percentage value for display.
 *
 * @param {number} value - Value between 0 and 1
 * @returns {string} Formatted percentage
 */
function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

/**
 * Generate the machine-readable JSON evaluation report.
 *
 * @param {Object} params - Report parameters
 * @returns {Object} Complete evaluation report
 */
function generateJsonReport(params) {
  const {
    evaluationId,
    contractHash,
    sampleCount,
    riskStabilities,
    keyTermConsistencies,
    overallStabilityScore,
    stabilitySummary,
    hallucinationResults,
    sentinelResults,
    regressionResults,
    rawResults,
    contractText,
    options
  } = params

  return {
    evaluationId,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    contractHash,
    sampleCount,
    options: {
      temperature: options?.temperature || 0.3,
      maxTokens: options?.maxTokens || 2000
    },
    stability: {
      overallScore: overallStabilityScore,
      risks: riskStabilities.map((r) => ({
        canonicalId: r.canonicalId,
        term: r.term,
        presenceCount: r.presenceCount,
        totalRuns: r.totalRuns,
        stability: r.stability,
        severitiesObserved: r.severitiesObserved,
        consensusSeverity: r.consensusSeverity,
        severityVariance: r.severityVariance,
        isReliable: r.isReliable,
        sections: r.sections,
        issueVariants: r.issues?.slice(0, 3) // Limit to 3 variants
      })),
      keyTerms: keyTermConsistencies.map((k) => ({
        field: k.field,
        specifiedCount: k.specifiedCount,
        notSpecifiedCount: k.notSpecifiedCount,
        consistencyScore: k.consistencyScore,
        isConsistent: k.isConsistent,
        mostCommonValue: k.mostCommonValue,
        variants: k.variantValues?.slice(0, 3)
      })),
      summary: {
        unreliableRiskCount: stabilitySummary.unreliableRisks.length,
        severityFlipCount: stabilitySummary.severityFlips.length,
        inconsistentTermCount: stabilitySummary.inconsistentTerms.length,
        reliableRiskRatio: `${stabilitySummary.reliableRiskCount}/${stabilitySummary.totalRiskCount}`,
        consistentTermRatio: `${stabilitySummary.consistentTermCount}/${stabilitySummary.totalTermCount}`
      }
    },
    hallucinations: {
      totalRisks: hallucinationResults.totalRisks,
      hallucinationCount: hallucinationResults.totalHallucinations,
      hallucinationRate: hallucinationResults.hallucinationRate,
      detected: hallucinationResults.allDetections.map((d) => ({
        term: d.term,
        severity: d.severity,
        section: d.section,
        reasons: d.reasons,
        runIndex: d.runIndex
      })),
      recurringHallucinations: hallucinationResults.recurringHallucinations
    },
    sentinel: sentinelResults || null,
    regression: regressionResults || null,
    rawResults: rawResults.map((r, i) => ({
      runIndex: i,
      summary: r.summary,
      keyTerms: r.keyTerms,
      riskFlags: r.riskFlags
    }))
  }
}

/**
 * Generate a human-readable text report.
 *
 * @param {Object} jsonReport - The JSON evaluation report
 * @returns {string} Human-readable report
 */
function generateHumanReadableReport(jsonReport) {
  const lines = []

  // Header
  lines.push('=' .repeat(70))
  lines.push('PPA CONTRACT ANALYSIS EVALUATION REPORT')
  lines.push('=' .repeat(70))
  lines.push('')
  lines.push(`Evaluation ID: ${jsonReport.evaluationId}`)
  lines.push(`Timestamp: ${jsonReport.timestamp}`)
  lines.push(`Contract Hash: ${jsonReport.contractHash}`)
  lines.push(`Sample Count: ${jsonReport.sampleCount}`)
  lines.push(`Temperature: ${jsonReport.options.temperature}`)
  lines.push('')

  // Overall Stability Score
  lines.push('-'.repeat(70))
  lines.push('OVERALL STABILITY SCORE')
  lines.push('-'.repeat(70))
  const score = jsonReport.stability.overallScore
  const scoreBar = generateProgressBar(score, 40)
  lines.push(`${scoreBar} ${formatPercent(score)}`)
  lines.push('')
  if (score >= 0.9) {
    lines.push('Status: EXCELLENT - Analysis is highly stable and reliable')
  } else if (score >= 0.8) {
    lines.push('Status: GOOD - Analysis is generally stable')
  } else if (score >= 0.6) {
    lines.push('Status: FAIR - Some instability detected, review flagged items')
  } else {
    lines.push('Status: POOR - Significant instability, results may be unreliable')
  }
  lines.push('')

  // Stability Summary
  lines.push('-'.repeat(70))
  lines.push('STABILITY SUMMARY')
  lines.push('-'.repeat(70))
  const summary = jsonReport.stability.summary
  lines.push(`Reliable Risks: ${summary.reliableRiskRatio}`)
  lines.push(`Consistent Key Terms: ${summary.consistentTermRatio}`)
  lines.push(`Unreliable Risks: ${summary.unreliableRiskCount}`)
  lines.push(`Severity Flips: ${summary.severityFlipCount}`)
  lines.push(`Inconsistent Terms: ${summary.inconsistentTermCount}`)
  lines.push('')

  // Unreliable Risks
  const unreliableRisks = jsonReport.stability.risks.filter((r) => !r.isReliable)
  if (unreliableRisks.length > 0) {
    lines.push('-'.repeat(70))
    lines.push('UNRELIABLE RISKS (require attention)')
    lines.push('-'.repeat(70))
    for (const risk of unreliableRisks) {
      lines.push('')
      lines.push(`Term: ${risk.term}`)
      lines.push(`  Stability: ${formatPercent(risk.stability)} (threshold: ${formatPercent(STABILITY_THRESHOLD)})`)
      lines.push(`  Severities observed: ${risk.severitiesObserved.join(', ')}`)
      lines.push(`  Severity variance: ${risk.severityVariance} (max allowed: ${SEVERITY_VARIANCE_THRESHOLD - 1})`)
      if (risk.stability < STABILITY_THRESHOLD) {
        lines.push(`  Issue: Low stability - appears in only ${risk.presenceCount}/${risk.totalRuns} runs`)
      }
      if (risk.severityVariance >= SEVERITY_VARIANCE_THRESHOLD) {
        lines.push(`  Issue: High severity variance - swings between ${risk.severitiesObserved.join(' and ')}`)
      }
    }
    lines.push('')
  }

  // Severity Flips
  const severityFlips = jsonReport.stability.risks.filter(
    (r) => r.severityVariance >= SEVERITY_VARIANCE_THRESHOLD
  )
  if (severityFlips.length > 0) {
    lines.push('-'.repeat(70))
    lines.push('SEVERITY FLIPS (inconsistent severity ratings)')
    lines.push('-'.repeat(70))
    for (const risk of severityFlips) {
      lines.push(`  ${risk.term}: ${risk.severitiesObserved.join(' <-> ')}`)
    }
    lines.push('')
  }

  // Inconsistent Key Terms
  const inconsistentTerms = jsonReport.stability.keyTerms.filter((k) => !k.isConsistent)
  if (inconsistentTerms.length > 0) {
    lines.push('-'.repeat(70))
    lines.push('INCONSISTENT KEY TERMS')
    lines.push('-'.repeat(70))
    for (const term of inconsistentTerms) {
      lines.push(`  ${term.field}:`)
      lines.push(`    Consistency: ${formatPercent(term.consistencyScore)}`)
      lines.push(`    Most common: "${term.mostCommonValue}"`)
      if (term.variants && term.variants.length > 0) {
        lines.push(`    Variants: ${term.variants.map((v) => `"${v}"`).join(', ')}`)
      }
    }
    lines.push('')
  }

  // Hallucinations
  lines.push('-'.repeat(70))
  lines.push('HALLUCINATION DETECTION')
  lines.push('-'.repeat(70))
  const hall = jsonReport.hallucinations
  lines.push(`Total risks analyzed: ${hall.totalRisks}`)
  lines.push(`Hallucinations detected: ${hall.hallucinationCount}`)
  lines.push(`Hallucination rate: ${formatPercent(hall.hallucinationRate)}`)
  lines.push('')

  if (hall.detected.length > 0) {
    lines.push('Detected hallucinations:')
    for (const h of hall.detected.slice(0, 10)) {
      // Limit to 10
      lines.push(`  - [Run ${h.runIndex}] "${h.term}" (${h.severity})`)
      for (const reason of h.reasons) {
        lines.push(`      Reason: ${reason}`)
      }
    }
    if (hall.detected.length > 10) {
      lines.push(`  ... and ${hall.detected.length - 10} more`)
    }
    lines.push('')
  }

  if (hall.recurringHallucinations.length > 0) {
    lines.push('Recurring hallucinations (appear in multiple runs):')
    for (const rh of hall.recurringHallucinations) {
      lines.push(`  - "${rh.term}": ${rh.occurrences} occurrences across ${rh.uniqueRuns} runs`)
    }
    lines.push('')
  }

  // Regression Results
  if (jsonReport.regression) {
    lines.push('-'.repeat(70))
    lines.push('REGRESSION ANALYSIS')
    lines.push('-'.repeat(70))
    const reg = jsonReport.regression
    lines.push(`Overall Status: ${reg.overallStatus}`)
    lines.push(`FAILs: ${reg.failCount}, WARNs: ${reg.warnCount}`)
    lines.push('')

    if (reg.results.length > 0) {
      for (const result of reg.results) {
        const icon = result.status === 'FAIL' ? '[FAIL]' : result.status === 'WARN' ? '[WARN]' : '[PASS]'
        lines.push(`${icon} ${result.type}: ${result.description}`)
      }
    } else {
      lines.push('No regressions detected.')
    }
    lines.push('')
  }

  // Sentinel Correctness Results
  if (jsonReport.sentinel) {
    lines.push('-'.repeat(70))
    lines.push('SENTINEL CORRECTNESS')
    lines.push('-'.repeat(70))
    const sent = jsonReport.sentinel
    lines.push(`Contract: ${sent.contract_name || sent.contract_hash}`)
    lines.push(`Recall: ${formatPercent(sent.recall)} (${sent.summary.detected_must_detect}/${sent.summary.total_must_detect} must-detect items found)`)
    lines.push(`False Positive Rate: ${formatPercent(sent.false_positive_rate)} (${sent.summary.detected_must_not_detect}/${sent.summary.total_must_not_detect} traps triggered)`)
    lines.push('')

    // Missed must-detect items
    if (sent.summary.missed_must_detect.length > 0) {
      lines.push('MISSED must-detect items:')
      for (const id of sent.summary.missed_must_detect) {
        const item = sent.must_detect.find((m) => m.id === id)
        lines.push(`  [MISS] ${id}`)
        if (item?.notes) lines.push(`         Note: ${item.notes}`)
      }
      lines.push('')
    }

    // Triggered traps (false positives)
    if (sent.summary.triggered_traps.length > 0) {
      lines.push('TRIGGERED traps (false positives):')
      for (const id of sent.summary.triggered_traps) {
        const item = sent.must_not_detect.find((m) => m.id === id)
        lines.push(`  [TRAP] ${id}`)
        if (item?.notes) lines.push(`         Note: ${item.notes}`)
        lines.push(`         Detected in: ${item?.detected_runs}/${item?.total_runs} runs`)
      }
      lines.push('')
    }

    // Consistently hallucinated items
    if (sent.summary.consistently_hallucinated.length > 0) {
      lines.push('CONSISTENTLY HALLUCINATED items (detected but ungrounded):')
      for (const id of sent.summary.consistently_hallucinated) {
        lines.push(`  [HALLUC] ${id}`)
      }
      lines.push('')
    }

    // Successfully detected must-detect items
    const detectedItems = sent.must_detect.filter((m) => m.detected_runs > 0)
    if (detectedItems.length > 0) {
      lines.push('Successfully detected must-detect items:')
      for (const item of detectedItems) {
        const hallucIcon = item.consistently_hallucinated ? ' [!HALLUC]' : ''
        lines.push(`  [OK] ${item.id}: ${formatPercent(item.detection_rate)} (${item.detected_runs}/${item.total_runs} runs)${hallucIcon}`)
      }
      lines.push('')
    }
  }

  // Reliable Risks Summary
  const reliableRisks = jsonReport.stability.risks.filter((r) => r.isReliable)
  if (reliableRisks.length > 0) {
    lines.push('-'.repeat(70))
    lines.push('RELIABLE RISKS (high confidence)')
    lines.push('-'.repeat(70))
    for (const risk of reliableRisks) {
      const severityIcon =
        risk.consensusSeverity === 'high' ? '[!!!]' : risk.consensusSeverity === 'medium' ? '[!!]' : '[!]'
      lines.push(`${severityIcon} ${risk.term} (${risk.consensusSeverity.toUpperCase()})`)
      lines.push(`    Stability: ${formatPercent(risk.stability)} | Present in ${risk.presenceCount}/${risk.totalRuns} runs`)
    }
    lines.push('')
  }

  // Footer
  lines.push('='.repeat(70))
  lines.push('END OF EVALUATION REPORT')
  lines.push('='.repeat(70))

  return lines.join('\n')
}

/**
 * Generate a simple ASCII progress bar.
 *
 * @param {number} value - Value between 0 and 1
 * @param {number} width - Width in characters
 * @returns {string} Progress bar string
 */
function generateProgressBar(value, width) {
  const filled = Math.round(value * width)
  const empty = width - filled
  return '[' + '#'.repeat(filled) + '-'.repeat(empty) + ']'
}

/**
 * Generate a summary object for quick status checks.
 *
 * @param {Object} jsonReport - The JSON evaluation report
 * @returns {Object} Quick summary
 */
function generateQuickSummary(jsonReport) {
  const hall = jsonReport.hallucinations
  const stab = jsonReport.stability

  // Determine overall health
  let health = 'healthy'
  const issues = []

  if (stab.overallScore < 0.5) {
    health = 'unhealthy'
    issues.push('Low overall stability score')
  } else if (stab.overallScore < 0.65) {
    health = 'degraded'
    issues.push('Moderate stability issues')
  }

  if (hall.hallucinationRate > 0.2) {
    health = 'unhealthy'
    issues.push('High hallucination rate')
  } else if (hall.hallucinationRate > 0.1) {
    if (health === 'healthy') health = 'degraded'
    issues.push('Elevated hallucination rate')
  }

  if (jsonReport.regression?.overallStatus === 'FAIL') {
    health = 'unhealthy'
    issues.push('Regression failures detected')
  } else if (jsonReport.regression?.overallStatus === 'WARN') {
    if (health === 'healthy') health = 'degraded'
    issues.push('Regression warnings')
  }

  // Check sentinel results
  if (jsonReport.sentinel) {
    const sent = jsonReport.sentinel
    if (sent.recall < 0.8) {
      if (health === 'healthy') health = 'degraded'
      issues.push(`Low sentinel recall (${formatPercent(sent.recall)})`)
    }
    if (sent.false_positive_rate > 0.2) {
      health = 'unhealthy'
      issues.push(`High sentinel false positive rate (${formatPercent(sent.false_positive_rate)})`)
    } else if (sent.false_positive_rate > 0) {
      if (health === 'healthy') health = 'degraded'
      issues.push(`Sentinel false positives detected`)
    }
  }

  return {
    health,
    stabilityScore: stab.overallScore,
    hallucinationRate: hall.hallucinationRate,
    unreliableRiskCount: stab.summary.unreliableRiskCount,
    regressionStatus: jsonReport.regression?.overallStatus || 'N/A',
    sentinelRecall: jsonReport.sentinel?.recall ?? null,
    sentinelFalsePositiveRate: jsonReport.sentinel?.false_positive_rate ?? null,
    issues,
    recommendation:
      health === 'healthy'
        ? 'Analysis is reliable for use'
        : health === 'degraded'
          ? 'Review flagged issues before using results'
          : 'Do not use results without manual verification'
  }
}

/**
 * Generate a CI-friendly output format.
 *
 * @param {Object} jsonReport - The JSON evaluation report
 * @returns {Object} CI output
 */
function generateCIOutput(jsonReport) {
  const summary = generateQuickSummary(jsonReport)

  // Exit code: 0 = healthy, 1 = degraded, 2 = unhealthy
  const exitCode = summary.health === 'healthy' ? 0 : summary.health === 'degraded' ? 1 : 2

  return {
    exitCode,
    status: summary.health.toUpperCase(),
    evaluationId: jsonReport.evaluationId,
    metrics: {
      stabilityScore: jsonReport.stability.overallScore,
      hallucinationRate: jsonReport.hallucinations.hallucinationRate,
      unreliableRisks: jsonReport.stability.summary.unreliableRiskCount,
      severityFlips: jsonReport.stability.summary.severityFlipCount,
      regressionStatus: jsonReport.regression?.overallStatus || 'N/A',
      sentinelRecall: jsonReport.sentinel?.recall ?? null,
      sentinelFalsePositiveRate: jsonReport.sentinel?.false_positive_rate ?? null
    },
    issues: summary.issues,
    recommendation: summary.recommendation
  }
}

module.exports = {
  generateJsonReport,
  generateHumanReadableReport,
  generateQuickSummary,
  generateCIOutput,
  formatPercent,
  generateProgressBar
}
