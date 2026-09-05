'use strict';

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTIONS = {
  live: 'sx_match_live_states',
  matches: 'sx_tournament_matches',
  tournaments: 'sx_tournaments',
  teams: 'sx_tournament_teams'
};
const QUICK = 'sx_quick_scoreboard_sessions';

const clean = (value, length = 100) => String(value || '').trim().slice(0, length);
const logoCache = new Map();
const first = async (name, query) => {
  const result = await db.collection(name).where(query).limit(1).get();
  return result.data && result.data[0] || null;
};
const optionalFirst = async (name, query) => { try { return await first(name, query); } catch (_) { return null; } };
const bodyOf = (event) => {
  if (event.body && typeof event.body === 'string') {
    try { return JSON.parse(event.body); } catch (_) { return {}; }
  }
  return event.body && typeof event.body === 'object' ? event.body : {};
};
const queryOf = (event) => event.queryStringParameters || event.query || {};
const json = (data, statusCode = 200) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  },
  body: JSON.stringify(data)
});

async function publicLogo(team) {
  const source = clean(team && (team.logo || team.logoUrl || team.logoFileID), 1000);
  if (!source || !source.startsWith('cloud://')) return source;
  const cached = logoCache.get(source);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  try {
    const result = await cloud.getTempFileURL({ fileList: [source] });
    const file = result && result.fileList && result.fileList[0];
    const url = clean(file && (file.tempFileURL || file.download_url), 1200);
    if (url) logoCache.set(source, { url, expiresAt: Date.now() + 60 * 60 * 1000 });
    return url;
  } catch (error) {
    console.warn('[sxScoreboardDisplay] team logo unavailable', error && error.message || 'unknown');
    return '';
  }
}

function publicState(state) {
  return {
    status: state.status === 'completed' ? 'completed' : 'live',
    version: Number(state.version || 0),
    homeScore: Math.max(0, Number(state.homeScore || 0)),
    awayScore: Math.max(0, Number(state.awayScore || 0)),
    period: Math.max(1, Number(state.period || 1)),
    totalPeriods: Math.max(1, Number(state.totalPeriods || 4)),
    periodMinutes: Math.max(1, Number(state.periodMinutes || 10)),
    clockSeconds: Math.max(0, Number(state.clockSeconds || 0)),
    clockRunning: state.clockRunning === true,
    timerMode: state.timerMode === 'up' ? 'up' : 'down',
    homeFouls: Math.max(0, Number(state.homeFouls || 0)),
    awayFouls: Math.max(0, Number(state.awayFouls || 0)),
    homeTimeouts: Math.max(0, Number(state.homeTimeouts || 0)),
    awayTimeouts: Math.max(0, Number(state.awayTimeouts || 0)),
    possession: state.possession === 'right' ? 'away' : 'home',
    shotClockEnabled: state.shotClockEnabled === true,
    shotClock: Math.max(0, Number(state.shotClock || 0)),
    shotClockRunning: state.shotClockRunning === true,
    restKind: clean(state.restKind, 20),
    restSeconds: Math.max(0, Number(state.restSeconds || 0)),
    restCountdownVisible: state.restCountdownVisible === true,
    updatedAt: Number(state.updatedAt || 0),
    finishedAt: Number(state.finishedAt || 0)
  };
}

async function handle(event = {}) {
  if ((event.httpMethod || '').toUpperCase() === 'OPTIONS') return json({ ok: true });
  const input = { ...queryOf(event), ...bodyOf(event), ...event };
  const code = clean(input.code || input.displayCode, 6).replace(/\D/g, '');
  if (!/^\d{6}$/.test(code)) return json({ ok: false, message: '请输入6位大屏码' }, 400);

  let state = await optionalFirst(COLLECTIONS.live, { displayCode: code });
  if (!state) {
    state = await optionalFirst(QUICK, { displayCode: code });
    if (!state || Number(state.expiresAt || 0) < Date.now()) return json({ ok: false, message: '大屏码无效或比赛尚未启动' }, 404);
    const [homeLogo, awayLogo] = await Promise.all([publicLogo({ logo: state.homeLogo }), publicLogo({ logo: state.awayLogo })]);
    return json({ ok: true, serverTime: Date.now(), match: { matchId: state.sessionId, name: state.matchName || '快速比赛', court: '', stage: '快速比赛', home: { name: state.homeName || '主队', logo: homeLogo }, away: { name: state.awayName || '客队', logo: awayLogo } }, state: publicState(state) });
  }
  const match = await first(COLLECTIONS.matches, { matchId: state.matchId });
  if (!match) return json({ ok: false, message: '比赛信息不存在' }, 404);
  const [tournament, home, away] = await Promise.all([
    first(COLLECTIONS.tournaments, { eventId: match.eventId }),
    first(COLLECTIONS.teams, { eventId: match.eventId, teamId: match.homeTeamId }),
    first(COLLECTIONS.teams, { eventId: match.eventId, teamId: match.awayTeamId })
  ]);
  const [homeLogo, awayLogo] = await Promise.all([publicLogo(home), publicLogo(away)]);

  return json({
    ok: true,
    serverTime: Date.now(),
    match: {
      matchId: match.matchId,
      name: tournament && tournament.name || match.name || '篮球比赛',
      court: match.courtName || match.court || '',
      stage: match.stageName || match.roundName || '',
      home: { name: home && home.name || match.homeTeamName || '主队', logo: homeLogo },
      away: { name: away && away.name || match.awayTeamName || '客队', logo: awayLogo }
    },
    state: publicState(state)
  });
}

exports.main = async (event = {}) => {
  try { return await handle(event); }
  catch (error) {
    console.error('[sxScoreboardDisplay]', error);
    return json({ ok: false, message: '大屏服务暂时不可用，请稍后重试' }, 500);
  }
};
