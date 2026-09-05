'use strict';

const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const LIVE = 'sx_match_live_states';
const QUICK = 'sx_quick_scoreboard_sessions';
const now = () => Date.now();
const clean = (value, length = 120) => String(value || '').trim().slice(0, length);
const first = async (name, query) => { const result = await db.collection(name).where(query).limit(1).get(); return result.data && result.data[0] || null; };
const ensure = async (name) => { try { await db.collection(name).limit(1).get(); } catch (_) { try { await db.createCollection(name); } catch (_) {} } };
const caller = () => { const context = cloud.getWXContext(); const openid = clean(context.FROM_OPENID || context.OPENID, 100); if (!openid) throw new Error('请先登录'); return openid; };
async function displayCode() { for (let attempt = 0; attempt < 20; attempt += 1) { const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); if (!await first(LIVE, { displayCode: code }) && !await first(QUICK, { displayCode: code })) return code; } throw new Error('大屏码生成失败，请稍后重试'); }
function publicPatch(input = {}) { return { matchName: clean(input.matchName, 100) || '快速比赛', homeName: clean(input.homeName, 50) || '主队', awayName: clean(input.awayName, 50) || '客队', homeLogo: clean(input.homeLogo, 1000), awayLogo: clean(input.awayLogo, 1000), homeScore: Math.max(0, Number(input.homeScore || 0)), awayScore: Math.max(0, Number(input.awayScore || 0)), period: Math.max(1, Number(input.period || 1)), totalPeriods: Math.max(1, Number(input.totalPeriods || 4)), periodMinutes: Math.max(1, Number(input.periodMinutes || 10)), clockSeconds: Math.max(0, Number(input.clockSeconds || 0)), clockRunning: input.clockRunning === true, timerMode: input.timerMode === 'up' ? 'up' : 'down', homeFouls: Math.max(0, Number(input.homeFouls || 0)), awayFouls: Math.max(0, Number(input.awayFouls || 0)), homeTimeouts: Math.max(0, Number(input.homeTimeouts || 0)), awayTimeouts: Math.max(0, Number(input.awayTimeouts || 0)), possession: input.possession === 'right' ? 'right' : 'left', shotClockEnabled: input.shotClockEnabled === true, shotClock: Math.max(0, Number(input.shotClock || 0)), shotClockRunning: input.shotClockRunning === true, restKind: clean(input.restKind, 20), restSeconds: Math.max(0, Number(input.restSeconds || 0)), restCountdownVisible: input.restCountdownVisible === true }; }

exports.main = async (event = {}) => {
  try {
    await ensure(LIVE); await ensure(QUICK);
    const openid = caller(event), action = clean(event.action, 30);
    if (action === 'create') {
      const sessionId = `quick_screen_${crypto.randomBytes(12).toString('hex')}`, code = await displayCode();
      const data = { sessionId, displayCode: code, ownerOpenid: openid, status: 'live', version: 1, ...publicPatch(event.state), createdAt: now(), updatedAt: now(), expiresAt: now() + 12 * 60 * 60 * 1000 };
      await db.collection(QUICK).add({ data });
      return { ok: true, sessionId, displayCode: code, state: data };
    }
    const session = await first(QUICK, { sessionId: clean(event.sessionId, 100), ownerOpenid: openid });
    if (!session) throw new Error('快捷比赛大屏会话不存在');
    if (action === 'update') {
      const next = { ...publicPatch(event.state), version: Number(session.version || 0) + 1, updatedAt: now(), expiresAt: now() + 12 * 60 * 60 * 1000 };
      await db.collection(QUICK).doc(session._id).update({ data: next });
      return { ok: true, state: { ...session, ...next } };
    }
    if (action === 'finish') {
      await db.collection(QUICK).doc(session._id).update({ data: { status: 'completed', clockRunning: false, shotClockRunning: false, finishedAt: now(), updatedAt: now(), expiresAt: now() + 12 * 60 * 60 * 1000 } });
      return { ok: true };
    }
    throw new Error('不支持的快捷大屏操作');
  } catch (error) {
    console.error('[sxQuickScoreboard]', error);
    return { ok: false, message: error.message || '快捷比赛大屏服务暂不可用' };
  }
};
