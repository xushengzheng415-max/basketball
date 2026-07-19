const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const ICON_ROOT = ROOT + 'common/campus-manager/';
const TEAM_ROOT = ROOT + 'pages/team/';

const STUDENTS = [
  { id: 'li', name: '李明轩', age: '9岁', gender: '男', currentClass: 'U12进阶训练班', status: '时间冲突：周三 18:30-20:00', tone: 'conflict', avatar: TEAM_ROOT + 'avatar-linhao.png' },
  { id: 'wang', name: '王子豪', age: '10岁', gender: '男', currentClass: 'U12进阶训练班', status: '时间冲突：周三 18:30-20:00', tone: 'conflict', avatar: TEAM_ROOT + 'avatar-liuyuchen.png' },
  { id: 'zhang', name: '张宇航', age: '9岁', gender: '男', currentClass: 'U8启蒙班', status: '时间可安排', tone: 'available', avatar: TEAM_ROOT + 'avatar-zhangzixuan.png' },
  { id: 'chen', name: '陈思远', age: '10岁', gender: '男', currentClass: 'U8启蒙班', status: '时间可安排', tone: 'available', avatar: TEAM_ROOT + 'avatar-zhaozimo.png' },
  { id: 'liu', name: '刘梓辰', age: '9岁', gender: '男', currentClass: 'U12进阶训练班', status: '时间冲突：周三 18:30-20:00', tone: 'conflict', avatar: TEAM_ROOT + 'avatar-liaoran.png' },
  { id: 'zhao', name: '赵一诺', age: '11岁', gender: '男', currentClass: '成人基础班', status: '时间可安排', tone: 'available', avatar: TEAM_ROOT + 'avatar-liuyuchen.png' }
];

function presentStudent(student, selectedIds) {
  const selected = selectedIds.indexOf(student.id) > -1;
  return Object.assign({}, student, {
    selectedClass: selected ? 'selected' : '',
    selectedMark: selected ? '✓' : '',
    toneClass: student.tone
  });
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    query: '',
    selectedIds: ['zhang', 'chen'],
    selectedCount: 2,
    selectedAvatars: [TEAM_ROOT + 'avatar-zhangzixuan.png', TEAM_ROOT + 'avatar-zhaozimo.png'],
    students: STUDENTS.map((item) => presentStudent(item, ['zhang', 'chen'])),
    icons: {
      back: ICON_ROOT + 'icon-back-white-256.png',
      user: ICON_ROOT + 'icon-user-orange-256.png',
      calendar: ICON_ROOT + 'icon-calendar-orange-256.png',
      search: ICON_ROOT + 'icon-search-gray-256.png',
      check: ICON_ROOT + 'icon-check-orange-256.png'
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
      console.warn('[class-students] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 13 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/classes/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  onSearch(event) {
    const query = String(event.detail.value || '').trim();
    this.applyList(query, this.data.selectedIds);
  },
  applyList(query, selectedIds) {
    const source = query ? STUDENTS.filter((item) => item.name.indexOf(query) > -1 || item.currentClass.indexOf(query) > -1) : STUDENTS;
    const selectedAvatars = STUDENTS.filter((item) => selectedIds.indexOf(item.id) > -1).map((item) => item.avatar);
    this.setData({
      query,
      selectedIds,
      selectedCount: selectedIds.length,
      selectedAvatars,
      students: source.map((item) => presentStudent(item, selectedIds))
    });
  },
  toggleStudent(event) {
    const id = event.currentTarget.dataset.id;
    const selectedIds = this.data.selectedIds.slice();
    const index = selectedIds.indexOf(id);
    if (index > -1) selectedIds.splice(index, 1);
    else selectedIds.push(id);
    this.applyList(this.data.query, selectedIds);
  },
  clearSelection() {
    this.applyList(this.data.query, []);
  },
  showFilter() {
    wx.showActionSheet({ itemList: ['仅看时间可安排', '仅看时间冲突', '查看全部'], success: () => {} });
  },
  moveOut() {
    if (!this.data.selectedCount) {
      wx.showToast({ title: '请先选择学员', icon: 'none' });
      return;
    }
    wx.showToast({ title: '已加入移出清单', icon: 'none' });
  },
  moveIn() {
    if (!this.data.selectedCount) {
      wx.showToast({ title: '请先选择学员', icon: 'none' });
      return;
    }
    wx.showToast({ title: '已加入移入清单', icon: 'none' });
  },
  confirm() {
    if (!this.data.selectedCount) {
      wx.showToast({ title: '请至少选择一名学员', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认班级调整',
      content: `将调整 ${this.data.selectedCount} 名学员，并向家长发送通知。`,
      confirmColor: '#ff7900',
      success: (result) => {
        if (result.confirm) wx.showToast({ title: '调整已提交', icon: 'success' });
      }
    });
  }
});
