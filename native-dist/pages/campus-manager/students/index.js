const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const TEAM_ROOT = CLOUD_ROOT + 'pages/team/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

const STUDENTS = [
  {
    id: 'liu',
    name: '刘承宇',
    gender: '♂',
    genderClass: 'male',
    age: '10岁',
    className: 'U10 提高班',
    lessons: '24',
    attendanceTime: '周二 17:00',
    attendance: '出勤',
    attendanceClass: 'present',
    attention: false,
    renewal: false,
    avatar: TEAM_ROOT + 'avatar-linhao.png'
  },
  {
    id: 'lin',
    name: '林子轩',
    gender: '♂',
    genderClass: 'male',
    age: '9岁',
    className: 'U9 基础班',
    lessons: '6',
    attendanceTime: '周四 18:00',
    attendance: '缺勤',
    attendanceClass: 'absent',
    attention: true,
    renewal: true,
    avatar: TEAM_ROOT + 'avatar-zhaozimo.png'
  },
  {
    id: 'chen',
    name: '陈雨桐',
    gender: '♀',
    genderClass: 'female',
    age: '8岁',
    className: 'U8 启蒙班',
    lessons: '18',
    attendanceTime: '周六 09:00',
    attendance: '出勤',
    attendanceClass: 'present',
    attention: false,
    renewal: false,
    avatar: TEAM_ROOT + 'avatar-zhangzixuan.png'
  },
  {
    id: 'wang',
    name: '王皓然',
    gender: '♂',
    genderClass: 'male',
    age: '11岁',
    className: 'U11 提高班',
    lessons: '30',
    attendanceTime: '周日 10:30',
    attendance: '出勤',
    attendanceClass: 'present',
    attention: false,
    renewal: false,
    avatar: TEAM_ROOT + 'avatar-liuyuchen.png'
  }
];

function buildTabs(activeKey) {
  return [
    { key: 'all', label: '全部', activeClass: activeKey === 'all' ? 'active' : '' },
    { key: 'attention', label: '需关注', activeClass: activeKey === 'attention' ? 'active' : '' },
    { key: 'renewal', label: '待续费', activeClass: activeKey === 'renewal' ? 'active' : '' }
  ];
}

function filterStudents(activeKey, query) {
  const keyword = String(query || '').trim().toLowerCase();
  return STUDENTS.filter((student) => {
    const inTab = activeKey === 'all'
      || (activeKey === 'attention' && student.attention)
      || (activeKey === 'renewal' && student.renewal);
    const text = `${student.name} ${student.className} ${student.age}`.toLowerCase();
    return inTab && (!keyword || text.includes(keyword));
  });
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    activeKey: 'all',
    query: '',
    tabs: buildTabs('all'),
    students: STUDENTS,
    showEmpty: false,
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png',
      search: TEAM_ROOT + 'icon-search.png',
      filter: TEAM_ROOT + 'icon-filter.png',
      students: TEAM_ROOT + 'summary-icon-total.png'
    }
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) {
        navTop = menu.top;
        navHeight = menu.height || 32;
      } else {
        navTop = wx.getSystemInfoSync().statusBarHeight || 20;
      }
    } catch (error) {
      console.warn('[campus-manager-students] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 18 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/home/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  selectTab(event) {
    const activeKey = event.currentTarget.dataset.key || 'all';
    const students = filterStudents(activeKey, this.data.query);
    this.setData({
      activeKey,
      tabs: buildTabs(activeKey),
      students,
      showEmpty: students.length === 0
    });
  },
  onSearchInput(event) {
    const query = event.detail.value || '';
    const students = filterStudents(this.data.activeKey, query);
    this.setData({ query, students, showEmpty: students.length === 0 });
  },
  openFilter() {
    wx.showToast({ title: '可按班级与课时进一步筛选', icon: 'none' });
  },
  openStudent(event) {
    const id = event.currentTarget.dataset.id || '';
    wx.navigateTo({ url: `/pages/campus-manager/student-detail/index?id=${id}` });
  },
  addStudent() {
    wx.navigateTo({ url: '/pages/campus-manager/student-edit/index?mode=create' });
  }
});
