# 赛小蜂篮球

赛小蜂篮球是面向篮球机构、赛事组织者、裁判、教练、球员和家长的多端平台，包含微信小程序、PC 赛训经营与赛事后台、CloudBase 云函数、公开官网以及赛事现场计分与协同能力。

## 正式代码源

- Gitee：`https://gitee.com/saixiaofeng/basketball.git`
- 正式本地仓库：`E:\Documents\sxf-basketball`
- `main`：稳定、可部署基线
- `development`：日常开发与 Bug 修复集成分支
- GitHub：保留为现有辅助远程，Gitee 是正式协作入口

正式入口：

- 官网：`https://www.sxfbasketball.cn/`
- PC 后台：`https://www.sxfbasketball.cn/admin/`

禁止使用 ZIP、聊天附件或复制整个文件夹代替 Git 同步。

## 开发前必读

1. `AGENTS.md`：篮球项目技术、安全、产品和部署红线。
2. `docs/README.md`：共享知识库入口。
3. `DEVELOPMENT_LOG.md`：当前功能、部署状态和历史验证记录。
4. 与当前任务直接相关的 `docs/` 专题规则。
5. `CONTRIBUTING.md`：日常 Bug、提交、部署和特殊情况交接方式。

篮球与足球属于不同仓库、不同腾讯云账号和不同 CloudBase 环境。不得复制足球环境 ID、云函数名称或业务字段到篮球项目。

## 主要目录

| 目录 | 用途 |
|---|---|
| `native-dist/` | 当前微信开发者工具实际读取的原生小程序代码，是当前小程序主工作目录 |
| `src/` | 保留的 Taro + React + TypeScript 源码 |
| `admin/` | PC 赛训经营、赛事中心与平台后台 |
| `cloudfunctions/` | `sx*` CloudBase 云函数 |
| `docs/` | 产品规则、原型、现场协作、教务、赛事与技术文档 |
| `articles/`、`guides/` | 官网文章和使用指南 |
| `website-assets/` | 官网公共样式和资源 |
| `ops/` | 服务号及其他独立运维服务 |
| `tools/` | 本地验证、部署和辅助脚本 |

## 新电脑快速开始

```powershell
git clone https://gitee.com/saixiaofeng/basketball.git
cd basketball
git switch development
npm ci
npm run typecheck
```

当前原生小程序调试方式：使用微信开发者工具导入仓库根目录，`project.config.json` 会读取 `native-dist/`。

常用命令：

```powershell
npm run dev:weapp
npm run build:weapp
npm run typecheck
npm run admin:serve
npm run site:serve
npm run site:validate
```

## Codex 首次检查

在 Codex 中打开仓库目录后，先发送：

```text
请先读取 AGENTS.md、README.md 和 docs/README.md，检查当前 Git 分支、远程仓库、未提交文件、项目启动方式和篮球 CloudBase 环境。先不要修改或部署，告诉我当前电脑还缺少哪些工具和配置。
```

## 敏感信息

- `.env`、本机私有配置、Token、Secret、API Key、支付密钥和生产口令不得提交。
- 根目录 `.env.example` 只保存变量名，不保存真实值。
- CloudBase API Key 位于仓库外的加密凭据目录，不得复制、打印或提交。
- 新开发人员必须使用自己的 Gitee、Codex 和腾讯云子账号，不共用负责人主账号。
- 浏览器端代码和构建产物不能保存任何 Secret。

## 部署边界

Git 提交、小程序上传和 CloudBase 部署是三件独立的事。日常开发人员可在明确授权范围内处理普通 Bug 和部署受影响内容；数据库删除、数据迁移、账号权限、收费规则、生产密钥、微信后台、域名、证书和跨项目改动必须交给项目负责人。
