const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

const CONTENT_SOURCE = [
  { id: '1', symbol: '报', title: '家长成长报告 · 小明', meta: '关联班级：U10进阶班 · 2025-05-20 10:30', state: '待审核', tone: 'orange', coach: '张教练', key: 'pending' },
  { id: '2', symbol: '周', title: '班级成长周报（5.12–5.18）', meta: '关联班级：U10进阶班 · 2025-05-19 18:00', state: '待发布', tone: 'blue', coach: '张教练', key: 'pending' },
  { id: '3', symbol: '赛', title: '城市篮球联赛精彩集锦', meta: '关联班级：U12提高班 · 2025-05-18 16:20', state: '已通过', tone: 'success', coach: '李教练', key: 'published' },
  { id: '4', symbol: '报', title: '家长成长报告 · 小红', meta: '关联班级：U8启蒙班 · 2025-05-17 11:15', state: '已驳回', tone: 'danger', coach: '王教练', key: 'rejected' },
  { id: '5', symbol: '周', title: '班级成长周报（5.5–5.11）', meta: '关联班级：U8启蒙班 · 2025-05-12 09:40', state: '已发布', tone: 'muted', coach: '王教练', key: 'published' }
];

function buildFilters(active) {
  return [
    { key: 'all', label: '全部', activeClass: active === 'all' ? 'active' : '' },
    { key: 'pending', label: '待生成/待审核', activeClass: active === 'pending' ? 'active' : '' },
    { key: 'published', label: '已发布', activeClass: active === 'published' ? 'active' : '' },
    { key: 'rejected', label: '已驳回', activeClass: active === 'rejected' ? 'active' : '' }
  ];
}

Page({
  data: {
    navTop: 20, navHeight: 44, navSpacer: 76,
    icons: { back: ICON_ROOT + 'icon-back-orange-256.png', chevron: ICON_ROOT + 'icon-chevron-orange-256.png' },
    entrances: [
      { symbol: '报', title: '家长成长报告', caption: '个性化成长分析', route: '/pages/campus-manager/parent-growth-report/index' },
      { symbol: '周', title: '班级成长周报', caption: '班级动态总结', route: '/pages/campus-manager/class-growth-report/index' },
      { symbol: '赛', title: '赛事内容', caption: '赛事精彩呈现', route: '/pages/campus-manager/content-publish-confirm/index' }
    ],
    filters: buildFilters('all'),
    contents: CONTENT_SOURCE,
    effects: [
      { label: '阅读人数', value: '1,246', compare: '较上周 ↑18%', symbol: '阅' },
      { label: '互动次数', value: '326', compare: '较上周 ↑23%', symbol: '评' },
      { label: '转介绍线索', value: '28', compare: '较上周 ↑12%', symbol: '荐' }
    ]
  },
  onLoad() {
    let top = 20;
    let height = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { top = menu.top; height = menu.height || 32; }
      else { const system = wx.getSystemInfoSync(); top = system.statusBarHeight || 20; }
    } catch (error) { console.warn('[growth-content] nav metrics unavailable', error); }
    this.setData({ navTop: top, navHeight: height, navSpacer: top + height + 12 });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/home/index' });
  },
  openRoute(event) {
    const route = event.currentTarget.dataset.route;
    if (route) wx.navigateTo({ url: route });
  },
  selectFilter(event) {
    const key = event.currentTarget.dataset.key || 'all';
    this.setData({ filters: buildFilters(key), contents: key === 'all' ? CONTENT_SOURCE : CONTENT_SOURCE.filter((item) => item.key === key) });
  },
  previewContent(event) {
    const id = event.currentTarget.dataset.id;
    const route = id === '2' || id === '5' ? '/pages/campus-manager/class-growth-report/index?id=' + id : '/pages/campus-manager/parent-growth-report/index?id=' + id;
    wx.navigateTo({ url: route });
  }
});
