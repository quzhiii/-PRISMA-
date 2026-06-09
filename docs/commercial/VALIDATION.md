# PRISMA Workbench Commercial Validation Contract

Last updated: 2026-06-09

## 1. Purpose

This document defines the commercial validation contract for the final P6 / V3.0 preparation slice.

It is not a pricing page, billing system, or launch announcement. It is a repo-local contract for validating whether an open-core model is justified before monetization implementation.

## 2. Open-Core Boundary

The open-core boundary stays conservative:

- core local workflow remains free
- import, conservative deduplication, screening, quality appraisal, PRISMA export, and baseline audit export remain available in the free local line
- no payment code is added in this slice
- no login, account, license enforcement, or default cloud upload is added in this slice

Paid candidates, if validated later, should stay in thicker layers such as:

- advanced audit packaging
- template packs
- team workflow support
- institution deployment or service layers
- Chinese-source custom adaptation work

## 3. Target Validation Segments

The minimum target segments for commercial validation are:

- individual researchers
- team / lab users
- institution users

These segments are intentionally broad. The goal is to learn where willingness-to-pay appears first, not to lock a final pricing taxonomy.

## 4. Validation Hypotheses

The current commercial validation hypotheses are:

1. Individual researchers may pay for time-saving layers such as advanced templates, export cleanup, or AI usage transparency, but not for the core local workflow.
2. Team / lab users may pay for conflict-resolution support, reusable templates, or shared review governance, but only after the local single-user workflow is already trusted.
3. Institution users may pay for deployment, training, governance, or Chinese-source customization more readily than for a generic personal subscription.
4. Commercial validation should happen before monetization implementation, so billing, accounts, and product locks stay out of the current codebase.

## 5. Evidence Record Structure

Each validation artifact should be recorded as one of the following:

- interview record
- trial record
- manual delivery record

Minimum evidence record fields:

| Field | Description |
|---|---|
| `date` | When the interview or trial happened |
| `segment` | `individual`, `team`, or `institution` |
| `workflow` | What part of the review workflow was exercised |
| `pain_points` | What slowed the user down or reduced trust |
| `valued_capabilities` | What the user considered worth paying for |
| `non_negotiable_free_core` | Which core local capabilities must remain free |
| `delivery_mode` | interview, trial, or manual service |
| `evidence_links` | Notes, exports, screenshots, or related artifacts |
| `next_action` | Follow-up validation action |

Suggested lightweight template:

```md
## Validation Record

- date:
- segment: individual | team | institution
- workflow:
- pain_points:
- valued_capabilities:
- non_negotiable_free_core:
- delivery_mode: interview | trial | manual service
- evidence_links:
- next_action:
```

## 6. Non-Goals For This Slice

This slice does not do the following:

- no payment code
- no subscription flow
- no account system
- no license checks
- no backend collaboration rollout
- no finalized public pricing page

## 7. Exit Criteria

This commercial validation contract is considered satisfied for the current release-preparation line when:

1. Public docs clearly say commercial validation is the next P6 slice.
2. The open-core boundary is explicit and conservative.
3. The repo includes a stable evidence record structure.
4. The codebase still contains no payment, account, or monetization enforcement implementation.
