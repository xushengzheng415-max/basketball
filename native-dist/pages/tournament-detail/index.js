const { callCloud, cloud } = require('../../utils/cloud');
const { FORMAT_META, SCENARIO_META, STATUS_META, callTournament, getLocalTournamentResult, removeLocalTournament, syncLocalTournament, updateLocalTournament } = require('../../utils/tournament-league');
const { requestTournamentSubscription } = require('../../utils/tournament-subscription');

const TAB_ITEMS = [
  { key: 'matches', label: '对阵' }, { key: 'standings', label: '积分' },
  { key: 'teams', label: '球队' }, { key: 'manage', label: '管理' }
];

function list(value) { return Array.isArray(value) ? value : []; }

function syncPendingServiceGrants() {
  const grants = wx.getStorageSync('sxfPendingServiceNotificationGrants');
  if (!grants || typeof grants !== 'object') return Promise.resolve();
  return callCloud('sxTournamentNotification', { action: 'recordAuthorization', grants }).then((result) => {
    if (result && result.ok) wx.removeStorageSync('sxfPendingServiceNotificationGrants');
  });
}

function inviteQrErrorText(error) {
  const message = String(error && (error.message || error.errMsg) || '');
  if (message.indexOf('invalid appsecret') >= 0 || message.indexOf('errcode":40125') >= 0) {
    return '篮球小程序码配置未完成，请联系管理员更新小程序 AppSecret';
  }
  if (message.indexOf('access_token') >= 0) return '小程序码服务暂不可用，请稍后重试';
  return '小程序码生成失败，请稍后重试';
}

function resolveInviteQrEnvVersion() {
  try {
    const envVersion = wx.getAccountInfoSync && wx.getAccountInfoSync().miniProgram
      ? wx.getAccountInfoSync().miniProgram.envVersion
      : '';
    return envVersion === 'release' ? 'release' : 'trial';
  } catch (error) {
    return 'trial';
  }
}

Page({
  data: {
    eventId: '', loading: true, loadFailed: false, tournament: null, role: '', isCreator: false,
    activeTab: 'matches', showMatchesTab: true, showStandingsTab: false, showTeamsTab: false, showManageTab: false,
    tabs: [], matches: [], teams: [], approvedTeams: [], pendingTeams: [],
    standingSections: [], hasMatches: false, hasStandings: false, hasApprovedTeams: false, hasPendingTeams: false,
    schedulePreview: [], hasSchedulePreview: false, previewCount: 0,
    inviteKey: '', inviteQr: '', inviteQrLoading: false, inviteQrError: '', inviteActionText: '', showInvitePanel: false, showServiceBindPanel: false, showServiceAuthorizationPanel: false, generatingInvite: false,
    formatOptions: ['单循环联赛', '主客双循环', '小组循环 + 淘汰赛'],
    formatKeys: ['single_round_robin', 'double_round_robin', 'group_knockout'],
    formatIndex: 0, selectedFormatText: '单循环联赛', groupCount: 2, advanceCount: 2, showGroupSettings: false,
    periodMinutes: 10, periodCount: 4, matchRulesSaving: false,
    syncInProgress: false, showAdvanceKnockout: false, showStartRecruiting: false,
    isLocalOnly: false, showSetupGuide: false,
    showHeaderInvite: false,
    posterPath: '', generatingPoster: false, hasPoster: false, posterButtonText: '生成邀请海报',
    serviceFollowQr: '', serviceFollowGateId: '', serviceFollowReady: false, serviceFollowLoading: false, serviceFollowError: '', serviceBindingChecked: false,
    serviceNotificationAuthorized: false, pendingInviteAuthorization: false, serviceAuthorizationVisited: false
  },
  onLoad(options = {}) {
    const eventId = decodeURIComponent(String(options.id || options.eventId || ''));
    this.openInviteAfterLoad = options.openInvite === '1';
    const initialTab = TAB_ITEMS.some((item) => item.key === options.tab) ? options.tab : 'matches';
    this.setData({ eventId, activeTab: initialTab, tabs: this.buildTabs(initialTab), showMatchesTab: initialTab === 'matches', showStandingsTab: initialTab === 'standings', showTeamsTab: initialTab === 'teams', showManageTab: initialTab === 'manage' });
  },
  onShow() { if (this.data.eventId) this.loadData(); },
  onHide() { this.stopCreatorFollowPolling(); },
  onUnload() { this.stopCreatorFollowPolling(); },
  buildTabs(activeTab) { return TAB_ITEMS.map((tab) => Object.assign({}, tab, { className: tab.key === activeTab ? 'tab active' : 'tab' })); },
  switchTab(event) {
    const activeTab = event.currentTarget.dataset.key || 'matches';
    this.setData({
      activeTab, tabs: this.buildTabs(activeTab), showMatchesTab: activeTab === 'matches',
      showStandingsTab: activeTab === 'standings', showTeamsTab: activeTab === 'teams', showManageTab: activeTab === 'manage'
    });
  },
  loadData() {
    this.setData({ loading: true, loadFailed: false });
    const localResult = getLocalTournamentResult(this.data.eventId);
    if (localResult) {
      this.applyResult(localResult);
      return;
    }
    callTournament('get', { eventId: this.data.eventId }).then((result) => this.applyResult(result)).catch((error) => {
      console.warn('[tournament-detail] load failed', error);
      this.setData({ loading: false, loadFailed: true });
    });
  },
  applyResult(result) {
    const tournament = this.decorateTournament(result.tournament);
    const teams = list(result.teams).map((team) => this.decorateTeam(Object.assign({}, team, { isMyTeam: team.teamId === result.myTeamId }), tournament.scenarioType));
    const isCreator = result.role === 'creator';
    const matches = list(result.matches).map((match) => this.decorateMatch(match, isCreator, result.myTeamId));
    const hasExternalTeams = teams.some((team) => team.source !== 'creator' && team.status !== 'withdrawn');
    const formatIndex = Math.max(0, this.data.formatKeys.indexOf(tournament.competitionFormat));
    this.setData({
      loading: false, loadFailed: false, tournament, role: result.role, isCreator, isLocalOnly: result.localOnly === true,
      teams, approvedTeams: teams.filter((team) => team.status === 'approved'), pendingTeams: teams.filter((team) => team.status === 'pending'), rejectedTeams: teams.filter((team) => team.status === 'rejected'), withdrawnTeams: teams.filter((team) => team.status === 'withdrawn'),
      hasApprovedTeams: teams.some((team) => team.status === 'approved'), hasPendingTeams: teams.some((team) => team.status === 'pending'), hasRejectedTeams: teams.some((team) => team.status === 'rejected'), hasWithdrawnTeams: teams.some((team) => team.status === 'withdrawn'),
      matches, hasMatches: matches.length > 0,
      showSetupGuide: isCreator && matches.length === 0 && !hasExternalTeams,
      showHeaderInvite: isCreator && !result.localOnly && tournament.registrationOpen && hasExternalTeams,
      standingSections: this.decorateStandingSections(result.standingSections), hasStandings: list(result.standingSections).some((section) => list(section.rows).some((row) => row.played > 0)),
      formatIndex, selectedFormatText: this.data.formatOptions[formatIndex],
      groupCount: Number(tournament.groupCount || 2), advanceCount: Number(tournament.advanceCount || 2),
      periodMinutes: Number(tournament.periodMinutes || 10), periodCount: Number(tournament.periodCount || 4),
      showGroupSettings: tournament.competitionFormat === 'group_knockout',
      showAdvanceKnockout: isCreator && tournament.competitionFormat === 'group_knockout' && matches.length > 0,
      showStartRecruiting: isCreator && tournament.status === 'draft'
    }, () => {
      if (!result.localOnly) this.syncLocalResults(matches);
      if (isCreator && !result.localOnly) this.loadCreatorServiceBinding(false);
      if (this.openInviteAfterLoad && !result.localOnly) {
        this.openInviteAfterLoad = false;
        this.createInvite();
      }
    });
  },
  decorateTournament(item) {
    const scenario = SCENARIO_META[item.scenarioType] || SCENARIO_META.other;
    const format = FORMAT_META[item.competitionFormat] || FORMAT_META.single_round_robin;
    const status = STATUS_META[item.status] || STATUS_META.draft;
    const pointsRule = item.pointsRule || { win: 2, loss: 1, forfeit: 0 };
    return Object.assign({}, item, {
      scenarioLabel: scenario.label, scenarioClass: scenario.className, formatLabel: format.label,
      statusLabel: status.label, statusClass: status.className,
      pointsRule,
      pointsText: `胜 ${Number(pointsRule.win || 2)} · 负 ${Number(pointsRule.loss === undefined ? 1 : pointsRule.loss)} · 弃权 ${Number(pointsRule.forfeit || 0)}`,
      matchRuleText: `${Number(item.periodCount || 4)} 节 · 每节 ${Number(item.periodMinutes || 10)} 分钟`,
      registrationText: item.registrationOpen ? '球队招募开放中' : '球队招募已关闭'
    });
  },
  decorateTeam(team, scenarioType) {
    const statusMap = { pending: ['待审核', 'pending'], approved: ['已通过', 'approved'], rejected: ['已驳回', 'rejected'], withdrawn: ['已退出', 'withdrawn'] };
    const meta = statusMap[team.status] || statusMap.pending;
    const isClassLeague = scenarioType === 'class_league';
    const identityText = isClassLeague && team.schoolName ? `${team.schoolName} · ${team.gradeName}${team.className}` : (team.coachName || '球队负责人');
    const archiveText = isClassLeague && team.boundTeamName ? `绑定球队：${team.boundTeamName}` : identityText;
    return Object.assign({}, team, {
      statusLabel: meta[0], statusClass: meta[1], playerCount: list(team.players).length,
      identityText, detailText: `${archiveText} · ${list(team.players).length} 名球员`,
      groupText: team.groupKey ? `${team.groupKey}组` : '待分组', logoText: String(team.name || '队').slice(0, 1),
      reviewDisplay: team.reviewNote || '请联系赛事创建者后重新提交',
      removeDisplay: team.removeReason || '由赛事创建者移出',
      canRemove: team.source !== 'creator' && team.status === 'approved'
    });
  },
  decorateMatch(match, isCreator, myTeamId) {
    const statusMap = { waiting: ['待开始', 'waiting'], live: ['进行中', 'live'], completed: ['已结束', 'completed'] };
    const status = statusMap[match.status] || statusMap.waiting;
    let stageText = `第 ${Number(match.roundNo || 1)} 轮`;
    if (match.stage === 'group') stageText = `${match.groupKey}组 · 第 ${Number(match.roundNo || 1)} 轮`;
    if (match.stage === 'knockout') stageText = `淘汰赛 · 第 ${Number(match.knockoutRound || 1)} 轮`;
    const isHomeTeam = !!myTeamId && String(match.homeTeamId) === String(myTeamId);
    const isAwayTeam = !!myTeamId && String(match.awayTeamId) === String(myTeamId);
    const actionText = match.status === 'completed' ? '查看比赛' : match.status === 'live' ? (isHomeTeam || isAwayTeam ? '进入教练端' : '查看比赛') : isHomeTeam ? '比赛准备' : isAwayTeam ? '查看准备' : '查看准备';
    return Object.assign({}, match, {
      statusLabel: status[0], statusClass: status[1], stageText,
      scoreText: match.status === 'completed' ? `${Number(match.homeScore || 0)} : ${Number(match.awayScore || 0)}` : 'VS',
      actionText, isHomeTeam, isAwayTeam,
      canSwap: match.status === 'waiting', showSwap: !!isCreator && match.status === 'waiting'
    });
  },
  decorateStandingSections(sections) {
    return list(sections).map((section) => ({
      groupKey: section.groupKey || 'league', label: section.label || '积分榜',
      rows: list(section.rows).map((row) => Object.assign({}, row, { recordText: `${row.won}胜${row.lost}负`, differenceText: row.pointDifference > 0 ? `+${row.pointDifference}` : String(row.pointDifference) }))
    }));
  },
  retry() { this.loadData(); },
  editTournament() {
    if (!this.data.isCreator) return;
    wx.navigateTo({ url: `/pages/tournament-create/index?id=${encodeURIComponent(this.data.eventId)}` });
  },
  deleteTournament() {
    if (!this.data.isCreator || !this.data.tournament) return;
    const isLocalOnly = this.data.isLocalOnly;
    wx.showModal({
      title: '删除赛事',
      content: isLocalOnly ? '确定删除这个本机赛事吗？删除后无法恢复。' : '本赛事所有赛程、赛果、积分榜、报名球队和邀请码将全部消失失效，删除后无法恢复。确定继续吗？',
      confirmText: '删除赛事',
      confirmColor: '#d94b42',
      success: (result) => {
        if (!result.confirm) return;
        wx.showLoading({ title: '正在删除' });
        const request = isLocalOnly
          ? Promise.resolve().then(() => removeLocalTournament(this.data.eventId))
          : callTournament('delete', { eventId: this.data.eventId });
        request.then(() => {
          wx.showToast({ title: '赛事已删除', icon: 'success' });
          setTimeout(() => wx.redirectTo({ url: '/pages/tournament/index' }), 450);
        }).catch((error) => wx.showToast({ title: error.message || '删除失败，请重试', icon: 'none' })).finally(() => wx.hideLoading());
      }
    });
  },
  deleteFailedTournament() {
    if (!this.data.eventId) return;
    wx.showModal({
      title: '删除加载失败的赛事',
      content: '本赛事所有赛程、赛果、积分榜、报名球队和邀请码将全部消失失效，删除后无法恢复。确定继续吗？',
      confirmText: '删除赛事', confirmColor: '#d94b42',
      success: (result) => {
        if (!result.confirm) return;
        wx.showLoading({ title: '正在删除' });
        callTournament('delete', { eventId: this.data.eventId }).then(() => {
          wx.showToast({ title: '赛事已删除', icon: 'success' });
          setTimeout(() => wx.redirectTo({ url: '/pages/tournament/index' }), 450);
        }).catch((error) => wx.showToast({ title: error.message || '删除失败，请重试', icon: 'none' })).finally(() => wx.hideLoading());
      }
    });
  },
  goManage() { this.switchTab({ currentTarget: { dataset: { key: 'manage' } } }); },
  goTournamentHome() { wx.redirectTo({ url: '/pages/tournament/index' }); },
  createInvite(skipSubscription) {
    if (this.data.generatingInvite) return;
    if (skipSubscription !== true) {
      requestTournamentSubscription('registration').then((accepted) => {
        if (accepted) { this.createInvite(true); return; }
        wx.showModal({ title: '需要开启报名通知', content: '请允许接收球队报名通知后再继续邀请，避免错过报名审核。', showCancel: false, confirmText: '知道了' });
      });
      return;
    }
    if (this.data.isLocalOnly) {
      this.syncAndCreateInvite();
      return;
    }
    this.setData({ generatingInvite: true, inviteQr: '', inviteQrLoading: false, inviteQrError: '', inviteActionText: '', posterPath: '', hasPoster: false, posterButtonText: '生成邀请海报' });
    callTournament('createInvite', { eventId: this.data.eventId }).then((result) => {
      this.setData({ inviteKey: result.inviteKey, showInvitePanel: false, showServiceBindPanel: false, showServiceAuthorizationPanel: false, generatingInvite: false, pendingInviteAuthorization: true });
      this.loadInviteQr(result.inviteKey);
      this.loadCreatorServiceBinding(false).then((bound) => {
        if (bound) {
          if (this.data.serviceNotificationAuthorized) this.setData({ showInvitePanel: true, pendingInviteAuthorization: false });
          else this.openCreatorServiceSubscription();
          return;
        }
        this.setData({ showServiceBindPanel: true }, () => this.enableCreatorServiceNotice());
      });
    }).catch((error) => {
      this.setData({ generatingInvite: false });
      wx.showToast({ title: error.message || '邀请生成失败', icon: 'none' });
    });
  },
  loadInviteQr(inviteKey) {
    const key = typeof inviteKey === 'string' ? inviteKey : this.data.inviteKey;
    if (!key || this.data.inviteQrLoading) return Promise.resolve(this.data.inviteQr || '');
    this.setData({ inviteQrLoading: true, inviteQrError: '' });
    const request = callCloud('sxCreateTournamentQrCode', { eventId: this.data.eventId, inviteKey: key, envVersion: resolveInviteQrEnvVersion() });
    const timeout = new Promise((resolve, reject) => setTimeout(() => reject(new Error('小程序码生成较慢，请稍后重试')), 25000));
    return Promise.race([request, timeout]).then((qr) => {
      if (!qr || !qr.ok || !(qr.fileID || qr.url)) throw new Error(qr && qr.error || '小程序码生成失败');
      const source = qr.fileID || qr.url;
      this.setData({ inviteQr: source, inviteQrError: '' });
      return source;
    }).catch((error) => {
      this.setData({ inviteQrError: inviteQrErrorText(error) });
      throw error;
    }).finally(() => this.setData({ inviteQrLoading: false }));
  },
  syncAndCreateInvite() {
    if (this.data.generatingInvite) return;
    this.setData({ generatingInvite: true });
    wx.showLoading({ title: '同步赛事' });
    syncLocalTournament(this.data.eventId).then((result) => {
      const cloudEventId = result && result.tournament ? result.tournament.eventId : '';
      if (!cloudEventId) throw new Error('云端赛事创建失败');
      wx.hideLoading();
      wx.redirectTo({ url: `/pages/tournament-detail/index?id=${encodeURIComponent(cloudEventId)}&openInvite=1` });
    }).catch((error) => {
      wx.hideLoading(); this.setData({ generatingInvite: false });
      wx.showModal({
        title: '暂时无法生成邀请',
        content: '赛事已保存在本机，但跨账号邀请需要连接云端赛事服务。请部署赛事云函数或稍后联网重试。',
        showCancel: false,
        confirmText: '知道了'
      });
      console.warn('[tournament-detail] sync before invite failed', error);
    });
  },
  closeInvitePanel() { this.stopCreatorFollowPolling(); this.setData({ showInvitePanel: false }); },
  closeServiceBindPanel() { this.stopCreatorFollowPolling(); this.setData({ showServiceBindPanel: false }); },
  closeServiceAuthorizationPanel() { this.setData({ showServiceAuthorizationPanel: false }); },
  cancelCreatorInviteAuthorization() {
    this.setData({ showServiceAuthorizationPanel: false, pendingInviteAuthorization: false, showInvitePanel: false });
  },
  previewInviteQr() { if (this.data.inviteQr) wx.previewImage({ urls: [this.data.inviteQr] }); },
  copyInvite() {
    const inviteKey = String(this.data.inviteKey || '').trim();
    if (!inviteKey) { this.setData({ inviteActionText: '邀请码暂未生成，请关闭后重新打开邀请。' }); return; }
    wx.setClipboardData({
      data: inviteKey,
      success: () => {
        this.setData({ inviteActionText: `邀请码 ${inviteKey} 已复制，可直接发送给球队负责人。` });
        wx.showToast({ title: '邀请码已复制', icon: 'success' });
      },
      fail: () => this.setData({ inviteActionText: `复制失败，请手动记录邀请码：${inviteKey}` })
    });
  },
  enableCreatorServiceNotice() {
    if (this.data.serviceFollowReady) { wx.showToast({ title: '服务号通知已开启', icon: 'success' }); return; }
    if (!this.data.eventId || !this.data.inviteKey || this.data.serviceFollowLoading) return;
    this.setData({ serviceFollowLoading: true, serviceFollowError: '' });
    callCloud('sxTournamentNotification', { action: 'createFollowGate', eventId: this.data.eventId, inviteKey: this.data.inviteKey }).then((result) => {
      if (!result || !result.ok) throw new Error(result && result.message || '服务号绑定初始化失败');
      this.setData({
        serviceFollowReady: result.followed === true,
        serviceFollowGateId: result.gateId || '',
        serviceFollowQr: result.qrUrl || '',
        serviceFollowError: ''
      });
      if (result.followed === true) {
        this.stopCreatorFollowPolling();
        this.setData({ showServiceBindPanel: false, showInvitePanel: false, showServiceAuthorizationPanel: true });
        wx.showToast({ title: '关注成功', icon: 'success' });
      } else if (result.gateId) this.startCreatorFollowPolling();
    }).catch((error) => this.setData({ serviceFollowError: error.message || '服务号二维码暂不可用' })).finally(() => this.setData({ serviceFollowLoading: false }));
  },
  loadCreatorServiceBinding(promptWhenUnbound) {
    if (this.data.serviceFollowLoading) return Promise.resolve(false);
    this.setData({ serviceFollowLoading: true, serviceFollowError: '' });
    return syncPendingServiceGrants().catch(() => {}).then(() => callCloud('sxTournamentNotification', { action: 'bindingStatus' })).then((result) => {
      const bound = !!(result && result.ok && result.bound);
      const grants = result && result.grants || {};
      const authorized = grants.registration === true && grants.announcement === true;
      const resumeInvite = bound && this.data.showServiceBindPanel;
      const authorizationCompleted = this.data.pendingInviteAuthorization && bound && authorized;
      this.setData({
        serviceBindingChecked: true,
        serviceFollowReady: bound,
        serviceNotificationAuthorized: authorized,
        serviceFollowQr: bound ? '' : this.data.serviceFollowQr,
        serviceFollowGateId: bound ? '' : this.data.serviceFollowGateId,
        serviceFollowError: '',
        showServiceBindPanel: resumeInvite ? false : this.data.showServiceBindPanel,
        showServiceAuthorizationPanel: authorizationCompleted ? false : (bound && this.data.pendingInviteAuthorization && !authorized ? true : this.data.showServiceAuthorizationPanel),
        showInvitePanel: authorizationCompleted ? true : this.data.showInvitePanel,
        pendingInviteAuthorization: authorizationCompleted ? false : this.data.pendingInviteAuthorization
      });
      if (bound) this.stopCreatorFollowPolling();
      if (!bound && promptWhenUnbound === true) {
        this.setData({ serviceFollowLoading: false }, () => this.enableCreatorServiceNotice());
      }
      return bound;
    }).catch((error) => {
      this.setData({ serviceBindingChecked: true, serviceFollowError: error.message || '绑定状态查询失败' });
      return false;
    }).finally(() => {
      if (!(promptWhenUnbound === true && !this.data.serviceFollowReady)) this.setData({ serviceFollowLoading: false });
    });
  },
  startCreatorFollowPolling() {
    this.stopCreatorFollowPolling();
    this.creatorFollowTimer = setInterval(() => this.checkCreatorServiceNotice(true), 3000);
  },
  stopCreatorFollowPolling() {
    if (this.creatorFollowTimer) clearInterval(this.creatorFollowTimer);
    this.creatorFollowTimer = null;
  },
  checkCreatorServiceNotice(silent) {
    if (!this.data.serviceFollowGateId || this.data.serviceFollowReady || this.creatorFollowChecking) return Promise.resolve(false);
    this.creatorFollowChecking = true;
    if (silent !== true) this.setData({ serviceFollowLoading: true, serviceFollowError: '' });
    return callCloud('sxTournamentNotification', { action: 'checkFollowGate', gateId: this.data.serviceFollowGateId }).then((result) => {
      if (result && result.ok && result.ready) {
        this.stopCreatorFollowPolling();
        this.setData({ serviceFollowReady: true, serviceFollowQr: '', serviceFollowGateId: '', serviceFollowError: '', showServiceBindPanel: false, showInvitePanel: false, showServiceAuthorizationPanel: true });
        wx.showToast({ title: '关注成功', icon: 'success' });
        return true;
      }
      if (silent !== true) this.setData({ serviceFollowError: '尚未识别到服务号绑定，系统会继续自动检查。' });
      return false;
    }).catch((error) => {
      if (silent !== true) this.setData({ serviceFollowError: error.message || '绑定状态检查失败' });
      return false;
    }).finally(() => {
      this.creatorFollowChecking = false;
      if (silent !== true) this.setData({ serviceFollowLoading: false });
    });
  },
  openCreatorServiceSubscription() {
    this.loadCreatorServiceBinding(true).then((bound) => {
      if (!bound) return;
      if (this.data.serviceNotificationAuthorized) {
        if (this.data.pendingInviteAuthorization) this.setData({ showServiceAuthorizationPanel: false, showInvitePanel: true, pendingInviteAuthorization: false });
        else wx.showToast({ title: '通知授权已完成', icon: 'success' });
        return;
      }
      this.setData({ serviceAuthorizationVisited: true, showInvitePanel: false, showServiceAuthorizationPanel: true });
    });
  },
  refreshCreatorAuthorizationStatus() {
    if (this.data.serviceFollowLoading) return;
    this.loadCreatorServiceBinding(false).then((bound) => {
      if (!bound) {
        this.setData({ showServiceAuthorizationPanel: false, showServiceBindPanel: true }, () => this.enableCreatorServiceNotice());
        return;
      }
      if (this.data.serviceNotificationAuthorized) {
        wx.showToast({ title: '授权成功', icon: 'success' });
        return;
      }
      wx.showToast({ title: '尚未完成授权', icon: 'none' });
    });
  },
  getPosterQrPath() {
    const source = String(this.data.inviteQr || '');
    if (!source && this.data.inviteQrLoading) return this.waitForInviteQr(20);
    if (!source) return this.loadInviteQr().then(() => this.getPosterQrPath());
    if (source.indexOf('cloud://') === 0) {
      return cloud.downloadFile({ fileID: source }).then((result) => result.tempFilePath);
    }
    return new Promise((resolve, reject) => {
      wx.getImageInfo({ src: source, success: (result) => resolve(result.path), fail: reject });
    });
  },
  waitForInviteQr(remaining) {
    if (this.data.inviteQr) return this.getPosterQrPath();
    if (!this.data.inviteQrLoading || remaining <= 0) return Promise.reject(new Error(this.data.inviteQrError || '小程序码仍在生成中，请稍后再试'));
    return new Promise((resolve) => setTimeout(resolve, 500)).then(() => this.waitForInviteQr(remaining - 1));
  },
  posterTextLines(context, value, maxWidth, maxLines) {
    const text = String(value || '');
    const lines = [];
    let current = '';
    for (const character of text) {
      const next = current + character;
      const width = context.measureText ? context.measureText(next).width : next.length * 18;
      if (width > maxWidth && current) { lines.push(current); current = character; }
      else current = next;
      if (lines.length === maxLines - 1) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.join('').length < text.length && lines.length) lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…';
    return lines;
  },
  getPosterCanvasNode() {
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().in(this).select('#invitePosterCanvas').fields({ node: true, size: true }).exec((result) => {
        const canvasInfo = result && result[0];
        if (!canvasInfo || !canvasInfo.node) { reject(new Error('海报画布尚未就绪')); return; }
        resolve(canvasInfo.node);
      });
    });
  },
  loadPosterQrImage(canvas, qrPath) {
    return new Promise((resolve, reject) => {
      const image = canvas.createImage();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('二维码图片读取失败'));
      image.src = qrPath;
    });
  },
  renderInvitePoster(qrPath) {
    const width = 375; const height = 550;
    return this.getPosterCanvasNode().then((canvas) => {
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      const tournament = this.data.tournament || {};
      return this.loadPosterQrImage(canvas, qrPath).then((qrImage) => {
        context.clearRect(0, 0, width, height);
        context.fillStyle = '#090c0f'; context.fillRect(0, 0, width, height);
        const header = context.createLinearGradient(0, 0, width, 164);
        header.addColorStop(0, '#ff7b14'); header.addColorStop(1, '#b83a00');
        context.fillStyle = header; context.fillRect(0, 0, width, 164);
        context.font = '13px sans-serif'; context.fillStyle = 'rgba(255,255,255,.82)'; context.fillText(`赛小蜂篮球 · ${tournament.scenarioLabel || '赛事邀请'}`, 24, 30);
        context.font = 'bold 28px sans-serif'; context.fillStyle = '#ffffff';
        this.posterTextLines(context, tournament.name || '篮球赛事', 325, 2).forEach((line, index) => context.fillText(line, 24, 68 + index * 34));
        context.font = '14px sans-serif'; context.fillStyle = 'rgba(255,255,255,.78)'; context.fillText(tournament.organizationName || '赛事创建者邀请你参赛', 24, 143);
        context.fillStyle = '#ffffff'; context.fillRect(18, 180, 339, 326);
        context.font = 'bold 15px sans-serif'; context.fillStyle = '#14191d'; context.fillText('球队报名邀请', 38, 210);
        context.font = '12px sans-serif'; context.fillStyle = '#ff6500'; context.fillText(tournament.formatLabel || '联赛赛制', 270, 210);
        context.drawImage(qrImage, 98, 228, 180, 180);
        context.textAlign = 'center'; context.font = 'bold 17px sans-serif'; context.fillStyle = '#12171b'; context.fillText('微信扫码提交参赛球队', 187, 438);
        context.font = '14px sans-serif'; context.fillStyle = '#ff6500'; context.fillText(`邀请码  ${this.data.inviteKey}`, 187, 465);
        context.font = '12px sans-serif'; context.fillStyle = '#7d878e'; context.fillText('报名后由赛事创建者审核', 187, 489);
        context.textAlign = 'left'; context.font = '11px sans-serif'; context.fillStyle = '#8c969d'; context.fillText('赛小蜂篮球 · 让每场比赛更清楚', 24, 532);
        return new Promise((resolve, reject) => wx.canvasToTempFilePath({ canvas, fileType: 'png', quality: 1, destWidth: 750, destHeight: 1100, success: (result) => resolve(result.tempFilePath), fail: reject }, this));
      });
    });
  },
  generateInvitePoster() {
    if (this.data.posterPath) { wx.previewImage({ urls: [this.data.posterPath] }); return; }
    if (this.data.generatingPoster) return;
    if (!this.data.inviteQr) {
      this.setData({ inviteActionText: '邀请海报需要嵌入小程序码；请先完成小程序码生成后再试。' });
      if (!this.data.inviteQrLoading) this.loadInviteQr();
      return;
    }
    this.setData({ generatingPoster: true }); wx.showLoading({ title: '生成邀请海报' });
    this.getPosterQrPath().then((qrPath) => this.renderInvitePoster(qrPath)).then((posterPath) => {
      this.setData({ posterPath, hasPoster: true, posterButtonText: '预览邀请海报' });
      wx.previewImage({ urls: [posterPath] });
    }).catch((error) => {
      console.warn('[tournament-detail] poster failed', error);
      this.setData({ inviteActionText: '邀请海报生成失败，请在小程序码显示后再试。' });
      wx.showToast({ title: '海报生成失败，请重试', icon: 'none' });
    }).finally(() => { wx.hideLoading(); this.setData({ generatingPoster: false }); });
  },
  saveInvitePoster() {
    if (!this.data.posterPath) { wx.showToast({ title: '请先生成邀请海报', icon: 'none' }); return; }
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterPath,
      success: () => wx.showToast({ title: '海报已保存', icon: 'success' }),
      fail: (error) => {
        if (String(error && error.errMsg || '').indexOf('auth deny') >= 0) {
          wx.showModal({ title: '需要相册权限', content: '请在设置中允许保存图片到相册。', confirmText: '去设置', success: (result) => { if (result.confirm) wx.openSetting(); } });
          return;
        }
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      }
    });
  },
  onShareAppMessage() {
    return { title: `${this.data.tournament ? this.data.tournament.name : '篮球赛事'}邀请你报名`, path: `/pages/tournament-register/index?eventId=${this.data.eventId}&inviteKey=${this.data.inviteKey}` };
  },
  reviewTeam(event) {
    const teamId = event.currentTarget.dataset.id;
    const decision = event.currentTarget.dataset.decision;
    const label = decision === 'approve' ? '通过' : '驳回';
    wx.showModal({ title: `${label}报名`, content: `确认${label}该球队的参赛报名吗？`, confirmText: label, confirmColor: decision === 'approve' ? '#16a27e' : '#d94b42', success: (result) => {
      if (!result.confirm) return;
      callTournament('reviewTeam', { eventId: this.data.eventId, teamId, decision }).then(() => { wx.showToast({ title: `已${label}`, icon: 'success' }); this.loadData(); }).catch((error) => wx.showToast({ title: error.message || '操作失败', icon: 'none' }));
    } });
  },
  removeApprovedTeam(event) {
    if (!this.data.isCreator) return;
    const teamId = event.currentTarget.dataset.id;
    const team = this.data.approvedTeams.find((item) => item.teamId === teamId);
    if (!team) return;
    wx.showModal({
      title: '移除参赛球队',
      content: this.data.hasMatches
        ? `确定移除“${team.name}”吗？尚未开赛的相关对阵会撤回，已经完成的赛果会保留。`
        : `确定将“${team.name}”移出本赛事吗？该球队之后可以重新报名。`,
      editable: true, placeholderText: '请填写移除原因（必填）',
      confirmText: '确认移除', confirmColor: '#d94b42',
      success: (result) => {
        if (!result.confirm) return;
        const reason = String(result.content || '').trim();
        if (!reason) { wx.showToast({ title: '请填写移除原因', icon: 'none' }); return; }
        wx.showLoading({ title: '正在移除' });
        callTournament('removeTeam', { eventId: this.data.eventId, teamId, reason }).then((response) => {
          const message = response.scheduleReset ? '已移除，请重新编排' : response.preservedResults ? '已办理退赛，历史赛果保留' : '球队已移除';
          wx.showToast({ title: message, icon: 'none' });
          this.setData({ schedulePreview: [], hasSchedulePreview: false });
          this.loadData();
        }).catch((error) => wx.showToast({ title: error.message || '移除失败', icon: 'none' })).finally(() => wx.hideLoading());
      }
    });
  },
  clearWithdrawnTeam(event) {
    if (!this.data.isCreator) return;
    const teamId = event.currentTarget.dataset.id;
    const team = this.data.withdrawnTeams.find((item) => item.teamId === teamId);
    if (!team) return;
    wx.showModal({
      title: '删除退赛记录',
      content: `确定从球队管理列表删除“${team.name}”吗？历史赛程和赛果仍会保留。`,
      confirmText: '删除', confirmColor: '#d94b42',
      success: (result) => {
        if (!result.confirm) return;
        wx.showLoading({ title: '正在删除' });
        callTournament('clearWithdrawnTeam', { eventId: this.data.eventId, teamId }).then(() => {
          wx.showToast({ title: '退赛记录已清除', icon: 'success' });
          this.loadData();
        }).catch((error) => wx.showToast({ title: error.message || '删除失败', icon: 'none' })).finally(() => wx.hideLoading());
      }
    });
  },
  closeRegistration() {
    wx.showModal({ title: '关闭球队招募', content: '关闭后现有邀请码立即失效，审核通过的球队可以继续编排对阵。', confirmText: '关闭招募', confirmColor: '#ff6500', success: (result) => {
      if (!result.confirm) return;
      callTournament('closeRegistration', { eventId: this.data.eventId }).then(() => { wx.showToast({ title: '招募已关闭', icon: 'success' }); this.loadData(); }).catch((error) => wx.showToast({ title: error.message || '操作失败', icon: 'none' }));
    } });
  },
  startRecruiting() {
    callTournament('update', { eventId: this.data.eventId, patch: { status: 'recruiting', registrationOpen: true } }).then(() => {
      wx.showToast({ title: '球队招募已开启', icon: 'success' }); this.loadData();
    }).catch((error) => wx.showToast({ title: error.message || '开启失败', icon: 'none' }));
  },
  onFormatChange(event) {
    const formatIndex = Number(event.detail.value); const key = this.data.formatKeys[formatIndex];
    this.setData({ formatIndex, selectedFormatText: this.data.formatOptions[formatIndex], showGroupSettings: key === 'group_knockout', schedulePreview: [], hasSchedulePreview: false });
  },
  changeScheduleNumber(event) {
    const field = event.currentTarget.dataset.field; const delta = Number(event.currentTarget.dataset.delta || 0);
    const min = field === 'groupCount' ? 2 : 1; const max = field === 'groupCount' ? 16 : 8;
    this.setData({ [field]: Math.max(min, Math.min(max, Number(this.data[field] || min) + delta)), schedulePreview: [], hasSchedulePreview: false });
  },
  changeMatchRuleNumber(event) {
    const field = event.currentTarget.dataset.field;
    const delta = Number(event.currentTarget.dataset.delta || 0);
    const min = 1;
    const max = field === 'periodCount' ? 8 : 30;
    if (!['periodCount', 'periodMinutes'].includes(field)) return;
    this.setData({ [field]: Math.max(min, Math.min(max, Number(this.data[field] || min) + delta)) });
  },
  saveMatchRules() {
    if (this.data.matchRulesSaving) return;
    const patch = { periodMinutes: Number(this.data.periodMinutes || 10), periodCount: Number(this.data.periodCount || 4) };
    this.setData({ matchRulesSaving: true });
    const request = this.data.isLocalOnly
      ? Promise.resolve(updateLocalTournament(this.data.eventId, patch))
      : callTournament('update', { eventId: this.data.eventId, patch });
    request.then(() => {
      wx.showToast({ title: '比赛设置已保存', icon: 'success' });
      this.loadData();
    }).catch((error) => wx.showToast({ title: error.message || '保存失败', icon: 'none' })).finally(() => this.setData({ matchRulesSaving: false }));
  },
  previewSchedule() {
    const competitionFormat = this.data.formatKeys[this.data.formatIndex];
    callTournament('previewSchedule', { eventId: this.data.eventId, competitionFormat, groupCount: this.data.groupCount, advanceCount: this.data.advanceCount }).then((result) => {
      const preview = list(result.matches).map((match, index) => this.decorateMatch(Object.assign({}, match, { matchId: `preview-${index}`, status: 'waiting' })));
      this.setData({ schedulePreview: preview, hasSchedulePreview: preview.length > 0, previewCount: preview.length });
    }).catch((error) => wx.showToast({ title: error.message || '无法生成对阵', icon: 'none' }));
  },
  publishSchedule() {
    if (!this.data.hasSchedulePreview) return;
    const competitionFormat = this.data.formatKeys[this.data.formatIndex];
    const replacingSchedule = this.data.hasMatches || list(this.data.matches).length > 0;
    const title = replacingSchedule ? '重新生成并发布对阵' : '发布球队对阵';
    const content = replacingSchedule
      ? `重新生成后，之前的所有比赛数据、比分和赛果将全部清空作废，并发布新的 ${this.data.previewCount} 场对阵。此操作不可撤销。`
      : `将发布 ${this.data.previewCount} 场对阵。发布后如需重新生成，旧比赛数据、比分和赛果将全部清空作废。`;
    wx.showModal({ title, content, confirmText: replacingSchedule ? '清空并发布' : '确认发布', confirmColor: '#d84034', success: (result) => {
      if (!result.confirm) return;
      wx.showLoading({ title: '正在发布' });
      callTournament('publishSchedule', { eventId: this.data.eventId, competitionFormat, groupCount: this.data.groupCount, advanceCount: this.data.advanceCount }).then(() => {
        wx.showToast({ title: '对阵已发布', icon: 'success' }); this.setData({ schedulePreview: [], hasSchedulePreview: false }); this.switchTab({ currentTarget: { dataset: { key: 'matches' } } }); this.loadData();
      }).catch((error) => wx.showToast({ title: error.message || '发布失败', icon: 'none' })).finally(() => wx.hideLoading());
    } });
  },
  swapHome(event) {
    const matchId = event.currentTarget.dataset.id;
    callTournament('swapHome', { eventId: this.data.eventId, matchId }).then(() => { wx.showToast({ title: '主客场已交换', icon: 'success' }); this.loadData(); }).catch((error) => wx.showToast({ title: error.message || '交换失败', icon: 'none' }));
  },
  advanceKnockout() {
    callTournament('advanceKnockout', { eventId: this.data.eventId }).then((result) => {
      wx.showToast({ title: result.completed ? '淘汰赛已完成' : '已生成下一轮', icon: 'success' }); this.loadData();
    }).catch((error) => wx.showToast({ title: error.message || '暂不能生成', icon: 'none' }));
  },
  openGame(event) {
    const matchId = event.currentTarget.dataset.id;
    const match = this.data.matches.find((item) => item.matchId === matchId);
    if (!match) return;
    if (match.status === 'completed') {
      wx.showModal({
        title: match.stageText,
        content: `${match.homeTeamName}  ${match.scoreText}  ${match.awayTeamName}`,
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    wx.navigateTo({ url: `/pages/match-preparation/index?matchId=${encodeURIComponent(match.matchId)}` });
    return;
    const homeSnapshot = this.data.teams.find((team) => String(team.teamId) === String(match.homeTeamId)) || {};
    const awaySnapshot = this.data.teams.find((team) => String(team.teamId) === String(match.awayTeamId)) || {};
    wx.setStorageSync('quickMatchActiveConfig', {
      mode: 'quick', source: 'tournament-league', tournamentId: this.data.eventId, gameId: match.matchId,
      tournamentName: this.data.tournament.name || '', groupName: match.groupKey ? `${match.groupKey}组` : '',
      matchName: `${match.homeTeamName} VS ${match.awayTeamName}`,
      homeTeam: { id: match.homeTeamId, name: match.homeTeamName, logoUrl: homeSnapshot.logo || homeSnapshot.logoUrl || homeSnapshot.logoFileID || '' },
      awayTeam: { id: match.awayTeamId, name: match.awayTeamName, logoUrl: awaySnapshot.logo || awaySnapshot.logoUrl || awaySnapshot.logoFileID || '' },
      periodMinutes: Number(this.data.tournament.periodMinutes || 10), periods: Number(this.data.tournament.periodCount || 4), createdAt: Date.now()
    });
    wx.navigateTo({ url: '/pages/scorer-board/index?mode=quick&boardOnly=1' });
  },
  syncLocalResults(matches) {
    if (!this.data.isCreator || this.data.syncInProgress) return;
    const records = list(wx.getStorageSync('sx_recent_matches'));
    const pending = matches.filter((match) => match.status !== 'completed').map((match) => {
      const record = records.find((item) => item.ended === true && String(item.tournamentId) === String(this.data.eventId) && String(item.gameId) === String(match.matchId));
      return record ? { match, record } : null;
    }).filter(Boolean);
    if (!pending.length) return;
    this.setData({ syncInProgress: true });
    let chain = Promise.resolve();
    pending.forEach(({ match, record }) => {
      chain = chain.then(() => callTournament('syncResult', { eventId: this.data.eventId, matchId: match.matchId, homeScore: record.homeScore, awayScore: record.awayScore }));
    });
    chain.then(() => this.loadData()).catch((error) => console.warn('[tournament-detail] local result sync failed', error)).finally(() => this.setData({ syncInProgress: false }));
  },
  noop() {}
});
