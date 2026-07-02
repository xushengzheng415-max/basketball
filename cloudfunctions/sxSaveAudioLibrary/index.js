const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const CHANNELS = ['buzzer', 'three', 'two', 'miss', 'cheer', 'attack', 'defense', 'rest'];
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

function isHttpEvent(event) {
  return !!(event && (event.httpMethod || event.headers || event.requestContext || typeof event.body === 'string'));
}

function httpResponse(event, data, statusCode = 200) {
  if (!isHttpEvent(event)) return data;
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(data) };
}

function parsePayload(event) {
  if (!event) return {};
  if (typeof event.body === 'string') {
    try { return Object.assign({}, event, JSON.parse(event.body)); } catch (error) { return event; }
  }
  return event;
}

function normalizeItem(item) {
  const channel = String(item.channel || '').trim();
  const fileID = String(item.fileID || item.fileId || '').trim();
  const name = String(item.name || '').trim() || fileID.split('/').pop() || '未命名音效';
  if (!CHANNELS.includes(channel)) return null;
  if (!fileID.startsWith('cloud://')) return null;
  return {
    channel,
    fileID,
    name,
    status: item.status === 'disabled' ? 'disabled' : 'active',
    sort: Number(item.sort || 0),
    note: String(item.note || '')
  };
}

exports.main = async (event) => {
  if (event && event.httpMethod === 'OPTIONS') {
    return httpResponse(event, { ok: true });
  }

  const payload = parsePayload(event);
  const adminToken = process.env.SXF_ADMIN_TOKEN || '';

  if (adminToken && payload.adminToken !== adminToken) {
    return httpResponse(event, { ok: false, message: '后台口令不正确' }, 403);
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [payload];
  const items = rawItems.map(normalizeItem).filter(Boolean);
  if (!items.length) {
    return httpResponse(event, { ok: false, message: '请填写正确的音频类型和 cloud:// 文件 ID' }, 400);
  }

  const wxContext = cloud.getWXContext();
  const now = db.serverDate();
  const saved = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = Object.assign({}, items[i], {
      createdByOpenid: wxContext.OPENID || '',
      createdByUnionid: wxContext.UNIONID || '',
      createdAt: now,
      updatedAt: now
    });
    const created = await db.collection('sx_mc_audio_library').add({ data: item });
    saved.push(Object.assign({ _id: created._id }, item));
  }

  return httpResponse(event, {
    ok: true,
    warning: adminToken ? '' : '当前未配置 SXF_ADMIN_TOKEN，建议上线前设置后台口令。',
    saved
  });
};
