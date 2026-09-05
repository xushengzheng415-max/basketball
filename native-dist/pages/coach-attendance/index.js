const { callCloud } = require("../../utils/cloud");
const statusName = {
  present: "出勤",
  leave: "请假",
  absent: "缺勤",
  makeup: "补课",
  makeup_no_charge: "补课不扣",
  trial: "试听",
};
function decorateStudent(item, status) {
  return {
    ...item,
    initial: String(item.name || "学").slice(0, 1),
    status,
    statusName: statusName[status],
    presentClass: status === "present" ? "active" : "",
    leaveClass: status === "leave" ? "active" : "",
    absentClass: status === "absent" ? "active danger" : "",
    makeupClass: status === "makeup" ? "active" : "",
    makeupNoChargeClass: status === "makeup_no_charge" ? "active" : "",
    trialClass: status === "trial" ? "active" : "",
  };
}
Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 80,
    loading: true,
    saving: false,
    error: "",
    lessonId: "",
    lesson: null,
    students: [],
    saveDisabled: true,
    statuses: Object.keys(statusName),
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
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 16,
      lessonId: String((options && options.lessonId) || ""),
    });
    this.load();
  },
  load() {
    if (!this.data.lessonId) {
      this.setData({ loading: false, error: "课堂编号缺失" });
      return;
    }
    callCloud("sxEducationCore", {
      domain: "lesson",
      action: "detail",
      lessonId: this.data.lessonId,
    })
      .then((result) => {
        if (!result || !result.ok)
          throw new Error((result && result.message) || "点名数据读取失败");
        const saved = Object.fromEntries(
          (result.attendance || []).map((item) => [item.studentId, item.status])
        );
        this.setData({
          loading: false,
          lesson: result.lesson,
          students: (result.students || []).map((item) =>
            decorateStudent(item, saved[item.studentId] || "present")
          ),
          saveDisabled: !(result.students || []).length,
          submission: result.submission || null,
        });
      })
      .catch((error) =>
        this.setData({
          loading: false,
          error: error.message || "点名数据读取失败",
        })
      );
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  setStatus(event) {
    const id = event.currentTarget.dataset.id,
      status = event.currentTarget.dataset.status;
    this.setData({
      students: this.data.students.map((item) =>
        item.studentId === id ? decorateStudent(item, status) : item
      ),
    });
  },
  saveDraft() {
    if (this.data.saving) return;
    this.setData({ saving: true, saveDisabled: true });
    callCloud("sxEducationCore", {
      domain: "lesson",
      action: "saveDraft",
      lessonId: this.data.lessonId,
      requestId: `attendance_${this.data.lessonId}_${Date.now()}`,
      expectedVersion: Number(
        (this.data.submission && this.data.submission.version) || 0
      ),
      attendance: this.data.students.map((item) => ({
        studentId: item.studentId,
        status: item.status,
      })),
      performance: [],
    })
      .then((result) => {
        if (!result || !result.ok)
          throw new Error((result && result.message) || "点名保存失败");
        wx.showToast({ title: "点名已保存", icon: "success" });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
      })
      .catch((error) =>
        wx.showToast({ title: error.message || "点名保存失败", icon: "none" })
      )
      .finally(() =>
        this.setData({
          saving: false,
          saveDisabled: !this.data.students.length,
        })
      );
  },
});
