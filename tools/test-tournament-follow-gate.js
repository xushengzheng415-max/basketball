'use strict';

const assert = require('assert');
const fs = require('fs');

const registration = fs.readFileSync('native-dist/pages/tournament-register/index.js', 'utf8');
const notification = fs.readFileSync('cloudfunctions/sxTournamentNotification/index.js', 'utf8');

assert.ok(registration.includes('function followGateErrorText'), '服务号关注错误应转换为面向用户的提示');
assert.ok(registration.includes('更新服务号 AppSecret'), '无效服务号密钥应给出明确修复方向');
assert.ok(notification.includes('SXF_SERVICE_ACCOUNT_APPSECRET'), '关注二维码应只使用服务号凭据');

console.log('tournament follow gate tests passed');
