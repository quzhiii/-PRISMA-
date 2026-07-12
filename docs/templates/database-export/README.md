# Database Export Template

Use this checklist before uploading files to PRISMA Workbench. Prefer original database exports over manually edited spreadsheets when possible.

## PubMed

- Export as NBIB from PubMed using Citation manager.
- Keep the original `.nbib` file unchanged.
- Record the search date, search string, and result count.

## CNKI

- Prefer ENW or RIS when available.
- Keep Chinese title, abstract, journal, author, and year fields intact.
- Record whether abstracts appear truncated or noisy.

## Wanfang / VIP

- Export CSV when RIS / ENW is unavailable.
- Preserve the header row and original encoding if possible.
- Record database name, export date, query string, and result count.

## Zotero

- Export RIS, BibTeX, or RDF from a clean collection.
- Avoid mixing manually added notes into bibliographic fields.
- Keep collection name and export timestamp in the project notes.

## Minimum audit notes

- Database family: `[PubMed / CNKI / Wanfang / VIP / Web of Science / Embase / Zotero]`
- Export format: `[NBIB / RIS / ENW / CSV / BibTeX / RDF]`
- Search date: `[YYYY-MM-DD]`
- Search string: `[copy exact query]`
- Exported record count: `[number]`
