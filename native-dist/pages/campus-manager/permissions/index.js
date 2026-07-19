const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png',
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      user: COMMON_ROOT + 'icon-user-orange-256.png',
      warning: COMMON_ROOT + 'icon-warning-orange-256.png',
      check: COMMON_ROOT + 'icon-check-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png'
    },
    scopes: [
      { key: 'own', label: '本人班级', caption: '仅查看本人负责的班级与学员', selectedClass: '' },
      { key: 'selected', label: '指定班级', caption: '可查看已授权的指定班级', selectedClass: 'selected' },
      { key: 'campus', label: '全校区', caption: '可查看本校区全部业务数据', selectedClass: '' }
    ],
    sections: [
      { title: '教务操作', items: [
        { label: '班级管理', caption: '查看与维护所负责班级', enabled: true, switchClass: 'on', locked: false },
        { label: '课表管理', caption: '查看课表并提交调课申请', enabled: true, switchClass: 'on', locked: false },
        { label: '请假审批', caption: '处理学员请假与补课', enabled: true, switchClass: 'on', locked: false },
        { label: '校区班级设置', caption: '仅负责人可操作', enabled: false, switchClass: 'locked', locked: true }
      ]},
      { title: '学员数据', items: [
        { label: '学员列表', caption: '查看授权班级学员', enabled: true, switchClass: 'on', locked: false },
        { label: '学员档案', caption: '查看基础资料与课程记录', enabled: true, switchClass: 'on', locked: false },
        { label: '学员分班', caption: '提交学员分班调整', enabled: true, switchClass: 'on', locked: false },
        { label: '学员导入 / 导出', caption: '由负责人统一操作', enabled: false, switchClass: 'locked', locked: true }
      ]},
      { title: '课程与课消', items: [
        { label: '课程记录', caption: '查看授课与点名记录', enabled: true, switchClass: 'on', locked: false },
        { label: '课消管理', caption: '查看本人班级课消', enabled: true, switchClass: 'on', locked: false },
        { label: '补课管理', caption: '安排与确认补课', enabled: true, switchClass: 'on', locked: false },
        { label: '课时包设置', caption: '由负责人统一维护', enabled: false, switchClass: 'locked', locked: true }
      ]},
      { title: '报表查看', items: [
        { label: '班级报表', caption: '查看负责班级经营数据', enabled: true, switchClass: 'on', locked: false },
        { label: '学员报表', caption: '查看学员成长与出勤', enabled: true, switchClass: 'on', locked: false },
        { label: '课消报表', caption: '查看课程消耗明细', enabled: true, switchClass: 'on', locked: false },
        { label: '校区总览报表', caption: '仅负责人可查看', enabled: false, switchClass: 'locked', locked: true }
      ]}
    ]
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
      console.warn('[campus-manager-permissions] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/coach-detail/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  selectScope(event) {
    const key = event.currentTarget.dataset.key;
    const scopes = this.data.scopes.map((item) => Object.assign({}, item, { selectedClass: item.key === key ? 'selected' : '' }));
    this.setData({ scopes });
  },
  togglePermission(event) {
    const sectionIndex = Number(event.currentTarget.dataset.section);
    const itemIndex = Number(event.currentTarget.dataset.item);
    const sections = this.data.sections.map((section, currentSection) => {
      if (currentSection !== sectionIndex) return section;
      const items = section.items.map((item, currentItem) => {
        if (currentItem !== itemIndex || item.locked) return item;
        const enabled = !item.enabled;
        return Object.assign({}, item, { enabled, switchClass: enabled ? 'on' : '' });
      });
      return Object.assign({}, section, { items });
    });
    this.setData({ sections });
  },
  savePermissions() {
    wx.showToast({ title: '权限已保存', icon: 'success' });
  }
});
