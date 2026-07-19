const DURATION_VALUES = [5, 10, 15, 20, 25, 30];
const { requireEducationAccess } = require('../../utils/education-access');
const INTENSITY_VALUES = ['低', '中', '中高', '高'];
const MODULE_TEMPLATES = [
  { id: 'custom', title: '自定义模块', shortTitle: '自定义', desc: '', minutes: 10, intensity: '中' },
  { id: 'warmup', title: '动态热身', shortTitle: '动态热身', desc: '慢跑、关节激活、反应游戏', minutes: 10, intensity: '低' },
  { id: 'ball-feel', title: '球感与原地控球', shortTitle: '球感控球', desc: '双手交替、低重心控制、弱侧手强化', minutes: 20, intensity: '中' },
  { id: 'passing', title: '传接球配合', shortTitle: '传接球', desc: '移动接球、快速出球与双人配合', minutes: 15, intensity: '中' },
  { id: 'dribble', title: '运球突破训练', shortTitle: '运球突破', desc: '体前变向、胯下衔接与突破终结', minutes: 20, intensity: '中高' },
  { id: 'shooting', title: '投篮专项训练', shortTitle: '投篮训练', desc: '定点投篮、移动接球投篮与出手节奏', minutes: 20, intensity: '中' },
  { id: 'defense', title: '防守脚步训练', shortTitle: '防守脚步', desc: '滑步、关闭路线与一对一防守', minutes: 15, intensity: '中高' },
  { id: 'game', title: '小组攻防对抗', shortTitle: '小组对抗', desc: '3v3限制运球次数，强调快速出球', minutes: 25, intensity: '高' },
  { id: 'fitness', title: '专项体能训练', shortTitle: '专项体能', desc: '折返跑、核心稳定与篮球专项耐力', minutes: 15, intensity: '高' },
  { id: 'cooldown', title: '拉伸与课堂总结', shortTitle: '拉伸总结', desc: '静态拉伸、放松恢复与课堂要点回顾', minutes: 10, intensity: '低' }
];

function decorateOptions(values, activeValue) {
  return values.map((value) => ({
    value,
    label: String(value),
    activeClass: value === activeValue ? 'active' : ''
  }));
}

function decorateTemplates(activeId) {
  return MODULE_TEMPLATES.map((item) => ({
    ...item,
    showPresetInfo: item.id !== 'custom',
    activeClass: item.id === activeId ? 'active' : ''
  }));
}

function normalizeModules(modules, draggingId) {
  return modules.map((item, index) => ({
    ...item,
    order: index + 1,
    draggingClass: item.id === draggingId ? 'dragging' : ''
  }));
}

Page({
  data: {
    totalMinutes: 90,
    totalState: '时长匹配',
    totalClass: 'ok',
    scrollEnabled: true,
    draggingId: '',
    draggingIndex: -1,
    editorVisible: false,
    editorTitle: '添加训练模块',
    editingId: '',
    selectedTemplateId: 'custom',
    editorForm: { title: '', desc: '', minutes: 10, intensity: '中' },
    moduleTemplates: decorateTemplates('custom'),
    durationOptions: decorateOptions(DURATION_VALUES, 10),
    intensityOptions: decorateOptions(INTENSITY_VALUES, '中'),
    modules: normalizeModules([
      { id: 'm1', title: '动态热身', desc: '慢跑、关节激活、反应游戏', minutes: 10, intensity: '低' },
      { id: 'm2', title: '球感与原地控球', desc: '双手交替、低重心控制、弱侧手强化', minutes: 20, intensity: '中' },
      { id: 'm3', title: '行进间变向', desc: '体前变向、胯下衔接、节奏变化', minutes: 25, intensity: '中高' },
      { id: 'm4', title: '小组攻防对抗', desc: '3v3限制运球次数，快速出球', minutes: 25, intensity: '高' },
      { id: 'm5', title: '拉伸与总结', desc: '静态拉伸、课堂要点回顾', minutes: 10, intensity: '低' }
    ], '')
  },

  onLoad(options) {
    if (options && options.mode === 'edit') {
      this.openEditModule({ currentTarget: { dataset: { id: 'm1' } } });
    }
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/coach-course-detail/index?id=course-2' });
  },

  openAddModule() {
    const editorForm = { title: '', desc: '', minutes: 10, intensity: '中' };
    this.setData({
      editorVisible: true,
      editorTitle: '添加训练模块',
      editingId: '',
      selectedTemplateId: 'custom',
      editorForm,
      moduleTemplates: decorateTemplates('custom'),
      durationOptions: decorateOptions(DURATION_VALUES, editorForm.minutes),
      intensityOptions: decorateOptions(INTENSITY_VALUES, editorForm.intensity)
    });
  },

  openEditModule(event) {
    if (this.data.draggingId) return;
    const id = event.currentTarget.dataset.id;
    const current = this.data.modules.find((item) => item.id === id);
    if (!current) return;
    const editorForm = {
      title: current.title,
      desc: current.desc,
      minutes: current.minutes,
      intensity: current.intensity
    };
    this.setData({
      editorVisible: true,
      editorTitle: '编辑训练模块',
      editingId: id,
      selectedTemplateId: 'custom',
      editorForm,
      moduleTemplates: decorateTemplates('custom'),
      durationOptions: decorateOptions(DURATION_VALUES, editorForm.minutes),
      intensityOptions: decorateOptions(INTENSITY_VALUES, editorForm.intensity)
    });
  },

  closeEditor() {
    this.setData({ editorVisible: false });
  },

  noop() {},

  selectTemplate(event) {
    const id = event.currentTarget.dataset.id;
    const template = MODULE_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    const editorForm = {
      title: template.id === 'custom' ? '' : template.title,
      desc: template.desc,
      minutes: template.minutes,
      intensity: template.intensity
    };
    this.setData({
      selectedTemplateId: id,
      moduleTemplates: decorateTemplates(id),
      editorForm,
      durationOptions: decorateOptions(DURATION_VALUES, editorForm.minutes),
      intensityOptions: decorateOptions(INTENSITY_VALUES, editorForm.intensity)
    });
  },

  onEditorInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      editorForm: { ...this.data.editorForm, [field]: event.detail.value },
      selectedTemplateId: 'custom',
      moduleTemplates: decorateTemplates('custom')
    });
  },

  selectMinutes(event) {
    const minutes = Number(event.currentTarget.dataset.value);
    this.setData({
      editorForm: { ...this.data.editorForm, minutes },
      durationOptions: decorateOptions(DURATION_VALUES, minutes)
    });
  },

  selectIntensity(event) {
    const intensity = event.currentTarget.dataset.value;
    this.setData({
      editorForm: { ...this.data.editorForm, intensity },
      intensityOptions: decorateOptions(INTENSITY_VALUES, intensity)
    });
  },

  saveModule() {
    const form = this.data.editorForm;
    const title = form.title.trim();
    const desc = form.desc.trim();
    if (!title) {
      wx.showToast({ title: '请填写模块名称', icon: 'none' });
      return;
    }
    if (!desc) {
      wx.showToast({ title: '请填写训练说明', icon: 'none' });
      return;
    }
    let modules;
    if (this.data.editingId) {
      modules = this.data.modules.map((item) => item.id === this.data.editingId
        ? { ...item, title, desc, minutes: form.minutes, intensity: form.intensity }
        : item);
    } else {
      modules = this.data.modules.concat({
        id: 'm' + Date.now(),
        title,
        desc,
        minutes: form.minutes,
        intensity: form.intensity
      });
    }
    this.syncModules(modules, { editorVisible: false });
    wx.showToast({ title: this.data.editingId ? '模块已更新' : '模块已添加', icon: 'success' });
  },

  removeModule(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除训练模块',
      content: '删除后将重新计算计划总时长。',
      success: (result) => {
        if (result.confirm) this.syncModules(this.data.modules.filter((item) => item.id !== id));
      }
    });
  },

  startDrag(event) {
    const id = event.currentTarget.dataset.id;
    const index = Number(event.currentTarget.dataset.index);
    const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]);
    this._dragStartY = touch ? touch.clientY : 0;
    this._dragThreshold = 44 * ((wx.getWindowInfo ? wx.getWindowInfo().windowWidth : 375) / 375);
    this.setData({
      scrollEnabled: false,
      draggingId: id,
      draggingIndex: index,
      modules: normalizeModules(this.data.modules, id)
    });
    wx.vibrateShort({ type: 'light' });
  },

  moveDrag(event) {
    if (!this.data.draggingId) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const distance = touch.clientY - this._dragStartY;
    if (Math.abs(distance) < this._dragThreshold) return;
    const direction = distance > 0 ? 1 : -1;
    const fromIndex = this.data.draggingIndex;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= this.data.modules.length) {
      this._dragStartY = touch.clientY;
      return;
    }
    const modules = this.data.modules.slice();
    const moving = modules.splice(fromIndex, 1)[0];
    modules.splice(toIndex, 0, moving);
    this._dragStartY = touch.clientY;
    this.setData({
      draggingIndex: toIndex,
      modules: normalizeModules(modules, this.data.draggingId)
    });
  },

  finishDrag() {
    if (!this.data.draggingId) return;
    this.syncModules(this.data.modules, {
      scrollEnabled: true,
      draggingId: '',
      draggingIndex: -1
    });
  },

  syncModules(modules, extraData) {
    const normalized = normalizeModules(modules, '');
    const totalMinutes = normalized.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    this.setData({
      modules: normalized,
      totalMinutes,
      totalState: totalMinutes === 90 ? '时长匹配' : '需调整至90分钟',
      totalClass: totalMinutes === 90 ? 'ok' : 'warning',
      ...(extraData || {})
    });
  },

  async saveDraft() {
    if (!(await requireEducationAccess())) return;
    wx.showToast({ title: '计划草稿已保存', icon: 'success' });
  },

  async confirmPlan() {
    if (this.data.totalMinutes !== 90) {
      wx.showToast({ title: '请先将总时长调整为90分钟', icon: 'none' });
      return;
    }
    if (!(await requireEducationAccess())) return;
    wx.showToast({ title: '课程计划已确认', icon: 'success' });
    setTimeout(() => this.goBack(), 600);
  }
});
