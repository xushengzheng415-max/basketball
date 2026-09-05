# PC赛事报名生成、服务号绑定与通知联动规则

> 适用产品：赛小蜂篮球、赛小蜂足球及后续同类赛事产品  
> 文档日期：2026-08-22  
> 实施原则：复用报名业务内核，分离运动项目配置；不共用密钥、OpenID、模板ID或云环境。

## 1. 产品目标

PC为赛事主办方工作台，负责创建赛事、开启报名、生成报名码、同步报名球队和审核资格。

小程序是球队领队的操作端，负责选择已有球队、创建新球队、确认参赛、查看审核结果和执行后续赛事任务。

服务号是通知和回流渠道，用于审核结果、赛程变更、名单截止和比赛任务提醒。

~~~text
PC创建赛事
→ PC开启报名
→ 云端创建赛事邀请
→ 生成小程序报名码/分享卡
→ 领队扫码选择球队
→ 关注服务号并授权小程序通知
→ 确认参赛
→ 主办方收到报名审核任务
→ PC审核通过/驳回
→ 小程序任务+订阅消息+服务号通知
~~~

## 2. 系统边界

| 系统 | 主要职责 | 不应承担 |
|---|---|---|
| PC赛事中心 | 赛事源数据、报名开关、报名码、球队列表、资格审核 | 代替领队绑定微信身份 |
| 小程序 | 球队选择/创建、确认参赛、资料补全、任务执行 | 作为主办方后台 |
| 服务号 | 关注绑定、通知、点击回到小程序 | 作为账号或报名数据真相源 |
| 云端业务服务 | 权限、幂等、状态机、任务、通知发件箱、审计 | 依赖前端本地存储判断业务结果 |

## 3. PC生成报名码

### 3.1 前置条件

- PC用户已通过微信登录并建立服务端会话。
- 当前用户是赛事所属机构的 `owner` 或拥有赛事管理权限。
- 赛事已保存名称、报名状态、竞赛组别和基础规则。
- 报名开关为开启状态。

### 3.2 服务端操作顺序

1. 校验PC会话、机构成员关系和赛事归属。
2. 将PC赛事数据幂等同步至云端赛事集合。
3. 查找当前赛事的有效邀请；已存在时复用，不重复创建。
4. 无有效邀请时生成不可猜测的 `inviteKey`，创建 `active` 邀请记录。
5. 调用当前运动项目的小程序码生成服务。
6. 上传小程序码到当前运动项目的云存储，返回 `fileID` 和可访问URL。
7. 记录审计日志，包含赛事、机构、邀请和代码版本，不记录密钥。

### 3.3 小程序码规则

| 字段 | 规则 |
|---|---|
| `page` | 运动项目自己的报名页，篮球当前为 `pages/tournament-register/index` |
| `scene` | 只携带短邀请标识，当前格式为 `i=<inviteKey>` |
| `env_version` | 体验阶段使用 `trial`，正式版发布后使用 `release` |
| `check_path` | 发布前确认页面已在目标版本中存在；不依赖开发版长期流转 |
| 缓存键 | `sport + appid + eventId + inviteKey + page + envVersion` 参与哈希 |
| 存储路径 | 包含运动项目和赛事ID，防止篮球/足球互相覆盖 |

### 3.4 PC页面输出

PC弹窗展示：

- 赛事名称和正式报名码。
- “进入小程序 → 关注服务号 → 查看球队与任务”三步指引。
- 下载报名码、刷新报名码和复制报名说明。
- 不向用户暴露 `inviteKey`、OpenID、密钥或内部集合名。

## 4. 链接与邀请边界

### 4.1 入口类型

| 入口 | 用途 | 权限边界 |
|---|---|---|
| 小程序码 | PC、报名海报和线下物料的主入口 | 只定位邀请，不直接授权 |
| 小程序分享卡 | 微信好友和群转发 | 打开后仍需微信登录和邀请校验 |
| H5引导链接 | 浏览器场景的说明与跳转 | H5不保存账号真相，不授予参赛权限 |
| 服务号消息卡 | 审核、赛程和任务回流 | 点击后进入指定小程序页并再次校验身份 |

### 4.2 邀请规则

- 同一赛事默认只有一条有效报名邀请。
- 点击“刷新报名码”默认复用同一邀请，不应让已发布物料立即失效。
- 只有“重置报名邀请”才撤销旧 `inviteKey`；该操作属于高影响操作，需二次确认并写审计日志。
- 赛事关闭报名后，旧码可打开赛事说明，但服务端拒绝新报名。
- 转发二维码或链接不代表转让球队管理权。

## 5. 小程序报名流程

### 5.1 打开邀请

1. 小程序解析 `scene` 或分享路径中的 `inviteKey`。
2. 调用 `getInvitation`，服务端校验邀请状态和赛事报名开关。
3. 展示赛事、主办方、赛制和报名状态。

### 5.2 选择球队

- 页面首先展示当前账号的已有球队卡片列表。
- 领队选中一支球队后解锁“确认参赛”。
- 没有合适球队时才进入“新建球队”；新建完成后必须带原 `eventId` 和 `inviteKey` 返回。
- 不允许为同一赛事重复提交同一支球队。

### 5.3 确认参赛

1. 确认小程序微信身份已建立。
2. 请求“报名审核结果”小程序订阅消息授权。
3. 按赛事配置引导关注服务号并完成小程序/服务号身份绑定。
4. 调用 `submitTeam`，服务端重新校验邀请、报名开关、重复报名和球队归属。
5. 写入球队报名快照，初始状态为 `pending`。
6. 为主办方创建 `registration_review` 任务，为领队创建 `registration_status` 状态任务。
7. 将通知写入发件箱并尝试推送。

## 6. 服务号关注与身份绑定

### 6.1 绑定状态机

~~~text
unbound
→ waiting（生成服务号参数二维码）
→ followed（收到 subscribe/SCAN 回调）
→ subscribed（miniOpenid 与 officialOpenid 建立绑定）
→ unsubscribed（收到取关回调）
~~~

### 6.2 关注门禁

1. 小程序根据 `eventId + inviteKey + miniOpenid` 创建临时关注门禁。
2. 服务端生成不可猜测的 `scene`，通过服务号中转服务生成带参二维码。
3. 服务号回调必须验证签名，只处理 `subscribe`、`SCAN` 和 `unsubscribe`。
4. 收到关注/扫码事件后，将 `miniOpenid` 与 `officialOpenid` 写入服务号绑定表。
5. 绑定成功后自动补发 `waiting_follow_bind` 状态的通知。
6. 用户取消关注后保留历史映射，但将 `subscribed` 设为 `false`，禁止继续发送。

### 6.3 身份统一

- 小程序 OpenID与服务号 OpenID不相同，不得直接当作同一ID。
- 当小程序、服务号和网站应用同属一个微信开放平台账号时，优先使用 UnionID 归并平台账号。
- 无法直接取得 UnionID 时，使用一次性绑定 `scene`，不依赖手机号猜测身份。

## 7. PC报名同步与资格审核

### 7.1 入驻进度同步

- PC进入入驻进度时自动读取当前赛事的云端报名球队。
- PC页面提供“同步报名数据”手动补偿入口。
- 云端报名记录是真相源；PC本地缓存只用于展示和断线回显。
- 按 `teamId` 去重，PC人工异常补录使用独立来源标记，不覆盖云端记录。

### 7.2 报名状态映射

| 云端状态 | PC显示 | 后续操作 |
|---|---|---|
| `pending` | 已认领 / 待审核 | 审核资格 |
| `approved` | 已认领 / 已通过 | 查看审核、进入分组/抽签 |
| `rejected` | 已认领 / 已驳回 | 查看驳回原因、等待重新提交 |
| `withdrawn` | 已撤回 | 默认不进入有效报名列表 |

### 7.3 资格审核

1. PC服务端校验会话、机构、赛事和球队归属。
2. 审核弹窗显示球队、领队、联系方式、组别、球员数和当前状态。
3. 通过可选填意见；驳回必须填写需要补充的资料或原因。
4. 服务端更新球队报名状态，完成主办方 `registration_review` 任务。
5. 为领队创建/更新 `registration_status` 任务。
6. 将小程序订阅通知与服务号通知分别写入发送记录。
7. 已审核球队的PC按钮改为“查看审核”，不重复执行审核。

## 8. 通知架构

### 8.1 渠道优先级

| 优先级 | 渠道 | 用途 |
|---|---|---|
| 1 | 小程序任务中心 | 业务状态真相，不依赖微信推送是否响铃 |
| 2 | 小程序订阅消息 | 审核结果的主推送渠道，需用户主动授权 |
| 3 | 服务号通知 | 第二推送和长期回流渠道，需已关注并完成绑定 |
| 4 | 微信分享卡/人工联系 | 未授权或通知失败时的补偿 |

不接入自动短信。

### 8.2 通知状态

~~~text
queued
→ waiting_follow_bind
→ delivered

queued
→ failed
→ retrying
→ delivered / permanently_failed
~~~

每个渠道单独记录：

- 业务事件ID、接收人平台账号、渠道和模板。
- 队列时间、尝试时间、送达时间和重试次数。
- 微信错误码、失败原因和下次重试时间。
- 点击目标页面及对应赛事/球队/任务。

### 8.3 通知验收口径

- “审核成功”指业务状态写入成功，不等于通知送达。
- “通知成功”需要至少一个系统推送渠道返回成功，并写入 `delivered`。
- “手机响铃”受微信通知设置、免打扰、系统音量和用户授权影响，不能作为唯一服务端验收证据。
- PC审核完成后应显示小程序订阅消息、服务号和任务中心的分渠道状态，不只显示“已审核”。

## 9. 幂等、唯一约束与审计

| 对象 | 建议唯一键 |
|---|---|
| 赛事 | `sport + organizationId + eventId` |
| 有效报名邀请 | `sport + eventId + status=active` |
| 球队报名 | `sport + eventId + sourceTeamId/ownerPlatformUserId` |
| 主办方审核任务 | `eventId + registration_review + teamId` |
| 领队状态任务 | `eventId + registration_status + teamId` |
| 服务号绑定 | `sport + miniOpenid` |
| 通知发件箱 | `businessEventId + recipientPlatformUserId + channel` |

必须记录的审计事件：

- 生成/重置报名邀请。
- 球队确认参赛、重新提交和撤回。
- 主办方通过/驳回报名。
- 服务号关注、扫码绑定和取关。
- 通知发送、失败、重试和补发。

审计日志禁止保存 AppSecret、access_token、完整手机号或可直接重放的会话凭证。

## 10. 通用概念数据模型

| 概念实体 | 篮球当前集合 | 职责 |
|---|---|---|
| tournament | `sx_tournaments` | 赛事主体与报名开关 |
| tournament_invite | `sx_tournament_invites` | 报名邀请和 `inviteKey` |
| tournament_team | `sx_tournament_teams` | 球队报名快照和审核状态 |
| tournament_task | `sx_tournament_tasks` | 主办方审核任务和领队状态任务 |
| service_follow_gate | `sx_service_follow_gates` | 小程序与服务号关注绑定门禁 |
| service_binding | `sx_service_account_bindings` | `miniOpenid ↔ officialOpenid` 绑定 |
| notification_outbox | `sx_tournament_notification_outbox` | 服务号通知发件箱 |
| notice_log | `sx_tournament_notice_logs` | 小程序订阅消息结果 |
| audit_log | `sx_audit_logs` | PC与云端高影响操作审计 |

足球可在独立CloudBase环境中使用同名概念集合，也可使用足球命名前缀；但不得跨运动项目环境直接读写数据。

## 11. 篮球与足球适配层

| 配置项 | 篮球 | 足球要求 |
|---|---|---|
| CloudBase环境 | `sxf-basketball-d9gp6yt0rd1f7be4d` | 使用足球独立环境 `cloud1-7g8ckb3c7815a011` |
| CLI入口 | `sxf-cloud basketball` | `sxf-cloud football` |
| 小程序AppID/AppSecret | 篮球自有配置 | 足球自有配置，不复制篮球凭据 |
| 报名页 | `pages/tournament-register/index` | 使用足球小程序自己的正式路由 |
| 报名码版本 | `trial/release` 可配置 | 使用同样发布阶段规则 |
| 服务号 | 篮球服务号 | 足球服务号或已审核的共享服务号方案 |
| 服务号回调 | 篮球回调函数/地址 | 足球单独回调地址、Token和加密配置 |
| 模板ID | 篮球小程序/服务号模板 | 必须在足球账号下重新申请，不复制篮球ID |
| 通知点击路径 | 篮球赛事/球队页 | 足球自己的赛事/球队/任务页 |
| 品牌文案与素材 | 篮球品牌 | 足球品牌、Logo和运动项目文案 |

### 11.1 建议的运动项目配置对象

~~~text
sportCode
miniProgramAppId
miniProgramAppSecret
miniProgramRegisterPage
miniProgramState
serviceAccountAppId
serviceAccountAppSecret
serviceCallbackUrl
serviceBridgeUrl
serviceBridgeKey
miniTemplateIds
serviceTemplateIds
cloudStoragePrefix
publicPcOrigin
~~~

业务函数只读配置对象，不应在报名逻辑内硬编码“篮球”或“足球”的 AppID、页面路径和模板ID。

## 12. 环境变量

篮球当前使用/计划使用的配置名称：

~~~text
SXF_BASKETBALL_APPID
SXF_BASKETBALL_APPSECRET
SXF_REGISTRATION_QR_ENV_VERSION
SXF_MINI_SUBSCRIBE_STATE
SXF_MINI_TEMPLATE_TOURNAMENT_REVIEW
SXF_SERVICE_ACCOUNT_APPID
SXF_SERVICE_ACCOUNT_APPSECRET
SXF_SERVICE_CALLBACK_TOKEN
SXF_SERVICE_BRIDGE_URL
SXF_SERVICE_BRIDGE_SEND_URL
SXF_SERVICE_BRIDGE_CUSTOMER_URL
SXF_SERVICE_BRIDGE_KEY
SXF_SERVICE_TEMPLATE_TOURNAMENT_REGISTRATION
SXF_SERVICE_TEMPLATE_TOURNAMENT_REVIEW_RESULT
SXF_SERVICE_TEMPLATE_TOURNAMENT_ANNOUNCEMENT
~~~

足球应采用自己的环境变量或统一配置对象，不得直接读取 `SXF_BASKETBALL_*`。

所有 AppSecret、Token和中转密钥只存放于对应云环境的安全配置中，不写入仓库、浏览器或小程序包。

## 13. 已知问题与迁移禁止项

- 篮球服务号“报名审核结果”最近发送失败，微信返回 `40037`；足球不得复制当前失效的服务号模板ID。
- 篮球本地 `sxCollaboration` 存在尚未完成、未检查、未部署的小程序订阅通知补偿代码；足球不得将该本地状态当成已验证实现。
- 不复制篮球 AppID、AppSecret、OpenID、CloudBase环境ID、模板ID或云存储路径。
- 不把PC本地存储中的赛事对象当作足球云端数据。
- 不在同一时段同时修改PC和小程序的同一场联调数据。

## 14. 足球复用实施顺序

1. 在足球仓库建立独立的运动项目配置对象。
2. 建立足球云端赛事、邀请、球队报名、任务、绑定和通知发件箱集合。
3. 实现PC会话、机构权限和赛事归属校验。
4. 实现幂等创建报名邀请和足球小程序码。
5. 实现足球小程序邀请页、已有球队选择和确认参赛。
6. 实现服务号关注门禁、回调签名验证和身份绑定。
7. 实现PC报名同步、资格审核和任务状态回写。
8. 申请足球小程序订阅模板和服务号模板，在足球环境单独配置。
9. 完成足球一条单数据流串行验收，再开放批量报名。

## 15. 验收清单

- [ ] PC未登录、跨机构和跨赛事生成报名码全部被拒绝。
- [ ] 同一赛事重复点击生成时复用有效邀请。
- [ ] `trial` 和 `release` 报名码分别进入正确小程序版本。
- [ ] 扫码、分享卡和H5引导最终进入同一条报名邀请。
- [ ] 已有球队可选择，新建球队后能返回原赛事。
- [ ] 重复球队、关闭报名和无效邀请被服务端拒绝。
- [ ] 服务号关注门禁可创建、轮询、绑定和处理取关。
- [ ] PC能同步小程序报名球队，不丢失PC人工异常补录。
- [ ] 资格通过/驳回写入云端，驳回原因可在领队端查看。
- [ ] 小程序任务、订阅消息和服务号通知分别记录送达状态。
- [ ] 无效模板ID、未关注、未授权和用户取消订阅时展示明确降级状态。
- [ ] 同一业务事件重试不会生成重复任务或重复通知。
- [ ] 服务端日志、审计和发件箱不包含密钥、Token或完整敏感身份信息。

## 16. 当前暂停边界

- 本文档已完成，但当前不恢复PC与小程序的交叉联调。
- 用户当前优先完成小程序内部赛事创建与页面联动。
- 恢复时先执行《2026-08-22 PC与小程序赛事联动测试记录》中的恢复检查清单，再按本文档串行验收。

