<?php
// WordPressの公開データを既存台帳へ重ねる。外部通信・DB書込・広告処理は行わない。
namespace PlayPoint\Catalog;

function plain($value) {
    return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string) $value), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
}

function path($value) {
    $value = (string) $value;
    if (str_starts_with($value, '../')) $value = substr($value, 2);
    if (!str_starts_with($value, '/')) return '';
    if (!preg_match('~^/(?:articles/[a-z0-9-]+\.html|games/[a-z0-9-]+/(?:[a-z0-9-]+/)*index\.html)$~D', $value)) return '';
    return $value;
}

function sections($html) {
    $dom = new \DOMDocument('1.0', 'UTF-8');
    $old = libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8"><html><body>' . $html . '</body></html>', LIBXML_NONET);
    libxml_clear_errors(); libxml_use_internal_errors($old);
    $xp = new \DOMXPath($dom);
    foreach ($xp->query('//script|//style|//noscript|//nav|//form') as $node) $node->parentNode->removeChild($node);
    $result = [['id'=>'', 'heading'=>'', 'text'=>'']];
    foreach ($xp->query('//h2|//h3|//p[not(ancestor::li) and not(ancestor::table)]|//li[not(ancestor::li) and not(ancestor::table)]|//table|//figcaption') as $node) {
        $text = plain($node->textContent);
        if ($text === '') continue;
        if (in_array($node->nodeName, ['h2','h3'], true)) {
            $result[] = ['id'=>$node->getAttribute('id'), 'heading'=>$text, 'text'=>''];
        } else {
            $key = count($result)-1;
            $result[$key]['text'] = trim($result[$key]['text'] . ' ' . $text);
        }
    }
    return array_values(array_filter($result, fn($s) => $s['heading'] !== '' || $s['text'] !== ''));
}

function build(array $catalog, array $search, array $posts) {
    if (($search['version'] ?? null) !== 1 || !is_array($search['articles'] ?? null)) throw new \RuntimeException('検索索引が不正です。');
    $known = [];
    foreach ($catalog as $entry) {
        $key = path($entry['file'] ?? '');
        if (!$key || isset($known[$key])) throw new \RuntimeException('記事台帳のURLが不正または重複しています。');
        $known[$key] = true;
    }
    $changes = [];
    foreach ($posts as $post) {
        $key = path($post['path'] ?? '');
        // 未移行の記事や、任意の新規URLを公開対象へ混ぜない。
        if (!$key || !isset($known[$key])) continue;
        if (isset($changes[$key])) throw new \RuntimeException('移行対象のURLが重複しています。');
        $changes[$key] = $post;
    }
    $listed = []; $indexed = [];
    foreach ($catalog as $entry) {
        $key = path($entry['file']);
        if (!isset($changes[$key])) { $listed[] = $entry; continue; }
        $p = $changes[$key];
        if (($p['status'] ?? '') !== 'publish' || !empty($p['password'])) continue;
        $title = plain($p['title'] ?? '');
        if ($title === '') throw new \RuntimeException('公開記事のタイトルが空です。');
        $entry['title'] = $title;
        $entry['listTitle'] = plain($p['listTitle'] ?? '') ?: $title;
        $entry['description'] = plain($p['description'] ?? '');
        $entry['listDescription'] = plain($p['excerpt'] ?? '') ?: $entry['description'];
        $entry['modified'] = substr($p['modified'] ?? $entry['modified'] ?? '',0,10);
        if (!empty($p['published'])) $entry['date'] = substr($p['published'],0,10);
        if (!empty($p['category'])) $entry['browseCategory'] = plain($p['category']);
        if (array_key_exists('tags',$p)) $entry['tags'] = array_values(array_map(__NAMESPACE__.'\\plain',$p['tags']));
        $listed[] = $entry;
    }
    foreach ($search['articles'] as $entry) {
        $key = path($entry['path'] ?? '');
        if (!isset($changes[$key])) { $indexed[] = $entry; continue; }
        $p = $changes[$key];
        if (($p['status'] ?? '') !== 'publish' || !empty($p['password'])) continue;
        $entry['title'] = plain($p['title'] ?? '');
        $entry['description'] = plain($p['description'] ?? '') ?: plain($p['excerpt'] ?? '');
        if (!empty($p['category'])) $entry['category'] = plain($p['category']);
        if (array_key_exists('tags',$p)) $entry['tags'] = array_values(array_map(__NAMESPACE__.'\\plain',$p['tags']));
        $entry['sections'] = sections($p['html'] ?? '');
        $indexed[] = $entry;
    }
    $search['articles'] = $indexed;
    $counts = [];
    foreach ($listed as $entry) {
        if (($entry['listed'] ?? true) === false) continue;
        $category = $entry['browseCategory'] ?? $entry['category'] ?? '';
        if ($category !== '') $counts[$category] = ($counts[$category] ?? 0) + 1;
    }
    return ['catalog'=>$listed,'search'=>$search,'categories'=>$counts,'generation'=>hash('sha256',json_encode([$listed,$indexed],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))];
}

function wordpress_posts(array $mapping) {
    $result = [];
    foreach ($mapping as $id=>$sourcePath) {
        $post = get_post((int)$id);
        $terms = $post ? wp_get_post_terms($post->ID,'category') : [];
        $category = '';
        if (!is_wp_error($terms)) foreach ($terms as $term) {
            if ((int)$term->term_id !== (int)get_option('default_category')) { $category=$term->name; break; }
        }
        $tags = $post ? wp_get_post_terms($post->ID,'post_tag',['fields'=>'names']) : [];
        $description = $post ? get_post_meta($post->ID,'the_page_meta_description',true) : '';
        $result[] = ['path'=>$sourcePath,'status'=>$post ? $post->post_status : 'missing','password'=>$post ? $post->post_password : '',
            'title'=>$post ? $post->post_title : '', 'excerpt'=>$post ? $post->post_excerpt : '',
            'description'=>$description ?: ($post ? $post->post_excerpt : ''), 'html'=>$post ? $post->post_content : '',
            'listTitle'=>$post ? get_post_meta($post->ID,'playpoint_list_title',true) : '',
            'modified'=>$post ? get_post_datetime($post,'modified','local')->format('Y-m-d') : '',
            'published'=>$post ? get_post_datetime($post,'date','local')->format('Y-m-d') : '',
            'category'=>$category,'tags'=>is_wp_error($tags) ? [] : $tags];
    }
    return $result;
}
