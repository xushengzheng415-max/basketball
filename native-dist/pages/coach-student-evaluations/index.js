const REVIEWS = [
  { id: 'e1', lessonNo: '第8节课', date: '2025-05-23', topic: '控球强化与变向突破', score: '4.5', scoreText: '★★★★½', summary: '弱侧手控球稳定性持续提升，面对防守时开始主动观察队友位置。', tags: ['弱侧手进步', '课堂专注', '出球更快'] },
  { id: 'e2', lessonNo: '第7节课', date: '2025-05-18', topic: '传切配合与空间意识', score: '4.0', scoreText: '★★★★☆', summary: '传球时机判断更清晰，空切后能主动寻找下一次接应位置。', tags: ['配合积极', '空间意识', '继续沟通'] },
  { id: 'e3', lessonNo: '第6节课', date: '2025-05-11', topic: '防守脚步与一对一', score: '4.5', scoreText: '★★★★½', summary: '防守重心控制较好，横移速度提升，抢断选择更加合理。', tags: ['防守积极', '脚步提升', '判断稳定'] },
  { id: 'e4', lessonNo: '第5节课', date: '2025-05-04', topic: '投篮脚步与出手节奏', score: '4.0', scoreText: '★★★★☆', summary: '接球准备动作更完整，出手节奏稳定，需要继续提高弱侧终结。', tags: ['节奏稳定', '动作完整', '弱侧待提升'] }
];

Page({
  data: { studentId: 'student-1', reviews: REVIEWS, summary: [{ value: '8', label: '累计评价' }, { value: '4.3', label: '综合评分' }, { value: '92%', label: '平均出勤' }] },

  onLoad(options) {
    this.setData({ studentId: (options && options.studentId) || 'student-1' });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/coach-student-detail/index?id=' + this.data.studentId });
  }
});
