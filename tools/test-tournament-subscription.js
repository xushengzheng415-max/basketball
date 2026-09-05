'use strict';

const assert = require('assert');
const fs = require('fs');

const subscription = fs.readFileSync('native-dist/utils/tournament-subscription.js', 'utf8');
const registration = fs.readFileSync('native-dist/pages/tournament-register/index.js', 'utf8');
const detail = fs.readFileSync('native-dist/pages/tournament-detail/index.js', 'utf8');

assert.ok(subscription.includes('ZaQx7FB2aJmEvlh0e9-iY85wzuBaZoDPUMDVB9favZs'), '应配置创建方报名提醒模板');
assert.ok(subscription.includes('jp0LDnCgS6w5xyLSJQyLnOuilLV94MNAtzvQtuGw8XE'), '应配置球队审核结果模板');
assert.ok(registration.includes("requestTournamentSubscription('review')"), '报名提交前应请求审核结果通知授权');
assert.ok(registration.includes('followRequired: false'), '服务号关注不应阻塞报名，小程序订阅授权才是报名门槛');
assert.ok(detail.includes("requestTournamentSubscription('registration')"), '生成邀请前应请求报名提醒授权');

console.log('tournament subscription tests passed');
