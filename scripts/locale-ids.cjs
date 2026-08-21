'use strict';

// Keep locale identifiers in a dependency-free leaf module so build, audit,
// sitemap, and generator-target helpers can share them without creating
// CommonJS dependency cycles.
const INTERNATIONAL_LOCALES = Object.freeze(['en', 'ko', 'tw']);
const SITE_LOCALES = Object.freeze(['ja', ...INTERNATIONAL_LOCALES]);
const GAME_LOCALE_DIRECTORIES = Object.freeze(['', ...INTERNATIONAL_LOCALES]);

module.exports = {
  GAME_LOCALE_DIRECTORIES,
  INTERNATIONAL_LOCALES,
  SITE_LOCALES
};
