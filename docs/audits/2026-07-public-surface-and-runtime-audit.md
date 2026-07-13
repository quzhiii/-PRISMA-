# Public Surface and Runtime Contract Audit

Date: 2026-07-13

## Purpose

This M0 audit freezes the public-surface, routing, deployment, and runtime-contract baseline before RT-0 implementation. It records current behavior and assigns remediation to later milestones. It does not change product behavior, routes, schemas, or deployment.

## Audit baseline

- Branch: `chore/rt0-public-alignment`
- Baseline commit: `ddc37a1`
- Current public release line: V2.5 dual-review closeout
- Current compatibility release path: `literature-screening-v2.2/`
- Architecture boundary: static-first and local-first
- Collaboration boundary: local browser state plus file-based Reviewer Bundle handoff; no account or real-time sync service
- Remote links: recorded from source but not network-verified for this formal baseline
- Deployment: no push or deployment was performed
- M0 behavior rule: findings only; no core product logic was changed

## Scope and method

The audit covers:

- root and current public HTML titles, metadata, navigation, CTAs, footers, versions, and risk claims;
- `README.md` and `README_EN.md` release descriptions, launch instructions, and links;
- root, current, historical, test, and compatibility routes;
- explicit local `href`, `src`, Worker, and sample-data targets;
- project save, restore, autosave, and browser-storage formats;
- Reviewer Seed and Decision Bundle formats and checks;
- project history, import progress, ImportJob, audit, export, and AI evidence formats;
- current tests that constrain those contracts.

Line references identify the audited `ddc37a1` source and will move when M1 or later implementation changes the files.

## Executive findings

No confirmed missing local static target was found in the audited current pages. The primary risks are semantic and contractual rather than simple broken links.

| Priority | Finding | Required follow-up |
|---|---|---|
| P0 | The root URL is a historical v1.7 application body with a client-side redirect and mixed V2.3, V2.5, and V3.0 claims. | M1 |
| P0 | Current dual-review entry copy implies login, project joining, and synchronization although the implementation uses browser-local state and file handoff. | M1 copy boundary, M4 workflow contract |
| P0 | Root publishing can expose historical and test pages, including `create-test.html`, which can mutate the same `prisma_projects` localStorage key as the current app. | M1 deployment allowlist |
| P0 | Public surfaces use PRISMA product branding without the planned independent-project, no-affiliation statement. | M1 |
| P1 | `audit-ready`, `可审计`, V3 resource branding, and readiness language exceed or blur the evidence boundary. | M1 and M5 |
| P1 | Project `version` is a release identifier, not a project schema version; project loads and local restore have weak compatibility checks. | M3 and M7 |
| P1 | Reviewer Bundle validation is limited to type and a non-cryptographic base fingerprint; the planned round trip is only partially tested. | M4 |
| P1 | History is a bounded outer snapshot list, not a hash-verified checkpoint/replay model, and snapshots recursively retain prior history. | M7 |
| P1 | `project_manifest.json` describes a project but does not bind an export set with artifact hashes or producer identity. | M5 and M7 |
| P1 | Import “resume” and autosave write state but do not provide validated continuation or a normal recovery reader. | M3 and M7 |
| P2 | AI behavior is advisory in the current UI path, but human authority is not enforced as an import/export schema invariant. | M5 |

## Public surface findings

### P0: root entry exposes incompatible public identities

| Evidence | Current text or behavior | Risk | M1 remediation target |
|---|---|---|---|
| `index.html:6-9` | Meta describes V2.3, V2.5, V3.0, and the `literature-screening-v2.2/` path; title is `PRISMA文献筛选助手 v1.7 历史版本`; meta refresh targets the compatibility homepage. | Search results, previews, no-script clients, and redirect failures can expose a different product and version from the current V2.5 line. | Make `/` the V2.5 public homepage or a minimal V2.5 compatibility entry; remove the old executable body; add one canonical policy. |
| `index.html:11-20` | JavaScript uses `window.location.replace()` and preserves query/hash. | This is a client-side `200` page, not a repository-defined HTTP redirect. | Preserve query/hash in route smoke tests, but prefer a direct current root page or deployment-level redirect where supported. |
| `index.html:866-920` | Visible fallback combines v1.7, V2.3, V2.5, V2.1 history, and `V3.0 发布准备资产`. | A single entry tells several incompatible release stories. | Keep only V2.5 current-release language at the root; move history and internal packaging to explicit history/planning contexts. |
| `index.html:995,1112-1115,1524,1824` | Claims include `完美支持中文`, `绝对安全`, `保密性得到完全保障`, and `永久解决乱码问题`. | Absolute correctness, security, and confidentiality promises are not supportable. | Replace with tested behavior, local-default wording, external-egress disclosure, and known limitations. |

### P0: dual-review page presents a service that does not exist

| Evidence | Current text or behavior | Risk | Follow-up target |
|---|---|---|---|
| `literature-screening-v2.2/login.html:6-7,40-70` | Page and runtime title use login/access/collaboration framing. | Users can infer accounts, shared server projects, or a synchronized session. | M1: rename public semantics to dual-review setup. M4: make the file handoff flow explicit. |
| `literature-screening-v2.2/login.html:95-116,198-205` | Secondary reviewer `加入...项目`; missing projects may `继续登录等待同步`; button says `加入项目并开始复核`. | Cross-device work can appear to work while no server-side project or sync exists. | Use `导入 Reviewer Bundle`, `导出 Decision Bundle`, and `等待对方导出 Decision Bundle`. |
| `literature-screening-v2.2/login.html:235-271` | Session is stored in `sessionStorage`; project existence reads only same-origin `localStorage`; a missing project is not blocked. | A project ID is presented as a network locator although it only addresses browser-local data. | State that there are no accounts or online project lookup; reject or clearly separate unsupported project-ID joining. |
| `literature-screening-v2.2/index.html:51,223-234`; `literature-screening-v2.2/landing.html:49,100-116`; `literature-screening-v2.2/resources.html:31,50` | Current CTAs send users into the misleading entry. | The semantic mismatch is a primary navigation path, not an isolated legacy label. | Point general navigation at the canonical setup/handoff entry once M4 exists. |

### P0: publishing scope can expose state-mutating test tools

| Evidence | Current text or behavior | Risk | M1 remediation target |
|---|---|---|---|
| `.vercelignore:1-7` | Only three removed historical directories and Python artifacts are excluded. | It is not a publish allowlist and does not define GitHub Pages output. | Build or publish an explicit static artifact allowlist. |
| `create-test.html:63-66,117-125`; `literature-screening-v2.2/app.js:165-168,11238-11241` | The test page writes and can clear `prisma_projects`, the key also used by the current application. | A guessed public test URL can contaminate or delete same-origin local project registry data. | Exclude state-mutating and performance test pages from public artifacts. |
| `test.html:6,9-24`; `test-simple.html:6,14`; `test-30k.html:5,19,43,85-91` | Test surfaces expose old versions, server-status language, Workers, and destructive test setup. | Public URLs add version confusion and operational risk. | Keep these as repository tests only or move them behind a non-published artifact boundary. |
| `literature-screening-v2.0/` | A complete historical site remains directly addressable without a current-release banner. | Deep-link users can mistake historical behavior for the current line. | Define `/legacy/`, compatibility banners, canonical/noindex policy, and alias duration. |

### P0: PRISMA affiliation boundary is absent

| Evidence | Current text or behavior | Risk | M1 remediation target |
|---|---|---|---|
| `literature-screening-v2.2/index.html:19-28`; `landing.html:16-25`; `resources.html:16-25`; `login.html:19-29`; `workspace.html:20-30` | The custom product mark is labelled `PRISMA logo` and the product is `PRISMA Workbench`. | The combination can imply affiliation, authorization, certification, or endorsement. | Relabel the mark as the project/product mark and add the independent-project statement. |
| `literature-screening-v2.2/index.html:253-256`; `landing.html:270-273`; `resources.html:150-153`; `README.md:1-3`; `README_EN.md:1-3` | Footers and READMEs do not contain the planned statement. | Users have no explicit correction near current brand use. | Add the approved Chinese and English no-affiliation statement to public surfaces or a clearly linked Methods statement. |

No exact public occurrence was found for `official PRISMA`, `PRISMA official`, or `PRISMA-certified`; the risk is implicit branding without a disclaimer.

### P1: evidence and readiness language is too strong

| Evidence | Current text or behavior | Risk | Remediation target |
|---|---|---|---|
| `literature-screening-v2.2/index.html:42-43,64-65,126,163,173,188,206,213,254,306-307` | Repeated `可审计`, `audit-ready`, and `auditable evidence` product-level claims. | Reads as blanket readiness or certification rather than traceability-oriented design. | M1: use `可追溯、面向复核`, `audit-oriented`, or `designed for traceability`. M5: tie claims to concrete evidence. |
| `literature-screening-v2.2/landing.html:6,40-45,128,312-313`; `workspace.html:1024-1029` | `audit-ready` appears in metadata and public overview/workspace copy. | Search and share metadata repeats the same overclaim. | Apply one bilingual copy guard across HTML metadata and visible text. |
| `README.md:49,82,289`; `README_EN.md:49,82,290` | Current positioning and history use `audit-ready`. | The repository front page reinforces the unsupported blanket claim. | Keep `audit` for named logs/artifacts; describe the overall product as traceability-oriented. |
| `literature-screening-v2.2/index.html:152-154`; `workspace.html:869,921-922`; `README.md:107`; `README_EN.md:107` | Uses appendix/defense-ready language. | Can imply validation of fitness for submission or defense. | Describe an evidence package for researcher review, methods appendices, or defense preparation; require human verification. |
| `literature-screening-v2.2/workspace.html:532-533,821-822,901-902` | Uses `Standard PRISMA 2020` and says counts are ready for the checklist. | Can imply conformity or certification. | Use `PRISMA 2020-oriented` and say outputs support checklist preparation. |

No exact occurrence was found for `fully validated` or `zero missed studies` in the audited public surfaces.

### P1: V3 resources conflict with the V2.5 public line

| Evidence | Current text or behavior | Risk | M1 remediation target |
|---|---|---|---|
| `literature-screening-v2.2/resources.html:6-7,25,39-42,150-151,190-195` | Title, metadata, brand subtitle, hero, footer, and runtime metadata identify `V3 Resources`. | V3 looks like a parallel or newer public product. | Rename to unversioned or V2.5 resources; keep internal packaging labels out of public navigation. |
| `literature-screening-v2.2/index.html:52,236-247`; `landing.html:50,209-224` | Prominent `V3 资源中心` CTAs. | The current homepage advertises two public release identities. | Use `资源中心 / Resources`. |
| `README.md:66-97,186-200`; `README_EN.md:66-97,186-200` | V2.5, V2.5.1, V2.6, V2.7, and V3.0 remain visually prominent despite explanatory text. | Capability slices still look like selectable release lines. | Keep one current public release at the top; move slice identifiers to history or Methods evidence. |

Operational `literature-screening-v2.2/` path strings and clearly marked historical V2.2 records are not themselves violations. They must not be presented as the current public version.

### P1: local-first copy does not describe all network egress

| Evidence | Current text or behavior | Risk | M1/M5 remediation target |
|---|---|---|---|
| `literature-screening-v2.2/index.html:60-62` | `数据不离开浏览器 / Data stays in browser`. | The sentence is broader than the implemented boundary. | Say imported project records are processed and stored locally by default and are not automatically uploaded. |
| `literature-screening-v2.2/app.js:10135-10163,10261,10389,11513` | Translation paths can send title/abstract content to Google Translate or open external translation pages. | Optional actions can transmit record content to a third party. | Disclose fields, destination, and user action before egress; document in Methods. |
| `literature-screening-v2.2/index.html:8-10`; `login.html:8-10`; `workspace.html:9-11,1060` | Google Fonts and CDN js-yaml are remote runtime assets. | The page is not fully offline by default and still makes third-party asset requests. | Distinguish project-data handling from page asset requests; consider vendoring core dependencies. |

### P2: public page roles and status remain ambiguous

| Evidence | Current text or behavior | Risk | Follow-up target |
|---|---|---|---|
| `literature-screening-v2.2/landing.html:6-7,38-50` | A second V2.5 overview has no discovered inbound link from current navigation or README. | An orphaned duplicate public page can drift and be indexed independently. | M1: merge, redirect, or assign a documented role. |
| `literature-screening-v2.2/index.html:121` | Chinese describes implemented mixed import while English says parser work is planned. | Bilingual capability status differs. | M1: use one bilingual capability matrix. |
| `literature-screening-v2.2/resources.html:118`; current page titles | A visible `v0` kit badge and mixed `v2.5`/`V2.5` casing add release noise. | Minor but avoidable version ambiguity. | Use `Draft` or `Starter kits`; standardize public casing to `V2.5`. |

## Current route and deployment map

```text
/ or /index.html
  -> meta refresh and JavaScript replace
  -> /literature-screening-v2.2/index.html
       -> workspace.html
       -> login.html
       -> resources.html

/login.html
  -> root historical login flow
  -> root index.html
  -> client-side redirect to current compatibility homepage

/literature-screening-v2.2/landing.html
  -> directly addressable overview
  -> no current inbound navigation found

/literature-screening-v2.0/
  -> directly addressable historical homepage/login/workspace line

root test surfaces
  -> test.html
  -> test-simple.html
  -> test-30k.html
  -> create-test.html
```

The repository does not currently define `vercel.json`, `_redirects`, `404.html`, `CNAME`, `.nojekyll`, `robots.txt`, `sitemap.xml`, or a Pages workflow. Hosting configuration outside the repository was not audited, so the exact deployed file set and HTTP status behavior are unknown.

### Route conclusions

- The JavaScript redirect preserves query and hash; the meta-refresh fallback does not. Both mechanisms are client-side, and no repository-defined HTTP redirect exists.
- `landing.html` is a navigational orphan in the audited source.
- No repository-defined canonical URL or trailing-slash policy exists.
- No current `/app/`, `/start/`, `/dual-review/`, `/resources/`, `/methods/`, or `/legacy/` directory route exists.
- Historical and test pages are potentially deployable when publishing directly from repository root.
- `.vercelignore` does not define GitHub Pages behavior.

## Link inventory and reachability

### README remote links

| Link group | Source | Baseline status |
|---|---|---|
| Shields badge images | `README.md:5-11`; `README_EN.md:5-11` | Present in source; not network-verified |
| GitHub Pages root | `README.md:6-7,10-11,15`; `README_EN.md:6-7,10-11,15` | Present in source; depends on root client redirect; not network-verified |
| GitHub Issues | `README.md:15`; `README_EN.md:15` | Present in source; contribution permissions not verified |

### README local links

The audited targets exist:

- `LICENSE`;
- `README.md` and `README_EN.md` cross-links;
- `literature-screening-v2.2/` and its `index.html`;
- `docs/benchmarks/dedup/post-implementation-benchmark-report.md`;
- `docs/checklists/V2.3_PRISMA_TRAICE_READINESS_CHECKLIST.md`;
- both README history anchors.

### Current-page local targets

All explicit local targets checked in the root and `literature-screening-v2.2/` public pages exist, including stylesheets, current HTML pages, workspace scripts, Workers, `sample-data.json`, and linked repository documentation. This is not a browser interaction or HTTP status test.

### `file://` execution boundary

- `literature-screening-v2.2/workspace.html:1063-1067` disables DB and parser Workers under `file:`.
- `literature-screening-v2.2/app.js:178,2541-2547` limits whole-file fallback for incremental formats to about 20 MiB.
- `literature-screening-v2.2/app.js:9301-9306` uses an embedded demo fallback in local-file mode.
- `literature-screening-v2.2/workspace.html:1060` still depends on remote js-yaml.

README currently lacks a precise HTTP-server launch path and `file://` degradation statement. M1 should document recommended HTTP mode and local-file limitations without claiming complete offline equivalence.

## Risk-term inventory

| Term | Baseline result | Classification |
|---|---|---|
| `audit-ready` | Present in current homepage, overview, workspace metadata, and both READMEs | Replace as product-level assurance |
| `可审计` | Present repeatedly in current public copy | Keep only for narrowly defined artifacts if evidence supports it; otherwise use traceability language |
| `official PRISMA`, `PRISMA official`, `PRISMA-certified` | No exact audited public occurrence | Confirmed non-finding; implicit affiliation risk remains |
| `perfect` | No exact English occurrence | Chinese `完美` equivalents exist in root historical body |
| `absolute security` | No exact English occurrence | Chinese `绝对安全` exists in root historical body |
| `guaranteed` | No exact English occurrence | Chinese `完全保障` equivalent exists in root historical body |
| `fully validated` | No exact occurrence | Adjacent readiness/research-grade language remains |
| `zero missed studies` | No exact occurrence | Confirmed non-finding |
| `V3`, `V3.0` | Present in root, current navigation/resources, and READMEs | Public-version confusion |
| `v2.2`, `V2.2` | Primarily compatibility paths and history | Benign when explicitly operational/historical; not a current release label |
| `登录`, `加入项目`, `等待同步` | Present in current and historical dual-review flows | Misrepresents local/file collaboration |

## Runtime contract baseline

The active workspace loads import, audit, dual-review, AI, history, and Reviewer Bundle modules at `literature-screening-v2.2/workspace.html:1084-1094`. The following sections record current formats; they are not proposed replacement schemas.

### Version identifiers in active runtime

| Concept | Current identifier | Source |
|---|---|---|
| Application release marker | `2.5-dual-review-release` | `literature-screening-v2.2/app.js:10` |
| Manifest app version | `v2.5` | `literature-screening-v2.2/audit-engine.js:183-208`; app initialization |
| Audit schema | `audit.v1` | `literature-screening-v2.2/audit-engine.js:12` |
| Reviewer Bundle schema | `reviewer_bundle.v1.local` | `literature-screening-v2.2/reviewer-bundle-engine.js:12` |
| Dual-review schema | `dual_review.v2.5-alpha` | `literature-screening-v2.2/dual-review-engine.js:12` |
| History schema | `project_history.v2.5.1` | `literature-screening-v2.2/project-history-engine.js:2` |
| ImportJob schema | none | `literature-screening-v2.2/import-job-runtime.js:31-49` |
| IndexedDB version | numeric `3`, DB `PRISMA_LiteratureDB_v2.2` | `literature-screening-v2.2/db-worker.js:6-14` |
| Legacy collaboration export | `1.1` | `literature-screening-v2.2/app.js:11389-11394` |

The project file has no independent Project Schema Version or Project State Version. Release identity, module schemas, database migration version, and export schema therefore cannot be inferred from one another.

### Project snapshot and manual project file

Per-project persistence is written by `persistCurrentProjectState()` at `literature-screening-v2.2/app.js:6197-6231` under:

```text
prisma_project_${projectId}
```

The active project pointer is `prisma_current_project_id` (`app.js:5929-5961`). Manual project download uses substantially the same state shape (`app.js:10431-10468`):

```json
{
  "version": "2.5-dual-review-release",
  "timestamp": "ISO-8601",
  "projectId": "string",
  "uploadedData": [],
  "uploadedFiles": [],
  "screeningResults": null,
  "columnMapping": {},
  "fileFormat": "string",
  "formatSource": "string",
  "currentStep": 1,
  "exclusionReasons": [],
  "filterRules": null,
  "qualityAssessments": [],
  "importJobs": [],
  "projectManifest": {},
  "auditEvents": [],
  "screeningDecisions": [],
  "aiSuggestionEvents": [],
  "projectHistory": [],
  "dualReviewResults": { "A": {}, "B": {}, "final": {} },
  "dualReviewConflictState": {}
}
```

`loadProject()` checks only JSON parse success and a truthy `project.version` (`app.js:10479-10566`). It does not compare project schema, producer, release compatibility, project/manifest identity, record/decision references, or hashes. The explicit migration only converts an object-form `exclusionReasons` value into keys (`app.js:10519-10524`).

`loadCurrentProjectStateFromLocalStorage()` requires only a truthy `snapshot.projectId` before permissive restore. The normal initialization branch is contradictory: collaborative sessions bypass the local loader, while single mode makes `shouldAutoRestoreProjectState()` false. This makes the automatic per-project restore path effectively unreachable in normal startup.

**Risk:** files with unrelated or future truthy `version` values can partially enter current state, while continuously written snapshots do not provide a clear normal recovery path.

**Follow-up:** M3 package diagnostics and recovery UX; M7 explicit project schema/state migration policy.

### Autosave and reset

Autosave is off by default and writes a full project-like object every five minutes to global key `prisma_autosave` (`app.js:10568-10606`). No reader or recovery prompt for this key was found. It is not project-keyed and has no schema, age, producer, or identity validation.

`resetApp()` removes the current per-project snapshot and current-project pointer, but not `prisma_autosave`, `import_progress`, `lastSaveTime`, or `prisma_projects`, and it does not clear every project-scoped in-memory ledger (`app.js:9219-9245`).

**Risk:** autosave is presented as persistence but is not a recoverable contract, and reset semantics can leave stale project state.

**Follow-up:** M3.

### Reviewer Seed Bundle

`createCollaborationSeedPackage()` (`reviewer-bundle-engine.js:98-131`) currently emits:

```json
{
  "schemaVersion": "reviewer_bundle.v1.local",
  "bundleType": "collaboration_seed",
  "exportedAt": "ISO-8601",
  "baseFingerprint": "rbp:1234abcd",
  "project": {
    "projectId": "string",
    "appVersion": ""
  },
  "version": "2.5-dual-review-release",
  "timestamp": "ISO-8601",
  "projectId": "string",
  "projectManifest": {},
  "currentProjectId": "string",
  "uploadedData": [],
  "uploadedFiles": [],
  "columnMapping": {},
  "screeningResults": null,
  "fileFormat": "string",
  "formatSource": "string",
  "filterRules": null,
  "exclusionReasons": []
}
```

In the active app path, the Seed's nested `project.appVersion` is empty because `createCollaborationSeedPackage()` reads `projectManifest.version` or `projectManifest.app_version`, while `ensureProjectManifest()` writes `appVersion`. The Seed omits decisions and quality assessments, which preserves reviewer isolation. It is generic rather than reviewer-assigned, and no dedicated Seed import validator exists. Because it also has a truthy top-level release `version`, it can pass the generic project loader without bundle-type, schema, fingerprint, reviewer, or producer validation.

### Reviewer Decision Bundle

`createReviewerDecisionBundle()` (`reviewer-bundle-engine.js:149-176`) emits:

```json
{
  "schemaVersion": "reviewer_bundle.v1.local",
  "bundleType": "reviewer_decision_bundle",
  "exportedAt": "ISO-8601",
  "baseFingerprint": "rbp:1234abcd",
  "project": { "projectId": "string" },
  "reviewer": {
    "reviewerId": "string",
    "reviewerLabel": "string"
  },
  "screeningDecisions": [],
  "qualityReviewerAssessments": {}
}
```

Only matching-reviewer `full_text` decisions and reviewer-scoped quality values are exported (`reviewer-bundle-engine.js:133-197`).

`applyReviewerDecisionBundle()` validates only:

1. `bundleType === "reviewer_decision_bundle"`;
2. incoming `baseFingerprint` equals the local recomputed fingerprint.

See `reviewer-bundle-engine.js:273-288`.

It does not validate schema compatibility, nested project ID directly, reviewer assignment, duplicate merge, record count, decision hash, record membership, missing/added records, producer, or producer version.

Screening decisions merge by `recordId::stage::reviewerId`; timestamps and then decision IDs choose the winner (`reviewer-bundle-engine.js:200-234`). Quality reviewer values are shallow-overwritten by reviewer key (`reviewer-bundle-engine.js:236-270`). Exact repeated imports are not rejected or recorded as duplicate bundle applications.

### Reviewer fingerprint

`buildProjectBaseFingerprint()` canonicalizes selected project fields and applies a 32-bit FNV-1a-like function, producing `rbp:<8 hex>` (`reviewer-bundle-engine.js:36-95`). Included data is project ID, manifest version, record index/ID/title/DOI/year, file name/size/count, mapping, format, source, and rules.

The fingerprint excludes abstracts, most record fields, source bytes, decisions, quality values, audit events, AI events, history, producer, and schema identity. It is an accidental-mismatch detector, not a collision-resistant source manifest hash or tamper-evident signature.

**Follow-up:** M4 must decide canonical fields, compatibility, cryptographic hash scope, duplicate application policy, and failure diagnostics. M5 must describe what integrity evidence proves and does not prove.

### Reviewer round-trip test baseline

`tests/audit/reviewer-bundle-engine.test.mjs:100-287` currently covers:

- Seed omits reviewer decisions and reviewer-scoped quality data;
- Decision Bundle contains one reviewer’s full-text decisions and quality values;
- merge retains owner project data;
- in-memory Seed -> A/B decisions -> merge creates one unresolved conflict gate.

It does not cover persisted file serialization, wrong schema/project/reviewer, duplicate bundle application, missing/added records, cryptographic hashes, resolver closeout, final evidence export, or export-count replay. No persisted `tests/fixtures/reviewer-bundle-roundtrip/` fixture set exists.

**Follow-up:** M4.

### Project history

`project-history-engine.js:31-48` creates at most 20 outer snapshots:

```json
{
  "snapshot_id": "snapshot-...",
  "schema_version": "project_history.v2.5.1",
  "created_at": "ISO-8601",
  "label": "Project snapshot",
  "reason": "manual_snapshot",
  "step": 1,
  "source_files": [],
  "record_count": 0,
  "rule_hash": "",
  "counts_summary": {},
  "state": {}
}
```

Normal app calls do not provide `rule_hash`. Restore requires only a matching snapshot ID and truthy `state`, then preserves the current history timeline (`app.js:1803-1848`). There is no schema compatibility check, migration, project ID check, state hash, parent checkpoint, event cursor, replay, count verification, or rollback hash assertion.

`buildCurrentProjectHistoryState()` includes `projectHistory` inside each new snapshot (`app.js:5994-6014`). Each later snapshot can therefore retain nested copies of earlier snapshots; the 20-entry outer limit does not bound nested serialized history growth.

**Follow-up:** M7. M3 should diagnose quota/save failures before a full checkpoint redesign.

### Project manifest and export package

The internal project manifest (`audit-engine.js:183-208`) is:

```json
{
  "projectId": "string",
  "projectName": "Untitled systematic review",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "reviewType": "systematic_review",
  "prismaVersion": "PRISMA_2020",
  "aiMode": "off",
  "appVersion": "v2.5",
  "dataResidency": "local_browser",
  "exportGeneratedAt": "ISO-8601",
  "dataSources": [],
  "reviewers": [],
  "aiUsageRegistry": [],
  "settings": {},
  "schemaVersion": "audit.v1"
}
```

`project_manifest.json` export (`audit-engine.js:814-832`) contains project metadata, app version, audit schema, PRISMA version, AI mode, data residency, and export time. It does not contain producer identity, an artifact list, per-file media type/size/hash, hash algorithm, manifest hash, bundle/export ID, or source-manifest hash.

Audit package files are downloaded independently rather than as one bound archive. `export_generated_at` is normalized from the existing manifest and can predate the actual download action.

Audit events (`audit-engine.js:845-862`) have no sequence or previous-event hash. Screening decision CSV has stable fields (`audit-engine.js:759-785`), and count replay exists as a separate artifact, but no manifest binds those artifacts to one exact export set.

**Follow-up:** M5 export-evidence contract and truthful Methods language; M7 explicit Export Snapshot relationship.

### ImportJob and import progress

`import-job-runtime.js:31-49` defines:

```json
{
  "id": "import-...",
  "project_id": "string|null",
  "file_name": "unknown",
  "file_size": 0,
  "format": "unknown",
  "stage": "queued",
  "bytes_read": 0,
  "records_parsed": 0,
  "records_written": 0,
  "checkpoint_json": null,
  "error": "",
  "started_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

Known stages are `queued`, `reading`, `parsing`, `normalizing`, `writing`, `dedup_prep`, `completed`, `failed`, and `cancelled`. `checkpoint_json` is opaque, there is no schema/producer/file hash, and patches do not enforce legal stage transitions.

Global `import_progress` stores files, processed/total counts, checkpoints, and timestamp (`app.js:2930-2958`). Recent progress triggers a “continue?” prompt (`app.js:3089-3100`), but accepted progress is not used to seek, skip, validate, or resume the selected files. The actual import starts a new session. `batchInsertWithCheckpoint()` is a simulated, uncalled path (`app.js:2801-2854`), while the active queue appends records to memory (`app.js:2860-2914`).

Tests for ImportJob currently import the V2.0 module path rather than the active V2.2 compatibility module. No test demonstrates a real interrupted-file continuation.

**Follow-up:** M3 truthful recovery UI; M7 versioned import operation/checkpoint contract.

### Persistence authority

`db-worker.js` declares IndexedDB stores for records, dedup index, quality assessments, import jobs, manifest, audit events, and screening decisions. The current full project lifecycle primarily persists full state in `localStorage`; the active role and recovery precedence of IndexedDB versus localStorage are not defined. AI suggestions, history, dual-review conflict state, and full snapshots do not have dedicated stores.

**Follow-up:** M3 selects one user-facing recovery path; M7 defines state/event authority and replay semantics.

### AI advisory boundary

Current application behavior is conservative:

- manifest AI mode defaults to `off`;
- provider dispatch returns `not_dispatched` with `canDispatch: false`;
- generation writes advisory `AISuggestionEvent` values separately from decisions;
- only explicit human accept/edit creates a `ScreeningDecision`;
- rejection creates no decision;
- tests verify suggestions do not affect counts before human review.

The schema boundary is softer than the UI path:

- suggestion model/configuration/hash fields normalize missing values rather than reject them;
- exported suggestions omit general provider/config metadata and are not bound to one registry version;
- any non-empty `linkedDecisionId` is labelled as linked human evidence without referential/provenance validation;
- imported or programmatic decisions are not required by schema to have human provenance before counting;
- prompt/input fingerprints are local 32-bit hashes, not cryptographic digests.

**Follow-up:** M5 must enforce and explain advisory-only provenance at package/import/export boundaries; M7 may make provenance a replay invariant.

## Milestone remediation queue

### M1: public alignment

1. Replace the root historical body with one V2.5 public identity.
2. Establish canonical routes/aliases and route smoke tests.
3. Remove public V3 release framing and product-level `audit-ready` claims.
4. Add the independent-project/no-affiliation statement.
5. Replace login/join/sync wording with accurate local/file collaboration language.
6. Define and publish an explicit artifact allowlist excluding test and state-mutating pages.
7. Document HTTP mode, `file://` degradation, remote assets, and optional translation egress.
8. Assign or retire the orphan `landing.html` role.

### M3: start and recovery

1. Diagnose project package schema, producer, version, manifest, and identity before restore.
2. Make per-project restore and autosave recovery behavior explicit and reachable.
3. Define reset scope and stale-state handling.
4. Report localStorage quota and save failures.
5. Do not call import restart a checkpoint resume.

### M4: Reviewer Bundle contract

1. Freeze Seed/Decision bundle types, schema compatibility, reviewer assignment, and project identity.
2. Add record count, source-manifest hash, decisions hash, producer, and producer version.
3. Reject wrong, duplicate, missing, added, stale, and hash-mismatched bundle content with diagnostics.
4. Add persisted fixtures for Seed A/B -> Decisions A/B -> merge -> resolver -> export -> replay counts.

### M5: Methods and evidence

1. Separate implemented evidence from planned validation.
2. Define export package integrity and hash limitations.
3. Document local-data, remote-asset, translation, and AI boundaries.
4. Validate AI suggestion-to-human-decision provenance in exports.
5. Avoid claiming submission, defense, PRISMA, or audit readiness as certification.

### M7: schema, checkpoint, and replay

1. Separate Project Schema Version, Project State Version, application release, module schemas, history, and Export Snapshot.
2. Define compatibility and migration policy.
3. Replace recursively nested history with bounded hash-verifiable checkpoints/events.
4. Define authoritative persistence and recovery precedence.
5. Version ImportJob/checkpoint and prove actual continuation.
6. Bind replayed counts and export artifacts to an explicit snapshot.

## Confirmed non-findings and limitations

- No confirmed missing explicit local target was found in the audited public route scope.
- No real backend login, WebSocket, EventSource, or server synchronization request was found in the current dual-review entry.
- No exact public `official PRISMA`, `PRISMA-certified`, `fully validated`, or `zero missed studies` phrase was found.
- Current AI UI behavior does not autonomously create final include/exclude decisions from generated suggestions.
- The dedup benchmark and 30,000-record performance claims were not rerun as part of this M0 document audit.
- Remote URL reachability, deployed content, HTTP redirect status, Pages source settings, Vercel project settings, accessibility, SEO rendering, and interactive browser behavior were not verified.
- Historical and test pages are classified as potentially public because repository-root static publishing can include them; actual host exposure was not asserted.
- Runtime findings are source-level contract observations, not evidence of data corruption in an existing user project.

## M0 verification baseline

Verification was run on 2026-07-13 in the M0 worktree based on `ddc37a1`:

```powershell
node --test tests/audit/audit-workflow.test.mjs
# 44 tests, 44 passed, 0 failed, 399.0131 ms

node tests/run-all-regressions.js
# 224 tests, 224 passed, 0 failed, 3764.7986 ms

git diff --check
# Passed with no whitespace errors. Git emitted only an LF-to-CRLF working-copy warning for docs/plans/PENDING_DECISIONS.md.
```

## M0 exit assessment

- Public pages, README, routes, risk terms, and runtime formats are recorded with source references.
- M1/M3/M4/M5/M7 follow-up is separated from current facts.
- Core product logic, schemas, and routes remain unchanged.
- Brand, route, deployment, schema, migration, hash, persistence, and Methods choices remain explicit decisions rather than implicit implementation choices.
- Local verification must pass before this M0 audit is committed.
