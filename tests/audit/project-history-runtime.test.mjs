import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const ProjectHistoryEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/project-history-engine.js'));

function extractFunctionBlock(source, functionName, { optional = false } = {}) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start === -1) {
    if (optional) return '';
    throw new Error(`Function not found: ${functionName}`);
  }

  let parenDepth = 0;
  let signatureEnd = start;
  for (; signatureEnd < source.length; signatureEnd += 1) {
    const char = source[signatureEnd];
    if (char === '(') parenDepth += 1;
    if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnd += 1;
        break;
      }
    }
  }

  const braceStart = source.indexOf('{', signatureEnd);
  let depth = 0;
  let index = braceStart;
  let quote = '';
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inTemplate = false;

  for (; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) quote = '';
      continue;
    }

    if (inTemplate) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '`') inTemplate = false;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '`') {
      inTemplate = true;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }
    }
  }

  return source.slice(start, index);
}

async function loadHistoryRuntimeHarness(overrides = {}) {
  const source = await fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
  const code = [
    `
const PROJECT_HISTORY_ENGINE = globalThis.ProjectHistoryEngine;
const APP_RELEASE_VERSION = '2.5-dual-review-release';
const WORKFLOW_STEP_COUNT = 6;
const DEFAULT_EXCLUSION_REASONS = ['population', 'intervention'];
let uploadedData = [];
let uploadedFiles = [];
let screeningResults = null;
let columnMapping = {};
let fileFormat = 'unknown';
let formatSource = 'Unknown';
let currentStep = 1;
let filterRules = null;
let exclusionReasons = [...DEFAULT_EXCLUSION_REASONS];
let qualityAssessments = [];
let importJobs = [];
let projectManifest = null;
let auditEvents = [];
let screeningDecisions = [];
let aiSuggestionEvents = [];
let projectHistory = [];
let dualReviewResults = { A: {}, B: {}, final: {} };
let dualReviewConflictState = getEmptyDualReviewConflictState();
let currentProjectId = 'project-history-runtime';
let currentUserSession = null;
let projectData = null;
let runtimeSession = null;
let isDualReviewMode = false;
let currentReviewer = 'A';
let persistedSnapshots = [];
let toastLog = [];
let confirmLog = [];
const localStorage = {
  store: new Map(),
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
  setItem(key, value) { this.store.set(key, String(value)); },
  removeItem(key) { this.store.delete(key); },
};
const document = {
  getElementById() {
    return {
      classList: { add() {}, remove() {} },
      textContent: '',
      value: '',
      scrollIntoView() {},
    };
  },
};
function setTimeout(fn) { fn(); return 0; }
function getEmptyDualReviewConflictState() {
  return { screeningPairs: [], screeningConflicts: [], qualityConflicts: [], agreementMetrics: null, exportGate: null };
}
function ensureProjectManifest() {
  projectManifest = projectManifest || { projectId: currentProjectId, appVersion: 'v2.5' };
  return projectManifest;
}
function ensureDefaultAiUsageRegistry() {}
function renderExclusionTemplateButtons() {}
function renderExclusionTemplateEditor() {}
function renderImportJobShell() {}
function renderQualityAssessmentShell() {}
function renderAiProviderConfigPanel() {}
function renderAiSuggestionPanel() {}
function renderProjectHistoryPanel() {}
function renderSourceFileHistoryPanel() {}
function updateStep4EntryLock() {}
function normalizeQualityAssessmentsState(value) { return Array.isArray(value) ? value : []; }
function normalizeImportJobsState(value) { return Array.isArray(value) ? value : []; }
function updateProjectManifestSafe(patch = {}) { projectManifest = { ...(projectManifest || {}), ...patch }; return projectManifest; }
function appendAuditEventsSafe(events) { auditEvents = auditEvents.concat(Array.isArray(events) ? events : [events]); return auditEvents; }
function persistCurrentProjectState() { persistedSnapshots.push({ projectHistory: projectHistory.slice(), uploadedData: uploadedData.slice() }); }
function refreshDualReviewConflictState() {}
function performScreening(records) { return { counts: { screened: records.length }, included: records, excluded: [] }; }
function detectColumns() {}
function displayUploadInfo() {}
function displayResults() {}
function displayFulltextReviewUI() {}
function prepareQualityAssessmentShell() {}
function syncFormToYAML() {}
function displayRulesPreview() {}
function setStep(step) { currentStep = step; }
function setFormRules(rules) { filterRules = rules; }
function showToast(message, type) { toastLog.push({ message, type }); }
function confirm(message) { confirmLog.push(message); return true; }
`,
    extractFunctionBlock(source, 'getRecordAuditId'),
    extractFunctionBlock(source, 'ensureStableRecordAuditIds', { optional: true }),
    extractFunctionBlock(source, 'buildCurrentProjectHistoryState'),
    extractFunctionBlock(source, 'createProjectHistorySnapshot'),
    extractFunctionBlock(source, 'startNewProjectSession'),
    extractFunctionBlock(source, 'restoreProjectState'),
    extractFunctionBlock(source, 'restoreProjectHistorySnapshot'),
    extractFunctionBlock(source, 'removeSourceFileFromProject'),
    extractFunctionBlock(source, 'cloneSampleRecords'),
    extractFunctionBlock(source, 'applySampleDataPayload'),
    `
function setState(patch = {}) {
  Object.assign(globalThis.__state, patch);
  if ('uploadedData' in patch) uploadedData = patch.uploadedData;
  if ('uploadedFiles' in patch) uploadedFiles = patch.uploadedFiles;
  if ('screeningResults' in patch) screeningResults = patch.screeningResults;
  if ('columnMapping' in patch) columnMapping = patch.columnMapping;
  if ('fileFormat' in patch) fileFormat = patch.fileFormat;
  if ('formatSource' in patch) formatSource = patch.formatSource;
  if ('currentStep' in patch) currentStep = patch.currentStep;
  if ('filterRules' in patch) filterRules = patch.filterRules;
  if ('qualityAssessments' in patch) qualityAssessments = patch.qualityAssessments;
  if ('importJobs' in patch) importJobs = patch.importJobs;
  if ('projectManifest' in patch) projectManifest = patch.projectManifest;
  if ('auditEvents' in patch) auditEvents = patch.auditEvents;
  if ('screeningDecisions' in patch) screeningDecisions = patch.screeningDecisions;
  if ('aiSuggestionEvents' in patch) aiSuggestionEvents = patch.aiSuggestionEvents;
  if ('projectHistory' in patch) projectHistory = patch.projectHistory;
  if ('dualReviewResults' in patch) dualReviewResults = patch.dualReviewResults;
  if ('dualReviewConflictState' in patch) dualReviewConflictState = patch.dualReviewConflictState;
  if ('currentProjectId' in patch) currentProjectId = patch.currentProjectId;
}
function getState() {
  return {
    uploadedData,
    uploadedFiles,
    screeningResults,
    currentStep,
    qualityAssessments,
    importJobs,
    auditEvents,
    screeningDecisions,
    aiSuggestionEvents,
    projectHistory,
    dualReviewResults,
    dualReviewConflictState,
    persistedSnapshots,
    toastLog,
    confirmLog,
  };
}
globalThis.__state = {};
this.__exports = {
  setState,
  getState,
  getRecordAuditId,
  createProjectHistorySnapshot,
  startNewProjectSession,
  restoreProjectHistorySnapshot,
  removeSourceFileFromProject,
  applySampleDataPayload,
};
`,
  ].join('\n');

  const context = {
    ProjectHistoryEngine,
    console,
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

test('starting an import session can preserve the before-import snapshot', async () => {
  const harness = await loadHistoryRuntimeHarness();
  harness.setState({
    uploadedData: [{ title: 'Existing study' }],
    uploadedFiles: [{ name: 'existing.csv', recordCount: 1 }],
    currentStep: 4,
  });
  harness.createProjectHistorySnapshot('before_import', 'Before import', {
    snapshotId: 'snapshot-before-import',
    createdAt: '2026-06-03T00:00:00.000Z',
  });
  const preservedHistory = harness.getState().projectHistory.slice();

  harness.startNewProjectSession({ projectHistory: preservedHistory });

  assert.equal(harness.getState().projectHistory.length, 1);
  assert.equal(harness.getState().projectHistory[0].snapshot_id, 'snapshot-before-import');
  assert.deepEqual(harness.getState().projectHistory[0].state.uploadedData, [{ title: 'Existing study' }]);
});

test('restoring a snapshot preserves the current rollback timeline', async () => {
  const harness = await loadHistoryRuntimeHarness();
  const olderSnapshot = {
    snapshot_id: 'snapshot-older',
    reason: 'screening_rerun',
    label: 'Older state',
    step: 3,
    record_count: 1,
    state: {
      uploadedData: [{ title: 'Older record' }],
      uploadedFiles: [{ name: 'older.csv', recordCount: 1 }],
      currentStep: 3,
      projectHistory: [{ snapshot_id: 'snapshot-older' }],
    },
  };
  const newerSnapshot = {
    snapshot_id: 'snapshot-newer',
    reason: 'quality_saved',
    label: 'Newer state',
    step: 5,
    record_count: 2,
    state: {
      uploadedData: [{ title: 'Newer record' }],
      uploadedFiles: [{ name: 'newer.csv', recordCount: 1 }],
      currentStep: 5,
      projectHistory: [{ snapshot_id: 'snapshot-newer' }, { snapshot_id: 'snapshot-older' }],
    },
  };
  harness.setState({ projectHistory: [newerSnapshot, olderSnapshot] });

  harness.restoreProjectHistorySnapshot('snapshot-older');

  const state = harness.getState();
  assert.deepEqual(state.uploadedData, [{ title: 'Older record' }]);
  assert.deepEqual(state.projectHistory.map((snapshot) => snapshot.snapshot_id), ['snapshot-newer', 'snapshot-older']);
  assert.equal(state.auditEvents.at(-1).eventType, 'project_snapshot_restored');
});

test('removing a source file keeps linked state for index-fallback records that remain', async () => {
  const harness = await loadHistoryRuntimeHarness();
  harness.setState({
    uploadedFiles: [
      { name: 'remove.csv', recordCount: 1 },
      { name: 'keep.csv', recordCount: 1 },
    ],
    uploadedData: [
      { _sourceFile: 'remove.csv' },
      { _sourceFile: 'keep.csv' },
    ],
    screeningDecisions: [{ recordId: 'record-2', decision: 'include' }],
    aiSuggestionEvents: [{ recordId: 'record-2', suggestionId: 'suggestion-1' }],
    qualityAssessments: [{ record_id: 'record-2', status: 'complete' }],
    currentStep: 4,
  });

  harness.removeSourceFileFromProject('remove.csv');

  const state = harness.getState();
  assert.equal(state.uploadedData.length, 1);
  assert.equal(state.uploadedData[0]._sourceFile, 'keep.csv');
  assert.equal(harness.getRecordAuditId(state.uploadedData[0], 0), 'record-2');
  assert.deepEqual(state.screeningDecisions, [{ recordId: 'record-2', decision: 'include' }]);
  assert.deepEqual(state.aiSuggestionEvents, [{ recordId: 'record-2', suggestionId: 'suggestion-1' }]);
  assert.deepEqual(state.qualityAssessments, [{ record_id: 'record-2', status: 'complete' }]);
});

test('sample data records carry source file metadata for removal', async () => {
  const harness = await loadHistoryRuntimeHarness();

  harness.applySampleDataPayload({
    source: 'built_in_sample',
    data: [
      { title: 'Sample A' },
      { title: 'Sample B' },
    ],
  });

  const state = harness.getState();
  assert.equal(state.uploadedFiles[0].name, '内置示例数据.json');
  assert.equal(state.uploadedData.length, 2);
  assert.deepEqual(state.uploadedData.map((record) => record._sourceFile), [
    '内置示例数据.json',
    '内置示例数据.json',
  ]);
  assert.deepEqual(state.uploadedData.map((record) => record._source), [
    '系统内置',
    '系统内置',
  ]);

  harness.removeSourceFileFromProject('内置示例数据.json');

  assert.equal(harness.getState().uploadedData.length, 0);
  assert.equal(harness.getState().currentStep, 1);
});
