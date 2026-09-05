# 首页任务通知广告位 原型拆解说明

源图：E:\Documents\sxf-basketball\docs\原型-裁判教练协同\首页任务通知广告位.png  
尺寸：1250 × 1000

## 页面结构

- 保留现有首页品牌区、快捷比赛卡和六栏底部菜单。
- 第二张广告卡所在区域永久改为比赛任务区。
- 有多条任务时显示最近一条主任务和待处理数量，点击进入“我的比赛”。
- 无有效任务时显示“暂无比赛任务”空态；未登录时显示“登录查看比赛任务”。
- 原“机构训赛经营增长平台”广告不再在该区域回退显示。

## 交互与状态

- 裁判任务：点击进入对应场次；未接受时先进入任务确认，已开放时进入锁定的既有裁判控制台。
- 球队负责人任务：点击进入球队确认、名单或二次确认页面。
- 助教任务：点击进入接受任务或专项数据页面。
- 赛程变更：卡片显示“需重新确认”。
- 多任务：卡片显示数量和最近比赛，点击查看完整任务列表。
- 加载、空态、失败态和重试均需明确。

## 数据字段

- matchTaskId、matchId、scheduleVersion、role、teamScope。
- tournamentName、groupName、matchDate、startTime、venue。
- homeTeamName、awayTeamName。
- taskStatus、firstConfirmationStatus、secondConfirmationStatus。
- unread、priority、updatedAt、deepLinkTarget。

## 素材决策

- 任务卡、标签、按钮、比分和状态全部使用WXML/WXSS渲染。
- 复用native-dist/assets/home中的背景、Logo和快捷比赛素材。
- 底部菜单继续复用native-dist/components/sxf-tabbar。
- 不从开发者工具截图裁切任何生产图片、文字、按钮或状态栏。

## 素材缺口

- 无新增生产图片。
- 无新增普通功能图标；优先复用现有项目语义图标。
- 服务号和小程序通知模板ID属于部署配置，不进入素材包。

## 开发边界

- 当前包只覆盖首页任务入口，不重构首页其他模块。
- 主裁判既有手机/PAD页面锁定。
- 任务卡读取真实后端任务，不使用硬编码原型数据。
- 资产包确认前不得修改正式首页页面。
