Page({
  data: {
    plans: [
      {
        id: 'course-3',
        className: 'U12 精英班',
        lesson: '攻防转换与快速决策',
        time: '今天 20:10–21:30',
        venue: '1号馆',
        students: '12 / 14人',
        remaining: '距离开课 3小时20分',
        missing: ['训练目标待确认', '拉伸总结未填写']
      }
    ]
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/coach-classes/index' });
  },

  editPlan(event) {
    wx.navigateTo({ url: '/pages/coach-course-plan/index?id=' + event.currentTarget.dataset.id });
  }
});
