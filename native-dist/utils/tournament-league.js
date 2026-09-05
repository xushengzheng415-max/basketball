const { callCloud } = require('./cloud');
const { scheduleRosterPush } = require('./roster-sync');
const { belongsToTeam } = require('./player-team-membership');

const SCHOOL_STAGES = [
  { key: 'primary', label: '小学' },
  { key: 'junior', label: '初中' },
  { key: 'senior', label: '高中' }
];

const GRADE_OPTIONS = {
  primary: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'].map((label, index) => ({ key: `P${index + 1}`, label })),
  junior: ['初一', '初二', '初三'].map((label, index) => ({ key: `J${index + 1}`, label })),
  senior: ['高一', '高二', '高三'].map((label, index) => ({ key: `S${index + 1}`, label }))
};

const CLASS_OPTIONS = Array.from({ length: 10 }, (_, index) => ({ key: String(index + 1), label: `${index + 1}班` }))
  .concat([{ key: 'custom', label: '自定义班级' }]);
const LOCAL_TOURNAMENT_KEY = 'sxfTournamentLeagueLocalV1';

const SCENARIO_META = {
  class_league: { label: '班班赛', shortLabel: '学校班赛', className: 'class-league' },
  institution_weekly: { label: '机构周赛', shortLabel: '机构联赛', className: 'weekly-league' },
  other: { label: '其他赛事', shortLabel: '通用赛事', className: 'other-event' }
};

const FORMAT_META = {
  single_round_robin: { label: '单循环联赛', shortLabel: '单循环' },
  double_round_robin: { label: '主客双循环', shortLabel: '双循环' },
  group_knockout: { label: '小组循环 + 淘汰赛', shortLabel: '小组淘汰' }
};

const STATUS_META = {
  draft: { label: '草稿', className: 'draft' },
  recruiting: { label: '招募中', className: 'recruiting' },
  scheduling: { label: '待编排', className: 'scheduling' },
  active: { label: '进行中', className: 'active' },
  completed: { label: '已结束', className: 'completed' }
};

function callTournament(action, data) {
  return callCloud('sxTournamentLeague', Object.assign({}, data || {}, { action })).then((result) => {
    if (!result || result.ok !== true) {
      const error = new Error(result && result.message ? result.message : '赛事服务暂不可用');
      error.result = result;
      throw error;
    }
    return result;
  });
}

function isCloudUnavailable(error) {
  const result = error && error.result;
  return !!(result && result.error) || /云函数|cloud|function not found|服务暂不可用/i.test(String(error && error.message || ''));
}

function readLocalTournamentRecords() {
  return list(wx.getStorageSync(LOCAL_TOURNAMENT_KEY));
}

function writeLocalTournamentRecords(records) {
  wx.setStorageSync(LOCAL_TOURNAMENT_KEY, list(records));
}

function saveLocalTournament(createPayload) {
  const timestamp = Date.now();
  const eventId = `local-event-${timestamp}`;
  const tournament = Object.assign({}, createPayload.tournament || {}, {
    eventId, localOnly: true, role: 'creator', createdAt: timestamp, updatedAt: timestamp,
    registrationOpen: createPayload.tournament && createPayload.tournament.status !== 'draft',
    currentRound: 0, completedMatches: 0, totalMatches: 0,
    teamCount: createPayload.creatorTeam ? 1 : 0, pendingTeamCount: 0
  });
  const creatorTeam = createPayload.creatorTeam ? Object.assign({}, createPayload.creatorTeam, {
    teamId: `local-team-${timestamp}`, eventId, status: 'approved', source: 'creator'
  }) : null;
  const record = { eventId, tournament, creatorTeam, createPayload, savedAt: timestamp };
  writeLocalTournamentRecords([record].concat(readLocalTournamentRecords().filter((item) => item.eventId !== eventId)));
  return { ok: true, localOnly: true, tournament, creatorTeam };
}

function listLocalCreatedTournaments() {
  return readLocalTournamentRecords().map((record) => Object.assign({}, record.tournament, {
    role: 'creator', localOnly: true,
    teamCount: record.creatorTeam ? 1 : Number(record.tournament.teamCount || 0),
    pendingTeamCount: 0
  }));
}

function getLocalTournamentResult(eventId) {
  const record = readLocalTournamentRecords().find((item) => String(item.eventId) === String(eventId));
  if (!record) return null;
  const teams = record.creatorTeam ? [record.creatorTeam] : [];
  return {
    ok: true, localOnly: true, tournament: Object.assign({}, record.tournament, { localOnly: true }),
    role: 'creator', myTeamId: record.creatorTeam ? record.creatorTeam.teamId : '',
    teams, matches: [], standings: [], standingSections: [{ groupKey: '', label: '联赛积分榜', rows: [] }]
  };
}

function updateLocalTournament(eventId, patch, creatorTeam) {
  const records = readLocalTournamentRecords();
  const record = records.find((item) => String(item.eventId) === String(eventId));
  if (!record) throw new Error('未找到本机赛事');
  const updatedAt = Date.now();
  const nextTournament = Object.assign({}, record.tournament, patch || {}, {
    eventId: record.eventId,
    localOnly: true,
    updatedAt
  });
  const nextCreatorTeam = creatorTeam ? Object.assign({}, creatorTeam, {
    teamId: record.creatorTeam ? record.creatorTeam.teamId : `local-team-${updatedAt}`,
    eventId: record.eventId,
    status: 'approved',
    source: 'creator'
  }) : record.creatorTeam;
  const nextPayload = {
    tournament: Object.assign({}, record.createPayload && record.createPayload.tournament, patch || {}),
    creatorTeam: nextCreatorTeam
  };
  const nextRecord = Object.assign({}, record, {
    tournament: nextTournament,
    creatorTeam: nextCreatorTeam,
    createPayload: nextPayload,
    savedAt: updatedAt
  });
  writeLocalTournamentRecords(records.map((item) => String(item.eventId) === String(eventId) ? nextRecord : item));
  return { ok: true, localOnly: true, tournament: nextTournament, creatorTeam: nextCreatorTeam };
}

function removeLocalTournament(eventId) {
  const records = readLocalTournamentRecords();
  const next = records.filter((item) => String(item.eventId) !== String(eventId));
  if (next.length === records.length) throw new Error('未找到本机赛事');
  writeLocalTournamentRecords(next);
  return { ok: true, localOnly: true, eventId };
}

async function syncLocalTournaments() {
  const records = readLocalTournamentRecords();
  if (!records.length) return { synced: 0, pending: 0 };
  let synced = 0;
  for (const record of records) {
    try {
      await syncLocalTournament(record.eventId);
      synced += 1;
    } catch (error) {}
  }
  return { synced, pending: readLocalTournamentRecords().length };
}

async function syncLocalTournament(eventId) {
  const record = readLocalTournamentRecords().find((item) => String(item.eventId) === String(eventId));
  if (!record) throw new Error('未找到待同步赛事');
  const result = await callTournament('create', record.createPayload);
  writeLocalTournamentRecords(readLocalTournamentRecords().filter((item) => String(item.eventId) !== String(eventId)));
  return result;
}

function getLoginProfile() {
  return wx.getStorageSync('loginProfile') || wx.getStorageSync('userProfile') || null;
}

function hasPhoneLogin() {
  const profile = getLoginProfile();
  return !!(profile && profile.loggedIn && profile.mode !== 'guest' && profile.phoneNumber);
}

function requirePhoneLogin(redirectPath, message) {
  if (hasPhoneLogin()) return true;
  wx.showModal({
    title: '登录后使用赛事',
    content: message || '登录后才能创建、报名和同步赛事。',
    confirmText: '去登录',
    cancelText: '取消',
    confirmColor: '#ff6a00',
    success(result) {
      if (!result.confirm) return;
      const redirect = redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : '';
      wx.navigateTo({ url: `/pages/login/index${redirect}` });
    }
  });
  return false;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function readTeams() {
  const sources = list(wx.getStorageSync('teams')).concat(list(wx.getStorageSync('teamDrafts')));
  const unique = new Map();
  sources.forEach((team, index) => {
    if (!team || team.status === 'draft' || team.enabled === false) return;
    const name = String(team.name || team.label || team.teamName || '').trim();
    if (!name) return;
    const sourceTeamId = String(team.id || team.key || `team-${index}`);
    unique.set(sourceTeamId, {
      sourceTeamId,
      name,
      label: name,
      logo: team.logoFileID || team.logoUrl || team.logo || '',
      coachName: team.coachName || '',
      phone: team.phone || '',
      teamType: team.teamType || 'standard',
      classIdentityKey: team.classIdentityKey || '',
      schoolName: team.schoolName || '',
      schoolStage: team.schoolStage || '',
      gradeCode: team.gradeCode || '',
      gradeName: team.gradeName || '',
      classCode: team.classCode || '',
      className: team.className || '',
      classDisplayName: team.classDisplayName || ''
    });
  });
  return Array.from(unique.values());
}

function buildClassIdentity(identity) {
  const schoolName = String(identity && identity.schoolName || '').trim();
  const schoolStage = String(identity && identity.schoolStage || '').trim();
  const gradeCode = String(identity && identity.gradeCode || '').trim();
  const gradeName = String(identity && identity.gradeName || '').trim();
  const classCode = String(identity && identity.classCode || '').trim();
  const className = String(identity && identity.className || '').trim();
  const normalizedClassCode = classCode === 'custom' ? `custom:${className.toLowerCase().replace(/\s+/g, '')}` : classCode;
  const classIdentityKey = [schoolName.toLowerCase().replace(/\s+/g, ''), schoolStage, gradeCode, normalizedClassCode].join('|');
  return {
    schoolName, schoolStage, gradeCode, gradeName, classCode, className,
    classDisplayName: `${gradeName}${className}`,
    classIdentityKey
  };
}

function classIdentityError(identity) {
  const source = identity || {};
  if (!String(source.schoolName || '').trim()) return '请填写学校名称';
  if (!String(source.schoolStage || '').trim()) return '请选择学段';
  if (!String(source.gradeCode || '').trim()) return '请选择比赛年级';
  if (!String(source.classCode || '').trim()) return '请选择本班班级';
  if (!String(source.className || '').trim()) {
    return String(source.classCode) === 'custom' ? '请填写自定义班级' : '请选择本班班级';
  }
  return '';
}

function findClassTeam(teams, identity) {
  const normalized = buildClassIdentity(identity);
  return (teams || readTeams()).find((team) => team.classIdentityKey && team.classIdentityKey === normalized.classIdentityKey) || null;
}

function ensureClassTeamBinding(identity, preferredTeam) {
  const normalized = buildClassIdentity(identity);
  if (!normalized.schoolName || !normalized.schoolStage || !normalized.gradeCode || !normalized.className) {
    throw new Error('班级身份信息不完整');
  }
  const stored = list(wx.getStorageSync('teams'));
  const existingByIdentity = stored.find((team) => team && team.classIdentityKey === normalized.classIdentityKey);
  const preferredId = preferredTeam && String(preferredTeam.sourceTeamId || preferredTeam.id || preferredTeam.key || '');
  const existingBySelection = preferredId ? stored.find((team) => team && String(team.id || team.key || '') === preferredId) : null;
  const existing = existingByIdentity || existingBySelection || null;
  const timestamp = Date.now();
  const classFields = Object.assign({}, normalized, { teamType: 'class', updatedAt: timestamp });
  let boundTeam;
  if (existing) {
    boundTeam = Object.assign({}, existing, classFields, {
      classDisplayName: normalized.classDisplayName,
      name: existing.name || existing.label || normalized.classDisplayName,
      label: existing.label || existing.name || normalized.classDisplayName
    });
  } else {
    const id = `class-team-${timestamp}`;
    boundTeam = Object.assign({
      id, key: id, name: normalized.classDisplayName, label: normalized.classDisplayName,
      logoUrl: '', logoFileID: '', coachName: '', phone: '', enabled: true, status: 'active', common: true,
      playerCount: 0, createdAt: timestamp
    }, classFields);
  }
  const next = existing
    ? stored.map((team) => team === existing ? boundTeam : team)
    : [boundTeam].concat(stored);
  wx.setStorageSync('teams', next);
  scheduleRosterPush(0);
  const mapped = readTeams().find((team) => team.sourceTeamId === String(boundTeam.id || boundTeam.key));
  const snapshot = withTeamPlayers(mapped || Object.assign({ sourceTeamId: boundTeam.id || boundTeam.key }, boundTeam));
  return Object.assign({}, snapshot, normalized, {
    boundTeamName: snapshot.name !== normalized.classDisplayName ? snapshot.name : '',
    name: normalized.classDisplayName,
    label: normalized.classDisplayName,
    teamType: 'class'
  });
}

function playersForTeam(team) {
  if (!team) return [];
  return list(wx.getStorageSync('players')).filter((player) => belongsToTeam(player, team)).map((player) => ({
    playerId: String(player.id || ''),
    name: player.name || '未命名球员',
    number: player.number || '',
    avatar: player.avatar || '',
    position: player.position || ''
  }));
}

function withTeamPlayers(team) {
  return Object.assign({}, team || {}, { players: playersForTeam(team) });
}

function decorateTournament(item) {
  const scenario = SCENARIO_META[item.scenarioType] || SCENARIO_META.other;
  const format = FORMAT_META[item.competitionFormat] || FORMAT_META.single_round_robin;
  const status = STATUS_META[item.status] || STATUS_META.draft;
  const completedMatches = Number(item.completedMatches || 0);
  const totalMatches = Number(item.totalMatches || 0);
  const isParticipant = item.role === 'participant';
  const registrationStatus = item.myRegistrationStatus || '';
  const participantStatusText = registrationStatus === 'pending'
    ? '我的报名等待创建者审核'
    : registrationStatus === 'rejected'
      ? '我的报名已被驳回，可修改后重新提交'
      : registrationStatus === 'approved'
        ? '我的球队已通过审核'
        : '';
  return Object.assign({}, item, {
    scenarioLabel: scenario.label,
    scenarioClass: scenario.className,
    formatLabel: format.shortLabel,
    statusLabel: status.label,
    statusClass: status.className,
    roleLabel: item.role === 'creator' ? '我创建的' : '我参加的',
    progressText: totalMatches ? `${completedMatches}/${totalMatches} 场` : '尚未编排',
    teamCountText: `${Number(item.teamCount || 0)} 支球队`,
    currentRoundText: Number(item.currentRound || 0) ? `第 ${item.currentRound} 轮` : '等待编排',
    syncLabel: item.localOnly ? '待云端同步' : '',
    pendingTipText: isParticipant ? participantStatusText : (Number(item.pendingTeamCount || 0) ? `有 ${item.pendingTeamCount} 支球队等待审核` : ''),
    showPendingTip: !!(isParticipant ? participantStatusText : Number(item.pendingTeamCount || 0))
  });
}

module.exports = {
  CLASS_OPTIONS,
  FORMAT_META,
  GRADE_OPTIONS,
  SCENARIO_META,
  SCHOOL_STAGES,
  STATUS_META,
  buildClassIdentity,
  classIdentityError,
  callTournament,
  decorateTournament,
  ensureClassTeamBinding,
  findClassTeam,
  getLocalTournamentResult,
  getLoginProfile,
  hasPhoneLogin,
  isCloudUnavailable,
  listLocalCreatedTournaments,
  readTeams,
  removeLocalTournament,
  requirePhoneLogin,
  saveLocalTournament,
  syncLocalTournament,
  syncLocalTournaments,
  updateLocalTournament,
  withTeamPlayers
};
