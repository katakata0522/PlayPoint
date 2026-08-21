'use strict';

const fs = require('node:fs');
const path = require('node:path');

const GAME_LOCALE_DIRECTORIES = Object.freeze(['', 'en', 'ko', 'tw']);

function toPosixRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).replaceAll('\\', '/');
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
  GAME_LOCALE_DIRECTORIES,
  getGamePageHtmlFiles
};
