/* stgの明示的な診断表示だけで使用。広告・同意設定の変更や追加リクエストをしない。 */
(function () {
  'use strict';
  function reason(message) {
    if (/network|bandwidth/i.test(message)) return 'network';
    if (/cpu/i.test(message)) return 'cpu';
    return 'unknown';
  }
  function host(value) { try { return new URL(value).hostname; } catch (_) { return ''; } }
  function childFrameId(message) {
    const id = String(message).match(/\(id=([1-9]\d{0,15});url=/)?.[1];
    return id && Number.isSafeInteger(Number(id)) ? id : null;
  }
  function resources(entries) {
    const byHost = new Map();
    for (const entry of entries) {
      const name = host(entry.name);
      if (!name) continue;
      const row = byHost.get(name) || { host: name, count: 0, knownTransferBytes: 0, sizesUnavailable: 0 };
      row.count++;
      if (entry.transferSize > 0) row.knownTransferBytes += entry.transferSize;
      else row.sizesUnavailable++;
      byHost.set(name, row);
    }
    return [...byHost.values()].slice(0, 40);
  }
  if (typeof module === 'object' && module.exports) module.exports = { reason, host, childFrameId, resources };
  if (typeof document === 'undefined') return;
  function start() {
    if (document.getElementById('pp-ad-diagnostics')) return;
    const state = { interventions: [], mainThreadLongTasks: 0, mainThreadLongTaskMs: 0, reportingObserverAvailable: typeof ReportingObserver === 'function' };
    const panel = document.createElement('details'); panel.id = 'pp-ad-diagnostics';
    panel.style.cssText = 'max-width:1000px;margin:24px auto;padding:16px;border:1px solid #aab8ad;border-radius:12px;overflow-wrap:anywhere';
    const title = document.createElement('summary'); title.textContent = '広告負荷の診断（stg・外部送信なし）';
    const note = document.createElement('p');
    note.textContent = 'サイト本体の長時間処理と、Chromeが報告した広告停止を分けて表示します。取得できない通信量を0とは判定しません。';
    const refresh = document.createElement('button'); refresh.type = 'button'; refresh.textContent = '診断を更新';
    const output = document.createElement('pre'); output.style.cssText = 'white-space:pre-wrap;font:inherit;font-size:12px';
    panel.append(title, note, refresh, output); document.body.append(panel);
    function render() {
      const ad = document.querySelector('#ppn-ad');
      const report = { checkedAt: new Date().toISOString(), visibility: document.visibilityState,
        reportingObserverAvailable: state.reportingObserverAvailable,
        interventions: state.interventions,
        mainThread: { longTasks: state.mainThreadLongTasks, longTaskMs: Math.round(state.mainThreadLongTaskMs), interpretation: 'page-main-thread; not the ad-frame CPU quota' },
        loaderElements: [...document.scripts].filter(s => /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/.test(s.src)).length,
        frames: [...document.querySelectorAll('iframe')].map(f => ({ host: host(f.src), width: Math.round(f.getBoundingClientRect().width), height: Math.round(f.getBoundingClientRect().height) })).slice(0, 40),
        manualSlot: ad ? { status: ad.dataset.adStatus || 'pending', processed: ad.dataset.adsbygoogleStatus || 'pending' } : null,
        resources: resources(performance.getEntriesByType('resource')),
        notes: ['No ad clicks, forced retries, ad settings changes, or external diagnostic transmissions.', 'Cross-origin resource sizes may be unavailable; absence of a report is not proof of no intervention.'] };
      output.textContent = JSON.stringify(report, null, 2);
    }
    refresh.addEventListener('click', render);
    if (typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      new PerformanceObserver(list => { for (const task of list.getEntries()) { state.mainThreadLongTasks++; state.mainThreadLongTaskMs += task.duration; } }).observe({ type: 'longtask', buffered: true });
    }
    if (state.reportingObserverAvailable) {
      function captureReports(reports) {
        for (const report of reports) {
          if (report.body?.id !== 'HeavyAdIntervention') continue;
          const message = String(report.body.message || '');
          const frameUrl = message.match(/url=([^;)\s]+)/)?.[1];
          state.interventions.push({ at: new Date().toISOString(), reason: reason(message), childFrameId: childFrameId(message), reportedDocumentHost: host(report.url), frameHost: frameUrl ? host(frameUrl) : null });
          if (state.interventions.length > 20) state.interventions.shift();
        }
        render();
      }
      const observer = new ReportingObserver(captureReports, { types: ['intervention'], buffered: true });
      observer.observe();
      // 未配信の報告もメモリー上の診断へ取り込み、URLや生ログは保存・送信しない。
      window.addEventListener('pagehide', () => captureReports(observer.takeRecords()));
    }
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
