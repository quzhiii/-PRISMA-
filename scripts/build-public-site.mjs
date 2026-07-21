import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const distRoot = path.join(repoRoot, 'dist');

const publicFiles = [
  'index.html',
  'favicon.svg',
  'login.html',
  'landing.html',
  'LICENSE',
  'dedup-engine.js',
  'start/index.html',
  'app/index.html',
  'dual-review/index.html',
  'methods/index.html',
  'resources/index.html',
  'legacy/index.html',
  'literature-screening-v2.2/index.html',
  'literature-screening-v2.2/workspace.html',
  'literature-screening-v2.2/login.html',
  'literature-screening-v2.2/resources.html',
  'literature-screening-v2.2/landing.html',
  'literature-screening-v2.2/ai-provider-engine.js',
  'literature-screening-v2.2/app.js',
  'literature-screening-v2.2/audit-engine.js',
  'literature-screening-v2.2/conservative-ai-engine.js',
  'literature-screening-v2.2/db-worker.js',
  'literature-screening-v2.2/dual-review-engine.js',
  'literature-screening-v2.2/import-job-runtime.js',
  'literature-screening-v2.2/parser-worker.js',
  'literature-screening-v2.2/project-history-engine.js',
  'literature-screening-v2.2/project-package-engine.js',
  'literature-screening-v2.2/quality-engine.js',
  'literature-screening-v2.2/reviewer-bundle-engine.js',
  'literature-screening-v2.2/sample-data.json',
  'literature-screening-v2.2/streaming-parser.js',
  'literature-screening-v2.2/style.css',
  'literature-screening-v2.2/v1.7-core-patch.js',
  'literature-screening-v2.2/virtual-list.js',
  'docs/demo/README.md',
  'docs/benchmarks/README.md',
  'docs/benchmarks/dedup/2026-03-27-initial-synthetic-readout.md',
  'docs/benchmarks/dedup/2026-03-27-interim-evaluation-report.md',
  'docs/benchmarks/dedup/2026-03-27-interim-scoring.csv',
  'docs/benchmarks/dedup/2026-03-27-real-rdf-readout.md',
  'docs/benchmarks/dedup/README.md',
  'docs/benchmarks/dedup/adjudication-rubric.md',
  'docs/benchmarks/dedup/current-state-baseline-audit.md',
  'docs/benchmarks/dedup/evaluation-report-template.md',
  'docs/benchmarks/dedup/frozen-target-2026-03-27.md',
  'docs/benchmarks/dedup/post-implementation-benchmark-report.md',
  'docs/benchmarks/dedup/scoring-template.csv',
  'docs/templates/README.md',
  'docs/templates/audit-appendix-template.md',
  'docs/templates/database-export/README.md',
  'docs/templates/dual-review-sop.md',
  'docs/templates/screening-criteria/README.md',
  'docs/design/SEARCH_STRATEGY_ASSISTANT.md',
];

await fs.rm(distRoot, { recursive: true, force: true });

for (const relativePath of publicFiles) {
  const sourcePath = path.join(repoRoot, relativePath);
  const destinationPath = path.join(distRoot, relativePath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
}

console.log(`Built ${publicFiles.length} allowlisted public files in dist/.`);
