# Demo Dataset Guide

This guide walks you through the PRISMA Workbench workflow using the public demo dataset.

## Quick Start

1. Open `workspace.html` in your browser
2. Click **「加载公开演示数据」** (Load Public Demo Dataset)
3. Follow the 6-step workflow below

## Dataset Overview

The demo dataset contains 22 records covering hypertension and Traditional Chinese Medicine research from 5 source databases:

| Source | Records | Purpose |
|---|---|---|
| CNKI | 10 | Normal records, noisy abstracts, truncated abstracts, legitimate fund wording |
| Wanfang | 3 | Fullwidth volume/issue notation, DOI mapping |
| VIP | 3 | Mixed headers, classification codes, missing abstracts |
| SinoMed | 3 | PMID mapping, partial source mapping, incomplete fields |
| PubMed | 3 | English systematic review, meta-analysis, review |

### Chinese-Source Reliability Signals

The dataset includes records that demonstrate source-quality warnings:

- **`abstract_noise_detected`**: CNKI record with metadata noise in abstract (基金：... 下载频次：...)
- **`abstract_truncation_suspected`**: Records with truncated abstracts (余略)
- **`source_mapping_incomplete`**: VIP record with missing abstract, SinoMed record with missing journal
- **Legitimate fund wording**: CNKI record where "基金：" is part of the actual research content, not metadata noise

### Dedup Demonstration

The dataset includes:
- 1 exact DOI duplicate (same DOI `10.1234/tcm.2023.001`)
- 1 title duplicate (similar title, slightly different content)

## Workflow Walkthrough

### Step 1: Import

After loading the demo data, you will see:
- 22 records imported
- Source distribution across 5 databases
- Import reliability warnings for records with quality signals

### Step 2: Configure Rules

Recommended demo configuration:

```yaml
time_window:
  start_year: 2019
  end_year: 2025
include_any:
  - 高血压
  - hypertension
exclude:
  - keyword: 动物实验
    reason: animal_study
  - keyword: animal study
    reason: animal_study
language:
  allow:
    - chinese
    - english
```

This configuration will:
- Keep records from 2019-2025
- Include records mentioning hypertension (Chinese or English)
- Exclude animal studies
- Filter by Chinese and English language

### Step 3: Screening Results

After screening, you will see:
- Records filtered by time window and keywords
- Excluded records with reasons (e.g., animal_study)
- Dedup results (1 DOI duplicate, 1 title candidate duplicate)
- PRISMA flow diagram with counts

### Step 4: Full-text Review

Review the retained records at full-text level:
- Use keyboard shortcuts (1-6) to quickly select exclusion reasons
- Use Space to mark as "keep"
- Navigate with arrow keys

### Step 5: Quality Assessment

For included studies:
- Click **「生成质量评价队列」** to seed quality assessments
- Review study design suggestions and tool family recommendations
- Fill in domain judgements and supporting quotes
- Save each assessment

### Step 6: Export

Export deliverables include:
- PRISMA SVG diagram
- Included/excluded study CSVs
- Quality appraisal CSV
- Evidence table CSV
- GRADE summary CSV
- **Defense-ready Audit Pack** (`DEFENSE_AUDIT_PACK.md`) - combines PRISMA counts, dual-review resolution, quality appraisal, source-reliability warnings, and AI boundary summary
- Dual-review conflict and agreement exports
- Full audit package (manifest, events, decisions, exclusion reasons, counts, summary)

## Testing Chinese-Source Reliability

To see the reliability warnings in action:

1. Load the demo data
2. Go to Step 1 and check the import summary
3. Records with `abstract_noise_detected` or `abstract_truncation_suspected` will show warnings
4. Export the Defense-ready Audit Pack to see the "Chinese-source Reliability Summary" section
5. The summary shows warnings by source database and by warning type

## Notes

- The demo dataset is designed for onboarding and workflow walkthrough, not benchmark certification
- All data is fictional and for demonstration purposes only
- The dataset is small enough to load quickly but large enough to demonstrate all major features
- No real AI provider is connected; AI features use local mock suggestions
