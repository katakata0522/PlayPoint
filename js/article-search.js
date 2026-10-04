(function (root) {
  'use strict';
  // 地域ごとの同義語をまとめ、ローカルの見出し・本文インデックスを検索する。
  const groups = {
    ja: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points', 'プレイポイント', 'プレイ ポイント', 'playポイント', 'play ポイント', 'google play ポイント', 'googleplayポイント', 'グーグルプレイポイント', 'グーグル プレイ ポイント'], ['期限', '有効期限', '期限切れ', '失効'], ['反映', '反映されない', '反映されません', '付与されない', '付かない', 'つかない', '未付与'], ['残高', '残りポイント'], ['ウィークリー', 'ウイークリー', '週次'], ['クーポン', 'coupon'], ['ポケスリ', 'ポケモンスリープ', 'Pokémon Sleep', 'Pokemon Sleep'], ['学マス', '学園アイドルマスター'], ['ブルアカ', 'ブルーアーカイブ', 'Blue Archive'], ['NIKKE', 'ニケ', '勝利の女神：NIKKE'], ['鳴潮', 'Wuthering Waves', 'wutheringwaves'], ['メメントモリ', 'Memento Mori', 'mementomori'], ['リバース1999', 'リバース：1999', 'Reverse: 1999', 'reverse1999'], ['シャドバWB', 'Shadowverse: Worlds Beyond', 'シャドウバース ワールズビヨンド', 'shadowversewb']],
    en: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points'], ['expiry', 'expiration', 'expire', 'expired'], ['missing', 'not received', 'not showing'], ['weekly', 'weekly prize', 'weekly reward']],
    ko: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points', '플레이 포인트', '플레이포인트', '구글플레이 포인트', '구글 플레이 포인트', '구글 플레이포인트'], ['만료', '유효기간', '유효 기간', '소멸'], ['미지급', '적립 안됨', '적립 안 됨'], ['주간', '위클리']],
    tw: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points', 'play 點數', 'play點數', 'google play 點數', 'google play點數', 'googleplay點數'], ['到期', '有效期限', '過期', '失效'], ['未入帳', '沒有入帳', '沒收到', '未收到'], ['每週', '每周', '週獎勵']]
  };
  function normalize(value) { return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(); }
  // ひらがな入力でも商品名を探せる。表示用の文字列は変換しない。
  function fold(value, locale) {
    const text = normalize(value);
    return locale === 'ja' ? text.replace(/[ぁ-ゖ]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60)) : text;
  }
  groups.ja[0].push('ポイント', 'ぷれいぽいんと');
  // Google/グーグル、Play/プレイの混在と単語間の空白位置をまとめて扱う。
  for (const prefix of ['', 'google', 'グーグル']) for (const play of ['play', 'プレイ'])
    for (const points of ['points', 'ポイント']) for (const firstSpace of ['', ' ']) for (const secondSpace of ['', ' '])
      groups.ja[0].push((prefix + (prefix ? firstSpace : '') + play + secondSpace + points).trim());
  groups.ja[2].push('付与', 'いつ付く', 'いつつく', 'いつ反映', '反映されてない', '反映されていない', 'ついてない', 'ついていない', '付いてない', '付いていない', 'もらえない', 'ついてこない', '付いてこない');
  groups.ja[1].push('期限が切れた', '期限切れになった');
  groups.ja[4].push('毎週');
  groups.ja.push(
    ['Google Play Pass', 'Play Pass', 'Googleプレイパス', 'グーグルプレイパス', 'プレイパス', 'プレイ パス'],
    ['Pokémon GO', 'Pokemon GO', 'PokémonGO', 'PokemonGO', 'ポケモンGO', 'ポケモン GO', 'ポケモンゴー'],
    ['消えた', '消える', '消えました', '消えてしまった', 'なくなった', 'なくなりました', '無くなった', '消失'],
    ['月パス', '月額パス', 'マンスリー', '30日補給', '空月の祝福', '列車補給標章', 'インターノット会員'],
    ['原神', 'げんしん', 'Genshin Impact', 'genshin'],
    ['モンスト', 'モンスターストライク', 'Monster Strike'],
    ['スタレ', '崩壊スターレイル', '崩壊：スターレイル', 'Honkai Star Rail'],
    ['ゼンゼロ', 'ゼンレスゾーンゼロ', 'Zenless Zone Zero'],
    ['パズドラ', 'パズル＆ドラゴンズ', 'パズル&ドラゴンズ', 'Puzzle and Dragons'],
    ['FGO', 'Fate/Grand Order', 'フェイトグランドオーダー'],
    ['ウマ娘', 'ウマムスメ'], ['プロセカ', 'プロジェクトセカイ'],
    ['ポケポケ', 'ポケモントレーディングカードゲームポケット', 'Pokemon TCG Pocket'],
    ['アークナイツ', 'Arknights'], ['ドッカン', 'ドッカンバトル'],
    ['ヘブバン', 'ヘブンバーンズレッド', 'Heaven Burns Red'],
    ['ファンパレ', 'ファントムパレード'], ['プロスピA', 'プロ野球スピリッツA'],
    ['スーパーチケット', 'Super Ticket', 'superticket'],
    ['Playクレジット', 'Play クレジット', 'プレイクレジット', 'プレイ クレジット', 'google play credit'],
    ['初心者', '初めて', 'はじめて', '始め方', 'はじめ方', '登録方法'],
    ['使い方', '使い道', '使う', '使いたい', '交換先'],
    ['機種変更', 'スマホ変更', 'スマホを変えた', '機種を変えた'],
    ['見つからない', '見当たらない', '表示されない', '出てこない', '出ない'],
    ['届かない', '受け取れない', '受け取れません'],
    ['キャンペーン', '増量キャンペーン'], ['クエスト', 'quest'],
    ['使えない', '使えません', '利用できない', 'できない', '出来ない', 'できません'],
    ['ランク', 'ステータス'], ['必要額', 'いくら必要', '必要金額', 'あといくらで', 'あといくら', '何円で'],
    ['貯まらない', 'たまらない', '増えない', '貯められない', 'ためられない'],
    ['維持', '維持費', '維持金額', 'ランク維持'],
    ['現金', '現金化', '現金にしたい', '現金にする'],
    ['ギフトカード', 'ギフトコード', 'プリペイド', 'プリペイドカード'],
    ['無料', '無課金', '課金しないで', '課金せずに', '課金なしで'],
    ['貯める', '貯めたい', 'ためる', 'ためたい', '貯め方'],
    ['お得', '一番お得', 'おすすめ'],
    ['何がもらえる', '何が貰える', '何が当たる', '何が出る'],
    ['今週', '現在', '今の'], ['予定', '開催予定', 'スケジュール']
  );
  const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 同義語は固定なので、記事・比較回数ごとに正規化と並べ替えを繰り返さない。
  const replacementsByLocale = Object.fromEntries(Object.entries(groups).map(([locale, aliases]) => [locale,
    aliases.flatMap((group, index) => group.map(word => [fold(word, locale), 'zzalias' + index + 'zz'])).sort((a, b) => b[0].length - a[0].length)
  ]));
  const dictionaries = Object.fromEntries(Object.entries(replacementsByLocale).map(([locale, words]) => [locale, {
    words, map: new Map(words), pattern: new RegExp(words.map(([word]) => escapePattern(word)).join('|'), 'g')
  }]));
  // 記事の回答範囲が質問と一致する場合だけ優先する。辞書の並び番号に依存しない。
  const purposeOwners = new Map([
    [['初心者'], '2025-12-25-getting-started.html'], [['使い方'], '2025-12-25-best-use.html'],
    [['交換'], '2025-12-25-best-use.html'], [['消えた'], '2026-08-16-points-disappeared.html'],
    [['失効'], '2025-12-25-expiration.html'], [['反映'], '2026-03-10-play-points-reflection-timing.html'],
    [['現金'], '2026-07-24-play-points-cash-conversion.html'],
    [['ギフトカード'], '2025-12-25-gift-card.html'],
    [['Play Pass'], '2026-08-16-play-pass-worth-it.html'],
    [['ゴールド', 'ランク'], '2026-08-16-fastest-gold.html'],
    [['無料', '貯める'], '2026-07-24-earn-play-points-free.html'],
    [['お得', '使い方'], '2025-12-25-best-use.html'],
    [['お得', '交換'], '2025-12-25-best-use.html'],
    [['ウィークリー'], '2025-12-25-weekly-reward.html'],
    [['ウィークリー', '何がもらえる'], '2025-12-25-weekly-reward.html'],
    [['今週', '特典'], 'latest/'], [['キャンペーン'], 'latest/'], [['キャンペーン', '予定'], 'latest/'],
    [['必要額', 'ゴールド'], 'guides/ranks/'], [['必要額', 'プラチナ'], 'guides/ranks/'],
    [['必要額', 'ダイヤモンド'], 'guides/ranks/'], [['必要額', 'シルバー'], 'guides/ranks/'],
    [['維持', 'プラチナ'], '2025-12-25-playpoints-rank-maintenance.html'],
    [['維持', 'ゴールド'], '2025-12-25-playpoints-rank-maintenance.html'],
    [['維持', 'ダイヤモンド'], '2025-12-25-playpoints-rank-maintenance.html'],
    [['ランク'], 'guides/ranks/'], [['トラブル'], 'guides/troubleshooting/'],
    [['1', '何円'], '2026-07-24-play-points-1-value.html'],
    [['100', '何円'], '2026-07-24-play-points-100-value.html'],
    [['500', '何円'], '2026-07-24-play-points-500-1000-value.html'],
    [['1000', '何円'], '2026-07-24-play-points-500-1000-value.html'],
    [['クーポン','見つからない'], '2026-07-25-play-points-coupon-not-applied.html'],
    [['クーポン','使えない'], '2026-07-25-play-points-coupon-not-applied.html'],
    [['ウィークリー','見つからない'], '2026-08-16-weekly-reward-not-showing.html'],
    [['ウィークリー','受け取れない'], '2026-08-16-weekly-reward-not-showing.html'],
    [['ウィークリー','反映'], '2026-08-16-weekly-reward-not-showing.html'],
    [['キャンペーン','見つからない'], '2026-09-19-play-points-promotion-not-showing.html'],
    [['登録','見つからない'], '2026-08-05-play-points-cannot-join.html'],
    [['登録','使えない'], '2026-08-05-play-points-cannot-join.html'],
    [['アイテム','届かない'], '2026-08-19-redeemed-item-not-received.html']
  ].map(([words, owner]) => [words.map(word => dictionaries.ja.map.get(fold(word, 'ja')) || fold(word, 'ja')).sort().join(' '), owner]));
  function canonical(value, locale = 'ja') {
    const dictionary = dictionaries[locale] || dictionaries.en;
    return fold(value, locale).replace(dictionary.pattern, word => dictionary.map.get(word));
  }
  // 長い既知の名前に限り1文字の挿入・削除・置換・隣接入れ替えを補正する。
  // 短い語や同距離の別候補は推測せず、未知の条件も検索から捨てない。
  function oneEdit(left, right) {
    if (Math.abs(left.length - right.length) > 1) return false;
    let i = 0; while (i < Math.min(left.length, right.length) && left[i] === right[i]) i++;
    if (i === Math.min(left.length, right.length)) return true;
    if (left.length === right.length) return left.slice(i + 1) === right.slice(i + 1) ||
      (left[i] === right[i + 1] && left[i + 1] === right[i] && left.slice(i + 2) === right.slice(i + 2));
    return left.length > right.length ? left.slice(i + 1) === right.slice(i) : left.slice(i) === right.slice(i + 1);
  }
  function correct(token, locale) {
    if (locale !== 'ja' || token.length < 4 || token.length > 48 || /^zzalias\d+zz$/.test(token)) return token;
    if (dictionaries.ja.map.has(token)) return token;
    const variants = [token, token.replace(/(?:ガ|ハ|ヲ|ノ|ニ|デ|ト){1,2}$/, '')];
    const candidates = new Set(dictionaries.ja.words.filter(([word]) => word.length >= 4 && word[0] === token[0] && variants.some(value => value.length >= 4 && oneEdit(value, word))).map(([, id]) => id));
    return candidates.size === 1 ? [...candidates][0] : token;
  }
  const domainWords = ['インストール', 'アイテム', 'ゲーム', '課金', '購入', '交換', '登録', '残高', '確認', '期限', '更新', '解約', '返金', '払い戻し', 'ボタン', '天井', 'ゴールド', 'プラチナ', 'シルバー', 'ダイヤモンド', 'ブラックダイヤモンド', '必要額', '特典', '何円'];
  const domainPattern = new RegExp('zzalias\\d+zz|' + domainWords.map(word => fold(word, 'ja')).sort((a,b) => b.length-a.length).join('|'), 'g');
  const queryCache = new Map();
  function tokens(query, locale = 'ja') {
    const input = String(query || '');
    if (input.length > 256) return ['zzquerytoolongzz'];
    const key = locale + ':' + input;
    if (queryCache.has(key)) return queryCache.get(key).slice();
    let value = canonical(fold(input, locale).split(/\s+/).map(token => correct(token, locale)).join(' '), locale);
    if (locale === 'ja') {
      value = value.replace(/(?:教エテ(?:クダサイ)?|知リタイ|調ベタイ|探シタイ|ニツイテ|ドウヤッテ|ドウシタラ|ドウスレバ|ナゼ|ドウシテ|ニナルニハ)/g, ' ')
        .replace(domainPattern, ' $& ').replace(/[、。？！!?「」『』（）()：:・]/g, ' ')
        .replace(/(?:^|\s)(?:(?:ガ|ハ|ヲ|ノ|ニ|デ|ト|モ|ヘ|カ){1,3}|デス|デスカ|マス|マスカ|スル|シタイ|シテ|シタ|サレル|ナ|コト|方法|理由|原因|ンダケド|ンデスガ|(?:ハ|ガ|ヲ|ノ)?(?:イクラ|イツ|ドコ|ドレ|ナニ|何)(?:デスカ|カ)?)(?=\s|$)/g, ' ');
    }
    const terms = [...new Set(value.split(/\s+/).filter(Boolean).map(token => correct(token, locale)))];
    const result = terms.length > 12 ? ['zzquerytoolongzz'] : terms;
    if (queryCache.size >= 64) queryCache.delete(queryCache.keys().next().value);
    queryCache.set(key, result);
    return result.slice();
  }
  // 一般的な目的だけを案内記事へ寄せる。ゲーム名などの追加条件がある質問には適用しない。
  function intentOwner(query, locale) {
    if (locale !== 'ja') return '';
    const purpose = tokens(query, locale).filter(term => term !== 'zzalias0zz');
    if (!purpose.length && tokens(query, locale).includes('zzalias0zz')) return '2025-12-25-getting-started.html';
    return purposeOwners.get(purpose.slice().sort().join(' ')) || '';
  }
  function isIntentOwner(article, query, locale) {
    const owner = intentOwner(query, locale);
    return !!owner && (article.path || article.file || '').endsWith('/' + owner);
  }
  // 計測には自由入力を渡さず、回答先が確定する質問だけ固定の目的名にする。
  function intentId(query, locale = 'ja') {
    const owner = intentOwner(query, locale);
    if (/earn-play-points-free/.test(owner)) return 'earn_free';
    if (/best-use/.test(owner)) return 'use_points';
    if (owner === 'latest/') return 'current_benefits';
    if (owner === 'guides/ranks/') return 'rank_cost';
    if (/weekly-reward\.html$/.test(owner)) return 'weekly_rewards';
    if (/play-points-(?:1|100|500-1000)-value/.test(owner)) return 'point_value';
    if (/reflection|not-|disappeared|cannot-join|troubleshooting/.test(owner)) return 'troubleshooting';
    return 'other';
  }
  function contains(text, token) {
    // 1を100や1000の部分一致として採点しない。
    return /^\d+$/.test(token) ? new RegExp('(^|[^0-9])' + token + '(?![0-9])').test(text) : text.includes(token);
  }
  function sections(article) { return Array.isArray(article.sections) ? article.sections : []; }
  function searchable(article) { return [article.title, article.description, article.category, ...(article.tags || []), ...sections(article).map(s => s.heading + ' ' + s.text)].join(' '); }
  const articleCache = new WeakMap();
  function indexed(article, locale) {
    const previous = articleCache.get(article);
    if (previous && previous.locale === locale && previous.sections === article.sections && previous.title === article.title && previous.description === article.description && previous.tags === article.tags && previous.category === article.category) return previous;
    const index = { locale, sections: article.sections, title: article.title, description: article.description, tags: article.tags, category: article.category,
      text: canonical(searchable(article), locale), titleText: canonical(article.title, locale),
      headings: canonical(sections(article).map(s => s.heading).join(' '), locale) };
    articleCache.set(article, index); return index;
  }
  function matches(article, query, locale = 'ja') {
    if (isIntentOwner(article, query, locale)) return true;
    const terms = tokens(query, locale);
    if (normalize(query) && !terms.length) return false;
    return terms.every(token => contains(indexed(article, locale).text, token));
  }
  function score(article, query, locale = 'ja') {
    const terms = tokens(query, locale);
    const { titleText: title, headings } = indexed(article, locale);
    const generalMissing = locale === 'ja' && terms.includes('zzalias2zz') && terms.every(term => ['zzalias0zz', 'zzalias2zz', 'ポイント'].includes(term));
    const mainAnswer = generalMissing && /reflection-timing\.html$/.test(article.path || article.file || '');
    return (isIntentOwner(article, query, locale) ? 100 : 0) + (mainAnswer ? 30 : 0) + terms.reduce((sum, token) => sum + (contains(title, token) ? 10 : 0) + (contains(headings, token) ? 2 : 0), 0);
  }
  function excerpt(article, query, locale = 'ja') {
    if (!normalize(query)) return { text: article.description || '', id: '', heading: '' };
    const terms = tokens(query, locale);
    const title = canonical(article.title, locale);
    if (terms.every(term => title.includes(term)) && article.description) {
      return { text: article.description, id: '', heading: '' };
    }
    let best = null, bestScore = 0;
    for (const section of sections(article)) {
      const text = canonical(section.heading + ' ' + section.text, locale);
      const count = terms.filter(t => text.includes(t)).length;
      if (count > bestScore) { best = section; bestScore = count; }
    }
    if (!best) return { text: article.description || '', id: '', heading: '' };
    const text = String(best.text || best.heading);
    const normalizedText = normalize(text);
    const literal = normalize(query).split(' ').filter(Boolean).map(t => normalizedText.indexOf(t)).filter(i => i >= 0);
    const start = Math.max(0, (literal.length ? Math.min(...literal) : 0) - 40);
    return { text: (start ? '…' : '') + text.slice(start, start + 180) + (text.length > start + 180 ? '…' : ''), id: best.id || '', heading: best.heading || '' };
  }
  function suggest(articles, query, locale = 'ja') {
    const terms = tokens(query, locale).filter(term => locale !== 'ja' || term !== 'zzalias0zz');
    if (!terms.length) return [];
    const known = terms.filter(term => /^zzalias\d+zz$/.test(term) || domainWords.some(word => fold(word, locale) === term));
    const owner = locale === 'ja' ? purposeOwners.get(known.slice().sort().join(' ')) : '';
    const answer = owner && articles.find(article => (article.path || article.file || '').endsWith('/' + owner));
    if (answer) return [answer];
    return articles.map(article => {
      const haystack = indexed(article, locale).text;
      const relatedTerms = terms.filter(t => haystack.includes(t));
      // ゼロ件時の参考候補だけを、一致する語の関連度で並べる。通常のAND検索は緩めない。
      return { article, count: relatedTerms.length, relevance: score(article, relatedTerms.join(' '), locale) };
    })
      .filter(item => item.count > 0).sort((a, b) => b.count - a.count || b.relevance - a.relevance).slice(0, 3).map(item => item.article);
  }
  const api = { normalize, canonical, tokens, matches, score, excerpt, suggest, intentId };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlayPointSearch = api;
})(typeof globalThis === 'object' ? globalThis : this);
