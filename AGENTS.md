# AGENTS.md — 赛小蜂篮球项目记忆系统

> 用途：为 Codex / Claude Code / Cursor 等 AI 编程助手提供赛小蜂篮球项目上下文。
> AI 在开始任何代码修改前，必须先阅读本文档。
> 最后更新：2026-07-02

---

## 一、项目身份

| 字段 | 值 |
|------|-----|
| 项目名称 | 赛小蜂篮球 |
| 产品形态 | 微信小程序 + PC 管理后台原型 + 云函数 |
| 本地路径 | `C:\Users\Frank\Documents\赛小蜂篮球` |
| GitHub | `https://github.com/xushengzheng415-max/basketball.git` |
| Gitee | `https://gitee.com/saixiaofeng/basketball.git` |
| 当前主分支 | `main` |
| 工作流 | Issue -> Spec -> Plan -> Branch -> Code -> Test -> Review -> Docs -> PR -> Sync |

---

## 二、技术栈

### 小程序

- 当前微信开发者工具读取 `native-dist/` 原生小程序目录。
- `project.config.json` 中 `miniprogramRoot` 为 `native-dist/`。
- `src/` 保留 Taro + React 源码，后续可继续演进或迁回 Taro 构建链。
- Taro 版本：`@tarojs/* 3.6.x`
- React：18.x
- TypeScript：5.x

### 云函数

- 云函数目录：`cloudfunctions/`
- 函数命名以 `sx` 前缀为主，例如：
  - `sxLogin`
  - `sxSaveUser`
  - `sxSaveMatchResult`
  - `sxCreateOrder`
  - `sxCreateWxPayOrder`
  - `sxWxPayNotify`
  - `sxCreateScoreVoice`
  - `sxAdminDashboard`
  - `sxCreateRedeemCode`
  - `sxRedeemCode`
  - `sxSaveAudioLibrary`
  - `sxGetAudioLibrary`
  - `sxAdminUpdateEntitlement`

### PC 后台

- 目录：`admin/`
- 入口：`admin/index.html`
- 本地服务命令：`npm run admin:serve`

---

## 三、关键目录

```text
赛小蜂篮球/
├── AGENTS.md
├── README.md
├── DEVELOPMENT_LOG.md
├── DEVELOPMENT_LOG_2026-07-02.md
├── package.json
├── project.config.json
├── admin/                         # PC 后台原型
├── cloudfunctions/                # sx* 云函数
├── native-dist/                   # 当前小程序主工作目录
│   ├── app.json
│   └── pages/
│       ├── login/
│       ├── home/
│       ├── scorer/
│       ├── products/
│       ├── mc-system/
│       ├── stats-scorer/
│       ├── order/
│       ├── pay-result/
│       ├── tournament/
│       ├── tournament-detail/
│       ├── game-detail/
│       ├── team/
│       └── mine/
├── src/                           # Taro/React 源码保留区
├── dist/                          # 构建产物，不入仓库
├── node_modules/                  # 依赖，不入仓库
└── local-assets/                  # 本地素材，不入仓库
```

---

## 四、当前功能

根据 README 与开发记录，当前阶段聚焦：

- 登录页：微信授权登录、游客体验、协议勾选
- 首页：快速开始比赛、最近赛果、赛事服务入口
- 比赛计分：横屏计分、主客队、节数、每节时长、正/倒计时、结束生成赛果
- 现场控制：暂停次数、换边、重开确认、撤销记录
- 赛事：创建赛事、主客队设置、球员选择
- 球员：添加球员姓名和号码
- 我的：个人账号、头像昵称、退出登录、意见反馈、会员兑换
- 支付原型：赛事服务选择、确认订单、支付结果模拟页
- PC 后台：会员码、MC 音乐库、权益管理相关能力
- 云端音乐：后台维护 MC 音频，小程序计分盘拉取云端音乐库

---

## 五、开发命令

```bash
npm install
npm run dev:weapp
npm run build:weapp
npm run typecheck
npm run admin:serve
npm run site:serve
```

当前原生 MVP 调试方式：使用微信开发者工具打开项目根目录，工具会根据 `project.config.json` 读取 `native-dist/`。

---

## 六、致命规则

### 6.1 当前小程序主目录是 native-dist

除非任务明确要求改 Taro 源码，否则小程序页面功能优先修改：

```text
native-dist/pages/**
```

不要只改 `src/` 后忘记同步到 `native-dist/`，否则微信开发者工具看不到效果。

### 6.2 WXML 尽量保持简单

新增或修改 WXML 时，复杂判断、计算、格式化优先放到 JS 中预处理，WXML 只做简单绑定。

提交前建议检查：

```bash
rg "{{[^}]*\?[^}]*:.*}}" native-dist
rg "{{[^}]*\[[0-9]" native-dist
rg "{{[^}]*===|!==|\.find\(" native-dist
```

### 6.3 密钥和本地配置不入仓库

以下内容不得提交：

- `node_modules/`
- `dist/`
- `.swc/`
- `local-assets/`
- `project.private.config.json`
- `.env.local`
- `.env.*.local`
- 各类真实 API Key、Secret、Token、支付密钥、后台口令

云函数需要的敏感配置必须通过环境变量提供，例如：

- `SXF_ADMIN_TOKEN`
- 微信支付相关密钥
- 云存储或第三方服务密钥

### 6.4 不混入用户未提交改动

当前项目可能存在本地业务改动。AI 修改时必须：

- 先查看 `git status`
- 只暂存本次任务相关文件
- 不回滚用户已有改动
- 不把无关业务改动混进 Workflow/文档 PR

---

## 七、Git 工作方式

默认远端：

- GitHub：`origin`
- Gitee：`gitee`

后续所有需求、Bug、代码或文档调整默认走：

```text
Issue -> Spec -> Plan -> Branch -> Code -> Test -> Review -> Docs -> PR -> Sync
```

分支命名使用 `codex/` 前缀，例如：

```bash
git switch -c codex/fix-scorer-timeout
```

完成后同步：

```bash
git push origin <branch>
git push gitee <branch>
```

---

## 八、提交前检查清单

- [ ] 已阅读本 `AGENTS.md`
- [ ] 已关联 GitHub Issue
- [ ] 已使用 `codex/` 分支
- [ ] 只暂存本次任务相关文件
- [ ] 小程序变更已确认作用于 `native-dist/`
- [ ] WXML 复杂表达式已检查或说明不适用
- [ ] `npm run typecheck` 或相关构建已执行，或说明未执行原因
- [ ] 云函数敏感配置使用环境变量
- [ ] GitHub PR 已更新
- [ ] Gitee 分支已同步

---

> AI 使用提示：篮球项目和足球项目是两个独立仓库。进入篮球项目工作时，以本文件为准；不要直接套用足球项目的业务字段、云函数命名和部署规则。