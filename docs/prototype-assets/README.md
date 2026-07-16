# 原型切图资产清单

> 面向对象：UI、前端、小程序开发。  
> 用途：把原型图里复杂视觉元素单独导出为图片，避免前端用 CSS/WXML 硬画高复杂图形。

## 1. 目录规则

```text
docs/prototype-assets/
├── brand/             # Logo、品牌图形
├── backgrounds/       # 背景、蜂窝纹理、球馆光效
├── icons/             # 功能图标、状态图标
├── buttons/           # 复杂按钮底图和按钮装饰
├── report/            # 报表专用素材
├── mc/                # MC 音效控制素材
└── empty-states/      # 空状态插画
```

小程序开发落地时，建议同步到：

```text
native-dist/assets/prototype/
```

## 2. 命名规则

- 使用英文小写和短横线：`bg-honeycomb-orange.png`
- 透明素材使用 PNG
- 大背景可使用 JPG 或 WebP
- 同一个素材至少导出高清版，推荐同时准备 `@2x` / `@3x`
- 不要使用中文文件名，避免小程序构建和云存储路径问题

## 3. 必须切图的复杂素材

### 3.1 品牌素材：brand/

| 文件名建议 | 用途 | 说明 |
|---|---|---|
| `logo-basketball-horizontal.png` | 登录页、报表页、品牌露出 | 横版 Logo，含中文和英文 |
| `logo-basketball-icon.png` | 小图标、顶部品牌、球员卡 | 只有蜜蜂 + 篮球主体 |
| `logo-basketball-white.png` | 深色背景页面 | 白色或浅色版 Logo |
| `app-icon-basketball.png` | 小程序图标 | 正方形图标 |

### 3.2 背景素材：backgrounds/

| 文件名建议 | 用途 | 说明 |
|---|---|---|
| `bg-login-arena-orange.jpg` | 登录页 | 篮球馆 + 橙色光效 |
| `bg-honeycomb-dark.png` | 黑色页面通用背景 | 蜂窝纹理，透明或暗色 |
| `bg-honeycomb-orange.png` | 首页 / 家长端 | 橙色蜂窝纹理 |
| `bg-scoreboard-court.jpg` | 裁判比分板 | 暗色球场背景 |
| `bg-report-header.jpg` | 赛事报表头图 | 篮筐、篮球光效 |
| `bg-pad-scoreboard.jpg` | PAD 横屏比分板 | 宽屏背景 |

### 3.3 功能图标：icons/

| 文件名建议 | 用途 | 说明 |
|---|---|---|
| `ic-create-match.png` | 创建赛事入口 | 篮球 + 加号 |
| `ic-player-library.png` | 球员库入口 | 球员头像 / 名单 |
| `ic-roster-import.png` | 导入名单 | 表格 + 箭头 |
| `ic-eligibility-check.png` | 资格校验 | 盾牌 + 勾 |
| `ic-match-report.png` | 赛事报表 | PDF / 文档 |
| `ic-referee-report.png` | 裁判报告 | 哨子 / 裁判 |
| `ic-payroll.png` | 薪酬销售 | 钱包 / 统计 |
| `ic-campus.png` | 多校区 | 定位 / 楼宇 |
| `ic-parent-share.png` | 家长传播 | 分享 / 海报 |

### 3.4 状态图标：icons/status/

| 文件名建议 | 用途 |
|---|---|
| `status-success.png` | 已通过、已生成、已签到 |
| `status-warning.png` | 待确认、打印前提醒 |
| `status-error.png` | 异常、校验失败 |
| `status-pending.png` | 待提交、待校验 |
| `status-live.png` | 比赛直播中 |
| `status-locked.png` | 报表已锁定 |

### 3.5 复杂按钮素材：buttons/

普通按钮不切图，复杂运动风按钮建议切图。

| 文件名建议 | 用途 | 说明 |
|---|---|---|
| `btn-wechat-login-bg.png` | 微信一键登录 | 黑橙渐变 + 速度线 |
| `btn-start-match-bg.png` | 开始比赛 | 橙色主按钮底图 |
| `btn-end-match-bg.png` | 结束比赛 | 红橙警示按钮底图 |
| `btn-generate-report-bg.png` | 生成正式报表 | 大 CTA 底图 |
| `btn-mc-play-bg.png` | MC 播放按钮 | 音效按钮底图 |
| `btn-pad-action-bg.png` | PAD 快捷操作 | 横屏大按钮底图 |

实现要求：

- 按钮底图只负责视觉，按钮文字仍由前端渲染
- 点击区域用真实 `button` 或 `view` 绑定事件
- 按钮禁用态不要重新切太多图，优先用透明度 / 蒙层处理

### 3.6 报表素材：report/

| 文件名建议 | 用途 | 说明 |
|---|---|---|
| `badge-u10-elite.png` | 报表组别徽章 | 如 U10 ELITE 盾牌 |
| `badge-mvp.png` | MVP 区块 | 奖杯 / MVP 标识 |
| `label-pdf-preview.png` | PDF 预览角标 | 红色 PDF 角标 |
| `sign-line-texture.png` | 裁判签名区 | 签名底纹 / 分割线 |
| `report-watermark.png` | PDF 水印 | 低透明 Logo |

### 3.7 MC 音效素材：mc/

| 文件名建议 | 用途 |
|---|---|
| `mc-attack.png` | 进攻音效 |
| `mc-defense.png` | 防守音效 |
| `mc-score.png` | 得分音效 |
| `mc-timeout.png` | 暂停音乐 |
| `mc-substitution.png` | 换人提示 |
| `mc-mvp.png` | MVP 音效 |
| `mc-opening.png` | 开场音乐 |
| `mc-ending.png` | 结束音乐 |
| `mc-volume.png` | 音量控制 |
| `mc-now-playing.png` | 当前播放状态 |

### 3.8 空状态素材：empty-states/

| 文件名建议 | 用途 |
|---|---|
| `empty-match.png` | 暂无赛事 |
| `empty-student.png` | 暂无学员 |
| `empty-report.png` | 暂无报表 |
| `empty-audio.png` | 暂无音频 |
| `empty-course.png` | 暂无课程 |

## 4. 每个页面需要的图片素材

### 登录页

- `brand/logo-basketball-horizontal.png`
- `backgrounds/bg-login-arena-orange.jpg`
- `backgrounds/bg-honeycomb-dark.png`
- `buttons/btn-wechat-login-bg.png`

### 机构工作台

- `brand/logo-basketball-icon.png`
- `backgrounds/bg-honeycomb-dark.png`
- `icons/ic-create-match.png`
- `icons/ic-player-library.png`
- `icons/ic-match-report.png`
- `icons/ic-payroll.png`

### 多角色入口

- `icons/ic-referee-report.png`
- `icons/ic-roster-import.png`
- `icons/ic-parent-share.png`
- `icons/status/status-live.png`

### 创建赛事

- `icons/ic-create-match.png`
- `icons/ic-campus.png`
- `backgrounds/bg-honeycomb-dark.png`

### 学员库导入参赛名单

- `icons/ic-roster-import.png`
- `icons/status/status-success.png`
- `icons/status/status-warning.png`
- `icons/status/status-error.png`

### 资格自动校验

- `icons/ic-eligibility-check.png`
- `icons/status/status-success.png`
- `icons/status/status-warning.png`
- `icons/status/status-error.png`

### 首发阵容名单报告

- `report/badge-u10-elite.png`
- `brand/logo-basketball-horizontal.png`
- `icons/ic-roster-import.png`
- `icons/status/status-locked.png`
- `buttons/btn-generate-report-bg.png`

### 手机裁判比分板

- `backgrounds/bg-scoreboard-court.jpg`
- `brand/logo-basketball-icon.png`
- `icons/status/status-live.png`
- `buttons/btn-start-match-bg.png`
- `buttons/btn-end-match-bg.png`

### 手机裁判比分板 + MC

- 手机裁判比分板全部素材
- `mc/mc-attack.png`
- `mc/mc-defense.png`
- `mc/mc-score.png`
- `mc/mc-timeout.png`
- `mc/mc-substitution.png`
- `mc/mc-mvp.png`
- `mc/mc-volume.png`
- `buttons/btn-mc-play-bg.png`

### PAD 横屏比分板

- `backgrounds/bg-pad-scoreboard.jpg`
- `brand/logo-basketball-icon.png`
- `buttons/btn-pad-action-bg.png`
- `mc/mc-attack.png`
- `mc/mc-defense.png`
- `mc/mc-score.png`
- `mc/mc-timeout.png`

### 赛事报表

- `report/badge-u10-elite.png`
- `report/badge-mvp.png`
- `report/label-pdf-preview.png`
- `report/sign-line-texture.png`
- `report/report-watermark.png`
- `backgrounds/bg-report-header.jpg`
- `buttons/btn-generate-report-bg.png`

### 赛后裁判报告

- `icons/ic-referee-report.png`
- `report/sign-line-texture.png`
- `icons/status/status-locked.png`
- `buttons/btn-generate-report-bg.png`

### 家长传播资产管理

- `icons/ic-parent-share.png`
- `report/badge-mvp.png`
- `brand/logo-basketball-icon.png`

## 5. 前端引用方式建议

建议建一个统一资产映射文件，例如：

```js
export const ASSETS = {
  brand: {
    logoHorizontal: '/assets/prototype/brand/logo-basketball-horizontal.png',
    logoIcon: '/assets/prototype/brand/logo-basketball-icon.png'
  },
  backgrounds: {
    loginArena: '/assets/prototype/backgrounds/bg-login-arena-orange.jpg',
    honeycombDark: '/assets/prototype/backgrounds/bg-honeycomb-dark.png'
  },
  mc: {
    attack: '/assets/prototype/mc/mc-attack.png',
    defense: '/assets/prototype/mc/mc-defense.png'
  }
}
```

这样页面只引用语义名，不直接散写图片路径。

## 6. 开发注意事项

- 复杂视觉切图，核心数据仍用真实文字和组件渲染。
- 图片按钮不能替代真实点击区域。
- 表格、比分、计时、姓名、统计数据不要做到图片里。
- 报表预览可以是图片风格，但最终 PDF 要由数据生成。
- 背景图要压缩，避免小程序包过大。
- 可复用图标只保留一份，避免不同页面重复导出。

## 7. 最新比分板原型图

### 7.1 竖屏最终版

![竖屏裁判比分板最终版](screens/33-scorer-mobile-final-drawers-small-mc.png)

关键修订：

- MC 音效按钮小于加分按钮。
- 竖屏也加入交换场地按钮。
- 首发和替补改为左右隐藏抽屉。
- 裁判签到移出比分板，放到递交首发 / 赛前管理页面。

### 7.2 PAD 横屏最终版

![PAD横屏比分板最终版](screens/32-scorer-pad-final-no-referee-checkin.png)

关键修订：

- 左右两侧各有首发和替补隐藏抽屉。
- 中间加入交换场地按钮。
- MC 音效管理占用原裁判签到空间。
- 裁判签到不出现在比分板页面。
