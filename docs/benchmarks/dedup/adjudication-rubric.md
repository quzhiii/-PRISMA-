# Dedup Adjudication Rubric

Use this rubric to create the gold-standard labels for the benchmark suite.

The purpose of adjudication is not to guess what the current product will do. The purpose is to define what the correct outcome should be in a formal review workflow.

## Label Set

Each pair or cluster must be assigned one of four labels:

- `hard_duplicate`
- `likely_duplicate`
- `not_duplicate`
- `needs_human_judgment`

Before final scoring, all `needs_human_judgment` cases must be resolved into one of the first three labels.

## Label Definitions

### `hard_duplicate`

Use this label when the records clearly represent the same study report and are safe candidates for automatic resolution.

Typical evidence:

- same DOI or PMID after normalization
- same title with trivial formatting differences
- same author list, year, journal, and pages
- same study report imported from multiple databases

Rule:

- If you would be comfortable auto-removing one copy in a production review workflow, this is a `hard_duplicate`.

### `likely_duplicate`

Use this label when the records are probably the same study report, but automatic deletion would be risky without reviewer confirmation.

Typical evidence:

- highly similar title plus overlapping authors and year
- same study with one source missing DOI
- same journal article with metadata variation across databases

Rule:

- If you would want the system to flag the pair but not silently delete it, this is a `likely_duplicate`.

### `not_duplicate`

Use this label when the records are related or similar but must remain separate.

Typical evidence:

- conference abstract vs. final full article
- protocol vs. final trial report
- editorial/commentary vs. original study
- same topic but different study population or outcome
- same title stem but different publication year and content

Rule:

- If merging the records would risk losing a distinct study report, this is `not_duplicate`.

### `needs_human_judgment`

Use this label only during initial triage when the metadata is too weak to decide quickly.

Typical evidence:

- missing DOI, author, pages, and journal
- conflicting metadata across sources
- translated titles with incomplete fields

Rule:

- This label is temporary. Resolve it before scoring.

## Required Fields To Check

For each adjudicated pair or cluster, inspect as many of the following as available:

- title
- author set
- publication year
- journal or source title
- pages
- volume and issue
- DOI
- PMID or equivalent identifier
- publication type
- abstract

## Decision Order

Use this order to reduce avoidable mistakes:

1. Check decisive identifiers first
   - DOI
   - PMID
2. Check bibliographic alignment
   - title
   - authors
   - year
   - journal
   - pages
3. Check publication-type mismatch
   - protocol
   - abstract
   - commentary
   - final article
4. Check abstract or full metadata when still uncertain

## Adjudication Rules

- Prefer preserving possibly distinct records over aggressive merging.
- Do not label a pair as `hard_duplicate` if publication type differs in a way that could matter to screening.
- Record why the label was chosen in a short note.
- If the evidence is weak, downgrade from `hard_duplicate` to `likely_duplicate`.
- If the pair looks similar but would require domain interpretation to merge safely, keep it out of auto-delete.

## Common Failure Modes To Watch

- DOI stored as URL in one source and plain DOI in another
- abbreviated vs. full journal title
- page range formatting changes
- author initials vs. full names
- translated or transliterated titles
- title updates between preprint, protocol, abstract, and final publication

## Minimum Logging Fields

For every adjudicated item, record:

- `dataset_id`
- `cluster_id`
- `record_ids`
- `gold_label`
- `reason`
- `reviewer`
- `reviewed_at`

## Final Rule

When in doubt, preserve safety:

- auto-delete requires `hard_duplicate`
- review queue can include `likely_duplicate`
- anything else remains distinct
