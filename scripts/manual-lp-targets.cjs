'use strict';

const MANUAL_LP_SLUGS = Object.freeze([
  'status/silver',
  'status/gold',
  'status/platinum',
  'status/diamond',
  'campaign/2x',
  'campaign/3x',
  'campaign/wait'
]);

const MANUAL_LP_FILES = Object.freeze(
  MANUAL_LP_SLUGS.map(slug => `${slug}/index.html`)
);

module.exports = {
  MANUAL_LP_FILES,
  MANUAL_LP_SLUGS
};
