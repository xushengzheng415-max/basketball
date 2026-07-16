const { cloudAsset } = require('../../utils/assets');
const { pullRoster, pushRoster, resolveImageUrl, scheduleRosterPush } = require('../../utils/roster-sync');

const ASSET_BASE = 'pages/team-create/';
const STORAGE_KEYS = { teams: 'teams', drafts: 'teamDrafts', categories: 'teamCategories', players: 'players' };
const TEAM_NAME_MAX_LENGTH = 5;
const DEFAULT_FORM = { id: '', logoUrl: '', teamName: '', ageGroup: 'U10（8-10岁）', coachName: '', phone: '', intro: '', enabled: true, playerCount: 0 };
const FIELD_ROWS = [
  { key: 'teamName', label: '球队名称', required: true, type: 'input', placeholder: '请输入球队名称', clearable: true, maxLength: TEAM_NAME_MAX_LENGTH },
  { key: 'ageGroup', label: '年龄组', required: true, type: 'picker', rangeKey: 'ageGroups', placeholder: '请选择年龄组' },
  { key: 'coachName', label: '主教练姓名', required: true, type: 'input', placeholder: '请输入主教练姓名' },
  { key: 'phone', label: '联系电话', required: true, type: 'input', inputType: 'number', placeholder: '请输入联系电话' }
];
const FILTER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '启用' },
  { key: 'disabled', label: '停用' },
  { key: 'draft', label: '草稿' }
];

function readList(key) {
  const value = wx.getStorageSync(key) || [];
  return Array.isArray(value) ? value : [];
}

function slugify(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') || `team-${Date.now()}`;
}

function normalizeText(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function limitTeamName(value) {
  return String(value || '').trim().slice(0, TEAM_NAME_MAX_LENGTH);
}

function countPlayersByTeam(players, team) {
  return players.filter((player) => player && (player.team === team.name || player.team === team.label || player.filter === team.key)).length;
}

function getImageExtension(filePath) {
  const match = String(filePath || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const extension = match ? match[1].toLowerCase() : 'jpg';
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
}

function isCloudImagePath(filePath) {
  return String(filePath || '').startsWith('cloud://');
}

function repairLegacyTeamLogos() {
  const logoMap = {};
  readList(STORAGE_KEYS.categories).forEach((category) => {
    if (!category) return;
    const fileID = [category.logoFileID, category.logoUrl, category.teamLogo]
      .map((value) => String(value || ''))
      .find((value) => value.startsWith('cloud://'));
    if (!fileID) return;
    if (category.key) logoMap[String(category.key)] = fileID;
    if (category.label) logoMap[String(category.label)] = fileID;
  });

  let changed = false;
  const repairTeam = (team) => {
    if (!team) return team;
    const current = String(team.logoUrl || team.logoFileID || '');
    if (current.startsWith('cloud://')) return team;
    const fileID = logoMap[String(team.key || '')] ||
      logoMap[String(team.label || team.name || team.teamName || '')];
    if (!fileID) return team;
    changed = true;
    return Object.assign({}, team, { logoFileID: fileID, logoUrl: fileID });
  };
  const teams = readList(STORAGE_KEYS.teams).map(repairTeam);
  const drafts = readList(STORAGE_KEYS.drafts).map(repairTeam);
  const players = readList(STORAGE_KEYS.players).map((player) => {
    if (!player) return player;
    const current = String(player.teamLogo || player.teamLogoFileID || '');
    if (current.startsWith('cloud://')) return player;
    const fileID = logoMap[String(player.filter || '')] || logoMap[String(player.team || '')];
    if (!fileID) return player;
    changed = true;
    return Object.assign({}, player, { teamLogoFileID: fileID, teamLogo: fileID });
  });
  if (!changed) return Promise.resolve(false);
  wx.setStorageSync(STORAGE_KEYS.teams, teams);
  wx.setStorageSync(STORAGE_KEYS.drafts, drafts);
  wx.setStorageSync(STORAGE_KEYS.players, players);
  return pushRoster().then(() => true);
}

function uploadTeamLogo(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath || isCloudImagePath(filePath)) {
      resolve(filePath || '');
      return;
    }
    if (!wx.cloud || !wx.cloud.uploadFile) {
      reject(new Error('云存储未初始化'));
      return;
    }
    const extension = getImageExtension(filePath);
    const random = Math.random().toString(36).slice(2, 8);
    wx.cloud.uploadFile({
      cloudPath: `team-logos/${Date.now()}-${random}.${extension}`,
      filePath,
      success: (uploadResult) => {
        const logoUrl = uploadResult && uploadResult.fileID;
        if (logoUrl) resolve(logoUrl);
        else reject(new Error('Logo 上传未返回云文件 ID'));
      },
      fail: reject
    });
  });
}

Page({
  data: {
    assets: {
      bg: cloudAsset(`${ASSET_BASE}background-create-team-clean.png`),
      logo: cloudAsset(`${ASSET_BASE}team-logo-preview.png`),
      back: cloudAsset(`${ASSET_BASE}icon-back-common.svg`),
      camera: cloudAsset(`${ASSET_BASE}icon-camera-common.svg`),
      close: cloudAsset(`${ASSET_BASE}icon-close-common.svg`),
      dropdown: cloudAsset(`${ASSET_BASE}icon-dropdown-common.svg`),
      plus: cloudAsset(`${ASSET_BASE}icon-plus-common.svg`),
      info: cloudAsset(`${ASSET_BASE}icon-info-common.svg`)
    },
    showForm: false,
    navTitle: '球队管理',
    formTitle: '创建球队',
    keyword: '',
    activeFilter: 'all',
    filterTabs: [],
    teams: [],
    visibleTeams: [],
    isEmptyVisible: true,
    teamStats: { total: 0, active: 0, players: 0 },
    form: DEFAULT_FORM,
    rows: [],
    logoDisplay: '',
    introCountText: '0/100',
    ageGroups: ['U8（6-8岁）', 'U10（8-10岁）', 'U12（10-12岁）', 'U14（12-14岁）'],
    playerCountText: '0',
    statusText: '可参赛'
  },

  onLoad() {
    this.syncForm(DEFAULT_FORM);
    this.refreshTeams();
  },

  onShow() {
    if (wx.hideTabBar) wx.hideTabBar({ animation: false, fail: () => {} });
    this.refreshTeams();
    pullRoster()
      .then(() => repairLegacyTeamLogos())
      .then(() => this.refreshTeams())
      .catch((error) => console.warn('[team-create] pull roster failed', error));
  },

  buildRows(form) {
    return FIELD_ROWS.map((row) => {
      const value = form[row.key] || '';
      return Object.assign({}, row, {
        value,
        displayValue: value || row.placeholder || '请选择',
        inputType: row.inputType || 'text',
        maxLength: row.maxLength || 140,
        isInput: row.type === 'input',
        isPicker: row.type === 'picker',
        showClear: !!row.clearable && !!value,
        valueClass: value ? '' : 'placeholder-color',
        options: this.data[row.rangeKey] || []
      });
    });
  },

  syncForm(form) {
    const normalized = Object.assign({}, DEFAULT_FORM, form);
    this.setData({
      form: normalized,
      rows: this.buildRows(normalized),
      logoDisplay: resolveImageUrl(normalized.logoUrl || this.data.assets.logo),
      introCountText: `${(normalized.intro || '').length}/100`,
      playerCountText: String(normalized.playerCount || 0),
      statusText: normalized.enabled ? '可参赛' : '已停用'
    });
  },

  buildTeamCards() {
    const storedTeams = readList(STORAGE_KEYS.teams);
    const drafts = readList(STORAGE_KEYS.drafts).filter((item) => item && item.status === 'draft');
    const players = readList(STORAGE_KEYS.players);
    return storedTeams.concat(drafts).map((team, index) => {
      const name = normalizeText(team.name || team.label || team.teamName, '未命名球队');
      const enabled = team.status === 'draft' ? false : team.enabled !== false;
      const playerCount = Number(team.playerCount || countPlayersByTeam(players, team));
      const status = team.status === 'draft' ? 'draft' : (enabled ? 'active' : 'disabled');
      return Object.assign({}, team, {
        id: team.id || `team-${index}`,
        key: team.key || slugify(name),
        name,
        label: name,
        logoFileID: team.logoUrl || '',
        logoUrl: resolveImageUrl(team.logoUrl || this.data.assets.logo),
        ageGroup: normalizeText(team.ageGroup, '未设置年龄组'),
        coachName: normalizeText(team.coachName, '待补充'),
        playerCount,
        playerCountText: String(playerCount),
        enabled,
        status,
        statusText: status === 'draft' ? '草稿' : (enabled ? '启用' : '停用'),
        statusClass: status,
        createdText: team.createdAt ? this.formatDate(team.createdAt) : '刚刚创建'
      });
    });
  },

  formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '刚刚创建';
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  refreshTeams() {
    const teams = this.buildTeamCards();
    const teamStats = {
      total: teams.filter((team) => team.status !== 'draft').length,
      active: teams.filter((team) => team.status === 'active').length,
      players: teams.reduce((sum, team) => sum + Number(team.playerCount || 0), 0)
    };
    this.setData({ teams, teamStats });
    this.applyFilters();
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const activeFilter = this.data.activeFilter;
    const visibleTeams = this.data.teams.filter((team) => {
      const matchFilter = activeFilter === 'all' || team.status === activeFilter;
      const matchKeyword = !keyword || team.name.toLowerCase().includes(keyword) || team.coachName.toLowerCase().includes(keyword) || team.ageGroup.toLowerCase().includes(keyword);
      return matchFilter && matchKeyword;
    });
    const filterTabs = FILTER_TABS.map((item) => Object.assign({}, item, {
      activeClass: item.key === activeFilter ? 'active' : '',
      countText: String(item.key === 'all' ? this.data.teams.length : this.data.teams.filter((team) => team.status === item.key).length)
    }));
    this.setData({ visibleTeams, isEmptyVisible: visibleTeams.length === 0, filterTabs });
  },

  goBack() {
    const pages = getCurrentPages();
    if (this.data.showForm) {
      this.closeForm();
      return;
    }
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({ url: '/pages/home/index' });
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
    this.applyFilters();
  },

  onFilterTap(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.key || 'all' });
    this.applyFilters();
  },

  openCreateForm() {
    this.syncForm(DEFAULT_FORM);
    this.setData({ showForm: true, navTitle: '创建球队', formTitle: '创建球队' });
  },

  closeForm() {
    this.setData({ showForm: false, navTitle: '球队管理', formTitle: '创建球队' });
  },

  editTeam(event) {
    const id = event.currentTarget.dataset.id;
    const team = this.data.teams.find((item) => item.id === id);
    if (!team) return;
    this.syncForm({
      id: team.id,
      logoUrl: team.logoFileID || team.logoUrl,
      teamName: team.name,
      ageGroup: team.ageGroup,
      coachName: team.coachName === '待补充' ? '' : team.coachName,
      phone: team.phone || '',
      intro: team.intro || '',
      enabled: team.enabled,
      playerCount: team.playerCount,
      createdAt: team.createdAt
    });
    this.setData({ showForm: true, navTitle: '编辑球队', formTitle: '编辑球队' });
  },

  chooseLogo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        wx.showLoading({ title: '上传 Logo' });
        uploadTeamLogo(file.tempFilePath)
          .then((logoUrl) => {
            this.syncForm(Object.assign({}, this.data.form, { logoUrl }));
            wx.showToast({ title: 'Logo 已上传', icon: 'success' });
          })
          .catch((error) => {
            console.warn('[team-create] upload logo failed', error);
            wx.showToast({ title: 'Logo 上传失败，请检查网络', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      }
    });
  },

  onFieldInput(event) {
    const key = event.currentTarget.dataset.key;
    if (!key) return;
    const value = key === 'teamName' ? limitTeamName(event.detail.value) : event.detail.value;
    this.syncForm(Object.assign({}, this.data.form, { [key]: value }));
  },

  clearTeamName() {
    this.syncForm(Object.assign({}, this.data.form, { teamName: '' }));
  },

  onPickerChange(event) {
    const key = event.currentTarget.dataset.key;
    const index = Number(event.detail.value);
    const row = this.data.rows.find((item) => item.key === key);
    const value = row && row.options ? row.options[index] : '';
    if (key && value) this.syncForm(Object.assign({}, this.data.form, { [key]: value }));
  },

  onIntroInput(event) {
    const intro = String(event.detail.value || '').slice(0, 100);
    this.syncForm(Object.assign({}, this.data.form, { intro }));
  },

  onEnabledChange(event) {
    this.syncForm(Object.assign({}, this.data.form, { enabled: event.detail.value }));
  },

  validateForm() {
    const form = this.data.form;
    const missing = FIELD_ROWS.find((row) => row.required && !String(form[row.key] || '').trim());
    if (missing) {
      wx.showToast({ title: `请填写${missing.label}`, icon: 'none' });
      return false;
    }
    if (String(form.teamName || '').trim().length > TEAM_NAME_MAX_LENGTH) {
      wx.showToast({ title: '球队名称最多5个字', icon: 'none' });
      return false;
    }
    return true;
  },

  buildTeamPayload(status) {
    const form = this.data.form;
    const name = limitTeamName(form.teamName);
    return {
      id: form.id || `team-${Date.now()}`,
      key: slugify(name),
      label: name,
      name,
      ageGroup: form.ageGroup,
      coachName: form.coachName.trim(),
      phone: form.phone.trim(),
      intro: form.intro.trim(),
      logoFileID: form.logoUrl || this.data.assets.logo,
      logoUrl: form.logoUrl || this.data.assets.logo,
      playerCount: form.playerCount || 0,
      enabled: !!form.enabled,
      status,
      common: true,
      createdAt: form.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  },

  upsertTeam(list, team) {
    const index = list.findIndex((item) => {
      if (!item) return false;
      if (item.id && team.id && String(item.id) === String(team.id)) return true;
      if (item.key && team.key && item.key === team.key) return true;
      const itemName = normalizeText(item.name || item.label || item.teamName);
      const teamName = normalizeText(team.name || team.label || team.teamName);
      return !!itemName && itemName === teamName;
    });
    if (index >= 0) {
      const next = list.slice();
      next[index] = Object.assign({}, next[index], team);
      return next;
    }
    return [team].concat(list);
  },

  upsertCategory(list, category) {
    const index = list.findIndex((item) => item && (item.key === category.key || item.label === category.label));
    if (index >= 0) {
      const next = list.slice();
      next[index] = Object.assign({}, next[index], category);
      return next;
    }
    return list.concat(category);
  },

  ensureFormLogoCloud() {
    const logoUrl = this.data.form.logoUrl || '';
    if (!logoUrl || isCloudImagePath(logoUrl)) return Promise.resolve(logoUrl);
    wx.showLoading({ title: '同步队徽' });
    return uploadTeamLogo(logoUrl)
      .then((cloudLogoUrl) => {
        this.syncForm(Object.assign({}, this.data.form, { logoUrl: cloudLogoUrl }));
        return cloudLogoUrl;
      })
      .finally(() => wx.hideLoading());
  },

  saveDraft() {
    this.ensureFormLogoCloud()
      .then(async () => {
        const team = this.buildTeamPayload('draft');
        wx.setStorageSync(STORAGE_KEYS.drafts, this.upsertTeam(readList(STORAGE_KEYS.drafts), team));
        await pushRoster();
        wx.showToast({ title: '草稿已保存', icon: 'success' });
        this.closeForm();
        this.refreshTeams();
      })
      .catch((error) => {
        console.warn('[team-create] save draft logo sync failed', error);
        wx.showToast({ title: '队徽同步失败，请重试', icon: 'none' });
      });
  },

  saveTeam() {
    if (!this.validateForm()) return;
    this.ensureFormLogoCloud()
      .then(async () => {
        const team = this.buildTeamPayload('active');
        const categories = readList(STORAGE_KEYS.categories);
        const category = { key: team.key, label: team.label, logoUrl: team.logoUrl, common: true };
        wx.setStorageSync(STORAGE_KEYS.teams, this.upsertTeam(readList(STORAGE_KEYS.teams), team));
        wx.setStorageSync(STORAGE_KEYS.drafts, readList(STORAGE_KEYS.drafts).filter((item) => item.id !== team.id));
        wx.setStorageSync(STORAGE_KEYS.categories, this.upsertCategory(categories, category));
        await pushRoster();
        wx.showToast({ title: '球队已保存', icon: 'success' });
        this.closeForm();
        this.refreshTeams();
      })
      .catch((error) => {
        console.warn('[team-create] save team logo sync failed', error);
        wx.showToast({ title: '队徽同步失败，请重试', icon: 'none' });
      });
  },

  toggleTeamEnabled(event) {
    const id = event.currentTarget.dataset.id;
    const teams = readList(STORAGE_KEYS.teams).map((team) => {
      if (team.id !== id) return team;
      return Object.assign({}, team, { enabled: team.enabled === false, updatedAt: Date.now() });
    });
    wx.setStorageSync(STORAGE_KEYS.teams, teams);
    scheduleRosterPush();
    this.refreshTeams();
  },

  deleteTeam(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除球队',
      content: '删除后仅移除球队档案，不会删除球员资料。',
      confirmText: '删除',
      confirmColor: '#ff4d00',
      success: (res) => {
        if (!res.confirm) return;
        wx.setStorageSync(STORAGE_KEYS.teams, readList(STORAGE_KEYS.teams).filter((team) => team.id !== id));
        wx.setStorageSync(STORAGE_KEYS.drafts, readList(STORAGE_KEYS.drafts).filter((team) => team.id !== id));
        scheduleRosterPush();
        this.refreshTeams();
      }
    });
  },

  goPlayers(event) {
    const id = event.currentTarget.dataset.id || '';
    const team = this.data.teams.find((item) => item.id === id);
    if (!team) {
      wx.navigateTo({ url: '/pages/team/index' });
      return;
    }
    const teamKey = encodeURIComponent(team.key || id);
    const teamName = encodeURIComponent(team.name || team.label || '');
    wx.navigateTo({ url: `/pages/team/index?teamId=${encodeURIComponent(id)}&teamKey=${teamKey}&teamName=${teamName}` });
  }
});
