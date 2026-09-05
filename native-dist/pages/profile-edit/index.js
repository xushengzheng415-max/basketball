const { callCloud } = require('../../utils/cloud');

const ASSET_BASE = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/pages/mine-profile/';
const PROFILE_SYNCED_AT_KEY = 'mineProfileCloudSyncedAt';
const DEFAULT_PROFILE = {
  avatarUrl: '',
  nickName: '微信用户',
  phoneNumber: '',
  orgName: '赛小蜂篮球训练营',
  role: '校区管理员',
  campus: '西湖校区'
};

function readProfile() {
  return Object.assign({}, DEFAULT_PROFILE, wx.getStorageSync('userProfile') || {});
}

function getPhoneText(profile) {
  return profile.phoneNumber || '微信授权获取';
}

function buildFormRows(profile) {
  return [
    { field: 'nickName', label: '昵称', value: profile.nickName, placeholder: '请输入昵称', editable: true, icon: ASSET_BASE + 'icon-person.png' },
    { field: 'phoneNumber', label: '手机号', value: getPhoneText(profile), editable: false, valueClass: profile.phoneNumber ? '' : 'muted', icon: ASSET_BASE + 'icon-phone.png' },
    { field: 'orgName', label: '机构名称', value: profile.orgName, placeholder: '请输入机构名称', editable: true, icon: ASSET_BASE + 'icon-org.png' },
    { field: 'role', label: '角色', value: profile.role, placeholder: '请输入角色', editable: true, icon: ASSET_BASE + 'icon-role.png' },
    { field: 'campus', label: '所属校区', value: profile.campus, placeholder: '请输入校区', editable: true, icon: ASSET_BASE + 'icon-location.png' }
  ];
}

Page({
  data: {
    staticAssets: {
      background: ASSET_BASE + 'profile-bg.png',
      back: ASSET_BASE + 'button-back.png'
    },
    profile: DEFAULT_PROFILE,
    draft: DEFAULT_PROFILE,
    formRows: []
  },

  onLoad() {
    const profile = readProfile();
    this.refresh(profile);
  },

  refresh(profile) {
    this.setData({
      profile,
      draft: Object.assign({}, profile),
      formRows: buildFormRows(profile)
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onDraftInput(event) {
    const field = event.currentTarget.dataset.field;
    const editableFields = ['nickName', 'orgName', 'role', 'campus'];
    if (editableFields.indexOf(field) === -1) return;
    const draft = Object.assign({}, this.data.draft, { [field]: event.detail.value });
    this.setData({ draft, formRows: buildFormRows(draft) });
  },

  saveProfile() {
    const draft = this.data.draft;
    const profile = Object.assign({}, this.data.profile, {
      nickName: (draft.nickName || '').trim() || DEFAULT_PROFILE.nickName,
      phoneNumber: this.data.profile.phoneNumber || '',
      orgName: (draft.orgName || '').trim() || DEFAULT_PROFILE.orgName,
      role: (draft.role || '').trim() || DEFAULT_PROFILE.role,
      campus: (draft.campus || '').trim() || DEFAULT_PROFILE.campus
    });

    wx.showLoading({ title: '保存资料', mask: true });
    callCloud('sxSaveUser', { profile })
      .then((result) => {
        if (!result || !result.ok) throw new Error('云端资料保存失败');
        wx.setStorageSync('userProfile', profile);
        const loginProfile = wx.getStorageSync('loginProfile') || null;
        if (loginProfile && loginProfile.mode === 'wechat') {
          wx.setStorageSync('loginProfile', Object.assign({}, loginProfile, profile));
        }
        wx.setStorageSync(PROFILE_SYNCED_AT_KEY, Date.now());
        wx.showToast({ title: '资料已保存', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      })
      .catch((error) => {
        console.warn('[profile-edit] save failed', error);
        const message = (error && (error.message || error.errMsg || String(error))) || '资料同步失败，请重试';
        wx.showModal({
          title: '保存失败',
          content: message,
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#ff5b08'
        });
      })
      .finally(() => wx.hideLoading());
  }
});
