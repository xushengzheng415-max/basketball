const fs = require('fs');
const path = 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/文字稿/公众号草稿包.json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Add image placeholder to content_html
const article = data.articles[0];
article.content_html = article.content_html.replace(
  '<p style="text-indent:2em;">问题是，基层机构跟得上吗？</p><h2',
  '<p style="text-indent:2em;">问题是，基层机构跟得上吗？</p><p>{{MAIN_IMAGE_1}}</p><h2'
);

// Add content image
article.content_images = [
  {
    placeholder: '{{MAIN_IMAGE_1}}',
    file_path: 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/图片素材/正文图1.png',
    alt: '教练在球场边记录训练数据',
    caption: '数据化管理的起点可以很低，一张纸、一支笔就能开始',
    credit: 'AI生成'
  }
];

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('JSON updated');
