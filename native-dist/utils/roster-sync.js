const STORAGE_KEYS = ['teams', 'teamDrafts', 'teamCategories', 'players'];
const IMAGE_URLS_KEY = 'rosterImageUrls';

let syncing = null;
let pushTimer = null;

function readList(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function preferCloudFile() {
  const values = Array.prototype.slice.call(arguments).map((value) => String(value || '')).filter(Boolean);
  return values.find((value) => value.startsWith('cloud://')) || values[0] || '';
}

function restoreTeamFileID(team) {
  if (!team) return team;
  const logoUrl = preferCloudFile(team.logoUrl, team.logoFileID, team.teamLogo, team.teamLogoFileID);
  return Object.assign({}, team, { logoFileID: logoUrl, logoUrl });
}

function restorePlayerFileIDs(player) {
  if (!player) return player;
  const avatar = preferCloudFile(player.avatar, player.avatarFileID);
  const teamLogo = preferCloudFile(player.teamLogo, player.teamLogoFileID);
  return Object.assign({}, player, {
    avatarFileID: avatar,
    avatar,
    teamLogoFileID: teamLogo,
    teamLogo
  });
}

function getLocalRoster() {
  return {
    teams: readList('teams').map(restoreTeamFileID),
    teamDrafts: readList('teamDrafts').map(restoreTeamFileID),
    teamCategories: readList('teamCategories').map(restoreTeamFileID),
    players: readList('players').map(restorePlayerFileIDs),
    version: Date.now()
  };
}

function hasRosterData(roster) {
  return STORAGE_KEYS.some((key) => Array.isArray(roster && roster[key]) && roster[key].length > 0);
}

function saveImageUrls(imageUrls) {
  wx.setStorageSync(IMAGE_URLS_KEY, imageUrls && typeof imageUrls === 'object' ? imageUrls : {});
}

function resolveImageUrl() {
  const source = preferCloudFile.apply(null, arguments);
  if (!source.startsWith('cloud://')) return source;
  const imageUrls = wx.getStorageSync(IMAGE_URLS_KEY) || {};
  return imageUrls[source] || source;
}

function decorateTeam(team, imageUrls) {
  if (!team) return team;
  const fileID = preferCloudFile(team.logoUrl, team.logoFileID, team.teamLogo, team.teamLogoFileID);
  if (!fileID) return team;
  return Object.assign({}, team, {
    logoFileID: fileID,
    logoUrl: imageUrls[fileID] || fileID
  });
}

function decoratePlayer(player, imageUrls) {
  if (!player) return player;
  const avatarFileID = preferCloudFile(player.avatar, player.avatarFileID);
  const teamLogoFileID = preferCloudFile(player.teamLogo, player.teamLogoFileID);
  return Object.assign({}, player, {
    avatarFileID,
    avatar: imageUrls[avatarFileID] || avatarFileID,
    teamLogoFileID,
    teamLogo: imageUrls[teamLogoFileID] || teamLogoFileID
  });
}

function saveLocalRoster(roster, imageUrls) {
  if (!roster || typeof roster !== 'object') return;
  const urls = imageUrls && typeof imageUrls === 'object' ? imageUrls : {};
  wx.setStorageSync('teams', (Array.isArray(roster.teams) ? roster.teams : []).map((item) => decorateTeam(item, urls)));
  wx.setStorageSync('teamDrafts', (Array.isArray(roster.teamDrafts) ? roster.teamDrafts : []).map((item) => decorateTeam(item, urls)));
  wx.setStorageSync('teamCategories', (Array.isArray(roster.teamCategories) ? roster.teamCategories : []).map((item) => decorateTeam(item, urls)));
  wx.setStorageSync('players', (Array.isArray(roster.players) ? roster.players : []).map((item) => decoratePlayer(item, urls)));
  saveImageUrls(urls);
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
        saveLocalRoster(result.roster, result.imageUrls);
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

module.exports = { getLocalRoster, pullRoster, pushRoster, resolveImageUrl, saveLocalRoster, scheduleRosterPush };
