'use strict';

const assert = require('assert');
const { buildSchedule, calculateStandings, competitionTeam, normalizeTeam, teamFingerprint } = require('../cloudfunctions/sxTournamentLeague/domain');

function teams(count) {
  return Array.from({ length: count }, (_, index) => ({ teamId: `T${index + 1}`, name: `球队${index + 1}` }));
}

function pairingKey(match) {
  return [match.homeTeamId, match.awayTeamId].sort().join(':');
}

function testSingleRoundRobin() {
  const schedule = buildSchedule(teams(4), 'single_round_robin');
  assert.strictEqual(schedule.length, 6, '4 队单循环应生成 6 场');
  assert.strictEqual(new Set(schedule.map(pairingKey)).size, 6, '单循环不得重复对阵');
  assert.strictEqual(Math.max(...schedule.map((match) => match.roundNo)), 3, '4 队单循环应为 3 轮');
}

function testOddRoundRobin() {
  const schedule = buildSchedule(teams(5), 'single_round_robin');
  assert.strictEqual(schedule.length, 10, '5 队单循环应生成 10 场');
  const appearances = Object.fromEntries(teams(5).map((team) => [team.teamId, 0]));
  schedule.forEach((match) => { appearances[match.homeTeamId] += 1; appearances[match.awayTeamId] += 1; });
  Object.values(appearances).forEach((count) => assert.strictEqual(count, 4, '奇数队轮空后每队仍应交手 4 次'));
}

function testDoubleRoundRobin() {
  const schedule = buildSchedule(teams(4), 'double_round_robin');
  assert.strictEqual(schedule.length, 12, '4 队双循环应生成 12 场');
  const direction = new Set(schedule.map((match) => `${match.homeTeamId}:${match.awayTeamId}`));
  assert.strictEqual(direction.size, 12, '双循环应完整交换主客场');
}

function testGroupSchedule() {
  const schedule = buildSchedule(teams(8), 'group_knockout', { groupCount: 2 });
  assert.strictEqual(schedule.length, 12, '8 队分两组，组内单循环应生成 12 场');
  assert.deepStrictEqual([...new Set(schedule.map((match) => match.groupKey))].sort(), ['A', 'B']);
  assert.ok(schedule.every((match) => match.stage === 'group'), '初次发布只生成小组赛，对应淘汰赛在小组结束后生成');
}

function testStandings() {
  const sourceTeams = teams(3);
  const matches = [
    { status: 'completed', homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 30, awayScore: 20 },
    { status: 'completed', homeTeamId: 'T2', awayTeamId: 'T3', homeScore: 25, awayScore: 20 },
    { status: 'completed', homeTeamId: 'T3', awayTeamId: 'T1', homeScore: 10, awayScore: 20 }
  ];
  const table = calculateStandings(sourceTeams, matches, { win: 2, loss: 1, forfeit: 0 });
  assert.strictEqual(table[0].teamId, 'T1', '积分更高的球队应排名第一');
  assert.strictEqual(table[0].points, 4);
  assert.strictEqual(table[0].pointDifference, 20);
  assert.strictEqual(table[1].teamId, 'T2', '同积分时优先相互战绩');
}

function testSharedRank() {
  const table = calculateStandings(teams(2), [], { win: 2, loss: 1, forfeit: 0 });
  assert.strictEqual(table[0].rank, 1);
  assert.strictEqual(table[1].rank, 1, '全部排名条件相同时应并列');
}

function testClassIdentity() {
  const source = {
    name: '初一3班', teamType: 'class', schoolName: '三十三中', schoolStage: 'junior',
    gradeCode: 'J1', gradeName: '初一', classCode: '3', className: '3班',
    classIdentityKey: '三十三中|junior|J1|3'
  };
  const team = normalizeTeam(source, 'class_league');
  assert.strictEqual(team.schoolStage, 'junior');
  assert.strictEqual(team.gradeCode, 'J1');
  assert.strictEqual(team.classCode, '3');
  assert.strictEqual(teamFingerprint(team, 'class_league'), '三十三中|junior|j1|3');
}

function testScenarioTeamNames() {
  const source = {
    name: '芝加哥公牛', schoolName: '郑州二十七中', gradeName: '初二', className: '2班',
    classDisplayName: '初二2班', players: []
  };
  const classTeam = normalizeTeam(source, 'class_league');
  assert.strictEqual(classTeam.name, '初二2班', '班班赛应以班级名作为参赛队主名称');
  assert.strictEqual(classTeam.boundTeamName, '芝加哥公牛');

  const institutionTeam = normalizeTeam(source, 'institution_weekly');
  assert.strictEqual(institutionTeam.name, '芝加哥公牛', '机构周赛应以机构球队名作为参赛队主名称');

  const legacyInstitutionTeam = competitionTeam(
    { scenarioType: 'institution_weekly' },
    { teamId: 'T1', name: '初二2班', boundTeamName: '芝加哥公牛', classDisplayName: '初二2班' }
  );
  assert.strictEqual(legacyInstitutionTeam.name, '芝加哥公牛', '既有机构赛事应恢复原绑定球队名称');
  assert.strictEqual(legacyInstitutionTeam.boundTeamName, '');
  assert.strictEqual(legacyInstitutionTeam.classDisplayName, '', '机构周赛对外不应继续暴露班级展示字段');
}

testSingleRoundRobin();
testOddRoundRobin();
testDoubleRoundRobin();
testGroupSchedule();
testStandings();
testSharedRank();
testClassIdentity();
testScenarioTeamNames();
console.log('tournament league domain tests passed');
