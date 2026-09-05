const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async (event = {}) => {
  let body = {};
  if (event.body && typeof event.body === 'string') {
    try { body = JSON.parse(event.body); } catch (_) { body = {}; }
  } else if (event.body && typeof event.body === 'object') body = event.body;
  const response = await cloud.callFunction({ name: 'sxCollaboration', data: Object.assign({}, event, body, { domain: 'pcAuth' }) });
  return response && response.result ? response.result : response;
};
