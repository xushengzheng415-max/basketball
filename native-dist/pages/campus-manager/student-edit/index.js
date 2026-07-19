const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    title: '新增学员',
    avatar: '',
    genderOptions: ['男', '女'],
    relationOptions: ['父亲', '母亲', '其他监护人'],
    campusOptions: ['浦东校区', '徐汇校区'],
    classOptions: ['暂不分班', 'U8 启蒙班', 'U9 基础班', 'U10 提高班', 'U11 提高班'],
    form: {
      name: '', gender: '', birthday: '', phone: '',
      parentName: '', relation: '', parentPhone: '',
      campus: '', enrollmentDate: '', initialClass: ''
    },
    icons: {
      back: CLOUD_ROOT + 'icon-back-orange-256.png',
      user: CLOUD_ROOT + 'icon-user-orange-256.png',
      calendar: CLOUD_ROOT + 'icon-calendar-orange-256.png',
      chevron: CLOUD_ROOT + 'icon-chevron-orange-256.png',
      check: CLOUD_ROOT + 'icon-check-orange-256.png'
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
      console.warn('[campus-manager-student-edit] nav metrics unavailable', error);
    }
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 12,
      title: options && options.mode === 'edit' ? '编辑学员' : '新增学员'
    });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/students/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    if (key) this.setData({ [`form.${key}`]: event.detail.value || '' });
  },
  onPicker(event) {
    const key = event.currentTarget.dataset.key;
    const source = event.currentTarget.dataset.source;
    const options = this.data[source] || [];
    const value = options[Number(event.detail.value)] || '';
    if (key) this.setData({ [`form.${key}`]: value });
  },
  onDate(event) {
    const key = event.currentTarget.dataset.key;
    if (key) this.setData({ [`form.${key}`]: event.detail.value || '' });
  },
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (result) => {
        const file = result.tempFiles && result.tempFiles[0];
        if (file && file.tempFilePath) this.setData({ avatar: file.tempFilePath });
      }
    });
  },
  validate() {
    const form = this.data.form;
    const required = ['name', 'gender', 'birthday', 'phone', 'parentName', 'relation', 'parentPhone', 'campus', 'enrollmentDate'];
    const complete = required.every((key) => String(form[key] || '').trim());
    if (!complete) wx.showToast({ title: '请完整填写带 * 的必填项', icon: 'none' });
    return complete;
  },
  saveStudent() {
    if (!this.validate()) return;
    wx.showToast({ title: '学员信息已保存', icon: 'success' });
  },
  saveAndAssign() {
    if (!this.validate()) return;
    wx.navigateTo({ url: '/pages/campus-manager/class-assign-confirm/index' });
  }
});
