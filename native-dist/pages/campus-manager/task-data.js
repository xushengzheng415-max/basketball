const STORAGE_KEY = 'sxf_manager_task_progress_v1';

const TASK_GROUPS = [
  {
    id: 'attendance-overdue',
    taskKey: 'courses',
    title: '超时未点名课程',
    description: '2 节课程已开课但尚未完成点名，可能影响课消与家长通知。',
    count: 2,
    unit: '节',
    priority: '高优先',
    priorityClass: 'urgent',
    route: '/pages/campus-manager/attendance-overview/index',
    steps: ['查看超时课程与负责教练', '发送点名提醒并确认接收', '复核点名结果与异常学员']
  },
  {
    id: 'renewal-risk',
    taskKey: 'students',
    title: '续费风险学员跟进',
    description: '4 名学员剩余课时较少或近期到课下降，需要完成家长跟进。',
    count: 4,
    unit: '人',
    priority: '高优先',
    priorityClass: 'urgent',
    route: '/pages/campus-manager/renewal-risk/index',
    steps: ['核对风险原因与历史记录', '联系家长并确认沟通结果', '记录跟进结论与下一次提醒']
  },
  {
    id: 'correction-review',
    taskKey: 'corrections',
    title: '课消出勤异常更正',
    description: '3 条更正申请等待负责人核验证据并完成审核。',
    count: 3,
    unit: '条',
    priority: '今日完成',
    priorityClass: 'warning',
    route: '/pages/campus-manager/corrections/index',
    steps: ['查看原始点名与更正证据', '确认课消和出勤影响范围', '通过或退回申请并填写说明']
  },
  {
    id: 'report-unread',
    taskKey: 'reports',
    title: '经营报告待确认',
    description: '2 份日报已生成，需确认异常指标和负责人安排。',
    count: 2,
    unit: '份',
    priority: '本日处理',
    priorityClass: 'normal',
    route: '/pages/campus-manager/reports/index',
    steps: ['阅读核心经营指标与异常项', '分配需要跟进的责任人', '确认报告并完成经营记录']
  }
];

function getProgressMap() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  } catch (error) {
    console.warn('[campus-manager] read task progress failed', error);
    return {};
  }
}

function saveProgressMap(progressMap) {
  try {
    wx.setStorageSync(STORAGE_KEY, progressMap);
  } catch (error) {
    console.warn('[campus-manager] save task progress failed', error);
  }
}

function normalizeProgress(task, value) {
  const progress = Number(value) || 0;
  return Math.max(0, Math.min(task.steps.length, progress));
}

function decorateTask(task, progressMap) {
  const progress = normalizeProgress(task, progressMap[task.id]);
  const completed = progress >= task.steps.length;
  const steps = task.steps.map((label, index) => {
    let statusClass = 'pending';
    let statusText = '待完成';
    if (index < progress) {
      statusClass = 'complete';
      statusText = '已完成';
    } else if (index === progress && !completed) {
      statusClass = 'current';
      statusText = '当前步骤';
    }
    return { label, order: index + 1, statusClass, statusText };
  });
  return Object.assign({}, task, {
    progress,
    completed,
    completedClass: completed ? 'completed' : '',
    buttonClass: completed ? 'disabled' : '',
    stateText: completed ? '已完成' : '第 ' + (progress + 1) + '/' + task.steps.length + ' 步',
    actionText: completed ? '该项已完成' : '完成当前步骤',
    steps
  });
}

function getTasks() {
  const progressMap = getProgressMap();
  return TASK_GROUPS.map((task) => decorateTask(task, progressMap));
}

function getTaskSummary() {
  const tasks = getTasks();
  const badges = {};
  let pendingCount = 0;
  let completedCount = 0;
  tasks.forEach((task) => {
    if (task.taskKey && typeof badges[task.taskKey] !== 'number') badges[task.taskKey] = 0;
    if (task.completed) {
      completedCount += task.count;
      return;
    }
    pendingCount += task.count;
    if (task.taskKey) badges[task.taskKey] = (badges[task.taskKey] || 0) + task.count;
  });
  const totalCount = pendingCount + completedCount;
  const progressPercent = totalCount ? Math.round(completedCount * 100 / totalCount) : 100;
  return { tasks, badges, pendingCount, completedCount, totalCount, progressPercent, progressWidth: progressPercent + '%' };
}

function advanceTask(taskId) {
  const task = TASK_GROUPS.find((item) => item.id === taskId);
  if (!task) return null;
  const progressMap = getProgressMap();
  const current = normalizeProgress(task, progressMap[taskId]);
  progressMap[taskId] = Math.min(task.steps.length, current + 1);
  saveProgressMap(progressMap);
  return decorateTask(task, progressMap);
}

module.exports = {
  STORAGE_KEY,
  TASK_GROUPS,
  advanceTask,
  getTasks,
  getTaskSummary
};
