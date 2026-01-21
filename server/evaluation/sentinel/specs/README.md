# Sentinel Spec Files

This directory contains sentinel specification files for contract evaluation.

## File Naming

Files should be named `<contract_hash>.json` where `contract_hash` is the hash of the contract text (displayed in evaluation output).

## Schema

```json
{
  "contract_hash": "abc123def456",
  "contract_name": "Human-readable contract name",
  "must_detect": [
    {
      "id": "unique_risk_id",
      "aliases": ["term variant 1", "term variant 2"],
      "notes": "Why this risk should be detected"
    }
  ],
  "must_not_detect": [
    {
      "id": "false_positive_trap_id",
      "aliases": ["term that should NOT match"],
      "notes": "Why this should NOT be flagged"
    }
  ]
}
```

## Fields

- **contract_hash**: Must match the contract's computed hash
- **contract_name**: Optional human-readable name for reports
- **must_detect**: Risks that SHOULD be flagged (sentinel positives)
- **must_not_detect**: Risks that should NOT be flagged (false-positive traps)

### Sentinel Item Fields

- **id**: Stable unique identifier for this sentinel item
- **aliases**: Array of strings to match against risk terms/canonical IDs
- **notes**: Optional explanation for why this sentinel exists

## Matching Logic

A risk matches a sentinel item if:
1. The canonical ID contains any alias (normalized), OR
2. The risk term contains any alias (case-insensitive), OR
3. 60%+ of alias words appear in the risk term

## Metrics

- **Recall**: Proportion of must_detect items detected at least once
- **False Positive Rate**: Proportion of must_not_detect items incorrectly detected
- **Consistently Hallucinated**: Items detected but with ungrounded evidence (>=80% not-found)
