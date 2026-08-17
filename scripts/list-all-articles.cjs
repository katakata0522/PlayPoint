const fs = require('fs');
const articles = JSON.parse(fs.readFileSync('blog/articles.json', 'utf8'));

console.log(`Total articles: ${articles.length}\n`);

const byCategory = {};
articles.forEach((a, i) => {
  byCategory[a.category] = byCategory[a.category] || [];
  byCategory[a.category].push({
    num: i + 1,
    title: a.title,
    file: a.file.replace(/^\.\.\//, ''),
    datePublished: a.datePublished,
    dateModified: a.dateModified
  });
});

for (const [cat, list] of Object.entries(byCategory)) {
  console.log(`=== 【${cat}】(${list.length}本) ===`);
  list.forEach(a => {
    console.log(`${a.num}. ${a.title} [${a.file}] (Pub: ${a.datePublished}, Mod: ${a.dateModified})`);
  });
  console.log('');
}
