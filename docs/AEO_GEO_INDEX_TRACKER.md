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
- 篮球 CloudBase 系统域名和 `https://www.sxfbasketball.cn/` 的首页、内容中心、Sitemap、robots.txt、llms.txt 与全部 15 篇文章均回读 200。
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
- 既有文章和指南的 canonical 均指向唯一正式域名 `https://www.sxfbasketball.cn/`。
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

- 百度、Bing、Google 爬虫 User-Agent 请求 `https://www.sxfbasketball.cn/` 均返回 HTTP 200，并能读取完整“赛小蜂篮球”品牌正文。
- 首页已具备唯一 HTTPS canonical、`index,follow`、WebSite / Organization / SoftwareApplication 结构化数据、完整品牌 H1、内容中心内链和公开备案信息。
- robots.txt 允许抓取并声明正式 Sitemap；Sitemap 返回 `application/xml`，首页返回 `text/html`，未发现 `X-Robots-Tag` 阻断。
- 当前项目和线上首页未发现百度、Google 或 Bing 站点验证标记；因此无法取得平台级“已发现、已抓取、未编入索引原因”等证据。
- `http://sxfbasketball.cn/` 与 `https://www.sxfbasketball.cn/index.html` 当前仍直接返回 200，没有统一 301 到 `https://www.sxfbasketball.cn/`。页面 canonical 已指向 HTTPS 根首页，但入口信号仍可进一步收敛。
- `www.sxfbasketball.cn` 当前没有可用 HTTPS 入口，HTTP 返回 404；Sitemap、canonical 和外链均未使用 www，不将其列为公开入口。

P0 执行顺序：

1. 在百度搜索资源平台、Bing Webmaster Tools（可再补 Google Search Console）完成域名验证，读取首页和 Sitemap 的 URL 级状态；任何提交动作仍需明确授权。
2. 在 CloudBase 自定义域名或 HTTP 访问服务中确认是否可启用 HTTP → HTTPS，并将 `/index.html` 统一到根首页；修改前先核对现有域名路由，避免影响已上线页面。
3. 让 Gitee 默认分支和已发布知乎文章形成可公开核验的完整品牌名 + 正式官网链接，补足搜索引擎发现信号。
4. 每日复查 `"赛小蜂"`、`"赛小蜂篮球"`、`site:sxfbasketball.cn 赛小蜂` 与首页精确标题；只有直接搜索结果或站长平台证据出现后才更新收录状态。

### 2026-07-29 百度站点文件验证

- 百度搜索资源平台已添加无 www 正式站点 `https://www.sxfbasketball.cn/`。
- 百度生成的验证文件 `baidu_verify_codeva-bEkAIPfWtr.html` 已原样加入官网根目录。
- `npm run site:validate` 通过：18 篇文章、25 个 Sitemap URL。
- 仅通过篮球项目统一启动器将验证文件部署到 `sxf-basketball-d9gp6yt0rd1f7be4d`，没有重复部署文章。
- 正式验证 URL `https://www.sxfbasketball.cn/baidu_verify_codeva-bEkAIPfWtr.html` 返回 HTTP 200，正文与百度原始文件一致。
- CloudBase 系统域名对应 URL 同样返回 HTTP 200，正文一致。
- 当前下一步：由用户在百度验证页面点击“完成验证”；验证通过后保留验证文件，并提交 Sitemap、检查首页 URL 状态。
- 首次点击“完成验证”时百度提示“不到一分钟前使用文件验证，无法连接到网站服务器”。该次点击距离文件部署约 1 分钟，先按 CDN 节点传播延迟处理。
- 失败提示后立即复核：验证文件通过 HTTPS、HTTP、普通浏览器 User-Agent 和 `Baiduspider` User-Agent 均返回 200，正文完全匹配；DNS、TLS 和响应 Content-Type 正常。建议等待 5 分钟后重试，不立即切换验证方式。
- 重试后百度已进入站点属性页面，确认 `https://www.sxfbasketball.cn/` 文件验证成功。下一步进入“普通收录”提交 Sitemap，并读取可用的抓取与索引状态。
- 百度尚未同步主体备案信息，Sitemap 当日提交额度为 0；用户已改用“手动提交”提交首页与优先 URL。当前只有用户完成操作的反馈，需在“数据反馈”中确认当天手动提交成功的去重 URL 数量后，才能记为平台已接收。
- 百度“数据反馈”趋势图在 2026-07-29 仅更新到 2026-07-27，尚未包含当天手动提交数据；图中 0 不能解释为提交失败。当前状态保持“已手动提交，平台反馈待更新”，下一复查时间为报表出现 2026-07-29 数据后。

### 2026-07-29 Bing 站点文件验证

- Bing Webmaster Tools 已添加无 www 正式站点 `https://www.sxfbasketball.cn/`，并选择 XML 文件验证。
- `BingSiteAuth.xml` 已加入官网根目录，验证值与 Bing 下载文件一致。
- `npm run site:validate` 通过：18 篇文章、25 个 Sitemap URL。
- 仅通过篮球项目统一启动器部署 Bing 验证文件，没有重复部署文章。
- `https://www.sxfbasketball.cn/BingSiteAuth.xml` 与 CloudBase 系统域名对应 URL 均返回 HTTP 200，Content-Type 为 `application/xml`，验证值一致。
- 当前下一步：由用户在 Bing 页面点击“验证”；验证通过后提交 `https://www.sxfbasketball.cn/sitemap.xml`，再读取 Sitemap 处理状态和 URL 检查数据。
- 用户确认 Bing 文件验证成功。站点状态从“待验证”更新为“已验证”；下一步提交正式 Sitemap，并等待 Bing 返回处理状态与发现 URL 数量。
- Bing 已接收 `https://www.sxfbasketball.cn/sitemap.xml`：已知网站地图 1、错误 0、警告 0，当前状态“正在处理”，已发现 URL 数暂为 0。处理完成前不重复提交；后续目标是状态成功并发现本地 Sitemap 中的 25 个 URL。
- Bing「URL 检查」对正式首页 `https://www.sxfbasketball.cn/` 返回“已成功编制索引”，并明确“该 URL 可以在必应上显示”；首页在 Bing 的收录状态据此更新为“已收录”。
- 同次检查显示“未找到 SEO/GEO 问题”，并识别到 1 个标记类型。该结论只适用于 Bing 首页，不外推为百度已收录，也不代表 Sitemap 中其余 24 个 URL 已收录。
- 页面仍提供“请求编制索引”按钮，但首页已经编入索引，因此不重复请求。Sitemap 继续等待处理完成。

## 2026-07-30 每日优先收录巡检与内容批次

检查时间：2026-07-30 14:00（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://www.sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无新的登录态报表读取 | 已手动提交，平台反馈待更新 | 无 | 不重复提交；此前数据反馈只更新到 2026-07-27，不能用 0 判断 7 月 29 日提交失败 | 2026-07-31，检查数据反馈、抓取频次、抓取异常和索引量 |
| Bing Webmaster Tools | https://www.sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无 | 首页不再请求编制索引；本轮没有取得新的平台登录态数据 | 2026-07-31，复查 URL 检查与搜索表现 |
| Bing 网站地图 | https://www.sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验新变化 | 不重复提交；今天生产 Sitemap 已扩展为 28 个 URL，但平台处理结果尚未回读 | 2026-07-31，检查处理状态和已发现 URL 数 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关“小蜂”、篮球或其他页面 | 2026-07-31 |
| 首页精确识别 | site:sxfbasketball.cn 赛小蜂篮球、域名排除本站查询 | 公开搜索辅助信号 | 待复查 | 无 | 未获得正式官网 URL 的直接搜索结果；公开搜索空结果不等于未收录 | 2026-07-31 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、精确标题公开搜索 | 已上线，待复查 | 新上线 | 两个生产域名均回读 200，标题与 canonical 正确；精确标题搜索无 URL 级收录证据 | 2026-08-02 |

证据边界：

- Bing 的“已收录”只适用于首页 `https://www.sxfbasketball.cn/`，不能外推到百度、内容中心或其余文章。
- 百度只有站点验证、人工提交完成和报表待更新证据，当前不能写成“已发现”或“已收录”。
- Bing Sitemap 仍以最后一次平台回读的“正在处理、已发现 0”为准；本次未重复提交。
- HTTP 200、进入 Sitemap、内容中心出现链接和公开搜索无结果都不单独证明收录。
- 本轮可用工具没有提供百度或 Bing 站长平台的最新登录态报表，因此展示、点击、查询词、平均位置和新的抓取/索引反馈均不可得，不用猜测补齐。

### 今日内容与部署证据

新增页面：

- https://www.sxfbasketball.cn/articles/posts/basketball-foul-recording.html
- https://www.sxfbasketball.cn/articles/posts/basketball-buzzer-usage.html
- https://www.sxfbasketball.cn/articles/posts/basketball-similar-jersey-scoring.html

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
| 百度搜索资源平台 | https://www.sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无可调用的登录态接口 | 已手动提交，平台反馈待更新 | 无可核验变化 | 不重复提交；无法读取最新数据反馈、抓取频次、抓取异常或索引量 | 2026-08-01，优先读取平台数据反馈 |
| Bing Webmaster Tools | https://www.sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无可核验变化 | 首页不重复请求编制索引；本轮无法取得新的登录态 URL 检查或搜索表现 | 2026-08-01 |
| Bing 网站地图 | https://www.sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验变化 | 不重复提交；生产 Sitemap 已扩展为 31 个 URL，平台处理状态仍需登录态回读 | 2026-08-01 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关“小蜂”、篮球或其他页面 | 2026-08-01 |
| 首页精确识别 | `site:sxfbasketball.cn 赛小蜂篮球`、`"sxfbasketball.cn" -site:sxfbasketball.cn` | 公开搜索辅助信号 | 待复查 | 无 | 未获得正式官网 URL 的直接搜索结果；空结果不等于未收录 | 2026-08-01 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、内容中心与精确标题公开搜索 | 已上线，待复查 | 新上线 | 部署后两个生产域名回读 200，标题与 canonical 正确；无 URL 级收录证据 | 2026-08-02 |

证据边界：

- Bing 的“已收录”证据继续只适用于首页 `https://www.sxfbasketball.cn/`，不外推到百度、内容中心或其他文章。
- 百度只有站点验证和人工提交反馈；在平台报表回读前，不登记为“已发现”或“已收录”。
- Bing Sitemap 沿用最后一次平台证据“正在处理、已发现 URL 0”；本轮不重复提交。
- 公开搜索没有返回官网品牌词或精确首页结果，只是弱辅助信号，不能单独证明未收录。
- HTTP 200、进入内容中心或 Sitemap 只证明技术可访问和已上线。

### 今日内容与部署证据

新增页面：

- https://www.sxfbasketball.cn/articles/posts/basketball-score-table-pregame-check.html
- https://www.sxfbasketball.cn/articles/posts/basketball-clock-error-handling.html
- https://www.sxfbasketball.cn/articles/posts/basketball-interruption-resume-scoring.html

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
| 百度搜索资源平台 | https://www.sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无可调用的登录态接口 | 已手动提交，平台反馈待更新 | 无可核验变化 | 不重复提交；无法读取最新数据反馈、抓取频次、抓取异常、索引量或首页 URL 检查 | 2026-08-02，优先读取数据反馈和首页 URL 状态 |
| Bing Webmaster Tools | https://www.sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无可核验变化 | 沿用已验证的首页证据；本轮无法取得新的登录态 URL 检查或搜索表现 | 2026-08-02 |
| Bing 网站地图 | https://www.sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验变化 | 不重复提交；生产 Sitemap 已扩展为 34 个 URL，平台处理状态和已发现 URL 数仍需登录态回读 | 2026-08-02 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关页面，没有取得正式官网的直接结果 | 2026-08-02 |
| 首页精确标题 | “赛小蜂篮球官网｜篮球比赛计分、赛事管理与现场 MC 工具” | 公开搜索辅助信号 | 待复查 | 无 | 未取得可核验的正式首页结果；公开搜索空结果不能证明未收录 | 2026-08-02 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、内容中心、llms.txt 与精确标题公开搜索 | 已上线，待复查 | 新上线 | 两个生产域名均回读 200，标题与 canonical 正确；精确标题搜索无 URL 级收录证据 | 2026-08-03 |

证据边界：

- Bing 的“已收录”继续只适用于首页 `https://www.sxfbasketball.cn/`，不外推到百度、内容中心或其他 27 篇文章。
- 百度已完成站点验证并有人工提交反馈，但本轮没有平台报表或 URL 检查回读，不能登记为“已发现”或“已收录”。
- Bing Sitemap 沿用最后一次平台证据“正在处理、已发现 URL 0”；本轮没有重复提交，也不以生产 Sitemap 的 34 个 URL 替代平台已发现数量。
- 公开搜索没有返回品牌词、首页精确标题或今日文章，只是弱辅助信号，不能单独证明未收录。
- HTTP 200、进入内容中心、Sitemap 或 llms.txt 只证明技术可访问和已上线。
- 本轮无法取得百度或 Bing 最新登录态数据，因此展示、点击、查询词、平均位置、抓取反馈和新增 URL 级索引结论均不可得。

### 今日内容与部署证据

新增页面：

- https://www.sxfbasketball.cn/articles/posts/basketball-game-result-archive.html
- https://www.sxfbasketball.cn/articles/posts/basketball-player-score-attribution-correction.html
- https://www.sxfbasketball.cn/articles/posts/basketball-multi-game-score-table-reset.html

验证与回读：

- `npm run site:validate` 通过：27 篇文章、34 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器进入 `sxf-basketball-d9gp6yt0rd1f7be4d` 并完成部署。
- 独立回读 CloudBase 系统域名和唯一正式域名：每个域名检查 34 个 Sitemap URL 加 `sitemap.xml`、`robots.txt`、`llms.txt`，各 37 项，共 74 项全部 HTTP 200。
- 两个域名的 27 篇文章 title 与本地源一致，canonical 均指向唯一正式域名文章 URL；两个内容中心、Sitemap 和 llms.txt 均出现今日三篇。
- 今日三个精确标题公开搜索没有返回可核验的新 URL，状态保持“已上线，待复查”。
- `http://sxfbasketball.cn/` 与 `https://www.sxfbasketball.cn/index.html` 仍直接返回 200，没有 301 收敛到 HTTPS 根首页；canonical 正确，但入口收敛问题尚未解决。

## 2026-08-02 每日优先收录巡检与内容批次

检查时间：2026-08-02 11:31—11:46（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://www.sxfbasketball.cn/ | 2026-07-29 已验证站点及人工提交反馈；本轮无可调用的登录态后台或接口 | 已手动提交，平台反馈待更新 | 无可核验变化 | 未重复提交；最新数据反馈、抓取/索引状态和首页 URL 检查不可得 | 2026-08-03，优先读取首页 URL 检查与索引量 |
| Bing Webmaster Tools | https://www.sxfbasketball.cn/ | 2026-07-29 URL 检查返回“已成功编制索引” | 已收录（仅 Bing 首页） | 无可核验变化 | 沿用首页证据；本轮无可用登录态数据，未外推至其他 URL | 2026-08-03 |
| Bing 网站地图 | https://www.sxfbasketball.cn/sitemap.xml | 2026-07-29 平台回读：正在处理、错误 0、警告 0、已发现 URL 0 | 待复查 | 无可核验变化 | 未重复提交；生产 Sitemap 已增至 37 个 URL，不能替代平台已发现数量 | 2026-08-03 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未出现可核验官网结果 | 无 | 搜索结果仍为无关“小蜂”或其他篮球页面 | 2026-08-03 |
| 首页精确标题 | “赛小蜂篮球官网｜篮球比赛计分、赛事管理与现场 MC 工具” | 公开搜索辅助信号 | 待复查 | 无 | 未取得正式首页直接结果；空结果不能证明未收录 | 2026-08-03 |
| 今日三篇文章 | 3 个正式文章 URL | HTTP、Sitemap、内容中心、llms.txt 与精确标题公开搜索 | 已上线，待复查 | 新上线 | 两个生产域名均 200，canonical 与标题正确；公开搜索没有 URL 级收录证据 | 2026-08-03 |

证据边界：

- Bing 的“已收录”只适用于首页 `https://www.sxfbasketball.cn/`，不外推到百度、内容中心或 30 篇文章。
- 百度已验证并完成人工提交；未取得新的平台 URL 检查、已发现、抓取或索引反馈，因此不登记为“已发现”或“已收录”。
- Bing Sitemap 沿用最后一次平台证据“正在处理、已发现 URL 0”；本轮未重复提交。
- 公开搜索没有返回品牌词、首页精确标题或今日文章，是弱辅助信号，不单独证明未收录。
- HTTP 200、内容中心、Sitemap 与 llms.txt 只证明页面技术可访问和已上线。
- 本轮没有可用的百度或 Bing 登录态后台数据，展示、查询词、点击、平均位置和新增 URL 级索引结论不可得。

### 今日内容与部署证据

新增页面：

- https://www.sxfbasketball.cn/articles/posts/basketball-score-table-restart-decision.html
- https://www.sxfbasketball.cn/articles/posts/temporary-basketball-game-team-roster-required.html
- https://www.sxfbasketball.cn/articles/posts/basketball-home-away-teams-reversed.html

验证与回读：

- `npm run site:validate` 通过：30 篇文章、37 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器进入 `sxf-basketball-d9gp6yt0rd1f7be4d` 并完成部署。
- 独立回读 CloudBase 系统域名和唯一正式域名：每个域名检查 37 个 Sitemap URL 加 `sitemap.xml`、`robots.txt`、`llms.txt`，各 40 项，共 80 项全部 HTTP 200。
- 两个域名的 30 篇文章 canonical 均指向正式域名；今日三篇的 UTF-8 标题与本地源一致，内容中心、Sitemap 和 llms.txt 均出现三个新 URL。
- 今日三个精确标题公开搜索没有返回可核验的新 URL，状态保持“已上线，待复查”。
- `http://sxfbasketball.cn/` 与 `https://www.sxfbasketball.cn/index.html` 仍直接返回 200，没有 301 收敛到 HTTPS 根首页。

## 2026-08-09 每日优先收录巡检与内容批次

检查时间：2026-08-09 12:46—12:56（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://www.sxfbasketball.cn/ | 历史人工提交记录；本轮无可用登录态后台 | 待复查 | 无可核验的索引变化 | 未重复提交；首页 URL 检查、抓取反馈、索引量、展示和点击不可得 | 2026-08-10，优先回读新正式域名首页 |
| Bing Webmaster Tools | https://www.sxfbasketball.cn/ | 本轮生产可用性检查；无最新登录态 URL 检查 | 待复查 | 正式域名口径已由用户确认 | 旧域名历史结果不外推；当前正式首页需取得新的 URL 级证据 | 2026-08-10 |
| Bing 网站地图 | https://www.sxfbasketball.cn/sitemap.xml | 生产回读与历史平台状态 | 待复查 | 正式 Sitemap 当前 200 | 未重复提交；平台处理状态、已发现 URL 数和错误反馈不可得 | 2026-08-10 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未取得可核验官网结果 | 无可核验变化 | 搜索结果为无关“小蜂”内容，没有取得正式官网直接结果 | 2026-08-10 |
| 首页精确标题 | “赛小蜂篮球官网｜篮球比赛计分、赛事管理与现场 MC 工具” | 公开搜索辅助信号 | 待复查 | 无可核验变化 | 未取得正式首页直接结果；空结果不能证明未收录 | 2026-08-10 |
| 今日三篇文章 | 3 个新文章 URL | CloudBase 系统域名、唯一正式域名与公开搜索 | 已上线，待复查 | 新增页面 | 系统域名和 `www.sxfbasketball.cn` 均回读 200，标题、canonical 与内容中心入口正确 | 2026-08-10 |

证据边界：

- 旧域名已经永久停用，不再纳入当前站点巡检。旧域名的历史 Bing 结果仅保留为历史，不能证明 `https://www.sxfbasketball.cn/` 已收录。
- 百度与 Bing 的最新登录态 URL 检查、Sitemap 处理、已发现 URL、抓取/索引反馈、展示、查询词、点击和平均位置均不可得；本轮没有重复提交。
- 公开搜索没有返回品牌词、首页精确标题或今日文章的可核验官网结果，只能记为弱辅助信号。
- HTTP 200、进入 Sitemap、内容中心或 llms.txt 只证明技术上线，不证明收录。
- 用户已确认 `54football.top` 永久停用；当前唯一正式域名为 `https://www.sxfbasketball.cn/`。后续 canonical、Sitemap、收录和外链检查均以该域名为准。

### 今日内容与部署证据

新增页面（唯一正式域名）：

- https://www.sxfbasketball.cn/articles/posts/basketball-score-table-role-division.html
- https://www.sxfbasketball.cn/articles/posts/duplicate-player-numbers-in-basketball-game.html
- https://www.sxfbasketball.cn/articles/posts/basketball-mc-wrong-audio-handling.html

验证与回读：

- `npm run site:validate` 通过：33 篇文章、40 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器部署到 `sxf-basketball-d9gp6yt0rd1f7be4d`。
- CloudBase 系统域名和 `https://www.sxfbasketball.cn/` 各检查 Sitemap 的 40 个 URL，加 `sitemap.xml`、`robots.txt`、`llms.txt`，各 43 项全部 HTTP 200。
- 三篇新文章在两个生产入口均返回 200；正式标题与本地一致，canonical 自指唯一正式域名，内容中心均可找到入口。
- 今日三篇状态为“已上线，待复查”，没有新增 URL 级收录证据。

## 2026-08-18 域名入口收敛进展

检查时间：2026-08-18 16:43—17:14（北京时间）。

- DNSPod 中 `www` CNAME 继续指向 CloudBase 且正常启用；`_dnsauth` TXT 保留。
- 用户将暂停的根域 `@` CNAME 改为启用的 DNSPod“显性 URL”，目标 `https://www.sxfbasketball.cn/`，线路默认、TTL 600。
- DNSPod 权威节点和公共 DNS 已发布新记录。直连 DNSPod URL 转发节点验证 `http://sxfbasketball.cn/` 返回单跳 HTTP 301，`Location` 为唯一正式官网。
- DNSPod URL 转发前地址只支持 HTTP；`https://sxfbasketball.cn/` 仍无法完成 TLS 握手。CloudBase 个人版仅允许 1 个自定义域名，当前名额保留给正式 `www`，因此裸域 HTTPS 暂未收敛。
- 证书中心已有同时覆盖裸域和 `www` 的有效证书，但部署页没有 DNSPod URL 转发资源，不能仅靠该证书解决裸域 HTTPS；没有执行错误部署。
- 域名状态现为：正式 `https://www.sxfbasketball.cn/` 正常；裸域 HTTP 已 301；裸域 HTTPS 待独立边缘重定向或未来平台能力；`http://www` 强制 HTTPS 和 `/index.html` 到根首页的 301 仍待处理。
- 本次域名修正改善入口一致性，但不是百度收录证据；百度 5 个重点 URL 未重复提交。

## 2026-08-19 公安备案信任信息上线

- 用户确认赛小蜂篮球官网公安备案号已正式取得：`豫公网安备41010202003962号`，并提供公安徽章原图。
- 首页、内容中心、39 篇文章和 5 个公开指南共 46 个页面已统一展示徽章、新备案号和全国互联网安全管理服务平台查询链接；旧号已从公开页面清零。
- `llms.txt` 已同步新号，站点校验器加入备案号、查询链接、徽章和旧号残留检查。
- `npm run site:validate` 通过：39 篇文章、46 个 Sitemap URL；已通过统一启动器部署到固定篮球环境。
- 正式域名和 CloudBase 系统域名各回读 46/46 页面通过；两个域名的徽章资源均为 200，文件哈希与用户原图一致。
- 此项属于合规与品牌信任信号，只标记“已上线”，不作为搜索引擎已发现、抓取或收录的证据；本轮未重复提交百度/Bing。

## 2026-08-18 每日优先收录巡检与内容批次

检查时间：2026-08-18 14:37—14:46（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://www.sxfbasketball.cn/ | 2026-08-13 平台截图、抓取诊断与手动提交记录；本轮无可用登录态后台 | 已提交重点 URL，待复查 | 无新的平台级证据 | 8 月 13 日首页等 5 个重点 URL 已手动提交；今天未重复提交，最新索引量、抓取频次和普通收录反馈不可得 | 2026-08-21，优先回读索引量、抓取频次与提交反馈 |
| Bing Webmaster Tools | https://www.sxfbasketball.cn/ | 2026-08-09 站点验证记录；本轮无最新登录态 URL 检查 | 待复查 | 无新的 URL 级证据 | 站点所有权已验证；首页是否已发现、抓取或编制索引仍不可得 | 2026-08-21 |
| Bing 网站地图 | https://www.sxfbasketball.cn/sitemap.xml | 2026-08-09 平台截图与本轮生产回读 | 待复查 | 生产 Sitemap 从 43 增至 46 个 URL | 最后平台证据仍为“正在处理、已发现 URL 0、错误 0、警告 0”；今天未重复提交 | 2026-08-21，读取处理状态、已发现 URL 数与上次爬网时间 |
| 百度品牌词 | “赛小蜂”“赛小蜂篮球” | 百度公开结果页辅助信号 | 未取得可核验官网结果 | 无可核验变化 | 结果页返回 200，但没有可解析的正式域名结果；页面内容过少，不能反推全站未收录 | 2026-08-21 |
| Bing 品牌词 | “赛小蜂”“赛小蜂篮球” | Bing 公开结果页辅助信号 | 未取得可核验官网结果 | 无可核验变化 | 品牌词与首页精确标题查询未发现正式域名；`site:` 页中的域名只来自查询词和搜索页元数据，不是结果链接 | 2026-08-21 |
| 首页精确标题 | “赛小蜂篮球官网｜篮球比赛计分、赛事管理与现场 MC 工具” | 百度、Bing 公开搜索辅助信号 | 待复查 | 无可核验变化 | 未取得正式首页直接结果；空结果不能单独证明未收录 | 2026-08-21 |
| 今日三篇文章 | 3 个正式文章 URL | 正式域名、CloudBase 系统域名、Sitemap、内容中心、llms.txt | 已上线，待复查 | 新增页面 | 两个生产入口均为 200，标题与 canonical 正确；没有 URL 级平台检查或直接搜索结果 | 2026-08-21 |

证据边界：

- 百度最后可确认状态为：8 月 13 日抓取诊断成功、此前索引量为 0、抓取频次接近 0，5 个重点 URL 已手动提交。今天没有新的登录态后台回读，不能判断 5 个 URL 是否已被发现、抓取或收录。
- Bing 最后可确认状态为：新正式站点已验证，Sitemap 于 8 月 9 日提交并处于处理中，当时已发现 URL 为 0。今天没有新的首页 URL 检查或 Sitemap 后台数据。
- 公开搜索没有提供品牌词、首页精确标题或今天三篇文章的可核验官网结果，只作为弱辅助信号。
- HTTP 200、进入 Sitemap、内容中心和 llms.txt 只证明技术上线，不证明搜索引擎已发现、抓取或收录。
- 本轮未提交 URL、Sitemap、IndexNow 或百度 API 请求；展示、查询词、点击和平均位置不可得。

### 今日内容与部署证据

新增页面：

- https://www.sxfbasketball.cn/articles/posts/basketball-overtime-scoring-workflow.html
- https://www.sxfbasketball.cn/articles/posts/basketball-scoring-without-mc.html
- https://www.sxfbasketball.cn/articles/posts/midgame-scorer-handover.html

验证与回读：

- `npm run site:validate` 通过：39 篇文章、46 个 Sitemap URL。
- 首次部署尝试因 Windows PowerShell 未自动加载 `Microsoft.PowerShell.Security` 而在上传前失败；显式加载系统安全模块后，以相同 `npm run site:deploy` 和统一启动器重试成功，未绕过项目启动器或固定环境。
- 部署目标为 `sxf-basketball-d9gp6yt0rd1f7be4d`。
- 独立回读 CloudBase 系统域名和 `https://www.sxfbasketball.cn/`：每个域名检查 46 个 Sitemap URL，加 `sitemap.xml`、`robots.txt`、`llms.txt`，各 49/49 HTTP 200。
- 两个生产入口的 39 篇文章标题与本地一致，canonical 均指向唯一正式域名；三篇新文章在内容中心可见。
- 今日三篇状态为“已上线，待复查”，没有新增 URL 级收录证据。

### 2026-08-13 11:26 百度搜索资源平台后台回读

用户提供百度搜索资源平台截图，站点为 `https://www.sxfbasketball.cn/`。本次取得以下平台级证据：

| 项目 | 后台证据 | 当前判定 |
|---|---|---|
| 索引量 | 2026-08-08 至 2026-08-11 每日索引量均为 0，变化量 0 | 百度当前没有为该站点建立可见索引；这是平台级证据，不再仅依赖公开搜索 |
| 抓取诊断 | 首页 `https://www.sxfbasketball.cn/` 于 2026-08-13 11:26 使用 PC UA 提交诊断，状态“抓取中” | 尚无抓取结果；待完成后读取 HTTP 状态、抓取内容与异常说明 |
| 抓取异常 | 截图覆盖至 2026-08-11，DNS、连接、连接超时、抓取超时均无异常曲线 | 未发现异常不等于百度已经成功抓取；若抓取量为 0，同样可能没有异常样本 |
| 普通收录数据反馈 | 2026-08-08 手动提交 1 条；API 提交 0；Sitemap 0 | 新站资源发现信号极弱，当前没有成功的 API 或 Sitemap 提交记录；手动提交也不保证收录 |

阶段判断：

- 已确定“百度索引量为 0”，因此品牌词搜不到首先是收录问题，不是单纯排名靠后。
- 当前最可能卡在“资源发现/实际抓取尚未形成”或“抓取后未通过索引质量处理”两层；抓取诊断完成前不能在两者中提前定论。
- 下一步不重复提交大量文章。先等待首页抓取诊断完成，并回读“普通收录—资源提交”页的可用方式、配额和 Sitemap 文件状态，以及“抓取频次”最近 30 天数据。
- 若抓取诊断成功且正文与预期一致，再选择首页、内容中心、官方介绍、官方入口和一篇核心指南作为首批重点 URL；是否提交以平台可用配额和用户操作确认为准。

### 2026-08-13 百度普通收录资源提交能力回读

- 用户提供“普通收录—资源提交”截图。站点已显示 API 推送接口，说明 API 提交能力已开放；截图未覆盖API每日剩余额度，暂不假定具体配额。
- Sitemap 页显示“今日提交上限 0 条、今日提交余额 0 条”，文件列表“暂无数据”。因此当前没有可用 Sitemap 配额，也没有已提交或正在处理的百度 Sitemap 文件。
- API 页面截图包含完整准入密钥。该密钥已暴露在会话附件中，必须立即通过“修改准入密钥”轮换；不得把新密钥写入项目、日志、台账或聊天，也不得使用已暴露的旧密钥。
- 后续策略调整为：先等待首页抓取诊断完成；确认百度能正常读取正文后，只提交少量重点 URL。Sitemap 配额为 0 时不反复尝试；API 或手动提交只解决发现，不保证索引。

### 2026-08-09 13:03—13:05 同日专项复查

- Bing 公开查询 `site:www.sxfbasketball.cn` 返回 10 个不相关结果，没有任何结果 URL 指向正式域名；“赛小蜂篮球 + www.sxfbasketball.cn”和首页精确标题查询同样没有官网结果。
- 因此当前没有证据证明 Bing 已把实质收录从旧域名迁移到 `www.sxfbasketball.cn`。旧域名历史 URL 检查结果不能继续标作新域名首页已收录。
- `https://www.sxfbasketball.cn/BingSiteAuth.xml` 返回 200，验证文件可访问；正式 Sitemap 返回 200，包含 40 个 `www.sxfbasketball.cn` URL、0 个旧域名 URL；robots.txt 也指向新正式 Sitemap。这些只证明 Bing 接入条件已准备好，不证明 Bing Webmaster Tools 已添加新站点、处理新 Sitemap 或收录页面。
- 当前无法取得 Bing Webmaster Tools 登录态后台的站点列表、URL 检查、Sitemap 处理状态和已发现 URL 数。新正式域名在 Bing 的状态修正为“待复查”，下一步必须在后台确认 `https://www.sxfbasketball.cn/` 是否已添加并验证，并查看新 Sitemap 是否已提交和处理。
- 百度公开 `site:` 查询未取得可直接解析到正式域名的结果；品牌组合查询出现一篇百度百家号的“赛小蜂篮球赛事中心”文章，但落地页为 `baijiahao.baidu.com`，属于站外品牌内容，不能证明官网已收录。
- 今日三篇精确标题与 URL 查询均未出现正式官网结果，继续保持“已上线，待复查”。

### 2026-08-09 13:08—13:09 Bing 新站点验证文件核对

- 用户在 Bing Webmaster Tools 添加 `https://www.sxfbasketball.cn/`，平台要求使用根目录 `BingSiteAuth.xml` 验证。
- 下载文件 `C:\Users\15043\Downloads\BingSiteAuth (1).xml` 与项目根目录 `BingSiteAuth.xml` 的原始哈希因换行格式不同而不同，但去除空白后 XML 内容和验证令牌一致，两个文件结构均有效。
- 线上 `https://www.sxfbasketball.cn/BingSiteAuth.xml` 返回 HTTP 200、Content-Type `application/xml`，内容与项目根目录文件一致。
- 无需重新上传或部署；当前状态为“验证文件就绪，等待 Bing 页面点击验证并回读结果”。尚不能在点击成功前登记为“新站点已验证”。

### 2026-08-09 13:11 Bing 新站点验证完成

- 用户确认 `https://www.sxfbasketball.cn/` 已成功加入 Bing Webmaster Tools，站点验证状态由“验证文件就绪”更新为“已验证”。
- 该结果只证明 Bing Webmaster Tools 已接受新站点所有权验证，不等于首页、Sitemap 或文章已被发现、抓取或编制索引。
- 后续设置顺序：在“网站地图”中确认/提交 `https://www.sxfbasketball.cn/sitemap.xml`；回读处理状态、错误、警告和已发现 URL 数；再用“URL 检查”核对首页；最后再评估 IndexNow。
- 在取得 Sitemap 后台回读和首页 URL 检查结果前，新域名收录状态继续保持“待复查”。

### 2026-08-09 13:13 Bing 新 Sitemap 提交回读

- 用户提供 Bing Webmaster Tools“网站地图”后台截图，站点为 `www.sxfbasketball.cn`。
- 已知网站地图 1；错误 0；警告 0；已发现的总 URL 数 0。
- Sitemap URL 为 `https://www.sxfbasketball.cn/sitemap.xml`，上次提交时间为 2026-08-09，状态为“正在处理”；上次爬网时间和该行已发现 URL 数暂未生成。
- 该证据证明新正式域名 Sitemap 已提交且进入处理队列，但尚未证明 Bing 已发现、抓取或收录其中任何 URL。
- 当前不重复提交。下一步使用“URL 检查”核对 `https://www.sxfbasketball.cn/`；Sitemap 状态在 2026-08-10 复查，关注处理结果、已发现 URL 数、错误和警告变化。

## 2026-08-13 每日优先收录巡检与内容批次

检查时间：2026-08-13 10:54—11:06（北京时间）。

### 平台、品牌词与 Sitemap 状态

| 平台/对象 | URL 或查询 | 证据类型 | 当前状态 | 状态变化 | 本次检查 | 下一复查 |
|---|---|---|---|---|---|---|
| 百度搜索资源平台 | https://www.sxfbasketball.cn/ | 历史人工提交记录；本轮无可用登录态后台 | 待复查 | 无可核验变化 | 未重复提交；首页 URL 检查、抓取反馈、索引量、展示和点击不可得 | 2026-08-14，优先读取首页 URL 检查与索引反馈 |
| Bing Webmaster Tools | https://www.sxfbasketball.cn/ | 2026-08-09 新站点已验证；本轮无最新登录态 URL 检查 | 待复查 | 无新的 URL 级证据 | 站点所有权仍沿用已验证证据；首页是否被发现、抓取或编制索引不可得 | 2026-08-14 |
| Bing 网站地图 | https://www.sxfbasketball.cn/sitemap.xml | 2026-08-09 平台截图与本轮生产回读 | 待复查 | 生产 Sitemap 从 40 增至 43 个 URL | 最后平台证据仍为“正在处理、已发现 URL 0、错误 0、警告 0”；未重复提交 | 2026-08-14，读取处理状态、已发现 URL 数与上次爬网时间 |
| 品牌词 | “赛小蜂”“赛小蜂篮球”“赛小蜂 篮球 官网” | 公开搜索辅助信号 | 未取得可核验官网结果 | 无可核验变化 | 搜索结果为无关“小蜂”或其他篮球页面，没有正式官网直接结果 | 2026-08-14 |
| 首页精确标题 | “赛小蜂篮球官网｜篮球比赛计分、赛事管理与现场 MC 工具” | 公开搜索辅助信号 | 待复查 | 无可核验变化 | 未取得正式首页直接结果；空结果不能证明未收录 | 2026-08-14 |
| 今日三篇文章 | 3 个正式文章 URL | 正式域名、CloudBase 系统域名、Sitemap、内容中心、llms.txt 与精确标题公开搜索 | 已上线，待复查 | 新增页面 | 两个生产入口均为 200，标题和 canonical 正确；精确标题搜索没有 URL 级收录证据 | 2026-08-14 |

证据边界：

- 百度本轮没有登录态首页 URL 检查、抓取诊断、索引量或搜索表现数据，不能登记为“已发现”或“已收录”。
- Bing 当前可确认新站点于 2026-08-09 验证成功、Sitemap 当日已提交并进入处理队列；最后已知“已发现 URL 0”不能外推到今天，也没有新的首页 URL 检查结果。
- 公开品牌词、首页精确标题和今日三篇精确标题搜索均未返回可核验官网结果，只记作弱辅助信号，不单独证明未收录。
- HTTP 200、进入 Sitemap、内容中心和 llms.txt 只证明技术上线，不证明搜索引擎已发现、抓取或收录。
- 本轮没有可用的平台展示、查询词、点击、平均位置和新增 URL 级索引结论；未提交 URL、Sitemap 或 IndexNow 请求。

### 2026-08-13 11:26—11:38 百度抓取诊断与抓取频次回读

- 用户回读抓取诊断结果：`https://www.sxfbasketball.cn/` 于 2026-08-13 11:26 使用 PC UA 显示“抓取成功”。这证明百度抓取诊断可以访问并读取首页，不等于首页已进入百度索引。
- 用户回读抓取异常：近30天 DNS、连接、连接超时和抓取超时曲线均无异常。该结果与抓取成功相互印证，当前没有可见的服务器或 robots 阻断证据。
- 用户回读抓取频次：2026-07-14 至 2026-08-11 图表几乎为 0，未见形成稳定的百度 Spider 日常抓取量。当前站点“索引量 0 + 抓取成功 + 抓取频次 0”的组合，更接近资源发现/调度不足，而不是首页完全不可访问。
- 用户回读普通收录—手动提交：文本框支持每次最多提交 20 条链接、每行一条；本轮未提交。该入口适合在抓取诊断成功后提交少量重点 URL，但不保证收录。
- 结合此前 Sitemap 页“今日提交上限 0、余额 0、文件列表暂无数据”，当前百度 Sitemap 通道仍不可用；不能继续等待 Sitemap 自动带来发现量。

阶段判断更新：

- 技术可抓取：已确认。
- 百度主动/日常发现：不足，抓取频次接近 0。
- 百度索引：0，尚未建立可见索引。
- 当前首要动作：用户在百度手动提交页提交不超过 5 个重点 URL；提交后记录提交时间和反馈，不批量提交 43 个 URL。
- 首批建议 URL：首页、内容中心、官方产品介绍、官方入口说明、篮球现场计分指南。提交后 3—7 天回读索引量、抓取频次和普通收录数据反馈。

### 2026-08-13 百度手动提交完成

- 用户确认已在百度搜索资源平台“普通收录—手动提交”成功提交首批 5 个重点 URL：首页、内容中心、官方产品介绍、官方入口说明、篮球现场计分指南。
- 当前状态统一登记为“已提交，待抓取/索引”，不登记为“已发现”或“已收录”。提交成功只证明百度接受了提交请求，不证明已抓取、通过质量处理或进入索引。
- 本轮不重复提交、不批量提交其余 38 个 URL。下一次复查：2026-08-16，重点查看索引量、抓取频次、普通收录数据反馈和首页抓取状态；若仍无变化，再根据后台反馈决定是否启用已轮换的 API 准入方式。
- 用户已确认 API 准入密钥完成轮换；旧密钥不再使用，新密钥未进入聊天、项目或台账。当前不启用 API，先观察已提交的5个重点 URL。

### 今日内容与部署证据

新增页面：

- https://www.sxfbasketball.cn/articles/posts/basketball-period-transition-workflow.html
- https://www.sxfbasketball.cn/articles/posts/reset-test-score-before-basketball-game.html
- https://www.sxfbasketball.cn/articles/posts/missing-player-on-game-roster.html

验证与回读：

- `npm run site:validate` 通过：36 篇文章、43 个 Sitemap URL。
- `npm run site:deploy` 通过项目统一启动器部署到 `sxf-basketball-d9gp6yt0rd1f7be4d`。
- CloudBase 系统域名和 `https://www.sxfbasketball.cn/` 各检查 Sitemap 的 43 个 URL，加 `sitemap.xml`、`robots.txt`、`llms.txt`，各 46 项全部 HTTP 200。
- 两个生产入口的 36 篇文章 title 与本地一致，canonical 均指向唯一正式域名；内容中心、Sitemap 和 llms.txt 均出现今日三篇。
- 今日三篇状态为“已上线，待复查”，没有新增 URL 级收录证据。
