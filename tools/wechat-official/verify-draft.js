#!/usr/bin/env node
'use strict';
// 一次性回读验证脚本：复用 wechat-draft.js 的凭据机制，核对草稿箱最新草稿内容。
// 用法：WECHAT_ENV_FILE=accounts/maibu-events.env.local WECHAT_CACHE_FILE=accounts/maibu-events.cache.json node tools/wechat-official/verify-draft.js [media_id]

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const ENV_FILE = process.env.WECHAT_ENV_FILE
  ? path.resolve(ROOT, process.env.WECHAT_ENV_FILE)
  : path.join(ROOT, '.env.local');
loadEnv(ENV_FILE);

const WECHAT_BASE = 'https://api.weixin.qq.com';

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function cachePath() {
  return process.env.WECHAT_CACHE_FILE
    ? path.resolve(ROOT, process.env.WECHAT_CACHE_FILE)
    : path.join(ROOT, '.cache.json');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errcode) throw new Error(`接口调用失败 errcode=${data.errcode}：${data.errmsg || response.status}`);
  return data;
}

async function getAccessToken() {
  const file = cachePath();
  if (fs.existsSync(file)) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (cached.access_token && cached.expires_at > Date.now() + 5 * 60 * 1000) return cached.access_token;
    } catch { /* ignore */ }
  }
  const data = await requestJson(`${WECHAT_BASE}/cgi-bin/stable_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credential', appid: process.env.WECHAT_APP_ID, secret: process.env.WECHAT_APP_SECRET, force_refresh: false })
  });
  fs.writeFileSync(file, JSON.stringify({ access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 }, null, 2), 'utf8');
  return data.access_token;
}

(async () => {
  const token = await getAccessToken();
  const targetId = process.argv[2] || '';
  let mediaId = targetId;
  if (!mediaId) {
    const list = await requestJson(`${WECHAT_BASE}/cgi-bin/draft/batchget?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ offset: 0, count: 5, no_content: 1 })
    });
    console.log('草稿总数:', list.total_count);
    mediaId = list.item && list.item[0] && list.item[0].media_id;
    console.log('最新草稿 media_id:', mediaId);
  }
  const detail = await requestJson(`${WECHAT_BASE}/cgi-bin/draft/get?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId })
  });
  const article = detail.news_item && detail.news_item[0];
  if (!article) throw new Error('草稿详情为空');
  const html = article.content || '';
  const checks = {
    title: article.title,
    digest: article.digest,
    thumb_media_id_present: Boolean(article.thumb_media_id),
    mmbiz_image_count: (html.match(/mmbiz\.qpic\.cn/g) || []).length,
    has_29秒及格线: html.includes('29秒') || html.includes('29.5秒'),
    has_满分线: html.includes('21.5秒') || html.includes('21秒'),
    has_新华社来源: html.includes('新华社'),
    has_手动提示: html.includes('手动添加社群二维码'),
    remaining_placeholders: (html.match(/\{\{[A-Z_0-9]+\}\}/g) || [])
  };
  console.log(JSON.stringify(checks, null, 2));
})().catch((err) => { console.error('验证失败：' + err.message); process.exit(1); });
