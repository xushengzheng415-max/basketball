const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const ICON_ROOT = ROOT + 'common/campus-manager/';
const TEAM_ROOT = ROOT + 'pages/team/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    filters: ['选择日期', '全部班级', '全部类型', '全部状态'],
    records: [
      { icon: '↔', type: '调课', status: '已通知学员', statusClass: 'orange', time: '2025-07-16 14:35', before: ['▣ 7月16日（周四）16:30-18:00', '♧ U12进阶班', '⌖ 3号馆'], after: ['▣ 7月18日（周六）16:30-18:00', '♧ U12进阶班', '⌖ 4号馆'], initiator: '王教练', initiatorRole: '校区教练', initiatorAvatar: TEAM_ROOT + 'avatar-wang.png', approver: '张校长', approverRole: '校区负责人', approverAvatar: TEAM_ROOT + 'avatar-zhaozimo.png' },
      { icon: 'Ⅱ', type: '停课', status: '已通知学员', statusClass: 'orange', time: '2025-07-15 10:20', before: ['▣ 7月13日（周日）09:00-10:30', '♧ U8启蒙班', '⌖ 1号馆'], after: ['课程已取消', '—', '—'], initiator: '陈教练', initiatorRole: '校区教练', initiatorAvatar: TEAM_ROOT + 'avatar-zhaozimo.png', approver: '李校长', approverRole: '校区负责人', approverAvatar: TEAM_ROOT + 'avatar-linhao.png' },
      { icon: '人', type: '教练变更', status: '已通知学员', statusClass: 'green', time: '2025-07-14 18:45', before: ['♙ 李教练'], after: ['♙ 王教练'], initiator: '刘老师', initiatorRole: '教务专员', initiatorAvatar: TEAM_ROOT + 'avatar-liuyuchen.png', approver: '张校长', approverRole: '校区负责人', approverAvatar: TEAM_ROOT + 'avatar-zhaozimo.png' },
      { icon: '⌖', type: '场馆变更', status: '已通知学员', statusClass: 'orange', time: '2025-07-13 09:15', before: ['⌖ 2号馆'], after: ['⌖ 3号馆'], initiator: '赵老师', initiatorRole: '教务专员', initiatorAvatar: TEAM_ROOT + 'avatar-liaoran.png', approver: '李校长', approverRole: '校区负责人', approverAvatar: TEAM_ROOT + 'avatar-linhao.png' }
    ],
    icons: { back: ICON_ROOT + 'icon-back-white-256.png', calendar: ICON_ROOT + 'icon-calendar-orange-256.png', user: ICON_ROOT + 'icon-user-orange-256.png', filter: ICON_ROOT + 'icon-filter-orange-256.png' }
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; }
      else navTop = wx.getSystemInfoSync().statusBarHeight || 20;
    } catch (error) { console.warn('[change-records] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 12 });
  },
  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/schedule/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  chooseFilter(event) {
    const index = Number(event.currentTarget.dataset.index || 0);
    const options = index === 0 ? ['今天', '近7天', '近30天'] : index === 1 ? ['全部班级', 'U8启蒙班', 'U10基础班', 'U12进阶班'] : index === 2 ? ['全部类型', '调课', '停课', '教练变更', '场馆变更'] : ['全部状态', '已通知学员', '待通知'];
    wx.showActionSheet({ itemList: options, success: (result) => { const filters = this.data.filters.slice(); filters[index] = options[result.tapIndex]; this.setData({ filters }); } });
  },
  viewDetail(event) { wx.showToast({ title: `${event.currentTarget.dataset.type}记录详情`, icon: 'none' }); },
  exportRecords() { wx.showToast({ title: '导出任务已创建', icon: 'success' }); },
  filterRecords() { wx.showToast({ title: '筛选条件已应用', icon: 'none' }); }
});
