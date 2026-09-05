const {
  CLASS_OPTIONS,
  FORMAT_META,
  GRADE_OPTIONS,
  SCENARIO_META,
  SCHOOL_STAGES,
  buildClassIdentity,
  classIdentityError,
  callTournament,
  ensureClassTeamBinding,
  findClassTeam,
  isCloudUnavailable,
  getLocalTournamentResult,
  readTeams,
  requirePhoneLogin,
  saveLocalTournament,
  updateLocalTournament,
  withTeamPlayers
} = require('../../utils/tournament-league');

const FORMATS = ['single_round_robin', 'double_round_robin', 'group_knockout'];
const SCENARIO_COPY = {
  class_league: {
    namePlaceholder: '例如：三年级班班赛',
    organizationLabel: '学校',
    organizationPlaceholder: '请输入学校名称',
    descriptionPlaceholder: '填写班级参赛说明或赛事约定'
  },
  institution_weekly: {
    namePlaceholder: '例如：蜂动篮球秋季周赛',
    organizationLabel: '主办机构',
    organizationPlaceholder: '请输入机构名称',
    descriptionPlaceholder: '填写参赛球队说明或周赛约定'
  },
  other: {
    namePlaceholder: '例如：城市青少年篮球杯赛',
    organizationLabel: '主办方',
    organizationPlaceholder: '请输入主办方名称',
    descriptionPlaceholder: '填写参赛说明或赛事约定'
  }
};

Page({
  data: {
    capsuleRight: 210,
    scenarioType: 'other', scenarioLabel: '其他赛事', pageTitle: '创建赛事', scenarioHint: '',
    namePlaceholder: SCENARIO_COPY.other.namePlaceholder,
    organizationLabel: SCENARIO_COPY.other.organizationLabel,
    organizationPlaceholder: SCENARIO_COPY.other.organizationPlaceholder,
    descriptionPlaceholder: SCENARIO_COPY.other.descriptionPlaceholder,
    form: {
      name: '', organizationName: '', schoolName: '', schoolStage: '', gradeCode: '', gradeName: '',
      classCode: '', className: '', description: '', competitionFormat: 'single_round_robin',
      winPoints: 2, lossPoints: 1, forfeitPoints: 0, groupCount: 2, advanceCount: 2
    },
    stageOptions: SCHOOL_STAGES.map((item) => item.label), stageIndex: 0, stageText: '请选择学段',
    gradeOptions: [], gradeLabels: [], gradeIndex: 0, gradeText: '请先选择学段',
    classOptions: CLASS_OPTIONS.map((item) => item.label), classIndex: 0, classText: '请选择班级', showCustomClassInput: false,
    formats: FORMATS.map((key) => FORMAT_META[key].label), formatIndex: 0, selectedFormatText: FORMAT_META.single_round_robin.label,
    teams: [], teamIndex: -1, selectedTeamText: '选择本队', selectedPlayerCount: 0, hasSelectedTeam: false,
    teamPickerLabel: '选择本队', showTeamEmpty: false, teamSelectionManual: false,
    classBindingHint: '选择学段、年级和班级后，系统将匹配或创建班级队。',
    showClassFields: false, showOrganizationField: true, showGroupFields: false, requireTeam: false, saving: false,
    isEditing: false, editingEventId: '', originalTournament: null, originalCreatorTeam: null,
    submitPrimaryText: '创建并开始招募', primaryActionClass: 'primary', showDraftAction: true, editingLocked: false, showEditLockedNote: false
  },
  onLoad(options = {}) {
    const scenarioType = SCENARIO_META[options.scenarioType] ? options.scenarioType : 'other';
    this.configureScenario(scenarioType);
    const eventId = decodeURIComponent(String(options.id || options.eventId || ''));
    if (eventId) this.loadExisting(eventId);
    this.setCapsuleSafeArea();
  },
  configureScenario(scenarioType) {
    const meta = SCENARIO_META[scenarioType];
    const scenarioCopy = SCENARIO_COPY[scenarioType] || SCENARIO_COPY.other;
    const hints = {
      class_league: '面向学校班级，以班级为参赛队，通过二维码邀请其他班级报名。',
      institution_weekly: '面向篮球机构，不绑定自然周，只按轮次生成球队对阵。',
      other: '用于杯赛、友谊赛等通用赛事，保留原有赛事场景。'
    };
    this.setData({
      scenarioType, scenarioLabel: meta.label, pageTitle: `创建${meta.label}`, scenarioHint: hints[scenarioType],
      namePlaceholder: scenarioCopy.namePlaceholder, organizationLabel: scenarioCopy.organizationLabel,
      organizationPlaceholder: scenarioCopy.organizationPlaceholder, descriptionPlaceholder: scenarioCopy.descriptionPlaceholder,
      showClassFields: scenarioType === 'class_league', showOrganizationField: scenarioType !== 'class_league',
      requireTeam: scenarioType === 'institution_weekly', teams: readTeams(),
      teamPickerLabel: scenarioType === 'class_league' ? '绑定已有球队（可选）' : '选择本队',
      showTeamEmpty: scenarioType !== 'class_league' && readTeams().length === 0
    });
  },
  loadExisting(eventId) {
    const localResult = getLocalTournamentResult(eventId);
    const request = localResult ? Promise.resolve(localResult) : callTournament('get', { eventId });
    request.then((result) => {
      if (result.role !== 'creator') throw new Error('只有赛事创建者可以编辑赛事');
      const tournament = result.tournament || {};
      const creatorTeam = (result.teams || []).find((team) => team.source === 'creator') || null;
      const scenarioType = SCENARIO_META[tournament.scenarioType] ? tournament.scenarioType : 'other';
      this.configureScenario(scenarioType);
      const teams = readTeams();
      const form = {
        name: tournament.name || '',
        organizationName: scenarioType === 'class_league' ? '' : (tournament.organizationName || ''),
        schoolName: scenarioType === 'class_league' ? (creatorTeam && creatorTeam.schoolName || tournament.organizationName || '') : '',
        schoolStage: tournament.schoolStage || creatorTeam && creatorTeam.schoolStage || '',
        gradeCode: tournament.gradeCode || creatorTeam && creatorTeam.gradeCode || '',
        gradeName: tournament.gradeName || creatorTeam && creatorTeam.gradeName || '',
        classCode: creatorTeam && creatorTeam.classCode || '',
        className: creatorTeam && creatorTeam.className || '',
        description: tournament.description || '',
        competitionFormat: tournament.competitionFormat || 'single_round_robin',
        winPoints: Number(tournament.pointsRule && tournament.pointsRule.win || 2),
        lossPoints: Number(tournament.pointsRule && tournament.pointsRule.loss || 1),
        forfeitPoints: Number(tournament.pointsRule && tournament.pointsRule.forfeit || 0),
        groupCount: Number(tournament.groupCount || 2), advanceCount: Number(tournament.advanceCount || 2)
      };
      const stageIndex = Math.max(0, SCHOOL_STAGES.findIndex((item) => item.key === form.schoolStage));
      const stage = SCHOOL_STAGES[stageIndex];
      const gradeOptions = stage ? (GRADE_OPTIONS[stage.key] || []) : [];
      const gradeIndex = Math.max(0, gradeOptions.findIndex((item) => item.key === form.gradeCode));
      const classIndex = Math.max(0, CLASS_OPTIONS.findIndex((item) => item.key === form.classCode));
      const selected = creatorTeam && teams.find((team) => String(team.sourceTeamId) === String(creatorTeam.sourceTeamId));
      const teamIndex = selected ? teams.findIndex((team) => team.sourceTeamId === selected.sourceTeamId) : -1;
      const formatIndex = Math.max(0, FORMATS.indexOf(form.competitionFormat));
      const editingLocked = (result.matches || []).length > 0;
      this.setData({
        teams, form, isEditing: true, editingEventId: eventId, originalTournament: tournament, originalCreatorTeam: creatorTeam,
        pageTitle: `编辑${SCENARIO_META[scenarioType].label}`, submitPrimaryText: '保存修改', primaryActionClass: 'primary full', showDraftAction: false,
        stageIndex, stageText: form.schoolStage ? (stage && stage.label || '请选择学段') : '请选择学段',
        gradeOptions, gradeLabels: gradeOptions.map((item) => item.label), gradeIndex,
        gradeText: form.gradeName || '请选择年级', classIndex, classText: form.className || '请选择班级',
        showCustomClassInput: form.classCode === 'custom', formatIndex, selectedFormatText: this.data.formats[formatIndex],
        showGroupFields: form.competitionFormat === 'group_knockout', teamIndex,
        selectedTeamText: selected ? selected.name : (creatorTeam && creatorTeam.name || '选择本队'),
        selectedPlayerCount: selected ? withTeamPlayers(selected).players.length : (creatorTeam && creatorTeam.players || []).length,
        hasSelectedTeam: !!(selected || creatorTeam), teamSelectionManual: !!selected,
        editingLocked, showEditLockedNote: editingLocked
      }, () => this.refreshClassBinding());
    }).catch((error) => {
      wx.showToast({ title: error.message || '赛事信息加载失败', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 500);
    });
  },
  onShow() {
    const teams = readTeams();
    this.setData({ teams, showTeamEmpty: !this.data.showClassFields && teams.length === 0 }, () => this.refreshClassBinding());
    if (this.data.teamIndex >= teams.length) this.setData({ teamIndex: -1, selectedTeamText: '选择本队', selectedPlayerCount: 0, hasSelectedTeam: false });
  },
  setCapsuleSafeArea() {
    try {
      const capsule = wx.getMenuButtonBoundingClientRect();
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.setData({ capsuleRight: Math.max(210, (info.windowWidth - capsule.left + 12) * 2) });
    } catch (error) {}
  },
  goBack() { wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/tournament/index' }) }); },
  onInput(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    if (this.data.editingLocked && ['schoolName', 'className'].includes(field)) return;
    this.setData({ [`form.${field}`]: event.detail.value }, () => {
      if (field === 'schoolName' || field === 'className') this.refreshClassBinding();
    });
  },
  onStageChange(event) {
    if (this.data.editingLocked) return;
    const stageIndex = Number(event.detail.value);
    const stage = SCHOOL_STAGES[stageIndex];
    if (!stage) return;
    const grades = GRADE_OPTIONS[stage.key] || [];
    this.setData({
      stageIndex, stageText: stage.label, 'form.schoolStage': stage.key,
      'form.gradeCode': '', 'form.gradeName': '', gradeOptions: grades, gradeLabels: grades.map((item) => item.label),
      gradeIndex: 0, gradeText: '请选择年级'
    }, () => this.refreshClassBinding());
  },
  onGradeChange(event) {
    if (this.data.editingLocked) return;
    const gradeIndex = Number(event.detail.value);
    const grade = this.data.gradeOptions[gradeIndex];
    if (!grade) return;
    this.setData({ gradeIndex, gradeText: grade.label, 'form.gradeCode': grade.key, 'form.gradeName': grade.label }, () => this.refreshClassBinding());
  },
  onClassChange(event) {
    if (this.data.editingLocked) return;
    const classIndex = Number(event.detail.value);
    const selected = CLASS_OPTIONS[classIndex];
    if (!selected) return;
    const custom = selected.key === 'custom';
    this.setData({
      classIndex, classText: selected.label, showCustomClassInput: custom,
      'form.classCode': selected.key, 'form.className': custom ? '' : selected.label
    }, () => this.refreshClassBinding());
  },
  getClassIdentity() { return buildClassIdentity(this.data.form); },
  refreshClassBinding() {
    if (!this.data.showClassFields) return;
    const identity = this.getClassIdentity();
    if (!identity.schoolName || !identity.schoolStage || !identity.gradeCode || !identity.className) {
      const reset = this.data.teamSelectionManual ? {} : { teamIndex: -1, selectedTeamText: '选择本队', selectedPlayerCount: 0, hasSelectedTeam: false };
      this.setData(Object.assign({ classBindingHint: '选择学段、年级和班级后，系统将匹配或创建班级队。' }, reset));
      return;
    }
    const teams = this.data.teams.length ? this.data.teams : readTeams();
    const matched = findClassTeam(teams, identity);
    if (matched) {
      const teamIndex = teams.findIndex((team) => team.sourceTeamId === matched.sourceTeamId);
      const snapshot = withTeamPlayers(matched);
      this.setData({
        teamIndex, selectedTeamText: matched.name, selectedPlayerCount: snapshot.players.length, hasSelectedTeam: true, teamSelectionManual: false,
        classBindingHint: `已匹配“${matched.name}”，将复用该球队及 ${snapshot.players.length} 名球员。`
      });
      return;
    }
    const selected = this.data.teamSelectionManual ? teams[this.data.teamIndex] : null;
    this.setData({
      teamIndex: selected ? this.data.teamIndex : -1,
      selectedTeamText: selected ? selected.name : '选择本队',
      selectedPlayerCount: selected ? withTeamPlayers(selected).players.length : 0,
      hasSelectedTeam: !!selected,
      classBindingHint: selected
        ? `将把“${selected.name}”绑定为${identity.classDisplayName}。`
        : `将自动创建“${identity.classDisplayName}”班级队。`
    });
  },
  onTeamChange(event) {
    if (this.data.editingLocked) return;
    const teamIndex = Number(event.detail.value);
    const team = this.data.teams[teamIndex];
    if (!team) return;
    const snapshot = withTeamPlayers(team);
    this.setData({ teamIndex, selectedTeamText: team.name, selectedPlayerCount: snapshot.players.length, hasSelectedTeam: true, teamSelectionManual: true }, () => this.refreshClassBinding());
  },
  onFormatChange(event) {
    if (this.data.editingLocked) return;
    const formatIndex = Number(event.detail.value);
    const competitionFormat = FORMATS[formatIndex] || FORMATS[0];
    this.setData({ formatIndex, selectedFormatText: this.data.formats[formatIndex], 'form.competitionFormat': competitionFormat, showGroupFields: competitionFormat === 'group_knockout' });
  },
  changeNumber(event) {
    const field = event.currentTarget.dataset.field;
    const delta = Number(event.currentTarget.dataset.delta || 0);
    const ranges = { winPoints: [0, 20], lossPoints: [0, 20], forfeitPoints: [0, 20], groupCount: [2, 16], advanceCount: [1, 8] };
    if (!ranges[field] || this.data.editingLocked) return;
    const current = Number(this.data.form[field] || 0);
    this.setData({ [`form.${field}`]: Math.max(ranges[field][0], Math.min(ranges[field][1], current + delta)) });
  },
  goCreateTeam() { wx.navigateTo({ url: '/pages/team-create/index?from=tournament-create' }); },
  buildCreatorTeam() {
    const selected = this.data.teams[this.data.teamIndex];
    if (this.data.scenarioType === 'class_league') return ensureClassTeamBinding(this.getClassIdentity(), selected || null);
    return selected ? withTeamPlayers(selected) : this.data.originalCreatorTeam || null;
  },
  validate() {
    const form = this.data.form;
    if (!String(form.name || '').trim()) return '请填写赛事名称';
    if (this.data.scenarioType === 'class_league') {
      const classError = classIdentityError(form);
      if (classError) return classError;
    }
    if (this.data.requireTeam && this.data.teamIndex < 0) return '请选择本机构参赛球队';
    if (form.competitionFormat === 'group_knockout') {
      const qualifiers = Number(form.advanceCount) * Number(form.groupCount);
      if ((qualifiers & (qualifiers - 1)) !== 0) return '晋级球队总数需为 2、4、8 或 16';
    }
    return '';
  },
  submit(event) {
    const status = this.data.isEditing
      ? String(this.data.originalTournament && this.data.originalTournament.status || 'recruiting')
      : (event.currentTarget.dataset.status === 'draft' ? 'draft' : 'recruiting');
    if (!requirePhoneLogin('/pages/tournament-create/index')) return;
    const error = this.validate();
    if (error) { wx.showToast({ title: error, icon: 'none' }); return; }
    if (this.data.saving) return;
    let creatorTeam;
    try { creatorTeam = this.buildCreatorTeam(); } catch (bindingError) { wx.showToast({ title: bindingError.message, icon: 'none' }); return; }
    const form = this.data.form;
    this.setData({ saving: true }); wx.showLoading({ title: '正在创建' });
    const tournamentPayload = {
      tournament: {
        name: String(form.name).trim(), scenarioType: this.data.scenarioType,
        organizationName: this.data.scenarioType === 'class_league' ? String(form.schoolName).trim() : String(form.organizationName).trim(),
        schoolStage: form.schoolStage, gradeCode: form.gradeCode, gradeName: form.gradeName,
        description: String(form.description || '').trim(), competitionFormat: form.competitionFormat, status,
        pointsRule: { win: Number(form.winPoints), loss: Number(form.lossPoints), forfeit: Number(form.forfeitPoints) },
        groupCount: Number(form.groupCount), advanceCount: Number(form.advanceCount)
      }, creatorTeam
    };
    const request = this.data.isEditing
      ? (getLocalTournamentResult(this.data.editingEventId)
        ? Promise.resolve(updateLocalTournament(this.data.editingEventId, tournamentPayload.tournament, creatorTeam))
        : callTournament('update', { eventId: this.data.editingEventId, patch: tournamentPayload.tournament, creatorTeam }))
      : callTournament('create', tournamentPayload).catch((requestError) => {
        if (!isCloudUnavailable(requestError)) throw requestError;
        return saveLocalTournament(tournamentPayload);
      });
    request.then((result) => {
      const title = this.data.isEditing ? '赛事已更新' : (result.localOnly ? '已保存到赛事' : (status === 'draft' ? '草稿已保存' : '赛事已创建'));
      wx.showToast({ title, icon: 'success' });
      const eventId = this.data.isEditing ? this.data.editingEventId : result.tournament.eventId;
      setTimeout(() => wx.redirectTo({ url: `/pages/tournament-detail/index?id=${encodeURIComponent(eventId)}` }), 350);
    }).catch((requestError) => wx.showToast({ title: requestError.message || '创建失败', icon: 'none' })).finally(() => {
      wx.hideLoading(); this.setData({ saving: false });
    });
  }
});
