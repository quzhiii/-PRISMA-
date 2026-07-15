import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const distRoot = path.join(repoRoot, 'dist');

const canonicalPages = [
  'index.html',
  'start/index.html',
  'app/index.html',
  'dual-review/index.html',
  'resources/index.html',
  'legacy/index.html',
];

const compatibilityPages = new Map([
  ['login.html', 'dual-review/'],
  ['landing.html', './'],
  ['literature-screening-v2.2/index.html', '../'],
  ['literature-screening-v2.2/workspace.html', '../app/'],
  ['literature-screening-v2.2/login.html', '../dual-review/'],
  ['literature-screening-v2.2/resources.html', '../resources/'],
  ['literature-screening-v2.2/landing.html', '../'],
]);

const publicCopyFiles = [
  ...canonicalPages,
  ...compatibilityPages.keys(),
  'README.md',
  'README_EN.md',
  'literature-screening-v2.2/app.js',
  'literature-screening-v2.2/audit-engine.js',
  'docs/demo/README.md',
  'docs/benchmarks/README.md',
  'docs/benchmarks/dedup/2026-03-27-initial-synthetic-readout.md',
  'docs/benchmarks/dedup/2026-03-27-interim-evaluation-report.md',
  'docs/benchmarks/dedup/2026-03-27-real-rdf-readout.md',
  'docs/benchmarks/dedup/README.md',
  'docs/benchmarks/dedup/adjudication-rubric.md',
  'docs/benchmarks/dedup/current-state-baseline-audit.md',
  'docs/benchmarks/dedup/evaluation-report-template.md',
  'docs/benchmarks/dedup/frozen-target-2026-03-27.md',
  'docs/benchmarks/dedup/post-implementation-benchmark-report.md',
  'docs/templates/README.md',
  'docs/templates/audit-appendix-template.md',
  'docs/templates/database-export/README.md',
  'docs/templates/dual-review-sop.md',
  'docs/templates/screening-criteria/README.md',
  'docs/design/SEARCH_STRATEGY_ASSISTANT.md',
];

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function listFiles(root, current = root) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) return listFiles(root, absolutePath);
    return path.relative(root, absolutePath).split(path.sep).join('/');
  }));
  return nested.flat().sort();
}

test('root is the direct canonical V2.5 public homepage', async () => {
  const homepage = await readRepoFile('index.html');

  assert.match(homepage, /V2\.5 dual-review closeout/i);
  assert.match(homepage, /href="start\/"/);
  assert.match(homepage, /href="app\/"/);
  assert.match(homepage, /href="dual-review\/"/);
  assert.match(homepage, /href="resources\/"/);
  assert.match(homepage, /href="legacy\/"/);
  assert.doesNotMatch(homepage, /http-equiv=["']refresh/i);
  assert.doesNotMatch(homepage, /location\.(?:replace|assign)\s*\(/i);
});

test('canonical public routes exist and carry the bilingual independent-project notice', async () => {
  const pages = await Promise.all(canonicalPages.map(readRepoFile));

  pages.forEach((page, index) => {
    assert.match(page, /独立开源项目/iu, `${canonicalPages[index]} needs the Chinese notice`);
    assert.match(page, /independent open-source project/i, `${canonicalPages[index]} needs the English notice`);
    assert.match(page, /(?:不隶属于|无隶属关系)/u, `${canonicalPages[index]} needs the Chinese non-affiliation boundary`);
    assert.match(page, /not affiliated with, authorized by, or endorsed by the PRISMA Statement/i, `${canonicalPages[index]} needs the English non-affiliation boundary`);
  });
});

test('legacy HTML entry points are noindex compatibility aliases to canonical routes', async () => {
  for (const [relativePath, canonicalHref] of compatibilityPages) {
    const page = await readRepoFile(relativePath);
    assert.match(page, /<meta\s+name="robots"\s+content="noindex,\s*follow">/i, `${relativePath} should be noindex`);
    assert.match(page, new RegExp(`<link\\s+rel="canonical"\\s+href="${canonicalHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), `${relativePath} should identify ${canonicalHref} as canonical`);
  }
});

test('dual-review setup describes browser-local file handoff without account or sync claims', async () => {
  const page = await readRepoFile('dual-review/index.html');

  assert.match(page, /无需账号|No account/i);
  assert.match(page, /不提供在线项目查询|No online project lookup/i);
  assert.match(page, /不提供实时同步|No real-time sync/i);
  assert.match(page, /Collaboration Seed/);
  assert.match(page, /Reviewer Decision Bundle/);
  assert.match(page, /SHA-256/);
  assert.match(page, /m4\.v1/);
  assert.match(page, /重复 Bundle/);
  assert.match(page, /浏览器本地状态|browser-local state/i);
  assert.doesNotMatch(page, /登录|加入项目|等待同步|项目连接|\blogin\b|join project|wait(?:ing)? for sync|project connection/i);
});

test('public copy keeps one release identity and avoids unsupported assurance language', async () => {
  const sources = await Promise.all(publicCopyFiles.map(readRepoFile));
  const combined = sources.map((source, index) => {
    if (!publicCopyFiles[index].endsWith('.js')) return source;
    return source
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s+\/\/[^\n]*$/gm, '');
  }).join('\n');

  assert.doesNotMatch(combined, /\bV2\.6\b|\bV2\.7\b|\bV3(?:\.0)?\b/i);
  assert.doesNotMatch(combined, /audit-ready|defense-ready|research-grade|standard PRISMA 2020|PRISMA logo/i);
  assert.doesNotMatch(combined, /ready for the PRISMA 2020 checklist/i);
  assert.doesNotMatch(combined, /数据不离开浏览器|data (?:never leaves|stays in) (?:the )?browser/i);
  assert.doesNotMatch(combined, /绝对安全|完全保障|100% secure|completely secure/i);
});

test('public-site build emits only allowlisted static artifacts', async () => {
  execFileSync(process.execPath, ['scripts/build-public-site.mjs'], {
    cwd: repoRoot,
    stdio: 'pipe',
  });

  const files = await listFiles(distRoot);
  const requiredFiles = [
    ...canonicalPages,
    'literature-screening-v2.2/project-package-engine.js',
    ...compatibilityPages.keys(),
    'dedup-engine.js',
    'literature-screening-v2.2/app.js',
    'literature-screening-v2.2/audit-engine.js',
    'literature-screening-v2.2/parser-worker.js',
    'literature-screening-v2.2/sample-data.json',
    'literature-screening-v2.2/style.css',
    'docs/demo/README.md',
    'docs/benchmarks/README.md',
    'docs/templates/README.md',
    'docs/design/SEARCH_STRATEGY_ASSISTANT.md',
  ];

  requiredFiles.forEach((relativePath) => {
    assert.ok(files.includes(relativePath), `dist should include ${relativePath}`);
  });

  const allowedFile = /^(?:index\.html|login\.html|landing\.html|LICENSE|dedup-engine\.js|(?:app|start|dual-review|resources|legacy)\/index\.html|literature-screening-v2\.2\/(?:index|workspace|login|resources|landing)\.html|literature-screening-v2\.2\/(?:[a-z0-9.-]+\.(?:js|css|json))|docs\/demo\/README\.md|docs\/benchmarks\/(?:README\.md|dedup\/.*)|docs\/templates\/.*|docs\/design\/SEARCH_STRATEGY_ASSISTANT\.md)$/i;
  files.forEach((relativePath) => {
    assert.match(relativePath, allowedFile, `unexpected public artifact: ${relativePath}`);
  });

  const forbidden = /(?:^|\/)(?:tests?|fixtures?|plans?|papers?|commercial|strategy|\.git)(?:\/|$)|create-test\.html$|test(?:[-_].*)?\.html$|test_30k\.ris$/i;
  files.forEach((relativePath) => {
    assert.doesNotMatch(relativePath, forbidden, `forbidden public artifact: ${relativePath}`);
  });

  const htmlFiles = files.filter((relativePath) => relativePath.endsWith('.html'));
  for (const relativePath of htmlFiles) {
    const source = await fs.readFile(path.join(distRoot, relativePath), 'utf8');
    const references = [...source.matchAll(/\b(?:href|src)="([^"]+)"/gi)].map((match) => match[1]);
    references.forEach((reference) => {
      if (/^(?:https?:|javascript:|mailto:|data:|#)/i.test(reference)) return;
      const resolved = new URL(reference, `https://public.test/${relativePath}`);
      let target = decodeURIComponent(resolved.pathname).replace(/^\//, '');
      if (!target || target.endsWith('/')) target += 'index.html';
      assert.ok(files.includes(target), `${relativePath} has a missing local target: ${reference}`);
    });
  }
});
