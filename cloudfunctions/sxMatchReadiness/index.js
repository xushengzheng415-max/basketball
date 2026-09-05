const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function text(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function unique(values) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).map((item) => text(item, 100)).filter(Boolean))
  );
}

async function first(collection, query) {
  const result = await db.collection(collection).where(query).limit(1).get();
  return (result.data && result.data[0]) || null;
}

function belongsToTeam(player, team) {
  const sourceId = text(team.sourceTeamId || team.sourceId, 100);
  const teamName = text(team.boundTeamName || team.name, 100);
  const ids = unique([
    ...(player.teamIds || []),
    player.filter && player.filter !== "unassigned" ? player.filter : "",
  ]);
  const names = unique([
    ...(player.teamNames || []),
    player.team && player.team !== "未分队" ? player.team : "",
  ]);
  return !!(
    (sourceId && ids.includes(sourceId)) ||
    (teamName && names.includes(teamName))
  );
}

function safePlayer(player) {
  return {
    playerId: text(player.playerId || player.id, 100),
    name: text(player.name, 50) || "未命名球员",
    number: text(player.number, 10),
    avatar: text(player.avatarFileID || player.avatar, 500),
    position: text(player.position, 20),
  };
}

async function latestPlayers(eventId, teamId) {
  if (!eventId || !teamId) return [];
  const team = await first("sx_tournament_teams", { eventId, teamId });
  if (!team || !team.ownerOpenid) return [];
  const user = await first("sx_users", { openid: team.ownerOpenid });
  const roster = user && user.roster;
  if (!roster || !Array.isArray(roster.players)) {
    return (Array.isArray(team.players) ? team.players : []).map(safePlayer);
  }
  return roster.players
    .filter((player) => belongsToTeam(player, team))
    .map(safePlayer)
    .filter((player) => player.playerId);
}

exports.main = async (event = {}) => {
  const context = cloud.getWXContext();
  const response = await cloud.callFunction({
    name: "sxMatchFlow",
    data: Object.assign({}, event, {
      domain: event.domain || "readiness",
      _callerOpenid: context.FROM_OPENID || context.OPENID || "",
      _callerUnionid: context.FROM_UNIONID || context.UNIONID || "",
    }),
  });
  const result = response && response.result ? response.result : response;
  if (
    result &&
    result.ok === true &&
    (event.domain || "readiness") === "readiness" &&
    event.action === "status" &&
    result.match
  ) {
    const eventId = result.match.eventId;
    const players = await Promise.all([
      latestPlayers(eventId, result.home && result.home.teamId),
      latestPlayers(eventId, result.away && result.away.teamId),
    ]);
    result.homeAvailablePlayers = players[0];
    result.awayAvailablePlayers = players[1];
  }
  return result;
};
