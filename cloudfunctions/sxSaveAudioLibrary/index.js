const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const CHANNELS = ['buzzer', 'three', 'two', 'miss', 'cheer', 'attack', 'defense', 'rest'];

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
  const payload = parsePayload(event);
  const adminToken = process.env.SXF_ADMIN_TOKEN || '';

  if (adminToken && payload.adminToken !== adminToken) {
    return { ok: false, message: '后台口令不正确' };
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [payload];
  const items = rawItems.map(normalizeItem).filter(Boolean);
  if (!items.length) {
    return { ok: false, message: '请填写正确的音频类型和 cloud:// 文件 ID' };
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

  return {
    ok: true,
    warning: adminToken ? '' : '当前未配置 SXF_ADMIN_TOKEN，建议上线前设置后台口令。',
    saved
  };
};
