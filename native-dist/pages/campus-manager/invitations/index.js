const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

const allInvitations = [
  { id: 1, name: '张宇', phone: '138****1026', role: '全职教练', campus: '浦东校区', state: 'pending', status: '待激活', tone: 'orange', avatar: CLOUD_ROOT + 'pages/team/avatar-zhangzixuan.png', sentAt: '07-18 10:30', expiry: '剩余 2 天', expanded: false },
  { id: 2, name: '李娜', phone: '136****8821', role: '课程顾问', campus: '浦东校区', state: 'active', status: '已激活', tone: 'green', avatar: CLOUD_ROOT + 'pages/team/avatar-liuyuchen.png', sentAt: '07-17 15:20', expiry: '07-17 已加入', expanded: false },
  { id: 3, name: '王浩', phone: '135****7309', role: '兼职教练', campus: '浦东校区', state: 'expired', status: '已失效', tone: 'gray', avatar: CLOUD_ROOT + 'pages/team/avatar-linhao.png', sentAt: '07-12 09:10', expiry: '07-15 已失效', expanded: true },
  { id: 4, name: '陈晨', phone: '137****4518', role: '助理教练', campus: '浦东校区', state: 'pending', status: '待激活', tone: 'orange', avatar: CLOUD_ROOT + 'pages/team/avatar-liaoran.png', sentAt: '07-18 17:45', expiry: '剩余 3 天', expanded: false }
];

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      clock: COMMON_ROOT + 'icon-clock-orange-256.png',
      user: COMMON_ROOT + 'icon-user-orange-256.png',
      check: COMMON_ROOT + 'icon-check-orange-256.png',
      warning: COMMON_ROOT + 'icon-warning-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png'
    },
    metrics: [
      { label: '全部邀请', value: '24', tone: 'white' },
      { label: '待激活', value: '8', tone: 'orange' },
      { label: '已激活', value: '13', tone: 'green' },
      { label: '已失效', value: '3', tone: 'gray' }
    ],
    tabs: [
      { key: 'all', label: '全部', activeClass: 'active' },
      { key: 'pending', label: '待激活', activeClass: '' },
      { key: 'active', label: '已激活', activeClass: '' },
      { key: 'expired', label: '已失效', activeClass: '' }
    ],
    activeTab: 'all',
    invitations: allInvitations
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) {
        navTop = menu.top;
        navHeight = menu.height || 32;
      } else {
        navTop = wx.getSystemInfoSync().statusBarHeight || 20;
      }
    } catch (error) {
      console.warn('[campus-manager-invitations] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/staff/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  switchTab(event) {
    const key = event.currentTarget.dataset.key;
    const tabs = this.data.tabs.map((item) => Object.assign({}, item, { activeClass: item.key === key ? 'active' : '' }));
    const invitations = key === 'all' ? allInvitations : allInvitations.filter((item) => item.state === key);
    this.setData({ tabs, activeTab: key, invitations });
  },
  toggleCard(event) {
    const id = Number(event.currentTarget.dataset.id);
    const invitations = this.data.invitations.map((item) => item.id === id ? Object.assign({}, item, { expanded: !item.expanded }) : item);
    this.setData({ invitations });
  },
  resendInvite() {
    wx.showToast({ title: '邀请已重新发送', icon: 'success' });
  },
  createInvite() {
    wx.showToast({ title: '邀请入口已打开', icon: 'none' });
  }
});
