'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  PUBLIC_ROOT_FILES,
  PUBLIC_TOP_LEVEL_DIRECTORIES,
  assertPublicRootContract,
  auditRootEntries,
} = require('./public-paths.cjs');

const DEFAULT_SOURCE_ROOT = path.resolve(__dirname, '../..');

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertNoSymlinks(absolutePath, relativePath) {
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    throw new Error(`Symlink is not allowed in the public deployment tree: ${relativePath}`);
  }
  if (!stat.isDirectory()) return;

  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    assertNoSymlinks(path.join(absolutePath, entry.name), childRelative);
  }
}

function copyPublicEntry(sourceRoot, destinationRoot, name) {
  const source = path.join(sourceRoot, name);
  const destination = path.join(destinationRoot, name);
  assertNoSymlinks(source, name);
  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
}

function preparePublicTree(destinationRoot, { sourceRoot = DEFAULT_SOURCE_ROOT } = {}) {
  const source = path.resolve(sourceRoot);
  const destination = path.resolve(destinationRoot || '');
  if (!destinationRoot) throw new Error('A destination directory is required for the public deployment tree.');
  if (isInside(source, destination)) {
    throw new Error(`Public deployment destination must be outside the repository root: ${destination}`);
  }

  const sourceAudit = assertPublicRootContract(source);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });

  for (const name of [...PUBLIC_ROOT_FILES].sort()) copyPublicEntry(source, destination, name);
  for (const name of [...PUBLIC_TOP_LEVEL_DIRECTORIES].sort()) copyPublicEntry(source, destination, name);

  const destinationAudit = auditRootEntries(destination);
  if (destinationAudit.unknown.length > 0 || destinationAudit.nonPublicEntries.length > 0) {
    throw new Error(`Non-public or unclassified entries entered the deployment tree: ${[
      ...destinationAudit.unknown,
      ...destinationAudit.nonPublicEntries,
    ].join(', ')}`);
  }

  const copied = destinationAudit.publicEntries.length;
  console.log(`[public-tree] copied ${copied} public root entries; excluded ${sourceAudit.nonPublicEntries.length} known non-public entries.`);
  return {
    copied,
    destination,
    sourceAudit,
    destinationAudit,
  };
}

if (require.main === module) {
  try {
    const destination = process.argv[2];
    const result = preparePublicTree(destination);
    console.log(`[public-tree] ready: ${result.destination}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_SOURCE_ROOT,
  assertNoSymlinks,
  isInside,
  preparePublicTree,
};
