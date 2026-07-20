const ASSET_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const { refreshEducationAccess, openEducationAccountPage } = require('../../utils/education-access');

function isRolePreviewEnabled() {
  return true;
}

Page({
  data: {
    showRoleTester: false,
    rolePickerDisabled: true,
    roleOptions: ['校长端', '教练端'],
    roleIndex: 1,
    educationAccessActive: false,
    educationModeClass: '',
    educationModeTitle: '\u6f14\u793a\u6a21\u5f0f',
    educationModeCopy: '\u4ec5\u4f9b\u9884\u89c8\uff0cPC \u7aef\u4e0b\u53d1\u8d26\u6237\u5e76\u5f00\u6237\u540e\u53ef\u6b63\u5f0f\u4f7f\u7528',
    assets: {
      background: ASSET_ROOT + 'pages/education/education-top-bg-clean.png',
      logo: ASSET_ROOT + 'home/brand-horizontal-logo.png',
      avatar: ASSET_ROOT + 'pages/team/avatar-linhao.png',
      classIcon: ASSET_ROOT + 'pages/education/icon-student-checkin.png'
    },
    metrics: [
      { label: '今日课程', value: '3', unit: '节', note: '1节已完成', icon: ASSET_ROOT + 'pages/education/icon-course-schedule.png' },
      { label: '应到学员', value: '32', unit: '人', note: '2人已请假', icon: ASSET_ROOT + 'pages/education/icon-student-checkin.png' },
      { label: '待写评价', value: '12', unit: '份', note: '课后及时完成', icon: ASSET_ROOT + 'pages/education/icon-after-class-review.png' },
      { label: '本周课时', value: '16', unit: 'h', note: '较上周 +2h', icon: ASSET_ROOT + 'pages/education/icon-lesson-consume-stats.png' }
    ],
    courses: [
      { id: 'course-1', time: '09:30', state: '已完成', title: 'U8 启蒙班', tag: '已评价', venue: '1号馆', students: 10, dotClass: 'done' },
      { id: 'course-2', time: '18:30', state: '待上课', title: 'U10 提高班', tag: '已备课', venue: '2号馆', students: 15, dotClass: 'next' },
      { id: 'course-3', time: '20:10', state: '待备课', title: 'U12 精英班', tag: '未计划', venue: '1号馆', students: 12, dotClass: '' }
    ],
    tasks: [
      { title: '课程计划', desc: '1节课待搭建', count: 1, action: 'plan', icon: ASSET_ROOT + 'pages/education/icon-course-schedule.png' },
      { title: '课堂点名', desc: '下一节课可点名', count: 1, action: 'attendance', icon: ASSET_ROOT + 'pages/education/icon-student-checkin.png' },
      { title: '课后评价', desc: '12名学员待评价', count: 12, action: 'evaluation', icon: ASSET_ROOT + 'pages/education/icon-after-class-review.png' },
      { title: '课堂记录', desc: '1节记录待确认', count: 1, action: 'detail', icon: ASSET_ROOT + 'pages/education/icon-lesson-consume-stats.png' }
    ],
    periodReports: [
      {
        type: 'weekly',
        eyebrow: '本周课程已完成',
        title: '第21周球员周报',
        desc: '本周最后一节课已确认，系统正在分批扫描日报',
        value: '12份待生成',
        actionLabel: '去审核',
        stateClass: 'ready'
      },
      {
        type: 'monthly',
        eyebrow: '月底自动开启',
        title: '5月球员月报',
        desc: '完成5月最后一节课后，系统自动生成月报草稿',
        value: '5月31日触发',
        actionLabel: '查看规则',
        stateClass: 'scheduled'
      }
    ],
    students: [
      { id: 'student-1', name: '林浩', tag: '进步明显', message: '控球稳定性连续3周提升', avatar: ASSET_ROOT + 'pages/team/avatar-linhao.png' },
      { id: 'student-2', name: '刘宇辰', tag: '需关注', message: '本月出勤率低于80%', avatar: ASSET_ROOT + 'pages/team/avatar-liuyuchen.png' },
      { id: 'student-3', name: '张子轩', tag: '评价待写', message: '上一节课评价尚未完成', avatar: ASSET_ROOT + 'pages/team/avatar-zhangzixuan.png' }
    ]
  },
  onLoad(options) {
    const isCoachPreview = options && options.rolePreview === '1';
    if (!isCoachPreview) {
      wx.redirectTo({ url: '/pages/campus-manager/home/index' });
      return;
    }
    const showRoleTester = isRolePreviewEnabled();
    this.setData({ showRoleTester, rolePickerDisabled: !showRoleTester });
    refreshEducationAccess().then((access) => {
      const active = !!(access && access.active);
      this.setData({
        educationAccessActive: active,
        educationModeClass: active ? 'active' : '',
        educationModeTitle: active ? '\u5df2\u5f00\u6237' : '\u6f14\u793a\u6a21\u5f0f',
        educationModeCopy: active
          ? '\u6559\u52a1\u8d26\u6237\u5df2\u6fc0\u6d3b\uff0c\u771f\u5b9e\u4e1a\u52a1\u64cd\u4f5c\u5df2\u5f00\u653e'
          : '\u4ec5\u4f9b\u9884\u89c8\uff0cPC \u7aef\u4e0b\u53d1\u8d26\u6237\u5e76\u5f00\u6237\u540e\u53ef\u6b63\u5f0f\u4f7f\u7528'
      });
    });
  },
  openEducationAccount() {
    if (this.data.educationAccessActive) {
      wx.showToast({ title: '\u6559\u52a1\u8d26\u6237\u5df2\u5f00\u901a', icon: 'success' });
      return;
    }
    openEducationAccountPage();
  },
  onRoleChange(event) {
    if (!this.data.showRoleTester) return;
    const roleIndex = Number(event.detail.value);
    this.setData({ roleIndex });
    if (roleIndex === 0) wx.redirectTo({ url: '/pages/campus-manager/home/index?rolePreview=1' });
  },
  openClasses() { wx.navigateTo({ url: '/pages/coach-classes/index' }); },
  openCourses() { wx.navigateTo({ url: '/pages/coach-courses/index' }); },
  openCourseDetail() { wx.navigateTo({ url: '/pages/coach-course-detail/index?id=course-2' }); },
  openCourseStudents() { wx.navigateTo({ url: '/pages/coach-course-students/index?id=course-2' }); },
  openPlan() { wx.navigateTo({ url: '/pages/coach-course-plan/index?id=course-2' }); },
  openAttendance() { wx.navigateTo({ url: '/pages/coach-attendance/index?id=course-2' }); },
  openStudent(event) { wx.navigateTo({ url: '/pages/coach-student-detail/index?id=' + event.currentTarget.dataset.id }); },
  openPeriodReports(event) {
    wx.navigateTo({ url: '/pages/coach-period-reports/index?type=' + event.currentTarget.dataset.type });
  },
  handleTask(event) {
    const routes = { plan: '/pages/coach-course-plan/index', attendance: '/pages/coach-attendance/index', evaluation: '/pages/coach-evaluation-list/index?id=course-2', detail: '/pages/coach-course-detail/index' };
    const url = routes[event.currentTarget.dataset.action];
    if (url) wx.navigateTo({ url });
  }
});
