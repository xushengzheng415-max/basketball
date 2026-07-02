const crypto = require('crypto');
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DEFAULT_FEATURES = ['mc_system'];
const PLAN_PRESETS = {
  mc_share_day: {
    productName: '赛小蜂 MC 音效 1 天 VIP',
    durationDays: 1,
    features: ['mc_system'],
    voiceCredits: 0,
    shareCredits: 0
  },
  mc_paid_day: {
    productName: '赛小蜂 MC 音效日卡',
    durationDays: 1,
    features: ['mc_system'],
    voiceCredits: 0,
    shareCredits: 0
  },
  mc_paid_month: {
    productName: '赛小蜂 MC 音效月卡',
    durationDays: 30,
    features: ['mc_system'],
    voiceCredits: 0,
    shareCredits: 0
  },
  mc_paid_lifetime: {
    productName: '赛小蜂 MC 音效永久卡',
    durationDays: 0,
    features: ['mc_system'],
    voiceCredits: 0,
    shareCredits: 0
  },
  voice_credits_50: {
    productName: 'AI 语音播报包 50 次',
    durationDays: 0,
    features: ['score_voice'],
    voiceCredits: 50,
    shareCredits: 0
  },
  voice_credits_150: {
    productName: 'AI 语音播报包 150 次',
    durationDays: 0,
    features: ['score_voice'],
    voiceCredits: 150,
    shareCredits: 0
  },
  voice_credits_400: {
    productName: 'AI 语音播报包 400 次',
    durationDays: 0,
    features: ['score_voice'],
    voiceCredits: 400,
    shareCredits: 0
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
  if (!Array.isArray(features)) return DEFAULT_FEATURES;
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
  const prefix = String(payload.prefix || 'SXF').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'SXF';
  const plan = String(payload.plan || 'mc_share_day');
  const preset = PLAN_PRESETS[plan] || PLAN_PRESETS.mc_share_day;
  const productName = String(payload.productName || preset.productName || '赛小蜂会员');
  const hasFeaturePayload = Array.isArray(payload.features);
  const features = hasFeaturePayload ? normalizeFeatures(payload.features) : preset.features;
  const voiceCredits = Math.max(0, Math.floor(Number(payload.voiceCredits ?? preset.voiceCredits ?? 0)));
  const shareCredits = 0;
  const durationDays = Math.max(0, Number(payload.durationDays ?? preset.durationDays ?? 1));
  const batchId = `redeem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

  const base = {
    batchId,
    plan,
    productId: plan,
    productName,
    features,
    durationDays,
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
