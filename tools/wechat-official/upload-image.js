const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__filename);
const ENV_FILE = path.join(ROOT, '.env.local');
for (const rawLine of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match || process.env[match[1]] !== undefined) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[match[1]] = value;
}

const WECHAT_BASE = 'https://api.weixin.qq.com';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`接口返回了非 JSON 内容（HTTP ${response.status}）：${text.slice(0, 300)}`); }
  if (!response.ok || data.errcode) {
    const code = data.errcode ? ` errcode=${data.errcode}` : '';
    throw new Error(`接口调用失败（HTTP ${response.status}${code}）：${data.errmsg || text.slice(0, 300)}`);
  }
  return data;
}

async function getAccessToken() {
  const file = path.join(ROOT, '.cache.json');
  const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
  return cached.access_token;
}

async function uploadContentImage(file, token) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) throw new Error(`找不到正文图片：${absolute}`);
  const form = new FormData();
  const ext = path.extname(absolute).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  form.append('media', new Blob([fs.readFileSync(absolute)], { type: mime }), path.basename(absolute));
  const data = await requestJson(`${WECHAT_BASE}/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', body: form
  });
  if (!data.url) throw new Error(`微信未返回正文图片 URL：${absolute}`);
  return data.url;
}

async function main() {
  const token = await getAccessToken();
  const imagePath = 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/图片素材/正文图1.png';
  const url = await uploadContentImage(imagePath, token);
  console.log('图片已上传至微信CDN：');
  console.log(url);
}

main().catch((error) => {
  console.error(`失败：${error.message}`);
  process.exitCode = 1;
});
