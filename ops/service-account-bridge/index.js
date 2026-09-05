'use strict';

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const port = Number(process.env.PORT || 3300);
const appId = String(process.env.SERVICE_ACCOUNT_APPID || '').trim();
const appSecret = String(process.env.SERVICE_ACCOUNT_APPSECRET || '').trim();
const bridgeKey = String(process.env.BRIDGE_KEY || '').trim();
let tokenCache = { value: '', expireAt: 0 };
let ticketCache = { value: '', expireAt: 0 };

function send(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'https://www.sxfbasketball.cn',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  });
  response.end(JSON.stringify(body));
}

function sameKey(value) {
  const left = Buffer.from(String(value || ''));
  const right = Buffer.from(bridgeKey);
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function requestWechat(method, path, data, binary) {
  return new Promise((resolve, reject) => {
    const payload = data ? Buffer.from(JSON.stringify(data)) : null;
    const request = https.request({
      host: 'api.weixin.qq.com', path, method,
      headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : undefined
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (binary) { resolve(buffer); return; }
        try { resolve(JSON.parse(buffer.toString('utf8'))); } catch (error) { reject(new Error('微信接口返回格式异常')); }
      });
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function accessToken() {
  if (tokenCache.value && tokenCache.expireAt > Date.now() + 300000) return tokenCache.value;
  if (!appId || !appSecret) throw new Error('服务号凭据未配置');
  const result = await requestWechat('GET', `/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`);
  if (!result.access_token) throw new Error(`微信服务号鉴权失败：${result.errcode || ''} ${result.errmsg || ''}`.trim());
  tokenCache = { value: result.access_token, expireAt: Date.now() + Math.max(300, Number(result.expires_in || 7200) - 300) * 1000 };
  return tokenCache.value;
}

async function jsapiTicket() {
  if (ticketCache.value && ticketCache.expireAt > Date.now() + 300000) return ticketCache.value;
  const token = await accessToken();
  const result = await requestWechat('GET', `/cgi-bin/ticket/getticket?access_token=${encodeURIComponent(token)}&type=jsapi`);
  if (!result.ticket) throw new Error(`微信 JS-SDK 票据获取失败：${result.errcode || ''} ${result.errmsg || ''}`.trim());
  ticketCache = { value: result.ticket, expireAt: Date.now() + Math.max(300, Number(result.expires_in || 7200) - 300) * 1000 };
  return ticketCache.value;
}

async function createJsSignature(rawUrl) {
  const target = new URL(String(rawUrl || ''));
  if (target.protocol !== 'https:' || target.hostname !== 'www.sxfbasketball.cn') throw new Error('JS-SDK 签名域名无效');
  target.hash = '';
  const ticket = await jsapiTicket();
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = crypto.randomBytes(12).toString('hex');
  const source = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${target.toString()}`;
  return { appId, timestamp, nonceStr, signature: crypto.createHash('sha1').update(source).digest('hex') };
}

async function createFollowQr(scene) {
  const token = await accessToken();
  const result = await requestWechat('POST', `/cgi-bin/qrcode/create?access_token=${encodeURIComponent(token)}`, {
    expire_seconds: 2592000,
    action_name: 'QR_STR_SCENE',
    action_info: { scene: { scene_str: scene } }
  });
  if (!result.ticket) throw new Error(`服务号二维码创建失败：${result.errcode || ''} ${result.errmsg || ''}`.trim());
  const image = await new Promise((resolve, reject) => {
    const request = https.get(`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(result.ticket)}`, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });
    request.on('error', reject);
  });
  if (!image.length) throw new Error('服务号二维码下载失败');
  return image.toString('base64');
}

function messageData(value) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'value')) {
    return { value: String(value.value || '').slice(0, 200) };
  }
  return { value: String(value || '').slice(0, 200) };
}

function normalizeMessageData(input) {
  return Object.keys(input && typeof input === 'object' ? input : {}).reduce((result, key) => {
    if (/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key)) result[key] = messageData(input[key]);
    return result;
  }, {});
}

async function sendServiceNotification(body) {
  const token = await accessToken();
  const officialOpenid = String(body.officialOpenid || '').trim();
  const templateId = String(body.templateId || '').trim();
  if (!officialOpenid || !templateId) throw new Error('服务号通知接收人或模板无效');
  const miniProgram = body.miniProgram && body.miniProgram.appid ? {
    appid: String(body.miniProgram.appid),
    pagepath: String(body.miniProgram.pagepath || '')
  } : undefined;
  const subscribeResult = await requestWechat('POST', `/cgi-bin/message/subscribe/bizsend?access_token=${encodeURIComponent(token)}`, {
    touser: officialOpenid,
    template_id: templateId,
    page: String(body.page || ''),
    data: normalizeMessageData(body.data)
  });
  if (Number(subscribeResult && subscribeResult.errcode || 0) === 0) return { mode: 'subscribe', messageId: subscribeResult.msgid || '' };
  const templateResult = await requestWechat('POST', `/cgi-bin/message/template/send?access_token=${encodeURIComponent(token)}`, {
    touser: officialOpenid,
    template_id: templateId,
    url: String(body.url || ''),
    miniprogram: miniProgram,
    data: normalizeMessageData(body.legacyData || body.data)
  });
  if (Number(templateResult && templateResult.errcode || 0) === 0) return { mode: 'template', messageId: templateResult.msgid || '' };
  const error = new Error(`微信服务号通知发送失败：订阅接口 ${subscribeResult.errcode || 0} ${subscribeResult.errmsg || ''}；模板接口 ${templateResult.errcode || 0} ${templateResult.errmsg || ''}`.trim());
  error.wechatCode = Number(templateResult.errcode || subscribeResult.errcode || -1);
  throw error;
}

async function sendCustomerServiceMessage(body) {
  const token = await accessToken();
  const officialOpenid = String(body.officialOpenid || '').trim();
  const content = String(body.content || '').trim().slice(0, 600);
  if (!officialOpenid || !content) throw new Error('服务号客服消息接收人或内容无效');
  const result = await requestWechat('POST', `/cgi-bin/message/custom/send?access_token=${encodeURIComponent(token)}`, {
    touser: officialOpenid, msgtype: 'text', text: { content }
  });
  if (Number(result && result.errcode || 0) !== 0) {
    const error = new Error(`微信服务号客服消息发送失败：${result.errcode || ''} ${result.errmsg || ''}`.trim());
    error.wechatCode = Number(result.errcode || -1);
    throw error;
  }
  return { ok: true };
}

async function listServiceTemplates() {
  const token = await accessToken();
  const result = await requestWechat('GET', `/cgi-bin/template/get_all_private_template?access_token=${encodeURIComponent(token)}`);
  if (Number(result && result.errcode || 0) !== 0) throw new Error(`读取服务号模板失败：${result.errcode || ''} ${result.errmsg || ''}`.trim());
  return (result.template_list || []).map((item) => ({ templateId: item.template_id || '', title: item.title || '', primaryIndustry: item.primary_industry || '', deputyIndustry: item.deputy_industry || '' }));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; if (raw.length > 10240) request.destroy(); });
    request.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(new Error('请求数据格式错误')); } });
    request.on('error', reject);
  });
}

http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS' && request.url === '/js-signature') { send(response, 204, {}); return; }
  if (request.method === 'GET' && request.url === '/health') { send(response, 200, { ok: true }); return; }
  if (request.method === 'POST' && request.url === '/js-signature') {
    try { const body = await readJson(request); send(response, 200, { ok: true, config: await createJsSignature(body.url) }); }
    catch (error) { console.error('[service-account-bridge]', error.message); send(response, 400, { ok: false, message: '微信网页授权初始化失败' }); }
    return;
  }
  if (request.method !== 'POST' || !['/follow-qrcode', '/send-notification', '/send-customer-service', '/template-list'].includes(request.url)) { send(response, 404, { ok: false, message: 'Not found' }); return; }
  if (!sameKey(request.headers['x-sxf-bridge-key'])) { send(response, 401, { ok: false, message: 'Unauthorized' }); return; }
  try {
    const body = await readJson(request);
    if (request.url === '/template-list') {
      const templates = await listServiceTemplates();
      send(response, 200, { ok: true, templates });
      return;
    }
    if (request.url === '/send-notification') {
      const result = await sendServiceNotification(body);
      send(response, 200, { ok: true, mode: result.mode, messageId: result.messageId });
      return;
    }
    if (request.url === '/send-customer-service') {
      await sendCustomerServiceMessage(body);
      send(response, 200, { ok: true });
      return;
    }
    const scene = String(body.scene || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(scene)) throw new Error('二维码场景参数无效');
    const imageBase64 = await createFollowQr(scene);
    send(response, 200, { ok: true, imageBase64 });
  } catch (error) {
    console.error('[service-account-bridge]', error.message);
    const message = request.url === '/send-notification' ? '服务号通知发送失败' : request.url === '/send-customer-service' ? '服务号确认消息发送失败' : '服务号二维码生成失败';
    send(response, 502, { ok: false, message, errorCode: error.wechatCode || 0 });
  }
}).listen(port, '0.0.0.0', () => console.log(`service-account-bridge listening on ${port}`));
