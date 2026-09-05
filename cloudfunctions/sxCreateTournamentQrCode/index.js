const cloud = require("wx-server-sdk");
const crypto = require("crypto");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DEFAULT_PAGE = "pages/tournament-register/index";
const VALID_ENVIRONMENTS = new Set(["release", "trial", "develop"]);
const BASKETBALL_APPID =
  process.env.SXF_BASKETBALL_APPID || "wx06d735da15276acd";
const BASKETBALL_APPSECRET = process.env.SXF_BASKETBALL_APPSECRET || "";

let cachedAccessToken = { token: "", expireAt: 0 };

function httpsPostJson(host, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      {
        host,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error("解析微信响应失败: " + raw));
          }
        });
      }
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function httpsPostBinary(host, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      {
        host,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: String(response.headers["content-type"] || ""),
          })
        );
      }
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function getBasketballAccessToken() {
  const now = Date.now();
  if (cachedAccessToken.token && cachedAccessToken.expireAt > now + 300000)
    return cachedAccessToken.token;
  if (!BASKETBALL_APPSECRET) {
    throw new Error(
      "未配置赛小蜂篮球 AppSecret，请在 sxCreateTournamentQrCode 云函数中设置 SXF_BASKETBALL_APPSECRET"
    );
  }
  const response = await httpsPostJson(
    "api.weixin.qq.com",
    "/cgi-bin/stable_token",
    {
      grant_type: "client_credential",
      appid: BASKETBALL_APPID,
      secret: BASKETBALL_APPSECRET,
    }
  );
  if (!response || !response.access_token) {
    throw new Error(
      "获取赛小蜂篮球 access_token 失败: " + JSON.stringify(response)
    );
  }
  cachedAccessToken = {
    token: response.access_token,
    expireAt: now + ((response.expires_in || 7200) - 300) * 1000,
  };
  return cachedAccessToken.token;
}

async function createBasketballQrCode({ scene, page, envVersion }) {
  const accessToken = await getBasketballAccessToken();
  const response = await httpsPostBinary(
    "api.weixin.qq.com",
    "/wxa/getwxacodeunlimit?access_token=" + encodeURIComponent(accessToken),
    {
      scene,
      page,
      env_version: envVersion,
      check_path: false,
      width: 430,
      auto_color: false,
      line_color: { r: 16, g: 16, b: 16 },
      is_hyaline: false,
    }
  );
  if (
    response.contentType.indexOf("application/json") >= 0 ||
    response.buffer.slice(0, 1).toString() === "{"
  ) {
    let error;
    try {
      error = JSON.parse(response.buffer.toString("utf8"));
    } catch (parseError) {
      error = {};
    }
    throw new Error(
      "赛小蜂篮球小程序码生成失败: " +
        (error.errmsg || error.errcode || "微信接口返回错误")
    );
  }
  if (!response.buffer.length) throw new Error("赛小蜂篮球小程序码为空");
  return response.buffer;
}

async function createBasketballUrlLink({ path, query, envVersion }) {
  const accessToken = await getBasketballAccessToken();
  const response = await httpsPostJson('api.weixin.qq.com', `/wxa/generate_urllink?access_token=${encodeURIComponent(accessToken)}`, {
    path, query, env_version: envVersion, expire_type: 1, expire_interval: 1
  });
  if (!response || !response.url_link) throw new Error(`生成小程序邀请链接失败: ${response && (response.errmsg || response.errcode) || '微信接口返回错误'}`);
  return response.url_link;
}

function cleanEventId(value) {
  const eventId = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(eventId))
    throw new Error("eventId 格式不正确");
  return eventId;
}

function cleanInviteKey(value) {
  const inviteKey = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{6,32}$/.test(inviteKey))
    throw new Error("inviteKey 格式不正确");
  return inviteKey;
}

function cleanPage(value) {
  const page = String(value || DEFAULT_PAGE).replace(/^\//, "");
  if (!/^pages\/[a-zA-Z0-9_/-]+$/.test(page))
    throw new Error("目标页面格式不正确");
  return page;
}

exports.main = async (event = {}) => {
  if (event.mode === "educationCoach") {
    const inviteId = cleanEventId(event.inviteId);
    const educationInvite = String(event.educationInvite || "").trim();
    if (!/^[a-zA-Z0-9_-]{20,64}$/.test(educationInvite)) throw new Error("教练邀请编号格式不正确");
    const page = cleanPage(event.page || "pages/education/index");
    const envVersion = VALID_ENVIRONMENTS.has(event.envVersion) ? event.envVersion : "trial";
    const scene = `e=${educationInvite}`;
    const digest = crypto.createHash("sha256").update(`education-coach|${BASKETBALL_APPID}|${inviteId}|${educationInvite}|${page}|${envVersion}`).digest("hex").slice(0, 16);
    const fileContent = await createBasketballQrCode({ scene, page, envVersion });
    const upload = await cloud.uploadFile({ cloudPath: `education-coach-qrcodes/${inviteId}/${digest}.png`, fileContent });
    let url = "";
    try { const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] }); url = temp.fileList && temp.fileList[0] ? temp.fileList[0].tempFileURL : ""; } catch (error) {}
    let urlLink = "";
    try { urlLink = await createBasketballUrlLink({ path: page, query: `invitationToken=${encodeURIComponent(educationInvite)}`, envVersion }); } catch (error) {}
    return { ok: true, mode: "educationCoach", inviteId, page, envVersion, scene, fileID: upload.fileID, url, urlLink };
  }
  if (event.mode === "assistant") {
    const matchId = cleanEventId(event.matchId);
    const assistantInvite = String(event.assistantInvite || "").trim();
    if (!/^[a-zA-Z0-9_-]{12,32}$/.test(assistantInvite))
      throw new Error("助教邀请编号格式不正确");
    const page = cleanPage(event.page || "pages/match-coach-workspace/index");
    const envVersion = VALID_ENVIRONMENTS.has(event.envVersion)
      ? event.envVersion
      : "trial";
    const scene = `a=${assistantInvite}`;
    const hash = crypto
      .createHash("sha256")
      .update(
        `assistant|${BASKETBALL_APPID}|${matchId}|${assistantInvite}|${page}|${envVersion}`
      )
      .digest("hex")
      .slice(0, 16);
    const fileContent = await createBasketballQrCode({
      scene,
      page,
      envVersion,
    });
    const upload = await cloud.uploadFile({
      cloudPath: `match-assistant-qrcodes/${matchId}/${hash}.png`,
      fileContent,
    });
    let url = "";
    try {
      const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] });
      url =
        temp.fileList && temp.fileList[0] ? temp.fileList[0].tempFileURL : "";
    } catch (error) {}
    return {
      ok: true,
      mode: "assistant",
      matchId,
      assistantInvite,
      page,
      envVersion,
      scene,
      fileID: upload.fileID,
      url,
    };
  }
  if (event.mode === "referee") {
    const matchId = cleanEventId(event.matchId);
    const refInviteId = String(event.refInviteId || "").trim();
    if (!/^[a-zA-Z0-9_-]{6,32}$/.test(refInviteId))
      throw new Error("裁判邀请编号格式不正确");
    const page = cleanPage(event.page || "pages/match-preparation/index");
    const envVersion = VALID_ENVIRONMENTS.has(event.envVersion)
      ? event.envVersion
      : "trial";
    const scene = `r=${refInviteId}`;
    const hash = crypto
      .createHash("sha256")
      .update(
        `referee|${BASKETBALL_APPID}|${matchId}|${refInviteId}|${page}|${envVersion}`
      )
      .digest("hex")
      .slice(0, 16);
    const fileContent = await createBasketballQrCode({
      scene,
      page,
      envVersion,
    });
    const upload = await cloud.uploadFile({
      cloudPath: `match-referee-qrcodes/${matchId}/${hash}.png`,
      fileContent,
    });
    let url = "";
    try {
      const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] });
      url =
        temp.fileList && temp.fileList[0] ? temp.fileList[0].tempFileURL : "";
    } catch (error) {}
    return {
      ok: true,
      mode: "referee",
      matchId,
      refInviteId,
      page,
      envVersion,
      scene,
      fileID: upload.fileID,
      url,
    };
  }
  const eventId = cleanEventId(event.eventId);
  const inviteKey = cleanInviteKey(event.inviteKey);
  const page = cleanPage(event.page);
  const envVersion = VALID_ENVIRONMENTS.has(event.envVersion)
    ? event.envVersion
    : "release";
  const scene = `i=${inviteKey}`;
  const hash = crypto
    .createHash("sha256")
    .update(
      `basketball-v2|${BASKETBALL_APPID}|${eventId}|${inviteKey}|${page}|${envVersion}`
    )
    .digest("hex")
    .slice(0, 16);
  const cloudPath = `tournament-qrcodes/${eventId}/${hash}.png`;

  // 当前 CloudBase 环境共享自足球小程序，不能直接使用 cloud.openapi 生成二维码，
  // 否则返回的中心图案和扫码入口都会属于足球小程序。这里使用篮球小程序自己的凭据。
  const fileContent = await createBasketballQrCode({ scene, page, envVersion });
  if (!Buffer.isBuffer(fileContent)) throw new Error("小程序码生成失败");
  const upload = await cloud.uploadFile({ cloudPath, fileContent });
  let url = "";
  try {
    const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] });
    url = temp.fileList && temp.fileList[0] ? temp.fileList[0].tempFileURL : "";
  } catch (error) {}
  return {
    ok: true,
    mode: "miniprogram",
    eventId,
    inviteKey,
    page,
    envVersion,
    scene,
    fileID: upload.fileID,
    url,
  };
};
