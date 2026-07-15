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

const AuditEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/audit-engine.js'));
const DualReviewEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/dual-review-engine.js'));
const ProjectHistoryEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/project-history-engine.js'));
const ProjectPackageEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/project-package-engine.js'));
const ReviewerBundleEngine = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.2/reviewer-bundle-engine.js'));

function extractFunctionBlock(source, functionName) {
  const marker = 'function ' + functionName + '(';
  const start = source.indexOf(marker);
  if (start === -1) throw new Error('Function not found: ' + functionName);

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

function createOwnerState() {
  const records = [
    { id: 'record-1', title: 'Trial Alpha', abstract: 'First included study', year: '2026' },
    { id: 'record-2', title: 'Trial Beta', abstract: 'Second included study', year: '2026' },
  ];
  return {
    currentProjectId: 'm4-ui-smoke-project',
    uploadedData: records,
    uploadedFiles: [{ name: 'source.ris', size: 1200, recordCount: records.length, source: 'source.ris' }],
    screeningResults: {
      included: records.map((record) => ({ ...record })),
      excluded: [],
      counts: { total: records.length, included: records.length, excluded: 0 },
    },
    columnMapping: { title: 'title', abstract: 'abstract' },
    fileFormat: 'ris',
    formatSource: 'RIS',
    currentStep: 4,
    filterRules: { includeKeywords: ['trial'] },
    projectManifest: {
      projectId: 'm4-ui-smoke-project',
      version: '2.5-dual-review-release',
      appVersion: 'v2.5',
      reviewMode: 'dual',
    },
    isDualReviewMode: true,
    currentReviewer: 'A',
  };
}

async function loadReviewerBundleRuntimeHarness() {
  const source = await fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
  const extractedFunctions = [
    'getAuditActorContext',
    'getRecordAuditId',
    'getAuditRecordIndexMap',
    'getFulltextSelectValueFromDecision',
    'getQualityReviewConflictInputs',
    'getFulltextReviewRecordsForConflictState',
    'refreshDualReviewConflictState',
    'persistAuditState',
    'appendAuditEventsSafe',
    'generateProjectId',
    'getProjectStorageKey',
    'ensureProjectId',
    'startNewProjectSession',
    'ensureProjectManifest',
    'buildCurrentProjectHistoryState',
    'getCurrentReviewerBundleProjectState',
    'downloadJsonBundle',
    'getReviewerBundleDateStamp',
    'getCurrentReviewerId',
    'getReviewerLabelForSlot',
    'exportCollaborationSeedPackage',
    'exportReviewerDecisionBundle',
    'importCollaborationSeedPackage',
    'renderProjectRecoveryDiagnosis',
    'createProjectHistorySnapshot',
    'restoreProjectState',
    'syncDualReviewResultsFromDecisions',
    'applyReviewerDecisionBundle',
  ].map((name) => extractFunctionBlock(source, name));

  const code = [
    `
const APP_RELEASE_VERSION = '2.5-dual-review-release';
const FEATURE_FLAGS = Object.freeze({ ENABLE_QUALITY_ASSESSMENT: true });
const WORKFLOW_STEP_COUNT = 6;
const DEFAULT_EXCLUSION_REASONS = ['population', 'intervention'];
const AUDIT_ENGINE = globalThis.AuditEngine;
const DUAL_REVIEW_ENGINE = globalThis.DualReviewEngine;
const PROJECT_HISTORY_ENGINE = globalThis.ProjectHistoryEngine;
const PROJECT_PACKAGE_ENGINE = globalThis.ProjectPackageEngine;
const REVIEWER_BUNDLE_ENGINE = globalThis.ReviewerBundleEngine;
const RUNTIME_MODE = { SINGLE: 'single', DUAL_MAIN: 'dual-main', DUAL_SECONDARY: 'dual-secondary' };
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
let appliedReviewerBundleIds = [];
let dualReviewConflictState = getEmptyDualReviewConflictState();
let currentProjectId = null;
let currentUserSession = null;
let projectData = null;
let runtimeMode = RUNTIME_MODE.SINGLE;
let runtimeSession = null;
let isDualReviewMode = false;
let currentReviewer = 'A';
let reviewerNames = { A: 'Reviewer A', B: 'Reviewer B' };
let pendingNewProjectSession = false;
let conservativeAiQueueFilter = 'all';
let currentConservativeAiQueueContext = null;
const toastLog = [];
const displayLog = [];
const localStorage = {
  store: new Map(),
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
  setItem(key, value) { this.store.set(key, String(value)); },
  removeItem(key) { this.store.delete(key); },
};
class Blob {
  constructor(parts = [], options = {}) {
    this.parts = parts.map((part) => String(part));
    this.type = options.type || '';
  }
}
const URL = {
  createObjectURL(blob) {
    const url = 'blob:runtime-' + (globalThis.__objectUrls.size + 1);
    globalThis.__objectUrls.set(url, blob);
    return url;
  },
  revokeObjectURL(url) { globalThis.__objectUrls.delete(url); },
};
class FileReader {
  readAsText(file) {
    if (this.onload) this.onload({ target: { result: String(file && file.text ? file.text : '') } });
  }
}
function makeElement(id) {
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    dataset: {},
    style: {},
    classList: { add() {}, remove() {} },
    scrollIntoView() {},
    click() {},
  };
}
const document = {
  body: { appendChild() {}, removeChild() {} },
  createElement(tag) {
    const element = makeElement(tag);
    if (tag === 'a') {
      element.click = function clickDownload() {
        const blob = globalThis.__objectUrls.get(this.href);
        globalThis.__downloads.push({ filename: this.download, text: blob ? blob.parts.join('') : '', type: blob ? blob.type : '' });
      };
    }
    if (tag === 'input') {
      element.click = function clickInput() {
        const file = globalThis.__queuedFiles.shift();
        if (this.onchange) this.onchange({ target: { files: file ? [file] : [] } });
      };
    }
    return element;
  },
  getElementById(id) {
    if (!globalThis.__elements.has(id)) globalThis.__elements.set(id, makeElement(id));
    return globalThis.__elements.get(id);
  },
  querySelectorAll() { return []; },
};
function getEmptyDualReviewConflictState() {
  return { screeningPairs: [], screeningConflicts: [], qualityConflicts: [], agreementMetrics: null, exportGate: null };
}
function setTimeout(fn) { fn(); return 0; }
function showToast(message, type) { toastLog.push({ message, type }); }
function reportProjectStorageFailure(error) { showToast(error && error.message ? error.message : 'storage failed', 'error'); }
function normalizeQualityAssessmentsState(value) { return Array.isArray(value) ? value : []; }
function normalizeImportJobsState(value) { return Array.isArray(value) ? value : []; }
function ensureDefaultAiUsageRegistry() {}
function renderExclusionTemplateButtons() {}
function renderExclusionTemplateEditor() {}
function renderImportJobShell() {}
function renderQualityAssessmentShell() {}
function renderAiProviderConfigPanel() {}
function renderAiSuggestionPanel() {}
function renderConservativeAiQueuePanel() {}
function renderConservativeAiStep4ContextBanner() {}
function renderProjectHistoryPanel() {}
function renderSourceFileHistoryPanel() {}
function updateStep4EntryLock() {}
function displayUploadInfo() { displayLog.push('upload-info'); }
function displayResults() { displayLog.push('results'); }
function displayFulltextReviewUI() { displayLog.push('fulltext'); }
function setStep(step) { currentStep = step; }
function setReviewMode(mode) {
  isDualReviewMode = mode === 'dual';
  runtimeMode = isDualReviewMode ? RUNTIME_MODE.DUAL_MAIN : RUNTIME_MODE.SINGLE;
}
function persistCurrentProjectState() {
  globalThis.__persisted.push(JSON.parse(JSON.stringify(buildCurrentProjectHistoryState())));
  return true;
}
`,
    ...extractedFunctions,
    `
function setState(patch = {}) {
  if ('uploadedData' in patch) uploadedData = patch.uploadedData;
  if ('uploadedFiles' in patch) uploadedFiles = patch.uploadedFiles;
  if ('screeningResults' in patch) screeningResults = patch.screeningResults;
  if ('columnMapping' in patch) columnMapping = patch.columnMapping;
  if ('fileFormat' in patch) fileFormat = patch.fileFormat;
  if ('formatSource' in patch) formatSource = patch.formatSource;
  if ('currentStep' in patch) currentStep = patch.currentStep;
  if ('filterRules' in patch) filterRules = patch.filterRules;
  if ('projectManifest' in patch) projectManifest = patch.projectManifest;
  if ('auditEvents' in patch) auditEvents = patch.auditEvents;
  if ('screeningDecisions' in patch) screeningDecisions = patch.screeningDecisions;
  if ('qualityAssessments' in patch) qualityAssessments = patch.qualityAssessments;
  if ('projectHistory' in patch) projectHistory = patch.projectHistory;
  if ('dualReviewResults' in patch) dualReviewResults = patch.dualReviewResults;
  if ('appliedReviewerBundleIds' in patch) appliedReviewerBundleIds = patch.appliedReviewerBundleIds;
  if ('currentProjectId' in patch) currentProjectId = patch.currentProjectId;
  if ('isDualReviewMode' in patch) isDualReviewMode = patch.isDualReviewMode;
  if ('currentReviewer' in patch) currentReviewer = patch.currentReviewer;
  if ('runtimeMode' in patch) runtimeMode = patch.runtimeMode;
  if (currentProjectId) localStorage.setItem('prisma_current_project_id', currentProjectId);
}
function getState() {
  return {
    uploadedData,
    uploadedFiles,
    screeningResults,
    currentStep,
    projectManifest,
    auditEvents,
    screeningDecisions,
    qualityAssessments,
    projectHistory,
    dualReviewResults,
    dualReviewConflictState,
    appliedReviewerBundleIds,
    currentProjectId,
    isDualReviewMode,
    currentReviewer,
    toastLog,
    displayLog,
    downloads: globalThis.__downloads,
    persisted: globalThis.__persisted,
    diagnosticsText: document.getElementById('project-recovery-diagnostics').textContent,
  };
}
function queueJsonFile(name, value) {
  globalThis.__queuedFiles.push({ name, text: JSON.stringify(value) });
}
function clearDownloads() {
  globalThis.__downloads.length = 0;
}
this.__exports = {
  setState,
  getState,
  queueJsonFile,
  clearDownloads,
  exportCollaborationSeedPackage,
  importCollaborationSeedPackage,
  exportReviewerDecisionBundle,
  applyReviewerDecisionBundle,
};
`,
  ].join('\n\n');

  const context = {
    AuditEngine,
    DualReviewEngine,
    ProjectHistoryEngine,
    ProjectPackageEngine,
    ReviewerBundleEngine,
    __downloads: [],
    __queuedFiles: [],
    __objectUrls: new Map(),
    __elements: new Map(),
    __persisted: [],
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.__exports;
}

test('browser runtime exports seed files and imports a clean reviewer context', async () => {
  const harness = await loadReviewerBundleRuntimeHarness();
  harness.setState(createOwnerState());

  harness.exportCollaborationSeedPackage('A');
  harness.exportCollaborationSeedPackage('B');
  const downloads = harness.getState().downloads;
  const seedA = JSON.parse(downloads[0].text);
  const seedB = JSON.parse(downloads[1].text);

  assert.match(downloads[0].filename, /PRISMA-Collaboration-Seed-A-m4-ui-smoke-project-/);
  assert.match(downloads[1].filename, /PRISMA-Collaboration-Seed-B-m4-ui-smoke-project-/);
  assert.equal(seedA.bundleType, 'collaboration_seed');
  assert.equal(seedA.reviewer.reviewerId, 'reviewer_A');
  assert.equal(seedB.reviewer.reviewerId, 'reviewer_B');
  assert.match(seedA.sourceManifestHash, /^sha256:[0-9a-f]{64}$/);
  assert.match(seedA.bundleId, /^rb-[0-9a-f]{64}$/);

  harness.queueJsonFile('seed-a.json', seedA);
  harness.importCollaborationSeedPackage();
  const imported = harness.getState();

  assert.equal(imported.currentProjectId, 'm4-ui-smoke-project');
  assert.equal(imported.currentReviewer, 'A');
  assert.equal(imported.isDualReviewMode, true);
  assert.equal(imported.uploadedData.length, 2);
  assert.deepEqual(imported.screeningDecisions, []);
  assert.deepEqual(imported.qualityAssessments, []);
  assert.ok(imported.toastLog.some((entry) => entry.type === 'success' && /Collaboration Seed/.test(entry.message)));
});

test('browser runtime exports a decision bundle, merges once, and rejects duplicate imports before snapshot', async () => {
  const harness = await loadReviewerBundleRuntimeHarness();
  const ownerState = createOwnerState();
  harness.setState(ownerState);
  harness.exportCollaborationSeedPackage('A');
  const seedA = JSON.parse(harness.getState().downloads[0].text);

  harness.clearDownloads();
  harness.queueJsonFile('seed-a.json', seedA);
  harness.importCollaborationSeedPackage();
  harness.setState({
    screeningDecisions: [DualReviewEngine.createReviewerDecision({
      decisionId: 'ui-runtime-a-include',
      projectId: ownerState.currentProjectId,
      recordId: 'record-1',
      stage: 'full_text',
      reviewerId: 'reviewer_A',
      decision: 'include',
      updatedAt: '2026-07-15T00:00:00.000Z',
    })],
  });
  harness.exportReviewerDecisionBundle();
  const decisionBundle = JSON.parse(harness.getState().downloads.at(-1).text);

  assert.equal(decisionBundle.bundleType, 'reviewer_decision_bundle');
  assert.equal(decisionBundle.reviewer.reviewerId, 'reviewer_A');
  assert.equal(decisionBundle.screeningDecisions.length, 1);
  assert.match(decisionBundle.decisionsHash, /^sha256:[0-9a-f]{64}$/);

  harness.setState({ ...ownerState, screeningDecisions: [], auditEvents: [], projectHistory: [], appliedReviewerBundleIds: [] });
  const merged = harness.applyReviewerDecisionBundle(decisionBundle, { filename: 'decision-a.json' });
  const afterMerge = harness.getState();

  assert.ok(merged);
  assert.equal(afterMerge.screeningDecisions.length, 1);
  assert.deepEqual(afterMerge.appliedReviewerBundleIds, [decisionBundle.bundleId]);
  assert.equal(afterMerge.projectHistory[0].reason, 'before_reviewer_bundle_import');
  assert.ok(afterMerge.auditEvents.some((event) => event.eventType === 'reviewer_decision_bundle_imported' && event.after.bundleId === decisionBundle.bundleId));

  const historyCount = afterMerge.projectHistory.length;
  const duplicate = harness.applyReviewerDecisionBundle(decisionBundle, { filename: 'decision-a-duplicate.json' });
  const afterDuplicate = harness.getState();

  assert.equal(duplicate, null);
  assert.equal(afterDuplicate.projectHistory.length, historyCount);
  assert.ok(afterDuplicate.toastLog.at(-1).message.includes('已经') || /already/.test(afterDuplicate.toastLog.at(-1).message));
});

test('browser runtime rejects a wrong-project bundle without creating a history snapshot', async () => {
  const harness = await loadReviewerBundleRuntimeHarness();
  const ownerState = createOwnerState();
  harness.setState(ownerState);
  const decisionBundle = ReviewerBundleEngine.createReviewerDecisionBundle({
    ...ownerState,
    screeningDecisions: [DualReviewEngine.createReviewerDecision({
      decisionId: 'wrong-project-decision',
      projectId: 'wrong-project',
      recordId: 'record-1',
      stage: 'full_text',
      reviewerId: 'reviewer_A',
      decision: 'include',
      updatedAt: '2026-07-15T00:00:00.000Z',
    })],
    currentProjectId: 'wrong-project',
    projectManifest: { projectId: 'wrong-project', version: '2.5-dual-review-release' },
  }, { reviewerId: 'reviewer_A', exportedAt: '2026-07-15T00:01:00.000Z' });

  const result = harness.applyReviewerDecisionBundle(decisionBundle, { filename: 'wrong-project.json' });
  const state = harness.getState();

  assert.equal(result, null);
  assert.equal(state.projectHistory.length, 0);
  assert.match(state.diagnosticsText, /Reviewer Bundle|无法恢复/);
  assert.equal(state.screeningDecisions.length, 0);
});
