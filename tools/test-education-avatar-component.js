"use strict";
const assert = require("assert"),
  fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, ".."),
  read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("education-student-onboarding.html"),
  css = read("website-assets/education-student-onboarding.css"),
  js = read("website-assets/education-student-onboarding.js"),
  publicApi = read("cloudfunctions/sxEducationPublic/index.js");
assert(html.includes('class="crop-frame"'), "square crop frame missing");
assert(
  html.includes("grid-horizontal") && html.includes("grid-vertical"),
  "nine-grid overlay missing"
);
assert(!html.includes("crop-circle"), "circular crop frame must be removed");
assert(
  !html.includes('id="cropZoom"'),
  "slider must be replaced by mini-program zoom controls"
);
assert(
  html.includes('id="zoomOut"') && html.includes('id="zoomIn"'),
  "zoom buttons missing"
);
assert(
  html.includes("裁剪并智能抠图"),
  "mini-program confirmation copy missing"
);
assert(
  js.includes("CROP_FRAME = { left: 72, top: 72, size: 496 }"),
  "crop frame geometry missing"
);
assert(
  js.includes("CROP_FRAME.left") && js.includes("CROP_FRAME.size"),
  "crop output must use square frame bounds"
);
assert(
  js.includes("output.width = 320") && js.includes("output.height = 320"),
  "crop output must be 320x320"
);
assert(
  css.includes(".crop-frame") && css.includes(".crop-shade"),
  "crop frame visual rules missing"
);
assert(
  !/\.photo-preview-frame\s*\{[^}]*border-radius:\s*50%/s.test(css),
  "profile preview must not use circular frame"
);
assert(
  /\.photo-preview-frame img\s*\{[^}]*object-fit:\s*contain/s.test(css),
  "transparent portrait preview must remain fully visible"
);
assert(
  css.includes(".photo-preview-frame em[hidden]"),
  "uploaded portrait must hide the placeholder layer"
);
assert(
  html.includes('name="identityNumber"') && html.includes('id="identityHint"'),
  "student identity recognition field missing"
);
assert(
  js.includes("parseIdentityNumber") &&
    js.includes("form.elements.birthDate.value") &&
    js.includes("form.elements.gender.value"),
  "identity number must derive birth date and gender"
);
assert(
  publicApi.includes("identityNumberHash") &&
    publicApi.includes("identityNumberMasked") &&
    !publicApi.includes("identityNumber: number"),
  "server must not persist the complete identity number"
);
assert(
  js.includes("GATE_RETRY_DELAYS") &&
    js.includes("正在验证建档入口") &&
    js.indexOf("scheduleBoot(delay)") < js.indexOf("message(error.message)"),
  "gate validation must retry silently before showing a final error"
);
assert(
  html.includes('id="confirmIdentity"') &&
    html.includes("无需重复关注") &&
    js.includes('action=oauthStart'),
  "followed guardians must have a direct WeChat identity route"
);
assert(
  html.includes('id="authCard" hidden') &&
    js.includes("isWechat") &&
    js.includes("beginWechatIdentity()") &&
    js.includes("location.replace"),
  "WeChat scans must bypass the manual identity confirmation screen"
);
assert(
  publicApi.includes("name: 'sxUploadAvatar'") &&
    publicApi.includes("internalEducationAvatar: true"),
  "education avatar must reuse portrait segmentation cloud function"
);
console.log("education avatar component tests passed");
