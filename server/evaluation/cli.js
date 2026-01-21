#!/usr/bin/env node

/**
 * CLI for PPA Contract Analysis Evaluation
 *
 * Usage:
 *   node cli.js evaluate <contract-file> [options]
 *   node cli.js compare <baseline-file> <new-file>
 *   node cli.js report <evaluation-file> [--format text|json]
 *
 * Options:
 *   --samples, -n    Number of sampling runs (default: 5)
 *   --temperature    LLM temperature (default: 0.3)
 *   --output, -o     Output file path (default: stdout)
 *   --baseline, -b   Baseline evaluation file for regression comparison
 *   --sentinel       Enable sentinel evaluation (default: auto-detect)
 *   --no-sentinel    Disable sentinel evaluation
 *   --sentinel-spec  Path to sentinel spec file (overrides auto-detection)
 *   --format, -f     Output format: json, text, ci (default: json)
 *   --quiet, -q      Suppress progress output
 *   --help, -h       Show help
 */

const fs = require('fs').promises
const path = require('path')
const fetch = require('node-fetch')

// Parse command line arguments
function parseArgs(args) {
  const parsed = {
    command: null,
    files: [],
    options: {
      samples: 5,
      temperature: 0.3,
      output: null,
      baseline: null,
      sentinel: null, // null = auto-detect, true = enable, false = disable
      sentinelSpec: null,
      format: 'json',
      quiet: false,
      help: false,
      apiUrl: process.env.API_URL || 'http://localhost:3000'
    }
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      parsed.options.help = true
    } else if (arg === '--quiet' || arg === '-q') {
      parsed.options.quiet = true
    } else if (arg === '--samples' || arg === '-n') {
      parsed.options.samples = parseInt(args[++i]) || 5
    } else if (arg === '--temperature') {
      const temp = parseFloat(args[++i])
      parsed.options.temperature = isNaN(temp) ? 0.3 : temp
    } else if (arg === '--output' || arg === '-o') {
      parsed.options.output = args[++i]
    } else if (arg === '--baseline' || arg === '-b') {
      parsed.options.baseline = args[++i]
    } else if (arg === '--format' || arg === '-f') {
      parsed.options.format = args[++i] || 'json'
    } else if (arg === '--api-url') {
      parsed.options.apiUrl = args[++i]
    } else if (arg === '--sentinel') {
      parsed.options.sentinel = true
    } else if (arg === '--no-sentinel') {
      parsed.options.sentinel = false
    } else if (arg === '--sentinel-spec') {
      parsed.options.sentinelSpec = args[++i]
      parsed.options.sentinel = true // Specifying a spec implies enabling sentinel
    } else if (!arg.startsWith('-')) {
      if (!parsed.command) {
        parsed.command = arg
      } else {
        parsed.files.push(arg)
      }
    }

    i++
  }

  return parsed
}

function showHelp() {
  console.log(`
PPA Contract Analysis Evaluation CLI

Commands:
  evaluate <contract-file>      Run evaluation on a contract
  compare <baseline> <new>      Compare two evaluations for regression
  report <evaluation-file>      Generate report from saved evaluation

Options:
  --samples, -n <number>        Number of sampling runs (default: 5)
  --temperature <number>        LLM temperature (default: 0.3)
  --output, -o <file>           Output file path (default: stdout)
  --baseline, -b <file>         Baseline evaluation for regression comparison
  --sentinel                    Enable sentinel evaluation (default: auto-detect if spec exists)
  --no-sentinel                 Disable sentinel evaluation
  --sentinel-spec <path>        Path to sentinel spec file (overrides auto-detection)
  --format, -f <format>         Output format: json, text, ci (default: json)
  --api-url <url>               API URL (default: http://localhost:3000)
  --quiet, -q                   Suppress progress output
  --help, -h                    Show this help

Examples:
  # Run evaluation with 10 samples
  node cli.js evaluate contract.pdf --samples 10 --output eval.json

  # Run evaluation with regression comparison against baseline
  node cli.js evaluate contract.pdf --baseline baseline-eval.json --format text

  # Compare two saved evaluations
  node cli.js compare baseline.json current.json --format ci

  # Generate text report from saved evaluation
  node cli.js report eval.json --format text

Environment Variables:
  API_URL       API server URL (default: http://localhost:3000)
  OPENAI_API_KEY    OpenAI API key (required for standalone mode)
`)
}

async function log(message, opts) {
  if (!opts.quiet) {
    console.error(message)
  }
}

async function runEvaluate(files, opts) {
  if (files.length === 0) {
    console.error('Error: Contract file required')
    process.exit(1)
  }

  const contractPath = files[0]

  // Check if file exists
  try {
    await fs.access(contractPath)
  } catch {
    console.error(`Error: File not found: ${contractPath}`)
    process.exit(1)
  }

  await log(`Reading contract: ${contractPath}`, opts)

  // Read file
  const fileBuffer = await fs.readFile(contractPath)
  const fileName = path.basename(contractPath)
  const mimeType = fileName.toLowerCase().endsWith('.pdf')
    ? 'application/pdf'
    : 'text/plain'

  // Create form data
  const FormData = require('form-data')
  const formData = new FormData()
  formData.append('contract', fileBuffer, {
    filename: fileName,
    contentType: mimeType
  })
  formData.append('sampleCount', opts.samples.toString())
  formData.append('temperature', opts.temperature.toString())

  // Add sentinel options
  if (opts.sentinel !== null) {
    formData.append('sentinel', opts.sentinel.toString())
  }
  if (opts.sentinelSpec) {
    formData.append('sentinelSpec', opts.sentinelSpec)
  }

  await log(`Running evaluation (${opts.samples} samples, temp=${opts.temperature})...`, opts)

  // Call API
  const response = await fetch(`${opts.apiUrl}/api/evaluate-contract`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error(`Error: ${error.error || response.statusText}`)
    process.exit(1)
  }

  const result = await response.json()

  // Load baseline for regression comparison if provided
  if (opts.baseline) {
    await log(`Comparing against baseline: ${opts.baseline}`, opts)

    const baselineContent = await fs.readFile(opts.baseline, 'utf-8')
    const baseline = JSON.parse(baselineContent)

    const compareResponse = await fetch(`${opts.apiUrl}/api/compare-evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline, current: result.report })
    })

    if (compareResponse.ok) {
      result.regression = await compareResponse.json()
    }
  }

  // Format output
  let output
  if (opts.format === 'text') {
    // Get text report from API
    const reportResponse = await fetch(`${opts.apiUrl}/api/evaluation-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluation: result.report, format: 'text' })
    })
    output = await reportResponse.text()
  } else if (opts.format === 'ci') {
    output = JSON.stringify(result.ciOutput, null, 2)
  } else {
    output = JSON.stringify(result, null, 2)
  }

  // Write output
  if (opts.output) {
    await fs.writeFile(opts.output, output)
    await log(`Output written to: ${opts.output}`, opts)
  } else {
    console.log(output)
  }

  // Exit with appropriate code for CI
  if (opts.format === 'ci' || opts.baseline) {
    const exitCode = result.ciOutput?.exitCode ?? 0
    if (result.regression?.overallStatus === 'FAIL') {
      process.exit(2)
    } else if (exitCode > 0) {
      process.exit(exitCode)
    }
  }
}

async function runCompare(files, opts) {
  if (files.length < 2) {
    console.error('Error: Both baseline and new evaluation files required')
    process.exit(1)
  }

  const [baselinePath, newPath] = files

  await log(`Loading baseline: ${baselinePath}`, opts)
  const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf-8'))

  await log(`Loading new evaluation: ${newPath}`, opts)
  const current = JSON.parse(await fs.readFile(newPath, 'utf-8'))

  // Handle both raw report and wrapped response formats
  const baselineReport = baseline.report || baseline
  const currentReport = current.report || current

  await log('Running regression comparison...', opts)

  const response = await fetch(`${opts.apiUrl}/api/compare-evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseline: baselineReport, current: currentReport })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error(`Error: ${error.error || response.statusText}`)
    process.exit(1)
  }

  const result = await response.json()

  // Format output
  let output
  if (opts.format === 'text') {
    const lines = []
    lines.push('=' .repeat(60))
    lines.push('REGRESSION COMPARISON RESULTS')
    lines.push('='.repeat(60))
    lines.push('')
    lines.push(`Overall Status: ${result.overallStatus}`)
    lines.push(`FAILs: ${result.failCount}`)
    lines.push(`WARNs: ${result.warnCount}`)
    lines.push('')

    if (result.results.length > 0) {
      lines.push('Details:')
      for (const r of result.results) {
        const icon = r.status === 'FAIL' ? '[FAIL]' : '[WARN]'
        lines.push(`  ${icon} ${r.type}: ${r.description}`)
      }
    } else {
      lines.push('No regressions detected.')
    }

    output = lines.join('\n')
  } else if (opts.format === 'ci') {
    output = JSON.stringify({
      exitCode: result.overallStatus === 'FAIL' ? 2 : result.overallStatus === 'WARN' ? 1 : 0,
      status: result.overallStatus,
      failCount: result.failCount,
      warnCount: result.warnCount
    }, null, 2)
  } else {
    output = JSON.stringify(result, null, 2)
  }

  // Write output
  if (opts.output) {
    await fs.writeFile(opts.output, output)
    await log(`Output written to: ${opts.output}`, opts)
  } else {
    console.log(output)
  }

  // Exit with appropriate code
  if (result.overallStatus === 'FAIL') {
    process.exit(2)
  } else if (result.overallStatus === 'WARN') {
    process.exit(1)
  }
}

async function runReport(files, opts) {
  if (files.length === 0) {
    console.error('Error: Evaluation file required')
    process.exit(1)
  }

  const evalPath = files[0]

  await log(`Loading evaluation: ${evalPath}`, opts)
  const evalData = JSON.parse(await fs.readFile(evalPath, 'utf-8'))

  // Handle both raw report and wrapped response formats
  const report = evalData.report || evalData

  // Format output
  let output
  if (opts.format === 'text') {
    const response = await fetch(`${opts.apiUrl}/api/evaluation-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluation: report, format: 'text' })
    })
    output = await response.text()
  } else if (opts.format === 'ci') {
    // Regenerate CI output from report
    const { generateCIOutput } = require('./reporter')
    output = JSON.stringify(generateCIOutput(report), null, 2)
  } else {
    output = JSON.stringify(report, null, 2)
  }

  // Write output
  if (opts.output) {
    await fs.writeFile(opts.output, output)
    await log(`Output written to: ${opts.output}`, opts)
  } else {
    console.log(output)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const parsed = parseArgs(args)

  if (parsed.options.help || !parsed.command) {
    showHelp()
    process.exit(parsed.options.help ? 0 : 1)
  }

  try {
    switch (parsed.command) {
      case 'evaluate':
        await runEvaluate(parsed.files, parsed.options)
        break
      case 'compare':
        await runCompare(parsed.files, parsed.options)
        break
      case 'report':
        await runReport(parsed.files, parsed.options)
        break
      default:
        console.error(`Unknown command: ${parsed.command}`)
        showHelp()
        process.exit(1)
    }
  } catch (err) {
    console.error(`Error: ${err.message}`)
    if (process.env.DEBUG) {
      console.error(err.stack)
    }
    process.exit(1)
  }
}

main()
