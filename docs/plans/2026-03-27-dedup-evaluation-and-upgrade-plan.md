# Deduplication Evaluation and Upgrade Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish an objective, research-grade decision framework for whether the current deduplication logic should be upgraded, and only design vNext after the evaluation passes a defined gate.

**Architecture:** Treat this as a three-stage program rather than a direct refactor. Stage 1 audits the current logic and benchmarks it against real review scenarios. Stage 2 designs the next deduplication strategy only if the evaluation shows material gaps. Stage 3 executes the upgrade after the strategy is reviewed and approved.

**Tech Stack:** Static HTML, vanilla JavaScript, Web Workers, local benchmark fixtures, CSV/RIS/BibTeX/NBIB parsing, markdown documentation.

---

## 1. Why This Plan Exists

The current product already performs basic deduplication, but the project does not yet have an objective way to answer four questions:

1. Is the current logic good enough for real systematic review workflows?
2. Where does it fail: missed duplicates, false merges, metadata normalization, or explainability?
3. Are the failures important enough to justify iteration now?
4. If iteration is justified, what should be upgraded first without increasing false-positive risk?

This plan solves those questions in order. It deliberately separates evaluation from redesign so the next version is driven by evidence instead of tool envy or anecdotal mismatch with Rayyan.

---

## 2. Current-State Baseline

### 2.1 Current logic in this repo

The current primary flow uses a conservative two-rule approach:

- Exact DOI match
- Exact match on normalized title when DOI is absent or unusable

Relevant code paths:

- Root app flow: `app.js`
- Root quick/export dedup flow: `v1.7-core-patch.js`
- Worker-side alternative fallback key logic: `parser-worker.js`
- Parallel v2 workspace implementation: `literature-screening-v2.0/app.js`

### 2.2 Known baseline risks

- DOI normalization is incomplete in the primary dedup flow.
- The product has more than one dedup rule path today, which creates internal inconsistency.
- The current logic is highly explainable, but likely under-sensitive for noisy cross-database metadata.
- Title-only exact matching may still create false merges in edge cases such as conference abstract vs. full article, protocol vs. final publication, or same-title related records.

### 2.3 Working assumption

For formal review workflows, the system should optimize for:

- Very low false-positive rate on automatic deletion
- High recall for candidate duplicate discovery
- Clear auditability for every duplicate decision

This assumption must be tested, not merely asserted.

---

## 3. External Benchmark Standards

This evaluation will use external standards as reference points, not as direct product requirements.

### 3.1 Rayyan reference behavior

Rayyan separates duplicate detection from duplicate resolution and supports:

- exact-match criteria across Title, Author, Journal, Year, Pages, DOI, and Publication Type
- optional overall similarity thresholds
- optional text normalization
- manual review of possible duplicates with confidence scores

This is useful as a product benchmark because it reflects a real user expectation in review workflows.

### 3.2 Research benchmark behavior

The literature shows that higher-performing review-oriented deduplication systems usually:

- use multiple fields, not just one identifier
- block candidate pairs using strict combinations
- compare candidates using string similarity across multiple bibliographic fields
- explicitly optimize for high recall while keeping false positives very low

The ASySD paper is the most relevant benchmark for biomedical systematic review workflows. It reports sensitivity around 0.95 to 0.99 and specificity above 0.99 across multiple datasets. The older Metta rule-based paper also reinforces the core principle that review workflows should favor preserving distinct studies and use multiple fields because metadata is inconsistent across databases.

### 3.3 How we will use these references

- Not as a mandate to copy Rayyan or ASySD
- As an evidence-backed standard for what "research-grade" deduplication usually requires
- As a calibration point for pass/fail thresholds

---

## 4. Evaluation Scope

The evaluation must cover both technical correctness and real research workflow fit.

### 4.1 In scope

- Root product dedup behavior
- v2 product dedup behavior
- Internal consistency across code paths
- Exact duplicates
- Near-duplicates
- False-merge edge cases
- Explainability of duplicate decisions
- User workflow cost when manual review is required

### 4.2 Out of scope

- Full UI redesign
- Screening rule logic unrelated to deduplication
- Collaboration features except where they affect protected records or audit trails
- Production deployment work

---

## 5. Benchmark Dataset Design

The evaluation should not rely on one anecdotal project. It needs a small but representative benchmark suite.

### Task 1: Build the benchmark corpus

**Files:**
- Create: `docs/plans/2026-03-27-dedup-evaluation-and-upgrade-plan.md`
- Create later: `docs/benchmarks/dedup/README.md`
- Create later: `tests/fixtures/dedup/`

**Dataset groups to include:**

1. Exact DOI duplicates
2. DOI variants
   - `10.xxxx/...`
   - `https://doi.org/10.xxxx/...`
   - `doi:10.xxxx/...`
3. Same study, title punctuation/case variation
4. Same study, author abbreviation variation
5. Same study, page range variation
6. Same study, journal abbreviation variation
7. Missing DOI in one source only
8. Conference abstract vs. final article with highly similar metadata
9. Protocol vs. final article
10. Chinese/English mixed metadata cases
11. Records that are similar but must remain distinct

**Benchmark source mix:**

- small real exported sets from actual user workflows
- synthetic edge cases derived from known metadata variation patterns
- a manually adjudicated "gold set" for scoring

### Task 2: Define gold-standard labeling

Every pair or cluster in the benchmark must be labeled as one of:

- `hard_duplicate`
- `likely_duplicate`
- `not_duplicate`
- `needs_human_judgment`

Labeling rules:

- `hard_duplicate` requires very high confidence and can support future auto-resolution.
- `likely_duplicate` can support candidate surfacing, not silent deletion.
- `not_duplicate` includes lookalikes that must never be auto-merged.
- `needs_human_judgment` is allowed during dataset construction, but must be resolved before scoring the final benchmark.

Gold labeling should be decided by manual adjudication, ideally by checking at least title, author set, year, journal, pages, DOI/PMID, and publication type.

---

## 6. Evaluation Metrics

This plan uses two separate quality layers because "good candidate discovery" and "safe automatic deletion" are different problems.

### 6.1 Layer A: Auto-delete safety

This layer measures records that the product would remove without asking the user.

Metrics:

- Precision
- False positives
- Specificity

Required gate for approval:

- `false positives = 0` on the hard-duplicate benchmark subset
- `precision = 1.000` for auto-delete decisions in the approved benchmark run

If this gate fails, the product must not broaden automatic deletion rules.

### 6.2 Layer B: Candidate duplicate discovery

This layer measures whether the product surfaces duplicates for user review, even if it does not delete them automatically.

Metrics:

- Recall / sensitivity
- Precision of candidate pool
- F1 score
- Candidate review load per 1,000 records

Target gate for strategy design:

- `recall >= 0.95` on benchmark duplicates
- `specificity >= 0.99`
- `F1 >= 0.95`
- candidate review load remains acceptable for real users

These are target thresholds, not release thresholds. They are used to decide whether a next-version strategy is justified and what kind of strategy is acceptable.

### 6.3 Layer C: Workflow fit

This layer measures whether the dedup output is usable in a real review process.

Questions:

- Can the system explain why a pair was flagged?
- Can a reviewer audit kept vs. removed records?
- Can the reviewer export the duplicate decisions?
- Is the manual review burden reasonable?
- Does the system protect ambiguous cases instead of silently deleting them?

This layer is qualitative, but it still needs a rubric.

---

## 7. Decision Rubric

After the benchmark run, classify the current logic into one of four states:

### State A: Keep as-is

Conditions:

- auto-delete safety passes
- candidate recall is good enough for target users
- workflow complaints are minimal

Action:

- do not rewrite dedup logic now
- only patch documentation and transparency gaps

### State B: Patch only

Conditions:

- the core design is acceptable
- failures come mostly from normalization gaps or inconsistent code paths

Examples:

- DOI normalization gaps
- inconsistent title normalization
- root/v2 behavior mismatch
- missing duplicate reason labels

Action:

- plan a small, low-risk upgrade

### State C: Moderate redesign

Conditions:

- auto-delete safety is acceptable
- candidate recall is materially below target
- multi-field matching is missing

Action:

- design a two-layer dedup engine:
  - hard duplicates for automatic resolution
  - candidate duplicates for manual confirmation

### State D: Full dedup engine upgrade

Conditions:

- current logic materially underperforms benchmark expectations
- internal inconsistency is high
- users cannot trust the current dedup output in formal reviews

Action:

- design a new ruleset, scoring model, and review workflow before implementation

---

## 8. Stage Gates

This project must move through explicit gates.

### Gate 1: Evaluation readiness

Required before running the assessment:

- benchmark corpus defined
- gold labels defined
- scoring script or manual scoring worksheet defined
- current code path to be evaluated frozen for the run

### Gate 2: Evaluation verdict

Required before designing vNext:

- benchmark results documented
- failure categories grouped
- product risks ranked by severity
- decision rubric applied

### Gate 3: Strategy approval

Required before implementation:

- next-version strategy written
- scope clearly limited
- automatic vs. manual duplicate handling defined
- rollout and regression test plan defined

No implementation work starts before Gate 3 is explicitly approved.

---

## 9. Deliverables by Phase

### Phase 1: Evaluation package

Deliverables:

- benchmark design doc
- benchmark fixture set
- adjudication rubric
- scoring sheet or scoring script
- current-state evaluation report
- recommendation memo: keep, patch, redesign, or rebuild

### Phase 2: vNext dedup strategy

Deliverables:

- strategy doc for the next dedup engine
- decision table for exact vs. candidate duplicates
- normalization spec
- multi-field matching spec
- review UX requirements for ambiguous duplicates
- regression test matrix

### Phase 3: Upgrade execution plan

Deliverables:

- implementation plan
- code-path unification plan
- migration and compatibility notes
- acceptance tests

---

## 10. Proposed Next-Version Design Constraints

These are constraints for the future strategy doc, not implementation commitments yet.

### 10.1 Non-negotiables

- Keep the system local-first
- Keep duplicate decisions explainable
- Never broaden auto-delete logic without zero-false-positive confidence on benchmark hard duplicates
- Separate exact duplicates from candidate duplicates
- Unify root and v2 dedup behavior

### 10.2 Likely vNext direction

If the evaluation supports an upgrade, the default recommended direction is:

1. Normalize decisive identifiers first
   - DOI
   - PMID if available
2. Introduce multi-field blocking for candidate generation
   - examples: title+author, title+year, journal+volume+pages, author+year+pages
3. Score candidate similarity using multiple fields
4. Auto-resolve only the highest-confidence hard duplicates
5. Route ambiguous pairs to a duplicate review queue instead of deleting them

This is deliberately closer to research-grade practice while still preserving product explainability.

---

## 11. Acceptance Criteria for This Planning Phase

- [ ] The project has a documented evaluation-first process
- [ ] The plan defines measurable gates before redesign
- [ ] The plan separates safety from recall
- [ ] The plan covers real review edge cases, not just clean metadata
- [ ] The plan makes it impossible to jump straight from anecdotal mismatch to implementation

---

## 12. References

Primary external references used to define the evaluation standard:

- Rayyan Help Center, "Detecting duplicate references/articles in a review"
  - https://help.rayyan.ai/hc/en-us/articles/17755680264337-Detecting-duplicate-references-articles-in-a-review
- Rayyan Help Center, "Understanding and Utilizing the Auto-Resolver for Duplicates"
  - https://help.rayyan.ai/hc/en-us/articles/34563050458257-Understanding-and-Utilizing-the-Auto-Resolver-for-Duplicates
- Hair et al., 2023, "The Automated Systematic Search Deduplicator (ASySD)"
  - https://pubmed.ncbi.nlm.nih.gov/37674179/
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC10483700/
- Jiang et al., 2014, "Rule-based deduplication of article records from bibliographic databases"
  - https://pubmed.ncbi.nlm.nih.gov/24434031/
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC3893659/

---

## 13. Immediate Recommendation

Proceed with Phase 1 only.

Do not design or implement a new dedup engine until the benchmark package and evaluation verdict are complete. Based on current evidence, the most likely outcome is either `State B: Patch only` or `State C: Moderate redesign`, but this must be proven by benchmark results before moving forward.
