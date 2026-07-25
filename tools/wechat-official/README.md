# 蜂家日记：自动写作到公众号草稿箱

这套工具完成两件事：

1. 根据同一个选题自动生成“一篇篮球培训行业主文 + 一篇《蜂家日记》”；
2. 通过微信公众平台官方接口把文章放进“蜂狂篮球”草稿箱。

它**不会自动群发或发布**。每篇文章仍应在公众号后台完成事实核对、排版预览和人工确认。

## 首次配置

1. 把 `.env.example` 复制为当前目录的 `.env.local`。
2. 在微信公众平台「设置与开发 → 基本配置」获取 AppID 和 AppSecret，填入 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`。
3. 填入 `OPENAI_API_KEY`。如果只上传已经写好的文章，可以不填。
4. 在公众号后台把运行本工具的公网出口 IP 加入 IP 白名单。

真实密钥只放在 `.env.local`，该文件已被当前目录的 `.gitignore` 排除。

## 第一步：检查公众号权限

```powershell
node tools/wechat-official/wechat-draft.js doctor
```

成功时会返回当前草稿数量。若返回「api unauthorized」，请在公众号后台的「接口权限」中确认账号是否拥有草稿箱接口。个人主体、未认证账号的接口能力以后台实际显示为准。

## 自动生成并写入草稿箱

先准备一份 UTF-8 文本资料，例如赛事实录、采访整理、人物资料或活动复盘。资料里的事实越完整，文章越可靠。

```powershell
node tools/wechat-official/wechat-draft.js run --topic "输掉比赛以后，孩子真正学到的东西" --briefing .\采访整理.txt --cover .\封面.jpg
```

生成的双篇文章 JSON 会先保存在 `tools/wechat-official/output/`，随后作为同一组图文写入公众号草稿箱。主文提供行业判断和方法，《蜂家日记》延续现场叙事；默认不宣传赛小蜂篮球产品。

## 分两步操作

只生成文章：

```powershell
node tools/wechat-official/wechat-draft.js generate --topic "本周选题" --briefing .\资料.txt
```

人工修改输出 JSON 后，再写入草稿箱：

```powershell
node tools/wechat-official/wechat-draft.js draft --input .\tools\wechat-official\output\文章.json --cover .\封面.jpg
```

如果公众号素材库已有固定封面，可把其永久素材 ID 填入 `WECHAT_THUMB_MEDIA_ID`，之后无需每次传 `--cover`。

双篇 JSON 也可以分别设置 `cover_path`，工具会为每篇上传独立封面。正文中的图片使用占位符，并在 `content_images` 中记录本地路径、图注和来源；写入草稿时工具会先把图片转存到微信，再替换正文占位符。

## 常见错误

- `40164 invalid ip`：把当前公网出口 IP 加入公众号 IP 白名单。
- `40013 invalid appid`：检查 AppID；公众号 AppID 与小程序 AppID 不是同一个值。
- `40125 invalid appsecret`：重置并重新填写 AppSecret，切勿发到聊天或提交到 Git。
- `48001 api unauthorized`：当前公众号没有该接口权限，需要在后台查看权限或完成相应认证。
- `40007 invalid media_id`：封面素材 ID 不属于当前公众号或已失效，重新上传封面。
