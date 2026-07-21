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
  'methods/index.html',
  'resources/index.html',
  'legacy/index.html',
];

const canonicalFaviconHrefs = new Map([
  ['index.html', 'favicon.svg'],
  ['start/index.html', '../favicon.svg'],
  ['app/index.html', '../favicon.svg'],
  ['dual-review/index.html', '../favicon.svg'],
  ['methods/index.html', '../favicon.svg'],
  ['resources/index.html', '../favicon.svg'],
  ['legacy/index.html', '../favicon.svg'],
]);

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

async function loadPublicDemoRecords() {
  const parsed = JSON.parse(await readRepoFile('literature-screening-v2.2/sample-data.json'));
  assert.equal(Array.isArray(parsed.data), true, 'sample-data.json must contain a data array');
  return parsed.data;
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
  assert.match(homepage, /href="methods\/"/);
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

  assert.match(page, /不需要注册账号|needs no account/i);
  assert.match(page, /本地文件|local files/i);
  assert.match(page, /项目负责人|project owner/i);
  assert.match(page, /Collaboration Seed/);
  assert.match(page, /Reviewer Decision Bundle/);
  assert.match(page, /SHA-256/);
  assert.match(page, /m4\.v1/);
  assert.match(page, /重复 Bundle/);
  assert.match(page, /浏览器本地运行|browser-local workflow/i);
  assert.doesNotMatch(page, /登录|加入项目|等待同步|项目连接|\blogin\b|join project|wait(?:ing)? for sync|project connection/i);
});

test('methods page presents a beginner-friendly public workflow guide without overclaiming', async () => {
  const page = await readRepoFile('methods/index.html');
  const homepage = await readRepoFile('index.html');
  const resources = await readRepoFile('resources/index.html');

  assert.match(page, /Methods guide/i);
  assert.match(page, /第一次接触系统综述/u);
  assert.match(page, /从 Demo 或导入开始/u);
  assert.match(page, /流程里会留下哪些记录/u);
  assert.match(page, /每条记录来自哪个文件/u);
  assert.match(page, /硬重复和疑似重复分开处理/u);
  assert.match(page, /筛选结论和理由可追溯/u);
  assert.match(page, /双人复核怎么交接/u);
  assert.match(page, /可以导出哪些材料/u);
  assert.match(page, /给需要复现的人/u);
  assert.match(page, /export_snapshot\.v1\.local/);
  assert.match(page, /m5\.v1/);
  assert.match(page, /SHA-256/);
  assert.match(page, /reviewer_bundle\.v1\.local/);
  assert.match(page, /m4\.v1/);
  assert.match(page, /project_history\.v2\.5\.1/);
  assert.match(page, /PRISMA_LiteratureDB_v2\.2/);
  assert.match(page, /node tests\/run-all-regressions\.js/);
  assert.match(page, /node scripts\/build-public-site\.mjs/);
  assert.match(page, /AI suggestions are recorded in a separate suggestion log/);
  assert.match(page, /Real-project validation is planned/);
  assert.match(page, /not affiliated with, authorized by, or endorsed by the PRISMA Statement/i);
  assert.match(homepage, /href="methods\/"/);
  assert.match(resources, /href="\.\.\/methods\/"/);
  assert.doesNotMatch(page, /audit-ready|defense-ready|research-grade|standard PRISMA 2020|certified|validated in real projects/i);
  assert.doesNotMatch(page, /data (?:never leaves|stays in) (?:the )?browser/i);
  assert.doesNotMatch(page, /用可复核证据说明工作流|承诺替代验证|限制可见|M5 methods and evidence|当前实现|验证证据分层|数据保真协议|导出与复核合同|已知限制|unsupported promises|No invented external validation/i);
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
  assert.doesNotMatch(combined, /用可复核证据说明工作流|承诺替代验证|限制可见|不虚构外部验证|M5 methods and evidence|No invented external validation|unsupported promises/i);
});

test('resources page mirrors the current public demo record count', async () => {
  const records = await loadPublicDemoRecords();
  const resources = await readRepoFile('resources/index.html');

  assert.equal(records.length, 21);
  assert.match(resources, new RegExp(`${records.length} records`));
  assert.match(resources, new RegExp(`先用 ${records.length} 条记录体验流程`, 'u'));
  assert.match(resources, new RegExp(`Try the workflow with ${records.length} records`));
  assert.doesNotMatch(resources, /22 records|22 条记录|22条记录/u);
});

test('app workspace has one bilingual semantic h1 without promoting step headings', async () => {
  const app = await readRepoFile('app/index.html');
  const h1Matches = app.match(/<h1\b/gi) || [];

  assert.equal(h1Matches.length, 1);
  assert.match(app, /<h1 class="sr-only">/);
  assert.match(app, /PRISMA Workbench 文献筛选与复核工作台/u);
  assert.match(app, /PRISMA Workbench Literature Screening and Review Workspace/);
  assert.doesNotMatch(app, /<h1[^>]*>\s*<span class="zh">导入文献记录/u);
  assert.doesNotMatch(app, /<h1[^>]*>\s*<span class="zh">开始或恢复项目/u);
});

test('canonical pages reference the safe svg favicon with route-relative paths', async () => {
  const favicon = await readRepoFile('favicon.svg');
  const buildScript = await readRepoFile('scripts/build-public-site.mjs');

  assert.ok(favicon.trim().length > 0, 'favicon.svg should not be empty');
  assert.match(favicon, /<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.doesNotMatch(favicon, /<script\b|<foreignObject\b|data:|base64|[A-Z]:\\|Users[\\/]/i);
  assert.doesNotMatch(favicon.replace('http://www.w3.org/2000/svg', ''), /https?:\/\//i);
  assert.match(buildScript, /'favicon\.svg'/);

  for (const [relativePath, faviconHref] of canonicalFaviconHrefs) {
    const page = await readRepoFile(relativePath);
    assert.match(
      page,
      new RegExp(`<link\\s+rel="icon"\\s+type="image/svg\\+xml"\\s+href="${faviconHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
      `${relativePath} should reference ${faviconHref}`,
    );
  }
});

test('public-site build emits only allowlisted static artifacts', async () => {
  execFileSync(process.execPath, ['scripts/build-public-site.mjs'], {
    cwd: repoRoot,
    stdio: 'pipe',
  });

  const files = await listFiles(distRoot);
  const requiredFiles = [
    ...canonicalPages,
    'favicon.svg',
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

  const allowedFile = /^(?:index\.html|favicon\.svg|login\.html|landing\.html|LICENSE|dedup-engine\.js|(?:app|start|dual-review|methods|resources|legacy)\/index\.html|literature-screening-v2\.2\/(?:index|workspace|login|resources|landing)\.html|literature-screening-v2\.2\/(?:[a-z0-9.-]+\.(?:js|css|json))|docs\/demo\/README\.md|docs\/benchmarks\/(?:README\.md|dedup\/.*)|docs\/templates\/.*|docs\/design\/SEARCH_STRATEGY_ASSISTANT\.md)$/i;
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
