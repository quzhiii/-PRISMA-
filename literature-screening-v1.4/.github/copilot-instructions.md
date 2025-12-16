# Literature Screening Tool - AI Coding Guide

## Project Overview

**Purpose:** Automated literature screening system with PRISMA 2020 flow diagram generation + v3.0 manual fulltext review

**Tech Stack:** Vanilla JavaScript (ES6), HTML5, CSS3 (CSS Variables, Grid/Flex layout), YAML parsing (js-yaml library)

**Architecture:** 4-step wizard SPA with multi-file upload support

---

## System Architecture (v3.0)

### Core Data Flow

```
Multi-File Upload → Format Detection + Parsing → Cross-Source Deduplication
    ↓
Column Detection & Mapping → Rule Application → Language Detection
    ↓
Stage 1: Title/Abstract Screening → Stage 2: Fulltext Manual Review
    ↓
Exclusion Reason Tracking → Results Aggregation
    ↓
SVG Generation (3 themes) + Detailed Excel Export with Reasoning
```

### Global State Management

```javascript
uploadedData[]          // Parsed records with all fields
uploadedFiles[]         // v3.0: Track each file source
screeningResults {}     // { counts, sourceDistribution, included, excluded, duplicates, rules }
exclusionReasons {}     // v3.0: Collected from Step 4 manual review
columnMapping {}        // {title: 'T1', abstract: 'AB', ...}
currentTheme            // 'colorful' | 'blackwhite' | 'subtle'
currentStep             // 1 | 2 | 3 | 4 (v3.0: New step)
```

### Enhanced File Parser Architecture

**Multi-File Processing:** `handleMultipleFiles()` → Sequential parsing with progress tracking

**Unified Parser:** `parseFileContent(text, ext)` → Route to format-specific parser  
**Result:** All records tagged with `_source` and `_sourceFile` for PRISMA identification accuracy

**Implemented Parsers:**
- **CSV/TSV:** Comma/tab-delimited with header detection
- **RIS:** Endnote/Zotero/Mendeley format
- **BibTeX:** RegExp-based entry extraction
- **ENW:** CNKI format (identical structure to RIS)
- **RDF:** Zotero XML/RDF (DOMParser + element traversal)
- **TXT:** Line-by-line fallback

---

## v3.0 Major Features

### Feature 1: Multi-File Upload with Cross-Source Deduplication

**`handleMultipleFiles(files)`** - Process multiple files sequentially:
- Detects encoding automatically
- Identifies data source (PubMed, CNKI, Zotero, etc.)
- Marks records with `_source` field
- Deduplicates across sources using DOI + normalized title matching

**Cross-source intelligence:**
```javascript
- DOI exact match (highest priority)
- Normalized title Jaccard similarity
- Returns: sourceDistribution { 'PubMed': 1000, 'CNKI': 500, ... }
```

### Feature 2: Step 4 Manual Fulltext Review

**Workflow:**
1. Display all records passing title/abstract screening
2. User reviews fulltext and selects exclusion reason (or keeps)
3. System tracks per-record exclusion metadata

**`displayFulltextReviewUI()`** - Creates interactive review table:
```html
序号 | 标题 | 摘要 | [下拉菜单选择排除原因] | [查看全文按钮]
```

**Exclusion reasons:**
- 人群不符 (Population mismatch)
- 干预不符 (Intervention mismatch)
- 对照不符 (Control mismatch)
- 缺乏结局 (Insufficient outcomes)
- 数据不完整 (Incomplete data)

### Feature 3: Real Exclusion Statistics

**`updateExclusionStats()`** - Live calculation:
- Tracks count per exclusion reason
- Calculates exclusion rate: (excluded_ft / fulltext) * 100%
- Updates PRISMA diagram with breakdown

**PRISMA diagram enhancement:**
- SVG now shows detailed reason counts
- Example: "• 人群不符: 10篇 (13%)"

### Feature 4: Accurate Source Distribution

**`sourceDistribution` in results** - Based on actual uploaded files:
```javascript
{
  'PubMed': 1000,
  'CNKI': 500,
  'Gray Literature': 50
}
```

Used to calculate true `identified_db` vs `identified_other` counts (not estimated)

---

## Critical Developer Workflows

### Adding New File Format Support (v3.0)

1. Create unified parser function `parseXXXContent(text)`:
   ```javascript
   function parseXXXContent(text) {
     const records = [];
     // Parse text into records
     return records; // Return empty if parse fails
   }
   ```

2. Update `parseFileContent()` dispatcher

3. Update file extension validation in `handleMultipleFiles()`

4. Add format badge in HTML Step 1

### Implementing Cross-Source Deduplication

Key logic in `performScreening()`:
```javascript
const doiMap = {};
normalized.forEach(row => {
  const doi = getValue(row, 'doi');
  if (doi && doi.trim()) {
    const doiKey = `doi:${doi.toLowerCase().trim()}`;
    if (doiMap[doiKey]) {
      duplicates.push(row); // Duplicate from another source
      return;
    }
    doiMap[doiKey] = true;
  }
  // Fallback to title matching...
});
```

### Implementing Fulltext Review Flow

1. **Display step 4:** `goToStep4()` → `displayFulltextReviewUI()`
2. **Track selections:** `updateExclusionStats()` queries all select elements
3. **Finalize:** `finalizeFulltextReview()` → moves records to excluded/included
4. **Return to step 3:** Generate final PRISMA with real data

---

## Integration Points & Data Structures

### Screening Results (Enhanced v3.0)

```javascript
{
  counts: {
    identified_db, identified_other, duplicates, after_dupes,
    screened, excluded_ta, fulltext, excluded_ft, included
  },
  sourceDistribution: { 'PubMed': N, 'CNKI': M, ... },
  included: record[],
  excluded: record[] + { _exclude_stage: 'title/abstract' | 'fulltext', _exclude_reason }
  duplicates: record[],
  rules: {}
}
```

### Record Structure

```javascript
{
  // Standard fields
  title, abstract, year, journal, authors, doi, keywords, ...
  
  // v3.0 System fields
  _source: 'PubMed' | 'CNKI' | 'Zotero' | ...,
  _sourceFile: 'filename.ris',
  _normalized_title: 'normalized version',
  _lang: 'chinese' | 'english',
  _exclude_stage: 'title/abstract' | 'fulltext',
  _exclude_reason: 'Exact reason string'
}
```

---

## Common Maintenance Tasks

### Debugging Multi-File Upload

- Check `uploadedFilesInfo` array for parse errors
- Verify format detection in file extension validation
- Test with mixed format uploads (e.g., RIS + CSV + ENW)

### Updating Exclusion Reasons

Modify Step 4 button templates in `index.html`:
```html
<button onclick="addExclusionReason('新理由', '说明')">+ 新理由</button>
```

Also update dropdown options in `displayFulltextReviewUI()` select element

### Fixing PRISMA Diagram Display

- SVG Y-coordinates hardcoded in `generatePRISMASVG()`
- Adjust if adding/removing diagram sections
- Update `height` parameter if diagram extends beyond current 1200px

### Source Tracking Issues

- All parsed records must have `_source` field set
- Verify in `handleMultipleFiles()` after parsing
- Used in `displayUploadInfo()` to show file sources
- Used in PRISMA counts calculation (if null, defaults to 'Unknown')

---

## Performance Considerations

- **Deduplication:** O(n) with Set/Map for DOI matching
- **Multi-file:** Sequential processing avoids browser freeze
- **Fulltext table:** Pre-renders all rows (suitable for < 5000 records)
- **SVG generation:** String concatenation (faster than DOM)

---

## Version Context

**Current:** v3.0

**New in v3.0:**
- ✅ Multi-file upload support
- ✅ Cross-source intelligent deduplication  
- ✅ Step 4: Manual fulltext review
- ✅ Detailed exclusion reason tracking
- ✅ Real source distribution statistics
- ✅ Enhanced PRISMA diagram with reason breakdown

**Backward compatible:**
- ✅ All v2.2 single-file workflows still supported
- ✅ Existing rule formats accepted
- ✅ Theme system unchanged

