# Dual-review SOP

This SOP describes a local-first Reviewer A / Reviewer B workflow for PRISMA Workbench V2.5.

## Roles

- Reviewer A: completes an independent title / abstract and full-text review pass.
- Reviewer B: completes an independent review pass using the same criteria.
- Resolver: reviews conflicts and records final decisions with reasons.

## File-based workflow

1. Project lead exports a collaboration seed package.
2. Reviewer A and Reviewer B import the seed locally.
3. Each reviewer records decisions independently.
4. Each reviewer exports a reviewer decision bundle.
5. The resolver imports both bundles into the main project.
6. The resolver works through the conflict queue.
7. Final exports include conflict status and agreement evidence.

## Resolver checklist

- Confirm both bundles belong to the same seed package.
- Review screening conflicts before final exports.
- Review quality conflicts before evidence exports.
- Record a final decision and reason for each conflict.
- Export `dual_review_conflicts.csv` and `dual_review_agreement.json` with the audit package.

## Boundaries

- This workflow is file-based and local-first.
- It is not real-time sync, account collaboration, backend storage, or permission management.
