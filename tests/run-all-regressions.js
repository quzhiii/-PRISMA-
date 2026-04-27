#!/usr/bin/env node

const { spawn } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const testFiles = [
  'tests/audit/audit-engine.test.mjs',
  'tests/audit/audit-workflow.test.mjs',
  'tests/quality/evidence-engine.test.mjs',
  'tests/quality/study-design-classifier.test.mjs',
  'tests/import/import-job-state.test.mjs',
  'tests/import/import-hardening.test.mjs',
  'tests/import/parser-chunk-boundary.test.mjs',
  'tests/dedup/benchmark-smoke.test.mjs',
  'tests/dedup/benchmark-regression.test.mjs',
  'tests/dedup/record-normalization.test.mjs',
  'tests/dedup/dedup-engine.test.mjs',
  'tests/dedup/app-integration.test.mjs',
  'tests/dedup/legacy-paths.test.mjs',
  'tests/dedup/candidate-output.test.mjs'
];

const child = spawn(
  process.execPath,
  ['--test', '--test-concurrency=1', ...testFiles],
  {
    cwd: repoRoot,
    stdio: 'inherit'
  }
);

child.on('exit', (code, signal) => {
  if (typeof code === 'number') {
    process.exit(code);
  }
  console.error(`Regression run terminated by signal: ${signal || 'unknown'}`);
  process.exit(1);
});
