const { callCloud } = require("../../utils/cloud");
const LABELS = {
  ft_score: "罚球命中",
  two_score: "两分命中",
  three_score: "三分命中",
  shot_attempt: "投篮尝试",
  rebound: "篮板",
  assist: "助攻",
  steal: "抢断",
  block: "盖帽",
  turnover: "失误",
  foul: "犯规",
  off_rebound: "进攻篮板",
  def_rebound: "防守篮板",
};
const MODES = [
  { key: "self", name: "我自己记", desc: "本队数据由我记录" },
  { key: "assistants", name: "协作记录", desc: "我记录，助教分担" },
  { key: "skipped", name: "不记录", desc: "只看比分和战术板" },
];
function api(action, data = {}) {
  return callCloud("sxCoachTeamOps", { action, ...data }).then((r) => {
    if (!r || !r.ok) throw new Error((r && r.message) || "操作失败");
    return r;
  });
}
Page({
  data: {
    matchId: "",
    assistantInvite: "",
    loading: true,
    accepting: false,
    inviteInfo: null,
    assistantName: "",
    tab: "setup",
    workspaceScrollY: false,
    workspaceScrollTop: 0,
    tabs: [
      { key: "setup", name: "赛前分工" },
      { key: "record", name: "比赛记录" },
      { key: "monitor", name: "协作进度" },
      { key: "summary", name: "赛后汇总" },
    ],
    workspace: null,
    role: "",
    isCoach: false,
    isAssistant: false,
    locked: false,
    matchStatusText: "赛前准备",
    currentMode: "self",
    setupStage: "mode",
    setupInitialized: false,
    stepCards: [],
    showAssistantPanel: false,
    invitePreparing: false,
    assignmentCount: 0,
    selectedOwnerTaskCount: 0,
    joinedAssistantCount: 0,
    pendingAssistantCount: 0,
    totalAssistantCount: 0,
    modeCards: [],
    staffCards: [],
    existingCoachCards: [],
    ownerCards: [],
    selectedOwner: "",
    selectedOwnerName: "",
    assignmentMode: "metric",
    metricCards: [],
    playerCards: [],
    selectedPlayer: "",
    selectedPlayerName: "请选择球员",
    eventRows: [],
    progressRows: [],
    inviteQr: "",
    invitePath: "",
    inviteName: "",
    summaryRows: [],
    summaryTip: "比赛结束后可提交本队汇总",
    canSubmitSummary: false,
    recordDisabled: true,
    assistantView: "overview",
    myMetricCards: [],
    myPlayerCards: [],
    assistantTaskEmpty: true,
    assistantActionText: "等待比赛开始",
    assistantActionDisabled: true,
  },
  onLoad(o = {}) {
    let assistantInvite = decodeURIComponent(o.assistantInvite || "");
    if (o.scene) {
      try {
        const s = decodeURIComponent(o.scene);
        if (s.indexOf("a=") === 0) assistantInvite = s.slice(2);
      } catch (e) {}
    }
    const matchId = decodeURIComponent(o.matchId || "");
    this.setData({ matchId, assistantInvite });
    if (assistantInvite && !matchId) this.resolveInvite();
    else this.load();
  },
  onShow() {
    if (this.data.matchId) this.load(true);
  },
  onUnload() {
    clearInterval(this.poll);
  },
  resolveInvite() {
    api("resolveInvite", { assistantInvite: this.data.assistantInvite })
      .then((r) =>
        this.setData({ loading: false, inviteInfo: r, matchId: r.matchId })
      )
      .catch((e) =>
        wx.showModal({
          title: "邀请不可用",
          content: e.message,
          showCancel: false,
        })
      );
  },
  onAssistantName(e) {
    this.setData({ assistantName: e.detail.value });
  },
  acceptInvite() {
    this.setData({ accepting: true });
    api("acceptInvite", {
      assistantInvite: this.data.assistantInvite,
      name: this.data.assistantName,
    })
      .then((r) => {
        this.setData({ matchId: r.matchId, inviteInfo: null });
        wx.showToast({ title: "已加入教练团队", icon: "success" });
        this.load();
        this.poll = setInterval(() => this.load(true), 1200);
      })
      .catch((e) => wx.showToast({ title: e.message, icon: "none" }))
      .finally(() => this.setData({ accepting: false }));
  },
  load(silent) {
    if (!this.data.matchId) return;
    if (!silent) this.setData({ loading: true });
    api("getWorkspace", { matchId: this.data.matchId })
      .then((w) => {
        const isCoach = w.role === "home_coach" || w.role === "away_coach",
          isAssistant = w.role === "assistant",
          currentMode = (w.setting && w.setting.workMode) || "self",
          staff = (w.staff || []).filter((s) => s.status !== "removed"),
          ownerCards = [
            { openid: w.coachOpenid, name: "主教练", status: "joined" },
          ]
            .concat(
              staff
                .filter((s) => s.status === "joined")
                .map((s) => ({
                  openid: s.assistantOpenid,
                  name: s.name,
                  status: s.status,
                }))
            )
            .filter((x) => x.openid),
          selectedOwner = isAssistant
            ? w.currentUserOpenid
            : this.data.selectedOwner &&
              ownerCards.some((x) => x.openid === this.data.selectedOwner)
            ? this.data.selectedOwner
            : (ownerCards[0] && ownerCards[0].openid) || "",
          selectedOwnerName =
            (ownerCards.find((x) => x.openid === selectedOwner) || {}).name ||
            "",
          assignments = isAssistant
            ? w.assignments || []
            : w.allAssignments || w.assignments || [],
          players = ((w.roster && w.roster.players) || []).map((p) => ({
            ...p,
            label: `${p.number ? "#" + p.number + " " : ""}${p.name}`,
          }));
        const joinedAssistantCount = staff.filter(
            (item) => item.status === "joined"
          ).length,
          initialStage = isAssistant ? "assign" : "mode",
          setupStage = this.data.setupInitialized
            ? this.data.setupStage
            : initialStage;
        this.ownerLookup = Object.fromEntries(
          ownerCards.map((x) => [x.openid, x.name])
        );
        this.setData({
          workspace: w,
          role: w.role,
          isCoach,
          isAssistant,
          locked: w.locked,
          matchStatusText:
            w.match.status === "live"
              ? "比赛进行中"
              : w.match.status === "completed"
              ? "比赛已结束"
              : "赛前准备",
          currentMode,
          setupStage,
          setupInitialized: true,
          stepCards: this.buildStepCards(
            setupStage,
            currentMode,
            joinedAssistantCount
          ),
          assignmentCount: assignments.length,
          selectedOwnerTaskCount: assignments.filter(
            (item) => item.ownerOpenid === selectedOwner
          ).length,
          joinedAssistantCount,
          pendingAssistantCount: staff.filter(
            (item) => item.status === "pending"
          ).length,
          totalAssistantCount: staff.filter((item) =>
            ["joined", "pending"].includes(item.status)
          ).length,
          modeCards: MODES.map((m) => ({
            ...m,
            selectedClass: m.key === currentMode ? "selected" : "",
          })),
          staffCards: staff.map((s) => ({
            ...s,
            shortName: String(s.name || "助").slice(0, 1),
            statusText: s.status === "joined" ? "已加入" : "待接受",
            statusClass: s.status === "joined" ? "joined" : "pending",
          })),
          existingCoachCards: (w.existingCoaches || []).map((coach) => ({
            ...coach,
            buttonText: "邀请加入本场",
          })),
          ownerCards: ownerCards.map((x) => ({
            ...x,
            shortName: String(x.name || "教").slice(0, 1),
            taskText:
              x.openid === selectedOwner
                ? assignments.filter(
                    (item) => item.ownerOpenid === selectedOwner
                  ).length + "项任务"
                : "点击选择",
            stateText: x.openid === selectedOwner ? "当前" : "选择",
            selectedClass: x.openid === selectedOwner ? "selected" : "",
          })),
          selectedOwner,
          selectedOwnerName,
          metricCards: Object.keys(LABELS).map((key) =>
            this.assignmentCard(
              "metric",
              key,
              LABELS[key],
              assignments,
              isAssistant
            )
          ),
          myMetricCards: Object.keys(LABELS)
            .map((key) =>
              this.assignmentCard(
                "metric",
                key,
                LABELS[key],
                assignments,
                isAssistant
              )
            )
            .filter((item) => item.assignmentKey),
          playerCards: players.map((p) =>
            this.assignmentCard(
              "player",
              p.playerId,
              p.label,
              assignments,
              isAssistant
            )
          ),
          myPlayerCards: players
            .map((p) =>
              this.assignmentCard(
                "player",
                p.playerId,
                p.label,
                assignments,
                isAssistant
              )
            )
            .filter((item) => item.assignmentKey),
          assistantTaskEmpty: isAssistant && assignments.length === 0,
          assistantActionText:
            w.match.status === "live" ? "进入比赛记录" : "等待比赛开始",
          assistantActionDisabled: w.match.status !== "live",
          eventRows: this.eventRows(w.events || [], players),
          progressRows: this.progressRows(
            ownerCards,
            assignments,
            w.events || []
          ),
          summaryRows: this.summaryRows(w.summary),
          summaryTip: w.summary
            ? "本队汇总已提交"
            : w.match.status === "completed"
            ? "比赛已结束，请核对后提交本队汇总"
            : "比赛结束后可提交本队汇总",
          canSubmitSummary:
            isCoach && w.match.status === "completed" && !w.summary,
          recordDisabled:
            w.match.status !== "live" || currentMode === "skipped",
        });
        if (!this.poll) this.poll = setInterval(() => this.load(true), 1200);
      })
      .catch((e) => {
        if (!silent) wx.showToast({ title: e.message, icon: "none" });
      })
      .finally(() => this.setData({ loading: false }));
  },
  assignmentCard(mode, key, label, assignments, isAssistant) {
    const a = assignments.find((x) => x.mode === mode && x.objectKey === key);
    return {
      key,
      label,
      mode,
      assignmentKey: (a && a.assignmentKey) || "",
      ownerOpenid: (a && a.ownerOpenid) || "",
      ownerName: a ? this.ownerName(a.ownerOpenid) : "",
      recordAllowed: !isAssistant || !!a,
      stateClass: a ? "assigned" : "available",
      stateText: a ? `已分配 · ${this.ownerName(a.ownerOpenid)}` : "可分配",
    };
  },
  ownerName(openid) {
    return (this.ownerLookup && this.ownerLookup[openid]) || "主教练";
  },
  eventRows(events, players) {
    const map = Object.fromEntries(players.map((p) => [p.playerId, p.label]));
    return events
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30)
      .map((e) => ({
        id: e.eventId,
        text: `${map[e.playerId] || "球员"} · ${LABELS[e.metric] || e.metric} ${
          e.value > 0 ? "+" : ""
        }${e.value}`,
      }));
  },
  progressRows(owners, assignments, events) {
    return owners.map((o) => ({
      openid: o.openid,
      name: o.name,
      taskCount: assignments.filter((a) => a.ownerOpenid === o.openid).length,
      eventCount: events.filter((e) => e.actorOpenid === o.openid).length,
    }));
  },
  summaryRows(s) {
    if (!s) return [];
    return (s.playerTotals || []).map((x) => ({
      id: x.player.playerId,
      name: `${x.player.number ? "#" + x.player.number + " " : ""}${
        x.player.name
      }`,
      score:
        Number(x.metrics.ft_score || 0) +
        2 * Number(x.metrics.two_score || 0) +
        3 * Number(x.metrics.three_score || 0),
      metrics:
        Object.keys(x.metrics || {})
          .map((k) => `${LABELS[k] || k} ${x.metrics[k]}`)
          .join(" · ") || "未统计",
    }));
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.key;
    this.setData({ workspaceScrollTop: 1 }, () => {
      this.setData({
        tab,
        workspaceScrollY: tab !== "setup",
        workspaceScrollTop: 0,
      });
    });
  },
  chooseMode(e) {
    if (!this.data.isCoach || this.data.locked) return;
    const mode = e.currentTarget.dataset.key;
    api("setWorkMode", {
      matchId: this.data.matchId,
      mode,
    })
      .then(() => {
        const setupStage = mode === "assistants" ? "staff" : "mode";
        this.setData({
          setupStage,
          stepCards: this.buildStepCards(
            setupStage,
            mode,
            this.data.joinedAssistantCount
          ),
        });
        return this.load();
      })
      .catch((e) => wx.showToast({ title: e.message, icon: "none" }));
  },
  selectOwner(e) {
    const openid = e.currentTarget.dataset.openid,
      item = this.data.ownerCards.find((x) => x.openid === openid);
    this.setData(
      {
        selectedOwner: openid,
        selectedOwnerName: (item && item.name) || "",
        ownerCards: this.data.ownerCards.map((x) => ({
          ...x,
          selectedClass: x.openid === openid ? "selected" : "",
        })),
      },
      () => this.load(true)
    );
  },
  setAssignMode(e) {
    this.setData({ assignmentMode: e.currentTarget.dataset.mode });
  },
  toggleAssignment(e) {
    if (!this.data.isCoach || this.data.locked) return;
    const { mode, key, assignment } = e.currentTarget.dataset;
    if (assignment) {
      api("unassign", { matchId: this.data.matchId, assignmentKey: assignment })
        .then(() => this.load())
        .catch(this.toastError);
      return;
    }
    if (!this.data.selectedOwner) {
      wx.showToast({ title: "请先选择负责人", icon: "none" });
      return;
    }
    api("assign", {
      matchId: this.data.matchId,
      mode,
      objectKey: key,
      ownerOpenid: this.data.selectedOwner,
    })
      .then(() => this.load())
      .catch(this.toastError);
  },
  onInviteName(e) {
    this.setData({ inviteName: e.detail.value });
  },
  openAssistantPanel() {
    if (!this.data.isCoach || this.data.locked) return;
    const setupStage = "staff";
    this.setData({
      setupStage,
      stepCards: this.buildStepCards(
        setupStage,
        this.data.currentMode,
        this.data.joinedAssistantCount
      ),
    });
  },
  closeAssistantPanel() {
    if (this.data.invitePreparing) return;
    const setupStage = this.data.joinedAssistantCount ? "assign" : "mode";
    this.setData({
      setupStage,
      stepCards: this.buildStepCards(
        setupStage,
        this.data.currentMode,
        this.data.joinedAssistantCount
      ),
    });
  },
  stopBubble() {},
  buildStepCards(stage, mode, joinedCount) {
    const order = { mode: 1, staff: 2, assign: 3 };
    return [
      {
        key: "mode",
        number: "1",
        name: "记录方式",
        stateText: order[stage] > 1 ? "已完成" : "当前步骤",
        selectedClass:
          stage === "mode" ? "active" : order[stage] > 1 ? "done" : "",
      },
      {
        key: "staff",
        number: "2",
        name: "添加助教",
        stateText:
          mode !== "assistants"
            ? "无需设置"
            : joinedCount
            ? joinedCount + "人已加入"
            : stage === "staff"
            ? "当前步骤"
            : "待完成",
        selectedClass:
          mode !== "assistants"
            ? "disabled"
            : stage === "staff"
            ? "active"
            : order[stage] > 2
            ? "done"
            : "",
      },
      {
        key: "assign",
        number: "3",
        name: "分配任务",
        stateText:
          mode !== "assistants"
            ? "无需设置"
            : stage === "assign"
            ? "当前步骤"
            : "完成第2步后开放",
        selectedClass:
          mode !== "assistants" || !joinedCount
            ? "disabled"
            : stage === "assign"
            ? "active"
            : "",
      },
    ];
  },
  goSetupStage(e) {
    const stage = e.currentTarget.dataset.stage;
    if (stage === "mode") {
      this.setData({
        setupStage: stage,
        stepCards: this.buildStepCards(
          stage,
          this.data.currentMode,
          this.data.joinedAssistantCount
        ),
      });
      return;
    }
    if (this.data.currentMode !== "assistants") {
      wx.showToast({ title: "请先选择交给助教", icon: "none" });
      return;
    }
    if (stage === "assign" && !this.data.joinedAssistantCount) {
      wx.showToast({ title: "请先添加并让助教接受", icon: "none" });
      return;
    }
    this.setData({
      setupStage: stage,
      stepCards: this.buildStepCards(
        stage,
        this.data.currentMode,
        this.data.joinedAssistantCount
      ),
    });
  },
  goAssignmentStep() {
    if (!this.data.joinedAssistantCount) {
      wx.showToast({ title: "至少一名助教接受后才能分工", icon: "none" });
      return;
    }
    const setupStage = "assign";
    this.setData({
      setupStage,
      stepCards: this.buildStepCards(
        setupStage,
        this.data.currentMode,
        this.data.joinedAssistantCount
      ),
    });
  },
  finishSimpleMode() {
    wx.showToast({
      title:
        this.data.currentMode === "skipped"
          ? "已设置为本场不记录"
          : "已设置为主教练记录",
      icon: "success",
    });
  },
  openAssistantRecord() {
    if (this.data.assistantActionDisabled) {
      wx.showToast({ title: "比赛开始后开放记录", icon: "none" });
      return;
    }
    this.setData({ assistantView: "record", workspaceScrollY: true });
  },
  backAssistantOverview() {
    this.setData({ assistantView: "overview", workspaceScrollY: false });
  },
  inviteExistingCoach(e) {
    if (!this.data.isCoach || this.data.locked) return;
    const openid = e.currentTarget.dataset.openid;
    const coach = this.data.existingCoachCards.find(
      (item) => item.openid === openid
    );
    if (!coach) return;
    wx.showLoading({ title: "正在邀请" });
    api("createInvite", {
      matchId: this.data.matchId,
      targetOpenid: openid,
      name: coach.name,
      source: "organization",
    })
      .then(() => {
        wx.showToast({ title: "本场任务已发送", icon: "success" });
        this.load(true);
      })
      .catch(this.toastError)
      .finally(() => wx.hideLoading());
  },
  prepareAssistantInvite() {
    if (this.data.invitePreparing || this.data.invitePath) return;
    this.setData({ invitePreparing: true });
    api("createInvite", {
      matchId: this.data.matchId,
      name: this.data.inviteName,
    })
      .then((r) => {
        this.setData({ invitePath: r.path });
        wx.showToast({ title: "邀请已准备", icon: "success" });
        this.load(true);
      })
      .catch(this.toastError)
      .finally(() => this.setData({ invitePreparing: false }));
  },
  copyInvite() {
    if (!this.data.invitePath) return;
    wx.setClipboardData({ data: this.data.invitePath });
  },
  finishAssignment() {
    if (this.data.currentMode === "assistants" && !this.data.assignmentCount) {
      wx.showToast({ title: "请先完成至少一项分工", icon: "none" });
      return;
    }
    api("completeAssignments", { matchId: this.data.matchId })
      .then((result) => {
        wx.showToast({
          title: result.notifiedCount ? "分工完成并已通知" : "分工已完成",
          icon: "success",
        });
        this.setData({ tab: "monitor" });
        this.load(true);
      })
      .catch(this.toastError);
  },
  viewProgress() {
    this.setData({ tab: "monitor" });
  },
  selectPlayer(e) {
    const id = e.currentTarget.dataset.id,
      p = this.data.playerCards.find((x) => x.key === id);
    this.setData({
      selectedPlayer: id,
      selectedPlayerName: (p && p.label) || "请选择球员",
    });
  },
  recordMetric(e) {
    if (this.data.recordDisabled || !this.data.selectedPlayer)
      return wx.showToast({
        title: this.data.selectedPlayer ? "比赛尚未开始" : "请先选择球员",
        icon: "none",
      });
    api("recordEvent", {
      matchId: this.data.matchId,
      playerId: this.data.selectedPlayer,
      metric: e.currentTarget.dataset.metric,
      value: 1,
    })
      .then(() => this.load(true))
      .catch(this.toastError);
  },
  undo() {
    api("undoOwn", { matchId: this.data.matchId })
      .then(() => this.load(true))
      .catch(this.toastError);
  },
  openTactics() {
    wx.navigateTo({
      url: `/pages/match-tactics/index?matchId=${encodeURIComponent(
        this.data.matchId
      )}`,
    });
  },
  submitSummary() {
    api("submitSummary", { matchId: this.data.matchId })
      .then(() => {
        wx.showToast({ title: "本队汇总已提交", icon: "success" });
        this.load();
      })
      .catch(this.toastError);
  },
  toastError(e) {
    wx.showToast({ title: e.message || "操作失败", icon: "none" });
  },
  goBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: "/pages/home/index" }) });
  },
  onShareAppMessage() {
    return {
      title: "邀请你加入本场教练团队",
      path:
        this.data.invitePath ||
        `/pages/match-coach-workspace/index?matchId=${encodeURIComponent(
          this.data.matchId
        )}`,
    };
  },
});
