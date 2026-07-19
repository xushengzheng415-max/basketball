const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const { requireEducationAccess } = require('../../utils/education-access');

const STUDENT_PROFILES = {
  s1: { id: 's1', name: '林浩', number: '23', age: '9岁', avatar: ROOT + 'pages/team/avatar-linhao.png' },
  s2: { id: 's2', name: '刘宇辰', number: '8', age: '10岁', avatar: ROOT + 'pages/team/avatar-liuyuchen.png' },
  s3: { id: 's3', name: '张子轩', number: '11', age: '10岁', avatar: ROOT + 'pages/team/avatar-zhangzixuan.png' },
  s4: { id: 's4', name: '赵子墨', number: '5', age: '9岁', avatar: ROOT + 'pages/team/avatar-zhaozimo.png' },
  s5: { id: 's5', name: '廖然', number: '17', age: '10岁', avatar: ROOT + 'pages/team/avatar-liaoran.png' }
};

const rawGroups = [
  { title: '技术表现', tags: ['弱侧手进步', '控球稳定', '变向流畅', '传球及时', '投篮选择好', '防守脚步需加强'] },
  { title: '课堂状态', tags: ['专注积极', '执行力强', '团队协作', '敢于对抗', '情绪稳定', '需要更多鼓励'] },
  { title: '成长建议', tags: ['加强观察', '提升左手', '强化核心力量', '增加对抗', '保持出勤', '自主练习10分钟'] }
];

const initialRatings = [
  { key: 'focus', label: '课堂投入', desc: '专注认真，积极参与', rating: 4, weight: 35 },
  { key: 'technique', label: '技能完成', desc: '动作规范，完成质量', rating: 5, weight: 35 },
  { key: 'teamwork', label: '团队协作', desc: '沟通配合，互相支持', rating: 4, weight: 30 }
];

function decorateTags(selected) {
  return rawGroups.map((group) => ({
    ...group,
    tags: group.tags.map((label) => ({ label, activeClass: selected.includes(label) ? 'active' : '' }))
  }));
}

function createStars(rating) {
  return [1, 2, 3, 4, 5].map((value) => ({
    value,
    halfValue: value - 0.5,
    fullValue: value,
    fillClass: rating >= value ? 'full' : rating >= value - 0.5 ? 'half' : 'empty',
    activeClass: rating === value ? 'active' : ''
  }));
}

function decorateRatings(ratings) {
  return ratings.map((item) => ({
    ...item,
    ratingText: Number(item.rating).toFixed(1),
    stars: createStars(Number(item.rating))
  }));
}

function calculateOverall(ratings) {
  const totalWeight = ratings.reduce((sum, item) => sum + item.weight, 0);
  const score = ratings.reduce((sum, item) => sum + Number(item.rating) * item.weight, 0) / totalWeight;
  const percent = Math.round(score * 20);
  let grade = '待提升';
  if (score >= 4.5) grade = '卓越';
  else if (score >= 4) grade = '优秀';
  else if (score >= 3.5) grade = '良好';
  else if (score >= 3) grade = '达标';
  return { overallScore: score.toFixed(1), overallPercent: percent, overallGrade: grade };
}

function buildDailyReport(overall, selected, studentName) {
  const strengths = selected.slice(0, 3).join('、') || '训练状态稳定';
  return {
    title: studentName + ' · 5月23日训练日报',
    period: 'U10提高班 · 控球强化与攻防转换',
    metrics: [
      { value: '90', unit: '分钟', label: '本节训练' },
      { value: '5', unit: '模块', label: '完成内容' },
      { value: overall.overallScore, unit: '分', label: '综合评分' },
      { value: '96', unit: '%', label: '计划完成' }
    ],
    summary: '今日训练综合表现为' + overall.overallGrade + '。能够完成教练布置的主要训练任务，课堂纪律和装备准备良好。',
    highlight: '今日亮点：' + strengths + '。',
    suggestion: '课后建议：加强变向后的抬头观察，巩固弱侧手控球稳定性。'
  };
}

function defaultDraft(studentName) {
  return studentName + '本节课在弱侧手控球方面进步明显，面对防守时能够保持更稳定的重心，并主动尝试变向突破。课堂专注度较高，能够积极执行训练要求。下一阶段建议继续加强抬头观察，在控球后更快发现队友位置并完成传球。';
}

function dailyReportPayload(data) {
  return {
    action: 'saveDaily',
    studentId: data.studentId,
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    courseId: data.courseId,
    courseTitle: data.courseTitle,
    reportDate: data.reportDate,
    attendanceStatus: data.attendanceStatus,
    durationMinutes: 90,
    modulesCompleted: 5,
    planCompletion: 96,
    ratings: data.ratings.map((item) => ({ key: item.key, label: item.label, rating: Number(item.rating), weight: item.weight })),
    overallScore: Number(data.overallScore),
    overallGrade: data.overallGrade,
    tags: data.selected,
    coachComment: data.draft,
    reportSummary: data.reportData.summary
  };
}

const selected = ['弱侧手进步', '控球稳定', '专注积极', '加强观察'];
const overall = calculateOverall(initialRatings);

Page({
  data: {
    viewMode: 'evaluate',
    isEvaluate: true,
    isConfirm: false,
    isReturned: false,
    studentId: 's1',
    studentName: '林浩',
    studentNumber: '23',
    courseId: 'course-2-2026-05-23',
    courseTitle: 'U10提高班 · 控球强化与攻防转换',
    reportDate: '2026-05-23',
    avatar: ROOT + 'pages/team/avatar-linhao.png',
    studentMeta: '9岁 · U10提高班 · 本节到课',
    attendanceStatus: 'present',
    source: '',
    progressText: '1 / 1',
    selected,
    highlightTags: [
      { label: '弱手进步', activeClass: 'active' },
      { label: '控球稳定', activeClass: 'active' },
      { label: '主动沟通', activeClass: 'active' }
    ],
    groups: decorateTags(selected),
    ratings: decorateRatings(initialRatings),
    ...overall,
    draft: defaultDraft('林浩'),
    draftLength: 96,
    generating: false,
    generateLabel: 'AI 重新生成',
    reportData: buildDailyReport(overall, selected, '林浩'),
    reportGenerating: false,
    reportGenerateLabel: 'AI 重新生成',
    reportStatus: '随评价发布',
    publishing: false,
    publishLabel: '确认并发布评价'
  },

  onLoad(options) {
    const attendees = wx.getStorageSync('sxf_attendance_course-2') || [];
    const attendee = attendees.find((item) => item.id === options.studentId);
    const profile = attendee || STUDENT_PROFILES[options.studentId] || STUDENT_PROFILES.s1;
    const attendanceStatus = profile.attendanceStatus || 'present';
    const attendanceLabel = attendanceStatus === 'makeup' ? '本节补课' : '本节到课';
    const index = Math.max(0, Number(options.index) || 0);
    const total = Math.max(1, Number(options.total) || attendees.length || 1);
    const studentName = profile.name;
    const draft = defaultDraft(studentName);
    const viewMode = options.mode === 'returned' ? 'returned' : options.mode === 'confirm' ? 'confirm' : 'evaluate';
    this.setData({
      viewMode,
      isEvaluate: viewMode === 'evaluate',
      isConfirm: viewMode === 'confirm',
      isReturned: viewMode === 'returned',
      studentId: profile.id,
      studentName,
      studentNumber: profile.number,
      avatar: profile.avatar,
      studentMeta: (profile.age || 'U10') + ' · U10提高班 · ' + attendanceLabel,
      attendanceStatus,
      source: options.source || '',
      progressText: (index + 1) + ' / ' + total,
      draft,
      draftLength: draft.length,
      reportData: buildDailyReport(this.data, this.data.selected, studentName)
    });
  },

  previewConfirm() {
    this.setData({ viewMode: 'confirm', isEvaluate: false, isConfirm: true, isReturned: false });
  },

  backToEdit() {
    this.setData({ viewMode: 'evaluate', isEvaluate: true, isConfirm: false, isReturned: false });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/coach-course-detail/index?id=course-2' });
  },

  rateDimension(event) {
    const key = event.currentTarget.dataset.key;
    const rating = Number(event.currentTarget.dataset.value);
    const rawRatings = this.data.ratings.map((item) => item.key === key ? { ...item, rating } : item);
    const overallData = calculateOverall(rawRatings);
    this.setData({
      ratings: decorateRatings(rawRatings),
      ...overallData,
      reportData: buildDailyReport(overallData, this.data.selected, this.data.studentName),
      reportStatus: '待确认'
    });
  },

  toggleTag(event) {
    const label = event.currentTarget.dataset.label;
    const selectedTags = this.data.selected.includes(label)
      ? this.data.selected.filter((item) => item !== label)
      : this.data.selected.concat(label);
    this.setData({
      selected: selectedTags,
      groups: decorateTags(selectedTags),
      reportData: buildDailyReport(this.data, selectedTags, this.data.studentName),
      reportStatus: '待确认'
    });
  },

  onDraftInput(event) {
    this.setData({ draft: event.detail.value, draftLength: event.detail.value.length });
  },

  generate() {
    if (this.data.generating) return;
    this.setData({ generating: true, generateLabel: 'AI 生成中…' });
    setTimeout(() => {
      const tags = this.data.selected.join('、');
      const ratingCopy = this.data.ratings.map((item) => item.label + item.ratingText + '星').join('，');
      const draft = this.data.studentName + '本节课综合评分' + this.data.overallScore + '分（' + this.data.overallGrade + '）。' + ratingCopy + '。在' + tags + '方面表现突出，能够主动完成训练任务。下一阶段建议继续加强抬头观察，并在实战中提升快速决策能力。';
      this.setData({ generating: false, generateLabel: 'AI 重新生成', draft, draftLength: draft.length });
    }, 700);
  },

  generateReport() {
    if (this.data.reportGenerating) return;
    this.setData({ reportGenerating: true, reportGenerateLabel: 'AI 生成中…' });
    setTimeout(() => {
      this.setData({
        reportGenerating: false,
        reportGenerateLabel: 'AI 重新生成',
        reportData: buildDailyReport(this.data, this.data.selected, this.data.studentName),
        reportStatus: '草稿已更新'
      });
    }, 700);
  },

  async save() {
    if (!(await requireEducationAccess())) return;
    wx.showToast({ title: '评价草稿已保存', icon: 'success' });
  },

  async publish() {
    if (this.data.publishing) return;
    if (!this.data.draft.trim()) {
      wx.showToast({ title: '请先填写评价内容', icon: 'none' });
      return;
    }
    if (!(await requireEducationAccess())) return;
    wx.showModal({
      title: '发布课后评价',
      content: '将同步保存六维评分、综合分、教练评价与当日训练日报。',
      success: (result) => {
        if (!result.confirm) return;
        if (!wx.cloud || !wx.cloud.callFunction) {
          wx.showToast({ title: '当前环境未启用云开发', icon: 'none' });
          return;
        }
        this.setData({ publishing: true, publishLabel: '云端保存中…' });
        wx.showLoading({ title: '正在保存日报' });
        wx.cloud.callFunction({ name: 'sxGeneratePeriodReport', data: dailyReportPayload(this.data) })
          .then((response) => {
            const cloudResult = response.result || {};
            if (!cloudResult.ok) throw new Error(cloudResult.message || '日报保存失败');
            this.setData({ reportStatus: '已发布' });
            const statusMap = wx.getStorageSync('sxf_evaluation_status_course-2') || {};
            statusMap[this.data.studentId] = { publishedAt: Date.now(), dailyReportId: cloudResult.id };
            wx.setStorageSync('sxf_evaluation_status_course-2', statusMap);
            wx.showToast({ title: '评价与日报已发布', icon: 'success' });
            if (this.data.source === 'evaluation-list') {
              setTimeout(() => wx.navigateBack({ delta: 1 }), 700);
            }
          })
          .catch((error) => {
            wx.showModal({ title: '云端保存失败', content: error.message || '请稍后重试', showCancel: false });
          })
          .finally(() => {
            wx.hideLoading();
            this.setData({ publishing: false, publishLabel: '确认并发布评价' });
          });
      }
    });
  }
});
