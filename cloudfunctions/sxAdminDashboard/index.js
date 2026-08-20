const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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

async function getList(collection, limit = 100) {
  try {
    const res = await db.collection(collection).orderBy('createdAt', 'desc').limit(limit).get();
    return res.data || [];
  } catch (error) {
    console.warn('[sxAdminDashboard] collection unavailable', collection, error);
    return [];
  }
}

function toTime(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  if (value.$date) return new Date(value.$date).getTime();
  return 0;
}

function isActiveEntitlement(item) {
  if (!item || item.status !== 'active') return false;
  const expiresAt = toTime(item.expiresAt);
  return !expiresAt || expiresAt > Date.now();
}

function userOpenid(user) {
  return user.openid || user.wxOpenId || user.userId || '';
}

function userPhone(user) {
  return user.phoneNumber || user.phone || '';
}

function entitlementType(item) {
  const productId = String(item.productId || '');
  const source = String(item.source || '');
  if (source.indexOf('share') >= 0 || source.indexOf('redeem') >= 0 || source.indexOf('trial') >= 0 || productId.indexOf('share') >= 0 || productId.indexOf('admin_adjust') >= 0) return 'free';
  if (source.indexOf('pay') >= 0 || productId.indexOf('paid') >= 0 || productId.indexOf('mc_day') >= 0 || productId.indexOf('mc_month') >= 0 || productId.indexOf('mc_lifetime') >= 0 || productId.indexOf('voice_credits') >= 0) return 'paid';
  return 'unknown';
}

function enrichUsers(users, entitlements, orders, matchResults) {
  const now = Date.now();
  return users.map((user) => {
    const openid = userOpenid(user);
    const owns = entitlements.filter((item) => item.openid === openid || item.wxOpenId === openid || item.userId === openid);
    const active = owns.filter(isActiveEntitlement).sort((a, b) => toTime(b.expiresAt) - toTime(a.expiresAt));
    const paidOrders = orders.filter((item) => (item.openid || item.wxOpenId || item.userId || '') === openid && (item.status === 'paid' || item.payStatus === 'paid'));
    const matches = matchResults.filter((item) => (item.openid || item.wxOpenId || item.userId || '') === openid);
    const lastTimes = [user.updatedAt, user.createdAt]
      .concat(matches.map((item) => item.updatedAt || item.createdAt || item.endedAt))
      .map(toTime)
      .filter(Boolean)
      .sort((a, b) => b - a);
    const createdAt = toTime(user.createdAt) || lastTimes[lastTimes.length - 1] || 0;
    const latest = lastTimes[0] || createdAt || 0;
    const main = active[0] || null;
    const expiresAt = main ? toTime(main.expiresAt) : 0;
    return Object.assign({}, user, {
      openid,
      phoneNumber: userPhone(user),
      membershipStatus: main ? 'active' : 'none',
      membershipType: main ? entitlementType(main) : 'none',
      membershipProductName: main ? (main.productName || main.productId || '') : '',
      membershipExpiresAt: expiresAt ? new Date(expiresAt).toLocaleString('zh-CN') : (main ? '??/???' : ''),
      membershipDaysLeft: expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 86400000)) : (main ? 9999 : 0),
      activeDays: createdAt ? Math.max(1, Math.ceil((now - createdAt) / 86400000)) : 0,
      lastActivityAt: latest ? new Date(latest).toLocaleString('zh-CN') : '',
      matchCount: matches.length,
      paidOrderCount: paidOrders.length,
      entitlementCount: owns.length
    });
  });
}

exports.main = async (event) => {
  if (event && event.httpMethod === 'OPTIONS') return httpResponse(event, { ok: true });
  const payload = parsePayload(event);
  const adminToken = process.env.SXF_ADMIN_TOKEN || '';
  if (adminToken && payload.adminToken !== adminToken) {
    return httpResponse(event, { ok: false, message: 'admin token invalid' }, 403);
  }

  const [usersRaw, feedback, orders, matchResults, entitlements, redeemCodes, audioItems] = await Promise.all([
    getList('sx_users'),
    getList('sx_feedback'),
    getList('sx_orders'),
    getList('sx_match_results'),
    getList('sx_entitlements', 200),
    getList('sx_redeem_codes', 200),
    getList('sx_mc_audio_library', 200)
  ]);
  const users = enrichUsers(usersRaw, entitlements, orders, matchResults);

  return httpResponse(event, {
    ok: true,
    users,
    feedback,
    orders,
    matchResults,
    entitlements,
    redeemCodes,
    audioItems,
    stats: {
      users: users.length,
      feedback: feedback.length,
      orders: orders.length,
      matchResults: matchResults.length,
      entitlements: entitlements.length,
      redeemCodes: redeemCodes.length,
      audioItems: audioItems.length,
      paidMembers: users.filter((item) => item.membershipType === 'paid').length,
      freeMembers: users.filter((item) => item.membershipType === 'free').length
    }
  });
};
