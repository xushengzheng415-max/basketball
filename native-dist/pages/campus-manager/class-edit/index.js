const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

function stageOptions(selected) {
  return [
    { key: '启蒙班', label: '启蒙班', mark: 'U8', activeClass: selected === '启蒙班' ? 'active' : '' },
    { key: '基础班', label: '基础班', mark: 'U10', activeClass: selected === '基础班' ? 'active' : '' },
    { key: '进阶班', label: '进阶班', mark: 'U12', activeClass: selected === '进阶班' ? 'active' : '' }
  ];
}

function weekdayOptions(selected) {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((label) => ({
    label,
    activeClass: selected.indexOf(label) > -1 ? 'active' : ''
  }));
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    pageTitle: '新建班级',
    ageOptions: ['U6（5-6岁）', 'U8（7-8岁）', 'U10（9-10岁）', 'U12（11-12岁）', '成人'],
    coachOptions: ['陈教练', '王教练', '李教练', '张教练'],
    assistantOptions: ['暂不设置', '王助教', '刘助教', '周助教'],
    venueOptions: ['浦东校区 · 1号馆', '浦东校区 · 2号馆', '浦东校区 · 3号馆'],
    startOptions: ['09:00', '14:00', '17:00', '18:30', '20:00'],
    endOptions: ['10:30', '15:30', '18:30', '20:00', '21:30'],
    selectedStage: '启蒙班',
    stages: stageOptions('启蒙班'),
    selectedDays: ['周四'],
    weekdays: weekdayOptions(['周四']),
    form: {
      name: '',
      age: '',
      coach: '',
      assistant: '',
      capacity: 12,
      start: '17:00',
      end: '18:30',
      venue: ''
    },
    icons: {
      back: ICON_ROOT + 'icon-back-white-256.png',
      edit: ICON_ROOT + 'icon-class-orange-256.png',
      coach: ICON_ROOT + 'icon-coach-orange-256.png',
      clock: ICON_ROOT + 'icon-clock-orange-256.png',
      location: ICON_ROOT + 'icon-location-orange-256.png',
      user: ICON_ROOT + 'icon-user-orange-256.png'
    }
  },
  onLoad(options) {
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
      console.warn('[class-edit] nav metrics unavailable', error);
    }
    const editing = options && options.mode === 'edit';
    const form = editing ? {
      name: 'U10基础训练班', age: 'U10（9-10岁）', coach: '陈教练', assistant: '王助教',
      capacity: 20, start: '14:00', end: '15:30', venue: '浦东校区 · 2号馆'
    } : this.data.form;
    const stage = editing ? '基础班' : this.data.selectedStage;
    const days = editing ? ['周二', '周四'] : this.data.selectedDays;
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 12,
      pageTitle: editing ? '编辑班级' : '新建班级',
      form,
      selectedStage: stage,
      stages: stageOptions(stage),
      selectedDays: days,
      weekdays: weekdayOptions(days)
    });
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
  onNameInput(event) {
    this.setData({ 'form.name': event.detail.value || '' });
  },
  selectStage(event) {
    const stage = event.currentTarget.dataset.stage;
    this.setData({ selectedStage: stage, stages: stageOptions(stage) });
  },
  selectDay(event) {
    const day = event.currentTarget.dataset.day;
    const selected = this.data.selectedDays.slice();
    const index = selected.indexOf(day);
    if (index > -1) selected.splice(index, 1);
    else selected.push(day);
    this.setData({ selectedDays: selected, weekdays: weekdayOptions(selected) });
  },
  onPicker(event) {
    const key = event.currentTarget.dataset.key;
    const source = event.currentTarget.dataset.source;
    const options = this.data[source] || [];
    const value = options[Number(event.detail.value)] || '';
    this.setData({ [`form.${key}`]: value });
  },
  changeCapacity(event) {
    const delta = Number(event.currentTarget.dataset.delta || 0);
    const capacity = Math.max(1, Math.min(40, Number(this.data.form.capacity) + delta));
    this.setData({ 'form.capacity': capacity });
  },
  validate() {
    const form = this.data.form;
    const complete = form.name && form.age && form.coach && form.venue && this.data.selectedDays.length;
    if (!complete) wx.showToast({ title: '请完整填写带 * 的必填项', icon: 'none' });
    return complete;
  },
  saveClass() {
    if (!this.validate()) return;
    wx.showToast({ title: '班级已保存', icon: 'success' });
  },
  saveAndAdd() {
    if (!this.validate()) return;
    wx.navigateTo({ url: '/pages/campus-manager/class-students/index?id=u10' });
  }
});
