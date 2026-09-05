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

async function main() {
  const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const token = cached.access_token;
  
  // 获取图片素材列表
  const result = await requestJson(
    `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'image', offset: 0, count: 20 })
    }
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
