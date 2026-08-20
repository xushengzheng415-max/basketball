const cloud = require('wx-server-sdk');
const { PDFDocument } = require('pdf-lib');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function safeSegment(value, fallback) {
  const result = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  return result || fallback;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const draftFileID = String((event && event.draftFileID) || '');
  const recordId = safeSegment(event && event.recordId, 'match');
  const reportNo = safeSegment(event && event.reportNo, 'report-' + Date.now());

  if (!draftFileID || !draftFileID.includes('/match-report-drafts/' + recordId + '/')) {
    return { ok: false, message: '报告草稿路径无效' };
  }

  const downloaded = await cloud.downloadFile({ fileID: draftFileID });
  if (!downloaded || !downloaded.fileContent) return { ok: false, message: '报告草稿下载失败' };

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const image = await pdf.embedPng(downloaded.fileContent);
  page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  pdf.setTitle('赛后裁判报告 ' + reportNo);
  pdf.setProducer('赛小蜂篮球');
  const bytes = await pdf.save();
  const openid = safeSegment(wxContext.OPENID, 'unknown');
  const cloudPath = 'match-reports/' + openid + '/' + reportNo + '.pdf';
  const uploaded = await cloud.uploadFile({ cloudPath, fileContent: Buffer.from(bytes) });
  return { ok: true, fileID: uploaded.fileID, reportNo };
};
