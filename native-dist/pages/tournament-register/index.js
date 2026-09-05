const {
  CLASS_OPTIONS,
  FORMAT_META,
  SCENARIO_META,
  buildClassIdentity,
  classIdentityError,
  callTournament,
  ensureClassTeamBinding,
  findClassTeam,
  readTeams,
  requirePhoneLogin,
  withTeamPlayers
} = require('../../utils/tournament-league');
const { callCloud } = require('../../utils/cloud');
const { requestTournamentSubscription } = require('../../utils/tournament-subscription');
const REGISTRATION_RETURN_KEY = 'sxfTournamentRegistrationCreatedTeam';

function parseScene(value) {
  let decoded = String(value || '');
  try { decoded = decodeURIComponent(decoded); } catch (error) {}
  const result = {};
  decoded.split('&').forEach((part) => {
    const index = part.indexOf('=');
    if (index > 0) result[part.slice(0, index)] = part.slice(index + 1);
  });
  return result;
}

function followGateErrorText(error) {
  const message = String(error && (error.message || error.errMsg) || '');
  if (message.indexOf('invalid appsecret') >= 0) return '服务号通知配置未完成，请联系管理员更新服务号 AppSecret';
  if (message.indexOf('access_token') >= 0) return '服务号关注二维码暂不可用，请稍后重试';
  return '服务号关注校验暂不可用，请稍后重试';
}

function buildTeamOptions(teams, selectedIndex) {
  return (teams || []).map((team, index) => {
    const snapshot = withTeamPlayers(team);
    return {
      index,
      name: team.name || '未命名球队',
      logo: team.logo || team.logoUrl || '',
      mark: String(team.name || '队').slice(0, 1),
      playerCountText: `${snapshot.players.length} 名球员`,
      coachText: team.coachName ? `教练 ${team.coachName}` : '球队资料已建立',
      selectedClass: index === selectedIndex ? 'selected' : '',
      selectedText: index === selectedIndex ? '已选择' : '选择'
    };
  });
}

function syncPendingServiceGrants() {
  const grants = wx.getStorageSync('sxfPendingServiceNotificationGrants');
  if (!grants || typeof grants !== 'object') return Promise.resolve();
  return callCloud('sxTournamentNotification', { action: 'recordAuthorization', grants }).then((result) => {
    if (result && result.ok) wx.removeStorageSync('sxfPendingServiceNotificationGrants');
  });
}

Page({
  data: {
    capsuleRight: 210, eventId: '', inviteKey: '', loading: true, loadFailed: false,
    eventName: '赛事报名', scenarioType: 'other', scenarioLabel: '赛事', formatLabel: '', organizationName: '',
    schoolStage: '', schoolStageLabel: '', gradeCode: '', gradeName: '', classScopeText: '',
    classOptions: CLASS_OPTIONS.map((item) => item.label), classIndex: 0, classText: '请选择班级', showCustomClassInput: false,
    teams: [], teamOptions: [], teamIndex: -1, selectedTeamText: '请选择参赛球队', selectedPlayerCount: 0, hasSelectedTeam: false, confirmDisabled: true,
    teamSelectionManual: false, createdTeamHint: '',
    form: { classCode: '', className: '', newTeamName: '' },
    showClassFields: false, showManualTeam: false, classBindingHint: '', submitting: false,
    registrationStatus: '', registrationTeamName: '', registrationReviewNote: '', rejectedNoticeText: '', showPendingState: false, showApprovedState: false, showRejectedNotice: false, showRegistrationForm: true, submitButtonText: '确认参赛',
    followRequired: false, followLoading: false, followReady: false, followGateId: '', followQr: '', followError: '', serviceNotificationAuthorized: false
  },
  onLoad(options = {}) {
    const scene = parseScene(options.scene);
    this.setData({ eventId: options.eventId || scene.e || '', inviteKey: options.inviteKey || scene.i || '' });
    this.setCapsuleSafeArea(); this.loadInvitation();
  },
  onShow() {
    const teams = readTeams();
    const created = wx.getStorageSync(REGISTRATION_RETURN_KEY) || null;
    const isCreatedForCurrentInvite = created && String(created.eventId || '') === String(this.data.eventId || '') && (!created.inviteKey || String(created.inviteKey) === String(this.data.inviteKey || ''));
    const createdIndex = isCreatedForCurrentInvite ? teams.findIndex((team) => String(team.sourceTeamId || '') === String(created.teamId || '') || String(team.sourceTeamId || '') === String(created.teamKey || '')) : -1;
    const selectedIndex = createdIndex >= 0 ? createdIndex : (this.data.teamIndex >= 0 && this.data.teamIndex < teams.length ? this.data.teamIndex : -1);
    this.setData({
      teams, teamOptions: buildTeamOptions(teams, selectedIndex), teamIndex: selectedIndex,
      selectedTeamText: selectedIndex >= 0 ? teams[selectedIndex].name : this.data.selectedTeamText,
      selectedPlayerCount: selectedIndex >= 0 ? withTeamPlayers(teams[selectedIndex]).players.length : 0,
      hasSelectedTeam: selectedIndex >= 0, confirmDisabled: selectedIndex < 0,
      teamSelectionManual: selectedIndex >= 0,
      createdTeamHint: createdIndex >= 0 ? `“${teams[createdIndex].name}”已创建并自动选中。` : ''
    }, () => {
      this.refreshClassBinding();
      if (createdIndex >= 0) {
        wx.removeStorageSync(REGISTRATION_RETURN_KEY);
        if (created.autoSubmit === true && this.data.followReady && this.data.serviceNotificationAuthorized && !this.autoSubmittingCreatedTeam) {
          const redirect = `/pages/tournament-register/index?eventId=${encodeURIComponent(this.data.eventId)}&inviteKey=${encodeURIComponent(this.data.inviteKey)}`;
          if (requirePhoneLogin(redirect, '登录后才能提交参赛球队。')) {
            this.autoSubmittingCreatedTeam = true;
            setTimeout(() => this.submitTeam(), 180);
          }
        }
      }
    });
    if (this.data.eventId && this.data.inviteKey) this.loadServiceBindingStatus(false);
    else if (this.data.followGateId && !this.data.followReady) this.checkFollowGate();
  },
  onUnload() { this.stopFollowPolling(); },
  setCapsuleSafeArea() {
    try {
      const capsule = wx.getMenuButtonBoundingClientRect();
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.setData({ capsuleRight: Math.max(210, (info.windowWidth - capsule.left + 12) * 2) });
    } catch (error) {}
  },
  loadInvitation() {
    if (!this.data.inviteKey) { this.setData({ loading: false, loadFailed: true }); return; }
    callTournament('getInvitation', { inviteKey: this.data.inviteKey }).then((result) => {
      const tournament = result.tournament;
      const scenario = SCENARIO_META[tournament.scenarioType] || SCENARIO_META.other;
      const format = FORMAT_META[tournament.competitionFormat] || FORMAT_META.single_round_robin;
      const stageLabels = { primary: '小学', junior: '初中', senior: '高中' };
      this.setData({
        loading: false, loadFailed: false, eventId: tournament.eventId, eventName: tournament.name,
        scenarioType: tournament.scenarioType, scenarioLabel: scenario.label, formatLabel: format.label,
        organizationName: tournament.organizationName || '', schoolStage: tournament.schoolStage || '',
        schoolStageLabel: stageLabels[tournament.schoolStage] || '', gradeCode: tournament.gradeCode || '', gradeName: tournament.gradeName || '',
        classScopeText: [stageLabels[tournament.schoolStage], tournament.gradeName].filter(Boolean).join(' · '),
        showClassFields: tournament.scenarioType === 'class_league', showManualTeam: false, followRequired: true, teams: readTeams(), teamOptions: buildTeamOptions(readTeams(), -1)
      }, () => { this.refreshClassBinding(); this.loadServiceBindingStatus(true); this.loadMyRegistration(); });
    }).catch((error) => {
      console.warn('[tournament-register] invitation failed', error);
      this.setData({ loading: false, loadFailed: true });
    });
  },
  onClassChange(event) {
    const classIndex = Number(event.detail.value);
    const selected = CLASS_OPTIONS[classIndex];
    if (!selected) return;
    const custom = selected.key === 'custom';
    this.setData({
      classIndex, classText: selected.label, showCustomClassInput: custom,
      'form.classCode': selected.key, 'form.className': custom ? '' : selected.label
    }, () => this.refreshClassBinding());
  },
  onTeamChange(event) {
    const teamIndex = Number(event.detail.value);
    this.selectTeamByIndex(teamIndex);
  },
  selectTeam(event) {
    this.selectTeamByIndex(Number(event.currentTarget.dataset.index));
  },
  selectTeamByIndex(teamIndex) {
    const team = this.data.teams[teamIndex];
    if (!team) return;
    const snapshot = withTeamPlayers(team);
    this.setData({ teamIndex, teamOptions: buildTeamOptions(this.data.teams, teamIndex), selectedTeamText: team.name, selectedPlayerCount: snapshot.players.length, hasSelectedTeam: true, confirmDisabled: false, teamSelectionManual: true, showManualTeam: false }, () => this.refreshClassBinding());
  },
  onInput(event) {
    const field = event.currentTarget.dataset.field;
    if (field) this.setData({ [`form.${field}`]: event.detail.value }, () => {
      if (field === 'className') this.refreshClassBinding();
    });
  },
  getClassIdentity() {
    return buildClassIdentity({
      schoolName: this.data.organizationName, schoolStage: this.data.schoolStage,
      gradeCode: this.data.gradeCode, gradeName: this.data.gradeName,
      classCode: this.data.form.classCode, className: this.data.form.className
    });
  },
  refreshClassBinding() {
    if (!this.data.showClassFields) return;
    const identity = this.getClassIdentity();
    if (!identity.schoolName || !identity.schoolStage || !identity.gradeCode || !identity.className) {
      const reset = this.data.teamSelectionManual ? {} : { teamIndex: -1, teamOptions: buildTeamOptions(this.data.teams, -1), selectedTeamText: '选择已有球队', selectedPlayerCount: 0, hasSelectedTeam: false };
      this.setData(Object.assign({ classBindingHint: '请选择班级，系统将匹配或创建对应的班级队。', confirmDisabled: true }, reset)); return;
    }
    const teams = this.data.teams.length ? this.data.teams : readTeams();
    const matched = findClassTeam(teams, identity);
    if (matched) {
      const teamIndex = teams.findIndex((team) => team.sourceTeamId === matched.sourceTeamId);
      const snapshot = withTeamPlayers(matched);
      this.setData({
        teamIndex, teamOptions: buildTeamOptions(teams, teamIndex), selectedTeamText: matched.name, selectedPlayerCount: snapshot.players.length, hasSelectedTeam: true, confirmDisabled: false, teamSelectionManual: false,
        classBindingHint: `已匹配“${matched.name}”，将复用该球队及 ${snapshot.players.length} 名球员。`
      });
      return;
    }
    const selected = this.data.teamSelectionManual ? teams[this.data.teamIndex] : null;
    this.setData({
      teamIndex: selected ? this.data.teamIndex : -1,
      selectedTeamText: selected ? selected.name : '选择已有球队',
      selectedPlayerCount: selected ? withTeamPlayers(selected).players.length : 0,
      hasSelectedTeam: !!selected,
      confirmDisabled: false,
      classBindingHint: selected ? `将把“${selected.name}”绑定为${identity.classDisplayName}。` : `将自动创建“${identity.classDisplayName}”班级队。`
    });
  },
  createTeam() { wx.navigateTo({ url: `/pages/team-create/index?from=tournament-register&eventId=${encodeURIComponent(this.data.eventId)}&inviteKey=${encodeURIComponent(this.data.inviteKey)}` }); },
  applyRegistration(registration) {
    const status = registration && registration.status || '';
    const patch = {
      registrationStatus: status,
      registrationTeamName: registration && registration.name || '',
      registrationReviewNote: registration && registration.reviewNote || '',
      rejectedNoticeText: registration && registration.reviewNote || '请补充资料后重新提交报名。',
      showPendingState: status === 'pending',
      showApprovedState: status === 'approved',
      showRejectedNotice: status === 'rejected',
      showRegistrationForm: !status || status === 'rejected',
      submitButtonText: status === 'rejected' ? '重新确认参赛' : '确认参赛'
    };
    this.setData(patch);
  },
  loadMyRegistration() {
    if (!this.data.eventId) return;
    callTournament('getMyRegistration', { eventId: this.data.eventId }).then((result) => this.applyRegistration(result.registration)).catch(() => {});
  },
  refreshRegistrationStatus() {
    wx.showLoading({ title: '正在查询' });
    callTournament('getMyRegistration', { eventId: this.data.eventId }).then((result) => {
      this.applyRegistration(result.registration);
      wx.showToast({ title: result.registration ? '状态已更新' : '暂无报名记录', icon: 'none' });
    }).catch((error) => wx.showToast({ title: error.message || '查询失败', icon: 'none' })).finally(() => wx.hideLoading());
  },
  prepareFollowGate() {
    if (!this.data.followRequired || !this.data.eventId || !this.data.inviteKey || this.data.followLoading || this.data.followReady) return;
    this.setData({ followLoading: true, followError: '' });
    callCloud('sxTournamentNotification', { action: 'createFollowGate', eventId: this.data.eventId, inviteKey: this.data.inviteKey }).then((result) => {
      if (!result || !result.ok) throw new Error(result && result.message || '关注校验初始化失败');
      this.setData({ followReady: result.followed === true, followGateId: result.gateId || '', followQr: result.qrUrl || '' });
      if (result.followed === true) this.stopFollowPolling();
      else this.startFollowPolling();
    }).catch((error) => this.setData({ followError: followGateErrorText(error) })).finally(() => this.setData({ followLoading: false }));
  },
  loadServiceBindingStatus(promptWhenUnbound) {
    if (this.data.followLoading) return Promise.resolve(false);
    this.setData({ followLoading: true, followError: '' });
    return syncPendingServiceGrants().catch(() => {}).then(() => callCloud('sxTournamentNotification', { action: 'bindingStatus' })).then((result) => {
      const bound = !!(result && result.ok && result.bound);
      const grants = result && result.grants || {};
      const authorized = grants.review === true && grants.announcement === true;
      this.setData({
        followRequired: !bound,
        followReady: bound,
        serviceNotificationAuthorized: authorized,
        followQr: bound ? '' : this.data.followQr,
        followGateId: bound ? '' : this.data.followGateId,
        followError: ''
      });
      if (bound) this.stopFollowPolling();
      if (!bound && promptWhenUnbound === true) {
        this.setData({ followRequired: true, followLoading: false }, () => this.prepareFollowGate());
      }
      return bound;
    }).catch((error) => {
      this.setData({ followError: followGateErrorText(error) });
      return false;
    }).finally(() => {
      if (!(promptWhenUnbound === true && !this.data.followReady)) this.setData({ followLoading: false });
    });
  },
  enableServiceNotice() {
    if (this.data.followReady) { wx.showToast({ title: '服务号通知已开启', icon: 'success' }); return; }
    this.setData({ followRequired: true, followError: '' }, () => this.prepareFollowGate());
  },
  openServiceSubscription() {
    this.loadServiceBindingStatus(true).then((bound) => {
      if (!bound) return;
      if (this.data.serviceNotificationAuthorized) { wx.showToast({ title: '通知授权已完成', icon: 'success' }); return; }
      wx.showModal({ title: '完成通知授权', content: '请打开赛小蜂篮球服务号，点击绑定后自动回复的“赛事通知授权”卡片。如未收到，再发送“授权”。', showCancel: false, confirmText: '知道了' });
    });
  },
  startFollowPolling() { this.stopFollowPolling(); this.followPollTimer = setInterval(() => this.checkFollowGate(), 3000); },
  stopFollowPolling() { if (this.followPollTimer) clearInterval(this.followPollTimer); this.followPollTimer = null; },
  checkFollowGate() {
    if (!this.data.followGateId || this.data.followReady || this.followChecking) return;
    this.followChecking = true;
    callCloud('sxTournamentNotification', { action: 'checkFollowGate', gateId: this.data.followGateId }).then((result) => {
      if (result && result.ok && result.ready) {
        this.stopFollowPolling(); this.setData({ followReady: true, followError: '' });
        wx.showToast({ title: '关注已确认，可以报名', icon: 'success' });
        setTimeout(() => this.openServiceSubscription(), 400);
      }
    }).catch((error) => console.warn('[tournament-register] follow check failed', error)).finally(() => { this.followChecking = false; });
  },
  buildTeam() {
    const selected = this.data.teams[this.data.teamIndex];
    if (this.data.showClassFields) return ensureClassTeamBinding(this.getClassIdentity(), selected || null);
    if (selected) return withTeamPlayers(selected);
    return { name: String(this.data.form.newTeamName || '').trim(), players: [] };
  },
  submit() {
    const redirect = `/pages/tournament-register/index?eventId=${encodeURIComponent(this.data.eventId)}&inviteKey=${encodeURIComponent(this.data.inviteKey)}`;
    if (!requirePhoneLogin(redirect, '登录后才能提交参赛球队。')) return;
    if (this.data.followRequired && !this.data.followReady) { wx.showToast({ title: '请先关注服务号后再报名', icon: 'none' }); return; }
    if (!this.data.serviceNotificationAuthorized) {
      wx.showModal({ title: '需要开启赛事通知', content: '请先授权审核结果提醒和赛事公告提醒，再提交报名。', showCancel: false, confirmText: '去授权', success: () => this.openServiceSubscription() });
      return;
    }
    if (!this.data.showClassFields && !this.data.hasSelectedTeam) { wx.showToast({ title: '请先选择一支参赛球队', icon: 'none' }); return; }
    if (this.data.showClassFields) {
      const classError = classIdentityError(this.getClassIdentity());
      if (classError) { wx.showToast({ title: classError, icon: 'none' }); return; }
    }
    if (this.data.submitting) return;
    requestTournamentSubscription('review').then((accepted) => {
      if (accepted) { this.submitTeam(); return; }
      wx.showModal({ title: '需要开启审核通知', content: '请允许接收审核结果通知后再提交报名。', showCancel: false, confirmText: '知道了' });
    });
  },
  submitTeam() {
    let team;
    try { team = this.buildTeam(); } catch (error) { wx.showToast({ title: error.message, icon: 'none' }); return; }
    if (!team.name) { wx.showToast({ title: '请选择或填写球队', icon: 'none' }); return; }
    this.setData({ submitting: true }); wx.showLoading({ title: '正在提交' });
    callTournament('submitTeam', { inviteKey: this.data.inviteKey, team }).then((result) => {
      this.applyRegistration(result.team); wx.showToast({ title: '参赛确认已发送给主办方', icon: 'success' });
    }).catch((error) => wx.showToast({ title: error.message || '提交失败', icon: 'none' })).finally(() => {
      wx.hideLoading(); this.autoSubmittingCreatedTeam = false; this.setData({ submitting: false });
    });
  },
  goTournament() { wx.redirectTo({ url: '/pages/tournament/index' }); },
  retry() { this.setData({ loading: true }); this.loadInvitation(); }
});
