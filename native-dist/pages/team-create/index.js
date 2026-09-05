const { cloudAsset } = require('../../utils/assets');
const { pullRoster, pushRoster, resolveImageUrl, scheduleRosterPush } = require('../../utils/roster-sync');
const { cloud } = require('../../utils/cloud');
const { getContainDrawRect, removeConnectedBackground } = require('../../utils/team-logo-editor');
const { requestTournamentSubscription } = require('../../utils/tournament-subscription');

const ASSET_BASE = 'pages/team-create/';
const STORAGE_KEYS = { teams: 'teams', drafts: 'teamDrafts', categories: 'teamCategories', players: 'players' };
const REGISTRATION_RETURN_KEY = 'sxfTournamentRegistrationCreatedTeam';
const TEAM_NAME_MAX_LENGTH = 5;
const DEFAULT_FORM = { id: '', logoUrl: '', logoFileID: '', teamName: '', ageGroup: 'U10（8-10岁）', coachName: '', phone: '', intro: '', enabled: true, playerCount: 0 };
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

function buildTeamLogoCloudPath(filePath) {
  return `team-logos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${getImageExtension(filePath || '')}`;
}

function uploadTeamLogoDirect(filePath) {
  return new Promise((resolve, reject) => {
    if (!cloud || !cloud.uploadFile) {
      reject(new Error('队徽云端服务未初始化'));
      return;
    }
    cloud.uploadFile({
      cloudPath: buildTeamLogoCloudPath(filePath),
      filePath
    }).then((result) => {
      const fileID = result && (result.fileID || (result.fileList && result.fileList[0] && result.fileList[0].fileID));
      if (fileID) {
        resolve(fileID);
        return;
      }
      reject(new Error('队徽直传未返回文件ID'));
    }).catch((error) => reject(error));
  });
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
    if (!cloud || (!cloud.callFunction && !cloud.uploadFile)) {
      reject(new Error('队徽云端服务未初始化'));
      return;
    }
    if (!cloud.callFunction && cloud.uploadFile) {
      uploadTeamLogoDirect(filePath).then(resolve).catch(reject);
      return;
    }
    const fileSystem = wx.getFileSystemManager();
    fileSystem.readFile({
      filePath,
      encoding: 'base64',
      success: (file) => {
        cloud.callFunction({
          name: 'sxUploadTeamLogo',
          data: { base64: file.data, ext: getImageExtension(filePath) }
        }).then((response) => {
          const result = response && response.result ? response.result : response;
          if (!result || result.ok !== true || !result.fileID) {
            throw new Error(result && result.error || '队徽云端保存失败，请重试');
            return;
          }
          resolve(result.fileID);
        }).catch((error) => {
          console.warn('[team-create] sxUploadTeamLogo failed, fallback to direct upload', error);
          uploadTeamLogoDirect(filePath).then(resolve).catch((fallbackError) => {
            reject(new Error(fallbackError && (fallbackError.message || fallbackError.errMsg) || '队徽同步失败，请重试'));
          });
        }).catch(reject);
      },
      fail: reject
    });
  });
}

function touchCoordinate(touch, axis) {
  if (!touch) return 0;
  const clientKey = axis === 'x' ? 'clientX' : 'clientY';
  const pageKey = axis === 'x' ? 'pageX' : 'pageY';
  const clientValue = Number(touch[clientKey]);
  if (Number.isFinite(clientValue)) return clientValue;
  const pageValue = Number(touch[pageKey]);
  return Number.isFinite(pageValue) ? pageValue : 0;
}

function distanceBetweenTouches(touches) {
  if (!touches || touches.length < 2) return 0;
  const dx = touchCoordinate(touches[0], 'x') - touchCoordinate(touches[1], 'x');
  const dy = touchCoordinate(touches[0], 'y') - touchCoordinate(touches[1], 'y');
  return Math.sqrt(dx * dx + dy * dy);
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
    statusText: '可参赛',
    registrationEventId: '',
    registrationInviteKey: '',
    returnToRegistration: false,
    saveButtonText: '保存球队',
    logoEditorVisible: false,
    logoEditorSourcePath: '',
    logoEditorMeta: '',
    logoCanvasSize: 256,
    showLogoCropStep: true,
    showLogoRemoveStep: false,
    logoEditorStepText: '第 1 步：调整图片大小和位置',
    logoStageLabel: '固定 1:1 裁剪框',
    logoEditorCropTip: '已载入完整压缩图，请先完成1:1构图',
    logoEditorZoom: 100,
    logoEditorOffsetX: 0,
    logoEditorOffsetY: 0,
    logoEditorTolerance: 38,
    logoEditorRemoveBackground: true,
    logoEditorZoomText: '100%',
    logoEditorOffsetXText: '居中',
    logoEditorOffsetYText: '居中',
    logoEditorToleranceText: '38',
    logoEditorConfirming: false
  },

  onLoad(options = {}) {
    this.syncForm(DEFAULT_FORM);
    this.refreshTeams();
    if (options.from === 'tournament-register' && options.eventId) {
      this.setData({
        registrationEventId: options.eventId,
        registrationInviteKey: options.inviteKey || '',
        returnToRegistration: true,
        saveButtonText: '创建并提交报名'
      });
      this.openCreateForm();
    }
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
      logoDisplay: resolveImageUrl(normalized.logoUrl || normalized.logoFileID || this.data.assets.logo),
      introCountText: `${(normalized.intro || '').length}/100`,
      playerCountText: String(normalized.playerCount || 0),
      statusText: normalized.enabled ? '可参赛' : '已停用'
    });
  },

  buildTeamCards() {
    const storedTeams = readList(STORAGE_KEYS.teams);
    const drafts = readList(STORAGE_KEYS.drafts).filter((item) => item && item.status === 'draft');
    const players = readList(STORAGE_KEYS.players);
    return storedTeams.concat(drafts).slice().sort((left, right) => {
      const leftTime = Number(left && (left.createdAt || left.updatedAt) || 0);
      const rightTime = Number(right && (right.createdAt || right.updatedAt) || 0);
      return rightTime - leftTime;
    }).map((team, index) => {
      const name = normalizeText(team.name || team.label || team.teamName, '未命名球队');
      const enabled = team.status === 'draft' ? false : team.enabled !== false;
      const playerCount = Number(team.playerCount || countPlayersByTeam(players, team));
      const status = team.status === 'draft' ? 'draft' : (enabled ? 'active' : 'disabled');
      return Object.assign({}, team, {
        id: team.id || `team-${index}`,
        key: team.key || slugify(name),
        name,
        label: name,
        logoFileID: team.logoFileID || team.logoUrl || '',
        logoUrl: resolveImageUrl(team.logoUrl || team.logoFileID || this.data.assets.logo),
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
      logoUrl: team.logoUrl || '',
      logoFileID: team.logoFileID || team.logoUrl || '',
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
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const sourcePath = res.tempFilePaths && res.tempFilePaths[0];
        if (!sourcePath) return;
        wx.showLoading({ title: '压缩原图' });
        wx.getImageInfo({
          src: sourcePath,
          success: (info) => {
            this.compressLogoSource(sourcePath, info)
              .then((processed) => this.openLogoEditor(processed.path, processed, info))
              .catch((error) => {
                console.warn('[team-create] image compression failed', error);
                wx.showToast({ title: '图片压缩失败，请重试', icon: 'none' });
              })
              .finally(() => wx.hideLoading());
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '图片读取失败，请重新选择', icon: 'none' });
          }
        });
      }
    });
  },

  compressLogoSource(sourcePath, info) {
    const width = Math.max(1, Number(info.width || 1));
    const height = Math.max(1, Number(info.height || 1));
    const maxSide = Math.max(width, height);
    if (maxSide <= 1200) return Promise.resolve({ path: sourcePath, width, height, compressed: false });
    const scale = 1200 / maxSide;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const extension = getImageExtension(sourcePath);
    const fileType = extension === 'png' ? 'png' : 'jpg';
    return new Promise((resolve, reject) => {
      const context = wx.createCanvasContext('teamLogoPreprocessCanvas', this);
      context.clearRect(0, 0, 1200, 1200);
      context.drawImage(sourcePath, 0, 0, targetWidth, targetHeight);
      context.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'teamLogoPreprocessCanvas', x: 0, y: 0, width: targetWidth, height: targetHeight,
          destWidth: targetWidth, destHeight: targetHeight, fileType, quality: 0.86,
          success: (result) => resolve({ path: result.tempFilePath, width: targetWidth, height: targetHeight, compressed: true }),
          fail: reject
        }, this);
      });
    });
  },

  openLogoEditor(sourcePath, info, originalInfo) {
    this.logoEditorImageInfo = { width: Number(info.width || 0), height: Number(info.height || 0) };
    const logoCanvasSize = Math.round(this.getLogoGestureStageSize());
    this.logoRenderVersion = 0;
    const originalWidth = Number(originalInfo && originalInfo.width || info.width || 0);
    const originalHeight = Number(originalInfo && originalInfo.height || info.height || 0);
    const compressedText = info.compressed
      ? `${originalWidth} × ${originalHeight} → ${this.logoEditorImageInfo.width} × ${this.logoEditorImageInfo.height} px`
      : `${this.logoEditorImageInfo.width} × ${this.logoEditorImageInfo.height} px`;
    this.setData({
      logoEditorVisible: true,
      logoEditorSourcePath: sourcePath,
      logoEditorMeta: compressedText,
      logoCanvasSize,
      showLogoCropStep: true,
      showLogoRemoveStep: false,
      logoStageLabel: '固定 1:1 裁剪框',
      logoEditorStepText: '第 1 步：调整图片大小和位置',
      logoEditorCropTip: '已载入完整压缩图，请先完成1:1构图',
      logoEditorZoom: 100,
      logoEditorOffsetX: 0,
      logoEditorOffsetY: 0,
      logoEditorTolerance: 38,
      logoEditorRemoveBackground: true,
      logoEditorZoomText: '100%',
      logoEditorOffsetXText: '居中',
      logoEditorOffsetYText: '居中',
      logoEditorToleranceText: '38',
      logoEditorConfirming: false
    }, () => setTimeout(() => this.renderLogoEditor().catch((error) => console.warn('[team-create] logo preview failed', error)), 30));
  },

  closeLogoEditor() {
    this.logoRenderVersion = (this.logoRenderVersion || 0) + 1;
    if (this.logoPreviewTimer) clearTimeout(this.logoPreviewTimer);
    this.logoPreviewTimer = null;
    this.logoGesture = null;
    this.logoEditorImageInfo = null;
    this.setData({ logoEditorVisible: false, logoEditorSourcePath: '', logoEditorConfirming: false });
  },

  formatLogoOffset(value) {
    const number = Number(value || 0);
    return number === 0 ? '居中' : `${number > 0 ? '+' : ''}${number}`;
  },

  onLogoEditorSlider(event) {
    const key = event.currentTarget.dataset.key;
    const value = Number(event.detail.value || 0);
    const patch = { [key]: value };
    if (key === 'logoEditorZoom') patch.logoEditorZoomText = `${value}%`;
    if (key === 'logoEditorOffsetX') patch.logoEditorOffsetXText = this.formatLogoOffset(value);
    if (key === 'logoEditorOffsetY') patch.logoEditorOffsetYText = this.formatLogoOffset(value);
    if (key === 'logoEditorTolerance') patch.logoEditorToleranceText = String(value);
    this.setData(patch, () => this.renderLogoEditor().catch((error) => console.warn('[team-create] logo preview update failed', error)));
  },

  getLogoGestureStageSize() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      return Math.max(160, Number(info.windowWidth || 375) * 512 / 750);
    } catch (error) {
      return 256;
    }
  },

  scheduleLogoPreview() {
    if (this.logoPreviewTimer) return;
    this.logoPreviewTimer = setTimeout(() => {
      this.logoPreviewTimer = null;
      this.renderLogoEditor().catch((error) => console.warn('[team-create] logo gesture preview failed', error));
    }, 30);
  },

  onLogoEditorTouchStart(event) {
    if (!this.data.showLogoCropStep) return;
    const touches = event.touches || [];
    if (!touches.length) return;
    const first = touches[0];
    this.logoGesture = {
      stageSize: this.getLogoGestureStageSize(),
      zoom: Number(this.data.logoEditorZoom || 100),
      offsetX: Number(this.data.logoEditorOffsetX || 0),
      offsetY: Number(this.data.logoEditorOffsetY || 0),
      startX: touchCoordinate(first, 'x'),
      startY: touchCoordinate(first, 'y'),
      distance: distanceBetweenTouches(touches),
      mode: touches.length > 1 ? 'pinch' : 'drag'
    };
  },

  onLogoEditorTouchMove(event) {
    if (!this.data.showLogoCropStep) return;
    const gesture = this.logoGesture;
    const touches = event.touches || [];
    if (!gesture || !touches.length) return;
    let zoom = gesture.zoom;
    let offsetX = gesture.offsetX;
    let offsetY = gesture.offsetY;
    if (touches.length > 1 && gesture.distance > 0) {
      zoom = Math.max(30, Math.min(300, Math.round(gesture.zoom * distanceBetweenTouches(touches) / gesture.distance)));
    } else {
      const ratio = 200 / gesture.stageSize;
      offsetX = Math.max(-100, Math.min(100, Math.round(gesture.offsetX + (touchCoordinate(touches[0], 'x') - gesture.startX) * ratio)));
      offsetY = Math.max(-100, Math.min(100, Math.round(gesture.offsetY + (touchCoordinate(touches[0], 'y') - gesture.startY) * ratio)));
    }
    this.setData({
      logoEditorZoom: zoom,
      logoEditorOffsetX: offsetX,
      logoEditorOffsetY: offsetY,
      logoEditorZoomText: `${zoom}%`,
      logoEditorOffsetXText: this.formatLogoOffset(offsetX),
      logoEditorOffsetYText: this.formatLogoOffset(offsetY)
    });
    this.scheduleLogoPreview();
  },

  onLogoEditorTouchEnd() {
    if (!this.data.showLogoCropStep) return;
    this.logoGesture = null;
    if (this.logoPreviewTimer) {
      clearTimeout(this.logoPreviewTimer);
      this.logoPreviewTimer = null;
    }
    this.renderLogoEditor().catch((error) => console.warn('[team-create] logo gesture finish failed', error));
  },

  resetLogoEditorGesture() {
    this.setData({
      logoEditorZoom: 100,
      logoEditorOffsetX: 0,
      logoEditorOffsetY: 0,
      logoEditorZoomText: '100%',
      logoEditorOffsetXText: '居中',
      logoEditorOffsetYText: '居中'
    }, () => this.renderLogoEditor().catch((error) => console.warn('[team-create] logo reset failed', error)));
  },

  onLogoBackgroundChange(event) {
    this.setData({ logoEditorRemoveBackground: !!event.detail.value }, () => this.renderLogoEditor().catch((error) => console.warn('[team-create] logo background preview failed', error)));
  },

  finishLogoCrop() {
    this.setData({
      showLogoCropStep: false,
      showLogoRemoveStep: true,
      logoEditorStepText: '第 2 步：抠除外围背景并确认',
      logoStageLabel: '裁剪结果去底预览'
    }, () => this.renderLogoEditor().catch((error) => console.warn('[team-create] cutout preview failed', error)));
  },

  returnToLogoCrop() {
    this.setData({
      showLogoCropStep: true,
      showLogoRemoveStep: false,
      logoEditorStepText: '第 1 步：调整图片大小和位置',
      logoStageLabel: '固定 1:1 裁剪框'
    }, () => this.renderLogoEditor().catch((error) => console.warn('[team-create] return crop preview failed', error)));
  },

  getLogoCanvasNode() {
    return new Promise((resolve, reject) => {
      if (!wx.createSelectorQuery) {
        const error = new Error('当前基础库不支持 Canvas 2D');
        error.code = 'SXF_CANVAS_2D_UNAVAILABLE';
        reject(error);
        return;
      }
      wx.createSelectorQuery().in(this).select('#teamLogoEditorCanvas').fields({ node: true, size: true }).exec((result) => {
        const canvasInfo = result && result[0];
        if (!canvasInfo || !canvasInfo.node) {
          const error = new Error('队徽画布尚未就绪，请稍后重试');
          error.code = 'SXF_CANVAS_2D_UNAVAILABLE';
          reject(error);
          return;
        }
        resolve(canvasInfo.node);
      });
    });
  },

  loadLogoCanvasImage(canvas, sourcePath) {
    return new Promise((resolve, reject) => {
      if (!canvas || typeof canvas.createImage !== 'function') {
        reject(new Error('队徽画布不支持图片加载'));
        return;
      }
      const image = canvas.createImage();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('队徽图片读取失败，请重新选择'));
      image.src = sourcePath;
    });
  },

  renderLogoEditorCanvas2d() {
    const sourcePath = this.data.logoEditorSourcePath;
    const info = this.logoEditorImageInfo;
    if (!sourcePath || !info || !info.width || !info.height) return Promise.reject(new Error('队徽图片信息缺失'));
    const version = (this.logoRenderVersion || 0) + 1;
    this.logoRenderVersion = version;
    const canvasSize = Math.max(160, Number(this.data.logoCanvasSize || this.getLogoGestureStageSize()));
    const cropFrame = getContainDrawRect(info.width, info.height, canvasSize, Number(this.data.logoEditorZoom || 100) / 100, this.data.logoEditorOffsetX, this.data.logoEditorOffsetY);
    return this.getLogoCanvasNode().then((canvas) => {
      this.logoCanvasNode = canvas;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('队徽画布上下文初始化失败');
      return this.loadLogoCanvasImage(canvas, sourcePath).then((image) => {
        if (version !== this.logoRenderVersion) return;
        context.clearRect(0, 0, canvasSize, canvasSize);
        context.drawImage(image, cropFrame.x, cropFrame.y, cropFrame.width, cropFrame.height);
        if (!this.data.showLogoRemoveStep || !this.data.logoEditorRemoveBackground) return;
        const imageData = context.getImageData(0, 0, canvasSize, canvasSize);
        const pixelData = {
          width: Number(imageData.width) || canvasSize,
          height: Number(imageData.height) || canvasSize,
          data: imageData.data
        };
        removeConnectedBackground(pixelData, this.data.logoEditorTolerance);
        context.putImageData(imageData, 0, 0);
      });
    });
  },

  renderLogoEditor() {
    return this.renderLogoEditorCanvas2d().catch((error) => {
      if (!error || error.code !== 'SXF_CANVAS_2D_UNAVAILABLE') throw error;
      return this.renderLogoEditorLegacy();
    });
  },

  renderLogoEditorLegacy() {
    const sourcePath = this.data.logoEditorSourcePath;
    const info = this.logoEditorImageInfo;
    if (!sourcePath || !info || !info.width || !info.height) return Promise.reject(new Error('队徽图片信息缺失'));
    const version = (this.logoRenderVersion || 0) + 1;
    this.logoRenderVersion = version;
    const canvasSize = Math.max(160, Number(this.data.logoCanvasSize || this.getLogoGestureStageSize()));
    const cropFrame = getContainDrawRect(info.width, info.height, canvasSize, Number(this.data.logoEditorZoom || 100) / 100, this.data.logoEditorOffsetX, this.data.logoEditorOffsetY);
    return new Promise((resolve, reject) => {
      const context = wx.createCanvasContext('teamLogoEditorCanvas', this);
      context.clearRect(0, 0, canvasSize, canvasSize);
      context.drawImage(sourcePath, cropFrame.x, cropFrame.y, cropFrame.width, cropFrame.height);
      context.draw(false, () => {
        if (version !== this.logoRenderVersion || !this.data.showLogoRemoveStep || !this.data.logoEditorRemoveBackground) { resolve(); return; }
        wx.canvasGetImageData({
          canvasId: 'teamLogoEditorCanvas', x: 0, y: 0, width: canvasSize, height: canvasSize,
          success: (imageData) => {
            if (version !== this.logoRenderVersion) { resolve(); return; }
            const pixelData = {
              width: Number(imageData.width) || canvasSize,
              height: Number(imageData.height) || canvasSize,
              data: imageData.data
            };
            removeConnectedBackground(pixelData, this.data.logoEditorTolerance);
            wx.canvasPutImageData({
              canvasId: 'teamLogoEditorCanvas', x: 0, y: 0, width: canvasSize, height: canvasSize, data: imageData.data,
              success: resolve,
              fail: reject
            }, this);
          },
          fail: reject
        }, this);
      });
    });
  },

  confirmLogoEditor() {
    if (this.data.logoEditorConfirming) return;
    this.setData({ logoEditorConfirming: true });
    wx.showLoading({ title: '处理队徽' });
    this.renderLogoEditor()
      .then(() => new Promise((resolve, reject) => {
        const canvasSize = Math.max(160, Number(this.data.logoCanvasSize || this.getLogoGestureStageSize()));
        const options = {
          x: 0, y: 0, width: canvasSize, height: canvasSize,
          destWidth: 512, destHeight: 512, fileType: 'png', quality: 1,
          success: (result) => resolve(result.tempFilePath),
          fail: reject
        };
        if (this.logoCanvasNode) options.canvas = this.logoCanvasNode;
        else options.canvasId = 'teamLogoEditorCanvas';
        wx.canvasToTempFilePath(options, this);
      }))
      .then((processedPath) => uploadTeamLogo(processedPath))
      .then((logoUrl) => {
        this.syncForm(Object.assign({}, this.data.form, { logoUrl, logoFileID: logoUrl }));
        this.closeLogoEditor();
        wx.showToast({ title: '队徽已裁剪并去底', icon: 'success' });
      })
      .catch((error) => {
        console.warn('[team-create] logo process failed', error);
        wx.showToast({ title: error.message || '队徽处理失败，请重试', icon: 'none' });
      })
      .finally(() => {
        wx.hideLoading();
        if (this.data.logoEditorVisible) this.setData({ logoEditorConfirming: false });
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

  buildTeamPayload(status, logoOverride) {
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
      logoFileID: logoOverride || form.logoFileID || form.logoUrl || this.data.assets.logo,
      logoUrl: logoOverride || form.logoFileID || form.logoUrl || this.data.assets.logo,
      playerCount: form.playerCount || 0,
      enabled: !!form.enabled,
      status,
      common: true,
      registrationEventId: this.data.registrationEventId || '',
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
    return [category].concat(list);
  },

  ensureFormLogoCloud() {
    const logoUrl = this.data.form.logoFileID || this.data.form.logoUrl || '';
    if (!logoUrl || isCloudImagePath(logoUrl)) return Promise.resolve(logoUrl);
    wx.showLoading({ title: '同步队徽' });
    return uploadTeamLogo(logoUrl)
      .then((cloudLogoUrl) => {
        this.syncForm(Object.assign({}, this.data.form, { logoUrl: cloudLogoUrl, logoFileID: cloudLogoUrl }));
        return cloudLogoUrl;
      })
      .finally(() => wx.hideLoading());
  },

  syncRosterAfterSave() {
    return pushRoster()
      .then(() => true)
      .catch((error) => {
        console.warn('[team-create] roster cloud sync failed, scheduled retry', error);
        scheduleRosterPush(3000);
        return false;
      });
  },

  saveDraft() {
    this.ensureFormLogoCloud()
      .then(async (cloudLogoUrl) => {
        const team = this.buildTeamPayload('draft', cloudLogoUrl);
        wx.setStorageSync(STORAGE_KEYS.drafts, this.upsertTeam(readList(STORAGE_KEYS.drafts), team));
        const synced = await this.syncRosterAfterSave();
        wx.showToast({ title: synced ? '草稿已保存' : '已保存，云端稍后同步', icon: synced ? 'success' : 'none' });
        this.closeForm();
        this.refreshTeams();
      })
      .catch((error) => {
        console.warn('[team-create] save draft logo sync failed', error);
        wx.showToast({ title: error.message || '队徽同步失败，请重试', icon: 'none' });
      });
  },

  saveTeam() {
    if (!this.validateForm()) return;
    if (this.data.returnToRegistration) {
      requestTournamentSubscription('review').then((accepted) => this.persistTeam(accepted === true));
      return;
    }
    this.persistTeam(false);
  },

  persistTeam(autoSubmitRegistration) {
    this.ensureFormLogoCloud()
      .then(async (cloudLogoUrl) => {
        const team = this.buildTeamPayload('active', cloudLogoUrl);
        const categories = readList(STORAGE_KEYS.categories);
        const category = { key: team.key, label: team.label, logoFileID: team.logoFileID, logoUrl: team.logoUrl, common: true, createdAt: team.createdAt, updatedAt: team.updatedAt };
        wx.setStorageSync(STORAGE_KEYS.teams, this.upsertTeam(readList(STORAGE_KEYS.teams), team));
        wx.setStorageSync(STORAGE_KEYS.drafts, readList(STORAGE_KEYS.drafts).filter((item) => item.id !== team.id));
        wx.setStorageSync(STORAGE_KEYS.categories, this.upsertCategory(categories, category));
        const synced = await this.syncRosterAfterSave();
        if (this.data.returnToRegistration) {
          wx.setStorageSync(REGISTRATION_RETURN_KEY, {
            eventId: this.data.registrationEventId,
            inviteKey: this.data.registrationInviteKey,
            teamId: team.id,
            teamKey: team.key,
            teamName: team.name,
            autoSubmit: autoSubmitRegistration === true,
            createdAt: Date.now()
          });
          wx.showToast({ title: autoSubmitRegistration ? '球队已创建，正在报名' : '球队已创建，请确认报名', icon: autoSubmitRegistration ? 'success' : 'none' });
          setTimeout(() => wx.navigateBack(), 450);
          return;
        }
        wx.showToast({ title: synced ? '球队已保存' : '已保存，云端稍后同步', icon: synced ? 'success' : 'none' });
        this.closeForm();
        this.refreshTeams();
      })
      .catch((error) => {
        console.warn('[team-create] save team logo sync failed', error);
        wx.showToast({ title: error.message || '队徽同步失败，请重试', icon: 'none' });
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
