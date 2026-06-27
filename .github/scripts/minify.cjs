const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function minifyCSS(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '') // コメント削除
    .replace(/\r?\n\s*/g, '\n') // 改行とインデントを詰める
    .replace(/\n+/g, '\n') // 連続する改行を1つに
    .trim();
}

function minifyJS(content) {
  // JSは正規表現でコメントを削ると文字列や正規表現リテラルを壊すため、保守的に空白だけ整える。
  return content
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const cssTargets = [
  'style.css',
  'articles/article-common.css',
  'articles/article-shared.css',
  'articles/source-notice.css',
  'blog/style.css',
  'kindle-tracker/style.css',
  'kids-smile-land/style.css',
  'kids-smile-land/tailwind-built.css',
  'tools/gravity-todo/style.css'
];

const jsTargets = [
  'sw.js',
  'js/main.js',
  'js/calculator.js',
  'js/ui.js',
  'js/diary.js',
  'js/share.js',
  'js/config.js',
  'js/consent.js',
  'js/intent-tracking.js',
  'js/third-party.js',
  'blog/article.js',
  'blog/components.js',
  'blog/script.js',
  'blog/utils.js',
  'embed/playpoint-widget.js',
  'kindle-tracker/app.js',
  'kindle-tracker/sw.js',
  'kids-smile-land/app.js',
  'kids-smile-land/service-worker.js',
  'tools/gravity-todo/sw.js',
  'tools/gravity-todo/src/BGMManager.js',
  'tools/gravity-todo/src/GyroManager.js',
  'tools/gravity-todo/src/InteractionManager.js',
  'tools/gravity-todo/src/ParticleSystem.js',
  'tools/gravity-todo/src/PhysicsEngine.js',
  'tools/gravity-todo/src/SettingsManager.js',
  'tools/gravity-todo/src/SoundManager.js',
  'tools/gravity-todo/src/StorageManager.js',
  'tools/gravity-todo/src/TaskDetailPanel.js',
  'tools/gravity-todo/src/TaskRenderer.js',
  'tools/gravity-todo/src/TimeTheme.js',
  'tools/gravity-todo/src/UIManager.js',
  'tools/gravity-todo/src/consent-manager.js',
  'tools/gravity-todo/src/main.js',
  'tools/gravity-todo/src/taskText.js'
];

function resolveTargets(targets) {
  return targets.map((target) => path.join(root, target));
}

function main() {
  for (const file of resolveTargets(cssTargets)) {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const min = minifyCSS(raw);
      fs.writeFileSync(file, min, 'utf8');
      console.log(`Minified CSS: ${path.basename(file)} (${raw.length} -> ${min.length} bytes)`);
    }
  }

  for (const file of resolveTargets(jsTargets)) {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const min = minifyJS(raw);
      fs.writeFileSync(file, min, 'utf8');
      console.log(`Minified JS: ${path.basename(file)} (${raw.length} -> ${min.length} bytes)`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { cssTargets, jsTargets, minifyCSS, minifyJS };
