const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async (event = {}) => {
  const context = cloud.getWXContext();
  const response = await cloud.callFunction({ name: 'sxMatchFlow', data: Object.assign({}, event, { domain: event.domain || 'staff', _callerOpenid: context.FROM_OPENID || context.OPENID || '', _callerUnionid: context.FROM_UNIONID || context.UNIONID || '' }) });
  return response && response.result ? response.result : response;
};
