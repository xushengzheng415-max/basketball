const { requireEducationAccess } = require('../../../../utils/education-access');

function isRolePreviewEnabled() {
  try {
    const system = wx.getSystemInfoSync();
    const account = wx.getAccountInfoSync && wx.getAccountInfoSync();
    const envVersion = account && account.miniProgram && account.miniProgram.envVersion;
    return system.platform === 'devtools' || envVersion === 'develop' || envVersion === 'trial' || envVersion === 'release';
  } catch (error) {
    console.warn('[campus-manager] role preview unavailable', error);
    return false;
  }
}

Component({
  properties: {
    screen: { type: Object, value: {} },
    showTabbar: { type: Boolean, value: false }
  },
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    showRoleTester: false
  },
  lifetimes: {
    attached() {
      let top = 20;
      let height = 44;
      try {
        const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
        if (menu && menu.top) {
          top = menu.top;
          height = menu.height || 32;
        } else {
          const system = wx.getSystemInfoSync();
          top = system.statusBarHeight || 20;
        }
      } catch (error) {
        console.warn('[campus-manager] nav metrics unavailable', error);
      }
      this.setData({
        navTop: top,
        navHeight: height,
        navSpacer: top + height + 18,
        showRoleTester: isRolePreviewEnabled()
      });
    }
  },
  methods: {
    handleBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({ delta: 1 });
        return;
      }
      const fallback = this.data.screen.backRoute || '/pages/home/index';
      wx.redirectTo({
        url: fallback,
        fail: () => wx.reLaunch({ url: '/pages/home/index' })
      });
    },
    handleNavigate(event) {
      const url = event.currentTarget.dataset.route;
      if (!url) return;
      wx.navigateTo({ url });
    },
    openRoleTester() {
      if (!this.data.showRoleTester) return;
      wx.showActionSheet({
        itemList: ['校区负责人（当前）', '教练（测试）'],
        success: (result) => {
          if (result.tapIndex !== 1) return;
          wx.redirectTo({ url: '/pages/education/index?rolePreview=1' });
        }
      });
    },
    async handleAction(event) {
      const route = event.currentTarget.dataset.route;
      const message = event.currentTarget.dataset.toast;
      if (route) {
        wx.navigateTo({ url: route });
        return;
      }
      if (!(await requireEducationAccess())) return;
      wx.showToast({ title: message || '操作已记录', icon: 'none' });
    }
  }
});
