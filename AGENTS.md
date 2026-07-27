# AGENTS.md — 赛小蜂篮球项目记忆系统

> 用途：为 Codex / Claude Code / Cursor 等 AI 编程助手提供赛小蜂篮球项目上下文。
> AI 在开始任何代码修改前，必须先阅读本文档。
> 最后更新：2026-07-24

---

## 一、项目身份

| 字段 | 值 |
|------|-----|
| 项目名称 | 赛小蜂篮球 |
| 产品形态 | 微信小程序 + PC 赛训经营增长平台原型 + 云函数 |
| 本地路径 | `E:\Documents\sxf-basketball` |
| GitHub | `https://github.com/xushengzheng415-max/basketball.git` |
| Gitee | `https://gitee.com/saixiaofeng/basketball.git` |
| 当前主分支 | `main` |
| 工作流 | Issue -> Spec -> Plan -> Branch -> Code -> Test -> Review -> Docs -> PR -> Sync |

---

## 1.5 Worktree Routing, Daily Logs, and Encoding Rules

> Shared notice for all future worktrees, sub-tasks, and AI assistants. Read it before starting code changes.

### Source Path

- 唯一项目路径：`E:\Documents\sxf-basketball`。
- 所有本地工作均使用该唯一路径。
- 微信开发者工具、云函数、后台部署、本地构建和仓库同步均使用该唯一路径。

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
- 本地开发、测试、文档记录和多个连续任务可以集中完成，不需要每完成一步就推送。
- 只有用户明确说“上传仓库”“提交推送”或明确指定推送 GitHub / Gitee 时，才允许执行远端推送；不得把普通的“完成”“继续”理解为推送授权。
- 获得推送授权后，已验证的工作应同时推送到 GitHub `origin` 与 Gitee `gitee`。
- If a branch cannot be committed or pushed that day, write the blocker and current state into the development log.

### Version Iteration and Public Announcement Workflow

Every experience, review, or production version update must complete the following release chain. Do not treat a Git commit or WeChat upload as the end of a release task.

1. Confirm the exact semantic version, for example `1.5.1`; never substitute `1.51` or another shortened form.
2. Update the project/package version and the development log, then run task-appropriate syntax, JSON, WXML, type, build, and diff checks.
3. Commit only release-related files；只有用户明确授权上传仓库时，才将已验证分支推送到 GitHub `origin` 与 Gitee `gitee`，并核对两个远端分支及 ahead/behind 数量。
4. Upload the matching WeChat mini-program build and record whether it is a development, experience, review, or production version. Experience-only releases must not be submitted for review or published without explicit user authorization.
5. Update the Feishu version Base with public-facing release language. The update directory must use numbered items such as `1、2、3、4、5、6、7`, describe user-visible changes, and exclude internal branch names, commit hashes, implementation details, and private troubleshooting notes.
6. Create or update a Feishu Knowledge Base announcement titled in the form `赛小蜂篮球 <version> 版本更新公告`. The announcement must include version, date, release stage, user-visible highlights, experience notes, and support/feedback guidance.
7. Read back and verify the Feishu Base record and Knowledge Base announcement after writing. Record their links/tokens, verification result, unresolved permission issues, and final release boundary in the daily development log.

Public announcement copy must be written for customers and partners. Internal engineering evidence belongs only in `DEVELOPMENT_LOG.md` or the dated development log.

Fixed Feishu release targets:

- Version Base direct URL: `https://lxcmobp6gun.feishu.cn/base/X90rb0D18a9J8isi5OfcykK5nZe`.
- Version Base knowledge-base entry: `https://lxcmobp6gun.feishu.cn/wiki/Cy2ew2TDWidvIpkG4MEc8R0znZc`.
- Version table: `版本更新记录` (`tblvciPEwoSstRny`).
- Each release must update and read back the version-table record, and create/read back a separate knowledge-base announcement named `赛小蜂篮球 <version> 版本更新公告`.
- Repeated URLs with the same wiki token identify the same target and must not create duplicate records or announcements.

### Chinese Encoding Rules

- All Chinese-facing files should be UTF-8 without BOM.
- 新增以中文为主要内容的文档、需求记录、开发记录、方案和说明文件时，文件名必须使用中文；仅行业固定品牌名、协议名、代码文件名或技术标识可保留原文。
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

### Basketball / Football CloudBase Multi-Account CLI

- Basketball and football belong to different Tencent Cloud accounts. Do not rely on the machine-wide `tcb login` state and do not manually switch global CLI accounts.
- Use the unified launcher `E:\Documents\sxf-basketball\tools\sxf-cloud.ps1` for all CloudBase CLI operations:
  - Basketball alias: `basketball` -> `E:\Documents\sxf-basketball` -> `sxf-basketball-d9gp6yt0rd1f7be4d`.
  - Compatibility alias: `basketball-target` points to the same migrated basketball environment.
  - Football alias: `football` -> `E:\Documents\sxf-football` -> `cloud1-7g8ckb3c7815a011`.
- The short command `sxf-cloud` is registered in the current Windows user's PATH. If a Codex/Desktop process has not refreshed PATH, invoke the PowerShell script by its absolute path.
- Read-only verification examples:
  - `sxf-cloud basketball test`
  - `sxf-cloud football test`
- General command examples:
  - `sxf-cloud basketball run fn list`
  - `sxf-cloud football run fn list`
- API Keys are stored outside Git under `%LOCALAPPDATA%\SxfCloud\credentials\` and encrypted with Windows DPAPI for the current Windows user. Never read, print, copy, log, commit, or move the credential files.
- On the same machine and under the same Windows user, new Codex sessions reuse the encrypted API Keys automatically and must not ask the user to authorize or paste them again unless a Key is missing, revoked, expired, or fails validation.
- Each invocation performs an isolated temporary API Key login and removes the temporary CLI credential directory afterward. The launcher fixes the target `envId` and rejects manual environment overrides.
- Listing and status checks are read-only. Deployments, configuration updates, database writes, storage changes, function deletion, or other cloud mutations still require clear task authorization and task-appropriate verification.

### Mini Program Common Icon Library Rules

- Design/source icon library: `E:\OneDrive\Desktop\赛小蜂篮球\赛小蜂篮球UI\2.0版本\图标通用库`.
- Before creating, downloading, tracing, or cropping any icon, search `semantic-icon-map.json` and the official project's existing cloud/local icon mappings first.
- Icon reuse priority is fixed: existing verified project/cloud icon -> licensed iconfont.cn SVG/PNG -> consistent local fallback. Do not redraw an icon when a suitable verified icon already exists.
- A repeated semantic icon must have one canonical source. Do not copy the same icon into multiple page-level `assets` folders, and do not create duplicate files only because color or disabled state differs.
- Keep SVG as the editable source when available. Produce transparent PNG variants from the same source for orange active, white/high-contrast, gray disabled, and red danger states; record variants under the same semantic key.
- Feature/form/page icons used in production must be uploaded to cloud storage. Page code references a stable cloud fileID/HTTPS URL through a semantic mapping; it must not reference the OneDrive design-library path.
- Local `native-dist/assets` is source/backup only unless an existing shared component already depends on it. Do not add page-specific production icon copies there as a shortcut.
- Every newly accepted icon must record: semantic key, source URL or original local source, author/license when external, SVG source, PNG variants and sizes, intended pages, cloud fileID/URL, and replacement relationship.
- iconfont.cn search URLs alone are candidates, not approved production sources. A downloaded icon becomes production-ready only after its detail URL, author/project, and usage license are recorded.
- User-created EPS/AI/SVG files under `1.0版本/图标/` are immutable source masters. Preserve them and derive new versions non-destructively in the common library.
- Do not treat logos, avatars, photos, card skins, backgrounds, status bars, or WeChat capsule artwork as ordinary icons. They follow their own asset rules.
- Page-level `04-icons/` or `09-common-icons/` may remain empty when all icons are resolved through the common library; this is expected deduplication, not a missing asset.
- Before handoff, run a duplicate check by file hash and semantic key, validate transparent edges and target resolution, and update the icon manifest plus development log.

#### Bottom Tab Bar Exception

- Bottom navigation remains an existing shared component and is not handled as ordinary page icons.
- Reuse `native-dist/components/sxf-tabbar` and the canonical selected/unselected pairs from `图标通用库/01-bottom-tabbar/`.
- Never crop tab icons from a prototype, download replacement tab icons per page, or store another tabbar set inside page asset folders.
- The fixed order is: workbench, tournament, player, education, data, mine.

### WeChat Capsule Safe Area

- Every custom-navigation page must reserve the top-right WeChat capsule safe area; page titles, dates, counts, labels, edit actions, and floating buttons must never sit behind or touch the capsule.
- Prefer calculating the safe area from `wx.getMenuButtonBoundingClientRect()`. For static native pages, reserve at least `210rpx` on the right of the top navigation row, or move right-side actions into a separate row below the capsule.
- Do not solve capsule collisions with arbitrary `translateY` offsets. Keep navigation content inside an explicit safe layout and verify it on narrow iPhone portrait screens before handoff.

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

根据 README、开发记录与最新产品决策：小程序现有能力仍以赛事 MVP 为主；PC 端的主产品定位是“赛训经营增长平台”，赛事中心为可按需启用的附加模块。

### 4.0 产品层级

| 层级 | 模块 | 职责 |
|---|---|---|
| PC 核心平台 | 赛训经营增长平台 | 机构身份、校区、学员、教练、课程、课消、经营数据与增长管理 |
| PC 附加模块 | 赛事中心 | 赛事、赛制、赛程、场次、现场人员安排、赛果和赛事数据 |
| 小程序现场工具 | 横屏计分台、球员数据统计台、MC 控制台 | 比赛现场执行与协同控制 |

未启用赛事中心的机构，仍可完整使用赛训经营增长平台的核心能力。

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
- 比赛计分：手机与 PAD 统一使用横屏计分台；支持主客队比分、节数、比赛时间、正/倒计时、暂停、犯规、换人、技术统计、结束比赛与生成赛果。
- 现场控制：暂停次数、交换场地、重开确认、撤销记录、最近操作记录。
- MC 音效：计分板内提供进攻/防守/得分播报/暂停音乐/MVP 音效等播放控制；“我的”中提供 MC 音效设置入口。
- 我的：个人资料修改、头像昵称、基础账号信息、退出登录、意见反馈。
- PC 后台现状：现有原型包含会员码、MC 音乐库、权益管理等演示能力；后续优先建设赛训经营增长平台中的赛事中心模块，不将赛事中心误作 PC 核心平台的全部内容。
- 云端音乐：后台维护 MC 音频，小程序计分盘拉取云端音乐库。

### 4.3 1.0 灰度展示 / 后续版本功能

- 工作台快捷功能：创建赛事、快捷比赛、创建球队、创建球员在 1.0 中为启用状态；销课统计、课后评价、生成报表等在 1.0 中展示为灰度待开发。
- 教务中心：多校区管理、课程排课、学员签到、课消统计、课后评价、教练工资在 1.0 中仅作为介绍页展示。
- 数据中心：赛事数据、球员技术统计、球队对比、成长趋势、家长端同步、数据海报在 1.0 中仅作为介绍页展示。
- 报表能力：首发阵容名单报告、赛后赛事报告、正式赛事 PDF 报表、现场打印可作为 2.0 迭代能力规划。
- 家长端传播：球员数据海报、球员卡、徽章成长体系、赛照自动抠图与多皮肤底板属于后续版本规划。
- 教务 + 赛事联动：学员库导入参赛名单、课堂积分联动、课后对抗赛表现回传等能力后置到 2.0。

### 4.4 已确认的后续赛事现场协作决策

- 计分板无论手机或 PAD，统一只提供横屏控制台；不再设计、开发或验收竖屏计分界面。
- 一人模式保留原版完整控制；二人模式新增独立球员数据统计台，主控只保留队伍级比赛控制；三人模式再新增独立 MC 控制台。
- 球员数据统计台负责阵容、换人、球员得分归属和个人技术统计，只读同步主控的比分、时间、节次和 24/14 秒，不能修改球队总比分或比赛时间。
- 三人模式中 MC 被第三台设备接管后，主控底部 MC 区域必须锁定置灰并提示“MC 已由其他设备接管”；主控只保留二次确认的紧急停止全部音频与接管能力。
- 不建立独立主裁判身份、通用裁判库或裁判登录入口。机构赛事管理员在 PC 后台可直接指派内部教练，或通过服务号邀请外请人员。
- 外请人员不录入机构教练库，不进入课程、课消、薪酬或经营数据；其服务号绑定身份和权限仅限被分配的赛事场次。
- 三席协同功能已记录在 `docs/三席协同现场控制台功能记录.md`；当前优先级是 PC 端赛事中心模块。
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

仅在用户明确授权“上传仓库”“提交推送”或指定推送目标后同步：

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

