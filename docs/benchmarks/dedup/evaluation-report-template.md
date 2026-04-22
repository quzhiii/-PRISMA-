# Dedup Evaluation Report Template

## Metadata

- Evaluation date:
- Evaluator:
- Baseline target:
- Current target:
- Commit or snapshot:
- Benchmark manifest version:
- Gold label status:

## 1. Executive Verdict

Choose one:

- State A: Keep as-is
- State B: Patch only
- State C: Moderate redesign
- State D: Full dedup engine upgrade

## 2. Gate Status

### Gate 1: Evaluation readiness

- [ ] benchmark corpus defined
- [ ] gold labels defined
- [ ] scoring worksheet completed
- [ ] evaluation target frozen

### Gate 2: Evaluation verdict

- [ ] baseline results documented
- [ ] current results documented
- [ ] failure categories grouped
- [ ] product risks ranked
- [ ] decision rubric applied

## 3. Comparison Summary

| Metric | Baseline | Current | Threshold | Pass/Fail |
|--------|----------|---------|-----------|-----------|
| Auto-delete false positives |  |  | 0 |  |
| Auto-delete precision |  |  | 1.000 |  |
| Hard-duplicate recall |  |  | track |  |
| Duplicate-like recall |  |  | 0.95 |  |
| Candidate specificity |  |  | 0.99 |  |
| Candidate F1 |  |  | 0.95 |  |
| Candidate review load per 1,000 |  |  | acceptable |  |

## 4. Dataset Notes

| Dataset | Baseline summary | Current summary | Key issue |
|---------|------------------|-----------------|----------|
| dedup-case-001 |  |  |  |
| dedup-case-002 |  |  |  |
| dedup-case-003 |  |  |  |
| dedup-case-004 |  |  |  |
| dedup-case-005 |  |  |  |
| dedup-case-006 |  |  |  |
| dedup-case-007 |  |  |  |
| dedup-case-008 |  |  |  |
| dedup-case-009 |  |  |  |
| dedup-case-010 |  |  |  |
| dedup-case-011 |  |  |  |
| real-rdf-001 |  |  |  |

## 5. Failure Breakdown

### Missed duplicates

-

### Unsafe auto-removals

-

### Conservative downgrades to candidate review

-

### Workflow or explainability gaps

-

## 6. Decision Rationale

Explain why the chosen state is correct for real review workflows.

## 7. Recommendation

### If State A

Document only and stop.

### If State B

Design a small patch plan focused on normalization or code-path consistency.

### If State C

Keep the two-layer dedup strategy and target the next recall gap without broadening unsafe auto-delete.

### If State D

Design a full dedup engine upgrade before implementation.
