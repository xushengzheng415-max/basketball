'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const originalLoad = Module._load;

// Unit tests only exercise pure education rules. Stub the CloudBase SDK so the
// contract tests can run before cloud-function dependencies are installed.
Module._load = function load(request, parent, isMain) {
  if (request === 'wx-server-sdk') {
    return {
      DYNAMIC_CURRENT_ENV: 'test',
      init() {},
      getWXContext() { return {}; },
      database() { return { command: {} }; }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const education = require('../cloudfunctions/sxEducationCore/index.js')._test;
Module._load = originalLoad;

assert.strictEqual(education.normalizeUnitMinutes(60), 60);
assert.strictEqual(education.normalizeUnitMinutes(90), 90);
assert.throws(() => education.normalizeUnitMinutes(45));

assert.strictEqual(education.unitsFromMinutes(60, 60), 1);
assert.strictEqual(education.unitsFromMinutes(90, 60), 1.5);
assert.strictEqual(education.unitsFromMinutes(90, 90), 1);
assert.strictEqual(education.unitsFromMinutes(60, 90), 0.67);

assert.strictEqual(education.defaultConsumptionMinutes('present', 90), 90);
assert.strictEqual(education.defaultConsumptionMinutes('leave', 90), 0);
assert.strictEqual(education.defaultConsumptionMinutes('absent', 60), 60);
assert.strictEqual(education.defaultConsumptionMinutes('trial', 60), 0);
assert.strictEqual(education.defaultConsumptionMinutes('absent', 60, { absent: false }), 0);

const ratings = { attitude: 5, focus: 4, skill: 4, fitness: 3, teamwork: 5 };
assert.deepStrictEqual(education.normalizeRatings(ratings), ratings);
assert.throws(() => education.normalizeRatings({ attitude: 5 }));
assert.match(education.composeEvaluation('小蜂', ratings, ['专注积极', '团队协作']), /小蜂/);

const projectRoot = path.resolve(__dirname, '..');
const coreSource = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/sxEducationCore/index.js'), 'utf8');
const publicSource = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/sxEducationPublic/index.js'), 'utf8');
const qrSource = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/sxCreateTournamentQrCode/index.js'), 'utf8');
for (const collection of ['sx_education_courses', 'sx_edu_invites', 'sx_edu_notice_logs']) assert(coreSource.includes(collection), `missing ${collection}`);
assert(coreSource.includes("domain === 'course'"), 'course domain is not routed');
assert(coreSource.includes("action === 'inviteAccept'"), 'coach invite acceptance is missing');
assert(coreSource.includes("action === 'gateQrRefresh'"), 'student gate background QR refresh is missing');
assert(coreSource.includes('lessonConflicts'), 'schedule conflict check is missing');
assert(publicSource.includes('guardianPlatformUserId'), 'guardian ownership boundary is missing');
assert(publicSource.includes("confirmationStatus: 'pending'"), 'guardian submission must remain pending');
assert(qrSource.includes('educationCoach'), 'education coach QR mode is missing');
assert(!/sx_(tournaments|match_tasks|match_rosters)/.test(publicSource), 'education public API must not access tournament collections');

console.log('education core tests passed');
