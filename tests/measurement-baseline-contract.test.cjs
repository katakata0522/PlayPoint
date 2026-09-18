'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PHASE2_MEASUREMENT_BASELINE: baseline } = require('../scripts/measurement-baseline.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function inclusiveDays(start, end) {
  const day = 24 * 60 * 60 * 1000;
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / day) + 1;
}

test('Phase 2 baseline fixes one comparable pre-change window and user-count semantics', () => {
  assert.equal(baseline.id, 'phase2-pre-change-2026-09-15');
  assert.equal(baseline.recordedAt, '2026-09-15');
  assert.equal(inclusiveDays(baseline.sourceWindow.start, baseline.sourceWindow.end), baseline.sourceWindow.days);
  assert.equal(baseline.sourceWindow.days, 7);
  assert.equal(baseline.decisionUnits.primaryUserUnit, 'activeUsers');
  assert.equal(baseline.decisionUnits.diagnosticCountUnit, 'eventCount');
  assert.equal(baseline.decisionUnits.unavailableValue, 'UNAVAILABLE');
  assert.match(baseline.decisionUnits.rule, /Never coerce unavailable measurement to zero/);
});

test('GA4 baseline distinguishes API-confirmed state from manual-only DebugView evidence', () => {
  assert.equal(baseline.ga4.keyEvents.calculation_completed, 'confirmed');
  assert.equal(baseline.ga4.keyEvents.reverse_calculation_completed, 'optional_unregistered');
  assert.equal(baseline.ga4.customDimensions.entry_source_path, 'confirmed');
  assert.equal(baseline.ga4.customDimensions.entry_link_context, 'confirmed');
  assert.equal(baseline.ga4.customDimensions.calculator_preset, 'confirmed');
  assert.equal(baseline.ga4.customDimensions.app_display_mode, 'unregistered_as_of_2026-09-10');
  assert.equal(baseline.ga4.debugView, 'manual_verification_required');
  assert.deepEqual(baseline.ga4.eventCounts, {
    calculator_form_started: 36,
    calculation_completed: 70,
    reverse_calculation_completed: 7,
    calculator_funnel_completed: 28
  });
});

test('measurement contract forbids raw calculator and diary values and respects consent', () => {
  const contract = baseline.ga4.privacyContract;
  assert.equal(contract.rawSpendingAmount, 'forbidden');
  assert.equal(contract.rawNeededPoints, 'forbidden');
  assert.equal(contract.rawEarnedPoints, 'forbidden');
  assert.equal(contract.rawDiaryContent, 'forbidden');
  assert.equal(contract.beforeConsent, 'do_not_send');
  assert.equal(contract.afterDenial, 'do_not_send');
});

test('Search Console baseline keeps Raw, Normalized and Property Total as separate evidence layers', () => {
  assert.deepEqual(baseline.searchConsole.layers.map(layer => layer.id), ['raw', 'normalized', 'property_total']);
  const raw = baseline.searchConsole.layers[0];
  const normalized = baseline.searchConsole.layers[1];
  const total = baseline.searchConsole.layers[2];
  assert.deepEqual(raw.dimensions, ['query', 'exact_url']);
  assert.equal(raw.preserveFragment, true);
  assert.deepEqual(normalized.dimensions, ['query', 'base_url']);
  assert.equal(normalized.preserveFragment, false);
  assert.deepEqual(total.dimensions, []);
  assert.equal(baseline.searchConsole.ga4Comparison, 'organic_search_split_by_search_engine');
  assert.equal(baseline.searchConsole.beforeAfterComparison.seoWindowDays, 28);
  assert.equal(baseline.searchConsole.beforeAfterComparison.overlap, 'forbidden');
  assert.equal(baseline.searchConsole.beforeAfterComparison.compareSameIntent, true);
  assert.equal(baseline.searchConsole.beforeAfterComparison.compareSameMetricDefinitions, true);
  const capture = baseline.searchConsole.captureContract;
  assert.equal(capture.historySheet, '🗃GSC 28日履歴');
  assert.equal(capture.comparisonSheet, '🔍GSC 28日比較');
  assert.deepEqual(capture.dimensions, ['query', 'exact_url']);
  assert.deepEqual(capture.windowRoles, ['current_28d', 'previous_28d']);
  assert.equal(capture.finalDataOnly, true);
  assert.equal(capture.failClosedWhenPairMissing, true);
  assert.deepEqual(capture.idempotencyKey, ['pair_id', 'window_role', 'search_query', 'exact_url']);
  assert.match(capture.rule, /rolling 30-day snapshot/);
  for (const required of ['search_query', 'exact_url', 'period_start', 'period_end', 'clicks', 'impressions', 'ctr', 'avg_position']) {
    assert.ok(capture.requiredColumns.includes(required), `missing GSC capture column: ${required}`);
  }
});

test('AdSense anomaly remains reviewable evidence instead of being silently corrected or removed', () => {
  const anomaly = baseline.adsense.anomalies.find(item => item.date === '2026-08-27');
  assert.ok(anomaly);
  assert.equal(anomaly.ga4PageViews, 42);
  assert.equal(anomaly.adsensePageViews, 630);
  assert.equal(anomaly.status, 'ANOMALY_REVIEW');
  assert.equal(anomaly.autoCorrect, false);
  assert.equal(anomaly.autoExclude, false);
});

test('retention baseline preserves zero versus unavailable and freezes the next review boundary', () => {
  assert.equal(baseline.retention.activeUsers, 309);
  assert.equal(baseline.retention.returningUsers, 18);
  assert.equal(baseline.retention.diaryTabOpenedActiveUsers, 2);
  assert.equal(baseline.retention.diaryEntrySavedActiveUsers, 0);
  assert.equal(baseline.retention.appDisplayModeUsers, 'UNAVAILABLE');
  assert.equal(baseline.comparisonGuardrails.nextReviewDate, '2026-09-25');
  assert.equal(baseline.comparisonGuardrails.minimumObservationDaysAfterEarlySeptemberChanges, 14);
  assert.equal(baseline.comparisonGuardrails.preserveBaseline, true);
});

test('human measurement audit names the same Phase 2 baseline and never claims manual-only checks are complete', () => {
  const audit = read('docs/MEASUREMENT_AUDIT_2026-09-15.md');
  assert.match(audit, /phase2-pre-change-2026-09-15/);
  assert.match(audit, /2026-09-01〜2026-09-07/);
  assert.match(audit, /activeUsers/);
  assert.match(audit, /Raw \/ Normalized \/ Property Total/);
  assert.match(audit, /ANOMALY_REVIEW/);
  assert.match(audit, /DebugView.*未完了|未完了.*DebugView/s);
  assert.doesNotMatch(audit, /DebugView[^\n]{0,60}(完了済み|確認済み)/);
});

test('analytics plan records the confirmed key event without closing DebugView by implication', () => {
  const analytics = read('docs/ANALYTICS.md');
  assert.match(analytics, /2026-09-15 本番点検/);
  assert.match(analytics, /`calculation_completed`[^\n]*Key event[^\n]*確認済み/);
  assert.match(analytics, /DebugView[^\n]*未完了/);
  assert.match(analytics, /app_display_mode[^\n]*未登録/);
});
