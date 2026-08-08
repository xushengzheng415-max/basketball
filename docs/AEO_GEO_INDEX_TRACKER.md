# 赛小蜂篮球 AEO / GEO 收录台账

> 用途：每天发布前刷新检查文章公网状态与搜索收录情况。
> 检查口径：页面可访问不等于已收录；Sitemap 已提交也不等于已收录。

## 状态定义

| 状态 | 判断标准 |
|---|---|
| 本地草稿 | 文件仅存在于工作区，尚未部署 |
| 已上线 | 正式 URL 返回正常页面，但尚未确认被搜索引擎收录 |
| 已发现 | 站长平台显示已发现或已抓取，暂未进入索引 |
| 已收录 | 搜索结果或站长平台 URL 检查明确显示已进入索引 |
| 未收录 | 页面已上线一段时间，站长平台明确提示未编入索引 |
| 待复查 | 当前无法获得可靠的平台级结果，需要下一次刷新 |

## 每日固定流程

1. 检查所有待发布文章是否已部署到正式域名，并记录 HTTP 状态、canonical 与页面标题。
2. 刷新 Sitemap，确认新 URL 已加入且 `lastmod` 与实际更新时间一致。
3. 在百度搜索资源平台、Google Search Console 和必应网站管理员工具中检查 URL 状态；未取得平台权限时，使用 `site:` 查询只能作为辅助信号。
4. 对“已上线但未收录”的页面检查：是否允许抓取、canonical 是否自指、是否存在首页或内容中心内链、内容是否与既有页面重复。
5. 记录当天结果。已收录页面仍应定期复核，不因一次命中永久标记为正常。
6. 新文章发布应与收录检查分开记录，禁止把“已生成”或“已上线”写成“已收录”。

## 2026-07-25 首次基线

检查时间：2026-07-25

辅助搜索：`site:sxfbasketball.cn/articles/ 赛小蜂篮球`、`site:sxfbasketball.cn/guides/ 赛小蜂篮球`、`site:sxfbasketball.cn "赛小蜂篮球"`
检查结果：公开搜索未返回结果。由于尚未接入搜索站长平台，本次只能记录为“待复查”，不能据此断言所有页面均未被任何搜索引擎收录。

| 页面 | 发布状态 | 收录状态 | 最近检查 | 下一步 |
|---|---|---|---|---|
| 官网首页 `/` | 已上线 | 待复查 | 2026-07-25 | 已在正式域名和 CloudBase 系统域名回读 200；接入站长平台 |
| 内容中心 `/articles/` | 已上线 | 待复查 | 2026-07-25 | 已在两个域名回读 200；等待抓取 |
| 篮球计分软件选型 | 已上线 | 待复查 | 2026-07-25 | 已部署；等待站长平台数据 |
| 篮球培训机构管理软件选型 | 已上线 | 待复查 | 2026-07-25 | 已部署；等待站长平台数据 |
| 青少年篮球赛事管理 | 已上线 | 待复查 | 2026-07-25 | 已部署；等待站长平台数据 |
| 篮球比赛技术统计 | 已上线 | 待复查 | 2026-07-25 | 已部署；进入收录观察周期 |
| 正计时与倒计时选择 | 已上线 | 待复查 | 2026-07-25 | 已部署；进入收录观察周期 |
| 培训机构班内对抗赛 | 已上线 | 待复查 | 2026-07-25 | 已部署；进入收录观察周期 |
| 5 个实用指南页面 | 已上线 | 待复查 | 2026-07-25 | 已部署；等待站长平台数据 |

## 未收录页面处理节奏

- 上线当天：确认可访问、内链、Sitemap 和结构化数据，不频繁改写正文。
- 上线后 3—7 天：若仍未发现，补充相关页面内链并在站长平台请求抓取。
- 上线后 7—14 天：检查搜索意图重复、内容薄弱、canonical 或抓取异常。
- 超过 14 天：基于站长平台原因决定重写、合并或保留；不得通过批量制造相似页面解决。

## 2026-07-26 巡检

检查时间：2026-07-26

公开搜索辅助检查：`site:sxfbasketball.cn 赛小蜂篮球`、`"sxfbasketball.cn" -site:sxfbasketball.cn`、`"赛小蜂篮球" -site:sxfbasketball.cn`。

检查结果：仍未获得搜索引擎或站长平台可核验的 URL 级收录结果。搜索返回的“小蜂”“篮球”等页面与本品牌无关，已排除。昨日上线页面当前仍标记为“待复查”，不据公开搜索空结果直接判定为“未收录”。

| 页面 | 发布状态 | 收录状态 | 最近检查 | 下一步 |
|---|---|---|---|---|
| 既有首页、内容中心、6 篇文章及 5 个指南 | 已上线 | 待复查 | 2026-07-26 | 保持页面稳定；上线满 3 天后复查发现情况 |
| 青少年篮球赛事参赛名单管理 | 已上线 | 待复查 | 2026-07-26 | 已部署并在正式域名回读；进入收录观察期 |
| 篮球比赛比分误操作纠错 | 已上线 | 待复查 | 2026-07-26 | 已部署并在正式域名回读；进入收录观察期 |
| 篮球试听课临时对抗赛 | 已上线 | 待复查 | 2026-07-26 | 已部署并在正式域名回读；进入收录观察期 |

### 2026-07-26 12:23 同日复核

- 正式域名首页、内容中心、Sitemap、robots、`llms.txt` 和今日 3 篇文章再次回读为 HTTP 200。
- 今日 3 篇文章的页面标题、URL 与自指 canonical 一致；站点校验仍为 9 篇文章、16 个 Sitemap URL。
- 公开搜索增加检查今日核心文章标题，未取得可核验的 URL 级收录证据；状态继续保持“待复查”，不误记为“未收录”。
- 今日内容批次已完成，本次不重复发文、不重复部署；下一次有效观察窗口从 2026-07-28 开始。

## 2026-07-27 巡检

检查时间：2026-07-27 11:31（北京时间）。

公开搜索辅助检查：`site:sxfbasketball.cn 赛小蜂篮球`、`"赛小蜂篮球" -site:sxfbasketball.cn`、`"sxfbasketball.cn" -site:sxfbasketball.cn`，以及今日拟发核心标题。搜索未返回可核验的本品牌 URL 级收录证据，结果中无关“小蜂”、篮球及泛赛事页面已排除。

| 页面 | 发布状态 | 收录状态 | 最近检查 | 下一步 |
|---|---|---|---|---|
| 既有首页、内容中心、9 篇文章及 5 个指南 | 已上线 | 待复查 | 2026-07-27 | 已回读 200；继续等待站长平台 URL 级证据 |
| 篮球赛事比赛日执行与场次交接清单 | 已上线 | 待复查 | 2026-07-27 | 已加入内容中心与 Sitemap，部署后正式域名回读 |
| 篮球比赛换人记录步骤 | 已上线 | 待复查 | 2026-07-27 | 已加入内容中心与 Sitemap，部署后正式域名回读 |
| 篮球训练赛赛后赛果核对场景 | 已上线 | 待复查 | 2026-07-27 | 已加入内容中心与 Sitemap，部署后正式域名回读 |

说明：HTTP 200、Sitemap 存在和公开搜索空结果均不等于收录或未收录；未接入站长平台 URL 检查前，全部页面继续保持“待复查”。

## 2026-07-28 巡检与品牌优先批次

检查时间：2026-07-28（北京时间）。

公开搜索辅助检查：

- `"赛小蜂"`
- `"赛小蜂篮球"`
- `site:sxfbasketball.cn "赛小蜂篮球"`
- `"sxfbasketball.cn" -site:sxfbasketball.cn`
- 今日三篇文章的精确标题

检查结果：公开搜索仍未返回可核验的赛小蜂篮球官网 URL。搜索结果中的昆虫、“小蜂”相关品牌、篮球总结和其他无关页面已排除。当前缺少百度搜索资源平台、Google Search Console 和必应网站管理员工具的 URL 级数据，因此不能取得展示、点击、查询词、平均位置或平台确认的收录状态。

今日品牌增强：

- 首页标题改为“赛小蜂篮球官网”，可见 H1 包含完整品牌名。
- 首页新增 `WebSite` 品牌结构化数据，名称为“赛小蜂篮球”，备用名称为“赛小蜂”。
- 首页 Organization 和 SoftwareApplication 数据、可见产品说明与当前开放能力对齐。
- 新增官方产品介绍、官网入口识别和一人计分场景三篇独立内容。
- 内容中心、Sitemap 和 llms.txt 已接入今日页面；Sitemap 共 22 个 URL。
- 已准备新域名迁移清单；新域名备案完成前不切换 canonical，不开放两个域名的可索引重复页面。

| 页面 | 发布状态 | 收录状态 | 最近检查 | 下一步 |
|---|---|---|---|---|
| 官网首页 `/` | 已上线 | 待复查 | 2026-07-28 | 已增强品牌信号并在两个生产域名回读；等待抓取与站长平台证据 |
| 内容中心、既有 12 篇文章及 5 个指南 | 已上线 | 待复查 | 2026-07-28 | 生产回读通过；保持路径与 canonical 稳定 |
| 赛小蜂篮球官方产品介绍 | 已上线 | 待复查 | 2026-07-28 | 已加入首页、内容中心、Sitemap 和 llms.txt |
| 赛小蜂篮球官网入口识别说明 | 已上线 | 待复查 | 2026-07-28 | 已加入首页、内容中心、Sitemap 和 llms.txt |
| 篮球比赛一人计分流程 | 已上线 | 待复查 | 2026-07-28 | 已加入首页、内容中心、Sitemap 和 llms.txt |

部署验证：

- `npm run site:validate` 通过：15 篇文章、22 个 Sitemap URL。
- 篮球 CloudBase 系统域名和 `https://sxfbasketball.cn/` 的首页、内容中心、Sitemap、robots.txt、llms.txt 与全部 15 篇文章均回读 200。
- 部署后逐篇标题和 canonical 与本地源文件一致。
- 部署后的精确标题与品牌搜索仍未返回新页面，符合刚上线后的正常观察状态；不据此记为“未收录”。

## 2026-07-29 巡检与现场记录批次

检查时间：2026-07-29（北京时间）。

公开搜索辅助检查：

- `site:sxfbasketball.cn "赛小蜂篮球"`
- `"赛小蜂篮球" -site:sxfbasketball.cn`
- `"sxfbasketball.cn" -site:sxfbasketball.cn`
- `"赛小蜂" 篮球 官网`

检查结果：公开搜索未返回可直接证明官网 URL 已进入索引的结果。命中的“房小蜂”、科技体育赛事、篮球场馆和其他“小蜂”页面与本品牌无关，已排除。当前仍缺少百度搜索资源平台、Google Search Console 和必应网站管理员工具的 URL 级检查数据，因此展示、查询词、点击、平均位置、已发现或已收录状态均无法从平台侧确认。

部署前基线：

- 正式域名与篮球 CloudBase 系统域名的首页、内容中心、Sitemap、robots.txt、llms.txt、15 篇文章和 5 个指南均回读 HTTP 200。
- 既有文章和指南的 canonical 均指向唯一正式域名 `https://sxfbasketball.cn/`。
- HTTP 200、进入 Sitemap 和公开搜索空结果只作为技术可用或辅助信号，不据此改写收录状态。

| 页面 | 发布状态 | 收录状态 | 最近检查 | 下一步 |
|---|---|---|---|---|
| 既有首页、内容中心、15 篇文章及 5 个指南 | 已上线 | 待复查 | 2026-07-29 | 保持 URL 与 canonical 稳定；等待站长平台 URL 级证据 |
| 篮球比赛计分记录表字段与顺序 | 已上线 | 待复查 | 2026-07-29 | 已部署并回读正式 URL；等待 URL 级收录证据 |
| 篮球比赛暂停记录方法 | 已上线 | 待复查 | 2026-07-29 | 已部署并回读正式 URL；等待 URL 级收录证据 |
| 篮球比赛交换场地计分防错 | 已上线 | 待复查 | 2026-07-29 | 已部署并回读正式 URL；等待 URL 级收录证据 |

说明：新页面只有在生产回读通过后才更新为“已上线”；没有 URL 级搜索结果或站长平台证据时继续标记“待复查”。

部署后验证：

- `npm run site:validate` 通过：18 篇文章、25 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器部署到 `sxf-basketball-d9gp6yt0rd1f7be4d`。
- 独立回读篮球 CloudBase 系统域名和唯一正式域名：两个域名各核验 Sitemap 中 25 个 URL，共 50 次 URL 检查，均返回 HTTP 200。
- 18 篇文章在两个域名上的 title 与本地源一致，canonical 均指向各自唯一的正式域名 URL。
- 两个域名的内容中心均出现今日 3 篇文章；Sitemap 均包含 25 个 URL；robots.txt 均声明正式 Sitemap；llms.txt 均包含今日 3 个公开资源。
- 部署后的 3 个精确标题和 `site:sxfbasketball.cn/articles/posts/ "2026-07-29"` 公开搜索没有返回可核验的新页面，状态保持“已上线，待复查”，不记为“未收录”或“已收录”。

### P0：品牌词首页收录攻坚

2026-07-29 用户将“搜索赛小蜂时官网首页出现”提升为优先级任务。在取得可核验结果前，每日巡检先检查品牌词首页、站长平台状态和入口一致性，再执行常规内容工作。

本次技术诊断：

- 百度、Bing、Google 爬虫 User-Agent 请求 `https://sxfbasketball.cn/` 均返回 HTTP 200，并能读取完整“赛小蜂篮球”品牌正文。
- 首页已具备唯一 HTTPS canonical、`index,follow`、WebSite / Organization / SoftwareApplication 结构化数据、完整品牌 H1、内容中心内链和公开备案信息。
- robots.txt 允许抓取并声明正式 Sitemap；Sitemap 返回 `application/xml`，首页返回 `text/html`，未发现 `X-Robots-Tag` 阻断。
- 当前项目和线上首页未发现百度、Google 或 Bing 站点验证标记；因此无法取得平台级“已发现、已抓取、未编入索引原因”等证据。
- `http://sxfbasketball.cn/` 与 `https://sxfbasketball.cn/index.html` 当前仍直接返回 200，没有统一 301 到 `https://sxfbasketball.cn/`。页面 canonical 已指向 HTTPS 根首页，但入口信号仍可进一步收敛。
- `www.sxfbasketball.cn` 当前没有可用 HTTPS 入口，HTTP 返回 404；Sitemap、canonical 和外链均未使用 www，不将其列为公开入口。

P0 执行顺序：

1. 在百度搜索资源平台、Bing Webmaster Tools（可再补 Google Search Console）完成域名验证，读取首页和 Sitemap 的 URL 级状态；任何提交动作仍需明确授权。
2. 在 CloudBase 自定义域名或 HTTP 访问服务中确认是否可启用 HTTP → HTTPS，并将 `/index.html` 统一到根首页；修改前先核对现有域名路由，避免影响已上线页面。
3. 让 Gitee 默认分支和已发布知乎文章形成可公开核验的完整品牌名 + 正式官网链接，补足搜索引擎发现信号。
4. 每日复查 `"赛小蜂"`、`"赛小蜂篮球"`、`site:sxfbasketball.cn 赛小蜂` 与首页精确标题；只有直接搜索结果或站长平台证据出现后才更新收录状态。

### 2026-07-29 百度站点文件验证

- 百度搜索资源平台已添加无 www 正式站点 `https://sxfbasketball.cn/`。
- 百度生成的验证文件 `baidu_verify_codeva-bEkAIPfWtr.html` 已原样加入官网根目录。
- `npm run site:validate` 通过：18 篇文章、25 个 Sitemap URL。
- 仅通过篮球项目统一启动器将验证文件部署到 `sxf-basketball-d9gp6yt0rd1f7be4d`，没有重复部署文章。
- 正式验证 URL `https://sxfbasketball.cn/baidu_verify_codeva-bEkAIPfWtr.html` 返回 HTTP 200，正文与百度原始文件一致。
- CloudBase 系统域名对应 URL 同样返回 HTTP 200，正文一致。
- 当前下一步：由用户在百度验证页面点击“完成验证”；验证通过后保留验证文件，并提交 Sitemap、检查首页 URL 状态。
- 首次点击“完成验证”时百度提示“不到一分钟前使用文件验证，无法连接到网站服务器”。该次点击距离文件部署约 1 分钟，先按 CDN 节点传播延迟处理。
- 失败提示后立即复核：验证文件通过 HTTPS、HTTP、普通浏览器 User-Agent 和 `Baiduspider` User-Agent 均返回 200，正文完全匹配；DNS、TLS 和响应 Content-Type 正常。建议等待 5 分钟后重试，不立即切换验证方式。
- 重试后百度已进入站点属性页面，确认 `https://sxfbasketball.cn/` 文件验证成功。下一步进入“普通收录”提交 Sitemap，并读取可用的抓取与索引状态。
- 百度尚未同步主体备案信息，Sitemap 当日提交额度为 0；用户已改用“手动提交”提交首页与优先 URL。当前只有用户完成操作的反馈，需在“数据反馈”中确认当天手动提交成功的去重 URL 数量后，才能记为平台已接收。
- 百度“数据反馈”趋势图在 2026-07-29 仅更新到 2026-07-27，尚未包含当天手动提交数据；图中 0 不能解释为提交失败。当前状态保持“已手动提交，平台反馈待更新”，下一复查时间为报表出现 2026-07-29 数据后。

### 2026-07-29 Bing 站点文件验证

- Bing Webmaster Tools 已添加无 www 正式站点 `https://sxfbasketball.cn/`，并选择 XML 文件验证。
- `BingSiteAuth.xml` 已加入官网根目录，验证值与 Bing 下载文件一致。
- `npm run site:validate` 通过：18 篇文章、25 个 Sitemap URL。
- 仅通过篮球项目统一启动器部署 Bing 验证文件，没有重复部署文章。
- `https://sxfbasketball.cn/BingSiteAuth.xml` 与 CloudBase 系统域名对应 URL 均返回 HTTP 200，Content-Type 为 `application/xml`，验证值一致。
- 当前下一步：由用户在 Bing 页面点击“验证”；验证通过后提交 `https://sxfbasketball.cn/sitemap.xml`，再读取 Sitemap 处理状态和 URL 检查数据。
- 用户确认 Bing 文件验证成功。站点状态从“待验证”更新为“已验证”；下一步提交正式 Sitemap，并等待 Bing 返回处理状态与发现 URL 数量。
- Bing 已接收 `https://sxfbasketball.cn/sitemap.xml`：已知网站地图 1、错误 0、警告 0，当前状态“正在处理”，已发现 URL 数暂为 0。处理完成前不重复提交；后续目标是状态成功并发现本地 Sitemap 中的 25 个 URL。
- Bing「URL 检查」对正式首页 `https://sxfbasketball.cn/` 返回“已成功编制索引”，并明确“该 URL 可以在必应上显示”；首页在 Bing 的收录状态据此更新为“已收录”。
- 同次检查显示“未找到 SEO/GEO 问题”，并识别到 1 个标记类型。该结论只适用于 Bing 首页，不外推为百度已收录，也不代表 Sitemap 中其余 24 个 URL 已收录。
- 页面仍提供“请求编制索引”按钮，但首页已经编入索引，因此不重复请求。Sitemap 继续等待处理完成。

## 2026-07-30 每日优先收录巡检与内容批次

检查时间：2026-07-30 14:00（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无新的登录态报表读取 | 已手动提交，平台反馈待更新 | 无 | 不重复提交；此前数据反馈只更新到 2026-07-27，不能用 0 判断 7 月 29 日提交失败 | 2026-07-31，检查数据反馈、抓取频次、抓取异常和索引量 |
| Bing Webmaster Tools | https://sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无 | 首页不再请求编制索引；本轮没有取得新的平台登录态数据 | 2026-07-31，复查 URL 检查与搜索表现 |
| Bing 网站地图 | https://sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验新变化 | 不重复提交；今天生产 Sitemap 已扩展为 28 个 URL，但平台处理结果尚未回读 | 2026-07-31，检查处理状态和已发现 URL 数 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关“小蜂”、篮球或其他页面 | 2026-07-31 |
| 首页精确识别 | site:sxfbasketball.cn 赛小蜂篮球、域名排除本站查询 | 公开搜索辅助信号 | 待复查 | 无 | 未获得正式官网 URL 的直接搜索结果；公开搜索空结果不等于未收录 | 2026-07-31 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、精确标题公开搜索 | 已上线，待复查 | 新上线 | 两个生产域名均回读 200，标题与 canonical 正确；精确标题搜索无 URL 级收录证据 | 2026-08-02 |

证据边界：

- Bing 的“已收录”只适用于首页 `https://sxfbasketball.cn/`，不能外推到百度、内容中心或其余文章。
- 百度只有站点验证、人工提交完成和报表待更新证据，当前不能写成“已发现”或“已收录”。
- Bing Sitemap 仍以最后一次平台回读的“正在处理、已发现 0”为准；本次未重复提交。
- HTTP 200、进入 Sitemap、内容中心出现链接和公开搜索无结果都不单独证明收录。
- 本轮可用工具没有提供百度或 Bing 站长平台的最新登录态报表，因此展示、点击、查询词、平均位置和新的抓取/索引反馈均不可得，不用猜测补齐。

### 今日内容与部署证据

新增页面：

- https://sxfbasketball.cn/articles/posts/basketball-foul-recording.html
- https://sxfbasketball.cn/articles/posts/basketball-buzzer-usage.html
- https://sxfbasketball.cn/articles/posts/basketball-similar-jersey-scoring.html

验证与回读：

- `npm run site:validate` 通过：21 篇文章、28 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器部署到 `sxf-basketball-d9gp6yt0rd1f7be4d`。
- CloudBase 系统域名和唯一正式域名各检查 28 个 Sitemap URL，加 `robots.txt`、`llms.txt`，共 60 项，全部 HTTP 200。
- 两个域名的 21 篇文章 title 与本地一致，canonical 均指向各自的唯一正式域名文章 URL。
- 两个内容中心均出现今日三篇；线上 Sitemap 均为 28 个 URL。
- 今日页面状态为“已上线，待复查”，没有记为“已发现”或“已收录”。

## 2026-07-31 每日优先收录巡检与内容批次

检查时间：2026-07-31 11:05—11:35（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无可调用的登录态接口 | 已手动提交，平台反馈待更新 | 无可核验变化 | 不重复提交；无法读取最新数据反馈、抓取频次、抓取异常或索引量 | 2026-08-01，优先读取平台数据反馈 |
| Bing Webmaster Tools | https://sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无可核验变化 | 首页不重复请求编制索引；本轮无法取得新的登录态 URL 检查或搜索表现 | 2026-08-01 |
| Bing 网站地图 | https://sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验变化 | 不重复提交；生产 Sitemap 已扩展为 31 个 URL，平台处理状态仍需登录态回读 | 2026-08-01 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关“小蜂”、篮球或其他页面 | 2026-08-01 |
| 首页精确识别 | `site:sxfbasketball.cn 赛小蜂篮球`、`"sxfbasketball.cn" -site:sxfbasketball.cn` | 公开搜索辅助信号 | 待复查 | 无 | 未获得正式官网 URL 的直接搜索结果；空结果不等于未收录 | 2026-08-01 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、内容中心与精确标题公开搜索 | 已上线，待复查 | 新上线 | 部署后两个生产域名回读 200，标题与 canonical 正确；无 URL 级收录证据 | 2026-08-02 |

证据边界：

- Bing 的“已收录”证据继续只适用于首页 `https://sxfbasketball.cn/`，不外推到百度、内容中心或其他文章。
- 百度只有站点验证和人工提交反馈；在平台报表回读前，不登记为“已发现”或“已收录”。
- Bing Sitemap 沿用最后一次平台证据“正在处理、已发现 URL 0”；本轮不重复提交。
- 公开搜索没有返回官网品牌词或精确首页结果，只是弱辅助信号，不能单独证明未收录。
- HTTP 200、进入内容中心或 Sitemap 只证明技术可访问和已上线。

### 今日内容与部署证据

新增页面：

- https://sxfbasketball.cn/articles/posts/basketball-score-table-pregame-check.html
- https://sxfbasketball.cn/articles/posts/basketball-clock-error-handling.html
- https://sxfbasketball.cn/articles/posts/basketball-interruption-resume-scoring.html

验证与回读：

- `npm run site:validate` 通过：24 篇文章、31 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器进入 `sxf-basketball-d9gp6yt0rd1f7be4d` 并完成部署。
- 独立回读 CloudBase 系统域名和唯一正式域名：每个域名检查 31 个 Sitemap URL 加 `robots.txt`、`llms.txt`，各 33 项全部 HTTP 200。
- 两个域名的 24 篇文章 title 与本地源一致，canonical 均指向唯一正式域名文章 URL；两个内容中心均出现今日三篇。
- 部署后的三个精确标题公开搜索未出现可核验的今日 URL。新页面在取得搜索结果或站长平台 URL 级证据前保持“已上线，待复查”。

## 2026-08-01 每日优先收录巡检与内容批次

检查时间：2026-08-01 11:15—11:33（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无可调用的登录态接口 | 已手动提交，平台反馈待更新 | 无可核验变化 | 不重复提交；无法读取最新数据反馈、抓取频次、抓取异常、索引量或首页 URL 检查 | 2026-08-02，优先读取数据反馈和首页 URL 状态 |
| Bing Webmaster Tools | https://sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无可核验变化 | 沿用已验证的首页证据；本轮无法取得新的登录态 URL 检查或搜索表现 | 2026-08-02 |
| Bing 网站地图 | https://sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验变化 | 不重复提交；生产 Sitemap 已扩展为 34 个 URL，平台处理状态和已发现 URL 数仍需登录态回读 | 2026-08-02 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关页面，没有取得正式官网的直接结果 | 2026-08-02 |
| 首页精确标题 | “赛小蜂篮球官网｜篮球比赛计分、赛事管理与现场 MC 工具” | 公开搜索辅助信号 | 待复查 | 无 | 未取得可核验的正式首页结果；公开搜索空结果不能证明未收录 | 2026-08-02 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、内容中心、llms.txt 与精确标题公开搜索 | 已上线，待复查 | 新上线 | 两个生产域名均回读 200，标题与 canonical 正确；精确标题搜索无 URL 级收录证据 | 2026-08-03 |

证据边界：

- Bing 的“已收录”继续只适用于首页 `https://sxfbasketball.cn/`，不外推到百度、内容中心或其他 27 篇文章。
- 百度已完成站点验证并有人工提交反馈，但本轮没有平台报表或 URL 检查回读，不能登记为“已发现”或“已收录”。
- Bing Sitemap 沿用最后一次平台证据“正在处理、已发现 URL 0”；本轮没有重复提交，也不以生产 Sitemap 的 34 个 URL 替代平台已发现数量。
- 公开搜索没有返回品牌词、首页精确标题或今日文章，只是弱辅助信号，不能单独证明未收录。
- HTTP 200、进入内容中心、Sitemap 或 llms.txt 只证明技术可访问和已上线。
- 本轮无法取得百度或 Bing 最新登录态数据，因此展示、点击、查询词、平均位置、抓取反馈和新增 URL 级索引结论均不可得。

### 今日内容与部署证据

新增页面：

- https://sxfbasketball.cn/articles/posts/basketball-game-result-archive.html
- https://sxfbasketball.cn/articles/posts/basketball-player-score-attribution-correction.html
- https://sxfbasketball.cn/articles/posts/basketball-multi-game-score-table-reset.html

验证与回读：

- `npm run site:validate` 通过：27 篇文章、34 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器进入 `sxf-basketball-d9gp6yt0rd1f7be4d` 并完成部署。
- 独立回读 CloudBase 系统域名和唯一正式域名：每个域名检查 34 个 Sitemap URL 加 `sitemap.xml`、`robots.txt`、`llms.txt`，各 37 项，共 74 项全部 HTTP 200。
- 两个域名的 27 篇文章 title 与本地源一致，canonical 均指向唯一正式域名文章 URL；两个内容中心、Sitemap 和 llms.txt 均出现今日三篇。
- 今日三个精确标题公开搜索没有返回可核验的新 URL，状态保持“已上线，待复查”。
- `http://sxfbasketball.cn/` 与 `https://sxfbasketball.cn/index.html` 仍直接返回 200，没有 301 收敛到 HTTPS 根首页；canonical 正确，但入口收敛问题尚未解决。

## 2026-08-02 每日优先收录巡检与内容批次

检查时间：2026-08-02 11:31—11:46（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无可调用的登录态后台或接口 | 已手动提交，平台反馈待更新 | 无可核验变化 | 未重复提交；最新数据反馈、抓取/索引状态和首页 URL 检查不可得 | 2026-08-03，优先读取首页 URL 检查与索引量 |
| Bing Webmaster Tools | https://sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无可核验变化 | 沿用首页证据；本轮无可用登录态数据，未外推至其他 URL | 2026-08-03 |
| Bing 网站地图 | https://sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验变化 | 未重复提交；生产 Sitemap 已增至 37 个 URL，不能替代平台已发现数量 | 2026-08-03 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关“小蜂”或其他篮球页面 | 2026-08-03 |
| 首页精确标题 | “赛小蜂篮球官网｜篮球比赛计分、赛事管理与现场 MC 工具” | 公开搜索辅助信号 | 待复查 | 无 | 未取得正式首页直接结果；空结果不能证明未收录 | 2026-08-03 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、内容中心、llms.txt 与精确标题公开搜索 | 已上线，待复查 | 新上线 | 两个生产域名均 200，canonical 与标题正确；公开搜索没有 URL 级收录证据 | 2026-08-03 |

证据边界：

- Bing 的“已收录”只适用于首页 `https://sxfbasketball.cn/`，不外推到百度、内容中心或 30 篇文章。
- 百度已验证并完成人工提交；未取得新的平台 URL 检查、已发现、抓取或索引反馈，因此不登记为“已发现”或“已收录”。
- Bing Sitemap 沿用最后一次平台证据“正在处理、已发现 URL 0”；本轮未重复提交。
- 公开搜索没有返回品牌词、首页精确标题或今日文章，是弱辅助信号，不单独证明未收录。
- HTTP 200、内容中心、Sitemap 与 llms.txt 只证明页面技术可访问和已上线。
- 本轮没有可用的百度或 Bing 登录态后台数据，展示、查询词、点击、平均位置和新增 URL 级索引结论不可得。

### 今日内容与部署证据

新增页面：

- https://sxfbasketball.cn/articles/posts/basketball-score-table-restart-decision.html
- https://sxfbasketball.cn/articles/posts/temporary-basketball-game-team-roster-required.html
- https://sxfbasketball.cn/articles/posts/basketball-home-away-teams-reversed.html

验证与回读：

- `npm run site:validate` 通过：30 篇文章、37 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器进入 `sxf-basketball-d9gp6yt0rd1f7be4d` 并完成部署。
- 独立回读 CloudBase 系统域名和唯一正式域名：每个域名检查 37 个 Sitemap URL 加 `sitemap.xml`、`robots.txt`、`llms.txt`，各 40 项，共 80 项全部 HTTP 200。
- 两个域名的 30 篇文章 canonical 均指向正式域名；今日三篇的 UTF-8 标题与本地源一致，内容中心、Sitemap 和 llms.txt 均出现三个新 URL。
- 今日三个精确标题公开搜索没有返回可核验的新 URL，状态保持“已上线，待复查”。
- `http://sxfbasketball.cn/` 与 `https://sxfbasketball.cn/index.html` 仍直接返回 200，没有 301 收敛到 HTTPS 根首页。
