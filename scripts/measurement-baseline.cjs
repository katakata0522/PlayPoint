'use strict';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const PHASE2_MEASUREMENT_BASELINE = deepFreeze({
  id: 'phase2-pre-change-2026-09-15',
  recordedAt: '2026-09-15',
  sourceWindow: {
    start: '2026-09-01',
    end: '2026-09-07',
    days: 7,
    timezone: 'Asia/Tokyo'
  },
  sourceOfTruth: {
    ga4: 'read-only Admin/Data API audit',
    searchConsole: 'final Search Console data',
    revenue: 'GA4 publisher revenue / AdSense reconciliation inputs'
  },
  decisionUnits: {
    primaryUserUnit: 'activeUsers',
    diagnosticCountUnit: 'eventCount',
    unavailableValue: 'UNAVAILABLE',
    rule: 'Never coerce unavailable measurement to zero.'
  },
  northStar: {
    product: 'organic_landing_to_first_success_rate',
    business: 'revenue_per_successful_calculation'
  },
  ga4: {
    keyEvents: {
      calculation_completed: 'confirmed',
      reverse_calculation_completed: 'optional_unregistered'
    },
    customDimensions: {
      entry_source_path: 'confirmed',
      entry_link_context: 'confirmed',
      calculator_preset: 'confirmed',
      app_display_mode: 'unregistered_as_of_2026-09-10'
    },
    eventCounts: {
      calculator_form_started: 36,
      calculation_completed: 70,
      reverse_calculation_completed: 7,
      calculator_funnel_completed: 28
    },
    debugView: 'manual_verification_required',
    privacyContract: {
      rawSpendingAmount: 'forbidden',
      rawNeededPoints: 'forbidden',
      rawEarnedPoints: 'forbidden',
      rawDiaryContent: 'forbidden',
      beforeConsent: 'do_not_send',
      afterDenial: 'do_not_send'
    }
  },
  searchConsole: {
    layers: [
      {
        id: 'raw',
        dimensions: ['query', 'exact_url'],
        preserveFragment: true,
        aggregationType: 'byPage',
        purpose: 'Preserve the exact query and URL evidence, including fragment-level exposure.'
      },
      {
        id: 'normalized',
        dimensions: ['query', 'base_url'],
        preserveFragment: false,
        aggregationType: 'derived_from_raw',
        derivedFrom: 'raw',
        purpose: 'Make page-level SEO decisions without fragment duplication.'
      },
      {
        id: 'property_total',
        dimensions: [],
        preserveFragment: false,
        aggregationType: 'byProperty',
        purpose: 'Keep total clicks/impressions including anonymous-query contribution.'
      }
    ],
    ga4Comparison: 'organic_search_split_by_search_engine',
    beforeAfterComparison: {
      seoWindowDays: 28,
      overlap: 'forbidden',
      compareSameIntent: true,
      compareSameMetricDefinitions: true
    },
    captureContract: {
      historySheet: '🗃GSC 28日履歴',
      comparisonSheet: '🔍GSC 28日比較',
      normalizedComparisonSheet: '🧹GSC 28日正規化',
      searchType: 'web',
      apiTimezone: 'America/Los_Angeles',
      windowRoles: ['current_28d', 'previous_28d'],
      requiredLayers: ['raw', 'normalized', 'property_total'],
      requiredColumns: [
        'pair_id',
        'window_role',
        'layer',
        'period_start',
        'period_end',
        'record_type',
        'search_query',
        'exact_url',
        'base_url',
        'clicks',
        'impressions',
        'ctr',
        'avg_position',
        'data_state',
        'search_type',
        'dimensions',
        'request_aggregation_type',
        'response_aggregation_type',
        'site_property',
        'api_timezone',
        'fetched_at',
        'source',
        'derivation'
      ],
      finalDataOnly: true,
      idempotencyKey: ['pair_id', 'window_role', 'layer', 'record_type', 'search_query', 'exact_url', 'base_url'],
      failClosedWhenPairMissing: true,
      failClosedWhenLayerMissing: true,
      verifyResponseAggregationType: true,
      rule: 'Never treat a rolling 30-day snapshot as the previous non-overlapping 28-day comparison.'
    }
  },
  analyticsSheetSync: {
    pageValue: {
      sheet: '📊ページ価値ファネル',
      windowDays: 30,
      lagDays: 3,
      primaryUnit: 'activeUsers',
      gscDimensions: ['page'],
      gscAggregationType: 'byPage',
      gscFinalDataOnly: true,
      pageKey: 'normalized_site_relative_path',
      joinIntegrity: {
        metric: 'gsc_click_weighted_to_ga4_organic',
        minimumClicks: 20,
        minimumJoinRate: 0.5,
        unnormalizedAbsoluteUrlForbidden: true
      },
      attributionDimension: 'entry_source_path',
      events: {
        articleToCalculator: 'article_to_calculator_clicked',
        calculatorStart: 'calculator_form_started',
        firstSuccess: 'calculator_funnel_completed'
      },
      pageRevenueSource: 'ga4_publisher_metrics',
      pageRevenueMetrics: [
        'totalAdRevenue',
        'publisherAdImpressions',
        'publisherAdClicks',
        'screenPageViews'
      ],
      adsensePageUrlBreakdownIsPrimary: false,
      unavailableValue: 'blank_not_zero'
    },
    searchCross: {
      sheet: '🔎検索クロス分析',
      ga4OrganicDimension: 'sessionSourceMedium',
      gscDimensions: [
        ['query', 'country'],
        ['query', 'device']
      ],
      gscWindowDays: 28,
      overlap: 'forbidden',
      finalDataOnly: true,
      aggregationType: 'byProperty'
    },
    urlInspection: {
      sheet: '🧭URL検査',
      maxUrlsPerRun: 30,
      selection: ['fixed_critical', 'top_gsc_impressions'],
      mode: 'latest_snapshot',
      purpose: 'Differentiate low demand from indexing/canonical/fetch problems without inspecting every URL.'
    },
    logging: {
      sheet: '実行ログ',
      prefix: '[P1P2:',
      structuredStages: ['PAGE_VALUE', 'SEARCH_CROSS', 'URL_INSPECTION'],
      forbidOpaqueErrorOnly: true,
      preserveLegacyLogs: true
    }
  },
  automation: {
    ownerProperty: 'PLAYPOINT_ANALYTICS_AUTOMATION_OWNER_EMAIL',
    crossAccountTriggerGuard: true,
    legacyCore: {
      pageUrlScheduledCollection: false,
      pageHistoryBackfillRevenueOwner: 'ga4_publisher_metrics',
      preserveExternalHealthComponents: true,
      formulaLikeLogMessagesEscapedAsText: true
    }
  },
  adsense: {
    coreMetrics: [
      'revenue_per_organic_landing_session',
      'revenue_per_successful_calculation',
      'publisher_impressions_per_session'
    ],
    pageUrlBreakdown: {
      owner: 'diagnostic_only',
      scheduled: false,
      sourceOfTruth: false,
      requiredProductFilter: 'PRODUCT_CODE==AFC',
      noRowsMeaning: 'unavailable_not_zero',
      preserveHistoricalLogs: true,
      preserveHistoricalArchives: true
    },
    anomalies: [
      {
        date: '2026-08-27',
        ga4PageViews: 42,
        adsensePageViews: 630,
        status: 'ANOMALY_REVIEW',
        autoCorrect: false,
        autoExclude: false
      }
    ]
  },
  retention: {
    activeUsers: 309,
    returningUsers: 18,
    returningRateApprox: 0.058,
    diaryTabOpenedActiveUsers: 2,
    diaryTabOpenedEventCount: 3,
    diaryEntrySavedActiveUsers: 0,
    calendarReminderAdded: 0,
    pwaInstallAccepted: 0,
    appDisplayModeUsers: 'UNAVAILABLE'
  },
  comparisonGuardrails: {
    preserveBaseline: true,
    noShortTermSeoRewrite: true,
    nextReviewDate: '2026-09-25',
    minimumObservationDaysAfterEarlySeptemberChanges: 14
  },
  manualOnlyOpenItems: [
    'GA4 DebugView browser-event receipt',
    'DebugView raw-value absence',
    'DebugView consent-before-grant and post-denial behavior',
    'app_display_mode GA4 custom-dimension registration',
    'non-overlapping previous-28-days Search Console query-by-URL comparison',
    'PlayPoint Analytics P1/P2 bound Apps Script first run and verification'
  ]
});

module.exports = {
  PHASE2_MEASUREMENT_BASELINE
};
