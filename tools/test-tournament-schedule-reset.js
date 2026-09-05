'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cloudSource = fs.readFileSync(path.join(root, 'cloudfunctions', 'sxTournamentLeague', 'index.js'), 'utf8');
const pageSource = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'tournament-detail', 'index.js'), 'utf8');

assert.ok(cloudSource.includes('async function resetPublishedMatches(eventId)'), '应提供重新发布对阵的云端重置入口');
assert.ok(!cloudSource.includes('已有进行中或已结束比赛，不能重新生成对阵'), '进行中或已结束的旧对阵不应阻止重新发布');
[
  'sx_match_preparations',
  'sx_match_referee_invites',
  'sx_match_rosters',
  'sx_match_live_states',
  'sx_match_substitutions',
  'sx_match_timeout_requests',
  'sx_match_tactics',
  'sx_match_results'
].forEach((collection) => assert.ok(cloudSource.includes(collection), `重新发布应清理 ${collection}`));
assert.ok(cloudSource.indexOf('const reset = await resetPublishedMatches') < cloudSource.indexOf("matchId: id('match')"), '必须先重置旧对阵，再创建新对阵');
assert.ok(pageSource.includes('之前的所有比赛数据、比分和赛果将全部清空作废'), '重新发布前应显示明确的数据作废提示');
assert.ok(pageSource.includes("confirmText: replacingSchedule ? '清空并发布'"), '破坏性确认按钮应明确说明清空行为');

console.log('tournament schedule reset tests passed');
