'use strict';

const assert = require('assert');
const fs = require('fs');

const cloud = fs.readFileSync('cloudfunctions/sxTournamentLeague/index.js', 'utf8');
const detail = fs.readFileSync('native-dist/pages/tournament-detail/index.js', 'utf8');
const wxml = fs.readFileSync('native-dist/pages/tournament-detail/index.wxml', 'utf8');
const local = fs.readFileSync('native-dist/utils/tournament-league.js', 'utf8');
const tournamentList = fs.readFileSync('native-dist/pages/tournament/index.wxml', 'utf8');

assert.ok(cloud.includes('async function deleteTournament'), '云端赛事领域应提供删除赛事操作');
assert.ok(cloud.includes("['live', 'completed']"), '有进行中或已结束场次的赛事不可删除');
assert.ok(cloud.includes('delete: deleteTournament'), '删除操作应对外注册');
assert.ok(detail.includes("callTournament('delete'"), '详情页应调用云端删除赛事');
assert.ok(detail.includes('removeLocalTournament'), '本机待同步赛事也应能删除');
assert.ok(wxml.includes('删除赛事'), '创建者管理页应提供删除入口');
assert.ok(local.includes('function removeLocalTournament'), '本机赛事工具应支持移除记录');
assert.ok(local.includes('我的报名等待创建者审核'), '参与方应显示自己的报名审核状态');
assert.ok(tournamentList.includes('item.pendingTipText'), '赛事卡片应渲染角色专属提示');

console.log('tournament delete tests passed');
