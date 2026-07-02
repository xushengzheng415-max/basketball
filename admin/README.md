# 赛小蜂篮球 PC 后台

后台入口：

`admin/index.html`

也可以在项目根目录启动静态服务：

```powershell
npm run admin:serve
```

然后访问：

`http://localhost:5174`

## 当前能力

- 数据概览：用户、反馈、订单、权益、会员码、赛果。
- 用户资料：查看昵称、授权标识、手机号、来源。
- 反馈信息：查看用户提交的建议、问题和合作信息。
- 会员码：调用 `sxCreateRedeemCode` 生成测试会员码。
- MC 音乐库：调用 `sxSaveAudioLibrary` 保存云存储音频 fileID，小程序计分盘通过 `sxGetAudioLibrary` 自动同步。

## 使用前配置

在页面顶部填写：

- 云函数 HTTP 网关域名，例如 `https://xxx.app.tcloudbase.com`
- 后台口令 `SXF_ADMIN_TOKEN`

上线前建议在下面两个云函数里配置同一个 `SXF_ADMIN_TOKEN` 环境变量：

- `sxCreateRedeemCode`
- `sxSaveAudioLibrary`

如果暂时不配置口令，函数会允许调用，但只适合开发测试。
