'use strict';

const assert = require('assert');
const storage = Object.create(null);
global.wx = {
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; }
};

const rosterSync = require('../native-dist/utils/roster-sync');
rosterSync.scheduleRosterPush = () => {};

const {
  CLASS_OPTIONS,
  classIdentityError,
  GRADE_OPTIONS,
  SCHOOL_STAGES,
  buildClassIdentity,
  ensureClassTeamBinding,
  findClassTeam,
  getLocalTournamentResult,
  listLocalCreatedTournaments,
  readTeams,
  saveLocalTournament
} = require('../native-dist/utils/tournament-league');

assert.deepStrictEqual(SCHOOL_STAGES.map((item) => item.label), ['小学', '初中', '高中']);
assert.strictEqual(GRADE_OPTIONS.primary.length, 6);
assert.strictEqual(GRADE_OPTIONS.junior.length, 3);
assert.strictEqual(GRADE_OPTIONS.senior.length, 3);
assert.strictEqual(CLASS_OPTIONS.length, 11);
assert.strictEqual(CLASS_OPTIONS[10].label, '自定义班级');

const identity = buildClassIdentity({
  schoolName: '三十三中', schoolStage: 'junior', gradeCode: 'J1', gradeName: '初一', classCode: '3', className: '3班'
});
assert.strictEqual(identity.classDisplayName, '初一3班');
assert.strictEqual(identity.classIdentityKey, '三十三中|junior|J1|3');
assert.strictEqual(classIdentityError({}), '请填写学校名称');
assert.strictEqual(classIdentityError({ schoolName: '三十三中' }), '请选择学段');
assert.strictEqual(classIdentityError({ schoolName: '三十三中', schoolStage: 'junior' }), '请选择比赛年级');
assert.strictEqual(classIdentityError({ schoolName: '三十三中', schoolStage: 'junior', gradeCode: 'J1' }), '请选择本班班级');
assert.strictEqual(classIdentityError({ schoolName: '三十三中', schoolStage: 'junior', gradeCode: 'J1', classCode: 'custom' }), '请填写自定义班级');

const first = ensureClassTeamBinding(identity, null);
assert.strictEqual(first.name, '初一3班');
assert.strictEqual(first.teamType, 'class');
assert.strictEqual(readTeams().length, 1);

const second = ensureClassTeamBinding(identity, null);
assert.strictEqual(second.sourceTeamId, first.sourceTeamId, '同一班级应复用已绑定球队');
assert.strictEqual(readTeams().length, 1, '同一班级不得重复创建球队');
assert.strictEqual(findClassTeam(readTeams(), identity).sourceTeamId, first.sourceTeamId);

const local = saveLocalTournament({
  tournament: {
    name: '三十三中初一班班赛', scenarioType: 'class_league', competitionFormat: 'single_round_robin',
    status: 'recruiting', organizationName: '三十三中', pointsRule: { win: 2, loss: 1, forfeit: 0 }
  },
  creatorTeam: first
});
assert.strictEqual(local.localOnly, true);
assert.strictEqual(listLocalCreatedTournaments()[0].name, '三十三中初一班班赛');
const localDetail = getLocalTournamentResult(local.tournament.eventId);
assert.strictEqual(localDetail.role, 'creator');
assert.strictEqual(localDetail.teams.length, 1);

const updatedLocal = require('../native-dist/utils/tournament-league').updateLocalTournament(local.tournament.eventId, { name: '更新后的班班赛' }, first);
assert.strictEqual(updatedLocal.tournament.name, '更新后的班班赛');
assert.strictEqual(getLocalTournamentResult(local.tournament.eventId).tournament.name, '更新后的班班赛');

console.log('tournament class binding tests passed');
