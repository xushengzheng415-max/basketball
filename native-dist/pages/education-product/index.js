const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';

Page({
  data: {
    accessEyebrow: '建议从一个校区、一个指标开始',
    accessTitle: '把训赛数据跑进经营任务闭环',
    accessNote: '平台负责发现机会、组织任务、沉淀数据和形成复盘；机构负责目标、人员、服务质量与持续执行。',
    accessButtonLabel: '咨询试点',
    logo: CLOUD_ROOT + 'home/brand-horizontal-logo.png',
    heroBackground: CLOUD_ROOT + 'home/quick-match/home-hero-bg.png',
    growthChain: [
      { order: '01', title: '训练', desc: '计划、出勤、评价', result: '让教学过程持续可见' },
      { order: '02', title: '比赛', desc: '计分、统计、高光', result: '让训练成果真实可证' },
      { order: '03', title: '家长价值', desc: '成长报告、班级周报', result: '让成长变化被持续感知' },
      { order: '04', title: '经营动作', desc: '续费、召回、转介绍', result: '让机会进入执行闭环' }
    ],
    roles: [
      { label: 'PC 主控台', title: '统一角色、能力与数据范围', desc: '账户绑定角色，功能按需开关，数据按岗位与校区隔离。' },
      { label: '校区负责人端', title: '打开首页先看结果与风险', desc: '经营目标、增长任务、家长风险和教练执行进入同一视野。' },
      { label: '教练端', title: '只保留把课上好所需的操作', desc: '下一节课、今日待办、班级状态和周期报告集中呈现。' }
    ],
    taskSteps: [
      { order: '01', title: '发现', desc: '识别风险与机会' },
      { order: '02', title: '分配', desc: '明确负责人和时限' },
      { order: '03', title: '执行', desc: '记录沟通与处理动作' },
      { order: '04', title: '复盘', desc: '确认结果与贡献' }
    ],
    proofPoints: [
      { title: '现场体验', desc: '横屏计分、MC 音效、赛果与现场控制，让机构活动更专业。' },
      { title: '数据沉淀', desc: '球队、球员、技术统计与训练数据逐步连接。' },
      { title: '内容传播', desc: '比赛高光、成长报告和球员表现成为家长沟通素材。' }
    ]
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.reLaunch({ url: '/pages/home/index' });
  },

  recordPilotLead() {
    wx.setStorageSync('sxf_growth_platform_lead', { createdAt: Date.now(), source: 'growth-platform-contact' });
  }
});
