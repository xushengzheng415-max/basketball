function callCloud(name, data) {
  if (!wx.cloud) {
    return Promise.resolve({ ok: false, skipped: true, message: 'wx.cloud unavailable' });
  }
  return wx.cloud.callFunction({ name, data }).then((res) => res.result || res).catch((error) => {
    console.warn(`[cloud] ${name} failed`, error);
    return { ok: false, error };
  });
}

module.exports = { callCloud };