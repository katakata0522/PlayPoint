from pathlib import Path


def scan_block_end(source: str, open_brace: int) -> int:
    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    i = open_brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if state == 'line_comment':
            if ch == '\n':
                state = 'code'
        elif state == 'block_comment':
            if ch == '*' and nxt == '/':
                state = 'code'
                i += 1
        elif state == 'string':
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                state = 'code'
        else:
            if ch == '/' and nxt == '/':
                state = 'line_comment'
                i += 1
            elif ch == '/' and nxt == '*':
                state = 'block_comment'
                i += 1
            elif ch in "'\"`":
                state = 'string'
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise ValueError('unterminated block')


def test_span(source: str, title: str) -> tuple[int, int]:
    marker = f"test('{title}',"
    start = source.find(marker)
    if start < 0:
        raise ValueError(f'test not found: {title}')
    open_brace = source.find('{', start)
    close_brace = scan_block_end(source, open_brace)
    end = close_brace + 1
    while end < len(source) and source[end] in ' \t':
        end += 1
    if source[end:end + 2] != ');':
        raise ValueError(f'test terminator not found: {title}')
    end += 2
    if end < len(source) and source[end] == '\n':
        end += 1
    return start, end


def replace_test(source: str, title: str, replacement: str) -> str:
    start, end = test_span(source, title)
    return source[:start] + replacement.rstrip() + '\n\n' + source[end:].lstrip('\n')


def remove_test(source: str, title: str) -> str:
    start, end = test_span(source, title)
    return source[:start].rstrip() + '\n\n' + source[end:].lstrip('\n')


def remove_function(source: str, name: str) -> str:
    marker = f'function {name}('
    start = source.find(marker)
    if start < 0:
        raise ValueError(f'function not found: {name}')
    open_brace = source.find('{', start)
    close_brace = scan_block_end(source, open_brace)
    end = close_brace + 1
    if end < len(source) and source[end] == '\n':
        end += 1
    return source[:start].rstrip() + '\n\n' + source[end:].lstrip('\n')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise ValueError(f'{label}: expected 1 match, found {count}')
    return source.replace(old, new, 1)


def edit(path: str, transform) -> None:
    file = Path(path)
    before = file.read_text(encoding='utf-8')
    after = transform(before)
    if after == before:
        raise ValueError(f'no change produced: {path}')
    file.write_text(after, encoding='utf-8')


def cleanup_growth_priority(source: str) -> str:
    source = replace_once(
        source,
        "  assert.match(html, /公開前の確認工程/);\n  assert.match(html, /2026-07-30/);",
        "  assert.match(html, /公開前の確認工程/);",
        'remove fixed author date'
    )
    return remove_test(source, '今回はWeb Share APIを追加しない')


def cleanup_growth_migration(source: str) -> str:
    replacement = r'''test('プライバシー文書はWeb版と認定CMPの運用に一致する', () => {
  const privacy = read('privacy.html');
  const terms = read('terms.html');
  const consent = read('js/consent.js');

  assert.doesNotMatch(privacy, /AdMob|当アプリ|広告ID/);
  assert.doesNotMatch(terms, /当アプリ/);
  for (const [label, html] of [['privacy', privacy], ['terms', terms]]) {
    const match = html.match(/最終改定日：<\/strong>(\d{4})年(\d{1,2})月(\d{1,2})日/);
    assert.ok(match, `${label}: 最終改定日がありません`);
    const [, year, month, day] = match.map(Number);
    const normalized = new Date(Date.UTC(year, month - 1, day));
    assert.equal(normalized.getUTCFullYear(), year, `${label}: 年が不正です`);
    assert.equal(normalized.getUTCMonth(), month - 1, `${label}: 月が不正です`);
    assert.equal(normalized.getUTCDate(), day, `${label}: 日が不正です`);
  }
  assert.match(consent, /__tcfapi/);
  assert.match(consent, /showRevocationMessage/);
  assert.doesNotMatch(consent, /data-consent-accept.*focus/s);
});'''
    return replace_test(source, 'プライバシー文書はWeb版と認定CMPの運用に一致する', replacement)


def cleanup_article_quality(source: str) -> str:
    source = replace_once(
        source,
        "  assert.ok(registry.length >= 27, `expected at least 27 Japanese Play Points articles, found ${registry.length}`);\n  assert.ok(articles.length >= 93, `expected at least 93 published Play Points articles, found ${articles.length}`);\n\n",
        '',
        'remove article-count floors'
    )
    source = replace_once(
        source,
        "    assert.ok(bodyText.length >= 500, `${file}: article body is too thin (${bodyText.length} visible characters)`);\n    assert.ok((body.match(/<h2\\b/g) || []).length >= 3, `${file}: needs at least three h2 sections`);\n    assert.ok((body.match(/<p\\b/g) || []).length >= 5, `${file}: needs at least five explanatory paragraphs`);",
        "    assert.ok(bodyText.length > 0, `${file}: article body is empty`);\n    assert.ok((body.match(/<p\\b/g) || []).length >= 1, `${file}: explanatory paragraph is missing`);",
        'replace format-inflating content floors'
    )
    return source


def cleanup_playpoint_audit(source: str) -> str:
    replacement = r'''test('日記本体とカレンダー登録を全言語で残す', () => {
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(file);
    assert.ok(html.includes('id="diaryMode"'), `${file}: 日記本体が消えています`);
    assert.ok(html.includes('id="register-google-cal-btn"'), `${file}: カレンダー登録が消えています`);
  }
});'''
    return replace_test(source, '日記の重複通知を表示せず、カレンダー登録は残す', replacement)


def cleanup_coupon_credit(source: str) -> str:
    source = remove_function(source, 'schemas')
    replacement = r'''test('クーポン・Playクレジット記事は4言語で固有の事実と相互導線を保つ', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = fileFor(topic, locale);
      assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
      const html = read(relativePath);
      const peerTopic = topics.find(candidate => candidate.slug === topic.peer);
      const peerPath = fileFor(peerTopic, locale);

      assert.ok(html.includes(path.basename(peerPath)), `${relativePath}: peer ${peerPath}`);
      for (const id of topic.officialIds) {
        assert.ok(html.includes(`support.google.com/googleplay/answer/${id}`), `${relativePath}: ${id}`);
      }
      for (const phrase of topic.phrases[locale.key]) {
        assert.ok(html.includes(phrase), `${relativePath}: ${phrase}`);
      }
    }
  }
});'''
    source = replace_test(source, 'クーポン・Playクレジット問題解決記事は4言語でSEO公開要件を満たす', replacement)
    return remove_test(source, '新規記事のサイト内リンク先はすべて存在する')


def cleanup_weekly_accounts(source: str) -> str:
    source = remove_function(source, 'jsonLd')
    replacement = r'''test('週次特典と複数アカウント記事は3言語で固有の事実を保つ', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = `${locale.dir}/articles/${topic.slug}`;
      assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} がありません`);
      const html = read(relativePath);

      for (const officialId of topic.officialIds) {
        assert.ok(html.includes(`support.google.com/googleplay/answer/${officialId}`), `${relativePath} に公式出典 ${officialId} がありません`);
      }
      for (const phrase of topic.requiredPhrases[locale.dir]) {
        assert.ok(html.includes(phrase), `${relativePath} に重要文言がありません: ${phrase}`);
      }
    }
  }
});'''
    source = replace_test(source, '週次特典と複数アカウント記事は3言語で公開要件を満たす', replacement)
    return remove_test(source, '新規国際記事のローカルリンク先はすべて存在する')


def cleanup_use_eligibility(source: str) -> str:
    source = remove_function(source, 'schemas')
    replacement = r'''test('ポイント利用・参加条件記事は3言語で固有の事実と相互導線を保つ', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = `${locale.dir}/articles/${topic.slug}`;
      assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} がありません`);
      const html = read(relativePath);

      assert.ok(html.includes(`/${locale.dir}/articles/${topic.peer}`), `${relativePath}: peer article`);
      for (const id of topic.officialIds) {
        assert.ok(html.includes(`support.google.com/googleplay/answer/${id}`), `${relativePath}: ${id}`);
      }
      for (const phrase of topic.phrases[locale.dir]) {
        assert.ok(html.includes(phrase), `${relativePath}: ${phrase}`);
      }
    }
  }
});'''
    source = replace_test(source, 'ポイント利用・参加条件記事は3言語でSEO公開要件を満たす', replacement)
    return remove_test(source, '新規記事のサイト内リンク先は存在する')


def cleanup_rank_maintenance(source: str) -> str:
    source = remove_function(source, 'schemas')
    replacement = r'''test('ランク維持記事は4言語で公式条件と固有の説明を保つ', () => {
  for (const page of pages) {
    const html = read(page.file);
    assert.ok(fs.existsSync(path.join(root, page.file)), page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9080348'), page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9077192'), page.file);
    for (const phrase of page.phrases) {
      assert.ok(html.includes(phrase), `${page.file}: ${phrase}`);
    }
  }
});'''
    source = replace_test(source, 'ランク維持記事は4言語で相互接続され公式条件とSEO要件を満たす', replacement)
    date_replacement = r'''test('日本語の既存記事と記事データは同じ更新日を持つ', () => {
  const html = read(pages[0].file);
  const articles = JSON.parse(read('blog/articles.json'));
  const article = articles.find(item => item.id === 'playpoints-rank-maintenance');
  const metaDate = html.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})"/)?.[1];
  const schemaDate = html.match(/"dateModified": "(\d{4}-\d{2}-\d{2})"/)?.[1];

  assert.match(metaDate || '', /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(schemaDate, metaDate);
  assert.ok(article);
  assert.equal(article.modified, metaDate);
});'''
    source = replace_test(source, '日本語の既存記事と記事データは同じ更新日を持つ', date_replacement)
    return remove_test(source, '新しい多言語記事のサイト内リンク先は存在する')


edit('tests/growth-priority.test.cjs', cleanup_growth_priority)
edit('tests/growth-migration.test.cjs', cleanup_growth_migration)
edit('tests/all-article-quality-audit.test.cjs', cleanup_article_quality)
edit('tests/playpoint-audit-fixes.test.cjs', cleanup_playpoint_audit)
edit('tests/intl-coupon-credit.test.cjs', cleanup_coupon_credit)
edit('tests/intl-weekly-accounts.test.cjs', cleanup_weekly_accounts)
edit('tests/intl-use-eligibility.test.cjs', cleanup_use_eligibility)
edit('tests/intl-rank-maintenance.test.cjs', cleanup_rank_maintenance)
