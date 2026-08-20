# 赛小蜂篮球 AI Agent 开发 Workflow

> 本文档记录赛小蜂篮球项目使用 Codex / Claude Code / Cursor 等 AI Agent 协作开发时的固定流程。

## 一、核心流程

所有需求、Bug 修复、代码调整、文档调整默认走：

```text
Issue -> Spec -> Plan -> Branch -> Code -> Test -> Review -> Docs -> PR -> Sync
```

## 二、执行标准

### 1. Issue

在 GitHub Issue 中记录需求背景、目标、影响范围、验收标准和当前状态。

### 2. Spec

开始实现前明确：

- 本次要解决什么
- 不解决什么
- 影响小程序、PC 后台、云函数、支付、音乐库还是文档
- 是否涉及线上配置、环境变量或数据库集合

### 3. Plan

拆解为可执行步骤，明确要改的目录：

- `native-dist/`：当前微信开发者工具实际读取目录
- `src/`：Taro 源码保留区
- `cloudfunctions/`：云函数
- `admin/`：PC 后台
- `docs/`：文档

### 4. Branch

使用 `codex/` 前缀创建分支，例如：

```bash
git switch -c codex/add-score-voice-library
```

### 5. Code

实现时遵守篮球项目规则：

- 当前小程序功能优先改 `native-dist/`
- 不提交密钥、后台口令、支付证书和本地配置
- 云函数敏感配置走环境变量
- 不混入用户已有未提交业务改动

### 6. Test

根据改动范围验证：

```bash
npm run typecheck
npm run build:weapp
```

小程序 WXML 相关改动建议检查：

```bash
rg "{{[^}]*\?[^}]*:.*}}" native-dist
rg "{{[^}]*\[[0-9]" native-dist
rg "{{[^}]*===|!==|\.find\(" native-dist
```

如果未执行测试，需要在 PR 中说明原因。

### 7. Review

PR 前自查：

- 是否影响计分盘现场操作
- 是否影响登录、游客体验、会员兑换、支付原型
- 是否影响 MC 音乐库和音频 fileID
- 是否影响云函数环境变量
- 是否需要数据库集合或权限配置

### 8. Docs

必要时更新：

- `AGENTS.md`
- `README.md`
- `DEVELOPMENT_LOG.md`
- GitHub Issue / PR 描述
- 云函数部署说明

### 9. PR

PR 描述必须包含：

- 关联 Issue
- 改动摘要
- 影响范围
- 验证结果
- 风险和回滚说明
- GitHub/Gitee 同步状态

### 10. Sync

完成后同步两个远端：

```bash
git push origin <branch>
git push gitee <branch>
```

合并主分支后，保持 GitHub `main` 和 Gitee `main` 一致。

## 三、当前决策

2026-07-02 起，赛小蜂篮球采用以上 Workflow 作为默认 AI Agent 开发流程。