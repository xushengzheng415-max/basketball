# 企微客户群篮球晨报部署说明

本部署包用于在固定 IP 服务器上生成“国内篮球短讯1—2条 + 国外篮球短讯1—2条 + 机构提醒1条”，并通过企业微信客户联系接口创建外部客户群群发任务。新闻跨日去重，国内职业/国家队和NBA/WNBA优先；机构提醒按当前运营日历生成，不从新闻硬推结论。

企业微信不会把任务直接发进外部客户群。系统可自动生成内容、创建任务和提醒群主，但最后一步仍需群主在企业微信中确认发送。

## 安全边界

- 应用只监听宿主机 `127.0.0.1:3400`，不直接暴露公网端口。Linux Compose 使用 host network，使容器内的回环监听对应宿主机回环；因此不声明 `ports`。
- 管理页默认只通过 SSH 隧道访问，不修改或启用任何 Nginx 配置。
- `SERVICE_ENABLED`、`SCHEDULER_ENABLED`、`AUTO_CREATE_ENABLED`、`AUTO_REMIND_ENABLED` 默认全部为 `false`。
- 企微 Secret、OpenAI Key、管理令牌只写入服务器上的 `config/wecom-group-briefing.env`。该文件权限必须为 `0600`，不得复制到仓库、日志或聊天记录。
- `SOURCE_DOMAIN_ALLOWLIST` 必须显式填写。空白名单不应作为生产配置使用。
- 持久化状态保存在 `data/wecom-group-briefing/state.json`，用于日期幂等、任务状态和重启恢复。

## 服务器目录

部署脚本假设服务器已有以下结构：

```text
/opt/sxf-platform/
├── apps/
│   └── wecom-group-briefing/        # 应用源码及 Dockerfile
├── config/
│   ├── wecom-group-briefing.env.example
│   └── wecom-group-briefing.env     # 首次运行脚本时安全创建
├── data/
│   └── wecom-group-briefing/
├── docker-compose.briefing.yml
├── deploy-wecom-group-briefing.sh
└── configure-wecom-group-briefing.sh
```

仓库与服务器的同步映射固定如下：

| 仓库源文件 | 服务器目标 |
|---|---|
| `cloudfunctions/sxWecomGroupBriefing/` | `/opt/sxf-platform/apps/wecom-group-briefing/` |
| `ops/lightserver/docker-compose.briefing.yml` | `/opt/sxf-platform/docker-compose.briefing.yml` |
| `ops/lightserver/wecom-group-briefing.env.example` | `/opt/sxf-platform/config/wecom-group-briefing.env.example` |
| `ops/lightserver/deploy-wecom-group-briefing.sh` | `/opt/sxf-platform/deploy-wecom-group-briefing.sh` |
| `ops/lightserver/configure-wecom-group-briefing.sh` | `/opt/sxf-platform/configure-wecom-group-briefing.sh` |

同步源码是部署前置步骤，不由部署脚本猜测仓库位置，也不由脚本执行带 `--delete` 的目录同步。请使用现有发布通道把上表内容复制到精确目标，并确认 `/opt/sxf-platform` 由部署用户管理。

## 首次部署

1. 安装 Docker 与 Docker Compose v2，将服务器时区设为 `Asia/Shanghai`。
2. 按上表同步应用和部署文件。
3. 运行部署脚本：

   ```bash
   cd /opt/sxf-platform
   bash ./deploy-wecom-group-briefing.sh
   ```

4. 首次运行只会创建权限为 `0600` 的 `config/wecom-group-briefing.env`，然后退出，不会构建或启动服务。
5. 编辑环境文件，至少填写管理令牌、内容模型、企微鉴权、发送成员、目标群和来源白名单；所有自动化开关仍保持 `false`。
6. 再次运行脚本。脚本会构建并启动独立 Compose 服务，然后回读 `http://127.0.0.1:3400/health`。脚本不会更改 Nginx、防火墙或其他现有容器。

不希望直接编辑环境文件时，可在服务器上运行安全配置助手。Secret、API Key 和管理页密码均为隐藏输入，不会回显；测试群 `chat_id` 暂时未知时可以留空：

```bash
cd /opt/sxf-platform
./configure-wecom-group-briefing.sh
./deploy-wecom-group-briefing.sh
```

## 配置说明

### 企微配置

- `WECOM_CORP_ID`：企业 ID。
- `WECOM_CONTACT_SECRET`：已配置到“客户联系 → 可调用接口的应用”的自建应用 Secret，不是任意应用 Secret。
- `WECOM_AGENT_ID`：自建应用 AgentId；用于在自动生成或建任务失败时给群主发送内部告警。
- `WECOM_SENDER_USERID`：创建群发任务的成员 userid。该成员应是目标客户群群主或有权执行群发的成员，并处于应用可见范围内。
- `WECOM_CHAT_ID_LIST`：目标外部客户群 chat_id，多个值用英文逗号分隔。只列出已经核对过的群，不按群名自动匹配。
- `WECOM_API_BASE`：默认使用企微官方 API 地址 `https://qyapi.weixin.qq.com`，生产环境通常无需修改。
- `WECOM_TIMEOUT_MS=10000`：单次企微接口请求最长等待 10 秒，可配置范围为 1000—60000 毫秒。
- 固定服务器公网 IP 需要加入企微自建应用的企业可信 IP；否则接口可能返回 `60020`。

客户群群发额度由企业内所有群发任务共享。启用每日晨报前，需要在企微群发助手中核对当前频率规则以及其他业务任务，避免客户群因当天已收到其他群发而无法发送。

### 内容与来源

- `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`：OpenAI Responses 兼容接口配置；所选模型必须支持结构化输出。
- 可以使用 DeepSeek API。配置助手选择 `1` 时会写入 `OPENAI_BASE_URL=https://api.deepseek.com` 和 `OPENAI_MODEL=deepseek-v4-flash`；环境变量沿用 `OPENAI_*` 名称只是为了共用同一套 Responses 客户端。
- 服务优先从新华网、中国新闻网、中国篮协、腾讯新闻、FIBA 与 NBA 发现候选文章，确认文章可访问且发布时间在回看窗口内，再交给模型改写。模型必须原样返回候选 URL 和发布时间。
- 腾讯新闻通过公开 PC 文章流读取体育与 NBA 频道，只接受 `TENCENT_TRUSTED_SOURCES` 中的精确来源名，并回读 `news.qq.com/rain/a/...` 正式页核对作者、标题、发布时间和正文。默认拒绝“体育领域创作者”等个人号，也不会把 `author=腾讯网` 当成腾讯自有编辑证明。
- `TENCENT_FEED_PAGES=2`：体育与 NBA 频道各读取两页，可配置范围为 1—3。
- `TENCENT_TRUSTED_SOURCES`：逗号分隔的腾讯文章流可信来源名。新增来源前必须人工检查其账号主体和历史内容。
- `OPENAI_WEB_SEARCH_TOOL=web_search`：当独立来源发现不足时使用的兼容回退；DeepSeek 未返回可审计搜索记录时，模型自报 URL 不会通过来源校验。
- `REQUIRE_SEARCH_PROVENANCE=true`：要求每条新闻匹配已核验候选 URL 或模型响应中的可审计搜索来源，生产环境保持开启。
- `OPENAI_TIMEOUT_MS=120000`：单次内容生成最长等待 120 秒。
- `OPENAI_MAX_OUTPUT_TOKENS=6000`：给结构化 JSON 留足输出空间，避免截断。
- `OPENAI_GENERATION_ATTEMPTS=2`：空正文、非法 JSON 和瞬时接口错误在单轮调度内最多尝试两次。
- `SOURCE_FETCH_TIMEOUT_MS=12000`：白名单页面单次读取超时。
- `SOURCE_DOMAIN_ALLOWLIST`：允许进入晨报的来源域名，使用英文逗号分隔；启用腾讯源时精确加入 `news.qq.com`，不要加入整个 `qq.com`。
- `BRIEF_LOOKBACK_HOURS=72`：优先最近24小时；当天不足3条时，最多回看72小时。
- `NEWS_DEDUP_DAYS=7`：最近7天已生成过的同一链接或高度相似事件不得再次进入晨报。

### 调度与提醒

- `SCHEDULE_HOUR=9`、`SCHEDULE_MINUTE=0`：每天 09:00 生成并创建群发任务。
- `REMINDER_HOUR=10`、`REMINDER_MINUTE=0`：若任务已创建但尚未发送，可在 10:00 调用企微提醒接口。
- `REMINDER_MIN_INTERVAL_MINUTES=60`：同一任务两次提醒至少间隔 60 分钟，可配置范围为 1—1440 分钟。
- `AUTO_CREATE_ENABLED=false`：禁止自动创建群发任务。
- `AUTO_REMIND_ENABLED=false`：禁止自动提醒群主。

提醒只是催办，不能替代群主确认。正式启用前应先在测试客户群中验证内容、目标群、群主身份和发送结果。

企微限制同一个群发任务 24 小时内最多提醒 3 次。本配置每天最多自动提醒一次；不要用外部定时器叠加提醒。

## 建议启用顺序

1. 保持四个安全开关为 `false`，启动服务并检查健康状态。
2. 设置 `SERVICE_ENABLED=true`，通过管理页手动生成并审核当天内容。
3. 只在测试客户群中手动创建一次群发任务，确认 `WECOM_SENDER_USERID` 与 `WECOM_CHAT_ID_LIST` 无误。
4. 设置 `SCHEDULER_ENABLED=true`，验证定时生成与日期幂等。
5. 验证完成后再设置 `AUTO_CREATE_ENABLED=true`。
6. 最后按运营需要决定是否设置 `AUTO_REMIND_ENABLED=true`。

每次改动环境文件后重新运行部署脚本，使容器重新读取配置。

## 管理页访问

在本地电脑建立 SSH 隧道：

```bash
ssh -N -L 3400:127.0.0.1:3400 ubuntu@SERVER_FIXED_IP
```

然后访问 `http://127.0.0.1:3400/admin`。管理页使用 HTTP Basic 认证：用户名可填写任意非空值，密码填写服务器环境文件中的 `ADMIN_TOKEN`。

如未来必须开放公网访问，应另行评审域名、HTTPS、访问控制和审计策略；本部署包不包含也不自动启用 Nginx location。

## 运维检查

```bash
cd /opt/sxf-platform
docker compose -f docker-compose.briefing.yml ps
docker compose -f docker-compose.briefing.yml logs --tail=100 wecom-group-briefing
curl --fail http://127.0.0.1:3400/health
```

安全停止服务不会删除状态数据：

```bash
cd /opt/sxf-platform
docker compose -f docker-compose.briefing.yml stop wecom-group-briefing
```

不要执行 `down -v`，也不要手工删除 `data/wecom-group-briefing`。出现失败时先保留状态文件并检查日志，确认精确目标后再处理。
