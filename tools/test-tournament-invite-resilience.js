'use strict';

const assert = require('assert');
const fs = require('fs');

const page = fs.readFileSync('native-dist/pages/tournament-detail/index.js', 'utf8');
const wxml = fs.readFileSync('native-dist/pages/tournament-detail/index.wxml', 'utf8');

assert.ok(page.includes('loadInviteQr(result.inviteKey)'), '邀请码生成后应异步加载二维码');
assert.ok(page.includes("Promise.race([request, timeout])"), '二维码请求应有超时保护');
assert.ok(page.includes('return this.loadInviteQr().then(() => this.getPosterQrPath())'), '海报应在二维码尚未完成时自动等待二维码');
assert.ok(wxml.includes('不影响转发和复制邀请码'), '二维码加载慢时应明确提供可用邀请方式');
assert.ok(page.includes('function inviteQrErrorText'), '二维码配置错误应转换为面向用户的提示');
assert.ok(page.includes('getPosterCanvasNode'), '邀请海报应使用 Canvas 2D 节点导出');
assert.ok(wxml.includes('type="2d"'), '邀请海报画布应声明 Canvas 2D 类型');

console.log('tournament invite resilience tests passed');
