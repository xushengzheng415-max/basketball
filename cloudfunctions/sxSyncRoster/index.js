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

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const users = await db.collection('sx_users').where({ openid }).limit(1).get();

  if (!users.data || !users.data.length) {
    return { ok: false, code: 'USER_NOT_FOUND', message: '?????????????' };
  }

  const user = users.data[0];
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

  return {
    ok: true,
    action: 'pull',
    userId: user._id,
    phoneNumber: user.phoneNumber || '',
    roster: user.roster ? normalizeRoster(user.roster) : null
  };
};
