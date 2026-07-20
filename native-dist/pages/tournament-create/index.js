const typeOptions = ['联赛', '杯赛', '训练营赛', '友谊赛'];
const ageOptions = ['不限年龄', 'U8（6-8岁）', 'U10（8-10岁）', 'U12（10-12岁）', 'U15（13-15岁）', '成人组'];
const systemOptions = ['积分循环赛', '小组赛 + 淘汰赛', '单败淘汰赛', '双败淘汰赛', '单循环赛'];

const numberLimits = {
  teamCount: { min: 2, max: 64 },
  playerLimit: { min: 5, max: 30 },
  periodMinutes: { min: 1, max: 15 },
  periodCount: { min: 1, max: 8 },
  overtimeMinutes: { min: 0, max: 10 },
  timeoutCount: { min: 0, max: 10 }
};

function todayText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysText(days) {
  const target = new Date();
  target.setDate(target.getDate() + days);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getImageExtension(filePath) {
  const match = String(filePath || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const extension = match ? match[1].toLowerCase() : 'jpg';
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
}

function uploadTournamentLogo(filePath) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.uploadFile) {
      reject(new Error('云存储未初始化'));
      return;
    }
    const extension = getImageExtension(filePath);
    const random = Math.random().toString(36).slice(2, 8);
    wx.cloud.uploadFile({
      cloudPath: `tournament-logos/${Date.now()}-${random}.${extension}`,
      filePath,
      success: (result) => {
        const fileID = result && result.fileID;
        if (fileID) resolve(fileID);
        else reject(new Error('赛事 Logo 上传未返回云文件 ID'));
      },
      fail: reject
    });
  });
}

function createDefaultForm() {
  return {
    logoUrl: '',
    name: '',
    type: typeOptions[0],
    startDate: todayText(),
    endDate: addDaysText(14),
    registrationDeadline: addDaysText(7),
    venue: '',
    ageGroup: ageOptions[2],
    teamCount: 12,
    system: systemOptions[0],
    playerLimit: 15,
    openRegistration: true,
    requireApproval: true,
    periodMinutes: 10,
    periodCount: 4,
    overtimeMinutes: 3,
    timeoutCount: 2,
    enableStats: true,
    showLiveScore: true
  };
}

Page({
  data: {
    form: createDefaultForm(),
    hasName: false,
    typeOptions,
    ageOptions,
    systemOptions,
    uploadingLogo: false,
    editingTournamentId: '',
    originalTournament: null,
    pageTitle: '创建赛事',
    primaryActionText: '保存并创建',
    typeIndex: 0,
    ageIndex: 2,
    systemIndex: 0
  },

  onLoad(options) {
    const id = decodeURIComponent(String(options && options.id || ''));
    if (!id) return;
    const stored = wx.getStorageSync('tournaments') || [];
    const item = (Array.isArray(stored) ? stored : []).find((entry) => String(entry.id) === id);
    if (!item) {
      wx.showToast({ title: '未找到该赛事', icon: 'none' });
      return;
    }

    const defaults = createDefaultForm();
    const startDate = item.startDate || String(item.date || '').split(' ~ ')[0] || defaults.startDate;
    const endDate = item.endDate || String(item.date || '').split(' ~ ')[1] || defaults.endDate;
    const form = Object.assign({}, defaults, {
      logoUrl: item.logoUrl || item.logoFileID || item.logo || '',
      name: item.name || '',
      type: item.type || defaults.type,
      startDate,
      endDate,
      registrationDeadline: item.registrationDeadline || startDate,
      venue: item.venue || item.location || '',
      ageGroup: item.ageGroup || defaults.ageGroup,
      teamCount: Number(item.teams || defaults.teamCount),
      system: item.system || defaults.system,
      playerLimit: Number(item.playerLimit || defaults.playerLimit),
      openRegistration: item.openRegistration !== false,
      requireApproval: item.requireApproval !== false,
      periodMinutes: Number(item.periodMinutes || defaults.periodMinutes),
      periodCount: Number(item.periodCount || item.periods || defaults.periodCount),
      overtimeMinutes: Number(item.overtimeMinutes || defaults.overtimeMinutes),
      timeoutCount: Number(item.timeoutCount || defaults.timeoutCount),
      enableStats: item.enableStats !== false,
      showLiveScore: item.showLiveScore !== false
    });
    const typeIndex = Math.max(0, typeOptions.indexOf(form.type));
    const ageIndex = Math.max(0, ageOptions.indexOf(form.ageGroup));
    const systemIndex = Math.max(0, systemOptions.indexOf(form.system));
    this.setData({
      editingTournamentId: id,
      originalTournament: item,
      pageTitle: '编辑赛事',
      primaryActionText: '保存修改',
      form,
      hasName: Boolean(form.name.trim()),
      typeIndex,
      ageIndex,
      systemIndex
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({ url: '/pages/tournament/index' });
  },

  updateForm(field, value) {
    const form = Object.assign({}, this.data.form, { [field]: value });
    const nextData = { form };
    if (field === 'name') nextData.hasName = Boolean(value.trim());
    this.setData(nextData);
  },

  onNameInput(event) {
    this.updateForm('name', event.detail.value);
  },

  clearName() {
    this.updateForm('name', '');
  },

  chooseLogo() {
    if (this.data.uploadingLogo) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (result) => {
        const file = result.tempFiles && result.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        this.setData({ uploadingLogo: true });
        wx.showLoading({ title: '上传赛事 Logo' });
        uploadTournamentLogo(file.tempFilePath)
          .then((logoUrl) => {
            this.updateForm('logoUrl', logoUrl);
            wx.showToast({ title: 'Logo 已上传', icon: 'success' });
          })
          .catch((error) => {
            console.warn('[tournament-create] upload logo failed', error);
            wx.showToast({ title: 'Logo 上传失败，请检查网络', icon: 'none' });
          })
          .finally(() => {
            wx.hideLoading();
            this.setData({ uploadingLogo: false });
          });
      }
    });
  },

  removeLogo() {
    this.updateForm('logoUrl', '');
  },

  onVenueInput(event) {
    this.updateForm('venue', event.detail.value);
  },

  onTypeChange(event) {
    const typeIndex = Number(event.detail.value);
    this.setData({ typeIndex });
    this.updateForm('type', typeOptions[typeIndex]);
  },

  onAgeChange(event) {
    const ageIndex = Number(event.detail.value);
    this.setData({ ageIndex });
    this.updateForm('ageGroup', ageOptions[ageIndex]);
  },

  onSystemChange(event) {
    const systemIndex = Number(event.detail.value);
    this.setData({ systemIndex });
    this.updateForm('system', systemOptions[systemIndex]);
  },

  onStartDateChange(event) {
    const value = event.detail.value;
    const form = Object.assign({}, this.data.form, { startDate: value });
    if (value > form.endDate) form.endDate = value;
    this.setData({ form });
  },

  onEndDateChange(event) {
    const value = event.detail.value;
    const form = Object.assign({}, this.data.form, { endDate: value });
    if (value < form.startDate) form.startDate = value;
    if (form.registrationDeadline > value) form.registrationDeadline = value;
    this.setData({ form });
  },

  onRegistrationDeadlineChange(event) {
    const value = event.detail.value;
    const form = Object.assign({}, this.data.form, { registrationDeadline: value });
    if (value > form.endDate) form.endDate = value;
    this.setData({ form });
  },

  changeNumber(event) {
    const field = event.currentTarget.dataset.field;
    const delta = Number(event.currentTarget.dataset.delta || 0);
    const limits = numberLimits[field];
    if (!limits) return;

    const current = Number(this.data.form[field] || 0);
    const next = Math.min(limits.max, Math.max(limits.min, current + delta));
    this.updateForm(field, next);
  },

  onSwitchChange(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.updateForm(field, event.detail.value);
  },

  validateForm() {
    const form = this.data.form;
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写赛事名称', icon: 'none' });
      return false;
    }
    if (!form.venue.trim()) {
      wx.showToast({ title: '请填写比赛场馆', icon: 'none' });
      return false;
    }
    return true;
  },

  estimateGameCount(form) {
    const teams = Number(form.teamCount || 0);
    if (teams < 2) return 0;
    if (form.system === '单败淘汰赛') return teams - 1;
    if (form.system === '双败淘汰赛') return Math.max(teams * 2 - 2, teams - 1);
    if (form.system === '单循环赛' || form.system === '积分循环赛') return Math.round(teams * (teams - 1) / 2);
    return Math.max(teams + Math.ceil(teams / 2), teams - 1);
  },
  buildTournament(status) {
    const form = this.data.form;
    const existing = this.data.originalTournament || {};
    const editingId = this.data.editingTournamentId;
    const games = editingId ? Number(existing.games || 0) : this.estimateGameCount(form);
    return Object.assign({}, existing, {
      id: editingId || `tournament-${Date.now()}`,
      logoUrl: form.logoUrl || '',
      logoFileID: form.logoUrl || '',
      name: form.name.trim(),
      type: form.type,
      ageGroup: form.ageGroup,
      location: form.venue.trim(),
      venue: form.venue.trim(),
      date: `${form.startDate} ~ ${form.endDate}`,
      startDate: form.startDate,
      endDate: form.endDate,
      registrationDeadline: form.registrationDeadline,
      status,
      teams: form.teamCount,
      games: Math.round(games),
      system: form.system,
      playerLimit: form.playerLimit,
      openRegistration: form.openRegistration,
      requireApproval: form.requireApproval,
      periodMinutes: form.periodMinutes,
      periodCount: form.periodCount,
      overtimeMinutes: form.overtimeMinutes,
      timeoutCount: form.timeoutCount,
      enableStats: form.enableStats,
      showLiveScore: form.showLiveScore,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  persistTournament(status) {
    if (!this.validateForm()) return;

    const editingId = this.data.editingTournamentId;
    const nextStatus = editingId && this.data.originalTournament ? (this.data.originalTournament.status || status) : status;
    const tournament = this.buildTournament(nextStatus);
    const stored = wx.getStorageSync('tournaments') || [];
    const tournaments = editingId
      ? stored.map((item) => String(item.id) === String(editingId) ? tournament : item)
      : [tournament].concat(stored);
    wx.setStorageSync('tournaments', tournaments);

    wx.showToast({ title: editingId ? '赛事已更新' : (status === 'draft' ? '草稿已保存' : '赛事已创建'), icon: 'success' });
    setTimeout(() => {
      if (editingId) {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
          return;
        }
      }
      wx.redirectTo({ url: status !== 'draft' ? `/pages/tournament-detail/index?id=${tournament.id}` : '/pages/tournament/index' });
    }, 450);
  },

  saveAndCreate() {
    this.persistTournament('running');
  },

  saveDraft() {
    this.persistTournament('draft');
  }
});
