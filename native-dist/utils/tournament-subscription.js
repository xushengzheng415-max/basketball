const TEMPLATE_IDS = {
  registration: 'ZaQx7FB2aJmEvlh0e9-iY85wzuBaZoDPUMDVB9favZs',
  review: 'jp0LDnCgS6w5xyLSJQyLnOuilLV94MNAtzvQtuGw8XE'
};

function isAccepted(value) {
  return value === 'accept' || value === 'acceptWithAudio';
}

function requestTournamentSubscription(type) {
  const templateId = TEMPLATE_IDS[type];
  if (!templateId || !wx.requestSubscribeMessage) return Promise.resolve(false);
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success(result) { resolve(isAccepted(result && result[templateId])); },
      fail() { resolve(false); }
    });
  });
}

module.exports = { TEMPLATE_IDS, requestTournamentSubscription };
