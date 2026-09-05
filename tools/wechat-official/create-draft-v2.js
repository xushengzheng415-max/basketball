const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__filename);
const ENV_FILE = path.join(ROOT, '.env.local');
for (const rawLine of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match || process.env[match[1]] !== undefined) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[match[1]] = value;
}

const WECHAT_BASE = 'https://api.weixin.qq.com';

// 素材URL
const SEPARATOR_URL = 'https://mmbiz.qpic.cn/mmbiz_gif/wYta6zyYbgPYDNiaggQ0RSxsN2IiaO9xs4HB9mxEUk8KCS3FTF0duvfzDpHF7C3RoutVd0C8pawNaPvfnVlv4YUGkd1gU73waZPvclz9w17Uk/0?wx_fmt=gif&from=appmsg';
const COMMUNITY_QR_URL = 'https://mmbiz.qpic.cn/sz_mmbiz_png/wYta6zyYbgOd3fKkpVrFDl9gibtjYsPkuDtkeljdhYqkTDBWTjXkaut4WSEOY9BU7GnheDAH7J0bfhp7LVQTOaFrzJFYCt0aTMAwph9f6NW8/0?wx_fmt=png&from=appmsg';
const MAIN_IMAGE_URL = 'http://mmbiz.qpic.cn/mmbiz_png/c2sho7J9L9TRTZ4ACoenxBtMypEbqkbh7EX4OAibchgXNqvS4cquXmSicxgcGL1v0AicFicZ1Mauia6bMnB8aCV8ez9ibJdjvAHtphZnKvcvxbdtw/0?from=appmsg';

// 开幕式现场图片URL
const OPENING_IMG1 = 'http://mmbiz.qpic.cn/sz_mmbiz_png/wYta6zyYbgOPJmYYufws2aeE223sicAdYBEDkokStZQXib5ASv03kiaKaAEGVATQeaLBvW15Tm3Kpgw50makXWibaH45d6DqXic0gNZFRcLKnCaU/0?from=appmsg';
const OPENING_IMG2 = 'http://mmbiz.qpic.cn/sz_mmbiz_png/wYta6zyYbgPLicCczM6jicmKTOeYaN4QUT8xGS6XyUxH7NXCgGe8jIuiawD2s1of8VIy33LoibticCibJdUibuANUAVyd0KxLfc5DWamV9kFnwMe1w/0?from=appmsg';
const OPENING_IMG3 = 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/wYta6zyYbgO1McTwZkFzbZCfCPvPX0wObgYUJHbxib0xzS8v0e7lr2j5UiceVHxCcLB5DNsFv2xgzQpAPCbqgem5ffmZGiaBQj0Bn0rXfSh0eA/0?from=appmsg';
const OPENING_IMG4 = 'http://mmbiz.qpic.cn/mmbiz_jpg/wYta6zyYbgMB3O8duyuic7GHxKt0nCyneAu5e1qvhzJaH68KMezx8STeI5SrP1K6FvErWLVCRMRyibdgun2SnkKgoZf7cVYiawth6Mzf4Za7ibc/0?from=appmsg';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`非JSON: ${text.slice(0, 300)}`); }
  if (!response.ok || data.errcode) {
    const code = data.errcode ? ` errcode=${data.errcode}` : '';
    throw new Error(`接口调用失败（HTTP ${response.status}${code}）：${data.errmsg || text.slice(0, 300)}`);
  }
  return data;
}

async function getAccessToken() {
  const file = path.join(ROOT, '.cache.json');
  const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
  return cached.access_token;
}

function sep() {
  return `<p style="text-align:center;margin:20px 0;"><img src="${SEPARATOR_URL}" style="max-width:100%;height:auto;display:block;margin:0 auto;" /></p>`;
}

function img(url, caption) {
  return `<p style="text-align:center;margin:16px 0;"><img src="${url}" style="max-width:100%;height:auto;" /></p>${caption ? `<p style="text-align:center;color:#888;font-size:12px;">${caption}</p>` : ''}`;
}

function buildContent() {
  return `
${img(OPENING_IMG4, '2026中国小篮球全国总决赛 8月6日在北京延庆开幕')}

<p style="text-indent:2em;">今天（8月6日），2026中国小篮球系列活动全国总决赛在北京延庆全民健身中心正式开幕。赛事将持续至8月13日，来自全国各地的小球员们正在热身，准备站上这个舞台。</p>

<p style="text-indent:2em;">除了赛场上即将开始的激烈角逐，本届赛事还有一个值得关注的变化：中国篮球协会正在通过数字化手段，把报名、身份核验、成绩采集等环节搬到线上，并开始建立全国6至12岁小球员的数据档案。</p>

${img(OPENING_IMG1, '赛场入口已布置就绪，球队与观众分流通行')}
${img(OPENING_IMG2, '总决赛标识醒目，赛事氛围浓厚')}
${img(OPENING_IMG3, '开幕式动线规划清晰，各功能区已就位')}

<p style="text-indent:2em;">对基层篮球培训机构来说，总决赛的热闹是看得见的，但数据档案的建设是一条容易被忽略的暗线。机构负责人更关心的是孩子能不能参赛、比赛打得怎么样。可篮协这一步释放的信号很清楚：青少年篮球正在从"办比赛"走向"建数据"。</p>

<p style="text-indent:2em;">问题是，基层机构跟得上吗？</p>

${img(MAIN_IMAGE_URL, '数据化管理的起点可以很低，一张纸、一支笔就能开始｜AI生成')}

${sep()}

<h2 style="font-size:18px;font-weight:bold;margin:24px 0 12px;color:#1a1a1a;">数字化不是选择题，但也不是抢答题</h2>

<p style="text-indent:2em;">中国篮协推动数字化建设，是已经确认的政策方向。《中国小篮球系列活动指导意见》明确要把报名、身份核验、数据采集放到线上，建立全国统一的数据档案。这对行业规范化是好事。</p>

<p style="text-indent:2em;">但把视角拉回一线球馆，情况很现实。很多机构只有两三个教练，管着几十个孩子，每天备课、上课、沟通家长已经占满时间。让他们再抽出精力搞数字化，第一反应不是"该怎么做"，而是"谁来干"。</p>

<p style="text-indent:2em;">这里有两个常见误区。</p>

<p style="text-indent:2em;">第一个是完全无视。觉得数据档案是篮协的事，跟自己的日常运营没关系。这种想法的问题在于，如果以后更多赛事、评级、选拔都和线上数据挂钩，机构会发现自己的学员没有可追溯的成长记录。</p>

<p style="text-indent:2em;">第二个是盲目追新。听说数字化重要，马上找各种系统、买软件、上平台，结果发现教练不会用、数据填了一堆但没人看、最后变成摆设。</p>

<p style="text-indent:2em;">数字化是方向，但基层机构不必焦虑一步到位。</p>

${sep()}

<h2 style="font-size:18px;font-weight:bold;margin:24px 0 12px;color:#1a1a1a;">先搞清楚篮协要什么，再决定自己要什么</h2>

<p style="text-indent:2em;">篮协推的数字化，核心是两层。</p>

<p style="text-indent:2em;">第一层是赛事管理数字化。报名、资格审核、赛程安排、成绩发布走线上，这是主办方提高效率的手段，参赛机构配合就行。</p>

<p style="text-indent:2em;">第二层是球员成长数据档案。通过中国篮球APP采集球员信息、参赛记录、技能等级等，逐步形成全国小球员的数据库。这是篮协层面的基础设施建设。</p>

<p style="text-indent:2em;">对培训机构来说，关键要区分：篮协的档案是篮协的，机构自己的训练数据是机构的。两者有交集，但不等同。</p>

<p style="text-indent:2em;">篮协的数据档案解决的是"这个孩子参加过什么比赛、拿到什么等级"的履历问题。机构自己的数据应该解决的是"这个孩子这周练了什么、下个月该重点补什么"的教学问题。</p>

<p style="text-indent:2em;">如果机构把"数字化"理解成"配合篮协填表"，那就浪费了数据对日常训练的真正价值。</p>

${sep()}

<h2 style="font-size:18px;font-weight:bold;margin:24px 0 12px;color:#1a1a1a;">三段式跟进，按自己的节奏来</h2>

<p style="text-indent:2em;">基层机构做数据记录，不需要一步到位。根据自己现有的人力和条件，分阶段推进更现实。</p>

<p style="background:#f5f5f5;padding:12px 16px;border-left:4px solid #ff6b35;margin:16px 0;color:#555;"><strong>第一阶段：纸笔记录（现在就能开始）</strong><br/><br/>成本最低，见效最快。每节课带一张纸，记录三个要点：今天练了什么、哪些孩子完成得比较好、哪些问题下节课要再强化。每场比赛记录：上场时间、关键表现、明显短板。<br/><br/>这些记录不需要复杂格式。一张纸、一支笔，课后花三分钟写完。关键是养成习惯，让教练从"凭印象教"变成"有记录教"。</p>

<p style="background:#f5f5f5;padding:12px 16px;border-left:4px solid #ff6b35;margin:16px 0;color:#555;"><strong>第二阶段：简单工具整理（有条件时升级）</strong><br/><br/>当机构有了稳定的数据意识，可以把纸笔记录搬到Excel或在线文档里。按学员姓名建立简单档案，把每节课、每场比赛的关键信息汇总起来。<br/><br/>这个阶段不需要买专业系统。一个共享文档、一张表格，能把一个学期里某个孩子的出勤、训练重点、比赛表现串起来看，就已经超越了大部分同行。</p>

<p style="background:#f5f5f5;padding:12px 16px;border-left:4px solid #ff6b35;margin:16px 0;color:#555;"><strong>第三阶段：接入平台（规模到位后再考虑）</strong><br/><br/>当机构学员规模扩大、有专人负责运营、需要对接官方赛事或家长端服务时，再考虑接入中国篮球APP或其他专业平台。那时候，前面两个阶段积累的数据习惯和基础档案，才是上平台的前提。<br/><br/>很多机构反着来：先买系统，再想办法让教练用起来。结果系统买了，数据质量上不去，沦为空壳。</p>

${sep()}

<h2 style="font-size:18px;font-weight:bold;margin:24px 0 12px;color:#1a1a1a;">数据最大的价值，不是给篮协看的</h2>

<p style="text-indent:2em;">很多机构对数据采集的抵触，来自一个误解：觉得这是额外负担，是为了应付上面的要求。</p>

<p style="text-indent:2em;">实际上，数据对基层机构的最大价值，是帮教练把训练问题说得更具体。</p>

<p style="text-indent:2em;">举个例子。一个孩子最近几场比赛罚球命中率明显下降。如果教练只凭印象，可能会说"他最近手感不好"。但如果翻看一下训练记录，可能会发现最近三周几乎没有安排罚球专项练习，或者上周换了一种新的投篮姿势教学，孩子还没适应。</p>

<p style="text-indent:2em;">有了数据，教练可以做出更准确的判断：是训练内容覆盖不到，是技术动作需要调整，还是比赛心态需要关注。</p>

<p style="text-indent:2em;">数据不负责给答案，数据负责把问题说得更清楚。答案仍然要靠教练的专业判断。</p>

${sep()}

<h2 style="font-size:18px;font-weight:bold;margin:24px 0 12px;color:#1a1a1a;">今天就能开始的三件事</h2>

<p style="text-indent:2em;">机构不必等篮协的系统完善，也不必等自己买了软件。今天就可以开始做三件事：</p>

<p style="text-indent:2em;"><strong>第一，确定记录什么。</strong>不要贪多。对大多数机构，记录出勤、训练内容完成度、比赛关键表现这三项就够了。</p>

<p style="text-indent:2em;"><strong>第二，固定记录人。</strong>每节课指定一位教练负责记录，避免"大家都以为对方记了"。</p>

<p style="text-indent:2em;"><strong>第三，每周复盘一次。</strong>不是复盘所有孩子，而是挑两三个重点学员，看看记录能不能回答一个问题：下周训练要不要调整？</p>

<p style="text-indent:2em;">如果这三件事能坚持下来，机构就已经进入了数据化管理的初级阶段。至于要不要上系统、接平台，那是后面的事。</p>

<p style="text-indent:2em;">全国小篮球总决赛的数据档案建设，最终会让整个行业更规范。但对一家基层机构来说，数字化的起点可以很低，低到一张纸、一支笔。重要的是先开始记录，让数据真正服务于训练和教学，而不是为了数字化而数字化。</p>

${sep()}

<p style="text-align:center;"><img src="${COMMUNITY_QR_URL}" alt="加入群聊" style="max-width:280px;width:70%;height:auto;" /></p>

<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:14px;color:#666;">
<p style="text-indent:0;"><strong>资料来源与证据边界</strong></p>
<p style="text-indent:0;">新华社 2026-05-18：可确认2026年全国小篮球系列活动全面升级、中国篮球APP数字化应用、全国6-12岁小球员数据档案建设、技能等级门槛要求。</p>
<p style="text-indent:0;">国家体育总局 2026-02-05：可确认小篮球赛事数字化服务功能展示方向。</p>
<p style="text-indent:0;">国家体育总局体育经济司 2026-07-07：可确认全国小篮球总决赛时间为8月3日—16日。</p>
<p style="text-indent:0;">基层机构人力配置、数据记录方法、三段式跟进框架属于基于行业经验的建议，非强制标准或精确统计。中国篮球APP的具体功能界面、当前接入机构数量、数据档案的具体技术实现等细节尚未找到公开说明。</p>
</div>
`.trim();
}

async function uploadThumb(file, token) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) throw new Error(`找不到封面文件：${absolute}`);
  const ext = path.extname(absolute).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const form = new FormData();
  form.append('media', new Blob([fs.readFileSync(absolute)], { type: mime }), path.basename(absolute));
  const data = await requestJson(`${WECHAT_BASE}/cgi-bin/material/add_material?access_token=${encodeURIComponent(token)}&type=thumb`, {
    method: 'POST', body: form
  });
  return data.media_id;
}

async function addDraft() {
  const token = await getAccessToken();
  
  const coverPath = 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/图片素材/封面.png';
  console.log('正在上传封面...');
  const thumbMediaId = await uploadThumb(coverPath, token);
  console.log('封面上传成功');
  
  const content = buildContent();
  
  // 保存本地备份
  const backupPath = 'E:/Documents/saixoafeng_basketball/公众号/8月推文/麦步赛事/8月6日/文字稿/完整排版_v2.html';
  fs.writeFileSync(backupPath, `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${content}</body></html>`, 'utf8');
  
  const payload = {
    articles: [{
      title: "小篮球总决赛今日开幕，基层机构的数据\"跟还是不跟\"？",
      author: process.env.ARTICLE_AUTHOR || '麦步赛事',
      digest: "2026中国小篮球全国总决赛今日在北京延庆开幕。本文从赛事现场的数字化建设切入，为基层篮球培训机构提供三段式数据跟进框架。",
      content: content,
      content_source_url: '',
      thumb_media_id: thumbMediaId,
      need_open_comment: 0,
      only_fans_can_comment: 0
    }]
  };
  
  const result = await requestJson(
    `${WECHAT_BASE}/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    }
  );
  
  console.log(JSON.stringify({ ok: true, media_id: result.media_id }, null, 2));
  console.log('备份已保存：' + backupPath);
}

addDraft().catch((error) => {
  console.error(`失败：${error.message}`);
  process.exitCode = 1;
});
