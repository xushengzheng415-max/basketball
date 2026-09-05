(() => {
  "use strict";
  const API =
      "https://sxf-basketball-d9gp6yt0rd1f7be4d.service.tcloudbase.com/api/education",
    SESSION_KEY = "sxf_pc_organization_session_v2";
  const params = new URLSearchParams(location.search),
    cached = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  const state = {
    organizationId:
      params.get("organizationId") ||
      cached?.organization?.organizationId ||
      "",
    sessionToken: cached?.sessionToken || "",
    route: "overview",
    selected: {},
    data: {},
    weekStart: "",
    search: "",
  };
  const $ = (selector) => document.querySelector(selector),
    $$ = (selector) => [...document.querySelectorAll(selector)];
  const meta = {
    overview: ["教务工作台", "课程、学员、班级和课消统一管理"],
    courses: ["课程管理", "统一管理课程内容、适龄范围和开班情况"],
    packages: ["课包管理", "为课程配置课时、价格和有效期方案"],
    classes: ["班级管理", "管理开班信息、授课教练、在班学员和班级状态"],
    schedules: ["排课管理", "管理班级上课日期、时间、教练和场地安排"],
    students: ["学员管理", "统一管理学员档案、班级归属、课程账户和家长绑定"],
    coaches: ["教练管理", "通过微信邀请教练加入机构并管理本人课堂"],
    reviews: ["课堂审核", "审核教练提交的点名、课消和五维评价"],
    ledger: ["课消流水", "按分钟记录所有课消、冲正和人工调整"],
  };
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[char])
    );
  const formatMoney = (cents) =>
    `¥${(Number(cents || 0) / 100).toLocaleString("zh-CN", {
      maximumFractionDigits: 2,
    })}`;
  const displayUnits = (minutes, unit = 60) =>
    `${
      Math.round((Number(minutes || 0) / Number(unit || 60)) * 100) / 100
    }课时`;
  const labelStatus = (value) =>
    ({
      recruiting: "招生中",
      paused: "暂停招生",
      archived: "已归档",
      preparing: "待开班",
      full: "已满班",
      completed: "已结班",
      active: "在读",
      waiting_class: "待分班",
      pending: "待确认",
      inactive: "已停用",
      pending_review: "待审核",
      approved: "已通过",
      returned: "已退回",
      rejected: "已退回",
    }[value] ||
    value ||
    "—");
  const statusClass = (value) =>
    [
      "paused",
      "waiting_class",
      "pending",
      "pending_review",
      "returned",
    ].includes(value)
      ? "orange"
      : ["inactive", "archived", "completed"].includes(value)
      ? "gray"
      : ["rejected"].includes(value)
      ? "red"
      : "";
  const mondayOf = (date) => {
    const value = new Date(
        `${date || new Date().toISOString().slice(0, 10)}T12:00:00`
      ),
      day = value.getDay() || 7;
    value.setDate(value.getDate() - day + 1);
    return value.toISOString().slice(0, 10);
  };
  const addDays = (date, days) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + days);
    return value.toISOString().slice(0, 10);
  };
  state.weekStart = mondayOf();
  const toast = (message) => {
    const el = $("#toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (el.hidden = true), 2800);
  };
  async function call(domain, action, payload = {}) {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain,
        action,
        organizationId: state.organizationId,
        sessionToken: state.sessionToken,
        ...payload,
      }),
    });
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.message || "教务服务暂不可用");
    return data;
  }
  function guard() {
    if (state.organizationId && state.sessionToken) return true;
    location.href = "./organization-entry.html";
    return false;
  }
  function openModal(title, body, footer = "", eyebrow = "教务中心") {
    $("#modalTitle").textContent = title;
    $("#modalEyebrow").textContent = eyebrow;
    $("#modalBody").innerHTML = body;
    $("#modalFooter").innerHTML =
      footer ||
      `<button class="secondary-button" data-action="close-modal">关闭</button>`;
    $("#modalLayer").hidden = false;
  }
  function closeModal() {
    $("#modalLayer").hidden = true;
    $("#modalBody").innerHTML = "";
    $("#modalFooter").innerHTML = "";
  }
  const empty = (label) =>
    `<div class="page-empty"><div><b>暂无${label}</b><span>使用页面右上角主操作建立第一条正式数据。</span></div></div>`;
  const tools = (searchPlaceholder, filters, actions) =>
    `<div class="page-tools"><div class="tool-left"><input class="search-box" id="pageSearch" value="${escape(
      state.search
    )}" placeholder="${escape(searchPlaceholder)}">${
      filters || ""
    }</div><div class="tool-right">${actions || ""}</div></div>`;
  function formField(
    name,
    label,
    type = "text",
    value = "",
    options = [],
    full = false
  ) {
    if (type === "textarea")
      return `<label class="form-field ${
        full ? "full" : ""
      }"><span>${label}</span><textarea name="${name}">${escape(
        value
      )}</textarea></label>`;
    if (type === "select")
      return `<label class="form-field ${
        full ? "full" : ""
      }"><span>${label}</span><select name="${name}" required><option value="">请选择</option>${options
        .map(
          (item) =>
            `<option value="${escape(item.value)}" ${
              String(item.value) === String(value) ? "selected" : ""
            }>${escape(item.label)}</option>`
        )
        .join("")}</select></label>`;
    return `<label class="form-field ${
      full ? "full" : ""
    }"><span>${label}</span><input name="${name}" type="${type}" value="${escape(
      value
    )}" ${type === "number" ? 'min="0" step="1"' : ""} required></label>`;
  }
  function syncHeader() {
    const [title, subtitle] = meta[state.route] || meta.overview;
    $("#pageTitle").textContent = title;
    $("#pageSubtitle").textContent = subtitle;
    $$("[data-route]").forEach((button) =>
      button.classList.toggle("active", button.dataset.route === state.route)
    );
    history.replaceState(
      null,
      "",
      `${location.pathname}?organizationId=${encodeURIComponent(
        state.organizationId
      )}#${state.route}`
    );
  }
  async function showRoute(route) {
    state.route = meta[route] ? route : "overview";
    state.search = "";
    syncHeader();
    $("#educationContent").innerHTML =
      '<div class="page-loading">正在读取正式教务数据…</div>';
    try {
      await loaders[state.route]();
    } catch (error) {
      $(
        "#educationContent"
      ).innerHTML = `<div class="page-empty"><div><b>页面加载失败</b><span>${escape(
        error.message
      )}</span></div></div>`;
      if (/会话|登录/.test(error.message))
        setTimeout(() => (location.href = "./organization-entry.html"), 1000);
    }
  }

  function renderOverview(result) {
    const s = result.summary || {},
      a = result.analytics || {},
      daily = a.daily || [];
    const max = Math.max(
      1,
      ...daily.map((item) => Number(item.consumptionMinutes || 0))
    );
    $("#educationContent").innerHTML = `<div class="overview-grid">${[
      ["今日课堂", s.todayLessonCount, "节"],
      ["今日课消", s.todayConsumptionMinutes, "分钟"],
      ["待审核课堂", s.pendingReviewCount, "节"],
      ["在册学员", s.studentCount, "人"],
    ]
      .map(
        (item) =>
          `<article class="metric-card"><span>${item[0]}</span><strong>${Number(
            item[1] || 0
          ).toLocaleString()}<small>${item[2]}</small></strong></article>`
      )
      .join(
        ""
      )}</div><div class="chart-grid"><article class="chart-card"><h2>近7日课消趋势</h2><div class="bars">${daily
      .map(
        (item) =>
          `<div><b>${
            item.consumptionMinutes || 0
          }</b><i style="height:${Math.max(
            3,
            (Number(item.consumptionMinutes || 0) / max) * 165
          )}px"></i><small>${escape(
            String(item.date || "").slice(5)
          )}</small></div>`
      )
      .join(
        ""
      )}</div></article><article class="chart-card"><h2>课包经营</h2><div class="kv-grid" style="margin-top:35px"><div class="kv"><span>课包总额</span><b>${formatMoney(
      a.packages?.totalPackageAmountCents
    )}</b></div><div class="kv"><span>已确认金额</span><b class="orange">${formatMoney(
      a.packages?.recognizedAmountCents
    )}</b></div><div class="kv"><span>剩余课时</span><b>${displayUnits(
      a.packages?.packageBalanceMinutes
    )}</b></div><div class="kv"><span>课包预警</span><b class="red">${
      s.packageWarningCount || 0
    }人</b></div></div></article></div>`;
  }

  async function loadCourses() {
    const result = await call("course", "list");
    state.data.courses = result.courses || [];
    const rows = state.data.courses.filter(
      (item) => !state.search || item.name.includes(state.search)
    );
    if (!state.selected.courses && rows[0])
      state.selected.courses = rows[0].courseId;
    const selected =
      rows.find((item) => item.courseId === state.selected.courses) || rows[0];
    let detail = null;
    if (selected)
      detail = await call("course", "detail", { courseId: selected.courseId });
    $("#educationContent").innerHTML =
      tools(
        "搜索课程名称",
        `<select class="filter-select"><option>全部状态</option></select>`,
        `<button class="primary-button" data-action="new-course">新建课程</button>`
      ) +
      `<div class="master-detail"><section class="master-panel"><div class="panel-title"><h2>课程列表</h2></div>${
        rows.length
          ? `<table class="data-table"><thead><tr><th>课程名称</th><th>适龄范围</th><th>默认时长</th><th>课包</th><th>班级</th><th>状态</th></tr></thead><tbody>${rows
              .map(
                (item) =>
                  `<tr data-select="courses" data-id="${
                    item.courseId
                  }" class="${
                    item.courseId === selected?.courseId ? "selected" : ""
                  }"><td><b>${escape(item.name)}</b></td><td>${item.ageMin}-${
                    item.ageMax
                  }岁</td><td>${item.defaultUnitMinutes}分钟</td><td>${
                    item.packageCount || 0
                  }个</td><td>${
                    item.classCount || 0
                  }个</td><td><span class="status-chip ${statusClass(
                    item.status
                  )}">${labelStatus(item.status)}</span></td></tr>`
              )
              .join("")}</tbody></table>`
          : empty("课程")
      }<span class="panel-count">共 ${
        rows.length
      } 个课程</span></section>${renderCourseDetail(detail)}</div>`;
  }
  function renderCourseDetail(detail) {
    if (!detail)
      return `<section class="detail-panel">${empty("课程详情")}</section>`;
    const c = detail.course;
    return `<section class="detail-panel"><div class="detail-head"><div><h2>${escape(
      c.name
    )}</h2><p>${escape(c.category)}　<span class="status-chip ${statusClass(
      c.status
    )}">${labelStatus(
      c.status
    )}</span></p></div><button class="secondary-button" data-action="edit-course" data-id="${
      c.courseId
    }">编辑课程</button></div><div class="detail-card"><h3>课程信息</h3><div class="kv-grid"><div class="kv"><span>适龄范围</span><b>${
      c.ageMin
    }-${c.ageMax}岁</b></div><div class="kv"><span>默认单节时长</span><b>${
      c.defaultUnitMinutes
    }分钟</b></div><div class="kv"><span>课程分类</span><b>${escape(
      c.category
    )}</b></div><div class="kv"><span>招生状态</span><b>${labelStatus(
      c.status
    )}</b></div></div><p class="muted">${escape(
      c.description || "暂无课程介绍"
    )}</p></div><div class="detail-card"><h3>关联课包</h3><div class="pill-row">${
      detail.packages.length
        ? detail.packages
            .map(
              (item) =>
                `<span class="person-pill">${escape(
                  item.name
                )} · ${displayUnits(
                  item.totalMinutes,
                  item.unitMinutes
                )} · ${formatMoney(item.priceCents)}</span>`
            )
            .join("")
        : '<span class="muted">暂无课包</span>'
    }</div></div><div class="detail-card"><h3>开班情况</h3><div class="pill-row">${
      detail.classes.length
        ? detail.classes
            .map(
              (item) =>
                `<span class="person-pill">${escape(item.name)} · ${labelStatus(
                  item.status
                )}</span>`
            )
            .join("")
        : '<span class="muted">暂未开班</span>'
    }</div></div><div class="detail-actions"><span class="detail-note">课程变更不覆盖历史课包、班级和课消快照</span><button class="secondary-button" data-action="course-status" data-id="${
      c.courseId
    }" data-status="${c.status === "paused" ? "recruiting" : "paused"}">${
      c.status === "paused" ? "恢复招生" : "暂停招生"
    }</button></div></section>`;
  }

  async function loadPackages() {
    const [packages, courses] = await Promise.all([
      call("package", "list"),
      call("course", "list"),
    ]);
    state.data.packages = packages.templates || [];
    state.data.courses = courses.courses || [];
    const rows = state.data.packages.filter(
      (item) => !state.search || item.name.includes(state.search)
    );
    if (!state.selected.packages && rows[0])
      state.selected.packages = rows[0].templateId;
    const selected =
      rows.find((item) => item.templateId === state.selected.packages) ||
      rows[0];
    let detail = null;
    if (selected)
      detail = await call("package", "detail", {
        templateId: selected.templateId,
      });
    $("#educationContent").innerHTML =
      tools(
        "搜索课包名称",
        `<select class="filter-select"><option>全部课程</option></select>`,
        `<button class="primary-button" data-action="new-package">新建课包</button>`
      ) +
      `<div class="master-detail"><section class="master-panel"><div class="panel-title"><h2>课包列表</h2></div>${
        rows.length
          ? `<table class="data-table"><thead><tr><th>课包名称</th><th>所属课程</th><th>课时</th><th>价格</th><th>有效期</th><th>状态</th></tr></thead><tbody>${rows
              .map(
                (item) =>
                  `<tr data-select="packages" data-id="${
                    item.templateId
                  }" class="${
                    item.templateId === selected?.templateId ? "selected" : ""
                  }"><td><b>${escape(item.name)}</b></td><td>${escape(
                    item.courseName || "—"
                  )}</td><td>${displayUnits(
                    item.totalMinutes,
                    item.unitMinutes
                  )}</td><td>${formatMoney(item.priceCents)}</td><td>${
                    item.validDays
                  }天</td><td><span class="status-chip ${statusClass(
                    item.status
                  )}">${
                    item.status === "active" ? "启用" : "停用"
                  }</span></td></tr>`
              )
              .join("")}</tbody></table>`
          : empty("课包")
      }<span class="panel-count">共 ${
        rows.length
      } 个课包</span></section>${renderPackageDetail(detail)}</div>`;
  }
  function renderPackageDetail(detail) {
    if (!detail)
      return `<section class="detail-panel">${empty("课包详情")}</section>`;
    const p = detail.template;
    return `<section class="detail-panel"><div class="detail-head"><div><h2>${escape(
      p.name
    )}</h2><p>${escape(
      detail.course?.name || "未关联课程"
    )}</p></div><button class="secondary-button" data-action="edit-package" data-id="${
      p.templateId
    }">编辑课包</button></div><div class="detail-card"><h3>课包与收费</h3><div class="kv-grid"><div class="kv"><span>每节时长</span><b>${
      p.unitMinutes
    }分钟</b></div><div class="kv"><span>标准课时</span><b>${displayUnits(
      p.totalMinutes,
      p.unitMinutes
    )}</b></div><div class="kv"><span>赠送课时</span><b>${displayUnits(
      p.giftMinutes,
      p.unitMinutes
    )}</b></div><div class="kv"><span>课包价格</span><b class="orange">${formatMoney(
      p.priceCents
    )}</b></div><div class="kv"><span>有效期</span><b>${
      p.validDays
    }天</b></div><div class="kv"><span>已分配</span><b>${
      detail.assignedCount || 0
    }人</b></div></div></div><div class="detail-card"><h3>使用规则</h3><p class="muted">课包仅用于“${escape(
      detail.course?.name || "所属课程"
    )}”，首次课消后${
      p.unitMinutes
    }分钟单位锁定。课程和价格修改不覆盖已分配学员快照。</p></div><div class="detail-actions"><span class="detail-note">本轮仅记录金额，不接微信支付和退款</span></div></section>`;
  }

  async function loadClasses() {
    const [classes, courses, coaches] = await Promise.all([
      call("class", "list"),
      call("course", "list"),
      call("coach", "list"),
    ]);
    state.data.classes = classes.classes || [];
    state.data.courses = courses.courses || [];
    state.data.coaches = coaches.coaches || [];
    const rows = state.data.classes.filter(
      (item) =>
        !state.search ||
        item.name.includes(state.search) ||
        item.coachName.includes(state.search)
    );
    if (!state.selected.classes && rows[0])
      state.selected.classes = rows[0].classId;
    const selected =
      rows.find((item) => item.classId === state.selected.classes) || rows[0];
    let detail = null;
    if (selected)
      detail = await call("class", "detail", { classId: selected.classId });
    $("#educationContent").innerHTML =
      tools(
        "搜索班级名称或教练",
        `<select class="filter-select"><option>全部课程</option></select><select class="filter-select"><option>全部状态</option></select>`,
        `<button class="primary-button" data-action="new-class">新建班级</button>`
      ) +
      `<div class="master-detail"><section class="master-panel"><div class="panel-title"><h2>班级列表</h2></div>${
        rows.length
          ? `<table class="data-table"><thead><tr><th>班级名称</th><th>关联课程</th><th>授课教练</th><th>在班人数</th><th>上课计划</th><th>状态</th></tr></thead><tbody>${rows
              .map(
                (item) =>
                  `<tr data-select="classes" data-id="${item.classId}" class="${
                    item.classId === selected?.classId ? "selected" : ""
                  }"><td><b>${escape(item.name)}</b></td><td>${escape(
                    item.courseName
                  )}</td><td>${escape(item.coachName)}</td><td>${
                    item.studentCount
                  }/${item.capacity}人</td><td>${escape(
                    item.scheduleSummary || "待排课"
                  )}</td><td><span class="status-chip ${statusClass(
                    item.status
                  )}">${labelStatus(item.status)}</span></td></tr>`
              )
              .join("")}</tbody></table>`
          : empty("班级")
      }<span class="panel-count">共 ${
        rows.length
      } 个班级</span></section>${renderClassDetail(detail)}</div>`;
  }
  function renderClassDetail(detail) {
    if (!detail)
      return `<section class="detail-panel">${empty("班级详情")}</section>`;
    const c = detail.classInfo;
    return `<section class="detail-panel"><div class="detail-head"><div><h2>${escape(
      c.name
    )}</h2><p>${escape(
      detail.course?.name || "—"
    )}　<span class="status-chip ${statusClass(c.status)}">${labelStatus(
      c.status
    )}</span></p></div><button class="secondary-button" data-action="edit-class" data-id="${
      c.classId
    }">修改班级</button></div><div class="detail-card"><h3>班级信息</h3><div class="kv-grid three"><div class="kv"><span>关联课程</span><b>${escape(
      detail.course?.name || "—"
    )}</b></div><div class="kv"><span>开班日期</span><b>${escape(
      c.startDate || "—"
    )}</b></div><div class="kv"><span>授课教练</span><b>${escape(
      detail.coach?.name || "—"
    )}</b></div><div class="kv"><span>班级容量</span><b>${
      c.capacity
    }人</b></div><div class="kv"><span>在班学员</span><b>${
      detail.students.length
    }人</b></div><div class="kv"><span>默认场地</span><b>${escape(
      c.venue || "—"
    )}</b></div></div></div><div class="detail-card"><h3>在班学员 <button class="text-button" data-action="add-class-student" data-id="${
      c.classId
    }">添加学员</button></h3><div class="pill-row">${
      detail.students.length
        ? detail.students
            .map(
              (item) =>
                `<span class="person-pill"><span class="record-avatar">${escape(
                  item.name.slice(0, 1)
                )}</span>${escape(item.name)}</span>`
            )
            .join("")
        : '<span class="muted">暂无在班学员</span>'
    }</div></div><div class="detail-card"><h3>排课摘要</h3><p>${
      detail.schedules.length
        ? detail.schedules
            .map(
              (item) =>
                `周${"一二三四五六日"[Number(item.weekday) - 1]} ${
                  item.startTime
                } · ${item.plannedMinutes}分钟`
            )
            .join("　")
        : "尚未排课"
    }</p></div><div class="detail-actions"><span class="detail-note">班级调整不会影响历史排课和课消记录</span><button class="danger-button" data-action="complete-class" data-id="${
      c.classId
    }">结束班级</button></div></section>`;
  }

  async function loadStudents() {
    const [students, courses, packages, classes] = await Promise.all([
      call("student", "list"),
      call("course", "list"),
      call("package", "list"),
      call("class", "list"),
    ]);
    state.data.students = students.students || [];
    state.data.courses = courses.courses || [];
    state.data.packages = packages.templates || [];
    state.data.classes = classes.classes || [];
    const rows = state.data.students.filter(
      (item) =>
        !state.search ||
        item.name.includes(state.search) ||
        item.guardianPhone.includes(state.search)
    );
    if (!state.selected.students && rows[0])
      state.selected.students = rows[0].studentId;
    const selected =
      rows.find((item) => item.studentId === state.selected.students) ||
      rows[0];
    let detail = null;
    if (selected)
      detail = await call("student", "detail", {
        studentId: selected.studentId,
      });
    $("#educationContent").innerHTML =
      tools(
        "搜索学员姓名或手机号",
        `<select class="filter-select"><option>全部班级</option></select><select class="filter-select"><option>全部状态</option></select>`,
        `<button class="secondary-button" data-action="manual-student">人工补录</button><button class="primary-button" data-action="student-gate">家长扫码建档</button>`
      ) +
      `<div class="master-detail"><section class="master-panel"><div class="panel-title"><h2>学员列表</h2></div>${
        rows.length
          ? `<table class="data-table"><thead><tr><th>学员</th><th>所属班级</th><th>剩余课时</th><th>家长手机号</th><th>状态</th></tr></thead><tbody>${rows
              .map(
                (item) =>
                  `<tr data-select="students" data-id="${
                    item.studentId
                  }" class="${
                    item.studentId === selected?.studentId ? "selected" : ""
                  }"><td><div class="record-main">${
                    item.avatarUrl
                      ? `<img class="student-photo" src="${escape(
                          item.avatarUrl
                        )}">`
                      : `<span class="record-avatar">${escape(
                          item.name.slice(0, 1)
                        )}</span>`
                  }<b>${escape(item.name)}</b></div></td><td>${escape(
                    item.className || "待分班"
                  )}</td><td class="${
                    item.remainingMinutes <= item.unitMinutes * 4
                      ? "orange"
                      : ""
                  }">${displayUnits(
                    item.remainingMinutes,
                    item.unitMinutes
                  )}</td><td>${escape(
                    item.guardianPhone
                      ? item.guardianPhone.slice(0, 3) +
                          "****" +
                          item.guardianPhone.slice(-4)
                      : "—"
                  )}</td><td><span class="status-chip ${statusClass(
                    item.confirmationStatus === "pending"
                      ? "pending"
                      : item.status
                  )}">${
                    item.confirmationStatus === "pending"
                      ? "待确认"
                      : labelStatus(item.status)
                  }</span></td></tr>`
              )
              .join("")}</tbody></table>`
          : empty("学员")
      }<span class="panel-count">共 ${
        rows.length
      } 名学员</span></section>${renderStudentDetail(detail)}</div>`;
  }
  function renderStudentDetail(detail) {
    if (!detail)
      return `<section class="detail-panel">${empty("学员详情")}</section>`;
    const s = detail.student,
      p = detail.packages.find((item) => item.status === "active");
    return `<section class="detail-panel"><div class="detail-head"><div class="record-main">${
      s.avatarUrl
        ? `<img class="student-photo" src="${escape(s.avatarUrl)}">`
        : `<span class="record-avatar">${escape(s.name.slice(0, 1))}</span>`
    }<div><h2>${escape(s.name)}</h2><p>${escape(s.gender || "—")} · ${escape(
      s.birthDate || "—"
    )}　<span class="status-chip ${statusClass(
      s.confirmationStatus === "pending" ? "pending" : s.status
    )}">${
      s.confirmationStatus === "pending" ? "待确认" : labelStatus(s.status)
    }</span></p></div></div><button class="secondary-button" data-action="edit-student" data-id="${
      s.studentId
    }">编辑学员</button></div><div class="detail-card"><h3>基础信息</h3><div class="kv-grid three"><div class="kv"><span>所属班级</span><b>${escape(
      detail.classInfo?.name || "待分班"
    )}</b></div><div class="kv"><span>家长姓名</span><b>${escape(
      s.guardianName || "—"
    )}</b></div><div class="kv"><span>手机号</span><b>${escape(
      s.guardianPhone || "—"
    )}</b></div><div class="kv"><span>与孩子关系</span><b>${escape(
      s.guardianRelation || "—"
    )}</b></div><div class="kv"><span>学校</span><b>${escape(
      s.school || "—"
    )}</b></div><div class="kv"><span>年级</span><b>${escape(
      s.grade || "—"
    )}</b></div></div></div><div class="detail-card"><h3>课程账户</h3>${
      p
        ? `<div class="kv-grid"><div class="kv"><span>课包名称</span><b>${escape(
            p.name
          )}</b></div><div class="kv"><span>总课时</span><b>${displayUnits(
            Number(p.totalMinutes) + Number(p.giftMinutes),
            p.unitMinutes
          )}</b></div><div class="kv"><span>剩余课时</span><b class="orange">${displayUnits(
            p.remainingMinutes,
            p.unitMinutes
          )}</b></div><div class="kv"><span>有效期至</span><b>${escape(
            p.validTo || "未设置"
          )}</b></div></div>`
        : '<span class="muted">校区确认后补充课程和课包</span>'
    }</div><div class="detail-card"><h3>近期记录</h3><div class="pill-row">${
      detail.attendance.length
        ? detail.attendance
            .map(
              (item) =>
                `<span class="person-pill">${escape(
                  item.lessonId
                )} · ${labelStatus(item.status)}</span>`
            )
            .join("")
        : '<span class="muted">暂无课堂记录</span>'
    }</div></div><div class="detail-actions"><span class="detail-note">家长只能维护基础资料，课程、课包和班级由校区确认</span>${
      s.confirmationStatus === "pending"
        ? `<button class="danger-button" data-action="reject-student" data-id="${s.studentId}">退回</button><button class="primary-button" data-action="confirm-student" data-id="${s.studentId}">确认档案</button>`
        : ""
    }</div></section>`;
  }

  async function loadCoaches() {
    const result = await call("coach", "list");
    state.data.coaches = result.coaches || [];
    const rows = state.data.coaches.filter(
      (item) =>
        !state.search ||
        item.name.includes(state.search) ||
        item.phone.includes(state.search)
    );
    if (!state.selected.coaches && rows[0])
      state.selected.coaches = rows[0].coachId;
    const selected =
      rows.find((item) => item.coachId === state.selected.coaches) || rows[0];
    let detail = null;
    if (selected)
      detail = await call("coach", "detail", { coachId: selected.coachId });
    $("#educationContent").innerHTML =
      tools(
        "搜索姓名或手机号",
        `<select class="filter-select"><option>全部账号状态</option></select>`,
        `<button class="secondary-button" data-action="invite-list">邀请记录</button><button class="primary-button" data-action="coach-invite">添加教练</button>`
      ) +
      `<div class="master-detail"><section class="master-panel"><div class="panel-title"><h2>教练账号</h2></div>${
        rows.length
          ? `<table class="data-table"><thead><tr><th>教练</th><th>手机号</th><th>使用端</th><th>班级</th><th>状态</th><th>最近使用</th></tr></thead><tbody>${rows
              .map(
                (item) =>
                  `<tr data-select="coaches" data-id="${item.coachId}" class="${
                    item.coachId === selected?.coachId ? "selected" : ""
                  }"><td><div class="record-main"><span class="record-avatar">${escape(
                    (item.name || "教").slice(0, 1)
                  )}</span><b>${escape(
                    item.name || "待完善"
                  )}</b></div></td><td>${escape(
                    item.phone || "—"
                  )}</td><td>小程序</td><td>${
                    item.classCount || 0
                  }个</td><td><span class="status-chip ${statusClass(
                    item.status
                  )}">${
                    item.status === "active" ? "正常" : "已停用"
                  }</span></td><td>${
                    item.lastUsedAt
                      ? new Date(item.lastUsedAt).toLocaleDateString()
                      : "尚未使用"
                  }</td></tr>`
              )
              .join("")}</tbody></table>`
          : empty("教练")
      }<span class="panel-count">共 ${
        rows.length
      } 名教练</span></section>${renderCoachDetail(detail)}</div>`;
  }
  function renderCoachDetail(detail) {
    if (!detail)
      return `<section class="detail-panel">${empty("教练详情")}</section>`;
    const c = detail.coach;
    return `<section class="detail-panel"><div class="detail-head"><div class="record-main"><span class="record-avatar">${escape(
      (c.name || "教").slice(0, 1)
    )}</span><div><h2>${escape(
      c.name
    )}</h2><p>主身份：教练</p></div></div><button class="secondary-button" data-action="edit-coach" data-id="${
      c.coachId
    }">编辑资料</button></div><div class="detail-card"><h3>使用端权限</h3><div class="kv-grid"><div class="kv"><span>小程序</span><b class="green">已开启</b></div><div class="kv"><span>机构经营PC</span><b class="muted">未开放</b></div><div class="kv"><span>赛事PC</span><b class="muted">未授权</b></div><div class="kv"><span>数据范围</span><b>仅本人课程</b></div></div></div><div class="detail-card"><h3>擅长方向</h3><div class="pill-row">${
      (c.specialties || []).length
        ? c.specialties
            .map((item) => `<span class="person-pill">${escape(item)}</span>`)
            .join("")
        : '<span class="muted">暂未填写</span>'
    }</div></div><div class="detail-card"><h3>负责班级</h3><div class="pill-row">${
      detail.classes.length
        ? detail.classes
            .map(
              (item) => `<span class="person-pill">${escape(item.name)}</span>`
            )
            .join("")
        : '<span class="muted">尚未分配班级</span>'
    }</div></div><div class="detail-actions"><span class="detail-note">教练只使用小程序处理本人课堂任务</span><button class="danger-button" data-action="disable-coach" data-id="${
      c.coachId
    }">停用账号</button></div></section>`;
  }

  async function loadSchedules() {
    const [week, classes, coaches] = await Promise.all([
      call("schedule", "week", { weekStart: state.weekStart }),
      call("class", "list"),
      call("coach", "list"),
    ]);
    state.data.lessons = week.lessons || [];
    state.data.classes = classes.classes || [];
    state.data.coaches = coaches.coaches || [];
    if (!state.selected.schedules && state.data.lessons[0])
      state.selected.schedules = state.data.lessons[0].lessonId;
    const selected = state.data.lessons.find(
      (item) => item.lessonId === state.selected.schedules
    );
    $("#educationContent").innerHTML =
      tools(
        "当前周课表",
        `<button class="secondary-button" data-action="previous-week">上一周</button><button class="secondary-button" data-action="today-week">本周</button><button class="secondary-button" data-action="next-week">下一周</button><select class="filter-select"><option>全部班级</option></select><select class="filter-select"><option>全部教练</option></select>`,
        `<button class="secondary-button" data-action="bulk-schedule">批量排课</button><button class="primary-button" data-action="new-schedule">新建排课</button>`
      ) +
      `<div class="schedule-layout"><section class="schedule-panel"><div class="schedule-head"><h2>本周课表</h2><span class="muted">${
        state.weekStart
      } ～ ${addDays(
        state.weekStart,
        6
      )}　时间刻度 30分钟</span></div>${renderWeekGrid(
        state.data.lessons
      )}</section>${renderLessonDetail(selected)}</div>`;
  }
  function renderWeekGrid(lessons) {
    const slots = Array.from({ length: 26 }, (_, i) => i);
    const days = Array.from({ length: 7 }, (_, i) =>
      addDays(state.weekStart, i)
    );
    return `<div class="schedule-grid"><div></div>${days
      .map(
        (day, i) =>
          `<div class="day">周${"一二三四五六日"[i]}<br>${day.slice(5)}</div>`
      )
      .join("")}${slots
      .map(
        (slot) =>
          `<div class="time" style="grid-column:1;grid-row:${slot + 2}">${
            slot % 2 === 0 ? `${String(9 + slot / 2).padStart(2, "0")}:00` : ""
          }</div>${days
            .map(
              (_, dayIndex) =>
                `<div style="grid-column:${dayIndex + 2};grid-row:${
                  slot + 2
                }"></div>`
            )
            .join("")}`
      )
      .join("")}${lessons
      .map((item) => {
        const day = Math.max(0, days.indexOf(item.lessonDate)),
          start =
            Number(item.startTime.split(":")[0]) +
            Number(item.startTime.split(":")[1]) / 60,
          row = 2 + Math.max(0, Math.round((start - 9) * 2)),
          span = Math.max(1, Math.ceil(Number(item.plannedMinutes || 60) / 30));
        return `<div class="lesson-block ${
          item.lessonId === state.selected.schedules ? "selected" : ""
        }" data-select="schedules" data-id="${
          item.lessonId
        }" style="grid-column:${
          day + 2
        };grid-row:${row}/span ${span}"><b>${escape(item.startTime)} ${escape(
          item.className
        )}</b><span>${escape(item.coachName)}</span><span>${escape(
          item.venue
        )}</span></div>`;
      })
      .join("")}</div>`;
  }
  function renderLessonDetail(item) {
    if (!item)
      return `<section class="detail-panel">${empty("排课详情")}</section>`;
    return `<section class="detail-panel"><div class="detail-head"><div><h2>${escape(
      item.className
    )}</h2><p>${escape(
      item.courseName
    )}　<span class="status-chip">${labelStatus(
      item.status
    )}</span></p></div><button class="secondary-button" data-action="edit-lesson" data-id="${
      item.lessonId
    }">修改排课</button></div><div class="detail-card"><h3>本节安排</h3><div class="kv-grid"><div class="kv"><span>日期</span><b>${escape(
      item.lessonDate
    )}</b></div><div class="kv"><span>时间</span><b>${escape(
      item.startTime
    )} · ${
      item.plannedMinutes
    }分钟</b></div><div class="kv"><span>授课教练</span><b>${escape(
      item.coachName
    )}</b></div><div class="kv"><span>场地</span><b>${escape(
      item.venue
    )}</b></div><div class="kv"><span>同步状态</span><b>${escape(
      item.syncStatus || "待同步"
    )}</b></div><div class="kv"><span>课堂状态</span><b>${labelStatus(
      item.status
    )}</b></div></div></div><div class="detail-card"><h3>冲突检查</h3><p class="green">当前课堂已通过班级、教练和场地冲突检查</p></div><div class="detail-actions"><span class="detail-note">调整后将更新教练与家长课表</span><button class="danger-button" data-action="cancel-lesson" data-id="${
      item.lessonId
    }">取消本节</button><button class="primary-button" data-action="edit-lesson" data-id="${
      item.lessonId
    }">确认调整</button></div></section>`;
  }

  async function loadReviews() {
    const result = await call("lesson", "reviewList");
    const rows = result.submissions || [];
    $("#educationContent").innerHTML =
      tools("搜索课堂或教练", "", "") +
      `<section class="master-panel" style="min-height:650px"><div class="panel-title"><h2>课堂提交审核</h2></div>${
        rows.length
          ? `<table class="data-table"><thead><tr><th>课堂</th><th>教练</th><th>点名</th><th>评价</th><th>课消异常</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows
              .map(
                (item) =>
                  `<tr><td>${escape(item.lessonId)}</td><td>${escape(
                    item.coachPlatformUserId
                  )}</td><td>${item.attendanceCount || 0}人</td><td>${
                    item.performanceCount || 0
                  }人</td><td class="${
                    item.consumptionIssues?.length ? "red" : "green"
                  }">${
                    item.consumptionIssues?.length || 0
                  }项</td><td><span class="status-chip ${statusClass(
                    item.status
                  )}">${labelStatus(item.status)}</span></td><td>${
                    item.status === "pending_review"
                      ? `<button class="text-button" data-action="approve-review" data-id="${item.lessonId}">通过</button><button class="text-button red" data-action="return-review" data-id="${item.lessonId}">退回</button>`
                      : "—"
                  }</td></tr>`
              )
              .join("")}</tbody></table>`
          : empty("待审核课堂")
      }</section>`;
  }
  async function loadLedger() {
    const result = await call("ledger", "list");
    const rows = result.entries || [];
    $("#educationContent").innerHTML =
      tools(
        "搜索学员或课堂",
        `<select class="filter-select"><option>全部流水类型</option></select>`,
        `<button class="secondary-button" data-action="ledger-adjust">紧急调整</button>`
      ) +
      `<section class="master-panel" style="min-height:650px"><div class="panel-title"><h2>分钟课消账本</h2></div>${
        rows.length
          ? `<table class="data-table"><thead><tr><th>时间</th><th>学员</th><th>课堂</th><th>类型</th><th>分钟</th><th>折算课时</th><th>余额</th><th>原因</th></tr></thead><tbody>${rows
              .map(
                (item) =>
                  `<tr><td>${new Date(
                    item.createdAt
                  ).toLocaleString()}</td><td>${escape(
                    item.studentId
                  )}</td><td>${escape(item.lessonId || "—")}</td><td>${escape(
                    item.entryType
                  )}</td><td class="${
                    item.deltaMinutes < 0 ? "orange" : "green"
                  }">${item.deltaMinutes}</td><td>${
                    item.displayUnits
                  }</td><td>${item.balanceAfterMinutes}分钟</td><td>${escape(
                    item.reason || "课堂课消"
                  )}</td></tr>`
              )
              .join("")}</tbody></table>`
          : empty("课消流水")
      }</section>`;
  }

  const loaders = {
    overview: async () => renderOverview(await call("dashboard", "summary")),
    courses: loadCourses,
    packages: loadPackages,
    classes: loadClasses,
    schedules: loadSchedules,
    students: loadStudents,
    coaches: loadCoaches,
    reviews: loadReviews,
    ledger: loadLedger,
  };

  function entityForm(type, record = {}) {
    const courseOptions = (state.data.courses || []).map((item) => ({
        value: item.courseId,
        label: item.name,
      })),
      coachOptions = (state.data.coaches || []).map((item) => ({
        value: item.platformUserId,
        label: item.name,
      })),
      classOptions = (state.data.classes || []).map((item) => ({
        value: item.classId,
        label: item.name,
      }));
    let body = "",
      title = "",
      action = "";
    if (type === "course") {
      title = record.courseId ? "编辑课程" : "新建课程";
      action = "save-course";
      body =
        formField("name", "课程名称", "text", record.name) +
        formField(
          "category",
          "课程分类",
          "text",
          record.category || "篮球训练"
        ) +
        formField("ageMin", "最小年龄", "number", record.ageMin || 4) +
        formField("ageMax", "最大年龄", "number", record.ageMax || 18) +
        formField(
          "defaultUnitMinutes",
          "默认单节时长",
          "select",
          record.defaultUnitMinutes || 60,
          [
            { value: 60, label: "60分钟" },
            { value: 90, label: "90分钟" },
          ]
        ) +
        formField(
          "status",
          "招生状态",
          "select",
          record.status || "recruiting",
          [
            { value: "recruiting", label: "招生中" },
            { value: "paused", label: "暂停招生" },
          ]
        ) +
        formField(
          "description",
          "课程介绍",
          "textarea",
          record.description,
          [],
          true
        );
    }
    if (type === "package") {
      title = record.templateId ? "编辑课包" : "新建课包";
      action = "save-package";
      body =
        formField(
          "courseId",
          "所属课程",
          "select",
          record.courseId,
          courseOptions
        ) +
        formField("name", "课包名称", "text", record.name) +
        formField(
          "unitMinutes",
          "每节时长",
          "select",
          record.unitMinutes || 60,
          [
            { value: 60, label: "60分钟" },
            { value: 90, label: "90分钟" },
          ]
        ) +
        formField(
          "totalUnits",
          "标准课时",
          "number",
          record.totalMinutes ? record.totalMinutes / record.unitMinutes : 24
        ) +
        formField(
          "giftUnits",
          "赠送课时",
          "number",
          record.giftMinutes ? record.giftMinutes / record.unitMinutes : 0
        ) +
        formField(
          "priceYuan",
          "课包价格（元）",
          "number",
          Number(record.priceCents || 0) / 100
        ) +
        formField(
          "validDays",
          "有效期（天）",
          "number",
          record.validDays || 365
        );
    }
    if (type === "class") {
      title = record.classId ? "修改班级" : "新建班级";
      action = "save-class";
      body =
        formField("name", "班级名称", "text", record.name) +
        formField(
          "courseId",
          "关联课程",
          "select",
          record.courseId,
          courseOptions
        ) +
        formField(
          "primaryCoachPlatformUserId",
          "主教练",
          "select",
          record.primaryCoachPlatformUserId,
          coachOptions
        ) +
        formField("capacity", "班级容量", "number", record.capacity || 20) +
        formField("startDate", "开班日期", "date", record.startDate) +
        formField("venue", "默认场地", "text", record.venue) +
        formField(
          "status",
          "班级状态",
          "select",
          record.status || "preparing",
          [
            { value: "preparing", label: "待开班" },
            { value: "recruiting", label: "招生中" },
            { value: "full", label: "已满班" },
          ]
        );
    }
    if (type === "lesson") {
      title = record.lessonId ? "修改排课" : "新建排课";
      action = record.lessonId ? "save-lesson-update" : "save-lesson";
      body =
        formField("classId", "班级", "select", record.classId, classOptions) +
        formField(
          "coachPlatformUserId",
          "授课教练",
          "select",
          record.coachPlatformUserId,
          coachOptions
        ) +
        formField(
          "lessonDate",
          "上课日期",
          "date",
          record.lessonDate || new Date().toISOString().slice(0, 10)
        ) +
        formField(
          "startTime",
          "开始时间",
          "time",
          record.startTime || "18:30"
        ) +
        formField(
          "plannedMinutes",
          "课堂时长",
          "select",
          record.plannedMinutes || 60,
          [
            { value: 60, label: "60分钟" },
            { value: 90, label: "90分钟" },
          ]
        ) +
        formField("venue", "上课场地", "text", record.venue) +
        formField("reason", "变更原因", "text", "", [], true);
    }
    openModal(
      title,
      `<form class="form-grid" id="entityForm" data-type="${type}" data-id="${escape(
        record.courseId ||
          record.templateId ||
          record.classId ||
          record.lessonId ||
          ""
      )}">${body}</form>`,
      `<button class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" data-action="${action}">保存</button>`
    );
  }
  async function showCoachInvite() {
    const result = await call("coach", "inviteCreate");
    const qr =
      result.qrUrl ||
      (await QRCode.toDataURL(result.inviteLink, { width: 430, margin: 2 }));
    openModal(
      "邀请教练",
      `<div class="invite-layout"><div class="qr-box"><img src="${escape(
        qr
      )}"></div><div class="invite-copy"><h3>微信扫码加入教练团队</h3><p>扫码或打开邀请链接后，教练在小程序填写姓名、手机号和擅长方向；确认后立即加入机构。</p><div class="invite-meta"><span>有效期：${new Date(
        result.expiresAt
      ).toLocaleString()}</span><span>权限：仅小程序、本人班级与本人课堂</span></div><div class="copy-row"><input id="inviteLink" value="${escape(
        result.inviteLink
      )}" readonly><button class="secondary-button" data-action="copy-invite">复制链接</button></div></div></div>`,
      `<button class="danger-button" data-action="revoke-invite" data-id="${result.inviteId}">撤销邀请</button><button class="primary-button" data-action="close-modal">完成</button>`,
      "教练管理"
    );
  }
  async function showStudentGate(rotate = false) {
    const cacheKey = `sxf_education_student_gate_${state.organizationId}`;
    if (rotate) localStorage.removeItem(cacheKey);
    const renderGate = (result, qr, readyText = "建档入口已就绪") =>
      openModal(
        "家长扫码建档",
        `<div class="invite-layout"><div class="qr-box"><img src="${qr}" alt="家长建档二维码"></div><div class="invite-copy"><h3>校区长期通用建档码</h3><p>二维码在浏览器本地即时生成，家长扫码后通过服务号完成身份绑定；资料需由校区确认后才能正式入班。</p><div class="invite-meta"><span class="gate-ready-state">${escape(
          readyText
        )}</span><span>校区范围：当前校区</span><span>照片：头像可选，不收身份证件</span></div><div class="copy-row"><input id="inviteLink" value="${escape(
          result.gateLink
        )}" readonly><button class="secondary-button" data-action="copy-invite">复制链接</button></div></div></div>`,
        `<button class="danger-button" data-action="disable-gate" data-id="${result.gateId}">停用建档码</button><button class="secondary-button" data-action="rotate-gate">重新生成</button><button class="primary-button" data-action="close-modal">完成</button>`,
        "学员管理"
      );
    let cached = null;
    if (!rotate) {
      try {
        cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      } catch (_) {}
    }
    if (cached && cached.result && cached.qr)
      renderGate(cached.result, cached.qr, "已从本地缓存快速打开");
    else
      openModal(
        "家长扫码建档",
        '<div class="qr-loading"><div class="qr-loading-spinner"></div><b>正在准备建档入口</b><span>弹窗已打开，二维码将在片刻后显示</span></div>',
        '<button class="secondary-button" data-action="close-modal">关闭</button>',
        "学员管理"
      );
    try {
      const result = await call("student", rotate ? "gateRotate" : "gateGet");
      const qr = await QRCode.toDataURL(result.gateLink, {
        width: 430,
        margin: 2,
        errorCorrectionLevel: "H",
      });
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ result, qr, cachedAt: Date.now() })
      );
      renderGate(result, qr, "建档入口已就绪，服务号通道正在后台确认");
      call("student", "gateQrRefresh", { gateId: result.gateId })
        .then(() => {
          const status = document.querySelector(".gate-ready-state");
          if (status) status.textContent = "服务号通道已就绪";
        })
        .catch(() => {
          const status = document.querySelector(".gate-ready-state");
          if (status) status.textContent = "建档入口可扫码，服务号通道仍在准备";
        });
    } catch (error) {
      if (!cached)
        openModal(
          "家长扫码建档",
          `<div class="page-empty"><div><b>二维码生成失败</b><span>${escape(
            error.message
          )}</span></div></div>`,
          '<button class="secondary-button" data-action="close-modal">关闭</button><button class="primary-button" data-action="student-gate">重试</button>',
          "学员管理"
        );
      else toast(error.message || "二维码刷新失败，已保留缓存二维码");
    }
  }
  function confirmStudentForm(studentId) {
    const courseOptions = (state.data.courses || []).map((item) => ({
        value: item.courseId,
        label: item.name,
      })),
      packageOptions = (state.data.packages || []).map((item) => ({
        value: item.templateId,
        label: `${item.courseName} · ${item.name}`,
      })),
      classOptions = (state.data.classes || []).map((item) => ({
        value: item.classId,
        label: `${item.courseName} · ${item.name}`,
      }));
    openModal(
      "确认学员档案",
      `<form class="form-grid" id="studentConfirmForm" data-id="${studentId}">${formField(
        "courseId",
        "报名课程",
        "select",
        "",
        courseOptions
      )}${formField(
        "templateId",
        "选择课包",
        "select",
        "",
        packageOptions
      )}${formField(
        "saleAmountYuan",
        "成交金额（元）",
        "number",
        ""
      )}${formField(
        "classId",
        "编入班级（可稍后）",
        "select",
        "",
        classOptions
      )}${formField(
        "validFrom",
        "生效日期",
        "date",
        new Date().toISOString().slice(0, 10)
      )}${formField("validTo", "有效期至", "date", "")}${formField(
        "admissionDate",
        "入学日期",
        "date",
        new Date().toISOString().slice(0, 10)
      )}</form>`,
      `<button class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" data-action="save-student-confirm">确认并建立课程账户</button>`,
      "学员管理"
    );
  }
  async function showInviteList() {
    const result = await call("coach", "inviteList"),
      rows = result.invitations || [];
    openModal(
      "教练邀请记录",
      rows.length
        ? `<table class="data-table"><thead><tr><th>创建时间</th><th>校区</th><th>状态</th><th>到期时间</th></tr></thead><tbody>${rows
            .map(
              (item) =>
                `<tr><td>${new Date(
                  item.createdAt
                ).toLocaleString()}</td><td>${escape(
                  item.campusId || "全部"
                )}</td><td><span class="status-chip ${statusClass(
                  item.status
                )}">${labelStatus(item.status)}</span></td><td>${new Date(
                  item.expiresAt
                ).toLocaleString()}</td></tr>`
            )
            .join("")}</tbody></table>`
        : empty("邀请记录")
    );
  }
  async function addClassStudentForm(classId) {
    const [students, packages] = await Promise.all([
      call("student", "list"),
      call("package", "studentList"),
    ]);
    const options = (students.students || []).map((item) => ({
        value: item.studentId,
        label: `${item.name} · ${item.className || "待分班"}`,
      })),
      packageOptions = (packages.packages || []).map((item) => ({
        value: item.studentPackageId,
        label: `${item.studentId} · ${item.name}`,
      }));
    openModal(
      "添加在班学员",
      `<form class="form-grid" id="classStudentForm" data-id="${classId}">${formField(
        "studentId",
        "选择学员",
        "select",
        "",
        options
      )}${formField(
        "defaultStudentPackageId",
        "默认课包",
        "select",
        "",
        packageOptions
      )}</form>`,
      `<button class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" data-action="save-class-student">确认加入班级</button>`,
      "班级管理"
    );
  }
  function bulkScheduleForm() {
    const classOptions = (state.data.classes || []).map((item) => ({
        value: item.classId,
        label: item.name,
      })),
      coachOptions = (state.data.coaches || []).map((item) => ({
        value: item.platformUserId,
        label: item.name,
      }));
    openModal(
      "批量排课",
      `<form class="form-grid" id="bulkScheduleForm">${formField(
        "classId",
        "班级",
        "select",
        "",
        classOptions
      )}${formField(
        "coachPlatformUserId",
        "授课教练",
        "select",
        "",
        coachOptions
      )}${formField(
        "weekday",
        "每周星期",
        "select",
        "1",
        Array.from({ length: 7 }, (_, i) => ({
          value: i + 1,
          label: `周${"一二三四五六日"[i]}`,
        }))
      )}${formField("startTime", "开始时间", "time", "18:30")}${formField(
        "plannedMinutes",
        "课堂时长",
        "select",
        "60",
        [
          { value: 60, label: "60分钟" },
          { value: 90, label: "90分钟" },
        ]
      )}${formField("venue", "上课场地", "text", "")}${formField(
        "validFrom",
        "开始日期",
        "date",
        new Date().toISOString().slice(0, 10)
      )}${formField(
        "validTo",
        "结束日期",
        "date",
        addDays(new Date().toISOString().slice(0, 10), 90)
      )}</form>`,
      `<button class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" data-action="save-bulk-schedule">生成并检查冲突</button>`,
      "排课管理"
    );
  }
  function studentEditForm(student = {}) {
    openModal(
      student.studentId ? "编辑学员" : "人工补录学员",
      `<form class="form-grid" id="studentEditForm" data-id="${escape(
        student.studentId || ""
      )}">${formField("name", "学员姓名", "text", student.name)}${formField(
        "gender",
        "性别",
        "select",
        student.gender,
        [
          { value: "男", label: "男" },
          { value: "女", label: "女" },
        ]
      )}${formField(
        "birthDate",
        "出生日期",
        "date",
        student.birthDate
      )}${formField(
        "guardianName",
        "家长姓名",
        "text",
        student.guardianName
      )}${formField(
        "guardianRelation",
        "与孩子关系",
        "text",
        student.guardianRelation
      )}${formField(
        "guardianPhone",
        "家长手机号",
        "text",
        student.guardianPhone
      )}${formField("school", "学校", "text", student.school)}${formField(
        "grade",
        "年级",
        "text",
        student.grade
      )}</form>`,
      `<button class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" data-action="save-student-edit">保存</button>`,
      "学员管理"
    );
  }
  async function ledgerAdjustForm() {
    const result = await call("package", "studentList"),
      options = (result.packages || []).map((item) => ({
        value: item.studentPackageId,
        label: `${item.studentId} · ${item.name} · 余额${item.remainingMinutes}分钟`,
      }));
    openModal(
      "紧急课消调整",
      `<div class="conflict-box">仅用于异常补录；正常修正应退回教练修改课堂记录。所有调整写入审计日志。</div><form class="form-grid" id="ledgerAdjustForm" style="margin-top:16px">${formField(
        "studentPackageId",
        "学员课包",
        "select",
        "",
        options
      )}${formField("deltaMinutes", "调整分钟数", "number", "")}${formField(
        "bucket",
        "余额类型",
        "select",
        "paid",
        [
          { value: "paid", label: "付费课时" },
          { value: "gift", label: "赠送课时" },
        ]
      )}${formField("reason", "调整原因", "textarea", "", [], true)}</form>`,
      `<button class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" data-action="save-ledger-adjust">确认调整</button>`,
      "课消流水"
    );
  }

  async function submitEntity(action) {
    const form = $("#entityForm"),
      values = Object.fromEntries(new FormData(form).entries()),
      type = form.dataset.type,
      id = form.dataset.id;
    try {
      if (action === "save-course") {
        if (id) values.courseId = id;
        await call("course", "upsert", { course: values });
      }
      if (action === "save-package") {
        if (id) values.templateId = id;
        await call("package", "upsert", { packageTemplate: values });
      }
      if (action === "save-class") {
        if (id) values.classId = id;
        await call("class", "upsert", { classInfo: values });
      }
      if (action === "save-lesson") {
        await call("schedule", "createLesson", { lesson: values });
      }
      if (action === "save-lesson-update") {
        await call("schedule", "updateLesson", {
          lessonId: id,
          lesson: values,
          reason: values.reason,
        });
      }
      closeModal();
      toast("已保存到正式教务系统");
      await loaders[state.route]();
    } catch (error) {
      toast(error.message);
    }
  }

  document.addEventListener("input", (event) => {
    if (event.target.id === "pageSearch") {
      state.search = event.target.value;
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => loaders[state.route](), 250);
    }
  });
  document.addEventListener("click", async (event) => {
    const route = event.target.closest("[data-route]")?.dataset.route;
    if (route) return showRoute(route);
    const selected = event.target.closest("[data-select]");
    if (selected) {
      state.selected[selected.dataset.select] = selected.dataset.id;
      return loaders[state.route]();
    }
    const action = event.target.closest("[data-action]")?.dataset.action,
      id = event.target.closest("[data-action]")?.dataset.id;
    if (!action) return;
    try {
      if (action === "close-modal") return closeModal();
      if (action === "new-course") return entityForm("course");
      if (action === "edit-course")
        return entityForm(
          "course",
          state.data.courses.find((item) => item.courseId === id) || {}
        );
      if (action === "course-status") {
        await call("course", "status", {
          courseId: id,
          status: event.target.closest("[data-action]").dataset.status,
        });
        return loaders.courses();
      }
      if (action === "new-package") return entityForm("package");
      if (action === "edit-package")
        return entityForm(
          "package",
          state.data.packages.find((item) => item.templateId === id) || {}
        );
      if (action === "new-class") return entityForm("class");
      if (action === "edit-class")
        return entityForm(
          "class",
          state.data.classes.find((item) => item.classId === id) || {}
        );
      if (action === "new-schedule") return entityForm("lesson");
      if (action === "edit-lesson")
        return entityForm(
          "lesson",
          state.data.lessons.find((item) => item.lessonId === id) || {}
        );
      if (
        [
          "save-course",
          "save-package",
          "save-class",
          "save-lesson",
          "save-lesson-update",
        ].includes(action)
      )
        return submitEntity(action);
      if (action === "coach-invite") return showCoachInvite();
      if (action === "student-gate") return showStudentGate();
      if (action === "rotate-gate") return showStudentGate(true);
      if (action === "copy-invite") {
        await navigator.clipboard.writeText($("#inviteLink").value);
        return toast("邀请链接已复制");
      }
      if (action === "revoke-invite") {
        await call("coach", "inviteRevoke", { inviteId: id });
        closeModal();
        return toast("邀请已撤销");
      }
      if (action === "disable-gate") {
        await call("student", "gateDisable", { gateId: id });
        closeModal();
        return toast("建档码已停用");
      }
      if (action === "confirm-student") return confirmStudentForm(id);
      if (action === "save-student-confirm") {
        const form = $("#studentConfirmForm"),
          values = Object.fromEntries(new FormData(form).entries());
        values.saleAmountCents = Math.round(
          Number(values.saleAmountYuan || 0) * 100
        );
        await call("student", "confirm", {
          studentId: form.dataset.id,
          setup: values,
        });
        closeModal();
        toast("学员档案已确认");
        return loaders.students();
      }
      if (action === "reject-student") {
        const reason = prompt("请输入退回原因");
        if (reason) {
          await call("student", "reject", { studentId: id, reason });
          return loaders.students();
        }
      }
      if (action === "approve-review") {
        await call("lesson", "approve", { lessonId: id });
        return loaders.reviews();
      }
      if (action === "return-review") {
        const reason = prompt("请输入退回修改要求");
        if (reason) {
          await call("lesson", "return", { lessonId: id, reason });
          return loaders.reviews();
        }
      }
      if (action === "cancel-lesson") {
        const reason = prompt("请输入停课原因");
        if (reason) {
          await call("schedule", "cancelLesson", { lessonId: id, reason });
          return loaders.schedules();
        }
      }
      if (action === "previous-week") {
        state.weekStart = addDays(state.weekStart, -7);
        return loaders.schedules();
      }
      if (action === "next-week") {
        state.weekStart = addDays(state.weekStart, 7);
        return loaders.schedules();
      }
      if (action === "today-week") {
        state.weekStart = mondayOf();
        return loaders.schedules();
      }
      if (action === "complete-class") {
        await call("class", "upsert", {
          classInfo: {
            ...(state.data.classes.find((item) => item.classId === id) || {}),
            status: "completed",
          },
        });
        return loaders.classes();
      }
      if (action === "manual-student") return studentEditForm();
      if (action === "edit-student")
        return studentEditForm(
          state.data.students.find((item) => item.studentId === id) || {}
        );
      if (action === "save-student-edit") {
        const form = $("#studentEditForm"),
          values = Object.fromEntries(new FormData(form).entries());
        if (form.dataset.id) values.studentId = form.dataset.id;
        values.source = form.dataset.id ? "pc_edit" : "pc_manual";
        values.confirmationStatus = "confirmed";
        values.status = "active";
        await call("student", "upsert", { student: values });
        closeModal();
        toast("学员资料已保存");
        return loaders.students();
      }
      if (action === "add-class-student") return addClassStudentForm(id);
      if (action === "save-class-student") {
        const form = $("#classStudentForm"),
          values = Object.fromEntries(new FormData(form).entries());
        values.classId = form.dataset.id;
        values.status = "active";
        await call("class", "memberUpsert", { member: values });
        closeModal();
        toast("学员已加入班级");
        return loaders.classes();
      }
      if (action === "bulk-schedule") return bulkScheduleForm();
      if (action === "save-bulk-schedule") {
        const values = Object.fromEntries(
            new FormData($("#bulkScheduleForm")).entries()
          ),
          lessons = [];
        let current = values.validFrom;
        while (current <= values.validTo && lessons.length < 100) {
          const weekday = new Date(`${current}T12:00:00`).getDay() || 7;
          if (weekday === Number(values.weekday))
            lessons.push({
              classId: values.classId,
              coachPlatformUserId: values.coachPlatformUserId,
              lessonDate: current,
              startTime: values.startTime,
              plannedMinutes: Number(values.plannedMinutes),
              venue: values.venue,
            });
          current = addDays(current, 1);
        }
        await call("schedule", "bulkCreate", { lessons });
        closeModal();
        toast(`已生成${lessons.length}节课堂`);
        return loaders.schedules();
      }
      if (action === "invite-list") return showInviteList();
      if (action === "edit-coach") {
        const coach =
          state.data.coaches.find((item) => item.coachId === id) || {};
        openModal(
          "编辑教练资料",
          `<form class="form-grid" id="coachEditForm" data-id="${escape(
            id
          )}">${formField("name", "教练姓名", "text", coach.name)}${formField(
            "phone",
            "手机号",
            "text",
            coach.phone
          )}${formField(
            "specialties",
            "擅长方向",
            "text",
            (coach.specialties || []).join("、")
          )}</form>`,
          '<button class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" data-action="save-coach-edit">保存</button>',
          "教练管理"
        );
        return;
      }
      if (action === "save-coach-edit") {
        const form = $("#coachEditForm"),
          values = Object.fromEntries(new FormData(form).entries()),
          coach =
            state.data.coaches.find(
              (item) => item.coachId === form.dataset.id
            ) || {};
        values.coachId = coach.coachId;
        values.platformUserId = coach.platformUserId;
        values.status = coach.status;
        values.specialties = values.specialties
          .split(/[、,，]/)
          .map((item) => item.trim())
          .filter(Boolean);
        await call("coach", "upsert", { coach: values });
        closeModal();
        toast("教练资料已保存");
        return loaders.coaches();
      }
      if (action === "disable-coach") {
        const coach =
          state.data.coaches.find((item) => item.coachId === id) || {};
        await call("coach", "upsert", {
          coach: { ...coach, status: "disabled" },
        });
        toast("教练账号已停用");
        return loaders.coaches();
      }
      if (action === "ledger-adjust") return ledgerAdjustForm();
      if (action === "save-ledger-adjust") {
        const values = Object.fromEntries(
          new FormData($("#ledgerAdjustForm")).entries()
        );
        values.deltaMinutes = Number(values.deltaMinutes);
        await call("ledger", "adjust", values);
        closeModal();
        toast("课消调整已记录");
        return loaders.ledger();
      }
    } catch (error) {
      toast(error.message);
    }
  });
  $("#modalClose").onclick = closeModal;
  $("#modalLayer").onclick = (event) => {
    if (event.target.id === "modalLayer") closeModal();
  };
  $("#collapseSidebar").onclick = () =>
    $("#eduShell").classList.toggle("collapsed");
  $("#refreshPage").onclick = () => loaders[state.route]();
  $("#switchTournament").onclick = () =>
    (location.href = `./tournament-center.html?organizationId=${encodeURIComponent(
      state.organizationId
    )}#workbench`);
  if (guard()) {
    const org = cached?.organization || {};
    $("#brandName").textContent = org.name || "赛小蜂篮球";
    $("#accountName").textContent = org.name || "机构负责人";
    showRoute(location.hash.slice(1) || "overview");
  }
})();
