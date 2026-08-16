#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PlayPoint 全49記事 品質検証スクリプト
Cocoon風レイアウト・計算機CTA・HTML文法・カテゴリ整合性・Schema.org JSON-LD・アセット参照の完全検証
"""

import os
import re
import json
import glob
from html.parser import HTMLParser

ROOT_DIR = r"C:\Users\tomok\PlayPoint"
ARTICLES_DIR = os.path.join(ROOT_DIR, "articles")
REGISTRY_PATH = os.path.join(ROOT_DIR, "blog", "articles.json")

class HTMLStructureValidator(HTMLParser):
    """HTMLタグの整合性・入れ子関係を検証するパーサー"""
    VOID_ELEMENTS = {
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr'
    }
    
    MAJOR_CONTAINERS = {
        'html', 'head', 'body', 'header', 'nav', 'div', 'article',
        'aside', 'footer', 'section', 'main', 'table', 'thead', 'tbody',
        'tr', 'ul', 'ol', 'li', 'script', 'style'
    }

    def __init__(self):
        super().__init__()
        self.tag_stack = []
        self.errors = []
        self.unclosed_tags = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() not in self.VOID_ELEMENTS:
            self.tag_stack.append((tag.lower(), self.getpos()))

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower in self.VOID_ELEMENTS:
            return
        
        # スタックを逆順探索して一致する開始タグを探す
        found_idx = -1
        for idx in range(len(self.tag_stack) - 1, -1, -1):
            if self.tag_stack[idx][0] == tag_lower:
                found_idx = idx
                break
        
        if found_idx == -1:
            self.errors.append(f"閉じタグ </{tag_lower}> に対応する開始タグがありません (行 {self.getpos()[0]})")
        else:
            skipped = self.tag_stack[found_idx + 1:]
            for s_tag, s_pos in skipped:
                if s_tag in self.MAJOR_CONTAINERS:
                    self.errors.append(f"<{s_tag}> (行 {s_pos[0]}) が閉じられる前に </{tag_lower}> (行 {self.getpos()[0]}) が現れました")
            self.tag_stack = self.tag_stack[:found_idx]

    def finalize(self):
        for s_tag, s_pos in self.tag_stack:
            if s_tag in self.MAJOR_CONTAINERS:
                self.unclosed_tags.append(f"未閉じタグ <{s_tag}> (行 {s_pos[0]})")


def validate_article(filepath):
    filename = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    report = {
        'file': filename,
        'title': '',
        'category': '',
        'errors': [],
        'warnings': [],
        'checks': {
            'layout_header': False,
            'layout_global_nav': False,
            'layout_breadcrumbs': False,
            'layout_container': False,
            'layout_main_article': False,
            'layout_sidebar': False,
            'layout_footer': False,
            'cta_box': False,
            'cta_button': False,
            'category_meta': None,
            'nav_active_matches_category': False,
            'breadcrumb_matches_category': False,
            'h1_count': 0,
            'title_present': False,
            'description_present': False,
            'canonical_valid': False,
            'json_ld_article': False,
            'json_ld_faq': False,
            'faq_section_present': False,
            'sidebar_widgets_count': 0,
            'no_mojibake': True,
            'html_tags_balanced': False,
            'assets_exist': True
        }
    }

    # 1. 基本HTMLチェック & 文字化け・プレースホルダー検査
    if '\ufffd' in content:
        report['errors'].append("Unicode置換文字 (\\ufffd) が検出されました (文字化けの可能性)")
        report['checks']['no_mojibake'] = False
    if '&amp;amp;' in content:
        report['errors'].append("二重エスケープ '&amp;amp;' が検出されました")
        report['checks']['no_mojibake'] = False
    
    for bad_word in ['undefined', 'NaN', '[object Object]', 'TODO', 'TBD', 'lorem ipsum']:
        body_match = re.search(r'<article\b[^>]*>([\s\S]*?)</article>', content, re.IGNORECASE)
        if body_match and bad_word in ['TODO', 'TBD', 'lorem ipsum', 'placeholder']:
            if re.search(rf'\b{re.escape(bad_word)}\b', body_match.group(1), re.IGNORECASE):
                report['errors'].append(f"記事本文内にプレースホルダー '{bad_word}' が残っています")

    # 2. タイトル、H1、メタディスクリプション、Canonical
    title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
    if title_match and title_match.group(1).strip():
        report['checks']['title_present'] = True
        report['title'] = title_match.group(1).strip()
    else:
        report['errors'].append("<title> タグが存在しないか空です")

    h1_matches = re.findall(r'<h1\b[^>]*>(.*?)</h1>', content, re.IGNORECASE | re.DOTALL)
    report['checks']['h1_count'] = len(h1_matches)
    if len(h1_matches) != 1:
        report['errors'].append(f"<h1> タグが {len(h1_matches)} 個あります (1個である必要があります)")

    desc_match = re.search(r'<meta\s+content="([^"]*)"\s+name="description"|<meta\s+name="description"\s+content="([^"]*)"', content, re.IGNORECASE)
    if desc_match:
        desc = desc_match.group(1) or desc_match.group(2)
        if len(desc.strip()) >= 30:
            report['checks']['description_present'] = True
        else:
            report['errors'].append(f"meta description が短すぎます ({len(desc.strip())}文字)")
    else:
        report['errors'].append("meta description が存在しません")

    canonical_match = re.search(r'<link\s+[^>]*rel="canonical"[^>]*>|<link\s+[^>]*href="([^"]+)"\s+rel="canonical"', content, re.IGNORECASE)
    expected_canonical = f"https://playpoint-sim.com/articles/{filename}"
    if canonical_match:
        if expected_canonical in canonical_match.group(0):
            report['checks']['canonical_valid'] = True
        else:
            report['errors'].append(f"canonical URL が不一致です: {canonical_match.group(0)}")
    else:
        report['errors'].append("canonical link タグが存在しません")

    # 3. Cocoon風レイアウト要素の確認
    # (a) <header class="site-header">
    if re.search(r'<header\s+class="[^"]*\bsite-header\b[^"]*"', content):
        report['checks']['layout_header'] = True
    else:
        report['errors'].append('<header class="site-header"> が存在しません')

    # (b) <nav class="global-nav">
    if re.search(r'<nav\s+class="[^"]*\bglobal-nav\b[^"]*"', content):
        report['checks']['layout_global_nav'] = True
    else:
        report['errors'].append('<nav class="global-nav"> が存在しません')

    # (c) <div class="breadcrumbs-wrapper">
    if re.search(r'<div\s+class="[^"]*\bbreadcrumbs-wrapper\b[^"]*"', content):
        report['checks']['layout_breadcrumbs'] = True
    else:
        report['errors'].append('<div class="breadcrumbs-wrapper"> が存在しません')

    # (d) <div class="layout-container">
    if re.search(r'<div\s+class="[^"]*\blayout-container\b[^"]*"', content):
        report['checks']['layout_container'] = True
    else:
        report['errors'].append('<div class="layout-container"> が存在しません')

    # (e) <article class="content main-content-column">
    if re.search(r'<article\s+class="[^"]*\bmain-content-column\b[^"]*"|<article\s+class="[^"]*\bcontent\b[^"]*"', content):
        report['checks']['layout_main_article'] = True
    else:
        report['errors'].append('<article class="main-content-column"> が存在しません')

    # (f) <aside class="sidebar-column">
    if re.search(r'<aside\s+class="[^"]*\bsidebar-column\b[^"]*"', content):
        report['checks']['layout_sidebar'] = True
    else:
        report['errors'].append('<aside class="sidebar-column"> が存在しません')

    # (g) <footer class="site-footer">
    if re.search(r'<footer\s+class="[^"]*\bsite-footer\b[^"]*"', content):
        report['checks']['layout_footer'] = True
    else:
        report['errors'].append('<footer class="site-footer"> が存在しません')

    # 4. カテゴリとアクティブ状態・パンくずリストの整合性
    cat_match = re.search(r'<meta\s+content="([^"]*)"\s+name="article:category"|<meta\s+name="article:category"\s+content="([^"]*)"', content, re.IGNORECASE)
    if not cat_match:
        cat_match = re.search(r'data-article-category="([^"]*)"', content, re.IGNORECASE)
        category = cat_match.group(1) if cat_match else None
    else:
        category = cat_match.group(1) or cat_match.group(2)
    
    report['checks']['category_meta'] = category
    report['category'] = category or '不明'
    valid_categories = {'キャンペーン', 'ランク', '使い方', 'トラブル'}
    if category not in valid_categories:
        report['errors'].append(f"無効なカテゴリです: {category}")
    else:
        # グローバルナビのアクティブ状態確認
        nav_pattern = rf'<a\s+class="[^"]*\bnav-item\b[^"]*\bactive\b[^"]*"\s+href="\.\./blog/\?category={re.escape(category)}"'
        alt_nav_pattern = rf'<a\s+href="\.\./blog/\?category={re.escape(category)}"\s+class="[^"]*\bnav-item\b[^"]*\bactive\b[^"]*"'
        if re.search(nav_pattern, content) or re.search(alt_nav_pattern, content):
            report['checks']['nav_active_matches_category'] = True
        else:
            report['errors'].append(f"グローバルナビでカテゴリ '{category}' が active になっていません")

        # パンくずリスト内のカテゴリ確認
        bc_pattern = rf'<a\s+href="\.\./blog/\?category={re.escape(category)}"[^>]*>{re.escape(category)}</a>'
        if re.search(bc_pattern, content):
            report['checks']['breadcrumb_matches_category'] = True
        else:
            report['errors'].append(f"パンくずリスト内にカテゴリ '{category}' へのリンクがありません")

    # 5. 計算機CTAの確認
    cta_box_pattern = r'<aside\s+class="[^"]*\barticle-calculator-prompt\b[^"]*"'
    cta_button_pattern = r'<a\s+class="[^"]*(?:\barticle-calculator-prompt__button\b|\brounding-jump__button\b)[^"]*"'
    
    if re.search(cta_box_pattern, content):
        report['checks']['cta_box'] = True
    else:
        if re.search(r'class="[^"]*\bcta-box\b[^"]*"', content):
            report['checks']['cta_box'] = True
        else:
            report['errors'].append("計算機誘導CTAボックス (<aside class=\"article-calculator-prompt\">) がありません")

    if re.search(cta_button_pattern, content) or re.search(r'href="\.\./"[^>]*>計算機', content) or re.search(r'href="\.\./index\.html"[^>]*>計算機', content) or re.search(r'class="rounding-jump__button"', content):
        report['checks']['cta_button'] = True
    else:
        report['errors'].append("計算機誘導CTAボタン がありません")

    # 6. サイドバーウィジェットの確認
    sidebar_match = re.search(r'<aside\s+class="[^"]*\bsidebar-column\b[^"]*"[^>]*>([\s\S]*?)</aside>', content, re.IGNORECASE)
    if sidebar_match:
        sidebar_content = sidebar_match.group(1)
        widgets = re.findall(r'<div\s+class="[^"]*\bsidebar-widget\b[^"]*"', sidebar_content)
        report['checks']['sidebar_widgets_count'] = len(widgets)
        
        # 計算機バナー
        if not re.search(r'class="[^"]*\bsidebar-calc-banner\b[^"]*"|class="[^"]*\bsidebar-calc-btn\b[^"]*"', sidebar_content):
            report['errors'].append("サイドバー内に計算機バナー (sidebar-calc-banner) がありません")
        # ランク別必要額ガイド
        if not re.search(r'class="[^"]*\bsidebar-rank-grid\b[^"]*"|status/silver', sidebar_content):
            report['errors'].append("サイドバー内にランク別ガイド (sidebar-rank-grid) がありません")
        # カテゴリー一覧
        if not re.search(r'class="[^"]*\bsidebar-category-list\b[^"]*"', sidebar_content):
            report['errors'].append("サイドバー内にカテゴリー一覧 (sidebar-category-list) がありません")

    # 7. Schema.org JSON-LD の確認
    json_ld_matches = re.findall(r'<script\s+type="application/ld\+json">([\s\S]*?)</script>', content, re.IGNORECASE)
    has_article_schema = False
    has_faq_schema = False
    
    for json_str in json_ld_matches:
        try:
            data = json.loads(json_str)
            items = data if isinstance(data, list) else [data]
            for item in items:
                item_type = item.get('@type')
                if item_type == 'Article':
                    has_article_schema = True
                    for prop in ['headline', 'description', 'datePublished', 'dateModified', 'author', 'publisher', 'image']:
                        if prop not in item or not item[prop]:
                            report['errors'].append(f"Article JSON-LD に必須プロパティ '{prop}' が欠落しています")
                elif item_type == 'FAQPage':
                    has_faq_schema = True
                    main_entity = item.get('mainEntity', [])
                    if not isinstance(main_entity, list) or len(main_entity) == 0:
                        report['errors'].append("FAQPage JSON-LD の mainEntity が空または不正です")
                    else:
                        for q_idx, q in enumerate(main_entity):
                            if not q.get('name') or not q.get('acceptedAnswer', {}).get('text'):
                                report['errors'].append(f"FAQPage JSON-LD の質問 #{q_idx+1} に name または acceptedAnswer.text が欠落しています")
        except json.JSONDecodeError as e:
            report['errors'].append(f"JSON-LD パースエラー: {e}")

    report['checks']['json_ld_article'] = has_article_schema
    report['checks']['json_ld_faq'] = has_faq_schema
    if not has_article_schema:
        report['errors'].append("Article の Schema.org JSON-LD が存在しません")

    faq_heading = re.search(r'<h[2-3][^>]*>\s*(?:よくある質問|FAQ|Q&A|疑問)', content, re.IGNORECASE)
    report['checks']['faq_section_present'] = bool(faq_heading)
    if faq_heading and not has_faq_schema:
        report['warnings'].append("本文中に「よくある質問/FAQ」見出しがありますが、FAQPage JSON-LD がありません")

    # 8. アセット参照の検証 (CSS & JS)
    css_links = re.findall(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\']', content)
    for css in css_links:
        clean_css = css.split('?')[0]
        if clean_css.startswith('/'):
            abs_css = os.path.join(ROOT_DIR, clean_css.lstrip('/'))
        elif clean_css.startswith('./'):
            abs_css = os.path.join(ROOT_DIR, 'articles', clean_css[2:])
        elif clean_css.startswith('../'):
            abs_css = os.path.join(ROOT_DIR, clean_css[3:])
        else:
            abs_css = os.path.join(ROOT_DIR, 'articles', clean_css)
        if not os.path.exists(abs_css):
            report['errors'].append(f"参照先CSSが存在しません: {css} -> {abs_css}")
            report['checks']['assets_exist'] = False

    js_links = re.findall(r'<script[^>]+src=["\']([^"\']+\.js[^"\']*)["\']', content)
    for js in js_links:
        clean_js = js.split('?')[0]
        if clean_js.startswith('/'):
            abs_js = os.path.join(ROOT_DIR, clean_js.lstrip('/'))
        elif clean_js.startswith('./'):
            abs_js = os.path.join(ROOT_DIR, 'articles', clean_js[2:])
        elif clean_js.startswith('../'):
            abs_js = os.path.join(ROOT_DIR, clean_js[3:])
        else:
            abs_js = os.path.join(ROOT_DIR, 'articles', clean_js)
        if not os.path.exists(abs_js):
            report['errors'].append(f"参照先JSが存在しません: {js} -> {abs_js}")
            report['checks']['assets_exist'] = False

    # 9. HTMLパーサーによるタグバランス検証
    parser = HTMLStructureValidator()
    try:
        parser.feed(content)
        parser.finalize()
        if parser.errors:
            report['errors'].extend(parser.errors)
        if parser.unclosed_tags:
            report['errors'].extend(parser.unclosed_tags)
        if not parser.errors and not parser.unclosed_tags:
            report['checks']['html_tags_balanced'] = True
    except Exception as e:
        report['errors'].append(f"HTMLパース例外: {e}")

    return report


def main():
    html_files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "*.html")))
    print(f"=== PlayPoint 記事品質検証開始 (対象ファイル数: {len(html_files)}) ===")
    
    with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
        registry = json.load(f)
    registry_files = {os.path.basename(item['file']) for item in registry}
    scanned_files = {os.path.basename(f) for f in html_files}
    
    missing_in_registry = scanned_files - registry_files
    missing_in_dir = registry_files - scanned_files
    
    if missing_in_registry:
        print(f"[警告] レジストリ (articles.json) に未登録のファイル: {missing_in_registry}")
    if missing_in_dir:
        print(f"[エラー] レジストリにあるが存在しないファイル: {missing_in_dir}")

    total_errors = 0
    total_warnings = 0
    file_reports = []

    category_counts = {}

    for filepath in html_files:
        res = validate_article(filepath)
        file_reports.append(res)
        cat = res['checks']['category_meta'] or '不明'
        category_counts[cat] = category_counts.get(cat, 0) + 1
        
        if res['errors']:
            total_errors += len(res['errors'])
            print(f"\n[FAIL] {res['file']} (エラー {len(res['errors'])} 件):")
            for err in res['errors']:
                print(f"  [ERROR] {err}")
        if res['warnings']:
            total_warnings += len(res['warnings'])
            for warn in res['warnings']:
                print(f"  [WARN]  {warn}")

    print("\n" + "="*60)
    print("=== 検証結果サマリー ===")
    print(f"総スキャン記事数: {len(html_files)} 件")
    print(f"カテゴリ別内訳: {category_counts}")
    print(f"エラー総数: {total_errors} 件")
    print(f"警告総数: {total_warnings} 件")
    print("="*60)

    out_json_path = os.path.join(ROOT_DIR, "scripts", "articles_quality_report.json")
    with open(out_json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'total_files': len(html_files),
            'total_errors': total_errors,
            'total_warnings': total_warnings,
            'category_counts': category_counts,
            'file_reports': file_reports
        }, f, ensure_ascii=False, indent=2)
    print(f"詳細レポートを保存しました: {out_json_path}")

    return total_errors


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
