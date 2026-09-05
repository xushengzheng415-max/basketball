#!/usr/bin/env node
'use strict';

// 关键词网络搜图（Wikimedia Commons）：返回真实照片直链并下载到本地，附带授权信息。
// 网络走系统代理（curl 自动读取 HTTPS_PROXY/HTTP_PROXY）。
// 用法：
//   node find-images.js --keyword "corporate sports day" --out images/2026-08-12 --limit 6
// 可选：
//   --allow-license 过滤授权，逗号分隔，默认 "CC0,Public Domain,CC BY,CC BY-SA 2.0,CC BY-SA 3.0,CC BY-SA 4.0"
//   --no-download    只打印候选列表，不下载
// 说明：优先 CC0/Public Domain（免署名）；CC BY / CC BY-SA 需在文章里标注来源（脚本会把 author+license 写进列表）。

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { result._.push(arg); continue; }
    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s);
    if (inlineValue !== undefined) result[rawKey] = inlineValue;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) result[rawKey] = argv[++i];
    else result[rawKey] = true;
  }
  return result;
}

function curlBuffer(url) {
  const r = spawnSync('curl', ['-sSL', '--retry', '4', '--retry-delay', '2', '--retry-all-errors', '--max-time', '30', url], { maxBuffer: 64 * 1024 * 1024, encoding: 'buffer' });
  if (r.status !== 0 || !r.stdout || r.stdout.length === 0) {
    throw new Error(`curl 失败(${r.status}) ${url} ${String(r.stderr || '').slice(0, 120)}`);
  }
  return r.stdout;
}

function curlToFile(url, file) {
  const r = spawnSync('curl', ['-sSL', '--retry', '4', '--retry-delay', '2', '--retry-all-errors', '--max-time', '40', '-o', file, url], { maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`curl 下载失败(${r.status}) ${url} ${String(r.stderr || '').slice(0, 120)}`);
}

const BAD_EXT = /\.(webm|svg|pdf|gif|tif|tiff|oga|ogg)$/i;

function sanitize(s) {
  return s.replace(/[^\w一-龥\-]+/g, '_').replace(/_+/g, '_').slice(0, 80);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const keyword = args.keyword;
  if (!keyword) throw new Error('请提供 --keyword "关键词"');
  const out = args.out || 'images/search';
  const limit = Number(args.limit || 6);
  const noDownload = Boolean(args['no-download']);
  const allowed = new Set((args['allow-license'] || 'CC0,Public Domain,CC BY,CC BY-SA 2.0,CC BY-SA 3.0,CC BY-SA 4.0')
    .split(',').map((s) => s.trim()).filter(Boolean));

  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keyword)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=900&format=json`;

  const buf = curlBuffer(api);
  const data = JSON.parse(buf.toString('utf8'));
  const pages = data.query && data.query.pages ? Object.values(data.query.pages) : [];

  const candidates = [];
  for (const p of pages) {
    const ii = (p.imageinfo && p.imageinfo[0]) || {};
    const em = ii.extmetadata || {};
    const mime = (em.Mime && em.Mime.value) || '';
    const license = (em.LicenseShortName && em.LicenseShortName.value) || '?';
    const author = ((em.Artist && em.Artist.value) || '').replace(/<[^>]+>/g, '').trim().slice(0, 60);
    const thumb = ii.thumburl || ii.url;
    if (!thumb) continue;
    if (BAD_EXT.test(thumb)) continue; // 跳过视频/矢量/PDF/动图
    if (!/jpg|jpeg|png|webp/i.test(mime) && !/\.(jpe?g|png|webp)/i.test(thumb)) continue; // 只要位图照片
    if (!allowed.has(license) && license !== '?') continue;
    candidates.push({ title: p.title, url: thumb, license, author, mime });
  }

  if (!noDownload) {
    fs.mkdirSync(out, { recursive: true });
    for (let i = 0; i < candidates.length; i += 1) {
      const c = candidates[i];
      const name = `${String(i + 1).padStart(2, '0')}_${sanitize(c.title.replace(/^File:/, ''))}.jpg`;
      const file = path.join(out, name);
      try {
        curlToFile(c.url, file);
        c.file = file;
      } catch (e) {
        c.error = e.message;
      }
    }
  }

  console.log(JSON.stringify({ keyword, count: candidates.length, out, candidates }, null, 2));
}

main().catch((e) => { console.error(`失败：${e.message}`); process.exitCode = 1; });
