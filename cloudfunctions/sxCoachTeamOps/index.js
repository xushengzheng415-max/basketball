const cloud = require("wx-server-sdk");
const crypto = require("crypto");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const C = {
  matches: "sx_tournament_matches",
  tournaments: "sx_tournaments",
  teams: "sx_tournament_teams",
  preps: "sx_match_preparations",
  rosters: "sx_match_rosters",
  live: "sx_match_live_states",
  staff: "sx_match_coach_staff",
  invites: "sx_match_coach_invites",
  settings: "sx_match_coach_settings",
  assignments: "sx_match_coach_assignments",
  events: "sx_match_coach_events",
  summaries: "sx_match_coach_summaries",
  tasks: "sx_tournament_tasks",
  identities: "sx_wechat_identities",
  users: "sx_platform_users",
  memberships: "sx_organization_memberships",
};
const METRICS = [
  "ft_score",
  "two_score",
  "three_score",
  "shot_attempt",
  "rebound",
  "assist",
  "steal",
  "block",
  "turnover",
  "foul",
  "off_rebound",
  "def_rebound",
];
const now = () => Date.now(),
  clean = (v, n = 120) =>
    String(v || "")
      .trim()
      .slice(0, n),
  list = (v, n = 100) => (Array.isArray(v) ? v.slice(0, n) : []),
  uid = (p) => `${p}_${crypto.randomBytes(10).toString("hex")}`;
async function ensure(n) {
  try {
    await db.collection(n).limit(1).get();
  } catch (e) {
    try {
      await db.createCollection(n);
    } catch (_) {}
  }
}
async function first(n, q) {
  const r = await db.collection(n).where(q).limit(1).get();
  return (r.data && r.data[0]) || null;
}
async function all(n, q, l = 200) {
  const r = await db.collection(n).where(q).limit(l).get();
  return r.data || [];
}
async function add(n, data) {
  await ensure(n);
  return db.collection(n).add({ data });
}
async function update(n, x, data) {
  return db
    .collection(n)
    .doc(x._id || x)
    .update({ data: { ...data, updatedAt: now() } });
}
async function upsert(n, q, data) {
  await ensure(n);
  const x = await first(n, q);
  if (x) {
    await update(n, x, data);
    return { ...x, ...data };
  }
  await add(n, { ...q, ...data, createdAt: now(), updatedAt: now() });
  return first(n, q);
}
function openid(e) {
  const c = cloud.getWXContext(),
    v = clean(e._callerOpenid || c.FROM_OPENID || c.OPENID, 100);
  if (!v) throw new Error("请先登录");
  return v;
}
function safePlayer(p) {
  return {
    playerId: clean(p.playerId || p.id, 100),
    name: clean(p.name, 50) || "未命名球员",
    number: clean(p.number, 10),
    avatar: clean(p.avatar || p.avatarFileID, 500),
  };
}
async function base(matchId, u) {
  const match = await first(C.matches, { matchId: clean(matchId, 100) });
  if (!match) throw new Error("比赛不存在");
  const tournament = await first(C.tournaments, { eventId: match.eventId }),
    home = await first(C.teams, {
      eventId: match.eventId,
      teamId: match.homeTeamId,
    }),
    away = await first(C.teams, {
      eventId: match.eventId,
      teamId: match.awayTeamId,
    }),
    prep = await first(C.preps, { matchId: match.matchId }),
    homeRoster = await first(C.rosters, { rosterKey: `${match.matchId}:home` }),
    awayRoster = await first(C.rosters, { rosterKey: `${match.matchId}:away` });
  if (!home || !away) throw new Error("比赛球队快照不完整");
  let role =
      u === home.ownerOpenid
        ? "home_coach"
        : u === away.ownerOpenid
        ? "away_coach"
        : "viewer",
    scope =
      role === "home_coach" ? "home" : role === "away_coach" ? "away" : "";
  let assistant = null;
  if (!scope) {
    assistant = await first(C.staff, {
      matchId: match.matchId,
      assistantOpenid: u,
      status: "joined",
    });
    if (assistant) {
      role = "assistant";
      scope = assistant.teamScope;
    }
  }
  const bothRosters =
    !!homeRoster &&
    !!awayRoster &&
    ["submitted", "skipped"].includes(homeRoster.mode) &&
    ["submitted", "skipped"].includes(awayRoster.mode);
  return {
    match,
    tournament,
    home,
    away,
    prep: prep || {},
    homeRoster,
    awayRoster,
    role,
    scope,
    assistant,
    bothRosters,
  };
}
function rosterFor(x) {
  return x.scope === "home" ? x.homeRoster : x.awayRoster;
}
function teamFor(x) {
  return x.scope === "home" ? x.home : x.away;
}
function assertTeam(x) {
  if (!x.scope) throw new Error("无权访问球队教练工作台");
  if (!x.bothRosters) throw new Error("双方需先完成本场名单选择");
}
function assertCoach(x) {
  if (!["home_coach", "away_coach"].includes(x.role))
    throw new Error("仅本队主教练可操作");
}
function assertPregame(x) {
  if (
    ["live", "completed"].includes(x.match.status) ||
    ["live", "completed"].includes(x.prep.state)
  )
    throw new Error("比赛开始后分工已锁定");
}
async function existingCoachCandidates(x) {
  const team = teamFor(x);
  const ownerIdentity = await first(C.identities, {
    identityKey: `mini_program:${team.ownerOpenid}`,
  });
  if (!ownerIdentity) return [];
  const ownerMembership = await first(C.memberships, {
    platformUserId: ownerIdentity.platformUserId,
    status: "active",
  });
  if (!ownerMembership) return [];
  const memberships = await all(
    C.memberships,
    { organizationId: ownerMembership.organizationId, status: "active" },
    100
  );
  const joined = await all(
    C.staff,
    { matchId: x.match.matchId, teamScope: x.scope },
    20
  );
  const excluded = new Set([
    x.home.ownerOpenid,
    x.away.ownerOpenid,
    ...joined.map((staff) => staff.assistantOpenid).filter(Boolean),
    ...joined.map((staff) => staff.targetOpenid).filter(Boolean),
  ]);
  const result = [];
  for (const membership of memberships) {
    const identity = await first(C.identities, {
      platformUserId: membership.platformUserId,
      surface: "mini_program",
      status: "active",
    });
    if (!identity || !identity.openid || excluded.has(identity.openid)) continue;
    const user = await first(C.users, {
      platformUserId: membership.platformUserId,
    });
    result.push({
      openid: identity.openid,
      name: clean((user && user.nickName) || membership.name, 50) || "机构教练",
      role: clean(membership.role, 30) || "coach",
    });
  }
  return result;
}
function assignmentAllows(a, metric, playerId) {
  if (!a.length) return false;
  return a.some(
    (x) =>
      x.status === "active" &&
      ((x.mode === "metric" && x.objectKey === metric) ||
        (x.mode === "player" && x.objectKey === playerId))
  );
}
async function workspace(e, u) {
  const x = await base(e.matchId, u);
  assertTeam(x);
  const roster = rosterFor(x) || {},
    team = teamFor(x),
    staff = await all(
      C.staff,
      { matchId: x.match.matchId, teamScope: x.scope },
      20
    ),
    assignments = await all(
      C.assignments,
      { matchId: x.match.matchId, teamScope: x.scope, status: "active" },
      300
    ),
    events = await all(
      C.events,
      { matchId: x.match.matchId, teamScope: x.scope, status: "active" },
      500
    ),
    setting = await first(C.settings, {
      settingKey: `${x.match.matchId}:${x.scope}`,
    }),
    summary = await first(C.summaries, {
      summaryKey: `${x.match.matchId}:${x.scope}`,
    }),
    live = await first(C.live, { matchId: x.match.matchId }),
    existingCoaches = ["home_coach", "away_coach"].includes(x.role)
      ? await existingCoachCandidates(x)
      : [];
  const myAssignments =
    x.role === "assistant"
      ? assignments.filter((a) => a.ownerOpenid === u)
      : assignments;
  return {
    ok: true,
    role: x.role,
    currentUserOpenid: u,
    coachOpenid: clean(team.ownerOpenid, 100),
    teamScope: x.scope,
    bothRosters: x.bothRosters,
    match: {
      matchId: x.match.matchId,
      eventId: x.match.eventId,
      status: ["live", "completed"].includes(x.prep.state)
        ? x.prep.state
        : x.match.status,
      homeTeamName: x.home.name,
      awayTeamName: x.away.name,
    },
    team: { teamId: team.teamId, name: team.name, logo: team.logo || "" },
    roster: {
      mode: roster.mode || "",
      players: list(roster.players, 50).map(safePlayer),
    },
    live,
    setting,
    staff,
    assignments: myAssignments,
    allAssignments: x.role === "assistant" ? [] : assignments,
    events:
      x.role === "assistant"
        ? events.filter((v) => v.actorOpenid === u)
        : events,
    summary,
    metrics: METRICS,
    existingCoaches,
    locked:
      ["live", "completed"].includes(x.match.status) ||
      ["live", "completed"].includes(x.prep.state),
  };
}
async function setWorkMode(e, u) {
  const x = await base(e.matchId, u);
  assertTeam(x);
  assertCoach(x);
  assertPregame(x);
  const mode = ["self", "assistants", "mixed", "skipped"].includes(e.mode)
    ? e.mode
    : "self";
  await upsert(
    C.settings,
    { settingKey: `${x.match.matchId}:${x.scope}` },
    {
      matchId: x.match.matchId,
      teamScope: x.scope,
      coachOpenid: u,
      workMode: mode,
    }
  );
  return { ok: true, workMode: mode };
}
async function createInvite(e, u) {
  const x = await base(e.matchId, u);
  assertTeam(x);
  assertCoach(x);
  assertPregame(x);
  const active = (
    await all(C.staff, { matchId: x.match.matchId, teamScope: x.scope }, 20)
  ).filter((s) => ["pending", "joined"].includes(s.status));
  if (active.length >= 5) throw new Error("每队最多邀请5名助教");
  const targetOpenid = clean(e.targetOpenid, 100);
  if (targetOpenid) {
    if (
      active.some(
        (staff) =>
          staff.targetOpenid === targetOpenid ||
          staff.assistantOpenid === targetOpenid
      )
    )
      throw new Error("该教练已在本场教练团队或待接受邀请");
    const allowed = await existingCoachCandidates(x);
    if (!allowed.some((coach) => coach.openid === targetOpenid))
      throw new Error("该教练不在本机构可邀请范围");
  }
  const inviteId = crypto.randomBytes(12).toString("base64url"),
    staffId = uid("staff"),
    name = clean(e.name, 30) || `助教${active.length + 1}`;
  await add(C.staff, {
    staffId,
    matchId: x.match.matchId,
    eventId: x.match.eventId,
    teamScope: x.scope,
    name,
    role: "assistant",
    source: targetOpenid ? "organization" : clean(e.source, 30) || "temporary",
    targetOpenid,
    status: "pending",
    invitedBy: u,
    createdAt: now(),
    updatedAt: now(),
  });
  await add(C.invites, {
    inviteId,
    staffId,
    matchId: x.match.matchId,
    teamScope: x.scope,
    status: "pending",
    expiresAt: now() + 7 * 86400000,
    createdAt: now(),
    updatedAt: now(),
  });
  if (targetOpenid) {
    await upsert(
      C.tasks,
      { taskKey: `${x.match.matchId}:assistant_invite:${targetOpenid}` },
      {
        taskId: uid("ttask"),
        matchId: x.match.matchId,
        eventId: x.match.eventId,
        recipientOpenid: targetOpenid,
        type: "match_assistant_invite",
        role: "assistant",
        teamScope: x.scope,
        assistantInvite: inviteId,
        status: "pending",
        unread: true,
        detail: `${teamFor(x).name}邀请你担任本场助教，请确认加入。`,
        deepLinkTarget: `/pages/match-coach-workspace/index?assistantInvite=${encodeURIComponent(
          inviteId
        )}`,
      }
    );
  }
  return {
    ok: true,
    inviteId,
    staffId,
    path: `/pages/match-coach-workspace/index?assistantInvite=${inviteId}`,
  };
}
async function resolveInvite(e, u, accept) {
  const inv = await first(C.invites, {
    inviteId: clean(e.assistantInvite, 40),
  });
  if (!inv || inv.expiresAt < now() || inv.status !== "pending")
    throw new Error("助教邀请已失效");
  const staff = await first(C.staff, { staffId: inv.staffId });
  if (!staff) throw new Error("助教任务不存在");
  if (staff.targetOpenid && staff.targetOpenid !== u)
    throw new Error("该助教邀请仅限指定教练接受");
  if (!accept)
    return {
      ok: true,
      matchId: inv.matchId,
      teamScope: inv.teamScope,
      name: staff.name,
    };
  await update(C.invites, inv, {
    status: "accepted",
    acceptedBy: u,
    acceptedAt: now(),
  });
  await update(C.staff, staff, {
    status: "joined",
    assistantOpenid: u,
    name: clean(e.name, 30) || staff.name,
    joinedAt: now(),
  });
  if (staff.targetOpenid) {
    const inviteTask = await first(C.tasks, {
      taskKey: `${inv.matchId}:assistant_invite:${staff.targetOpenid}`,
    });
    if (inviteTask)
      await update(C.tasks, inviteTask, {
        status: "completed",
        unread: false,
        completedAt: now(),
      });
  }
  await upsert(
    C.tasks,
    { taskKey: `${inv.matchId}:assistant:${u}` },
    {
      taskId: uid("ttask"),
      matchId: inv.matchId,
      eventId: staff.eventId,
      recipientOpenid: u,
      type: "match_assistant",
      role: "assistant",
      teamScope: inv.teamScope,
      status: "pending",
      unread: true,
      detail: "你已加入本场教练团队，请查看分工。",
      deepLinkTarget: `/pages/match-coach-workspace/index?matchId=${encodeURIComponent(
        inv.matchId
      )}`,
    }
  );
  return { ok: true, matchId: inv.matchId };
}
async function assign(e, u) {
  const x = await base(e.matchId, u);
  assertTeam(x);
  assertCoach(x);
  assertPregame(x);
  const mode = ["metric", "player"].includes(e.mode) ? e.mode : "metric",
    objectKey = clean(e.objectKey, 100),
    ownerOpenid = clean(e.ownerOpenid, 100) || u;
  if (!objectKey) throw new Error("请选择分工对象");
  if (mode === "metric" && !METRICS.includes(objectKey))
    throw new Error("统计项无效");
  if (
    mode === "player" &&
    !list(rosterFor(x).players, 50).some(
      (p) => clean(p.playerId || p.id, 100) === objectKey
    )
  )
    throw new Error("球员不在本场名单");
  if (ownerOpenid !== u) {
    const s = await first(C.staff, {
      matchId: x.match.matchId,
      teamScope: x.scope,
      assistantOpenid: ownerOpenid,
      status: "joined",
    });
    if (!s) throw new Error("请先让助教接受邀请");
  }
  const key = `${x.match.matchId}:${x.scope}:${mode}:${objectKey}`,
    old = await first(C.assignments, { assignmentKey: key, status: "active" });
  if (old && old.ownerOpenid !== ownerOpenid)
    throw new Error("该任务已分配给其他教练");
  await upsert(
    C.assignments,
    { assignmentKey: key },
    {
      matchId: x.match.matchId,
      teamScope: x.scope,
      mode,
      objectKey,
      ownerOpenid,
      assignedBy: u,
      status: "active",
    }
  );
  return { ok: true };
}
async function unassign(e, u) {
  const x = await base(e.matchId, u);
  assertCoach(x);
  assertPregame(x);
  const a = await first(C.assignments, {
    assignmentKey: clean(e.assignmentKey, 300),
    status: "active",
  });
  if (a && a.matchId === x.match.matchId && a.teamScope === x.scope)
    await update(C.assignments, a, { status: "cancelled", cancelledBy: u });
  return { ok: true };
}
async function completeAssignments(e, u) {
  const x = await base(e.matchId, u);
  assertTeam(x);
  assertCoach(x);
  assertPregame(x);
  const staff = (
      await all(
        C.staff,
        { matchId: x.match.matchId, teamScope: x.scope, status: "joined" },
        20
      )
    ).filter((item) => item.assistantOpenid),
    assignments = await all(
      C.assignments,
      { matchId: x.match.matchId, teamScope: x.scope, status: "active" },
      300
    );
  for (const member of staff) {
    const taskCount = assignments.filter(
      (item) => item.ownerOpenid === member.assistantOpenid
    ).length;
    await upsert(
      C.tasks,
      { taskKey: x.match.matchId + ":assistant:" + member.assistantOpenid },
      {
        taskId: uid("ttask"),
        matchId: x.match.matchId,
        eventId: x.match.eventId,
        recipientOpenid: member.assistantOpenid,
        type: "match_assistant",
        role: "assistant",
        teamScope: x.scope,
        status: "pending",
        unread: true,
        detail: taskCount
          ? "本场分工已完成，你有" + taskCount + "项记录任务。"
          : "本场分工已更新，请查看协作进度。",
        deepLinkTarget:
          "/pages/match-coach-workspace/index?matchId=" +
          encodeURIComponent(x.match.matchId),
        assignmentCompletedAt: now(),
      }
    );
  }
  return {
    ok: true,
    assignmentCount: assignments.length,
    notifiedCount: staff.length,
  };
}
async function record(e, u) {
  const x = await base(e.matchId, u);
  assertTeam(x);
  if (x.match.status !== "live" && x.prep.state !== "live")
    throw new Error(
      x.match.status === "completed" || x.prep.state === "completed"
        ? "比赛已结束，不能继续记录"
        : "比赛尚未开始"
    );
  const metric = clean(e.metric, 30),
    playerId = clean(e.playerId, 100);
  if (!METRICS.includes(metric) || !playerId)
    throw new Error("请选择球员和统计项");
  const roster = rosterFor(x);
  if (
    !list(roster.players, 50).some(
      (p) => clean(p.playerId || p.id, 100) === playerId
    )
  )
    throw new Error("球员不在本场名单");
  const assignments = await all(
    C.assignments,
    { matchId: x.match.matchId, teamScope: x.scope, status: "active" },
    300
  );
  if (
    x.role === "assistant" &&
    !assignmentAllows(
      assignments.filter((a) => a.ownerOpenid === u),
      metric,
      playerId
    )
  )
    throw new Error("该数据不在你的分工范围");
  const value = Math.max(-10, Math.min(10, Number(e.value || 1)));
  await add(C.events, {
    eventId: uid("ce"),
    matchId: x.match.matchId,
    teamScope: x.scope,
    playerId,
    metric,
    value,
    actorOpenid: u,
    status: "active",
    officialStateVersion: Number(
      ((await first(C.live, { matchId: x.match.matchId })) || {}).version || 0
    ),
    createdAt: now(),
    updatedAt: now(),
  });
  return { ok: true };
}
async function undo(e, u) {
  const x = await base(e.matchId, u);
  assertTeam(x);
  const rows = (
    await all(
      C.events,
      {
        matchId: x.match.matchId,
        teamScope: x.scope,
        actorOpenid: u,
        status: "active",
      },
      500
    )
  ).sort((a, b) => b.createdAt - a.createdAt);
  if (rows[0])
    await update(C.events, rows[0], {
      status: "cancelled",
      cancelledAt: now(),
    });
  return { ok: true, removed: !!rows[0] };
}
async function submitSummary(e, u) {
  const x = await base(e.matchId, u);
  assertCoach(x);
  if (x.match.status !== "completed" && x.prep.state !== "completed")
    throw new Error("比赛结束后才能提交汇总");
  const roster = rosterFor(x),
    events = await all(
      C.events,
      { matchId: x.match.matchId, teamScope: x.scope, status: "active" },
      1000
    ),
    totals = {};
  for (const p of list(roster.players, 50))
    totals[clean(p.playerId || p.id, 100)] = {
      player: safePlayer(p),
      metrics: {},
    };
  for (const ev of events) {
    if (!totals[ev.playerId]) continue;
    totals[ev.playerId].metrics[ev.metric] =
      Number(totals[ev.playerId].metrics[ev.metric] || 0) +
      Number(ev.value || 0);
  }
  const playerScore = Object.values(totals).reduce(
      (s, p) =>
        s +
        Number(p.metrics.ft_score || 0) +
        2 * Number(p.metrics.two_score || 0) +
        3 * Number(p.metrics.three_score || 0),
      0
    ),
    live = await first(C.live, { matchId: x.match.matchId }),
    officialScore =
      x.scope === "home"
        ? Number((live && live.homeScore) || x.match.homeScore || 0)
        : Number((live && live.awayScore) || x.match.awayScore || 0),
    recordedMetrics = [...new Set(events.map((event) => event.metric))],
    unrecordedMetrics = METRICS.filter(
      (metric) => !recordedMetrics.includes(metric)
    ),
    seen = new Set(),
    duplicateCount = events.reduce((count, event) => {
      const key = [
        event.actorOpenid,
        event.playerId,
        event.metric,
        event.value,
        event.officialStateVersion,
      ].join(":");
      if (seen.has(key)) return count + 1;
      seen.add(key);
      return count;
    }, 0),
    payload = {
      matchId: x.match.matchId,
      teamScope: x.scope,
      submittedBy: u,
      playerTotals: Object.values(totals),
      playerScore,
      officialScore,
      scoreConsistent: playerScore === officialScore,
      recordedMetrics,
      unrecordedMetrics,
      duplicateCount,
      submittedAt: now(),
      status: "submitted",
    };
  await upsert(
    C.summaries,
    { summaryKey: `${x.match.matchId}:${x.scope}` },
    payload
  );
  return { ok: true, summary: payload };
}
exports.main = async (e = {}) => {
  try {
    for (const n of Object.values(C)) await ensure(n);
    const u = openid(e),
      a = clean(e.action, 40);
    if (a === "getWorkspace") return await workspace(e, u);
    if (a === "setWorkMode") return await setWorkMode(e, u);
    if (a === "createInvite") return await createInvite(e, u);
    if (a === "resolveInvite") return await resolveInvite(e, u, false);
    if (a === "acceptInvite") return await resolveInvite(e, u, true);
    if (a === "assign") return await assign(e, u);
    if (a === "unassign") return await unassign(e, u);
    if (a === "completeAssignments") return await completeAssignments(e, u);
    if (a === "recordEvent") return await record(e, u);
    if (a === "undoOwn") return await undo(e, u);
    if (a === "submitSummary") return await submitSummary(e, u);
    throw new Error("不支持的教练协同操作");
  } catch (error) {
    console.error("[sxCoachTeamOps]", e.action, error);
    return { ok: false, message: error.message || "教练协同服务暂不可用" };
  }
};
