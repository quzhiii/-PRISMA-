# Screening Criteria Template

Use this template to define inclusion, exclusion, and protection criteria before importing records into PRISMA Workbench.

## PICOS / PICO fields

- Population: `[condition, age group, setting]`
- Intervention / exposure: `[treatment, diagnostic method, risk factor]`
- Comparator: `[usual care, placebo, no exposure, alternative method]`
- Outcomes: `[primary and secondary outcomes]`
- Study design: `[RCT, cohort, case-control, qualitative, diagnostic accuracy]`

## Inclusion examples

- Includes the target population or condition.
- Reports at least one predefined outcome.
- Uses an eligible study design.
- Published within the protocol-defined date range.

## Exclusion examples

- Wrong population.
- Wrong intervention or exposure.
- Wrong publication type, such as editorial or protocol only.
- No extractable outcome data.
- Duplicate or secondary report already represented by a primary record.

## YAML snippet

```yaml
include:
  keywords:
    - systematic review
    - randomized trial
  protect_if:
    - target population
exclude:
  - keyword: protocol
    reason: Wrong publication type
  - keyword: animal model
    reason: Wrong population
required_fields:
  - title
  - year
notes: Human reviewers confirm all final decisions.
```
