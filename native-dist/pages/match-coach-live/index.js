const { callCloud } = require("../../utils/cloud");
const call = (domain, action, data) =>
  callCloud("sxMatchFlow", { ...data, domain, action }).then((r) => {
    if (!r || !r.ok) throw new Error((r && r.message) || "操作失败");
    return r;
  });
const clock = (v) => {
  const s = Math.max(0, Number(v || 0));
  return (
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
};
Page({
  data: {
    matchId: "",
    state: null,
    ctx: null,
    role: "",
    scope: "",
    clockText: "00:00",
    online: true,
    roster: null,
    lineup: null,
    onCourtItems: [],
    benchItems: [],
    players: [],
    outIds: [],
    inIds: [],
    showSub: false,
    timeoutText: "申请暂停",
    requests: [],
    ownRequests: [],
  },
  onLoad(o = {}) {
    this.setData({ matchId: decodeURIComponent(o.matchId || "") });
    this.load();
    this.poll = setInterval(() => {
      if (!this.loading) this.load(true);
    }, 500);
  },
  onUnload() {
    clearInterval(this.poll);
  },
  load(silent) {
    this.loading = true;
    Promise.all([
      call("live", "get", { matchId: this.data.matchId }),
      call("readiness", "status", { matchId: this.data.matchId }),
      call("teamOps", "listTimeouts", { matchId: this.data.matchId }),
    ])
      .then(([l, c, t]) => {
        if (l.state && l.state.status === "completed") {
          this.finishCoachView(c);
          return;
        }
        const scope = c.role === "home_coach" ? "home" : "away",
          r = scope === "home" ? c.homeRoster : c.awayRoster,
          team = scope === "home" ? c.home : c.away,
          requests = t.requests || [],
          own = requests.filter((x) => x.teamScope === scope),
          pending = own.find((x) => x.status === "pending"),
          approved = own.find((x) => x.status === "approved_waiting_execution");
        this.setData({
          state: l.state,
          ctx: c,
          role: c.role,
          scope,
          clockText: clock(l.state && l.state.clockSeconds),
          online: true,
          roster: r,
          players: team.players || [],
          showSub: r && r.mode === "submitted",
          requests,
          ownRequests: own,
          timeoutText: pending
            ? "等待裁判确认"
            : approved
            ? "裁判已同意，等待执行"
            : "申请暂停",
        });
        if (this.data.showSub) this.loadLineup();
      })
      .catch((e) => {
        this.setData({ online: false });
        if (!silent) wx.showToast({ title: e.message, icon: "none" });
      })
      .finally(() => {
        this.loading = false;
      });
  },
  finishCoachView(ctx) {
    if (this.endHandled) return;
    this.endHandled = true;
    clearInterval(this.poll);
    wx.showModal({
      title: "比赛已结束",
      content: "官方赛果已经形成，教练操作端将退出。",
      showCancel: false,
      success: () =>
        wx.reLaunch({
          url: `/pages/tournament-detail/index?id=${encodeURIComponent(
            ctx.match.eventId
          )}&tab=matches`,
        }),
    });
  },
  loadLineup() {
    call("tactics", "get", { matchId: this.data.matchId }).then((r) => {
      const l = r.lineup || { onCourt: [], bench: [] };
      const playerMap = Object.fromEntries(
        (this.data.players || []).map((player) => [
          String(player.playerId || player.id),
          `${player.number ? `#${player.number} ` : ""}${player.name || "球员"}`,
        ])
      );
      this.setData({
        lineup: l,
        onCourtItems: l.onCourt.map((id) => ({
          id,
          label: playerMap[String(id)] || "本队球员",
          selectedClass: this.data.outIds.includes(id) ? "selected" : "",
        })),
        benchItems: l.bench.map((id) => ({
          id,
          label: playerMap[String(id)] || "本队球员",
          selectedClass: this.data.inIds.includes(id) ? "selected" : "",
        })),
      });
    });
  },
  toggleOut(e) {
    this.toggle("outIds", String(e.currentTarget.dataset.id));
  },
  toggleIn(e) {
    this.toggle("inIds", String(e.currentTarget.dataset.id));
  },
  toggle(key, id) {
    let a = this.data[key].slice();
    a = a.includes(id) ? a.filter((x) => x !== id) : a.concat(id).slice(0, 5);
    this.setData({ [key]: a }, () => this.loadLineup());
  },
  submitSub() {
    call("teamOps", "substitution", {
      matchId: this.data.matchId,
      batchId: "sub-" + Date.now(),
      outPlayerIds: this.data.outIds,
      inPlayerIds: this.data.inIds,
    })
      .then(() => {
        wx.showToast({ title: "换人已记录", icon: "success" });
        this.setData({ outIds: [], inIds: [] });
        this.loadLineup();
      })
      .catch((e) => wx.showToast({ title: e.message, icon: "none" }));
  },
  requestTimeout() {
    call("teamOps", "requestTimeout", { matchId: this.data.matchId })
      .then(() => {
        wx.showToast({ title: "已提醒裁判", icon: "success" });
        this.load();
      })
      .catch((e) => wx.showToast({ title: e.message, icon: "none" }));
  },
  openTactics() {
    wx.navigateTo({
      url: `/pages/match-tactics/index?matchId=${encodeURIComponent(
        this.data.matchId
      )}`,
    });
  },
  openWorkspace() {
    wx.navigateTo({
      url: `/pages/match-coach-workspace/index?matchId=${encodeURIComponent(
        this.data.matchId
      )}`,
    });
  },
  goBack() {
    wx.navigateBack();
  },
});
