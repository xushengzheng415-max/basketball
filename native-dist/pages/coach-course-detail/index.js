const { callCloud } = require("../../utils/cloud");
Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 80,
    loading: true,
    error: "",
    lessonId: "",
    lesson: null,
    classInfo: null,
    students: [],
    studentsEmpty: true,
    lessonTitle: "",
    venueText: "未设置",
    reviewStatus: "未提交",
    submissionStatus: "未提交",
    versionNumber: 0,
    submission: null,
  },
  onLoad(options) {
    let navTop = 20,
      navHeight = 44;
    try {
      const menu =
        wx.getMenuButtonBoundingClientRect &&
        wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) {
        navTop = menu.top;
        navHeight = menu.height || 32;
      }
    } catch (_) {}
    const lessonId = options && String(options.lessonId || options.id || "");
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 16,
      lessonId,
    });
    this.load();
  },
  load() {
    if (!this.data.lessonId) {
      this.setData({ loading: false, error: "课堂编号缺失" });
      return;
    }
    this.setData({ loading: true, error: "" });
    callCloud("sxEducationCore", {
      domain: "lesson",
      action: "detail",
      lessonId: this.data.lessonId,
    })
      .then((result) => {
        if (!result || !result.ok)
          throw new Error((result && result.message) || "课堂读取失败");
        this.setData({
          loading: false,
          lesson: result.lesson,
          classInfo: result.classInfo,
          lessonTitle:
            result.lesson.className ||
            (result.classInfo && result.classInfo.name) ||
            "课堂",
          venueText: result.lesson.venue || "未设置",
          reviewStatus:
            (result.submission && result.submission.reviewStatus) ||
            result.lesson.status ||
            "未提交",
          submissionStatus:
            (result.submission && result.submission.status) || "未提交",
          versionNumber: Number(result.lesson.version || 0),
          students: (result.students || []).map((item) => ({
            ...item,
            initial: String(item.name || "学").slice(0, 1),
            genderText: item.gender || "",
          })),
          studentsEmpty: !(result.students || []).length,
          submission: result.submission || null,
        });
      })
      .catch((error) =>
        this.setData({ loading: false, error: error.message || "课堂读取失败" })
      );
  },
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.switchTab({ url: "/pages/education/index" }),
    });
  },
  openAttendance() {
    wx.navigateTo({
      url:
        "/pages/coach-attendance/index?lessonId=" +
        encodeURIComponent(this.data.lessonId),
    });
  },
  openEvaluation() {
    wx.showModal({
      title: "请先完成课堂点名",
      content:
        "当前页面已清除演示评价数据。完成点名并保存课堂草稿后，再进入真实五维评价流程。",
      showCancel: false,
    });
  },
});
