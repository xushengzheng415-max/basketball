const fs = require('fs');
const path = 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/文字稿/公众号排版.html';
let html = fs.readFileSync(path, 'utf8');
html = html.replace(
  '<p class="indent">问题是，基层机构跟得上吗？</p>\n\n<h2>数字化不是选择题，但也不是抢答题</h2>',
  '<p class="indent">问题是，基层机构跟得上吗？</p>\n\n<p>{{MAIN_IMAGE_1}}</p>\n\n<h2>数字化不是选择题，但也不是抢答题</h2>'
);
fs.writeFileSync(path, html, 'utf8');
console.log('HTML updated');
