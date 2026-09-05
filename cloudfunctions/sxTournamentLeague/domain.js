'use strict';

const crypto = require('crypto');

const SCENARIO_TYPES = new Set(['class_league', 'institution_weekly', 'other']);
const COMPETITION_FORMATS = new Set(['single_round_robin', 'double_round_robin', 'group_knockout']);

function text(value, max = 100) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const result = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, result));
}

function id(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
}

function opaqueKey(bytes = 9) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function scenarioType(value) {
  return SCENARIO_TYPES.has(value) ? value : 'other';
}

function competitionFormat(value) {
  return COMPETITION_FORMATS.has(value) ? value : 'single_round_robin';
}

function normalizePoints(value = {}) {
  return {
    win: integer(value.win, 2, 0, 20),
    loss: integer(value.loss, 1, 0, 20),
    forfeit: integer(value.forfeit, 0, 0, 20)
  };
}

function normalizePlayers(players) {
  const seen = new Set();
  return (Array.isArray(players) ? players : []).slice(0, 50).map((player, index) => {
    const playerId = text(player && (player.playerId || player.id), 100) || `player_${index + 1}`;
    const number = text(player && player.number, 10);
    const key = `${playerId}|${number}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return {
      playerId,
      name: text(player && player.name, 50) || '未命名球员',
      number,
      avatar: text(player && player.avatar, 500),
      position: text(player && player.position, 30)
    };
  }).filter(Boolean);
}

function normalizeTeam(team = {}, scenario = 'other') {
  const schoolName = text(team.schoolName, 100);
  const schoolStage = text(team.schoolStage, 20);
  const gradeCode = text(team.gradeCode, 20);
  const gradeName = text(team.gradeName, 50);
  const classCode = text(team.classCode, 30);
  const className = text(team.className, 50);
  const classDisplayName = text(team.classDisplayName || [gradeName, className].filter(Boolean).join(''), 100);
  const boundTeamName = text(team.boundTeamName || team.name || team.label || team.teamName, 100);
  const representsClass = scenario === 'class_league';
  const publicName = representsClass ? classDisplayName : boundTeamName;
  return {
    sourceTeamId: text(team.sourceTeamId || team.id || team.key, 100),
    name: publicName || boundTeamName,
    boundTeamName: representsClass && boundTeamName !== publicName ? boundTeamName : text(team.boundTeamName, 100),
    logo: text(team.logo || team.logoUrl || team.logoFileID, 500),
    teamType: text(team.teamType, 20) || (scenario === 'class_league' ? 'class' : 'standard'),
    classIdentityKey: text(team.classIdentityKey, 240),
    schoolName, schoolStage, gradeCode, gradeName, classCode, className, classDisplayName,
    coachName: text(team.coachName, 50),
    phone: text(team.phone, 30),
    players: normalizePlayers(team.players)
  };
}

function competitionTeam(tournament, item) {
  if (!item) return item;
  const scenario = scenarioType(tournament && tournament.scenarioType);
  if (scenario !== 'class_league') {
    return {
      ...item,
      name: text(item.boundTeamName || item.name, 100) || text(item.name, 100),
      boundTeamName: '',
      schoolName: '', schoolStage: '', gradeCode: '', gradeName: '',
      classCode: '', className: '', classDisplayName: '', classIdentityKey: ''
    };
  }
  const publicName = text(item.classDisplayName || [item.gradeName, item.className].filter(Boolean).join(''), 100);
  if (!publicName) return { ...item };
  return {
    ...item,
    boundTeamName: text(item.boundTeamName || (item.name !== publicName ? item.name : ''), 100),
    classDisplayName: publicName,
    name: publicName
  };
}

function teamFingerprint(team, scenario) {
  const normalized = normalizeTeam(team, scenario);
  if (scenario === 'class_league') {
    if (normalized.classIdentityKey) return normalized.classIdentityKey.toLowerCase();
    return [normalized.schoolName, normalized.schoolStage, normalized.gradeCode || normalized.gradeName, normalized.classCode || normalized.className]
      .map((value) => value.toLowerCase()).join('|');
  }
  return (normalized.sourceTeamId || normalized.name).toLowerCase();
}

function roundRobin(teams, options = {}) {
  const list = (Array.isArray(teams) ? teams : []).map((team) => ({
    teamId: text(team.teamId || team.id, 100),
    name: text(team.name, 100),
    groupKey: text(team.groupKey, 20)
  })).filter((team) => team.teamId);
  if (list.length < 2) return [];
  const working = list.slice();
  if (working.length % 2 === 1) working.push(null);
  const fixed = working[0];
  let rotating = working.slice(1);
  const rounds = working.length - 1;
  const matches = [];
  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    const row = [fixed].concat(rotating);
    for (let index = 0; index < row.length / 2; index += 1) {
      const left = row[index];
      const right = row[row.length - 1 - index];
      if (!left || !right) continue;
      const swap = (roundIndex + index) % 2 === 1;
      const home = swap ? right : left;
      const away = swap ? left : right;
      matches.push({
        roundNo: roundIndex + 1,
        stage: options.stage || 'league',
        groupKey: options.groupKey || '',
        homeTeamId: home.teamId,
        homeTeamName: home.name,
        awayTeamId: away.teamId,
        awayTeamName: away.name
      });
    }
    rotating = [rotating[rotating.length - 1]].concat(rotating.slice(0, -1));
  }
  return matches;
}

function buildSchedule(teams, format, options = {}) {
  const normalizedFormat = competitionFormat(format);
  if (normalizedFormat === 'group_knockout') {
    const groupCount = integer(options.groupCount, 2, 2, 16);
    const groups = Array.from({ length: groupCount }, () => []);
    teams.forEach((team, index) => groups[index % groupCount].push(team));
    return groups.flatMap((groupTeams, index) => roundRobin(groupTeams, {
      stage: 'group',
      groupKey: String.fromCharCode(65 + index)
    }));
  }
  const firstLeg = roundRobin(teams, { stage: 'league' });
  if (normalizedFormat !== 'double_round_robin') return firstLeg;
  const roundOffset = firstLeg.reduce((max, match) => Math.max(max, match.roundNo), 0);
  return firstLeg.concat(firstLeg.map((match) => ({
    ...match,
    roundNo: match.roundNo + roundOffset,
    homeTeamId: match.awayTeamId,
    homeTeamName: match.awayTeamName,
    awayTeamId: match.homeTeamId,
    awayTeamName: match.homeTeamName
  })));
}

function calculateStandings(teams, matches, pointsRule) {
  const rule = normalizePoints(pointsRule);
  const table = new Map();
  (teams || []).forEach((team) => table.set(String(team.teamId || team.id), {
    teamId: String(team.teamId || team.id),
    name: team.name || '未命名球队',
    played: 0, won: 0, lost: 0, forfeit: 0,
    pointsFor: 0, pointsAgainst: 0, pointDifference: 0, points: 0,
    headToHead: Object.create(null)
  }));
  (matches || []).filter((match) => match.status === 'completed').forEach((match) => {
    const home = table.get(String(match.homeTeamId));
    const away = table.get(String(match.awayTeamId));
    if (!home || !away) return;
    const homeScore = Number(match.homeScore || 0);
    const awayScore = Number(match.awayScore || 0);
    home.played += 1; away.played += 1;
    home.pointsFor += homeScore; home.pointsAgainst += awayScore;
    away.pointsFor += awayScore; away.pointsAgainst += homeScore;
    const forfeiting = match.forfeitTeamId ? String(match.forfeitTeamId) : '';
    if (forfeiting === home.teamId) {
      home.forfeit += 1; home.lost += 1; away.won += 1;
      home.points += rule.forfeit; away.points += rule.win;
    } else if (forfeiting === away.teamId) {
      away.forfeit += 1; away.lost += 1; home.won += 1;
      away.points += rule.forfeit; home.points += rule.win;
    } else if (homeScore > awayScore) {
      home.won += 1; away.lost += 1;
      home.points += rule.win; away.points += rule.loss;
      home.headToHead[away.teamId] = (home.headToHead[away.teamId] || 0) + 1;
    } else if (awayScore > homeScore) {
      away.won += 1; home.lost += 1;
      away.points += rule.win; home.points += rule.loss;
      away.headToHead[home.teamId] = (away.headToHead[home.teamId] || 0) + 1;
    }
  });
  const rows = Array.from(table.values()).map((row) => ({
    ...row,
    pointDifference: row.pointsFor - row.pointsAgainst
  }));
  rows.sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    const direct = (right.headToHead[left.teamId] || 0) - (left.headToHead[right.teamId] || 0);
    if (direct) return direct;
    if (right.pointDifference !== left.pointDifference) return right.pointDifference - left.pointDifference;
    if (right.pointsFor !== left.pointsFor) return right.pointsFor - left.pointsFor;
    return left.name.localeCompare(right.name, 'zh-CN');
  });
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    const tied = previous && previous.points === row.points &&
      (previous.headToHead[row.teamId] || 0) === (row.headToHead[previous.teamId] || 0) &&
      previous.pointDifference === row.pointDifference && previous.pointsFor === row.pointsFor;
    const previousRank = index > 0 ? (rows[index - 1].resolvedRank || index) : 1;
    const rank = tied ? previousRank : index + 1;
    row.resolvedRank = rank;
    const output = { ...row, rank };
    delete output.headToHead;
    delete output.resolvedRank;
    return output;
  });
}

module.exports = {
  SCENARIO_TYPES,
  COMPETITION_FORMATS,
  buildSchedule,
  calculateStandings,
  competitionTeam,
  competitionFormat,
  id,
  integer,
  normalizePlayers,
  normalizePoints,
  normalizeTeam,
  opaqueKey,
  scenarioType,
  teamFingerprint,
  text
};
