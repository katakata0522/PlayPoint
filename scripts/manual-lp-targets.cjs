'use strict';

// FAQ同期の対象。可視FAQとFAQPageの契約を持つ手書きLPだけを列挙する。
const MANUAL_LP_SLUGS = Object.freeze([
  'status/silver',
  'status/gold',
  'status/platinum',
  'status/diamond',
  'campaign/2x',
  'campaign/3x',
  'campaign/wait'
]);

// hreflang同期はFAQの有無とは独立した責務として管理する。
// amount/10000 は海外3地域に同等入口があるため相互alternateの対象だが、
// FAQ同期対象へは含めない。
const MANUAL_LP_HREFLANG_SLUGS = Object.freeze([
  ...MANUAL_LP_SLUGS,
  'amount/10000'
]);

const MANUAL_LP_FILES = Object.freeze(
  MANUAL_LP_SLUGS.map(slug => `${slug}/index.html`)
);

module.exports = {
  MANUAL_LP_FILES,
  MANUAL_LP_HREFLANG_SLUGS,
  MANUAL_LP_SLUGS
};
