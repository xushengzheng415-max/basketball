const screens = {
  "M01": {
    "id": "M01",
    "title": "校区经营工作台",
    "eyebrow": "校区经营",
    "subtitle": "下午好，校区经理",
    "backRoute": "/pages/home/index",
    "backLabel": "返回角色入口",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "本月课消",
        "value": "38,600",
        "suffix": "元",
        "tone": "orange"
      },
      {
        "label": "目标完成",
        "value": "76",
        "suffix": "%",
        "tone": "success"
      },
      {
        "label": "待处理",
        "value": "11",
        "suffix": "项",
        "tone": "danger"
      }
    ],
    "dashboard": {
      "notice": {
        "title": "负责人待办通知",
        "caption": "11 项待处理 · 建议按优先级逐项完成",
        "count": "11",
        "route": "/pages/campus-manager/task-inbox/index"
      },
      "pending": [
        {
          "label": "超时未点名",
          "caption": "查看课程并提醒教练",
          "value": "2",
          "suffix": "节",
          "action": "去处理 ›",
          "taskKey": "courses",
          "tone": "danger",
          "route": "/pages/campus-manager/attendance-overview/index"
        },
        {
          "label": "续费风险学员",
          "caption": "联系家长并记录跟进",
          "value": "4",
          "suffix": "人",
          "action": "去处理 ›",
          "taskKey": "students",
          "tone": "danger",
          "route": "/pages/campus-manager/renewal-risk/index"
        },
        {
          "label": "异常更正",
          "caption": "核验证据后完成审核",
          "value": "3",
          "suffix": "条",
          "action": "去处理 ›",
          "taskKey": "corrections",
          "tone": "orange",
          "route": "/pages/campus-manager/corrections/index"
        }
      ],
      "health": [
        {
          "label": "目标完成",
          "value": "76%",
          "progress": "76%",
          "tone": "orange",
          "route": "/pages/campus-manager/reports/index"
        },
        {
          "label": "点名及时",
          "value": "93%",
          "progress": "93%",
          "tone": "success",
          "route": "/pages/campus-manager/attendance-overview/index"
        },
        {
          "label": "评价完成",
          "value": "82%",
          "progress": "82%",
          "tone": "orange",
          "route": "/pages/campus-manager/execution-index/index"
        }
      ],
      "quick": [
        {
          "symbol": "课",
          "label": "课程总览",
          "caption": "今日 12 节",
          "taskKey": "courses",
          "badge": "2",
          "route": "/pages/campus-manager/courses/index"
        },
        {
          "symbol": "员",
          "label": "学员管理",
          "caption": "在读 168 人",
          "taskKey": "students",
          "badge": "4",
          "route": "/pages/campus-manager/students/index"
        },
        {
          "symbol": "班",
          "label": "班级管理",
          "caption": "活跃 12 个",
          "taskKey": "classes",
          "badge": "",
          "route": "/pages/campus-manager/classes/index"
        },
        {
          "symbol": "排",
          "label": "排课管理",
          "caption": "本周 46 节",
          "taskKey": "schedule",
          "badge": "",
          "route": "/pages/campus-manager/schedule/index"
        },
        {
          "symbol": "包",
          "label": "课程课包",
          "caption": "在售 6 个",
          "taskKey": "packages",
          "badge": "",
          "route": "/pages/campus-manager/packages/index"
        },
        {
          "symbol": "假",
          "label": "请假补课",
          "caption": "本周 3 项",
          "taskKey": "leave",
          "badge": "",
          "route": "/pages/campus-manager/leave/index"
        },
        {
          "symbol": "教",
          "label": "校区员工",
          "caption": "在岗 12 人",
          "taskKey": "staff",
          "badge": "",
          "route": "/pages/campus-manager/staff/index"
        },
        {
          "symbol": "异",
          "label": "异常更正",
          "caption": "待审核 3 条",
          "taskKey": "corrections",
          "badge": "3",
          "route": "/pages/campus-manager/corrections/index"
        }
      ],
      "opportunities": [
        {
          "label": "增长任务",
          "value": "2 项",
          "tone": "success",
          "route": "/pages/campus-manager/growth-tasks/index"
        },
        {
          "label": "家长反馈",
          "value": "3 条",
          "tone": "orange",
          "route": "/pages/campus-manager/parent-service/index"
        },
        {
          "label": "成长内容",
          "value": "8 份",
          "tone": "success",
          "route": "/pages/campus-manager/growth-content/index"
        },
        {
          "label": "转介绍线索",
          "value": "5 条",
          "tone": "orange",
          "route": "/pages/campus-manager/referral-leads/index"
        },
        {
          "label": "平台协助",
          "value": "1 项",
          "tone": "muted",
          "route": "/pages/campus-manager/platform-assist/index"
        }
      ]
    },
    "sections": [
      {
        "title": "今日待处理",
        "caption": "优先处理直接影响经营结果的事项",
        "items": [
          {
            "title": "增长任务中心",
            "meta": "增长运营 · 查看全部数据",
            "value": "2",
            "status": "查看",
            "tone": "success",
            "routeId": "M46",
            "route": "/pages/campus-manager/growth-tasks/index"
          },
          {
            "title": "续费风险中心",
            "meta": "续费管理 · 查看全部数据",
            "value": "4",
            "status": "待处理",
            "tone": "danger",
            "routeId": "M48",
            "route": "/pages/campus-manager/renewal-risk/index"
          },
          {
            "title": "异常更正",
            "meta": "风控审核 · 进入处理流程",
            "value": "6",
            "status": "待处理",
            "tone": "danger",
            "routeId": "M10",
            "route": "/pages/campus-manager/corrections/index"
          }
        ]
      },
      {
        "title": "教务经营",
        "caption": "课程、学员、班级与课包的日常管理",
        "items": [
          {
            "title": "课程总览",
            "meta": "课程运营 · 查看全部数据",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M02",
            "route": "/pages/campus-manager/courses/index"
          },
          {
            "title": "学员管理",
            "meta": "学员经营 · 查看全部数据",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M03",
            "route": "/pages/campus-manager/students/index"
          },
          {
            "title": "班级管理",
            "meta": "班级管理 · 查看全部数据",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M04",
            "route": "/pages/campus-manager/classes/index"
          },
          {
            "title": "排课管理",
            "meta": "排课协同 · 查看全部数据",
            "value": "8",
            "status": "查看",
            "tone": "orange",
            "routeId": "M05",
            "route": "/pages/campus-manager/schedule/index"
          },
          {
            "title": "课程课包",
            "meta": "课程运营 · 查看全部数据",
            "value": "10",
            "status": "查看",
            "tone": "orange",
            "routeId": "M06",
            "route": "/pages/campus-manager/packages/index"
          },
          {
            "title": "请假补课",
            "meta": "请假补课 · 查看全部数据",
            "value": "12",
            "status": "查看",
            "tone": "orange",
            "routeId": "M07",
            "route": "/pages/campus-manager/leave/index"
          }
        ]
      },
      {
        "title": "团队与报表",
        "caption": "查看教练执行和校区经营数据",
        "items": [
          {
            "title": "校区员工",
            "meta": "团队执行 · 查看全部数据",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M08",
            "route": "/pages/campus-manager/staff/index"
          },
          {
            "title": "教务报表",
            "meta": "经营报表 · 查看全部数据",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M09",
            "route": "/pages/campus-manager/reports/index"
          },
          {
            "title": "经营执行指数",
            "meta": "执行质量 · 查看全部数据",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M51",
            "route": "/pages/campus-manager/execution-index/index"
          }
        ]
      },
      {
        "title": "增长机会",
        "caption": "家长服务、内容、转介绍与平台协同",
        "items": [
          {
            "title": "家长服务中心",
            "meta": "家长服务 · 查看全部数据",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M47",
            "route": "/pages/campus-manager/parent-service/index"
          },
          {
            "title": "成长内容中心",
            "meta": "内容增长 · 查看全部数据",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M49",
            "route": "/pages/campus-manager/growth-content/index"
          },
          {
            "title": "转介绍线索",
            "meta": "增长运营 · 查看全部数据",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M50",
            "route": "/pages/campus-manager/referral-leads/index"
          },
          {
            "title": "平台辅助价值",
            "meta": "校区经营 · 查看全部数据",
            "value": "8",
            "status": "查看",
            "tone": "orange",
            "routeId": "M52",
            "route": "/pages/campus-manager/platform-assist/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入课程总览",
        "route": "/pages/campus-manager/courses/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M02": {
    "id": "M02",
    "title": "课程总览",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "课程详情",
            "meta": "课程运营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M02.01",
            "route": "/pages/campus-manager/course-detail/index"
          },
          {
            "title": "点名监督",
            "meta": "课程运营 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M02.02",
            "route": "/pages/campus-manager/attendance-overview/index"
          },
          {
            "title": "调课停课处理",
            "meta": "课程运营 · 进入处理流程",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M02.03",
            "route": "/pages/campus-manager/course-change/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入课程详情",
        "route": "/pages/campus-manager/course-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M03": {
    "id": "M03",
    "title": "学员管理",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "学员详情",
            "meta": "学员经营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M03.01",
            "route": "/pages/campus-manager/student-detail/index"
          },
          {
            "title": "新增编辑学员",
            "meta": "学员经营 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M03.02",
            "route": "/pages/campus-manager/student-edit/index"
          },
          {
            "title": "学员课包与课消",
            "meta": "学员经营 · 进入处理流程",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M03.03",
            "route": "/pages/campus-manager/student-package/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入学员详情",
        "route": "/pages/campus-manager/student-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M04": {
    "id": "M04",
    "title": "班级管理",
    "eyebrow": "班级管理",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "班级详情",
            "meta": "班级管理 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M04.01",
            "route": "/pages/campus-manager/class-detail/index"
          },
          {
            "title": "新建编辑班级",
            "meta": "班级管理 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M04.02",
            "route": "/pages/campus-manager/class-edit/index"
          },
          {
            "title": "班级学员调整",
            "meta": "学员经营 · 进入处理流程",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M04.03",
            "route": "/pages/campus-manager/class-students/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入班级详情",
        "route": "/pages/campus-manager/class-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M05": {
    "id": "M05",
    "title": "排课管理",
    "eyebrow": "排课协同",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "单节排课",
            "meta": "排课协同 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M05.01",
            "route": "/pages/campus-manager/schedule-edit/index"
          },
          {
            "title": "排课冲突处理",
            "meta": "排课协同 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "danger",
            "routeId": "M05.02",
            "route": "/pages/campus-manager/schedule-conflict/index"
          },
          {
            "title": "课程变更记录",
            "meta": "课程运营 · 进入处理流程",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M05.03",
            "route": "/pages/campus-manager/change-records/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入单节排课",
        "route": "/pages/campus-manager/schedule-edit/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M06": {
    "id": "M06",
    "title": "课程课包",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "课包详情",
            "meta": "学员经营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M06.01",
            "route": "/pages/campus-manager/package-detail/index"
          },
          {
            "title": "新建基础课包",
            "meta": "学员经营 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M06.02",
            "route": "/pages/campus-manager/package-edit/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入课包详情",
        "route": "/pages/campus-manager/package-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M07": {
    "id": "M07",
    "title": "请假补课",
    "eyebrow": "请假补课",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "请假审核详情",
            "meta": "请假补课 · 进入处理流程",
            "value": "2",
            "status": "待处理",
            "tone": "orange",
            "routeId": "M07.01",
            "route": "/pages/campus-manager/leave-review/index"
          },
          {
            "title": "补课安排确认",
            "meta": "请假补课 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M07.02",
            "route": "/pages/campus-manager/makeup-confirm/index"
          },
          {
            "title": "代课教练选择",
            "meta": "排课协同 · 进入处理流程",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M07.03",
            "route": "/pages/campus-manager/substitute-coach/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入请假审核详情",
        "route": "/pages/campus-manager/leave-review/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M08": {
    "id": "M08",
    "title": "校区员工",
    "eyebrow": "团队执行",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "教练详情",
            "meta": "团队执行 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M08.01",
            "route": "/pages/campus-manager/coach-detail/index"
          },
          {
            "title": "教练班级分配",
            "meta": "班级管理 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M08.02",
            "route": "/pages/campus-manager/coach-classes/index"
          },
          {
            "title": "邀请状态管理",
            "meta": "团队执行 · 查看全部数据",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M08.03",
            "route": "/pages/campus-manager/invitations/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入教练详情",
        "route": "/pages/campus-manager/coach-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M09": {
    "id": "M09",
    "title": "教务报表",
    "eyebrow": "经营报表",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "本周目标",
        "value": "20",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "当前完成",
        "value": "15",
        "suffix": "项",
        "tone": "success"
      },
      {
        "label": "完成率",
        "value": "75",
        "suffix": "%",
        "tone": "orange"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "报表筛选导出",
            "meta": "经营报表 · 查看全部数据",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M09.01",
            "route": "/pages/campus-manager/report-export/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入报表筛选导出",
        "route": "/pages/campus-manager/report-export/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M10": {
    "id": "M10",
    "title": "异常更正",
    "eyebrow": "风控审核",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "form-action",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "异常详情与证据",
            "meta": "风控审核 · 进入处理流程",
            "value": "2",
            "status": "待处理",
            "tone": "danger",
            "routeId": "M10.01",
            "route": "/pages/campus-manager/anomaly-detail/index"
          },
          {
            "title": "课消出勤更正",
            "meta": "学员经营 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "danger",
            "routeId": "M10.02",
            "route": "/pages/campus-manager/correction-edit/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入异常详情与证据",
        "route": "/pages/campus-manager/anomaly-detail/index",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M46": {
    "id": "M46",
    "title": "增长任务中心",
    "eyebrow": "增长运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "本周目标",
        "value": "20",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "当前完成",
        "value": "15",
        "suffix": "项",
        "tone": "success"
      },
      {
        "label": "完成率",
        "value": "75",
        "suffix": "%",
        "tone": "orange"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "增长任务详情",
            "meta": "增长运营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "success",
            "routeId": "M46.01",
            "route": "/pages/campus-manager/growth-task-detail/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入增长任务详情",
        "route": "/pages/campus-manager/growth-task-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M47": {
    "id": "M47",
    "title": "家长服务中心",
    "eyebrow": "家长服务",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "家长反馈详情",
            "meta": "家长服务 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M47.01",
            "route": "/pages/campus-manager/parent-feedback-detail/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入家长反馈详情",
        "route": "/pages/campus-manager/parent-feedback-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M48": {
    "id": "M48",
    "title": "续费风险中心",
    "eyebrow": "续费管理",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "风险学员详情",
            "meta": "学员经营 · 进入处理流程",
            "value": "2",
            "status": "待处理",
            "tone": "danger",
            "routeId": "M48.01",
            "route": "/pages/campus-manager/risk-student-detail/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入风险学员详情",
        "route": "/pages/campus-manager/risk-student-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M49": {
    "id": "M49",
    "title": "成长内容中心",
    "eyebrow": "内容增长",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "家长成长报告预览",
            "meta": "家长服务 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M49.01",
            "route": "/pages/campus-manager/parent-growth-report/index"
          },
          {
            "title": "班级成长周报预览",
            "meta": "班级管理 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M49.02",
            "route": "/pages/campus-manager/class-growth-report/index"
          },
          {
            "title": "赛事内容发布确认",
            "meta": "内容增长 · 进入处理流程",
            "value": "6",
            "status": "查看",
            "tone": "orange",
            "routeId": "M49.03",
            "route": "/pages/campus-manager/content-publish-confirm/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入家长成长报告预览",
        "route": "/pages/campus-manager/parent-growth-report/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M50": {
    "id": "M50",
    "title": "转介绍线索",
    "eyebrow": "增长运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "转介绍线索详情",
            "meta": "增长运营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M50.01",
            "route": "/pages/campus-manager/referral-lead-detail/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入转介绍线索详情",
        "route": "/pages/campus-manager/referral-lead-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M51": {
    "id": "M51",
    "title": "经营执行指数",
    "eyebrow": "执行质量",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "本周目标",
        "value": "20",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "当前完成",
        "value": "15",
        "suffix": "项",
        "tone": "success"
      },
      {
        "label": "完成率",
        "value": "75",
        "suffix": "%",
        "tone": "orange"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "经营执行指数基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M52": {
    "id": "M52",
    "title": "平台辅助价值",
    "eyebrow": "校区经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/home/index",
    "backLabel": "返回校区经营工作台",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "辅助成交归因详情",
            "meta": "校区经营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M52.01",
            "route": "/pages/campus-manager/assisted-conversion-detail/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入辅助成交归因详情",
        "route": "/pages/campus-manager/assisted-conversion-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M02.01": {
    "id": "M02.01",
    "title": "课程详情",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/courses/index",
    "backLabel": "返回课程总览",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "U10 提高班",
            "meta": "浦东校区 · 1号场 · 周四 18:30",
            "value": "18人",
            "status": "进行中",
            "tone": "success",
            "route": ""
          },
          {
            "title": "主教练",
            "meta": "李教练 · 本月已完成 8 节",
            "value": "96%",
            "status": "出勤率",
            "tone": "orange",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M02.02": {
    "id": "M02.02",
    "title": "点名监督",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/courses/index",
    "backLabel": "返回课程总览",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "今日课程",
        "value": "12",
        "suffix": "节",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "10",
        "suffix": "节",
        "tone": "success"
      },
      {
        "label": "待点名",
        "value": "2",
        "suffix": "节",
        "tone": "danger"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "超时未点名",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "U10 提高班",
            "meta": "浦东校区 · 1号场 · 18:30 已开课",
            "value": "超时15分钟",
            "status": "提醒教练",
            "tone": "danger",
            "routeId": "M02.02.01",
            "route": "/pages/campus-manager/attendance-detail/index"
          },
          {
            "title": "U8 精英班",
            "meta": "浦东校区 · 2号场 · 19:00 已开课",
            "value": "超时8分钟",
            "status": "提醒教练",
            "tone": "orange",
            "routeId": "M02.02.01",
            "route": "/pages/campus-manager/attendance-detail/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "提醒全部待点名教练",
        "toast": "提醒已发送",
        "style": "primary"
      },
      {
        "label": "进入单课点名详情",
        "route": "/pages/campus-manager/attendance-detail/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M02.03": {
    "id": "M02.03",
    "title": "调课停课处理",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/courses/index",
    "backLabel": "返回课程总览",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "调课确认与通知",
            "meta": "课程运营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M02.03.01",
            "route": "/pages/campus-manager/reschedule-confirm/index"
          },
          {
            "title": "停课确认与通知",
            "meta": "课程运营 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M02.03.02",
            "route": "/pages/campus-manager/cancel-confirm/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入调课确认与通知",
        "route": "/pages/campus-manager/reschedule-confirm/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M03.01": {
    "id": "M03.01",
    "title": "学员详情",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/students/index",
    "backLabel": "返回学员管理",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "张宇轩",
            "meta": "U10 提高班 · 学龄 3 年",
            "value": "32节",
            "status": "剩余课时",
            "tone": "success",
            "route": ""
          },
          {
            "title": "家长联系方式",
            "meta": "138****5168 · 已绑定家长端",
            "value": "正常",
            "status": "关系状态",
            "tone": "orange",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M03.02": {
    "id": "M03.02",
    "title": "新增编辑学员",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/students/index",
    "backLabel": "返回学员管理",
    "layoutKind": "form-action",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "新增学员基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "保存修改",
        "toast": "修改已保存",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M03.03": {
    "id": "M03.03",
    "title": "学员课包与课消",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/students/index",
    "backLabel": "返回学员管理",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "分班确认",
            "meta": "校区经营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M03.03.01",
            "route": "/pages/campus-manager/class-assign-confirm/index"
          },
          {
            "title": "课消记录详情",
            "meta": "学员经营 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "orange",
            "routeId": "M03.03.02",
            "route": "/pages/campus-manager/consumption-detail/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入分班确认",
        "route": "/pages/campus-manager/class-assign-confirm/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M04.01": {
    "id": "M04.01",
    "title": "班级详情",
    "eyebrow": "班级管理",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/classes/index",
    "backLabel": "返回班级管理",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "班级基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M04.02": {
    "id": "M04.02",
    "title": "新建编辑班级",
    "eyebrow": "班级管理",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/classes/index",
    "backLabel": "返回班级管理",
    "layoutKind": "form-action",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "新建班级基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "保存修改",
        "toast": "修改已保存",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M04.03": {
    "id": "M04.03",
    "title": "班级学员调整",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/classes/index",
    "backLabel": "返回班级管理",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "班级学员调整基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M05.01": {
    "id": "M05.01",
    "title": "单节排课",
    "eyebrow": "排课协同",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/schedule/index",
    "backLabel": "返回排课管理",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "单节排课基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M05.02": {
    "id": "M05.02",
    "title": "排课冲突处理",
    "eyebrow": "排课协同",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/schedule/index",
    "backLabel": "返回排课管理",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "排课冲突处理基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M05.03": {
    "id": "M05.03",
    "title": "课程变更记录",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/schedule/index",
    "backLabel": "返回排课管理",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "课程变更基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M06.01": {
    "id": "M06.01",
    "title": "课包详情",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/packages/index",
    "backLabel": "返回课程课包",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "课包基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M06.02": {
    "id": "M06.02",
    "title": "新建基础课包",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/packages/index",
    "backLabel": "返回课程课包",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "课包上下架确认",
            "meta": "学员经营 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M06.02.01",
            "route": "/pages/campus-manager/package-status-confirm/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入课包上下架确认",
        "route": "/pages/campus-manager/package-status-confirm/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M07.01": {
    "id": "M07.01",
    "title": "请假审核详情",
    "eyebrow": "请假补课",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/leave/index",
    "backLabel": "返回请假补课",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "审核驳回原因",
            "meta": "校区经营 · 进入处理流程",
            "value": "2",
            "status": "待处理",
            "tone": "orange",
            "routeId": "M07.01.01",
            "route": "/pages/campus-manager/review-reject/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入审核驳回原因",
        "route": "/pages/campus-manager/review-reject/index",
        "style": "primary"
      },
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M07.02": {
    "id": "M07.02",
    "title": "补课安排确认",
    "eyebrow": "请假补课",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/leave/index",
    "backLabel": "返回请假补课",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "补课结果通知",
            "meta": "请假补课 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M07.02.01",
            "route": "/pages/campus-manager/makeup-result/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入补课结果通知",
        "route": "/pages/campus-manager/makeup-result/index",
        "style": "primary"
      },
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M07.03": {
    "id": "M07.03",
    "title": "代课教练选择",
    "eyebrow": "排课协同",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/leave/index",
    "backLabel": "返回请假补课",
    "layoutKind": "form-action",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "代课教练选择基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M08.01": {
    "id": "M08.01",
    "title": "教练详情",
    "eyebrow": "团队执行",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/staff/index",
    "backLabel": "返回校区员工",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "李教练",
            "meta": "篮球主教练 · 在岗 3 年",
            "value": "96%",
            "status": "执行指数",
            "tone": "success",
            "route": ""
          },
          {
            "title": "本月课程",
            "meta": "已完成 28 节 · 待完成 6 节",
            "value": "34节",
            "status": "课程总数",
            "tone": "orange",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入权限与数据范围",
        "route": "/pages/campus-manager/permissions/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M08.02": {
    "id": "M08.02",
    "title": "教练班级分配",
    "eyebrow": "班级管理",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/staff/index",
    "backLabel": "返回校区员工",
    "layoutKind": "form-action",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "教练班级分配基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M08.03": {
    "id": "M08.03",
    "title": "邀请状态管理",
    "eyebrow": "团队执行",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/staff/index",
    "backLabel": "返回校区员工",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "邀请状态基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M09.01": {
    "id": "M09.01",
    "title": "报表筛选导出",
    "eyebrow": "经营报表",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/reports/index",
    "backLabel": "返回教务报表",
    "layoutKind": "overview-list",
    "metrics": [
      {
        "label": "本周目标",
        "value": "20",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "当前完成",
        "value": "15",
        "suffix": "项",
        "tone": "success"
      },
      {
        "label": "完成率",
        "value": "75",
        "suffix": "%",
        "tone": "orange"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "导出任务记录",
            "meta": "经营报表 · 进入处理流程",
            "value": "2",
            "status": "查看",
            "tone": "orange",
            "routeId": "M09.01.01",
            "route": "/pages/campus-manager/export-jobs/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入导出任务记录",
        "route": "/pages/campus-manager/export-jobs/index",
        "style": "primary"
      },
      {
        "label": "创建导出任务",
        "toast": "导出任务已创建",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M10.01": {
    "id": "M10.01",
    "title": "异常详情与证据",
    "eyebrow": "风控审核",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/corrections/index",
    "backLabel": "返回异常更正",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "异常与证据基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M10.02": {
    "id": "M10.02",
    "title": "课消出勤更正",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/corrections/index",
    "backLabel": "返回异常更正",
    "layoutKind": "form-action",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "更正审核",
            "meta": "风控审核 · 进入处理流程",
            "value": "2",
            "status": "待处理",
            "tone": "danger",
            "routeId": "M10.02.01",
            "route": "/pages/campus-manager/correction-review/index"
          },
          {
            "title": "更正记录详情",
            "meta": "风控审核 · 进入处理流程",
            "value": "4",
            "status": "查看",
            "tone": "danger",
            "routeId": "M10.02.02",
            "route": "/pages/campus-manager/correction-record/index"
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入更正审核",
        "route": "/pages/campus-manager/correction-review/index",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M46.01": {
    "id": "M46.01",
    "title": "增长任务详情",
    "eyebrow": "增长运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/growth-tasks/index",
    "backLabel": "返回增长任务中心",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "本周目标",
        "value": "20",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "当前完成",
        "value": "15",
        "suffix": "项",
        "tone": "success"
      },
      {
        "label": "完成率",
        "value": "75",
        "suffix": "%",
        "tone": "orange"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "增长任务基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M47.01": {
    "id": "M47.01",
    "title": "家长反馈详情",
    "eyebrow": "家长服务",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/parent-service/index",
    "backLabel": "返回家长服务中心",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "家长反馈基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M48.01": {
    "id": "M48.01",
    "title": "风险学员详情",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/renewal-risk/index",
    "backLabel": "返回续费风险中心",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "功能入口",
        "caption": "点击卡片进入对应业务页面",
        "items": [
          {
            "title": "张宇轩",
            "meta": "剩余 6 节 · 近 14 天到课下降",
            "value": "高风险",
            "status": "需本周跟进",
            "tone": "danger",
            "route": ""
          },
          {
            "title": "最近联系",
            "meta": "07-16 电话未接通",
            "value": "2天前",
            "status": "跟进记录",
            "tone": "orange",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "进入续费跟进记录",
        "route": "/pages/campus-manager/renewal-followup/index",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M49.01": {
    "id": "M49.01",
    "title": "家长成长报告预览",
    "eyebrow": "家长服务",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/growth-content/index",
    "backLabel": "返回成长内容中心",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "家长成长报告预览基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M49.02": {
    "id": "M49.02",
    "title": "班级成长周报预览",
    "eyebrow": "班级管理",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/growth-content/index",
    "backLabel": "返回成长内容中心",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "班级成长周报预览基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M49.03": {
    "id": "M49.03",
    "title": "赛事内容发布确认",
    "eyebrow": "内容增长",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/growth-content/index",
    "backLabel": "返回成长内容中心",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "赛事内容发布基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      },
      {
        "label": "确认发布",
        "toast": "已进入发布队列",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M50.01": {
    "id": "M50.01",
    "title": "转介绍线索详情",
    "eyebrow": "增长运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/referral-leads/index",
    "backLabel": "返回转介绍线索",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "转介绍线索基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M52.01": {
    "id": "M52.01",
    "title": "辅助成交归因详情",
    "eyebrow": "校区经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/platform-assist/index",
    "backLabel": "返回平台辅助价值",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "辅助成交归因基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M02.02.01": {
    "id": "M02.02.01",
    "title": "单课点名详情",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/attendance-overview/index",
    "backLabel": "返回点名监督",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "应到",
        "value": "18",
        "suffix": "人",
        "tone": "muted"
      },
      {
        "label": "已到",
        "value": "16",
        "suffix": "人",
        "tone": "success"
      },
      {
        "label": "请假",
        "value": "1",
        "suffix": "人",
        "tone": "orange"
      },
      {
        "label": "缺勤",
        "value": "1",
        "suffix": "人",
        "tone": "danger"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "学员点名状态",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "张宇轩",
            "meta": "学员编号 S2026016",
            "value": "已到",
            "status": "正常",
            "tone": "success",
            "route": ""
          },
          {
            "title": "李浩然",
            "meta": "学员编号 S2026017",
            "value": "已到",
            "status": "正常",
            "tone": "success",
            "route": ""
          },
          {
            "title": "周子墨",
            "meta": "事假 · 家中有事",
            "value": "请假",
            "status": "已核验",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "赵梓涵",
            "meta": "未到校 · 待联系家长",
            "value": "缺勤",
            "status": "异常",
            "tone": "danger",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "提醒教练",
        "toast": "点名提醒已发送",
        "style": "secondary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M02.03.01": {
    "id": "M02.03.01",
    "title": "调课确认与通知",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/course-change/index",
    "backLabel": "返回调课停课处理",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "调课与通知基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M02.03.02": {
    "id": "M02.03.02",
    "title": "停课确认与通知",
    "eyebrow": "课程运营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/course-change/index",
    "backLabel": "返回调课停课处理",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "停课与通知基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M03.03.01": {
    "id": "M03.03.01",
    "title": "分班确认",
    "eyebrow": "校区经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/student-package/index",
    "backLabel": "返回学员课包与课消",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "分班基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M03.03.02": {
    "id": "M03.03.02",
    "title": "课消记录详情",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/student-package/index",
    "backLabel": "返回学员课包与课消",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "课消基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M06.02.01": {
    "id": "M06.02.01",
    "title": "课包上下架确认",
    "eyebrow": "学员经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/package-edit/index",
    "backLabel": "返回新建基础课包",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "课包上下架基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M07.01.01": {
    "id": "M07.01.01",
    "title": "审核驳回原因",
    "eyebrow": "校区经营",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/leave-review/index",
    "backLabel": "返回请假审核详情",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "驳回原因基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M07.02.01": {
    "id": "M07.02.01",
    "title": "补课结果通知",
    "eyebrow": "请假补课",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/makeup-confirm/index",
    "backLabel": "返回补课安排确认",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "补课结果通知基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M08.01.01": {
    "id": "M08.01.01",
    "title": "权限与数据范围",
    "eyebrow": "团队执行",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/coach-detail/index",
    "backLabel": "返回教练详情",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "权限与数据范围基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M08.01.02": {
    "id": "M08.01.02",
    "title": "教练操作日志",
    "eyebrow": "团队执行",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/coach-detail/index",
    "backLabel": "返回教练详情",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "全部",
        "value": "24",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "进行中",
        "value": "7",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "已完成",
        "value": "17",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "教练操作日志基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M09.01.01": {
    "id": "M09.01.01",
    "title": "导出任务记录",
    "eyebrow": "经营报表",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/report-export/index",
    "backLabel": "返回报表筛选导出",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "当前状态",
        "value": "处理中",
        "suffix": "",
        "tone": "orange"
      },
      {
        "label": "责任人",
        "value": "王校长",
        "suffix": "",
        "tone": "muted"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "导出任务基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "创建导出任务",
        "toast": "导出任务已创建",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  },
  "M10.02.01": {
    "id": "M10.02.01",
    "title": "更正审核",
    "eyebrow": "风控审核",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/correction-edit/index",
    "backLabel": "返回课消出勤更正",
    "layoutKind": "review-confirm",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "更正基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "确认提交",
        "toast": "操作已确认",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M10.02.02": {
    "id": "M10.02.02",
    "title": "更正记录详情",
    "eyebrow": "风控审核",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/correction-edit/index",
    "backLabel": "返回课消出勤更正",
    "layoutKind": "form-action",
    "metrics": [
      {
        "label": "待处理",
        "value": "3",
        "suffix": "项",
        "tone": "danger"
      },
      {
        "label": "今日新增",
        "value": "2",
        "suffix": "项",
        "tone": "orange"
      },
      {
        "label": "处理完成",
        "value": "8",
        "suffix": "项",
        "tone": "success"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "更正基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "涉及审核、权限或数据更正的操作都会保留完整记录。"
  },
  "M48.01.01": {
    "id": "M48.01.01",
    "title": "续费跟进记录",
    "eyebrow": "续费管理",
    "subtitle": "浦东校区 · 今日经营视图",
    "backRoute": "/pages/campus-manager/risk-student-detail/index",
    "backLabel": "返回风险学员详情",
    "layoutKind": "detail-record",
    "metrics": [
      {
        "label": "本周目标",
        "value": "20",
        "suffix": "项",
        "tone": "muted"
      },
      {
        "label": "当前完成",
        "value": "15",
        "suffix": "项",
        "tone": "success"
      },
      {
        "label": "完成率",
        "value": "75",
        "suffix": "%",
        "tone": "orange"
      }
    ],
    "dashboard": null,
    "sections": [
      {
        "title": "业务信息",
        "caption": "信息仅用于原型联调，后续接入正式接口",
        "items": [
          {
            "title": "续费跟进基本信息",
            "meta": "浦东校区 · 数据更新于今天 10:35",
            "value": "正常",
            "status": "当前状态",
            "tone": "success",
            "route": ""
          },
          {
            "title": "负责人及协同",
            "meta": "王校长 · 李教练",
            "value": "2人",
            "status": "协作成员",
            "tone": "orange",
            "route": ""
          },
          {
            "title": "操作说明",
            "meta": "所有变更将保留记录，可在上级页面查看",
            "value": "已记录",
            "status": "数据留痕",
            "tone": "muted",
            "route": ""
          }
        ]
      }
    ],
    "actions": [
      {
        "label": "完成本页处理",
        "toast": "已记录本次处理",
        "style": "primary"
      }
    ],
    "note": "当前为校区负责人原型数据，页面结构与交互路径已按最终链路接入。"
  }
};

function getScreen(id) {
  return screens[id] || screens.M01;
}

module.exports = { getScreen, screens };
