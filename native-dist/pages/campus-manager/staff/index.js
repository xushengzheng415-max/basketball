const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

const ALL_STAFF = [
  { id: 'coach-chen', type: 'coach', name: '陈教练', role: '主教练', classes: 'U10-1班、U12-2班', phone: '138****5678', login: '今天14:32', status: '正常', avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png' },
  { id: 'coach-wang', type: 'coach', name: '王教练', role: '助理教练', classes: 'U8-3班', phone: '139****2468', login: '今天11:08', status: '正常', avatar: CLOUD_ROOT + 'pages/team/avatar-linhao.png' },
  { id: 'teacher-li', type: 'education', name: '李老师', role: '教务主管', classes: '全校区', phone: '137****1357', login: '昨天16:45', status: '正常', avatar: CLOUD_ROOT + 'pages/team/avatar-liuyuchen.png' },
  { id: 'advisor-zhao', type: 'advisor', name: '赵老师', role: '课程顾问', classes: '—', phone: '136****7890', login: '—', status: '待激活', avatar: CLOUD_ROOT + 'pages/team/avatar-liaoran.png' }
];

const ROLE_OVERVIEW = [
  { name: '校区负责人', caption: '全部教务数据', scope: '全校区 · 全部数据', symbol: '负' },
  { name: '教务主管', caption: '排课 学员 课消', scope: '全校区 · 教务管理', symbol: '教' },
  { name: '主教练', caption: '课程 点名 评价', scope: '指定班级 · 教学管理', symbol: '主' },
  { name: '助理教练', caption: '指定班级执行', scope: '指定班级 · 执行操作', symbol: '助' }
];

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    pageTitle: '校区员工',
    pageDescription: '管理校区员工与角色分工',
    countText: '共 18 人',
    showStaffOverview: true,
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', user: COMMON_ROOT + 'icon-user-orange-256.png' },
    metrics: [],
    staff: ALL_STAFF,
    roles: ROLE_OVERVIEW
  },
  onLoad(options) {
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
      console.warn('[campus-manager-staff] nav metrics unavailable', error);
    }
    const coachOnly = options && options.role === 'coach';
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 16,
      pageTitle: coachOnly ? '教练管理' : '校区员工',
      pageDescription: coachOnly ? '查看教练、负责班级与执行情况' : '管理校区员工与角色分工',
      countText: coachOnly ? '共 12 名教练' : '共 18 人',
      showStaffOverview: !coachOnly,
      metrics: coachOnly ? [
        { label: '教练总数', value: '12', suffix: '人', symbol: '教' },
        { label: '主教练', value: '8', suffix: '人', symbol: '主' },
        { label: '助理教练', value: '4', suffix: '人', symbol: '助' },
        { label: '待确认任务', value: '2', suffix: '项', symbol: '待' }
      ] : [
        { label: '员工总数', value: '18', suffix: '人', symbol: '员' },
        { label: '教练数量', value: '12', suffix: '人', symbol: '教' },
        { label: '教务数量', value: '4', suffix: '人', symbol: '务' },
        { label: '待激活', value: '2', suffix: '人', symbol: '待' }
      ],
      staff: coachOnly ? ALL_STAFF.filter((item) => item.type === 'coach') : ALL_STAFF
    });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.reLaunch({ url: '/pages/campus-manager/home/index' });
  },
  openStaff(event) {
    const id = event.currentTarget.dataset.id || 'coach-chen';
    wx.navigateTo({ url: '/pages/campus-manager/coach-detail/index?id=' + id });
  },
  openInvites() {
    wx.navigateTo({ url: '/pages/campus-manager/invitations/index' });
  },
  openPermissions() {
    wx.navigateTo({ url: '/pages/campus-manager/permissions/index?id=coach-chen' });
  },
  addStaff() {
    wx.navigateTo({ url: '/pages/campus-manager/invitations/index?action=create' });
  }
});
