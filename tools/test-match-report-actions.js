'use strict';

const assert = require('assert');
const fs = require('fs');

const detail = fs.readFileSync('native-dist/pages/tournament-detail/index.js', 'utf8');
const board = fs.readFileSync('native-dist/pages/scorer-board/index.js', 'utf8');
const report = fs.readFileSync('native-dist/pages/referee-report/index.js', 'utf8');
const reportWxml = fs.readFileSync('native-dist/pages/referee-report/index.wxml', 'utf8');

assert.ok(detail.includes('homeSnapshot.logo') && detail.includes('awaySnapshot.logo'), '赛事进入计分板时应带入球队快照队徽');
assert.ok(board.includes("tournamentName: active.tournamentName || ''"), '比赛记录应保留赛事名称');
assert.ok(report.includes('wx.shareFileMessage'), '正式比赛报告应支持微信文件分享');
assert.ok(report.includes('/pages/tournament-detail/index?id='), '赛事报告应能返回对应赛事详情');
assert.ok(reportWxml.includes('分享报告') && reportWxml.includes('{{backButtonText}}'), '报告页应展示分享与返回操作');

console.log('match report action tests passed');
