'use strict';

const https = require('https');

let cachedToken = '';
let cachedTokenExpiresAt = 0;

function portraitError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 20000
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          const data = JSON.parse(text || '{}');
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(portraitError('HTTP_ERROR', `百度人像分割 HTTP ${response.statusCode}`));
            return;
          }
          resolve(data);
        } catch (error) {
          reject(portraitError('INVALID_RESPONSE', '百度人像分割返回格式错误'));
        }
      });
    });
    request.on('timeout', () => request.destroy(portraitError('TIMEOUT', '百度人像分割请求超时')));
    request.on('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function credentials(environment) {
  const apiKey = String(environment.BAIDU_AIP_API_KEY || '').trim();
  const secretKey = String(environment.BAIDU_AIP_SECRET_KEY || '').trim();
  if (!apiKey || !secretKey) throw portraitError('MISSING_CONFIG', '百度人像抠图服务未配置');
  return { apiKey, secretKey };
}

async function getAccessToken(environment, requester = requestJson) {
  if (cachedToken && cachedTokenExpiresAt > Date.now() + 60000) return cachedToken;
  const { apiKey, secretKey } = credentials(environment);
  const url = 'https://aip.baidubce.com/oauth/2.0/token?' + new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: apiKey,
    client_secret: secretKey
  }).toString();
  const response = await requester(url, { method: 'POST' });
  if (!response.access_token) throw portraitError('AUTH_FAILED', '百度人像抠图授权失败');
  cachedToken = String(response.access_token);
  cachedTokenExpiresAt = Date.now() + Math.max(60, Number(response.expires_in || 2592000) - 120) * 1000;
  return cachedToken;
}

function decodeForeground(value) {
  const body = String(value || '').replace(/^data:[^,]+,/, '');
  if (!body) throw portraitError('EMPTY_RESULT', '百度人像分割未返回透明图片');
  const buffer = Buffer.from(body, 'base64');
  if (!buffer.length) throw portraitError('EMPTY_RESULT', '百度人像分割结果为空');
  return buffer;
}

async function segmentPortrait(buffer, environment, requester = requestJson) {
  if (!buffer || !buffer.length) throw portraitError('EMPTY_IMAGE', '头像图片为空');
  const accessToken = await getAccessToken(environment, requester);
  const body = new URLSearchParams({
    image: buffer.toString('base64'),
    type: 'foreground'
  }).toString();
  const response = await requester(`https://aip.baidubce.com/rest/2.0/image-classify/v1/body_seg?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (response.error_code) throw portraitError('BAIDU_API_ERROR', `百度人像分割失败：${response.error_msg || response.error_code}`);
  return {
    buffer: decodeForeground(response.foreground),
    personNum: Number(response.person_num || 0),
    logId: String(response.log_id || '')
  };
}

function resetTokenCache() {
  cachedToken = '';
  cachedTokenExpiresAt = 0;
}

module.exports = { decodeForeground, getAccessToken, resetTokenCache, segmentPortrait };
