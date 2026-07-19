const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';

Page({
  data: {
    accessEyebrow: '\u6559\u52a1\u8d26\u6237\u7531 PC \u7aef\u7edf\u4e00\u4e0b\u53d1',
    accessTitle: '\u5b8c\u6210\u5f00\u6237\u540e\u8fdb\u5165\u771f\u5b9e\u6559\u52a1\u5de5\u4f5c\u6d41',
    accessNote: '\u5c0f\u7a0b\u5e8f\u5185\u4e0d\u76f4\u63a5\u8d2d\u4e70\uff1b\u8bf7\u8054\u7cfb\u5e73\u53f0\u5b8c\u6210\u673a\u6784\u5f00\u6237\u3001\u8d26\u6237\u4e0b\u53d1\u548c\u6743\u9650\u914d\u7f6e',
    accessButtonLabel: '\u54a8\u8be2\u5f00\u6237',
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
