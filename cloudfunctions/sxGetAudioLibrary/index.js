const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

function isHttpEvent(event) {
  return !!(event && (event.httpMethod || event.headers || event.requestContext || typeof event.body === 'string'));
}

function httpResponse(event, data, statusCode = 200) {
  if (!isHttpEvent(event)) return data;
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(data) };
}

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

async function buildUrlMap(items) {
  const fileList = Array.from(new Set((items || [])
    .map((item) => item && (item.fileID || item.fileId || ''))
    .filter((fileID) => String(fileID).startsWith('cloud://'))));
  if (!fileList.length) return {};
  try {
    const result = await cloud.getTempFileURL({ fileList });
    return (result.fileList || []).reduce((map, item) => {
      if (item && item.fileID && item.tempFileURL) map[item.fileID] = item.tempFileURL;
      return map;
    }, {});
  } catch (error) {
    console.warn('[sxGetAudioLibrary] audio URL signing skipped', error);
    return {};
  }
}

exports.main = async (event) => {
  if (event && event.httpMethod === 'OPTIONS') {
    return httpResponse(event, { ok: true });
  }

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
  const urlMap = await buildUrlMap(items);
  return httpResponse(event, {
    ok: true,
    items,
    audioMap: groupItems(items),
    urlMap
  });
};
