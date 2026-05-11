# V2.4 Item-Level Quality Forms Closeout

Date: 2026-05-11

## Product decision

V2.4 should include reviewer-editable item-level quality forms before moving to V2.5.

Reasoning:

- From a reviewer perspective, `quality_appraisal.csv` is only credible if the reviewer can directly edit each domain judgement, supporting quote/page number, reviewer note, overall judgement, status, and assessment notes.
- This completes the V2.4 promise of quality appraisal structure and evidence table formalization without starting the V2.5 dual-review scope.
- It keeps the quality module local-first and human-controlled. The form does not call a real AI provider and does not store or export API keys.

## Implementation scope

- Add a Step 5 item-level editor inside each quality assessment card.
- Keep the editor single-review only.
- Save edits into `qualityAssessments`.
- Persist local project state after save.
- Append a human-sourced `quality_appraisal_updated` audit event with before/after snapshots.
- Ensure `quality_appraisal.csv` reflects the saved human-entered item-level fields.
- Keep `quality_appraisal.csv`, `evidence_table.csv`, and `grade_summary.csv` outside the frozen V2.3 audit export package.

## Chinese UX copy

Use concise reviewer-facing Chinese labels:

- `填写领域判断与引用证据`
- `领域判断`
- `支持性原文 / 页码`
- `审稿备注`
- `总体判断`
- `评价状态`
- `评价备注`
- `保存质量评价`

Avoid implying automatic quality grading. The copy should make it clear that saved values are human-entered and traceable.

## V2.5 handoff

V2.5 should focus on formal dual-review workflow:

- reviewer isolation
- conflict queue
- resolver workflow
- agreement metrics
- unresolved-conflict export gates

Final GRADE certainty and downgrade reasons should stay human-controlled.
