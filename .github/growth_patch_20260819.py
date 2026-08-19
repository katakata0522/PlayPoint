from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old, new, 1)


# 1) 最新情報ハブを2026-08-19の公式確認内容へ更新
path = Path('latest/index.html')
text = path.read_text(encoding='utf-8')
text = replace_once(text,
    '<title>Google Play Points 最新情報ハブ｜週次特典・クエスト・仕様変更</title>',
    '<title>Google Play Points 最新情報｜2026年のキャンペーン予定・週次特典</title>',
    'latest title')
text = replace_once(text,
    '<meta name="description" content="Google Play Pointsの日本向け公開公式情報を確認し、通常・スーパー・Play Pass週次特典、クエスト、キャンペーン、仕様変更を、確認日と参照元つきで整理する情報ハブです。">',
    '<meta name="description" content="2026年8月19日時点のGoogle Play Points最新情報。次回の一般向けポイント増量キャンペーン予定、通常・スーパー・Play Pass週次特典、クエストを公開公式情報とアカウント別情報に分けて整理します。">',
    'latest description')
text = replace_once(text,
    '<meta property="og:title" content="Google Play Points 最新情報ハブ">',
    '<meta property="og:title" content="Google Play Points 最新情報｜2026年のキャンペーン予定・週次特典">',
    'latest og title')
text = replace_once(text,
    '<meta property="og:description" content="日本向け公開公式情報と、各自のPlayストアで確認すべき項目を検証日つきで整理します。">',
    '<meta property="og:description" content="2026年8月19日時点。公開公式情報で確認できる週次特典と、アカウント別に確認するポイント増量キャンペーンを分けて整理します。">',
    'latest og description')
text = text.replace('2026-08-11', '2026-08-19')
text = text.replace('2026年8月11日', '2026年8月19日')
text = text.replace('2026-08-14頃', '2026-08-21頃')
text = text.replace('2026-08-13頃', '2026-08-20頃')
text = replace_once(text,
    '<h3>現在の対象オファーは「貯める」で確認</h3>\n        <p>プロモーションは対象者、アプリ、期間、通貨、有効化、上限が異なる場合があります。このページでは、公開情報だけで「全員に開催中」と断定しません。</p>',
    '<h3>2026年の次回ポイント増量キャンペーン予定は？</h3>\n        <p>2026年8月19日にGoogle公式の公開情報を確認した範囲では、次回の全員共通のポイント増量キャンペーン開始日は確認できませんでした。プロモーション自体は提供され、指定期間中は利用できる最も高い獲得率が適用されます。対象・倍率・期限はGoogle PlayのPlay Points「貯める」に表示された内容を最終判断にしてください。</p>',
    'latest campaign answer')
text = replace_once(text,
    '<h2 id="result-title">2026年8月19日の確認結果</h2>\n    <p>日本向けの通常ウィークリーリワード、スーパーウィークリーリワード、Play Pass加入者向け週次Play Points特典、Google Playクエスト、ポイント獲得・ランク条件、問題解決手順を再確認しました。</p>\n    <p>週次特典には対象者と更新曜日の異なる3制度があります。クエストと購入倍率はアカウント固有のため、公開情報から現在の対象可否を断定せず、Google Play画面を確認先として案内します。</p>',
    '<h2 id="result-title">2026年8月19日の確認結果</h2>\n    <p>日本向けの通常ウィークリーリワード、スーパーウィークリーリワード、Play Pass加入者向け週次Play Points特典、ポイント獲得プロモーション、ランク条件をGoogle公式情報で再確認しました。</p>\n    <p>通常週次は金曜日、Play Pass加入者向け週次特典は木曜日に更新されます。一方、2026年8月19日に確認した公開公式情報では、次回の全員共通のポイント増量キャンペーン開始日は確認できませんでした。現在利用できる倍率・対象・期限は、自分のPlay Points「貯める」画面を確認してください。</p>',
    'latest result summary')
path.write_text(text, encoding='utf-8')

# 編集日を生成元にも反映
path = Path('scripts/content-dates.cjs')
text = path.read_text(encoding='utf-8')
text = replace_once(text, "  'latest/index.html': '2026-08-11',", "  'latest/index.html': '2026-08-19',", 'latest date override')
text = replace_once(text, "  'status/diamond/index.html': '2026-08-12',", "  'status/diamond/index.html': '2026-08-19',", 'diamond date override')
path.write_text(text, encoding='utf-8')

# 鮮度テストを新しい実確認日に合わせる
path = Path('tests/latest-hub-operations.test.cjs')
text = path.read_text(encoding='utf-8')
text = text.replace("result.verificationDate, '2026-08-11'", "result.verificationDate, '2026-08-19'")
text = text.replace('content="2026-08-11"', 'content="2026-08-19"')
text = text.replace('"2026-08-11"/', '"2026-08-19"/')
text = text.replace('datetime="2026-08-11">2026-08-11', 'datetime="2026-08-19">2026-08-19')
text = text.replace('次回確認目安: 2026-08-14頃', '次回確認目安: 2026-08-21頃')
text = text.replace('次回確認目安: 2026-08-13頃', '次回確認目安: 2026-08-20頃')
text = text.replace("CONTENT_DATE_OVERRIDES['latest/index.html'], '2026-08-11'", "CONTENT_DATE_OVERRIDES['latest/index.html'], '2026-08-19'")
text = text.replace("new Date('2026-08-27T00:00:00Z')", "new Date('2026-09-04T00:00:00Z')")
text = text.replace("new Date('2026-08-10T15:30:00Z')", "new Date('2026-08-18T15:30:00Z')")
path.write_text(text, encoding='utf-8')

# 2-a) evergreenキャンペーン記事から最新予定の担当ページを明示
path = Path('articles/2025-12-25-campaign.html')
text = path.read_text(encoding='utf-8')
text = text.replace('2026-08-04', '2026-08-19')
text = text.replace('2026/08/04', '2026/08/19')
old = '<p>キャンペーンを待つかは、予定している購入だけを通常時と表示中の獲得率で比較し、対象アプリ、期間、開始操作、上限を確認して判断します。倍率のために購入予定を増やすと、得られるポイントより支出の方が大きくなります。</p>'
new = old + '\n<p><a href="../latest/">2026年の次回ポイント増量キャンペーン予定・最新の公式確認結果を見る</a></p>'
text = replace_once(text, old, new, 'campaign latest link')
path.write_text(text, encoding='utf-8')

# 2-b) ダイヤモンド検索意図は専用statusページを主役にする
path = Path('status/diamond/index.html')
text = path.read_text(encoding='utf-8')
text = replace_once(text,
    '<title>Google Play Points ダイヤモンドはいくら必要？到達目安と計算リンク</title>',
    '<title>Google Play Points ダイヤモンドはいくら必要？課金額・到達目安</title>',
    'diamond title')
text = replace_once(text,
    '<meta name="description" content="プラチナからダイヤモンドまでの残りポイントと必要額。特別獲得率は通常獲得率へ掛けず、表示された100円あたりのポイントで比較します。">',
    '<meta name="description" content="日本のGoogle Play Pointsダイヤモンドは年間15,000ポイント以上が基準。現在の不足ポイントと獲得率から、ダイヤモンドまでの必要課金額を早見表と計算機で確認できます。">',
    'diamond description')
text = text.replace('2026-08-12', '2026-08-19')
text = replace_once(text,
    '<p class="lp-lead">ダイヤモンドを目指す前に、必要額を先に見ておくページです。プラチナ現在からダイヤモンド昇格を選んだ状態で計算機へ移動できるので、残りポイントと倍率を入れるだけで年末までの目安を確認できます。</p>',
    '<p class="lp-lead">日本のダイヤモンド到達基準は、暦年に獲得した15,000ポイント以上です。必要な課金額は現在の不足ポイントと獲得率で変わるため、プラチナ現在からダイヤモンド昇格を選んだ状態で計算機へ移動し、残りポイントとGoogle Playに表示された獲得率から目安を確認できます。</p>',
    'diamond direct answer')
path.write_text(text, encoding='utf-8')

# 多言語トップには手を入れず、日本語のダイヤモンド記事冒頭から専用LPへ役割を寄せる
path = Path('articles/2025-12-25-diamond-worth-it.html')
text = path.read_text(encoding='utf-8')
text = text.replace('2026-08-04', '2026-08-19')
text = text.replace('2026/08/04', '2026/08/19')
intro = '<div class="intro">\n<strong>結論：ダイヤモンドを目指すかは、普段の対象購入だけで15,000ポイントへ近づくかを先に確認します。</strong><br/>\n                通常獲得率はプラチナより高いものの、共通する特典も多いため、追加支出だけで到達を狙うと支出に見合わない場合があります。\n            </div>'
intro_new = intro + '\n<p><a href="../status/diamond/">ダイヤモンドまでの必要課金額を、不足ポイントと現在の獲得率から確認する</a></p>'
text = replace_once(text, intro, intro_new, 'diamond early role link')
path.write_text(text, encoding='utf-8')

# 2-c / 3) 韓国語現金化: URL中の日付は維持し、編集日・検索語・早期回遊だけ更新
path = Path('ko/articles/google-play-points-cash-conversion.html')
text = path.read_text(encoding='utf-8')
text = replace_once(text, '<meta name="last-modified" content="2026-07-24">', '<meta name="last-modified" content="2026-08-19">', 'ko last modified')
text = replace_once(text, '"dateModified":"2026-07-24"', '"dateModified":"2026-08-19"', 'ko structured modified')
text = replace_once(text, '<p class="hero-meta">2026-07-24 업데이트 · 한국 계정 가이드</p>', '<p class="hero-meta">2026-08-19 업데이트 · 한국 계정 가이드</p>', 'ko visible modified')
text = replace_once(text,
    '<title>Google Play Points 현금화 가능할까? 계좌이체와의 차이</title>',
    '<title>구글 플레이 포인트 현금화 가능할까? 계좌이체·현금 전환 정리</title>',
    'ko title')
text = replace_once(text,
    '<meta name="description" content="Google Play Points는 현금화, 계좌 출금, 다른 계정으로 이전할 수 없습니다. Play 크레딧·쿠폰·게임 아이템과의 차이와 안전한 사용법을 정리합니다.">',
    '<meta name="description" content="구글 플레이 포인트(Play Points)는 현금화, 계좌 출금, 다른 계정으로 이전할 수 없습니다. 현금 전환과 Play 크레딧·쿠폰의 차이, 실제 사용 가치를 정리합니다.">',
    'ko description')
text = replace_once(text, '<meta property="og:title" content="Google Play Points 현금화 가능할까?">', '<meta property="og:title" content="구글 플레이 포인트 현금화 가능할까?">', 'ko og title')
text = replace_once(text, '"headline":"Google Play Points 현금화 가능할까? 계좌이체와의 차이"', '"headline":"구글 플레이 포인트 현금화 가능할까? 계좌이체·현금 전환 정리"', 'ko headline')
text = replace_once(text,
    '<div class="hero"><span class="hero-badge">공식 규정 확인</span><h1>Google Play Points 현금화 가능할까?</h1><p class="hero-meta">2026-08-19 업데이트 · 한국 계정 가이드</p></div>',
    '<div class="hero"><span class="hero-badge">공식 규정 확인</span><h1>구글 플레이 포인트 현금화 가능할까?</h1><p class="hero-meta">2026-08-19 업데이트 · 한국 계정 가이드</p></div>',
    'ko h1')
intro = '<div class="intro"><strong>결론부터 말하면 Play Points는 현금화하거나 은행 계좌로 출금할 수 없고, 다른 Google 계정이나 가족에게 이전할 수도 없습니다.</strong> Play Points → 사용에 표시되는 Play 크레딧, 쿠폰, 앱·게임 아이템 등이 정식 사용처입니다.</div>'
intro_new = '<div class="intro"><strong>결론부터 말하면 구글 플레이 포인트(Play Points)는 현금화하거나 은행 계좌로 출금할 수 없고, 다른 Google 계정이나 가족에게 이전할 수도 없습니다.</strong> Play Points → 사용에 표시되는 Play 크레딧, 쿠폰, 앱·게임 아이템 등이 정식 사용처입니다. 현금 대신 실제로 어느 정도 가치가 있는지 비교하려면 <a href="/ko/articles/google-play-points-100-value.html">100포인트의 사용 가치</a>를 이어서 확인할 수 있습니다.</div>'
text = replace_once(text, intro, intro_new, 'ko early related link')
path.write_text(text, encoding='utf-8')
