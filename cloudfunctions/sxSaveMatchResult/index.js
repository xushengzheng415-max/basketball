const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function text(value, fallback, maxLength) {
  const result = String(value || fallback || '').trim();
  return result.slice(0, maxLength || 120);
}
function number(value, fallback) {
  const result = Number(value);
  return Number.isFinite(result) ? result : Number(fallback || 0);
}
function safePeriodScores(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item, index) => ({
    period: Math.max(1, number(item && item.period, index + 1)),
    home: number(item && item.home, 0),
    away: number(item && item.away, 0)
  }));
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const result = (event && event.result) || {};
  const recordId = text(result.id || result.recordId, '', 100);
  const now = db.serverDate();
  const data = {
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || '',
    recordId,
    tournamentId: text(result.tournamentId, '', 100),
    gameId: text(result.gameId, '', 100),
    matchName: text(result.matchName, '快捷比赛', 100),
    tournamentName: text(result.tournamentName, '', 100),
    groupName: text(result.groupName, '', 60),
    venue: text(result.venue, '', 120),
    homeName: text(result.homeName, '主队', 60),
    awayName: text(result.awayName, '客队', 60),
    homeLogo: text(result.homeLogo, '', 500),
    awayLogo: text(result.awayLogo, '', 500),
    homeScore: number(result.homeScore, 0),
    awayScore: number(result.awayScore, 0),
    homeFouls: number(result.homeFouls, 0),
    awayFouls: number(result.awayFouls, 0),
    homeTimeouts: number(result.homeTimeouts, 0),
    awayTimeouts: number(result.awayTimeouts, 0),
    period: Math.max(1, number(result.period, 1)),
    totalPeriods: Math.max(1, number(result.totalPeriods, 4)),
    maxPeriodReached: Math.max(1, number(result.maxPeriodReached || result.period, 1)),
    periodScores: safePeriodScores(result.periodScores),
    clockText: text(result.clockText, '', 20),
    endedAt: number(result.endedAt, 0),
    reportMode: text(result.reportMode, '', 20),
    reportRequested: result.reportRequested === true,
    reportStatus: text(result.reportStatus, '', 30),
    reportLocked: result.reportLocked === true,
    refereeName: text(result.refereeName, '', 50),
    signatureFileID: text(result.signatureFileID, '', 500),
    reportImageFileID: text(result.reportImageFileID, '', 500),
    pdfFileID: text(result.pdfFileID, '', 500),
    reportNo: text(result.reportNo, '', 80),
    signedAt: number(result.signedAt, 0),
    updatedAt: now
  };

  if (recordId) {
    const existing = await db.collection('sx_match_results').where({ openid: wxContext.OPENID, recordId }).limit(1).get();
    if (existing.data && existing.data.length) {
      await db.collection('sx_match_results').doc(existing.data[0]._id).update({ data });
      return { ok: true, id: existing.data[0]._id, updated: true };
    }
  }

  const created = await db.collection('sx_match_results').add({ data: Object.assign({}, data, { createdAt: now }) });
  return { ok: true, id: created._id, updated: false };
};
