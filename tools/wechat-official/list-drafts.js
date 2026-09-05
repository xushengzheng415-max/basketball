const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const cacheFile = path.join(ROOT, '.cache.json');

async function requestJson(url, opts) {
  const r = await fetch(url, opts);
  const t = await r.text();
  let d;
  try { d = JSON.parse(t); } catch(e) { throw new Error(t.slice(0, 300)); }
  if (!r.ok || d.errcode) throw new Error(JSON.stringify(d));
  return d;
}

async function main() {
  const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const token = cached.access_token;
  const result = await requestJson(
    `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ offset: 0, count: 20, no_content: 1 })
    }
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
