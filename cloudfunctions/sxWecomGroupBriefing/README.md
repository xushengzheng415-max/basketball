# 赛小蜂篮球企微客户群晨报服务

这是一个 Node.js 20、零第三方依赖的独立服务。它每天生成“国内篮球短讯1—2条 + 国外篮球短讯1—2条 + 机构提醒1条”预览，完成来源、跨日去重和结构校验后，再为**明确的群主和明确的客户群 ID**创建企微客户群群发任务。国内职业/国家队和NBA/WNBA优先；机构提醒按开学、续费、排课等运营日历轮换，不从新闻硬推结论。企微群主仍需在客户端确认发送。

## 安全边界

- 默认 `SERVICE_ENABLED=false`、`SCHEDULER_ENABLED=false`、`AUTO_CREATE_ENABLED=false`，首次启动不会生成或创建任务。
- 服务固定监听 `127.0.0.1:3400`，不接受公网网卡连接。Docker 部署应使用 Linux host network，并由宿主机反向代理承担 TLS 和额外访问控制。
- `/health` 无认证；`/admin` 与 `/admin/api/*` 使用 HTTP Basic，密码为 `ADMIN_TOKEN`。示例：`curl -u admin:$ADMIN_TOKEN http://127.0.0.1:3400/admin/api/status`。
- 内容校验未通过时状态为 `review_required`，创建接口会拒绝执行。
- 当前自动证据校验确认引用 URL 来自本次 OpenAI `web_search` 的来源集合，并校验模型返回的发布日期是否落在回看窗口内；它**不会另行抓取原文页面来独立证明全文和真实发布日期**。因此初期必须保持 `AUTO_CREATE_ENABLED=false`，由运营人员查看原文链接后创建任务，群主确认是最终事实关口。
- 创建前先原子写入 `creating_task`。网络中断、超时或响应无法确认时转为 `creation_uncertain`，重启后同样进入人工对账，绝不自动重试。
- 企微明确返回错误码时记为 `create_failed`；需要人工检查配置后处理，不会当作成功。
- 同一日期和内容指纹幂等；同一日期、群主与排序后的客户群列表也有独立投递指纹，防止换稿后重复建任务。
- 日志只记录状态、错误代码和散列后的任务标识，不记录 access token、Secret、API Key、群 ID 或完整晨报正文。
- JSON 状态与进程锁按单实例设计；该服务只能运行一个副本，禁止通过 `--scale` 或多主机共享同一状态目录。需要多实例时必须先迁移到支持条件写入的数据库锁。

## 必要配置

所有密钥只通过服务器环境变量提供，不要写入仓库或镜像。

| 环境变量 | 默认值 | 说明 |
|---|---:|---|
| `SERVICE_ENABLED` | `false` | 服务操作总开关；设为 `true` 后管理接口才可执行业务操作 |
| `ADMIN_TOKEN` | 无 | 管理界面 HTTP Basic 密码，必须使用高强度随机值 |
| `OPENAI_API_KEY` | 无 | OpenAI Responses API Key |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Responses API 基础地址 |
| `OPENAI_MODEL` | `gpt-5.5` | 支持 Responses 与网页搜索的模型 |
| `OPENAI_WEB_SEARCH_TOOL` | `web_search` | 兼容旧接口时可显式改为 `web_search_preview` |
| `OPENAI_TIMEOUT_MS` | `120000` | 生成请求超时，范围 1—300 秒 |
| `OPENAI_MAX_OUTPUT_TOKENS` | `6000` | 结构化正文最大输出；避免 JSON 被截断 |
| `OPENAI_GENERATION_ATTEMPTS` | `2` | 单次调度遇到空正文、非法 JSON 或瞬时错误时的内部尝试次数 |
| `SOURCE_FETCH_TIMEOUT_MS` | `12000` | 白名单来源列表页和文章页的单次读取超时 |
| `TENCENT_FEED_PAGES` | `2` | 腾讯体育与 NBA 频道各读取页数，范围 1—3 |
| `TENCENT_TRUSTED_SOURCES` | 内置权威名单 | 腾讯文章流允许进入候选的精确来源名；个人创作者默认全部拒绝 |
| `SOURCE_DOMAIN_ALLOWLIST` | 无 | 逗号分隔的来源域名；根域名同时允许其子域，`*.example.com` 只允许子域 |
| `REQUIRE_SEARCH_PROVENANCE` | `true` | 要求每个引用 URL 出现在本次网页搜索返回的来源集合中；生产环境不要关闭 |
| `BRIEF_LOOKBACK_HOURS` | `72` | 优先24小时，不足3条时最多回看72小时 |
| `NEWS_DEDUP_DAYS` | `7` | 跨日新闻事件去重窗口 |
| `WECOM_CORP_ID` | 无 | 企业 ID |
| `WECOM_CONTACT_SECRET` | 无 | 客户联系 Secret |
| `WECOM_AGENT_ID` | 无 | 自建应用 AgentId，用于失败告警 |
| `WECOM_API_BASE` | `https://qyapi.weixin.qq.com` | 企微 API 基础地址 |
| `WECOM_TIMEOUT_MS` | `10000` | 单次企微 API 请求超时，范围 1—60 秒 |
| `WECOM_SENDER_USERID` | 无 | 定时任务使用的明确群主 UserID；管理接口仍要求请求显式提交 sender |
| `WECOM_CHAT_ID_LIST` | 无 | 定时任务使用的明确客户群 ID，逗号分隔；不会自动替换成全企业群 |
| `DATA_DIR` | 当前目录下 `data` | JSON 状态目录；容器内建议 `/app/data` |
| `STATE_FILE` | `$DATA_DIR/state.json` | 可选的状态文件完整路径 |
| `PORT` | `3400` | 本地回环监听端口 |
| `PUBLIC_BASE_URL` | 无 | 预留的受控反向代理基础地址；当前管理页和 API 使用相对路径，不依赖此项 |

推荐先配置严格白名单，例如官方联盟、协会和权威媒体的域名。不要为了让内容通过审核而加入聚合站、采集站或无法追溯发布日期的域名。

## 调度配置

调度固定按 `Asia/Shanghai` 计算，不读取服务器本地时区：

| 环境变量 | 默认值 | 说明 |
|---|---:|---|
| `SCHEDULER_ENABLED` | `false` | 每日调度开关 |
| `SCHEDULE_HOUR` | `9` | 生成小时 |
| `SCHEDULE_MINUTE` | `0` | 生成分钟 |
| `AUTO_CREATE_ENABLED` | `false` | 自动创建企微一键确认任务；建议保持关闭，先由后台复核 |
| `AUTO_REMIND_ENABLED` | `false` | 自动提醒群主；仅对仍为未发送状态的当日任务提醒一次 |
| `REMINDER_HOUR` | `10` | 提醒小时 |
| `REMINDER_MINUTE` | `0` | 提醒分钟 |
| `REMINDER_MIN_INTERVAL_MINUTES` | `60` | 同一任务两次人工提醒的最小间隔，范围 1—1440 分钟 |

服务先从新华网、中国新闻网、中国篮协、腾讯新闻、FIBA 和 NBA 发现候选文章，逐页确认可访问性与发布时间，再把已核验候选交给模型改写；模型返回的 URL 必须与候选 URL 完全匹配。腾讯新闻使用其公开 PC 文章流发现 ID，最终只接受 `news.qq.com/rain/a/...` 正式页，并要求文章页作者与文章流来源一致。腾讯频道中的“体育领域创作者”等个人号不在可信名单时直接丢弃。启用腾讯源需要在 `SOURCE_DOMAIN_ALLOWLIST` 中精确加入 `news.qq.com`，不要加入宽泛的 `qq.com`。

单次调度内的空正文、非法 JSON 和瞬时错误默认内部尝试两次；每日调度仍最多退避三轮。生成出 `review_required` 后会保留通过单条校验的候选，供下一轮补齐国内/国外条目。创建任务发生任何不确定结果时都不自动重试。

## 启动与操作

```bash
npm start
```

浏览器通过服务器本机反向代理访问 `/admin`。操作顺序：

1. 生成预览并查看 `validation_errors`。
2. 读取指定群主名下的客户群，人工确认群 ID。
3. 在管理页明确填写群主和群 ID，创建群发任务。
4. 群主在企微客户端确认发送；必要时先查询状态，再使用提醒。
5. 如果创建状态为 `creation_uncertain`，先调用 `/admin/api/tasks/recent` 查询近期开单，再用 `/admin/api/tasks/reconcile` 提交人工确认的 `msgid`，不得重新创建。

主要 JSON 接口：

- `GET /admin/api/status`
- `POST /admin/api/preview`
- `GET|POST /admin/api/groups`
- `GET /admin/api/groups/:chat_id`
- `POST /admin/api/tasks/create`
- `POST /admin/api/tasks/remind`
- `POST /admin/api/tasks/cancel`
- `POST /admin/api/tasks/revalidate`
- `GET /admin/api/tasks/result?msgid=...&sender=...`
- `GET /admin/api/tasks/recent?sender=...`
- `POST /admin/api/tasks/reconcile`
- `POST /admin/api/tasks/reset-rejected`

`tasks/create` 必须提交：

```json
{
  "date": "2026-08-25",
  "fingerprint": "后台预览返回的指纹",
  "sender": "明确的群主UserID",
  "chat_id_list": ["明确的客户群chat_id"]
}
```

网络结果不确定的 `creation_uncertain` 只能对账，绝不能重置。只有企微明确返回错误码形成的 `create_failed`，在管理员修复可信 IP、权限或参数并重新核验内容后，才可通过 `tasks/reset-rejected` 显式恢复为 `ready`，随后再次人工创建。

## Docker

```bash
docker build -t sx-wecom-group-briefing .
docker run --rm --network host --env-file /secure/path/briefing.env \
  -v /opt/sxf-platform/data/wecom-group-briefing:/app/data \
  sx-wecom-group-briefing
```

因为进程按安全要求只监听回环地址，容器需要 Linux `--network host`。不要把密钥文件复制到源码目录或镜像中。
