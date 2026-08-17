const fs = require('fs');
const path = require('path');

const articlesDir = path.resolve(__dirname, '../articles');
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.html'));

const findings = [];

files.forEach(file => {
  const filePath = path.join(articlesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  const issueList = [];

  // 1. 公式ヘルプURLのチェック
  const hasOfficialHelp = /support\.google\.com\/googleplay|blog\.google/i.test(content);
  if (!hasOfficialHelp) {
    issueList.push('公式ヘルプへの参照リンクなし');
  }

  // 2. 過去の誤認ワードや廃止機能の断定チェック
  if (content.includes('150万円必要') && !content.includes('とは限りません') && !content.includes('誤解')) {
    issueList.push('「150万円必要」の無批判な断定');
  }
  if (content.includes('週1000ポイント確定') || content.includes('週次特典で1000pt確定')) {
    issueList.push('ウィークリーリワード上限の誤認');
  }
  if (content.includes('YouTube Premiumでポイントが貯まる') && !content.includes('Playストア経由') && !content.includes('対象外')) {
    issueList.push('YouTube Premium付与条件の曖昧さ');
  }
  if (content.includes('Family Link') && content.includes('裏技で参加')) {
    issueList.push('Family Link回避策の誤記載');
  }

  // 3. タイトル・H1の存在
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) {
    issueList.push('H1見出しなし');
  }

  // 4. メタディスクリプション
  const metaDesc = content.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!metaDesc || metaDesc[1].length < 30) {
    issueList.push('meta descriptionが不足または短い');
  }

  // 5. Schema.org Article
  if (!content.includes('"@type":"Article"') && !content.includes('"@type": "Article"')) {
    issueList.push('Article JSON-LDなし');
  }

  // 6. 日付
  const modMatch = content.match(/"dateModified":"([^"]*)"/i) || content.match(/dateModified\s*=\s*"([^"]*)"/i);

  findings.push({
    file,
    title: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : 'No H1',
    dateModified: modMatch ? modMatch[1] : 'Unknown',
    issues: issueList
  });
});

console.log('=== Deep Article Audit Results ===');
console.log(`Total checked: ${findings.length}`);
const withIssues = findings.filter(f => f.issues.length > 0);
console.log(`Articles with issues: ${withIssues.length}`);
if (withIssues.length > 0) {
  console.log(JSON.stringify(withIssues, null, 2));
} else {
  console.log('All articles passed baseline integrity checks!');
}
