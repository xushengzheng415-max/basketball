# 服务号中转服务

该服务仅运行在具备服务号 API IP 白名单的轻量服务器上。`SERVICE_ACCOUNT_APPSECRET` 和 `BRIDGE_KEY` 只能保存在服务器 `.env` 文件中，不得提交到仓库。

部署后由 Nginx 将 `https://api.saixiaofeng.com/wechat/service-account/follow-qrcode` 转发至本地 `127.0.0.1:3300`。
