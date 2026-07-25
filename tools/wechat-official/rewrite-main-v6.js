const fs = require("fs");

const input =
  "E:\\Documents\\saixoafeng_basketball\\公众号\\7月25日文章\\蜂狂篮球-2026-07-25-双篇草稿-v5爆款机制创新稿.json";
const output =
  "E:\\Documents\\saixoafeng_basketball\\公众号\\7月25日文章\\蜂狂篮球-2026-07-25-双篇草稿-v6开篇逻辑修订.json";

const data = JSON.parse(fs.readFileSync(input, "utf8"));
const article = data.articles[0];

const oldParagraph =
  '<p style="margin:0 0 18px;line-height:1.92;font-size:16px;color:#252525;letter-spacing:0.25px;">这两个判断并不冲突。总决赛数据记录的是一个头部赛事的参与规模；机构感受到的冷暖，落在招生、续费、价格和校区经营上。把两类数据混在一起，很容易得出过头的结论：赛事人多，于是行业一片繁荣；机构难做，于是篮球已经没人学。</p>';
const newParagraph =
  '<p style="margin:0 0 18px;line-height:1.92;font-size:16px;color:#252525;letter-spacing:0.25px;">赛场上的热闹，和培训机构的生意，不是一套账。688支队伍说明NYBO仍有号召力，却不能说明每家球馆都好招生、好续费。机构觉得生意难做，也不能据此判断孩子已经不喜欢篮球。赛场热不热，看报名和参赛；机构好不好做，看招生、续费和利润。两笔账要分开算。</p>';
const oldFollowup =
  '<p style="margin:0 0 18px;line-height:1.92;font-size:16px;color:#252525;letter-spacing:0.25px;">公开资料支持的判断要窄一些：<strong>NYBO总决赛仍能吸引大量孩子参赛；整体体培市场里的家长，挑选培训服务时比过去更谨慎。</strong></p>';
const newFollowup =
  '<p style="margin:0 0 18px;line-height:1.92;font-size:16px;color:#252525;letter-spacing:0.25px;">从现有资料看，<strong>NYBO总决赛仍能吸引大量孩子参赛；整体体培市场里的家长，挑选培训服务时比过去更谨慎。</strong></p>';

if (!article.content_html.includes(oldParagraph)) {
  throw new Error("未找到需要替换的开篇段落");
}
if (!article.content_html.includes(oldFollowup)) {
  throw new Error("未找到需要替换的承接段落");
}

article.content_html = article.content_html
  .replace(oldParagraph, newParagraph)
  .replace(oldFollowup, newFollowup);

data.source_note = `${data.source_note || ""} v6仅修订行业主文开篇逻辑表达，不改变标题、事实、图片与《蜂家日记》内容。`.trim();
fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(output);
