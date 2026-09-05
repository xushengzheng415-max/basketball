const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async (event = {}) => {
  const response = await cloud.callFunction({ name: 'sxCollaboration', data: Object.assign({}, event, { domain: 'statAssignment' }) });
  return response && response.result ? response.result : response;
};
