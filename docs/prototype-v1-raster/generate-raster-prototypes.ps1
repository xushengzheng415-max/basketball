Add-Type -AssemblyName System.Drawing

$OutDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function New-Canvas($Width, $Height, $Bg) {
  $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml($Bg))
  return @{ Bmp = $bmp; G = $g; W = $Width; H = $Height }
}

function Brush($Color) { New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($Color)) }
function Pen($Color, $Width = 1) { New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($Color), $Width) }
function Font($Size, $Style = "Regular") { New-Object System.Drawing.Font("Microsoft YaHei", $Size, ([System.Drawing.FontStyle]::$Style), [System.Drawing.GraphicsUnit]::Pixel) }

function RoundRectPath($X, $Y, $W, $H, $R) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($R -le 0) {
    $p.AddRectangle((New-Object System.Drawing.RectangleF([float]$X, [float]$Y, [float]$W, [float]$H)))
    return $p
  }
  $d = $R * 2
  $p.AddArc($X, $Y, $d, $d, 180, 90)
  $p.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
  $p.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
  $p.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function FillRound($G, $X, $Y, $W, $H, $R, $Color) {
  $path = RoundRectPath $X $Y $W $H $R
  $G.FillPath((Brush $Color), $path)
}

function StrokeRound($G, $X, $Y, $W, $H, $R, $Color, $Width = 1) {
  $path = RoundRectPath $X $Y $W $H $R
  $G.DrawPath((Pen $Color $Width), $path)
}

function Text($G, $S, $X, $Y, $Size, $Color = "#07131d", $Style = "Regular") {
  $G.DrawString($S, (Font $Size $Style), (Brush $Color), [float]$X, [float]$Y)
}

function CenterText($G, $S, $X, $Y, $W, $H, $Size, $Color = "#07131d", $Style = "Regular") {
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF([float]$X, [float]$Y, [float]$W, [float]$H)
  $G.DrawString($S, (Font $Size $Style), (Brush $Color), $rect, $fmt)
}

function SaveCanvas($Canvas, $Name) {
  $path = Join-Path $OutDir $Name
  $Canvas.Bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.G.Dispose()
  $Canvas.Bmp.Dispose()
}

function TopBar($G, $Title, $W = 390) {
  $G.FillRectangle((Brush "#07131d"), 0, 0, $W, 88)
  CenterText $G $Title 0 36 $W 36 17 "#ffffff" "Bold"
  Text $G "‹" 20 38 34 "#ffffff" "Regular"
}

function TabBar($G) {
  $G.FillRectangle((Brush "#ffffff"), 0, 786, 390, 58)
  $G.DrawLine((Pen "#dbe3ee"), 0, 786, 390, 786)
  CenterText $G "首页" 20 804 60 28 13 "#ff4d18" "Bold"
  CenterText $G "赛事" 116 804 60 28 13 "#647184" "Regular"
  CenterText $G "球员" 210 804 60 28 13 "#647184" "Regular"
  CenterText $G "我的" 304 804 60 28 13 "#647184" "Regular"
  FillRound $G 143 831 104 4 2 "#111111"
}

function Button($G, $X, $Y, $W, $H, $Label, $Bg = "#ff4d18", $Fg = "#ffffff") {
  FillRound $G $X $Y $W $H 9 $Bg
  CenterText $G $Label $X $Y $W $H 18 $Fg "Bold"
}

function InputBox($G, $X, $Y, $W, $H, $Label) {
  FillRound $G $X $Y $W $H 7 "#f8fafc"
  StrokeRound $G $X $Y $W $H 7 "#dbe3ee"
  Text $G $Label ($X + 14) ($Y + 13) 16 "#7b8797"
}

function Card($G, $X, $Y, $W, $H, $Bg = "#ffffff") {
  FillRound $G $X $Y $W $H 10 $Bg
}

# 01 登录页
$c = New-Canvas 390 844 "#f3f6fa"; $g = $c.G
TopBar $g "登录"
$lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 0,88,390,420),
  [System.Drawing.ColorTranslator]::FromHtml("#ff6a20"),
  [System.Drawing.ColorTranslator]::FromHtml("#b62505"),
  90
)
$g.FillRectangle($lg, 0, 88, 390, 420)
for ($i=0; $i -lt 12; $i++) { $g.DrawLine((Pen "#ffb35c" 2), 0, 120 + $i*35, 390, 40 + $i*35) }
FillRound $g 120 176 150 150 75 "#ffffff"
Text $g "蜂" 163 197 78 "#07131d" "Bold"
$g.FillEllipse((Brush "#ff4d18"), 220, 246, 58, 58)
Text $g "赛小蜂篮球" 103 354 32 "#ffffff" "Bold"
CenterText $g "热爱上场 · 蜂行无畏" 0 402 390 24 15 "#ffd956" "Bold"
FillRound $g 24 512 342 250 26 "#ffffff"
$g.FillEllipse((Brush "#07131d"), 171, 486, 48, 48)
Button $g 54 552 282 54 "微信一键登录" "#ff4d18"
Button $g 54 622 282 54 "游客体验" "#ffffff" "#07131d"; StrokeRound $g 54 622 282 54 9 "#dbe3ee"
Text $g "登录即代表同意 用户协议 和 隐私政策" 84 696 12 "#647184"
SaveCanvas $c "01-登录页.png"

# 02 首页
$c = New-Canvas 390 844 "#f3f6fa"; $g = $c.G
TopBar $g "赛小蜂篮球"; TabBar $g
Card $g 14 112 362 160 "#07131d"
Text $g "赛小蜂篮球" 30 132 15 "#ffd956" "Bold"
Text $g "快速开始一场比赛" 30 160 27 "#ffffff" "Bold"
Text $g "设置主客队和比赛时间，横屏计分。" 30 204 14 "#cbd5e1"
Button $g 30 228 98 34 "开始设置" "#ffd956" "#07131d"
Card $g 14 288 362 58 "#fff7ed"; StrokeRound $g 14 288 362 58 8 "#ffd4b8"
Text $g "分享朋友圈可解锁 MC 音效 1 天" 30 304 15 "#e6360a" "Bold"
Text $g "点击计分盘上方提示即可解锁现场音效。" 30 326 12 "#647184"
Text $g "最近赛果" 14 366 20 "#07131d" "Bold"
Card $g 14 400 362 112
Text $g "主队" 30 420 18 "#07131d" "Bold"; Text $g "68" 318 410 34 "#ff4d18" "Bold"
Text $g "客队" 30 456 18 "#07131d" "Bold"; Text $g "64" 318 446 34 "#ff4d18" "Bold"
Text $g "2026-07-05 20:30" 30 488 12 "#647184"
Card $g 14 526 174 74; Text $g "创建赛事" 30 546 17 "#07131d" "Bold"; Text $g "赛事名称、地点、日期" 30 572 12 "#647184"
Card $g 202 526 174 74; Text $g "球员库" 218 546 17 "#07131d" "Bold"; Text $g "添加球员与号码" 218 572 12 "#647184"
SaveCanvas $c "02-首页.png"

# 03 快速比赛设置
$c = New-Canvas 390 844 "#f3f6fa"; $g = $c.G
TopBar $g "比赛计分"; TabBar $g
Card $g 16 112 358 606
Text $g "快速开始比赛" 34 134 27 "#07131d" "Bold"
Text $g "设置主客队、比赛节数、每节时长和计时方式。" 34 174 14 "#647184"
Text $g "主队名称" 34 214 18 "#07131d" "Bold"; InputBox $g 34 244 322 48 "主队"
Text $g "客队名称" 34 310 18 "#07131d" "Bold"; InputBox $g 34 340 322 48 "客队"
Text $g "每节时长" 34 406 18 "#07131d" "Bold"
Button $g 34 438 96 40 "6分" "#ffffff" "#07131d"; StrokeRound $g 34 438 96 40 7 "#dbe3ee"
Button $g 146 438 96 40 "8分" "#ff4d18"
Button $g 258 438 96 40 "10分" "#ffffff" "#07131d"; StrokeRound $g 258 438 96 40 7 "#dbe3ee"
Text $g "比赛节数" 34 506 18 "#07131d" "Bold"
Button $g 34 538 96 40 "2节" "#ffffff" "#07131d"; StrokeRound $g 34 538 96 40 7 "#dbe3ee"
Button $g 146 538 96 40 "4节" "#ff4d18"
Button $g 258 538 96 40 "6节" "#ffffff" "#07131d"; StrokeRound $g 258 538 96 40 7 "#dbe3ee"
Text $g "计时方式" 34 606 18 "#07131d" "Bold"
Button $g 34 638 154 42 "倒计时" "#ff4d18"
Button $g 202 638 154 42 "正计时" "#ffffff" "#07131d"; StrokeRound $g 202 638 154 42 7 "#dbe3ee"
Button $g 34 696 322 50 "开始比赛" "#ff4d18"
SaveCanvas $c "03-快速比赛设置.png"

# 04 横屏计分盘
$c = New-Canvas 844 390 "#07131d"; $g = $c.G
$g.FillRectangle((Brush "#06111a"), 0, 0, 844, 56)
CenterText $g "比赛计分" 0 17 844 28 18 "#ffffff" "Bold"
Text $g "赛小蜂篮球计分盘" 20 84 21 "#ffffff" "Bold"
Button $g 606 74 118 32 "MC 音效已解锁" "#063f36" "#00c68a"
Button $g 732 70 92 42 "结束比赛" "#e6360a"
Card $g 20 126 804 76 "#26333d"
Text $g "第 1 / 4 节" 40 142 28 "#ffd956" "Bold"; Text $g "倒计时 · 10 分钟" 40 176 16 "#d5dce5"
CenterText $g "10:00" 356 126 160 76 52 "#ffffff" "Bold"
Button $g 586 140 76 42 "开始" "#ffd956" "#07131d"; Button $g 674 140 76 42 "复位" "#ffffff" "#07131d"; Button $g 762 140 54 42 "下节" "#ffffff" "#07131d"
Card $g 16 214 340 144; Card $g 488 214 340 144
CenterText $g "主队" 16 224 340 24 22 "#07131d" "Bold"; CenterText $g "5" 16 248 340 72 88 "#ff4d18" "Bold"
Text $g "犯规 0" 38 315 18 "#07131d" "Bold"; Text $g "暂停 0" 192 315 18 "#07131d" "Bold"
Button $g 36 338 92 34 "+1" "#ff4d18"; Button $g 140 338 92 34 "+2" "#ff4d18"; Button $g 244 338 92 34 "长按+3" "#d93008"
CenterText $g "VS" 380 222 84 48 44 "#ffffff" "Bold"; Button $g 384 270 76 34 "换边" "#ffffff" "#07131d"; Button $g 384 312 76 34 "撤销" "#ffd956" "#07131d"
CenterText $g "客队" 488 224 340 24 22 "#07131d" "Bold"; CenterText $g "2" 488 248 340 72 88 "#ff4d18" "Bold"
Text $g "犯规 0" 510 315 18 "#07131d" "Bold"; Text $g "暂停 0" 664 315 18 "#07131d" "Bold"
Button $g 508 338 92 34 "+1" "#ff4d18"; Button $g 612 338 92 34 "+2" "#ff4d18"; Button $g 716 338 92 34 "长按+3" "#d93008"
FillRound $g 0 205 42 110 14 "#132536"; $g.FillEllipse((Brush "#00c68a"), 13, 226, 16, 16); CenterText $g "MC" 0 250 42 30 17 "#ffd956" "Bold"
FillRound $g 16 364 812 22 11 "#1d2b38"; Text $g "最近记录" 34 365 16 "#d5dce5"; Text $g "主队 +2" 744 365 16 "#d5dce5"
SaveCanvas $c "04-横屏计分盘.png"

# 05 MC 控制台
$c = New-Canvas 844 390 "#07131d"; $g = $c.G
Card $g 16 92 340 144 "#ffffff"; Card $g 488 92 340 144 "#ffffff"
FillRound $g 0 0 250 390 0 "#101f2c"
Text $g "MC 控制台" 22 24 22 "#ffffff" "Bold"; Button $g 208 18 30 30 "×" "#334155"
Text $g "音效" 22 68 15 "#cbd5e1" "Bold"
Button $g 22 94 88 36 "欢呼" "#ffd956" "#07131d"; Button $g 120 94 88 36 "投篮未进" "#203244"
Button $g 22 142 186 38 "2分有效" "#203244"; Button $g 22 190 186 38 "休息音乐" "#203244"
Text $g "循环音乐" 22 248 15 "#cbd5e1" "Bold"; Button $g 22 274 88 42 "进攻" "#ffd956" "#07131d"; Button $g 120 274 88 42 "防守" "#203244"
CenterText $g "VS" 380 130 84 48 44 "#ffffff" "Bold"; Button $g 358 214 128 54 "播报比分" "#ff4d18"
SaveCanvas $c "05-MC音效抽屉.png"

# 06 我的页面
$c = New-Canvas 390 844 "#f3f6fa"; $g = $c.G
TopBar $g "我的"; TabBar $g
Card $g 16 112 358 154 "#07131d"
$g.FillEllipse((Brush "#ffffff"), 40, 146, 64, 64)
Text $g "我的账号" 128 138 14 "#ffd956" "Bold"; Text $g "大头" 128 164 28 "#ffffff" "Bold"; Text $g "已登录 · 173****6663" 128 202 14 "#cbd5e1"
Button $g 32 220 326 34 "退出登录" "#303b47"
Card $g 16 286 358 96; Text $g "会员兑换" 32 306 18 "#07131d" "Bold"; Text $g "已解锁" 314 306 13 "#00c68a"; InputBox $g 32 336 326 36 "输入会员兑换码"
Card $g 16 398 358 74; Text $g "MC 音效设置" 32 418 18 "#07131d" "Bold"; Text $g "快捷键 / 本机音效" 254 418 13 "#647184"; Text $g "管理 2分、3分音效、进攻防守音乐和 6 键快捷键。" 32 446 13 "#647184"
Card $g 16 490 358 164; Text $g "意见反馈" 32 510 18 "#07131d" "Bold"; Button $g 32 548 100 34 "功能建议" "#ff4d18"; Button $g 144 548 100 34 "问题反馈" "#ffffff" "#07131d"; StrokeRound $g 144 548 100 34 7 "#dbe3ee"; Button $g 256 548 100 34 "赛事合作" "#ffffff" "#07131d"; StrokeRound $g 256 548 100 34 7 "#dbe3ee"; InputBox $g 32 596 326 42 "告诉我们哪里不好用"
SaveCanvas $c "06-我的页面.png"

# 07 音效设置
$c = New-Canvas 390 844 "#f3f6fa"; $g = $c.G
TopBar $g "音效设置"
Card $g 16 112 358 146; Text $g "基础开关" 32 132 20 "#07131d" "Bold"; Text $g "2分音效" 32 174 18 "#07131d" "Bold"; FillRound $g 314 170 44 24 12 "#00c68a"; $g.FillEllipse((Brush "#ffffff"), 336, 171, 22, 22); Text $g "3分音效" 32 214 18 "#07131d" "Bold"; FillRound $g 314 210 44 24 12 "#00c68a"; $g.FillEllipse((Brush "#ffffff"), 336, 211, 22, 22)
Card $g 16 278 358 430; Text $g "音效类型与播放策略" 32 298 20 "#07131d" "Bold"
$rows = @(@("休息音乐","当前：Remember the Name"),@("进攻音乐","当前：云端随机 3 首"),@("防守音乐","当前：云端随机 3 首"),@("播报语音包","赛小智 / 赛小瑜 / 赛小萌"))
$y=340
foreach($r in $rows){ Text $g $r[0] 32 $y 18 "#07131d" "Bold"; Text $g $r[1] 32 ($y+26) 13 "#647184"; Button $g 218 ($y-4) 64 34 "随机" "#ff4d18"; Button $g 292 ($y-4) 64 34 "固定" "#ffffff" "#07131d"; StrokeRound $g 292 ($y-4) 64 34 7 "#dbe3ee"; $y += 78 }
Button $g 32 660 326 48 "保存设置" "#ff4d18"
SaveCanvas $c "07-MC音效设置.png"

# 08 PC 后台
$c = New-Canvas 1440 900 "#f3f6fa"; $g = $c.G
$g.FillRectangle((Brush "#07131d"), 0, 0, 220, 900)
Text $g "赛小蜂篮球" 32 40 18 "#ffd956" "Bold"; Text $g "运营后台" 32 72 32 "#ffffff" "Bold"
Button $g 24 156 172 42 "数据概览" "#203244"; Text $g "用户资料" 42 238 16 "#cbd5e1" "Bold"; Text $g "会员码" 42 298 16 "#cbd5e1" "Bold"; Text $g "MC 音乐库" 42 358 16 "#cbd5e1" "Bold"
Text $g "小程序数据看板" 260 52 34 "#07131d" "Bold"; Text $g "查看用户、反馈、权益、会员码，并维护 MC 音乐库。" 260 94 18 "#647184"
Button $g 1240 42 86 38 "读取云端" "#ff4d18"
$x=260; foreach($kv in @(@("用户数","128"),@("反馈数","12"),@("会员数","36"),@("赛果数","420"))){ Card $g $x 136 170 92; Text $g $kv[0] ($x+24) 158 16 "#647184" "Bold"; Text $g $kv[1] ($x+24) 188 34 "#07131d" "Bold"; $x += 192 }
Card $g 260 268 1040 250; Text $g "用户资料" 284 294 22 "#07131d" "Bold"; $g.DrawLine((Pen "#dbe3ee"), 284,342,1260,342); Text $g "昵称" 284 362 15 "#647184" "Bold"; Text $g "手机号" 480 362 15 "#647184" "Bold"; Text $g "会员状态" 700 362 15 "#647184" "Bold"; Text $g "活动" 930 362 15 "#647184" "Bold"; Text $g "操作" 1130 362 15 "#647184" "Bold"; Text $g "微信用户" 284 410 17 "#07131d" "Bold"; Text $g "173****6663" 480 410 17 "#07131d"; Text $g "分享会员 · 1天" 700 410 17 "#00a97c"; Text $g "使用 2.4 小时" 930 410 17 "#07131d"; Text $g "调整时间" 1130 410 15 "#ff4d18" "Bold"
Card $g 260 550 1040 220; Text $g "MC 音乐库" 284 576 22 "#07131d" "Bold"; InputBox $g 284 626 220 40 "进攻音乐"; InputBox $g 526 626 320 40 "音效名称，例如：欢呼声"; InputBox $g 868 626 360 40 "cloud://.../mc-mp3/..."; Button $g 284 690 126 42 "保存到音乐库" "#00a97c"
SaveCanvas $c "08-PC管理后台.png"

Write-Host "Generated PNG prototypes in $OutDir"


