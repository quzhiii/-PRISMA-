import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { findLocalAbsolutePathLeaks, hasLocalAbsolutePathLeak } from '../../scripts/public-demo-safety.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const generatorPath = path.join(repoRoot, 'scripts', 'generate-public-demo-delivery.mjs');
const deliveryRoot = path.resolve(repoRoot, '..', 'PRISMA-demo-delivery');
const stagingPrefix = '.public-demo-v2-1-1-staging-';
const protectedDeliveryPaths = [
  path.join(deliveryRoot, 'public-demo-v1'),
  path.join(deliveryRoot, 'public-demo-v2'),
  path.join(deliveryRoot, 'public-demo-v2.1'),
];

function runGenerator(args = []) {
  return spawnSync(process.execPath, [generatorPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-public-demo-generator-'));
}

function listStagingDirs(parentDir) {
  if (!fs.existsSync(parentDir)) return [];
  return fs.readdirSync(parentDir).filter((entry) => entry.startsWith(stagingPrefix));
}

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function walkFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(root, entry.name);
    return entry.isDirectory() ? walkFiles(abs) : [abs];
  });
}

function readManifestRows(outputDir) {
  const manifest = fs.readFileSync(path.join(outputDir, '09_OUTPUT_MANIFEST.md'), 'utf8');
  return manifest
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| ') && !line.includes('文件名') && !line.includes('---'))
    .map((line) => {
      const [fileName, sourceType, engineApi, fileSizeBytes, sha256] = line
        .split('|')
        .slice(1, -1)
        .map((part) => part.trim());
      return { fileName, sourceType, engineApi, fileSizeBytes: Number(fileSizeBytes), sha256 };
    });
}

function assertRejectsWithoutStaging(outputPath, messagePattern, stagingParent = path.dirname(outputPath)) {
  const before = listStagingDirs(stagingParent);
  const result = runGenerator([outputPath]);
  const after = listStagingDirs(stagingParent);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, messagePattern);
  assert.deepEqual(after, before);
}

test('public demo generator rejects missing output argument', () => {
  const result = runGenerator();

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
  assert.match(result.stderr, /Missing output directory argument/);
});

test('public demo generator rejects repository root before staging', () => {
  assertRejectsWithoutStaging(repoRoot, /repository root or inside the PRISMA repository/, path.dirname(repoRoot));
});

test('public demo generator rejects repository-internal output paths before staging', () => {
  const outputDir = path.join(repoRoot, '.tmp-public-demo-v2-1-1-output');

  assertRejectsWithoutStaging(outputDir, /repository root or inside the PRISMA repository/);
  assert.equal(fs.existsSync(outputDir), false);
});

test('public demo generator rejects protected delivery roots before staging', { skip: protectedDeliveryPaths.some((dir) => !fs.existsSync(dir)) }, () => {
  protectedDeliveryPaths.forEach((protectedPath) => {
    assertRejectsWithoutStaging(protectedPath, /read-only protected delivery tree/, path.dirname(protectedPath));
  });
});

test('public demo generator rejects missing descendants of protected delivery trees before staging', { skip: protectedDeliveryPaths.some((dir) => !fs.existsSync(dir)) }, () => {
  protectedDeliveryPaths.forEach((protectedPath) => {
    const nestedOutput = path.join(protectedPath, '.', 'future-child', '..', 'future-child', 'package');

    assertRejectsWithoutStaging(nestedOutput, /read-only protected delivery tree/, protectedPath);
    assert.equal(fs.existsSync(nestedOutput), false);
  });
});

test('public demo generator follows existing junction or symlink aliases during path validation', { skip: !fs.existsSync(protectedDeliveryPaths[2]) }, (t) => {
  const tempRoot = makeTempRoot();
  const alias = path.join(tempRoot, 'protected-alias');
  try {
    try {
      fs.symlinkSync(protectedDeliveryPaths[2], alias, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      t.skip(`junction/symlink creation unavailable: ${error.message}`);
      return;
    }

    assertRejectsWithoutStaging(path.join(alias, 'future-child'), /read-only protected delivery tree/, alias);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('public demo generator rejects existing files empty directories and non-empty directories without staging', () => {
  const tempRoot = makeTempRoot();
  try {
    const outputFile = path.join(tempRoot, 'existing-file');
    fs.writeFileSync(outputFile, 'existing file\n', 'utf8');
    assertRejectsWithoutStaging(outputFile, /already exists as a file/);

    const emptyOutputDir = path.join(tempRoot, 'empty-output');
    fs.mkdirSync(emptyOutputDir);
    assertRejectsWithoutStaging(emptyOutputDir, /atomic publish requires the final path to be absent/);

    const outputDir = path.join(tempRoot, 'non-empty-output');
    fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, 'sentinel.txt'), 'do not overwrite\n', 'utf8');
    assertRejectsWithoutStaging(outputDir, /Refusing to overwrite non-empty output directory/);
    assert.equal(fs.readFileSync(path.join(outputDir, 'sentinel.txt'), 'utf8'), 'do not overwrite\n');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('absolute path leak detector catches local path variants', () => {
  [
    String.raw`E:\project\PRISMA\secret.txt`,
    'E:/project/PRISMA/secret.txt',
    String.raw`\\server\share\secret.txt`,
    'file:///C:/Users/example/secret.txt',
    '/Users/example/secret.txt',
    '/home/example/secret.txt',
  ].forEach((text) => {
    assert.equal(hasLocalAbsolutePathLeak(text), true, text);
    assert.ok(findLocalAbsolutePathLeaks(text).length > 0, text);
  });
});

test('absolute path leak detector ignores public URLs DOI values and SVG namespaces', () => {
  const safeText = [
    'https://example.org/public-demo',
    'http://www.w3.org/2000/svg',
    'xmlns="http://www.w3.org/2000/svg"',
    'https://doi.org/10.1234/tcm.2023.001',
    'DOI 10.1234/tcm.2023.001',
  ].join('\n');

  assert.equal(hasLocalAbsolutePathLeak(safeText), false);
});

test('public demo generator cleans only its owned staging directory when publish fails', { skip: process.platform !== 'win32' }, () => {
  const tempRoot = makeTempRoot();
  try {
    const sentinelDir = path.join(tempRoot, 'user-owned-directory');
    fs.mkdirSync(sentinelDir);
    fs.writeFileSync(path.join(sentinelDir, 'sentinel.txt'), 'keep\n', 'utf8');

    const outputDir = path.join(tempRoot, 'invalid<name');
    const result = runGenerator([outputDir]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /EINVAL|ENOENT|invalid|no such file|filename|syntax/i);
    assert.equal(fs.existsSync(outputDir), false);
    assert.deepEqual(listStagingDirs(tempRoot), []);
    assert.equal(fs.readFileSync(path.join(sentinelDir, 'sentinel.txt'), 'utf8'), 'keep\n');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('public demo generator creates V2.1.1 package with real preflight record and safe manifest', () => {
  const tempRoot = makeTempRoot();
  try {
    const outputDir = path.join(tempRoot, 'public-demo-v2.1.1');
    assert.deepEqual(listStagingDirs(tempRoot), []);

    const result = runGenerator([outputDir]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.existsSync(outputDir), true);
    assert.deepEqual(listStagingDirs(tempRoot), []);
    assert.doesNotMatch(result.stdout, new RegExp(tempRoot.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')));

    const summary = JSON.parse(result.stdout);
    assert.equal(summary.output_directory, '<output-directory>');
    assert.equal(summary.demo_version, 'public-demo-v2.1.1');
    assert.equal(summary.input_record_count, 21);
    assert.deepEqual(summary.source_distribution, {
      CNKI: 11,
      Wanfang: 2,
      VIP: 3,
      SinoMed: 2,
      PubMed: 3,
    });
    assert.equal(summary.dedup_engine_stats.inputRecords, 21);
    assert.equal(summary.dedup_engine_stats.retainedRecords, 20);
    assert.equal(summary.dedup_engine_stats.hardDuplicateCount, 1);
    assert.equal(summary.dedup_engine_stats.candidateDuplicateCount, 1);
    assert.equal(summary.prisma_counts.recordsImported, 21);
    assert.equal(summary.prisma_counts.duplicatesRemoved, 1);
    assert.equal(summary.prisma_counts.titleAbstractIncluded, 19);
    assert.equal(summary.prisma_counts.titleAbstractExcluded, 1);

    const generationRecord = readJson(path.join(outputDir, 'GENERATION_RECORD.json'));
    assert.equal(generationRecord.demo_version, 'public-demo-v2.1.1');
    assert.equal(generationRecord.generation_command, 'node scripts/generate-public-demo-delivery.mjs <output-directory>');
    assert.equal(generationRecord.input_record_count, 21);
    assert.equal(generationRecord.output_file_count, summary.output_file_count);
    assert.equal(generationRecord.manifest_sha256, summary.manifest_sha256);
    assert.equal(generationRecord.generator_sha256, sha256File(generatorPath));
    assert.equal(generationRecord.input_sha256, sha256File(path.join(repoRoot, 'literature-screening-v2.2', 'sample-data.json')));
    assert.equal(generationRecord.source_classification_schema.native_engine_output, undefined);
    assert.ok(generationRecord.source_classification_schema.engine_output_wrapped);
    assert.ok(generationRecord.staging_and_publish_strategy.includes('fs.renameSync'));
    assert.equal(generationRecord.test_status.length, 6);
    assert.equal(generationRecord.test_status.some((entry) => entry.command.includes('public-demo-generator')), false);
    generationRecord.test_status.forEach((entry) => {
      assert.equal(entry.exit_code, 0, entry.command);
      assert.equal(entry.fail, 0, entry.command);
      assert.equal(entry.cancelled, 0, entry.command);
      assert.ok(entry.pass > 0, JSON.stringify(entry));
    });

    const generationSources = readJson(path.join(outputDir, 'evidence', 'generation_sources.json'));
    const sourcePaths = generationSources.sources.map((source) => source.relative_path);
    assert.ok(sourcePaths.includes('tests/demo/public-demo-consistency.test.mjs'));
    assert.ok(sourcePaths.includes('tests/demo/public-demo-generator.test.mjs'));
    assert.ok(sourcePaths.includes('scripts/public-demo-safety.mjs'));
    generationSources.sources.forEach((source) => {
      const abs = path.join(repoRoot, source.relative_path);
      assert.equal(fs.statSync(abs).size, source.size, source.relative_path);
      assert.equal(sha256File(abs), source.sha256, source.relative_path);
    });

    const manifestText = fs.readFileSync(path.join(outputDir, '09_OUTPUT_MANIFEST.md'), 'utf8');
    assert.match(manifestText, /engine_api/);
    assert.doesNotMatch(manifestText, /native_engine_output/);
    const manifestRows = readManifestRows(outputDir);
    assert.equal(manifestRows.length, walkFiles(outputDir).length - 2);
    manifestRows.forEach((row) => {
      const abs = path.join(outputDir, row.fileName);
      assert.equal(fs.statSync(abs).size, row.fileSizeBytes, row.fileName);
      assert.equal(sha256File(abs), row.sha256, row.fileName);
    });

    const byFileName = new Map(manifestRows.map((row) => [row.fileName, row]));
    assert.equal(byFileName.get('evidence/dedup_summary.json').sourceType, 'generator_derived');
    assert.equal(byFileName.get('evidence/dedup_summary.json').engineApi, 'DedupEngine.run');
    assert.equal(byFileName.get('evidence/prisma_counts.json').sourceType, 'engine_output_wrapped');
    assert.equal(byFileName.get('evidence/prisma_counts.json').engineApi, 'AuditEngine.buildPrismaCountsJson');
    assert.equal(byFileName.get('evidence/dual_review_agreement.json').sourceType, 'engine_output_wrapped');
    assert.equal(byFileName.get('evidence/dual_review_agreement.json').engineApi, 'DualReviewEngine.serializeDualReviewAgreementJson');
    assert.equal(byFileName.get('05_DUAL_REVIEW_SUMMARY.md').sourceType, 'structure_example');
    assert.equal(byFileName.get('00_README.md').sourceType, 'human_authored_template');

    const dualReviewSummary = fs.readFileSync(path.join(outputDir, '05_DUAL_REVIEW_SUMMARY.md'), 'utf8');
    assert.match(dualReviewSummary, /paired decisions 为 0/);
    assert.match(dualReviewSummary, /不代表已经完成双审/);

    walkFiles(outputDir)
      .filter((file) => ['.md', '.json', '.csv', '.svg'].includes(path.extname(file)))
      .forEach((file) => {
        assert.equal(hasLocalAbsolutePathLeak(fs.readFileSync(file, 'utf8')), false, file);
      });

    const secondRun = runGenerator([outputDir]);
    assert.notEqual(secondRun.status, 0);
    assert.match(secondRun.stderr, /Refusing to overwrite non-empty output directory/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
