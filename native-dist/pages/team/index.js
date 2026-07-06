const ASSET_BASE = '/assets/pages/team/';
const DEFAULT_PLAYERS = [
  {
    id: 'demo-linhao',
    name: '林浩',
    number: '23',
    team: '蜂巢U10A',
    filter: 'beehive',
    avatar: `${ASSET_BASE}avatar-linhao.png`,
    teamLogo: `${ASSET_BASE}mini-logo-beehive.png`,
    tags: ['PG', '158cm', '10岁']
  },
  {
    id: 'demo-zhangzixuan',
    name: '张子轩',
    number: '7',
    team: '蜂巢U10A',
    filter: 'beehive',
    avatar: `${ASSET_BASE}avatar-zhangzixuan.png`,
    teamLogo: `${ASSET_BASE}mini-logo-beehive.png`,
    tags: ['SG', '160cm', '10岁']
  },
  {
    id: 'demo-liaoran',
    name: '李奥然',
    number: '11',
    team: '星火U10',
    filter: 'starfire',
    avatar: `${ASSET_BASE}avatar-liaoran.png`,
    teamLogo: `${ASSET_BASE}mini-logo-starfire.png`,
    tags: ['SF', '165cm', '10岁']
  },
  {
    id: 'demo-liuyuchen',
    name: '刘宇辰',
    number: '34',
    team: '未分队',
    filter: 'unassigned',
    avatar: `${ASSET_BASE}avatar-liuyuchen.png`,
    teamLogo: `${ASSET_BASE}mini-logo-unassigned.png`,
    tags: ['PF', '167cm', '10岁']
  },
  {
    id: 'demo-zhaozimo',
    name: '赵子墨',
    number: '30',
    team: '蜂巢U10A',
    filter: 'beehive',
    avatar: `${ASSET_BASE}avatar-zhaozimo.png`,
    teamLogo: `${ASSET_BASE}mini-logo-beehive.png`,
    tags: ['C', '170cm', '10岁']
  }
];

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'beehive', label: '蜂巢U10A' },
  { key: 'starfire', label: '星火U10' },
  { key: 'unassigned', label: '未分队' }
];

function normalizeNumber(value) {
  return String(value || '').trim();
}

function sortNumbers(numbers) {
  return numbers.sort((a, b) => Number(a) - Number(b));
}

function buildStoredPlayer(player, index) {
  return {
    id: player.id || `stored-${index}`,
    name: player.name || '未命名',
    number: normalizeNumber(player.number) || '--',
    team: player.team || '未分队',
    filter: player.filter || 'unassigned',
    avatar: player.avatar || `${ASSET_BASE}avatar-liuyuchen.png`,
    teamLogo: player.teamLogo || `${ASSET_BASE}mini-logo-unassigned.png`,
    tags: player.tags || ['待定', '身高', '年龄']
  };
}

Page({
  data: {
    assets: {
      bg: `${ASSET_BASE}player-library-bg.png`,
      statusBar: `${ASSET_BASE}status-bar.png`,
      logoTitle: `${ASSET_BASE}logo-and-title.png`,
      addButton: `${ASSET_BASE}button-add-player.png`,
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
    players: [],
    visiblePlayers: [],
    isEmptyVisible: false,
    filters: [],
    usedNumbersText: '暂无',
    stats: {
      total: 48,
      assigned: 43,
      unassigned: 5
    }
  },

  onLoad() {
    this.refreshPlayers();
  },

  onShow() {
    if (wx.hideTabBar) {
      wx.hideTabBar({ animation: false, fail: () => {} });
    }
    this.refreshPlayers();
  },

  refreshPlayers() {
    const storedPlayers = wx.getStorageSync('players') || [];
    const players = storedPlayers.length
      ? storedPlayers.map(buildStoredPlayer)
      : DEFAULT_PLAYERS;
    const usedNumbers = sortNumbers(players.map((player) => normalizeNumber(player.number)).filter((number) => number !== '--'));

    this.setData({
      players,
      usedNumbersText: usedNumbers.length ? usedNumbers.map((number) => `#${number}`).join('、') : '暂无'
    });
    this.applyFilters();
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const activeFilter = this.data.activeFilter;
    const visiblePlayers = this.data.players.filter((player) => {
      const matchFilter = activeFilter === 'all' || player.filter === activeFilter;
      const matchKeyword = !keyword || player.name.toLowerCase().includes(keyword) || player.number.includes(keyword);
      return matchFilter && matchKeyword;
    });
    const filters = FILTERS.map((item) => ({
      ...item,
      activeClass: item.key === activeFilter ? 'active' : ''
    }));

    this.setData({ visiblePlayers, isEmptyVisible: visiblePlayers.length === 0, filters });
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
    wx.showToast({ title: '可按队伍快速筛选', icon: 'none' });
  },

  openAddModal() {
    this.setData({ showAddModal: true });
  },

  closeAddModal() {
    this.setData({ showAddModal: false, name: '', number: '' });
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
    this.setData({ name: '', number: '', showAddModal: false, activeFilter: 'all', keyword: '' });
    this.refreshPlayers();
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  onEditPlayer() {
    wx.showToast({ title: '编辑资料即将开放', icon: 'none' });
  }
});

