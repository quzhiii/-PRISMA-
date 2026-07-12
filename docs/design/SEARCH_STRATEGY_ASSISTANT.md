# Search Strategy Assistant Design

## Purpose

The Search Strategy Assistant helps researchers draft auditable search strategies for systematic reviews. It generates database-specific query drafts, translation notes, and an audit trail for how terms were derived.

This is a design document only. It does not implement database connections.

## Inputs

- Review question and PICOS / PICO fields.
- Synonyms, controlled vocabulary, and known seed articles.
- Target database families.
- Date range, language scope, and study-design filters.
- Reviewer notes about sensitivity vs precision.

## Outputs

- Search strategy drafts for selected database families.
- Term table with concept group, synonym, source, and reviewer note.
- Database-specific syntax notes.
- Audit-ready changelog of edits and reviewer confirmations.
- Exportable Markdown appendix text.

## Supported strategy families

- PubMed: free text, MeSH suggestions, field tags, phrase handling, date filters.
- CNKI: Chinese terms, English terms, title / abstract fields, source notes.
- Wanfang: Chinese keyword groups and field-specific query drafts.
- VIP: Chinese source strategy drafts and conservative syntax notes.
- SinoMed: Chinese biomedical term families and audit notes.
- Zotero / citation managers: handoff notes for imported result sets.

## Audit trail expectations

- Every generated search strategy records the user-provided concepts.
- Every synonym keeps its source: user supplied, seed article, controlled vocabulary, or assistant suggestion.
- Reviewers must confirm final terms before use.
- Exports should include date, database family, exact query draft, and unresolved caveats.

## Explicit non-goals

- The assistant does not fetch database results and 不抓取 database content.
- It does not automatically retrieve records and 不自动检索 databases.
- It does not handle institutional credentials or proxy access.
- It does not claim coverage of all databases.
- It does not automatically include or exclude literature.
- It does not replace librarian or reviewer judgement.

## Future optional BYO API path

A future local-first, bring-your-own API path may allow users to paste API responses or connect their own export files. Any such path must remain opt-in, auditable, and separate from default static usage.
