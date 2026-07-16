const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function cleanList(value) {
  return Array.isArray(value) ? value.slice(0, 1000) : [];
}

function normalizeRoster(value) {
  const roster = value && typeof value === 'object' ? value : {};
  return {
    teams: cleanList(roster.teams),
    teamDrafts: cleanList(roster.teamDrafts),
    teamCategories: cleanList(roster.teamCategories),
    players: cleanList(roster.players),
    version: Number(roster.version || Date.now())
  };
}

function collectCloudFileIDs(roster) {
  const ids = new Set();
  const add = (value) => {
    const fileID = String(value || '').trim();
    if (fileID.startsWith('cloud://')) ids.add(fileID);
  };
  const addTeam = (team) => {
    if (!team) return;
    [team.logoFileID, team.logoUrl, team.teamLogoFileID, team.teamLogo, team.logo].forEach(add);
  };
  cleanList(roster.teams).forEach(addTeam);
  cleanList(roster.teamDrafts).forEach(addTeam);
  cleanList(roster.teamCategories).forEach(addTeam);
  cleanList(roster.players).forEach((player) => {
    if (!player) return;
    [
      player.avatarFileID,
      player.avatar,
      player.avatarUrl,
      player.photo,
      player.photoUrl,
      player.image,
      player.imageUrl,
      player.profilePhoto
    ].forEach(add);
    [player.teamLogoFileID, player.teamLogo, player.logoFileID, player.logoUrl].forEach(add);
  });
  return Array.from(ids);
}

async function getImageUrls(roster) {
  const fileIDs = collectCloudFileIDs(roster);
  const imageUrls = {};
  for (let index = 0; index < fileIDs.length; index += 50) {
    const result = await cloud.getTempFileURL({ fileList: fileIDs.slice(index, index + 50) });
    cleanList(result && result.fileList).forEach((item) => {
      if (item && item.fileID && item.tempFileURL) imageUrls[item.fileID] = item.tempFileURL;
    });
  }
  return imageUrls;
}

async function getOrCreateUser(openid, unionid) {
  const users = await db.collection('sx_users').where({ openid }).limit(1).get();
  if (users.data && users.data.length) return users.data[0];
  const now = db.serverDate();
  const created = await db.collection('sx_users').add({
    data: {
      openid,
      unionid: unionid || '',
      nickName: '\u5fae\u4fe1\u7528\u6237',
      avatarUrl: '',
      mode: 'wechat',
      createdAt: now,
      updatedAt: now
    }
  });
  return { _id: created._id, openid, unionid: unionid || '', avatarUrl: '' };
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { ok: false, code: 'NO_OPENID', message: '\u672a\u83b7\u53d6\u5230\u5fae\u4fe1\u8eab\u4efd\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55' };
  const user = await getOrCreateUser(openid, wxContext.UNIONID || '');

  if (event.action === 'profile') {
    const avatarFileID = String(user.avatarUrl || '');
    const urls = avatarFileID.startsWith('cloud://')
      ? await cloud.getTempFileURL({ fileList: [avatarFileID] })
      : { fileList: [] };
    const avatarItem = cleanList(urls.fileList)[0] || {};
    return {
      ok: true,
      action: 'profile',
      profile: {
        userId: user._id,
        wxOpenId: openid,
        wxUnionId: user.unionid || '',
        nickName: user.nickName || '\u5fae\u4fe1\u7528\u6237',
        avatarUrl: avatarFileID,
        avatarDisplayUrl: avatarItem.tempFileURL || avatarFileID,
        phoneNumber: user.phoneNumber || '',
        mode: user.mode || 'wechat',
        loggedIn: true
      }
    };
  }
  if (event.action === 'push') {
    const roster = normalizeRoster(event.roster);
    await db.collection('sx_users').doc(user._id).update({
      data: {
        roster,
        rosterUpdatedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    return { ok: true, action: 'push', userId: user._id, phoneNumber: user.phoneNumber || '', roster };
  }

  const roster = user.roster ? normalizeRoster(user.roster) : null;

  return {
    ok: true,
    action: 'pull',
    userId: user._id,
    phoneNumber: user.phoneNumber || '',
    roster,
    imageUrls: roster ? await getImageUrls(roster) : {}
  };
};
