'use strict';

const assert = require('assert');
const fs = require('fs');

const cloud = fs.readFileSync('cloudfunctions/sxTournamentLeague/index.js', 'utf8');
const detail = fs.readFileSync('native-dist/pages/tournament-detail/index.js', 'utf8');
const detailWxml = fs.readFileSync('native-dist/pages/tournament-detail/index.wxml', 'utf8');

assert.ok(cloud.includes('periodMinutes: integer(payload.periodMinutes, 10, 1, 30)'), '云端赛事应保存每节时长');
assert.ok(cloud.includes('periodCount: integer(payload.periodCount, 4, 1, 8)'), '云端赛事应保存比赛节数');
assert.ok(cloud.includes('已有比赛开始后不能修改比赛时长和节数'), '比赛开始后应锁定比赛设置');
assert.ok(detail.includes('saveMatchRules()'), '赛事管理应提供保存比赛设置的方法');
assert.ok(detail.includes('periodMinutes: Number(this.data.tournament.periodMinutes || 10)'), '进入计分板应带入赛事每节时长');
assert.ok(detail.includes('periods: Number(this.data.tournament.periodCount || 4)'), '进入计分板应带入赛事节数');
assert.ok(detailWxml.includes('比赛设置') && detailWxml.includes('每节时长') && detailWxml.includes('比赛节数'), '管理页应展示比赛节数和时长设置');

console.log('tournament match rule tests passed');
