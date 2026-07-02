# 2026-07-02 开发记录

## 会员码后台与 MC 音乐库

### 用户反馈

免费功能基本完成后，需要 PC 后台生成会员兑换码，便于把测试会员码发给朋友；同时希望 MC 音乐可以在后台自定义维护，并同步到小程序音乐库。

### 已调整

- 新增云函数 `sxCreateRedeemCode`：后台批量生成会员兑换码，写入 `sx_redeem_codes`。
- 新增云函数 `sxRedeemCode`：小程序“我的”页面可兑换会员码，兑换成功后写入 `sx_entitlements`。
- 新增云函数 `sxSaveAudioLibrary`：后台保存 MC 音频云存储 fileID。
- 新增云函数 `sxGetAudioLibrary`：计分盘进入时拉取云端音乐库，并覆盖默认音效候选。
- PC 后台新增“会员码”和“MC 音乐库”模块。
- “我的”页面新增会员兑换入口。
- 修复快速比赛主客队名称无法自由编辑的问题：输入时允许为空，开始比赛时再兜底为“主队/客队”。

### 后台使用说明

打开 `admin/index.html`，填写云函数 HTTP 网关域名和后台口令 `SXF_ADMIN_TOKEN` 后使用。

需要部署的新云函数：

- `sxCreateRedeemCode`
- `sxRedeemCode`
- `sxSaveAudioLibrary`
- `sxGetAudioLibrary`

需要新增的数据库集合：

- `sx_redeem_codes`
- `sx_mc_audio_library`

建议给 `sxCreateRedeemCode` 和 `sxSaveAudioLibrary` 配置同一个环境变量：

- `SXF_ADMIN_TOKEN`

## 计分盘现场控制补充

### 用户反馈

计分盘需要增加暂停次数，放在犯规次数旁边；主客场比分牌需要一键换位置；重新比赛需要确认/取消，避免现场误触。

### 已调整

- 主队、客队比分牌新增暂停次数显示与 `- / +` 控制。
- 暂停操作进入最近记录，并支持“撤销”回退。
- 新增“换边”按钮，一键交换主客队名称、比分、犯规、暂停和历史事件方向。
- “重开”比赛增加确认弹窗，取消时不会清空当前数据。
- 结束比赛保存赛果时同步保存主客队暂停次数。
