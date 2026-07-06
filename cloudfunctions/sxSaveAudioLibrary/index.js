const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const CHANNELS = ['buzzer', 'three', 'two', 'miss', 'cheer', 'applause', 'attack', 'defense', 'rest', 'start', 'voice', 'ambience'];
const DEFAULT_BUCKET_PREFIX = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3';
const DEFAULT_AUDIO_ITEMS = [
  { channel: 'buzzer', name: '\u8702\u9e23\u5668', fileID: `${DEFAULT_BUCKET_PREFIX}/\u6bd4\u8d5b\u97f3\u6548/\u8702\u9e23\u5668.mp3`, sort: 10 },
  { channel: 'three', name: '\u4e09\u5206\u7403', fileID: `${DEFAULT_BUCKET_PREFIX}/\u6bd4\u8d5b\u97f3\u6548/\u4e09\u5206\u7403.mp3`, sort: 20 },
  { channel: 'two', name: '2\u5206\u8fdb\u7403\u6709\u6548', fileID: `${DEFAULT_BUCKET_PREFIX}/\u6bd4\u8d5b\u97f3\u6548/2\u5206\u8fdb\u7403\u97f3\u6548.mp3`, sort: 30 },
  { channel: 'miss', name: '\u6295\u7bee\u672a\u8fdb', fileID: `${DEFAULT_BUCKET_PREFIX}/\u6bd4\u8d5b\u97f3\u6548/\u6295\u7bee\u672a\u8fdb\u97f3\u6548.mp3`, sort: 40 },
  { channel: 'cheer', name: '\u6b22\u547c\u58f0', fileID: `${DEFAULT_BUCKET_PREFIX}/\u6bd4\u8d5b\u97f3\u6548/\u6b22\u547c\u58f0.mp3`, sort: 50 },
  { channel: 'rest', name: 'Remember the Name', fileID: `${DEFAULT_BUCKET_PREFIX}/\u6682\u505c\u4f11\u606f\u97f3\u4e50/Fort Minor - Remember the Name_L.mp3`, sort: 60 },
  { channel: 'rest', name: 'Its My Life', fileID: `${DEFAULT_BUCKET_PREFIX}/\u6682\u505c\u4f11\u606f\u97f3\u4e50/Studio 99 - Its My Life_L.mp3`, sort: 70 }
];
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

async function upsertAudioItem(item, extra) {
  const existing = await db.collection('sx_mc_audio_library')
    .where({ fileID: item.fileID })
    .limit(1)
    .get();

  const data = Object.assign({}, item, extra);
  if (existing.data && existing.data[0]) {
    await db.collection('sx_mc_audio_library').doc(existing.data[0]._id).update({
      data: Object.assign({}, data, {
        createdAt: _.set(existing.data[0].createdAt || extra.createdAt)
      })
    });
    return Object.assign({ _id: existing.data[0]._id, mode: 'updated' }, data);
  }

  const created = await db.collection('sx_mc_audio_library').add({ data });
  return Object.assign({ _id: created._id, mode: 'created' }, data);
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

  const rawItems = payload.preset === 'sxf_default'
    ? DEFAULT_AUDIO_ITEMS
    : (Array.isArray(payload.items) ? payload.items : [payload]);
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
    saved.push(await upsertAudioItem(item, {
      createdByOpenid: wxContext.OPENID || '',
      createdByUnionid: wxContext.UNIONID || '',
      createdAt: now,
      updatedAt: now
    }));
  }

  return httpResponse(event, {
    ok: true,
    warning: adminToken ? '' : '当前未配置 SXF_ADMIN_TOKEN，建议上线前设置后台口令。',
    saved
  });
};
