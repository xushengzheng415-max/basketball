const AVATAR_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team/';

const avatarFiles = [
  'avatar-linhao.png',
  'avatar-liuyuchen.png',
  'avatar-zhangzixuan.png',
  'avatar-zhaozimo.png',
  'avatar-liaoran.png'
];

const baseStudents = [
  ['s1', '林浩', '23', '剩余18课时', '正常'],
  ['s2', '刘宇辰', '8', '剩余6课时', '请假'],
  ['s3', '张子轩', '11', '剩余12课时', '补课'],
  ['s4', '赵子墨', '5', '剩余23课时', '正常'],
  ['s5', '廖然', '17', '剩余9课时', '正常'],
  ['s6', '王子轩', '7', '剩余14课时', '正常'],
  ['s7', '陈子睿', '9', '剩余20课时', '正常'],
  ['s8', '周宇航', '24', '剩余16课时', '正常'],
  ['s9', '吴天佑', '33', '剩余11课时', '正常'],
  ['s10', '李奥然', '10', '剩余8课时', '正常'],
  ['s11', '许嘉豪', '15', '剩余21课时', '正常'],
  ['s12', '沈奕辰', '6', '剩余13课时', '正常'],
  ['s13', '徐梓轩', '18', '剩余10课时', '正常'],
  ['s14', '郑皓宇', '3', '剩余19课时', '正常'],
  ['s15', '孙嘉泽', '12', '剩余7课时', '正常']
].map((item, index) => ({
  id: item[0],
  name: item[1],
  number: item[2],
  package: item[3],
  status: item[4],
  avatar: AVATAR_ROOT + avatarFiles[index % avatarFiles.length]
}));

const courseMap = {
  'course-1': { id: 'course-1', title: 'U8 启蒙班 · 基础球感', date: '5月23日', time: '09:30–10:40', venue: '1号馆', coach: '陈教练', studentCount: 10 },
  'course-2': { id: 'course-2', title: 'U10 提高班 · 控球强化', date: '5月23日', time: '18:30–20:00', venue: '2号馆', coach: '陈教练', studentCount: 15 },
  'course-3': { id: 'course-3', title: 'U12 精英班 · 攻防转换', date: '5月23日', time: '20:10–21:30', venue: '1号馆', coach: '陈教练', studentCount: 12 }
};

function buildFilters(students, activeKey) {
  const items = [
    { key: 'all', label: '全部 ' + students.length },
    { key: '正常', label: '正常 ' + students.filter((item) => item.status === '正常').length },
    { key: '请假', label: '请假 ' + students.filter((item) => item.status === '请假').length },
    { key: '补课', label: '补课 ' + students.filter((item) => item.status === '补课').length }
  ];
  return items.map((item) => ({ ...item, activeClass: item.key === activeKey ? 'active' : '' }));
}

function decorateStudents(students) {
  return students.map((item) => ({
    ...item,
    statusClass: item.status === '正常' ? 'normal' : item.status === '请假' ? 'leave' : 'makeup'
  }));
}

Page({
  data: {
    course: courseMap['course-2'],
    keyword: '',
    activeFilter: 'all',
    filters: buildFilters(baseStudents, 'all'),
    students: decorateStudents(baseStudents),
    visibleCount: baseStudents.length,
    emptyVisible: false
  },

  onLoad(options) {
    const course = courseMap[(options && options.id) || 'course-2'] || courseMap['course-2'];
    const students = baseStudents.slice(0, course.studentCount);
    this._allStudents = students;
    this.setData({
      course,
      keyword: '',
      activeFilter: 'all',
      filters: buildFilters(students, 'all'),
      students: decorateStudents(students),
      visibleCount: students.length,
      emptyVisible: false
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/coach-course-detail/index?id=' + this.data.course.id });
  },

  onSearch(event) {
    this.setData({ keyword: event.detail.value });
    this.refreshList(event.detail.value, this.data.activeFilter);
  },

  selectFilter(event) {
    const activeFilter = event.currentTarget.dataset.key;
    const allStudents = this._allStudents || baseStudents;
    this.setData({ activeFilter, filters: buildFilters(allStudents, activeFilter) });
    this.refreshList(this.data.keyword, activeFilter);
  },

  refreshList(keyword, activeFilter) {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    const students = (this._allStudents || baseStudents).filter((item) => {
      const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
      const matchesKeyword = !normalizedKeyword
        || item.name.toLowerCase().includes(normalizedKeyword)
        || item.number.includes(normalizedKeyword);
      return matchesFilter && matchesKeyword;
    });
    this.setData({ students: decorateStudents(students), visibleCount: students.length, emptyVisible: students.length === 0 });
  },

  openStudent(event) {
    wx.navigateTo({ url: '/pages/coach-student-detail/index?id=' + event.currentTarget.dataset.id });
  }
});
