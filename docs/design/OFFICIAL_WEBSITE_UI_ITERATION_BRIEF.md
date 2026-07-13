# Official Website UI Iteration Brief

## Current state

PRISMA Workbench is still on the V2.5 dual-review closeout public release line. The current productization slice has separated the official website from the workspace: `index.html` explains positioning and routes users, `workspace.html` runs the local review workflow, `login.html` handles dual-review entry, and `resources.html` collects demo, benchmark, paper, template, and design assets.

The implementation remains static-first and local-first. It must not add no backend sync / 不新增后端同步, account login, payment, license checks, default cloud upload, institutional credential handling, or database crawling.

## What was just fixed

- Removed internal-facing homepage copy about avoiding raw JSON / Markdown clicks.
- Made the V3 resources hub more suitable for Chinese users by localizing visible Chinese-mode labels and card titles.
- Kept V2.5 as the current public product line rather than renaming the product to V3.0.
- Added guard tests so release-facing copy stays product-facing and the Chinese resources hub does not regress into obvious English card titles.

## Product surface today

- Homepage: formal product positioning, trust differentiators, user paths, and clear CTAs.
- Workspace: guided onboarding paths for demo data, real database exports, dual review, audit package exports, and quality appraisal.
- Resources hub: public demo dataset, reproducibility benchmarks, paper preparation materials, starter templates, and Search Strategy Assistant design boundaries.
- Design docs: Search Strategy Assistant is documented as auditable strategy generation only, not database fetching.

## Known limitations

- The resources hub is still an early content hub, not a polished marketing or documentation system.
- The visual language is serviceable but conservative; it does not yet feel like an AI-era research assistant product.
- Chinese and English content coexist through `.zh` / `.en` spans, but some technical terms such as file paths and dataset filenames intentionally remain unchanged.
- The current UI mainly uses cards, static grids, and existing house styles. It needs a broader design-system pass before public launch.

## AI-era UI direction

- Move from static card grids toward a guided research command center: intent-first paths, contextual next steps, and explainable assistant panels.
- Use a more modern visual system: softer depth, responsive split panels, clearer hierarchy, generous spacing, and stronger status semantics.
- Treat AI as transparent assistance, not automation: show provenance, confidence boundaries, human confirmation, and audit links near every assistant suggestion.
- Make local-first privacy visible without sounding defensive: position it as data sovereignty for research teams.
- Keep the homepage publication-grade: no internal implementation rationale, no raw-file accident language, no V3.0 release claim before the user approves it.

## Suggested next iteration plan

1. Redesign homepage hero and navigation around three user intents: start a review, collaborate in dual review, prepare appendix evidence.
2. Redesign resources hub as a Chinese-first knowledge portal with resource categories, completion status, and concise explanations.
3. Introduce an AI-era visual direction in CSS without rewriting the workflow engine: tokens, surfaces, spacing, motion, and responsive states.
4. Add visual regression-oriented smoke tests for critical copy and CTA routing.
5. Only after local review, decide whether to publish the new version remotely.

## Guardrails for the next agent

- Do not push or deploy without explicit user approval.
- Do not add backend sync, accounts, payment, license checks, default upload, or database crawling.
- Do not rename the current public product to V3.0.
- Preserve V2.5 dual-review closeout as the current public line.
- Keep tests passing: `node --test tests/audit/audit-workflow.test.mjs`, `node tests/run-all-regressions.js`, and `git diff --check`.
