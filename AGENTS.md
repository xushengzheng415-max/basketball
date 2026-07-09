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
| 本地路径 | `C:\Users\Frank\Documents\sxf-basketball` |
| 兼容路径 | `C:\Users\Frank\Documents\赛小蜂篮球` 是指向最终路径的 Junction 桥接路径 |
| GitHub | `https://github.com/xushengzheng415-max/basketball.git` |
| Gitee | `https://gitee.com/saixiaofeng/basketball.git` |
| 当前主分支 | `main` |
| 工作流 | Issue -> Spec -> Plan -> Branch -> Code -> Test -> Review -> Docs -> PR -> Sync |

---

## 1.5 Worktree Routing, Daily Logs, and Encoding Rules

> Shared notice for all future worktrees, sub-tasks, and AI assistants. Read it before starting code changes.

### Source Path

- Canonical project path: `C:\Users\Frank\Documents\sxf-basketball`.
- The legacy Chinese project path is only a Junction bridge to the canonical path.
- WeChat DevTools, cloud functions, admin deployment, local builds, and repo sync should use the canonical path.

### Main Project Scope

- The main basketball project owns global product structure, navigation, six-tab bottom menu, visual rules, login, membership, payment, cloud functions, cloud storage, admin backend, home/workbench, core scoring flow, shared components, shared assets, release builds, and repo sync.
- Any change that affects multiple modules, multiple pages, or the main user journey must be handled in the main project first.

### Module Worktree Scope

- Module worktrees only change their own page areas: PC admin, scorer, workbench, tournament, team/player, education, data, or mine.
- Module worktrees must not change global membership strategy, payment strategy, cloud environment variables, project paths, or remote configuration without main-project approval.

### Daily Development Logs and Remote Sync

- Before ending each workday, update `DEVELOPMENT_LOG.md` or the daily log with completed work, changed files, verification, unresolved issues, branch name, and next steps.
- Before commit, run `git status` and stage only files related to the current module/task.
- Commit messages should include the module and task, for example: `feat(scorer): update scoreboard layout`.
- Validated work should be pushed to both GitHub `origin` and Gitee `gitee`.
- If a branch cannot be committed or pushed that day, write the blocker and current state into the development log.

### Chinese Encoding Rules

- All Chinese-facing files should be UTF-8 without BOM.
- Prefer Node.js `fs.readFileSync/writeFileSync(..., "utf8")` for reading/writing Chinese text.
- If PowerShell or terminal output shows mojibake, verify the real file bytes/content with Node before changing the file.
- User-facing UI and admin pages must display Chinese. Internal variable names, enums, API fields, and data keys can stay in English.
- If real file content becomes `????`, `&#x...;`, or mojibake, restore it from Git, backup, prototype text, or explicit user confirmation.

### Shared Constraints

- Current mini program source of truth is `native-dist/`; do not only edit `src/`.
- Bottom menu is unified as six tabs: workbench, tournament, player, education, data, mine.
- Reuse `native-dist/components/sxf-tabbar` for the bottom menu instead of page-specific duplicate tab bars.
- Large images/icons should use cloud storage under `ui-assets/assets/`; local `native-dist/assets` is only source/backup to avoid the 2MB preview limit.
- If a module worktree conflicts with this file, the canonical-path `AGENTS.md` wins.

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

根据 README、开发记录与 1.0 原型规划，当前阶段按“机构端赛事 MVP”聚焦：

### 4.1 小程序 1.0 底部菜单规划

1.0 版本底部菜单统一为六栏：

```text
工作台 / 赛事 / 球员 / 教务 / 数据 / 我的
```

- 工作台：1.0 主入口，只保留赛事管理与快速比赛相关能力。
- 赛事：赛事列表、赛事创建、赛事详情与比赛计分入口。
- 球员：球员库入口，支持添加球员、编辑球员基础资料、按球队筛选。
- 教务：1.0 介绍页，展示后续教务管理能力规划，不开放实际业务操作。
- 数据：1.0 介绍页，展示后续赛事数据、球员数据、球队对比、数据海报等规划。
- 我的：个人中心入口，包含个人资料修改、MC 音效设置、账号与基础设置。

### 4.2 1.0 当前可用功能

- 登录页：微信授权登录、游客体验、协议勾选。
- 工作台：顶部品牌为“赛小蜂篮球”；“快速比赛”模块展示快捷创建比赛/进入计分入口；快捷功能开放“创建赛事、快捷比赛、创建球队、创建球员”，其中快捷比赛用于试听课/临时单场比赛，只录入临时球队名、球员姓名和号码，不写入正式球员库。
- 赛事管理：创建赛事、赛事列表、赛事状态筛选、赛事详情、主客队设置、球员选择。
- 球队与球员库：支持创建球队、添加球员姓名、号码、所属球队、身高、年龄、位置等基础信息；支持球员列表展示、搜索与筛选。
- 比赛计分：竖屏与 PAD 横屏计分板、主客队比分、节数、比赛时间、正/倒计时、暂停、犯规、换人、技术统计、结束比赛与生成赛果。
- 现场控制：暂停次数、交换场地、重开确认、撤销记录、最近操作记录。
- MC 音效：计分板内提供进攻/防守/得分播报/暂停音乐/MVP 音效等播放控制；“我的”中提供 MC 音效设置入口。
- 我的：个人资料修改、头像昵称、基础账号信息、退出登录、意见反馈。
- PC 后台：会员码、MC 音乐库、权益管理相关能力。
- 云端音乐：后台维护 MC 音频，小程序计分盘拉取云端音乐库。

### 4.3 1.0 灰度展示 / 后续版本功能

- 工作台快捷功能：创建赛事、快捷比赛、创建球队、创建球员在 1.0 中为启用状态；销课统计、课后评价、生成报表等在 1.0 中展示为灰度待开发。
- 教务中心：多校区管理、课程排课、学员签到、课消统计、课后评价、教练工资在 1.0 中仅作为介绍页展示。
- 数据中心：赛事数据、球员技术统计、球队对比、成长趋势、家长端同步、数据海报在 1.0 中仅作为介绍页展示。
- 报表能力：首发阵容名单报告、赛后裁判报告、正式赛事 PDF 报表、现场打印可作为 2.0 迭代能力规划。
- 家长端传播：球员数据海报、球员卡、徽章成长体系、赛照自动抠图与多皮肤底板属于后续版本规划。
- 教务 + 赛事联动：学员库导入参赛名单、课堂积分联动、课后对抗赛表现回传等能力后置到 2.0。
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

