"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("education-student-onboarding.html", "utf8");
const page = fs.readFileSync(
  "website-assets/education-student-onboarding.js",
  "utf8"
);
const css = fs.readFileSync(
  "website-assets/education-student-onboarding.css",
  "utf8"
);
const api = fs.readFileSync(
  "cloudfunctions/sxEducationPublic/index.js",
  "utf8"
);
const upload = fs.readFileSync(
  "cloudfunctions/sxUploadAvatar/index.js",
  "utf8"
);

assert.ok(html.includes('id="cropDialog"'), "建档页应包含头像裁剪面板");
assert.ok(html.includes('id="cropCanvas"'), "建档页应包含裁剪画布");
assert.ok(
  html.includes("裁剪并智能抠图"),
  "裁剪后必须明确进入人像分割"
);
assert.ok(
  page.includes('toBlob(') && page.includes('"image/jpeg"'),
  "原图应先在浏览器压缩为小尺寸裁剪图"
);
assert.ok(
  page.includes("output.width = 320") &&
    page.includes("output.height = 320") &&
    page.includes("0.92"),
  "成员头像输出尺寸和质量应与小程序球员头像一致"
);
assert.ok(
  page.includes("onpointermove") && page.includes("setCropZoom"),
  "裁剪应支持拖动和手势缩放"
);
assert.ok(
  page.indexOf('api("uploadAvatar"') > page.indexOf("cropDataUrl()"),
  "必须先完成裁剪再上传处理"
);
assert.ok(
  api.includes("name: 'sxUploadAvatar'") &&
    api.includes("segmented: true"),
  "建档头像应复用人像分割云函数"
);
assert.ok(
  api.includes("900 * 1024"),
  "建档接口应限制裁剪图大小，避免请求体超限"
);
assert.ok(
  upload.includes("segmentPortrait"),
  "头像云函数必须执行百度人像分割"
);
assert.ok(
  css.includes(".crop-stage") && css.includes("touch-action: none"),
  "裁剪区域应具备稳定手势操作面"
);

console.log("education student avatar flow tests passed");
