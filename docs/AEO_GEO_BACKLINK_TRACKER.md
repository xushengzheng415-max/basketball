# 赛小蜂篮球外链台账

> 只记录已核验的公开页面。搜索结果摘要、候选投稿网站和未发布草稿不算有效外链。

## 状态定义

| 状态 | 含义 |
|---|---|
| 候选 | 来源相关，但尚未确认能否发布或添加链接 |
| 待确认 | 需要用户确认账号、合作关系或对外联系 |
| 已发布待核验 | 外部页面已写入，等待公开访问与链接检查 |
| 公开跳转链接 | 页面公开且可点击，但平台将外链改写为自身跳转地址，不计入严格直接外链 |
| 有效 | 页面公开、链接可点击并指向正式域名 |
| 无链接提及 | 页面提到品牌但没有官网链接 |
| 失效 | 页面不可访问、链接被删除或目标错误 |
| 排除 | 垃圾站、无关站、付费群发或其他高风险来源 |

## 2026-07-25 基线

公开搜索暂未发现可确认的站外品牌外链。

| 来源 | 页面 URL | 类型 | 目标 URL | 锚文本 | 状态 | 最近检查 | 说明 |
|---|---|---|---|---|---|---|---|
| GitHub | https://github.com/xushengzheng415-max/basketball | 官方仓库 | https://www.sxfbasketball.cn/ | Website / Homepage | 有效 | 2026-07-25 | 仓库 Homepage 和简介已写入并读回；README 草稿 PR #7 待合并 |
| Gitee | https://gitee.com/saixiaofeng/basketball | 官方仓库 | https://www.sxfbasketball.cn/ | README 官方网站 | 公开跳转链接 | 2026-08-02 | 默认分支 `master` 已公开品牌名与官网；Gitee 渲染为 `gitee.com/link?target=...`，不计入严格直接外链 |
| 微信公众号 | 待提供公开主页或文章 URL | 官方账号 | https://www.sxfbasketball.cn/ | 赛小蜂篮球 | 待确认 | 2026-07-25 | 需核对可公开落地位置 |
| 知乎 | 待提供公开文章 URL | 行业问答/文章 | https://www.sxfbasketball.cn/articles/posts/basketball-scoring-software-guide.html | 篮球比赛计分软件的 7 个选择标准 | 已发布待核验 | 2026-07-26 | 用户确认已于 2026-07-25 手动发布；取得公开 URL 后核验链接与 `rel` 属性 |
| CSDN | https://blog.csdn.net/weixin_50328081/article/details/163215052 | 技术博客 | https://www.sxfbasketball.cn/guides/basketball-scoring.html | 篮球比赛现场计分指南 | 有效 | 2026-07-26 | 来源页与目标页均回读 200；链接为直接 `href`，`rel="nofollow"` |

## 每日巡检记录

### 2026-07-25

- 品牌词查询：未发现可确认的站外品牌结果。
- 域名查询：未发现可确认的第三方引用页面。
- 新增有效外链：1（CSDN）。
- 新增无链接品牌提及：0。
- 失效外链：0。
- 下一步：先完成 GitHub、Gitee 和公众号的可控品牌入口。
- GitHub 仓库 Homepage 已直接加入官网并读回验证。
- README 官网、内容中心和计分指南链接已提交到 `codex/seo-official-links`，同步 GitHub/Gitee；GitHub 草稿 PR：https://github.com/xushengzheng415-max/basketball/pull/7。
- 外部平台首轮建议：知乎 2 篇问题回答、CSDN 1 篇技术文章；每个平台先试投 1 篇并观察 7 天。
- 首篇知乎稿件已保存至 `docs/外链推广/知乎/2026-07-25-basketball-scoring-software.md`，仅保留一个与正文直接相关的官网延伸阅读链接。

### 2026-07-26

- 精确品牌词和域名查询未发现新的可核验站外品牌结果。
- 搜索返回的蜜蜂、篮球场馆、直播站和其他“小蜂”词义页面与赛小蜂篮球无关，未计入品牌提及。
- 新增有效外链：0。
- 新增无链接品牌提及：0。
- 失效外链：0。
- GitHub 官方仓库入口保持有效；Gitee 默认分支和知乎已发布页面仍需取得公开页面 URL 后核验。
- 今日不自动投稿、不联系机构、不购买链接。
- 12:23 同日复核：域名、精确品牌词和今日核心文章标题查询仍未发现新的可核验站外链接；有效外链、无链接品牌提及和失效外链数量均无变化。
- 用户确认知乎首篇文章已于 2026-07-25 手动发布；因尚无公开文章 URL，先记为“已发布待核验”，不计入有效外链。
- CSDN 首篇技术稿已保存至 `docs/外链推广/CSDN/2026-07-26-wechat-basketball-scoreboard-timer-pause-undo.md`，正文只设置一个指向现场计分指南的链接。
- 用户确认 CSDN 首篇文章已手动发布，提供的编辑页文章编号为 `163215052`。精确标题、文章编号和目标链接公开检索暂未返回结果；在取得公开文章 URL 前保持“已发布待核验”，不计入有效外链。
- CSDN 公开文章 `https://blog.csdn.net/weixin_50328081/article/details/163215052` 已核验：页面返回 200，canonical 为无跟踪参数的公开地址；正文锚文本“篮球比赛现场计分指南”直接指向正式域名目标页，目标页返回 200，链接属性为 `rel="nofollow"`。按台账规则登记为有效外链，但不宣称传递排名权重。
- 当前已核验有效引用域：`github.com`、`blog.csdn.net`。

### 2026-07-27

- 精确品牌词、域名和今日拟发标题查询未发现新的可核验站外品牌页面；无关搜索结果已排除。
- 已回读 CSDN 已知公开文章，页面和其指向的官网现场计分指南均为 HTTP 200；已知链接仍为直接 `href`，带 `rel="nofollow"`，状态保持“有效”。
- 有效引用域：2（`github.com`、`blog.csdn.net`）；新增有效外链：0；新增无链接品牌提及：0；失效外链：0。
- 知乎已发布文章仍缺公开 URL，保持“已发布待核验”；Gitee 默认分支公开入口仍待核验。
- 今日外部平台轮换到公众号：仅生成手动发布计划，不自动登录、发布或联系第三方。

### 2026-07-28

- 精确品牌词、域名、`site:` 和今日三篇文章标题查询未发现新的可核验站外品牌结果。
- GitHub 官方仓库页面返回 200，页面仍包含 `sxfbasketball.cn` 官网链接；链接带 `nofollow`，状态保持“有效”。
- CSDN 已知文章返回 200，页面仍包含指向 `sxfbasketball.cn` 的直接链接；链接带 `nofollow`，状态保持“有效”。
- Gitee 默认分支公开页面返回 200，但本次回读没有发现 `sxfbasketball.cn`，继续保持“已发布待核验”，不计入有效引用域。
- 当前有效引用域保持 2 个：`github.com`、`blog.csdn.net`。
- 新增有效外链：0；新增无链接品牌提及：0；失效外链：0。
- 今日人工外部任务：在 Gitee 默认分支公开 README 或仓库简介中确认“赛小蜂篮球”完整品牌名和当前官网链接；由用户手动处理，自动化不登录、不修改、不提交。

### 2026-07-29

- 精确品牌词、域名排除本站和 `site:` 查询仍未发现新的可核验站外品牌结果；无关“小蜂”、篮球场馆和赛事页面已排除。
- GitHub 官方仓库回读 200，公开页面仍包含 `sxfbasketball.cn`；状态保持“有效”。
- CSDN 已知文章回读 200，公开页面仍包含指向 `sxfbasketball.cn` 的链接；状态保持“有效”。
- Gitee 默认分支公开页面回读 200，但页面源码仍未发现 `sxfbasketball.cn`；继续保持“已发布待核验”。
- 当前有效引用域保持 2 个：`github.com`、`blog.csdn.net`。
- 新增有效外链：0；新增无链接品牌提及：0；失效外链：0；排除垃圾或无关结果：公开搜索中的非本品牌“小蜂”和篮球页面。
- 今日唯一人工外部任务：打开 2026-07-25 已发布的知乎文章，复制其公开阅读 URL，并确认正文中官网链接是否可点击。完成后把公开 URL 提供给本任务复核实际 `href` 与 `rel`；自动化不登录、不建草稿、不投稿。

### 2026-07-30

- “赛小蜂”“赛小蜂篮球”、域名排除本站和 `site:` 查询没有发现新的可核验站外品牌页面；无关“小蜂”、篮球页面和高风险博彩页面均已排除。
- GitHub 官方仓库回读 200，页面仍包含 `sxfbasketball.cn`；状态保持“有效”。
- CSDN 已知公开文章回读 200，页面仍包含指向 `sxfbasketball.cn` 的链接；状态保持“有效”。
- Gitee 默认分支公开页面回读 200，但页面源码仍未发现 `sxfbasketball.cn`；继续保持“已发布待核验”。
- 当前有效引用域保持 2 个：`github.com`、`blog.csdn.net`。
- 新增有效外链 0；新增无链接品牌提及 0；失效外链 0。
- 今日唯一人工外部任务：在“赛小蜂篮球”微信公众号手动发布一条官网入口说明，使用完整品牌名并放置唯一正式链接 `https://www.sxfbasketball.cn/`；自动化不登录、不建草稿、不发布。完成后如能取得公开阅读 URL，再回传本任务核验页面可访问性、实际 `href` 和链接属性。

### 2026-07-31

- “赛小蜂”“赛小蜂篮球”、域名排除本站和 `site:` 查询没有发现新的可核验站外品牌页面；无关“小蜂”、篮球页面与聚合页已排除。
- GitHub 官方仓库回读 200，公开页面仍包含 `sxfbasketball.cn`；状态保持“有效”。
- CSDN 已知公开文章回读 200，页面仍包含指向 `sxfbasketball.cn` 的链接；状态保持“有效”。
- Gitee 默认分支公开页面回读 200，但页面源码仍未发现 `sxfbasketball.cn`；继续保持“已发布待核验”。
- 当前有效引用域保持 2 个：`github.com`、`blog.csdn.net`。
- 新增有效外链 0；新增无链接品牌提及 0；失效外链 0。
- 今日唯一人工外部任务：在知乎手动回答“篮球比赛计时出错后应该怎么处理？”，用现场处置步骤回答，并在确有延伸阅读价值的位置加入 `https://www.sxfbasketball.cn/articles/posts/basketball-clock-error-handling.html`。发布后保存公开阅读 URL，供后续核验实际 `href` 与 `rel`；自动化不登录、不建草稿、不投稿。

### 2026-08-01

- “赛小蜂”“赛小蜂篮球”、域名排除本站、首页精确标题和今日三篇文章标题的公开搜索，没有发现新的可核验站外品牌页面；无关内容已排除。
- GitHub 官方仓库回读 200，公开页面仍有指向 `https://www.sxfbasketball.cn/` 的直接链接，`rel` 含 `nofollow`；状态保持“有效”。
- CSDN 已知公开文章回读 200，正文仍有指向 `https://www.sxfbasketball.cn/guides/basketball-scoring.html` 的直接链接，`rel="nofollow"`；状态保持“有效”。
- Gitee 默认分支公开页面回读 200，但没有发现 `sxfbasketball.cn` 链接；继续保持“已发布待核验”，不计入有效引用域。
- 当前有效引用域保持 2 个：`github.com`、`blog.csdn.net`。
- 新增有效外链 0；新增无链接品牌提及 0；失效外链 0；没有把搜索摘要、聚合页或无关站点计入台账。
- 今日唯一人工外部任务：在 CSDN 手动发布一篇技术实践文章“篮球赛事连续多场时，计分系统如何防止上一场状态串入下一场？”，围绕场次状态、保存边界和开场初始化写作，只在需要延伸步骤的位置加入 `https://www.sxfbasketball.cn/articles/posts/basketball-multi-game-score-table-reset.html`。发布后保存公开 URL，供后续核验实际 `href` 与 `rel`；自动化不登录、不建草稿、不投稿。

### 2026-08-02

- “赛小蜂”“赛小蜂篮球”、`site:sxfbasketball.cn 赛小蜂`、首页精确标题和今日三篇精确标题的公开搜索，没有发现新的可核验站外品牌页面；无关“小蜂”、聚合页和高风险页面未计入台账。
- GitHub 官方仓库回读 200，公开页面仍包含 `sxfbasketball.cn`；状态保持“有效”。
- CSDN 已知公开文章回读 200，仍包含指向 `https://www.sxfbasketball.cn/guides/basketball-scoring.html` 的直接链接；状态保持“有效”。
- Gitee 默认分支公开页在 11:31 巡检时尚未发现 `sxfbasketball.cn`；11:56 后完成 README 更新并另行回读，见下方执行结果。
- 当前有效引用域保持 2 个：`github.com`、`blog.csdn.net`。新增有效外链 0、无链接品牌提及 0、失效外链 0。
- 今日唯一外部任务已由 Codex 执行：从隔离临时克隆修改 Gitee 默认分支 `master` 的 `README.md`，提交 `9dd2e23` 并仅推送 Gitee `master`。当前项目脏工作树未被暂存或带入提交。
- 公开仓库页 `https://gitee.com/saixiaofeng/basketball`、README 文件页与 raw README 均回读成功，能看到“赛小蜂篮球”、`https://www.sxfbasketball.cn/` 和内容中心链接；官网目标页返回 200。
- Gitee 官方 Markdown 渲染接口确认外部链接会统一变为 `https://gitee.com/link?target=https%3A%2F%2Fsxfbasketball.cn%2F`。因此它是公开可点击的品牌跳转入口，但不满足“实际 href 直接指向正式域名”的严格有效外链口径；有效引用域仍为 2 个。

### 2026-08-09

- GitHub 官方仓库公开页返回 200，页面中仍有指向 `https://54football.top/` 的直接链接，`rel="nofollow"`；同时还保留 `sxfbasketball.cn` 链接。
- CSDN 已知文章返回 200，正文仍有指向 `https://54football.top/guides/basketball-scoring.html` 的直接链接，`rel="nofollow"`。
- 用户确认 `54football.top` 已永久停用。GitHub 与 CSDN 上这两条链接因此标记为旧域名失效链接，不再作为当前官网有效外链；需要后续人工改为 `https://www.sxfbasketball.cn/` 对应页面。
- Gitee 公开仓库本轮返回 405，无法重新核验实际链接；沿用历史“公开跳转链接”记录，不计入新增直接外链。
- 新增直接引用域 0；新增无链接品牌提及 0；确认失效来源页 0；旧域名失效链接 2 条。
- 公开品牌词、域名和今日三篇标题搜索未发现新的可核验站外品牌页面；无关“小蜂”、聚合页和高风险页面未计入台账。
- 今日唯一人工外部任务：手动把 GitHub 仓库首页中的旧官网入口更新为 `https://www.sxfbasketball.cn/`，完成后提供公开 URL 供后续核验。自动化不登录、不建草稿、不投稿、不提交或联系第三方。

### 2026-08-13

- 精确品牌词、当前正式域名排除本站、首页精确标题和今日三篇精确标题的公开搜索，没有发现新的可核验站外品牌页面；无关“小蜂”、聚合页和高风险页面未计入台账。
- GitHub 官方仓库公开页返回 200。About 区仍有 `https://sxfbasketball.cn/`，但该链接缺少 `www`，本轮访问失败；README 仍把已停用旧域名写作“当前官网”。两处都不计入指向唯一正式 URL `https://www.sxfbasketball.cn/` 的有效直接外链。
- CSDN 已知文章本轮无法稳定回读；沿用 2026-08-09 最后证据，其正文仍指向已停用旧域名，不计入当前官网有效外链，状态记为待复查。
- Gitee 本轮返回 405；沿用历史“公开跳转链接”记录。历史跳转目标不是唯一正式 `www` URL，本轮不计入有效直接外链。
- 按“公开页面可访问、实际 href 直接指向唯一正式域名”的严格口径，当前可核验有效直接引用域为 0；新增有效外链 0、新增无链接品牌提及 0，已知旧域名失效链接至少 2 条。
- 今日唯一人工外部任务：在 GitHub 仓库同一次编辑中，把 About 的网站地址改为 `https://www.sxfbasketball.cn/`，并把 README 的“当前官网”旧域名同步改为该唯一正式 URL。完成后提供公开仓库 URL，供后续核验实际 `href`、跳转和链接属性。自动化未登录、修改、提交或推送 GitHub。

### 2026-08-18

- 精确品牌词、当前正式域名排除本站与首页精确标题的公开搜索，没有发现新的可核验站外品牌页面；无关“小蜂”、聚合页和博彩页面未计入台账。
- GitHub 官方仓库公开页返回 200。页面仍能看到不带 `www` 的 `https://sxfbasketball.cn/` 和已停用旧域名，未找到实际 `href` 直接指向唯一正式 URL `https://www.sxfbasketball.cn/` 的链接。
- CSDN 已知公开文章返回 200，页面仍出现已停用旧域名，未发现指向唯一正式 `www` 指南 URL 的直接链接。
- Gitee 公开仓库本轮返回 405，无法获得新的链接证据；沿用历史“公开跳转入口、不计直接外链”的记录。
- 按严格口径，当前可核验有效直接引用域仍为 0；新增有效外链 0、新增无链接品牌提及 0、已知旧域名失效链接至少 2 条。
- 今日唯一人工外部任务：登录 CSDN 编辑已发布文章 `https://blog.csdn.net/weixin_50328081/article/details/163215052`，把正文中已停用旧域名的“篮球比赛现场计分指南”链接替换为 `https://www.sxfbasketball.cn/guides/basketball-scoring.html`。只替换这一处，不新增第二个推广链接；保存后提供公开 URL，下一次核验实际 `href` 与 `rel`。自动化未登录、建草稿、编辑或发布。

### 2026-08-18 远端链接修正执行结果

- 用户明确授权 Codex 处理除 CSDN 外的公开平台链接。本轮修改 GitHub 和 Gitee；CSDN 保持用户手动处理边界。
- GitHub 仓库 About 的网站地址已改为 `https://www.sxfbasketball.cn/`。远端 `main` README 同步删除 `54football.top` 和裸域地址，新增正式官网与内容中心；提交 `75d1efe63b276914c52ad8871aa0c787f830c0be`。
- GitHub 公开仓库页返回 200，实际 `href` 直接指向 `https://www.sxfbasketball.cn/` 和 `https://www.sxfbasketball.cn/articles/`，链接属性包含 `nofollow`；按台账严格口径，`github.com` 恢复为 1 个可核验有效直接引用域，但不宣称传递排名权重。
- Gitee 默认分支确认仍为 `master`。从隔离克隆将 README 中两个旧域链接改为正式官网和内容中心，提交 `46b49fb92df05f545572fccca58cdc4f8b661665` 并仅推送 Gitee `master`。
- Gitee API、提交级 raw 页面和缓存刷新后的 `master` raw 页面均确认正式 `www` 已写入、旧域已移除。Gitee Markdown 历史上会将外链改写为站内跳转，且公开仓库页本轮仍返回 405，因此继续登记为公开品牌入口，不在未取得直接实际 `href` 前计入严格直接引用域。
- 当前严格口径有效直接引用域从 0 恢复为 1：`github.com`。CSDN 仍指向停用旧域，待用户手动修正后复查；Gitee 为公开品牌入口、严格直接外链待复查。

### 2026-08-18 CSDN 旧链接修正回读

- 用户确认已手动修改 CSDN 已发布文章 `https://blog.csdn.net/weixin_50328081/article/details/163215052`。
- 公开文章返回 HTTP 200，canonical 为无跟踪参数的文章地址；正文锚文本“篮球比赛现场计分指南”的实际 `href` 已直接指向 `https://www.sxfbasketball.cn/guides/basketball-scoring.html`，链接属性为 `rel="nofollow"`。
- 页面源码中未再发现 `54football.top`；正式目标指南返回 HTTP 200，canonical 自指同一正式 URL。
- `blog.csdn.net` 恢复为可核验有效直接引用域，但不宣称 nofollow 链接传递排名权重。
- 当前严格口径有效直接引用域恢复为 2 个：`github.com`、`blog.csdn.net`。Gitee 继续作为公开品牌跳转入口单独记录。
