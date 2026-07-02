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

async function getList(collection, limit = 50) {
  try {
    const res = await db.collection(collection).orderBy('createdAt', 'desc').limit(limit).get();
    return res.data;
  } catch (error) {
    console.warn(`[sxAdminDashboard] ${collection} unavailable`, error);
    return [];
  }
}

exports.main = async (event) => {
  if (event && event.httpMethod === 'OPTIONS') {
    return httpResponse(event, { ok: true });
  }

  const [users, feedback, orders, matchResults, entitlements, redeemCodes] = await Promise.all([
    getList('sx_users'),
    getList('sx_feedback'),
    getList('sx_orders'),
    getList('sx_match_results'),
    getList('sx_entitlements'),
    getList('sx_redeem_codes')
  ]);

  return httpResponse(event, {
    ok: true,
    users,
    feedback,
    orders,
    matchResults,
    entitlements,
    redeemCodes,
    stats: {
      users: users.length,
      feedback: feedback.length,
      orders: orders.length,
      matchResults: matchResults.length,
      entitlements: entitlements.length,
      redeemCodes: redeemCodes.length
    }
  });
};
