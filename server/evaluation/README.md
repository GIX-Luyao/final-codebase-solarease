# PPA Contract Analysis Evaluation Harness

This evaluation harness measures the reliability and consistency of AI-powered contract analysis across non-deterministic LLM runs.

## Overview

Since LLMs are non-deterministic, the same contract can produce different analysis results on each run. This harness helps you:

- **Measure stability** - How consistent are the extracted terms and risk flags across runs?
- **Detect hallucinations** - Are risk flags properly grounded in actual contract text?
- **Track regressions** - Has a code/prompt change made the analysis worse?
- **CI/CD integration** - Automated quality gates for your analysis pipeline

## Quick Start

### Prerequisites

1. Server must be running:
   ```bash
   node server/index.js
   ```

2. Environment variables configured (`.env`):
   ```
   OPENAI_API_KEY=sk-...
   # OR Azure OpenAI:
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_KEY=your-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment
   ```

### Run an Evaluation

```bash
# Basic evaluation (5 samples, JSON output)
node server/evaluation/cli.js evaluate contract.pdf

# With more samples and text report
node server/evaluation/cli.js evaluate contract.pdf --samples 10 --format text

# Save results to a file
node server/evaluation/cli.js evaluate contract.pdf --samples 5 --output evaluation.json
```

## CLI Commands

### `evaluate` - Run Evaluation

Analyzes a contract multiple times and measures consistency.

```bash
node server/evaluation/cli.js evaluate <contract-file> [options]
```

**Options:**
| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--samples` | `-n` | 5 | Number of sampling runs |
| `--temperature` | | 0.3 | LLM temperature (lower = more deterministic) |
| `--output` | `-o` | stdout | Output file path |
| `--baseline` | `-b` | | Baseline file for regression comparison |
| `--format` | `-f` | json | Output format: `json`, `text`, `ci` |
| `--quiet` | `-q` | | Suppress progress output |
| `--api-url` | | localhost:3000 | API server URL |

**Examples:**
```bash
# Quick evaluation with 3 samples
node server/evaluation/cli.js evaluate contract.pdf -n 3 -f text

# Full evaluation saved as baseline
node server/evaluation/cli.js evaluate contract.pdf -n 10 -o baseline.json

# Evaluate and compare against baseline
node server/evaluation/cli.js evaluate contract.pdf --baseline baseline.json -f text
```

### `compare` - Regression Comparison

Compares two saved evaluations to detect regressions.

```bash
node server/evaluation/cli.js compare <baseline.json> <new.json> [options]
```

**Examples:**
```bash
# Compare and get text report
node server/evaluation/cli.js compare baseline.json current.json -f text

# CI-friendly output with exit codes
node server/evaluation/cli.js compare baseline.json current.json -f ci
```

### `report` - Generate Report

Generates a human-readable report from a saved evaluation.

```bash
node server/evaluation/cli.js report <evaluation.json> [options]
```

**Examples:**
```bash
# Text report to stdout
node server/evaluation/cli.js report evaluation.json -f text

# Save text report to file
node server/evaluation/cli.js report evaluation.json -f text -o report.txt
```

## API Endpoints

### `POST /api/evaluate-contract`

Run full evaluation via API.

**Request (multipart/form-data):**
- `contract` - PDF or TXT file
- `sampleCount` - Number of runs (default: 5)
- `temperature` - LLM temperature (default: 0.3)

**Response:**
```json
{
  "evaluationId": "eval-abc123",
  "quickSummary": { "health": "healthy", ... },
  "ciOutput": { "exitCode": 0, "status": "HEALTHY", ... },
  "report": { /* full evaluation report */ }
}
```

### `POST /api/analyze-contract-with-check`

Single analysis with hallucination detection (faster, less thorough).

**Request (multipart/form-data):**
- `contract` - PDF or TXT file

**Response:** Standard analysis plus `_evaluation.hallucinationCheck` field.

### `POST /api/compare-evaluations`

Compare two evaluations for regression.

**Request (JSON):**
```json
{
  "baseline": { /* baseline report */ },
  "current": { /* current report */ }
}
```

### `POST /api/evaluation-report`

Generate text report from evaluation JSON.

**Request (JSON):**
```json
{
  "evaluation": { /* evaluation report */ },
  "format": "text"
}
```

## Understanding the Metrics

### Stability Score (0-100%)

Measures how consistent the analysis is across multiple runs.

| Score | Status | Meaning |
|-------|--------|---------|
| 90%+ | EXCELLENT | Highly reliable results |
| 80-89% | GOOD | Generally stable |
| 60-79% | FAIR | Some instability, review flagged items |
| <60% | POOR | Results may be unreliable |

### Risk Reliability

A risk flag is considered **reliable** if:
- **Presence stability >= 80%** - Appears in at least 80% of runs
- **Severity variance < 2** - Doesn't swing between low/high

**Example:**
```
Term: Escalation Rate
  Stability: 100% (appears in 5/5 runs) ✓
  Severities: [high, high, high, high, high] ✓
  → RELIABLE

Term: Missing Warranty
  Stability: 40% (appears in 2/5 runs) ✗
  → UNRELIABLE (low stability)

Term: Termination Clause
  Stability: 100% (appears in 5/5 runs) ✓
  Severities: [low, high, medium, high, low] ✗
  → UNRELIABLE (severity flip)
```

### Key Term Consistency

Tracks whether extracted values (price, term length, etc.) are consistent.

| Field | Consistency | Meaning |
|-------|-------------|---------|
| 100% | Perfectly consistent | Same value every run |
| <80% | Inconsistent | Value varies between runs |

### Hallucination Rate

Percentage of risk flags where the "evidence" quote doesn't appear in the contract.

| Rate | Meaning |
|------|---------|
| 0% | All evidence is grounded |
| 1-10% | Minor issues |
| >10% | Significant fabrication |

## Regression Testing

### Setting Up a Baseline

After achieving acceptable quality, save an evaluation as your baseline:

```bash
node server/evaluation/cli.js evaluate contract.pdf -n 10 -o baseline.json
```

### Running Regression Checks

After code/prompt changes, compare against baseline:

```bash
node server/evaluation/cli.js evaluate contract.pdf -n 10 --baseline baseline.json -f text
```

Or compare two saved evaluations:

```bash
node server/evaluation/cli.js compare baseline.json current.json -f text
```

### Regression Detection Rules

| Check | FAIL | WARN |
|-------|------|------|
| Stability score drop | >20% decrease | >10% decrease |
| Hallucination rate increase | >10% increase | >5% increase |
| New unreliable risks | 3+ new | 1-2 new |
| Severity flips | Any new | - |

## CI/CD Integration

### Exit Codes

| Code | Status | Meaning |
|------|--------|---------|
| 0 | HEALTHY | All checks pass |
| 1 | DEGRADED | Warnings present |
| 2 | UNHEALTHY | Failures detected |

### Example GitHub Actions

```yaml
- name: Run contract analysis evaluation
  run: |
    node server/evaluation/cli.js evaluate test-contract.pdf \
      --samples 5 \
      --baseline baseline.json \
      --format ci \
      --output result.json

- name: Check evaluation status
  run: |
    EXIT_CODE=$(jq '.exitCode' result.json)
    if [ "$EXIT_CODE" -eq 2 ]; then
      echo "Evaluation FAILED"
      exit 1
    fi
```

### Example CI Output

```json
{
  "exitCode": 0,
  "status": "HEALTHY",
  "evaluationId": "eval-abc123",
  "metrics": {
    "stabilityScore": 0.85,
    "hallucinationRate": 0.0,
    "unreliableRisks": 2,
    "severityFlips": 0,
    "regressionStatus": "PASS"
  },
  "issues": [],
  "recommendation": "Analysis is reliable for use"
}
```

## Configuration Constants

Defined in `types.js`:

| Constant | Default | Description |
|----------|---------|-------------|
| `STABILITY_THRESHOLD` | 0.8 (80%) | Minimum presence stability for reliable risks |
| `SEVERITY_VARIANCE_THRESHOLD` | 2 | Max severity difference allowed |
| `MIN_EVIDENCE_LENGTH` | 20 chars | Minimum evidence length |
| `DEFAULT_SAMPLE_COUNT` | 5 | Default number of runs |

## Module Structure

```
server/evaluation/
├── index.js          # Main entry point, runEvaluation()
├── cli.js            # Command-line interface
├── types.js          # Constants and TypeScript-style type definitions
├── sampler.js        # Multi-run sampling logic
├── canonicalization.js # Risk term normalization
├── stability.js      # Stability metric computation
├── hallucination.js  # Evidence grounding checks
├── regression.js     # Baseline comparison
├── reporter.js       # Report generation (JSON, text, CI)
├── baseline.json     # Saved baseline (generated)
└── README.md         # This file
```

## Programmatic Usage

```javascript
const evaluation = require('./server/evaluation')

// Run full evaluation
const result = await evaluation.runEvaluation(callAI, contractText, {
  sampleCount: 5,
  temperature: 0.3,
  onProgress: (p) => console.log(`${p.completed}/${p.total}`)
})

console.log(result.quickSummary)
console.log(result.humanReadableReport)

// Compare evaluations
const regression = evaluation.runRegressionComparison(baseline, current)
console.log(regression.overallStatus) // 'PASS', 'WARN', or 'FAIL'

// Single-run hallucination check
const hallCheck = evaluation.hallucination.detectAllHallucinations(
  analysisResult,
  contractText
)
console.log(hallCheck.hallucinationRate)
```

## Tips for Improving Stability

1. **Lower temperature** - Use 0.2-0.3 for more deterministic outputs
2. **Explicit prompt instructions** - Tell the LLM exactly how to format "Not specified" values
3. **Increase samples** - More runs give more accurate stability measurements
4. **Normalize canonical terms** - The canonicalization module groups similar risk terms

## Troubleshooting

### "Connection refused" error
The API server isn't running. Start it with `node server/index.js`.

### Low stability on template contracts
Contracts with many "to be filled" placeholders cause the AI to interpret them differently each run. This is expected behavior.

### High hallucination rate
The AI is fabricating quotes. Check that your prompt requires exact evidence quotes and that the contract text is being passed correctly.
