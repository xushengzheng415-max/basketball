'use strict';

const cloud = require('wx-server-sdk');
const https = require('https');
const {
  buildSchedule,
  calculateStandings,
  competitionTeam,
  competitionFormat,
  id,
  integer,
  normalizePoints,
  normalizeTeam,
  opaqueKey,
  scenarioType,
  teamFingerprint,
  text
} = require('./domain');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const BASKETBALL_APPID = process.env.SXF_BASKETBALL_APPID || 'wx06d735da15276acd';
const MINI_TEMPLATE_IDS = {
  registration: 'ZaQx7FB2aJmEvlh0e9-iY85wzuBaZoDPUMDVB9favZs',
  review: 'jp0LDnCgS6w5xyLSJQyLnOuilLV94MNAtzvQtuGw8XE'
};
let miniAccessToken = { value: '', expireAt: 0 };

const C = {
  tournaments: 'sx_tournaments',
  teams: 'sx_tournament_teams',
  matches: 'sx_tournament_matches',
  invites: 'sx_tournament_invites',
  tasks: 'sx_tournament_tasks',
  notices: 'sx_tournament_notice_logs',
  serviceOutbox: 'sx_tournament_notification_outbox',
  migrations: 'sx_tournament_migrations'
};

const MATCH_RESET_COLLECTIONS = {
  preparations: 'sx_match_preparations',
  refereeInvites: 'sx_match_referee_invites',
  rosters: 'sx_match_rosters',
  liveStates: 'sx_match_live_states',
  substitutions: 'sx_match_substitutions',
  timeoutRequests: 'sx_match_timeout_requests',
  tactics: 'sx_match_tactics',
  matchTasks: 'sx_match_tasks',
  matchAssignments: 'sx_match_assignments',
  matchStaff: 'sx_match_staff',
  statAssignments: 'sx_stat_assignments',
  matchResults: 'sx_match_results'
};

function now() { return Date.now(); }

function requestWechat(method, path, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? Buffer.from(JSON.stringify(payload)) : null;
    const request = https.request({
      host: 'api.weixin.qq.com', path, method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': body.length } : undefined
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { reject(new Error('微信订阅消息响应异常')); }
      });
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function getMiniAccessToken() {
  if (miniAccessToken.value && miniAccessToken.expireAt > now() + 300000) return miniAccessToken.value;
  const secret = String(process.env.SXF_BASKETBALL_APPSECRET || '').trim();
  if (!secret) throw new Error('篮球小程序订阅消息密钥未配置');
  const response = await requestWechat('POST', '/cgi-bin/stable_token', { grant_type: 'client_credential', appid: BASKETBALL_APPID, secret });
  if (!response || !response.access_token) throw new Error(`获取篮球小程序通知凭据失败：${response && (response.errmsg || response.errcode) || '未知错误'}`);
  miniAccessToken = { value: response.access_token, expireAt: now() + Math.max(300, Number(response.expires_in || 7200) - 300) * 1000 };
  return miniAccessToken.value;
}

async function sendMiniTournamentNotice(type, openid, payload) {
  const templateId = MINI_TEMPLATE_IDS[type];
  if (!templateId || !openid) return { ok: false, skipped: true };
  const token = await getMiniAccessToken();
  const result = await requestWechat('POST', `/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
    touser: openid,
    template_id: templateId,
    page: `pages/tournament-detail/index?id=${encodeURIComponent(payload.eventId)}&tab=teams`,
    miniprogram_state: process.env.SXF_MINI_SUBSCRIBE_STATE || 'trial',
    lang: 'zh_CN',
    data: type === 'registration' ? {
      thing1: { value: text(payload.tournamentName, 20) },
      thing2: { value: '待审核' },
      thing7: { value: text(payload.teamName, 20) },
      thing6: { value: '已提交报名，请及时审核' }
    } : {
      thing1: { value: text(payload.tournamentName, 20) },
      thing2: { value: text(payload.teamName, 20) },
      thing3: { value: payload.status === 'approved' ? '审核通过' : payload.status === 'withdrawn' ? '已移出赛事' : '审核驳回' },
      thing4: { value: text(payload.note || (payload.status === 'approved' ? '可进入赛事，等待对阵发布' : '请查看驳回原因后重新提交'), 20) }
    }
  });
  if (Number(result && result.errcode || 0) !== 0) throw new Error(`小程序订阅消息发送失败：${result && (result.errmsg || result.errcode) || '未知错误'}`);
  return { ok: true };
}

async function recordTournamentNotice(type, openid, payload, sender) {
  const base = {
    noticeId: id('tnotice'), type, recipientOpenid: openid, eventId: payload.eventId,
    tournamentName: payload.tournamentName || '', teamName: payload.teamName || '',
    createdAt: now(), updatedAt: now(), channel: 'mini_subscribe'
  };
  try {
    const result = await sender(type, openid, payload);
    await db.collection(C.notices).add({ data: { ...base, status: result && result.skipped ? 'skipped' : 'sent', detail: result && result.skipped ? '未找到通知模板或接收人' : '已提交微信发送' } });
    return result;
  } catch (error) {
    await db.collection(C.notices).add({ data: { ...base, status: 'failed', detail: text(error && error.message, 200) } });
    throw error;
  }
}

async function queueServiceTournamentNotice(type, recipientMiniOpenid, payload) {
  if (!recipientMiniOpenid || !['registration', 'review', 'announcement'].includes(type)) return { ok: false, skipped: true };
  const notificationId = id('tn');
  const record = {
    notificationId, type, recipientMiniOpenid, recipientOfficialOpenid: '', status: 'queued', retryCount: 0,
    payload: {
      eventId: text(payload.eventId, 100), tournamentName: text(payload.tournamentName, 100), teamName: text(payload.teamName, 100),
      playerCount: Number(payload.playerCount || 0), status: text(payload.status, 20), note: text(payload.note, 200),
      reviewerName: text(payload.reviewerName || '赛事创建者', 50), reviewedAtText: text(payload.reviewedAtText, 30)
    },
    createdAt: now(), updatedAt: now()
  };
  await db.collection(C.serviceOutbox).add({ data: record });
  try {
    const delivery = await cloud.callFunction({ name: 'sxTournamentNotification', data: { action: 'deliverNotification', notificationId } });
    return { ok: true, notificationId, status: delivery && delivery.result && delivery.result.status || 'queued' };
  } catch (error) {
    console.warn('[tournament] service notification queued', notificationId, error.message);
    return { ok: true, notificationId, status: 'queued' };
  }
}

async function upsertRegistrationStatusTask(tournament, team, status, unread, detail) {
  return upsertTournamentTask({
    taskKey: `${tournament.eventId}:registration_status:${team.teamId}`,
    taskId: id('ttask'), eventId: tournament.eventId, recipientOpenid: team.ownerOpenid,
    type: 'registration_status', status: 'pending', unread: unread !== false,
    registrationStatus: status, tournamentName: tournament.name, teamId: team.teamId,
    teamName: team.name, submittedAt: team.submittedAt, detail, updatedAt: now()
  });
}

async function ensureCollection(name) {
  try { await db.collection(name).limit(1).get(); } catch (error) {
    try { await db.createCollection(name); } catch (ignored) {}
  }
}

async function ensureCollections() {
  for (const name of Object.values(C)) await ensureCollection(name);
}

async function all(name, where = {}) {
  const rows = [];
  let offset = 0;
  while (true) {
    const response = await db.collection(name).where(where).skip(offset).limit(100).get();
    const batch = response.data || [];
    rows.push(...batch);
    if (batch.length < 100) break;
    offset += batch.length;
  }
  return rows;
}

async function removeWhere(name, where) {
  await ensureCollection(name);
  let removed = 0;
  while (true) {
    const response = await db.collection(name).where(where).limit(100).get();
    const rows = response.data || [];
    if (!rows.length) break;
    for (const row of rows) {
      await db.collection(name).doc(row._id).remove();
      removed += 1;
    }
    if (rows.length < 100) break;
  }
  return removed;
}

async function first(name, where) {
  const response = await db.collection(name).where(where).limit(1).get();
  return response.data && response.data[0] ? response.data[0] : null;
}

async function upsertTournamentTask(task) {
  const existing = await first(C.tasks, { taskKey: task.taskKey });
  if (existing) {
    await db.collection(C.tasks).doc(existing._id).update({ data: { ...task, updatedAt: now() } });
    return { ...existing, ...task };
  }
  const record = { ...task, createdAt: now(), updatedAt: now() };
  await db.collection(C.tasks).add({ data: record });
  return record;
}

function publicTournament(item) {
  if (!item) return null;
  const copy = { ...item };
  delete copy._openid;
  delete copy.creatorOpenid;
  return copy;
}

function publicTeam(item, tournament) {
  if (!item) return null;
  const copy = competitionTeam(tournament, item);
  delete copy._openid;
  delete copy.ownerOpenid;
  return copy;
}

function requireOpenId() {
  const context = cloud.getWXContext();
  const openid = text(context.FROM_OPENID || context.OPENID, 100);
  if (!openid) throw new Error('请先登录后再操作赛事');
  return openid;
}

async function requireTournament(eventId) {
  const tournament = await first(C.tournaments, { eventId: text(eventId, 100) });
  if (!tournament) throw new Error('赛事不存在或已被删除');
  return tournament;
}

function requireCreator(tournament, openid) {
  if (!tournament || tournament.creatorOpenid !== openid) throw new Error('仅赛事创建者可以执行此操作');
}

async function membership(eventId, openid) {
  return first(C.teams, { eventId, ownerOpenid: openid, status: db.command.in(['pending', 'approved', 'rejected', 'withdrawn']) });
}

async function requireMember(tournament, openid) {
  if (tournament.creatorOpenid === openid) return { role: 'creator', team: null };
  const team = await membership(tournament.eventId, openid);
  if (!team) throw new Error('你还不是该赛事的参赛成员');
  return { role: 'participant', team };
}

function normalizeTournamentPayload(payload = {}) {
  const scenario = scenarioType(payload.scenarioType);
  const format = competitionFormat(payload.competitionFormat);
  return {
    name: text(payload.name, 100),
    scenarioType: scenario,
    competitionFormat: format,
    status: ['draft', 'recruiting', 'scheduling', 'active', 'completed'].includes(payload.status) ? payload.status : 'recruiting',
    description: text(payload.description, 500),
    organizationName: text(payload.organizationName, 100),
    schoolStage: text(payload.schoolStage, 20),
    gradeCode: text(payload.gradeCode, 20),
    gradeName: text(payload.gradeName, 50),
    pointsRule: normalizePoints(payload.pointsRule),
    groupCount: integer(payload.groupCount, 2, 2, 16),
    advanceCount: integer(payload.advanceCount, 2, 1, 8),
    periodMinutes: integer(payload.periodMinutes, 10, 1, 30),
    periodCount: integer(payload.periodCount, 4, 1, 8),
    registrationOpen: payload.registrationOpen === undefined ? payload.status !== 'draft' : payload.registrationOpen === true,
    currentRound: Number(payload.currentRound || 0),
    completedMatches: Number(payload.completedMatches || 0),
    totalMatches: Number(payload.totalMatches || 0)
  };
}

function validateTournament(payload) {
  if (!payload.name) throw new Error('请填写赛事名称');
  if (payload.scenarioType === 'class_league') {
    if (!payload.organizationName) throw new Error('请填写学校名称');
    const gradePatterns = { primary: /^P[1-6]$/, junior: /^J[1-3]$/, senior: /^S[1-3]$/ };
    if (!gradePatterns[payload.schoolStage] || !gradePatterns[payload.schoolStage].test(payload.gradeCode)) {
      throw new Error('请选择有效的学段和比赛年级');
    }
  }
}

function validateTeam(team, scenario) {
  if (!team.name) throw new Error('请填写球队名称');
  if (scenario === 'class_league') {
    if (!team.schoolName) throw new Error('请填写学校名称');
    if (!team.schoolStage) throw new Error('请选择学段');
    if (!team.gradeCode || !team.gradeName) throw new Error('请选择比赛年级');
    if (!team.classCode) throw new Error('请选择本班班级');
    if (!team.className) throw new Error(team.classCode === 'custom' ? '请填写自定义班级' : '请选择本班班级');
    const gradePatterns = { primary: /^P[1-6]$/, junior: /^J[1-3]$/, senior: /^S[1-3]$/ };
    if (!gradePatterns[team.schoolStage] || !gradePatterns[team.schoolStage].test(team.gradeCode)) throw new Error('班级学段与年级不匹配');
    if (team.classCode !== 'custom' && !/^(?:[1-9]|10)$/.test(team.classCode)) throw new Error('班级请选择 1—10 班或自定义班级');
  }
}

async function addTeamSnapshot(tournament, openid, teamInput, status, source) {
  const team = normalizeTeam(teamInput, tournament.scenarioType);
  validateTeam(team, tournament.scenarioType);
  const fingerprint = teamFingerprint(team, tournament.scenarioType);
  const duplicate = await first(C.teams, { eventId: tournament.eventId, fingerprint, status: db.command.neq('withdrawn') });
  if (duplicate) throw new Error(tournament.scenarioType === 'class_league' ? '该班级已经报名' : '该球队已经报名');
  const teamId = id('team');
  const record = {
    teamId,
    eventId: tournament.eventId,
    ownerOpenid: openid,
    source,
    fingerprint,
    ...team,
    status,
    groupKey: '',
    submittedAt: now(),
    reviewedAt: status === 'approved' ? now() : 0,
    createdAt: now(),
    updatedAt: now()
  };
  await db.collection(C.teams).add({ data: record });
  return record;
}

async function repairMissingCreatorTeam(tournament, openid, teams) {
  if (teams.some((team) => team.source === 'creator' && team.status !== 'withdrawn')) return teams;
  const history = (await all(C.teams, { ownerOpenid: openid, source: 'creator', status: 'approved' }))
    .filter((team) => team.eventId !== tournament.eventId)
    .sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0));
  const identities = new Map();
  history.forEach((team) => {
    const key = text(team.sourceTeamId || team.fingerprint || team.name, 200);
    if (key && !identities.has(key)) identities.set(key, team);
  });
  if (identities.size !== 1) return teams;
  const source = identities.values().next().value;
  try {
    const repaired = await addTeamSnapshot(tournament, openid, {
      sourceTeamId: source.sourceTeamId,
      name: source.name,
      logo: source.logo,
      coachName: source.coachName,
      phone: source.phone,
      teamType: source.teamType,
      schoolName: source.schoolName,
      schoolStage: source.schoolStage,
      gradeCode: source.gradeCode,
      gradeName: source.gradeName,
      classCode: source.classCode,
      className: source.className,
      classDisplayName: source.classDisplayName,
      classIdentityKey: source.classIdentityKey,
      players: Array.isArray(source.players) ? source.players : []
    }, 'approved', 'creator');
    console.info('[tournament] repaired missing creator team', tournament.eventId, repaired.teamId);
    return [repaired, ...teams];
  } catch (error) {
    console.warn('[tournament] creator team repair skipped', tournament.eventId, error.message);
    return teams;
  }
}

async function createTournament(event, openid) {
  const payload = normalizeTournamentPayload(event.tournament || event);
  validateTournament(payload);
  const eventId = id('event');
  const tournament = {
    eventId,
    creatorOpenid: openid,
    ...payload,
    createdAt: now(),
    updatedAt: now()
  };
  await db.collection(C.tournaments).add({ data: tournament });
  let creatorTeam = null;
  if (event.creatorTeam && (event.creatorTeam.name || event.creatorTeam.className)) {
    creatorTeam = await addTeamSnapshot(tournament, openid, event.creatorTeam, 'approved', 'creator');
  }
  return { ok: true, tournament: publicTournament(tournament), creatorTeam: publicTeam(creatorTeam) };
}

async function updateTournament(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const payload = normalizeTournamentPayload({ ...tournament, ...(event.patch || {}) });
  validateTournament(payload);
  const matches = await all(C.matches, { eventId: tournament.eventId });
  if (payload.scenarioType !== tournament.scenarioType) {
    throw new Error('赛事创建后不能切换班班赛、机构周赛或其他赛事类型');
  }
  if (matches.length && payload.competitionFormat !== tournament.competitionFormat) {
    throw new Error('对阵已发布后不能更换赛制');
  }
  const hasStartedMatch = matches.some((match) => match.status === 'live' || match.status === 'completed');
  if (hasStartedMatch && (payload.periodMinutes !== Number(tournament.periodMinutes || 10) || payload.periodCount !== Number(tournament.periodCount || 4))) {
    throw new Error('已有比赛开始后不能修改比赛时长和节数');
  }
  const patch = { ...payload, updatedAt: now() };
  await db.collection(C.tournaments).doc(tournament._id).update({ data: patch });
  let creatorTeam = null;
  if (event.creatorTeam) {
    const currentTeam = await first(C.teams, { eventId: tournament.eventId, source: 'creator' });
    if (!currentTeam) throw new Error('未找到创建者参赛队');
    const nextTeam = normalizeTeam(event.creatorTeam, tournament.scenarioType);
    validateTeam(nextTeam, tournament.scenarioType);
    const fingerprint = teamFingerprint(nextTeam, tournament.scenarioType);
    if (matches.length && fingerprint !== currentTeam.fingerprint) {
      throw new Error('对阵已发布后不能修改自己绑定的班级或球队');
    }
    const allTeams = await all(C.teams, { eventId: tournament.eventId });
    const duplicate = allTeams.find((team) => team._id !== currentTeam._id && team.status !== 'withdrawn' && team.fingerprint === fingerprint);
    if (duplicate) throw new Error(tournament.scenarioType === 'class_league' ? '该班级已经在赛事中' : '该球队已经在赛事中');
    const teamPatch = {
      ...nextTeam,
      fingerprint,
      status: currentTeam.status,
      source: currentTeam.source,
      ownerOpenid: currentTeam.ownerOpenid,
      teamId: currentTeam.teamId,
      eventId: currentTeam.eventId,
      updatedAt: now()
    };
    await db.collection(C.teams).doc(currentTeam._id).update({ data: teamPatch });
    creatorTeam = publicTeam({ ...currentTeam, ...teamPatch }, tournament);
  }
  return { ok: true, tournament: publicTournament({ ...tournament, ...patch }), creatorTeam };
}

async function listMine(openid) {
  const [created, ownedTeams] = await Promise.all([
    all(C.tournaments, { creatorOpenid: openid }),
    all(C.teams, { ownerOpenid: openid, status: db.command.in(['pending', 'approved']) })
  ]);
  const joinedIds = [...new Set(ownedTeams.map((team) => team.eventId))];
  const joined = [];
  for (const eventId of joinedIds) {
    const tournament = await first(C.tournaments, { eventId });
    if (tournament && tournament.creatorOpenid !== openid) joined.push(tournament);
  }
  const decorate = async (item, role) => {
    const teams = await all(C.teams, { eventId: item.eventId, status: 'approved' });
    const pending = await all(C.teams, { eventId: item.eventId, status: 'pending' });
    const matches = await all(C.matches, { eventId: item.eventId });
    const myTeam = role === 'participant'
      ? ownedTeams.find((team) => team.eventId === item.eventId)
      : null;
    return {
      ...publicTournament(item),
      role,
      teamCount: teams.length,
      pendingTeamCount: role === 'creator' ? pending.length : 0,
      myRegistrationStatus: myTeam ? myTeam.status : '',
      myRegistrationTeamName: myTeam ? competitionTeam(item, myTeam).name : '',
      totalMatches: matches.length || Number(item.totalMatches || 0),
      completedMatches: matches.filter((match) => match.status === 'completed').length
    };
  };
  return {
    ok: true,
    created: await Promise.all(created.map((item) => decorate(item, 'creator'))),
    joined: await Promise.all(joined.map((item) => decorate(item, 'participant')))
  };
}

async function getTournament(event, openid) {
  const tournament = await requireTournament(event.eventId);
  const access = await requireMember(tournament, openid);
  let [teams, matches] = await Promise.all([
    all(C.teams, { eventId: tournament.eventId }),
    all(C.matches, { eventId: tournament.eventId })
  ]);
  if (access.role === 'creator') teams = await repairMissingCreatorTeam(tournament, openid, teams);
  const competitionTeams = teams.map((team) => competitionTeam(tournament, team));
  const approvedTeams = competitionTeams.filter((team) => team.status === 'approved');
  const completedTeamIds = new Set(matches.filter((match) => match.status === 'completed').flatMap((match) => [match.homeTeamId, match.awayTeamId]));
  const rankingTeams = competitionTeams.filter((team) => team.status === 'approved' || (team.status === 'withdrawn' && completedTeamIds.has(team.teamId)));
  const visibleTeams = access.role === 'creator'
    ? competitionTeams.filter((team) => team.hiddenFromManagement !== true)
    : competitionTeams.filter((team) => team.status === 'approved' || (access.team && access.team.status !== 'withdrawn' && team.teamId === access.team.teamId));
  const names = new Map(competitionTeams.map((team) => [team.teamId, team.name]));
  const displayMatches = matches.map((match) => ({
    ...match,
    homeTeamName: names.get(match.homeTeamId) || match.homeTeamName,
    awayTeamName: names.get(match.awayTeamId) || match.awayTeamName
  }));
  const standings = calculateStandings(rankingTeams, displayMatches, tournament.pointsRule);
  const standingSections = tournament.competitionFormat === 'group_knockout'
    ? [...new Set(rankingTeams.map((team) => team.groupKey).filter(Boolean))].sort().map((groupKey) => ({
      groupKey,
      label: `${groupKey} 组`,
      rows: calculateStandings(
        rankingTeams.filter((team) => team.groupKey === groupKey),
        displayMatches.filter((match) => match.groupKey === groupKey && match.stage === 'group'),
        tournament.pointsRule
      )
    }))
    : [{ groupKey: '', label: '联赛积分榜', rows: standings }];
  return {
    ok: true,
    tournament: publicTournament({
      ...tournament,
      scenarioType: scenarioType(tournament.scenarioType),
      competitionFormat: competitionFormat(tournament.competitionFormat),
      pointsRule: normalizePoints(tournament.pointsRule),
      groupCount: Number(tournament.groupCount || 2),
      advanceCount: Number(tournament.advanceCount || 2),
      registrationOpen: tournament.registrationOpen !== false
    }),
    role: access.role,
    myTeamId: access.team ? access.team.teamId : (access.role === 'creator' ? ((competitionTeams.find((team) => team.source === 'creator') || {}).teamId || '') : ''),
    teams: visibleTeams.map((team) => publicTeam(team, tournament)),
    matches: displayMatches.sort((a, b) => Number(a.orderNo || 0) - Number(b.orderNo || 0)),
    standings,
    standingSections
  };
}

async function createInvite(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  if (!tournament.registrationOpen) throw new Error('赛事招募已经关闭');
  const existing = await first(C.invites, { eventId: tournament.eventId, status: 'active' });
  if (existing) return { ok: true, eventId: tournament.eventId, inviteKey: existing.inviteKey };
  const inviteKey = opaqueKey(8);
  await db.collection(C.invites).add({ data: {
    invitationId: id('invite'), eventId: tournament.eventId, inviteKey,
    status: 'active', createdBy: openid, createdAt: now(), updatedAt: now()
  } });
  return { ok: true, eventId: tournament.eventId, inviteKey };
}

async function getInvitation(event) {
  const invite = await first(C.invites, { inviteKey: text(event.inviteKey, 100), status: 'active' });
  if (!invite) throw new Error('邀请码无效或招募已经结束');
  const tournament = await requireTournament(invite.eventId);
  if (!tournament.registrationOpen) throw new Error('赛事招募已经关闭');
  return { ok: true, tournament: {
    eventId: tournament.eventId,
    name: tournament.name,
    scenarioType: tournament.scenarioType,
    competitionFormat: tournament.competitionFormat,
    organizationName: tournament.organizationName,
    schoolStage: tournament.schoolStage || '',
    gradeCode: tournament.gradeCode || '',
    gradeName: tournament.gradeName || '',
    status: tournament.status
  } };
}

async function getMyRegistration(event, openid) {
  const tournament = await requireTournament(event.eventId);
  const team = await first(C.teams, { eventId: tournament.eventId, ownerOpenid: openid, status: db.command.in(['pending', 'approved', 'rejected']) });
  return { ok: true, registration: publicTeam(team, tournament) };
}

async function submitTeam(event, openid) {
  const invite = await first(C.invites, { inviteKey: text(event.inviteKey, 100), status: 'active' });
  if (!invite) throw new Error('邀请码无效或招募已经结束');
  const tournament = await requireTournament(invite.eventId);
  if (!tournament.registrationOpen) throw new Error('赛事招募已经关闭');
  const owned = await first(C.teams, { eventId: tournament.eventId, ownerOpenid: openid, status: db.command.neq('withdrawn') });
  if (owned && owned.status !== 'rejected') throw new Error('你已经提交过参赛球队');
  if (owned && owned.status === 'rejected') {
    const team = normalizeTeam(event.team, tournament.scenarioType);
    validateTeam(team, tournament.scenarioType);
    const fingerprint = teamFingerprint(team, tournament.scenarioType);
    const duplicate = await first(C.teams, { eventId: tournament.eventId, fingerprint, status: db.command.neq('withdrawn') });
    if (duplicate && duplicate._id !== owned._id) throw new Error(tournament.scenarioType === 'class_league' ? '该班级已经报名' : '该球队已经报名');
    const patch = { ...team, fingerprint, status: 'pending', reviewNote: '', submittedAt: now(), reviewedAt: 0, updatedAt: now() };
    await db.collection(C.teams).doc(owned._id).update({ data: patch });
    const submittedTeam = { ...owned, ...patch };
    await upsertTournamentTask({
      taskKey: `${tournament.eventId}:registration_review:${submittedTeam.teamId}`,
      taskId: id('ttask'), eventId: tournament.eventId, recipientOpenid: tournament.creatorOpenid,
      type: 'registration_review', status: 'pending', unread: true, tournamentName: tournament.name,
      teamId: submittedTeam.teamId, teamName: submittedTeam.name, submittedAt: submittedTeam.submittedAt,
      detail: `${submittedTeam.name} 已重新提交报名，请审核。`
    });
    await upsertRegistrationStatusTask(tournament, submittedTeam, 'pending', true, '报名已重新提交，等待赛事创建者审核。');
    const registrationPayload = { eventId: tournament.eventId, tournamentName: tournament.name, teamName: submittedTeam.name, playerCount: Array.isArray(submittedTeam.players) ? submittedTeam.players.length : 0, note: '已重新提交报名，请及时审核' };
    await recordTournamentNotice('registration', tournament.creatorOpenid, registrationPayload, sendMiniTournamentNotice).catch((error) => console.warn('[tournament] registration notification failed', error.message));
    await queueServiceTournamentNotice('registration', tournament.creatorOpenid, registrationPayload).catch((error) => console.warn('[tournament] service registration notification failed', error.message));
    return { ok: true, team: publicTeam(submittedTeam) };
  }
  const team = await addTeamSnapshot(tournament, openid, event.team, 'pending', 'invitation');
  await upsertTournamentTask({
    taskKey: `${tournament.eventId}:registration_review:${team.teamId}`,
    taskId: id('ttask'), eventId: tournament.eventId, recipientOpenid: tournament.creatorOpenid,
    type: 'registration_review', status: 'pending', unread: true, tournamentName: tournament.name,
    teamId: team.teamId, teamName: team.name, submittedAt: team.submittedAt,
    detail: `${team.name} 已提交报名，请审核。`
  });
  await upsertRegistrationStatusTask(tournament, team, 'pending', true, '报名已提交，等待赛事创建者审核。');
  const registrationPayload = { eventId: tournament.eventId, tournamentName: tournament.name, teamName: team.name, playerCount: Array.isArray(team.players) ? team.players.length : 0, note: '已提交报名，请及时审核' };
  await recordTournamentNotice('registration', tournament.creatorOpenid, registrationPayload, sendMiniTournamentNotice).catch((error) => console.warn('[tournament] registration notification failed', error.message));
  await queueServiceTournamentNotice('registration', tournament.creatorOpenid, registrationPayload).catch((error) => console.warn('[tournament] service registration notification failed', error.message));
  return { ok: true, team: publicTeam(team) };
}

async function reviewTeam(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const team = await first(C.teams, { eventId: tournament.eventId, teamId: text(event.teamId, 100) });
  if (!team) throw new Error('报名球队不存在');
  if (team.status !== 'pending') throw new Error('该报名已经处理');
  const status = event.decision === 'approve' ? 'approved' : 'rejected';
  const patch = { status, reviewNote: text(event.note, 200), reviewedAt: now(), updatedAt: now() };
  await db.collection(C.teams).doc(team._id).update({ data: patch });
  const task = await first(C.tasks, { taskKey: `${tournament.eventId}:registration_review:${team.teamId}` });
  if (task) await db.collection(C.tasks).doc(task._id).update({ data: { status: 'completed', unread: false, resolvedAt: now(), resolution: status, updatedAt: now() } });
  const reviewedTeam = { ...team, ...patch };
  if (team.ownerOpenid !== tournament.creatorOpenid) {
    await upsertRegistrationStatusTask(
      tournament, reviewedTeam, status, true,
      status === 'approved' ? '报名审核已通过，可进入赛事查看后续对阵。' : `报名已被驳回：${patch.reviewNote || '请补充资料后重新提交。'}`
    );
  }
  const reviewPayload = { eventId: tournament.eventId, tournamentName: tournament.name, teamName: team.name, status, note: patch.reviewNote, reviewerName: '赛事创建者', reviewedAtText: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  await recordTournamentNotice('review', team.ownerOpenid, reviewPayload, sendMiniTournamentNotice).catch((error) => console.warn('[tournament] review notification failed', error.message));
  await queueServiceTournamentNotice('review', team.ownerOpenid, reviewPayload).catch((error) => console.warn('[tournament] service review notification failed', error.message));
  return { ok: true, status };
}

async function listTasks(openid) {
  const refereePreparations = await all(MATCH_RESET_COLLECTIONS.preparations, { refereeOpenid: openid });
  for (const preparation of refereePreparations.filter((item) => item.refereeStatus === 'accepted' && item.state !== 'completed')) {
    const match = await first(C.matches, { matchId: preparation.matchId });
    if (!match || match.status === 'completed') continue;
    const tournament = await first(C.tournaments, { eventId: match.eventId });
    if (!tournament) continue;
    const [homeTeam, awayTeam] = await Promise.all([
      first(C.teams, { eventId: match.eventId, teamId: match.homeTeamId }),
      first(C.teams, { eventId: match.eventId, teamId: match.awayTeamId })
    ]);
    const taskKey = `${match.matchId}:referee:${openid}`;
    const existingTask = await first(C.tasks, { taskKey });
    const isLive = preparation.state === 'live' || match.status === 'live';
    await upsertTournamentTask({
      taskKey,
      taskId: existingTask && existingTask.taskId ? existingTask.taskId : id('ttask'),
      eventId: match.eventId,
      matchId: match.matchId,
      recipientOpenid: openid,
      type: 'match_referee_accept',
      role: 'referee',
      teamScope: 'official',
      status: 'pending',
      unread: existingTask ? existingTask.unread !== false : true,
      tournamentName: tournament.name,
      teamName: '本场裁判',
      homeTeamName: homeTeam && homeTeam.name || match.homeTeamName || '主队',
      awayTeamName: awayTeam && awayTeam.name || match.awayTeamName || '客队',
      refereeStatus: preparation.refereeStatus,
      preparationState: preparation.state,
      matchState: match.status,
      detail: isLive ? '比赛进行中，可从工作台重新进入裁判计分台。' : '裁判任务已接受，请等待双方教练完成比赛准备。',
      deepLinkTarget: isLive ? `/pages/scorer-board/index?boardOnly=1&matchId=${encodeURIComponent(match.matchId)}` : `/pages/match-preparation/index?matchId=${encodeURIComponent(match.matchId)}`
    });
  }
  const created = await all(C.tournaments, { creatorOpenid: openid });
  const createdEventIds = new Set(created.map((tournament) => tournament.eventId));
  const wrongRoleTasks = await all(C.tasks, { recipientOpenid: openid, type: 'registration_status', status: 'pending' });
  for (const task of wrongRoleTasks) {
    if (!createdEventIds.has(task.eventId)) continue;
    await db.collection(C.tasks).doc(task._id).update({ data: {
      status: 'completed', unread: false, resolution: 'wrong_role_cleanup', resolvedAt: now(), updatedAt: now()
    } });
  }
  for (const tournament of created) {
    const pendingTeams = await all(C.teams, { eventId: tournament.eventId, status: 'pending' });
    for (const team of pendingTeams) {
      await upsertTournamentTask({
        taskKey: `${tournament.eventId}:registration_review:${team.teamId}`,
        taskId: id('ttask'), eventId: tournament.eventId, recipientOpenid: openid,
        type: 'registration_review', status: 'pending', unread: true, tournamentName: tournament.name,
        teamId: team.teamId, teamName: team.name, submittedAt: team.submittedAt,
        detail: `${team.name} 已提交报名，请审核。`
      });
    }
  }
  const mine = await all(C.teams, { ownerOpenid: openid, status: db.command.in(['pending', 'approved', 'rejected']) });
  for (const team of mine) {
    const tournament = await first(C.tournaments, { eventId: team.eventId });
    if (!tournament) continue;
    if (tournament.creatorOpenid === openid) continue;
    const statusTaskKey = `${tournament.eventId}:registration_status:${team.teamId}`;
    if (await first(C.tasks, { taskKey: statusTaskKey })) continue;
    const detail = team.status === 'pending'
      ? '报名已提交，等待赛事创建者审核。'
      : team.status === 'approved'
        ? '报名审核已通过，可进入赛事查看后续对阵。'
        : `报名已被驳回：${team.reviewNote || '请补充资料后重新提交。'}`;
    await upsertRegistrationStatusTask(tournament, team, team.status, false, detail);
  }
  const tasks = await all(C.tasks, { recipientOpenid: openid, status: 'pending' });
  const sorted = tasks.sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0));
  const visible = sorted.filter((task) => task.type === 'registration_review' || task.type === 'match_referee_accept' || task.unread !== false);
  return { ok: true, tasks: visible, unreadCount: visible.length };
}

async function markTaskRead(event, openid) {
  const task = await first(C.tasks, { taskId: text(event.taskId, 100), recipientOpenid: openid, status: 'pending' });
  if (!task) return { ok: true, changed: false };
  if (task.type === 'registration_review') return { ok: true, changed: false, actionable: true };
  await db.collection(C.tasks).doc(task._id).update({ data: { unread: false, readAt: now(), updatedAt: now() } });
  return { ok: true, changed: true };
}

async function closeRegistration(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  await db.collection(C.tournaments).doc(tournament._id).update({ data: {
    registrationOpen: false,
    status: tournament.status === 'recruiting' ? 'scheduling' : tournament.status,
    updatedAt: now()
  } });
  const invites = await all(C.invites, { eventId: tournament.eventId, status: 'active' });
  for (const invite of invites) await db.collection(C.invites).doc(invite._id).update({ data: { status: 'closed', updatedAt: now() } });
  return { ok: true };
}

async function deleteTournament(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const matches = await all(C.matches, { eventId: tournament.eventId });
  if (matches.some((match) => match.status === 'live')) {
    throw new Error('赛事有正在进行的比赛，请先结束当前比赛再删除赛事');
  }
  const [teams, invites, tasks] = await Promise.all([
    all(C.teams, { eventId: tournament.eventId }),
    all(C.invites, { eventId: tournament.eventId }),
    all(C.tasks, { eventId: tournament.eventId })
  ]);
  for (const item of matches) await db.collection(C.matches).doc(item._id).remove();
  for (const item of teams) await db.collection(C.teams).doc(item._id).remove();
  for (const item of invites) await db.collection(C.invites).doc(item._id).remove();
  for (const item of tasks) await db.collection(C.tasks).doc(item._id).remove();
  await db.collection(C.tournaments).doc(tournament._id).remove();
  return { ok: true, eventId: tournament.eventId };
}

async function removeTeam(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const team = await first(C.teams, { eventId: tournament.eventId, teamId: text(event.teamId, 100) });
  if (!team || team.status === 'withdrawn') throw new Error('参赛球队不存在或已经移除');
  if (team.source === 'creator' || team.ownerOpenid === tournament.creatorOpenid) throw new Error('创建者自己的参赛队不能在这里移除');
  const removeReason = text(event.reason, 120);
  if (!removeReason) throw new Error('请填写移除球队的原因');
  const matches = await all(C.matches, { eventId: tournament.eventId });
  const belongsToTeam = (match) => match.homeTeamId === team.teamId || match.awayTeamId === team.teamId;
  if (matches.some((match) => match.status === 'live')) throw new Error('赛事有正在进行的比赛，请结束当前比赛后再办理退赛');
  const hasCompleted = matches.some((match) => match.status === 'completed');
  const scheduleReset = !hasCompleted && matches.length > 0;
  if (scheduleReset) {
    for (const match of matches) await db.collection(C.matches).doc(match._id).remove();
  } else if (hasCompleted) {
    for (const match of matches.filter((item) => item.status === 'waiting' && belongsToTeam(item))) {
      await db.collection(C.matches).doc(match._id).remove();
    }
  }
  await db.collection(C.teams).doc(team._id).update({ data: {
    status: 'withdrawn', removeReason, removedBy: openid, removedAt: now(), updatedAt: now()
  } });
  const tasks = await all(C.tasks, { eventId: tournament.eventId, teamId: team.teamId });
  for (const task of tasks) {
    if (task.status !== 'pending') continue;
    await db.collection(C.tasks).doc(task._id).update({ data: {
      status: 'completed', unread: false, resolution: 'team_removed', resolvedAt: now(), updatedAt: now()
    } });
  }
  if (scheduleReset) {
    await db.collection(C.tournaments).doc(tournament._id).update({ data: {
      status: tournament.registrationOpen ? 'recruiting' : 'scheduling',
      totalMatches: 0, completedMatches: 0, currentRound: 0, updatedAt: now()
    } });
  } else if (hasCompleted) {
    const remainingMatches = matches.filter((match) => !(match.status === 'waiting' && belongsToTeam(match)));
    const completedMatches = remainingMatches.filter((match) => match.status === 'completed').length;
    const unfinishedMatches = remainingMatches.some((match) => match.status !== 'completed');
    await db.collection(C.tournaments).doc(tournament._id).update({ data: {
      status: unfinishedMatches || tournament.registrationOpen ? 'active' : 'completed',
      totalMatches: remainingMatches.length, completedMatches, updatedAt: now()
    } });
  }
  const withdrawnTeam = { ...team, status: 'withdrawn', removeReason };
  await upsertRegistrationStatusTask(tournament, withdrawnTeam, 'withdrawn', true, `你已被移出赛事：${removeReason}`);
  const noticePayload = {
    eventId: tournament.eventId, tournamentName: tournament.name, teamName: competitionTeam(tournament, team).name,
    status: 'withdrawn', note: `已移出赛事：${removeReason}`, reviewerName: '赛事创建者',
    reviewedAtText: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };
  await recordTournamentNotice('review', team.ownerOpenid, noticePayload, sendMiniTournamentNotice).catch((error) => console.warn('[tournament] remove notification failed', error.message));
  await queueServiceTournamentNotice('review', team.ownerOpenid, noticePayload).catch((error) => console.warn('[tournament] service remove notification failed', error.message));
  return { ok: true, teamId: team.teamId, scheduleReset, preservedResults: hasCompleted };
}

async function clearWithdrawnTeam(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const team = await first(C.teams, { eventId: tournament.eventId, teamId: text(event.teamId, 100) });
  if (!team) throw new Error('退赛球队不存在');
  if (team.status !== 'withdrawn') throw new Error('只有已移出或已退赛球队可以删除');
  await db.collection(C.teams).doc(team._id).update({ data: {
    hiddenFromManagement: true, hiddenBy: openid, hiddenAt: now(), updatedAt: now()
  } });
  return { ok: true, teamId: team.teamId };
}

async function previewSchedule(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const teams = await all(C.teams, { eventId: tournament.eventId, status: 'approved' });
  if (teams.length < 2) throw new Error('至少需要 2 支审核通过的球队');
  const format = competitionFormat(event.competitionFormat || tournament.competitionFormat);
  const groupCount = integer(event.groupCount, tournament.groupCount || 2, 2, 16);
  const advanceCount = integer(event.advanceCount, tournament.advanceCount || 2, 1, 8);
  if (format === 'group_knockout') {
    const smallestGroupSize = Math.floor(teams.length / groupCount);
    const qualifierCount = groupCount * advanceCount;
    if (smallestGroupSize < 2) throw new Error('每组至少需要 2 支球队，请减少分组数');
    if (advanceCount > smallestGroupSize) throw new Error('每组晋级数不能超过该组球队数');
    if ((qualifierCount & (qualifierCount - 1)) !== 0) throw new Error('晋级球队总数需为 2、4、8 或 16，才能生成完整淘汰赛');
  }
  const matches = buildSchedule(teams.map((team) => competitionTeam(tournament, team)), format, { groupCount });
  if (matches.length > 500) throw new Error('当前赛制将生成超过 500 场比赛，请增加分组或减少参赛队');
  return { ok: true, format, groupCount, matchCount: matches.length, matches };
}

async function resetPublishedMatches(eventId) {
  const matches = await all(C.matches, { eventId });
  let relatedRecords = 0;
  for (const match of matches) {
    const matchId = text(match.matchId, 100);
    if (matchId) {
      for (const name of Object.values(MATCH_RESET_COLLECTIONS).filter((item) => item !== MATCH_RESET_COLLECTIONS.matchResults)) {
        relatedRecords += await removeWhere(name, { matchId });
      }
      relatedRecords += await removeWhere(MATCH_RESET_COLLECTIONS.matchResults, { gameId: matchId });
      relatedRecords += await removeWhere(MATCH_RESET_COLLECTIONS.matchResults, { recordId: matchId });
      relatedRecords += await removeWhere(C.tasks, { eventId, matchId });
    }
    await db.collection(C.matches).doc(match._id).remove();
  }
  return { matchCount: matches.length, relatedRecords };
}

async function publishSchedule(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const teams = await all(C.teams, { eventId: tournament.eventId, status: 'approved' });
  if (teams.length < 2) throw new Error('至少需要 2 支审核通过的球队');
  const format = competitionFormat(event.competitionFormat || tournament.competitionFormat);
  const groupCount = integer(event.groupCount, tournament.groupCount || 2, 2, 16);
  const advanceCount = integer(event.advanceCount, tournament.advanceCount || 2, 1, 8);
  if (format === 'group_knockout') {
    const smallestGroupSize = Math.floor(teams.length / groupCount);
    const qualifierCount = groupCount * advanceCount;
    if (smallestGroupSize < 2) throw new Error('每组至少需要 2 支球队，请减少分组数');
    if (advanceCount > smallestGroupSize) throw new Error('每组晋级数不能超过该组球队数');
    if ((qualifierCount & (qualifierCount - 1)) !== 0) throw new Error('晋级球队总数需为 2、4、8 或 16，才能生成完整淘汰赛');
  }
  const schedule = buildSchedule(teams.map((team) => competitionTeam(tournament, team)), format, { groupCount });
  if (schedule.length > 500) throw new Error('当前赛制将生成超过 500 场比赛，请增加分组或减少参赛队');
  const reset = await resetPublishedMatches(tournament.eventId);
  if (format === 'group_knockout') {
    for (let index = 0; index < teams.length; index += 1) {
      const groupKey = String.fromCharCode(65 + (index % groupCount));
      await db.collection(C.teams).doc(teams[index]._id).update({ data: { groupKey, updatedAt: now() } });
      teams[index].groupKey = groupKey;
    }
  } else {
    for (const team of teams) {
      if (!team.groupKey) continue;
      await db.collection(C.teams).doc(team._id).update({ data: { groupKey: '', updatedAt: now() } });
      team.groupKey = '';
    }
  }
  for (let index = 0; index < schedule.length; index += 1) {
    await db.collection(C.matches).add({ data: {
      matchId: id('match'), eventId: tournament.eventId,
      orderNo: index + 1, status: 'waiting',
      ...schedule[index], createdAt: now(), updatedAt: now()
    } });
  }
  const patch = {
    competitionFormat: format, groupCount, advanceCount,
    status: 'active', registrationOpen: false,
    totalMatches: schedule.length, currentRound: schedule.length ? 1 : 0, updatedAt: now()
  };
  await db.collection(C.tournaments).doc(tournament._id).update({ data: patch });
  return {
    ok: true,
    matchCount: schedule.length,
    resetMatchCount: reset.matchCount,
    resetRelatedRecords: reset.relatedRecords,
    tournament: publicTournament({ ...tournament, ...patch })
  };
}

async function swapHome(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const match = await first(C.matches, { eventId: tournament.eventId, matchId: text(event.matchId, 100) });
  if (!match) throw new Error('比赛不存在');
  if (match.status !== 'waiting') throw new Error('比赛开始后不能交换主客场');
  const patch = {
    homeTeamId: match.awayTeamId, homeTeamName: match.awayTeamName,
    awayTeamId: match.homeTeamId, awayTeamName: match.homeTeamName,
    updatedAt: now()
  };
  await db.collection(C.matches).doc(match._id).update({ data: patch });
  return { ok: true };
}

async function syncResult(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  const match = await first(C.matches, { eventId: tournament.eventId, matchId: text(event.matchId, 100) });
  if (!match) throw new Error('比赛不存在');
  const homeScore = integer(event.homeScore, 0, 0, 999);
  const awayScore = integer(event.awayScore, 0, 0, 999);
  if (homeScore === awayScore) throw new Error('篮球比赛需要产生胜负，请先完成加时赛');
  const patch = { homeScore, awayScore, status: 'completed', completedAt: now(), updatedAt: now() };
  await db.collection(C.matches).doc(match._id).update({ data: patch });
  const matches = await all(C.matches, { eventId: tournament.eventId });
  const completedMatches = matches.filter((item) => item.status === 'completed' || item.matchId === match.matchId).length;
  const allLeagueMatchesDone = tournament.competitionFormat !== 'group_knockout' && completedMatches === matches.length;
  await db.collection(C.tournaments).doc(tournament._id).update({ data: {
    completedMatches,
    status: allLeagueMatchesDone ? 'completed' : tournament.status,
    updatedAt: now()
  } });
  return { ok: true };
}

async function advanceKnockout(event, openid) {
  const tournament = await requireTournament(event.eventId);
  requireCreator(tournament, openid);
  if (tournament.competitionFormat !== 'group_knockout') throw new Error('当前赛事不是小组淘汰赛');
  const [rawTeams, matches] = await Promise.all([
    all(C.teams, { eventId: tournament.eventId, status: 'approved' }),
    all(C.matches, { eventId: tournament.eventId })
  ]);
  const teams = rawTeams.map((team) => competitionTeam(tournament, team));
  const knockout = matches.filter((match) => match.stage === 'knockout');
  let qualified;
  let knockoutRound = 1;
  if (!knockout.length) {
    const groupMatches = matches.filter((match) => match.stage === 'group');
    if (groupMatches.some((match) => match.status !== 'completed')) throw new Error('请先完成全部小组赛');
    const groupKeys = [...new Set(teams.map((team) => team.groupKey).filter(Boolean))].sort();
    qualified = [];
    groupKeys.forEach((groupKey) => {
      const groupTeams = teams.filter((team) => team.groupKey === groupKey);
      const standings = calculateStandings(groupTeams, groupMatches.filter((match) => match.groupKey === groupKey), tournament.pointsRule);
      qualified.push(...standings.slice(0, tournament.advanceCount || 2).map((row) => teams.find((team) => team.teamId === row.teamId)));
    });
  } else {
    knockoutRound = Math.max(...knockout.map((match) => Number(match.knockoutRound || 1)));
    const current = knockout.filter((match) => Number(match.knockoutRound || 1) === knockoutRound);
    if (current.some((match) => match.status !== 'completed')) throw new Error('请先完成当前淘汰轮次');
    qualified = current.map((match) => teams.find((team) => team.teamId === (Number(match.homeScore) > Number(match.awayScore) ? match.homeTeamId : match.awayTeamId))).filter(Boolean);
    knockoutRound += 1;
  }
  if (qualified.length <= 1) {
    await db.collection(C.tournaments).doc(tournament._id).update({ data: { status: 'completed', completedAt: now(), updatedAt: now() } });
    return { ok: true, completed: true, champion: qualified[0] ? publicTeam(qualified[0], tournament) : null };
  }
  if (qualified.length % 2 === 1) throw new Error('晋级球队数量必须为偶数，请调整晋级名额');
  const startOrder = matches.length + 1;
  const created = [];
  for (let index = 0; index < qualified.length / 2; index += 1) {
    const home = qualified[index];
    const away = qualified[qualified.length - 1 - index];
    const record = {
      matchId: id('match'), eventId: tournament.eventId,
      orderNo: startOrder + index, status: 'waiting', stage: 'knockout', knockoutRound,
      roundNo: knockoutRound, groupKey: '',
      homeTeamId: home.teamId, homeTeamName: home.name,
      awayTeamId: away.teamId, awayTeamName: away.name,
      createdAt: now(), updatedAt: now()
    };
    await db.collection(C.matches).add({ data: record });
    created.push(record);
  }
  await db.collection(C.tournaments).doc(tournament._id).update({ data: { totalMatches: matches.length + created.length, updatedAt: now() } });
  return { ok: true, completed: false, knockoutRound, matches: created };
}

async function migrateLegacy(event, openid) {
  const legacy = Array.isArray(event.tournaments) ? event.tournaments.slice(0, 50) : [];
  let imported = 0;
  for (const item of legacy) {
    const legacyId = text(item && item.id, 100);
    if (!legacyId) continue;
    const migrationKey = `${openid}:${legacyId}`;
    if (await first(C.migrations, { migrationKey })) continue;
    const eventId = id('event');
    const legacyStatus = item.status === 'ended' ? 'completed'
      : (item.status === 'draft' ? 'draft' : (item.status === 'running' ? 'active' : 'recruiting'));
    const legacyGames = Array.isArray(item.legacyGames) ? item.legacyGames.slice(0, 500) : [];
    const legacyTeams = Array.isArray(item.legacyTeams) ? item.legacyTeams.slice(0, 64) : [];
    const namesFromGames = [];
    legacyGames.forEach((game) => {
      [game.homeTeamName, game.homeName, game.awayTeamName, game.awayName].forEach((name) => {
        const cleanName = text(name, 100);
        if (cleanName && !namesFromGames.includes(cleanName)) namesFromGames.push(cleanName);
      });
    });
    namesFromGames.forEach((name) => {
      if (!legacyTeams.some((team) => text(team.name || team.label, 100) === name)) legacyTeams.push({ name, players: [] });
    });
    const tournament = {
      eventId, creatorOpenid: openid, legacyId,
      name: text(item.name, 100) || '未命名旧赛事',
      scenarioType: 'other', competitionFormat: 'single_round_robin',
      status: legacyStatus,
      description: '由旧版小程序本机赛事迁移', organizationName: '',
      pointsRule: normalizePoints(), groupCount: 2, advanceCount: 2,
      registrationOpen: !['completed', 'active'].includes(legacyStatus), currentRound: 0,
      completedMatches: legacyGames.filter((game) => ['completed', 'finished', 'ended'].includes(game.status) || game.ended === true).length,
      totalMatches: legacyGames.length || Number(item.games || 0),
      createdAt: now(), updatedAt: now()
    };
    await db.collection(C.tournaments).add({ data: tournament });
    const importedTeams = [];
    for (const sourceTeam of legacyTeams) {
      try {
        const importedTeam = await addTeamSnapshot(tournament, openid, sourceTeam, 'approved', 'legacy_migration');
        importedTeams.push(importedTeam);
      } catch (error) {
        if (!/已经报名/.test(error.message || '')) throw error;
      }
    }
    function resolveTeam(game, side) {
      const sourceId = text(game[`${side}TeamId`] || game[`${side}TeamKey`], 100);
      const name = text(game[`${side}TeamName`] || game[`${side}Name`], 100);
      return importedTeams.find((team) => (sourceId && team.sourceTeamId === sourceId) || (name && team.name === name)) || null;
    }
    for (let index = 0; index < legacyGames.length; index += 1) {
      const game = legacyGames[index];
      const home = resolveTeam(game, 'home');
      const away = resolveTeam(game, 'away');
      if (!home || !away || home.teamId === away.teamId) continue;
      const completed = ['completed', 'finished', 'ended'].includes(game.status) || game.ended === true;
      const matchRecord = {
        matchId: id('match'), eventId, legacyGameId: text(game.id, 100), orderNo: index + 1,
        status: completed ? 'completed' : 'waiting', stage: 'league', groupKey: '', roundNo: Number(game.roundNo || index + 1),
        homeTeamId: home.teamId, homeTeamName: home.name, awayTeamId: away.teamId, awayTeamName: away.name,
        createdAt: now(), updatedAt: now()
      };
      if (completed) {
        matchRecord.homeScore = Number(game.homeScore || 0);
        matchRecord.awayScore = Number(game.awayScore || 0);
      }
      await db.collection(C.matches).add({ data: matchRecord });
    }
    await db.collection(C.migrations).add({ data: { migrationKey, eventId, legacyId, createdAt: now() } });
    imported += 1;
  }
  return { ok: true, imported };
}

const handlers = {
  create: createTournament,
  update: updateTournament,
  listMine: (_, openid) => listMine(openid),
  listTasks: (_, openid) => listTasks(openid),
  markTaskRead,
  get: getTournament,
  createInvite,
  getInvitation: (event) => getInvitation(event),
  getMyRegistration,
  submitTeam,
  reviewTeam,
  closeRegistration,
  delete: deleteTournament,
  removeTeam,
  clearWithdrawnTeam,
  previewSchedule,
  publishSchedule,
  swapHome,
  syncResult,
  advanceKnockout,
  migrateLegacy
};

exports.main = async (event = {}) => {
  try {
    await ensureCollections();
    const action = text(event.action, 50);
    const handler = handlers[action];
    if (!handler) throw new Error('不支持的赛事操作');
    const openid = action === 'getInvitation' ? '' : requireOpenId();
    return await handler(event, openid);
  } catch (error) {
    console.error('[sxTournamentLeague]', event && event.action, error);
    return { ok: false, message: error && error.message ? error.message : '赛事服务暂不可用' };
  }
};
