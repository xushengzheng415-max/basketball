const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team/';
const { requireEducationAccess } = require('../../utils/education-access');

const REPORTS = {
  weekly: {
    navTitle: '球员周报',
    eyebrow: '日报扫描已开启',
    title: '第21周球员周报',
    period: '5月19日–5月25日',
    periodKey: '2026-W21',
    rangeStart: '2026-05-19',
    rangeEnd: '2026-05-25',
    trigger: '本周最后一节课完成后，系统分批扫描日报并生成客观周报草稿',
    pending: '4',
    generated: '0',
    completion: '0%',
    completionWidth: 0,
    locked: false,
    ruleTitle: '周报自动生成规则',
    ruleCopy: '只读取本周期已发布日报，先计算出勤、课时、六维评分、标签与分数变化，再由AI组织文字；没有数据时不推断。'
  },
  monthly: {
    navTitle: '球员月报',
    eyebrow: '等待月底课程完成',
    title: '5月球员月报',
    period: '5月1日–5月31日',
    periodKey: '2026-05',
    rangeStart: '2026-05-01',
    rangeEnd: '2026-05-31',
    trigger: '预计5月31日最后一节课完成后自动加入生成队列',
    pending: '0',
    generated: '0',
    completion: '未开启',
    completionWidth: 0,
    locked: true,
    ruleTitle: '月报自动生成规则',
    ruleCopy: '月底最后一节课完成后，以当月全部已发布日报为证据生成草稿；教练可修改，确认后再发布。'
  }
};

const STUDENTS = [
  { id: 's1', name: '林浩', number: '23', classes: '本周3节 · 日报3份', score: '4.4', avatar: ROOT + 'avatar-linhao.png' },
  { id: 's2', name: '刘宇辰', number: '8', classes: '本周2节 · 日报2份', score: '4.1', avatar: ROOT + 'avatar-liuyuchen.png' },
  { id: 's3', name: '张子轩', number: '11', classes: '本周3节 · 日报3份', score: '4.6', avatar: ROOT + 'avatar-zhangzixuan.png' },
  { id: 's4', name: '赵子墨', number: '5', classes: '本周2节 · 日报2份', score: '4.0', avatar: ROOT + 'avatar-zhaozimo.png' }
];

function buildTabs(activeType) {
  return [
    { key: 'weekly', label: '周报', activeClass: activeType === 'weekly' ? 'active' : '' },
    { key: 'monthly', label: '月报', activeClass: activeType === 'monthly' ? 'active' : '' }
  ];
}

function buildStudents(type, remoteReports) {
  const reportMap = {};
  (remoteReports || []).forEach((item) => { reportMap[item.studentId] = item; });
  return STUDENTS.map((item) => {
    const remote = reportMap[item.id];
    const locked = type === 'monthly';
    const generated = !!remote;
    return {
      ...item,
      classes: locked ? '月底课程完成后统计' : item.classes,
      score: locked ? '--' : item.score,
      status: locked ? '未开启' : generated ? (remote.status === 'published' ? '已发布' : '草稿已生成') : '等待生成',
      statusClass: locked ? 'locked' : generated ? 'done' : 'pending',
      statusStyle: locked ? 'background:#252b2f;color:#7e868b' : '',
      buttonLabel: locked ? '未开启' : generated ? '查看草稿' : '立即生成',
      disabledClass: locked ? 'disabled' : '',
      reportId: remote && remote._id,
      reportContent: remote && remote.content,
      evidenceCount: remote && remote.evidenceCount,
      provider: remote && remote.provider,
      model: remote && remote.model,
      reportStatus: remote && remote.status
    };
  });
}

function reportSummary(baseReport, students) {
  const generated = students.filter((item) => item.reportId).length;
  const pending = students.length - generated;
  const completionWidth = students.length ? Math.round(generated / students.length * 100) : 0;
  return { ...baseReport, pending: String(pending), generated: String(generated), completion: completionWidth + '%', completionWidth };
}

Page({
  data: {
    activeType: 'weekly',
    isWeekly: true,
    reportTypeLabel: '周报',
    secondaryLabel: '稍后确认',
    confirmLabel: '周报',
    concernAvatarOne: ROOT + 'avatar-liuyuchen.png',
    concernAvatarTwo: ROOT + 'avatar-zhaozimo.png',
    tabs: buildTabs('weekly'),
    report: REPORTS.weekly,
    students: buildStudents('weekly', []),
    remoteReports: [],
    editorVisible: false,
    currentStudent: null,
    reportText: '',
    sourceTitle: '日报汇总待扫描',
    sourceDetail: '系统将读取本周期已发布日报并计算客观统计',
    submitLabel: '确认发布周报',
    generatingId: ''
  },

  onLoad(options) {
    this.setReportType(options.type === 'monthly' ? 'monthly' : 'weekly');
  },

  onShow() {
    this.refreshStatuses();
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.reLaunch({ url: '/pages/education/index' });
  },

  switchType(event) {
    this.setReportType(event.currentTarget.dataset.type);
  },

  setReportType(type) {
    const students = buildStudents(type, []);
    this.setData({
      activeType: type,
      isWeekly: type === 'weekly',
      reportTypeLabel: type === 'weekly' ? '周报' : '月报',
      secondaryLabel: type === 'weekly' ? '稍后确认' : '保存草稿',
      confirmLabel: type === 'weekly' ? '周报' : '月报',
      tabs: buildTabs(type),
      report: reportSummary({ ...REPORTS[type] }, students),
      students,
      remoteReports: [],
      editorVisible: false
    });
    this.refreshStatuses(type);
  },

  refreshStatuses(forcedType) {
    const type = forcedType || this.data.activeType;
    if (!wx.cloud || !wx.cloud.callFunction) return;
    const report = REPORTS[type];
    wx.cloud.callFunction({
      name: 'sxGeneratePeriodReport',
      data: { action: 'list', reportType: type, periodKey: report.periodKey }
    }).then((response) => {
      const result = response.result || {};
      if (!result.ok || type !== this.data.activeType) return;
      const students = buildStudents(type, result.reports || []);
      this.setData({ remoteReports: result.reports || [], students, report: reportSummary({ ...REPORTS[type] }, students) });
    }).catch(() => {});
  },

  openReport(event) {
    if (this.data.report.locked) {
      wx.showToast({ title: '月底最后一节课完成后自动开启', icon: 'none' });
      return;
    }
    const student = this.data.students.find((item) => item.id === event.currentTarget.dataset.id);
    if (!student || this.data.generatingId) return;
    if (student.reportId) {
      this.openEditor(student, student.reportContent, student.evidenceCount, student.provider, student.model);
      return;
    }
    this.generateReport(student);
  },

  async generateReport(student) {
    if (!(await requireEducationAccess())) return;
    if (!wx.cloud || !wx.cloud.callFunction) {
      wx.showToast({ title: '当前环境未启用云开发', icon: 'none' });
      return;
    }
    this.setData({ generatingId: student.id });
    wx.showLoading({ title: '扫描日报并生成' });
    wx.cloud.callFunction({
      name: 'sxGeneratePeriodReport',
      data: {
        action: 'generate',
        reportType: this.data.activeType,
        periodKey: this.data.report.periodKey,
        rangeStart: this.data.report.rangeStart,
        rangeEnd: this.data.report.rangeEnd,
        studentId: student.id,
        studentName: student.name,
        studentNumber: student.number,
        title: student.name + (this.data.activeType === 'monthly' ? '月报' : '周报')
      }
    }).then((response) => {
      const result = response.result || {};
      if (!result.ok) throw new Error(result.message || '报告生成失败');
      const remote = result.report || {};
      this.openEditor({ ...student, reportId: result.id }, remote.content, remote.evidenceCount, remote.provider, remote.model);
      this.refreshStatuses();
    }).catch((error) => {
      wx.showModal({ title: '暂时无法生成', content: error.message || '当前周期没有可用日报，请先完成课堂评价。', showCancel: false });
    }).finally(() => {
      wx.hideLoading();
      this.setData({ generatingId: '' });
    });
  },

  openEditor(student, content, evidenceCount, provider, model) {
    this.setData({
      editorVisible: true,
      currentStudent: student,
      reportText: content || '',
      sourceTitle: '已扫描 ' + (evidenceCount || 0) + ' 份课堂日报',
      sourceDetail: '客观统计完成 · AI模型 ' + (provider || 'hunyuan-v3') + ' / ' + (model || 'hy3') + ' · 教练可修改后发布',
      submitLabel: student.reportStatus === 'published' ? '保存发布版本' : '确认发布' + (this.data.activeType === 'monthly' ? '月报' : '周报')
    });
  },

  closeEditor() { this.setData({ editorVisible: false }); },
  stopTouch() {},
  onReportInput(event) { this.setData({ reportText: event.detail.value }); },

  async submitReport() {
    if (!this.data.reportText.trim()) {
      wx.showToast({ title: '报告内容不能为空', icon: 'none' });
      return;
    }
    if (!this.data.currentStudent || !this.data.currentStudent.reportId) return;
    if (!(await requireEducationAccess())) return;
    this.setData({ submitLabel: '云端发布中…' });
    wx.showLoading({ title: '正在发布报告' });
    wx.cloud.callFunction({
      name: 'sxGeneratePeriodReport',
      data: { action: 'publish', reportId: this.data.currentStudent.reportId, content: this.data.reportText }
    }).then((response) => {
      const result = response.result || {};
      if (!result.ok) throw new Error(result.message || '报告发布失败');
      this.setData({ editorVisible: false });
      wx.showToast({ title: '周期报告已发布', icon: 'success' });
      this.refreshStatuses();
    }).catch((error) => {
      wx.showModal({ title: '发布失败', content: error.message || '请稍后重试', showCancel: false });
    }).finally(() => {
      wx.hideLoading();
      this.setData({ submitLabel: '确认发布' + (this.data.activeType === 'monthly' ? '月报' : '周报') });
    });
  }
});
