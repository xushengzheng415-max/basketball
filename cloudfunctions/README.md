# 赛小蜂篮球云开发说明

环境名称：`cloudbase`  
环境 ID：`cloudbase-d4g93f0re5f3274c1`

## 云函数

请在微信开发者工具中展开 `cloudfunctions/`，逐个右键上传并部署：

- `sxLogin`：登录/游客进入时写入或更新用户资料。
- `sxSaveUser`：保存昵称、头像等用户资料。
- `sxSubmitFeedback`：提交意见反馈。
- `sxCreateOrder`：创建 Pro 订单，并在原型阶段写入模拟权益。
- `sxSaveMatchResult`：保存免费计分赛果，包含比分和犯规。
- `sxAdminDashboard`：后台汇总读取用户、反馈、订单、权益、赛果数据。

## 数据库集合

如果数据库集合不能由代码自动创建，请在云开发控制台手动创建下面集合：

| 集合名 | 用途 | 建议权限 |
| --- | --- | --- |
| `sx_users` | 小程序用户资料、openid、unionid、昵称、头像、手机号 | 仅创建者和管理员可读写，或仅云函数可读写 |
| `sx_feedback` | 用户反馈内容、联系方式、处理状态 | 仅云函数可读写 |
| `sx_orders` | Pro 订单、金额、支付状态 | 仅云函数可读写 |
| `sx_entitlements` | Pro 权益，控制 MC 系统和计分板 2.0 解锁 | 仅云函数可读写 |
| `sx_match_results` | 免费计分结果，包含比分、犯规、节次、结束时间 | 仅创建者和管理员可读写，或仅云函数可读写 |

## 建议索引

- `sx_users`: `openid`
- `sx_feedback`: `openid`, `createdAt`, `status`
- `sx_orders`: `openid`, `orderNo`, `status`, `createdAt`
- `sx_entitlements`: `openid`, `status`, `productId`
- `sx_match_results`: `openid`, `createdAt`

## 注意

当前 `sxCreateOrder` 为原型阶段模拟支付：会生成 `mock_paid` 订单并写入权益。正式接入微信支付后，应改为：

1. 下单云函数创建 `pending` 订单。
2. 微信支付回调校验成功后更新 `sx_orders.status = paid`。
3. 回调或支付确认云函数写入 `sx_entitlements`。
## 2026-07-02 新增权益校验

新增云函数：

- `sxCheckEntitlement`：查询当前微信用户在 `sx_entitlements` 中是否拥有指定功能权益。当前用于 `mc_system`，后续也可用于 `stats_scorer_2`。

权益字段建议：

- `features`: 数组，例如 `['mc_system', 'stats_scorer_2']`
- `status`: `active` 表示有效
- `scope`: `single_match`、`monthly`、`lifetime`
- `remainingUses`: 单场权益剩余次数，月卡和买断可不填
- `expiresAt`: 月卡到期时间，买断可不填

请在云开发工具中上传并部署 `sxCheckEntitlement`。微信支付正式接入前，`sxCreateOrder` 仍保留原型模拟支付逻辑。

## 2026-07-02 新增腾讯云 TTS 比分播报

新增云函数：

- `sxCreateScoreVoice`：校验 `mc_system` 权益后，调用腾讯云语音合成 `TextToVoice`，将播报文案生成 mp3，并上传到云存储 `score-voice/`。

需要新增集合：

- `sx_voice_logs`：记录 AI 播报文案、风格、音色、云存储 fileID、腾讯云 requestId。

云函数环境变量：

- `SXF_TTS_SECRET_ID`：腾讯云 CAM API 密钥 SecretId
- `SXF_TTS_SECRET_KEY`：腾讯云 CAM API 密钥 SecretKey
- `TTS_REGION`：建议 `ap-guangzhou`
- `TTS_VOICE_TYPE`：默认音色 ID，例如先用腾讯云控制台试听后选择
- `TTS_VOICE_STANDARD`：可选，标准播报音色 ID
- `TTS_VOICE_LIVE`：可选，现场 MC 音色 ID
- `TTS_VOICE_KIDS`：可选，儿童友好音色 ID
- `TTS_CODEC`：默认 `mp3`
- `TTS_SAMPLE_RATE`：默认 `16000`

说明：密钥只放云函数环境变量，不能写进小程序前端代码。

### 当前默认播报音色

- 标准播报：赛小瑜，腾讯云音色 ID `101001`
- 现场 MC：赛小智，腾讯云音色 ID `101054`
- 儿童友好：赛小萌，腾讯云音色 ID `101015`

环境变量仍可覆盖默认音色：

- `TTS_VOICE_STANDARD` 覆盖标准播报
- `TTS_VOICE_LIVE` 覆盖现场 MC
- `TTS_VOICE_KIDS` 覆盖儿童友好

### 包体说明

`sxCreateScoreVoice` 当前不依赖腾讯云 Node SDK，而是用 Node.js 内置 `https` 和 `crypto` 直接调用腾讯云 `TextToVoice` API，避免自动真机调试时云函数源码包超过 2MB。

## 2026-07-02 微信支付 JSAPI 骨架

新增云函数：

- `sxCreateWxPayOrder`：创建微信支付 JSAPI 预支付订单，返回小程序 `wx.requestPayment` 所需参数。
- `sxWxPayNotify`：微信支付回调占位，负责解密 API v3 通知、更新订单状态、写入 Pro 权益。

需要新增集合：

- 沿用 `sx_orders` 和 `sx_entitlements`，不需要新增支付专用集合。

微信支付云函数环境变量：

- `SXF_WXPAY_APPID`：小程序 AppID，当前为 `wx06d735da15276acd`
- `SXF_WXPAY_MCHID`：微信支付商户号，当前为 `1114763686`
- `SXF_WXPAY_SERIAL_NO`：商户 API 证书序列号
- `SXF_WXPAY_PRIVATE_KEY`：商户 API 私钥内容，换行可写成 `\n`
- `SXF_WXPAY_API_V3_KEY`：你在商户平台设置的 32 位 APIv3 密钥
- `SXF_WXPAY_NOTIFY_URL`：`sxWxPayNotify` 的 HTTP 触发访问地址

说明：

- `sxCreateWxPayOrder` 需要 `SXF_WXPAY_SERIAL_NO`、`SXF_WXPAY_PRIVATE_KEY`、`SXF_WXPAY_NOTIFY_URL`。
- `sxWxPayNotify` 需要 `SXF_WXPAY_API_V3_KEY`。
- 不要把证书、私钥、APIv3 密钥提交到代码仓库。
## 2026-07-02 会员兑换码与 MC 音乐库

新增云函数：

- `sxCreateRedeemCode`：后台生成会员兑换码，可批量生成，写入 `sx_redeem_codes`。
- `sxRedeemCode`：小程序用户在“我的”页面兑换会员码，兑换成功后写入 `sx_entitlements`。
- `sxSaveAudioLibrary`：后台把 MC 音乐云存储 fileID 保存到 `sx_mc_audio_library`。
- `sxGetAudioLibrary`：小程序计分盘读取 MC 音乐库，按音频类型同步最新配置。

新增数据库集合：

- `sx_redeem_codes`：会员码、状态、有效天数、使用人、批次号。
- `sx_mc_audio_library`：MC 音频类型、名称、云存储 fileID、状态。

建议新增环境变量：

- `SXF_ADMIN_TOKEN`：后台口令，建议同时配置到 `sxCreateRedeemCode` 和 `sxSaveAudioLibrary`。

MC 音频类型：`buzzer`、`three`、`two`、`miss`、`cheer`、`attack`、`defense`、`rest`。
