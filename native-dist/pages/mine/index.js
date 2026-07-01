const defaultProfile = {
  loggedIn: false,
  avatarUrl: '',
  nickName: '未登录用户'
};

Page({
  data: {
    profile: defaultProfile,
    feedbackType: '功能建议',
    feedbackTypes: ['功能建议', '问题反馈', '赛事合作'],
    feedbackContent: '',
    contact: '',
    feedbackCount: 0
  },
  onShow() {
    const profile = Object.assign({}, defaultProfile, wx.getStorageSync('userProfile') || {});
    const feedbackList = wx.getStorageSync('feedbackList') || [];
    this.setData({ profile, feedbackCount: feedbackList.length });
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
        this.setData({ profile: defaultProfile });
        wx.reLaunch({ url: '/pages/login/index' });
      }
    });
  },
  onChooseAvatar(event) {
    const profile = Object.assign({}, this.data.profile, {
      loggedIn: true,
      avatarUrl: event.detail.avatarUrl
    });
    wx.setStorageSync('userProfile', profile);
    this.setData({ profile });
  },
  onNicknameInput(event) {
    const profile = Object.assign({}, this.data.profile, {
      loggedIn: true,
      nickName: event.detail.value || '赛小蜂用户'
    });
    wx.setStorageSync('userProfile', profile);
    this.setData({ profile });
  },
  setFeedbackType(event) {
    this.setData({ feedbackType: event.currentTarget.dataset.type });
  },
  onFeedbackInput(event) {
    this.setData({ feedbackContent: event.detail.value });
  },
  onContactInput(event) {
    this.setData({ contact: event.detail.value });
  },
  submitFeedback() {
    if (!this.data.feedbackContent.trim()) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }
    const feedbackList = wx.getStorageSync('feedbackList') || [];
    const item = {
      id: Date.now(),
      type: this.data.feedbackType,
      content: this.data.feedbackContent.trim(),
      contact: this.data.contact.trim(),
      createdAt: new Date().toLocaleString()
    };
    wx.setStorageSync('feedbackList', [item].concat(feedbackList));
    this.setData({
      feedbackContent: '',
      contact: '',
      feedbackCount: feedbackList.length + 1
    });
    wx.showToast({ title: '反馈已提交', icon: 'success' });
  }
});