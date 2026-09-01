const { callCloud, cloud } = require('../../utils/cloud');

const ASSET_BASE = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/pages/mine-profile/';
const PROFILE_SYNCED_AT_KEY = 'mineProfileCloudSyncedAt';
const PROFILE_SYNC_CACHE_MS = 60 * 1000;
const CURRENT_VERSION = '2.1.4';
const VERSION_HISTORY = [
  {
    version: '2.1.4',
    date: '2026-09-01',
    current: true,
    highlights: [
      '修复部分微信账号无法播放进攻、防守音乐的问题',
      '修复部分比赛音效和比分播报播放失败的问题',
      '提升计分板首次加载音频时的稳定性'
    ]
  },
  {
    version: '2.1.3',
    date: '2026-08-23',
    current: false,
    highlights: [
      '主教练赛前分工调整为选择方式、添加助教、绑定任务三步',
      '区分主教练与助教工作页面和任务权限',
      '优化手机横屏与 PAD 横屏的页面布局'
    ]
  },
  {
    version: '2.1.2',
    date: '2026-08-23',
    current: false,
    highlights: [
      '主教练赛前分工完成新版横屏适配',
      '支持按数据项目或按球员分配记录任务',
      '助教接受邀请后自动生成工作台待办'
    ]
  },
  {
    version: '2.1.1',
    date: '2026-08-22',
    current: false,
    highlights: [
      '优化 PC 微信扫码登录与机构开户流程',
      '赛事中心支持生成球队报名二维码',
      '领队可选择已有球队确认参赛并接收通知'
    ]
  },
  {
    version: '2.1.0',
    date: '2026-08-21',
    current: false,
    highlights: [
      '新增小程序扫码确认 PC 后台登录',
      '机构、学校和赛事主办方可按身份完成开户',
      '赛事中心与教务中心统一纳入组织工作台',
      '新机构可领取 365 天全功能体验期'
    ]
  },
  {
    version: '2.0.3',
    date: '2026-07-27',
    current: false,
    highlights: [
      '新增小程序版本更新提示',
      '支持立即更新或稍后更新，不中断现场操作',
      '优化正式版发布后仍停留在旧版本的问题'
    ]
  },
  {
    version: '2.0.1',
    date: '2026-07-20',
    current: false,
    highlights: [
      '完善赛事创建、球队与赛程管理',
      '升级手机与平板横屏计分板',
      '新增暂停、节间倒计时和 MC 自定义音效',
      '优化计分操作与比赛现场稳定性'
    ]
  }
];
let profileSyncing = null;
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

function isCloudFile(filePath) {
  return String(filePath || '').startsWith('cloud://');
}

function uploadProfileAvatar(filePath) {
  if (!filePath || isCloudFile(filePath)) return Promise.resolve(filePath || '');
  if (!cloud || !cloud.uploadFile) return Promise.reject(new Error('\u4e91\u5b58\u50a8\u672a\u521d\u59cb\u5316'));
  const random = Math.random().toString(36).slice(2, 8);
  return cloud.uploadFile({
    cloudPath: `user-avatars/${Date.now()}-${random}.jpg`,
    filePath
  }).then((result) => {
    if (!result || !result.fileID) throw new Error('\u5934\u50cf\u4e0a\u4f20\u672a\u8fd4\u56de\u4e91\u6587\u4ef6 ID');
    return result.fileID;
  });
}

function getAvatarDisplayUrl(fileID) {
  if (!isCloudFile(fileID) || !cloud || !cloud.getTempFileURL) return Promise.resolve(fileID || '');
  return cloud.getTempFileURL({ fileList: [fileID] }).then((result) => {
    const item = result && result.fileList && result.fileList[0];
    return (item && item.tempFileURL) || fileID;
  }).catch(() => fileID);
}

function getPhoneText(profile) {
  return profile.phoneNumber || '微信授权获取';
}

function syncProfileIfStale() {
  const syncedAt = Number(wx.getStorageSync(PROFILE_SYNCED_AT_KEY) || 0);
  if (syncedAt && Date.now() - syncedAt < PROFILE_SYNC_CACHE_MS) return Promise.resolve(null);
  if (profileSyncing) return profileSyncing;
  profileSyncing = callCloud('sxSyncRoster', { action: 'profile' })
    .then((result) => {
      if (result && result.ok) wx.setStorageSync(PROFILE_SYNCED_AT_KEY, Date.now());
      return result;
    })
    .finally(() => { profileSyncing = null; });
  return profileSyncing;
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
    staticAssets: {
      background: ASSET_BASE + 'profile-bg.png',
      back: ASSET_BASE + 'button-back.png',
      defaultAvatar: ASSET_BASE + 'profile-avatar.png',
      chevron: ASSET_BASE + 'icon-chevron.png',
      save: ASSET_BASE + 'icon-save-check.png'
    },
    profile: DEFAULT_PROFILE,
    draft: DEFAULT_PROFILE,
    preferences: DEFAULT_PREFERENCES,
    formRows: [],
    commonSettingRows: buildCommonSettingRows(),
    supportRows: buildSupportRows(),
    currentVersion: CURRENT_VERSION,
    versionHistory: VERSION_HISTORY,
    showVersionLog: false
  },

  onShow() {
    const profile = readProfile();
    const preferences = readPreferences();
    this.refresh(profile, preferences);
    syncProfileIfStale().then((result) => {
      if (!result || !result.ok || !result.profile) return;
      const cloudProfile = result.profile;
      const rawProfile = Object.assign({}, profile, cloudProfile, {
        avatarFileID: cloudProfile.avatarUrl || '',
        avatarUrl: cloudProfile.avatarUrl || ''
      });
      wx.setStorageSync('userProfile', rawProfile);
      this.refresh(Object.assign({}, rawProfile, {
        avatarUrl: cloudProfile.avatarDisplayUrl || cloudProfile.avatarUrl || ''
      }), preferences);
    });
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
    if (!avatarUrl) return;
    wx.showLoading({ title: '\u4e0a\u4f20\u5934\u50cf' });
    uploadProfileAvatar(avatarUrl)
      .then((avatarFileID) => getAvatarDisplayUrl(avatarFileID)
        .then((displayUrl) => ({ avatarFileID, displayUrl })))
      .then(({ avatarFileID, displayUrl }) => {
        const draft = Object.assign({}, this.data.draft, { avatarFileID, avatarUrl: displayUrl });
        this.setData({ draft, formRows: buildFormRows(draft) });
        wx.showToast({ title: '\u5934\u50cf\u5df2\u4e0a\u4f20', icon: 'success' });
      })
      .catch((error) => {
        console.warn('[mine] upload avatar failed', error);
        wx.showToast({ title: '\u5934\u50cf\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
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

  openVersionLog() {
    this.setData({ showVersionLog: true });
  },

  closeVersionLog() {
    this.setData({ showVersionLog: false });
  },

  noop() {},

  saveProfile() {
    const draft = this.data.draft;
    const avatarFileID = draft.avatarFileID || this.data.profile.avatarFileID ||
      (isCloudFile(draft.avatarUrl) ? draft.avatarUrl : '');
    const profile = Object.assign({}, this.data.profile, {
      loggedIn: true,
      avatarFileID,
      avatarUrl: avatarFileID,
      nickName: (draft.nickName || '').trim() || DEFAULT_PROFILE.nickName,
      phoneNumber: this.data.profile.phoneNumber || '',
      orgName: this.data.profile.orgName || DEFAULT_PROFILE.orgName,
      role: this.data.profile.role || DEFAULT_PROFILE.role,
      campus: this.data.profile.campus || DEFAULT_PROFILE.campus,
      userId: this.data.profile.userId || this.data.profile.wxOpenId || `user-${Date.now()}`
    });
    const preferences = Object.assign({}, this.data.preferences, {
      defaultHome: 'MC\u8bbe\u7f6e',
      scorerMode: '\u7403\u961f\u5217\u8868'
    });
    wx.showLoading({ title: '\u4fdd\u5b58\u8d44\u6599' });
    callCloud('sxSaveUser', { profile, preferences })
      .then((result) => {
        if (!result || !result.ok) throw new Error('\u4e91\u7aef\u8d44\u6599\u4fdd\u5b58\u5931\u8d25');
        wx.setStorageSync('userProfile', profile);
        const loginProfile = wx.getStorageSync('loginProfile') || null;
        if (loginProfile && loginProfile.mode === 'wechat') {
          wx.setStorageSync('loginProfile', Object.assign({}, loginProfile, profile));
        }
        wx.setStorageSync('minePreferences', preferences);
        wx.setStorageSync(PROFILE_SYNCED_AT_KEY, Date.now());
        return getAvatarDisplayUrl(avatarFileID);
      })
      .then((displayUrl) => {
        this.refresh(Object.assign({}, profile, { avatarUrl: displayUrl || avatarFileID }), preferences);
        wx.showToast({ title: '\u8d44\u6599\u5df2\u4fdd\u5b58', icon: 'success' });
      })
      .catch((error) => {
        console.warn('[mine] save profile failed', error);
        wx.showToast({ title: '\u8d44\u6599\u540c\u6b65\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#ff5b08',
      success: (result) => {
        if (!result.confirm) return;
        wx.removeStorageSync('loginProfile');
        wx.removeStorageSync('userProfile');
        wx.removeStorageSync(PROFILE_SYNCED_AT_KEY);
        wx.reLaunch({ url: '/pages/login/index' });
      }
    });
  }
});
