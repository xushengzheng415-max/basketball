const { callCloud } = require("../../utils/cloud");
const { pushRoster } = require("../../utils/roster-sync");
function call(name, data) {
  return callCloud(name, data).then((r) => {
    if (!r || r.ok !== true) throw new Error((r && r.message) || "操作失败");
    return r;
  });
}
Page({
  data: {
    matchId: "",
    refToken: "",
    refInviteId: "",
    loading: true,
    ctx: null,
    role: "viewer",
    isHome: false,
    isCoach: false,
    isReferee: false,
    isWaiting: true,
    candidates: [],
    candidateIndex: 0,
    currentCandidateName: "",
    refereeName: "",
    externalPath: "",
    externalToken: "",
    externalQr: "",
    homeRoster: null,
    awayRoster: null,
    myPlayers: [],
    playerListKey: "",
    selected: {},
    rosterMode: "",
    rosterLocked: false,
    playerSourceText: "球队库最新名单",
    submittedRosterText: "",
    ready: false,
    readyButtonText: "确认准备就绪",
    canStart: false,
    statusText: "待主队设置",
    homeReadyText: "待准备",
    awayReadyText: "待准备",
    showAssignReferee: false,
    showExternalAccept: false,
    showRefereeTask: false,
    showRefereeReady: false,
    showCoachLive: false,
    showCoachPreparation: false,
    showCoachWorkspace: false,
    showRestart: false,
    showRosterEditor: true,
    showSubmittedRoster: false,
    showSkippedRoster: false,
    showSubmitRoster: true,
    actionLoading: false,
  },
  onLoad(o = {}) {
    let refInviteId = decodeURIComponent(o.refInviteId || "");
    if (o.scene) {
      try {
        const scene = decodeURIComponent(o.scene);
        if (scene.indexOf("r=") === 0) refInviteId = scene.slice(2);
      } catch (e) {}
    }
    this.setData({
      matchId: decodeURIComponent(o.matchId || ""),
      refToken: decodeURIComponent(o.refToken || ""),
      refInviteId,
    });
    if (this.data.matchId) this.load();
    else if (refInviteId)
      call("sxMatchStaff", { action: "resolveInvite", refInviteId })
        .then((r) => this.setData({ matchId: r.matchId }, () => this.load()))
        .catch((e) => wx.showToast({ title: e.message, icon: "none" }));
    else wx.showToast({ title: "裁判邀请无效", icon: "none" });
    this.statusPoll = setInterval(() => {
      if (this.data.matchId && !this.statusLoading) this.load(true);
    }, 800);
  },
  onShow() {
    if (this.data.matchId && !this.statusLoading) this.load();
  },
  onUnload() {
    if (this.statusPoll) clearInterval(this.statusPoll);
  },
  load(silent) {
    if (this.statusLoading && silent) return Promise.resolve(false);
    this.statusLoading = true;
    const requestId = (this.loadRequestId || 0) + 1;
    this.loadRequestId = requestId;
    if (!silent) this.setData({ loading: true });
    return call("sxMatchFlow", {
      domain: "readiness",
      action: "status",
      matchId: this.data.matchId,
    })
      .then((r) => {
        if (requestId !== this.loadRequestId) return false;
        const role = r.role,
          ctx = r;
        const scope =
          role === "home_coach" ? "home" : role === "away_coach" ? "away" : "";
        const roster = scope === "home" ? r.homeRoster : r.awayRoster;
        const team = scope === "home" ? r.home : r.away;
        const source =
          scope === "home" ? r.homePlayerSource : r.awayPlayerSource;
        const prep = r.preparation || {},
          selected = this.data.selected || {};
        const rosterMode = (roster && roster.mode) || "",
          rosterLocked = !!rosterMode,
          showSubmittedRoster = rosterMode === "submitted",
          showSkippedRoster = rosterMode === "skipped",
          showRosterEditor = !!scope && !rosterLocked,
          bothRosters =
            !!r.homeRoster &&
            !!r.awayRoster &&
            ["submitted", "skipped"].includes(r.homeRoster.mode) &&
            ["submitted", "skipped"].includes(r.awayRoster.mode);
        const rawPlayers = (team && team.players) || [];
        const playerListKey = rawPlayers
          .map((p) => `${p.playerId || p.id}:${p.number || ""}:${p.name || ""}`)
          .join("|");
        const keepInteractiveList =
          !!silent &&
          showRosterEditor &&
          playerListKey === this.data.playerListKey;
        const isWaiting =
            r.match.status === "waiting" &&
            !["live", "completed"].includes(prep.state),
          canRestart =
            (["live", "completed"].includes(prep.state) ||
              ["live", "completed"].includes(r.match.status)) &&
            ["home_coach", "referee", "organizer"].includes(role),
          effectiveState = ["live", "completed"].includes(r.match.status)
            ? r.match.status
            : prep.state;
        const next = {
          loading: false,
          ctx,
          role,
          isHome: role === "home_coach",
          isCoach: !!scope,
          isReferee: role === "referee",
          isWaiting,
          homeRoster: r.homeRoster,
          awayRoster: r.awayRoster,
          rosterMode,
          rosterLocked,
          playerSourceText:
            source === "registration_snapshot"
              ? "报名快照（球队库未同步）"
              : "球队库最新名单",
          submittedRosterText: this.rosterSummary(roster),
          ready: !!prep[scope + "Ready"],
          readyButtonText: prep[scope + "Ready"]
            ? "已准备就绪"
            : "确认准备就绪",
          canStart: !!r.ready,
          statusText: this.status({ state: effectiveState }),
          homeReadyText: prep.homeReady ? "已就绪" : "待准备",
          awayReadyText: prep.awayReady ? "已就绪" : "待准备",
          showAssignReferee:
            isWaiting &&
            scope === "home" &&
            role === "home_coach" &&
            prep.refereeStatus !== "accepted",
          showExternalAccept:
            isWaiting &&
            !!(this.data.refToken || this.data.refInviteId) &&
            role !== "referee" &&
            !scope,
          showRefereeTask:
            isWaiting &&
            role === "referee" &&
            prep.refereeStatus !== "accepted",
          showRefereeReady:
            isWaiting &&
            role === "referee" &&
            prep.refereeStatus === "accepted",
          showCoachLive: effectiveState === "live" && !!scope,
          showCoachPreparation: isWaiting && !!scope,
          showCoachWorkspace: !!scope && bothRosters,
          showRestart: canRestart,
          showRosterEditor,
          showSubmittedRoster,
          showSkippedRoster,
          showSubmitRoster: showRosterEditor,
        };
        if (!keepInteractiveList) {
          next.playerListKey = playerListKey;
          next.myPlayers = rawPlayers.map((p) => {
            const pickerId = String(p.playerId || p.id),
              isSelected = !!selected[pickerId];
            return {
              ...p,
              pickerId,
              selectedClass: isSelected ? "selected" : "",
              selectionText: isSelected ? "✓" : "",
            };
          });
        }
        if (scope !== "home")
          Object.assign(next, {
            externalPath: "",
            externalToken: "",
            externalQr: "",
            candidates: [],
            currentCandidateName: "",
          });
        this.setData(next);
        if (isWaiting && scope === "home" && role === "home_coach")
          this.loadCandidates();
        return true;
      })
      .catch((e) => {
        if (requestId === this.loadRequestId) this.setData({ loading: false });
        if (!silent) wx.showToast({ title: e.message, icon: "none" });
        return false;
      })
      .finally(() => {
        if (requestId === this.loadRequestId) this.statusLoading = false;
      });
  },
  rosterSummary(roster) {
    if (!roster || roster.mode !== "submitted") return "";
    const players = roster.players || [];
    const starters = players
      .filter((p) => p.starter)
      .map((p) => `#${p.number || "-"} ${p.name || "球员"}`);
    const benchCount = players.length - starters.length;
    return `首发：${starters.join("、")}${
      benchCount > 0 ? ` · 替补${benchCount}人` : ""
    }`;
  },
  status(p = {}) {
    const m = {
      waiting_home_setup: "等待主队指派裁判",
      referee_pending: "等待裁判接受",
      coaches_pending: "等待双方教练准备",
      ready: "双方已就绪",
      live: "比赛进行中",
      completed: "比赛已结束",
    };
    return m[p.state] || "比赛准备中";
  },
  loadCandidates() {
    call("sxMatchStaff", { action: "candidates", matchId: this.data.matchId })
      .then((r) => {
        const candidates = r.candidates || [];
        this.setData({
          candidates,
          currentCandidateName: (candidates[0] && candidates[0].name) || "",
        });
      })
      .catch(() => {});
  },
  onCandidate(e) {
    const candidateIndex = Number(e.detail.value);
    this.setData({
      candidateIndex,
      currentCandidateName:
        (this.data.candidates[candidateIndex] &&
          this.data.candidates[candidateIndex].name) ||
        "",
    });
  },
  onRefereeName(e) {
    this.setData({ refereeName: e.detail.value });
  },
  assignInternal() {
    const c = this.data.candidates[this.data.candidateIndex];
    if (!c) return wx.showToast({ title: "暂无可选内部裁判", icon: "none" });
    this.run(
      call("sxMatchStaff", {
        action: "assignInternal",
        matchId: this.data.matchId,
        refereeOpenid: c.openid,
        refereeName: c.name,
      }),
      "裁判任务已发送"
    );
  },
  inviteExternal() {
    this.setData({ actionLoading: true });
    call("sxMatchStaff", {
      action: "createExternalInvite",
      matchId: this.data.matchId,
    })
      .then((r) => {
        this.setData({ externalPath: r.path, externalToken: r.token });
        wx.setClipboardData({ data: r.path });
        return call("sxCreateTournamentQrCode", {
          mode: "referee",
          matchId: this.data.matchId,
          refInviteId: r.inviteId,
          page: "pages/match-preparation/index",
          envVersion: "trial",
        });
      })
      .then((q) => this.setData({ externalQr: q.fileID || q.url || "" }))
      .catch((e) => wx.showToast({ title: e.message, icon: "none" }))
      .finally(() => this.setData({ actionLoading: false }));
  },
  acceptReferee() {
    this.run(
      call("sxMatchStaff", {
        action: "accept",
        matchId: this.data.matchId,
        refToken: this.data.refToken,
        refInviteId: this.data.refInviteId,
        refereeName: this.data.refereeName,
      }),
      "已接受裁判任务"
    );
  },
  rejectReferee() {
    this.run(
      call("sxMatchStaff", { action: "reject", matchId: this.data.matchId }),
      "已拒绝任务"
    );
  },
  chooseRoster() {
    this.setData({ rosterMode: "submitted" });
  },
  skipRoster() {
    this.run(
      call("sxMatchRoster", { action: "skip", matchId: this.data.matchId }),
      "已选择不记录球员"
    );
  },
  togglePlayer(e) {
    if (this.data.rosterLocked) return;
    const id = String(e.currentTarget.dataset.id),
      selected = { ...this.data.selected };
    if (
      !selected[id] &&
      Object.keys(selected).filter((key) => selected[key]).length >= 5
    ) {
      wx.showToast({ title: "首发固定5人", icon: "none" });
      return;
    }
    selected[id] = !selected[id];
    this.setData({
      selected,
      myPlayers: this.data.myPlayers.map((p) => {
        const isSelected = !!selected[p.pickerId];
        return {
          ...p,
          selectedClass: isSelected ? "selected" : "",
          selectionText: isSelected ? "✓" : "",
        };
      }),
    });
  },
  submitRoster() {
    const starterIds = new Set(
      this.data.myPlayers
        .filter((p) => this.data.selected[String(p.playerId || p.id)])
        .map((p) => String(p.playerId || p.id))
    );
    if (starterIds.size !== 5)
      return wx.showToast({ title: "请选择5名首发", icon: "none" });
    const players = this.data.myPlayers.map((p) => ({
      playerId: p.playerId || p.id,
      name: p.name,
      number: p.number,
      starter: starterIds.has(String(p.playerId || p.id)),
    }));
    this.run(
      call("sxMatchRoster", {
        action: "submit",
        matchId: this.data.matchId,
        players,
      }),
      "首发与替补已提交"
    );
  },
  refreshRosterPlayers() {
    if (this.data.rosterLocked)
      return wx.showToast({ title: "名单已提交并锁定", icon: "none" });
    this.setData({ actionLoading: true });
    pushRoster()
      .then(() => this.load())
      .then((ok) => {
        if (ok) wx.showToast({ title: "球员名单已刷新", icon: "success" });
      })
      .catch((e) =>
        wx.showToast({ title: e.message || "刷新失败", icon: "none" })
      )
      .finally(() => this.setData({ actionLoading: false }));
  },
  setReady() {
    if (this.data.ready) return;
    this.run(
      call("sxMatchReadiness", {
        action: "setReady",
        matchId: this.data.matchId,
        ready: true,
      }),
      "已准备就绪"
    );
  },
  start() {
    this.setData({ actionLoading: true });
    call("sxMatchReadiness", { action: "start", matchId: this.data.matchId })
      .then((r) => {
        const c = this.data.ctx;
        wx.setStorageSync("quickMatchActiveConfig", {
          mode: "quick",
          source: "tournament-live",
          tournamentId: c.match.eventId,
          gameId: c.match.matchId,
          matchName: `${c.home.name} VS ${c.away.name}`,
          homeTeam: {
            id: c.home.teamId,
            name: c.home.name,
            logoUrl: c.home.logo,
          },
          awayTeam: {
            id: c.away.teamId,
            name: c.away.name,
            logoUrl: c.away.logo,
          },
          periodMinutes: c.tournament.periodMinutes,
          periods: c.tournament.periodCount,
          createdAt: Date.now(),
        });
        wx.redirectTo({ url: r.scoreboardPath });
      })
      .catch((e) => wx.showToast({ title: e.message, icon: "none" }))
      .finally(() => this.setData({ actionLoading: false }));
  },
  goCoachWorkspace() {
    wx.navigateTo({
      url: `/pages/match-coach-workspace/index?matchId=${encodeURIComponent(
        this.data.matchId
      )}`,
    });
  },
  goLive() {
    wx.navigateTo({
      url: `/pages/match-coach-live/index?matchId=${encodeURIComponent(
        this.data.matchId
      )}`,
    });
  },
  restart() {
    wx.showModal({
      title: "重新开始本场比赛",
      content:
        "本场比分、赛果、名单、换人、暂停和本场战术记录将清空，并重新从指派裁判开始。该操作不可撤销。",
      confirmText: "确认重开",
      confirmColor: "#d94b3d",
      success: (r) => {
        if (!r.confirm) return;
        this.setData({ actionLoading: true });
        call("sxMatchReadiness", {
          action: "restart",
          matchId: this.data.matchId,
        })
          .then(() => {
            const active = wx.getStorageSync("quickMatchActiveConfig") || {};
            if (String(active.gameId || "") === String(this.data.matchId))
              wx.removeStorageSync("quickMatchActiveConfig");
            this.setData({
              selected: {},
              rosterMode: "",
              ready: false,
              externalPath: "",
              externalToken: "",
              externalQr: "",
            });
            wx.showToast({ title: "已恢复到赛前准备", icon: "success" });
            this.load();
          })
          .catch((e) => wx.showToast({ title: e.message, icon: "none" }))
          .finally(() => this.setData({ actionLoading: false }));
      },
    });
  },
  run(p, msg) {
    this.setData({ actionLoading: true });
    p.then(() => {
      wx.showToast({ title: msg, icon: "success" });
      this.load();
    })
      .catch((e) => wx.showToast({ title: e.message, icon: "none" }))
      .finally(() => this.setData({ actionLoading: false }));
  },
  goBack() {
    wx.navigateBack();
  },
  noop() {},
  onShareAppMessage() {
    return {
      title: "邀请你担任本场裁判",
      path:
        this.data.externalPath ||
        `/pages/match-preparation/index?matchId=${this.data.matchId}`,
    };
  },
});
