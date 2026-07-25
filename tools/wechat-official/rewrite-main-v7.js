const fs = require("fs");

const input =
  "E:\\Documents\\saixoafeng_basketball\\公众号\\7月25日文章\\蜂狂篮球-2026-07-25-双篇草稿-v6开篇逻辑修订.json";
const output =
  "E:\\Documents\\saixoafeng_basketball\\公众号\\7月25日文章\\蜂狂篮球-2026-07-25-双篇草稿-v7用户逻辑修订.json";

const data = JSON.parse(fs.readFileSync(input, "utf8"));
const article = data.articles[0];
const oldParagraph =
  '<p style="margin:0 0 18px;line-height:1.92;font-size:16px;color:#252525;letter-spacing:0.25px;">赛场上的热闹，和培训机构的生意，不是一套账。688支队伍说明NYBO仍有号召力，却不能说明每家球馆都好招生、好续费。机构觉得生意难做，也不能据此判断孩子已经不喜欢篮球。赛场热不热，看报名和参赛；机构好不好做，看招生、续费和利润。两笔账要分开算。</p>';
const newParagraph =
  '<p style="margin:0 0 18px;line-height:1.92;font-size:16px;color:#252525;letter-spacing:0.25px;">这两个判断并不冲突。总决赛数据记录的是一个头部赛事的参与规模；教培机构感受到的，却是经营端的压力，困难落在招生、续费、价格和校区经营上。把两类数据混在一起，很容易得出两个完全相反的结论：看到赛事人多，就说行业一片繁荣；看到机构难做，就说篮球教培生意已经全面遇冷。</p>';

if (!article.content_html.includes(oldParagraph)) {
  throw new Error("未找到v6开篇段落");
}

article.content_html = article.content_html.replace(oldParagraph, newParagraph);
data.source_note = `${data.source_note || ""} v7依据用户改稿重写开篇反差，同时将“市场集体遇冷”收窄为可由现有资料支撑的经营压力。`.trim();
fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(output);
