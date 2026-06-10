# Repo Archive Notes

Last updated: 2026-06-10

## Top-Level Legacy Release Directories Removed

The default top-level repo tree keeps only the current public workspace path and the historical compatibility path that are still referenced by docs, tests, and the GitHub Pages entry flow.

Removed from the default top-level tree:

- `literature-screening-v1.3/`
- `literature-screening-v1.4/`
- `literature-screening-v1.5/`
- `literature-screening-v1.6/`
- `literature-screening-v30/`

Why they were removed:

- They are redundant legacy release directories rather than active product paths.
- They are not part of the current public repo narrative.
- Keeping them at the top level adds noise to the remote repository tree and makes the active workspace harder to identify.

What remains intentionally visible:

- `literature-screening-v2.2/` as the current public compatibility path
- `literature-screening-v2.0/` as the historical compatibility path that is still referenced by current docs and tests

Recovery policy:

- If a legacy directory is needed for forensics or historical comparison, recover it from git history instead of restoring it to the default top-level tree.
