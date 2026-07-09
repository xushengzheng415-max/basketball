const STORAGE_KEYS = ['teams', 'teamDrafts', 'teamCategories', 'players'];

let syncing = null;
let pushTimer = null;

function readList(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function getLocalRoster() {
  return {
    teams: readList('teams'),
    teamDrafts: readList('teamDrafts'),
    teamCategories: readList('teamCategories'),
    players: readList('players'),
    version: Date.now()
  };
}

function hasRosterData(roster) {
  return STORAGE_KEYS.some((key) => Array.isArray(roster && roster[key]) && roster[key].length > 0);
}

function saveLocalRoster(roster) {
  if (!roster || typeof roster !== 'object') return;
  STORAGE_KEYS.forEach((key) => {
    wx.setStorageSync(key, Array.isArray(roster[key]) ? roster[key] : []);
  });
  wx.setStorageSync('rosterCloudSyncedAt', Date.now());
}

function callSync(action, roster) {
  if (!wx.cloud) return Promise.reject(new Error('云开发尚未初始化'));
  return wx.cloud.callFunction({
    name: 'sxSyncRoster',
    data: action === 'push' ? { action, roster } : { action }
  }).then((response) => {
    const result = response && response.result ? response.result : {};
    if (!result.ok) throw new Error(result.message || '阵容同步失败');
    return result;
  });
}

function pullRoster() {
  if (syncing) return syncing;
  syncing = callSync('pull')
    .then((result) => {
      if (result.roster && hasRosterData(result.roster)) {
        saveLocalRoster(result.roster);
        return { source: 'cloud', roster: result.roster };
      }
      const localRoster = getLocalRoster();
      if (hasRosterData(localRoster)) {
        return callSync('push', localRoster).then(() => ({ source: 'local', roster: localRoster }));
      }
      return { source: 'empty', roster: localRoster };
    })
    .finally(() => { syncing = null; });
  return syncing;
}

function pushRoster() {
  return callSync('push', getLocalRoster());
}

function scheduleRosterPush(delay) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushRoster().catch((error) => console.warn('[roster-sync] push failed', error));
  }, typeof delay === 'number' ? delay : 300);
}

module.exports = { getLocalRoster, pullRoster, pushRoster, saveLocalRoster, scheduleRosterPush };
