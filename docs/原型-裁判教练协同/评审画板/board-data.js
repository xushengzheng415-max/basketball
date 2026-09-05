window.BOARD_DATA = {
  version: 3,
  title: '赛小蜂篮球裁判—教练团队协同原型',
  source: '../prototype.html',
  sections: [
    {
      id: 'overview',
      title: '01｜五步启动现场系统',
      description: 'PC只确定主裁判和双方名单；数据管理员一键启动；主教练在各自页面完成助教权限发送。',
      groups: [{
        title: 'PC准备 → 数据管理员启动 → 各角色进入',
        transitions: [
          { from: 'flow-overview', to: 'data-start', label: '主裁判与双方名单完成后进入启动页', enabled: true }
        ],
        nodes: [
          {
            id: 'flow-overview',
            label: '简化后的五步运行流程',
            path: '../screenshots/00-完整运行流程.png',
            type: 'entry',
            sourceQuery: 'screen=flow',
            logic: '入口：产品评审首页。主操作：核对设置主裁判、双方递交名单、数据管理员启动、主教练分权发送、扫码后操作五步流程。关键校验：启动门槛只有主裁判与两队名单三项，不把复杂设置挂在裁判身上。下一站：数据管理员一键启动。'
          },
          {
            id: 'data-start',
            label: '数据管理员一键启动',
            path: '../screenshots/16-PC数据管理员一键启动.png',
            type: 'pc',
            sourceQuery: 'screen=data-start',
            logic: '入口：PC 场次中主裁判已确定、主队名单已提交、客队名单已提交。主操作：数据管理员点击一次启动本场现场系统。关键校验：不配置裁判细项或球队内部助教权限；启动只开放入口，不自动开始计时。下一站：裁判和双方主教练分别收到入口。'
          }
        ]
      }]
    },
    {
      id: 'referee',
      title: '02｜主裁判链路',
      description: '主裁判既有计分板保持不变；正式比赛仅禁用阵容与球员统计，机构内部比赛继续保留。',
      groups: [{
        title: '接受任务 → 现场控制 → 分层核验',
        transitions: [
          { from: 'ref-ready', to: 'ref-live', label: '确认接管官方控制台', enabled: true },
          { from: 'ref-live', to: 'ref-review', label: '确认官方赛果后进入分层核验', enabled: true }
        ],
        nodes: [
          { id: 'ref-ready', label: '裁判核对场次并进入', path: '../screenshots/01-裁判接受任务.png', type: 'referee', sourceQuery: 'screen=referee-ready', logic: '入口：数据管理员启动后，裁判从通知或小程序待办进入。主操作：只核对双方球队、时间和场地，然后一键进入比分/时间/MC控制台。关键校验：不设置名单、助教、数据口径或其他复杂参数。下一站：官方现场控制台。' },
          { id: 'ref-live', label: '既有主裁判比赛控制台（锁定）', path: '../assets/主裁判原版控制台.jpg', type: 'referee', sourceQuery: 'screen=referee-live', logic: '入口：裁判确认接管。主操作：沿用已经完成的比分、时间、节次、犯规、暂停、球权、交换场地、撤销、结束比赛和 MC。关键校验：不得重构页面或改动现有数据；正式比赛禁用“显示阵容”和球员统计，机构内部比赛继续保留这两项功能。下一站：确认官方赛果。' },
          { id: 'ref-review', label: '完整与部分数据分层核验', path: '../screenshots/08-裁判双方数据核验.png', type: 'referee', sourceQuery: 'screen=referee-review', logic: '入口：官方赛果确认且球队主教练提交汇总。主操作：完整得分归属需与官方比分对账；部分统计只确认口径和明显异常，不把缺失当成漏记。关键校验：主客队分别处理。下一站：对应球队数据视图。' }
        ]
      }]
    },
    {
      id: 'head-coach',
      title: '03｜主教练工作方式与任务编排',
      description: '赛前先添加助教，再按数据或球员直接分配；只保留绿色可分配和灰色已分配两种状态。',
      groups: [{
        title: '选择记录方式 → 添加助教 → 分配数据或球员 → 自动通知',
        transitions: [
          { from: 'coach-hub', to: 'coach-add-assistant', label: '选择分给助教，先添加协作人员', enabled: true },
          { from: 'coach-add-assistant', to: 'dispatch-skill', label: '已有助教后进入技能分配', enabled: true },
          { from: 'dispatch-skill', to: 'coach-invite', label: '完成分工并自动通知', enabled: true },
          { from: 'dispatch-skill', to: 'dispatch-player', label: '切换按球员分工', enabled: true },
          { from: 'dispatch-player', to: 'coach-invite', label: '确认球员后自动通知', enabled: true },
          { from: 'coach-invite', to: 'assistant-ready', label: '助教点击自动通知进入任务', enabled: true },
          { from: 'assistant-ready', to: 'assistant-live', label: '助教接受后进入受限数据面板', enabled: true },
          { from: 'assistant-live', to: 'coach-monitor', label: '事件实时汇总给主教练', enabled: true },
          { from: 'coach-monitor', to: 'coach-submit', label: '比赛结束进入整队汇总', enabled: true }
        ],
        nodes: [
          { id: 'coach-hub', label: '主教练选择记录方式', path: '../screenshots/03-主队教练接受任务.png', type: 'mini', sourceQuery: 'screen=coach-ready&side=home', logic: '入口：主教练进入本队页面。选择我自己记、分给助教或不记录；可先进入“添加助教”。' },
          { id: 'coach-add-assistant', label: 'PAD赛前添加助教', path: '../screenshots/31-主教练PAD添加助教.png', type: 'mini', sourceQuery: 'screen=coach-add-assistant&side=home', logic: '先加人再分工。球队已有教练可直接加入；临时助教主入口为转发小程序给微信好友或群，对方确认身份后加入本场。手机号、现场二维码和历史教练收进次级入口。' },
          { id: 'dispatch-skill', label: 'PAD赛前按数据分工', path: '../screenshots/11-主教练统计口径与技能分工.png', type: 'mini', sourceQuery: 'screen=coach-dispatch&side=home', logic: '先点教练，再点绿色数据，系统立即分配并变灰显示负责人；无选择中状态，也不需要二次确认。点击灰色项可取消或改给其他教练。' },
          { id: 'dispatch-player', label: 'PAD赛前按球员分工', path: '../screenshots/12-主教练按球员分工.png', type: 'mini', sourceQuery: 'screen=coach-dispatch-player&side=home', logic: '先点教练，再点绿色球员，系统立即分配并变灰显示负责人。该教练可记录这些球员的全部数据。' },
          { id: 'coach-invite', label: '分工完成并自动通知', path: '../screenshots/17-主教练通知与二维码授权.png', type: 'mini', sourceQuery: 'screen=coach-invite&side=home', logic: '主教练完成分工后系统自动保存并通知已加入助教；待接受的临时助教在接受微信邀请后自动获得对应任务，不再出现第二个二维码或发送权限页面。权限只限本队本场。' },
          { id: 'assistant-ready', label: '助理教练接受专项任务', path: '../screenshots/13-助理教练接受专项任务.png', type: 'mini', sourceQuery: 'screen=assistant-ready&side=home', logic: '入口：主教练分发后由服务号或小程序通知。主操作：查看统计项目、球员范围和数据口径后接受或拒绝。关键校验：任务与其他教练无重叠，权限仅限本队本场。下一站：专项数据录入。' },
          { id: 'assistant-live', label: '助理教练专项数据录入', path: '../screenshots/14-助理教练专项数据录入.png', type: 'mini', sourceQuery: 'screen=assistant-live&side=home', logic: '入口：助教接受任务。主操作：只使用被分配的球员和数据按钮；其他指标锁定并标明负责人或未统计。关键校验：只能撤销本人事件，调整范围需向主教练申请。下一站：事件实时汇总到主教练监控。' },
          { id: 'coach-monitor', label: '主教练助教进度（开赛后只读）', path: '../screenshots/15-主教练多人任务监控.png', type: 'mini', sourceQuery: 'screen=coach-monitor&side=home', logic: '开赛后只查看助教是否在线、负责内容和事件数量；赛前分工已锁定，不能重新分配。下一站：战术板或赛后汇总。' },
          { id: 'coach-self-live', label: '主教练亲自记录模式', path: '../screenshots/04-主队教练球员数据录入.png', type: 'mini', sourceQuery: 'screen=coach-live&side=home', logic: '入口：主教练选择自己记录或共同记录。主操作：选择球员并记录本人负责的指标。关键校验：本人任务仍参与同一覆盖和冲突检查。下一站：任务编排、战术板或赛后汇总。' },
          { id: 'home-tactics', label: '主教练平板战术板', path: '../screenshots/06-教练平板战术板.png', type: 'mini', sourceQuery: 'screen=coach-tactics&side=home', logic: '入口：主教练任意工作方式下点击战术板。主操作：拖动场上 5 人、画路线并保存战术。关键校验：战术内容球队私有，不进入数据任务和官方事件流。返回：恢复原比赛上下文。' },
          { id: 'coach-submit', label: '多人数据整队汇总', path: '../screenshots/07-教练赛后提交检查.png', type: 'mini', sourceQuery: 'screen=coach-submit&side=home', logic: '入口：比赛结束。主操作：主教练查看多人贡献、完整得分对账、重复写入和未统计项目，确认整队版本。关键校验：未选择指标显示“未统计”，完整得分归属才进入裁判强一致核验。下一站：主裁判分层核验。' },
          { id: 'team-data', label: '带统计口径的球队数据视图', path: '../screenshots/09-核验后球队数据视图.png', type: 'closed', sourceQuery: 'screen=team-data', logic: '入口：主教练确认且裁判完成适用范围内的核验。主操作：球队复盘和授权展示。关键校验：展示本场口径、记录人、最终确认人、核验人和版本；未统计不是 0，仍不得自动用于官方 MVP。流程结束。' }
        ]
      }]
    },
    {
      id: 'away-coach',
      title: '04｜客队教练团队对称链路',
      description: '客队可使用相同的主教练 + 最多 5 名助教机制，但任务、事件和战术均与主队隔离。',
      groups: [{
        title: '客队独立数据域',
        transitions: [],
        nodes: [{
          id: 'away-live',
          label: '客队球员数据录入',
          path: '../screenshots/05-客队教练球员数据录入.png',
          type: 'mini',
          sourceQuery: 'screen=coach-live&side=away',
          logic: '入口：客队教练团队接受本队任务。主操作与主队端对称，可设置口径并分发给最多 5 名助教。关键校验：不能查看主队未发布数据或战术；两队提交和核验互不阻塞。下一站：客队主教练汇总与裁判核验。'
        }]
      }]
    },
    {
      id: 'mobile-surfaces',
      title: '05｜手机横屏大字操作面',
      description: '裁判手机横屏继续使用既有控制台并锁定；只评审主教练和助教的新页面。',
      groups: [{
        title: '主裁判手机横屏（既有页面锁定）',
        transitions: [],
        nodes: [{
          id: 'referee-mobile-baseline',
          label: '既有主裁判手机横屏控制台（锁定）',
          path: '../assets/主裁判手机横屏原版控制台.jpg',
          type: 'referee',
          sourceQuery: 'screen=referee-mobile',
          logic: '用户确认该手机横屏控制台已经完成，不修改布局、按钮或数据。正式比赛禁用“显示阵容”和球员统计；机构内部比赛继续保留。'
        }]
      }, {
        title: '赛前：主教练分工与助教绑定（PAD同功能适配）',
        transitions: [
          { from: 'coach-mobile-ready', to: 'coach-mobile-add-assistant', label: '选择分给助教，先添加协作人员', enabled: true },
          { from: 'coach-mobile-add-assistant', to: 'coach-mobile-tasks', label: '已有助教后进入技能分配', enabled: true },
          { from: 'coach-mobile-tasks', to: 'coach-mobile-tasks-player', label: '切换按球员分工', enabled: true },
          { from: 'coach-mobile-tasks', to: 'coach-mobile-invite', label: '完成分工并自动通知', enabled: true },
          { from: 'coach-mobile-invite', to: 'assistant-mobile-ready', label: '助教点击通知进入', enabled: true }
        ],
        nodes: [
          { id: 'coach-mobile-ready', label: '主教练手机横屏工作方式', path: '../screenshots/25-主教练手机工作方式.png', type: 'mini', sourceQuery: 'screen=coach-mobile-ready', logic: '与PAD相同：我自己记、分给助教、不记录三选一，并提供添加助教入口。' },
          { id: 'coach-mobile-add-assistant', label: '主教练手机横屏添加助教', path: '../screenshots/32-主教练手机添加助教.png', type: 'mini', sourceQuery: 'screen=coach-mobile-add-assistant', logic: '与PAD相同：已有教练直接加入；临时助教主入口为转发小程序给微信好友或群，其他方式折叠为次级入口。' },
          { id: 'coach-mobile-tasks', label: '主教练手机横屏赛前按数据分工', path: '../screenshots/21-主教练手机任务管理.png', type: 'mini', sourceQuery: 'screen=coach-mobile-tasks', logic: '与PAD相同：先点教练，再点绿色数据，立即分配并变灰；只保留可分配/已分配两态。' },
          { id: 'coach-mobile-tasks-player', label: '主教练手机横屏赛前按球员分工', path: '../screenshots/30-主教练手机按球员分工.png', type: 'mini', sourceQuery: 'screen=coach-mobile-tasks-player', logic: '与PAD相同：先点教练，再点绿色球员，立即分配并变灰；负责教练可记录这些球员的全部数据。' },
          { id: 'coach-mobile-invite', label: '主教练手机横屏分工完成', path: '../screenshots/26-主教练手机发送权限.png', type: 'mini', sourceQuery: 'screen=coach-mobile-invite', logic: '与PAD相同：分工保存后自动通知已加入助教；待接受助教在接受邀请后自动获得任务，无需再次扫码或发送权限。' },
          { id: 'assistant-mobile-ready', label: '助教手机横屏接受任务', path: '../screenshots/27-助教手机接受任务.png', type: 'mini', sourceQuery: 'screen=assistant-mobile-ready', logic: '与PAD相同：显示统计项目、球员范围、负责人和冲突状态，助教确认后进入专项录入。' }
        ]
      }, {
        title: '比赛中与赛后：主教练 / 助教（PAD同功能适配）',
        transitions: [
          { from: 'coach-mobile-data', to: 'coach-mobile-tactics', label: '切换全屏战术板', enabled: true },
          { from: 'coach-mobile-data', to: 'coach-mobile-monitor', label: '查看助教进度', enabled: true },
          { from: 'coach-mobile-monitor', to: 'coach-mobile-submit', label: '比赛结束进入汇总', enabled: true }
        ],
        nodes: [
          { id: 'coach-mobile-data', label: '主教练手机横屏完整数据录入', path: '../screenshots/19-主教练手机数据录入.png', type: 'mini', sourceQuery: 'screen=coach-mobile', logic: '与PAD使用相同的球员、12项数据按钮、阵容、战术板、事件、任务和汇总入口；仅调整为手机横屏三栏。' },
          { id: 'assistant-mobile-data', label: '助教手机横屏完整专项录入', path: '../screenshots/20-助教手机专项录入.png', type: 'mini', sourceQuery: 'screen=assistant-mobile', logic: '与PAD使用相同的球员、授权按钮、锁定按钮、阵容、事件和任务入口；只允许本人范围写入。' },
          { id: 'coach-mobile-tactics', label: '主教练手机横屏全屏战术板', path: '../screenshots/22-主教练手机战术板.png', type: 'mini', sourceQuery: 'screen=coach-mobile-tactics', logic: '与PAD使用同一球场、同一头像/号码和同一组工具；工具全部悬浮在全屏球场上。' },
          { id: 'coach-mobile-monitor', label: '主教练手机横屏数据进度（只读）', path: '../screenshots/28-主教练手机数据进度.png', type: 'mini', sourceQuery: 'screen=coach-mobile-monitor', logic: '与PAD相同：开赛后只查看助教在线状态、负责内容和事件数，不提供重新分配。' },
          { id: 'coach-mobile-submit', label: '主教练手机横屏赛后汇总', path: '../screenshots/29-主教练手机赛后汇总.png', type: 'mini', sourceQuery: 'screen=coach-mobile-submit', logic: '与PAD相同：显示球员汇总、得分一致、重复检查和未统计口径，确认后提交。' }
        ]
      }]
    }
  ]
};
