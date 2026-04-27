# Dedup vNext Design

**Context:** This design is based on the provisional `State C: Moderate redesign` verdict in `docs/benchmarks/dedup/2026-03-27-interim-evaluation-report.md`.

**Purpose:** Define the next-version deduplication strategy for the PRISMA tool without starting implementation.

---

## 1. Design Goal

Design a deduplication strategy that is materially closer to real systematic review workflows while preserving the product's current strengths:

- local-first processing
- explainable behavior
- low false-positive risk for automatic deletion
- compatibility with Chinese and mixed-source export workflows

The target is not to clone Rayyan or ASySD exactly. The target is to move from a strict exact-match utility toward a research-appropriate two-layer dedup workflow.

---

## 2. Options Considered

### Option A: Patch-only normalization

Scope:

- canonicalize DOI forms
- unify obvious code-path inconsistencies
- keep the current one-layer exact-match design

Pros:

- lowest engineering cost
- low rollout risk
- obvious quality improvement for real exports

Cons:

- does not solve candidate duplicate discovery
- does not solve DOI-first short-circuit rigidity
- likely remains under-sensitive for real review workflows

Verdict:

- not recommended as the main vNext direction
- still worth including as an early sub-step inside a larger redesign

### Option B: Two-layer rule-based dedup engine

Scope:

- canonical identifiers
- hard-duplicate auto-resolution rules
- candidate duplicate surfacing rules
- human-review queue for ambiguous matches

Pros:

- directly matches current evidence
- preserves explainability
- supports low-risk auto-delete plus higher-recall review support
- appropriate for static local-first architecture

Cons:

- more moving parts than a patch-only fix
- needs a review UX or at least an exportable candidate list

Verdict:

- recommended

### Option C: Full fuzzy scoring engine first

Scope:

- generalized weighted scoring across many fields
- aggressive candidate generation and ranking
- broad similarity heuristics from the start

Pros:

- highest theoretical recall ceiling

Cons:

- more complex to validate
- harder to explain
- higher risk of premature overengineering
- not needed before a two-layer baseline exists

Verdict:

- not recommended as the first vNext release

---

## 3. Recommended Direction

The recommended vNext direction is **Option B: a two-layer rule-based dedup engine**.

This is the smallest strategy that addresses the actual evidence collected so far.

Why this option fits the data:

- current false-positive risk appears manageable, so exact auto-delete behavior should be preserved for only the safest cases
- current recall is too low, so the product needs a way to surface likely duplicates without silently deleting them
- real RDF evidence shows that normalization alone improves results, but not enough
- the product's architecture and positioning favor explainable rules over a black-box similarity engine

---

## 4. Core Design Principles

### 4.1 Separate safety from recall

The system must stop treating auto-delete and duplicate discovery as the same problem.

- `hard duplicates` are safe to auto-resolve
- `candidate duplicates` are safe to surface, not safe to silently delete

### 4.2 Normalize before matching

The system should never compare raw identifier strings when a stable canonical form is available.

Examples:

- raw DOI
- `https://doi.org/...`
- `doi:...`
- `link.cnki.net/doi/...`

All of these should collapse to one identifier form before matching decisions are made.

### 4.3 Prefer conservative auto-resolution

The product should keep automatic deletion strict. Ambiguous records should move into a review layer, not into silent removal.

### 4.4 Keep every duplicate decision explainable

Each surfaced or removed duplicate should have a machine-readable explanation such as:

- exact canonical DOI match
- exact PMID match
- exact normalized title plus same year and pages
- same title plus high metadata overlap

### 4.5 Unify code paths

There should be one dedup engine spec used by:

- root app flow
- v1.7 export/quick stats flow
- worker-side large-file flow
- `literature-screening-v2.0`

---

## 5. Proposed vNext Architecture

The design should have four stages.

### Stage 1: Record normalization

Normalize the metadata before any dedup decision.

Fields to normalize:

- DOI
- PMID or equivalent stable identifier if available
- title
- authors
- year
- journal title
- pages
- publication type
- language markers where available

Important rule:

- preserve raw source values for audit and export
- store normalized forms separately for matching

### Stage 2: Hard-duplicate resolution

This layer is allowed to auto-resolve only very high-confidence duplicates.

Suggested hard-duplicate rules:

1. exact canonical DOI match
2. exact PMID match if available
3. exact normalized title + same year + same pages + strong author overlap

This layer should remain intentionally strict.

### Stage 3: Candidate duplicate generation

This layer should generate possible duplicate pairs or clusters for review.

Suggested blocking rules:

- same normalized title
- same normalized title + same year
- same first author + same year + strong title overlap
- same pages + same year + similar title
- translated or bilingual title candidates where one identifier or pages overlap

The goal is not to auto-delete these records. The goal is to surface them.

### Stage 4: Candidate review output

Ambiguous matches should go to a duplicate review list, not disappear.

Minimal acceptable output:

- record A and record B summary
- matching reason
- risk level
- recommended action
- exportable CSV or table for manual adjudication

---

## 6. Matching Policy

### 6.1 Hard duplicates

These can be auto-resolved.

Examples:

- same canonical DOI
- same DOI URL after normalization
- same PMID
- same title, year, pages, and author overlap with no publication-type conflict

### 6.2 Candidate duplicates

These must be surfaced, not auto-resolved.

Examples:

- one record has DOI and the other does not, but title/year/pages match
- same title and year, but identifiers differ across CNKI or Zotero surfaces
- translated-title or mixed-language pairs with overlapping year and pages

### 6.3 Must remain distinct

These must be protected from auto-resolution.

Examples:

- protocol vs. final article
- conference abstract vs. final article
- editorial or commentary vs. original study
- same topic, different population or outcome

---

## 7. Minimal vNext UX Requirement

A full new review interface is not required for the first release, but the engine must at least expose the difference between:

- `auto-resolved duplicates`
- `candidate duplicates requiring review`
- `retained distinct records`

The minimal acceptable user-facing outputs are:

- duplicate counts split by category
- per-cluster explanation labels
- candidate duplicate export
- retained record export after hard-duplicate removal

This is enough to make the engine auditable before a richer review UI exists.

---

## 8. Rollout Strategy

### Phase 1

- canonical identifier normalization
- dedup engine spec unification
- hard-duplicate layer
- benchmark rerun

### Phase 2

- candidate generation layer
- duplicate reason labels
- candidate export or review table
- benchmark rerun

### Phase 3

- optional scoring refinement for harder edge cases
- bilingual and translated-title improvements
- benchmark expansion

This phased rollout keeps the risk low while making each step measurable.

---

## 9. Acceptance Criteria for vNext Strategy

This strategy should be considered successful only if a future implementation can plausibly meet all of the following:

- auto-delete still shows zero false positives on the hard-duplicate benchmark set
- candidate duplicate recall improves materially over the current baseline
- real Chinese and mixed-source exports improve after normalization
- duplicate reasoning is exportable and reviewable
- root and worker code paths use one shared policy

---

## 10. Explicit Non-Goals

The first vNext should not try to do all of the following at once:

- black-box machine learning ranking
- aggressive fuzzy auto-deletion
- broad multilingual semantic matching without identifiers
- a large new frontend workflow before engine behavior stabilizes

That would increase risk without first proving the simpler two-layer model.

---

## 11. Recommendation

Adopt the two-layer rule-based dedup strategy as the next design baseline.

Short version:

- Patch-only is too small.
- Full fuzzy scoring first is too much.
- A two-layer engine is the right next step.

That means the next document after this one should be an **implementation plan for the two-layer engine**, not code changes yet.
