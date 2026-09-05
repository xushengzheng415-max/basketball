const mainRoutes = {
  home: '/pages/home/index',
  tournament: '/pages/tournament/index',
  team: '/pages/team/index',
  education: '/pages/education/index',
  data: '/pages/data/index',
  mine: '/pages/mine/index'
};

const RECENT_MATCHES_KEY = 'sx_recent_matches';
const MATCH_TASK_CACHE_KEY = 'sx_match_tasks_cache';
const TEAM_LOGO_BASE = '/assets/pages/scorer-v2/teams/';
const STATUS_ICON_BASE = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/pages/recent-matches/';
const CLOUD_ASSET_ROOT = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/';
const TAB_PREFETCH_ASSETS = [
  CLOUD_ASSET_ROOT + 'pages/team/player-library-bg.png',
  CLOUD_ASSET_ROOT + 'pages/team/logo-and-title.png',
  CLOUD_ASSET_ROOT + 'pages/education/education-top-bg-clean.png',
  CLOUD_ASSET_ROOT + 'pages/mine-profile/profile-bg.png',
  CLOUD_ASSET_ROOT + 'pages/mine-profile/profile-avatar.png'
];
const { pullRosterIfStale, resolveImageUrl } = require('../../utils/roster-sync');
const { callCloud } = require('../../utils/cloud');
let tabAssetPrefetchStarted = false;

function prefetchTabAssets() {
  if (tabAssetPrefetchStarted || !wx.getImageInfo) return;
  tabAssetPrefetchStarted = true;
  let index = 0;
  const loadNext = () => {
    if (index >= TAB_PREFETCH_ASSETS.length) return;
    wx.getImageInfo({
      src: TAB_PREFETCH_ASSETS[index++],
      complete: () => setTimeout(loadNext, 80)
    });
  };
  setTimeout(loadNext, 600);
}

function hasPhoneLogin() {
  const profile = wx.getStorageSync('loginProfile') || wx.getStorageSync('userProfile') || null;
  return !!(profile && profile.loggedIn && profile.mode !== 'guest' && profile.phoneNumber);
}

function getLoginUrl(redirectPath) {
  const redirect = redirectPath ? '?redirect=' + encodeURIComponent(redirectPath) : '';
  return '/pages/login/index' + redirect;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function getLogoSource(item) {
  if (!item) return '';
  return resolveImageUrl(item.logoUrl, item.logoFileID, item.teamLogo, item.teamLogoFileID, item.logo);
}

function addTeamLogo(map, team) {
  const logo = resolveImageUrl(getLogoSource(team));
  if (!team || !logo) return;
  const identities = [team.id, team.key, team.label, team.name, team.teamName];
  identities.forEach((identity) => {
    const key = normalizeText(identity);
    if (key) map[key] = logo;
  });
}

function buildTeamLogoMap() {
  const map = {};
  ['teams', 'teamDrafts', 'teamCategories'].forEach((storageKey) => {
    const teams = wx.getStorageSync(storageKey);
    (Array.isArray(teams) ? teams : []).forEach((team) => addTeamLogo(map, team));
  });
  return map;
}

function getRecentTeamLogo(item, side, teamLogoMap) {
  const team = item && item[side + 'Team'];
  const directLogo = item && (item[side + 'Logo'] || item[side + 'LogoUrl'] || getLogoSource(team));
  const identities = item ? [
    item[side + 'TeamId'],
    item[side + 'TeamKey'],
    team && team.id,
    team && team.key,
    item[side + 'Name'],
    team && (team.label || team.name || team.teamName)
  ] : [];
  const storedLogo = identities.map((identity) => teamLogoMap[normalizeText(identity)]).find(Boolean);
  return resolveImageUrl(storedLogo, directLogo) || TEAM_LOGO_BASE + (side === 'home' ? 'team-logo-left.png' : 'team-logo-right.png');
}

function formatRecentMatchTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  const pad = (value) => String(value).padStart(2, '0');
  return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function getMatchTimestamp(item) {
  return Number(item && (item.updatedAt || item.endedAt || item.createdAt)) || 0;
}

function isFinishedMatch(item) {
  return !!(item && (item.ended === true || item.status === 'finished'));
}

function decorateRecentMatch(item, teamLogoMap) {
  const ended = isFinishedMatch(item);
  return Object.assign({}, item, {
    homeName: item.homeName || '\u4e3b\u961f',
    awayName: item.awayName || '\u5ba2\u961f',
    homeLogo: getRecentTeamLogo(item, 'home', teamLogoMap),
    awayLogo: getRecentTeamLogo(item, 'away', teamLogoMap),
    homeScore: Number(item.homeScore || 0),
    awayScore: Number(item.awayScore || 0),
    time: formatRecentMatchTime(getMatchTimestamp(item)),
    venue: item.matchName || '\u5feb\u6377\u6bd4\u8d5b',
    statusText: ended ? '\u5df2\u7ed3\u675f' : '\u672a\u7ed3\u675f',
    statusIcon: STATUS_ICON_BASE + (ended ? 'status-finished.png' : 'status-unfinished.png')
  });
}

function decorateMatchTask(task, index) {
  const roleLabels = {
    referee: '主裁判任务',
    home_coach: '主队教练任务',
    away_coach: '客队教练任务',
    team_manager: '球队负责人任务',
    home_team: '主队任务',
    away_team: '客队任务',
    assistant: '助教任务',
    organization_admin: '机构任务',
    data_admin: '数据管理员任务',
    organizer: '赛事执行任务'
  };
  const statusLabels = {
    pending: '待确认', accepted: '已接受', rejected: '已拒绝', invalid: '已失效'
  };
  const status = task.status || 'pending';
  const resolvedTeamScope = task.teamScope || (task.role === 'away_coach' || task.role === 'away_team' ? 'away' : (task.role === 'home_coach' || task.role === 'home_team' ? 'home' : ''));
  const secondOpened = task.secondConfirmationRequired === true || task.secondConfirmationOpened === true || task.scheduleChanged === true;
  const needsSecond = task.secondConfirmationStatus === 'needs_reconfirm' || (secondOpened && task.secondConfirmationStatus === 'pending');
  const isTeamTask = ['home_coach', 'away_coach', 'team_manager', 'home_team', 'away_team'].includes(task.role);
  let actionCode = 'view';
  let actionText = '查看任务';
  if (status === 'pending') { actionCode = 'accept'; actionText = '确认任务'; }
  else if (needsSecond && status === 'accepted') { actionCode = 'confirm_second'; actionText = '赛前确认'; }
  else if (task.role === 'referee' && task.onsiteOpened) { actionCode = 'referee_console'; actionText = '进入裁判台'; }
  else if (isTeamTask) { actionCode = 'team_roster'; actionText = task.rosterStatus === 'submitted' ? '查看本场名单' : '提交本场名单'; }
  else if (task.role === 'assistant' && task.onsiteOpened) { actionCode = 'assistant_work'; actionText = '进入我的任务'; }
  return Object.assign({}, task, {
    cardId: task.matchTaskId || ('task-' + index),
    roleText: roleLabels[task.role] || '比赛任务',
    statusText: task.scheduleChanged ? '赛程有变' : (needsSecond && status === 'accepted' ? '待赛前确认' : (statusLabels[status] || '待处理')),
    actionCode,
    actionText,
    isTeamTask,
    canReject: status === 'pending',
    teamScope: resolvedTeamScope,
    teamName: resolvedTeamScope === 'away' ? (task.awayTeamName || '客队') : (task.homeTeamName || '主队'),
    dateText: [task.matchDate, task.startTime].filter(Boolean).join(' '),
    matchText: [task.homeTeamName || '主队', task.awayTeamName || '客队'].join(' vs '),
    venueText: task.venue || '场地待确认',
    cardActionText: actionText
  });
}

function getTaskRosterPlayers(task, roster) {
  const allPlayers = wx.getStorageSync('players');
  const players = Array.isArray(allPlayers) ? allPlayers : [];
  const teamName = normalizeText(task && task.teamName);
  const scoped = players.filter((player) => normalizeText(player.team) === teamName || normalizeText(player.filter) === normalizeText(task && task.teamKey));
  const submitted = roster && Array.isArray(roster.players) ? roster.players : [];
  const submittedMap = {};
  submitted.forEach((player) => { submittedMap[String(player.playerId)] = player; });
  const output = scoped.map((player, index) => {
    const playerId = String(player.id || ('player-' + index));
    const saved = submittedMap[playerId];
    const selected = true;
    return {
      playerId,
      name: player.name || '未命名球员',
      number: String(player.number || '--'),
      selected,
      starter: !!(saved && saved.starter),
      rowClass: selected ? 'roster-player selected' : 'roster-player',
      starterClass: saved && saved.starter ? 'starter-button active' : 'starter-button'
    };
  });
  const existingIds = output.reduce((map, player) => { map[player.playerId] = true; return map; }, {});
  submitted.forEach((player, index) => {
    const playerId = String(player.playerId || ('submitted-' + index));
    if (existingIds[playerId]) return;
    output.push({
      playerId,
      name: player.name || '未命名球员',
      number: String(player.number || '--'),
      selected: true,
      starter: player.starter === true,
      rowClass: 'roster-player selected',
      starterClass: player.starter === true ? 'starter-button active' : 'starter-button'
    });
  });
  return output;
}

Page({
  data: {
    staticAssets: {
      brandLogo: CLOUD_ASSET_ROOT + 'home/brand-horizontal-logo.png',
      quickBackground: CLOUD_ASSET_ROOT + 'home/quick-match/home-hero-bg.png',
      statToday: CLOUD_ASSET_ROOT + 'home/quick-match/stat-today.png',
      statPending: CLOUD_ASSET_ROOT + 'home/quick-match/stat-pending.png',
      statFinished: CLOUD_ASSET_ROOT + 'home/quick-match/stat-finished.png'
    },
    showLoginGuide: true,
    currentRole: '校区管理员',
    todayStats: {
      total: 0,
      pending: 0,
      finished: 0
    },
    hasRecentMatches: false,
    recentMatches: [],
    taskLoading: false,
    taskError: '',
    hasMatchTasks: false,
    homeTask: null,
    homeTaskCount: 0,
    matchTasks: [],
    taskListEmpty: true,
    taskEmptyTitle: '登录查看比赛任务',
    taskEmptyNote: '裁判、球队和机构任务都在这里处理',
    taskEmptyAction: '去登录',
    hasTournamentTasks: false,
    tournamentTask: null,
    tournamentTasks: [],
    tournamentTaskCount: 0,
    tournamentTaskMoreCount: 0,
    showTaskCenter: false,
    showTaskDetail: false,
    selectedTask: null,
    taskActionBusy: false,
    taskContextLoading: false,
    taskRosterStatus: '未提交',
    taskAssistantStatus: '0/5',
    showRosterEditor: false,
    rosterPlayers: [],
    rosterPlayersEmpty: true,
    rosterSelectedCount: 0,
    rosterStarterCount: 0,
    rosterLocked: false,
    tabItems: [
      { key: 'home', text: '工作台', iconClass: 'home', icon: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/tabbar/tab-home-selected.png', activeClass: 'active' },
      { key: 'tournament', text: '赛事', iconClass: 'trophy', icon: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/tabbar/tab-tournament.png', activeClass: '' },
      { key: 'team', text: '球员', iconClass: 'user', icon: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/tabbar/tab-team.png', activeClass: '' },
      { key: 'education', text: '教务', iconClass: 'edu', icon: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/tabbar/tab-education.png', activeClass: '' },
      { key: 'data', text: '数据', iconClass: 'data', icon: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/tabbar/tab-data.png', activeClass: '' },
      { key: 'mine', text: '我的', iconClass: 'mine', icon: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/tabbar/tab-mine.png', activeClass: '' }
    ]
  },

  onShareAppMessage() {
    return {
      title: '赛小蜂篮球｜赛事、计分、教务一体化管理',
      path: '/pages/home/index',
      imageUrl: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/home/share-card-5x4-v2.png'
    };
  },

  onShareTimeline() {
    return {
      title: '赛小蜂篮球｜赛事、计分、教务一体化管理',
      imageUrl: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/home/share-logo-20260715.png'
    };
  },

  onShow() {
    this.refreshLoginState();
    this.loadRecentMatches();
    this.loadMatchTasks();
    this.loadTournamentTasks();
    prefetchTabAssets();
    const app = typeof getApp === 'function' ? getApp() : null;
    const rosterReady = app && app.globalData && app.globalData.rosterReady;
    Promise.resolve(rosterReady)
      .then((result) => result || pullRosterIfStale())
      .then(() => this.loadRecentMatches())
      .catch((error) => console.warn('[home] pull roster failed', error));
  },

  refreshLoginState() {
    const loggedIn = hasPhoneLogin();
    this.setData({
      showLoginGuide: !loggedIn,
      taskEmptyTitle: loggedIn ? '暂无比赛任务' : '登录查看比赛任务',
      taskEmptyNote: loggedIn ? '收到任务后，可直接在首页确认和操作' : '裁判、球队和机构任务都在这里处理',
      taskEmptyAction: loggedIn ? '查看任务' : '去登录'
    });
  },

  async loadMatchTasks() {
    if (!hasPhoneLogin()) {
      this.setData({ taskLoading: false, taskError: '', hasMatchTasks: false, homeTask: null, homeTaskCount: 0, matchTasks: [], taskListEmpty: true });
      return;
    }
    this.setData({ taskLoading: true, taskError: '' });
    const result = await callCloud('sxCollaboration', { domain: 'matchTask', action: 'listMine' });
    if (!result || result.ok !== true) {
      const cached = wx.getStorageSync(MATCH_TASK_CACHE_KEY);
      const cachedTasks = (Array.isArray(cached) ? cached : []).map(decorateMatchTask);
      if (cachedTasks[0]) cachedTasks[0].cardActionText = cachedTasks.length > 1 ? '查看全部任务' : cachedTasks[0].actionText;
      this.setData({
        taskLoading: false,
        taskError: cachedTasks.length ? '' : ((result && result.error) || '任务加载失败'),
        hasMatchTasks: cachedTasks.length > 0,
        homeTask: cachedTasks[0] || null,
        homeTaskCount: cachedTasks.length,
        matchTasks: cachedTasks,
        taskListEmpty: cachedTasks.length === 0
      });
      return;
    }
    const tasks = (result.tasks || []).filter((task) => task.status !== 'invalid').map(decorateMatchTask);
    if (tasks[0]) tasks[0].cardActionText = tasks.length > 1 ? '查看全部任务' : tasks[0].actionText;
    wx.setStorageSync(MATCH_TASK_CACHE_KEY, result.tasks || []);
    this.setData({ taskLoading: false, taskError: '', hasMatchTasks: tasks.length > 0, homeTask: tasks[0] || null, homeTaskCount: tasks.length, matchTasks: tasks, taskListEmpty: tasks.length === 0 });
  },

  async loadTournamentTasks() {
    if (!hasPhoneLogin()) {
      this.setData({ hasTournamentTasks: false, tournamentTask: null, tournamentTasks: [], tournamentTaskCount: 0, tournamentTaskMoreCount: 0 });
      return;
    }
    const result = await callCloud('sxTournamentLeague', { action: 'listTasks' });
    const tasks = result && result.ok && Array.isArray(result.tasks) ? result.tasks : [];
    const unreadCount = result && result.ok ? Number(result.unreadCount || 0) : 0;
    const first = tasks[0] || null;
    const visibleTasks = tasks.slice(0, 3).map((task) => {
      const matchReady = task.type === 'match_coach_ready';
      const refereeReady = task.type === 'match_referee_accept';
      const assistantInvite = task.type === 'match_assistant_invite';
      const assistantActive = task.type === 'match_assistant';
      const refereeAccepted = refereeReady && task.refereeStatus === 'accepted';
      const refereeLive = refereeReady && (task.preparationState === 'live' || task.matchState === 'live');
      const participant = task.type === 'registration_status';
      const approved = task.registrationStatus === 'approved';
      const rejected = task.registrationStatus === 'rejected';
      const withdrawn = task.registrationStatus === 'withdrawn';
      return Object.assign({}, task, {
        taskTitle: assistantInvite ? '接受本场助教任务' : assistantActive ? '查看本场教练分工' : refereeLive ? '裁判比赛进行中' : refereeAccepted ? '本场裁判任务' : refereeReady ? '接受裁判任务' : matchReady ? '完成比赛准备' : participant ? (approved ? '报名审核已通过' : withdrawn ? '已被移出赛事' : rejected ? '报名审核被驳回' : '报名等待审核') : '审核球队报名',
        taskAction: assistantInvite ? '确认加入' : assistantActive ? '进入协作' : refereeLive ? '进入裁判台' : refereeAccepted ? '进入比赛准备' : refereeReady ? '查看任务' : matchReady ? '去准备' : participant ? '查看状态' : '审核',
        taskMeta: (refereeReady || assistantInvite || assistantActive) ? `${task.tournamentName || '本场比赛'} · ${task.homeTeamName || task.teamName || '主队'}${task.awayTeamName ? ` VS ${task.awayTeamName}` : ''}` : `${task.tournamentName} · ${task.teamName}`,
        taskDetail: task.detail || (participant ? '报名状态待更新。' : `${task.teamName} 已提交报名，请审核。`)
      });
    });
    this.setData({
      hasTournamentTasks: !!first,
      tournamentTask: first ? Object.assign({}, first, { countText: tasks.length > 1 ? `还有 ${tasks.length - 1} 项待处理` : '请尽快完成审核' }) : null,
      tournamentTasks: visibleTasks,
      tournamentTaskCount: unreadCount,
      tournamentTaskMoreCount: Math.max(0, tasks.length - visibleTasks.length)
    });
    wx.setStorageSync('sxfTournamentPendingReviewCount', unreadCount);
  },

  openTournamentTask(event) {
    const taskId = event && event.currentTarget && event.currentTarget.dataset ? String(event.currentTarget.dataset.id || '') : '';
    const task = taskId ? this.data.tournamentTasks.find((item) => String(item.taskId) === taskId) : this.data.tournamentTask;
    if (!task || !task.eventId) return;
    if (task.type === 'match_assistant_invite') {
      const invite = task.assistantInvite || String(task.deepLinkTarget || '').split('assistantInvite=')[1] || '';
      if (invite) wx.navigateTo({ url: `/pages/match-coach-workspace/index?assistantInvite=${encodeURIComponent(decodeURIComponent(invite))}` });
      return;
    }
    if (task.type === 'match_assistant' && task.matchId) {
      wx.navigateTo({ url: `/pages/match-coach-workspace/index?matchId=${encodeURIComponent(task.matchId)}` });
      return;
    }
    if ((task.type === 'match_coach_ready' || task.type === 'match_referee_accept') && task.matchId) {
      if (task.type === 'match_referee_accept' && (task.preparationState === 'live' || task.matchState === 'live')) {
        wx.navigateTo({ url: `/pages/scorer-board/index?boardOnly=1&matchId=${encodeURIComponent(task.matchId)}` });
        return;
      }
      wx.navigateTo({ url: `/pages/match-preparation/index?matchId=${encodeURIComponent(task.matchId)}` });
      return;
    }
    const destination = `/pages/tournament-detail/index?id=${encodeURIComponent(task.eventId)}&tab=teams`;
    if (task.type !== 'registration_status') { wx.navigateTo({ url: destination }); return; }
    const remaining = this.data.tournamentTasks.filter((item) => String(item.taskId) !== String(task.taskId));
    const unreadCount = Math.max(0, Number(this.data.tournamentTaskCount || 0) - 1);
    this.setData({
      hasTournamentTasks: remaining.length > 0 || unreadCount > 0,
      tournamentTask: remaining[0] || null,
      tournamentTasks: remaining,
      tournamentTaskCount: unreadCount,
      tournamentTaskMoreCount: Math.max(0, Number(this.data.tournamentTaskMoreCount || 0) - 1)
    });
    wx.setStorageSync('sxfTournamentPendingReviewCount', unreadCount);
    callCloud('sxTournamentLeague', { action: 'markTaskRead', taskId: task.taskId })
      .catch(() => {})
      .finally(() => wx.navigateTo({ url: destination }));
  },

  retryMatchTasks() {
    this.loadMatchTasks();
  },

  openHomeTask() {
    if (!this.data.homeTask) return;
    const showTaskDetail = this.data.homeTaskCount === 1;
    this.setData({ showTaskCenter: true, showTaskDetail, selectedTask: showTaskDetail ? this.data.homeTask : null });
    if (showTaskDetail) this.loadTaskContext(this.data.homeTask);
  },

  openTaskEntry() {
    if (!hasPhoneLogin()) { this.goLogin(); return; }
    this.setData({ showTaskCenter: true, showTaskDetail: false, selectedTask: null });
  },

  closeTaskCenter() {
    if (this.data.taskActionBusy) return;
    this.setData({ showTaskCenter: false, showTaskDetail: false, selectedTask: null, showRosterEditor: false });
  },

  stopTaskBubble() {},

  showTaskList() {
    this.setData({ showTaskDetail: false, selectedTask: null, showRosterEditor: false });
  },

  selectMatchTask(event) {
    const taskId = String(event.currentTarget.dataset.id || '');
    const task = this.data.matchTasks.find((item) => String(item.matchTaskId) === taskId);
    if (!task) return;
    this.setData({ showTaskDetail: true, selectedTask: task, taskRosterStatus: '未提交', taskAssistantStatus: '0/5' });
    this.loadTaskContext(task);
    if (task.unread) {
      callCloud('sxCollaboration', { domain: 'matchTask', action: 'markRead', matchTaskId: task.matchTaskId, organizationId: task.organizationId });
    }
  },

  async loadTaskContext(task) {
    if (!task || !task.matchId || !task.teamScope || !task.isTeamTask) return;
    this.setData({ taskContextLoading: true });
    const payload = { matchId: task.matchId, teamScope: task.teamScope, organizationId: task.organizationId };
    const [rosterResult, staffResult] = await Promise.all([
      callCloud('sxCollaboration', Object.assign({ domain: 'roster', action: 'get' }, payload)),
      callCloud('sxCollaboration', Object.assign({ domain: 'staff', action: 'list' }, payload))
    ]);
    const roster = rosterResult && rosterResult.ok ? rosterResult.roster : null;
    const staff = staffResult && staffResult.ok && Array.isArray(staffResult.staff) ? staffResult.staff : [];
    this.setData({
      taskContextLoading: false,
      taskRosterStatus: roster && roster.status === 'submitted' ? (roster.locked ? '已锁定' : '已提交') : '未提交',
      taskAssistantStatus: `${staff.filter((item) => item.status === 'joined').length}/5`,
      rosterLocked: !!(roster && roster.locked)
    });
  },

  runTaskPrimaryAction() {
    const task = this.data.selectedTask;
    if (!task || this.data.taskActionBusy) return;
    if (task.actionCode === 'accept') { this.updateTaskConfirmation('accept'); return; }
    if (task.actionCode === 'confirm_second') { this.updateTaskConfirmation('confirmSecond'); return; }
    if (task.actionCode === 'referee_console') {
      this.setData({ showTaskCenter: false });
      wx.navigateTo({ url: '/pages/scorer-board/index?boardOnly=1&matchId=' + encodeURIComponent(task.matchId || '') });
      return;
    }
    if (task.actionCode === 'team_roster') { this.openRosterEditor(); return; }
    if (task.actionCode === 'assistant_work') {
      wx.showToast({ title: '现场开放后从首页进入数据任务', icon: 'none' });
      return;
    }
    wx.showToast({ title: task.onsiteOpened ? '现场任务已开放' : '等待主办方开放现场', icon: 'none' });
  },

  rejectSelectedTask() {
    const task = this.data.selectedTask;
    if (!task || !task.canReject || this.data.taskActionBusy) return;
    wx.showModal({
      title: '拒绝本场任务？',
      content: `${task.dateText}\n${task.matchText}`,
      confirmText: '确认拒绝',
      confirmColor: '#d83b2d',
      success: (result) => { if (result.confirm) this.updateTaskConfirmation('reject'); }
    });
  },

  async updateTaskConfirmation(action) {
    const task = this.data.selectedTask;
    if (!task) return;
    this.setData({ taskActionBusy: true });
    const result = await callCloud('sxCollaboration', { domain: 'matchTask', action, matchTaskId: task.matchTaskId, organizationId: task.organizationId });
    this.setData({ taskActionBusy: false });
    if (!result || !result.ok) {
      wx.showToast({ title: (result && result.error) || '操作失败', icon: 'none' });
      return;
    }
    wx.showToast({ title: action === 'reject' ? '已拒绝' : '已确认', icon: 'success' });
    await this.loadMatchTasks();
    const refreshed = this.data.matchTasks.find((item) => item.matchTaskId === task.matchTaskId);
    if (refreshed && action !== 'reject') {
      this.setData({ selectedTask: refreshed, showTaskDetail: true });
      this.loadTaskContext(refreshed);
    } else {
      this.setData({ showTaskDetail: false, selectedTask: null });
    }
  },

  async openRosterEditor() {
    const task = this.data.selectedTask;
    if (!task || !task.isTeamTask) return;
    this.setData({ taskActionBusy: true });
    const result = await callCloud('sxCollaboration', { domain: 'roster', action: 'get', matchId: task.matchId, teamScope: task.teamScope, organizationId: task.organizationId });
    const roster = result && result.ok ? result.roster : null;
    const rosterPlayers = getTaskRosterPlayers(task, roster);
    this.setData({
      taskActionBusy: false,
      showRosterEditor: true,
      rosterPlayers,
      rosterPlayersEmpty: rosterPlayers.length === 0,
      rosterSelectedCount: rosterPlayers.filter((player) => player.selected).length,
      rosterStarterCount: rosterPlayers.filter((player) => player.starter).length,
      rosterLocked: !!(roster && roster.locked)
    });
  },

  closeRosterEditor() {
    if (this.data.taskActionBusy) return;
    this.setData({ showRosterEditor: false });
  },

  toggleRosterPlayer(event) {
    if (this.data.rosterLocked) return;
    const playerId = String(event.currentTarget.dataset.id || '');
    const rosterPlayers = this.data.rosterPlayers.map((player) => {
      if (player.playerId !== playerId) return player;
      const selected = !player.selected;
      return Object.assign({}, player, { selected, starter: selected ? player.starter : false, rowClass: selected ? 'roster-player selected' : 'roster-player', starterClass: selected && player.starter ? 'starter-button active' : 'starter-button' });
    });
    this.setData({ rosterPlayers, rosterSelectedCount: rosterPlayers.filter((player) => player.selected).length, rosterStarterCount: rosterPlayers.filter((player) => player.starter).length });
  },

  toggleRosterStarter(event) {
    if (this.data.rosterLocked) return;
    const playerId = String(event.currentTarget.dataset.id || '');
    const rosterPlayers = this.data.rosterPlayers.map((player) => {
      if (player.playerId !== playerId) return player;
      const starter = player.selected ? !player.starter : true;
      return Object.assign({}, player, { selected: true, starter, rowClass: 'roster-player selected', starterClass: starter ? 'starter-button active' : 'starter-button' });
    });
    this.setData({ rosterPlayers, rosterSelectedCount: rosterPlayers.filter((player) => player.selected).length, rosterStarterCount: rosterPlayers.filter((player) => player.starter).length });
  },

  async submitTaskRoster() {
    const task = this.data.selectedTask;
    if (!task || this.data.rosterLocked || this.data.taskActionBusy) return;
    const players = this.data.rosterPlayers.filter((player) => player.selected).map((player) => ({ playerId: player.playerId, name: player.name, number: player.number, starter: player.starter }));
    if (!players.length) { wx.showToast({ title: '请至少选择1名参赛球员', icon: 'none' }); return; }
    if (players.filter((player) => player.starter).length !== 5) { wx.showToast({ title: '请选择5名首发', icon: 'none' }); return; }
    this.setData({ taskActionBusy: true });
    const result = await callCloud('sxCollaboration', { domain: 'roster', action: 'submit', matchId: task.matchId, teamScope: task.teamScope, organizationId: task.organizationId, players });
    this.setData({ taskActionBusy: false });
    if (!result || !result.ok) { wx.showToast({ title: (result && result.error) || '名单提交失败', icon: 'none' }); return; }
    wx.showToast({ title: '名单已提交', icon: 'success' });
    this.setData({ showRosterEditor: false, taskRosterStatus: '已提交' });
  },

  goLogin() {
    wx.navigateTo({ url: getLoginUrl('') });
  },

  requirePhoneLogin(redirectPath, content) {
    if (hasPhoneLogin()) return true;
    wx.showModal({
      title: '登录后云端保存',
      content: content || '登录后可保存并同步赛事、球队和比赛数据。',
      confirmText: '去登录',
      cancelText: '先浏览',
      confirmColor: '#ff5a00',
      success: (result) => {
        if (result.confirm) wx.navigateTo({ url: getLoginUrl(redirectPath) });
      }
    });
    return false;
  },

  loadRecentMatches() {
    const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
    const allMatches = (Array.isArray(stored) ? stored : []).slice().sort((left, right) => getMatchTimestamp(right) - getMatchTimestamp(left));
    const teamLogoMap = buildTeamLogoMap();
    const recentMatches = allMatches.slice(0, 5).map((item) => decorateRecentMatch(item, teamLogoMap));
    const finished = allMatches.filter(isFinishedMatch).length;
    this.setData({
      recentMatches,
      hasRecentMatches: recentMatches.length > 0,
      todayStats: { total: allMatches.length, pending: allMatches.length - finished, finished }
    });
  },

  openCampusRole() {
    wx.showActionSheet({
      itemList: ['校区负责人', '教练'],
      success: (res) => {
        const roles = ['校区负责人', '教练'];
        const role = roles[res.tapIndex] || '校区管理员';
        this.setData({ currentRole: role });
        wx.navigateTo({
          url: res.tapIndex === 0 ? '/pages/campus-manager/home/index' : '/pages/education/index'
        });
      }
    });
  },

  goQuickMatch() {
    const url = '/pages/scorer/index?from=homeHero';
    if (!this.requirePhoneLogin(url, '登录后才能云端保存比赛设置、计分过程和赛后记录。')) return;
    wx.navigateTo({ url });
  },

  goMatchDetail(event) {
    const id = event.currentTarget.dataset.id;
    const match = this.data.recentMatches.find((item) => String(item.id) === String(id));
    if (!match) return;
    if (match.ended !== true && match.status !== 'finished') {
      wx.navigateTo({ url: '/pages/scorer-board/index?boardOnly=1&resumeId=' + encodeURIComponent(match.id) });
      return;
    }
    const hasReport = match.reportRequested === true || match.reportLocked === true || !!match.reportNo || !!match.pdfFileID;
    if (hasReport) {
      wx.navigateTo({ url: '/pages/referee-report/index?recordId=' + encodeURIComponent(match.id) });
      return;
    }
    if (match.tournamentId && match.gameId) {
      wx.navigateTo({ url: `/pages/game-detail/index?tournamentId=${match.tournamentId}&gameId=${match.gameId}` });
      return;
    }
    wx.navigateTo({ url: '/pages/referee-report/index?recordId=' + encodeURIComponent(match.id) + '&viewOnly=1' });
  },

  deleteRecentMatch(event) {
    if (!this.requirePhoneLogin('', '删除比分记录前请先登录，避免误操作或数据归属不清。')) return;
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除比分',
      content: '确定删除这条最近对阵比分吗？',
      confirmText: '删除',
      confirmColor: '#ff4b00',
      success: (res) => {
        if (!res.confirm) return;
        const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
        const matches = Array.isArray(stored) ? stored : [];
        const nextMatches = matches.filter((item) => String(item.id) !== String(id));
        wx.setStorageSync(RECENT_MATCHES_KEY, nextMatches);
        this.loadRecentMatches();
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  goMoreMatches() {
    wx.navigateTo({ url: '/pages/recent-matches/index' });
  },

  openRecentMatches(event) {
    const filter = event.currentTarget.dataset.filter || 'all';
    wx.navigateTo({ url: '/pages/recent-matches/index?filter=' + encodeURIComponent(filter) });
  },

  openEducationProduct() {
    wx.navigateTo({ url: '/pages/education-product/index' });
  },

  onTabTap(event) {
    const key = event.currentTarget.dataset.key;
    const url = mainRoutes[key];
    if (!url || key === 'home') return;
    wx.redirectTo({ url });
  }
});
