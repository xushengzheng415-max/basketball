import fs from "node:fs";
import path from "node:path";

const API_ROOT = "https://qyapi.weixin.qq.com/cgi-bin";

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value;
}

async function readJson(response, action) {
  const payload = await response.json();
  if (!response.ok || payload.errcode !== 0) {
    const code = payload.errcode ?? response.status;
    const message = payload.errmsg ?? response.statusText;
    throw new Error(`${action}失败：${code} ${message}`);
  }
  return payload;
}

async function postJson(pathname, accessToken, body, action) {
  const url = new URL(`${API_ROOT}${pathname}`);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return readJson(response, action);
}

async function main() {
  const templatePath = getArg("--template");
  const outputPath = getArg("--output");
  if (!templatePath || !outputPath) {
    throw new Error("用法：node create-collect-form.mjs --template <模板.json> --output <结果.json>");
  }

  if (fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    process.stdout.write(`${JSON.stringify({ status: "exists", ...existing }, null, 2)}\n`);
    return;
  }

  const corpId = requireEnv("WECOM_CORP_ID");
  const appSecret = requireEnv("WECOM_APP_SECRET");
  const adminUserId = requireEnv("WECOM_ADMIN_USER_ID");
  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));

  template.form_info ??= {};
  template.form_info.form_setting ??= {};
  template.form_info.form_setting.setting_manager_range = {
    userids: [adminUserId],
  };

  const tokenUrl = new URL(`${API_ROOT}/gettoken`);
  tokenUrl.searchParams.set("corpid", corpId);
  tokenUrl.searchParams.set("corpsecret", appSecret);
  const tokenResponse = await fetch(tokenUrl);
  const tokenPayload = await readJson(tokenResponse, "获取 access_token");

  const createPayload = await postJson(
    "/wedoc/create_collect",
    tokenPayload.access_token,
    template,
    "创建收集表",
  );
  const formId = createPayload.formid;

  const [infoPayload, sharePayload] = await Promise.all([
    postJson(
      "/wedoc/get_form_info",
      tokenPayload.access_token,
      { formid: formId },
      "读取收集表",
    ),
    postJson(
      "/wedoc/doc_share",
      tokenPayload.access_token,
      { formid: formId },
      "获取分享链接",
    ),
  ]);

  const questions = infoPayload.form_info?.form_question?.items ?? [];
  const result = {
    status: "created",
    formid: formId,
    title: infoPayload.form_info?.form_title,
    question_count: questions.length,
    questions: questions.map((item) => item.title),
    fill_out_auth: infoPayload.form_info?.form_setting?.fill_out_auth,
    share_url: sharePayload.share_url,
    created_at: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

