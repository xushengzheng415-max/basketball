'use strict';

const cloud = require('wx-server-sdk');
const { segmentPortrait } = require('./portrait-segmentation');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function normalizeContentType(ext) {
  const lower = String(ext || '').toLowerCase();
  if (lower === 'png') return 'image/png';
  if (lower === 'bmp') return 'image/bmp';
  return 'image/jpeg';
}

function decodeBase64(base64) {
  const body = String(base64 || '').replace(/^data:[^,]+,/, '');
  if (!body) return null;
  try { return Buffer.from(body, 'base64'); } catch (error) { return null; }
}

function publicError(error) {
  if (error && error.code === 'MISSING_CONFIG') return '百度人像抠图服务未配置，请联系管理员';
  if (error && error.code === 'AUTH_FAILED') return '百度人像抠图授权失败，请联系管理员';
  if (error && error.code === 'EMPTY_RESULT') return '人像抠图没有生成结果，请更换照片';
  const isSecurityError = error && (
    error.errCode === 87014 ||
    String(error.errMsg || '').includes('risky') ||
    String(error.errMsg || '').includes('内容')
  );
  return isSecurityError ? '图片内容不符合规范，请更换头像' : '人像抠图失败，请重试';
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;
  const safeExt = String(event.ext || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const sourceBuffer = decodeBase64(event.base64);
  if (!sourceBuffer || !sourceBuffer.length) return { ok: false, error: '图片数据为空，请重新选择' };
  if (sourceBuffer.length > 3.5 * 1024 * 1024) return { ok: false, error: '头像过大，请重新裁剪后上传' };

  try {
    if (!event.internalEducationAvatar || openid) {
      await cloud.openapi.security.imgSecCheck({
        media: { contentType: normalizeContentType(safeExt), value: sourceBuffer },
        version: 2,
        openid,
        scene: 2
      });
    }

    const segmented = await segmentPortrait(sourceBuffer, process.env);
    const cloudPath = `player-avatars/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;
    const upload = await cloud.uploadFile({ cloudPath, fileContent: segmented.buffer });
    if (!upload || !upload.fileID) throw new Error('云存储未返回文件 ID');
    return {
      ok: true,
      fileID: upload.fileID,
      segmented: true,
      personNum: segmented.personNum,
      logId: segmented.logId
    };
  } catch (error) {
    console.warn('[sxUploadAvatar] failed', {
      code: error && error.code || '',
      message: error && error.message || '',
      logId: error && error.logId || ''
    });
    return { ok: false, error: publicError(error) };
  }
};
