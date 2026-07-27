const fs = require('fs');
const path = require('path');

const outDir = __dirname;

const colors = {
  bg: '#f3f6fa',
  ink: '#07131d',
  muted: '#647184',
  line: '#dbe3ee',
  navy: '#07131d',
  panel: '#101f2c',
  panel2: '#203244',
  orange: '#ff4d18',
  orange2: '#e6360a',
  yellow: '#ffd956',
  green: '#00c68a',
  white: '#ffffff',
};

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function file(name, svg) {
  fs.writeFileSync(path.join(outDir, name), svg, 'utf8');
}

function svgWrap(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#07131d" flood-opacity=".14"/>
    </filter>
    <linearGradient id="orangeGrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#ff6a20"/>
      <stop offset="100%" stop-color="#e93708"/>
    </linearGradient>
    <linearGradient id="darkGrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0e1f2b"/>
      <stop offset="100%" stop-color="#07131d"/>
    </linearGradient>
  </defs>
  <style>
    text{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;dominant-baseline:hanging}
    .title{font-weight:800;fill:${colors.ink}}
    .sub{fill:${colors.muted}}
    .white{fill:#fff}
    .muted{fill:${colors.muted}}
    .small{font-size:14px}
    .label{font-size:18px;font-weight:700;fill:${colors.ink}}
    .btnText{font-size:18px;font-weight:800}
    .score{font-size:92px;font-weight:900;fill:${colors.orange}}
  </style>
  ${body}
</svg>`;
}

function phoneShell(title, body) {
  return svgWrap(390, 844, `
  <rect width="390" height="844" rx="0" fill="${colors.bg}"/>
  <rect y="0" width="390" height="88" fill="${colors.navy}"/>
  <text x="195" y="45" text-anchor="middle" font-size="17" font-weight="800" fill="#fff">${esc(title)}</text>
  <circle cx="315" cy="58" r="17" fill="#111c27" stroke="#3b4a58"/>
  <circle cx="350" cy="58" r="17" fill="#111c27" stroke="#3b4a58"/>
  <text x="27" y="48" font-size="30" fill="#fff">‹</text>
  ${body}
  <rect y="786" width="390" height="58" fill="#fff"/>
  <line x1="0" y1="786" x2="390" y2="786" stroke="${colors.line}"/>
  <text x="53" y="809" text-anchor="middle" font-size="13" fill="${colors.orange}">首页</text>
  <text x="145" y="809" text-anchor="middle" font-size="13" fill="${colors.muted}">赛事</text>
  <text x="240" y="809" text-anchor="middle" font-size="13" fill="${colors.muted}">球员</text>
  <text x="334" y="809" text-anchor="middle" font-size="13" fill="${colors.muted}">我的</text>
  <rect x="143" y="831" width="104" height="4" rx="2" fill="#111"/>
  `);
}

function card(x, y, w, h, fill = '#fff', radius = 8) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" filter="url(#shadow)"/>`;
}

function button(x, y, w, h, text, fill = colors.orange, fg = '#fff') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>
  <text x="${x + w / 2}" y="${y + h / 2 - 10}" text-anchor="middle" class="btnText" fill="${fg}">${esc(text)}</text>`;
}

function input(x, y, w, h, text) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#f8fafc" stroke="${colors.line}"/>
  <text x="${x + 14}" y="${y + h / 2 - 9}" font-size="16" fill="${colors.muted}">${esc(text)}</text>`;
}

file('01-登录页.svg', phoneShell('登录', `
  <rect x="0" y="88" width="390" height="420" fill="url(#orangeGrad)"/>
  <path d="M0 120 L390 340" stroke="#ffb34d" stroke-opacity=".22" stroke-width="22"/>
  <path d="M0 230 L390 150" stroke="#fff" stroke-opacity=".22" stroke-width="8"/>
  <circle cx="195" cy="238" r="72" fill="#fff" opacity=".94"/>
  <path d="M153 232 C175 176 237 178 238 232 C222 206 179 205 153 232Z" fill="${colors.navy}"/>
  <circle cx="231" cy="218" r="13" fill="${colors.navy}"/>
  <circle cx="238" cy="260" r="28" fill="${colors.orange}"/>
  <text x="195" y="334" text-anchor="middle" font-size="34" font-weight="900" fill="#fff">赛小蜂篮球</text>
  <text x="195" y="384" text-anchor="middle" font-size="15" font-weight="700" fill="${colors.yellow}">热爱上场 · 蜂行无畏</text>
  <rect x="24" y="512" width="342" height="250" rx="26" fill="#fff" filter="url(#shadow)"/>
  <circle cx="195" cy="508" r="24" fill="${colors.navy}" stroke="#fff" stroke-width="5"/>
  ${button(54, 552, 282, 54, '微信一键登录', 'url(#orangeGrad)')}
  ${button(54, 622, 282, 54, '游客体验', '#fff', colors.ink)}
  <rect x="54" y="622" width="282" height="54" rx="8" fill="none" stroke="${colors.line}"/>
  <circle cx="96" cy="696" r="8" fill="${colors.orange}"/>
  <text x="110" y="687" font-size="12" fill="${colors.muted}">登录即代表同意 用户协议 和 隐私政策</text>
`));

file('02-首页.svg', phoneShell('赛小蜂篮球', `
  <rect x="14" y="112" width="362" height="160" rx="8" fill="url(#darkGrad)"/>
  <text x="30" y="132" font-size="15" font-weight="800" fill="${colors.yellow}">赛小蜂篮球</text>
  <text x="30" y="162" font-size="26" font-weight="900" fill="#fff">快速开始一场比赛</text>
  <text x="30" y="202" font-size="14" fill="#cbd5e1">设置主客队和比赛时间，横屏计分。</text>
  ${button(30, 230, 96, 34, '开始设置', colors.yellow, colors.ink)}
  <rect x="14" y="284" width="362" height="58" rx="7" fill="#fff7ed" stroke="#ffd4b8"/>
  <text x="30" y="301" font-size="15" font-weight="800" fill="${colors.orange2}">分享朋友圈可解锁 MC 音效 1 天</text>
  <text x="30" y="323" font-size="12" fill="${colors.muted}">点击计分盘上方提示即可解锁现场音效。</text>
  <text x="14" y="362" font-size="18" font-weight="900" fill="${colors.ink}">最近赛果</text>
  ${card(14, 394, 362, 112)}
  <text x="30" y="416" font-size="18" font-weight="800" fill="${colors.ink}">主队</text>
  <text x="334" y="410" text-anchor="middle" font-size="30" font-weight="900" fill="${colors.orange}">68</text>
  <text x="30" y="454" font-size="18" font-weight="800" fill="${colors.ink}">客队</text>
  <text x="334" y="448" text-anchor="middle" font-size="30" font-weight="900" fill="${colors.orange}">64</text>
  <text x="30" y="486" font-size="12" fill="${colors.muted}">2026-07-05 20:30</text>
  ${card(14, 522, 174, 74)}
  <text x="30" y="542" font-size="17" font-weight="800" fill="${colors.ink}">创建赛事</text>
  <text x="30" y="568" font-size="12" fill="${colors.muted}">赛事名称、地点、日期</text>
  ${card(202, 522, 174, 74)}
  <text x="218" y="542" font-size="17" font-weight="800" fill="${colors.ink}">球员库</text>
  <text x="218" y="568" font-size="12" fill="${colors.muted}">添加球员与号码</text>
`));

file('03-快速比赛设置.svg', phoneShell('比赛计分', `
  ${card(16, 112, 358, 606)}
  <text x="34" y="134" font-size="27" font-weight="900" fill="${colors.ink}">快速开始比赛</text>
  <text x="34" y="174" font-size="14" fill="${colors.muted}">设置主客队、比赛节数、每节时长和计时方式。</text>
  <text x="34" y="214" class="label">主队名称</text>
  ${input(34, 244, 322, 48, '主队')}
  <text x="34" y="310" class="label">客队名称</text>
  ${input(34, 340, 322, 48, '客队')}
  <text x="34" y="406" class="label">每节时长</text>
  <rect x="34" y="438" width="96" height="40" rx="7" fill="#fff" stroke="${colors.line}"/><text x="82" y="450" text-anchor="middle" font-size="16" font-weight="800">6分</text>
  <rect x="146" y="438" width="96" height="40" rx="7" fill="${colors.orange}"/><text x="194" y="450" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">8分</text>
  <rect x="258" y="438" width="96" height="40" rx="7" fill="#fff" stroke="${colors.line}"/><text x="306" y="450" text-anchor="middle" font-size="16" font-weight="800">10分</text>
  <text x="34" y="506" class="label">比赛节数</text>
  <rect x="34" y="538" width="96" height="40" rx="7" fill="#fff" stroke="${colors.line}"/><text x="82" y="550" text-anchor="middle" font-size="16" font-weight="800">2节</text>
  <rect x="146" y="538" width="96" height="40" rx="7" fill="${colors.orange}"/><text x="194" y="550" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">4节</text>
  <rect x="258" y="538" width="96" height="40" rx="7" fill="#fff" stroke="${colors.line}"/><text x="306" y="550" text-anchor="middle" font-size="16" font-weight="800">6节</text>
  <text x="34" y="606" class="label">计时方式</text>
  <rect x="34" y="638" width="154" height="42" rx="7" fill="${colors.orange}"/><text x="111" y="650" text-anchor="middle" font-size="17" font-weight="900" fill="#fff">倒计时</text>
  <rect x="202" y="638" width="154" height="42" rx="7" fill="#fff" stroke="${colors.line}"/><text x="279" y="650" text-anchor="middle" font-size="17" font-weight="900" fill="${colors.ink}">正计时</text>
  ${button(34, 696, 322, 50, '开始比赛', 'url(#orangeGrad)')}
`));

file('04-横屏计分盘.svg', svgWrap(844, 390, `
  <rect width="844" height="390" fill="${colors.navy}"/>
  <rect y="0" width="844" height="56" fill="#06111a"/>
  <text x="422" y="18" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">比赛计分</text>
  <text x="20" y="84" font-size="20" font-weight="900" fill="#fff">赛小蜂篮球计分盘</text>
  <rect x="598" y="76" width="118" height="30" rx="15" fill="#063f36"/><text x="657" y="83" text-anchor="middle" font-size="14" font-weight="800" fill="${colors.green}">MC 音效已解锁</text>
  ${button(732, 70, 92, 42, '结束比赛', colors.orange2)}
  <rect x="20" y="126" width="804" height="76" rx="12" fill="#26333d"/>
  <text x="40" y="142" font-size="28" font-weight="900" fill="${colors.yellow}">第 1 / 4 节</text>
  <text x="40" y="176" font-size="16" fill="#d5dce5">倒计时 · 10 分钟</text>
  <text x="442" y="135" text-anchor="middle" font-size="52" font-weight="900" fill="#fff">10:00</text>
  ${button(586, 140, 76, 42, '开始', colors.yellow, colors.ink)}
  ${button(674, 140, 76, 42, '复位', '#fff', colors.ink)}
  ${button(762, 140, 54, 42, '下节', '#fff', colors.ink)}
  <rect x="16" y="214" width="340" height="144" rx="10" fill="#fff"/>
  <text x="186" y="224" text-anchor="middle" font-size="22" font-weight="900" fill="${colors.ink}">主队</text>
  <text x="186" y="252" text-anchor="middle" class="score">5</text>
  <text x="38" y="315" font-size="18" font-weight="800" fill="${colors.ink}">犯规 0</text>
  <text x="192" y="315" font-size="18" font-weight="800" fill="${colors.ink}">暂停 0</text>
  ${button(36, 338, 92, 34, '+1', colors.orange)}
  ${button(140, 338, 92, 34, '+2', colors.orange)}
  ${button(244, 338, 92, 34, '长按+3', colors.orange2)}
  <text x="422" y="222" text-anchor="middle" font-size="44" font-weight="900" fill="#fff">VS</text>
  ${button(384, 270, 76, 34, '换边', '#fff', colors.ink)}
  ${button(384, 312, 76, 34, '撤销', colors.yellow, colors.ink)}
  <rect x="488" y="214" width="340" height="144" rx="10" fill="#fff"/>
  <text x="658" y="224" text-anchor="middle" font-size="22" font-weight="900" fill="${colors.ink}">客队</text>
  <text x="658" y="252" text-anchor="middle" class="score">2</text>
  <text x="510" y="315" font-size="18" font-weight="800" fill="${colors.ink}">犯规 0</text>
  <text x="664" y="315" font-size="18" font-weight="800" fill="${colors.ink}">暂停 0</text>
  ${button(508, 338, 92, 34, '+1', colors.orange)}
  ${button(612, 338, 92, 34, '+2', colors.orange)}
  ${button(716, 338, 92, 34, '长按+3', colors.orange2)}
  <rect x="0" y="205" width="42" height="110" rx="14" fill="#132536" stroke="#30475b"/>
  <circle cx="21" cy="234" r="8" fill="${colors.green}"/>
  <text x="21" y="254" text-anchor="middle" font-size="17" font-weight="900" fill="${colors.yellow}">MC</text>
  <rect x="16" y="364" width="812" height="22" rx="11" fill="#1d2b38"/>
  <text x="34" y="367" font-size="16" fill="#d5dce5">最近记录</text>
  <text x="772" y="367" text-anchor="middle" font-size="16" fill="#d5dce5">主队 +2</text>
`));

file('05-MC音效抽屉.svg', svgWrap(844, 390, `
  <rect width="844" height="390" fill="${colors.navy}"/>
  <rect x="16" y="20" width="340" height="144" rx="10" fill="#fff" opacity=".55"/>
  <rect x="488" y="20" width="340" height="144" rx="10" fill="#fff" opacity=".55"/>
  <rect x="0" y="0" width="250" height="390" fill="#101f2c" filter="url(#shadow)"/>
  <text x="22" y="24" font-size="22" font-weight="900" fill="#fff">MC 控制台</text>
  <rect x="208" y="18" width="30" height="30" rx="8" fill="#334155"/>
  <text x="223" y="23" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">×</text>
  <text x="22" y="68" font-size="15" font-weight="800" fill="#cbd5e1">音效</text>
  ${button(22, 94, 88, 36, '欢呼', colors.yellow, colors.ink)}
  ${button(120, 94, 88, 36, '投篮未进', colors.panel2)}
  ${button(22, 142, 186, 38, '2分有效', colors.panel2)}
  ${button(22, 190, 186, 38, '休息音乐', colors.panel2)}
  <text x="22" y="248" font-size="15" font-weight="800" fill="#cbd5e1">循环音乐</text>
  ${button(22, 274, 88, 42, '进攻', colors.yellow, colors.ink)}
  ${button(120, 274, 88, 42, '防守', colors.panel2)}
  <text x="270" y="246" text-anchor="middle" font-size="40" font-weight="900" fill="#fff">VS</text>
  <rect x="358" y="214" width="128" height="82" rx="14" fill="#101f2c"/>
  <text x="422" y="236" text-anchor="middle" font-size="18" font-weight="900" fill="#fff">播报比分</text>
  <text x="422" y="264" text-anchor="middle" font-size="13" fill="#cbd5e1">使用赛小瑜</text>
`));

file('06-外设快捷键.svg', svgWrap(844, 390, `
  <rect width="844" height="390" fill="${colors.navy}"/>
  <rect x="606" y="18" width="222" height="330" rx="12" fill="#101f2c" filter="url(#shadow)"/>
  <text x="626" y="42" font-size="22" font-weight="900" fill="#fff">外设快捷键</text>
  <text x="626" y="74" font-size="13" fill="#aab6c3">6 键蓝牙小键盘专用，可监听后绑定音效。</text>
  ${button(626, 102, 82, 34, '监听', colors.panel2)}
  ${button(720, 102, 82, 34, '编辑', colors.yellow, colors.ink)}
  <rect x="626" y="156" width="58" height="52" rx="8" fill="#334155"/><text x="655" y="164" text-anchor="middle" font-size="18" font-weight="900" fill="${colors.yellow}">1</text><text x="655" y="188" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">欢呼</text>
  <rect x="696" y="156" width="58" height="52" rx="8" fill="#334155"/><text x="725" y="164" text-anchor="middle" font-size="18" font-weight="900" fill="${colors.yellow}">2</text><text x="725" y="188" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">2分</text>
  <rect x="766" y="156" width="58" height="52" rx="8" fill="#334155"/><text x="795" y="164" text-anchor="middle" font-size="18" font-weight="900" fill="${colors.yellow}">3</text><text x="795" y="188" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">3分</text>
  <rect x="626" y="222" width="58" height="52" rx="8" fill="#334155"/><text x="655" y="230" text-anchor="middle" font-size="18" font-weight="900" fill="${colors.yellow}">4</text><text x="655" y="254" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">休息</text>
  <rect x="696" y="222" width="58" height="52" rx="8" fill="#334155"/><text x="725" y="230" text-anchor="middle" font-size="18" font-weight="900" fill="${colors.yellow}">5</text><text x="725" y="254" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">进攻</text>
  <rect x="766" y="222" width="58" height="52" rx="8" fill="#334155"/><text x="795" y="230" text-anchor="middle" font-size="18" font-weight="900" fill="${colors.yellow}">6</text><text x="795" y="254" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">防守</text>
  <rect x="22" y="80" width="548" height="210" rx="12" fill="#fff" opacity=".8"/>
  <text x="296" y="136" text-anchor="middle" font-size="72" font-weight="900" fill="${colors.orange}">68 : 64</text>
  <text x="296" y="222" text-anchor="middle" font-size="22" font-weight="800" fill="${colors.ink}">右侧抽屉只负责外设触发，不占主计分空间</text>
`));

file('07-我的页面.svg', phoneShell('我的', `
  <rect x="16" y="112" width="358" height="154" rx="8" fill="url(#darkGrad)"/>
  <circle cx="74" cy="178" r="34" fill="#fff"/>
  <circle cx="74" cy="166" r="12" fill="#cbd5e1"/>
  <path d="M52 204 C58 185 91 185 96 204Z" fill="#cbd5e1"/>
  <text x="128" y="138" font-size="14" font-weight="800" fill="${colors.yellow}">我的账号</text>
  <text x="128" y="164" font-size="28" font-weight="900" fill="#fff">大头</text>
  <text x="128" y="202" font-size="14" fill="#cbd5e1">已登录 · 173****6663</text>
  ${button(32, 220, 326, 34, '退出登录', '#303b47')}
  ${card(16, 286, 358, 96)}
  <text x="32" y="306" font-size="18" font-weight="900" fill="${colors.ink}">会员兑换</text>
  <text x="318" y="306" font-size="13" fill="${colors.green}">已解锁</text>
  ${input(32, 336, 326, 36, '输入会员兑换码')}
  ${card(16, 398, 358, 74)}
  <text x="32" y="418" font-size="18" font-weight="900" fill="${colors.ink}">MC 音效设置</text>
  <text x="302" y="418" font-size="13" fill="${colors.muted}">快捷键 / 本机音效</text>
  <text x="32" y="446" font-size="13" fill="${colors.muted}">管理 2分、3分音效、进攻防守音乐和 6 键快捷键。</text>
  ${card(16, 490, 358, 164)}
  <text x="32" y="510" font-size="18" font-weight="900" fill="${colors.ink}">意见反馈</text>
  <rect x="32" y="548" width="100" height="34" rx="6" fill="${colors.orange}"/><text x="82" y="556" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">功能建议</text>
  <rect x="144" y="548" width="100" height="34" rx="6" fill="#fff" stroke="${colors.line}"/><text x="194" y="556" text-anchor="middle" font-size="14" font-weight="800">问题反馈</text>
  <rect x="256" y="548" width="100" height="34" rx="6" fill="#fff" stroke="${colors.line}"/><text x="306" y="556" text-anchor="middle" font-size="14" font-weight="800">赛事合作</text>
  <rect x="32" y="596" width="326" height="42" rx="6" fill="#f8fafc" stroke="${colors.line}"/>
  <text x="44" y="610" font-size="13" fill="${colors.muted}">告诉我们哪里不好用，或者希望增加什么功能</text>
`));

file('08-MC音效设置.svg', phoneShell('音效设置', `
  ${card(16, 112, 358, 146)}
  <text x="32" y="132" font-size="20" font-weight="900" fill="${colors.ink}">基础开关</text>
  <text x="32" y="174" font-size="18" font-weight="800" fill="${colors.ink}">2分音效</text>
  <rect x="314" y="170" width="44" height="24" rx="12" fill="${colors.green}"/><circle cx="346" cy="182" r="11" fill="#fff"/>
  <text x="32" y="214" font-size="18" font-weight="800" fill="${colors.ink}">3分音效</text>
  <rect x="314" y="210" width="44" height="24" rx="12" fill="${colors.green}"/><circle cx="346" cy="222" r="11" fill="#fff"/>
  ${card(16, 278, 358, 360)}
  <text x="32" y="298" font-size="20" font-weight="900" fill="${colors.ink}">音效类型与播放策略</text>
  <text x="32" y="340" font-size="18" font-weight="900" fill="${colors.ink}">休息音乐</text>
  <text x="32" y="366" font-size="13" fill="${colors.muted}">当前：Remember the Name</text>
  <rect x="218" y="336" width="64" height="34" rx="7" fill="${colors.orange}"/><text x="250" y="344" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">随机</text>
  <rect x="292" y="336" width="64" height="34" rx="7" fill="#fff" stroke="${colors.line}"/><text x="324" y="344" text-anchor="middle" font-size="14" font-weight="800">固定</text>
  <text x="32" y="418" font-size="18" font-weight="900" fill="${colors.ink}">进攻音乐</text>
  <text x="32" y="444" font-size="13" fill="${colors.muted}">当前：云端随机 3 首</text>
  <rect x="218" y="414" width="64" height="34" rx="7" fill="${colors.orange}"/><text x="250" y="422" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">随机</text>
  <rect x="292" y="414" width="64" height="34" rx="7" fill="#fff" stroke="${colors.line}"/><text x="324" y="422" text-anchor="middle" font-size="14" font-weight="800">固定</text>
  <text x="32" y="496" font-size="18" font-weight="900" fill="${colors.ink}">防守音乐</text>
  <text x="32" y="522" font-size="13" fill="${colors.muted}">当前：云端随机 3 首</text>
  <rect x="218" y="492" width="64" height="34" rx="7" fill="${colors.orange}"/><text x="250" y="500" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">随机</text>
  <rect x="292" y="492" width="64" height="34" rx="7" fill="#fff" stroke="${colors.line}"/><text x="324" y="500" text-anchor="middle" font-size="14" font-weight="800">固定</text>
  <text x="32" y="574" font-size="18" font-weight="900" fill="${colors.ink}">播报语音包</text>
  <text x="32" y="600" font-size="13" fill="${colors.muted}">赛小智 / 赛小瑜 / 赛小萌</text>
  ${button(32, 660, 326, 48, '保存设置', 'url(#orangeGrad)')}
`));

file('09-赛事列表.svg', phoneShell('赛事', `
  <text x="16" y="112" font-size="28" font-weight="900" fill="${colors.ink}">创建赛事</text>
  ${card(16, 154, 358, 196)}
  ${input(32, 176, 326, 42, '赛事名称，例如：黄冠篮球赛')}
  ${input(32, 232, 326, 42, '比赛地点，例如：1号场地')}
  ${input(32, 288, 326, 42, '选择比赛日期')}
  ${button(32, 358, 326, 46, '保存赛事', 'url(#orangeGrad)')}
  <text x="16" y="430" font-size="20" font-weight="900" fill="${colors.ink}">已创建赛事</text>
  ${card(16, 470, 358, 108)}
  <text x="32" y="492" font-size="22" font-weight="900" fill="${colors.ink}">黄冠篮球赛</text>
  <text x="32" y="528" font-size="14" fill="${colors.muted}">1号场地 · 2026-07-05</text>
  ${button(236, 488, 54, 34, '编辑', colors.panel2)}
  ${button(302, 488, 54, 34, '删除', colors.orange)}
  ${card(16, 598, 358, 92)}
  <text x="32" y="620" font-size="22" font-weight="900" fill="${colors.ink}">练习赛</text>
  <text x="32" y="656" font-size="14" fill="${colors.muted}">未填写日期</text>
`));

file('10-赛事详情场次.svg', phoneShell('赛事详情', `
  <rect x="16" y="112" width="358" height="128" rx="8" fill="url(#darkGrad)"/>
  <text x="32" y="132" font-size="15" font-weight="800" fill="${colors.yellow}">当前赛事</text>
  <text x="32" y="164" font-size="28" font-weight="900" fill="#fff">黄冠篮球赛</text>
  <text x="32" y="206" font-size="14" fill="#cbd5e1">1号场地 · 2026-07-05</text>
  <text x="16" y="264" font-size="20" font-weight="900" fill="${colors.ink}">创建场次</text>
  ${card(16, 300, 358, 236)}
  ${input(32, 322, 326, 42, '场次名称，例如：小组赛')}
  ${input(32, 378, 326, 42, '选择场次日期')}
  ${input(32, 434, 154, 42, '主队名称')}
  ${input(204, 434, 154, 42, '客队名称')}
  ${button(32, 492, 326, 46, '保存场次', 'url(#orangeGrad)')}
  <text x="16" y="562" font-size="20" font-weight="900" fill="${colors.ink}">赛事场次</text>
  ${card(16, 600, 358, 96)}
  <text x="32" y="622" font-size="20" font-weight="900" fill="${colors.ink}">小组赛第一场</text>
  <text x="32" y="656" font-size="14" fill="${colors.muted}">主队 vs 客队 · 已选 4 人</text>
  <text x="310" y="636" font-size="14" font-weight="900" fill="${colors.orange}">添加球员</text>
`));

file('11-球员库.svg', phoneShell('球员库', `
  <text x="16" y="112" font-size="28" font-weight="900" fill="${colors.ink}">球员库</text>
  <text x="16" y="148" font-size="14" fill="${colors.muted}">球衣号不可重复，已使用号码会自动锁定。</text>
  ${card(16, 184, 358, 176)}
  ${input(32, 206, 326, 42, '球员姓名')}
  ${input(32, 262, 326, 42, '球衣号码，例如：8')}
  <text x="32" y="316" font-size="12" fill="${colors.muted}">已占用号码：#1、#2、#3、#5</text>
  ${button(32, 340, 326, 44, '添加球员', 'url(#orangeGrad)')}
  <text x="16" y="414" font-size="20" font-weight="900" fill="${colors.ink}">当前名单</text>
  ${card(16, 452, 358, 56)}<text x="32" y="470" font-size="20" font-weight="900" fill="${colors.orange}">#1</text><text x="72" y="472" font-size="18" font-weight="800" fill="${colors.ink}">李现</text><text x="322" y="472" font-size="14" font-weight="900" fill="${colors.orange}">删除</text>
  ${card(16, 520, 358, 56)}<text x="32" y="538" font-size="20" font-weight="900" fill="${colors.orange}">#3</text><text x="72" y="540" font-size="18" font-weight="800" fill="${colors.ink}">王浩</text><text x="322" y="540" font-size="14" font-weight="900" fill="${colors.orange}">删除</text>
  ${card(16, 588, 358, 56)}<text x="32" y="606" font-size="20" font-weight="900" fill="${colors.orange}">#5</text><text x="72" y="608" font-size="18" font-weight="800" fill="${colors.ink}">李哲</text><text x="322" y="608" font-size="14" font-weight="900" fill="${colors.orange}">删除</text>
`));

file('12-PC管理后台.svg', svgWrap(1440, 900, `
  <rect width="1440" height="900" fill="${colors.bg}"/>
  <rect width="220" height="900" fill="${colors.navy}"/>
  <text x="32" y="40" font-size="18" font-weight="900" fill="${colors.yellow}">赛小蜂篮球</text>
  <text x="32" y="72" font-size="32" font-weight="900" fill="#fff">运营后台</text>
  <rect x="24" y="156" width="172" height="42" rx="8" fill="${colors.panel2}"/><text x="42" y="168" font-size="16" font-weight="800" fill="#fff">数据概览</text>
  <text x="42" y="238" font-size="16" font-weight="800" fill="#cbd5e1">用户资料</text>
  <text x="42" y="298" font-size="16" font-weight="800" fill="#cbd5e1">会员码</text>
  <text x="42" y="358" font-size="16" font-weight="800" fill="#cbd5e1">MC 音乐库</text>
  <text x="260" y="52" font-size="34" font-weight="900" fill="${colors.ink}">小程序数据看板</text>
  <text x="260" y="94" font-size="18" fill="${colors.muted}">查看用户、反馈、权益、会员码，并维护 MC 音乐库。</text>
  ${button(1240, 42, 86, 38, '读取云端', colors.orange)}
  ${card(260, 136, 170, 92)}<text x="284" y="158" font-size="16" font-weight="800" fill="${colors.muted}">用户数</text><text x="284" y="188" font-size="34" font-weight="900" fill="${colors.ink}">128</text>
  ${card(452, 136, 170, 92)}<text x="476" y="158" font-size="16" font-weight="800" fill="${colors.muted}">反馈数</text><text x="476" y="188" font-size="34" font-weight="900" fill="${colors.ink}">12</text>
  ${card(644, 136, 170, 92)}<text x="668" y="158" font-size="16" font-weight="800" fill="${colors.muted}">会员数</text><text x="668" y="188" font-size="34" font-weight="900" fill="${colors.ink}">36</text>
  ${card(836, 136, 170, 92)}<text x="860" y="158" font-size="16" font-weight="800" fill="${colors.muted}">赛果数</text><text x="860" y="188" font-size="34" font-weight="900" fill="${colors.ink}">420</text>
  ${card(260, 268, 1040, 250)}
  <text x="284" y="294" font-size="22" font-weight="900" fill="${colors.ink}">用户资料</text>
  <line x1="284" y1="342" x2="1260" y2="342" stroke="${colors.line}"/>
  <text x="284" y="362" font-size="15" font-weight="800" fill="${colors.muted}">昵称</text><text x="480" y="362" font-size="15" font-weight="800" fill="${colors.muted}">手机号</text><text x="700" y="362" font-size="15" font-weight="800" fill="${colors.muted}">会员状态</text><text x="930" y="362" font-size="15" font-weight="800" fill="${colors.muted}">活动</text><text x="1130" y="362" font-size="15" font-weight="800" fill="${colors.muted}">操作</text>
  <text x="284" y="410" font-size="17" font-weight="900" fill="${colors.ink}">微信用户</text><text x="480" y="410" font-size="17" fill="${colors.ink}">173****6663</text><text x="700" y="410" font-size="17" fill="${colors.green}">分享会员 · 1天</text><text x="930" y="410" font-size="17" fill="${colors.ink}">使用 2.4 小时</text><text x="1130" y="410" font-size="15" font-weight="900" fill="${colors.orange}">调整时间</text>
  ${card(260, 550, 1040, 220)}
  <text x="284" y="576" font-size="22" font-weight="900" fill="${colors.ink}">MC 音乐库</text>
  <rect x="284" y="626" width="220" height="40" rx="6" fill="#fff" stroke="${colors.line}"/><text x="304" y="638" font-size="16" fill="${colors.ink}">进攻音乐</text>
  <rect x="526" y="626" width="320" height="40" rx="6" fill="#fff" stroke="${colors.line}"/><text x="546" y="638" font-size="16" fill="${colors.muted}">音效名称，例如：Remember the Name</text>
  <rect x="868" y="626" width="360" height="40" rx="6" fill="#fff" stroke="${colors.line}"/><text x="888" y="638" font-size="16" fill="${colors.muted}">cloud://.../mc-mp3/...</text>
  ${button(284, 690, 126, 42, '保存到音乐库', colors.green)}
`));

file('README.md', `# 赛小蜂篮球 1.0 静态原型图

本文件夹用于保存当前阶段 MVP 原型图，风格参考 \`E:\\OneDrive\\Desktop\\赛小蜂篮球\\赛小蜂篮球UI\`，但只覆盖 1.0 需要先上线验证的核心链路。

## 图纸清单

1. 01-登录页.svg
2. 02-首页.svg
3. 03-快速比赛设置.svg
4. 04-横屏计分盘.svg
5. 05-MC音效抽屉.svg
6. 06-外设快捷键.svg
7. 07-我的页面.svg
8. 08-MC音效设置.svg
9. 09-赛事列表.svg
10. 10-赛事详情场次.svg
11. 11-球员库.svg
12. 12-PC管理后台.svg

## 说明

- 1.0 重点是：免费计分、分享解锁 MC、隐藏付费入口、赛事基础、球员库、后台管理。
- 2.0 的球员数据统计、家长端、教务、报表、薪酬等暂不进入本组原型。
- SVG 可直接用浏览器打开，也可以放进飞书、微信或设计工具里作为静态图查看。
`);

file('index.html', `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>赛小蜂篮球 1.0 静态原型图</title>
  <style>
    body{margin:0;background:#f3f6fa;color:#07131d;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif}
    header{padding:28px 34px;background:#07131d;color:white}
    h1{margin:0 0 8px;font-size:30px}
    p{margin:0;color:#cbd5e1}
    main{padding:28px;display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:24px}
    a{display:block;text-decoration:none;color:inherit;background:white;border-radius:12px;padding:16px;box-shadow:0 10px 24px rgba(7,19,29,.08)}
    img{display:block;width:100%;height:auto;border-radius:8px;background:#eef3f8}
    strong{display:block;margin-bottom:12px;font-size:18px}
  </style>
</head>
<body>
  <header><h1>赛小蜂篮球 1.0 静态原型图</h1><p>当前阶段核心闭环：登录、首页、快速比赛、计分盘、MC、我的、赛事、后台。</p></header>
  <main>
    ${[
      '01-登录页.svg','02-首页.svg','03-快速比赛设置.svg','04-横屏计分盘.svg','05-MC音效抽屉.svg','06-外设快捷键.svg','07-我的页面.svg','08-MC音效设置.svg','09-赛事列表.svg','10-赛事详情场次.svg','11-球员库.svg','12-PC管理后台.svg'
    ].map(name => `<a href="./${encodeURIComponent(name)}"><strong>${name.replace('.svg','')}</strong><img src="./${encodeURIComponent(name)}" alt="${name}"></a>`).join('\n    ')}
  </main>
</body>
</html>`);

console.log(`Generated prototypes in ${outDir}`);
