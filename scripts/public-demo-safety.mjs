import fs from 'node:fs';
import path from 'node:path';

function pathKey(absPath) {
  const resolved = path.resolve(absPath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function resolvePathWithRealParent(targetPath, cwd = process.cwd()) {
  const absolutePath = path.resolve(cwd, targetPath);
  let probe = absolutePath;
  const missingSegments = [];

  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    missingSegments.unshift(path.basename(probe));
    probe = parent;
  }

  const canonicalBase = fs.existsSync(probe) ? fs.realpathSync.native(probe) : probe;
  return path.resolve(canonicalBase, ...missingSegments);
}

export function isSameOrDescendantPath(candidatePath, parentPath) {
  const candidate = pathKey(candidatePath);
  const parent = pathKey(parentPath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function validateSafeOutputPath(outputArg, { repoRoot, protectedDirs }) {
  if (!outputArg) throw new Error('Missing output directory argument.');
  const outputDir = path.resolve(outputArg);
  if (!path.isAbsolute(outputDir)) throw new Error('Could not resolve output directory to an absolute path.');

  const canonicalOutputDir = resolvePathWithRealParent(outputDir);
  const canonicalRepoRoot = resolvePathWithRealParent(repoRoot);
  if (isSameOrDescendantPath(canonicalOutputDir, canonicalRepoRoot)) {
    throw new Error('Output directory must not be the PRISMA repository root or inside the PRISMA repository.');
  }

  for (const protectedDir of protectedDirs) {
    const canonicalProtectedDir = resolvePathWithRealParent(protectedDir);
    if (isSameOrDescendantPath(canonicalOutputDir, canonicalProtectedDir)) {
      throw new Error(`Output directory is inside read-only protected delivery tree: ${path.basename(protectedDir)}.`);
    }
  }

  if (fs.existsSync(outputDir)) {
    const stat = fs.statSync(outputDir);
    if (stat.isFile()) throw new Error('Output target already exists as a file.');
    if (!stat.isDirectory()) throw new Error('Output target exists but is not a directory.');
    if (fs.readdirSync(outputDir).length > 0) throw new Error('Refusing to overwrite non-empty output directory.');
    throw new Error('Output directory already exists; atomic publish requires the final path to be absent.');
  }

  return outputDir;
}

const ABSOLUTE_PATH_PATTERNS = [
  {
    kind: 'file_uri_windows_drive',
    regex: /\bfile:\/\/\/[A-Za-z]:\/(?:[^\s<>"'|]+\/?)*/gi,
  },
  {
    kind: 'windows_drive_backslash',
    regex: /\b[A-Za-z]:\\{1,2}(?:[^\\/\r\n:*?"<>|]+\\{1,2})*[^\\/\r\n:*?"<>|]*/g,
  },
  {
    kind: 'windows_drive_slash',
    regex: /\b[A-Za-z]:\/(?:[^\s<>"'|]+\/?)*/g,
  },
  {
    kind: 'unc_path',
    regex: /\\{2,}(?![.?]\\)[A-Za-z0-9._$-]+\\{1,2}[A-Za-z0-9._$-]+(?:\\{1,2}[^\s<>"'|]+)*/g,
  },
  {
    kind: 'unix_user_path',
    regex: /(?:^|[\s"'(])\/(?:Users|home)\/[^\s<>"']+(?:\/[^\s<>"']+)*/g,
  },
];

export function findLocalAbsolutePathLeaks(text) {
  const value = String(text ?? '');
  const findings = [];

  for (const pattern of ABSOLUTE_PATH_PATTERNS) {
    pattern.regex.lastIndex = 0;
    for (const match of value.matchAll(pattern.regex)) {
      findings.push({ kind: pattern.kind, match: match[0].trim(), index: match.index });
    }
  }

  return findings;
}

export function hasLocalAbsolutePathLeak(text) {
  return findLocalAbsolutePathLeaks(text).length > 0;
}
