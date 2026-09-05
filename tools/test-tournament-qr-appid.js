'use strict';

const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('cloudfunctions/sxCreateTournamentQrCode/index.js', 'utf8');
const detailPage = fs.readFileSync('native-dist/pages/tournament-detail/index.js', 'utf8');

assert.ok(source.includes('SXF_BASKETBALL_APPSECRET'), '邀请二维码函数必须读取篮球小程序自己的 AppSecret');
assert.ok(source.includes('/wxa/getwxacodeunlimit?access_token='), '邀请二维码必须调用篮球小程序小程序码接口');
assert.ok(source.includes('wx06d735da15276acd'), '邀请二维码默认 AppID 必须是赛小蜂篮球');
assert.ok(!source.includes('cloud.openapi.wxacode.getUnlimited'), '邀请二维码不能继续使用共享足球环境的 openapi');
assert.ok(detailPage.includes('resolveInviteQrEnvVersion'), '赛事邀请页应按当前发布阶段选择二维码环境');
assert.ok(detailPage.includes("envVersion === 'release' ? 'release' : 'trial'"), '开发和体验阶段二维码应指向体验版');

console.log('tournament QR appid tests passed');
