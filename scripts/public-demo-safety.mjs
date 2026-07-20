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

export function derivePrimaryRepositoryRootFromGitCommonDir(gitCommonDir) {
  const rawCommonDir = String(gitCommonDir || '').trim();
  if (!rawCommonDir) throw new Error('Git common dir is empty; refusing to resolve protected delivery paths.');
  if (!path.isAbsolute(rawCommonDir)) throw new Error('Git common dir must be absolute; refusing to resolve protected delivery paths.');

  const commonDir = path.resolve(rawCommonDir);
  if (path.basename(commonDir).toLowerCase() !== '.git') {
    throw new Error('Git common dir must resolve to the primary repository .git directory.');
  }
  return path.dirname(commonDir);
}

export function resolvePrimaryRepositoryRootFromGitCommonDir(gitCommonDir) {
  const primaryRepositoryRoot = derivePrimaryRepositoryRootFromGitCommonDir(gitCommonDir);
  const commonDir = path.resolve(String(gitCommonDir).trim());
  if (!fs.existsSync(commonDir) || !fs.statSync(commonDir).isDirectory()) {
    throw new Error('Git common dir does not exist or is not a directory; refusing to resolve protected delivery paths.');
  }
  if (!fs.existsSync(primaryRepositoryRoot) || !fs.statSync(primaryRepositoryRoot).isDirectory()) {
    throw new Error('Primary repository root does not exist or is not a directory; refusing to resolve protected delivery paths.');
  }
  return fs.realpathSync.native(primaryRepositoryRoot);
}

export function buildProtectedDeliveryDirs(primaryRepositoryRoot) {
  const root = String(primaryRepositoryRoot || '').trim();
  if (!root) throw new Error('Primary repository root is required to resolve protected delivery paths.');
  const deliveryRoot = path.resolve(root, '..', 'PRISMA-demo-delivery');
  return ['public-demo-v1', 'public-demo-v2', 'public-demo-v2.1', 'public-demo-v2.1.1'].map((name) => path.join(deliveryRoot, name));
}

export function validateSafeOutputPath(outputArg, { checkoutRoot, primaryRepositoryRoot, protectedDirs, cwd = process.cwd() }) {
  if (!outputArg) throw new Error('Missing output directory argument.');
  if (!checkoutRoot) throw new Error('Current checkout root is required for output path validation.');
  if (!primaryRepositoryRoot) throw new Error('Primary repository root is required for output path validation.');
  const outputDir = path.resolve(cwd, outputArg);
  if (!path.isAbsolute(outputDir)) throw new Error('Could not resolve output directory to an absolute path.');

  const canonicalOutputDir = resolvePathWithRealParent(outputDir);
  const protectedRepositoryRoots = [
    ['current checkout', checkoutRoot],
    ['primary repository', primaryRepositoryRoot],
  ];

  for (const [label, protectedRoot] of protectedRepositoryRoots) {
    const canonicalProtectedRoot = resolvePathWithRealParent(protectedRoot);
    if (isSameOrDescendantPath(canonicalOutputDir, canonicalProtectedRoot)) {
      throw new Error(`Output directory must not be a PRISMA repository root or inside the PRISMA repository (${label}).`);
    }
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
