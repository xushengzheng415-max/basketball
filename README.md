# 赛小蜂篮球

赛小蜂篮球小程序前端项目，当前阶段聚焦快速比赛、横屏计分、赛事创建、球员库、登录授权和个人中心。

## 当前形态

微信开发者工具当前读取 `native-dist/` 原生小程序目录。

Taro 源码仍保留在 `src/`，后续可继续演进或迁回 Taro 构建链。

## 主要功能

- 登录页：微信授权登录、游客体验、协议勾选。
- 首页：快速开始比赛、最近赛果、赛事服务入口。
- 比赛计分：横屏计分、主客队、节数、每节时长、正/倒计时、结束生成赛果。
- 赛事：创建赛事，设置主客队，从球员库选择主客队球员。
- 球员：添加球员姓名和号码。
- 我的：个人账号、头像昵称、退出登录、意见反馈。
- 支付原型：赛事服务选择、确认订单、支付结果模拟页。

## 本地开发

```bash
npm install
npm run dev:weapp
```

如果使用当前原生小程序 MVP，请在微信开发者工具中打开项目根目录，`project.config.json` 已配置：

```json
"miniprogramRoot": "native-dist/"
```

## 仓库远端

- GitHub: https://github.com/xushengzheng415-max/basketball.git
- Gitee: https://gitee.com/saixiaofeng/basketball.git

## 开发记录

见 `DEVELOPMENT_LOG.md`。