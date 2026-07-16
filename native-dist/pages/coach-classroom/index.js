const MODULES = [
  { id: 'm1', title: '动态热身', desc: '慢跑、关节激活、反应游戏', minutes: 10, intensity: '低' },
  { id: 'm2', title: '球感与原地控球', desc: '双手交替、低重心控制、弱侧手强化', minutes: 20, intensity: '中' },
  { id: 'm3', title: '行进间变向', desc: '体前变向、胯下衔接、节奏变化', minutes: 25, intensity: '中高' },
  { id: 'm4', title: '小组攻防对抗', desc: '3v3限制运球次数，快速出球', minutes: 25, intensity: '高' },
  { id: 'm5', title: '拉伸与总结', desc: '静态拉伸、课堂要点回顾', minutes: 10, intensity: '低' }
];

function decorateModules(modules, activeIndex) {
  return modules.map((item, index) => ({
    ...item,
    order: index + 1,
    state: index < activeIndex ? '已完成' : index === activeIndex ? '进行中' : '待开始',
    stateClass: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending',
    lineClass: index < activeIndex ? 'done' : ''
  }));
}

function activeModule(modules, activeIndex) {
  return modules[activeIndex] || modules[modules.length - 1];
}

function formatElapsed(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

Page({
  data: {
    courseId: 'course-2',
    attendees: [],
    attendeeCount: 0,
    activeIndex: 0,
    modules: decorateModules(MODULES, 0),
    currentModule: activeModule(MODULES, 0),
    elapsedSeconds: 0,
    elapsedText: '00:00',
    moduleProgress: 0,
    moduleProgressWidth: 0,
    timerRunning: true,
    timerLabel: '暂停计时',
    allCompleted: false,
    finishClass: 'disabled',
    finishLabel: '完成全部模块后结束课程'
  },

  onLoad(options) {
    const attendees = wx.getStorageSync('sxf_attendance_course-2') || [];
    this.setData({ courseId: options.id || 'course-2', attendees, attendeeCount: attendees.length });
    this._timer = setInterval(() => {
      if (!this.data.timerRunning) return;
      const elapsedSeconds = this.data.elapsedSeconds + 1;
      this.setData({ elapsedSeconds, elapsedText: formatElapsed(elapsedSeconds) });
    }, 1000);
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },

  goBack() {
    wx.showModal({
      title: '课程正在进行',
      content: '返回不会结束本节课，当前模块进度会保留。',
      success: (result) => { if (result.confirm) wx.navigateBack({ delta: 1 }); }
    });
  },

  toggleTimer() {
    const timerRunning = !this.data.timerRunning;
    this.setData({ timerRunning, timerLabel: timerRunning ? '暂停计时' : '继续计时' });
  },

  completeCurrentModule() {
    const nextIndex = this.data.activeIndex + 1;
    if (nextIndex >= MODULES.length) {
      this.setData({
        activeIndex: MODULES.length,
        modules: decorateModules(MODULES, MODULES.length),
        currentModule: MODULES[MODULES.length - 1],
        moduleProgress: 100,
        moduleProgressWidth: 100,
        timerRunning: false,
        timerLabel: '课程计时完成',
        allCompleted: true,
        finishClass: 'ready',
        finishLabel: '完成本节课并进入课后评价'
      });
      wx.showToast({ title: '全部训练模块已完成', icon: 'success' });
      return;
    }
    this.setData({
      activeIndex: nextIndex,
      modules: decorateModules(MODULES, nextIndex),
      currentModule: activeModule(MODULES, nextIndex),
      moduleProgress: 0,
      moduleProgressWidth: 0
    });
    wx.showToast({ title: '进入下一训练模块', icon: 'none' });
  },

  finishLesson() {
    if (!this.data.allCompleted) {
      wx.showToast({ title: '请先完成全部训练模块', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认完成本节课',
      content: '完成后将锁定课堂流程，并为本节到课与补课学员生成课后评价待办。',
      success: (result) => {
        if (!result.confirm) return;
        wx.setStorageSync('sxf_class_completed_course-2', { completedAt: Date.now(), modules: MODULES.length });
        wx.redirectTo({ url: '/pages/coach-evaluation-list/index?id=' + this.data.courseId });
      }
    });
  }
});
