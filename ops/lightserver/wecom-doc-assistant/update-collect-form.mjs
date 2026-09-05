import fs from "node:fs";

const API_ROOT = "https://qyapi.weixin.qq.com/cgi-bin";

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量：${name}`);
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
  return readJson(
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    }),
    action,
  );
}

async function main() {
  const templatePath = getArg("--template");
  const statePath = getArg("--state");
  if (!templatePath || !statePath) {
    throw new Error("用法：node update-collect-form.mjs --template <模板.json> --state <结果.json>");
  }

  const corpId = requireEnv("WECOM_CORP_ID");
  const appSecret = requireEnv("WECOM_APP_SECRET");
  const adminUserId = requireEnv("WECOM_ADMIN_USER_ID");
  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (!state.formid) throw new Error("结果文件中缺少 formid");

  template.form_info.form_setting ??= {};
  template.form_info.form_setting.setting_manager_range = { userids: [adminUserId] };

  const tokenUrl = new URL(`${API_ROOT}/gettoken`);
  tokenUrl.searchParams.set("corpid", corpId);
  tokenUrl.searchParams.set("corpsecret", appSecret);
  const tokenPayload = await readJson(await fetch(tokenUrl), "获取 access_token");

  await postJson(
    "/wedoc/modify_collect",
    tokenPayload.access_token,
    { oper: 1, formid: state.formid, form_info: template.form_info },
    "更新收集表",
  );

  const [infoPayload, sharePayload] = await Promise.all([
    postJson("/wedoc/get_form_info", tokenPayload.access_token, { formid: state.formid }, "读取收集表"),
    postJson("/wedoc/doc_share", tokenPayload.access_token, { formid: state.formid }, "获取分享链接"),
  ]);

  const questions = infoPayload.form_info?.form_question?.items ?? [];
  const result = {
    ...state,
    status: "updated",
    title: infoPayload.form_info?.form_title,
    question_count: questions.length,
    questions: questions.map((item) => ({
      title: item.title,
      reply_type: item.reply_type,
      options: (item.option_item ?? []).map((option) => option.value),
    })),
    fill_out_auth: infoPayload.form_info?.form_setting?.fill_out_auth,
    share_url: sharePayload.share_url,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(statePath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
