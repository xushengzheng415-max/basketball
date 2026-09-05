(() => {
  'use strict';
  const PC_AUTH_API = 'https://sxf-basketball-d9gp6yt0rd1f7be4d.service.tcloudbase.com/api/pc-auth';
  const card = document.querySelector('.callback-card');
  const title = document.getElementById('callbackTitle');
  const detail = document.getElementById('callbackDetail');

  function fail(message) {
    card.classList.add('error');
    title.textContent = '微信登录未完成';
    detail.textContent = message || '请回到PC端刷新二维码后重试。';
  }

  async function confirmWechatLogin() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || '';
    const state = params.get('state') || '';
    if (!code || !state) { fail('未获得微信授权，请回到PC端重新扫码。'); return; }
    try {
      const response = await fetch(PC_AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wechatCallback', code, state })
      });
      const result = await response.json();
      if (!result?.ok) throw new Error(result?.message || result?.error || '微信身份确认失败');
      title.textContent = '微信登录已确认';
      detail.textContent = '请回到PC，系统正在进入赛小蜂篮球工作台。';
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'sxf-wechat-login-confirmed' }, window.location.origin);
    } catch (error) { fail(error.message); }
  }

  confirmWechatLogin();
})();
