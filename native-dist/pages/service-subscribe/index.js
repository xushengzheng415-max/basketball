const { callCloud } = require('../../utils/cloud');

Page({
  data: { subscribeUrl: '' },
  onLoad(options = {}) {
    const role = options.role === 'creator' ? 'creator' : 'participant';
    const eventId = String(options.eventId || '').trim();
    this.setData({ subscribeUrl: `https://www.sxfbasketball.cn/service-subscribe.html?v=202608221900&role=${role}&eventId=${encodeURIComponent(eventId)}` });
  },
  onSubscribeMessage(event) {
    const messages = event && event.detail && Array.isArray(event.detail.data) ? event.detail.data : [];
    const payload = messages.slice().reverse().find((item) => item && item.type === 'service-notification-grants');
    if (!payload || !payload.grants) return;
    wx.setStorageSync('sxfPendingServiceNotificationGrants', payload.grants);
    callCloud('sxTournamentNotification', { action: 'recordAuthorization', grants: payload.grants }).then((result) => {
      if (result && result.ok) wx.removeStorageSync('sxfPendingServiceNotificationGrants');
    }).catch((error) => console.warn('[service-subscribe] grant sync failed', error));
  }
});
