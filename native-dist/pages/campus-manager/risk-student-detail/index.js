const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

const RISK_STUDENTS = {
  'risk-zhang': { id: 'risk-zhang', name: '张子轩', gender: '♂', risk: '高风险', classInfo: '少儿篮球基础班 · 周六班', expiry: '2025-05-25', remainingDays: '5天', remaining: '2', reason: '剩余课时较少 · 即将到期', evidence: '近30天课消1次/4次（25%） · 剩余2课时 · 5天后到期', owner: '李教练', avatar: CLOUD_ROOT + 'pages/team/avatar-zhangzixuan.png' },
  'risk-wang': { id: 'risk-wang', name: '王梓涵', gender: '♀', risk: '中风险', classInfo: '少儿篮球提高班 · 周日班', expiry: '2025-06-05', remainingDays: '16天', remaining: '6', reason: '课包即将到期', evidence: '近30天课消3次/4次（75%） · 剩余6课时 · 16天后到期', owner: '刘教练', avatar: CLOUD_ROOT + 'pages/team/avatar-linhao.png' },
  'risk-chen': { id: 'risk-chen', name: '陈思妍', gender: '♀', risk: '待跟进', classInfo: '少儿篮球基础班 · 周二班', expiry: '2025-06-12', remainingDays: '23天', remaining: '8', reason: '长期未约课', evidence: '近30天无约课记录 · 剩余8课时 · 家长尚未回复', owner: '李教练', avatar: CLOUD_ROOT + 'pages/team/avatar-liuyuchen.png' }
};

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    student: RISK_STUDENTS['risk-zhang'],
    avatar: CLOUD_ROOT + 'pages/team/avatar-zhangzixuan.png',
    coachAvatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png',
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png' },
    timeline: [
      { time: '2025-05-27 10:30', text: '首次提醒到期（短信）', status: '已完成' },
      { time: '2025-05-29 18:00', text: '沟通学员情况（企业微信）', status: '已完成' },
      { time: '2025-05-30 10:00', text: '推荐续费方案（电话）', status: '待跟进' }
    ]
  },
  onLoad(options) {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-risk-student-detail] nav metrics unavailable', error); }
    const id = options && RISK_STUDENTS[options.id] ? options.id : 'risk-zhang';
    const student = RISK_STUDENTS[id];
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16, student, avatar: student.avatar });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.redirectTo({ url: '/pages/campus-manager/renewal-risk/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) }); },
  newFollowup() { wx.navigateTo({ url: '/pages/campus-manager/renewal-followup/index?student=' + this.data.student.id }); },
  openTask() { wx.navigateTo({ url: '/pages/campus-manager/growth-task-detail/index' }); }
});
