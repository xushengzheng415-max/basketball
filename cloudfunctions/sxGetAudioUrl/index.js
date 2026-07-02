const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event = {}) => {
  const fileID = String(event.fileID || '').trim();
  if (!fileID || !fileID.startsWith('cloud://')) {
    return { ok: false, code: 'invalid_file_id', message: '音频 fileID 无效' };
  }

  try {
    const result = await cloud.getTempFileURL({ fileList: [fileID] });
    const item = result.fileList && result.fileList[0];
    if (!item || item.status !== 0 || !item.tempFileURL) {
      return { ok: false, code: 'temp_url_failed', message: item && item.errMsg ? item.errMsg : '音频临时地址生成失败', item };
    }
    return { ok: true, fileID, tempFileURL: item.tempFileURL };
  } catch (error) {
    console.error('[sxGetAudioUrl] failed', error);
    return { ok: false, code: error.code || 'cloud_error', message: error.message || '音频临时地址生成失败' };
  }
};
