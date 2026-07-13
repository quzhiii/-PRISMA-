import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const candidates = ['EvidenceDock', 'SiftTrail', 'ReviewTrail'];
const publicIdentityFiles = [
  'README.md',
  'README_EN.md',
  'index.html',
  'app/index.html',
  'dual-review/index.html',
  'resources/index.html',
  'legacy/index.html',
];
const runtimeIdentityFiles = [
  'literature-screening-v2.2/app.js',
  'literature-screening-v2.2/db-worker.js',
  'literature-screening-v2.2/reviewer-bundle-engine.js',
  'literature-screening-v2.2/project-history-engine.js',
];

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('M2 naming kit contains the approved candidate cards and interview protocol', async () => {
  const kit = await readRepoFile('docs/naming/2026-07-name-test-kit.md');

  const cards = [
    ['EvidenceDock', 'Local-first systematic review screening and evidence workspace.', '本地优先的系统综述筛选与证据工作台。'],
    ['SiftTrail', 'Traceable literature screening for systematic reviews.', '面向系统综述的可追溯文献筛选工具。'],
    ['ReviewTrail', 'A local-first workflow for systematic reviews.', '本地优先的系统综述流程工作台。'],
  ];
  cards.flat().forEach((value) => assert.ok(kit.includes(value), `missing candidate-card text: ${value}`));

  assert.match(kit, /5\s*[-–]\s*8/u);
  assert.match(kit, /研究生/u);
  assert.match(kit, /系统综述研究者/u);
  assert.match(kit, /方法学/u);
  assert.match(kit, /随机|轮换/u);
  assert.match(kit, /60\s*秒/u);
  assert.match(kit, /拼写/u);
  assert.match(kit, /延迟回忆/u);
  assert.match(kit, /个人信息最小化|最小化收集/u);

  const requiredQuestions = [
    '你认为这是什么工具',
    '你能记住这个名字吗',
    '它更像筛选、写作、检索还是数据管理',
    '你会如何拼写',
    '你是否误以为它是 PRISMA 官方软件',
    '你能否说出它的核心用途',
  ];
  requiredQuestions.forEach((question) => assert.ok(kit.includes(question), `missing interview question: ${question}`));

  assert.match(kit, /不(?:做|执行)正式重命名|不正式改名/u);
  assert.match(kit, /维护者批准/u);
  assert.match(kit, /legacy alias/iu);
  assert.match(kit, /建议.*(?:尚未|未获|没有).*批准|建议.*不代表批准/iu);
});

test('M2 scorecard has a stable one-row-per-candidate schema', async () => {
  const csv = await readRepoFile('docs/naming/2026-07-name-test-scorecard.csv');
  const lines = csv.trimEnd().split(/\r?\n/);
  const header = lines[0].split(',');
  const requiredColumns = [
    'participant_id',
    'participant_profile',
    'candidate_order',
    'candidate_name',
    'first_impression',
    'perceived_core_use',
    'perceived_product_category',
    'understood_systematic_review_use',
    'understood_screening_use',
    'understood_local_first',
    'understood_traceability',
    'mistaken_for_official_prisma',
    'unaided_spelling',
    'spelling_correct',
    'immediate_recall',
    'delayed_recall',
    'memorability_score',
    'clarity_score',
    'trust_score',
    'extensibility_score',
    'homepage_60_second_understanding',
    'homepage_60_second_core_use',
    'overall_preference',
    'preference_reason',
    'confusion_notes',
    'interviewer_notes',
  ];

  assert.deepEqual(header, requiredColumns);
  assert.equal(new Set(header).size, header.length, 'CSV header columns must be unique');
  lines.slice(1).forEach((line, index) => {
    assert.equal(line.split(',').length, header.length, `CSV row ${index + 2} must match the stable header`);
  });
});

test('pending decisions records M2 status and defers every migration surface', async () => {
  const pending = await readRepoFile('docs/plans/PENDING_DECISIONS.md');

  assert.match(pending, /docs\/naming\/2026-07-name-test-kit\.md/);
  assert.match(pending, /docs\/naming\/2026-07-name-test-scorecard\.csv/);
  assert.match(pending, /5\s*[-–]\s*8/u);
  candidates.forEach((candidate) => assert.ok(pending.includes(candidate), `pending decisions must list ${candidate}`));
  assert.match(pending, /PRISMA Workbench/);
  assert.match(pending, /V2\.5 dual-review closeout/i);
  assert.match(pending, /maintainer approval/i);
  assert.match(pending, /repository/i);
  assert.match(pending, /domain/i);
  assert.match(pending, /canonical metadata/i);
  assert.match(pending, /schema producer/i);
  assert.match(pending, /bundle producer/i);
  assert.match(pending, /export manifest/i);
  assert.match(pending, /internal IDs/i);
  assert.match(pending, /inbound links/i);
  assert.match(pending, /not (?:approved|executed)/i);
});

test('M2 leaves the public and runtime identities unchanged', async () => {
  const publicSources = await Promise.all(publicIdentityFiles.map(readRepoFile));
  const publicCopy = publicSources.join('\n');

  assert.match(publicCopy, /PRISMA Workbench/i);
  assert.match(publicCopy, /V2\.5 dual-review closeout/i);
  candidates.forEach((candidate) => assert.doesNotMatch(publicCopy, new RegExp(candidate, 'i')));

  const runtimeSources = await Promise.all(runtimeIdentityFiles.map(readRepoFile));
  const runtimeCopy = runtimeSources.join('\n');
  assert.match(runtimeSources[0], /APP_RELEASE_VERSION\s*=\s*['"]2\.5-dual-review-release['"]/);
  assert.match(runtimeSources[1], /DB_NAME\s*=\s*['"]PRISMA_LiteratureDB_v2\.2['"]/);
  assert.match(runtimeSources[2], /REVIEWER_BUNDLE_SCHEMA_VERSION\s*=\s*['"]reviewer_bundle\.v1\.local['"]/);
  assert.match(runtimeSources[3], /PROJECT_HISTORY_SCHEMA_VERSION\s*=\s*['"]project_history\.v2\.5\.1['"]/);
  assert.match(runtimeSources[0], /['"]prisma_current_project_id['"]/);
  assert.match(runtimeSources[0], /['"]prisma_autosave['"]/);
  candidates.forEach((candidate) => assert.doesNotMatch(runtimeCopy, new RegExp(candidate, 'i')));
});

test('M2 research materials stay outside the public build allowlist', async () => {
  const buildScript = await readRepoFile('scripts/build-public-site.mjs');

  assert.doesNotMatch(buildScript, /docs\/naming\//i);
});
