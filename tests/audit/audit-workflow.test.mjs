import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

async function readV22App() {
  return fs.readFile(path.join(repoRoot, 'literature-screening-v2.2/app.js'), 'utf8');
}

test('v2.2 app persists audit state in project snapshots', async () => {
  const source = await readV22App();

  assert.match(source, /let projectManifest = null;/);
  assert.match(source, /let auditEvents = \[\];/);
  assert.match(source, /let screeningDecisions = \[\];/);
  assert.match(source, /function appendAuditEventsSafe/);
  assert.match(source, /function upsertScreeningDecisionSafe/);
  assert.match(source, /projectManifest: ensureProjectManifest\(\)/);
  assert.match(source, /auditEvents,/);
  assert.match(source, /screeningDecisions/);
});

test('v2.2 app records audit events across the review workflow', async () => {
  const source = await readV22App();
  const requiredEventTypes = [
    'record_imported',
    'hard_duplicate_removed',
    'candidate_duplicate_flagged',
    'rule_screening_decision',
    'manual_screening_decision',
    'quality_appraisal_started',
    'quality_appraisal_updated',
    'export_generated',
  ];

  requiredEventTypes.forEach((eventType) => {
    assert.match(source, new RegExp(`eventType: '${eventType}'`));
  });
});

test('v2.2 app writes durable screening decisions for rule and full-text stages', async () => {
  const source = await readV22App();

  assert.match(source, /stage: 'title_abstract'/);
  assert.match(source, /stage: 'full_text'/);
  assert.match(source, /source: 'rule'/);
  assert.match(source, /source: 'human'/);
  assert.match(source, /normalizeAuditExclusionReason/);
});
