const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'wx-server-sdk') {
    return {
      DYNAMIC_CURRENT_ENV: 'test',
      init() {},
      getWXContext() { return { OPENID: 'test-openid', UNIONID: 'test-unionid' }; },
      database() { return { command: {}, collection() { throw new Error('database access is not part of contract tests'); } }; }
    };
  }
  return originalLoad(request, parent, isMain);
};

const corePath = path.join(root, 'cloudfunctions', 'sxCollaboration', 'index.js');
const core = require(corePath);
Module._load = originalLoad;

assert.strictEqual(core._test.clean('  abc  ', 10), 'abc');
assert.strictEqual(core._test.clean('abcdef', 3), 'abc');
assert.strictEqual(core._test.hash('same'), core._test.hash('same'));
assert.notStrictEqual(core._test.hash('same'), core._test.hash('other'));
assert.strictEqual(core._test.collaborationEnabled({}), false, 'collaboration must be disabled by default');
assert.strictEqual(core._test.collaborationEnabled({ organizationId: 'client-supplied-org' }), false, 'client organization id must not enable collaboration');

const wrappers = {
  sxIdentityGateway: 'identity', sxPcAuth: 'pcAuth', sxOrganizationAccess: 'identity',
  sxMatchTask: 'matchTask', sxMatchNotification: 'notification', sxMatchRoster: 'roster',
  sxMatchStaff: 'staff', sxStatAssignment: 'statAssignment', sxMatchReadiness: 'readiness'
};
Object.entries(wrappers).forEach(([name, domain]) => {
  const source = fs.readFileSync(path.join(root, 'cloudfunctions', name, 'index.js'), 'utf8');
  const defaultRoute = new RegExp(`domain\\s*:\\s*(?:event\\.domain\\s*\\|\\|\\s*)?["']${domain}["']`);
  assert(defaultRoute.test(source), `${name} must route to ${domain}`);
});

const config = JSON.parse(fs.readFileSync(path.join(root, 'cloudbaserc.json'), 'utf8'));
const configured = new Set(config.functions.map((item) => item.name));
['sxCollaboration', ...Object.keys(wrappers)].forEach((name) => assert(configured.has(name), `${name} missing from cloudbaserc.json`));

const homeJs = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'home', 'index.js'), 'utf8');
const homeWxml = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'home', 'index.wxml'), 'utf8');
const tournamentAdmin = fs.readFileSync(path.join(root, 'admin', 'tournament-center.js'), 'utf8');
assert(homeJs.includes("domain: 'matchTask'"), 'home must request match tasks');
assert(homeWxml.includes('match-task-card'), 'home task card missing');
assert(homeWxml.includes('task-center-sheet'), 'home task center missing');
assert(homeWxml.includes('roster-editor-sheet'), 'home roster editor missing');
assert(homeWxml.includes('task-empty-card'), 'home task empty state missing');
assert(!homeWxml.includes('growth-entry'), 'home task slot must not fall back to the growth advertisement');
assert(homeJs.includes("domain: 'roster'"), 'team roster task must be handled from home');
const homeTaskFlow = homeJs.slice(homeJs.indexOf('openHomeTask()'), homeJs.indexOf('goLogin()'));
assert(!homeTaskFlow.includes('/pages/tournament/'), 'home task flow must not use the tournament tab page');
assert(!homeTaskFlow.includes('/pages/team/'), 'home task flow must not use the player tab page');
assert(!/{{[^}]*\?[^}]*:.*}}/.test(homeWxml), 'home WXML contains a complex ternary expression');
const collaborationSource = fs.readFileSync(corePath, 'utf8');
assert(collaborationSource.includes('requireMatchTaskAccess'), 'team task writes must verify match scope');
assert(collaborationSource.includes('allowedOrganizationIds'), 'allowlisted organizations must load tasks without a client-supplied organization id');
assert(tournamentAdmin.includes("'send-access-notifications'"), 'PC one-click notification action missing');
assert(tournamentAdmin.includes("'confirm-send-access-notifications'"), 'PC notification confirmation action missing');
assert(tournamentAdmin.includes("['official_account', 'mini_subscription', 'wechat_share']"), 'three-channel notification contract missing');
assert(!/sms/i.test(tournamentAdmin.slice(tournamentAdmin.indexOf("action === 'send-access-notifications'"), tournamentAdmin.indexOf("action === 'confirm-bind-referee'"))), 'notification flow must not include SMS');

console.log('Collaboration contract tests passed.');
