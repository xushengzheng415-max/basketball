const { callCloud } = require('../../utils/cloud');

const ASSET_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/mine-profile/';
const DEFAULT_PROFILE = {
  loggedIn: false,
  avatarUrl: '',
  nickName: '微信用户',
  phoneNumber: '',
  orgName: '赛小蜂篮球训练营',
  role: '校区管理员',
  campus: '西湖校区',
  wxOpenId: '',
  wxUnionId: ''
};
const DEFAULT_PREFERENCES = {
  defaultHome: 'MC设置',
  scorerMode: '球队列表',
  messageReminder: true
};

function readProfile() {
  return Object.assign({}, DEFAULT_PROFILE, wx.getStorageSync('userProfile') || {});
}

function readPreferences() {
  const saved = wx.getStorageSync('minePreferences') || {};
  return Object.assign({}, DEFAULT_PREFERENCES, saved, {
    defaultHome: 'MC设置',
    scorerMode: '球队列表'
  });
}

function getPhoneText(profile) {
  return profile.phoneNumber || '微信授权获取';
}

function buildFormRows(profile) {
  return [
    { field: 'nickName', label: '昵称', value: profile.nickName, placeholder: '请输入昵称', editable: true, icon: ASSET_BASE + 'icon-person.png', showChevron: true },
    { field: 'phoneNumber', label: '手机号', value: getPhoneText(profile), editable: false, valueClass: profile.phoneNumber ? '' : 'muted', icon: ASSET_BASE + 'icon-phone.png', showChevron: false },
    { field: 'orgName', label: '机构名称', value: profile.orgName, editable: false, icon: ASSET_BASE + 'icon-org.png', showChevron: true },
    { field: 'role', label: '角色', value: profile.role, editable: false, icon: ASSET_BASE + 'icon-role.png', showChevron: true },
    { field: 'campus', label: '所属校区', value: profile.campus, editable: false, icon: ASSET_BASE + 'icon-location.png', showChevron: true }
  ];
}

function buildCommonSettingRows() {
  return [
    { key: 'mc', label: 'MC音效设置', icon: ASSET_BASE + 'icon-bell.png', url: '/pages/mc-settings/index' },
    { key: 'profile', label: '个人资料修改', icon: ASSET_BASE + 'icon-person.png', url: '' }
  ];
}

function buildSupportRows() {
  return [
    { key: 'feedback', label: '意见反馈', icon: ASSET_BASE + 'icon-phone.png', url: '' },
    { key: 'guide', label: '使用说明', icon: ASSET_BASE + 'icon-scoreboard.png', url: '' },
    { key: 'about', label: '关于赛小蜂篮球', icon: ASSET_BASE + 'icon-home.png', url: '' }
  ];
}

Page({
  data: {
    profile: DEFAULT_PROFILE,
    draft: DEFAULT_PROFILE,
    preferences: DEFAULT_PREFERENCES,
    formRows: [],
    commonSettingRows: buildCommonSettingRows(),
    supportRows: buildSupportRows()
  },

  onShow() {
    const profile = readProfile();
    const preferences = readPreferences();
    this.refresh(profile, preferences);
  },

  refresh(profile, preferences) {
    this.setData({
      profile,
      draft: Object.assign({}, profile),
      preferences,
      formRows: buildFormRows(profile),
      commonSettingRows: buildCommonSettingRows(),
      supportRows: buildSupportRows()
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({ url: '/pages/home/index' });
  },

  promptAvatar() {
    wx.showToast({ title: '点击头像可更换', icon: 'none' });
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail.avatarUrl;
    const draft = Object.assign({}, this.data.draft, { avatarUrl });
    this.setData({ draft, formRows: buildFormRows(draft) });
  },

  onDraftInput(event) {
    const field = event.currentTarget.dataset.field;
    if (field !== 'nickName') return;
    const draft = Object.assign({}, this.data.draft, { [field]: event.detail.value });
    this.setData({ draft, formRows: buildFormRows(draft) });
  },

  onFormRowTap(event) {
    const field = event.currentTarget.dataset.field;
    const label = event.currentTarget.dataset.label;
    const value = event.currentTarget.dataset.value;
    if (field === 'nickName' || field === 'phoneNumber') return;
    wx.showModal({
      title: label || '资料信息',
      content: value || '暂无资料',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#ff5b08'
    });
  },

  onSettingTap(event) {
    const { url, label } = event.currentTarget.dataset;
    if (url && url !== 'undefined') {
      wx.navigateTo({ url });
      return;
    }
    wx.showToast({ title: label || '敬请期待', icon: 'none' });
  },

  saveProfile() {
    const draft = this.data.draft;
    const profile = Object.assign({}, this.data.profile, {
      loggedIn: true,
      avatarUrl: draft.avatarUrl || this.data.profile.avatarUrl || '',
      nickName: (draft.nickName || '').trim() || DEFAULT_PROFILE.nickName,
      phoneNumber: this.data.profile.phoneNumber || '',
      orgName: this.data.profile.orgName || DEFAULT_PROFILE.orgName,
      role: this.data.profile.role || DEFAULT_PROFILE.role,
      campus: this.data.profile.campus || DEFAULT_PROFILE.campus,
      userId: this.data.profile.userId || this.data.profile.wxOpenId || `user-${Date.now()}`
    });
    const preferences = Object.assign({}, this.data.preferences, {
      defaultHome: 'MC设置',
      scorerMode: '球队列表'
    });
    wx.setStorageSync('userProfile', profile);
    const loginProfile = wx.getStorageSync('loginProfile') || null;
    if (loginProfile && loginProfile.mode === 'wechat') {
      wx.setStorageSync('loginProfile', Object.assign({}, loginProfile, profile));
    }
    wx.setStorageSync('minePreferences', preferences);
    callCloud('sxSaveUser', { profile, preferences });
    this.refresh(profile, preferences);
    wx.showToast({ title: '资料已保存', icon: 'success' });
  }
});
