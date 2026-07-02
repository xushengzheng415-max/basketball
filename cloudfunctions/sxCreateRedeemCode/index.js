const crypto = require('crypto');
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DEFAULT_FEATURES = ['mc_system', 'stats_scorer_2'];
const PLAN_PRESETS = {
  pro_share_month: {
    productName: '赛小蜂 Pro 分享试用',
    durationDays: 31,
    features: DEFAULT_FEATURES,
    voiceCredits: 10,
    shareCredits: 0
  },
  voice_credits_50: {
    productName: 'AI 语音播报包 50 次',
    durationDays: 0,
    features: ['score_voice'],
    voiceCredits: 50,
    shareCredits: 0
  },
  share_points_10: {
    productName: '分享奖励积分',
    durationDays: 0,
    features: [],
    voiceCredits: 0,
    shareCredits: 10
  }
};
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

function normalizeFeatures(features) {
  if (!Array.isArray(features) || !features.length) return DEFAULT_FEATURES;
  return features.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeCount(value) {
  const count = Number(value || 1);
  return Math.min(100, Math.max(1, Number.isFinite(count) ? Math.floor(count) : 1));
}

function makeCode(prefix) {
  const body = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

async function insertUniqueCode(data, prefix) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode(prefix);
    const exists = await db.collection('sx_redeem_codes').where({ code }).limit(1).get();
    if (exists.data && exists.data.length) continue;
    const created = await db.collection('sx_redeem_codes').add({ data: Object.assign({}, data, { code }) });
    return Object.assign({ _id: created._id, code }, data);
  }
  throw new Error('兑换码生成冲突，请重试');
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

  const wxContext = cloud.getWXContext();
  const now = db.serverDate();
  const count = normalizeCount(payload.count);
  const durationDays = Math.max(0, Number(payload.durationDays || 31));
  const prefix = String(payload.prefix || 'SXF').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'SXF';
  const plan = String(payload.plan || 'pro_month');
  const preset = PLAN_PRESETS[plan] || {};
  const productName = String(payload.productName || preset.productName || '赛小蜂 Pro 会员');
  const hasFeaturePayload = Array.isArray(payload.features);
  const features = hasFeaturePayload
    ? normalizeFeatures(payload.features)
    : (Array.isArray(preset.features) ? preset.features : normalizeFeatures());
  const voiceCredits = Math.max(0, Math.floor(Number(payload.voiceCredits ?? preset.voiceCredits ?? 0)));
  const shareCredits = Math.max(0, Math.floor(Number(payload.shareCredits ?? preset.shareCredits ?? 0)));
  const batchId = `redeem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

  const base = {
    batchId,
    plan,
    productId: plan,
    productName,
    features,
    durationDays: Math.max(0, Number(payload.durationDays ?? preset.durationDays ?? durationDays)),
    voiceCredits,
    shareCredits,
    status: 'unused',
    generatedByOpenid: wxContext.OPENID || '',
    generatedByUnionid: wxContext.UNIONID || '',
    note: String(payload.note || ''),
    source: 'admin_redeem_code',
    createdAt: now,
    updatedAt: now
  };

  if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
    base.expiresAt = expiresAt;
  }

  const codes = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(await insertUniqueCode(base, prefix));
  }

  return httpResponse(event, {
    ok: true,
    warning: adminToken ? '' : '当前未配置 SXF_ADMIN_TOKEN，建议上线前设置后台口令。',
    batchId,
    count: codes.length,
    codes
  });
};
