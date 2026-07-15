const RECENT_MATCHES_KEY = 'sx_recent_matches';
const HERO_TEXTURE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/referee-report/background-report-hero-texture.png';
const U10_BADGE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/referee-report/badge-u10-elite.png';

function pad(value) { return String(value).padStart(2, '0'); }
function formatDateTime(value) {
  const date = new Date(Number(value) || Date.now());
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}
function safeSegment(value) { return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'match'; }
function makeReportNo(record) {
  const date = new Date();
  return 'RPT' + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) + '-' + safeSegment(record.id).slice(-8).toUpperCase();
}
function callCloud(name, data) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callFunction) return reject(new Error('当前环境未启用云开发'));
    wx.cloud.callFunction({ name, data, success: (res) => resolve(res.result || {}), fail: reject });
  });
}
function uploadCloudFile(cloudPath, filePath) {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({ cloudPath, filePath, success: (res) => resolve(res.fileID), fail: reject });
  });
}

function normalizeText(value) { return String(value || '').trim(); }
function readStoredList(key) { const value = wx.getStorageSync(key); return Array.isArray(value) ? value : []; }
function getTeamName(team) { return normalizeText(team && (team.label || team.name || team.teamName)); }
function getTeamLogo(team) { return normalizeText(team && (team.logoUrl || team.teamLogo || team.logo || team.logoFileID || team.teamLogoFileID)); }
function resolveReportTeamLogo(record, active, side) {
  const recordTeam = record && record[side + 'Team'];
  const activeTeam = active && active[side + 'Team'];
  const identities = [
    record && record[side + 'TeamId'], record && record[side + 'TeamKey'], record && record[side + 'Name'],
    recordTeam && recordTeam.id, recordTeam && recordTeam.key, getTeamName(recordTeam),
    activeTeam && activeTeam.id, activeTeam && activeTeam.key, getTeamName(activeTeam)
  ].map(normalizeText).filter(Boolean);
  const storedTeam = readStoredList('teams').concat(readStoredList('teamDrafts')).concat(readStoredList('teamCategories')).find((team) => {
    const teamIdentities = [team && team.id, team && team.key, getTeamName(team)].map(normalizeText).filter(Boolean);
    return teamIdentities.some((identity) => identities.indexOf(identity) >= 0);
  });
  return getTeamLogo(storedTeam) || getTeamLogo(recordTeam) || getTeamLogo(activeTeam) || normalizeText(record && (record[side + 'LogoUrl'] || record[side + 'Logo'])) || normalizeText(active && (active[side + 'LogoUrl'] || active[side + 'Logo']));
}

Page({
  signatureCanvas: null,
  signatureContext: null,
  signatureWidth: 0,
  signatureHeight: 0,
  signatureDrawing: false,
  signatureLastPoint: null,
  signaturePointCount: 0,
  record: null,
  viewOnly: false,
  data: {
    heroTexture: HERO_TEXTURE, badgeImage: U10_BADGE, showU10Badge: true, showCodeBadge: false,
    matchName: '赛后裁判报告', groupShort: 'U10', groupName: '未填写', tournamentName: '未填写',
    matchTime: '未填写', venue: '未填写', homeName: '主队', awayName: '客队', homeLogo: '', awayLogo: '',
    homeInitial: '主', awayInitial: '客', homeScore: 0, awayScore: 0, homeFouls: 0, awayFouls: 0,
    homeTimeouts: 0, awayTimeouts: 0, periodColumns: [], periodTableWidth: 650,
    statusText: '待裁判确认', statusClass: '', refereeName: '', confirmed: false, confirmedClass: '',
    reportLocked: false, lockedClass: '', signatureFileID: '', pdfFileID: '', reportNo: '', signedAtText: '', submitting: false,
    viewOnly: false, showConfirmationSection: true, showSignatureCanvas: true, showLockedSignature: false,
    showUnsignedControls: true, showPdfButton: false, showRetryButton: false
  },

  onLoad(options) {
    this.viewOnly = !!(options && options.viewOnly === '1');
    const recordId = decodeURIComponent((options && options.recordId) || '');
    const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
    const list = Array.isArray(stored) ? stored : [];
    const record = list.find((item) => String(item.id) === recordId);
    if (!record) {
      wx.showModal({ title: '未找到比赛', content: '比赛记录可能已被清理，请返回比赛列表重试。', showCancel: false, success: () => this.goBack() });
      return;
    }
    this.record = record;
    this.applyRecord(record);
  },

  onReady() {
    if (this.data.showSignatureCanvas) this.initSignatureCanvas();
  },

  applyRecord(record) {
    const active = wx.getStorageSync('quickMatchActiveConfig') || {};
    const homeLogo = resolveReportTeamLogo(record, active, 'home');
    const awayLogo = resolveReportTeamLogo(record, active, 'away');
    const configuredPeriods = Math.max(1, Number(record.totalPeriods || 4));
    const periodScores = Array.isArray(record.periodScores) ? record.periodScores : [];
    const hasPeriodData = periodScores.length > 0;
    const highestScored = periodScores.reduce((max, item) => Math.max(max, Number(item.period || 0)), 0);
    const playedThrough = Math.min(configuredPeriods, Math.max(1, Number(record.maxPeriodReached || record.period || 1), highestScored));
    const periodColumns = [];
    for (let period = 1; period <= configuredPeriods; period += 1) {
      const item = periodScores.find((score) => Number(score.period) === period) || {};
      const played = hasPeriodData && period <= playedThrough;
      periodColumns.push({ label: 'Q' + period, homeText: played ? String(Number(item.home || 0)) : '—', awayText: played ? String(Number(item.away || 0)) : '—' });
    }
    const locked = record.reportLocked === true;
    const viewOnly = this.viewOnly === true;
    const matchName = record.matchName || active.matchName || '快捷比赛';
    const groupMatch = matchName.match(/U\d{1,2}/i);
    const isU10 = !!(groupMatch && groupMatch[0].toUpperCase() === 'U10');
    this.setData({
      matchName,
      groupShort: groupMatch ? groupMatch[0].toUpperCase() : 'SXF',
      showU10Badge: isU10, showCodeBadge: !isU10,
      groupName: record.groupName || active.groupName || matchName,
      tournamentName: record.tournamentName || active.tournamentName || matchName,
      matchTime: formatDateTime(record.endedAt || record.createdAt),
      venue: record.venue || active.venue || '未填写',
      homeName: record.homeName || '主队', awayName: record.awayName || '客队',
      homeLogo, awayLogo,
      homeInitial: String(record.homeName || '主').slice(0, 1), awayInitial: String(record.awayName || '客').slice(0, 1),
      homeScore: Number(record.homeScore || 0), awayScore: Number(record.awayScore || 0),
      homeFouls: Number(record.homeFouls || 0), awayFouls: Number(record.awayFouls || 0),
      homeTimeouts: Number(record.homeTimeouts || 0), awayTimeouts: Number(record.awayTimeouts || 0),
      periodColumns, periodTableWidth: Math.max(650, 300 + configuredPeriods * 94),
      statusText: viewOnly ? '比赛数据' : (locked ? (record.pdfFileID ? '报告已生成' : '已签署 · 待生成') : '待裁判确认'),
      statusClass: !viewOnly && locked ? 'signed' : '', refereeName: record.refereeName || '', confirmed: locked,
      confirmedClass: locked ? 'checked' : '', reportLocked: locked, lockedClass: locked ? 'locked' : '',
      signatureFileID: record.signatureFileID || '', pdfFileID: record.pdfFileID || '', reportNo: record.reportNo || '',
      signedAtText: record.signedAt ? formatDateTime(record.signedAt) : '',
      viewOnly, showConfirmationSection: !viewOnly,
      showSignatureCanvas: !viewOnly && !locked, showLockedSignature: !viewOnly && locked,
      showUnsignedControls: !viewOnly && !locked,
      showPdfButton: !viewOnly && locked && !!record.pdfFileID,
      showRetryButton: !viewOnly && locked && !record.pdfFileID
    });
  },

  initSignatureCanvas() {
    wx.createSelectorQuery().in(this).select('#signatureCanvas').fields({ node: true, size: true }).exec((res) => {
      const result = res && res[0];
      if (!result || !result.node) return;
      const canvas = result.node;
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2;
      canvas.width = result.width * dpr;
      canvas.height = result.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
      this.signatureCanvas = canvas; this.signatureContext = ctx; this.signatureWidth = result.width; this.signatureHeight = result.height;
    });
  },

  signaturePoint(event) {
    const touch = event.touches && event.touches[0];
    return touch ? { x: touch.x, y: touch.y, time: Date.now() } : null;
  },
  onSignatureStart(event) {
    if (this.data.reportLocked || !this.signatureContext) return;
    const point = this.signaturePoint(event); if (!point) return;
    this.signatureDrawing = true; this.signatureLastPoint = point; this.signaturePointCount += 1;
    const ctx = this.signatureContext; ctx.beginPath(); ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill();
  },
  onSignatureMove(event) {
    if (!this.signatureDrawing || !this.signatureContext) return;
    const point = this.signaturePoint(event); const last = this.signatureLastPoint; if (!point || !last) return;
    const distance = Math.hypot(point.x - last.x, point.y - last.y);
    const elapsed = Math.max(1, point.time - last.time);
    const velocity = distance / elapsed;
    const width = Math.max(1.7, Math.min(4.6, 4.4 - velocity * 1.5));
    const midX = (last.x + point.x) / 2; const midY = (last.y + point.y) / 2;
    const ctx = this.signatureContext; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.quadraticCurveTo(last.x, last.y, midX, midY); ctx.lineWidth = width; ctx.stroke();
    this.signatureLastPoint = point; this.signaturePointCount += 1;
  },
  onSignatureEnd() { this.signatureDrawing = false; this.signatureLastPoint = null; },
  clearSignature() {
    if (!this.signatureContext || this.data.reportLocked) return;
    this.signatureContext.clearRect(0, 0, this.signatureWidth, this.signatureHeight); this.signaturePointCount = 0;
  },
  onRefereeInput(event) { this.setData({ refereeName: String(event.detail.value || '').trimStart() }); },
  onHomeLogoError() { this.setData({ homeLogo: '' }); },
  onAwayLogoError() { this.setData({ awayLogo: '' }); },
  toggleConfirmed() {
    if (this.data.reportLocked) return;
    const confirmed = !this.data.confirmed; this.setData({ confirmed, confirmedClass: confirmed ? 'checked' : '' });
  },

  canvasToFile(canvas, width, height) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({ canvas, x: 0, y: 0, width, height, destWidth: width, destHeight: height, fileType: 'png', quality: 1, success: (res) => resolve(res.tempFilePath), fail: reject }, this);
    });
  },
  saveLocalPatch(patch) {
    const stored = wx.getStorageSync(RECENT_MATCHES_KEY); const list = Array.isArray(stored) ? stored : [];
    const next = list.map((item) => String(item.id) === String(this.record.id) ? Object.assign({}, item, patch) : item);
    wx.setStorageSync(RECENT_MATCHES_KEY, next); this.record = Object.assign({}, this.record, patch); return this.record;
  },

  confirmAndGenerate() {
    if (!this.data.refereeName.trim()) return wx.showToast({ title: '请输入裁判姓名', icon: 'none' });
    if (this.signaturePointCount < 8) return wx.showToast({ title: '请完成裁判签名', icon: 'none' });
    if (!this.data.confirmed) return wx.showToast({ title: '请勾选信息核对确认', icon: 'none' });
    wx.showModal({
      title: '确认签署报告', content: '确认后比分与签名将锁定，不能在报告中直接修改。', confirmText: '确认生成', confirmColor: '#ff5b00',
      success: (res) => { if (res.confirm) this.lockAndGenerate(); }
    });
  },

  async lockAndGenerate() {
    this.setData({ submitting: true });
    try {
      const signaturePath = await this.canvasToFile(this.signatureCanvas, Math.round(this.signatureWidth), Math.round(this.signatureHeight));
      const recordKey = safeSegment(this.record.id); const signedAt = Date.now(); const reportNo = makeReportNo(this.record);
      const signatureFileID = await uploadCloudFile('match-report-signatures/' + recordKey + '/' + signedAt + '.png', signaturePath);
      const lockedRecord = this.saveLocalPatch({ reportRequested: true, reportStatus: 'generating', reportLocked: true, refereeName: this.data.refereeName.trim(), signatureFileID, signedAt, reportNo, updatedAt: Date.now() });
      this.applyRecord(lockedRecord);
      await callCloud('sxSaveMatchResult', { result: lockedRecord });
      await this.generatePdf();
    } catch (error) {
      console.error('[referee-report] lock report failed', error);
      if (this.record && this.record.reportLocked) this.saveLocalPatch({ reportStatus: 'pdf_failed' });
      wx.showModal({ title: this.record && this.record.reportLocked ? '签名已保存' : '生成失败', content: this.record && this.record.reportLocked ? '比分与签名已锁定，PDF 暂未生成，可稍后点击重试。' : '签名或云端保存失败，请检查网络后重试。', showCancel: false });
    } finally { this.setData({ submitting: false }); }
  },

  retryPdf() { if (!this.data.submitting) this.generatePdf(); },
  async generatePdf() {
    this.setData({ submitting: true });
    try {
      const imagePath = await this.renderPdfReport();
      const recordKey = safeSegment(this.record.id);
      const draftFileID = await uploadCloudFile('match-report-drafts/' + recordKey + '/' + Date.now() + '.png', imagePath);
      const result = await callCloud('sxGenerateMatchReportPdf', { draftFileID, recordId: this.record.id, reportNo: this.record.reportNo });
      if (!result.ok || !result.fileID) throw new Error(result.message || 'PDF 生成失败');
      const updated = this.saveLocalPatch({ reportStatus: 'completed', pdfFileID: result.fileID, reportImageFileID: draftFileID, updatedAt: Date.now() });
      this.applyRecord(updated); await callCloud('sxSaveMatchResult', { result: updated });
      wx.showToast({ title: 'PDF 已生成', icon: 'success' });
    } catch (error) {
      console.error('[referee-report] generate pdf failed', error); this.saveLocalPatch({ reportStatus: 'pdf_failed' });
      wx.showModal({ title: 'PDF 暂未生成', content: '签名和比分已经安全锁定，请检查网络或云函数部署后点击“重新生成”。', showCancel: false });
    } finally { this.setData({ submitting: false }); }
  },

  async renderPdfReport() {
    const queryResult = await new Promise((resolve) => wx.createSelectorQuery().in(this).select('#reportCanvas').fields({ node: true, size: true }).exec((res) => resolve(res && res[0])));
    if (!queryResult || !queryResult.node) throw new Error('PDF 画布初始化失败');
    const canvas = queryResult.node; canvas.width = 1240; canvas.height = 1754;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1240, 1754);
    ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, 1240, 178); ctx.fillStyle = '#ff6500'; ctx.fillRect(0, 170, 1240, 8);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('赛 小 蜂 篮 球 · 赛 后 裁 判 报 告', 620, 92);
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#ffb26d'; ctx.fillText('SAIXIAOFENG BASKETBALL · MATCH OFFICIAL REPORT', 620, 137);
    ctx.textAlign = 'left'; ctx.fillStyle = '#161616'; ctx.font = 'bold 34px sans-serif'; ctx.fillText(this.data.matchName, 82, 245);
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#555';
    ctx.fillText('赛事：' + this.data.tournamentName, 82, 294); ctx.fillText('组别：' + this.data.groupName, 660, 294);
    ctx.fillText('比赛时间：' + this.data.matchTime, 82, 337); ctx.fillText('比赛地点：' + this.data.venue, 660, 337);
    ctx.strokeStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(82, 372); ctx.lineTo(1158, 372); ctx.stroke();
    const homeLogoSource = await this.downloadCloudFile(this.data.homeLogo);
    const awayLogoSource = await this.downloadCloudFile(this.data.awayLogo);
    if (homeLogoSource) await this.drawImage(canvas, ctx, homeLogoSource, 220, 390, 110, 110); else this.drawFallbackBadge(ctx, 275, 445, this.data.homeInitial, '#ff5b00');
    if (awayLogoSource) await this.drawImage(canvas, ctx, awayLogoSource, 910, 390, 110, 110); else this.drawFallbackBadge(ctx, 965, 445, this.data.awayInitial, '#20252b');
    ctx.textAlign = 'center'; ctx.fillStyle = '#f45112'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(this.data.homeName, 275, 540);
    ctx.fillStyle = '#111'; ctx.fillText(this.data.awayName, 965, 540);
    ctx.font = 'bold 102px sans-serif'; ctx.fillStyle = '#f45112'; ctx.fillText(String(this.data.homeScore), 500, 510);
    ctx.fillStyle = '#111'; ctx.fillText(':', 620, 510); ctx.fillText(String(this.data.awayScore), 740, 510);
    ctx.font = '22px sans-serif'; ctx.fillStyle = '#f45112'; ctx.fillText('比赛结束', 620, 555);
    ctx.textAlign = 'left'; ctx.fillStyle = '#111'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('单节得分', 82, 635);
    const columns = this.data.periodColumns; const tableX = 82; const tableY = 670; const tableW = 1076; const teamW = 230; const totalW = 120; const cellW = (tableW - teamW - totalW) / columns.length; const rowH = 70;
    ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 2; ctx.strokeRect(tableX, tableY, tableW, rowH * 3);
    for (let row = 1; row < 3; row += 1) { ctx.beginPath(); ctx.moveTo(tableX, tableY + rowH * row); ctx.lineTo(tableX + tableW, tableY + rowH * row); ctx.stroke(); }
    const boundaries = [tableX + teamW]; for (let i = 1; i <= columns.length; i += 1) boundaries.push(tableX + teamW + cellW * i); boundaries.push(tableX + tableW);
    boundaries.slice(0, -1).forEach((x) => { ctx.beginPath(); ctx.moveTo(x, tableY); ctx.lineTo(x, tableY + rowH * 3); ctx.stroke(); });
    ctx.textAlign = 'center'; ctx.font = '24px sans-serif'; ctx.fillStyle = '#222'; ctx.fillText('球队', tableX + teamW / 2, tableY + 44);
    columns.forEach((item, index) => ctx.fillText(item.label, tableX + teamW + cellW * (index + .5), tableY + 44)); ctx.fillText('总分', tableX + tableW - totalW / 2, tableY + 44);
    ctx.fillStyle = '#f45112'; ctx.fillText(this.data.homeName, tableX + teamW / 2, tableY + rowH + 44); columns.forEach((item, index) => ctx.fillText(item.homeText, tableX + teamW + cellW * (index + .5), tableY + rowH + 44)); ctx.fillText(String(this.data.homeScore), tableX + tableW - totalW / 2, tableY + rowH + 44);
    ctx.fillStyle = '#111'; ctx.fillText(this.data.awayName, tableX + teamW / 2, tableY + rowH * 2 + 44); columns.forEach((item, index) => ctx.fillText(item.awayText, tableX + teamW + cellW * (index + .5), tableY + rowH * 2 + 44)); ctx.fillText(String(this.data.awayScore), tableX + tableW - totalW / 2, tableY + rowH * 2 + 44);
    ctx.textAlign = 'left'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('比赛记录摘要', 82, 955);
    ctx.strokeRect(82, 990, 1076, 170); ctx.beginPath(); ctx.moveTo(620, 990); ctx.lineTo(620, 1160); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = '#f45112'; ctx.fillText(this.data.homeName, 350, 1035); ctx.fillStyle = '#111'; ctx.fillText(this.data.awayName, 890, 1035);
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#444'; ctx.fillText('犯规 ' + this.data.homeFouls + '　　暂停 ' + this.data.homeTimeouts, 350, 1100); ctx.fillText('犯规 ' + this.data.awayFouls + '　　暂停 ' + this.data.awayTimeouts, 890, 1100);
    ctx.textAlign = 'left'; ctx.fillStyle = '#111'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('裁判确认', 82, 1250); ctx.font = '24px sans-serif'; ctx.fillText('裁判姓名：' + this.data.refereeName, 82, 1302); ctx.fillText('签署时间：' + this.data.signedAtText, 660, 1302);
    ctx.strokeStyle = '#ff9d39'; ctx.setLineDash([10, 8]); ctx.strokeRect(82, 1340, 1076, 245); ctx.setLineDash([]);
    const signatureSource = await this.downloadCloudFile(this.data.signatureFileID);
    await this.drawImage(canvas, ctx, signatureSource, 250, 1370, 740, 175);
    ctx.textAlign = 'center'; ctx.font = '22px sans-serif'; ctx.fillStyle = '#666'; ctx.fillText('本人已核对以上比赛信息与比分', 620, 1625);
    ctx.fillStyle = '#222'; ctx.font = '20px sans-serif'; ctx.fillText('报告编号：' + this.data.reportNo + '　　本报告由赛小蜂篮球系统生成', 620, 1692);
    return this.canvasToFile(canvas, 1240, 1754);
  },
  drawImage(canvas, ctx, src, x, y, width, height) {
    return new Promise((resolve) => {
      if (!src) return resolve();
      const image = canvas.createImage(); image.onload = () => { ctx.drawImage(image, x, y, width, height); resolve(); }; image.onerror = resolve; image.src = src;
    });
  },
  drawFallbackBadge(ctx, x, y, initial, color) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initial || '队', x, y); ctx.restore();
  },
  downloadCloudFile(fileID) {
    return new Promise((resolve) => {
      if (!fileID || fileID.indexOf('cloud://') !== 0) return resolve(fileID || '');
      wx.cloud.downloadFile({ fileID, success: (res) => resolve(res.tempFilePath || ''), fail: () => resolve('') });
    });
  },

  openPdf() {
    if (!this.data.pdfFileID) return;
    wx.showLoading({ title: '正在打开' });
    wx.cloud.downloadFile({ fileID: this.data.pdfFileID, success: (res) => wx.openDocument({ filePath: res.tempFilePath, fileType: 'pdf', showMenu: true, complete: () => wx.hideLoading() }), fail: () => { wx.hideLoading(); wx.showToast({ title: 'PDF 下载失败', icon: 'none' }); } });
  },
  goBack() {
    const pages = getCurrentPages(); if (pages.length > 1) wx.navigateBack(); else wx.reLaunch({ url: '/pages/home/index' });
  }
});
