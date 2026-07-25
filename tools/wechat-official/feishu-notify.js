#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const FEISHU_BASE = 'https://open.feishu.cn/open-apis';
const CACHE_FILE = path.join(ROOT, '.feishu-cache.json');

loadEnv(path.join(ROOT, '.env.local'));

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

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`缺少环境变量：${missing.join(', ')}`);
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      result._.push(arg);
      continue;
    }
    const [key, inlineValue] = arg.slice(2).split(/=(.*)/s);
    if (inlineValue !== undefined) result[key] = inlineValue;
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) result[key] = argv[++index];
    else result[key] = true;
  }
  return result;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`飞书返回了非 JSON 内容（HTTP ${response.status}）`);
  }
  if (!response.ok || (typeof data.code === 'number' && data.code !== 0)) {
    throw new Error(`飞书接口调用失败（HTTP ${response.status}，code=${data.code ?? 'unknown'}）：${data.msg || '未知错误'}`);
  }
  return data;
}

async function getTenantToken() {
  requireEnv(['FEISHU_APP_ID', 'FEISHU_APP_SECRET']);
  const data = await requestJson(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET
    })
  });
  if (!data.tenant_access_token) throw new Error('飞书未返回 tenant_access_token。');
  return data.tenant_access_token;
}

function normalizeMobile(value) {
  const compact = String(value || '').replace(/[\s-]/g, '');
  if (/^1\d{10}$/.test(compact)) return `+86${compact}`;
  return compact;
}

function readCachedOpenId() {
  if (!fs.existsSync(CACHE_FILE)) return '';
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')).open_id || '';
  } catch {
    return '';
  }
}

async function resolveOpenId(token) {
  if (process.env.FEISHU_USER_OPEN_ID) return process.env.FEISHU_USER_OPEN_ID;
  const cached = readCachedOpenId();
  if (cached) return cached;

  const email = String(process.env.FEISHU_USER_EMAIL || '').trim();
  const mobile = normalizeMobile(process.env.FEISHU_USER_MOBILE);
  if (!email && !mobile) throw new Error('请配置 FEISHU_USER_EMAIL 或 FEISHU_USER_MOBILE。');

  const body = {};
  if (email) body.emails = [email];
  if (mobile) body.mobiles = [mobile];

  const data = await requestJson(`${FEISHU_BASE}/contact/v3/users/batch_get_id?user_id_type=open_id`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(body)
  });
  const user = data.data?.user_list?.find((item) => item.user_id);
  if (!user) throw new Error('没有找到与所填邮箱或手机号对应的飞书用户。请确认应用可用范围和账号绑定信息。');
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ open_id: user.user_id }, null, 2), 'utf8');
  return user.user_id;
}

async function sendText(text) {
  if (!text || !String(text).trim()) throw new Error('消息内容不能为空。');
  const token = await getTenantToken();
  const openId = await resolveOpenId(token);
  const data = await requestJson(`${FEISHU_BASE}/im/v1/messages?receive_id_type=open_id`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: 'text',
      content: JSON.stringify({ text: String(text) })
    })
  });
  return data.data?.message_id || '';
}

function usage() {
  console.log('用法：');
  console.log('  node feishu-notify.js test');
  console.log('  node feishu-notify.js send --text "提醒内容"');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === 'test') {
    const messageId = await sendText('【公众号自动写稿】飞书私信通道测试成功。今后若每天 10:00 的草稿任务未完成，将在 11:30 提醒你。');
    console.log(`测试消息发送成功${messageId ? `，message_id=${messageId}` : ''}。`);
    return;
  }
  if (command === 'send') {
    const messageId = await sendText(args.text);
    console.log(`消息发送成功${messageId ? `，message_id=${messageId}` : ''}。`);
    return;
  }
  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`失败：${error.message}`);
  process.exitCode = 1;
});
