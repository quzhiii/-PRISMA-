import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const requireFromRepo = createRequire(import.meta.url);
const ImportJobRuntime = requireFromRepo(path.join(repoRoot, 'literature-screening-v2.0/import-job-runtime.js'));

test('import job runtime creates queued jobs with file metadata', () => {
  const job = ImportJobRuntime.createImportJob({
    projectId: 'project-1',
    fileName: 'sample.ris',
    fileSize: 4096,
    format: '.ris',
  });

  assert.equal(job.project_id, 'project-1');
  assert.equal(job.file_name, 'sample.ris');
  assert.equal(job.stage, ImportJobRuntime.IMPORT_JOB_STAGES.QUEUED);
  assert.equal(job.bytes_read, 0);
  assert.equal(job.records_parsed, 0);
});

test('import job runtime patches stage and progress without losing identity', () => {
  const job = ImportJobRuntime.createImportJob({
    projectId: 'project-1',
    fileName: 'sample.ris',
  });

  const parsingJob = ImportJobRuntime.patchImportJob(job, {
    stage: ImportJobRuntime.IMPORT_JOB_STAGES.PARSING,
    bytesRead: 1024,
    recordsParsed: 48,
  });

  assert.equal(parsingJob.id, job.id);
  assert.equal(parsingJob.stage, ImportJobRuntime.IMPORT_JOB_STAGES.PARSING);
  assert.equal(parsingJob.bytes_read, 1024);
  assert.equal(parsingJob.records_parsed, 48);
});

test('import job runtime summarizes active and completed jobs', () => {
  const active = ImportJobRuntime.createImportJob({
    fileName: 'active.csv',
    stage: ImportJobRuntime.IMPORT_JOB_STAGES.PARSING,
  });
  const completed = ImportJobRuntime.patchImportJob(
    ImportJobRuntime.createImportJob({ fileName: 'done.nbib' }),
    { stage: ImportJobRuntime.IMPORT_JOB_STAGES.COMPLETED, recordsWritten: 120 }
  );

  const summary = ImportJobRuntime.summarizeImportJobs([active, completed]);

  assert.equal(summary.totalJobs, 2);
  assert.equal(summary.activeCount, 1);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.byStage[ImportJobRuntime.IMPORT_JOB_STAGES.PARSING], 1);
  assert.equal(summary.byStage[ImportJobRuntime.IMPORT_JOB_STAGES.COMPLETED], 1);
});
