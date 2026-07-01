const defaultProfile = {
  loggedIn: false,
  avatarUrl: '',
  nickName: '未登录用户',
  wechatId: '',
  phone: ''
};

function getSavedProfile() {
  return Object.assign({}, defaultProfile, wx.getStorageSync('userProfile') || {});
}

function getAdminUsers() {
  return wx.getStorageSync('adminUsers') || [];
}

function upsertAdminUser(profile) {
  const users = getAdminUsers();
  const id = profile.userId || 'local-user';
  const item = Object.assign({}, profile, {
    userId: id,
    source: profile.loggedIn ? '微信登录' : '游客',
    updatedAt: new Date().toLocaleString()
  });
  const next = [item].concat(users.filter((user) => user.userId !== id));
  wx.setStorageSync('adminUsers', next);
}

Page({
  data: {
    profile: defaultProfile,
    draftNickName: '',
    draftWechatId: '',
    draftPhone: '',
    feedbackType: '功能建议',
    feedbackTypes: ['功能建议', '问题反馈', '赛事合作'],
    feedbackContent: '',
    contact: '',
    feedbackCount: 0
  },
  onShow() {
    const profile = getSavedProfile();
    const feedbackList = wx.getStorageSync('feedbackList') || [];
    this.setData({
      profile,
      draftNickName: profile.nickName,
      draftWechatId: profile.wechatId,
      draftPhone: profile.phone,
      feedbackCount: feedbackList.length
    });
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
        this.setData({
          profile: defaultProfile,
          draftNickName: defaultProfile.nickName,
          draftWechatId: '',
          draftPhone: ''
        });
        wx.reLaunch({ url: '/pages/login/index' });
      }
    });
  },
  onChooseAvatar(event) {
    const profile = Object.assign({}, getSavedProfile(), {
      loggedIn: true,
      avatarUrl: event.detail.avatarUrl
    });
    wx.setStorageSync('userProfile', profile);
    upsertAdminUser(profile);
    this.setData({ profile });
  },
  onNicknameInput(event) {
    this.setData({ draftNickName: event.detail.value });
  },
  onWechatInput(event) {
    this.setData({ draftWechatId: event.detail.value });
  },
  onPhoneInput(event) {
    this.setData({ draftPhone: event.detail.value });
  },
  saveProfile() {
    const nickName = this.data.draftNickName.trim() || '赛小蜂用户';
    const profile = Object.assign({}, this.data.profile, {
      loggedIn: true,
      userId: this.data.profile.userId || `user-${Date.now()}`,
      nickName,
      wechatId: this.data.draftWechatId.trim(),
      phone: this.data.draftPhone.trim()
    });
    wx.setStorageSync('userProfile', profile);
    upsertAdminUser(profile);
    this.setData({ profile });
    wx.showToast({ title: '资料已保存', icon: 'success' });
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
    const profile = getSavedProfile();
    const feedbackList = wx.getStorageSync('feedbackList') || [];
    const item = {
      id: Date.now(),
      type: this.data.feedbackType,
      content: this.data.feedbackContent.trim(),
      contact: this.data.contact.trim(),
      user: {
        nickName: profile.nickName,
        wechatId: profile.wechatId,
        phone: profile.phone
      },
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