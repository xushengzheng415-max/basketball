const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

function buildTabs(activeKey) {
  return [{ key: 'leave', label: '请假申请' }, { key: 'makeup', label: '补课安排' }, { key: 'rules', label: '规则设置' }].map((item) => Object.assign({}, item, { activeClass: item.key === activeKey ? 'active' : '' }));
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png' },
    metrics: [{ label: '待审核', value: '8', symbol: '审' }, { label: '待安排', value: '12', symbol: '排' }, { label: '本周完成', value: '26', symbol: '完' }, { label: '即将过期', value: '5', symbol: '期' }],
    tabs: buildTabs('leave'),
    applications: [
      { id: 'leave-linhao', name: '林浩', classInfo: 'U10提高班', type: '病假', date: '7月16日 18:30', remaining: '2课时', reason: '发烧咳嗽，医生建议休息', status: '待审核', avatar: CLOUD_ROOT + 'pages/team/avatar-linhao.png' },
      { id: 'leave-wang', name: '王子轩', classInfo: 'U8启蒙班', type: '事假', date: '7月17日 17:00', remaining: '1课时', reason: '家庭出行', status: '待审核', avatar: CLOUD_ROOT + 'pages/team/avatar-zhangzixuan.png' },
      { id: 'leave-zhang', name: '张可欣', classInfo: 'U12精英班', type: '病假', date: '7月14日 19:00', remaining: '2课时', reason: '感冒咳嗽', status: '已通过', avatar: CLOUD_ROOT + 'pages/team/avatar-liuyuchen.png' },
      { id: 'leave-li', name: '李明远', classInfo: 'U10提高班', type: '病假', date: '7月13日 17:30', remaining: '1课时', reason: '肠胃不适', status: '待审核', avatar: CLOUD_ROOT + 'pages/team/avatar-liaoran.png' }
    ],
    recommendations: [
      { id: 'makeup-u10', name: 'U10提高班', coach: '李教练', date: '7月20日（周日）18:00-19:30', place: '浦东体育中心馆', seat: '6/12' },
      { id: 'makeup-u8', name: 'U8启蒙班', coach: '王教练', date: '7月19日（周六）17:00-18:00', place: '金桥篮球馆', seat: '5/10' }
    ]
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-leave] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.reLaunch({ url: '/pages/campus-manager/home/index' }); },
  switchTab(event) { this.setData({ tabs: buildTabs(event.currentTarget.dataset.key) }); },
  review(event) { const id = event.currentTarget.dataset.id || 'leave-linhao'; wx.navigateTo({ url: '/pages/campus-manager/leave-review/index?id=' + id }); },
  selectMakeup(event) { const id = event.currentTarget.dataset.id || 'makeup-u10'; wx.navigateTo({ url: '/pages/campus-manager/makeup-confirm/index?id=' + id }); },
  batch() { wx.showToast({ title: '请选择具体申请处理', icon: 'none' }); }
});
