# 麦步赛事公众号草稿工具

这套工具将篮球培训行业文章通过微信公众平台官方接口放入「麦步赛事」草稿箱。

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

成功时会返回当前草稿数量。若返回「api unauthorized」，请在公众号后台的「接口权限」中确认账号是否拥有草稿箱接口。

## 自动生成并写入草稿箱

先准备一份 UTF-8 文本资料，例如赛事实录、采访整理、人物资料或活动复盘。资料里的事实越完整，文章越可靠。

```powershell
node tools/wechat-official/wechat-draft.js run --topic "本周选题" --briefing .\资料.txt --cover .\封面.jpg
```

生成的文章 JSON 会先保存在 `tools/wechat-official/output/`，随后写入公众号草稿箱。

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

## 常见错误

- `40164 invalid ip`：把当前公网出口 IP 加入公众号 IP 白名单。
- `40013 invalid appid`：检查 AppID；公众号 AppID 与小程序 AppID 不是同一个值。
- `40125 invalid appsecret`：重置并重新填写 AppSecret，切勿发到聊天或提交到 Git。
- `48001 api unauthorized`：当前公众号没有该接口权限，需要在后台查看权限或完成相应认证。
- `40007 invalid media_id`：封面素材 ID 不属于当前公众号或已失效，重新上传封面。
