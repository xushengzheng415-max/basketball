const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function getList(collection, limit = 50) {
  try {
    const res = await db.collection(collection).orderBy('createdAt', 'desc').limit(limit).get();
    return res.data;
  } catch (error) {
    console.warn(`[sxAdminDashboard] ${collection} unavailable`, error);
    return [];
  }
}

exports.main = async () => {
  const [users, feedback, orders, matchResults, entitlements, redeemCodes] = await Promise.all([
    getList('sx_users'),
    getList('sx_feedback'),
    getList('sx_orders'),
    getList('sx_match_results'),
    getList('sx_entitlements'),
    getList('sx_redeem_codes')
  ]);

  return {
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
  };
};
