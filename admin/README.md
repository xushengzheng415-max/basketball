# 赛小蜂篮球机构训赛经营增长平台 PC 端

机构端后台入口：

`admin/index.html`

平台运营工具入口：

`admin/platform-ops.html`

也可以在项目根目录启动静态服务：

```powershell
npm run admin:serve
```

然后访问：

`http://localhost:5174`

## 机构端当前能力

- 经营驾驶舱：实收、课消、在读学员、续费风险、今日课程与待办。
- 教务管理：课程、班级、课表、计划、点名和课后评价入口。
- 学员管理：学员档案、课包、出勤、评价和续费状态。
- 教练管理：教练档案、排课负荷、课时与教学质量。
- 赛事中心：包含赛事总览、球队与名单、赛程与分组、现场执行、赛果与数据五个二级页面；支持赛事规则、报名资格、场地裁判、现场任务、赛果复核和赛事报告，现场检录与计分任务可下发到小程序。
- 数据报表、财务中心和机构设置。

当前机构端为 PC 交互原型，使用演示数据；后续需要接入机构身份、权限与云端数据接口。

## 平台运营工具能力

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

## 绑定 54football.top

推荐把 `54football.top` 或 `admin.54football.top` 指向云开发静态网站托管：

1. 在云开发控制台打开“静态网站托管”。
2. 上传 `admin/` 目录里的文件。
3. 在“自定义域名”里绑定 `54football.top` 或 `admin.54football.top`。
4. 按控制台提示到域名 DNS 添加 CNAME 解析。
5. 等 HTTPS 证书签发完成后，用 `https://54football.top` 访问后台。

更推荐使用 `admin.54football.top` 做后台域名，主域名 `54football.top` 后面还能留给官网或下载介绍页。
