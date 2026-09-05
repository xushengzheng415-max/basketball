const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const width = 1080;
const height = 1440;
const outDir = path.resolve("docs/outreach/xiaohongshu/assets/2026-07-25-basketball-scoring-software");
const backgroundPath = path.join(outDir, "basketball-background.png");

const slides = [
  {
    eyebrow: "篮球现场工具选择",
    title: ["篮球计分软件", "怎么选？"],
    accent: "别先看功能数量",
    body: ["现场跑完这 10 分钟", "再决定要不要用"],
    cover: true,
  },
  {
    number: "01",
    eyebrow: "先看使用场景",
    title: ["你要记录的", "是哪种比赛？"],
    body: ["临时约球：开赛速度", "培训机构：名单复用", "正式赛事：规则与记录", "直播赛事：接口与硬件"],
    footer: "场景不同，选型标准也不同",
  },
  {
    number: "02",
    eyebrow: "临时比赛",
    title: ["重点不是功能多", "而是开赛够快"],
    body: ["少填资料，直接进入计分", "得分、暂停、计时在一处完成", "点错以后能马上撤销"],
    footer: "朋友约球、试听课、临时对抗赛适用",
  },
  {
    number: "03",
    eyebrow: "培训机构",
    title: ["别让记录员", "每场重录名单"],
    body: ["球队和球员可以长期保存", "下一场直接选择已有名单", "赛果能关联到场次和球员"],
    footer: "重复录入越多，姓名和号码越容易出错",
  },
  {
    number: "04",
    eyebrow: "正式赛事",
    title: ["先核对规则", "再看软件"],
    body: ["正计时还是倒计时？", "每场几节、每节多久？", "暂停与犯规怎么记录？", "是否需要换人和球员数据？"],
    footer: "赛事规则匹配，比功能列表更重要",
  },
  {
    number: "05",
    eyebrow: "10 分钟现场自测",
    title: ["让一名记录员", "独立跑完全程"],
    body: ["连续记两次得分", "记一次犯规和一次暂停", "切换计时状态", "故意点错一次，再撤销"],
    footer: "不看演示视频，直接模拟真实比赛",
  },
  {
    number: "06",
    eyebrow: "赛后检查",
    title: ["结束比赛后", "再查这 3 件事"],
    body: ["最终比分和时间是否保存", "球队、球员和场次是否可查", "下一场是否要重录全部资料"],
    footer: "能记完，也要能找回",
  },
  {
    number: "07",
    eyebrow: "选择结论",
    title: ["顺手记完一场", "才算真的合适"],
    body: ["临时约球：选轻量计分", "长期办赛：选赛事管理＋移动计分", "专业直播：优先核对系统接口"],
    footer: "赛小蜂篮球｜篮球比赛计分与赛事管理",
  },
];

function esc(text) {
  return text.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[ch]));
}

function textLines(lines, x, y, size, gap, weight = 700, color = "#F6F0E7") {
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * gap}" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(line)}</text>`
  ).join("");
}

function coverSvg(slide) {
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1440" fill="#07111C" fill-opacity="0.22"/>
    <rect x="72" y="72" width="936" height="1296" rx="36" fill="none" stroke="#F47820" stroke-opacity="0.45" stroke-width="2"/>
    <text x="92" y="160" font-family="Microsoft YaHei, sans-serif" font-size="30" font-weight="700" fill="#F47820">${esc(slide.eyebrow)}</text>
    ${textLines(slide.title, 92, 310, 92, 118, 900)}
    <rect x="92" y="570" width="600" height="82" rx="18" fill="#F47820"/>
    <text x="126" y="626" font-family="Microsoft YaHei, sans-serif" font-size="42" font-weight="800" fill="#07111C">${esc(slide.accent)}</text>
    ${textLines(slide.body, 96, 745, 38, 58, 600, "#E7DDD1")}
    <text x="92" y="1308" font-family="Microsoft YaHei, sans-serif" font-size="26" font-weight="600" fill="#C7B9A8">赛小蜂篮球 · 01/08</text>
  </svg>`;
}

function innerSvg(slide, index) {
  const bullets = slide.body.map((line, i) => {
    const y = 700 + i * 116;
    return `
      <circle cx="122" cy="${y - 12}" r="10" fill="#F47820"/>
      <text x="158" y="${y}" font-family="Microsoft YaHei, sans-serif" font-size="38" font-weight="600" fill="#162434">${esc(line)}</text>`;
  }).join("");
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1440" fill="#F4EFE7"/>
    <rect x="0" y="0" width="1080" height="34" fill="#F47820"/>
    <circle cx="916" cy="164" r="105" fill="#0B1B2A"/>
    <text x="916" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="74" font-weight="900" fill="#F47820">${slide.number}</text>
    <text x="92" y="180" font-family="Microsoft YaHei, sans-serif" font-size="30" font-weight="700" fill="#E66512">${esc(slide.eyebrow)}</text>
    ${textLines(slide.title, 92, 330, 70, 94, 900, "#0B1B2A")}
    <rect x="92" y="565" width="896" height="3" fill="#D7CBBE"/>
    ${bullets}
    <rect x="72" y="1242" width="936" height="110" rx="24" fill="#0B1B2A"/>
    <text x="540" y="1310" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="28" font-weight="700" fill="#F6F0E7">${esc(slide.footer)}</text>
    <text x="92" y="1392" font-family="Microsoft YaHei, sans-serif" font-size="22" font-weight="600" fill="#7D7165">赛小蜂篮球</text>
    <text x="988" y="1392" text-anchor="end" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#7D7165">${String(index + 1).padStart(2, "0")}/08</text>
  </svg>`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(backgroundPath)) {
    throw new Error(`Missing background: ${backgroundPath}`);
  }

  for (let i = 0; i < slides.length; i += 1) {
    const slide = slides[i];
    const output = path.join(outDir, `${String(i + 1).padStart(2, "0")}.png`);
    if (slide.cover) {
      await sharp(backgroundPath)
        .resize(width, height, { fit: "cover" })
        .composite([{ input: Buffer.from(coverSvg(slide)) }])
        .png()
        .toFile(output);
    } else {
      await sharp(Buffer.from(innerSvg(slide, i))).png().toFile(output);
    }
  }
  console.log(`Rendered ${slides.length} slides to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
