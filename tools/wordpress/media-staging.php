<?php
/** Plugin Name: PlayPoint stg media helper */
if (!defined('ABSPATH')) exit;
if (rtrim(str_replace('\\', '/', ABSPATH), '/') !== '/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms') return;
if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'stg.playpoint-sim.com') return;
if (!is_admin()) return;

// 標準のアップロード完了後も、動的テンプレートを使わない一覧へ戻す。
// 表示設定はDBへ書き込まず、明示的な mode=grid は診断用に残す。
add_filter('get_user_option_media_library_mode', function ($value) {
    return current_user_can('manage_options') ? 'list' : $value;
});

function ppms_image($id) {
    $post = get_post($id);
    $mimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    if (!$post || $post->post_type !== 'attachment' || $post->post_status !== 'inherit'
        || !in_array($post->post_mime_type, $mimes, true) || !current_user_can('edit_post', $id)) return null;
    $upload = wp_get_upload_dir();
    $root = realpath($upload['basedir']);
    $file = get_attached_file($id);
    $file = is_string($file) ? realpath($file) : false;
    if (!$root || !$file || !is_file($file) || !str_starts_with($file, $root . DIRECTORY_SEPARATOR)) return null;
    $image = wp_get_attachment_image_src($id, 'large');
    if (!$image || (int) $image[1] < 1 || (int) $image[2] < 1) return null;
    $url = wp_parse_url($image[0]);
    $path = $url['path'] ?? '';
    if (($url['scheme'] ?? '') !== 'https' || strtolower($url['host'] ?? '') !== 'stg.playpoint-sim.com'
        || isset($url['user']) || isset($url['pass']) || isset($url['port'])
        || !str_starts_with($path, '/cms/wp-content/uploads/')
        || preg_match('~(?:^|/)(?:\.|%2e){1,2}(?:/|$)|[\\\\\x00-\x20]~i', rawurldecode($path))) return null;
    $alt = get_post_meta($id, '_wp_attachment_image_alt', true);
    $alt = is_string($alt) ? $alt : '';
    $html = sprintf('<img src="%s" alt="%s" width="%d" height="%d" class="alignnone size-large wp-image-%d" loading="lazy" decoding="async">',
        esc_url($image[0]), esc_attr($alt), $image[1], $image[2], $id);
    return ['url' => $image[0], 'html' => $html, 'filename' => wp_basename($file), 'width' => (int) $image[1], 'height' => (int) $image[2]];
}

function ppms_page() {
    if (!current_user_can('manage_options') || !current_user_can('upload_files')) {
        wp_die('この画面を使う権限がありません。', '', ['response' => 403]);
    }
    $base = admin_url('upload.php?page=playpoint-media-staging');
    $term = isset($_GET['s']) && is_string($_GET['s']) ? sanitize_text_field(wp_unslash($_GET['s'])) : '';
    $page = isset($_GET['paged']) && is_string($_GET['paged']) && preg_match('/\A[0-9]+\z/', $_GET['paged']) ? max(1, min(10000, (int) $_GET['paged'])) : 1;
    $id = isset($_GET['image']) && is_string($_GET['image']) && preg_match('/\A[0-9]+\z/', $_GET['image']) ? (int) $_GET['image'] : 0;
    $selected = $id > 0 ? ppms_image($id) : null;
    echo '<div class="wrap"><h1>画像アップロード・挿入用HTML</h1>';
    echo '<p>画像の追加はWordPress標準のブラウザーアップローダーを使います。記事への挿入は、この画面で作ったHTMLを編集画面に貼り付けて保存します。</p>';
    echo '<p><a class="button button-primary" href="' . esc_url(admin_url('media-new.php?browser-uploader=1')) . '">画像をアップロード</a> ';
    echo '<a class="button" href="' . esc_url(admin_url('upload.php?mode=list')) . '">標準のメディア一覧</a></p>';
    if ($selected) {
        echo '<h2>挿入する画像</h2><p style="overflow-wrap:anywhere">' . esc_html($selected['filename']) . '（' . esc_html($selected['width'] . ' × ' . $selected['height']) . '）</p>';
        echo '<p><img src="' . esc_url($selected['url']) . '" alt="" width="160" style="max-width:100%;height:auto"></p>';
        echo '<p><label for="ppms-html">挿入用HTML</label></p><textarea id="ppms-html" class="large-text code" rows="5" readonly>' . esc_textarea($selected['html']) . '</textarea>';
        echo '<p>HTMLを選択してコピーし、記事の「カスタムHTML」ブロック、またはコードエディターの挿入位置へ貼り付けてください。画像の置換は対象のimg要素だけを差し替えます。画像ファイルと他の記事は上書きしません。</p>';
        echo '<p><a href="' . esc_url(get_edit_post_link($id, 'raw')) . '">代替テキスト・タイトルを編集</a>。編集後、この画面を開き直すとHTMLにも反映されます。記事の更新・プレビューで画像と配置を確認してください。</p>';
    } elseif (isset($_GET['image'])) {
        echo '<div class="notice notice-error"><p>この画像は利用できません。stgのアップロード画像を選び直してください。</p></div>';
    }
    echo '<h2>画像を選ぶ</h2><form method="get" action="' . esc_url(admin_url('upload.php')) . '"><input type="hidden" name="page" value="playpoint-media-staging">';
    echo '<p><label for="ppms-search">ファイル名・タイトルを検索</label> <input id="ppms-search" name="s" type="search" value="' . esc_attr($term) . '"> <button class="button" type="submit">検索</button></p></form>';
    $query = new WP_Query(['post_type' => 'attachment', 'post_status' => 'inherit', 'post_mime_type' => 'image', 'posts_per_page' => 20,
        'paged' => $page, 's' => $term, 'orderby' => ['date' => 'DESC', 'ID' => 'DESC']]);
    echo '<ul style="overflow-wrap:anywhere">';
    $count = 0;
    foreach ($query->posts as $post) {
        $image = ppms_image($post->ID);
        if (!$image) continue;
        $count++;
        $label = $post->post_title ?: $image['filename'];
        echo '<li><a href="' . esc_url(add_query_arg(['image' => $post->ID, 's' => $term, 'paged' => $page], $base)) . '">' . esc_html($label) . '</a> — ';
        echo esc_html($image['filename']) . '（' . esc_html($image['width'] . ' × ' . $image['height']) . '）</li>';
    }
    echo '</ul>';
    if (!$count) echo '<p>このページに利用できる画像はありません。検索語を変えるか、画像をアップロードしてください。</p>';
    echo '<p>';
    if ($page > 1) echo '<a class="button" href="' . esc_url(add_query_arg(['s' => $term, 'paged' => $page - 1], $base)) . '">前のページ</a> ';
    if ($page < $query->max_num_pages) echo '<a class="button" href="' . esc_url(add_query_arg(['s' => $term, 'paged' => $page + 1], $base)) . '">次のページ</a>';
    echo '</p><p>一覧は1ページ20件です。公開ページのCSPとWordPressコアは変更していません。</p></div>';
}

add_action('admin_menu', function () {
    add_media_page('画像アップロード・挿入用HTML', '画像アップロード・挿入用HTML', 'manage_options', 'playpoint-media-staging', 'ppms_page');
});
