# PRISMA Literature Screening Assistant V2.0

English | [简体中文](./README.md)

A literature screening workspace for systematic reviews, meta-analyses, and evidence synthesis projects. `V2.0` now focuses on practical single-review workflows, dual-review collaboration, layered deduplication, rule-based screening, and PRISMA-ready export.

---

## 🆕 V2.0 Current Status (March 2026)

`V2.0` has now been added as the new-generation workspace under [literature-screening-v2.0/](./literature-screening-v2.0/).

### V2.0 Entry Points
- Homepage: `literature-screening-v2.0/index.html`
- Dual-review login: `literature-screening-v2.0/login.html`
- Main workspace: `literature-screening-v2.0/workspace.html`

### What Was Added and Completed in V2.0

#### 1. New landing and workspace entry structure
- Added a dedicated V2.0 homepage, login page, and workspace flow
- Split single-review and dual-review access paths more clearly for real research workflows
- Updated the homepage positioning to highlight large-scale processing, methodological rigor, dual review, and submission-ready export

#### 2. Deduplication and screening flow aligned with real research use
- Added `dedup-engine.js` as a standalone deduplication engine
- Supports both “hard duplicate removal” and “possible duplicates for manual review”
- Deduplication behavior is now closer to practical review workflows, with stronger emphasis on objectivity, explainability, and human verification

#### 3. Upload and display pipeline fixes in V2.0
- Fixed the issue where uploads succeeded but loaded content did not appear on the page
- Fixed sample import not advancing to the next step automatically
- Fixed real-file upload cases where scrolling and content visibility broke after loading
- Fixed malformed structural tags in `workspace.html` that caused hidden or misplaced content

#### 4. Dual-review workflow stability fixes
- Fixed collaborative initialization and local session conflicts in dual-review mode
- Prevented reviewer B from overwriting an existing shared project with empty local state
- Fixed logout cleanup for collaboration listeners and polling intervals
- Fixed the English homepage dual-review entry so it now routes to the English login page correctly

#### 5. Bilingual routing and visibility fixes
- Homepage route cards and preview windows now follow the active language
- Fixed mixed Chinese/English content showing on the English dual-review login page
- Root cause was CSS overriding the `hidden` attribute; this is now corrected globally

### Current Positioning of V2.0
- `V2.0` is the current practical workspace version intended for real use
- Older `v1.7` and earlier notes are still preserved as historical version records
- Future README updates will use `V2.0` as the main line, without removing earlier version history

---

## Verified v1.7.x Fixes (March 2026)

### 1. PubMed `.nbib` import is now fully wired
- Upload accept list includes `.nbib`
- Main-thread and worker parsing paths both recognize `.nbib`
- PubMed exports can now enter the same screening pipeline as RIS imports

### 2. Single / dual review mode gating is fixed
- The app now reads `prisma_user_session` from `sessionStorage`
- Runtime mode correctly resolves to:
  - `single`
  - `dual-main`
  - `dual-secondary`
- Collaboration-only actions are gated by reviewer role

### 3. Post-dedup progression no longer gets stuck
- Step 2 / Step 4 integration in `v1.7-core-patch.js` was hardened
- Dedup detail viewing and dedup-only CSV export remain available
- Verified browser flow now reaches manual full-text review (Step 4)

### 4. Regression status
- `node tests/run-all-regressions.js` → **5/5 PASS**
- Browser verification covered:
  - `.nbib` upload and preview
  - Step 1 → Step 4 progression
  - runtime mode detection and session wiring

---

## Core Features

### v1.6 Engineering Enhancement
- ⚡ **Enhanced Progress Visualization**: Real-time ETA estimation (remaining time), parsing/writing speed display, pause/resume buttons
- 🛡️ **Import Fault Tolerance**: Detailed error reports (filename + line number + error type), success rate statistics, skip problematic records and continue importing
- 🔍 **Explainable Deduplication Strategy**: Display DOI priority and title normalization rules, deduplication statistics, export detailed deduplication reports

### v1.5 Major Upgrade (Large-scale Processing)
- **IndexedDB Data Layer**: Supports 30,000+ literature storage, breaking localStorage limitations
- **Web Worker Parallel Processing**: File parsing and deduplication run in background threads, main thread remains responsive
- **Virtual Scrolling List**: Only renders visible 100 records, reducing memory usage by 50%
- **Streaming Progress Reporting**: Real-time progress bar during import and parsing
- **Paginated Query API**: Load data on demand, smooth scrolling at 60fps
- **Transaction Safety**: IndexedDB transactions ensure no data loss
- 🚀 **Smart Auto-batching**: Single file import supports 30,000+ articles, system automatically writes in batches of 5,000 to IndexedDB (4 core mechanisms)
  - **Stream Parsing**: Large files read in chunks, avoiding memory overflow
  - **Checkpoint Mechanism**: Create checkpoints every 1,000 records, recoverable on failure
  - **Queue Backpressure Control**: Automatically adjusts parsing and import speed, preventing browser freeze
  - **Resume from Breakpoint**: Continue unfinished imports after page refresh

### v1.4 Core Features
- **Custom Exclusion Reason Templates**: Project-level exclusion reason customization, different projects independent
- **Keyboard Shortcuts**: First 6 exclusion reasons can use number keys 1-6 for quick selection
- **Manual Review Draft Persistence**: Review progress auto-saved to localStorage, survives page refresh
- **Rule Re-run Mechanism**: Step 3 supports "Modify Rules and Re-run" button, resets manual review data after confirmation
- **PRISMA 2020 Standard Flow Diagram**: Supports both simplified and PRISMA 2020 standard export modes
- **Rule Overview Display**: Results page shows all applied screening rules for audit and reporting
- **Step 5 Final Results Page**: Independent final results page after manual review completion

### v1.3 Core Features
- **Multi-file Upload**: Simultaneously upload multiple library files (PubMed + CNKI + Zotero)
- **Cross-library Smart Deduplication**: Cross-source deduplication based on DOI and title similarity
- **Source Tracking**: Each record tagged with source, PRISMA diagram shows true source distribution
- **Step 4 Manual Full-text Review**: New independent full-text review step
- **Exclusion Reason Statistics**: Detailed tracking of literature count for each exclusion reason

### v1.2 Core Features
- **YAML Rule Configuration**: Import/export screening rules as YAML files
- **Rule Preview**: Real-time preview of rule application effects
- **Excel Detailed Report**: Export complete Excel spreadsheet with exclusion reasons

### v1.1 Core Features
- **Dual Review Collaboration**: Support multiple reviewers' independent assessments
- **Cohen's Kappa Analysis**: Calculate inter-rater agreement coefficient
- **Conflict Resolution**: Automatically identify inconsistent assessment results

### Multi-format Support
- **CSV/TSV**: Comma/tab-separated formats
- **RIS/NBIB/ENW**: Endnote/Zotero/Mendeley/PubMed export formats
- **BibTeX**: LaTeX bibliography management format
- **RDF**: Zotero RDF/XML format
- **TXT**: Plain text line-by-line parsing
- **Multi-source Upload**: Upload multiple files simultaneously with automatic cross-library deduplication

### Smart Screening
- **Rule-based Automatic Screening**:
  - Language filtering (Chinese/English)
  - Year range filtering
  - Keyword inclusion/exclusion (supports OR logic)
  - Journal inclusion/exclusion
  - Title inclusion/exclusion
  - Author inclusion/exclusion
- **Manual Full-text Review**: Enter manual review stage after title/abstract screening
- **Exclusion Reason Tracking**: Detailed exclusion reason and stage for each article
- **Smart Deduplication**: Cross-library deduplication algorithm based on DOI + normalized title

### Visual Output
- **PRISMA 2020 Flow Diagram**: International standard-compliant SVG flow diagram
- **Three Theme Styles**: Colorful, black-and-white, and subtle color schemes
- **Detailed Statistics**: Literature count at each stage, source distribution, exclusion reason analysis
- **Excel Detailed Report**: Complete report with all literature information and exclusion reasons

## Quick Start

### Online Use
Visit [GitHub Pages](https://quzhiii.github.io/-PRISMA-/) to use directly, no installation required.

### Local Deployment
```bash
# Clone the project
git clone https://github.com/quzhiii/-PRISMA-.git
cd -PRISMA-

# Start local server (choose one)
python -m http.server 5175
# or
npx serve
```

Then visit `http://localhost:5175` in your browser

## User Guide

### Basic Workflow
1. **Step 1: Upload Literature Files**
   - Support single/multiple file uploads
   - Automatic format recognition and parsing
   - Display source distribution statistics

2. **Step 2: Configure Screening Rules**
   - Set language, year, keyword filtering conditions
   - Save as YAML configuration file (reusable)
   - Real-time preview of rule effects

3. **Step 3: Automatic Screening**
   - Apply rules for smart deduplication
   - Title/abstract automatic screening
   - Generate preliminary screening results

4. **Step 4: Manual Review**
   - Review each article that passed automatic screening
   - Select exclusion reason or retain
   - Use keyboard shortcuts 1-6 for quick operations
   - Support viewing external full-text links

5. **Step 5: Export Results**
   - Generate PRISMA flow diagram (SVG)
   - Export detailed Excel report
   - View complete screening statistics

### v1.6 Engineering Enhancement Guide
- ⚡ **Progress Visualization**: View remaining time, parsing speed, writing speed during import - know exactly what to expect with large files
- ⏸️ **Pause/Resume**: Pause import anytime, view other content, then continue
- 🛡️ **Fault-tolerant Import**: Even with format errors in files, skip problematic records and continue importing, view detailed error report at the end
- 🔍 **Transparent Deduplication**: Click "View Deduplication Strategy" to understand DOI and title deduplication rules, export deduplication details for audit
- 📊 **Error Report**: After import completion, view which records failed, specific reasons, failure locations - convenient for fixing source files

### v1.5 Usage Recommendations
- 💡 **Single File Import**: Support importing 30,000+ articles, system automatically writes in batches of 5,000 to IndexedDB (no manual batching needed)
- ⚠️ **Browser Performance**: If browser lags during import, recommend splitting large files into smaller ones (e.g., 10,000 per file)
- 🔄 **Resume from Breakpoint**: If page refreshed during import, can continue from last interruption point (valid for 1 hour)
- 🔍 **Precise Rules**: Configure rules as precisely as possible in Step 2 to reduce manual review workload
- 📜 **Virtual Scrolling**: List only renders visible area, smooth scrolling without lag
- ⚡ **Background Processing**: Parsing and deduplication execute in Web Worker, don't block interface
- 💾 **Local Storage**: All data stored in browser IndexedDB, no server required

### Advanced Features
- **YAML Configuration Import/Export**: Save screening rules as `.yaml` files, share between projects
- **Rule Re-run Mechanism**: Re-screen after modifying rules, automatically clean old manual review data
- **Detailed Tracking**: Excel export includes exclusion stage and reason for each article
- **Theme Switching**: Support colorful/black-and-white/subtle three PRISMA diagram styles

## Performance Benchmark (v1.6)
| Operation         | Data Size | Time      | Notes                   |
|-------------------|-----------|-----------|-------------------------|
| Generate test data| 30,000    | ~0.01s    | JavaScript array generation |
| Import IndexedDB  | 30,000    | ~3-5s     | Batch insert, 500/batch |
| Paginated query   | 100       | ~213ms    | Index query, close to 200ms |
| Virtual scroll render | 30,000 | ~16ms/frame | Maintain 60fps smoothness |
| Error tracking    | Real-time | ~0ms      | Doesn't affect import performance |
| Progress ETA calculation | Real-time | ~1ms | Based on completion percentage |

## Notes
- **Browser Compatibility**: Requires IndexedDB and Web Worker support (Chrome 60+, Firefox 55+)
- **Performance Recommendation**: Single file can import 30,000+ articles, but if browser lags, recommend splitting into files of 10,000 each
- **Local Storage**: Data stored locally in browser, clearing cache will lose data
- **Manual Review**: After rule modification and re-run, manual review progress will reset
- **Resume from Breakpoint**: Import progress saved for 1 hour, needs re-import after timeout
- **Error Report**: v1.6 supports exporting errors and deduplication details for debugging and audit

## v1.6 New Features Explained

### 1. Enhanced Progress Visualization ⚡
**Problem**: When importing 30,000 articles, users didn't know how long to wait, causing anxiety.

**Solution**:
- Display remaining time in real-time (seconds/minutes/hours format)
- Show parsing speed and writing speed (records/second)
- Add pause/resume button, users can stop midway to view other content
- Smooth progress bar animation (0.3s transition)

**Use Case**: When importing 20,000 articles, see "Remaining 2min 30sec | Parsing: 450/sec | Writing: 380/sec"

### 2. Import Fault Tolerance 🛡️
**Problem**: If 1 record has format error in a file, entire file import fails.

**Solution**:
- errorTracker system collects all errors and warnings
- Detailed logging: filename, line number, error type, specific content
- Skip problematic records, continue importing other normal records
- Display success rate and error summary after import completion
- Support exporting error report as JSON

**Use Case**: Import 10,000 records, 50 with format issues, system displays "Success rate: 99.5% (9950/10000 records), 50 errors", click to view detailed error list.

### 3. Explainable Deduplication Strategy 🔍
**Problem**: Users don't understand why certain articles are judged as duplicates, lack of transparency.

**Solution**:
- Display deduplication strategy: DOI exact match → Title normalization match
- Title normalization rule explanation: Remove punctuation, spaces, convert to lowercase
- Record deduplication decision for each article (DOI duplicate/Title duplicate/Retained)
- Deduplication statistics: Deduplicated X articles via DOI, Y articles via title
- Export deduplication detail report (JSON format)

**Use Case**: Click "View Deduplication Strategy", see detailed rules and examples, understand why "The Effect of Acupuncture!" and "the effect of acupuncture" are judged as duplicates.

## Technical Architecture

### v1.6 Architecture
```
┌─────────────────┐
│   index.html    │  UI Layer: Step wizard + Virtual scroll list + Progress visualization
└────────┬────────┘
         │
┌────────▼────────┐
│     app.js      │  Business Logic Layer: Rule engine + Flow control + Fault tolerance system
│                 │  • progressTracker (Progress tracking)
│                 │  • errorTracker (Error tracking)
│                 │  • dedupExplanations (Deduplication explanation)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│ DB   │  │ Parser│  Web Worker Layer
│Worker│  │ Worker│  Background thread processing
└───┬──┘  └──┬────┘
    │        │
┌───▼────────▼────┐
│   IndexedDB     │  Data Layer: 30,000+ literature storage
└─────────────────┘
```

### Core Modules (v1.6 Enhancement)
- **db-worker.js**: IndexedDB CRUD encapsulation, supports batch insert, paginated query, transaction management
- **parser-worker.js**: 8 format parsers, DOI/title normalization, stream processing for large files
- **virtual-list.js**: Virtual scroll list component, only renders visible 100 records
- **app.js**: Main business logic, rule engine, PRISMA generation, Excel export
  - **progressTracker**: Real-time progress tracking (ETA estimation, speed statistics, pause/resume)
  - **errorTracker**: Error collection system (error/warning classification, success rate calculation, detailed report)
  - **dedupExplanations**: Deduplication decision recording (strategy tracking, statistical analysis, explainability)

### Key Technologies
- **IndexedDB**: Browser local database, supports GB-level data storage
- **Web Worker**: Multi-threaded architecture, avoids main thread blocking
- **Virtual Scrolling**: Paginated rendering technique, reduces memory usage
- **Stream Processing**: Parse and store simultaneously, avoids memory overflow
- **Fault Tolerance**: Skip error records and continue processing, detailed error tracking
- **Visualization Enhancement**: Real-time ETA calculation, speed monitoring, pause/resume control

## Contributing
Welcome to submit Issues and Pull Requests!

## License
MIT License
