# CSDN 发布包｜微信小程序篮球计分板实战：计时、暂停和撤销怎么设计

**发布信息**

- 状态：待用户登录 CSDN 后手动发布
- 建议标题：微信小程序篮球计分板实战：计时、暂停和撤销怎么设计
- 摘要：篮球计分板真正难处理的不是按钮布局，而是比赛时间、暂停、得分事件和撤销操作之间的一致性。本文结合一个微信小程序计分板的实现，拆解正计时/倒计时、前后台恢复、暂停联动和快照撤销的设计方法。

- 分类：微信小程序
- 标签：微信小程序、JavaScript、篮球计分、状态管理、前端开发

- 原创说明：内容根据赛小蜂篮球项目当前计分板实现重新整理，示例代码为便于阅读的简化版本。
- 封面建议：使用 CSDN 默认技术类封面，或在后台选择无版权争议的篮球计分板示意图。

- AI 声明提醒：如果发布页要求声明创作方式，请按平台实际选项如实标注“AI 辅助创作”。
- 评论：建议开启
- 官网链接：正文仅保留 1 个，指向对应的现场计分指南

---

# 微信小程序篮球计分板实战：计时、暂停和撤销怎么设计

做篮球计分板时，最容易被低估的是状态一致性。

比分加减并不难，真正容易出错的是这些场景：计时正在运行时用户切到后台；记录暂停后，主计时和进攻计时没有一起停；误点一次两分球，撤销后总分恢复了，但节比分和操作记录没有恢复。

如果只围绕页面按钮写逻辑，功能越加越难维护。更稳妥的做法，是先把比赛状态、计时器和业务事件分开。

## 计时显示不是状态源

计分板通常需要保存以下字段：

```js
const matchState = {
  timerMode: 'down',   // down：倒计时；up：正计时
  clockSeconds: 600,
  clockRunning: false,
  period: 1,
  homeScore: 0,
  awayScore: 0,
  events: []
}
```

页面上的 `10:00` 只是 `clockSeconds` 的格式化结果，不应成为业务状态。切换正计时和倒计时时，也只需要重置秒数：

```js
function resetClock(mode, periodMinutes) {
  return mode === 'down' ? periodMinutes * 60 : 0
}

function stepClock(mode, seconds) {
  return mode === 'down'
    ? Math.max(0, seconds - 1)
    : seconds + 1
}
```

这样，显示格式、节次设置和比赛结果保存都围绕同一份秒数工作，不必从文本中反向解析时间。

## 不要假设 setInterval 永远准时

小程序进入后台后，定时器可能暂停或延迟。如果重新显示页面时继续沿用离开前的数值，比赛时间就会少走一段。

处理方法是：页面隐藏时记下时间戳和运行状态，并停止定时器；页面恢复时计算实际经过的秒数。

```js
onHide() {
  this.hiddenAt = Date.now()
  this.clockWasRunning = this.data.clockRunning
  this.stopClock()
},

onShow() {
  if (!this.hiddenAt || !this.clockWasRunning) return

  const elapsed = Math.floor(
    (Date.now() - this.hiddenAt) / 1000
  )

  const next = this.data.timerMode === 'down'
    ? Math.max(0, this.data.clockSeconds - elapsed)
    : this.data.clockSeconds + elapsed

  this.setData({ clockSeconds: next })
  this.startClock()
}
```

倒计时恢复到零时，不应再次启动定时器，而应直接进入本节结束处理。进攻计时也要使用同样的恢复规则，并且不能越过主计时的结束点。

## 暂停不是弹出一个对话框

一次球队暂停至少包含四个动作：

- 增加该队暂停次数；
- 写入一条带节次和时间的比赛事件；
- 停止主计时；
- 停止进攻计时。

这四步应放在同一个业务入口里。只显示“已暂停”的弹窗，却忘记停止其中一个计时器，现场记录很快就会对不上。

```js
function handleTeamTimeout(side) {
  saveUndoSnapshot('暂停')
  increaseTimeoutCount(side)
  appendEvent({
    period: state.period,
    time: getEventTime(),
    team: side,
    action: '暂停'
  })
  stopMainClock()
  stopShotClock()
}
```

是否继续读秒、是否播放暂停音乐，可以交给后续交互确认。比赛状态先停稳，再处理声音和提示，业务逻辑会清楚很多。

## 撤销要恢复一组关联状态

误点得分时，只把总分减回去并不够。一次得分可能同时改变总分、单节比分、球员得分和最近操作。

简单可靠的方式，是在执行可撤销操作前保存快照：

```js
function pushUndoSnapshot(label) {
  undoStack.push({
    label,
    data: {
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      periodScores: clone(state.periodScores),
      playerStats: clone(state.playerStats),
      events: clone(state.events)
    }
  })

  undoStack = undoStack.slice(-30)
}

function undoLastAction() {
  const snapshot = undoStack.pop()
  if (!snapshot) return

  restoreState(snapshot.data)
  saveMatchRecord()
}
```

快照只保存会被本次操作修改的字段。实时比赛时间通常不跟随一次比分撤销回退，否则用户撤销两分球时，计时也可能跳回几秒前。

如果后续需要多人协同记录或云端审计，可以把快照升级为命令模式：每次操作保存动作类型、前值、后值、操作者和时间，再为每类动作编写对应的逆操作。

**操作记录要能回答“为什么变成这样”**

最近操作不能只显示“主队 +2”。更有用的事件结构包括：

```js
{
  id: 'event-id',
  period: 2,
  time: '03:18',
  team: '主队',
  action: '#7 李明 得分 +2',
  score: '36-31'
}
```

这条记录能帮助现场人员确认三件事：发生在哪一节、当时比赛时间是多少、操作后的比分是多少。出现争议时，也能快速定位需要撤销或核对的动作。

## 上线前至少测试这些场景

1. 正计时和倒计时分别运行、暂停、恢复、归零。
2. 计时过程中切后台十秒，再返回前台。
3. 记录球队暂停后，主计时和进攻计时是否同时停止。
4. 连续记录两分、犯规和换人，再逐次撤销。
5. 撤销栈为空时是否给出明确提示。
6. 一节结束时是否阻止重复蜂鸣和重复结算。
7. 页面退出或比赛结束时，最后状态是否已经保存。

篮球计分板不是单纯的数字面板。把时间当作独立状态，把暂停当作完整业务动作，把撤销设计成关联状态恢复，后续增加节次、犯规、球员统计和赛果保存时会更容易控制。

完整的现场操作顺序可参考：[篮球比赛现场计分指南](https://54football.top/guides/basketball-scoring.html)。

---

**发布前人工检查**

- [ ] CSDN 标题与正文标题一致
- [ ] 代码块显示正常，没有被转成普通文本
- [ ] 正文仅有一个站外链接，且能打开正式域名
- [ ] 分类选择“微信小程序”或最接近的技术分类
- [ ] 标签不超过平台允许数量
- [ ] 按平台要求如实选择原创和 AI 辅助声明
- [ ] 预览首段、末段和移动端代码换行
- [ ] 发布后复制公开 URL，回填外链台账
