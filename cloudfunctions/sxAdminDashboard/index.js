const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function getList(collection, limit = 50) {
  const res = await db.collection(collection).orderBy('createdAt', 'desc').limit(limit).get();
  return res.data;
}

exports.main = async () => {
  const [users, feedback, orders, matchResults, entitlements] = await Promise.all([
    getList('sx_users'),
    getList('sx_feedback'),
    getList('sx_orders'),
    getList('sx_match_results'),
    getList('sx_entitlements')
  ]);

  return {
    ok: true,
    users,
    feedback,
    orders,
    matchResults,
    entitlements,
    stats: {
      users: users.length,
      feedback: feedback.length,
      orders: orders.length,
      matchResults: matchResults.length,
      entitlements: entitlements.length
    }
  };
};