'use strict';

const assert = require('assert');
const fs = require('fs');

const domain = fs.readFileSync('cloudfunctions/sxTournamentLeague/index.js', 'utf8');
const home = fs.readFileSync('native-dist/pages/home/index.js', 'utf8');
const homeWxml = fs.readFileSync('native-dist/pages/home/index.wxml', 'utf8');
const tournament = fs.readFileSync('native-dist/utils/tournament-league.js', 'utf8');
const tabbar = fs.readFileSync('native-dist/components/sxf-tabbar/index.js', 'utf8');
const tabbarWxml = fs.readFileSync('native-dist/components/sxf-tabbar/index.wxml', 'utf8');

assert.ok(domain.includes('registration_review'), '报名提交应创建审核待办');
assert.ok(domain.includes('recipientOpenid: tournament.creatorOpenid'), '待办必须归属赛事创建者');
assert.ok(domain.includes('async function listTasks(openid)'), '任务查询应支持历史待审核报名回填');
assert.ok(domain.includes('const pendingTeams = await all(C.teams'), '历史待审核球队应自动生成任务');
assert.ok(domain.includes('listTasks: (_, openid) => listTasks(openid)'), '赛事领域应提供我的待办查询');
assert.ok(domain.includes('ZaQx7FB2aJmEvlh0e9-iY85wzuBaZoDPUMDVB9favZs'), '报名提醒应使用已配置的小程序模板');
assert.ok(domain.includes('jp0LDnCgS6w5xyLSJQyLnOuilLV94MNAtzvQtuGw8XE'), '审核结果应使用已配置的小程序模板');
assert.ok(domain.includes("recordTournamentNotice('registration'") && domain.includes('sendMiniTournamentNotice'), '报名提交后应尝试通知创建方');
assert.ok(domain.includes("recordTournamentNotice('review'") && domain.includes('sendMiniTournamentNotice'), '审核完成后应尝试通知报名球队');
assert.ok(home.includes('loadTournamentTasks'), '工作台应加载赛事待办');
assert.ok(homeWxml.includes('tournament-task-row'), '工作台应显示报名审核任务行');
assert.ok(home.includes("'审核球队报名'"), '工作台应为报名审核任务提供标题');
assert.ok(tournament.includes('我的报名等待创建者审核'), '参与方只应看到自己的审核状态');
assert.ok(tabbar.includes('tournamentBadgeCount'), '底部赛事入口应支持待审核数量');
assert.ok(tabbarWxml.includes('tab-badge'), '底部赛事入口应显示红点数量');

console.log('tournament registration task tests passed');
