# 赛小蜂篮球裁判—双方主教练协同原型

本目录用于评审“主裁判控制官方比分、比赛时间与 MC；双方主教练分别管理本队球员数据，可亲自记录或分发给最多 5 名助理教练，并在平板端使用战术板”的完整运行流程。

## 查看方式

在项目根目录启动静态服务：

```powershell
python -m http.server 5175
```

浏览器打开：

```text
http://127.0.0.1:5175/docs/原型-裁判教练协同/prototype.html?screen=flow
```

可用原型页面：

- `screen=flow`：统一平台完整运行流程；
- `screen=data-start`：PC 前置条件完成后由现场数据管理员一键启动；
- `screen=referee-ready`：裁判接受与接管任务；
- `screen=referee-live`：裁判比分、时间与 MC 控制台；
- `screen=coach-ready&side=home|away`：主队/客队教练接受统计任务；
- `screen=coach-dispatch&side=home|away`：主教练选择统计口径并按技能分工；
- `screen=coach-dispatch-player&side=home|away`：主教练按球员分组或规划混合分工；
- `screen=coach-invite&side=home|away`：主教练通过服务号通知、链接或二维码发送助教权限；
- `screen=assistant-ready&side=home|away`：助理教练查看并接受专项任务；
- `screen=assistant-live&side=home|away`：助理教练使用受限的数据录入面板；
- `screen=coach-monitor&side=home|away`：主教练实时监控、收回或转交任务；
- `screen=coach-mobile`：主教练手机横屏数据录入；
- `screen=assistant-mobile`：助教手机横屏专项录入；
- `screen=coach-mobile-ready`：主教练手机横屏工作方式；
- `screen=coach-add-assistant`：主教练PAD赛前添加助教；
- `screen=coach-mobile-add-assistant`：主教练手机横屏添加助教；
- `screen=coach-mobile-tasks`：主教练手机横屏任务页；
- `screen=coach-mobile-tasks-player`：主教练手机横屏按球员分工；
- `screen=coach-mobile-invite`：主教练手机横屏发送权限；
- `screen=assistant-mobile-ready`：助教手机横屏接受任务；
- `screen=coach-mobile-monitor`：主教练手机横屏数据进度；
- `screen=coach-mobile-submit`：主教练手机横屏赛后汇总；
- `screen=coach-mobile-tactics`：主教练手机横屏战术板；
- `screen=coach-live&side=home|away`：主队/客队球员数据录入；
- `screen=coach-tactics&side=home|away`：平板战术板；
- `screen=coach-submit&side=home|away`：赛后自动检查与提交；
- `screen=referee-review`：裁判分队核验；
- `screen=team-data`：核验后的统一平台球队数据视图。

## 当前边界

- 这是原型阶段，不是正式小程序页面代码。
- 官方比分、时间、节次与 MC 只由主裁判写入。
- 主裁判既有控制台以 `assets/主裁判原版控制台.jpg` 为锁定基准，不重构现有计分、时间、节次、犯规、暂停、球权、撤销、结束比赛和 MC。
- 正式比赛禁用主裁判端“显示阵容”和球员统计；机构内部比赛继续保留，底层功能与历史数据不删除。
- PC 启动现场系统前只检查主裁判、主队名单、客队名单三项；数据管理员一键启动后，不再让主裁判配置复杂参数。
- 双方教练只操作本队数据，可选择本场不记录。
- 每队主教练最多邀请 5 名助理教练协作；主教练不占助教名额，并始终保留配置、收回和最终提交权。
- 统计口径可自选，主流程按数据或按球员分工；自定义高级分工作为次级入口。同一“球员×指标”只有一个主负责人。
- 主分工方式统一为按数据分和按球员分：按数据分时教练负责全队指定数据，按球员分时教练负责指定球员的全部数据。
- 分配状态只保留绿色可分和灰色已分。先点教练，再点绿色数据或球员即直接分配并变灰，不需要确认选择。
- 助教可从球队已有教练直接加入，也可通过手机号、服务号、二维码、邀请链接或历史比赛临时邀请。
- 权限分配只允许赛前操作，分配页不显示比分、比赛时间或节次；开赛后分工自动锁定，只能查看进度。
- 未选择的指标显示“未统计”，不得按 0 处理；只有完整得分归属需要与官方比分严格一致。
- 战术板内容属于球队私有，不进入官方比赛事件，也不向裁判、对手或主办方公开。
- 主教练与助教的手机/PAD横屏使用同一页面结构、数据项、按钮和权限，只做响应式适配，不把手机端做成删减版。主裁判继续使用既有控制台。
- 战术板手机/PAD均采用全屏球场和悬浮工具条，工具集合完全一致。
- 战术板球场底图使用用户提供的 `assets/球场版面.png`；本方球员使用头像并附球衣号码，对方使用圆形加号码。
- 教练自录数据通过核验后进入统一数据库，但不得自动用于官方 MVP 等个人奖项。
- 收费、定价和任务收益不在本轮原型范围内。
