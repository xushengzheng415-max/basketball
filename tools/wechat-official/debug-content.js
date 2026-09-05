const fs = require('fs');

const JSON_FILE = 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/文字稿/公众号草稿包.json';
const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

// Simulate prepareArticleImages
let content = data.articles[0].content_html;
const image = data.articles[0].content_images[0];

console.log('Has placeholder:', content.includes(image.placeholder));
console.log('Placeholder index:', content.indexOf(image.placeholder));
console.log('Content around placeholder:');
const idx = content.indexOf(image.placeholder);
console.log(content.substring(Math.max(0, idx - 100), idx + image.placeholder.length + 100));
