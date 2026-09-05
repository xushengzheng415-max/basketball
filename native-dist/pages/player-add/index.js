const ASSET_BASE = '/assets/pages/player-add/';
const { pullRoster, pushRoster, scheduleRosterPush, resolveImageUrl } = require('../../utils/roster-sync');
const { cloud } = require('../../utils/cloud');
const { belongsToTeam, membershipFields, selectionFromPlayer } = require('../../utils/player-team-membership');
const DATA_RESET_VERSION = 'player-real-data-20260708';
const TEAM_ASSET_BASE = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/pages/team/';

const DEFAULT_CATEGORIES = [
  { key: 'unassigned', label: '未分队', system: true }
];
const NO_TEAM_OPTION = { key: 'unassigned', label: '无', value: '' };

function ensureRealDataReset() {
  if (wx.getStorageSync('playerDataResetVersion') === DATA_RESET_VERSION) return;
  wx.setStorageSync('players', []);
  wx.setStorageSync('teamCategories', []);
  wx.setStorageSync('playerDataResetVersion', DATA_RESET_VERSION);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function decodeQueryValue(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch (error) {
    return String(value || '');
  }
}

function normalizeNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '').slice(0, 2);
}

function imageExtension(filePath) {
  const match = String(filePath || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const extension = match ? match[1].toLowerCase() : 'jpg';
  return ['jpg', 'jpeg', 'png', 'bmp'].includes(extension) ? extension : 'jpg';
}

function buildNumberOptions(start, end, unit) {
  const options = [];
  for (let value = start; value <= end; value += 1) {
    options.push(`${value}${unit}`);
  }
  return options;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!number) return fallback;
  return Math.max(min, Math.min(max, number));
}

function findOptionIndex(options, value, unit) {
  const text = `${value}${unit}`;
  const index = options.indexOf(text);
  return index >= 0 ? index : 0;
}

function getTeams() {
  const map = {};
  const addTeam = (item) => {
    if (!item || ['all', 'beehive', 'starfire', 'flyer-u10', 'shanhai-u12', 'blackhorse-u10', 'training-a', 'training-b', 'temp-team'].includes(item.key)) return;
    const label = item.label || item.name || item.teamName || '';
    if (!label) return;
    const key = item.key || item.id || makeSimpleTeamKey(label);
    map[key] = Object.assign({}, map[key] || {}, {
      key,
      label,
      logoUrl: item.logoUrl || item.teamLogo || item.logo || (map[key] && map[key].logoUrl) || ''
    });
  };
  const categories = wx.getStorageSync('teamCategories') || [];
  const teams = wx.getStorageSync('teams') || [];
  const drafts = wx.getStorageSync('teamDrafts') || [];
  (Array.isArray(categories) ? categories : []).forEach(addTeam);
  (Array.isArray(teams) ? teams : []).forEach(addTeam);
  (Array.isArray(drafts) ? drafts : []).forEach(addTeam);
  const source = Object.keys(map).length ? Object.keys(map).map((key) => map[key]) : DEFAULT_CATEGORIES;
  const availableTeams = source.filter((item) => item.key !== 'all' && item.key !== 'unassigned');
  return [NO_TEAM_OPTION].concat(availableTeams);
}

function decorateTeams(teams, selectedIds) {
  const selected = new Set((selectedIds || []).map(String));
  return (teams || []).filter((team) => team && team.key !== 'unassigned').map((team) => Object.assign({}, team, {
    selectedClass: selected.has(String(team.key)) ? 'active' : ''
  }));
}

function makeSimpleTeamKey(label) {
  return String(label || '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') || 'unassigned';
}

function makeKey(label) {
  if (!normalizeText(label) || label === '无' || label === '未分队') return 'unassigned';
  const map = getTeams().filter((team) => team.label === label)[0];
  if (map) return map.key;
  return `team-${Date.now()}`;
}

function getTeamLogo(teamKey) {
  const team = getTeams().find((item) => item.key === teamKey || item.label === teamKey);
  if (team && team.logoUrl) return team.logoUrl;
  if (teamKey === 'beehive') return `${TEAM_ASSET_BASE}mini-logo-beehive.png`;
  if (teamKey === 'starfire') return `${TEAM_ASSET_BASE}mini-logo-starfire.png`;
  return `${TEAM_ASSET_BASE}mini-logo-unassigned.png`;
}

function parseHeight(player) {
  if (player.height) return Number(player.height);
  const tags = Array.isArray(player.tags) ? player.tags : [];
  const heightTag = tags.filter((tag) => String(tag).indexOf('cm') > -1)[0];
  return heightTag ? Number(String(heightTag).replace(/[^0-9]/g, '')) : 160;
}

function parseAge(player) {
  if (player.age) return normalizeNumber(player.age);
  const tags = Array.isArray(player.tags) ? player.tags : [];
  const ageTag = tags.filter((tag) => String(tag).indexOf('岁') > -1)[0];
  return ageTag ? normalizeNumber(ageTag) : '';
}

function parseWeight(player) {
  if (player.weight) return Number(player.weight);
  const tags = Array.isArray(player.tags) ? player.tags : [];
  const weightTag = tags.filter((tag) => String(tag).indexOf('kg') > -1)[0];
  return weightTag ? Number(String(weightTag).replace(/[^0-9]/g, '')) : 35;
}

function parsePosition(player) {
  if (player.position) return player.position;
  const tags = Array.isArray(player.tags) ? player.tags : [];
  const tag = tags.filter((item) => ['PG', 'SG', 'SF', 'PF', 'C'].includes(item))[0];
  return tag || 'PG';
}

Page({
  data: {
    assets: {
      bg: `${ASSET_BASE}background-add-player-clean.png`,
      avatarPlaceholder: `${ASSET_BASE}avatar-placeholder-player.png`,
      cameraIcon: `${ASSET_BASE}icon-camera-common.svg`,
      chevronIcon: `${ASSET_BASE}icon-chevron-right-common.svg`,
      plusIcon: `${ASSET_BASE}icon-plus-common.svg`,
      minusIcon: `${ASSET_BASE}icon-minus-common.svg`
    },
    pageTitle: '添加球员',
    saveText: '保存球员',
    mode: 'add',
    editId: '',
    editStorageIndex: -1,
    avatar: '',
    avatarSrc: '/assets/pages/player-add/avatar-placeholder-player.png',
    name: '',
    number: '',
    team: '',
    teamText: '无',
    teamPlaceholderClass: '',
    teamIndex: 0,
    selectedTeamIds: [],
    selectedTeamNames: [],
    teamOptions: [],
    requestedTeamKey: '',
    requestedTeamName: '',
    teams: [],
    positions: [
      { key: 'PG', activeClass: 'active' },
      { key: 'SG', activeClass: '' },
      { key: 'SF', activeClass: '' },
      { key: 'PF', activeClass: '' },
      { key: 'C', activeClass: '' }
    ],
    position: 'PG',
    heightOptions: buildNumberOptions(100, 230, 'cm'),
    heightIndex: 60,
    heightText: '160cm',
    height: 160,
    weightOptions: buildNumberOptions(20, 120, 'kg'),
    weightIndex: 15,
    weightText: '35kg',
    weight: 35,
    age: '',
    guardian: '',
    phone: '',
    showCropper: false,
    cropSrc: '',
    cropX: 0,
    cropY: 0,
    cropScale: 1,
    cropScaleText: '100%',
    cropImageWidth: 0,
    cropImageHeight: 0
  },

  onLoad(options = {}) {
    ensureRealDataReset();
    const teams = getTeams();
    const requestedTeamKey = decodeQueryValue(options.teamKey);
    const requestedTeamName = decodeQueryValue(options.teamName);
    this.setData({ teams, teamOptions: decorateTeams(teams, []), requestedTeamKey, requestedTeamName });
    if (options && options.mode === 'edit' && options.id) {
      this.loadPlayerForEdit(options.id, teams);
    } else {
      this.applyRequestedTeam(teams, requestedTeamKey, requestedTeamName);
    }
    pullRoster().then(() => {
      const syncedTeams = getTeams();
      this.setData({ teams: syncedTeams, teamOptions: decorateTeams(syncedTeams, this.data.selectedTeamIds) });
      if (options && options.mode === 'edit' && options.id && !this.avatarChanged) {
        this.loadPlayerForEdit(options.id, syncedTeams);
      } else {
        this.applyRequestedTeam(syncedTeams, this.data.requestedTeamKey, this.data.requestedTeamName);
      }
    }).catch((error) => console.warn('[player-add] pull roster failed', error));
  },

  applyRequestedTeam(teams, teamKey, teamName) {
    const requestedKey = normalizeText(teamKey);
    const requestedName = normalizeText(teamName);
    if (!requestedKey && !requestedName) return;
    const index = (teams || []).findIndex((team) => {
      if (!team || team.key === 'unassigned') return false;
      return normalizeText(team.key) === requestedKey || normalizeText(team.label) === requestedName;
    });
    if (index < 0) return;
    const team = teams[index];
    const selectedTeamIds = Array.from(new Set((this.data.selectedTeamIds || []).concat(String(team.key))));
    const selectedTeams = (teams || []).filter((item) => selectedTeamIds.includes(String(item.key)));
    const membership = membershipFields(selectedTeams);
    this.setData({
      teamIndex: index,
      team: membership.team,
      teamText: membership.teamNames.join('、') || '无',
      teamPlaceholderClass: '',
      selectedTeamIds: membership.teamIds,
      selectedTeamNames: membership.teamNames,
      teamOptions: decorateTeams(teams, membership.teamIds)
    });
  },

  onShow() {
    if (wx.hideTabBar) {
      wx.hideTabBar({ animation: false, fail: () => {} });
    }
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({ url: '/pages/team/index' });
  },

  chooseAvatar() {
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0];
          if (file && file.size > 2 * 1024 * 1024) {
            wx.showToast({ title: '头像不能超过 2MB', icon: 'none' });
            return;
          }
          this.openCropper(file ? file.tempFilePath : '');
        }
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res) => {
        const avatar = res.tempFilePaths[0] || '';
        this.openCropper(avatar);
      }
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    let value = event.detail.value;
    if (field === 'number') value = normalizeNumber(value);
    this.setData({ [field]: value });
  },

  onTeamToggle(event) {
    const key = String(event.currentTarget.dataset.key || '');
    const selected = new Set((this.data.selectedTeamIds || []).map(String));
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    const selectedTeams = (this.data.teams || []).filter((team) => selected.has(String(team.key)));
    const membership = membershipFields(selectedTeams);
    this.setData({
      team: membership.team,
      teamText: membership.teamNames.join('、') || '无',
      selectedTeamIds: membership.teamIds,
      selectedTeamNames: membership.teamNames,
      teamOptions: decorateTeams(this.data.teams, membership.teamIds),
      teamPlaceholderClass: membership.teamIds.length ? '' : 'placeholder'
    });
  },

  selectPosition(event) {
    const position = event.currentTarget.dataset.key || 'PG';
    const positions = this.data.positions.map((item) => ({
      key: item.key,
      activeClass: item.key === position ? 'active' : ''
    }));
    this.setData({ position, positions });
  },

  onHeightChange(event) {
    const heightIndex = Number(event.detail.value);
    const heightText = this.data.heightOptions[heightIndex] || '160cm';
    this.setData({
      heightIndex,
      heightText,
      height: Number(heightText.replace(/[^0-9]/g, '')) || 160
    });
  },

  onWeightChange(event) {
    const weightIndex = Number(event.detail.value);
    const weightText = this.data.weightOptions[weightIndex] || '35kg';
    this.setData({
      weightIndex,
      weightText,
      weight: Number(weightText.replace(/[^0-9]/g, '')) || 35
    });
  },

  loadPlayerForEdit(id, teams) {
    const storedPlayers = wx.getStorageSync('players') || [];
    const playerIndex = storedPlayers.findIndex((item, index) =>
      String(item.id || `stored-${index}`) === String(id));
    const player = playerIndex >= 0 ? storedPlayers[playerIndex] : null;
    if (!player) {
      wx.showToast({ title: '球员不存在', icon: 'none' });
      return;
    }

    const teamLabel = normalizeText(player.team);
    let nextTeams = teams;
    let teamIndex = nextTeams.findIndex((team) => (team.key === 'unassigned' ? '' : team.label) === teamLabel);
    if (teamIndex < 0 && teamLabel) {
      nextTeams = nextTeams.concat({ key: player.filter || makeKey(teamLabel), label: teamLabel });
      teamIndex = nextTeams.length - 1;
    }
    if (teamIndex < 0) teamIndex = 0;

    const selectedTeams = selectionFromPlayer(player, nextTeams);
    const membership = membershipFields(selectedTeams);
    const position = parsePosition(player);
    const positions = this.data.positions.map((item) => ({
      key: item.key,
      activeClass: item.key === position ? 'active' : ''
    }));
    const height = clampNumber(parseHeight(player), 100, 230, 160);
    const weight = clampNumber(parseWeight(player), 20, 120, 35);
    const heightIndex = findOptionIndex(this.data.heightOptions, height, 'cm');
    const weightIndex = findOptionIndex(this.data.weightOptions, weight, 'kg');

    this.setData({
      pageTitle: '编辑球员',
      saveText: '保存修改',
      mode: 'edit',
      editId: String(id),
      editStorageIndex: playerIndex,
      teams: nextTeams,
      avatar: player.avatarFileID || player.avatar || '',
      avatarSrc: resolveImageUrl(player.avatar || this.data.assets.avatarPlaceholder),
      name: player.name || '',
      number: normalizeNumber(player.number),
      team: teamLabel,
      teamText: membership.teamNames.join('、') || teamLabel || '无',
      teamPlaceholderClass: '',
      teamIndex,
      selectedTeamIds: membership.teamIds,
      selectedTeamNames: membership.teamNames,
      teamOptions: decorateTeams(nextTeams, membership.teamIds),
      position,
      positions,
      height,
      heightIndex,
      heightText: `${height}cm`,
      weight,
      weightIndex,
      weightText: `${weight}kg`,
      age: parseAge(player),
      guardian: player.guardian || '',
      phone: player.phone || '',
    });
  },

  openCropper(src) {
    if (!src) return;
    this.setData({
      showCropper: true,
      cropSrc: src,
      cropX: 0,
      cropY: 0,
      cropScale: 1,
      cropScaleText: '100%',
      cropImageWidth: 0,
      cropImageHeight: 0
    });
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#cropArea').boundingClientRect();
      query.exec((res) => {
        const area = res && res[0];
        if (!area) return;
        this._cropAreaRect = area;
        wx.getImageInfo({
          src,
          success: (info) => this.initializeCropImage(area, info.width, info.height),
          fail: () => this.initializeCropImage(area, 1, 1)
        });
      });
    });
  },

  initializeCropImage(area, sourceWidth, sourceHeight) {
    const rpxScale = area.height / 620;
    const frameSize = 480 * rpxScale;
    const frameLeft = (area.width - frameSize) / 2;
    const frameTop = 70 * rpxScale;
    const ratio = sourceWidth / sourceHeight || 1;
    const imageWidth = ratio >= 1 ? frameSize * ratio : frameSize;
    const imageHeight = ratio >= 1 ? frameSize : frameSize / ratio;
    const cropX = frameLeft + (frameSize - imageWidth) / 2;
    const cropY = frameTop + (frameSize - imageHeight) / 2;
    this.setData({
      cropImageWidth: imageWidth,
      cropImageHeight: imageHeight,
      cropX,
      cropY
    });
  },

  getCropFrame() {
    const area = this._cropAreaRect;
    if (!area) return null;
    const rpxScale = area.height / 620;
    const size = 480 * rpxScale;
    return {
      left: (area.width - size) / 2,
      top: 70 * rpxScale,
      size
    };
  },

  clampCropPosition(x, y, scale) {
    const frame = this.getCropFrame();
    if (!frame) return { x, y };
    const scaledWidth = this.data.cropImageWidth * scale;
    const scaledHeight = this.data.cropImageHeight * scale;
    return {
      x: Math.min(frame.left, Math.max(frame.left + frame.size - scaledWidth, x)),
      y: Math.min(frame.top, Math.max(frame.top + frame.size - scaledHeight, y))
    };
  },

  getTouchPoint(touch) {
    const area = this._cropAreaRect || { left: 0, top: 0 };
    return {
      x: touch.clientX - area.left,
      y: touch.clientY - area.top
    };
  },

  onCropTouchStart(event) {
    const touches = event.touches || [];
    if (!touches.length) return;
    if (touches.length > 1) {
      const first = this.getTouchPoint(touches[0]);
      const second = this.getTouchPoint(touches[1]);
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2
      };
      this._cropGesture = {
        type: 'scale',
        distance: Math.hypot(second.x - first.x, second.y - first.y) || 1,
        scale: this.data.cropScale,
        anchorX: (midpoint.x - this.data.cropX) / this.data.cropScale,
        anchorY: (midpoint.y - this.data.cropY) / this.data.cropScale
      };
      return;
    }
    const point = this.getTouchPoint(touches[0]);
    this._cropGesture = {
      type: 'move',
      startX: point.x,
      startY: point.y,
      cropX: this.data.cropX,
      cropY: this.data.cropY
    };
  },

  onCropTouchMove(event) {
    const touches = event.touches || [];
    if (!touches.length) return;
    if (touches.length > 1) {
      if (!this._cropGesture || this._cropGesture.type !== 'scale') {
        this.onCropTouchStart(event);
        return;
      }
      const first = this.getTouchPoint(touches[0]);
      const second = this.getTouchPoint(touches[1]);
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2
      };
      const distance = Math.hypot(second.x - first.x, second.y - first.y) || 1;
      const scale = Math.max(1, Math.min(3, this._cropGesture.scale * distance / this._cropGesture.distance));
      const position = this.clampCropPosition(
        midpoint.x - this._cropGesture.anchorX * scale,
        midpoint.y - this._cropGesture.anchorY * scale,
        scale
      );
      this.setData({
        cropScale: scale,
        cropScaleText: `${Math.round(scale * 100)}%`,
        cropX: position.x,
        cropY: position.y
      });
      return;
    }
    if (!this._cropGesture || this._cropGesture.type !== 'move') {
      this.onCropTouchStart(event);
      return;
    }
    const point = this.getTouchPoint(touches[0]);
    const position = this.clampCropPosition(
      this._cropGesture.cropX + point.x - this._cropGesture.startX,
      this._cropGesture.cropY + point.y - this._cropGesture.startY,
      this.data.cropScale
    );
    this.setData({ cropX: position.x, cropY: position.y });
  },

  onCropTouchEnd(event) {
    this._cropGesture = null;
    if (event.touches && event.touches.length) {
      this.onCropTouchStart(event);
    }
  },

  changeCropZoom(event) {
    const step = Number(event.currentTarget.dataset.step || 0);
    const oldScale = this.data.cropScale || 1;
    const nextScale = Math.max(1, Math.min(3, Number((oldScale + step).toFixed(2))));
    const frame = this.getCropFrame();
    if (!frame) return;
    const centerX = frame.left + frame.size / 2;
    const centerY = frame.top + frame.size / 2;
    const anchorX = (centerX - this.data.cropX) / oldScale;
    const anchorY = (centerY - this.data.cropY) / oldScale;
    const position = this.clampCropPosition(
      centerX - anchorX * nextScale,
      centerY - anchorY * nextScale,
      nextScale
    );
    this.setData({
      cropScale: nextScale,
      cropScaleText: `${Math.round(nextScale * 100)}%`,
      cropX: position.x,
      cropY: position.y
    });
  },
  cancelCrop() {
    this.setData({ showCropper: false, cropSrc: '' });
  },

  confirmCrop() {
    if (!this.data.cropSrc) return;
    wx.showLoading({ title: '裁剪中' });
    wx.getImageInfo({
      src: this.data.cropSrc,
      success: (info) => {
        const query = wx.createSelectorQuery().in(this);
        query.select('#cropArea').boundingClientRect();
        query.select('#avatarCropCanvas').fields({ node: true, size: true });
        query.exec((res) => {
          const area = res[0];
          const canvasInfo = res[1];
          if (!area || !canvasInfo || !canvasInfo.node) {
            wx.hideLoading();
            this.useOriginalCropImage();
            return;
          }

          const canvas = canvasInfo.node;
          const ctx = canvas.getContext('2d');
          const outputSize = 320;
          canvas.width = outputSize;
          canvas.height = outputSize;

          const rpxScale = area.height / 620;
          const frameSize = 480 * rpxScale;
          const frameLeft = (area.width - frameSize) / 2;
          const frameTop = 70 * rpxScale;
          const scale = this.data.cropScale || 1;
          const imageWidth = this.data.cropImageWidth || (760 * rpxScale);
          const imageHeight = this.data.cropImageHeight || (700 * rpxScale);
          const displayScale = Math.max(imageWidth / info.width, imageHeight / info.height);
          const renderedWidth = info.width * displayScale;
          const renderedHeight = info.height * displayScale;
          const offsetX = (imageWidth - renderedWidth) / 2;
          const offsetY = (imageHeight - renderedHeight) / 2;
          const sourceX = Math.max(0, (frameLeft - this.data.cropX - offsetX * scale) / (displayScale * scale));
          const sourceY = Math.max(0, (frameTop - this.data.cropY - offsetY * scale) / (displayScale * scale));
          const sourceSize = Math.min(info.width - sourceX, info.height - sourceY, frameSize / (displayScale * scale));

          const image = canvas.createImage();
          image.onload = () => {
            ctx.clearRect(0, 0, outputSize, outputSize);
            ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
            wx.canvasToTempFilePath({
              canvas,
              fileType: 'jpg',
              quality: 0.92,
              destWidth: outputSize,
              destHeight: outputSize,
              success: (result) => {
                this.finishCropWithAvatar(result.tempFilePath);
              },
              fail: () => {
                wx.hideLoading();
                this.useOriginalCropImage();
              }
            }, this);
          };
          image.onerror = () => {
            wx.hideLoading();
            this.useOriginalCropImage();
          };
          image.src = this.data.cropSrc;
        });
      },
      fail: () => {
        wx.hideLoading();
        this.useOriginalCropImage();
      }
    });
  },

  isStableAvatarPath(path) {
    return String(path || '').startsWith('cloud://');
  },

  saveAvatarToLocal(tempFilePath) {
    return new Promise((resolve, reject) => {
      if (!wx.saveFile) {
        reject(new Error('saveFile unavailable'));
        return;
      }
      wx.saveFile({
        tempFilePath,
        success: (res) => resolve(res.savedFilePath || tempFilePath),
        fail: reject
      });
    });
  },

  persistAvatarFile(tempFilePath) {
    return new Promise((resolve, reject) => {
      if (!tempFilePath || this.isStableAvatarPath(tempFilePath)) {
        resolve(tempFilePath || '');
        return;
      }
      if (!cloud || !cloud.callFunction) {
        reject(new Error('云端人像抠图服务未初始化'));
        return;
      }
      const fileSystem = wx.getFileSystemManager();
      fileSystem.readFile({
        filePath: tempFilePath,
        encoding: 'base64',
        success: (file) => {
          cloud.callFunction({
            name: 'sxUploadAvatar',
            data: { base64: file.data, ext: imageExtension(tempFilePath), removeBackground: true }
          }).then((response) => {
            const result = response && response.result ? response.result : response;
            if (!result || result.ok !== true || !result.fileID) {
              reject(new Error(result && result.error || '人像抠图未返回透明头像'));
              return;
            }
            resolve(result.fileID);
          }).catch(reject);
        },
        fail: reject
      });
    });
  },

  finishCropWithAvatar(tempFilePath, toastTitle) {
    wx.showLoading({ title: '智能抠图中' });
    this.persistAvatarFile(tempFilePath)
      .then((avatarPath) => {
        this.avatarChanged = true;
        this.setData({
          avatar: avatarPath,
          avatarSrc: avatarPath || this.data.assets.avatarPlaceholder,
          showCropper: false,
          cropSrc: ''
        });
        wx.showToast({ title: toastTitle || '透明头像已生成', icon: 'success' });
      })
      .catch((error) => {
        console.warn('[player-add] upload avatar failed', error);
        wx.showToast({ title: error.message || '人像抠图失败，请重试', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  useOriginalCropImage() {
    if (!this.data.cropSrc) return;
    wx.showLoading({ title: '保存头像' });
    this.finishCropWithAvatar(this.data.cropSrc, '已使用原图');
  },

  validateForm() {
    const name = normalizeText(this.data.name);
    const number = normalizeNumber(this.data.number);
    const team = normalizeText(this.data.team);
    const age = normalizeNumber(this.data.age);
    const phone = normalizeText(this.data.phone);
    const storedPlayers = wx.getStorageSync('players') || [];

    if (!name) return '请输入球员姓名';
    if (!number) return '请输入球衣号码';
    if (Number(number) < 1 || Number(number) > 99) return '球衣号码为 1-99';
    const selectedTeams = (this.data.teams || []).filter((item) => (this.data.selectedTeamIds || []).includes(String(item.key)));
    const numberUsedInSameTeam = selectedTeams.length > 0 && storedPlayers.some((player) => {
      if (String(player.id) === String(this.data.editId)) return false;
      return normalizeNumber(player.number) === number && selectedTeams.some((item) => belongsToTeam(player, item));
    });
    if (numberUsedInSameTeam) return `所选球队中${number}号已被占用`;
    if (!age) return '请输入年龄';
    if (!phone) return '请输入联系电话';
    return '';
  },
  savePlayer() {
    const error = this.validateForm();
    if (error) {
      wx.showToast({ title: error, icon: 'none' });
      return;
    }

    const selectedTeams = (this.data.teams || []).filter((item) => (this.data.selectedTeamIds || []).includes(String(item.key)));
    const membership = membershipFields(selectedTeams);
    const teamKey = membership.filter;
    wx.showLoading({ title: '保存球员' });
    let avatarUploaded = true;
    Promise.resolve(this.persistAvatarFile(this.data.avatar || ''))
      .catch((uploadError) => {
        avatarUploaded = false;
        console.warn('[player-add] save avatar sync failed, fallback local avatar', uploadError);
        return this.data.avatar || this.data.assets.avatarPlaceholder;
      })
      .then(async (avatarPath) => {
        const storedPlayers = wx.getStorageSync('players') || [];
        const player = {
          id: this.data.editId || `player-${Date.now()}`,
          name: normalizeText(this.data.name),
          number: normalizeNumber(this.data.number),
          team: membership.team,
          filter: membership.filter,
          teamIds: membership.teamIds,
          teamNames: membership.teamNames,
          avatarFileID: avatarPath || this.data.assets.avatarPlaceholder,
          avatar: avatarPath || this.data.assets.avatarPlaceholder,
          teamLogoFileID: getTeamLogo(teamKey),
          teamLogo: getTeamLogo(teamKey),
          position: this.data.position,
          tags: [this.data.position, `${this.data.height}cm`, `${this.data.weight}kg`, `${normalizeNumber(this.data.age)}岁`],
          height: this.data.height,
          weight: this.data.weight,
          age: normalizeNumber(this.data.age),
          guardian: normalizeText(this.data.guardian),
          phone: normalizeText(this.data.phone),
          createdAt: Date.now()
        };

        if (this.data.mode === 'edit') {
          wx.setStorageSync('players', storedPlayers.map((item, index) =>
            (index === this.data.editStorageIndex || String(item.id) === String(this.data.editId) ? {
            ...item,
            ...player,
            createdAt: item.createdAt || player.createdAt,
            updatedAt: Date.now()
          } : item)));
        } else {
          wx.setStorageSync('players', [player].concat(storedPlayers));
        }
        let synced = true;
        try {
          await pushRoster();
        } catch (syncError) {
          synced = false;
          console.warn('[player-add] push roster failed, schedule retry', syncError);
          scheduleRosterPush(3000);
        }
        wx.showToast({
          title: this.data.mode === 'edit'
            ? (synced ? '已更新' : '已更新，云端稍后同步')
            : (synced ? '已保存' : '已保存，云端稍后同步'),
          icon: 'success'
        });
        if (!avatarUploaded) {
          wx.showToast({ title: '头像同步失败，已保存本地', icon: 'none' });
        }
        setTimeout(() => {
          wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/team/index' }) });
        }, 500);
      })
      .catch((uploadError) => {
        console.warn('[player-add] save failed', uploadError);
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  }
});
