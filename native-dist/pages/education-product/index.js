const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';

Page({
  data: {
    logo: CLOUD_ROOT + 'home/brand-horizontal-logo.png',
    heroBackground: CLOUD_ROOT + 'pages/education/education-top-bg-clean.png',
    capabilities: [
      { order: '01', title: '智能排课', desc: '跨校区、场馆、班级和教练统一排课，冲突自动提示。' },
      { order: '02', title: '课堂执行', desc: '课前搭建训练模块，点名后按教学流程完成课堂记录。' },
      { order: '03', title: '课消管理', desc: '到课、补课、请假和赠课规则统一留痕，数据可追溯。' },
      { order: '04', title: 'AI教学评价', desc: '六维星级评价、标签初稿和训练日报，教练确认后发布。' },
      { order: '05', title: '成长报告', desc: '自动扫描日报，客观生成球员周报与月报草稿。' },
      { order: '06', title: '权限与财务', desc: 'PC端管理员工身份、产品、薪酬、课销和经营数据。' }
    ],
    roles: [
      { label: '校区负责人', desc: '看经营、课程、课消与团队执行' },
      { label: '教练', desc: '备课、点名、上课、评价一条链路' },
      { label: '财务与教务', desc: '权限隔离，负责数据各自清晰' }
    ]
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.reLaunch({ url: '/pages/home/index' });
  },

  recordUnlockLead() {
    wx.setStorageSync('sxf_education_unlock_lead', { createdAt: Date.now(), source: 'education-product-contact' });
  }
});
