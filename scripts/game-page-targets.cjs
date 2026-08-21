'use strict';

const fs = require('node:fs');
const path = require('node:path');

const GAME_LOCALE_DIRECTORIES = Object.freeze(['', 'en', 'ko', 'tw']);
const GAME_GENERATOR_FILE = 'scripts/generate-game-simulators.cjs';

function toPosixRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).replaceAll('\\', '/');
}

function getGameContentDate(rootDir) {
  const generatorPath = path.join(rootDir, GAME_GENERATOR_FILE);
  const source = fs.readFileSync(generatorPath, 'utf8');
  const match = source.match(/const GAME_CONTENT_UPDATED_AT = '(\d{4}-\d{2}-\d{2})';/);

  if (!match) {
    throw new Error(`Could not resolve GAME_CONTENT_UPDATED_AT from ${GAME_GENERATOR_FILE}`);
  }

  return match[1];
}

function getGamePageHtmlFiles(rootDir) {
  const files = [];

  for (const localeDirectory of GAME_LOCALE_DIRECTORIES) {
    const gamesDirectory = path.join(rootDir, localeDirectory, 'games');
    if (!fs.existsSync(gamesDirectory)) continue;

    const portalPath = path.join(gamesDirectory, 'index.html');
    if (fs.existsSync(portalPath)) {
      files.push(toPosixRelative(rootDir, portalPath));
    }

    const gameDirectories = fs.readdirSync(gamesDirectory, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const gameDirectory of gameDirectories) {
      const indexPath = path.join(gamesDirectory, gameDirectory.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        files.push(toPosixRelative(rootDir, indexPath));
      }
    }
  }

  return files;
}

module.exports = {
  GAME_GENERATOR_FILE,
  GAME_LOCALE_DIRECTORIES,
  getGameContentDate,
  getGamePageHtmlFiles
};