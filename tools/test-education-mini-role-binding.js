"use strict";
const assert = require("assert"),
  fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, ".."),
  read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const educationJs = read("native-dist/pages/education/index.js"),
  educationWxml = read("native-dist/pages/education/index.wxml"),
  core = read("cloudfunctions/sxEducationCore/index.js");
for (const removed of [
  "roleOptions",
  "rolePreview",
  "演示模式",
  "U10 提高班",
  "陈教练，晚上好",
])
  assert(
    !educationJs.includes(removed),
    `education entry still contains demo marker: ${removed}`
  );
assert(
  educationJs.includes("domain: 'access'") ||
    educationJs.includes('domain: "access"'),
  "education entry must resolve cloud identity"
);
assert(
  educationJs.includes('modeState("unbound")'),
  "unbound institution state missing"
);
assert(educationWxml.includes("尚未加入机构"), "unbound guidance missing");
assert(
  educationWxml.includes("确认资料并加入机构"),
  "coach binding form missing"
);
assert(
  educationWxml.includes("{{showCoach}}") &&
    educationWxml.includes("{{showManager}}"),
  "role surfaces must be data-driven"
);
assert(
  !educationJs.includes("/pages/campus-manager/"),
  "education entry must not navigate into legacy demo manager pages"
);
assert(
  core.includes("action === 'inviteAccept'"),
  "coach invite acceptance missing in cloud"
);
assert(core.includes("domain === 'mobile'"), "manager mobile summary missing");
for (const file of [
  "native-dist/pages/education/index.wxml",
  "native-dist/pages/coach-course-detail/index.wxml",
  "native-dist/pages/coach-attendance/index.wxml",
  "native-dist/pages/coach-classes/index.wxml",
]) {
  const source = read(file);
  assert(
    !/{{[^}]*\?[^}]*:/.test(source),
    `${file} contains ternary WXML expression`
  );
  assert(
    !/{{[^}]*(===|!==|\.find\(|\.slice\()/.test(source),
    `${file} contains complex WXML expression`
  );
}
for (const file of [
  "native-dist/pages/coach-course-detail/index.js",
  "native-dist/pages/coach-attendance/index.js",
  "native-dist/pages/coach-classes/index.js",
])
  assert(
    read(file).includes("sxEducationCore"),
    `${file} must load real education data`
  );
console.log("education mini role binding tests passed");
