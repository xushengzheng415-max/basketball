const mainRoutes = {
  home: '/pages/home/index',
  tournament: '/pages/tournament/index',
  team: '/pages/team/index',
  education: '/pages/education/index',
  data: '/pages/data/index',
  mine: '/pages/mine/index'
};

function buildTabItems(activeKey) {
  return [
    { key: 'home', text: '工作台', iconClass: 'home', icon: activeKey === 'home' ? '/assets/tabbar/tab-home-selected.png' : '/assets/tabbar/tab-home.png', activeClass: activeKey === 'home' ? 'active' : '' },
    { key: 'tournament', text: '赛事', iconClass: 'trophy', icon: activeKey === 'tournament' ? '/assets/tabbar/tab-tournament-selected.png' : '/assets/tabbar/tab-tournament.png', activeClass: activeKey === 'tournament' ? 'active' : '' },
    { key: 'team', text: '球员', iconClass: 'user', icon: activeKey === 'team' ? '/assets/tabbar/tab-team-selected.png' : '/assets/tabbar/tab-team.png', activeClass: activeKey === 'team' ? 'active' : '' },
    { key: 'education', text: '教务', iconClass: 'edu', icon: activeKey === 'education' ? '/assets/tabbar/tab-education-selected.png' : '/assets/tabbar/tab-education.png', activeClass: activeKey === 'education' ? 'active' : '' },
    { key: 'data', text: '数据', iconClass: 'data', icon: activeKey === 'data' ? '/assets/tabbar/tab-data-selected.png' : '/assets/tabbar/tab-data.png', activeClass: activeKey === 'data' ? 'active' : '' },
    { key: 'mine', text: '我的', iconClass: 'mine', icon: activeKey === 'mine' ? '/assets/tabbar/tab-mine-selected.png' : '/assets/tabbar/tab-mine.png', activeClass: activeKey === 'mine' ? 'active' : '' }
  ];
}
const { callCloud } = require('../../utils/cloud');

const defaultProfile = {
  loggedIn: false,
  avatarUrl: '',
  nickName: '\u672a\u767b\u5f55\u7528\u6237',
  wxOpenId: '',
  wxUnionId: '',
  phoneNumber: ''
};

function getSavedProfile() {
  const profile = Object.assign({}, defaultProfile, wx.getStorageSync('userProfile') || {});
  return Object.assign({}, profile, {
    phoneNumberText: profile.phoneNumber || '未授权手机号',
    wxOpenIdText: profile.wxOpenId || '未获取'
  });
}

function getAdminUsers() {
  return wx.getStorageSync('adminUsers') || [];
}

function upsertAdminUser(profile) {
  const users = getAdminUsers();
  const id = profile.userId || profile.wxOpenId || 'local-user';
  const item = Object.assign({}, profile, {
    userId: id,
    source: profile.mode === 'guest' ? '\u6e38\u5ba2' : '\u5fae\u4fe1\u767b\u5f55',
    updatedAt: new Date().toLocaleString()
  });
  const next = [item].concat(users.filter((user) => user.userId !== id));
  wx.setStorageSync('adminUsers', next);
}

Page({
  data: {
    tabItems: buildTabItems('mine'),
    profile: defaultProfile,
    draftNickName: '',
    feedbackType: '\u529f\u80fd\u5efa\u8bae',
    feedbackTypes: [],
    feedbackTypeOptions: [
      { name: '\u529f\u80fd\u5efa\u8bae', activeClass: 'active' },
      { name: '\u95ee\u9898\u53cd\u9988', activeClass: '' },
      { name: '\u8d5b\u4e8b\u5408\u4f5c', activeClass: '' }
    ],
    feedbackContent: '',
    contact: '',
    feedbackCount: 0,
    redeemCode: '',
    redeemLoading: false,
    membership: null
  },
  onShow() {
    const profile = getSavedProfile();
    const feedbackList = wx.getStorageSync('feedbackList') || [];
    const membership = wx.getStorageSync('proEntitlement') || null;
    this.setData({ profile, draftNickName: profile.nickName, feedbackCount: feedbackList.length, membership });
  },
  login() {
    wx.reLaunch({ url: '/pages/login/index' });
  },
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将返回登录授权页。',
      confirmText: '退出',
      confirmColor: '#d83b01',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync('loginProfile');
        wx.removeStorageSync('userProfile');
        this.setData({ profile: defaultProfile, draftNickName: defaultProfile.nickName });
        wx.reLaunch({ url: '/pages/login/index' });
      }
    });
  },
  onChooseAvatar(event) {
    const profile = Object.assign({}, getSavedProfile(), { loggedIn: true, avatarUrl: event.detail.avatarUrl });
    wx.setStorageSync('userProfile', profile);
    upsertAdminUser(profile);
    callCloud('sxSaveUser', { profile });
    this.setData({ profile });
  },
  onNicknameInput(event) {
    this.setData({ draftNickName: event.detail.value });
  },
  saveProfile() {
    const nickName = this.data.draftNickName.trim() || '赛小蜂用户';
    const profile = Object.assign({}, this.data.profile, {
      loggedIn: true,
      userId: this.data.profile.userId || `user-${Date.now()}`,
      nickName
    });
    wx.setStorageSync('userProfile', profile);
    upsertAdminUser(profile);
    callCloud('sxSaveUser', { profile });
    this.setData({ profile: Object.assign({}, profile, { phoneNumberText: profile.phoneNumber || '未授权手机号', wxOpenIdText: profile.wxOpenId || '未获取' }) });
    wx.showToast({ title: '\u8d44\u6599\u5df2\u4fdd\u5b58', icon: 'success' });
  },
  setFeedbackType(event) {
    const feedbackType = event.currentTarget.dataset.type;
    const feedbackTypeOptions = this.data.feedbackTypeOptions.map((item) => Object.assign({}, item, {
      activeClass: item.name === feedbackType ? 'active' : ''
    }));
    this.setData({ feedbackType, feedbackTypeOptions });
  },
  onFeedbackInput(event) {
    this.setData({ feedbackContent: event.detail.value });
  },
  onContactInput(event) {
    this.setData({ contact: event.detail.value });
  },
  onRedeemInput(event) {
    this.setData({ redeemCode: event.detail.value });
  },
  async redeemMembership() {
    const code = this.data.redeemCode.trim();
    if (!code) {
      wx.showToast({ title: '请输入会员码', icon: 'none' });
      return;
    }
    if (this.data.redeemLoading) return;
    this.setData({ redeemLoading: true });
    wx.showLoading({ title: '兑换中' });
    const result = await callCloud('sxRedeemCode', { code });
    wx.hideLoading();
    this.setData({ redeemLoading: false });

    if (!result || !result.ok) {
      wx.showToast({ title: result && result.message ? result.message : '兑换失败', icon: 'none' });
      return;
    }

    wx.setStorageSync('proEntitlement', result.entitlement || {});
    this.setData({ redeemCode: '', membership: result.entitlement || null });
    wx.showToast({ title: '\u4f1a\u5458\u5df2\u89e3\u9501', icon: 'success' });
  },
  goMcSettings() {
    wx.navigateTo({ url: '/pages/mc-settings/index' });
  },
  submitFeedback() {
    const content = this.data.feedbackContent.trim();
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }
    const profile = getSavedProfile();
    const feedbackList = wx.getStorageSync('feedbackList') || [];
    const item = {
      id: Date.now(),
      type: this.data.feedbackType,
      content,
      contact: this.data.contact.trim(),
      user: {
        nickName: profile.nickName,
        wxOpenId: profile.wxOpenId,
        wxUnionId: profile.wxUnionId,
        phoneNumber: profile.phoneNumber
      },
      createdAt: new Date().toLocaleString()
    };
    wx.setStorageSync('feedbackList', [item].concat(feedbackList));
    callCloud('sxSubmitFeedback', item);
    this.setData({ feedbackContent: '', contact: '', feedbackCount: feedbackList.length + 1 });
    wx.showToast({ title: '\u53cd\u9988\u5df2\u63d0\u4ea4', icon: 'success' });
  },
  onTabTap(event) {
    const key = event.currentTarget.dataset.key;
    const url = mainRoutes[key];
    if (!url) return;
    wx.redirectTo({ url });
  }
});
