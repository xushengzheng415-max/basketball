const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team/';
const { requireEducationAccess } = require('../../utils/education-access');
const FALLBACK = [
  { id: 's1', name: '林浩', number: '23', avatar: ROOT + 'avatar-linhao.png', attendanceStatus: 'present' },
  { id: 's2', name: '刘宇辰', number: '8', avatar: ROOT + 'avatar-liuyuchen.png', attendanceStatus: 'present' },
  { id: 's3', name: '张子轩', number: '11', avatar: ROOT + 'avatar-zhangzixuan.png', attendanceStatus: 'makeup' },
  { id: 's4', name: '赵子墨', number: '5', avatar: ROOT + 'avatar-zhaozimo.png', attendanceStatus: 'present' },
  { id: 's5', name: '廖然', number: '17', avatar: ROOT + 'avatar-liaoran.png', attendanceStatus: 'present' }
];

function decorate(students, statusMap) {
  return students.map((item, index) => {
    const returned = statusMap[item.id] === 'returned';
    const completed = statusMap[item.id] === true;
    return {
      ...item,
      index,
      attendanceLabel: item.attendanceStatus === 'makeup' ? '补课' : '到课',
      status: returned ? '退回修改' : completed ? '已完成' : '待评价',
      statusClass: returned ? 'returned' : completed ? 'done' : 'pending',
      actionLabel: returned ? '查看反馈' : completed ? '查看评价' : '开始评价'
    };
  });
}

Page({
  data: { courseId: 'course-2', students: [], completedCount: 0, totalCount: 0, progressWidth: 0, allCompleted: false, finishLabel: '继续评价下一位', submitting: false },

  onLoad(options) {
    this.setData({ courseId: options.id || 'course-2' });
  },

  onShow() {
    const students = wx.getStorageSync('sxf_attendance_course-2') || FALLBACK;
    const storedStatus = wx.getStorageSync('sxf_evaluation_status_course-2') || {};
    const statusMap = Object.keys(storedStatus).length ? storedStatus : { s1: true, s5: 'returned' };
    const decorated = decorate(students, statusMap);
    const completedCount = decorated.filter((item) => item.statusClass === 'done').length;
    this.setData({
      students: decorated,
      completedCount,
      totalCount: decorated.length,
      progressWidth: decorated.length ? Math.round(completedCount / decorated.length * 100) : 0,
      allCompleted: decorated.length > 0 && completedCount === decorated.length,
      finishLabel: decorated.length > 0 && completedCount === decorated.length ? '完成本节课评价' : '继续评价下一位'
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/coach-classroom/index?id=' + this.data.courseId });
  },

  openEvaluation(event) {
    const id = event.currentTarget.dataset.id;
    const index = Number(event.currentTarget.dataset.index);
    wx.navigateTo({ url: '/pages/coach-evaluation/index?studentId=' + id + '&index=' + index + '&total=' + this.data.totalCount + '&source=evaluation-list' });
  },

  async finishAll() {
    if (this.data.submitting) return;
    if (!this.data.allCompleted) {
      const next = this.data.students.find((item) => item.statusClass !== 'done');
      if (next) this.openEvaluation({ currentTarget: { dataset: { id: next.id, index: next.index } } });
      return;
    }
    if (!(await requireEducationAccess())) return;
    if (!wx.cloud || !wx.cloud.callFunction) {
      this.finishWithoutQueue();
      return;
    }
    this.setData({ submitting: true, finishLabel: '正在创建周报任务…' });
    wx.showLoading({ title: '正在汇总日报' });
    wx.cloud.callFunction({
      name: 'sxGeneratePeriodReport',
      data: {
        action: 'queue',
        reportType: 'weekly',
        periodKey: '2026-W21',
        rangeStart: '2026-05-19',
        rangeEnd: '2026-05-25',
        students: this.data.students.map((item) => ({ studentId: item.id, studentName: item.name, studentNumber: item.number }))
      }
    }).then((response) => {
      const result = response.result || {};
      if (!result.ok) throw new Error(result.message || '周报任务创建失败');
      this.finishWithQueue(result.queued || 0);
    }).catch((error) => {
      wx.showModal({
        title: '日报已保存',
        content: '本节课评价已完成，但自动周报任务暂未创建：' + (error.message || '请稍后在周期报告中心重试'),
        showCancel: false,
        success: () => wx.reLaunch({ url: '/pages/education/index' })
      });
    }).finally(() => {
      wx.hideLoading();
      this.setData({ submitting: false, finishLabel: '完成本节课评价' });
    });
  },

  finishWithQueue(count) {
    wx.showModal({
      title: '本节课评价已完成',
      content: '所有到课学员的日报均已保存，已创建' + count + '个周报生成任务。系统将分批扫描日报并生成客观周报草稿。',
      showCancel: false,
      success: () => wx.reLaunch({ url: '/pages/education/index' })
    });
  },

  finishWithoutQueue() {
    wx.showModal({
      title: '本节课评价已完成',
      content: '所有到课学员的日报均已保存，可在周期报告中心生成周报或月报草稿。',
      showCancel: false,
      success: () => wx.reLaunch({ url: '/pages/education/index' })
    });
  }
});
