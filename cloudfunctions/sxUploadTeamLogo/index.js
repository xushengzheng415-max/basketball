'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function decodeBase64(value) {
  const body = String(value || '').replace(/^data:[^,]+,/, '');
  if (!body) return null;
  try { return Buffer.from(body, 'base64'); } catch (error) { return null; }
}

function normalizeExt(ext) {
  const clean = String(ext || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'jpg' || clean === 'jpeg') return 'jpg';
  if (clean === 'webp') return 'webp';
  return clean === 'png' ? 'png' : 'jpg';
}

function detectImageExt(image) {
  if (!Buffer.isBuffer(image) || image.length < 3) return '';
  const head = image.slice(0, 12);
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return 'png';
  }
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'jpg';
  }
  if (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return '';
}

function contentType(ext) {
  return String(ext || '').toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;
  const requestedExt = normalizeExt(event.ext || 'png');
  const image = decodeBase64(event.base64);
  if (!image || !image.length) return { ok: false, error: '队徽图片为空，请重新处理后上传' };
  if (image.length > 3.5 * 1024 * 1024) return { ok: false, error: '队徽文件过大，请缩小图片后重试' };
  const extension = detectImageExt(image) || requestedExt;
  try {
    const enableSecCheck = String(process.env.SXF_TEAM_LOGO_SEC_CHECK || '').trim() === '1';
    if (enableSecCheck && openid) {
      await cloud.openapi.security.imgSecCheck({
        media: { contentType: contentType(extension), value: image },
        version: 2,
        openid,
        scene: 2
      });
    }
    const cloudPath = `team-logos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    const upload = await cloud.uploadFile({ cloudPath, fileContent: image });
    if (!upload || !upload.fileID) throw new Error('云存储未返回队徽文件 ID');
    return { ok: true, fileID: upload.fileID };
  } catch (error) {
    const isSecurityError = error && (error.errCode === 87014 || String(error.errMsg || '').includes('risky') || String(error.errMsg || '').includes('内容'));
    console.warn('[sxUploadTeamLogo] failed', {
      code: error && error.errCode || '',
      message: error && error.message || '',
      hasOpenId: !!openid,
      ext: extension,
      size: image && image.length
    });
    return { ok: false, error: isSecurityError ? '队徽内容不符合规范，请更换图片' : '队徽云端保存失败，请重试' };
  }
};
