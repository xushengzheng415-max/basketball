const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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

function toDatePlusDays(days) {
  return new Date(Date.now() + Math.max(0, Number(days || 0)) * 86400000);
}

exports.main = async (event) => {
  if (event && event.httpMethod === 'OPTIONS') return httpResponse(event, { ok: true });
  const payload = parsePayload(event);
  const adminToken = process.env.SXF_ADMIN_TOKEN || '';
  if (adminToken && payload.adminToken !== adminToken) {
    return httpResponse(event, { ok: false, message: 'admin token invalid' }, 403);
  }

  const openid = String(payload.openid || payload.wxOpenId || '').trim();
  const action = String(payload.action || 'extend');
  const feature = String(payload.feature || 'mc_system').trim();
  const days = Math.max(0, Math.floor(Number(payload.days || 1)));
  if (!openid) return httpResponse(event, { ok: false, message: 'openid required' }, 400);
  if (['mc_system', 'education_system'].indexOf(feature) < 0) {
    return httpResponse(event, { ok: false, message: 'unsupported feature' }, 400);
  }

  const now = db.serverDate();
  const collection = db.collection('sx_entitlements');

  if (action === 'revoke') {
    const active = await collection.where({ openid, status: 'active' }).limit(100).get();
    const list = (active.data || []).filter((item) => Array.isArray(item.features) && item.features.indexOf(feature) >= 0);
    await Promise.all(list.map((item) => collection.doc(item._id).update({ data: { status: 'revoked', revokedAt: now, updatedAt: now } })));
    return httpResponse(event, { ok: true, action, feature, openid, updated: list.length });
  }

  const expiresAt = action === 'lifetime' ? null : toDatePlusDays(days);
  const active = await collection.where({ openid, status: 'active' }).orderBy('createdAt', 'desc').limit(20).get();
  const target = (active.data || []).find((item) => Array.isArray(item.features) && item.features.indexOf(feature) >= 0);

  const isEducation = feature === 'education_system';

  const data = {
    openid,
    productId: isEducation
      ? (action === 'lifetime' ? 'admin_lifetime_education' : 'admin_education_account')
      : (action === 'lifetime' ? 'admin_lifetime_mc' : 'admin_adjust_mc'),
    productName: isEducation
      ? (action === 'lifetime' ? '\u6559\u52a1\u7cfb\u7edf\u6c38\u4e45\u8d26\u6237' : '\u6559\u52a1\u7cfb\u7edf\u673a\u6784\u8d26\u6237')
      : (action === 'lifetime' ? '\u7ba1\u7406\u5458\u4e0b\u53d1 MC \u6c38\u4e45\u6743\u76ca' : '\u7ba1\u7406\u5458\u8c03\u6574 MC \u6743\u76ca'),
    features: [feature],
    scope: isEducation ? 'organization' : 'user',
    source: 'admin_adjust',
    status: 'active',
    updatedAt: now
  };
  if (expiresAt) data.expiresAt = expiresAt;
  if (!expiresAt) data.expiresAt = _.remove();

  if (target && target._id) {
    await collection.doc(target._id).update({ data });
    return httpResponse(event, { ok: true, action, feature, openid, updated: 1, entitlementId: target._id });
  }

  const created = await collection.add({ data: Object.assign({}, data, { createdAt: now }) });
  return httpResponse(event, { ok: true, action, feature, openid, created: 1, entitlementId: created._id });
};
