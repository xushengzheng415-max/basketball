const { callCloud } = require('../../utils/cloud');

Page({
  data: { status: '请扫描PC端显示的登录二维码', detail: '登录后可在PC端完成组织开户和工作面板选择。', loading: false, challengeId: '', fromMiniProgramCode: false },
  onLoad(options = {}) {
    const rawChallengeId = String(options.scene || options.challengeId || '').trim();
    if (!rawChallengeId) return;
    let challengeId = '';
    try { challengeId = decodeURIComponent(rawChallengeId).trim(); } catch (_) { challengeId = ''; }
    if (!/^[A-Za-z0-9_-]+$/.test(challengeId)) {
      this.setData({ status: '登录二维码无效', detail: '请回到PC端刷新二维码后重新扫描。' });
      return;
    }
    this.setData({ challengeId, fromMiniProgramCode: true, status: '已打开PC登录确认', detail: '请确认是否允许这台电脑登录你的赛小蜂篮球组织工作台。' });
  },
  async confirmLogin(challengeId) {
    if (!challengeId || this.data.loading) return;
    this.setData({ loading: true, status: '正在确认PC登录…', detail: '请稍候，不要关闭此页面。' });
    const response = await callCloud('sxPcAuth', { action: 'confirmChallenge', challengeId });
    if (response && response.ok) this.setData({ status: 'PC登录确认成功', detail: '请回到电脑继续完成身份和组织资料登记。', loading: false, challengeId: '' });
    else {
      const error = response && response.error;
      const message = typeof error === 'string' ? error : (error && (error.message || error.errMsg));
      this.setData({ status: '登录确认失败', detail: message || '二维码可能已失效，请刷新PC端二维码。', loading: false });
    }
  },
  confirmCurrentLogin() {
    this.confirmLogin(this.data.challengeId);
  },
  scanCode() {
    if (this.data.loading) return;
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: async (result) => {
        const raw = String(result.result || '');
        const matched = raw.match(/^SXFPC\|([A-Za-z0-9_\-]+)$/);
        if (!matched) { this.setData({ status: '不是赛小蜂篮球PC登录二维码', detail: '请返回PC端刷新二维码后重新扫描。' }); return; }
        this.setData({ challengeId: matched[1], fromMiniProgramCode: false, status: '已识别PC登录请求', detail: '请确认是否允许这台电脑登录你的组织工作台。' });
      },
      fail: () => this.setData({ status: '未完成扫码', detail: '请允许相机权限后重新尝试。' })
    });
  }
});
