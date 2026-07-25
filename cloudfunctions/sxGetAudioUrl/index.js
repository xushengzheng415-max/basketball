const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event = {}) => {
  const requested = Array.isArray(event.fileList) ? event.fileList : [event.fileID];
  const fileList = Array.from(new Set(requested
    .map((item) => String(item || '').trim())
    .filter((item) => item.startsWith('cloud://'))))
    .slice(0, 50);
  if (!fileList.length) {
    return { ok: false, code: 'invalid_file_id', message: '音频 fileID 无效' };
  }

  try {
    const result = await cloud.getTempFileURL({ fileList });
    const resolved = (result.fileList || []).filter((item) => item && item.tempFileURL);
    const item = resolved[0];
    if (!item) {
      return { ok: false, code: 'temp_url_failed', message: item && item.errMsg ? item.errMsg : '音频临时地址生成失败', item };
    }
    return {
      ok: true,
      fileID: item.fileID,
      tempFileURL: item.tempFileURL,
      fileList: resolved
    };
  } catch (error) {
    console.error('[sxGetAudioUrl] failed', error);
    return { ok: false, code: error.code || 'cloud_error', message: error.message || '音频临时地址生成失败' };
  }
};
