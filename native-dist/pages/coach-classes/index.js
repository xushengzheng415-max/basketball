const { callCloud } = require("../../utils/cloud");
Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 80,
    loading: true,
    error: "",
    classes: [],
  },
  onLoad() {
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
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
    this.load();
  },
  load() {
    callCloud("sxEducationCore", { domain: "lesson", action: "mine" })
      .then((result) => {
        if (!result || !result.ok)
          throw new Error((result && result.message) || "班级读取失败");
        const map = {};
        (result.lessons || []).forEach((item) => {
          if (!map[item.classId])
            map[item.classId] = {
              classId: item.classId,
              name: item.className,
              courseName: item.courseName,
              studentCount: item.studentCount,
              lessons: 0,
              nextDate: "",
            };
          map[item.classId].lessons += 1;
          if (
            !map[item.classId].nextDate ||
            item.lessonDate < map[item.classId].nextDate
          )
            map[item.classId].nextDate = item.lessonDate;
        });
        this.setData({ loading: false, classes: Object.values(map) });
      })
      .catch((error) =>
        this.setData({ loading: false, error: error.message || "班级读取失败" })
      );
  },
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.switchTab({ url: "/pages/education/index" }),
    });
  },
});
