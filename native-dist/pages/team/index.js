const { pullRoster, resolveImageUrl, scheduleRosterPush } = require('../../utils/roster-sync');
const ASSET_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team/';
const DEFAULT_TEAM_LOGO = `${ASSET_BASE}mini-logo-unassigned.png`;
const DATA_RESET_VERSION = 'player-real-data-20260708';

const DEFAULT_PLAYERS = [];

const DEFAULT_CATEGORIES = [
  { key: 'all', label: '全部', fixed: true },
  { key: 'unassigned', label: '未分队', fixed: true, system: true }
];

function ensureRealDataReset() {
  if (wx.getStorageSync('playerDataResetVersion') === DATA_RESET_VERSION) return;
  wx.setStorageSync('players', []);
  wx.setStorageSync('teamCategories', []);
  wx.setStorageSync('playerDataResetVersion', DATA_RESET_VERSION);
}

function normalizeNumber(value) {
  return String(value || '').trim();
}

function sortNumbers(numbers) {
  return numbers.sort((a, b) => Number(a) - Number(b));
}

function getStoredCategories() {
  const stored = wx.getStorageSync('teamCategories') || [];
  if (!Array.isArray(stored) || !stored.length) return DEFAULT_CATEGORIES;
  const cleanStored = stored.filter((item) => item && !['beehive', 'starfire', 'flyer-u10', 'shanhai-u12', 'blackhorse-u10', 'training-a', 'training-b', 'temp-team'].includes(item.key));
  return cleanStored.length ? cleanStored : DEFAULT_CATEGORIES;
}

function readStoredList(key) {
  const list = wx.getStorageSync(key) || [];
  return Array.isArray(list) ? list : [];
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

function addTeamLogo(map, team) {
  if (!team) return;
  const logo = team.logoUrl || team.teamLogo || team.logo || '';
  if (!logo) return;
  const label = normalizeText(team.label || team.name || team.teamName);
  const key = normalizeText(team.key || team.id);
  if (key) map[key] = logo;
  if (label) map[label] = logo;
}

function buildTeamLogoMap(categories) {
  const map = {};
  readStoredList('teams').forEach((team) => addTeamLogo(map, team));
  readStoredList('teamDrafts').forEach((team) => addTeamLogo(map, team));
  (categories || []).forEach((team) => addTeamLogo(map, team));
  return map;
}

function getPlayerTeamLogo(player, teamLogoMap) {
  if (player && player.filter === 'unassigned') return DEFAULT_TEAM_LOGO;
  const byKey = teamLogoMap && player ? teamLogoMap[player.filter] : '';
  const byName = teamLogoMap && player ? teamLogoMap[player.team] : '';
  return resolveImageUrl(byKey || byName || player.teamLogo || DEFAULT_TEAM_LOGO);
}

function isDemoPlayer(player) {
  return String(player && player.id || '').indexOf('demo-') === 0;
}

function buildStoredPlayer(player, index, teamLogoMap) {
  return {
    id: player.id || `stored-${index}`,
    name: player.name || '未命名',
    number: normalizeNumber(player.number) || '--',
    team: player.team || '未分队',
    filter: player.filter || 'unassigned',
    avatar: resolveImageUrl(player.avatar || `${ASSET_BASE}avatar-liuyuchen.png`),
    teamLogo: getPlayerTeamLogo(player, teamLogoMap),
    tags: player.tags || ['待定', '身高', '年龄']
  };
}

function countByCategory(players, category) {
  if (category.key === 'all') return players.length;
  return players.filter((player) => player.filter === category.key || player.team === category.label).length;
}

function getFilterSources() {
  return getStoredCategories().concat(readStoredList('teams')).concat(readStoredList('teamDrafts'));
}

function matchPlayerCategory(player, category) {
  if (category === 'all') return true;
  const categories = getFilterSources();
  const activeCategory = categories.find((item) => item.key === category);
  if (!activeCategory) return player.filter === category;
  const activeLabel = activeCategory.label || activeCategory.name || activeCategory.teamName;
  return player.filter === activeCategory.key || player.team === activeLabel;
}

function resolveRequestedFilter(options) {
  const requestedKey = decodeQueryValue(options && options.teamKey);
  if (requestedKey) return requestedKey;
  const requestedId = decodeQueryValue(options && options.teamId);
  const requestedName = decodeQueryValue(options && options.teamName);
  const teams = getFilterSources();
  const matched = teams.find((team) => {
    if (!team) return false;
    return normalizeText(team.key) === requestedKey ||
      normalizeText(team.id) === requestedId ||
      normalizeText(team.label || team.name || team.teamName) === requestedName;
  });
  if (matched && matched.key) return matched.key;
  return requestedKey || 'all';
}

function buildManagerItems(players, categories, type) {
  if (type === 'team') {
    const teams = categories.filter((item) => item.key !== 'all' && item.key !== 'unassigned');
    if (!teams.length) {
      return [{ key: 'empty-team', title: '暂无球队', desc: '当前没有已创建球队', badge: '空' }];
    }
    return teams.map((item) => ({
      key: item.key,
      title: item.label,
      desc: countByCategory(players, item) + ' 名球员',
      badge: item.common ? '常用' : '备用'
    }));
  }
  return categories.map((item) => ({
    key: item.key,
    title: item.label,
    desc: item.fixed ? '系统类别' : (item.common ? '显示在常用类别中' : '可在管理中设为常用'),
    badge: item.fixed ? '固定' : (item.common ? '常用' : '隐藏')
  }));
}

Page({
  data: {
    assets: {
      bg: `${ASSET_BASE}player-library-bg.png`,
      statusBar: `${ASSET_BASE}status-bar.png`,
      logoTitle: `${ASSET_BASE}logo-and-title.png`,
      addIcon: '/assets/pages/team/jiahao.png',
      searchIcon: `${ASSET_BASE}icon-search.png`,
      filterIcon: `${ASSET_BASE}icon-filter.png`,
      editIcon: `${ASSET_BASE}icon-edit.png`,
      summaryTotal: `${ASSET_BASE}summary-icon-total.png`,
      summaryAssigned: `${ASSET_BASE}summary-icon-assigned.png`,
      summaryUnassigned: `${ASSET_BASE}summary-icon-unassigned.png`
    },
    name: '',
    number: '',
    keyword: '',
    activeFilter: 'all',
    showAddModal: false,
    showManagerModal: false,
    showDeleteConfirm: false,
    pendingDeleteId: '',
    pendingDeleteName: '',
    managerTitle: '',
    managerDesc: '',
    managerItems: [],
    players: [],
    visiblePlayers: [],
    isEmptyVisible: false,
    categories: [],
    usedNumbersText: '暂无',
    stats: {
      total: 0,
      assigned: 0,
      unassigned: 0
    }
  },

  onLoad(options) {
    const activeFilter = resolveRequestedFilter(options || {});
    this.setData({ activeFilter, keyword: '' });
    this.refreshPlayers();
  },

  onShow() {
    if (wx.hideTabBar) {
      wx.hideTabBar({ animation: false, fail: () => {} });
    }
    this.refreshPlayers();
    pullRoster()
      .then(() => this.refreshPlayers())
      .catch((error) => console.warn('[team] pull roster failed', error));
  },

  refreshPlayers() {
    ensureRealDataReset();
    const storedPlayers = wx.getStorageSync('players') || [];
    const cleanStoredPlayers = storedPlayers.filter((player) => !isDemoPlayer(player));
    if (cleanStoredPlayers.length !== storedPlayers.length) {
      wx.setStorageSync('players', cleanStoredPlayers);
    }
    const categories = getStoredCategories();
    const teamLogoMap = buildTeamLogoMap(categories);
    const players = cleanStoredPlayers.map((player, index) => buildStoredPlayer(player, index, teamLogoMap));
    const usedNumbers = sortNumbers(players.map((player) => normalizeNumber(player.number)).filter((number) => number !== '--'));

    this.setData({
      players,
      categories,
      usedNumbersText: usedNumbers.length ? usedNumbers.map((number) => `#${number}`).join('、') : '暂无',
      stats: {
        total: players.length,
        assigned: players.filter((player) => player.filter !== 'unassigned' && player.team !== '未分队').length,
        unassigned: players.filter((player) => player.filter === 'unassigned' || player.team === '未分队').length
      }
    });
    this.applyFilters();
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const activeFilter = this.data.activeFilter;
    const visiblePlayers = this.data.players.filter((player) => {
      const matchFilter = matchPlayerCategory(player, activeFilter);
      const matchKeyword = !keyword || player.name.toLowerCase().includes(keyword) || player.number.includes(keyword);
      return matchFilter && matchKeyword;
    });
    const categories = this.data.categories.map((item) => ({
      ...item,
      activeClass: item.key === activeFilter ? 'active' : '',
      countText: String(countByCategory(this.data.players, item))
    }));

    this.setData({ visiblePlayers, isEmptyVisible: visiblePlayers.length === 0, categories });
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
    this.applyFilters();
  },

  onFilterTap(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.key || 'all' });
    this.applyFilters();
  },

  toggleFilter() {
    wx.showToast({ title: '左右滑动类别可快速筛选', icon: 'none' });
  },

  openAddModal() {
    wx.navigateTo({ url: '/pages/player-add/index?from=team' });
  },

  closeAddModal() {
    this.setData({ showAddModal: false, name: '', number: '' });
  },

  openTeamManager() {
    wx.navigateTo({ url: '/pages/team-create/index?from=player-library' });
  },

  openCategoryManager() {
    this.setData({
      showManagerModal: true,
      managerTitle: '类别管理',
      managerDesc: '把常用球队放到类别栏，不常用球队可先收起。',
      managerItems: buildManagerItems(this.data.players, this.data.categories, 'category')
    });
  },

  closeManagerModal() {
    this.setData({ showManagerModal: false, managerItems: [] });
  },

  onManagerItemTap() {
    wx.showToast({ title: '编辑能力即将开放', icon: 'none' });
  },

  noop() {},

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onNumberInput(event) {
    this.setData({ number: normalizeNumber(event.detail.value) });
  },

  addPlayer() {
    const name = this.data.name.trim();
    const number = normalizeNumber(this.data.number);
    const storedPlayers = wx.getStorageSync('players') || [];

    if (!name) {
      wx.showToast({ title: '请填写球员姓名', icon: 'none' });
      return;
    }

    if (!number) {
      wx.showToast({ title: '请填写球衣号码', icon: 'none' });
      return;
    }

    if (storedPlayers.some((player) => normalizeNumber(player.number) === number)) {
      wx.showToast({ title: `${number}号已被占用`, icon: 'none' });
      return;
    }

    const players = storedPlayers.concat({
      id: Date.now(),
      name,
      number,
      team: '未分队',
      filter: 'unassigned',
      tags: ['待定', '身高', '年龄']
    });
    wx.setStorageSync('players', players);
    scheduleRosterPush();
    this.setData({ name: '', number: '', showAddModal: false, activeFilter: 'all', keyword: '' });
    this.refreshPlayers();
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  onEditPlayer(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '未找到球员', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/player-add/index?mode=edit&id=${id}` });
  },

  onDeletePlayer(event) {
    const id = event.currentTarget.dataset.id;
    const player = this.data.players.filter((item) => String(item.id) === String(id))[0];
    if (!player) {
      wx.showToast({ title: '未找到球员', icon: 'none' });
      return;
    }
    this.setData({
      showDeleteConfirm: true,
      pendingDeleteId: String(id),
      pendingDeleteName: player.name || '该球员'
    });
  },

  cancelDeletePlayer() {
    this.setData({ showDeleteConfirm: false, pendingDeleteId: '', pendingDeleteName: '' });
  },

  confirmDeletePlayer() {
    const id = this.data.pendingDeleteId;
    if (!id) {
      this.cancelDeletePlayer();
      return;
    }
    const storedPlayers = wx.getStorageSync('players') || [];
    const nextPlayers = storedPlayers.filter((item) => String(item.id) !== String(id));
    wx.setStorageSync('players', nextPlayers);
    scheduleRosterPush(0);
    this.setData({ showDeleteConfirm: false, pendingDeleteId: '', pendingDeleteName: '' });
    this.refreshPlayers();
    wx.showToast({ title: '已删除', icon: 'success' });
  }});
