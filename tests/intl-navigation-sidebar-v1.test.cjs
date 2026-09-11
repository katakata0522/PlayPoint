'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const locales = ['en', 'ko', 'tw'];

function read(locale, file) {
  return fs.readFileSync(path.join(root, locale, 'articles', file), 'utf8');
}

function nextWidget(html) {
  return html.match(/<section class="sidebar-widget sidebar-widget--next[^>]*>[\s\S]*?<\/section>/i)?.[0] || '';
}

test('reference, troubleshooting, and calculator-bridge articles receive different next-step contracts', () => {
  for (const locale of locales) {
    const reference = nextWidget(read(locale, 'google-play-points-join-eligibility.html'));
    const trouble = nextWidget(read(locale, 'google-play-points-not-showing.html'));
    const calculator = nextWidget(read(locale, 'google-play-points-fastest-silver.html'));

    assert.match(reference, /sidebar-widget--role-reference/, locale + ': reference role class');
    assert.match(reference, /href="#related-guides"/, locale + ': reference role should continue to contextual guides');

    assert.match(trouble, /sidebar-widget--role-troubleshooting/, locale + ': troubleshooting role class');
    assert.match(trouble, new RegExp(`href="/${locale}/articles/#intl-hub-trouble"`), locale + ': troubleshooting role should continue to troubleshooting hub');

    assert.match(calculator, /sidebar-widget--role-calculator_bridge/, locale + ': calculator role class');
    assert.match(calculator, new RegExp(`href="/${locale}/"`), locale + ': calculator role should open the locale calculator');
  }
});

test('article breadcrumbs include the localized category between guide hub and article title', () => {
  for (const locale of locales) {
    const html = read(locale, 'google-play-points-not-showing.html');
    const breadcrumbs = html.match(/<div class="breadcrumbs-wrapper intl-article-breadcrumbs">[\s\S]*?<\/div>/i)?.[0] || '';
    assert.match(breadcrumbs, /intl-breadcrumb-category/, locale + ': category breadcrumb');
    assert.match(breadcrumbs, new RegExp(`href="/${locale}/articles/#intl-hub-trouble"`), locale + ': troubleshooting category destination');
  }
});

test('article author boxes surface both the local operator profile and KatakataLab', () => {
  for (const locale of locales) {
    const html = read(locale, 'google-play-points-country-change.html');
    const author = html.match(/<aside[^>]*class="author-box"[\s\S]*?<\/aside>/i)?.[0] || '';
    assert.match(author, /author-box-links/, locale + ': enhanced author links');
    assert.match(author, new RegExp(`href="/${locale}/author/katakata\.html"`), locale + ': localized author profile');
    assert.match(author, /katakatalab\.com\/who-is-katakata\.html/, locale + ': KatakataLab profile');
  }
});

test('guide hubs get a generic next-step card while operator pages avoid a redundant operator card', () => {
  for (const locale of locales) {
    const hub = fs.readFileSync(path.join(root, locale, 'articles', 'index.html'), 'utf8');
    const policy = fs.readFileSync(path.join(root, locale, 'author', 'katakata.html'), 'utf8');
    assert.match(hub, /sidebar-widget--next/, locale + ': guide hub next step');
    assert.match(hub, new RegExp(`href="/${locale}/"`), locale + ': guide hub calculator route');
    assert.match(hub, /sidebar-author-card/, locale + ': guide hub operator trust card');
    assert.doesNotMatch(policy, /sidebar-author-card/, locale + ': operator page must not repeat its own mini profile');
  }
});

test('Play country switcher exposes all six supported calculator regions', () => {
  const destinations = ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/'];
  for (const locale of locales) {
    const html = read(locale, 'google-play-points-not-showing.html');
    const switcher = html.match(/<details class="site-region-switcher">[\s\S]*?<\/details>/i)?.[0] || '';
    for (const href of destinations) {
      if (href === `/${locale}/`) continue;
      assert.ok(switcher.includes(`href="${href}"`), `${locale}: ${href}`);
    }
  }
});

test('visible category breadcrumbs are paired with BreadcrumbList structured data', () => {
  for (const locale of locales) {
    const html = read(locale, 'google-play-points-not-showing.html');
    const match = html.match(/<script type="application\/ld\+json" data-intl-breadcrumbs>([\s\S]*?)<\/script>/i);
    assert.ok(match, `${locale}: managed BreadcrumbList`);
    const schema = JSON.parse(match[1]);
    assert.strictEqual(schema['@type'], 'BreadcrumbList', `${locale}: schema type`);
    assert.strictEqual(schema.itemListElement.at(-1).item, `https://playpoint-sim.com/${locale}/articles/google-play-points-not-showing.html`, `${locale}: current URL`);
    assert.ok(schema.itemListElement.some(item => item.item === `https://playpoint-sim.com/${locale}/articles/#intl-hub-trouble`), `${locale}: category URL`);
  }
});

test('guide hub BreadcrumbList ends at the canonical directory URL', () => {
  for (const locale of locales) {
    const html = fs.readFileSync(path.join(root, locale, 'articles', 'index.html'), 'utf8');
    const match = html.match(/<script type="application\/ld\+json" data-intl-breadcrumbs>([\s\S]*?)<\/script>/i);
    assert.ok(match, `${locale}: hub BreadcrumbList`);
    const schema = JSON.parse(match[1]);
    assert.strictEqual(schema.itemListElement.at(-1).item, `https://playpoint-sim.com/${locale}/articles/`, `${locale}: hub canonical URL`);
  }
});

