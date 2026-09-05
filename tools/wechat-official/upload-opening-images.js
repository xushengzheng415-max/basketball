const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__filename);
const cacheFile = path.join(ROOT, '.cache.json');

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`非JSON: ${text.slice(0, 300)}`); }
  if (!response.ok || data.errcode) {
    throw new Error(`失败${data.errcode ? ' errcode='+data.errcode : ''}: ${data.errmsg || text.slice(0, 300)}`);
  }
  return data;
}

async function getAccessToken() {
  const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  return cached.access_token;
}

async function uploadContentImage(file, token) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) throw new Error(`找不到图片：${absolute}`);
  const form = new FormData();
  const ext = path.extname(absolute).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : (ext === '.gif' ? 'image/gif' : 'image/jpeg');
  form.append('media', new Blob([fs.readFileSync(absolute)], { type: mime }), path.basename(absolute));
  const data = await requestJson(`https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', body: form
  });
  if (!data.url) throw new Error(`微信未返回图片URL：${absolute}`);
  return data.url;
}

async function main() {
  const token = await getAccessToken();
  
  const images = [
    'E:/微信聊天备份/xwechat_files/wxid_3cuf2qp7fvqp22_242d/temp/RWTemp/2026-08/9e20f478899dc29eb19741386f9343c8/43ed0392cd7e7bae37c94d5f98122e9b.png',
    'E:/微信聊天备份/xwechat_files/wxid_3cuf2qp7fvqp22_242d/temp/RWTemp/2026-08/9e20f478899dc29eb19741386f9343c8/ed2e6439d42ea896d3a1c8b5bd10253c.png',
    'E:/微信聊天备份/xwechat_files/wxid_3cuf2qp7fvqp22_242d/temp/RWTemp/2026-08/9e20f478899dc29eb19741386f9343c8/7ea5dac2ccd5dc853a83b2b1c31adf88.jpg',
    'E:/微信聊天备份/xwechat_files/wxid_3cuf2qp7fvqp22_242d/temp/RWTemp/2026-08/9e20f478899dc29eb19741386f9343c8/5cb2a11f91be6720a75d45ee8e9116ad.jpg'
  ];
  
  const results = [];
  for (let i = 0; i < images.length; i++) {
    console.log(`上传图片 ${i+1}/4 ...`);
    const url = await uploadContentImage(images[i], token);
    results.push(url);
    console.log(`  成功: ${url}`);
  }
  
  console.log('\n全部上传完成！');
  results.forEach((url, i) => console.log(`图片${i+1}: ${url}`));
}

main().catch(e => { console.error(e.message); process.exit(1); });
