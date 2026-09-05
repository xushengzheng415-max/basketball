const fs = require('fs');
let lines = fs.readFileSync('E:/Documents/sxf-basketball/tools/wechat-official/final-update.js', 'utf8').split('\n');
// 删除第177-180行（索引176-179）
lines.splice(176, 4);
fs.writeFileSync('E:/Documents/sxf-basketball/tools/wechat-official/final-update.js', lines.join('\n'), 'utf8');
console.log('Fixed, now ' + lines.length + ' lines');
