import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('start route presents exactly the three M3 entry modes with complete contracts', async () => {
  const page = await readRepoFile('start/index.html');
  const modes = [...page.matchAll(/data-start-mode="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(modes, ['demo', 'new-import', 'resume']);
  assert.match(page, /体验 Demo/u);
  assert.match(page, /新建项目并导入/u);
  assert.match(page, /恢复已有项目/u);
  assert.match(page, /适用场景/u);
  assert.match(page, /需要准备/u);
  assert.match(page, /数据边界/u);
  assert.match(page, /进入阶段/u);
  assert.match(page, /可撤销/u);
  assert.match(page, /产生文件/u);
  assert.match(page, /app\/\?start=demo/);
  assert.match(page, /app\/\?start=new-import/);
  assert.match(page, /app\/\?start=resume/);
  assert.doesNotMatch(page, /data-start-mode="(?:audit|quality|export)"/);
});

test('workspace exposes explicit recovery diagnostics and only the three start paths', async () => {
  const page = await readRepoFile('app/index.html');
  const onboarding = page.slice(
    page.indexOf('id="workspace-onboarding"'),
    page.indexOf('id="step1"')
  );

  assert.equal((onboarding.match(/data-start-mode=/g) || []).length, 3);
  assert.match(onboarding, /data-start-mode="demo"/);
  assert.match(onboarding, /data-start-mode="new-import"/);
  assert.match(onboarding, /data-start-mode="resume"/);
  assert.match(onboarding, /project-recovery-diagnostics/);
  assert.match(onboarding, /project-recovery-options/);
  assert.match(onboarding, /resumeLocalProject\('project_snapshot'\)/);
  assert.match(onboarding, /resumeLocalProject\('autosave'\)/);
  assert.match(onboarding, /loadProject\(\)/);
  assert.match(onboarding, /setReviewMode\('single'\)/);
  assert.match(onboarding, /setReviewMode\('dual'\)/);
  assert.doesNotMatch(onboarding, /data-start-mode="(?:audit|quality|export)"/);

  const packageEngineIndex = page.indexOf('project-package-engine.js');
  const appIndex = page.indexOf('app.js?');
  assert.ok(packageEngineIndex >= 0 && packageEngineIndex < appIndex, 'project package diagnostics must load before app.js');
});

test('public entry links route project starts through /start/', async () => {
  const [root, resources, readmeZh, readmeEn, dualReview] = await Promise.all([
    readRepoFile('index.html'),
    readRepoFile('resources/index.html'),
    readRepoFile('README.md'),
    readRepoFile('README_EN.md'),
    readRepoFile('dual-review/index.html'),
  ]);

  assert.match(root, /href="start\/"/);
  assert.match(resources, /href="\.\.\/start\/"/);
  assert.match(readmeZh, /\(\.\/start\/\)/);
  assert.match(readmeEn, /\(\.\/start\/\)/);
  assert.match(dualReview, /\.\.\/start\/\?review=dual/);
  assert.doesNotMatch(dualReview, /app\/\?mode=dual/);
});

test('M3 source keeps recovery truthful and preserves M4/M7 boundaries', async () => {
  const [app, engine] = await Promise.all([
    readRepoFile('literature-screening-v2.2/app.js'),
    readRepoFile('literature-screening-v2.2/project-package-engine.js'),
  ]);

  assert.match(app, /本次会从头重新导入/u);
  assert.doesNotMatch(app, /是否继续？/u);
  assert.match(app, /function reportProjectStorageFailure/);
  assert.match(app, /function resumeLocalProject/);
  assert.match(app, /function setWorkspaceOnboardingVisible/);
  assert.match(app, /function detachCollaborativeSessionForProjectEntry/);
  assert.match(app, /function detachCollaborativeSessionForProjectEntry\(\)[\s\S]*?setReviewMode\('single', \{ refresh: false \}\)/);
  assert.match(app, /let pendingNewProjectSession = false/);
  assert.match(app, /forceNew: pendingNewProjectSession/);
  assert.match(app, /restore_failed/);
  assert.match(app, /function importCollaborationSeedPackage/);
  assert.match(app, /diagnoseReviewerBundle/);
  assert.match(app, /appliedReviewerBundleIds/);
  assert.match(await readRepoFile('app/index.html'), /importCollaborationSeedPackage\(\)/);
  assert.match(engine, /project_package\.v1\.local/);
  assert.doesNotMatch(engine, /EvidenceDock|SiftTrail|ReviewTrail/);

  const bundleEngine = await readRepoFile('literature-screening-v2.2/reviewer-bundle-engine.js');
  assert.match(bundleEngine, /reviewer_bundle\.v1\.local/);
  const historyEngine = await readRepoFile('literature-screening-v2.2/project-history-engine.js');
  assert.match(historyEngine, /project_history\.v2\.5\.1/);
});
