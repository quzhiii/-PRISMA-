import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadAllDatasets } from './load-records.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);

const targets = {
  'root-app': {
    id: 'root-app',
    label: 'Frozen root app inline dedup baseline',
    entrypoint: 'app.js performScreening dedup block (pre-vNext baseline)',
    run(records) {
      return runCurrentRootAppDedup(records);
    },
  },
  'dedup-vnext': {
    id: 'dedup-vnext',
    label: 'Shared dedup engine with hard/candidate split',
    entrypoint: 'dedup-engine.js run()',
    run(records, { repoRoot }) {
      return loadSharedDedupEngine(repoRoot).run(records);
    },
  },
};

export async function runBenchmark({ target = 'root-app', datasetId = null, repoRoot = defaultRepoRoot } = {}) {
  const resolvedTarget = targets[target];
  if (!resolvedTarget) {
    throw new Error(`Unknown target: ${target}`);
  }

  const { datasets } = await loadAllDatasets({ repoRoot });
  const selectedDatasets = datasetId
    ? datasets.filter((dataset) => dataset.datasetId === datasetId)
    : datasets;

  if (datasetId && selectedDatasets.length === 0) {
    throw new Error(`Unknown dataset: ${datasetId}`);
  }

  const datasetResults = selectedDatasets.map((dataset) => {
    const outcome = resolvedTarget.run(dataset.records, { repoRoot });
    const summary = summarizeOutcome(outcome);

    return {
      datasetId: dataset.datasetId,
      sourceType: dataset.sourceType,
      sourceSystem: dataset.sourceSystem,
      fileFormat: dataset.fileFormat,
      containsRealData: dataset.containsRealData,
      inputRecords: dataset.records.length,
      retainedRecords: summary.retainedRecords,
      duplicateRecords: summary.hardDuplicateRecords,
      hardDuplicateRecords: summary.hardDuplicateRecords,
      candidateDuplicatePairs: summary.candidateDuplicatePairs,
      duplicateLikeFindings: summary.duplicateLikeFindings,
      stats: summary.stats,
      reasons: summary.reasons,
    };
  });

  const totals = datasetResults.reduce(
    (accumulator, dataset) => {
      accumulator.inputRecords += dataset.inputRecords;
      accumulator.retainedRecords += dataset.retainedRecords;
      accumulator.duplicateRecords += dataset.duplicateRecords;
      accumulator.hardDuplicateRecords += dataset.hardDuplicateRecords;
      accumulator.candidateDuplicatePairs += dataset.candidateDuplicatePairs;
      accumulator.duplicateLikeFindings += dataset.duplicateLikeFindings;
      return accumulator;
    },
    {
      inputRecords: 0,
      retainedRecords: 0,
      duplicateRecords: 0,
      hardDuplicateRecords: 0,
      candidateDuplicatePairs: 0,
      duplicateLikeFindings: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    target: resolvedTarget.id,
    targetLabel: resolvedTarget.label,
    targetEntrypoint: resolvedTarget.entrypoint,
    fixtureCount: datasetResults.length,
    totals,
    datasets: datasetResults,
  };
}

export async function main(argv = process.argv.slice(2), {
  repoRoot = defaultRepoRoot,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const options = parseArgs(argv);

  if (options.help) {
    stdout.write(`${buildUsage()}\n`);
    return 0;
  }

  try {
    const result = await runBenchmark({
      target: options.target,
      datasetId: options.datasetId,
      repoRoot,
    });
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify({ error: error.message }, null, 2)}\n`);
    return 1;
  }
}

function parseArgs(argv) {
  const options = {
    target: 'root-app',
    datasetId: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    if (argument === '--target') {
      options.target = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (argument === '--dataset') {
      options.datasetId = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function buildUsage() {
  return [
    'Usage: node scripts/dedup/run-benchmark.mjs --target <target> [--dataset <datasetId>]',
    '',
    'Targets:',
    '  root-app      Frozen root app inline dedup baseline',
    '  dedup-vnext   Shared dedup engine with hard/candidate split',
  ].join('\n');
}

function loadSharedDedupEngine(repoRoot) {
  return requireFromRepo(path.join(repoRoot, 'dedup-engine.js'));
}

function runCurrentRootAppDedup(records) {
  const normalized = records.map((record) => ({
    ...record,
    _normalized_title: normalizeTitle(record.title),
    _lang: detectLanguage(`${readField(record, 'title')} ${readField(record, 'abstract')}`),
  }));

  const seen = new Set();
  const deduped = [];
  const duplicates = [];
  const doiMap = Object.create(null);

  normalized.forEach((record) => {
    const doi = readField(record, 'doi');
    const titleKey = `title:${record._normalized_title}`;

    if (doi) {
      const doiKey = `doi:${doi.toLowerCase().trim()}`;
      if (doiMap[doiKey]) {
        duplicates.push(record);
        return;
      }
      doiMap[doiKey] = true;
      seen.add(doiKey);
      deduped.push(record);
      return;
    }

    if (seen.has(titleKey)) {
      duplicates.push(record);
      return;
    }

    seen.add(titleKey);
    deduped.push(record);
  });

  return {
    retainedRecords: deduped,
    duplicates,
    hardDuplicates: duplicates.map((record) => ({ duplicateRecord: record })),
    candidateDuplicates: [],
    stats: {
      inputRecords: normalized.length,
      retainedRecords: deduped.length,
      duplicateRecords: duplicates.length,
      hardDuplicateCount: duplicates.length,
      candidateDuplicateCount: 0,
    },
    reasons: {
      hard: {},
      candidate: {},
    },
  };
}

function summarizeOutcome(outcome) {
  const retainedRecords = Array.isArray(outcome.retainedRecords) ? outcome.retainedRecords.length : 0;
  const hardDuplicateRecords = Array.isArray(outcome.hardDuplicates)
    ? outcome.hardDuplicates.length
    : Array.isArray(outcome.duplicates)
      ? outcome.duplicates.length
      : 0;
  const candidateDuplicatePairs = Array.isArray(outcome.candidateDuplicates) ? outcome.candidateDuplicates.length : 0;

  return {
    retainedRecords,
    hardDuplicateRecords,
    candidateDuplicatePairs,
    duplicateLikeFindings: hardDuplicateRecords + candidateDuplicatePairs,
    stats: {
      ...(outcome.stats || {}),
      hardDuplicateCount: outcome.stats?.hardDuplicateCount ?? hardDuplicateRecords,
      candidateDuplicateCount: outcome.stats?.candidateDuplicateCount ?? candidateDuplicatePairs,
    },
    reasons: outcome.reasons || { hard: {}, candidate: {} },
  };
}

function readField(record, fieldName) {
  return String(record?.[fieldName] ?? '').trim();
}

function normalizeTitle(title) {
  return readField({ value: title }, 'value')
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLanguage(text) {
  if (!text || text.trim().length === 0) {
    return 'english';
  }

  const cjkPattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/;
  return cjkPattern.test(text) ? 'chinese' : 'english';
}

const isCliInvocation = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCliInvocation) {
  const exitCode = await main();
  process.exitCode = exitCode;
}
