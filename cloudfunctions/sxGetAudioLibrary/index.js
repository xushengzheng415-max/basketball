const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function groupItems(items) {
  return items.reduce((map, item) => {
    const channel = item.channel || '';
    const fileID = item.fileID || item.fileId || '';
    if (!channel || !fileID) return map;
    if (!map[channel]) map[channel] = [];
    map[channel].push(fileID);
    return map;
  }, {});
}

exports.main = async () => {
  let result = { data: [] };
  try {
    result = await db.collection('sx_mc_audio_library')
      .where({ status: 'active' })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
  } catch (error) {
    console.warn('[sxGetAudioLibrary] sx_mc_audio_library unavailable', error);
  }

  const items = result.data || [];
  return {
    ok: true,
    items,
    audioMap: groupItems(items)
  };
};
