# 2026-07-24 开发记录

## 蜂狂篮球公众号每日双篇自动化

- 创建 Codex 本地每日自动化“蜂狂篮球每日双篇”，每天 07:30 运行，使用 Codex 模型额度，不依赖独立 OpenAI 文本 API Key。
- 固定输出一篇篮球培训行业主文和一篇《蜂家日记》，计划由用户在 11:45 前审核并手动发布；自动化严禁自动群发或发布。
- 自动化新增视觉流程：两篇分别生成高质量无文字封面；正文每篇选择 2—4 张图片，优先来源与许可清楚的真实图片，必要时使用 AI 生成图补充。
- 明确图片合规边界：不使用来源不明的儿童正脸、带水印新闻摄影、竞品学员照片或无法确认授权的网图；保存来源、作者/机构与许可信息，AI 图片标注“AI生成”。
- `tools/wechat-official/wechat-draft.js` 新增正文图片上传并替换占位符功能，支持双篇各自的 `cover_path`，写草稿前自动将外部/生成图片转存到微信。
- ImageGen 路径：默认使用 Codex 内置 ImageGen，不需要独立 API Key；若要求精确锁定 API/CLI `gpt-image-2` high，则仍需另行配置 `OPENAI_API_KEY`。
- 技能安装：按 `skill-installer` 官方流程读取清单时 GitHub 返回 HTTP 403，本日未安装来源不明的第三方技能，后续在官方清单恢复后继续。
- 验证：`node --check tools/wechat-official/wechat-draft.js`、帮助命令和 `git diff --check` 均通过。
