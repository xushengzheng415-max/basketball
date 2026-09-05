const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__filename);

// Load env
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

async function getAccessToken(forceRefresh = false) {
  const file = path.join(ROOT, '.cache.json');
  if (!forceRefresh && fs.existsSync(file)) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (cached.access_token && cached.expires_at > Date.now() + 5 * 60 * 1000) return cached.access_token;
    } catch { }
  }
  const data = await requestJson(`${WECHAT_BASE}/cgi-bin/stable_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credential',
      appid: process.env.WECHAT_APP_ID,
      secret: process.env.WECHAT_APP_SECRET,
      force_refresh: Boolean(forceRefresh)
    })
  });
  fs.writeFileSync(file, JSON.stringify({ access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 }, null, 2), 'utf8');
  return data.access_token;
}

function mimeFromFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  throw new Error('封面仅支持 JPG/JPEG/PNG 文件。');
}

async function uploadThumb(file, token) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) throw new Error(`找不到封面文件：${absolute}`);
  const form = new FormData();
  form.append('media', new Blob([fs.readFileSync(absolute)], { type: mimeFromFile(absolute) }), path.basename(absolute));
  const data = await requestJson(`${WECHAT_BASE}/cgi-bin/material/add_material?access_token=${encodeURIComponent(token)}&type=thumb`, {
    method: 'POST', body: form
  });
  return data.media_id;
}

async function uploadContentImage(file, token) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) throw new Error(`找不到正文图片：${absolute}`);
  const form = new FormData();
  form.append('media', new Blob([fs.readFileSync(absolute)], { type: mimeFromFile(absolute) }), path.basename(absolute));
  const data = await requestJson(`${WECHAT_BASE}/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', body: form
  });
  if (!data.url) throw new Error(`微信未返回正文图片 URL：${absolute}`);
  return data.url;
}

async function prepareArticleImages(article, token) {
  let content = article.content_html;
  for (const image of article.content_images || []) {
    if ((!image.file_path && !image.wechat_url) || !image.placeholder) throw new Error(`正文图片配置缺少 file_path/wechat_url 或 placeholder：${article.title}`);
    if (!content.includes(image.placeholder)) throw new Error(`正文中找不到图片占位符 ${image.placeholder}：${article.title}`);
    const url = image.wechat_url || await uploadContentImage(image.file_path, token);
    const alt = String(image.alt || image.caption || '').replace(/["<>]/g, '');
    const caption = image.caption
      ? `<p style="text-align:center;color:#888;font-size:12px;">${String(image.caption).replace(/[<>]/g, '')}${image.credit ? `｜来源：${String(image.credit).replace(/[<>]/g, '')}` : ''}</p>`
      : '';
    content = content.replace(image.placeholder, `<p style="text-align:center;"><img src="${url}" alt="${alt}" style="max-width:100%;height:auto;" /></p>${caption}`);
  }
  return content;
}

async function updateDraft(mediaId, articlePackage, { cover, thumbMediaId, sourceUrl, comments, index = 0 }) {
  if (!mediaId) throw new Error('请提供 --media-id 草稿 media_id。');
  if (articlePackage.articles.length !== 1) throw new Error('update 命令一次只更新一篇文章。');
  const token = await getAccessToken();
  const article = articlePackage.articles[0];
  let articleThumb = article.thumb_media_id || thumbMediaId || process.env.WECHAT_THUMB_MEDIA_ID || '';
  if (!articleThumb && article.cover_path) articleThumb = await uploadThumb(article.cover_path, token);
  if (!articleThumb && cover) articleThumb = await uploadThumb(cover, token);
  if (!articleThumb) throw new Error(`文章缺少封面：${article.title}。`);
  const content = await prepareArticleImages(article, token);
  const payload = {
    media_id: mediaId,
    index: Number(index),
    articles: {
      title: article.title,
      author: process.env.ARTICLE_AUTHOR || '蜂家日记编辑部',
      digest: article.digest,
      content,
      content_source_url: sourceUrl || '',
      thumb_media_id: articleThumb,
      need_open_comment: comments ? 1 : 0,
      only_fans_can_comment: comments === 'fans' ? 1 : 0
    }
  };
  return requestJson(`${WECHAT_BASE}/cgi-bin/draft/update?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload)
  });
}

async function main() {
  const MEDIA_ID = 'EoRn4vp3IXataGIyLTOcZ2t7uVkXqsfkTbMlU175Ad5eYP3zs17ZVLqAuxKgFMLz';
  const JSON_FILE = 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/文字稿/公众号草稿包.json';
  
  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  
  const result = await updateDraft(MEDIA_ID, data, {});
  console.log(JSON.stringify({ ok: true, media_id: MEDIA_ID, result }, null, 2));
}

main().catch((error) => {
  console.error(`失败：${error.message}`);
  process.exitCode = 1;
});
