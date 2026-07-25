#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
loadEnv(path.join(ROOT, '.env.local'));

const WECHAT_BASE = 'https://api.weixin.qq.com';
const OPENAI_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
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
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      result._.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s);
    if (inlineValue !== undefined) result[rawKey] = inlineValue;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) result[rawKey] = argv[++i];
    else result[rawKey] = true;
  }
  return result;
}

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`缺少环境变量：${missing.join(', ')}`);
}

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

function cachePath() { return path.join(ROOT, '.cache.json'); }

async function getAccessToken(forceRefresh = false) {
  requireEnv(['WECHAT_APP_ID', 'WECHAT_APP_SECRET']);
  const file = cachePath();
  if (!forceRefresh && fs.existsSync(file)) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (cached.access_token && cached.expires_at > Date.now() + 5 * 60 * 1000) return cached.access_token;
    } catch { /* ignore damaged cache */ }
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

function extractResponseText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  return (data.output || []).flatMap((item) => item.content || []).map((item) => item.text || '').join('');
}

function parseArticleJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error(`AI 返回内容不是有效 JSON：${cleaned.slice(0, 300)}`); }
  const articles = Array.isArray(parsed.articles) ? parsed.articles : [parsed];
  if (!articles.length || articles.length > 8) throw new Error('文章数量必须在 1—8 篇之间。');
  for (const article of articles) {
    for (const field of ['title', 'digest', 'content_html']) {
      if (!article[field] || typeof article[field] !== 'string') throw new Error(`AI 结果缺少字段：${field}`);
    }
    if (article.title.length > 64) throw new Error(`标题超过 64 个字符：${article.title}`);
    if (article.digest.length > 120) article.digest = article.digest.slice(0, 120);
  }
  return { articles, source_note: parsed.source_note || '' };
}

async function generateArticle({ topic, briefing }) {
  requireEnv(['OPENAI_API_KEY']);
  const prompt = fs.readFileSync(path.join(ROOT, 'article-prompt.txt'), 'utf8');
  const source = briefing ? fs.readFileSync(path.resolve(briefing), 'utf8') : '';
  const input = `选题：${topic || '请根据资料确定最有价值的选题'}\n\n用户资料：\n${source || '未提供额外资料。不得虚构具体人物和数据。'}`;
  const data = await requestJson(`${OPENAI_BASE}/responses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
      instructions: prompt,
      input,
      reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || 'low' },
      text: { verbosity: 'medium' }
    })
  });
  return parseArticleJson(extractResponseText(data));
}

function readArticle(file) {
  const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  return parseArticleJson(JSON.stringify(data));
}

async function addDraft(articlePackage, { cover, thumbMediaId, sourceUrl, comments }) {
  const token = await getAccessToken();
  let sharedThumb = thumbMediaId || process.env.WECHAT_THUMB_MEDIA_ID || '';
  if (!sharedThumb && cover) sharedThumb = await uploadThumb(cover, token);
  const preparedArticles = [];
  for (const article of articlePackage.articles) {
    const articleThumb = article.thumb_media_id || (article.cover_path ? await uploadThumb(article.cover_path, token) : sharedThumb);
    if (!articleThumb) throw new Error(`文章缺少封面：${article.title}。请在 JSON 中设置 cover_path，或传 --cover/设置 WECHAT_THUMB_MEDIA_ID。`);
    const content = await prepareArticleImages(article, token);
    preparedArticles.push({ article, articleThumb, content });
  }
  const payload = {
    articles: preparedArticles.map(({ article, articleThumb, content }) => ({
      title: article.title,
      author: process.env.ARTICLE_AUTHOR || '蜂家日记编辑部',
      digest: article.digest,
      content,
      content_source_url: sourceUrl || '',
      thumb_media_id: articleThumb,
      need_open_comment: comments ? 1 : 0,
      only_fans_can_comment: comments === 'fans' ? 1 : 0
    }))
  };
  return requestJson(`${WECHAT_BASE}/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload)
  });
}

function saveArticle(article) {
  const dir = path.join(ROOT, 'output');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(article, null, 2), 'utf8');
  return file;
}

async function doctor() {
  requireEnv(['WECHAT_APP_ID', 'WECHAT_APP_SECRET']);
  const token = await getAccessToken(true);
  const result = await requestJson(`${WECHAT_BASE}/cgi-bin/draft/count?access_token=${encodeURIComponent(token)}`);
  console.log(JSON.stringify({ ok: true, message: '公众号凭据和草稿箱接口可用', draft_count: result.total_count }, null, 2));
}

async function listPublished({ offset = 0, count = 20 } = {}) {
  const token = await getAccessToken();
  return requestJson(`${WECHAT_BASE}/cgi-bin/freepublish/batchget?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ offset: Number(offset), count: Math.min(Number(count), 20), no_content: 0 })
  });
}

async function listMaterials({ type = 'image', offset = 0, count = 20 } = {}) {
  const allowed = new Set(['image', 'video', 'voice', 'news']);
  if (!allowed.has(type)) throw new Error(`不支持的素材类型：${type}`);
  const token = await getAccessToken();
  return requestJson(`${WECHAT_BASE}/cgi-bin/material/batchget_material?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ type, offset: Number(offset), count: Math.min(Number(count), 20) })
  });
}

function usage() {
  console.log(`蜂家日记公众号草稿工具\n\n用法：\n  node wechat-draft.js doctor\n  node wechat-draft.js published [--offset 0] [--count 20]\n  node wechat-draft.js materials [--type image] [--offset 0] [--count 20]\n  node wechat-draft.js generate --topic "选题" [--briefing 资料.txt]\n  node wechat-draft.js draft --input output/文章.json [--cover 封面.jpg]\n  node wechat-draft.js run --topic "选题" --briefing 资料.txt --cover 封面.jpg\n\n说明：run 会先保存生成结果，再写入草稿箱；不会自动群发。`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command || command === 'help' || args.help) return usage();
  if (command === 'doctor') return doctor();
  if (command === 'published') {
    const result = await listPublished({ offset: args.offset || 0, count: args.count || 20 });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'materials') {
    const result = await listMaterials({ type: args.type || 'image', offset: args.offset || 0, count: args.count || 20 });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'generate') {
    if (!args.topic && !args.briefing) throw new Error('请至少提供 --topic 或 --briefing。');
    const article = await generateArticle({ topic: args.topic, briefing: args.briefing });
    const file = saveArticle(article);
    console.log(JSON.stringify({ ok: true, article_file: file, titles: article.articles.map((item) => item.title) }, null, 2));
    return;
  }
  if (command === 'draft') {
    if (!args.input) throw new Error('请提供 --input 文章 JSON 文件。');
    const result = await addDraft(readArticle(args.input), { cover: args.cover, thumbMediaId: args['thumb-media-id'], sourceUrl: args['source-url'], comments: args.comments });
    console.log(JSON.stringify({ ok: true, media_id: result.media_id }, null, 2));
    return;
  }
  if (command === 'run') {
    if (!args.topic && !args.briefing) throw new Error('请至少提供 --topic 或 --briefing。');
    const article = await generateArticle({ topic: args.topic, briefing: args.briefing });
    const file = saveArticle(article);
    const result = await addDraft(article, { cover: args.cover, thumbMediaId: args['thumb-media-id'], sourceUrl: args['source-url'], comments: args.comments });
    console.log(JSON.stringify({ ok: true, article_file: file, titles: article.articles.map((item) => item.title), media_id: result.media_id }, null, 2));
    return;
  }
  throw new Error(`未知命令：${command}`);
}

main().catch((error) => {
  console.error(`失败：${error.message}`);
  process.exitCode = 1;
});
