'use strict';
const assert = require('node:assert/strict');

// 静的配信の識別子と順序だけを読む。レイアウト・可視性はChromiumが担当する。
function openingTags(html) {
  const tags = [];
  const tokens = /<!--[\s\S]*?(?:-->|$)|<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)|<([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  for (const token of html.matchAll(tokens)) {
    if (!token[2]) continue;
    const attrs = Object.create(null);
    for (const attr of token[0].matchAll(/\s([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4];
    }
    tags.push({ tag: token[2].toLowerCase(), attrs, index: token.index });
  }
  return tags;
}
function assertOrderedAttributes(html, attribute, values, label) {
  const tags = openingTags(html);
  let previous = -1;
  for (const value of values) {
    const matches = tags.filter(tag => tag.attrs[attribute] === value);
    assert.equal(matches.length, 1, `${label}: ${attribute}=${value} が1個必要`);
    assert.ok(matches[0].index > previous, `${label}: ${value} の順序が逆`);
    previous = matches[0].index;
  }
}
module.exports = { openingTags, assertOrderedAttributes };
