'use strict';

const assert = require('assert');
const fs = require('fs');

const teamPage = fs.readFileSync('native-dist/pages/team/index.js', 'utf8');
const teamWxml = fs.readFileSync('native-dist/pages/team/index.wxml', 'utf8');
const playerPage = fs.readFileSync('native-dist/pages/player-add/index.js', 'utf8');
const teamCreatePage = fs.readFileSync('native-dist/pages/team-create/index.js', 'utf8');

assert.ok(teamPage.includes('getActiveTeamContext'), '球员库应能识别当前球队筛选上下文');
assert.ok(teamPage.includes('teamKey=${encodeURIComponent'), '从球队筛选添加球员时应传递球队标识');
assert.ok(teamPage.includes("category === 'assigned'"), '已分队摘要应能筛选球员');
assert.ok(teamPage.includes("category === 'unassigned'"), '未分队摘要应能筛选球员');
assert.ok(teamWxml.includes('data-filter="assigned"') && teamWxml.includes('data-filter="unassigned"'), '分队摘要入口应可点击');
assert.ok(teamWxml.includes('class="team-row clickable"'), '球员所属球队行应可点击编辑');
assert.ok(playerPage.includes('requestedTeamKey'), '球员编辑页应接收预选球队');
assert.ok(playerPage.includes('applyRequestedTeam'), '球员编辑页应自动绑定入口球队');
assert.ok(playerPage.includes('[player].concat(storedPlayers)'), '新建球员应写入本地列表最前面');
assert.ok(teamPage.includes('function newestFirst'), '球员库应按创建时间倒序展示');
assert.ok(teamCreatePage.includes('[category].concat(list)'), '新建球队标签应排在最前面');

console.log('team player assignment tests passed');
