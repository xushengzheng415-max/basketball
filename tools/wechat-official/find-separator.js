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
  
  // 翻页获取所有图片素材，查找分隔符
  let offset = 0;
  const allItems = [];
  
  while (offset < 236) {
    const result = await requestJson(
      `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'image', offset, count: 20 })
      }
    );
    allItems.push(...result.item);
    offset += 20;
  }
  
  // 搜索包含 分隔符、separator、divider、line 的文件名
  const keywords = ['分隔', '分隔符', 'separator', 'divider', 'line', '分割', '装饰', '横线'];
  const found = allItems.filter(item => 
    keywords.some(kw => item.name.toLowerCase().includes(kw.toLowerCase()))
  );
  
  console.log(`找到 ${found.length} 个匹配的分隔符素材：`);
  found.forEach(item => {
    console.log(`- ${item.name}`);
    console.log(`  media_id: ${item.media_id}`);
    console.log(`  url: ${item.url}`);
  });
  
  if (found.length === 0) {
    console.log('\n未找到匹配的分隔符。所有素材文件名列表（前50个）：');
    allItems.slice(0, 50).forEach(item => console.log(`- ${item.name}`));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
