'use strict';

const fs = require('fs');
const path = require('path');

const root = 'E:\\Documents\\saixoafeng_basketball\\赛小蜂篮球UI\\3.0版本\\01-机构PC后台\\01-机构经营后台';
const manifests = [
  `${root}\\02-教务中心\\01-课程管理\\01-确认稿\\课程管理-v3_assets\\manifest.json`,
  `${root}\\02-教务中心\\02-班级管理\\01-确认稿\\班级管理-v2_assets\\manifest.json`,
  `${root}\\02-教务中心\\03-排课管理\\01-确认稿\\排课管理-v3_assets\\manifest.json`,
  `${root}\\03-学员管理\\01-确认稿\\学员管理-v1_assets\\manifest.json`,
  `${root}\\07-员工与权限\\01-确认稿\\员工与权限-v2_assets\\manifest.json`
];

for (const manifestPath of manifests) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.status !== 'preparing' && manifest.status !== 'awaiting-user-confirmation') throw new Error(`Unexpected status: ${manifest.status}`);
  manifest.status = 'approved';
  manifest.approved_at = '2026-08-30';
  manifest.approval_basis = '用户于2026-08-30明确要求按yuanxing连续实施，无需逐页面或素材包再次确认。';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`Approved ${path.basename(path.dirname(manifestPath))}\n`);
}
