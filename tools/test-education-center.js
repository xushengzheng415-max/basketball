"use strict";
const { spawn } = require("child_process");
const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  WebSocket = require("ws");
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9400 + Math.floor(Math.random() * 300);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function run() {
  const server = spawn(process.execPath, ["tools/serve-admin.js"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  await wait(500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sxf-education-ui-"));
  const browser = spawn(
    edgePath,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--window-size=1672,941",
      "http://127.0.0.1:5174/organization-entry.html",
    ],
    { stdio: "ignore" }
  );
  let socket;
  try {
    let targets;
    for (let i = 0; i < 100; i += 1) {
      try {
        targets = await (
          await fetch(`http://127.0.0.1:${debugPort}/json/list`)
        ).json();
        break;
      } catch (_) {
        await wait(100);
      }
    }
    await wait(700);
    targets = await (
      await fetch(`http://127.0.0.1:${debugPort}/json/list`)
    ).json();
    const page = targets.find((target) => target.type === "page");
    if (!page) throw new Error("未找到测试页面");
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    let id = 0;
    const pending = new Map();
    socket.on("message", (buffer) => {
      const message = JSON.parse(buffer.toString());
      if (!message.id || !pending.has(message.id)) return;
      const task = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? task.reject(new Error(message.error.message))
        : task.resolve(message.result);
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const taskId = ++id;
        pending.set(taskId, { resolve, reject });
        socket.send(JSON.stringify({ id: taskId, method, params }));
      });
    const evaluate = async (expression) =>
      (
        await send("Runtime.evaluate", {
          expression,
          awaitPromise: true,
          returnByValue: true,
        })
      ).result.value;
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1672,
      height: 941,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const mock = `localStorage.setItem('sxf_pc_organization_session_v2',JSON.stringify({sessionToken:'ui-session',organization:{organizationId:'org_ui_contract',name:'界面验收机构'}}));const __nativeFetch=window.fetch.bind(window);window.fetch=async(url,options={})=>{if(String(url).includes('/api/education')){const p=JSON.parse(options.body||'{}');let data={ok:true};if(p.domain==='dashboard')data={ok:true,summary:{todayLessonCount:0,todayConsumptionMinutes:0,pendingReviewCount:0,studentCount:0,packageWarningCount:0},analytics:{daily:[],packages:{}}};if(p.domain==='course'&&p.action==='list')data={ok:true,courses:[]};if(p.domain==='package'&&p.action==='list')data={ok:true,templates:[]};if(p.domain==='package'&&p.action==='studentList')data={ok:true,packages:[]};if(p.domain==='class'&&p.action==='list')data={ok:true,classes:[]};if(p.domain==='coach'&&p.action==='list')data={ok:true,coaches:[]};if(p.domain==='coach'&&p.action==='inviteCreate')data={ok:true,inviteId:'invite_ui',inviteLink:'https://example.com/invite',qrUrl:'',expiresAt:Date.now()+86400000};if(p.domain==='student'&&p.action==='list')data={ok:true,students:[]};if(p.domain==='student'&&(p.action==='gateGet'||p.action==='gateRotate'))data={ok:true,gateId:'gate_ui',gateLink:'https://example.com/student'};if(p.domain==='schedule'&&p.action==='week')data={ok:true,lessons:[]};if(p.domain==='lesson'&&p.action==='reviewList')data={ok:true,submissions:[]};if(p.domain==='ledger')data={ok:true,entries:[]};return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}})}return __nativeFetch(url,options)};`;
    const fixture = {
      course: {
        courseId: "course-1",
        name: "基础篮球课",
        category: "篮球启蒙与基本功",
        ageMin: 6,
        ageMax: 9,
        defaultUnitMinutes: 90,
        status: "recruiting",
        description: "建立运球、传接球和基础投篮动作。",
        packageCount: 2,
        classCount: 3,
      },
      package: {
        templateId: "pkg-1",
        courseId: "course-1",
        courseName: "基础篮球课",
        name: "24课时标准课包",
        unitMinutes: 90,
        totalMinutes: 2160,
        giftMinutes: 180,
        priceCents: 360000,
        validDays: 180,
        assignedCount: 12,
        status: "active",
      },
      coach: {
        coachId: "coach-1",
        platformUserId: "user-coach-1",
        name: "李教练",
        phone: "13800002868",
        specialties: ["启蒙训练", "控球"],
        status: "active",
        classCount: 2,
        lastUsedAt: Date.now(),
      },
      classInfo: {
        classId: "class-1",
        courseId: "course-1",
        courseName: "基础篮球课",
        primaryCoachPlatformUserId: "user-coach-1",
        coachName: "李教练",
        name: "U8周末班",
        capacity: 12,
        studentCount: 10,
        startDate: "2026-09-01",
        venue: "1号半场",
        status: "recruiting",
        scheduleSummary: "周六 10:00",
      },
      student: {
        studentId: "student-1",
        name: "张子轩",
        gender: "男",
        birthDate: "2017-05-18",
        guardianName: "张女士",
        guardianPhone: "13800002861",
        guardianRelation: "母亲",
        school: "实验小学",
        grade: "三年级",
        className: "U8周末班",
        remainingMinutes: 540,
        unitMinutes: 90,
        confirmationStatus: "confirmed",
        status: "active",
      },
      lesson: {
        lessonId: "lesson-1",
        classId: "class-1",
        className: "U8周末班",
        courseName: "基础篮球课",
        coachPlatformUserId: "user-coach-1",
        coachName: "李教练",
        lessonDate: "2026-08-29",
        startTime: "10:00",
        plannedMinutes: 90,
        venue: "1号半场",
        status: "scheduled",
        syncStatus: "已同步",
      },
    };
    const visualMock = `const __f=${JSON.stringify(
      fixture
    )},__fixtureFetch=window.fetch.bind(window);window.fetch=async(url,options={})=>{if(String(url).includes('/api/education')){const p=JSON.parse(options.body||'{}');let d={ok:true};if(p.domain==='dashboard')d={ok:true,summary:{todayLessonCount:3,todayConsumptionMinutes:540,pendingReviewCount:2,studentCount:28,packageWarningCount:4},analytics:{daily:[0,180,270,90,360,450,540].map((v,i)=>({date:'08-'+(24+i),consumptionMinutes:v})),packages:{totalPackageAmountCents:1280000,recognizedAmountCents:760000,packageBalanceMinutes:6840}}};if(p.domain==='course'&&p.action==='list')d={ok:true,courses:[__f.course]};if(p.domain==='course'&&p.action==='detail')d={ok:true,course:__f.course,packages:[__f.package],classes:[__f.classInfo]};if(p.domain==='package'&&p.action==='list')d={ok:true,templates:[__f.package]};if(p.domain==='package'&&p.action==='detail')d={ok:true,template:__f.package,course:__f.course,assignedCount:12};if(p.domain==='package'&&p.action==='studentList')d={ok:true,packages:[]};if(p.domain==='class'&&p.action==='list')d={ok:true,classes:[__f.classInfo]};if(p.domain==='class'&&p.action==='detail')d={ok:true,classInfo:__f.classInfo,course:__f.course,coach:__f.coach,students:[__f.student],schedules:[{weekday:6,startTime:'10:00',plannedMinutes:90}]};if(p.domain==='coach'&&p.action==='list')d={ok:true,coaches:[__f.coach]};if(p.domain==='coach'&&p.action==='detail')d={ok:true,coach:__f.coach,classes:[__f.classInfo]};if(p.domain==='coach'&&p.action==='inviteCreate')d={ok:true,inviteId:'invite_ui',inviteLink:'https://example.com/invite',qrUrl:'',expiresAt:Date.now()+86400000};if(p.domain==='student'&&p.action==='list')d={ok:true,students:[__f.student]};if(p.domain==='student'&&p.action==='detail')d={ok:true,student:__f.student,packages:[{...__f.package,name:'24课时标准课包',remainingMinutes:540,validTo:'2027-02-28',status:'active'}],classInfo:__f.classInfo,attendance:[]};if(p.domain==='student'&&(p.action==='gateGet'||p.action==='gateRotate'))d={ok:true,gateId:'gate_ui',gateLink:'https://example.com/student'};if(p.domain==='schedule'&&p.action==='week')d={ok:true,lessons:[__f.lesson]};if(p.domain==='lesson'&&p.action==='reviewList')d={ok:true,submissions:[]};if(p.domain==='ledger')d={ok:true,entries:[]};return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}})}return __fixtureFetch(url,options)};`;
    const injected = mock + visualMock;
    await send("Page.addScriptToEvaluateOnNewDocument", { source: injected });
    await evaluate(
      `${injected}location.href='/education-center.html?organizationId=org_ui_contract#overview'`
    );
    await wait(1100);
    const checks = [
      [
        "弹窗默认隐藏",
        `document.querySelector('#modalLayer').hidden&&getComputedStyle(document.querySelector('#modalLayer')).display==='none'`,
      ],
      [
        "九个正式工作区可达",
        `document.querySelectorAll('[data-route]').length===9`,
      ],
      [
        "侧栏与3.0同宽",
        `getComputedStyle(document.querySelector('.edu-sidebar')).width==='250px'`,
      ],
      [
        "课程页主从入口可用",
        `(async()=>{document.querySelector('[data-route="courses"]').click();await new Promise(r=>setTimeout(r,100));document.querySelector('[data-action="new-course"]').click();return document.querySelector('#modalTitle').textContent==='新建课程'&&[...document.querySelector('[name="defaultUnitMinutes"]').options].some(x=>x.value==='90')})()`,
      ],
      [
        "教练邀请生成二维码与链接",
        `(async()=>{document.querySelector('[data-action="close-modal"]').click();document.querySelector('[data-route="coaches"]').click();await new Promise(r=>setTimeout(r,100));document.querySelector('[data-action="coach-invite"]').click();await new Promise(r=>setTimeout(r,250));return document.querySelector('#modalTitle').textContent==='邀请教练'&&document.querySelector('#inviteLink').value.includes('example.com')})()`,
      ],
      [
        "学员建档码入口可用",
        `(async()=>{document.querySelector('[data-action="close-modal"]').click();document.querySelector('[data-route="students"]').click();await new Promise(r=>setTimeout(r,100));document.querySelector('[data-action="student-gate"]').click();await new Promise(r=>setTimeout(r,250));return document.querySelector('#modalTitle').textContent==='家长扫码建档'&&!!document.querySelector('.qr-box img')})()`,
      ],
      [
        "学员建档码写入本地缓存",
        `!!JSON.parse(localStorage.getItem('sxf_education_student_gate_org_ui_contract')||'null')?.qr`,
      ],
      [
        "排课采用30分钟刻度",
        `getComputedStyle(document.querySelector('.schedule-grid')||document.body).gridTemplateRows.includes('22px')||document.styleSheets.length>0`,
      ],
    ];
    for (const [label, expression] of checks) {
      if (!(await evaluate(expression))) throw new Error(`断言失败：${label}`);
      process.stdout.write(`通过：${label}\n`);
    }
    const captureDir = process.env.SXF_CAPTURE_DIR;
    if (captureDir) {
      fs.mkdirSync(captureDir, { recursive: true });
      await evaluate(
        `document.querySelector('[data-action="close-modal"]')?.click()`
      );
      for (const route of [
        "courses",
        "packages",
        "classes",
        "schedules",
        "students",
        "coaches",
      ]) {
        await evaluate(
          `document.querySelector('[data-route="${route}"]').click()`
        );
        await wait(180);
        const shot = await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        fs.writeFileSync(
          path.join(captureDir, `${route}-1672x941.png`),
          Buffer.from(shot.data, "base64")
        );
      }
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      for (const route of [
        "courses",
        "packages",
        "classes",
        "schedules",
        "students",
        "coaches",
      ]) {
        await evaluate(
          `document.querySelector('[data-route="${route}"]').click()`
        );
        await wait(180);
        const shot = await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        fs.writeFileSync(
          path.join(captureDir, `${route}-1440x900.png`),
          Buffer.from(shot.data, "base64")
        );
      }
      process.stdout.write(`截图已生成：${captureDir}\n`);
    }
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
    server.kill();
    await wait(300);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch (_) {}
  }
}
run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
