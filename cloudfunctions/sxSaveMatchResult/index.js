const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const result = event.result || {};

  const data = {
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || '',
    homeName: result.homeName || '主队',
    awayName: result.awayName || '客队',
    homeScore: Number(result.homeScore || 0),
    awayScore: Number(result.awayScore || 0),
    homeFouls: Number(result.homeFouls || 0),
    awayFouls: Number(result.awayFouls || 0),
    period: Number(result.period || 1),
    totalPeriods: Number(result.totalPeriods || 4),
    clockText: result.clockText || '',
    endedAtText: result.endedAt || '',
    createdAt: db.serverDate()
  };

  const res = await db.collection('sx_match_results').add({ data });
  return { ok: true, id: res._id };
};