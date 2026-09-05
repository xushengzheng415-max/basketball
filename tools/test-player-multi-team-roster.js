'use strict';

const assert = require('assert');
const fs = require('fs');
const membership = require('../native-dist/utils/player-team-membership');

const club = { key: 'club-1', label: '迈步少年' };
const school = { key: 'school-1', label: '三年级校队' };
const legacy = { id: 'p1', filter: 'club-1', team: '迈步少年' };
const multi = Object.assign({ id: 'p2' }, membership.membershipFields([club, school]));

assert.strictEqual(membership.belongsToTeam(legacy, club), true, '旧单球队球员应继续匹配原球队');
assert.strictEqual(membership.belongsToTeam(multi, club), true, '多球队球员应匹配俱乐部队');
assert.strictEqual(membership.belongsToTeam(multi, school), true, '多球队球员应匹配学校队');
assert.deepStrictEqual(multi.teamIds, ['club-1', 'school-1']);
assert.strictEqual(multi.filter, 'club-1', '首支球队应保留为旧页面兼容主球队');

const matchPage = fs.readFileSync('native-dist/pages/match-preparation/index.js', 'utf8');
const matchWxml = fs.readFileSync('native-dist/pages/match-preparation/index.wxml', 'utf8');
const flow = fs.readFileSync('cloudfunctions/sxMatchFlow/index.js', 'utf8');

assert.ok(matchPage.includes('refreshRosterPlayers'), '比赛名单应提供手动刷新');
assert.ok(matchWxml.includes('刷新球员'), '比赛准备页应显示刷新球员按钮');
assert.ok(matchPage.includes('keepInteractiveList'), '轮询刷新不应覆盖教练正在点选的名单');
assert.ok(/selectionText\s*:\s*isSelected\s*\?\s*["']✓["']\s*:\s*["']["']/.test(matchPage), '选中球员应显示稳定勾选反馈');
assert.ok(matchWxml.includes('selection-indicator'), '名单球员应包含可见选择标记');
assert.ok(matchWxml.includes('showSubmittedRoster'), '名单提交后应切换到精简提交结果');
assert.ok(matchWxml.includes('名单已提交并锁定'), '提交结果应明确显示锁定状态');
assert.ok(!matchWxml.includes('wx:if="{{showRosterPlayers}}"'), '提交后不应继续保留名单选择框架');
assert.ok(/showAssignReferee\s*:\s*isWaiting\s*&&\s*scope\s*===\s*["']home["']\s*&&\s*role\s*===\s*["']home_coach["']/.test(matchPage), '裁判邀请必须严格限定主队负责人');
assert.ok(/if\s*\(\s*scope\s*!==\s*["']home["']\s*\)[\s\S]{0,120}externalPath\s*:\s*["']["'][\s\S]{0,120}externalQr\s*:\s*["']["']/.test(matchPage), '非主队页面应主动清空裁判邀请内容');
assert.ok(flow.includes("rosterUsers:'sx_users'"), '比赛协同服务应读取云端最新球队库');
assert.ok(flow.includes("source:'submitted_roster'"), '名单提交后应改用冻结快照');
assert.ok(flow.includes('球队球员已更新，请刷新名单后重试'), '服务端应阻止提交已不属于本队的球员');
assert.ok(matchPage.includes('starterIds.size !== 5'), '比赛名单必须固定选择5名首发');
assert.ok(matchPage.includes('players = this.data.myPlayers.map'), '其余本队球员应自动进入替补名单');
assert.ok(matchWxml.includes('其余自动进入替补席'), '比赛准备页应明确首发与替补规则');

console.log('player multi-team and live roster tests passed');
