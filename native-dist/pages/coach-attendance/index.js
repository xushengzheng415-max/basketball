const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team/';
const { requireEducationAccess } = require('../../utils/education-access');
const avatarFiles = ['avatar-linhao.png', 'avatar-liuyuchen.png', 'avatar-zhangzixuan.png', 'avatar-zhaozimo.png', 'avatar-liaoran.png'];
const names = [
  ['林浩', '23', 'present'], ['刘宇辰', '8', 'leave'], ['张子轩', '11', 'present'],
  ['赵子墨', '5', 'present'], ['廖然', '17', 'absent'], ['王昊', '12', 'present'],
  ['陈奕', '7', 'present'], ['周睿', '19', 'present'], ['吴昊', '2', 'present'],
  ['徐朗', '21', 'present'], ['孙一航', '16', 'present'], ['孔明', '9', 'present']
];
const baseStudents = names.map((item, index) => ({
  id: 's' + (index + 1), name: item[0], number: item[1], status: item[2],
  package: '剩余' + (18 - index % 6) + '课时', avatar: ROOT + avatarFiles[index % avatarFiles.length]
}));

function decorate(students) {
  return students.map((item) => ({
    ...item,
    presentClass: item.status === 'present' ? 'selected' : '',
    leaveClass: item.status === 'leave' ? 'selected' : '',
    absentClass: item.status === 'absent' ? 'selected' : '',
    showRecord: item.status === 'leave' || item.status === 'absent'
  }));
}

Page({
  data: { students: [], presentCount: 10, leaveCount: 1, absentCount: 1, makeupCount: 0, consumeCount: 10 },
  onLoad() { this.sync(baseStudents); },
  onStatus(event) {
    const id = event.currentTarget.dataset.id;
    const status = event.currentTarget.dataset.status;
    this.sync(this.data.students.map((item) => item.id === id ? { ...item, status } : item));
  },
  markAll() { this.sync(this.data.students.map((item) => ({ ...item, status: 'present' }))); },
  sync(students) {
    const decorated = decorate(students);
    this.setData({
      students: decorated,
      presentCount: decorated.filter((item) => item.status === 'present').length,
      leaveCount: decorated.filter((item) => item.status === 'leave').length,
      absentCount: decorated.filter((item) => item.status === 'absent').length,
      makeupCount: decorated.filter((item) => item.status === 'makeup').length,
      consumeCount: decorated.filter((item) => item.status === 'present' || item.status === 'makeup').length
    });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack({ delta: 1 });
    else wx.redirectTo({ url: '/pages/coach-course-detail/index?id=course-2' });
  },
  async confirm() {
    if (!(await requireEducationAccess())) return;
    wx.showModal({
      title: '确认完成点名', content: '缺勤与异常情况将同步校区负责人。',
      success: (result) => {
        if (!result.confirm) return;
        const attendees = this.data.students.filter((item) => item.status === 'present' || item.status === 'makeup').map((item) => ({ id: item.id, name: item.name, number: item.number, avatar: item.avatar, attendanceStatus: item.status }));
        wx.setStorageSync('sxf_attendance_course-2', attendees);
        wx.showToast({ title: '点名已完成', icon: 'success' });
        setTimeout(() => wx.navigateTo({ url: '/pages/coach-classroom/index?id=course-2' }), 500);
      }
    });
  }
});
