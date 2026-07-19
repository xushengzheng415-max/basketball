const COMMON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', download: COMMON_ROOT + 'icon-download-orange-256.png', calendar: COMMON_ROOT + 'icon-calendar-orange-256.png', warning: COMMON_ROOT + 'icon-warning-orange-256.png' },
    metrics: [
      { label: '全部任务', value: '128', tone: 'orange' },
      { label: '已完成', value: '96', tone: 'green' },
      { label: '生成中', value: '8', tone: 'blue' },
      { label: '失败', value: '24', tone: 'red' }
    ],
    jobs: [
      { id: 'EX20250526001', name: '赛事数据汇总报表', status: '已完成', tone: 'green', range: '2025-05-19 ～ 2025-05-25', creator: '张伟（校园经理）', size: '2.45 MB', created: '2025-05-26 10:30:45', expiry: '2025-06-02 10:30:45（剩余7天）', action: '下载', progress: '' },
      { id: 'EX20250526002', name: '球员表现分析报表', status: '生成中', tone: 'blue', range: '2025-05-01 ～ 2025-05-25', creator: '李明（教练）', size: '—', created: '2025-05-26 11:15:22', expiry: '—', action: '', progress: '65%' },
      { id: 'EX20250526003', name: '训练出勤统计报表', status: '失败', tone: 'red', range: '2025-05-01 ～ 2025-05-25', creator: '王强（校园经理）', size: '—', created: '2025-05-26 09:20:11', expiry: '数据导出超时，请重试', action: '重新生成', progress: '' },
      { id: 'EX20250525008', name: '比赛成绩汇总报表', status: '已完成', tone: 'green', range: '2025-04-01 ～ 2025-04-30', creator: '李明（教练）', size: '1.18 MB', created: '2025-05-25 16:40:33', expiry: '2025-06-01 16:40:33（剩余6天）', action: '下载', progress: '' },
      { id: 'EX20250525007', name: '球队对比分析报表', status: '失败', tone: 'red', range: '2025-04-01 ～ 2025-04-30', creator: '张伟（校园经理）', size: '—', created: '2025-05-25 14:05:18', expiry: '数据源异常，部分数据缺失', action: '重新生成', progress: '' }
    ]
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; }
    } catch (error) { console.warn('[campus-manager-export-jobs] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/report-export/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  runAction(event) {
    const action = event.currentTarget.dataset.action;
    wx.showToast({ title: action === '下载' ? '开始下载报表' : '已重新生成任务', icon: 'none' });
  },
  openDetail() { wx.showToast({ title: '任务详情已打开', icon: 'none' }); }
});
