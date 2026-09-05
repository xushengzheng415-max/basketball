'use strict';

const assert = require('assert');
const fs = require('fs');

const page = fs.readFileSync('native-dist/pages/team-create/index.js', 'utf8');
const wxml = fs.readFileSync('native-dist/pages/team-create/index.wxml', 'utf8');
const functionSource = fs.readFileSync('cloudfunctions/sxUploadTeamLogo/index.js', 'utf8');

assert.ok(page.includes("name: 'sxUploadTeamLogo'"), '球队页面必须调用服务端队徽上传函数');
assert.ok(page.includes("encoding: 'base64'"), '队徽上传应以 base64 交给云函数');
assert.ok(!page.includes('cloudPath: `team-logos/'), '球队页面不应再直接上传队徽到云存储');
assert.ok(functionSource.includes('imgSecCheck'), '服务端应校验队徽内容安全');
assert.ok(functionSource.includes('team-logos/'), '服务端应写入队徽云存储路径');
assert.ok(page.includes('syncRosterAfterSave'), '球队本地保存后应独立处理云端同步');
assert.ok(page.includes('scheduleRosterPush(3000)'), '云端同步失败应安排后台重试');
assert.ok(page.includes('已保存，云端稍后同步'), '云端同步失败不应继续误报队徽失败');
assert.ok(page.includes('renderLogoEditorCanvas2d'), '队徽抠图应优先使用 Canvas 2D 节点');
assert.ok(wxml.includes('type="2d"'), '队徽编辑画布应声明 Canvas 2D 类型');
assert.ok(page.includes('form.logoFileID || this.data.form.logoUrl'), '保存队徽应优先使用云端 fileID');
assert.ok(page.includes('logoFileID: logoUrl'), '队徽确认后应同时保存云端 fileID');

console.log('team logo upload contract tests passed');
