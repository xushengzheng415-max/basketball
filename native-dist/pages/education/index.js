const ASSET_ROOT =
  "cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/";
const { callCloud } = require("../../utils/cloud");
const MANAGER_ROLES = [
  "owner",
  "campus_manager",
  "manager",
  "education_manager",
];
const todayText = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
function invitationTokenOf(options) {
  if (options && options.invitationToken) return options.invitationToken;
  if (options && options.scene) {
    try {
      const scene = decodeURIComponent(options.scene),
        match = scene.match(/(?:^|&)e=([^&]+)/);
      return match ? match[1] : "";
    } catch (_) {}
  }
  return "";
}
function modeState(mode) {
  return {
    mode,
    showLoading: mode === "loading",
    showInvite: mode === "invite",
    showUnbound: mode === "unbound",
    showCoach: mode === "coach",
    showManager: mode === "manager",
    showTabbar: mode !== "invite",
  };
}
Page({
  data: {
    navSpacer: 110,
    mode: "loading",
    showLoading: true,
    showInvite: false,
    showUnbound: false,
    showCoach: false,
    showManager: false,
    showTabbar: true,
    lessonsEmpty: true,
    errorMessage: "",
    organizationName: "",
    displayName: "",
    role: "",
    invitationToken: "",
    inviteName: "",
    invitePhone: "",
    inviteSubmitting: false,
    lessons: [],
    todayLessons: [],
    nextLesson: null,
    metrics: [],
    managerSummary: {
      courseCount: 0,
      classCount: 0,
      studentCount: 0,
      pendingStudentCount: 0,
      pendingReviewCount: 0,
    },
    assets: {
      background: ASSET_ROOT + "pages/education/education-top-bg-clean.png",
      logo: ASSET_ROOT + "home/brand-horizontal-logo.png",
      courseIcon: ASSET_ROOT + "pages/education/icon-course-schedule.png",
      studentIcon: ASSET_ROOT + "pages/education/icon-student-checkin.png",
      reviewIcon: ASSET_ROOT + "pages/education/icon-after-class-review.png",
      consumeIcon: ASSET_ROOT + "pages/education/icon-lesson-consume-stats.png",
    },
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
      } else navTop = wx.getSystemInfoSync().statusBarHeight || 20;
    } catch (_) {}
    const token = invitationTokenOf(options);
    this.setData({
      navSpacer: navTop + navHeight + 18,
      invitationToken: token,
      ...modeState(token ? "invite" : "loading"),
    });
    if (!token) this.loadIdentity();
  },
  onShow() {
    if (this.data.mode === "unbound") this.loadIdentity();
  },
  loadIdentity() {
    this.setData({ ...modeState("loading"), errorMessage: "" });
    callCloud("sxEducationCore", { domain: "access", action: "get" })
      .then((result) => {
        if (!result || !result.ok) {
          this.setData({
            ...modeState("unbound"),
            errorMessage:
              (result && result.message) || "当前微信尚未加入任何机构",
          });
          return;
        }
        const common = {
          organizationName: result.organizationName || "已加入机构",
          displayName: result.displayName || "微信用户",
          role: result.role || "",
        };
        if (MANAGER_ROLES.includes(result.role)) {
          this.setData({ ...common, ...modeState("manager") });
          this.loadManagerSummary();
          return;
        }
        this.setData({ ...common, ...modeState("coach") });
        this.loadCoachLessons();
      })
      .catch((error) =>
        this.setData({
          ...modeState("unbound"),
          errorMessage: error.message || "读取机构身份失败",
        })
      );
  },
  loadCoachLessons() {
    callCloud("sxEducationCore", { domain: "lesson", action: "mine" })
      .then((result) => {
        if (!result || !result.ok)
          throw new Error((result && result.message) || "课堂读取失败");
        const lessons = (result.lessons || []).sort((a, b) =>
            `${a.lessonDate} ${a.startTime}`.localeCompare(
              `${b.lessonDate} ${b.startTime}`
            )
          ),
          today = todayText(),
          todayLessons = lessons.filter((item) => item.lessonDate === today),
          nextLesson =
            lessons.find(
              (item) =>
                `${item.lessonDate} ${item.startTime}` >= `${today} 00:00`
            ) || null,
          studentCount = todayLessons.reduce(
            (sum, item) => sum + Number(item.studentCount || 0),
            0
          ),
          classes = new Set(lessons.map((item) => item.classId).filter(Boolean))
            .size;
        this.setData({
          lessons,
          todayLessons,
          nextLesson,
          lessonsEmpty: lessons.length === 0,
          metrics: [
            {
              label: "今日课堂",
              value: todayLessons.length,
              unit: "节",
              icon: this.data.assets.courseIcon,
            },
            {
              label: "今日学员",
              value: studentCount,
              unit: "人",
              icon: this.data.assets.studentIcon,
            },
            {
              label: "待完成课堂",
              value: lessons.filter((item) =>
                ["scheduled", "live", "draft", "returned"].includes(item.status)
              ).length,
              unit: "节",
              icon: this.data.assets.reviewIcon,
            },
            {
              label: "负责班级",
              value: classes,
              unit: "个",
              icon: this.data.assets.consumeIcon,
            },
          ],
        });
      })
      .catch((error) =>
        this.setData({
          errorMessage: error.message || "课堂读取失败",
          lessons: [],
          todayLessons: [],
          nextLesson: null,
          lessonsEmpty: true,
          metrics: [],
        })
      );
  },
  loadManagerSummary() {
    callCloud("sxEducationCore", { domain: "mobile", action: "summary" })
      .then((result) => {
        if (!result || !result.ok)
          throw new Error((result && result.message) || "管理数据读取失败");
        this.setData({ managerSummary: result.summary });
      })
      .catch((error) =>
        this.setData({
          errorMessage: error.message || "管理数据读取失败",
          managerSummary: {
            courseCount: 0,
            classCount: 0,
            studentCount: 0,
            pendingStudentCount: 0,
            pendingReviewCount: 0,
          },
        })
      );
  },
  onInviteName(event) {
    this.setData({ inviteName: event.detail.value });
  },
  onInvitePhone(event) {
    this.setData({ invitePhone: event.detail.value });
  },
  acceptCoachInvite() {
    if (this.data.inviteSubmitting) return;
    const name = String(this.data.inviteName || "").trim(),
      phone = String(this.data.invitePhone || "").trim();
    if (!name || !phone) {
      wx.showToast({ title: "请填写姓名和手机号", icon: "none" });
      return;
    }
    this.setData({ inviteSubmitting: true });
    callCloud("sxEducationCore", {
      domain: "coach",
      action: "inviteAccept",
      invitationToken: this.data.invitationToken,
      profile: {
        name,
        phone,
        specialties: [],
      },
    })
      .then((result) => {
        if (!result || !result.ok)
          throw new Error((result && result.message) || "绑定机构失败");
        wx.showToast({ title: "机构绑定成功", icon: "success" });
        setTimeout(() => {
          this.setData({ invitationToken: "", ...modeState("loading") });
          this.loadIdentity();
        }, 700);
      })
      .catch((error) =>
        wx.showToast({ title: error.message || "绑定机构失败", icon: "none" })
      )
      .finally(() => this.setData({ inviteSubmitting: false }));
  },
  refreshIdentity() {
    this.loadIdentity();
  },
  openLesson(event) {
    const lessonId = event.currentTarget.dataset.id;
    if (lessonId)
      wx.navigateTo({
        url:
          "/pages/coach-course-detail/index?lessonId=" +
          encodeURIComponent(lessonId),
      });
  },
  openAttendance(event) {
    const lessonId = event.currentTarget.dataset.id;
    if (lessonId)
      wx.navigateTo({
        url:
          "/pages/coach-attendance/index?lessonId=" +
          encodeURIComponent(lessonId),
      });
  },
  openClasses() {
    wx.navigateTo({ url: "/pages/coach-classes/index" });
  },
  openPcNotice() {
    wx.showModal({
      title: "请前往PC教务中心",
      content:
        "当前小程序仅展示机构真实教务概览。课程、课包、学员确认和复杂排课请在PC端操作。",
      showCancel: false,
    });
  },
});
