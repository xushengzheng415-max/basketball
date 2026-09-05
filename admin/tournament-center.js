(() => {
  'use strict';

  const ICON_ROOT = './assets/icons/pc-common/svg/';
  const KNOCKOUT_EMPTY_RESET_REVISION = '20260819-empty-4';
  const store = window.SXFTournamentStore;
  const shell = document.getElementById('tournamentShell');
  const sidebar = shell.querySelector('.tournament-sidebar');
  const navElement = document.getElementById('tournamentNav');
  const subnavBar = document.getElementById('subnavBar');
  const subnavElement = document.getElementById('subnav');
  const pageActions = document.getElementById('pageActions');
  const content = document.getElementById('tournamentContent');
  const moduleTitle = document.getElementById('moduleTitle');
  const spaceReturn = document.getElementById('spaceReturn');
  const eventSelector = document.getElementById('eventSelector');
  const eventStatus = document.getElementById('eventStatus');
  const eventDate = document.getElementById('eventDate');
  const modalLayer = document.getElementById('modalLayer');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');
  const toastElement = document.getElementById('toast');
  const query = new URLSearchParams(location.search);
  const PC_AUTH_API = 'https://sxf-basketball-d9gp6yt0rd1f7be4d.service.tcloudbase.com/api/pc-auth';
  const isDemoMode = query.get('demo') === '1';
  const organizationId = query.get('organizationId') || 'local';
  const sessionKey = 'sxf_institution_session_v1';
  const cloudSessionKey = 'sxf_pc_organization_session_v2';
  const deviceKey = 'sxf_institution_device_v1';
  const accountsKey = 'sxf_institution_accounts_v1';
  const pinsKey = 'sxf_institution_pins_v1';
  const pinGuardKey = 'sxf_institution_pin_guard_v1';
  const idleTtl = 30 * 60 * 1000;
  let activeSession = null;
  let cloudPcSession = false;
  let eventLocked = false;
  let lastActivityWrite = 0;
  let lastRenderRouteKey = '';
  let selectedTeamName = '猛虎队';
  let selectedPlayerKey = '';
  let teamLibraryGroupFilter = '';
  let teamLibraryStatusFilter = '';
  let playerArchiveTeamFilter = '';
  let playerArchiveRealNameFilter = '';
  let playerArchiveDataFilter = '';
  let selectedOnsiteMatchId = 'G1001';
  let selectedReviewMatchId = 'G1003';
  const eventSpacesKey = `sxf_tournament_spaces_v2_${organizationId}`;
  const selectedEventKey = `sxf_tournament_selected_space_v2_${organizationId}`;
  let eventSpaces = readJson(eventSpacesKey, []);
  if (!Array.isArray(eventSpaces)) eventSpaces = [];
  let selectedEventId = localStorage.getItem(selectedEventKey) || '';
  if (!eventSpaces.some((eventSpace) => eventSpace.id === selectedEventId)) selectedEventId = eventSpaces[0]?.id || '';
  const uploadedEventImages = { logo: '', cover: '', createLogo: '', teamLogo: '' };
  let createEventDraft = null;
  let registrationTeamDraft = null;
  let pendingEventId = '';
  let pendingGroupId = '';
  let pendingImageEdit = null;
  let eventGroupRows = [];
  let selectedFormatGroupId = '';
  let selectedFormatGroupName = '';
  let selectedFormatStageId = 'group-stage';
  let selectedDrawGroupId = '';
  let selectedRuleTemplatePreview = 'universal';
  let selectedVenueId = '';
  let pendingRegistrationTeamId = '';
  let pendingVirtualTeamIds = new Set();
  let registrationGroupFilter = '';
  let registrationStatusFilter = '';
  let registrationCloudSyncing = false;
  let registrationCloudSyncAt = 0;
  let calendarVenueFilter = '';
  let calendarTimeFilter = '';
  let matchSheetFilters = { phase: '', round: '', group: '', subgroup: '', team: '', venue: '', state: '' };
  let matchSheetSort = 'group-time';
  let onsiteDateFilter = '';
  let onsiteGroupFilter = '';
  let onsiteVenueFilter = '';
  let onsiteStatusFilter = '';
  let selectedRefereeId = '';
  let refereeStatusFilter = '';
  let competitionScheduleOrientation = 'portrait';
  let resultReviewView = 'table';
  let resultReportDateFilter = '';
  let pendingManualScheduleSlot = null;
  let pendingManualScheduleDraft = null;
  let pendingGroupMutationCommit = null;
  let drawPosterDraft = { ratio: '16:9', style: 'orange', teamScale: 100 };
  eventGroupRows = loadEventGroupRows();
  selectedFormatGroupId = activeEventSpace()?.firstGroupId || eventGroupRows.find((group) => group.name === activeEventSpace()?.firstGroup)?.id || eventGroupRows[0]?.id || '';
  selectedFormatGroupName = eventGroupRows.find((group) => group.id === selectedFormatGroupId)?.name || activeEventSpace()?.firstGroup || eventGroupRows[0]?.name || '';
  const initialEventSpace = activeEventSpace();
  const recentDrawGroupId = Object.entries(initialEventSpace?.drawStates || {})
    .filter(([groupId]) => eventGroupRows.some((group) => group.id === groupId))
    .sort(([, left], [, right]) => String(right?.updatedAt || '').localeCompare(String(left?.updatedAt || '')))[0]?.[0] || '';
  selectedDrawGroupId = eventGroupRows.some((group) => group.id === initialEventSpace?.drawSelectedGroupId)
    ? initialEventSpace.drawSelectedGroupId
    : recentDrawGroupId || selectedFormatGroupId;
  if (initialEventSpace && initialEventSpace.drawSelectedGroupId !== selectedDrawGroupId) {
    initialEventSpace.drawSelectedGroupId = selectedDrawGroupId;
    persistEventSpaces();
  }

  const navItems = [
    { id: 'workbench', label: '赛事工作台', icon: 'layout-dashboard' },
    { id: 'event', label: '赛事管理', icon: 'clipboard-list' },
    { id: 'registration', label: '报名与资格', icon: 'badge-check' },
    { id: 'draw', label: '抽签与分组', icon: 'shuffle' },
    { id: 'teams', label: '球队与球员', icon: 'users-round' },
    { id: 'schedule', label: '赛程与场次', icon: 'calendar-days' },
    { id: 'onsite', label: '现场执行', icon: 'clipboard-check' },
    { id: 'results', label: '赛果与数据', icon: 'chart-column' }
  ];

  const pages = {
    event: [
      ['profile', '赛事资料'], ['groups', '组别设置'], ['format', '赛制设置'],
      ['registration', '报名设置'], ['posters', '报名海报'], ['rules', '赛事规则']
    ],
    registration: [
      ['progress', '入驻进度'], ['claims', '球队认领'], ['qualification', '球员资格'], ['rosters', '正式名单']
    ],
    draw: [
      ['groups', '小组赛及晋级'], ['round-robin', '纯循环赛'], ['knockout', '单败淘汰']
    ],
    teams: [
      ['teams', '球队库'], ['players', '球员档案']
    ],
    schedule: [
      ['calendar', '赛程日历'], ['matches', '竞赛日程'],
      ['settings', '赛程设置']
    ],
    onsite: [
      ['referees', '裁判名单'], ['people', '人员与任务'], ['data-tasks', '球员数据任务'], ['consoles', '控制台状态']
    ],
    results: [
      ['review', '赛果与复核'], ['standings', '积分与球队'], ['reports', '赛事战报'],
      ['players', '球员数据'], ['settlement', '数据包分账']
    ]
  };

  const teams = [
    ['雷霆队', '#ff7a00'], ['飞跃队', '#4b91ff'], ['极光队', '#49c869'], ['猎鹰队', '#f8b21a'],
    ['晨光队', '#9a78ff'], ['雄鹿队', '#e35855'], ['风暴队', '#39b7b0'], ['先锋队', '#d16bd2'],
    ['蓝鲸队', '#397bdb'], ['勇士队', '#ff8e16'], ['猛虎队', '#d64e35'], ['光明队', '#e2c451'],
    ['未来之星', '#55b6ff'], ['城市篮魔', '#976cd6'], ['破浪队', '#43c2cc'], ['黑豹队', '#707984']
  ];
  const teamColor = Object.fromEntries(teams);

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function activeEventSpace() {
    return eventSpaces.find((eventSpace) => eventSpace.id === selectedEventId) || eventSpaces[0];
  }

  function persistEventSpaces() {
    writeJson(eventSpacesKey, eventSpaces);
    if (selectedEventId) localStorage.setItem(selectedEventKey, selectedEventId);
    else localStorage.removeItem(selectedEventKey);
  }

  function participationMode(eventSpace = activeEventSpace()) {
    return eventSpace?.participationMode === 'team-only' ? 'team-only' : 'team-player';
  }

  function usesPlayerData(eventSpace = activeEventSpace()) {
    return participationMode(eventSpace) === 'team-player';
  }

  function registrationSettings(eventSpace = activeEventSpace()) {
    const defaults = {
      startAt: '2026-06-20T09:00', endAt: '2026-07-10T18:00', minRoster: '8', maxRoster: '16',
      feeMode: '按人收费', feeAmount: '268', feeUnit: '元/人', prize: '冠军组奖金 888 元',
      benefits: '场地、保险、裁判、定制球服、照片直播、MC 现场解说、奖杯奖牌证书',
      publicLocation: eventSpace?.regionLabel || '', subtitle: '少年有志，热血开赛',
      contactName: '赵负责人', contactPhone: '138 0000 8899'
    };
    eventSpace.registrationSettings = Object.assign(defaults, eventSpace.registrationSettings || {});
    return eventSpace.registrationSettings;
  }

  function organizationUnits(eventSpace = activeEventSpace()) {
    const organizationName = document.getElementById('organizationName')?.textContent?.trim() || '赛事组委会';
    const legacy = eventSpace?.ruleSettings || {};
    const defaults = {
      organizer: legacy.organizer || legacy.publisher || organizationName,
      undertaker: legacy.undertaker || `${organizationName}赛事组委会`,
      coOrganizer: legacy.coOrganizer || ''
    };
    eventSpace.organizationUnits = Object.assign(defaults, eventSpace.organizationUnits || {});
    return eventSpace.organizationUnits;
  }

  function ruleSettings(eventSpace = activeEventSpace()) {
    const units = organizationUnits(eventSpace);
    const defaults = {
      template: 'small-basketball',
      templateSelected: true,
      title: `${eventSpace?.name || '篮球赛事'}竞赛规程`,
      publisher: units.organizer,
      organizer: units.organizer,
      undertaker: units.undertaker,
      coOrganizer: units.coOrganizer,
      ruleBase: '中国篮协小篮球规则及赛事特别规定',
      scope: '全部竞赛组别',
      effectiveDate: eventSpace?.startDate || '2026-07-12',
      lateMinutes: '15',
      protestWindow: '比赛结束后 30 分钟内',
      protestDeposit: '500',
      forfeitScore: '0:20',
      insuranceRequired: '必须购买赛事意外保险',
      imageAuthorization: '报名即确认赛事影像授权',
      version: 1,
      published: false,
      lastEditedAt: ''
    };
    const existing = eventSpace.ruleSettings || {};
    eventSpace.ruleSettings = Object.assign(defaults, existing);
    Object.assign(eventSpace.ruleSettings, units, { publisher: units.organizer });
    if (eventSpace.ruleDraftHtml && eventSpace.ruleSettings.template && existing.templateSelected === undefined) eventSpace.ruleSettings.templateSelected = true;
    return eventSpace.ruleSettings;
  }

  function syncOrganizationUnitsToRuleDraft(eventSpace = activeEventSpace()) {
    if (!eventSpace?.ruleDraftHtml) return;
    const units = organizationUnits(eventSpace);
    const template = document.createElement('template');
    template.innerHTML = eventSpace.ruleDraftHtml;
    Object.entries(units).forEach(([key, rawValue]) => {
      const value = rawValue || (key === 'coOrganizer' ? '无' : '待补充');
      template.content.querySelectorAll(`[data-rule-unit-value="${key}"]`).forEach((node) => { node.textContent = value; });
    });
    eventSpace.ruleDraftHtml = template.innerHTML.trim();
  }

  function formatRuleDate(value) {
    if (!value) return '待确定';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${year}年${Number(month)}月${Number(day)}日` : String(value);
  }

  function ruleTemplateProfile(template) {
    const profiles = {
      'small-basketball': {
        name: '中国小篮球赛事规程',
        audience: 'U6—U12 小篮球赛事',
        special: '按年龄组分别明确上场人数、场地、比赛用球、篮圈高度、比赛时长、防守方式及轮换要求；不设置任何等级评定、星级测试或达标评级。'
      },
      'youth-public': {
        name: '青少年篮球公开组竞赛规程',
        audience: '大众参赛型青少年赛事',
        special: '强化实名证件核验、最低开赛人数、低年龄组特殊规则、友爱规则和家长观赛秩序。'
      },
      'youth-elite': {
        name: '青少年篮球精英组竞赛规程',
        audience: '高水平青少年赛事',
        special: '采用标准篮球规则与场地参数，强化技术统计、单项奖、申诉时限及赛风赛纪处罚程序。'
      },
      'youth-3v3': {
        name: '青少年 3V3 挑战赛规程',
        audience: '3V3 分组循环与淘汰赛事',
        special: '采用 3×3 篮球规则，重点明确 12 秒进攻、21 分提前获胜、球权交换和犯规处罚。'
      },
      campus: { name: '校园篮球邀请赛规程', audience: '学校或校区间邀请赛', special: '强化学校领队责任、学籍年龄、保险和校园纪律。' },
      commercial: { name: '商业篮球公开赛规程', audience: '市场化公开报名赛事', special: '强化报名收费、影像授权、数据服务、退赛与争议处理。' },
      universal: { name: '篮球赛事通用竞赛规程', audience: '机构联赛、邀请赛、杯赛及综合性篮球赛事', special: '采用中性、完整的办赛条款，不绑定特定赛事品牌或专有制度，并按当前组别自动写入竞赛参数。' },
      'youth-5v5': { name: '青少年 5V5 联赛规程', audience: 'U8—U16 联赛', special: '适用于小组循环与第二阶段淘汰赛。' }
    };
    return profiles[template] || profiles.universal;
  }

  const ruleTemplateIds = ['universal', 'small-basketball', 'youth-public', 'youth-elite', 'youth-3v3', 'campus', 'commercial'];

  function ruleTemplatePreviewData(template) {
    const previews = {
      universal: { badge: '通用正式版', focus: ['完整 16 章结构', '自动读取赛事与组别参数', '适合联赛、杯赛及邀请赛'], chapters: ['竞赛总则与组织机构', '参赛资格与报名办法', '竞赛办法与比赛规则', '纪律、申诉、安全与附则'] },
      'small-basketball': { badge: '小篮球线上报名版', focus: ['比赛名称、组织机构、竞赛信息', '线上报名小程序码', '比赛规则及场地器材', '名次奖励与赛场纪律'], chapters: ['比赛名称、组织机构与竞赛信息', '参赛资格要求与线上报名办法', '竞赛办法、比赛规则及场地器材', '名次奖励、赛场纪律及经费'], note: '沿用原规程正文顺序；已删除等级评定和纸质附件，改为小程序扫码报名' },
      'youth-public': { badge: '公开组版', focus: ['实名身份与出生日期核验', '最低开赛人数', '低年龄组友爱规则'], chapters: ['竞赛总则与公开组设置', '参赛资格及证件审核', '竞赛办法与低龄特别规则', '观赛秩序、申诉与纪律'] },
      'youth-elite': { badge: '精英组版', focus: ['标准场地与完整规则', '技术统计与单项奖', '严格的纪律和申诉程序'], chapters: ['竞赛项目与精英组资格', '标准比赛规则与技术统计', '排名、晋级及奖项', '纪律处罚与仲裁程序'] },
      'youth-3v3': { badge: '3V3 正式版', focus: ['12 秒进攻', '21 分提前获胜', '球权交换与犯规处罚'], chapters: ['3V3 参赛资格与报名', '分组循环及淘汰办法', '3×3 特别比赛规则', '排名、纪律与安全'] },
      campus: { badge: '校园赛事版', focus: ['学校领队责任', '学籍与年龄核验', '校园保险和纪律'], chapters: ['主承办单位与学校职责', '学籍、年龄和参赛资格', '竞赛办法与赛场纪律', '安全、医疗及附则'] },
      commercial: { badge: '商业赛事版', focus: ['报名收费和退赛规则', '品牌及影像授权', '数据服务与争议处理'], chapters: ['赛事组织与商业权益', '报名收费及退费规则', '品牌、影像和数据服务', '争议处理、安全与附则'] }
    };
    return previews[template] || previews.universal;
  }

  function renderRuleTemplateChooser(mode = 'page') {
    const selected = ruleTemplateIds.includes(selectedRuleTemplatePreview) ? selectedRuleTemplatePreview : 'universal';
    const profile = ruleTemplateProfile(selected);
    const preview = ruleTemplatePreviewData(selected);
    const eventSpace = activeEventSpace();
    const settings = ruleSettings(eventSpace);
    const groupNames = (eventSpace?.groupRows || []).map((group) => group.name).filter(Boolean).join('、') || '尚未创建组别';
    return `<div class="rule-template-chooser ${mode === 'modal' ? 'is-modal' : ''}">
      <div class="rule-template-catalog" role="listbox" aria-label="竞赛规程模板">
        ${ruleTemplateIds.map((template) => {
          const item = ruleTemplateProfile(template);
          const itemPreview = ruleTemplatePreviewData(template);
          return `<button type="button" class="rule-template-choice${template === selected ? ' active' : ''}" data-action="preview-rule-template" data-template="${template}" role="option" aria-selected="${template === selected}">
            <span><b>${esc(item.name)}</b><em>${esc(itemPreview.badge)}</em></span><small>${esc(item.audience)}</small>${icon('chevron-right')}
          </button>`;
        }).join('')}
      </div>
      <section class="rule-template-preview" data-template-preview="${selected}">
        <header><div><small>模板预览</small><h3>${esc(profile.name)}</h3><p>${esc(profile.audience)}</p></div><span>${esc(preview.badge)}</span></header>
        <div class="template-preview-paper">
          <div class="template-preview-title"><h4>${esc(eventSpace?.name || '篮球赛事')}竞赛规程</h4><p>主办单位：${esc(settings.organizer || '待补充')}</p><p>承办单位：${esc(settings.undertaker || '待补充')}　协办单位：${esc(settings.coOrganizer || '无')}</p></div>
          <div class="template-preview-summary"><span>适用组别</span><b>${esc(groupNames)}</b></div>
          ${preview.note ? `<div class="template-preview-note">${icon('circle-check-big')} ${esc(preview.note)}</div>` : ''}
          <ol>${preview.chapters.map((chapter, index) => `<li><b>${['一','二','三','四'][index]}、${esc(chapter)}</b><p>${esc(preview.focus[index % preview.focus.length])}，具体内容将按当前赛事资料自动生成。</p></li>`).join('')}</ol>
          <div class="template-preview-focus">${preview.focus.map((item) => `<span>${esc(item)}</span>`).join('')}</div>
        </div>
        <footer><p>确认后生成 16 章正式规程，正文仍可逐条修改；选择模板不会直接发布。</p>${btn('使用此模板生成规程', 'confirm-rule-template', 'primary', 'file-text')}</footer>
      </section>
    </div>`;
  }

  function renderRuleTemplateStart() {
    return `<section class="rule-template-start">
      ${heading('先选择竞赛规程模板', '系统将根据模板结构读取赛事资料、组别、报名和奖项信息，生成初稿后再进行微调。')}
      ${renderRuleTemplateChooser('page')}
    </section>`;
  }

  function openRuleTemplateChooser() {
    openModal('更换竞赛规程模板', renderRuleTemplateChooser('modal'), '', 'rule-template-modal');
  }

  function applyRuleTemplateToEvent(template) {
    const eventSpace = activeEventSpace();
    if (!eventSpace) return;
    const settings = captureRuleState(eventSpace) || ruleSettings(eventSpace);
    const presets = {
      universal: { template, ruleBase: '中国篮协最新审定《篮球规则》', insuranceRequired: '建议购买赛事意外保险', imageAuthorization: '监护人单独勾选授权' },
      'small-basketball': { template, ruleBase: '中国篮协小篮球规则及赛事特别规定', insuranceRequired: '必须购买赛事意外保险', imageAuthorization: '监护人单独勾选授权' },
      'youth-public': { template, ruleBase: '中国篮协小篮球规则及赛事特别规定', insuranceRequired: '必须购买赛事意外保险', imageAuthorization: '监护人单独勾选授权' },
      'youth-elite': { template, ruleBase: '中国篮协最新审定《篮球规则》', insuranceRequired: '必须购买赛事意外保险', imageAuthorization: '监护人单独勾选授权' },
      'youth-3v3': { template, ruleBase: 'FIBA 3×3 篮球规则', insuranceRequired: '必须购买赛事意外保险', imageAuthorization: '监护人单独勾选授权' },
      campus: { template, ruleBase: '中国篮协小篮球规则', insuranceRequired: '由主办方统一购买', imageAuthorization: '监护人单独勾选授权' },
      commercial: { template, ruleBase: '中国篮协最新审定《篮球规则》', insuranceRequired: '必须购买赛事意外保险', imageAuthorization: '报名即确认赛事影像授权' }
    };
    Object.assign(settings, presets[template] || presets.universal, { templateSelected: true });
    settings.templateSchemaVersion = template === 'small-basketball' ? 'small-basketball-online-v2' : `${template}-v1`;
    eventSpace.ruleDraftHtml = buildRuleDocument(eventSpace, settings);
    eventSpace.ruleSourceFingerprint = ruleSourceFingerprint(eventSpace);
    settings.hasUnpublishedChanges = true;
    persistEventSpaces();
    closeModal();
    render();
    showToast(`已使用“${ruleTemplateProfile(template).name}”生成规程初稿`);
  }

  function smallBasketballParameter(group) {
    const age = Number(String(group.name || '').match(/U(\d+)/i)?.[1] || 0);
    if (age && age <= 6) return [group.format || '3V3', '15×12 米', '4 号球', '2.00 米', group.duration || '4×6 分钟', '半场人盯人、分组上场'];
    if (age && age <= 8) return [group.format || '4V4', '15×12 米', age === 7 ? '4 号球' : '5 号球', '2.35 米', group.duration || '4×6 分钟', '前两节半场人盯人'];
    if (age && age <= 10) return [group.format || '4V4', '15×12 米', '5 号球', '2.60 米', group.duration || '4×8 分钟', '前两节半场人盯人'];
    if (age === 11) return [group.format || '5V5', '24.4×15 米或标准场地', '5 号球', '2.75 米', group.duration || '4×10 分钟', '全场人盯人'];
    return [group.format || '5V5', '28×15 米', '5 号球', '3.05 米', group.duration || '4×10 分钟', '按组别规则执行'];
  }

  function smallBasketballOperationalRules(group) {
    const age = Number(String(group.name || '').match(/U(\d+)/i)?.[1] || 0);
    const sharedClock = '前 3 节采用毛时，每节最后 10 秒采用净时；毛时期间暂停停表，罚球和换人不停表；第 4 节最后 2 分钟采用净时';
    const sharedBreaks = '第 1—2 节、第 3—4 节之间休息 1 分钟，中场休息 3 分钟';
    if (age === 6) {
      return {
        ruleBase: '中国篮球协会最新版《小篮球三对三规则》及本赛事特别规定',
        clock: sharedClock,
        breaks: sharedBreaks,
        timeout: '上、下半时各 1 次，每次 30 秒',
        tiebreak: '比分相等时，双方先各选 3 名队员依次罚球；仍相等时，由其他队员一对一轮流罚球，直至一方领先 1 分',
        foul: '个人犯规不设累计离场次数；全队累计第 5 次起进入犯规罚球状态，不执行“2+1”加罚；罚球时按规则设置站位',
        lineup: '赛前提交两套阵容，每套 4 人（3 名首发+1 名替补）；第 1—2 节分别使用不同阵容，第 3—4 节可自由轮换'
      };
    }
    if (age >= 7 && age <= 9) {
      return {
        ruleBase: '中国篮球协会最新版《小篮球四对四规则》及本赛事特别规定',
        clock: sharedClock,
        breaks: sharedBreaks,
        timeout: '上、下半时各 1 次，每次 30 秒',
        tiebreak: '比分相等时，双方先各选 4 名队员依次罚球；仍相等时，由其他队员一对一轮流罚球，直至一方领先 1 分',
        foul: '个人累计 5 次犯规离场；全队累计第 5 次起进入犯规罚球状态，不执行“2+1”加罚；罚球时按规则设置站位',
        lineup: '赛前提交两套阵容，每套 5 人（4 名首发+1 名替补）；第 1—2 节分别使用不同阵容，第 3—4 节可自由轮换'
      };
    }
    if (age >= 10 && age <= 12) {
      return {
        ruleBase: '中国篮球协会最新审定《篮球规则》及本赛事特别规定',
        clock: sharedClock,
        breaks: sharedBreaks,
        timeout: '上半时 1 次、下半时 2 次、每一决胜期 1 次，每次 30 秒',
        tiebreak: '比分相等时进行 3 分钟净时决胜期，直至决出胜负',
        foul: '个人犯规、全队犯规及罚则按本组别已发布特别规定执行',
        lineup: '赛前提交两套阵容，每套 6 人（5 名首发+1 名替补）；第 1—2 节分别使用不同阵容，第 3—4 节可自由轮换'
      };
    }
    if (age === 14 || age === 16) {
      return {
        ruleBase: '中国篮球协会最新审定《篮球规则》及本赛事特别规定',
        clock: sharedClock,
        breaks: sharedBreaks,
        timeout: '上半时 2 次、下半时 3 次、每一决胜期 1 次，每次 30 秒',
        tiebreak: '比分相等时进行 5 分钟净时决胜期，直至决出胜负',
        foul: '个人犯规、全队犯规及罚则按本组别已发布特别规定执行',
        lineup: '赛前提交两套阵容，每套 6 人（5 名首发+1 名替补）；第 1—2 节分别使用不同阵容，第 3—4 节可自由轮换'
      };
    }
    return {
      ruleBase: '现行小篮球规则、中国篮球协会最新审定《篮球规则》及本赛事特别规定',
      clock: '计时方式、节间休息和最后两分钟停表办法以本组别已发布规则为准',
      breaks: '节间与中场休息时间以赛程和赛前技术会议通知为准',
      timeout: '暂停次数及时长按本组别规则执行',
      tiebreak: '决胜期或其他决胜方式按本组别特别规定执行',
      foul: '个人犯规、全队犯规及罚则按本组别已发布规则执行',
      lineup: '首发阵容、分组上场和轮换办法按本组别特别规定执行'
    };
  }

  function smallBasketballRulesTable(groups) {
    const rows = groups.length ? groups : [{ name: 'U8 组', format: '4V4', duration: '4×6 分钟' }, { name: 'U10 组', format: '4V4', duration: '4×8 分钟' }, { name: 'U12 组', format: '5V5', duration: '4×10 分钟' }];
    return `<table class="rule-document-table detailed"><thead><tr><th>组别</th><th>上场人数</th><th>场地</th><th>比赛用球</th><th>篮圈高度</th><th>比赛时长</th><th>防守/轮换要求</th></tr></thead><tbody>${rows.map((group) => {
      const values = smallBasketballParameter(group);
      return `<tr><td>${esc(group.name)}</td>${values.map((value) => `<td>${esc(value)}</td>`).join('')}</tr>`;
    }).join('')}</tbody></table>`;
  }

  function smallBasketballRuleSections(groups) {
    const rows = groups.length ? groups : [{ name: 'U8 组', format: '4V4', duration: '4×6 分钟' }, { name: 'U10 组', format: '4V4', duration: '4×8 分钟' }, { name: 'U12 组', format: '5V5', duration: '4×10 分钟' }];
    const cn = ['一', '二', '三', '四', '五', '六', '七', '八'];
    return rows.map((group, index) => {
      const [players, court, ball, hoop, duration, defense] = smallBasketballParameter(group);
      const operational = smallBasketballOperationalRules(group);
      return `<div class="small-rule-group"><p>（${cn[index] || index + 1}）${esc(group.name)}</p><p>1. 比赛规则</p><p>执行${esc(operational.ruleBase)}。比赛采用${esc(group.format || players)}形式，比赛时长为${esc(group.duration || duration)}。</p><p>2. 特殊规定（场地与器材）</p><p>上场人数：${esc(players)}；比赛场地：${esc(court)}；比赛用球：${esc(ball)}；篮圈高度：${esc(hoop)}。</p><p>3. 计时与休息</p><p>${esc(operational.clock)}。${esc(operational.breaks)}。</p><p>4. 暂停与决胜</p><p>暂停：${esc(operational.timeout)}。决胜：${esc(operational.tiebreak)}。</p><p>5. 犯规规定</p><p>${esc(operational.foul)}。</p><p>6. 阵容与轮换</p><p>${esc(operational.lineup)}。如一方到场人数不足以满足前两节不同阵容要求，由对方教练指定可重复上场的队员，对方亦可更换相同数量队员。</p><p>7. 防守要求</p><p>${esc(defense)}。组委会可结合报名规模和赛场条件发布补充细则。</p></div>`;
    }).join('');
  }

  function ruleTemplateOutline(template) {
    if (template === 'small-basketball') {
      return ['比赛名称', '组织机构', '竞赛信息', '参赛资格要求', '报名办法', '竞赛办法', '比赛规则及场地器材', '名次录取与奖励', '赛场纪律', '参赛经费', '规则补充', '解释权', '未尽事宜'];
    }
    return ['总则与依据', '组织机构与职责', '时间与地点', '项目与组别', '参赛资格', '报名与名单', '竞赛办法', '抽签与编排', '比赛规则', '排名与晋级', '服装与技术台', '赛风赛纪', '申诉与仲裁', '安全与医疗', '奖项与数据', '影像与附则'];
  }

  function buildSmallBasketballRuleDocument(eventSpace, settings) {
    const groups = Array.isArray(eventSpace?.groupRows)
      ? eventSpace.groupRows.map((group) => ({ ...group, name: groupDisplayName(group), gender: normalizedGroupGender(group.gender) }))
      : [];
    const registration = registrationSettings(eventSpace);
    const organizer = settings.organizer || settings.publisher || '赛事组委会';
    const undertaker = settings.undertaker || '赛事组委会';
    const coOrganizer = settings.coOrganizer || '无';
    const eventName = eventSpace?.name || '小篮球赛事';
    const groupNames = groups.length ? groups.map((group) => group.name).join('、') : '以组委会最终公布为准';
    const venue = eventSpace?.regionLabel || registration.publicLocation || '以组委会赛前通知为准';
    const feeText = registration.feeMode === '免费' ? '本赛事免收报名费。' : `报名费为 ${registration.feeAmount || '待定'} ${registration.feeUnit || '元/人'}，具体缴费、退赛及退费规则以报名页面公示为准。`;
    return `
      <h2>${esc(settings.title || `${eventName}竞赛规程`)}</h2>
      <h3 data-rule-section-target="1">一、比赛名称</h3>
      <p>${esc(eventName)}。</p>
      ${eventSpace?.description ? `<p>${esc(eventSpace.description)}</p>` : ''}
      <h3 data-rule-section-target="2">二、组织机构</h3>
      <p class="rule-organization-line">（一）主办单位：<span data-rule-unit-value="organizer">${esc(organizer)}</span></p>
      <p class="rule-organization-line">（二）承办单位：<span data-rule-unit-value="undertaker">${esc(undertaker)}</span></p>
      <p class="rule-organization-line">（三）协办单位：<span data-rule-unit-value="coOrganizer">${esc(coOrganizer)}</span></p>
      <h3 data-rule-section-target="3">三、竞赛信息</h3>
      <p>赛事类型：${esc(eventSpace?.eventType || '青少年篮球联赛')}。</p>
      <p>比赛设置${esc(groupNames)}。</p>
      <p>（一）比赛时间：${esc(formatRuleDate(eventSpace?.startDate))}至${esc(formatRuleDate(eventSpace?.endDate))}。</p>
      <p>（二）比赛地点：${esc(venue)}。具体报到时间、场馆与球场以组委会发布的正式赛程为准。</p>
      <h3 data-rule-section-target="4">四、参赛资格要求</h3>
      <p>（一）参赛运动员须符合对应组别出生日期要求，持有效身份证明完成实名核验；同一名运动员在同一组别只能代表一支球队参赛。</p>
      <p>（二）参赛时须携带身份证件原件；确无身份证的，可提交护照、港澳台通行证、台胞证或户口簿原件与学籍证明组合材料。组委会有权在赛前、赛中或赛后复核资格；无法提供有效证明的，按资格不合格处理。</p>
      <p>（三）参赛运动员须身体健康，适合参加篮球竞赛，并由监护人完成知情同意、赛事影像授权及参赛承诺。</p>
      ${groups.length ? groups.map((group, index) => `<p>${index + 1}. ${esc(group.name)}：${esc(group.birthCutoff ? `${formatRuleDate(group.birthCutoff)}及以后出生` : '年龄资格以审核结果为准')}，性别限制为${esc(group.gender || '不限')}，每队报名${esc(group.roster || `${registration.minRoster}—${registration.maxRoster} 人`)}。</p>`).join('') : '<p>各组别出生日期范围、性别限制及报名人数以赛事报名公告为准。</p>'}
      <p>组别年龄以本届赛事公布的出生日期截止线为唯一认定标准。赛事跨赛季、跨年度或设置晋级阶段时，应在报名开始前另行公布适用的年龄基准；进入后续阶段不代表自动满足后续阶段资格，仍须按对应规程重新审核。</p>
      <h3 data-rule-section-target="5">五、报名办法</h3>
      <p>（一）报名时间：${esc(String(registration.startAt || '').replace('T', ' '))}至${esc(String(registration.endAt || '').replace('T', ' '))}。</p>
      <p>（二）报名主体：以球队为单位由领队或教练统一提交，不接受球员个人单独报名。每队至少登记 1 名教练或领队作为赛事联络人。</p>
      <p>（三）报名人数：各队按对应组别规定提交领队、教练员和运动员名单，运动员人数原则上为${esc(registration.minRoster)}至${esc(registration.maxRoster)}人。</p>
      <p>（四）报名资料：球队名称及队徽、领队及联系方式、运动员姓名与号码、球员照片、出生日期证明、监护人承诺书等资料须完整提交并通过审核。</p>
      <p>（五）报名联系人：${esc(registration.contactName || '待补充')}，联系电话：${esc(registration.contactPhone || '待补充')}。</p>
      <figure class="rule-registration-qr"><img data-rule-registration-qr src="${esc(eventSpace.registrationQrDataUrl || '')}" alt="球队线上报名小程序码"><figcaption>球队领队扫码进入小程序，在线创建或认领球队并提交报名资料。</figcaption></figure>
      <h3 data-rule-section-target="6">六、竞赛办法</h3>
      <p>各组别按照已确认的循环赛、小组赛与淘汰赛方案进行。比赛积分、排名、晋级和对阵规则以本赛事组别与赛制设置为准；球队数量发生变化时，组委会可在保证公平的前提下调整竞赛办法并发布补充通知。</p>
      ${groups.length ? groups.map((group) => `<p>${esc(group.name)}：采用${esc(group.competition || '组别已配置赛制')}，计划 ${esc(group.target || '待定')} 支球队参赛，比赛形式为 ${esc(group.format || '5V5')}，单场时长为 ${esc(group.duration || '按组别规定')}。</p>`).join('') : ''}
      <h3 data-rule-section-target="7">七、比赛规则及场地器材</h3>
      ${smallBasketballRuleSections(groups)}
      <p>各组别中场休息期间进行全员罚球赛：双方在各自上半时进攻的球篮进行，每名已报名且到场球员罚 1 球，罚中 1 球计 1 分并纳入本队上半场得分；到场人数不足报名人数时，按实际到场人数执行。</p>
      <p>如主办方统一提供比赛服装，参赛队须按公布要求着装；未统一提供时可穿球队自备比赛服。未经主办方许可，不得穿着带有其他赛事或未授权商业标识的比赛服上场。</p>
      <p>球队迟到超过 ${esc(settings.lateMinutes)} 分钟且未获组委会批准的，按弃权处理，弃权比分记为 ${esc(settings.forfeitScore)}。比赛暂停、犯规、加时和决胜方式按对应年龄组规则执行。</p>
      <h3 data-rule-section-target="8">八、名次录取与奖励</h3>
      <p>各组别录取名次及奖励范围以报名公告为准。${esc(registration.prize || '优胜球队颁发奖杯、奖牌或证书')}；个人奖项须依据正式赛果、技术统计和组委会评审结果确定。</p>
      <h3 data-rule-section-target="9">九、赛场纪律</h3>
      <p>参赛运动员、教练员、领队、技术台人员和观众应遵守赛场秩序，尊重裁判与对手。严禁冒名参赛、弄虚作假、消极比赛、辱骂、威胁、斗殴及扰乱赛场秩序；组委会可根据情节给予警告、停赛、取消比赛成绩或取消参赛资格等处理。</p>
      <p>经核查确认存在年龄、身份或其他参赛资格造假，且不合格球员已登场比赛的，取消该队参赛资格；已完成和未完成的相关比赛均按弃权比分 ${esc(settings.forfeitScore)} 记录，积分记 0 分，并可依公布的保证金与纪律规定进一步处理。</p>
      <h3 data-rule-section-target="10">十、参赛经费</h3>
      <p>${esc(feeText)}参赛队交通、食宿及其他未列入报名权益的费用原则上自理；主办方另有书面说明的，从其说明。</p>
      <p>如赛事收取参赛保证金，应在报名页明示金额、缴纳方式和违纪扣除条件；无违纪情形的，原则上在赛事结束后 1—3 个工作日内原路退回。报名截止后因非不可抗力原因退赛的，报名费原则上不予退还；因不可抗力申请退费的，可扣除已在报名页事先公示的实际物料制作费，余款原则上在审核通过后 7—10 个工作日内按原支付路径退回。主办方另行公布处理时限的，从其公示。</p>
      <p>保险安排：${esc(settings.insuranceRequired)}。由主办方统一投保时，各队须在报名期限内提供准确、完整的实名身份信息；因资料错误、遗漏或逾期造成无法投保的，由资料提交方承担相应责任。</p>
      <h3 data-rule-section-target="11">十一、规则补充</h3>
      <p>本规程未提及的竞赛事项，裁判员和赛事组委会可依据现行小篮球规则及中国篮球协会最新审定的篮球规则执行。</p>
      <p>本规程仅适用于当前赛事及当前竞赛阶段。赛事设有城市赛、分区赛、总决赛或其他晋级阶段的，后续阶段可另行发布竞赛规程；参赛队须同时满足后续阶段的年龄、名单、装备、费用和赛风赛纪要求。</p>
      <h3 data-rule-section-target="12">十二、解释权</h3>
      <p>本规程解释权归${esc(organizer)}及赛事组委会。</p>
      <h3 data-rule-section-target="13">十三、未尽事宜</h3>
      <p>未尽事宜由赛事组委会另行通知，补充通知与本规程具有同等效力。</p>`;
  }

  function buildRuleDocument(eventSpace = activeEventSpace(), settings = ruleSettings(eventSpace)) {
    if (settings.template === 'small-basketball') return buildSmallBasketballRuleDocument(eventSpace, settings);
    const groups = Array.isArray(eventSpace?.groupRows) ? eventSpace.groupRows : [];
    const registration = registrationSettings(eventSpace);
    const organizer = settings.organizer || settings.publisher || document.getElementById('organizationName')?.textContent?.trim() || '赛事组委会';
    const undertaker = settings.undertaker || '赛事组委会';
    const coOrganizer = settings.coOrganizer || '无';
    const eventName = eventSpace?.name || '篮球赛事';
    const groupNames = groups.length ? groups.map((group) => group.name).join('、') : '以赛事组委会最终公布为准';
    const groupRows = groups.length
      ? groups.map((group) => `<tr><td>${esc(group.name)}</td><td>${esc(group.format || '5V5')}</td><td>${esc(group.birthCutoff ? `${formatRuleDate(group.birthCutoff)}及以后出生` : '以资格审核为准')}</td><td>${esc(group.roster || `${registration.minRoster}—${registration.maxRoster} 人`)}</td><td>${esc(group.duration || '4×10 分钟')}</td><td>${esc(group.competition || '按组别配置')}</td></tr>`).join('')
      : '<tr><td colspan="6">尚未创建竞赛组别，发布前须在“组别与赛制”中完成配置。</td></tr>';
    const venue = eventSpace?.regionLabel || registration.publicLocation || '以组委会赛前通知为准';
    const feeText = registration.feeMode === '免费' ? '本赛事免收报名费' : `报名费为 ${registration.feeAmount || '待定'} ${registration.feeUnit || '元/人'}，缴费与退费规则以报名页公示为准`;
    const templateProfile = ruleTemplateProfile(settings.template);
    const isSmallBasketball = settings.template === 'small-basketball' || settings.template === 'youth-public';
    const isElite = settings.template === 'youth-elite';
    const specialParameterTable = isSmallBasketball ? smallBasketballRulesTable(groups) : '';
    const specialRuleCopy = settings.template === 'small-basketball'
      ? '低年龄组应根据身心发展特点采用适宜的场地、篮圈和比赛用球；主办方应优先保障每名报名球员获得合理上场机会，并按组别执行人盯人防守、分组轮换和友爱竞赛要求。'
      : settings.template === 'youth-public'
        ? '低年龄组可设置领先达到约定分差后的友爱规则；达到分差时记录正式赛果，剩余时间可继续教学交流但不再累计比分。各队须满足最低开赛人数并完成赛前身份核验。'
        : isElite
          ? '精英组原则上采用标准场地、标准篮圈和完整比赛计时规则；技术统计须由授权人员记录并经主办方复核，可据此评选赛事单项奖。'
          : templateProfile.special;
    const competitionRuleCopy = isSmallBasketball
      ? `各组别按小篮球特别规定执行进攻计时、犯规、暂停和决胜方式，不统一套用 24 秒与成人组加时规则。球队迟到超过 ${settings.lateMinutes} 分钟且未获组委会批准的，按弃权处理，弃权比分记为 ${settings.forfeitScore}。`
      : `5V5 组别原则上采用 24 秒进攻计时，3V3 组别采用 12 秒进攻计时；各年龄组的个人犯规、单节时长和加时规则以组别参数为准。球队迟到超过 ${settings.lateMinutes} 分钟且未获组委会批准的，按弃权处理，弃权比分记为 ${settings.forfeitScore}。`;
    return `
      <h2>${esc(settings.title || `${eventName}竞赛规程`)}</h2>
      <div class="rule-document-units"><p><b>主办单位：</b><span data-rule-unit-value="organizer">${esc(organizer)}</span></p><p><b>承办单位：</b><span data-rule-unit-value="undertaker">${esc(undertaker)}</span></p><p><b>协办单位：</b><span data-rule-unit-value="coOrganizer">${esc(coOrganizer)}</span></p></div>
      <p class="rule-document-unit">版本：V${esc(settings.version)}　　生效日期：${esc(formatRuleDate(settings.effectiveDate))}</p>
      <h3 data-rule-section-target="1">一、总则与办赛依据</h3>
      <p>本规程采用“${esc(templateProfile.name)}”结构，适用于${esc(templateProfile.audience)}。为规范赛事组织与参赛秩序，保障运动员身体健康、竞赛安全和公平竞赛，根据${esc(settings.ruleBase)}，结合本赛事年龄结构、场馆条件与运营实际制定。所有参赛球队、运动员、教练员、领队、技术台人员及相关工作人员均应遵守本规程。</p>
      <h3 data-rule-section-target="2">二、组织机构与工作职责</h3>
      <p><strong>主办单位：</strong><span data-rule-unit-value="organizer">${esc(organizer)}</span>；<strong>承办单位：</strong><span data-rule-unit-value="undertaker">${esc(undertaker)}</span>；<strong>协办单位：</strong><span data-rule-unit-value="coOrganizer">${esc(coOrganizer)}</span>。主办单位负责赛事总体指导与重大事项决策，承办单位负责报名审核、竞赛编排、场馆协调、裁判与技术台安排、成绩确认、安全保障和信息发布；协办单位按合作范围提供场地、人员、宣传或其他赛事支持。各参赛队领队为本队唯一正式联络人，对报名资料真实性、队伍管理及赛前确认负责。</p>
      <h3 data-rule-section-target="3">三、赛事时间与举办地点</h3>
      <p>赛事计划于${esc(formatRuleDate(eventSpace?.startDate))}至${esc(formatRuleDate(eventSpace?.endDate))}举行，举办地点为${esc(venue)}。具体比赛日期、报到时间、场馆与球场以系统发布赛程为准；因场馆、天气或公共安全原因调整时，组委会将通过赛事通知渠道发布。</p>
      <h3 data-rule-section-target="4">四、竞赛项目与组别</h3>
      <p>本赛事设置${esc(groupNames)}。各组别执行以下已确认参数；组别资料发生调整时，系统应重新生成规程并发布新版本。</p>
      <table class="rule-document-table"><thead><tr><th>组别</th><th>形式</th><th>出生日期资格</th><th>名单人数</th><th>比赛时长</th><th>赛制</th></tr></thead><tbody>${groupRows}</tbody></table>
      <h3 data-rule-section-target="5">五、参赛资格与年龄认定</h3>
      <p>参赛运动员须完成真实姓名、出生日期、证件或年龄证明、监护人联系方式及参赛承诺书核验。年龄资格以法定身份证明记载的出生日期为准；同一名运动员在同一组别只能代表一支球队参赛，不得冒名、跨队或使用虚假资料。</p>
      <h3 data-rule-section-target="6">六、球队报名、费用与名单管理</h3>
      <p>报名时间为${esc(String(registration.startAt || '').replace('T', ' '))}至${esc(String(registration.endAt || '').replace('T', ' '))}。每队报名人数原则上为${esc(registration.minRoster)}至${esc(registration.maxRoster)}人；${esc(feeText)}。正式名单锁定后原则上不得更换，确因伤病等原因申请变更的，须在比赛开始前提交证明并经组委会审核。</p>
      <h3 data-rule-section-target="7">七、竞赛办法与阶段衔接</h3>
      <p>各组别按已配置的单循环、双循环、小组循环加淘汰赛或单败淘汰等方式进行。设置第二阶段的组别，依据小组名次与预设晋级规则自动生成淘汰赛签位；球队数量不足或出现退赛时，组委会可在不损害公平原则的前提下调整赛制并发布补充通知。</p>
      <h3 data-rule-section-target="8">八、抽签、赛程编排与调整</h3>
      <p>抽签可采用系统自动抽签或线下抽签后录入展示。赛程根据组别、球队数量、场馆数量、每日可比赛时段、最小休息间隔及同队冲突自动编排，并允许主办方人工复核调整。正式赛程发布后的变更须记录原因、操作人员和通知时间。</p>
      <h3 data-rule-section-target="9">九、比赛规则与特殊规定</h3>
      <p>比赛执行${esc(settings.ruleBase)}及本规程特别规定。${esc(competitionRuleCopy)}</p>
      <p>${esc(specialRuleCopy)}</p>${specialParameterTable}
      <h3 data-rule-section-target="10">十、积分、排名与晋级办法</h3>
      <p>循环赛胜一场积 2 分、负一场积 1 分、弃权积 0 分。两队积分相同时优先比较相互比赛胜负；三队及以上积分相同时，依次比较相关球队间净胜分、相关球队间总得分、全部比赛净胜分和全部比赛总得分；仍无法区分时由组委会组织抽签。淘汰赛必须决出胜负。</p>
      <h3 data-rule-section-target="11">十一、比赛服装、装备与技术台</h3>
      <p>各队应准备颜色明显不同且号码清晰的比赛服，报名号码须与现场一致。主队原则上穿浅色服装，客队穿深色服装；发生颜色冲突时按赛程标注或技术代表要求更换。比赛用球、计时计分设备和技术统计工具由组委会统一确认，技术台记录经复核后作为正式赛果依据。</p>
      <h3 data-rule-section-target="12">十二、赛风赛纪、违规与处罚</h3>
      <p>参赛人员应尊重裁判、对手和观众，严禁冒名参赛、弄虚作假、消极比赛、辱骂、威胁、斗殴及扰乱赛场秩序。组委会可视情节给予警告、取消当场资格、停赛、取消成绩、取消参赛资格等处罚；涉嫌违法的移交有关部门处理。</p>
      <h3 data-rule-section-target="13">十三、申诉、仲裁与证据要求</h3>
      <p>对参赛资格、赛果记录或程序性事项有异议的，应由领队在${esc(settings.protestWindow)}提交书面申诉、相关证据及 ${esc(settings.protestDeposit)} 元申诉保证金。申诉成立时保证金退还；恶意或无事实依据的申诉不予退还。裁判员对临场事实的判罚原则上不作为赛后改判事项。</p>
      <h3 data-rule-section-target="14">十四、安全、医疗、保险与应急处置</h3>
      <p>参赛队应确认运动员具备参加篮球比赛的健康条件，并按要求完成监护人知情授权。${esc(settings.insuranceRequired)}。场馆应配置基础急救物资和应急联系人；发生受伤、极端天气、设备故障或公共安全事件时，现场负责人有权暂停或终止比赛并启动应急处置。</p>
      <h3 data-rule-section-target="15">十五、奖项、成绩与赛事数据发布</h3>
      <p>${esc(registration.prize || '奖项设置以赛事报名公告为准')}。正式赛果、积分榜、晋级结果和球员数据以主办方审核发布版本为准。球员个人数据服务仅记录已购买或已授权的任务范围，记录人员须保证操作及时、客观并接受主办方复核。</p>
      <h3 data-rule-section-target="16">十六、影像授权、不可抗力与附则</h3>
      <p>${esc(settings.imageAuthorization)}，用于赛事报道、成绩展示和赛事相关宣传；涉及未成年人时应遵循监护人授权与隐私保护要求。因不可抗力导致赛事延期、变更或取消的，组委会将依据实际履约情况另行通知。本规程解释权归赛事组委会，未尽事宜以书面补充通知为准。</p>`;
  }

  function displayEventDate(eventSpace) {
    const start = String(eventSpace.startDate || '').replaceAll('-', '.');
    const end = String(eventSpace.endDate || '').replaceAll('-', '.');
    return start && end ? `${start}—${end.slice(5)}` : '日期待完善';
  }

  function eventWorkflow(eventSpace = activeEventSpace()) {
    if (!eventSpace) return {};
    const defaults = {
      profileSaved: false,
      groupsConfigured: Number(eventSpace.groups || 0) > 0,
      registrationConfigured: false,
      teamsImported: Number(eventSpace.teams || 0) > 0,
      qualificationCompleted: false,
      drawCompleted: false,
      drawSaved: false,
      venuesConfigured: false,
      scheduleGenerated: Number(eventSpace.matches || 0) > 0,
      onsiteAssigned: false,
      executionReturned: false,
      resultsApproved: false,
      finished: eventSpace.state === '已结束'
    };
    eventSpace.workflow = Object.assign(defaults, eventSpace.workflow || {});
    return eventSpace.workflow;
  }

  function hasGroupDownstreamData(eventSpace = activeEventSpace()) {
    if (!eventSpace) return false;
    const workflow = eventWorkflow(eventSpace);
    const hasDrawAssignments = Object.values(eventSpace.drawStates || {}).some((state) => (
      state?.saved || Object.values(state?.assignments || {}).some((teams) => Array.isArray(teams) && teams.length)
    ));
    return hasDrawAssignments
      || Boolean(workflow.drawCompleted || workflow.drawSaved || workflow.scheduleGenerated)
      || Number(eventSpace.matches || 0) > 0
      || (Array.isArray(eventSpace.scheduleRows) && eventSpace.scheduleRows.length > 0);
  }

  function clearGroupDownstreamData(eventSpace = activeEventSpace()) {
    if (!eventSpace) return;
    eventSpace.drawStates = {};
    eventSpace.scheduleRows = [];
    eventSpace.matches = 0;
    eventSpace.scheduleSavedAt = '';
    eventSpace.scheduleStale = false;
    eventSpace.onsiteAssignments = {};
    eventSpace.refereeAssignments = {};
    eventSpace.onsiteAssignmentSavedAt = '';
    eventSpace.resultRecords = {};
    const workflow = eventWorkflow(eventSpace);
    Object.assign(workflow, {
      drawCompleted: false,
      drawSaved: false,
      scheduleGenerated: false,
      onsiteAssigned: false,
      executionReturned: false,
      resultsApproved: false,
      finished: false
    });
    store?.update?.((state) => { state.scheduleGenerated = false; });
    selectedReviewMatchId = '';
    selectedOnsiteMatchId = '';
    syncEventLifecycle(eventSpace);
  }

  function lifecycleProgress(eventSpace = activeEventSpace()) {
    if (!eventSpace) return 0;
    const workflow = eventWorkflow(eventSpace);
    const steps = [
      workflow.profileSaved,
      workflow.groupsConfigured,
      workflow.registrationConfigured,
      workflow.teamsImported,
      workflow.drawSaved,
      workflow.venuesConfigured,
      workflow.scheduleGenerated,
      workflow.onsiteAssigned,
      workflow.executionReturned,
      workflow.resultsApproved
    ];
    return workflow.finished ? 100 : Math.round(steps.filter(Boolean).length / steps.length * 95);
  }

  function syncEventLifecycle(eventSpace = activeEventSpace()) {
    if (!eventSpace) return;
    const workflow = eventWorkflow(eventSpace);
    eventSpace.isBlank = !workflow.teamsImported;
    eventSpace.progress = lifecycleProgress(eventSpace);
    if (workflow.finished) {
      eventSpace.state = '已结束';
      eventSpace.stateClass = 'muted';
    } else if (workflow.executionReturned || workflow.scheduleGenerated) {
      eventSpace.state = '进行中';
      eventSpace.stateClass = 'green';
    } else if (workflow.registrationConfigured) {
      eventSpace.state = '报名中';
      eventSpace.stateClass = 'orange';
    } else {
      eventSpace.state = '筹备中';
      eventSpace.stateClass = 'blue';
    }
  }

  function updateActiveEvent(mutator) {
    const eventSpace = activeEventSpace();
    if (!eventSpace) return null;
    mutator(eventSpace, eventWorkflow(eventSpace));
    syncEventLifecycle(eventSpace);
    persistEventSpaces();
    return eventSpace;
  }

  function registrationTeamRows(eventSpace = activeEventSpace()) {
    if (!eventSpace) return [];
    if (!Array.isArray(eventSpace.registrationTeams)) eventSpace.registrationTeams = [];
    return eventSpace.registrationTeams;
  }

  function cloudRegistrationRow(team) {
    const statusMap = {
      pending: ['待审核', '待审核'],
      approved: ['已通过', '已通过'],
      rejected: ['已驳回', '已驳回']
    };
    const mapped = statusMap[team.status] || ['待审核', '待审核'];
    const updatedAt = Number(team.updatedAt || team.submittedAt || 0);
    return {
      id: team.teamId || team.sourceTeamId,
      cloudTeamId: team.teamId || '',
      sourceTeamId: team.sourceTeamId || '',
      name: team.name || '未命名球队',
      logo: team.logo || '',
      group: team.group || '待分组',
      owner: team.coachName || '球队领队',
      phone: team.phone || '',
      claimStatus: '已认领',
      teamQualificationStatus: mapped[1],
      reviewNote: team.reviewNote || '',
      reviewedAt: Number(team.reviewedAt || 0),
      players: Array.isArray(team.players) ? team.players : [],
      source: '小程序扫码报名',
      claimedAt: team.submittedAt ? new Date(team.submittedAt).toLocaleString('zh-CN', { hour12: false }) : '',
      updatedAt: updatedAt ? new Date(updatedAt).toLocaleString('zh-CN', { hour12: false }) : '刚刚'
    };
  }

  async function syncCloudRegistrationTeams(showResult = false) {
    const eventSpace = activeEventSpace();
    const sessionToken = cloudPcSessionToken();
    if (!eventSpace || !sessionToken || registrationCloudSyncing) return;
    registrationCloudSyncing = true;
    try {
      const result = await invokePcAuth('listRegistrationTeams', { sessionToken, eventId: eventSpace.id });
      const cloudRows = (result.teams || []).map(cloudRegistrationRow);
      const cloudIds = new Set(cloudRows.map((team) => team.cloudTeamId).filter(Boolean));
      const localRows = registrationTeamRows(eventSpace).filter((team) => !team.cloudTeamId && !cloudIds.has(team.id));
      eventSpace.registrationTeams = [...cloudRows, ...localRows];
      eventSpace.teams = eventSpace.registrationTeams.length;
      eventSpace.registrationCloudSyncedAt = result.syncedAt || Date.now();
      persistEventSpaces();
      registrationCloudSyncAt = Date.now();
      const current = route();
      if (current.section === 'registration' && current.page === 'progress') render();
      if (showResult) showToast(`已同步 ${cloudRows.length} 支云端报名球队`);
    } catch (error) {
      if (showResult) showToast(error.message || '报名数据同步失败');
      else console.warn('[registration-sync]', error);
    } finally {
      registrationCloudSyncing = false;
    }
  }

  function registeredTeamCountForGroup(groupName, eventSpace = activeEventSpace()) {
    return registrationTeamRows(eventSpace).filter((team) => team.group === groupName).length;
  }

  function registrationPlayers(eventSpace = activeEventSpace()) {
    return registrationTeamRows(eventSpace).flatMap((team) => (team.players || []).map((player) => ({ ...player, teamId: team.id, teamName: team.name, group: team.group })));
  }

  function maskMobile(value) {
    const mobile = String(value || '').replace(/\D/g, '');
    return mobile.length === 11 ? `${mobile.slice(0, 3)}****${mobile.slice(-4)}` : '—';
  }

  function registrationTeamStatus(team) {
    if (team.claimStatus === '已认领') return ['已认领', 'ok'];
    if (team.claimStatus === '邀请已发送') return ['邀请已发送', 'live'];
    return ['待邀请', 'warn'];
  }

  function teamQualificationStatus(team) {
    return ['待审核', '已通过', '已驳回'].includes(team?.teamQualificationStatus) ? team.teamQualificationStatus : '待审核';
  }

  function isOfficialTeam(team) {
    return team?.claimStatus === '已认领' && teamQualificationStatus(team) === '已通过';
  }

  function officialTeams(eventSpace = activeEventSpace()) {
    return registrationTeamRows(eventSpace).filter(isOfficialTeam);
  }

  function isOfficialPlayer(player, team) {
    return isOfficialTeam(team) && (player?.reviewResult || '待审核') === '通过';
  }

  function ensurePlayerSystemIds(eventSpace = activeEventSpace()) {
    if (!eventSpace) return;
    const teams = registrationTeamRows(eventSpace);
    let sequence = Math.max(0, Number(eventSpace.playerSystemSequence || 0));
    const used = new Set();
    let changed = false;
    teams.forEach((team) => (team.players || []).forEach((player) => {
      const existing = String(player.systemId || '');
      const match = existing.match(/^PL-(\d{4})-(\d{6})$/);
      if (!match) return;
      sequence = Math.max(sequence, Number(match[2]));
    }));
    const archiveYear = /^\d{4}$/.test(String(eventSpace.startDate || '').slice(0, 4))
      ? String(eventSpace.startDate).slice(0, 4)
      : String(new Date().getFullYear());
    teams.forEach((team) => (team.players || []).forEach((player) => {
      const existing = String(player.systemId || '');
      if (/^PL-\d{4}-\d{6}$/.test(existing) && !used.has(existing)) {
        used.add(existing);
        return;
      }
      do { sequence += 1; } while (used.has(`PL-${archiveYear}-${String(sequence).padStart(6, '0')}`));
      player.systemId = `PL-${archiveYear}-${String(sequence).padStart(6, '0')}`;
      used.add(player.systemId);
      changed = true;
    }));
    if (eventSpace.playerSystemSequence !== sequence) {
      eventSpace.playerSystemSequence = sequence;
      changed = true;
    }
    if (changed) persistEventSpaces();
  }

  function officialPlayers(eventSpace = activeEventSpace()) {
    ensurePlayerSystemIds(eventSpace);
    return registrationTeamRows(eventSpace).flatMap((team) => (team.players || [])
      .filter((player) => isOfficialPlayer(player, team))
      .map((player, index) => ({ ...player, team, teamId: team.id, teamName: team.name, group: team.group, key: `${team.id}:${player.id || player.name || index}` })));
  }

  const virtualDatasetId = 'sxf-youth-32-v2';
  const compatibleVirtualDatasetIds = new Set([virtualDatasetId, 'sxf-youth-16-v1']);

  function isCompatibleVirtualTeam(team) {
    return Boolean(team?.isVirtual && compatibleVirtualDatasetIds.has(team.virtualDatasetId));
  }

  function virtualDataset() {
    const data = window.SXFYouthDemoData;
    return data && Array.isArray(data.teams) && Array.isArray(data.players) ? data : null;
  }

  function virtualAssetUrl(relativePath) {
    const value = String(relativePath || '');
    const logoMatch = value.match(/^\.\/队徽\/([^/]+)\.png$/);
    if (logoMatch) return `./assets/demo/youth-basketball/logos/${logoMatch[1]}.png`;
    const avatarMatch = value.match(/^\.\/头像\/([^/]+)\/([^/]+)\.png$/);
    if (avatarMatch) return `./assets/demo/youth-basketball/avatars/${avatarMatch[1]}/${avatarMatch[2]}.webp`;
    return value;
  }

  function virtualRegistrationTeams(eventSpace = activeEventSpace()) {
    return registrationTeamRows(eventSpace).filter(isCompatibleVirtualTeam);
  }

  function buildVirtualRegistrationTeams(eventSpace = activeEventSpace(), selectedTeamIds = null) {
    const data = virtualDataset();
    if (!data) return [];
    const groups = (eventSpace?.groupRows || []).filter((group) => group?.name);
    const groupNames = groups.length ? groups.map((group) => group.name) : ['未分组'];
    const selected = new Set(Array.isArray(selectedTeamIds) ? selectedTeamIds : []);
    const sourceTeams = Array.isArray(selectedTeamIds) ? data.teams.filter((team) => selected.has(team.id)) : data.teams;
    const groupCounts = Object.fromEntries(groupNames.map((name) => [name, registrationTeamRows(eventSpace).filter((team) => team.group === name).length]));
    const playersByTeam = new Map();
    data.players.forEach((player) => {
      const list = playersByTeam.get(player.teamId) || [];
      list.push({
        id: player.id,
        name: player.name,
        number: player.number,
        age: player.age,
        gender: player.gender,
        position: player.position,
        height: player.height,
        weight: player.weight,
        avatar: virtualAssetUrl(player.avatar),
        reviewResult: '通过',
        isVirtual: true,
        isDemo: true
      });
      playersByTeam.set(player.teamId, list);
    });
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    return sourceTeams.map((team, index) => {
      const group = groupNames.slice().sort((first, second) => groupCounts[first] - groupCounts[second])[0] || groupNames[index % groupNames.length];
      groupCounts[group] += 1;
      return {
      id: `VIRTUAL-${team.key}`,
      name: team.name,
      group,
      owner: `虚拟领队${String(index + 1).padStart(2, '0')}`,
      phone: '',
      logo: virtualAssetUrl(team.logoUrl),
      source: '平台虚拟球队',
      claimStatus: '已认领',
      teamQualificationStatus: '已通过',
      testAdmission: true,
      isVirtual: true,
      isDemo: true,
      virtualDatasetId,
      virtualSourceTeamId: team.id,
      claimedAt: now,
      qualificationUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      ageGroup: team.ageGroup,
      coachName: team.coachName,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      players: playersByTeam.get(team.id) || []
      };
    });
  }

  function teamModulePages(section) {
    if (section !== 'teams') return pages[section] || [];
    return usesPlayerData() ? pages.teams : [['teams', '球队管理']];
  }

  function currentNavItems() {
    return navItems.map((item) => item.id === 'teams' && !usesPlayerData() ? { ...item, label: '球队管理' } : item);
  }

  function selectedRegionLabel(picker) {
    if (!picker) return '';
    const provinceSelect = picker.querySelector('[data-region-province]');
    const citySelect = picker.querySelector('[data-region-city]');
    const countySelect = picker.querySelector('[data-region-county]');
    const labels = [provinceSelect, citySelect].map((select) => select?.selectedOptions?.[0]?.textContent || '');
    if (countySelect?.value && countySelect.value !== citySelect?.value) {
      labels.push(countySelect.selectedOptions?.[0]?.textContent || '');
    }
    return labels.filter(Boolean).join(' · ');
  }

  function regionPathForCounty(countyCode) {
    const regions = window.SXF_CHINA_REGIONS?.regions || [];
    for (const province of regions) {
      for (const city of province.children || []) {
        if (String(city.code) === String(countyCode)) {
          return { provinceCode: province.code, cityCode: city.code, countyCode: city.code };
        }
        if ((city.children || []).some((county) => String(county.code) === String(countyCode))) {
          return { provinceCode: province.code, cityCode: city.code, countyCode };
        }
      }
    }
    return { provinceCode: '310000', cityCode: '310000', countyCode: '310115' };
  }

  function pinRecordKey(session) {
    return `${session.phone}|${session.deviceId}`;
  }

  async function digest(value) {
    if (window.crypto && window.crypto.subtle) {
      const bytes = new TextEncoder().encode(value);
      const result = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
    return `fallback-${hash >>> 0}`;
  }

  function initializeSessionGuard() {
    if (isDemoMode) return true;
    const cloudSession = readJson(cloudSessionKey, null);
    if (cloudSession?.sessionToken && cloudSession?.organization?.organizationId) {
      cloudPcSession = true;
      activeSession = { phone: '微信确认', deviceId: 'cloud', expiresAt: Date.now() + idleTtl, lastActiveAt: Date.now() };
      document.getElementById('operatorAvatar').textContent = '管';
      document.getElementById('operatorName').textContent = cloudSession.organization.name || '机构负责人';
      document.getElementById('operatorRole').textContent = '组织管理员 · 微信确认登录';
      document.getElementById('organizationName').textContent = cloudSession.organization.name || '赛小蜂篮球机构';
      if (cloudSession.organization.identityProfile?.logo) {
        const organizationLogo = document.getElementById('organizationLogo');
        organizationLogo.src = cloudSession.organization.identityProfile.logo;
        organizationLogo.alt = `${cloudSession.organization.name || '组织'} Logo`;
      }
      return true;
    }
    const session = readJson(sessionKey, null);
    const deviceId = localStorage.getItem(deviceKey);
    if (!session || session.deviceId !== deviceId || Number(session.expiresAt) <= Date.now()) {
      location.replace('./index.html');
      return false;
    }
    const accounts = readJson(accountsKey, {});
    const account = accounts[session.phone];
    if (!account || !account.onboardingCompleted || account.institutionName === '机构名称待补充') {
      location.replace('./index.html');
      return false;
    }
    const pins = readJson(pinsKey, {});
    if (!pins[pinRecordKey(session)]) {
      location.replace('./index.html');
      return false;
    }
    activeSession = session;
    const maskedPhone = `${session.phone.slice(0, 3)}****${session.phone.slice(-4)}`;
    document.getElementById('operatorAvatar').textContent = '管';
    document.getElementById('operatorName').textContent = '机构负责人';
    document.getElementById('operatorRole').textContent = `机构管理员 · ${maskedPhone}`;
    if (account.institutionName && account.institutionName !== '机构名称待补充') {
      document.getElementById('organizationName').textContent = account.institutionName;
    }
    if (account.institutionLogo) {
      const organizationLogo = document.getElementById('organizationLogo');
      organizationLogo.src = account.institutionLogo;
      organizationLogo.alt = `${account.institutionName} Logo`;
    }
    document.getElementById('eventLockedAccount').textContent = `${account.institutionName || '机构账号'} · ${session.phone.slice(0, 3)}****${session.phone.slice(-4)}`;
    if (Date.now() - Number(session.lastActiveAt) >= idleTtl) showEventLock();
    return true;
  }

  function showEventLock() {
    if (isDemoMode || cloudPcSession) return;
    eventLocked = true;
    document.getElementById('eventLock').hidden = false;
    setTimeout(() => document.getElementById('eventUnlockPin').focus(), 30);
  }

  function recordSessionActivity() {
    if (isDemoMode || cloudPcSession || eventLocked || !activeSession) return;
    const now = Date.now();
    if (now - lastActivityWrite < 60 * 1000) return;
    lastActivityWrite = now;
    activeSession.lastActiveAt = now;
    writeJson(sessionKey, activeSession);
  }

  function checkSessionIdle() {
    if (!isDemoMode && !cloudPcSession && activeSession && !eventLocked && Date.now() - Number(activeSession.lastActiveAt) >= idleTtl) showEventLock();
  }

  if (!initializeSessionGuard()) return;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function icon(name, className = '') {
    return `<span class="sxf-icon ${className}" style="--icon:url('${ICON_ROOT}${name}.svg')" aria-hidden="true"></span>`;
  }

  function btn(label, action, style = '', iconName = '') {
    return `<button class="btn ${style}" type="button" data-action="${action}">${iconName ? icon(iconName) : ''}<span>${label}</span></button>`;
  }

  function teamBadge(name, logo = '') {
    const color = teamColor[name] || '#ff7200';
    return `<span class="team-logo${logo ? ' has-image' : ''}" style="--team-color:${color}">${logo ? `<img src="${esc(logo)}" alt="${esc(name)}队徽">` : esc(name.slice(0, 1))}</span>`;
  }

  function teamLogoFor(name, eventSpace = activeEventSpace()) {
    return registrationTeamRows(eventSpace).find((team) => team.name === name)?.logo || '';
  }

  function calendarTimeCell(date, time, matches) {
    const hasMatches = matches.some((match) => String(match.time || '').split(' ')[1] === time);
    return `<div class="calendar-grid-time"><b>${esc(time)}</b>${hasMatches ? '' : `<button type="button" data-action="remove-calendar-time-slot" data-calendar-time-date="${esc(date)}" data-calendar-time="${esc(time)}" title="删除空时间段" aria-label="删除 ${esc(time)} 时间段">${icon('trash-2')} 删除</button>`}</div>`;
  }

  function teamCell(name, note = '', logo = '') {
    return `<div class="team-row">${teamBadge(name, logo)}<div><b>${esc(name)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div></div>`;
  }

  function status(text, type = '') {
    return `<span class="status-dot ${type}">${esc(text)}</span>`;
  }

  function heading(title, description, actions = '') {
    return `<div class="page-heading"><div><h2>${title}</h2><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;
  }

  function panel(title, body, action = '', className = '') {
    return `<section class="panel ${className}"><header class="panel-header"><h3>${title}</h3>${action}</header><div class="panel-body">${body}</div></section>`;
  }

  function field(label, value, type = 'input', full = false, options = []) {
    let control = `<input value="${esc(value)}">`;
    if (type === 'textarea') control = `<textarea>${esc(value)}</textarea>`;
    if (type === 'select') {
      control = `<select>${options.map((option) => `<option${option === value ? ' selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
    }
    return `<div class="field${full ? ' full' : ''}"><label>${label}</label>${control}</div>`;
  }

  function dateRangeField(label, startDate, endDate) {
    return `<div class="field event-date-range-field">
      <label>${label}</label>
      <div class="event-date-range">
        <input type="date" name="startDate" value="${esc(startDate)}" aria-label="${label}开始日期">
        <span>至</span>
        <input type="date" name="endDate" value="${esc(endDate)}" aria-label="${label}结束日期">
      </div>
    </div>`;
  }

  function namedField(label, name, value, type = 'input', options = []) {
    let control = `<input name="${esc(name)}" value="${esc(value)}">`;
    if (type === 'textarea') control = `<textarea name="${esc(name)}">${esc(value)}</textarea>`;
    if (type === 'select') {
      control = `<select name="${esc(name)}">${options.map((option) => `<option${option === value ? ' selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
    }
    return `<div class="field"><label>${label}</label>${control}</div>`;
  }

  function regionPickerField(label = '举办地区', provinceCode = '310000', cityCode = '310000', countyCode = '310115', full = false) {
    const regionData = window.SXF_CHINA_REGIONS && window.SXF_CHINA_REGIONS.regions;
    if (!Array.isArray(regionData) || !regionData.length) {
      return `<div class="field${full ? ' full' : ''}"><label>${label}</label><input value="上海市 · 上海市 · 浦东新区" readonly></div>`;
    }
    return `<div class="field region-field${full ? ' full' : ''}" data-region-picker data-province="${provinceCode}" data-city="${cityCode}" data-county="${countyCode}">
      <label>${label}</label>
      <div class="region-cascade">
        <select data-region-province aria-label="${label}省级"></select>
        <select data-region-city aria-label="${label}城市"></select>
        <select data-region-county aria-label="${label}区县"></select>
      </div>
      <input type="hidden" data-region-value name="regionCode" value="${countyCode}">
      <small>省 / 自治区 / 直辖市、城市、区县三级联动；区县可选择“全市范围”</small>
    </div>`;
  }

  function fillRegionSelect(select, items, selectedCode) {
    select.innerHTML = items.map((item) => `<option value="${esc(item.code)}"${String(item.code) === String(selectedCode) ? ' selected' : ''}>${esc(item.name)}</option>`).join('');
    if (!select.value && items[0]) select.value = String(items[0].code);
  }

  function bindRegionPickers(root = document) {
    const regionData = window.SXF_CHINA_REGIONS && window.SXF_CHINA_REGIONS.regions;
    if (!Array.isArray(regionData)) return;
    root.querySelectorAll('[data-region-picker]').forEach((picker) => {
      if (picker.dataset.bound === '1') return;
      const provinceSelect = picker.querySelector('[data-region-province]');
      const citySelect = picker.querySelector('[data-region-city]');
      const countySelect = picker.querySelector('[data-region-county]');
      const hidden = picker.querySelector('[data-region-value]');
      const initial = {
        province: picker.dataset.province,
        city: picker.dataset.city,
        county: picker.dataset.county
      };
      const refreshCounties = (selectedCounty = '') => {
        const province = regionData.find((item) => String(item.code) === provinceSelect.value) || regionData[0];
        const city = (province.children || []).find((item) => String(item.code) === citySelect.value) || (province.children || [])[0];
        const counties = city ? [{ code: city.code, name: '全市范围' }, ...(city.children || [])] : [];
        fillRegionSelect(countySelect, counties, selectedCounty);
        countySelect.disabled = counties.length === 0;
        if (hidden) hidden.value = countySelect.value || citySelect.value || provinceSelect.value;
      };
      const refreshCities = (selectedCity = '', selectedCounty = '') => {
        const province = regionData.find((item) => String(item.code) === provinceSelect.value) || regionData[0];
        fillRegionSelect(citySelect, province.children || [], selectedCity);
        refreshCounties(selectedCounty);
      };
      fillRegionSelect(provinceSelect, regionData, initial.province);
      refreshCities(initial.city, initial.county);
      provinceSelect.addEventListener('change', () => refreshCities());
      citySelect.addEventListener('change', () => refreshCounties());
      countySelect.addEventListener('change', () => {
        if (hidden) hidden.value = countySelect.value || citySelect.value || provinceSelect.value;
      });
      picker.dataset.bound = '1';
    });
  }

  function eventUploadBox(kind, label, size, fallbackSource = '') {
    const eventSpace = activeEventSpace();
    const source = uploadedEventImages[kind] || fallbackSource || (kind === 'logo' ? eventSpace?.logo : kind === 'cover' ? eventSpace?.cover : '');
    return `<button class="upload-box${['createLogo', 'teamLogo'].includes(kind) ? ' logo-square-upload' : ''}${source ? ' has-preview' : ''}" type="button" data-action="upload-event-image" data-upload-kind="${kind}" aria-label="${source ? `重新上传${label}` : `上传${label}`}">
      ${source ? `<img src="${source}" alt="${label}预览">` : `<span>${icon('upload')}</span><b>${label}</b><small>${size}</small>`}
      ${source && ['createLogo', 'teamLogo'].includes(kind) ? '<em class="transparent-preview-label">透明 PNG 成品预览</em>' : ''}
      ${source ? `<span class="upload-replace">${icon('upload')} 重新上传</span>` : ''}
    </button>`;
  }

  const logoBackgroundPresets = [
    ['dark', '深色'], ['white', '白色'], ['light', '浅灰'], ['cream', '暖白'], ['orange', '品牌橙']
  ];

  function normalizeLogoBackground(value) {
    return logoBackgroundPresets.some(([key]) => key === value) ? value : 'dark';
  }

  function logoBackgroundPicker(selected, compact = false) {
    const active = normalizeLogoBackground(selected);
    return `<div class="logo-background-picker${compact ? ' compact' : ''}">
      <div><b>Logo 展示底色</b><small>只改变赛事卡片的展示背景，不写入透明 Logo 图片。</small></div>
      <div class="logo-background-options">${logoBackgroundPresets.map(([key, label]) => `<button type="button" class="logo-background-option ${key === active ? 'active' : ''}" data-action="choose-logo-background" data-logo-background="${key}" aria-pressed="${key === active}"><i class="${key}"></i><span>${label}</span></button>`).join('')}</div>
    </div>`;
  }

  function eventBrandSummary(eventSpace) {
    const background = normalizeLogoBackground(eventSpace.logoBackground);
    return `<div class="event-brand-summary">
      <div class="event-brand-logo" data-logo-background="${background}"><img src="${esc(eventSpace.logo)}" alt="${esc(eventSpace.name)}赛事 Logo"></div>
      <strong>${esc(eventSpace.name)}</strong>
      <button class="btn outline small" type="button" data-action="edit-event-brand">${icon('pencil')}<span>修改</span></button>
    </div>`;
  }

  function metric(label, value, unit, iconName, note = '') {
    return `<article class="metric-card"><span>${label}</span><div class="metric-value"><i class="metric-icon">${icon(iconName)}</i><strong>${value}</strong><small>${unit}</small></div><small class="metric-note">${note}</small></article>`;
  }

  function route() {
    const value = location.hash.replace(/^#/, '') || 'spaces';
    const [section, page] = value.split('/');
    if (section === 'spaces' || (section === 'event' && page === 'space')) {
      return { section: 'spaces', page: '', isSpaceList: true };
    }
    const validSection = currentNavItems().some((item) => item.id === section) ? section : 'spaces';
    if (validSection === 'spaces') return { section: 'spaces', page: '', isSpaceList: true };
    let list = teamModulePages(validSection);
    if (validSection === 'registration' && !usesPlayerData()) {
      list = list.filter(([id]) => !['qualification', 'rosters'].includes(id));
    }
    if (validSection === 'onsite' && !usesPlayerData()) {
      list = list.filter(([id]) => id !== 'data-tasks');
    }
    // 赛程设置是从日历进入的三级配置页，不放入顶部子导航，
    // 但必须允许直接路由访问，避免刷新或返回后被错误回退到日历。
    const isScheduleSettings = validSection === 'schedule' && page === 'settings';
    if (validSection === 'onsite' && page === 'bindings') return { section: 'onsite', page: 'people', isSpaceList: false };
    if (validSection === 'onsite' && page === 'data-tasks' && !usesPlayerData()) return { section: 'onsite', page: 'people', isSpaceList: false };
    const validPage = isScheduleSettings || list.some(([id]) => id === page) ? page : (list[0] ? list[0][0] : '');
    return { section: validSection, page: validPage, isSpaceList: false };
  }

  function routeTo(section, page = '') {
    location.hash = page ? `${section}/${page}` : section;
  }

  function renderNav(current, isSpaceList = false) {
    const items = isSpaceList
      ? [{ id: 'spaces', label: '赛事空间', icon: 'layout-dashboard' }]
      : currentNavItems();
    navElement.innerHTML = items.map((item) => `
      <button type="button" class="${item.id === current ? 'active' : ''}" data-route="${item.id}">
        ${icon(item.icon, 'nav-glyph')}<span>${item.label}</span>
      </button>`).join('');
  }

  function renderSubnav(section, currentPage) {
    let list = teamModulePages(section);
    if (section === 'registration' && !usesPlayerData()) {
      list = list.filter(([id]) => !['qualification', 'rosters'].includes(id));
    }
    if (section === 'onsite' && !usesPlayerData()) {
      list = list.filter(([id]) => id !== 'data-tasks');
    }
    if (section === 'draw') {
      list = drawNavigationForCurrentGroup();
    }
    if (!list.length) {
      subnavBar.hidden = true;
      subnavElement.innerHTML = '';
      pageActions.innerHTML = '';
      return;
    }
    subnavBar.hidden = false;
    subnavElement.innerHTML = list.filter(([id]) => !['format', 'settings'].includes(id)).map(([id, label]) => `
      <button type="button" class="${id === currentPage || (currentPage === 'format' && id === 'groups') ? 'active' : ''}" data-route="${section}/${id}">${label}</button>
    `).join('');
    const actionMap = {
      'event/groups': '',
      'event/format': '',
      'registration/progress': `${btn('同步报名数据', 'sync-registration-data', 'outline', 'refresh-cw')}${btn('生成球队报名码', 'show-qr', 'primary', 'qr-code')}${btn('入驻设置', 'registration-settings', 'outline', 'settings')}`,
      'registration/claims': `${btn('添加虚拟球队', 'add-virtual-teams', 'outline', 'flask-conical')}${btn('人工添加球队', 'add-registration-team', 'primary', 'plus')}${btn('\u5168\u90e8\u8ba4\u9886', 'claim-all-registration-teams', 'outline', 'circle-check-big')}${btn('\u5168\u90e8\u6d4b\u8bd5\u76f4\u901a', 'test-admit-all-registration-teams', 'outline', 'flask-conical')}`,
      'teams/teams': `${btn('编辑当前球队', 'edit-current-team', 'outline', 'pencil')}${btn('刷新状态', 'refresh', 'outline', 'refresh-cw')}`,
      'onsite/people': `${btn('一键发送接入通知', 'send-access-notifications', 'primary', 'send')}${btn('批量分配', 'batch-assign', 'outline', 'users-round')}`,
      'results/review': btn('批量通过正常场次', 'approve-normal', 'outline', 'circle-check-big'),
      'results/reports': btn('版面调整', 'open-report-layout', 'outline', 'settings')
    };
    if (eventWorkflow().finished) {
      pageActions.innerHTML = '<span class="status-pill">赛事已结束 · 只读</span>';
      return;
    }
    pageActions.innerHTML = Object.prototype.hasOwnProperty.call(actionMap, `${section}/${currentPage}`)
      ? actionMap[`${section}/${currentPage}`]
      : section === 'event' ? btn('保存设置', 'save-page', 'primary', 'save') : '';
  }

  function renderWorkbench() {
    const eventSpace = activeEventSpace();
    const workflow = eventWorkflow(eventSpace);
    if (!workflow.teamsImported) {
      const metrics = [
        ['今日场次', '0', '场', 'calendar-days', '尚未生成赛程', 'ring'],
        ['进行中', '0', '场', 'circle-play', '暂无比赛', 'plain'],
        ['待处理异常', '0', '项', 'triangle-alert', '当前无异常', 'plain'],
        ['数据记录任务', '0', '人', 'users-round', '尚未分配', 'plain']
      ];
      return `<div class="workbench-dashboard blank-workbench">
        <div class="workbench-metrics">${metrics.map(([label, value, unit, iconName, note, variant]) => `
          <article class="workbench-metric-card"><span class="workbench-metric-label">${label}</span>
            <div class="workbench-metric-value"><i class="workbench-metric-icon ${variant}">${icon(iconName)}</i><strong>${value}</strong><small>${unit}</small></div>
            <span class="workbench-metric-note">${note}</span></article>`).join('')}</div>
        <section class="workbench-card blank-event-start">
          <div class="blank-event-copy"><i>${icon('clipboard-list')}</i><div><h2>${workflow.registrationConfigured ? '报名入口已开放，等待球队入驻' : '赛事刚刚创建，暂无运营数据'}</h2><p>先完成赛事基础配置。球队入驻、抽签、赛程和现场任务会在真实操作后逐步出现。</p></div></div>
          <div class="blank-event-steps">
            <button type="button" data-action="go-event-profile"><b>1</b><span><strong>完善赛事资料</strong><small>名称、日期、地区与公开信息</small></span>${icon('chevron-right')}</button>
            <button type="button" data-action="go-event-groups"><b>2</b><span><strong>创建组别与赛制</strong><small>设置参赛规模和比赛规则</small></span>${icon('chevron-right')}</button>
            <button type="button" data-action="go-event-registration"><b>3</b><span><strong>配置报名入口</strong><small>设置资料要求并生成入驻入口</small></span>${icon('chevron-right')}</button>
            <button type="button" data-action="go-schedule-settings"><b>4</b><span><strong>设置赛程资源</strong><small>统一配置全部组别的比赛日、场地和时间</small></span>${icon('chevron-right')}</button>
          </div>
        </section>
        <div class="workbench-main-grid">
          <section class="workbench-card workbench-schedule-card"><header class="workbench-card-header"><h2>今日赛程</h2></header><div class="module-empty">${icon('calendar-days')}<b>暂无赛程</b><span>完成组别、球队和场馆配置后再自动排赛。</span></div></section>
          <section class="workbench-card workbench-todo-card"><header class="workbench-card-header"><h2>运营待办</h2></header><div class="module-empty">${icon('circle-check-big')}<b>暂无待办</b><span>赛事开始运营后，异常与待处理任务会显示在这里。</span></div></section>
        </div>
      </div>`;
    }
    if (eventSpace?.workflow) {
      const teamCount = Number(eventSpace.teams || 0);
      const matchCount = Number(eventSpace.matches || 0);
      const targetTeams = eventGroupRows.reduce((sum, group) => sum + Number(group.target || 0), 0);
      const nextTask = !workflow.drawSaved
        ? ['完成抽签分组', '球队已到齐，确认分组后才能自动排赛', 'go-event-groups']
        : !workflow.venuesConfigured
          ? ['设置赛程资源', '统一配置全部组别的比赛日、场地和时间', 'go-schedule-settings']
          : !workflow.scheduleGenerated
            ? ['生成正式赛程', '根据球队、场地和时间约束自动排赛', 'go-auto']
            : !workflow.onsiteAssigned
              ? ['安排现场人员', '为每个场次配置计分、数据与 MC 席位', 'go-people']
              : !workflow.executionReturned
                ? ['等待现场回传', 'PC 端监控场次，比分由小程序计分台回传', 'go-people']
                : !workflow.resultsApproved
                  ? ['复核比赛赛果', '确认赛果后再结束本届赛事', 'go-review']
                  : workflow.finished
                    ? ['赛事已结束', '全部赛果已复核，当前空间为只读历史记录', 'go-review']
                    : ['可以结束赛事', '全部比赛和赛果均已完成', 'return-spaces'];
      const metrics = [
        ['今日场次', '0', '场', 'calendar-days', matchCount ? `已生成 ${matchCount} 场赛程` : '尚未生成赛程', 'ring'],
        ['进行中', '0', '场', 'circle-play', workflow.finished ? '赛事已结束' : '暂无实时比赛', 'plain'],
        ['待处理异常', '0', '项', 'triangle-alert', '当前无异常', 'plain'],
        ['数据记录任务', '0', '人', 'users-round', '尚无付费数据任务', 'plain']
      ];
      return `<div class="workbench-dashboard lifecycle-workbench">
        <div class="workbench-metrics">${metrics.map(([label, value, unit, iconName, note, variant]) => `
          <article class="workbench-metric-card"><span class="workbench-metric-label">${label}</span>
            <div class="workbench-metric-value"><i class="workbench-metric-icon ${variant}">${icon(iconName)}</i><strong>${value}</strong><small>${unit}</small></div>
            <span class="workbench-metric-note">${note}</span></article>`).join('')}</div>
        <div class="workbench-main-grid">
          <section class="workbench-card workbench-schedule-card"><header class="workbench-card-header"><h2>近期赛程</h2>${matchCount ? `<button type="button" data-action="go-schedule">查看全部赛程 ${icon('chevron-right')}</button>` : ''}</header>
            <div class="module-empty">${icon('calendar-days')}<b>${matchCount ? `已生成 ${matchCount} 场赛程` : '暂无赛程'}</b><span>${matchCount ? '比赛日期尚未开始；到达比赛日后，场次会按时间进入今日赛程。' : '完成分组、场馆和时间配置后启动自动排赛。'}</span></div></section>
          <section class="workbench-card workbench-todo-card"><header class="workbench-card-header"><h2>当前下一步</h2></header>
            <div class="module-empty">${icon(workflow.finished ? 'circle-check-big' : 'clipboard-list')}<b>${nextTask[0]}</b><span>${nextTask[1]}</span>${btn(workflow.finished ? '查看赛果' : '继续处理', nextTask[2], 'outline', 'chevron-right')}</div></section>
        </div>
        <div class="workbench-bottom-grid">
          <section class="workbench-card workbench-summary-card"><h2>报名与资格</h2><div class="workbench-stat-grid">
            <div><span>已入驻球队</span><strong>${teamCount} <small>/ ${targetTeams || teamCount}</small></strong><div class="workbench-progress"><i style="width:${targetTeams ? Math.min(100, teamCount / targetTeams * 100) : 0}%"></i></div></div>
            <div><span>资格通过</span><strong>${workflow.qualificationCompleted ? teamCount : 0} <small>支</small></strong></div><div><span>资格异常</span><strong>0 <small>支</small></strong></div>
          </div><button class="workbench-detail-link" type="button" data-action="go-registration-progress">查看详情 ${icon('chevron-right')}</button></section>
          <section class="workbench-card workbench-summary-card workbench-onsite-card"><h2>现场执行</h2><div class="workbench-onsite-stats">
            <div><span>全部场次</span><strong>${matchCount}</strong></div><div><span>人员已安排</span><strong>${workflow.onsiteAssigned ? matchCount : 0}</strong></div><div><span>已回传</span><strong>${workflow.executionReturned ? matchCount : 0}</strong></div>
          </div><button class="workbench-detail-link" type="button" data-action="go-people">查看详情 ${icon('chevron-right')}</button></section>
          <section class="workbench-card workbench-summary-card workbench-data-card"><h2>赛事状态</h2><div class="workbench-stat-grid">
            <div><span>组别</span><strong>${eventSpace.groups || 0}</strong></div><div><span>球队</span><strong>${teamCount}</strong></div><div><span>赛果通过</span><strong>${workflow.resultsApproved ? matchCount : 0}</strong></div>
          </div><div class="workbench-capacity-note">${icon(workflow.finished ? 'circle-check-big' : 'info')}<span>${workflow.finished ? '赛事已结束，数据已转为历史记录' : `赛事进度 ${eventSpace.progress}%`}</span></div></section>
        </div>
      </div>`;
    }
    const metrics = [
      ['今日场次', '18', '场', 'calendar-days', '共 3 个场馆', 'ring'],
      ['进行中', '3', '场', 'circle-play', '实时比赛', 'plain'],
      ['待处理异常', '6', '项', 'triangle-alert', '需主办方处理', 'plain'],
      ['数据记录任务', '12', '人', 'users-round', '3 人待分配', 'plain']
    ];
    const matches = [
      ['09:00', 'U15-12', 'U15男子A组', '猛虎队', '28 : 32', '飞鹰队', '1号馆', '进行中', 'live'],
      ['10:30', 'U13-05', 'U13男子B组', '雷霆队', '-', '闪电队', '1号馆', '待开赛', 'waiting'],
      ['10:30', 'U15-07', 'U15女子A组', '星火队', '-', '飓风队', '2号馆', '待开赛', 'waiting'],
      ['12:00', 'U17-03', 'U17男子A组', '勇士队', '-', '战狼队', '1号馆', '待开赛', 'waiting'],
      ['12:00', 'U13-08', 'U13男子B组', '烈焰队', '-', '超越队', '2号馆', '待开赛', 'waiting']
    ];
    const todos = [
      ['2 支球队待认领审核', '需尽快处理', 'users-round', 'critical', 'go-claims'],
      ['5 名球员资格异常', '需尽快处理', 'triangle-alert', 'warning', 'go-qualification'],
      ['3 场现场人员未齐', '今日需完成', 'user-round-check', 'notice', 'go-people'],
      ['3 名付费球员待分配记录员', '尽快分配', 'users-round', 'muted', 'go-data-tasks']
    ];
    return `
      <div class="workbench-dashboard">
      <div class="workbench-metrics">
        ${metrics.map(([label, value, unit, iconName, note, variant]) => `
          <article class="workbench-metric-card">
            <span class="workbench-metric-label">${label}</span>
            <div class="workbench-metric-value">
              <i class="workbench-metric-icon ${variant}">${icon(iconName)}</i>
              <strong>${value}</strong><small>${unit}</small>
            </div>
            <span class="workbench-metric-note">${note}</span>
          </article>`).join('')}
      </div>
      <div class="workbench-main-grid">
        <section class="workbench-card workbench-schedule-card">
          <header class="workbench-card-header">
            <h2>今日赛程</h2>
            <button type="button" data-action="go-schedule">查看全部赛程 ${icon('chevron-right')}</button>
          </header>
          <div class="workbench-schedule-wrap">
            <table class="workbench-schedule-table">
              <thead><tr><th>时间</th><th>场次</th><th>组别</th><th>主队</th><th>比分</th><th>客队</th><th>场馆</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                ${matches.map(([time, match, group, home, score, away, venue, stateText, stateClass]) => `
                  <tr>
                    <td>${time}</td><td>${match}</td><td>${group}</td><td>${home}</td>
                    <td class="${score === '-' ? '' : 'score'}">${score}</td><td>${away}</td><td>${venue}</td>
                    <td><span class="workbench-match-state ${stateClass}"><i></i>${stateText}</span></td>
                    <td><button type="button" data-action="match-detail">详情</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <footer class="workbench-schedule-footer">
            <span>共 18 场</span>
            <div><button type="button" aria-label="上一页">${icon('chevron-left')}</button><b>1 / 4</b><button type="button" aria-label="下一页">${icon('chevron-right')}</button></div>
          </footer>
        </section>
        <section class="workbench-card workbench-todo-card">
          <header class="workbench-card-header"><h2>运营待办</h2></header>
          <div class="workbench-todo-list">
            ${todos.map(([title, note, iconName, level, action]) => `
              <article class="workbench-todo-row ${level}">
                <span class="workbench-todo-dot"></span>
                <i class="workbench-todo-icon">${icon(iconName)}</i>
                <div><strong>${title}</strong><small>${note}</small></div>
                <button type="button" data-action="${action}">去处理</button>
              </article>`).join('')}
          </div>
        </section>
      </div>
      <div class="workbench-bottom-grid">
        <section class="workbench-card workbench-summary-card">
          <h2>报名与资格</h2>
          <div class="workbench-stat-grid">
            <div><span>已入驻球队</span><strong>24 <small>/ 28</small></strong><div class="workbench-progress"><i style="width:86%"></i></div></div>
            <div><span>正式名单</span><strong>20 <small>/ 24</small></strong><div class="workbench-progress"><i style="width:83%"></i></div></div>
            <div><span>资格异常</span><strong>5 <small>人</small></strong><div class="workbench-progress short"><i style="width:27%"></i></div></div>
          </div>
          <button class="workbench-detail-link" type="button" data-action="go-registration-progress">查看详情 ${icon('chevron-right')}</button>
        </section>
        <section class="workbench-card workbench-summary-card workbench-onsite-card">
          <h2>现场执行</h2>
          <div class="workbench-onsite-stats">
            <div><span>今日场次</span><strong>18</strong></div><div><span>人员已齐</span><strong>15</strong></div><div><span>待安排</span><strong>3</strong></div>
          </div>
          <table><thead><tr><th>场馆</th><th>场次</th><th>人员状态</th><th>操作</th></tr></thead><tbody>
            <tr><td>1号馆</td><td>10</td><td><span class="workbench-person-state ready"><i></i>已齐</span></td><td><button type="button" data-action="go-people">查看</button></td></tr>
            <tr><td>2号馆</td><td>8</td><td><span class="workbench-person-state pending"><i></i>待安排 3 人</span></td><td><button type="button" data-action="go-people">查看</button></td></tr>
          </tbody></table>
          <button class="workbench-detail-link" type="button" data-action="go-people">查看详情 ${icon('chevron-right')}</button>
        </section>
        <section class="workbench-card workbench-summary-card workbench-data-card">
          <h2>球员数据服务</h2>
          <div class="workbench-stat-grid">
            <div><span>已购球员</span><strong>12</strong></div><div><span>记录容量</span><strong>15</strong></div><div><span>待分配</span><strong>3</strong></div>
          </div>
          <div class="workbench-capacity-note">${icon('circle-check-big')}<span>当前容量充足，可满足本次赛事记录需求</span></div>
          <button class="workbench-detail-link" type="button" data-action="go-data-tasks">查看详情 ${icon('chevron-right')}</button>
        </section>
      </div>
      </div>`;
  }

  function renderEventSpace() {
    return `<div class="primary-page event-space-page">
      <section class="event-space-panel">
        <header class="event-space-header">
          <div><h2>赛事空间</h2><p>一个赛事空间可包含多个竞赛组别，进入后统一管理报名、赛程、现场执行与赛果。</p></div>
          <div class="event-space-tools">
            <label class="icon-input">${icon('search')}<input data-filter-target="event-space-card" placeholder="搜索赛事名称"></label>
            <select class="control" data-filter-status><option value="">全部状态</option><option>进行中</option><option>报名中</option><option>筹备中</option><option>已结束</option></select>
            ${btn('创建赛事', 'create-event', 'primary', 'plus')}
          </div>
        </header>
        <div class="event-space-grid">
          <button class="event-card create" type="button" data-action="create-event">
            <span class="create-plus">${icon('plus')}</span><strong>创建新赛事</strong><p>创建赛事空间并配置组别</p>
          </button>
          ${eventSpaces.map((eventSpace) => `
            <article class="event-card event-space-card" data-search="${esc(eventSpace.name)}" data-status="${esc(eventSpace.state)}">
              <div class="event-card-cover" data-logo-background="${normalizeLogoBackground(eventSpace.logoBackground)}"><img class="event-logo" src="${esc(eventSpace.logo)}" alt="${esc(eventSpace.name)}赛事Logo"><span class="event-state ${esc(eventSpace.stateClass || 'blue')}">${esc(eventSpace.state)}</span><button type="button" data-action="event-more" data-event-id="${esc(eventSpace.id)}" aria-label="赛事更多操作">•••</button></div>
              <div class="event-card-body">
                <h3>${esc(eventSpace.name)}</h3>
                <div class="event-stat-line"><span>${icon('users-round')} ${eventSpace.groups} 个组别</span><span>${icon('users-round')} ${eventSpace.teams} 支球队</span><span>${icon('circle-play')} ${eventSpace.matches} 场比赛</span></div>
                <div class="event-date-line">${icon('calendar-days')} ${displayEventDate(eventSpace)}</div>
                <div class="event-progress"><span>赛事进度 <b>${eventSpace.progress}%</b></span><div class="progress"><i style="width:${eventSpace.progress}%"></i></div></div>
                <div class="event-card-actions">
                  ${btn('编辑', 'edit-event', 'outline', 'pencil')}
                  <button class="btn primary" type="button" data-action="enter-event" data-event-id="${esc(eventSpace.id)}">进入赛事空间</button>
                </div>
              </div>
            </article>`).join('')}
        </div>
        <div class="event-space-note">${icon('info')}<span>进入赛事空间后，所有报名、抽签、赛程、现场任务和数据操作均只针对当前赛事。</span></div>
      </section>
    </div>`;
  }

  function renderEventProfile() {
    const eventSpace = activeEventSpace();
    const regionPath = regionPathForCounty(eventSpace.regionCode || '310115');
    const units = organizationUnits(eventSpace);
    const playerDataEnabled = usesPlayerData(eventSpace);
    return `${heading('赛事资料', '维护当前赛事的基础信息、品牌素材与公开范围。')}
      <div class="split-layout">
        <section class="panel form-panel"><form data-event-profile-form><div class="form-grid">
          ${namedField('赛事名称', 'eventName', eventSpace.name)}
          ${namedField('赛事简称', 'eventShortName', eventSpace.shortName || eventSpace.name.replace(/^\\d{4}\\s*/, '').slice(0, 12))}
          ${dateRangeField('举办日期', eventSpace.startDate, eventSpace.endDate)}
          ${namedField('赛事类型', 'eventType', eventSpace.eventType || '青少年篮球联赛', 'select', ['青少年篮球联赛', '3V3 挑战赛', '校园邀请赛'])}
          ${regionPickerField('举办地区', regionPath.provinceCode, regionPath.cityCode, regionPath.countyCode)}
          <section class="event-participation-mode field full">
            <header><b>参赛资料模式</b><small>决定本赛事是否录入球员、审核球员资格和统计个人数据。</small></header>
            <div class="participation-mode-options">
              <label class="participation-mode-card"><input type="radio" name="participationMode" value="team-only"${playerDataEnabled ? '' : ' checked'}><span>${icon('users-round')}<b>仅球队数据</b><small>只维护球队、领队、赛程、比分和球队统计；不录入球员，不做球员资格审查。</small></span></label>
              <label class="participation-mode-card"><input type="radio" name="participationMode" value="team-player"${playerDataEnabled ? ' checked' : ''}><span>${icon('user-round')}<b>球队＋球员数据</b><small>维护球员名单、资格审核和个人技术统计，适合正式青少年赛事。</small></span></label>
            </div>
          </section>
          <div class="field full"><label>赛事简介</label><textarea name="description">${esc(eventSpace.description || '')}</textarea></div>
          <section class="event-organization-settings field full">
            <header><b>赛事组织单位</b><small>统一用于竞赛规程、报名页、报名海报及赛事公开信息。</small></header>
            <div><label><span>主办单位</span><input name="organizer" value="${esc(units.organizer)}" placeholder="赛事发起与决策单位"></label><label><span>承办单位</span><input name="undertaker" value="${esc(units.undertaker)}" placeholder="负责具体办赛执行的单位"></label><label><span>协办单位（可选）</span><input name="coOrganizer" value="${esc(units.coOrganizer)}" placeholder="没有可留空"></label></div>
          </section>
        </div></form></section>
        <div class="stack">
          ${panel('赛事标识', eventBrandSummary(eventSpace))}
          ${panel('报名与公开', `
            <div class="switch-row"><span>允许球队入驻</span><button class="switch on" data-action="toggle" type="button"></button></div>
            <div class="switch-row"><span>公开赛程</span><button class="switch on" data-action="toggle" type="button"></button></div>
            <div class="switch-row"><span>公开积分榜</span><button class="switch on" data-action="toggle" type="button"></button></div>
            <div class="switch-row player-service-row${playerDataEnabled ? '' : ' disabled'}"><span>开启球员数据服务<small>${playerDataEnabled ? '按球员记录个人技术统计' : '仅球队数据模式下自动关闭'}</small></span><button class="switch${playerDataEnabled ? ' on' : ''}" data-action="toggle" type="button"${playerDataEnabled ? '' : ' disabled'}></button></div>
          `)}
          ${panel('当前状态', `<div class="summary-strip compact"><div><span>状态</span><strong class="orange-text">${esc(eventSpace.state)}</strong></div><div><span>组别</span><strong>${eventSpace.groups || 0}</strong></div><div><span>球队</span><strong>${eventSpace.teams || 0}</strong></div><div><span>比赛</span><strong>${eventSpace.matches || 0}</strong></div></div>`)}
        </div>
      </div>`;
  }

  function defaultCompetitionConfig(group) {
    const totalTeams = Math.max(2, Number(group?.target || 8));
    const groupCount = totalTeams >= 16 ? 4 : totalTeams >= 8 ? 2 : 1;
    return {
      formatType: 'custom',
      groupCount,
      teamsPerGroup: Math.ceil(totalTeams / groupCount),
      advancePerGroup: totalTeams >= 8 ? 2 : 1,
      placementMatchesPerTeam: 1,
      thirdPlaceMatch: false,
      points: { win: 2, draw: 1, loss: 0, forfeitWin: 2, forfeitLoss: 0 },
      stages: [],
      configured: false,
      updatedAt: ''
    };
  }

  function automaticPlacementMatchesPerTeam(groupCount) {
    // 两组全员排位采用“交叉赛 + 名次赛”，每队在小组赛后再打 2 场。
    return Number(groupCount || 1) === 2 ? 2 : Math.max(1, Number(groupCount || 1) - 1);
  }

  const competitionOptions = [
    '小组循环 + 淘汰赛',
    '小组循环 + 单循环',
    '单败淘汰',
    '全部球队单循环'
  ];

  function normalizeCompetitionName(value) {
    const aliases = {
      '小组循环 + 全员交叉排位': '小组循环 + 淘汰赛',
      '小组循环 + 全员分层排位': '小组循环 + 淘汰赛',
      '小组循环 + 淘汰赛（带排位赛）': '小组循环 + 淘汰赛',
      '小组循环 + 淘汰赛（不带排位赛）': '小组循环 + 淘汰赛',
      '小组循环 + 争冠单败淘汰': '小组循环 + 淘汰赛',
      '小组赛 + 单循环': '小组循环 + 单循环',
      '小组循环赛': '小组循环 + 单循环',
      '小组循环赛（组内排名）': '小组循环 + 单循环',
      '小组循环 + 单败淘汰': '小组循环 + 淘汰赛',
      '小组循环 + 双败淘汰': '小组循环 + 淘汰赛',
      '分组 + 单败淘汰': '小组循环 + 淘汰赛',
      '分组 + 双败淘汰': '小组循环 + 淘汰赛',
      '单循环赛': '全部球队单循环',
      '全部球队双循环': '全部球队单循环',
      '双循环赛': '全部球队单循环',
      '单败淘汰（邀请赛）': '单败淘汰',
      '双败淘汰（邀请赛）': '单败淘汰',
      '双败淘汰': '单败淘汰',
      '单场淘汰': '单败淘汰',
      '单场淘汰赛': '单败淘汰'
    };
    return aliases[value] || (competitionOptions.includes(value) ? value : '小组循环 + 淘汰赛');
  }

  function competitionConfig(group) {
    if (!group) return null;
    group.competition = normalizeCompetitionName(group.competition);
    const defaults = defaultCompetitionConfig(group);
    const hadStoredCompetitionConfig = Boolean(group.competitionConfig);
    const storedConfig = group.competitionConfig || {};
    const groupCount = Math.max(1, Number(group.groupCount || storedConfig.groupCount || defaults.groupCount));
    const teamsPerGroup = Math.max(2, Number(group.teamsPerGroup || storedConfig.teamsPerGroup || defaults.teamsPerGroup));
    const advancePerGroup = Math.max(1, Number(group.advancePerGroup || storedConfig.advancePerGroup || defaults.advancePerGroup));
    const thirdPlaceMatch = Boolean(group.thirdPlaceMatch ?? storedConfig.thirdPlaceMatch ?? false);
    group.groupCount = groupCount;
    group.teamsPerGroup = teamsPerGroup;
    group.advancePerGroup = advancePerGroup;
    group.thirdPlaceMatch = thirdPlaceMatch;
    const placementMatchesPerTeam = storedConfig.preset === 'group-full-placement'
      ? automaticPlacementMatchesPerTeam(groupCount)
      : Math.max(1, Number(group.placementMatchesPerTeam || storedConfig.placementMatchesPerTeam || defaults.placementMatchesPerTeam || 1));
    group.placementMatchesPerTeam = placementMatchesPerTeam;
    group.advancement = group.competition === '小组循环 + 淘汰赛' && group.competitionConfig?.preset === 'group-full-placement' ? '按组内名次进入对应排位层'
        : `每组前 ${advancePerGroup} 名`;
    group.competitionConfig = Object.assign(defaults, storedConfig, { groupCount, teamsPerGroup, advancePerGroup, placementMatchesPerTeam, thirdPlaceMatch });
    group.competitionConfig.points = Object.assign(defaults.points, group.competitionConfig.points || {});
    group.competitionConfig.stages = Array.isArray(group.competitionConfig.stages)
      ? group.competitionConfig.stages
      : defaults.stages;
    const config = group.competitionConfig;
    if (!hadStoredCompetitionConfig) {
      const initialPreset = presetForCompetition(group.competition);
      applyFormatPreset(config, initialPreset, Number(group.target || 8));
      config.configured = true;
      config.dirty = false;
    }
    const totalTeams = Math.max(2, Number(group.target || 8));
    const canonicalKnockoutStages = knockoutStagesForTeams(totalTeams, config.thirdPlaceMatch);
    const isLegacyKnockout = config.formatType === 'knockout'
      && config.stages.some((stage) => ['single-elimination-stage', 'single-elimination', 'knockout-stage'].includes(stage.id));
    const knockoutPresetOutdated = config.preset === 'knockout'
      && (config.knockoutSchemaVersion !== 3
        || config.knockoutTeamCount !== totalTeams
        || config.stages.length !== canonicalKnockoutStages.length
        || config.stages.some((stage, index) => Number(stage.matchCount) !== Number(canonicalKnockoutStages[index]?.matchCount)));
    if (isLegacyKnockout || knockoutPresetOutdated) {
      config.stages = canonicalKnockoutStages;
      config.preset = 'knockout';
      config.knockoutSchemaVersion = 3;
      config.knockoutTeamCount = totalTeams;
      config.dirty = true;
    }
    const canonicalFullPlacementStages = knockoutFullPlacementStages(totalTeams);
    const knockoutFullPlacementOutdated = config.preset === 'knockout-full-placement'
      && (config.knockoutTeamCount !== totalTeams
        || config.stages.length !== canonicalFullPlacementStages.length
        || config.stages.some((stage, index) => stage.id !== canonicalFullPlacementStages[index]?.id
          || Number(stage.matchCount || 0) !== Number(canonicalFullPlacementStages[index]?.matchCount || 0)));
    if (knockoutFullPlacementOutdated) {
      config.stages = canonicalFullPlacementStages;
      config.knockoutSchemaVersion = 3;
      config.knockoutTeamCount = totalTeams;
      config.dirty = true;
    }
    const combinedAdvanceTeams = Math.max(2, Number(config.groupCount || 1) * Number(config.advancePerGroup || 1));
    const canonicalCombinedStages = groupKnockoutStages(config);
    const groupKnockoutPresetOutdated = config.preset === 'group-knockout'
      && (config.groupKnockoutSchemaVersion !== 3
        || config.groupKnockoutAdvanceTeams !== combinedAdvanceTeams
        || config.stages.length !== canonicalCombinedStages.length
        || config.stages.some((stage, index) => stage.id !== canonicalCombinedStages[index]?.id
          || Number(stage.matchCount || 0) !== Number(canonicalCombinedStages[index]?.matchCount || 0)));
    if (groupKnockoutPresetOutdated) {
      config.stages = canonicalCombinedStages;
      config.groupKnockoutSchemaVersion = 3;
      config.groupKnockoutAdvanceTeams = combinedAdvanceTeams;
      config.dirty = true;
    }
    const championshipStage = config.stages.find((stage) => stage.id === 'championship-round');
    const canonicalGroupPlacementStages = groupFullPlacementStages(config);
    if (config.preset === 'group-full-placement'
      && (config.groupPlacementSchemaVersion !== 2
        || config.stages.length !== canonicalGroupPlacementStages.length
        || config.stages.some((stage, index) => stage.id !== canonicalGroupPlacementStages[index]?.id
          || Number(stage.matchCount || 0) !== Number(canonicalGroupPlacementStages[index]?.matchCount || 0)))) {
      config.stages = canonicalGroupPlacementStages;
      config.groupPlacementSchemaVersion = 2;
      config.dirty = true;
    }
    if (config.preset === 'group-round-robin'
      && (config.stages.length !== 2 || Number(championshipStage?.entrants || 0) !== combinedAdvanceTeams)) {
      config.stages = groupRoundRobinStages(config);
      config.dirty = true;
    }
    return config;
  }

  function formatTypeLabel(type) {
    return ({ group: '小组循环赛', 'single-round': '全部球队单循环', 'double-round': '全部球队双循环', knockout: '单败淘汰', 'double-knockout': '双败淘汰', combined: '组合赛制' })[type] || '组合赛制';
  }

  function syncStagesForFormat(config) {
    if (config.formatType === 'combined') {
      config.stages = [
        { id: 'group-stage', name: '小组单循环', type: 'group' },
        { id: 'quarter-final', name: '八强淘汰赛', type: 'knockout' },
        { id: 'semi-final', name: '半决赛', type: 'knockout' },
        { id: 'final', name: '决赛', type: 'final' }
      ];
    } else {
      const name = formatTypeLabel(config.formatType);
      config.stages = [{ id: `${config.formatType}-stage`, name, type: config.formatType }];
    }
    selectedFormatStageId = config.stages[0].id;
  }

  function knockoutStagesForTeams(teamCount, includeThirdPlace = false) {
    const totalTeams = Math.max(2, Number(teamCount || 8));
    const bracketSize = 2 ** Math.ceil(Math.log2(totalTeams));
    const stages = [];
    let bracketEntrants = bracketSize;
    let actualEntrants = totalTeams;
    let firstRound = true;
    while (bracketEntrants > 2) {
      const qualifiers = bracketEntrants / 2;
      const matchCount = firstRound ? Math.max(1, actualEntrants - qualifiers) : qualifiers;
      stages.push({
        id: `round-${bracketEntrants}`,
        name: `${actualEntrants}进${qualifiers}`,
        type: 'knockout',
        entrants: actualEntrants,
        bracketSize: bracketEntrants,
        qualifiers,
        matchCount,
        byeCount: firstRound ? Math.max(0, bracketEntrants - actualEntrants) : 0,
        hasZones: true
      });
      actualEntrants = qualifiers;
      bracketEntrants = qualifiers;
      firstRound = false;
    }
    if (includeThirdPlace && totalTeams >= 4) {
      stages.push({ id: 'third-place', name: '三、四名决赛', type: 'third-place', entrants: 2, qualifiers: 0, matchCount: 1, hasZones: false, note: '两场半决赛的负者进行一场季军赛，决出第三名和第四名。' });
    }
    stages.push({ id: 'final', name: '决赛', type: 'final', entrants: 2, bracketSize: 2, qualifiers: 1, matchCount: 1, hasZones: false });
    return stages;
  }

  // 全员排位采用胜负双线：首轮胜者进入争冠线，负者进入低位排位线；
  // 每一轮继续分流，最终每支球队都有明确名次。常用的 4 / 8 / 16 队均可直接生成。
  function fullPlacementRoundLabel(rangeStart, rangeEnd, stageIndex, bracketSize) {
    const rangeSize = rangeEnd - rangeStart + 1;
    if (stageIndex === 0) {
      if (bracketSize === 2) return '决赛';
      if (bracketSize === 4) return '半决赛';
      return `1/${bracketSize / 2}决赛`;
    }
    if (rangeSize === 2) {
      if (rangeStart === 1) return '决赛';
      if (rangeStart === 3) return '3、4名决赛';
      return `${rangeStart}-${rangeEnd}名排位赛`;
    }
    if (rangeStart === 1) {
      if (rangeSize === 4) return '半决赛';
      return `1/${rangeSize / 2}决赛`;
    }
    return `${rangeStart}-${rangeEnd}名排位赛`;
  }

  function knockoutFullPlacementPlan(teamCount) {
    const totalTeams = Math.max(2, Number(teamCount || 8));
    const bracketSize = 2 ** Math.ceil(Math.log2(totalTeams));
    const roundCount = Math.log2(bracketSize);
    const matches = [];
    let serialCursor = 1;
    const openingSerials = Array.from({ length: bracketSize / 2 }, (_, index) => serialCursor + index);
    openingSerials.forEach((serial, index) => matches.push({
      serial, stageIndex: 0, openingIndex: index, sourceSerials: [], outcome: '',
      rangeStart: 1, rangeEnd: bracketSize,
      round: fullPlacementRoundLabel(1, bracketSize, 0, bracketSize)
    }));
    serialCursor += openingSerials.length;
    let lines = [{ serials: openingSerials, rangeStart: 1, rangeEnd: bracketSize }];
    for (let stageIndex = 1; stageIndex < roundCount; stageIndex += 1) {
      const nextLines = [];
      lines.forEach((line) => {
        const middle = Math.floor((line.rangeStart + line.rangeEnd) / 2);
        const winnerSerials = [];
        const loserSerials = [];
        for (let index = 0; index < line.serials.length; index += 2) {
          const sources = [line.serials[index], line.serials[index + 1]];
          const serial = serialCursor++;
          winnerSerials.push(serial);
          matches.push({
            serial, stageIndex, sourceSerials: sources, outcome: '胜者',
            rangeStart: line.rangeStart, rangeEnd: middle,
            round: fullPlacementRoundLabel(line.rangeStart, middle, stageIndex, bracketSize)
          });
        }
        for (let index = 0; index < line.serials.length; index += 2) {
          const sources = [line.serials[index], line.serials[index + 1]];
          const serial = serialCursor++;
          loserSerials.push(serial);
          matches.push({
            serial, stageIndex, sourceSerials: sources, outcome: '负者',
            rangeStart: middle + 1, rangeEnd: line.rangeEnd,
            round: fullPlacementRoundLabel(middle + 1, line.rangeEnd, stageIndex, bracketSize)
          });
        }
        nextLines.push(
          { serials: winnerSerials, rangeStart: line.rangeStart, rangeEnd: middle },
          { serials: loserSerials, rangeStart: middle + 1, rangeEnd: line.rangeEnd }
        );
      });
      lines = nextLines;
    }
    return { bracketSize, roundCount, matches };
  }

  function knockoutFullPlacementStages(teamCount) {
    const totalTeams = Math.max(2, Number(teamCount || 8));
    const bracketSize = 2 ** Math.ceil(Math.log2(totalTeams));
    const roundCount = Math.log2(bracketSize);
    return Array.from({ length: roundCount }, (_, stageIndex) => ({
      id: stageIndex === 0 ? `round-${bracketSize}` : stageIndex === roundCount - 1 ? 'rank-finals' : `placement-split-${stageIndex}`,
      name: stageIndex === 0 ? `${bracketSize}强赛` : stageIndex === roundCount - 1 ? '各名次决赛' : `排位分流第${stageIndex}轮`,
      type: stageIndex === 0 ? 'knockout' : 'placement',
      entrants: bracketSize,
      bracketSize,
      matchCount: bracketSize / 2,
      hasZones: stageIndex < roundCount - 1,
      note: stageIndex === 0 ? '首轮胜负双方分别进入对应名次区间。' : '按上一轮场序的胜者、负者继续拆分名次区间。'
    }));
  }

  function combinedKnockoutStageName(stage) {
    if (stage.id === 'final' || stage.type === 'final') return '决赛';
    if (stage.id === 'third-place' || stage.type === 'third-place') return '三、四名决赛';
    const bracketSize = Math.max(2, Number(stage.bracketSize || stage.entrants || 2));
    if (bracketSize === 4) return '半决赛';
    if (bracketSize === 8) return '1/4决赛';
    return `${bracketSize}强淘汰赛`;
  }

  function groupKnockoutStages(config) {
    const advanceTeams = Math.max(2, Number(config.groupCount || 1) * Number(config.advancePerGroup || 1));
    const knockoutStages = knockoutStagesForTeams(advanceTeams, config.thirdPlaceMatch).map((stage) => ({
      ...stage,
      name: combinedKnockoutStageName(stage),
      source: 'group-advance'
    }));
    return [{ id: 'group-stage', name: '小组单循环', type: 'group' }, ...knockoutStages];
  }

  function doubleEliminationStagesForTeams(teamCount) {
    const entrants = Math.max(2, Number(teamCount || 8));
    return [
      { id: 'upper-bracket', name: '胜者组', type: 'double-knockout', entrants, matchCount: entrants - 1, note: '首败球队进入败者组' },
      { id: 'lower-bracket', name: '败者组', type: 'double-knockout', entrants: Math.max(1, entrants - 1), matchCount: Math.max(0, entrants - 2), note: '再次失利即淘汰' },
      { id: 'grand-final', name: '总决赛', type: 'grand-final', entrants: 2, matchCount: 1, note: '胜者组冠军对阵败者组冠军' },
      { id: 'reset-final', name: '重置决赛（如需）', type: 'optional-final', entrants: 2, matchCount: 1, minMatchCount: 0, note: '败者组冠军首场取胜时加赛' }
    ];
  }

  function groupDoubleEliminationStages(config) {
    const advanceTeams = Math.max(2, Number(config.groupCount || 1) * Number(config.advancePerGroup || 1));
    return [{ id: 'group-stage', name: '小组单循环', type: 'group' }, ...doubleEliminationStagesForTeams(advanceTeams)];
  }

  function groupRoundRobinStages(config) {
    const advanceTeams = Math.max(1, Number(config.groupCount || 1) * Number(config.advancePerGroup || 1));
    return [
      { id: 'group-stage', name: '小组单循环', type: 'group' },
      { id: 'championship-round', name: '晋级组单循环', type: 'single-round', entrants: advanceTeams, source: 'group-advance' }
    ];
  }

  function groupFullPlacementStages(config) {
    const groupCount = Math.max(1, Number(config.groupCount || 1));
    const teamsPerGroup = Math.max(2, Number(config.teamsPerGroup || 2));
    const totalTeams = groupCount * teamsPerGroup;
    const matchesPerTeam = automaticPlacementMatchesPerTeam(groupCount);
    config.placementMatchesPerTeam = matchesPerTeam;
    if (groupCount === 2) {
      return [
        { id: 'group-stage', name: '小组单循环', type: 'group' },
        {
          id: 'placement-cross', name: '全员交叉排位赛', type: 'placement', entrants: totalTeams,
          matchCount: teamsPerGroup, matchesPerTeam: 1, source: 'group-ranking',
          note: 'A组与B组按相邻名次交叉对阵：A1-B2、B1-A2；A3-B4、B3-A4，依此类推。'
        },
        {
          id: 'placement-finals', name: '全员名次赛', type: 'placement-final', entrants: totalTeams,
          matchCount: teamsPerGroup, matchesPerTeam: 1, source: 'placement-cross',
          note: '每个排位区间的交叉赛胜者争较高名次，负者争其后名次，最终决出全部排名。'
        }
      ];
    }
    return [
      { id: 'group-stage', name: '小组单循环', type: 'group' },
      {
        id: 'placement-stage', name: '全员分层排位赛', type: 'placement', entrants: totalTeams,
        matchCount: Math.ceil(totalTeams * matchesPerTeam / 2), matchesPerTeam,
        source: 'group-ranking',
        note: `按各组相同名次进入对应排位层；${groupCount} 个小组自动单循环，每队进行 ${matchesPerTeam} 场排位赛，决出全部名次。`
      }
    ];
  }

  function applyFormatPreset(config, preset, totalTeams = 8) {
    const presets = {
      blank: { type: 'custom', stages: [] },
      'group-only': { type: 'group', stages: [{ id: 'group-stage', name: '小组单循环', type: 'group' }] },
      'group-full-placement': { type: 'combined', stages: groupFullPlacementStages(config) },
      'group-knockout': { type: 'combined', stages: groupKnockoutStages(config) },
      'group-double-knockout': { type: 'combined', stages: groupDoubleEliminationStages(config) },
      knockout: { type: 'knockout', stages: knockoutStagesForTeams(totalTeams) },
      'knockout-full-placement': { type: 'knockout', stages: knockoutFullPlacementStages(totalTeams) },
      'double-knockout': { type: 'double-knockout', stages: doubleEliminationStagesForTeams(totalTeams) },
      'group-round-robin': { type: 'combined', stages: groupRoundRobinStages(config) },
      'round-robin': { type: 'single-round', stages: [
        { id: 'round-robin', name: '全部球队单循环', type: 'single-round' }
      ] },
      'double-round': { type: 'double-round', stages: [
        { id: 'double-round', name: '全部球队双循环', type: 'double-round' }
      ] }
    };
    const selected = presets[preset] || presets.blank;
    config.formatType = selected.type;
    config.preset = preset;
    config.stages = selected.stages.map((stage) => ({ ...stage }));
    if (preset === 'knockout' || preset === 'knockout-full-placement') {
      config.knockoutSchemaVersion = 3;
      config.knockoutTeamCount = Math.max(2, Number(totalTeams || 8));
    }
    if (preset === 'group-knockout') {
      config.groupKnockoutSchemaVersion = 3;
      config.groupKnockoutAdvanceTeams = Math.max(2, Number(config.groupCount || 1) * Number(config.advancePerGroup || 1));
    }
    if (preset === 'group-double-knockout') {
      config.groupKnockoutAdvanceTeams = Math.max(2, Number(config.groupCount || 1) * Number(config.advancePerGroup || 1));
    }
    config.dirty = true;
    selectedFormatStageId = config.stages[0]?.id || '';
  }

  function stageMatchCount(stage, config, totalTeams) {
    if (Number.isFinite(Number(stage.matchCount))) return Number(stage.matchCount);
    if (stage.type === 'group') {
      const perGroup = Math.max(2, Number(config.teamsPerGroup || 2));
      return Math.max(1, Number(config.groupCount || 1)) * perGroup * (perGroup - 1) / 2;
    }
    const stageTeams = Math.max(1, Number(stage.entrants ?? totalTeams));
    if (stage.type === 'double-round') return stageTeams * (stageTeams - 1);
    if (stage.type === 'single-round') return stageTeams * (stageTeams - 1) / 2;
    if (stage.id === 'quarter-final') return 4;
    if (stage.id === 'semi-final') return 2;
    if (stage.id === 'final') return 1;
    return Math.max(1, totalTeams - 1);
  }

  function stageMatchCountRange(stage, config, totalTeams) {
    const maximum = stageMatchCount(stage, config, totalTeams);
    const minimum = Number.isFinite(Number(stage.minMatchCount)) ? Number(stage.minMatchCount) : maximum;
    return { minimum, maximum, label: minimum === maximum ? `${maximum}` : `${minimum}–${maximum}` };
  }

  function plannedScheduleSummary(eventSpace = activeEventSpace()) {
    const groups = Array.isArray(eventSpace?.groupRows) ? eventSpace.groupRows : [];
    const summary = groups.reduce((result, group) => {
      const config = competitionConfig(group);
      const totalTeams = Math.max(2, Number(group.target || config?.groupCount * config?.teamsPerGroup || 2));
      const range = (config?.stages || []).reduce((stageTotal, stage) => {
        const stageRange = stageMatchCountRange(stage, config, totalTeams);
        stageTotal.minimum += stageRange.minimum;
        stageTotal.maximum += stageRange.maximum;
        return stageTotal;
      }, { minimum: 0, maximum: 0 });
      result.minimum += range.minimum;
      result.maximum += range.maximum;
      result.targetTeams += Number(group.target || 0);
      return result;
    }, { minimum: 0, maximum: 0, targetTeams: 0 });
    const fallback = Math.max(0, Number(eventSpace?.matches || 0));
    const maximum = summary.maximum || fallback;
    const minimum = summary.maximum ? summary.minimum : fallback;
    return {
      ...summary,
      groupCount: groups.length,
      minimum,
      maximum,
      label: minimum === maximum ? `${maximum}` : `${minimum}–${maximum}`
    };
  }

  function roundRobinFixtures(teamNames) {
    const rotation = [...teamNames];
    if (rotation.length % 2) rotation.push('轮空');
    return Array.from({ length: Math.max(0, rotation.length - 1) }, () => {
      const pairs = Array.from({ length: rotation.length / 2 }, (_, index) => [rotation[index], rotation[rotation.length - 1 - index]])
        .filter(([home, away]) => home !== '轮空' && away !== '轮空');
      rotation.splice(1, 0, rotation.pop());
      return pairs;
    });
  }

  function adjacentOpeningRoundRobinOrder(teamNames) {
    const teams = [...teamNames];
    if (teams.length < 4 || teams.length % 2) return teams;
    const positions = teams.map((_, index) => index);
    const firstPairs = Array.from({ length: positions.length / 2 }, (_, index) => [positions[index], positions[positions.length - 1 - index]]);
    const rotated = [...positions];
    rotated.splice(1, 0, rotated.pop());
    const secondPairs = Array.from({ length: rotated.length / 2 }, (_, index) => [rotated[index], rotated[rotated.length - 1 - index]]);
    const mateMap = (pairs) => new Map(pairs.flatMap(([left, right]) => [[left, right], [right, left]]));
    const firstMate = mateMap(firstPairs);
    const secondMate = mateMap(secondPairs);
    const ordered = Array(teams.length);
    let position = 0;
    ordered[position] = teams[0];
    for (let teamIndex = 1; teamIndex < teams.length; teamIndex += 1) {
      position = (teamIndex % 2 ? firstMate : secondMate).get(position);
      ordered[position] = teams[teamIndex];
    }
    return ordered;
  }

  function knockoutFullPlacementReferences(config, totalTeams) {
    return new Map(knockoutFullPlacementPlan(totalTeams).matches
      .filter((match) => match.sourceSerials.length === 2)
      .map((match) => [match.serial, match.sourceSerials.map((serial) => `场序${serial}${match.outcome}`)]));
  }

  function scheduleBlueprint(eventSpace = activeEventSpace()) {
    const groups = Array.isArray(eventSpace?.groupRows) && eventSpace.groupRows.length ? eventSpace.groupRows : [{ name: '未分组', target: 2 }];
    const teams = officialTeams(eventSpace);
    const blueprint = [];
    groups.forEach((group) => {
      const groupBlueprintStart = blueprint.length;
      let slot = 0;
      let previousOutcomeStageSerials = [];
      const placementCrossSerials = new Map();
      const config = competitionConfig(group);
      const totalTeams = Math.max(2, Number(group.target || config?.groupCount * config?.teamsPerGroup || 2));
      const drawState = eventSpace?.drawStates?.[group.id] || {};
      const officialGroupTeams = teams.filter((team) => team.group === group.name).map((team) => team.name);
      const drawnSourceTeams = [
        ...(Array.isArray(drawState.order) ? drawState.order : []),
        ...(Array.isArray(drawState.seedOrder) ? drawState.seedOrder : []),
        ...Object.keys(drawState.assignments || {}).sort().flatMap((letter) => drawState.assignments[letter] || [])
      ].filter((name, index, values) => name && !/^待抽签球队\s*\d+$/.test(name) && values.indexOf(name) === index);
      const groupTeams = officialGroupTeams.length ? officialGroupTeams : drawnSourceTeams;
      let drawnTeams = [];
      if (['round-robin', 'double-round'].includes(config?.preset) && Array.isArray(drawState.order)) {
        drawnTeams = drawState.order.filter((name) => groupTeams.includes(name));
      } else if (['knockout', 'knockout-full-placement', 'double-knockout'].includes(config?.preset) && Array.isArray(drawState.seedOrder)) {
        drawnTeams = drawState.seedOrder.filter((name) => groupTeams.includes(name));
      } else if (drawState.assignments) {
        drawnTeams = Object.keys(drawState.assignments).sort().flatMap((letter) => drawState.assignments[letter] || []).filter((name) => groupTeams.includes(name));
      }
      const seedTeams = groupTeams.length
        ? [...drawnTeams, ...groupTeams.filter((name) => !drawnTeams.includes(name))]
        : [];
      // 没有正式球队或已保存的真实抽签队伍时，不制造虚拟球队污染赛程、筛选与赛果。
      if (!seedTeams.length) return;
      let semifinalSerials = [];
      let championshipSlot = null;
      let knockoutStageSeen = false;
      const knockoutBracketSize = seedTeams.length > 1 ? 2 ** Math.ceil(Math.log2(seedTeams.length)) : Math.max(1, seedTeams.length);
      const knockoutSeeds = Array.isArray(drawState.seedOrder)
        ? drawState.seedOrder
        : balancedKnockoutSeedOrder(seedTeams, knockoutBracketSize);
      if (config?.preset === 'knockout-full-placement') {
        const placementPlan = knockoutFullPlacementPlan(knockoutBracketSize);
        placementPlan.matches.forEach((plannedMatch) => {
          const openingPair = plannedMatch.openingIndex === undefined
            ? null
            : [knockoutSeeds[plannedMatch.openingIndex * 2], knockoutSeeds[plannedMatch.openingIndex * 2 + 1]];
          const home = openingPair
            ? openingPair[0] || '轮空'
            : `场序${plannedMatch.sourceSerials[0]}${plannedMatch.outcome}`;
          const away = openingPair
            ? openingPair[1] || '轮空'
            : `场序${plannedMatch.sourceSerials[1]}${plannedMatch.outcome}`;
          blueprint.push({
            competitionGroup: group.name,
            group: group.name || '未分组',
            subgroup: '',
            phase: plannedMatch.rangeStart <= 4 ? '淘汰赛' : '排位赛',
            round: plannedMatch.round,
            stage: plannedMatch.round,
            home,
            away,
            slot: plannedMatch.stageIndex,
            competitionSerial: plannedMatch.serial,
            placementRangeStart: plannedMatch.rangeStart,
            placementRangeEnd: plannedMatch.rangeEnd
          });
        });
        return;
      }
      (config?.stages || []).forEach((stage) => {
        const isGroupStage = stage.type === 'group' || stage.id === 'group-stage';
        if (isGroupStage) {
          const subgroupCount = Math.max(1, Number(config.groupCount || 1));
          const teamsPerGroup = Math.max(2, Number(config.teamsPerGroup || Math.ceil(seedTeams.length / subgroupCount)));
          const fixtures = Array.from({ length: subgroupCount }, (_, subgroupIndex) => {
            const names = seedTeams.slice(subgroupIndex * teamsPerGroup, (subgroupIndex + 1) * teamsPerGroup);
            while (names.length < teamsPerGroup) names.push(`待抽签球队 ${subgroupIndex * teamsPerGroup + names.length + 1}`);
            return roundRobinFixtures(names);
          });
          const rounds = Math.max(...fixtures.map((rows) => rows.length), 0);
          for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
            fixtures.forEach((subgroupFixtures, subgroupIndex) => {
              (subgroupFixtures[roundIndex] || []).forEach(([home, away]) => blueprint.push({
                competitionGroup: group.name, group: `${group.name} · ${String.fromCharCode(65 + subgroupIndex)}组`, subgroup: `${String.fromCharCode(65 + subgroupIndex)}组`, phase: '小组赛', round: `第 ${roundIndex + 1} 轮`, stage: stage.name || '小组单循环', home, away, slot
              }));
            });
            slot += 1;
          }
          return;
        }
        if (['round-robin', 'double-round'].includes(config.preset) && ['single-round', 'double-round'].includes(stage.type)) {
          const firstCycle = roundRobinFixtures(adjacentOpeningRoundRobinOrder(seedTeams));
          const cycles = stage.type === 'double-round'
            ? [firstCycle, firstCycle.map((roundPairs) => roundPairs.map(([home, away]) => [away, home]))]
            : [firstCycle];
          let roundNumber = 0;
          cycles.forEach((cycle, cycleIndex) => {
            cycle.forEach((roundPairs) => {
              roundNumber += 1;
              roundPairs.forEach(([home, away]) => blueprint.push({
                competitionGroup: group.name,
                group: group.name || '未分组',
                subgroup: '',
                phase: '循环赛',
                round: `第 ${roundNumber} 轮`,
                stage: stage.name || (stage.type === 'double-round' ? '全部球队双循环' : '全部球队单循环'),
                home,
                away,
                slot,
                cycle: cycleIndex + 1
              }));
              slot += 1;
            });
          });
          return;
        }
        if (config.preset === 'group-full-placement' && stage.id === 'placement-cross' && Number(config.groupCount || 1) === 2) {
          const teamsPerGroup = Math.max(2, Number(config.teamsPerGroup || 2));
          for (let groupRank = 1; groupRank <= teamsPerGroup; groupRank += 2) {
            const nextRank = groupRank + 1;
            const overallStart = (groupRank - 1) * 2 + 1;
            const overallEnd = Math.min(totalTeams, overallStart + 3);
            const pairs = nextRank <= teamsPerGroup
              ? [[`A组第${groupRank}`, `B组第${nextRank}`], [`B组第${groupRank}`, `A组第${nextRank}`]]
              : [[`A组第${groupRank}`, `B组第${groupRank}`]];
            const serials = [];
            pairs.forEach(([home, away]) => {
              const serial = blueprint.length - groupBlueprintStart + 1;
              serials.push(serial);
              blueprint.push({
                competitionGroup: group.name, group: group.name || '未分组', subgroup: '', phase: overallStart === 1 ? '淘汰赛' : '排位赛',
                round: overallStart === 1 ? '半决赛' : `${overallStart}–${overallEnd}名交叉赛`, stage: stage.name || '全员交叉排位赛',
                home, away, slot
              });
            });
            placementCrossSerials.set(overallStart, serials);
          }
          slot += 1;
          return;
        }
        if (config.preset === 'group-full-placement' && stage.id === 'placement-finals' && Number(config.groupCount || 1) === 2) {
          placementCrossSerials.forEach((serials, overallStart) => {
            if (serials.length < 2) return;
            blueprint.push({
              competitionGroup: group.name, group: group.name || '未分组', subgroup: '', phase: overallStart === 1 ? '淘汰赛' : '排位赛',
              round: overallStart === 1 ? '决赛' : `${overallStart}、${overallStart + 1}名决赛`, stage: stage.name || '全员名次赛',
              home: `场序${serials[0]}胜者`, away: `场序${serials[1]}胜者`, slot
            });
            blueprint.push({
              competitionGroup: group.name, group: group.name || '未分组', subgroup: '', phase: overallStart === 1 ? '淘汰赛' : '排位赛',
              round: overallStart === 1 ? '三、四名决赛' : `${overallStart + 2}、${overallStart + 3}名决赛`, stage: stage.name || '全员名次赛',
              home: `场序${serials[0]}负者`, away: `场序${serials[1]}负者`, slot
            });
          });
          slot += 1;
          return;
        }
        if ((stage.type === 'placement' || stage.id === 'placement-stage')
          && (stage.id === 'placement-stage' || stage.source === 'group-ranking')) {
          const subgroupCount = Math.max(1, Number(config.groupCount || 1));
          const teamsPerGroup = Math.max(2, Number(config.teamsPerGroup || 2));
          const matchesPerTeam = Math.max(1, Number(stage.matchesPerTeam || config.placementMatchesPerTeam || 1));
          const placementCount = stageMatchCount(stage, config, totalTeams);
          let generated = 0;
          for (let rank = 1; rank <= teamsPerGroup && generated < placementCount; rank += 1) {
            const layerTeams = Array.from({ length: subgroupCount }, (_, index) => `${String.fromCharCode(65 + index)}组第${rank}`);
            const pairs = subgroupCount === 2
              ? [[layerTeams[0], layerTeams[1]]]
              : roundRobinFixtures(layerTeams).flat();
            for (let repeat = 0; repeat < matchesPerTeam && generated < placementCount; repeat += 1) {
              (pairs.length ? pairs : [[`第${rank}名次层待定 1`, `第${rank}名次层待定 2`]]).forEach(([home, away], pairIndex) => {
                if (generated >= placementCount) return;
                blueprint.push({
                  competitionGroup: group.name, group: group.name || '未分组', subgroup: '', phase: '分层排位赛',
                  round: `第 ${rank} 名次层${matchesPerTeam > 1 ? ` · 第 ${repeat + 1} 场` : ''}`,
                  stage: stage.name || '全员分层排位赛', home, away, slot
                });
                generated += 1;
              });
              slot += 1;
            }
          }
          while (generated < placementCount) {
            blueprint.push({
              competitionGroup: group.name, group: group.name || '未分组', subgroup: '', phase: '分层排位赛',
              round: '补充排位赛', stage: stage.name || '全员分层排位赛',
              home: '排位赛待定 1', away: '排位赛待定 2', slot
            });
            generated += 1;
            slot += 1;
          }
          return;
        }
        const count = stageMatchCount(stage, config, totalTeams);
        const stageName = stage.name || '淘汰赛';
        const isSemifinal = /半决赛/.test(stageName);
        const isThirdPlace = /三.?四名/.test(stageName);
        const isFinal = /决赛/.test(stageName) && !isSemifinal && !isThirdPlace;
        if ((isThirdPlace || isFinal) && semifinalSerials.length && championshipSlot === null) championshipSlot = slot;
        const stageSlot = (isThirdPlace || isFinal) && championshipSlot !== null ? championshipSlot : slot;
        const stageStartSerial = blueprint.length - groupBlueprintStart + 1;
        const openingKnockoutPairs = !knockoutStageSeen && stage.type === 'knockout'
          ? Array.from({ length: knockoutSeeds.length / 2 }, (_, pairIndex) => [knockoutSeeds[pairIndex * 2], knockoutSeeds[pairIndex * 2 + 1]]).filter(([home, away]) => home && away)
          : [];
        for (let index = 0; index < count; index += 1) {
          let home = `${stageName}待定 ${index * 2 + 1}`;
          let away = `${stageName}待定 ${index * 2 + 2}`;
          let roundLabel = stageName;
          if (!knockoutStageSeen && stage.type === 'knockout' && ['knockout', 'knockout-full-placement', 'double-knockout'].includes(config.preset)) {
            home = openingKnockoutPairs[index]?.[0] || `${stageName}待定 ${index * 2 + 1}`;
            away = openingKnockoutPairs[index]?.[1] || `${stageName}待定 ${index * 2 + 2}`;
          }
          if (config.preset === 'knockout-full-placement') {
            if (totalTeams === 8) {
              if (stage.id === 'round-8') roundLabel = '1/4决赛';
              if (stage.id === 'rank-1-4-5-8') roundLabel = index < 2 ? '半决赛' : '5-8名排位赛';
              if (stage.id === 'rank-finals') roundLabel = ['决赛', '3、4名决赛', '5-6名排位赛', '7-8名排位赛'][index] || stageName;
            }
            if (stage.id === 'rank-1-4-5-8' || stage.id === 'rank-1-8-9-16') {
              const split = Math.ceil(count / 2);
              const sourcePair = index < split ? index : index - split;
              const outcome = index < split ? '胜者' : '负者';
              const sourceA = previousOutcomeStageSerials[sourcePair * 2];
              const sourceB = previousOutcomeStageSerials[sourcePair * 2 + 1];
              if (sourceA && sourceB) {
                home = `场序${sourceA}${outcome}`;
                away = `场序${sourceB}${outcome}`;
              }
            } else if (stage.id === 'rank-top-bottom-semis') {
              const split = Math.ceil(count / 2);
              const sourcePair = index < split ? index : index - split;
              const outcome = index < split ? '胜者' : '负者';
              const sourceA = previousOutcomeStageSerials[sourcePair * 2];
              const sourceB = previousOutcomeStageSerials[sourcePair * 2 + 1];
              if (sourceA && sourceB) {
                home = `场序${sourceA}${outcome}`;
                away = `场序${sourceB}${outcome}`;
              }
            } else if (stage.id === 'rank-finals') {
              const sourcePair = Math.floor(index / 2);
              const outcome = index % 2 === 0 ? '胜者' : '负者';
              const sourceA = previousOutcomeStageSerials[sourcePair * 2];
              const sourceB = previousOutcomeStageSerials[sourcePair * 2 + 1];
              if (sourceA && sourceB) {
                home = `场序${sourceA}${outcome}`;
                away = `场序${sourceB}${outcome}`;
              }
            }
          }
          if (isSemifinal && count === 2) {
            home = index === 0 ? 'A组第一' : 'B组第一';
            away = index === 0 ? 'B组第二' : 'A组第二';
          } else if (isThirdPlace && semifinalSerials.length >= 2) {
            home = `场序${semifinalSerials[0]}负者`;
            away = `场序${semifinalSerials[1]}负者`;
          } else if (isFinal && semifinalSerials.length >= 2) {
            home = `场序${semifinalSerials[0]}胜者`;
            away = `场序${semifinalSerials[1]}胜者`;
          }
          blueprint.push({
            competitionGroup: group.name, group: group.name || '未分组', subgroup: '', phase: '淘汰赛', round: roundLabel, stage: stageName,
            home, away, slot: stageSlot
          });
        }
        if (isSemifinal) semifinalSerials = Array.from({ length: count }, (_, index) => stageStartSerial + index);
        if (config.preset === 'knockout-full-placement' && ['knockout', 'placement'].includes(stage.type)) {
          previousOutcomeStageSerials = Array.from({ length: count }, (_, index) => stageStartSerial + index);
        }
        if (stage.type === 'knockout') knockoutStageSeen = true;
        slot += 1;
      });
      blueprint.slice(groupBlueprintStart).forEach((match, index) => { match.competitionSerial = index + 1; });
    });
    return blueprint;
  }

  function schedulePeriodForTime(time, availability = {}) {
    const minutes = timeToMinutes(time);
    const segment = scheduleTimeSegments(availability).find((item) => minutes >= timeToMinutes(item.start) && minutes < timeToMinutes(item.end));
    return segment?.id || (minutes < 13 * 60 ? 'morning' : minutes < 18 * 60 + 30 ? 'afternoon' : 'evening');
  }

  function teamPeriodConflict(rows, candidate, availability = {}, ignoredIds = []) {
    const [date, time] = String(candidate.time || '').split(' ');
    const period = schedulePeriodForTime(time, availability);
    const teams = [candidate.home, candidate.away].filter(Boolean);
    return rows.find((match) => {
      if (ignoredIds.includes(match.id)) return false;
      const [matchDate, matchTime] = String(match.time || '').split(' ');
      if (matchDate !== date || schedulePeriodForTime(matchTime, availability) !== period) return false;
      return teams.some((team) => team === match.home || team === match.away);
    }) || null;
  }

  function scheduleTeamPeriodIssues(rows, availability = {}) {
    const issues = [];
    rows.forEach((match, index) => {
      const conflict = teamPeriodConflict(rows.slice(0, index), match, availability);
      if (!conflict) return;
      const team = [match.home, match.away].find((name) => name === conflict.home || name === conflict.away) || '同一球队';
      const [date, time] = String(match.time || '').split(' ');
      const periodNames = { morning: '上午', afternoon: '下午', evening: '晚上' };
      issues.push({ match, conflict, team, date, period: periodNames[schedulePeriodForTime(time, availability)] || '同一时段' });
    });
    return issues;
  }

  function schedulePeriodValue(date, time, availability = {}) {
    const day = Math.floor(new Date(`${date}T00:00:00`).getTime() / 86400000);
    const period = schedulePeriodForTime(time, availability);
    const periodOrder = { morning: 0, afternoon: 1, evening: 2 }[period] ?? 3;
    return day * 10 + periodOrder;
  }

  function scheduleStageOrderIssues(rows, availability = {}) {
    const stagesByGroup = new Map();
    rows.forEach((match) => {
      const groupName = match.competitionGroup || String(match.group || '未分组').split('·')[0].trim();
      let slot = Number(match.slot);
      if (!Number.isFinite(slot)) {
        const roundNumber = Number(String(match.round || '').match(/第\s*(\d+)\s*轮/)?.[1] || 0);
        if (roundNumber) slot = roundNumber - 1;
        else if (/半决赛/.test(match.round || match.stage || '')) slot = 100;
        else if (/三.?四名|决赛/.test(match.round || match.stage || '')) slot = 101;
        else slot = 50;
      }
      const [date, time] = String(match.time || '').split(' ');
      if (!date || !time) return;
      const key = `${groupName}|${slot}`;
      const value = schedulePeriodValue(date, time, availability);
      const summary = stagesByGroup.get(key) || { groupName, slot, label: match.round || match.stage || '比赛阶段', minimum: value, maximum: value };
      summary.minimum = Math.min(summary.minimum, value);
      summary.maximum = Math.max(summary.maximum, value);
      stagesByGroup.set(key, summary);
    });
    const issues = [];
    [...new Set([...stagesByGroup.values()].map((item) => item.groupName))].forEach((groupName) => {
      const stages = [...stagesByGroup.values()].filter((item) => item.groupName === groupName).sort((left, right) => left.slot - right.slot);
      for (let index = 1; index < stages.length; index += 1) {
        if (stages[index].minimum <= stages[index - 1].maximum) issues.push({ groupName, previous: stages[index - 1], current: stages[index] });
      }
    });
    return issues;
  }

  function addScheduleDays(dateValue, count) {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + count);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function scheduleStageFeasibility(eventSpace = activeEventSpace(), plannedUnScheduled = 0) {
    const blueprint = scheduleBlueprint(eventSpace);
    const availability = eventVenueSettings(eventSpace)?.availability || {};
    const range = scheduleEditableDateRange(availability, eventSpace);
    const stagesByGroup = blueprint.reduce((result, match) => {
      const name = match.competitionGroup || String(match.group || '未分组').split('·')[0].trim();
      result[name] = Math.max(result[name] || 0, Number(match.slot || 0) + 1);
      return result;
    }, {});
    const requiredPeriods = Math.max(0, ...Object.values(stagesByGroup), plannedUnScheduled);
    const start = new Date(`${range.startDate}T00:00:00`);
    const end = new Date(`${range.endDate}T00:00:00`);
    const days = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? 1 : Math.max(1, Math.floor((end - start) / 86400000) + 1);
    const periodsPerDay = scheduleTimeSegments(availability).length;
    const availablePeriods = days * periodsPerDay;
    const requiredDaysWithoutEvening = Math.max(1, Math.ceil(requiredPeriods / 2));
    return {
      blocked: requiredPeriods > availablePeriods,
      requiredPeriods,
      availablePeriods,
      days,
      periodsPerDay,
      canResolveWithEvening: !availability.eveningEnabled && requiredPeriods <= days * 3,
      requiredDaysWithoutEvening,
      suggestedEndDate: addScheduleDays(range.startDate, requiredDaysWithoutEvening - 1),
      range
    };
  }

  function isKeyScheduleMatch(match) {
    const label = `${match?.round || ''} ${match?.stage || ''}`;
    return /半决赛|三.?四名|决赛/.test(label);
  }

  function scheduleFeasibilityAlert(eventSpace = activeEventSpace(), stageIssues = []) {
    const unresolvedCount = plannedScheduleResult(eventSpace).unscheduled.length;
    const feasibility = scheduleStageFeasibility(eventSpace, unresolvedCount);
    if (!feasibility.blocked && !stageIssues.length) return '';
    const issueText = stageIssues.length
      ? `当前赛程存在 ${stageIssues.length} 处阶段倒置：小组赛尚未结束就进入了半决赛或决赛，必须重新排赛。`
      : `当前赛制至少需要 ${feasibility.requiredPeriods} 个连续比赛时段；${feasibility.days} 天且未开启足够时段，仅提供 ${feasibility.availablePeriods} 个。`;
    return `<section class="schedule-feasibility-alert">${icon('triangle-alert')}<div><b>当前日期范围无法生成合理赛程</b><p>${issueText} 淘汰赛必须等待上一阶段全部结束。</p><small>${feasibility.canResolveWithEvening ? `若必须 ${feasibility.days} 天打完，请开启晚间场次；` : ''}若保持白天比赛，请增加至 ${feasibility.requiredDaysWithoutEvening} 天（截止 ${feasibility.suggestedEndDate}）。</small></div><div class="schedule-feasibility-actions">${feasibility.canResolveWithEvening ? btn('开启晚间场次', 'resolve-schedule-evening', 'outline', 'clock-3') : ''}${btn(`增加至 ${feasibility.requiredDaysWithoutEvening} 天`, 'resolve-schedule-extra-day', 'primary', 'calendar-days')}</div></section>`;
  }

  function plannedScheduleResult(eventSpace = activeEventSpace()) {
    const blueprint = scheduleBlueprint(eventSpace);
    const venueSettings = eventVenueSettings(eventSpace);
    const courtResources = scheduleCourtResources(venueSettings, eventSpace);
    const usableResources = courtResources.length ? courtResources : [{ name: '待配置球场', groupIds: [], matchMinutes: 40, bufferMinutes: 10 }];
    const courtNames = usableResources.map((resource) => resource.name);
    const availability = venueSettings?.availability || {};
    const range = scheduleEditableDateRange(availability, eventSpace);
    const start = new Date(`${range.startDate}T00:00:00`);
    const end = new Date(`${range.endDate}T00:00:00`);
    const cells = [];
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      usableResources.forEach((resource) => {
        const resourceTimes = derivedScheduleTimes({ ...availability, ...resource.availability, matchMinutes: resource.matchMinutes, bufferMinutes: resource.bufferMinutes });
        (resourceTimes.length ? resourceTimes : ['09:00']).forEach((time) => cells.push({
          date: dateValue, time, venue: resource.name, resource,
          period: schedulePeriodForTime(time, availability),
          periodValue: schedulePeriodValue(dateValue, time, availability)
        }));
      });
    }
    const rows = [];
    const usedCells = new Set();
    const unscheduled = [];
    const stageCompletion = new Map();
    blueprint.forEach((match, index) => {
      const groupName = match.competitionGroup || String(match.group || '未分组').split('·')[0].trim();
      const keyMatch = isKeyScheduleMatch(match);
      const primaryEligibleCourt = usableResources.find((resource) => courtAcceptsCompetitionGroup(resource, groupName, eventSpace))?.name || courtNames[0];
      const previousStageValue = Number(match.slot) > 0 ? stageCompletion.get(`${groupName}|${Number(match.slot) - 1}`) : undefined;
      const candidateCells = match.phase === '小组赛'
        ? [...cells].sort((left, right) => Number(left.period === 'evening') - Number(right.period === 'evening') || left.periodValue - right.periodValue || left.time.localeCompare(right.time))
        : cells;
      const cell = candidateCells.find((candidate) => {
        const cellKey = `${candidate.date}|${candidate.time}|${candidate.venue}`;
        if (usedCells.has(cellKey)) return false;
        if (!courtAcceptsCompetitionGroup(candidate.resource, groupName, eventSpace)) return false;
        if (keyMatch && candidate.venue !== primaryEligibleCourt) return false;
        if (Number.isFinite(previousStageValue) && candidate.periodValue <= previousStageValue) return false;
        const draft = { ...match, time: `${candidate.date} ${candidate.time}` };
        return !teamPeriodConflict(rows, draft, availability);
      });
      if (!cell) {
        unscheduled.push(match);
        return;
      }
      usedCells.add(`${cell.date}|${cell.time}|${cell.venue}`);
      const stageKey = `${groupName}|${Number(match.slot)}`;
      stageCompletion.set(stageKey, Math.max(stageCompletion.get(stageKey) ?? cell.periodValue, cell.periodValue));
      rows.push({
        id: `M${String(index + 1).padStart(3, '0')}`,
        time: `${cell.date} ${cell.time}`,
        group: match.group, phase: match.phase, round: match.round, stage: match.stage,
        home: match.home, away: match.away, venue: cell.venue, state: '待开始',
        competitionGroup: groupName, subgroup: match.subgroup || '', slot: Number(match.slot), keyMatch,
        competitionSerial: Number(match.competitionSerial || 0),
        matchMinutes: cell.resource.matchMinutes, bufferMinutes: cell.resource.bufferMinutes,
        intervalMinutes: cell.resource.matchMinutes + cell.resource.bufferMinutes, scheduleVersion: 7
      });
    });
    return { rows, unscheduled, feasibility: scheduleStageFeasibility(eventSpace, unscheduled.length) };
  }

  function plannedScheduleRows(eventSpace = activeEventSpace()) {
    return plannedScheduleResult(eventSpace).rows;
  }

  function generatedScheduleRows(eventSpace = activeEventSpace()) {
    if (!eventSpace) return [];
    if (Array.isArray(eventSpace.scheduleRows)) {
      const blueprint = plannedScheduleRows(eventSpace);
      const requiresUpgrade = eventSpace.scheduleRows.some((match) => !match.phase || !match.round || !match.scheduleVersion);
      if (requiresUpgrade) {
        eventSpace.scheduleRows = eventSpace.scheduleRows.map((match, index) => {
          const plan = blueprint[index];
          const hasResult = match.homeScore !== undefined || match.awayScore !== undefined || match.state === '已结束';
          if (!plan || (match.phase && match.round && match.scheduleVersion) || hasResult) return match;
          return {
            ...match,
            ...plan,
            id: match.id || plan.id,
            state: match.state || '待开始',
            scheduleVersion: 3
          };
        });
        persistEventSpaces();
      }
      const blueprintMismatch = blueprint.some((plan, index) => {
        const match = eventSpace.scheduleRows[index];
        if (!plan || !match) return true;
        return match.phase !== plan.phase
          || match.round !== plan.round
          || match.group !== plan.group
          || match.home !== plan.home
          || match.away !== plan.away
          || match.competitionGroup !== plan.competitionGroup
          || Number(match.competitionSerial || 0) !== Number(plan.competitionSerial || 0)
          || match.subgroup !== plan.subgroup
          || Number(match.slot) !== Number(plan.slot)
          || Boolean(match.keyMatch) !== Boolean(plan.keyMatch);
      });
      if (blueprintMismatch) {
        eventSpace.scheduleStale = true;
        persistEventSpaces();
      }
      return eventSpace.scheduleRows;
    }
    if (eventWorkflow(eventSpace).scheduleGenerated && Number(eventSpace.matches || 0) > 0) {
      // 兼容早期仅保存总场次的草案：首次打开时迁移为逐场比赛数据。
      eventSpace.scheduleRows = plannedScheduleRows(eventSpace);
      eventSpace.matches = eventSpace.scheduleRows.length;
      persistEventSpaces();
      return eventSpace.scheduleRows;
    }
    return [];
  }

  function filteredScheduleRows(eventSpace = activeEventSpace()) {
    return generatedScheduleRows(eventSpace).filter((match) => (
      (!matchSheetFilters.phase || match.phase === matchSheetFilters.phase)
      && (!matchSheetFilters.round || match.round === matchSheetFilters.round)
      && (!matchSheetFilters.group || (match.competitionGroup || baseCompetitionGroup(match.group)) === matchSheetFilters.group)
      && (!matchSheetFilters.subgroup || match.subgroup === matchSheetFilters.subgroup)
      && (!matchSheetFilters.team || match.home === matchSheetFilters.team || match.away === matchSheetFilters.team)
      && (!matchSheetFilters.venue || match.venue === matchSheetFilters.venue)
      && (!matchSheetFilters.state || match.state === matchSheetFilters.state)
    ));
  }

  function scheduleDayLabel(value) {
    const [year, month, day] = String(value || '').split('-');
    if (!year || !month || !day) return '待排日期';
    const date = new Date(`${year}-${month}-${day}T00:00:00`);
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return `${Number(month)}月${Number(day)}日 · ${weekday}`;
  }

  function formatConfigIssues(group, config) {
    if (!group || !config) return [];
    const totalTeams = Math.max(2, Number(group.target || 8));
    const groupCount = Math.max(1, Number(config.groupCount || 1));
    const teamsPerGroup = Math.max(2, Number(config.teamsPerGroup || 2));
    const advancePerGroup = Math.max(1, Number(config.advancePerGroup || 1));
    const issues = [];
    if (!config.stages?.length) {
      issues.push({ level: 'error', message: '尚未设置赛制阶段，保存前至少保留一个阶段。' });
      return issues;
    }
    if (config.formatType === 'knockout') {
      const matchTotal = config.stages.reduce((sum, stage) => sum + stageMatchCount(stage, config, totalTeams), 0);
      const expectedMatchTotal = totalTeams - 1 + (config.thirdPlaceMatch && totalTeams >= 4 ? 1 : 0);
      if (!config.stages.some((stage) => stage.id === 'final' || stage.type === 'final')) {
        issues.push({ level: 'error', message: '单败淘汰赛必须保留决赛阶段。' });
      }
      if (matchTotal !== expectedMatchTotal) {
        issues.push({ level: 'error', message: `${totalTeams} 支球队的单败淘汰赛应为 ${expectedMatchTotal} 场，当前流程为 ${matchTotal} 场。` });
      }
      return issues;
    }
    if (config.formatType !== 'combined' && config.formatType !== 'group') return issues;
    const capacity = groupCount * teamsPerGroup;
    const advanceTeams = groupCount * advancePerGroup;
    if (capacity < totalTeams) {
      issues.push({ level: 'error', message: `当前分组最多容纳 ${capacity} 支球队，少于目标 ${totalTeams} 支。` });
    } else if (capacity > totalTeams) {
      issues.push({ level: 'warn', message: `当前分组容量为 ${capacity} 支，将预留 ${capacity - totalTeams} 个空位。` });
    }
    if (advancePerGroup > teamsPerGroup) {
      issues.push({ level: 'error', message: '每组晋级数量不能大于每组球队数量。' });
    }
    if (config.preset === 'group-round-robin' && advanceTeams < 2) {
      issues.push({ level: 'error', message: '晋级组单循环至少需要 2 支球队，请增加分组数或每组晋级数量。' });
    }
    if (['group-knockout', 'group-double-knockout'].includes(config.preset) && advanceTeams > 1 && (advanceTeams & (advanceTeams - 1)) !== 0) {
      const bracketSize = 2 ** Math.ceil(Math.log2(advanceTeams));
      issues.push({ level: 'warn', message: `${advanceTeams} 支晋级球队将进入 ${bracketSize} 队签位，并产生 ${bracketSize - advanceTeams} 个轮空位。` });
    }
    if (config.preset === 'group-knockout') {
      const knockoutMatchTotal = config.stages
        .filter((stage) => ['knockout', 'third-place', 'final'].includes(stage.type))
        .reduce((sum, stage) => sum + stageMatchCount(stage, config, advanceTeams), 0);
      const expectedKnockoutMatches = advanceTeams - 1 + (config.thirdPlaceMatch && advanceTeams >= 4 ? 1 : 0);
      if (knockoutMatchTotal !== expectedKnockoutMatches) {
        issues.push({ level: 'error', message: `${advanceTeams} 支晋级球队的单败淘汰阶段应为 ${expectedKnockoutMatches} 场，当前为 ${knockoutMatchTotal} 场。` });
      }
    }
    return issues;
  }

  function knockoutMatchupPreview(stage) {
    if (stage.id === 'third-place') {
      return '<div class="preview-matchups final-matchup"><span>半决赛负者 1　vs　半决赛负者 2</span></div>';
    }
    if (stage.id === 'final') {
      return '<div class="preview-matchups final-matchup"><span>上半区冠军　vs　下半区冠军</span></div>';
    }
    if (stage.type !== 'knockout' || !stage.hasZones) return '';
    const matchCount = Math.max(1, Number(stage.matchCount || 1));
    const entrantCount = Math.max(2, Number(stage.entrants || stage.bracketSize || 2));
    const byeCount = Math.max(0, Number(stage.byeCount || 0));
    const upperCount = Math.ceil(matchCount / 2);
    const pairings = Array.from({ length: matchCount }, (_, index) => {
      const homeSeed = byeCount + index + 1;
      const awaySeed = Math.max(homeSeed + 1, entrantCount - index);
      return `<span>${homeSeed}号签位 vs ${awaySeed}号签位</span>`;
    });
    const zone = (name, items) => `<div><b>${name}</b><div>${items.join('')}</div></div>`;
    return `<div class="preview-knockout-zones">${zone('上半区', pairings.slice(0, upperCount))}${zone('下半区', pairings.slice(upperCount))}</div>${stage.byeCount ? `<small class="preview-bye-note">本轮设 ${stage.byeCount} 个轮空签位，轮空球队直接进入下一轮</small>` : ''}`;
  }

  function renderFormatPreview(group, config) {
    const totalTeams = Math.max(2, Number(group.target || 8));
    const groupCount = Math.max(1, Number(config.groupCount || 1));
    const teamsPerGroup = Math.max(2, Number(config.teamsPerGroup || Math.ceil(totalTeams / groupCount)));
    const advanceTeams = config.formatType === 'combined'
      ? groupCount * Number(config.advancePerGroup || 2)
      : config.formatType === 'knockout'
        ? Number(config.stages?.[0]?.qualifiers || Math.ceil(totalTeams / 2))
        : totalTeams;
    const stages = config.stages || [];
    const knockoutBracketSize = 2 ** Math.ceil(Math.log2(totalTeams));
    const knockoutRoundCount = Math.log2(knockoutBracketSize);
    const knockoutByeCount = knockoutBracketSize - totalTeams;
    const matchRange = stages.reduce((result, stage) => {
      const range = stageMatchCountRange(stage, config, totalTeams);
      result.minimum += range.minimum;
      result.maximum += range.maximum;
      return result;
    }, { minimum: 0, maximum: 0 });
    const totalMatchLabel = matchRange.minimum === matchRange.maximum ? `${matchRange.maximum}` : `${matchRange.minimum}–${matchRange.maximum}`;
    const groups = Array.from({ length: groupCount }, (_, index) => String.fromCharCode(65 + index));
    const issues = formatConfigIssues(group, config);
    const metrics = config.formatType === 'knockout'
      ? [[totalTeams, '球队总数'], [knockoutRoundCount, '淘汰轮次'], [knockoutByeCount, '首轮轮空'], [totalMatchLabel, '总场次']]
      : config.preset === 'group-only'
        ? [[totalTeams, '球队总数'], [groupCount, '分组数'], ['积分', '排名方式'], [totalMatchLabel, '总场次']]
      : config.preset === 'group-full-placement'
        ? [[totalTeams, '球队总数'], [groupCount, '分组数'], ['全员', '进入排位赛'], [totalMatchLabel, '总场次']]
      : isGroupedCompetition(group.competition)
        ? [[totalTeams, '球队总数'], [groupCount, '分组数'], [advanceTeams, '晋级数量'], [totalMatchLabel, '总场次']]
        : [[totalTeams, '球队总数'], [stages.length, '比赛阶段'], ['—', '分组数'], [totalMatchLabel, '总场次']];
    return `<section class="panel format-preview-panel">
      <h3>赛制结构预览 <small>（基于 ${totalTeams} 支球队）</small></h3>
      <div class="format-preview-metrics">${metrics.map(([value, label]) => `<div><b>${value}</b><span>${label}</span></div>`).join('')}</div>
      ${issues.length ? `<div class="format-validation-list">${issues.map((issue) => `<div class="${issue.level}">${icon(issue.level === 'error' ? 'triangle-alert' : 'info')}<span>${esc(issue.message)}</span></div>`).join('')}</div>` : ''}
      <div class="format-preview-flow">${stages.length ? stages.map((stage, stageIndex) => {
        const matches = stageMatchCount(stage, config, totalTeams);
        const matchLabel = stageMatchCountRange(stage, config, totalTeams).label;
        const groupCards = stage.type === 'group' ? `<div class="preview-groups">${groups.map((letter) => `<div><b>${letter}组</b><span>${teamsPerGroup} 队</span><i>${Array.from({ length: Math.min(teamsPerGroup, 8) }, () => icon('user-round')).join('')}</i></div>`).join('')}</div>` : '';
        const matchup = (config.formatType === 'knockout' || config.preset === 'group-knockout')
          ? knockoutMatchupPreview(stage)
          : (stage.id === 'final' ? '<div class="preview-matchups"><span>半决赛胜者 1　vs　半决赛胜者 2</span></div>' : '');
        const stageNote = stage.type === 'group'
          ? (config.preset === 'group-only'
            ? `${groupCount} 组 × ${teamsPerGroup} 队，组内单循环，按积分独立排名，无第二阶段`
            : config.preset === 'group-full-placement'
              ? `${groupCount} 组 × ${teamsPerGroup} 队，组内单循环；所有球队按相邻名次区间进入交叉排位赛`
              : `${groupCount} 组 × ${teamsPerGroup} 队，组内单循环，每组前 ${Number(config.advancePerGroup || 1)} 名晋级`)
             : String(stage.type).startsWith('placement')
               ? stage.note
             : stage.id === 'championship-round'
               ? `${advanceTeams} 支小组晋级球队进行单循环，按积分排定最终名次`
             : stage.id === 'third-place'
            ? stage.note
          : stage.id === 'final'
            ? '半决赛胜者争夺总冠军'
            : stage.type === 'double-knockout' || stage.type === 'grand-final' || stage.type === 'optional-final'
              ? stage.note
            : stage.type === 'knockout' && stage.hasZones
              ? `${stage.entrants} 支晋级球队，${matches} 场单败淘汰`
              : '胜者晋级下一阶段';
        return `<div class="format-preview-stage"><header>${icon(['third-place','final','grand-final','reset-final'].includes(stage.id) ? 'trophy' : stage.type === 'group' ? 'clipboard-list' : 'calendar-clock')}<div><b>阶段 ${stageIndex + 1} · ${esc(stage.name)}</b><small>${stageNote}</small></div><strong>${matchLabel} 场比赛</strong></header>${groupCards}${matchup}</div>${stageIndex < stages.length - 1 ? '<div class="format-preview-arrow">↓</div>' : ''}`;
      }).join('') : '<div class="module-empty compact"><b>尚未设置赛制流程</b><span>请在左侧选择赛制或添加阶段。</span></div>'}</div>
      <div class="format-save-note">${icon('info')} 本页只读预览。赛事结构由组别资料自动生成，共 ${totalMatchLabel} 场比赛；如需修改请返回组别资料。</div>
    </section>`;
  }

  function renderEventGroupList() {
    if (!eventGroupRows.length) {
      return `${heading('组别设置', '一个赛事可以创建多个竞赛组别，每个组别再单独设置赛制。', btn('新增组别', 'add-group', 'primary', 'plus'))}<div class="panel module-empty">${icon('clipboard-list')}<b>尚未创建竞赛组别</b><span>请先创建组别，再进入该组别设置比赛赛制。</span></div>`;
    }
    const rows = eventGroupRows.map((item, groupIndex) => {
      const config = competitionConfig(item);
      const structure = isGroupedCompetition(item.competition)
        ? (config.preset === 'group-only'
          ? `${Number(config.groupCount)}组 × ${Number(config.teamsPerGroup)}队 · 组内排名`
          : config.preset === 'group-full-placement'
            ? `${Number(config.groupCount)}组 × ${Number(config.teamsPerGroup)}队 · 全员分层排位`
          : `${Number(config.groupCount)}组 × ${Number(config.teamsPerGroup)}队 · 前${Number(config.advancePerGroup)}名`)
        : `${Number(item.target || 0)} 支参赛`;
      return `<div class="group-management-row"><strong>${esc(groupDisplayName(item))}</strong><span>${esc(normalizedGroupGender(item.gender))}</span><span>${esc(item.format || '5V5')}</span><span>${esc(item.birthCutoff || '未设置')}</span><span class="group-structure-cell"><b>${Number(item.target || 0)} 支</b><small>${structure}</small></span><span>${esc(item.competition)}</span>${status('已生成', 'ok')}<div><button type="button" class="btn small" data-action="edit-group" data-group="${esc(item.id)}">编辑组别</button><button type="button" class="btn small primary" data-action="open-format-settings" data-group="${esc(item.id)}">查看赛制</button><button type="button" class="btn small danger" data-action="request-delete-group" data-group-id="${esc(item.id)}">删除</button></div></div>`;
    }).join('');
    return `${heading('组别设置', '在组别资料中维护参赛规模、赛制、分组和晋级规则；实际报名数量统一在“报名与资格”查看。', btn('新增组别', 'add-group', 'primary', 'plus'))}<section class="panel group-management-list"><div class="group-management-head"><span>组别名称</span><span>性别限制</span><span>比赛形式</span><span>出生日期限制</span><span>参赛规模</span><span>竞赛赛制</span><span>结构状态</span><span>操作</span></div>${rows}</section><div class="info-banner">组别页只显示设定的参赛规模，不关联实时报名数量；点击“查看赛制”可查看各阶段比赛数和赛事总场次。</div>`;
  }

  function renderFormatStageRules(config, activeStage) {
    if (!activeStage) return '<div class="format-settings-empty">添加阶段后，可在此设置比赛规则。</div>';
    if (['double-knockout', 'grand-final', 'optional-final'].includes(activeStage.type)) {
      const range = stageMatchCountRange(activeStage, config, Number(activeStage.entrants || 2));
      return `<div class="knockout-stage-rules"><div class="knockout-rule-grid"><div><span>本阶段球队</span><b>${Number(activeStage.entrants || 2)} 支</b></div><div><span>本阶段场次</span><b>${range.label} 场</b></div><div><span>阶段规则</span><b>${activeStage.type === 'optional-final' ? '条件触发' : '双败制'}</b></div></div><div class="knockout-rule-copy"><b>${esc(activeStage.name)}</b><p>${esc(activeStage.note || '双败淘汰阶段。')}</p></div></div>`;
    }
    if (['knockout', 'third-place', 'final'].includes(activeStage.type)) {
      const isFinal = activeStage.type === 'final';
      const isThirdPlace = activeStage.type === 'third-place';
      return `<div class="knockout-stage-rules">
        <div class="knockout-rule-grid">
          <div><span>本轮球队</span><b>${Number(activeStage.entrants || 2)} 支</b></div>
          <div><span>本轮场次</span><b>${Number(activeStage.matchCount || 1)} 场</b></div>
          <div><span>晋级球队</span><b>${Number(activeStage.qualifiers || 1)} 支</b></div>
        </div>
        <div class="knockout-rule-copy">
          <b>${isFinal ? '决赛对阵规则' : isThirdPlace ? '三、四名决赛规则' : '单场淘汰规则'}</b>
          <p>${isFinal ? '上半区冠军对阵下半区冠军，单场决出赛事冠军。' : isThirdPlace ? esc(activeStage.note) : '签位划分为上半区和下半区；每轮单场决胜，负者淘汰，胜者在所属半区继续晋级。'}</p>
          ${activeStage.byeCount ? `<p>首轮设 ${activeStage.byeCount} 个轮空签位，轮空球队直接进入下一轮。</p>` : ''}
        </div>
      </div>`;
    }
    if (activeStage.type === 'placement') {
      const fullKnockoutPlacement = config.preset === 'knockout-full-placement';
      return `<div class="format-stage-form round-stage-rule-form"><div class="format-stage-rule-note"><b>${fullKnockoutPlacement ? '单败淘汰全员排位' : '全员分层排位'}</b><span>${esc(activeStage.note || '按各组同名次进入对应排位层，决出全部最终名次。')}</span></div><div class="knockout-rule-grid"><div><span>进入球队</span><b>${Number(activeStage.entrants || 0)} 支</b></div><div><span>本阶段场次</span><b>${Number(activeStage.matchCount || 1)} 场</b></div><div><span>最终结果</span><b>全员排名</b></div></div></div>`;
    }
    const points = `<div class="format-points readonly"><b>积分规则</b>${[['win','胜'],['draw','平'],['loss','负'],['forfeitWin','弃权胜'],['forfeitLoss','弃权负']].map(([key,label]) => `<span><small>${label}</small><strong>${Number(config.points[key])} 分</strong></span>`).join('')}</div>`;
    if (activeStage.type === 'group') {
      const groupStructure = config.preset === 'group-only'
        ? `<span><b>${Number(config.groupCount)} 组</b><small>分组数</small></span><span><b>${Number(config.teamsPerGroup)} 队</b><small>每组球队</small></span><span><b>积分排名</b><small>排名方式</small></span><span><b>无</b><small>第二阶段</small></span>`
        : config.preset === 'group-full-placement'
          ? `<span><b>${Number(config.groupCount)} 组</b><small>分组数</small></span><span><b>${Number(config.teamsPerGroup)} 队</b><small>每组球队</small></span><span><b>全员</b><small>进入排位赛</small></span><span><b>${Number(config.placementMatchesPerTeam || 1)} 场</b><small>每队排位赛</small></span>`
        : `<span><b>${Number(config.groupCount)} 组</b><small>分组数</small></span><span><b>${Number(config.teamsPerGroup)} 队</b><small>每组球队</small></span><span><b>前 ${Number(config.advancePerGroup)} 名</b><small>每组晋级</small></span><span><b>${Number(config.groupCount) * Number(config.advancePerGroup)} 队</b><small>晋级总数</small></span>`;
      return `<div class="format-stage-form group-stage-rule-form">
        <section class="format-group-source"><header><div><b>分组结构</b><small>来自组别资料，当前仅供查看</small></div></header><div>${groupStructure}</div></section>
        ${points}
      </div>`;
    }
    const roundTeams = Math.max(2, Number(activeStage.entrants || (activeStage.source === 'group-advance' ? Number(config.groupCount || 1) * Number(config.advancePerGroup || 1) : 2)));
    const roundDescription = activeStage.source === 'group-advance'
      ? `由各小组晋级的 ${roundTeams} 支球队参加，进行单循环并按积分排定最终名次。`
      : '参赛球队按当前组别计划人数自动带入，本阶段仅需设置积分规则。';
    return `<div class="format-stage-form round-stage-rule-form"><div class="format-stage-rule-note"><b>${activeStage.type === 'double-round' ? '双循环阶段' : '单循环阶段'}</b><span>${roundDescription}</span></div>${points}</div>`;
  }

  function renderEventFormat() {
    if (!eventGroupRows.length) {
      return `${heading('组别与赛制', '先创建竞赛组别，再为每个组别设置独立赛制。', btn('新增组别', 'add-group', 'primary', 'plus'))}<div class="panel module-empty">${icon('clipboard-list')}<b>尚未创建竞赛组别</b><span>创建组别后即可配置赛制流程。</span></div>`;
    }
    if (!eventGroupRows.some((group) => group.id === selectedFormatGroupId)) selectedFormatGroupId = eventGroupRows[0].id;
    const group = eventGroupRows.find((item) => item.id === selectedFormatGroupId) || eventGroupRows[0];
    selectedFormatGroupName = group.name;
    const config = competitionConfig(group);
    if (!config.stages.some((stage) => stage.id === selectedFormatStageId)) selectedFormatStageId = config.stages[0]?.id || '';
    const activeStage = config.stages.find((stage) => stage.id === selectedFormatStageId) || config.stages[0];
    const totalRange = config.stages.reduce((result, stage) => {
      const range = stageMatchCountRange(stage, config, Number(group.target || 8));
      result.minimum += range.minimum;
      result.maximum += range.maximum;
      return result;
    }, { minimum: 0, maximum: 0 });
    const totalMatches = totalRange.minimum === totalRange.maximum ? `${totalRange.maximum}` : `${totalRange.minimum}–${totalRange.maximum}`;
    return `<div class="format-page">
      <section class="format-group-toolbar"><button type="button" class="btn small" data-action="back-to-groups">← 返回组别列表</button><b>${esc(group.name)} · 赛制预览</b>${status('已按组别资料生成', 'ok')}<i></i><button type="button" class="text-action" data-action="edit-group" data-group="${esc(group.id)}">修改组别资料</button></section>
      ${scheduleFeasibilityAlert(activeEventSpace())}
      <div class="format-config-grid">
        <section class="panel format-config-panel format-readonly-panel"><h3>${esc(group.name)} · 赛事结构</h3>
          <section class="format-generated-summary"><div>${icon('trophy')}<span><small>竞赛赛制</small><b>${esc(group.competition)}</b></span></div><div><small>计划球队</small><b>${Number(group.target || 0)} 支</b></div><div><small>比赛阶段</small><b>${config.stages.length} 个</b></div><div><small>预计总场次</small><b>${totalMatches} 场</b></div></section>
          <label class="format-section-label">自动生成的比赛阶段</label>
          <div class="format-stage-flow readonly">${config.stages.length ? config.stages.map((stage, index) => { const range = stageMatchCountRange(stage, config, Number(group.target || 8)); return `<div class="format-stage-item"><button type="button" class="format-stage-card${stage.id === activeStage?.id ? ' active' : ''}" data-action="select-format-stage" data-stage-id="${stage.id}"><em>${index + 1}</em><span><b>${esc(stage.name)}</b><small>${range.label} 场比赛</small></span></button></div>${index < config.stages.length - 1 ? '<i>→</i>' : ''}`; }).join('') : '<div class="format-stage-empty">当前组别尚未生成比赛阶段，请返回组别资料检查竞赛赛制。</div>'}</div>
          <label class="format-section-label">阶段规则预览</label>
          ${activeStage ? `<div class="format-stage-settings"><nav>${config.stages.map((stage, index) => `<button type="button" class="${stage.id === activeStage?.id ? 'active' : ''}" data-action="select-format-stage" data-stage-id="${stage.id}">阶段 ${index + 1}　${esc(stage.name)}</button>`).join('')}</nav>${renderFormatStageRules(config, activeStage)}</div>` : '<div class="format-settings-empty">添加阶段后，可在此设置比赛规则。</div>'}
          <div class="format-readonly-note">${icon('info')} 本页不提供修改。竞赛赛制、分组结构和晋级规则统一在“组别资料”维护。</div>
        </section>
        ${renderFormatPreview(group, config)}
      </div>
    </div>`;
  }

  function renderEventRegistration() {
    const eventSpace = activeEventSpace();
    const settings = registrationSettings(eventSpace);
    const reviewItems = [
      ['球队名称与队徽', '用于公开报名页、赛程、积分榜和对阵展示；避免同名球队或错误队徽进入正式赛事。'],
      ['领队与联系方式', '用于赛事通知、赛程变更和紧急联络，仅主办方后台可查看，不在公开页面展示。'],
      ['球员姓名与号码', '用于生成正式名单、现场阵容和技术统计；比赛开始后按名单变更流程处理。'],
      ['家长补全证件照', '用于服务号实名绑定与资格核验；原始证件资料仅限授权审核人员查看。'],
      ['年龄组资格证明', '用于判断球员是否符合当前组别出生日期范围，防止跨龄或冒名参赛。'],
      ['参赛承诺书', '用于确认监护人知情、健康与赛事规则责任，是争议处理和赛前确认依据。']
    ];
    return `${heading('报名设置', '设置球队入驻、收费与海报公开信息；首次保存后自动生成报名海报。', eventSpace.posterIds?.length ? btn('查看报名海报', 'go-event-posters', 'outline', 'image') : '')}
      <div class="split-layout equal">
        ${panel('报名开放与宣传设置', `<form class="form-grid" data-registration-form>
          <div class="field"><label>报名开始</label><input type="datetime-local" name="startAt" value="${esc(settings.startAt)}"></div>
          <div class="field"><label>报名截止</label><input type="datetime-local" name="endAt" value="${esc(settings.endAt)}"></div>
          <div class="field"><label>每队最少人数</label><input type="number" min="1" name="minRoster" value="${esc(settings.minRoster)}"></div>
          <div class="field"><label>每队最多人数</label><input type="number" min="1" name="maxRoster" value="${esc(settings.maxRoster)}"></div>
          <div class="field"><label>收费方式</label><select name="feeMode">${['按人收费','按队收费','免费'].map(value => `<option${settings.feeMode === value ? ' selected' : ''}>${value}</option>`).join('')}</select></div>
          <div class="field"><label>报名费用</label><input name="feeAmount" value="${esc(settings.feeAmount)}" placeholder="例如 268"></div>
          <div class="field"><label>费用单位</label><select name="feeUnit">${['元/人','元/队'].map(value => `<option${settings.feeUnit === value ? ' selected' : ''}>${value}</option>`).join('')}</select></div>
          <div class="field"><label>报名联系人</label><input name="contactName" value="${esc(settings.contactName)}"></div>
          <div class="field"><label>联系电话</label><input name="contactPhone" value="${esc(settings.contactPhone)}"></div>
          <div class="field full"><label>宣传副标题</label><input name="subtitle" value="${esc(settings.subtitle)}"></div>
          <div class="field full"><label>奖项说明</label><textarea name="prize">${esc(settings.prize)}</textarea></div>
          <div class="field full"><label>报名权益</label><textarea name="benefits">${esc(settings.benefits)}</textarea></div>
          <div class="field full"><label>公开比赛地点</label><input name="publicLocation" value="${esc(settings.publicLocation)}" placeholder="将展示在报名页和海报中"></div>
        </form><div class="info-banner">创建球队后，领队在小程序内维护球员；家长通过统一服务号补全照片和身份资料。</div>`)}
        ${panel('资料与审核', `<p class="review-setting-note">${icon('info')} 开启后，该资料将成为报名必填或主办方审核项；关闭后不阻断报名。</p>
          <div class="review-requirements">${reviewItems.map(([item, note]) => `<div class="review-requirement"><div><strong>${item}</strong><small>${note}</small></div><button class="switch on" data-action="toggle" type="button" aria-label="${item}审核开关"></button></div>`).join('')}</div>
          <div class="review-actions">${btn('生成报名海报', 'generate-poster', 'outline', 'image')}${btn('生成入驻二维码', 'show-qr', 'primary', 'qr-code')}</div>
        `)}
      </div>`;
  }

  function renderEventPosters() {
    return `${heading('报名海报', '模板、赛事信息、报名码均为独立图层，可保存多张草稿并导出高清 PNG。')}
      <div id="posterStudioRoot"><section class="panel poster-empty"><p>正在加载海报编辑器…</p></section></div>`;
  }

  function defaultVenueCourts(count, prefix = '主场馆') {
    return Array.from({ length: count }, (_, index) => ({
      id: `court-${index + 1}`,
      name: `球场 ${index + 1}`,
      location: index ? `${prefix}${index}号场` : prefix,
      type: index === 0 || index === 3 ? '标准全场' : '半场',
      enabled: true,
      matchMinutes: index < 2 ? 40 : 50,
      bufferMinutes: 10,
      scheduleProfileVersion: 1
    }));
  }

  function groupAgeValue(group = {}) {
    return Number(String(group.baseGroup || group.name || '').match(/U(\d+)/i)?.[1] || 0);
  }

  function defaultCourtScheduleProfile(court, courtIndex, settings, eventSpace = activeEventSpace()) {
    const groups = eventSpace?.groupRows || [];
    const allGroupIds = groups.map((group) => group.id).filter(Boolean);
    const courtNumber = Number(String(court?.name || '').match(/\d+/)?.[0] || courtIndex + 1);
    const younger = groups.filter((group) => {
      const age = groupAgeValue(group);
      return age > 0 && age <= 10;
    }).map((group) => group.id);
    const older = groups.filter((group) => groupAgeValue(group) >= 11).map((group) => group.id);
    const preferred = courtNumber <= 2 ? younger : older;
    const global = settings?.availability || {};
    return {
      groupIds: preferred.length ? preferred : [...allGroupIds],
      matchMinutes: courtNumber <= 2 ? 40 : 50,
      bufferMinutes: 10,
      morningStartTime: global.morningStartTime || global.startTime || '09:00',
      morningEndTime: global.morningEndTime || '12:00',
      afternoonStartTime: global.afternoonStartTime || '14:00',
      afternoonEndTime: global.afternoonEndTime || global.endTime || '18:00',
      eveningEnabled: false,
      eveningStartTime: global.eveningStartTime || '19:00',
      eveningEndTime: global.eveningEndTime || '21:30',
      scheduleProfileVersion: 2
    };
  }

  function normalizeCourtScheduleProfiles(settings, eventSpace = activeEventSpace()) {
    const groups = eventSpace?.groupRows || [];
    (settings?.venues || []).forEach((venue) => (venue.courts || []).forEach((court, index) => {
      const defaults = defaultCourtScheduleProfile(court, index, settings, eventSpace);
      if (!Array.isArray(court.groupIds)) court.groupIds = defaults.groupIds;
      ['matchMinutes','bufferMinutes','morningStartTime','morningEndTime','afternoonStartTime','afternoonEndTime','eveningEnabled','eveningStartTime','eveningEndTime'].forEach((key) => {
        if (court[key] === undefined || court[key] === null || court[key] === '') court[key] = defaults[key];
      });
      court.scheduleProfileVersion = 2;
    }));
  }

  function eventVenueSettings(eventSpace = activeEventSpace()) {
    if (!eventSpace) return null;
    const defaults = {
      scope: 'all',
      groupName: eventSpace.firstGroup || eventSpace.groupRows?.[0]?.name || 'U12男子组',
      selectedVenueId: 'pudong-sports-center',
      venues: [
        { id: 'pudong-sports-center', name: '浦东体育中心', address: '上海市浦东新区泳耀路300号', enabled: true, imagePosition: '74% 63%', courts: defaultVenueCourts(4, '主场馆') },
        { id: 'fengdong-gym', name: '蜂动篮球馆', address: '上海市闵行区联航路1188号', enabled: true, imagePosition: '84% 82%', courts: defaultVenueCourts(3, '副馆') },
        { id: 'youth-center', name: '青少年活动中心', address: '上海市杨浦区控江路1665号', enabled: true, imagePosition: '60% 72%', courts: defaultVenueCourts(1, '活动中心') }
      ],
      availability: {
        startDate: eventSpace.startDate || '2026-07-18',
        endDate: eventSpace.endDate || '2026-08-26',
        startTime: '09:00',
        morningStartTime: '09:00',
        morningEndTime: '12:00',
        afternoonStartTime: '14:00',
        afternoonEndTime: '18:00',
        eveningEnabled: false,
        eveningStartTime: '19:00',
        eveningEndTime: '21:30',
        // 由上午、下午、晚上时段推算；用户逐条调整后保存在此处。
        scheduleTimeSlots: [],
        endTime: '18:00',
        matchMinutes: 90,
        bufferMinutes: 15
      },
      updatedAt: ''
    };
    const existing = eventSpace.venueSettings || {};
    eventSpace.venueSettings = Object.assign(defaults, existing);
    eventSpace.venueSettings.scope = 'all';
    eventSpace.venueSettings.availability = Object.assign(defaults.availability, existing.availability || {});
    if (eventSpace.venueSettings.availability.morningEndTime === '12:30') {
      eventSpace.venueSettings.availability.morningEndTime = '12:00';
    }
    // 旧版本支持按日期配置例外时段；现统一改为每日开赛时间，不再读取该设置。
    delete eventSpace.venueSettings.availability.exceptions;
    delete eventSpace.venueSettings.availability.customSegments;
    eventSpace.venueSettings.venues = Array.isArray(existing.venues) && existing.venues.length
      ? existing.venues
      : defaults.venues;
    if (!eventSpace.venueSettings.venues.some((venue) => venue.id === eventSpace.venueSettings.selectedVenueId)) {
      eventSpace.venueSettings.selectedVenueId = eventSpace.venueSettings.venues[0]?.id || '';
    }
    selectedVenueId = selectedVenueId && eventSpace.venueSettings.venues.some((venue) => venue.id === selectedVenueId)
      ? selectedVenueId
      : eventSpace.venueSettings.selectedVenueId;
    normalizeCourtScheduleProfiles(eventSpace.venueSettings, eventSpace);
    return eventSpace.venueSettings;
  }

  function scheduleCourtNames(settings = eventVenueSettings()) {
    return (settings?.venues || []).filter((venue) => venue.enabled !== false).flatMap((venue) => (venue.courts || [])
      .filter((court) => court.enabled !== false)
      .flatMap((court) => court.type === '半场'
        ? [`${venue.name} · ${court.name} A半场`, `${venue.name} · ${court.name} B半场`]
        : [`${venue.name} · ${court.name}`]));
  }

  function scheduleCourtResources(settings = eventVenueSettings(), eventSpace = activeEventSpace()) {
    const resources = [];
    (settings?.venues || []).filter((venue) => venue.enabled !== false).forEach((venue) => {
      (venue.courts || []).filter((court) => court.enabled !== false).forEach((court) => {
        const names = court.type === '半场'
          ? [`${venue.name} · ${court.name} A半场`, `${venue.name} · ${court.name} B半场`]
          : [`${venue.name} · ${court.name}`];
        names.forEach((name) => resources.push({
          name,
          venueId: venue.id,
          courtId: court.id,
          groupIds: Array.isArray(court.groupIds) ? [...court.groupIds] : [],
          matchMinutes: Math.max(1, Number(court.matchMinutes || settings?.availability?.matchMinutes || 40)),
          bufferMinutes: Math.max(0, Number(court.bufferMinutes ?? settings?.availability?.bufferMinutes ?? 10)),
          availability: {
            morningStartTime: court.morningStartTime,
            morningEndTime: court.morningEndTime,
            afternoonStartTime: court.afternoonStartTime,
            afternoonEndTime: court.afternoonEndTime,
            eveningEnabled: Boolean(court.eveningEnabled),
            eveningStartTime: court.eveningStartTime,
            eveningEndTime: court.eveningEndTime
          }
        }));
      });
    });
    return resources;
  }

  function courtAcceptsCompetitionGroup(resource, groupName, eventSpace = activeEventSpace()) {
    if (!resource?.groupIds?.length) return true;
    const group = (eventSpace?.groupRows || []).find((item) => item.name === groupName);
    return Boolean(group && resource.groupIds.includes(group.id));
  }

  function timeToMinutes(value) {
    const [hours, minutes] = String(value || '').split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
  }

  function minutesToTime(value) {
    const minutes = Math.max(0, Number(value) || 0);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  function currentChinaDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function scheduleEditableDateRange(availability = {}, eventSpace = activeEventSpace()) {
    const today = currentChinaDate();
    const startDate = String(availability.startDate || '') >= today ? String(availability.startDate) : today;
    const chosenEnd = String(availability.endDate || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(chosenEnd) && chosenEnd >= startDate) return { startDate, endDate: chosenEnd };
    const eventEnd = String(eventSpace?.endDate || '');
    return { startDate, endDate: /^\d{4}-\d{2}-\d{2}$/.test(eventEnd) && eventEnd >= startDate ? eventEnd : startDate };
  }

  function scheduleTimeSegments(availability = {}) {
    const morningStart = availability.morningStartTime || availability.startTime || '09:00';
    const morningEnd = availability.morningEndTime || '12:00';
    const afternoonStart = availability.afternoonStartTime || '14:00';
    const afternoonEnd = availability.afternoonEndTime || availability.endTime || '18:00';
    const segments = [
      { id: 'morning', label: '上午', start: morningStart, end: morningEnd },
      { id: 'afternoon', label: '下午', start: afternoonStart, end: afternoonEnd }
    ];
    if (availability.eveningEnabled) segments.push({ id: 'evening', label: '晚上', start: availability.eveningStartTime || '19:00', end: availability.eveningEndTime || '21:30' });
    return segments.filter((segment) => segment.start && segment.end && timeToMinutes(segment.start) < timeToMinutes(segment.end));
  }

  function derivedScheduleTimes(availability = {}) {
    const matchMinutes = Math.max(1, Number(availability.matchMinutes) || 90);
    const bufferMinutes = Math.max(0, Number(availability.bufferMinutes) || 15);
    const slots = [];
    const appendSegment = (start, end) => {
      let cursor = timeToMinutes(start);
      const closing = timeToMinutes(end);
      while (cursor + matchMinutes <= closing) {
        slots.push(minutesToTime(cursor));
        cursor += matchMinutes + bufferMinutes;
      }
    };
    scheduleTimeSegments(availability).forEach((segment) => appendSegment(segment.start, segment.end));
    return [...new Set(slots)].sort();
  }

  function automaticScheduleTimes(availability = {}) {
    const adjusted = Array.isArray(availability.scheduleTimeSlots)
      ? availability.scheduleTimeSlots.filter((time) => /^\d{2}:\d{2}$/.test(String(time)))
      : [];
    return adjusted.length ? [...new Set(adjusted)].sort() : derivedScheduleTimes(availability);
  }

  function matchTimeWindowIssue(time, availability = {}) {
    const start = timeToMinutes(time);
    const matchMinutes = Math.max(1, Number(availability.matchMinutes) || 90);
    const segment = scheduleTimeSegments(availability).find((item) => start >= timeToMinutes(item.start) && start < timeToMinutes(item.end));
    if (!segment) return { type: 'outside', finish: minutesToTime(start + matchMinutes), segment: null };
    const finish = start + matchMinutes;
    if (finish > timeToMinutes(segment.end)) return { type: 'crosses-end', finish: minutesToTime(finish), segment };
    return null;
  }

  function nextSafeScheduleTime(time, availability = {}) {
    return automaticScheduleTimes(availability).find((slot) => timeToMinutes(slot) > timeToMinutes(time)) || '';
  }

  function venueMatchDayCount(availability) {
    const start = new Date(`${availability.startDate}T00:00:00`);
    const end = new Date(`${availability.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end - start) / 86400000) + 1;
  }

  function venueResourceSummary(settings) {
    const enabledVenues = settings.venues.filter((venue) => venue.enabled);
    const enabledCourts = scheduleCourtResources(settings);
    const matchDays = venueMatchDayCount(settings.availability);
    const dailySlots = enabledCourts.reduce((total, resource) => total + derivedScheduleTimes({ ...settings.availability, ...resource.availability, matchMinutes: resource.matchMinutes, bufferMinutes: resource.bufferMinutes }).length, 0);
    return {
      venues: enabledVenues.length,
      courts: enabledCourts.length,
      days: matchDays,
      dailySlots,
      capacity: matchDays * dailySlots
    };
  }

  function weekdayLabel(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    return `${dateValue}（${['周日','周一','周二','周三','周四','周五','周六'][date.getDay()]}）`;
  }

  function renderCourtDiagram(courtType = '标准全场') {
    const isHalfCourt = courtType === '半场';
    if (isHalfCourt) {
      return `<span class="venue-court-diagram half" aria-label="半场示意图"><svg viewBox="0 0 76 50" aria-hidden="true"><rect class="court-line" x="0.75" y="0.75" width="74.5" height="48.5" rx="1"/><path class="court-line" d="M0.75 4.5H8C29 4.5 42 12.7 42 25S29 45.5 8 45.5H0.75"/><rect class="court-line" x="0.75" y="15" width="25" height="20"/><circle class="court-line" cx="25.75" cy="25" r="7"/><line class="court-line" x1="75.25" y1="0.75" x2="75.25" y2="49.25"/><path class="court-line" d="M75.25 16A9 9 0 0 0 75.25 34"/><line class="court-accent" x1="5.5" y1="20" x2="5.5" y2="30"/><circle class="court-accent" cx="9.5" cy="25" r="2.4"/></svg></span>`;
    }
    return '<span class="venue-court-diagram" aria-label="标准全场示意图"><i></i><b></b><em></em></span>';
  }

  function renderScheduleSettings() {
    const eventSpace = activeEventSpace();
    const settings = eventVenueSettings(eventSpace);
    const selectedVenue = settings.venues.find((venue) => venue.id === selectedVenueId) || settings.venues[0];
    const availability = settings.availability;
    const editableDates = scheduleEditableDateRange(availability, eventSpace);
    // 日期输入框会跳过已经过期的日期；摘要必须与输入框使用同一份规范化日期。
    availability.startDate = editableDates.startDate;
    availability.endDate = editableDates.endDate;
    const summary = venueResourceSummary(settings);
    const courtResources = scheduleCourtResources(settings, eventSpace);
    const automaticTimes = [...new Set(courtResources.flatMap((resource) => derivedScheduleTimes({ ...availability, ...resource.availability, matchMinutes: resource.matchMinutes, bufferMinutes: resource.bufferMinutes })))].sort();
    const selectedVenueCourtSummaries = (selectedVenue.courts || []).filter((court) => court.enabled !== false).map((court) => {
      const times = derivedScheduleTimes({ ...availability, ...court, matchMinutes: court.matchMinutes, bufferMinutes: court.bufferMinutes });
      return `<article><header><b>${esc(court.name)}</b><span>每 ${Number(court.matchMinutes) + Number(court.bufferMinutes)} 分钟</span></header><div>${times.map((time) => `<em>${esc(time)}</em>`).join('') || '<small>当前时段无法排入完整比赛</small>'}</div></article>`;
    }).join('');
    return `${heading('赛程设置', '统一设置赛事日期；各球场分别配置适用组别、比赛时段和场次节奏。', `${btn('新增场馆', 'add-venue', 'outline', 'plus')}${btn('编辑当前场馆', 'edit-venue', 'outline', 'pencil')}${btn('返回赛程日历', 'go-calendar', 'outline', 'calendar-days')}`)}<div class="venue-settings-page">
      <section class="venue-scope-toolbar">
        <b>适用范围</b><span class="status-dot ok">全部组别</span><small>同一赛事内的所有组别共用本套场地与可用时间，自动排赛时按每场比赛所属组别分别安排。</small>
      </section>
      <div class="venue-workspace-grid">
        <section class="panel venue-list-panel">
          <h3>可用场馆 <small>（本赛事已绑定）</small></h3>
          <div class="venue-list">${settings.venues.map((venue, index) => `<article class="venue-list-card${venue.id === selectedVenue.id ? ' active' : ''}" data-action="select-event-venue" data-venue-id="${esc(venue.id)}">
            <div class="venue-photo venue-photo-${index + 1}" style="--venue-photo-position:${esc(venue.imagePosition || '70% 70%')}"></div>
            <div class="venue-list-copy"><b>${esc(venue.name)}</b><span>${esc(venue.address)}</span><small>已配置球场<strong>${venue.courts?.length || 0} 片</strong></small></div>
            <div class="venue-card-actions"><button type="button" class="venue-delete" data-action="request-delete-event-venue" data-venue-id="${esc(venue.id)}" aria-label="删除${esc(venue.name)}">${icon('circle-x')}<span>删除</span></button><label class="venue-enable"><span>启用状态</span><button type="button" class="switch${venue.enabled ? ' on' : ''}" data-action="toggle-event-venue" data-venue-id="${esc(venue.id)}" aria-pressed="${venue.enabled}"></button></label></div>
          </article>`).join('')}</div>
        </section>
        <section class="panel venue-court-panel">
          <header class="venue-court-panel-heading"><h3>球场配置 <small>（${esc(selectedVenue.name)}）</small></h3><button type="button" class="btn small outline" data-action="reset-all-court-schedules">${icon('refresh-cw')} 重置全部球场</button></header>
          <div class="venue-court-list">${(selectedVenue.courts || []).map((court) => {
            const intervalMinutes = Number(court.matchMinutes || 40) + Number(court.bufferMinutes || 10);
            const groupChecks = eventGroupRows.map((group) => `<label><input type="checkbox" data-venue-court-group data-court-id="${esc(court.id)}" value="${esc(group.id)}"${court.groupIds?.includes(group.id) ? ' checked' : ''}><span>${esc(groupDisplayName(group))}</span></label>`).join('');
            return `<article class="venue-court-row" data-court-id="${esc(court.id)}">
            ${renderCourtDiagram(court.type)}
            <div class="venue-court-name"><b>${esc(court.name)}</b><small>${court.type === '半场' ? '排赛时自动拆分为 A 半场、B 半场' : esc(court.location)}</small></div>
            <label class="venue-court-type"><span>场地类型</span><select data-venue-court-type data-court-id="${esc(court.id)}"><option${court.type === '标准全场' ? ' selected' : ''}>标准全场</option><option${court.type === '半场' ? ' selected' : ''}>半场</option></select></label>
            <label class="venue-court-enable"><span>启用状态</span><button type="button" class="switch${court.enabled ? ' on' : ''}" data-action="toggle-event-court" data-court-id="${esc(court.id)}" aria-pressed="${court.enabled}"></button></label>
            <button type="button" class="venue-court-delete" data-action="request-delete-event-court" data-court-id="${esc(court.id)}" aria-label="删除${esc(court.name)}">删除</button>
            <div class="venue-court-schedule-profile"><div class="court-profile-groups"><span>适用组别</span><section>${groupChecks}</section></div><div class="court-profile-times"><label><span>上午</span><input type="time" data-venue-court-time data-court-id="${esc(court.id)}" data-key="morningStartTime" value="${esc(court.morningStartTime)}"><i>—</i><input type="time" data-venue-court-time data-court-id="${esc(court.id)}" data-key="morningEndTime" value="${esc(court.morningEndTime)}"></label><label><span>下午</span><input type="time" data-venue-court-time data-court-id="${esc(court.id)}" data-key="afternoonStartTime" value="${esc(court.afternoonStartTime)}"><i>—</i><input type="time" data-venue-court-time data-court-id="${esc(court.id)}" data-key="afternoonEndTime" value="${esc(court.afternoonEndTime)}"></label><label class="court-evening-row"><span>晚间</span><input type="checkbox" data-venue-court-evening data-court-id="${esc(court.id)}"${court.eveningEnabled ? ' checked' : ''}><input type="time" data-venue-court-time data-court-id="${esc(court.id)}" data-key="eveningStartTime" value="${esc(court.eveningStartTime)}"${court.eveningEnabled ? '' : ' disabled'}><i>—</i><input type="time" data-venue-court-time data-court-id="${esc(court.id)}" data-key="eveningEndTime" value="${esc(court.eveningEndTime)}"${court.eveningEnabled ? '' : ' disabled'}></label></div><label><span>比赛时长</span><select data-venue-court-match-minutes data-court-id="${esc(court.id)}">${[30,40,50,60,75,90].map((value) => `<option value="${value}"${Number(court.matchMinutes) === value ? ' selected' : ''}>${value} 分钟</option>`).join('')}</select></label><label><span>缓冲</span><select data-venue-court-buffer-minutes data-court-id="${esc(court.id)}">${[5,10,15,20].map((value) => `<option value="${value}"${Number(court.bufferMinutes) === value ? ' selected' : ''}>${value} 分钟</option>`).join('')}</select></label><strong>每 ${intervalMinutes} 分钟一场</strong><button type="button" class="court-profile-reset" data-action="reset-court-schedule" data-court-id="${esc(court.id)}">重置本场</button></div>
          </article>`;
          }).join('')}</div>
          <button type="button" class="venue-add-court" data-action="add-event-court">${icon('plus')} 添加球场</button>
        </section>
        <section class="panel venue-availability-panel">
          <h3>赛事日期与球场时间汇总</h3>
          <div class="venue-availability-form">
            <label class="full"><span>比赛日期范围</span><div class="venue-date-range"><input type="date" min="${esc(currentChinaDate())}" data-venue-date-picker="start" data-venue-field="startDate" value="${esc(editableDates.startDate)}"><i>至</i><input type="date" min="${esc(editableDates.startDate)}" data-venue-date-picker="end" data-venue-field="endDate" value="${esc(editableDates.endDate)}"></div></label>
            <div class="info-banner full">各球场分别维护上午、下午、晚间时段、适用组别、比赛时长和缓冲；此处只统一赛事日期。</div>
          </div>
          <div class="venue-auto-slots"><header><b>${icon('clock-3')} ${esc(selectedVenue.name)}各球场开赛时间</b><span>共 ${automaticTimes.length} 个不同时间点</span></header><div class="court-time-summary-list">${selectedVenueCourtSummaries}</div><small>每片球场独立推算；自动排赛会按比赛组别选择允许使用的球场和对应时间。</small></div>
        </section>
      </div>
      <section class="panel venue-resource-summary">
        <h3>资源摘要</h3>
        <div class="venue-summary-content">
          <div class="venue-summary-metrics">
            <article data-summary-key="venues">${icon('settings')}<span>场馆数量<b>${summary.venues}<small>个</small></b></span></article>
            <article data-summary-key="courts">${icon('land-plot')}<span>球场数量<b>${summary.courts}<small>片</small></b></span></article>
            <article data-summary-key="days">${icon('calendar-days')}<span>比赛日数量<b>${summary.days}<small>天</small></b></span></article>
            <article data-summary-key="capacity">${icon('trophy')}<span>预计可排场次<b>${summary.capacity}<small>场</small></b><em>每日 ${summary.dailySlots} 个时间段</em></span></article>
          </div>
          <div class="venue-summary-note">${icon('info')}<span>这些场馆、球场和时段将直接提供给自动排赛引擎，<br>用于生成合理的比赛赛程。</span></div>
          ${btn('保存赛程设置', 'save-page', 'primary', 'save')}
        </div>
      </section>
    </div>`;
  }

  function ruleSourceFingerprint(eventSpace = activeEventSpace()) {
    if (!eventSpace) return '';
    const registration = registrationSettings(eventSpace);
    const units = organizationUnits(eventSpace);
    return JSON.stringify({
      name: eventSpace.name || '', shortName: eventSpace.shortName || '', eventType: eventSpace.eventType || '',
      description: eventSpace.description || '', startDate: eventSpace.startDate || '', endDate: eventSpace.endDate || '',
      regionCode: eventSpace.regionCode || '', regionLabel: eventSpace.regionLabel || '',
      participationMode: eventSpace.participationMode || '', organizationUnits: units,
      groups: (eventSpace.groupRows || []).map((group) => ({
        id: group.id || '', name: group.name || '', format: group.format || '', birthCutoff: group.birthCutoff || '',
        gender: group.gender || '', roster: group.roster || '', duration: group.duration || '', competition: group.competition || '',
        target: group.target || '', groupCount: group.groupCount || '', teamsPerGroup: group.teamsPerGroup || '',
        advancePerGroup: group.advancePerGroup || '', thirdPlaceMatch: Boolean(group.thirdPlaceMatch)
      })),
      registration: {
        startAt: registration.startAt || '', endAt: registration.endAt || '', minRoster: registration.minRoster || '',
        maxRoster: registration.maxRoster || '', contactName: registration.contactName || '', contactPhone: registration.contactPhone || '',
        publicLocation: registration.publicLocation || '', feeMode: registration.feeMode || '', feeAmount: registration.feeAmount || '',
        feeUnit: registration.feeUnit || '', prize: registration.prize || ''
      }
    });
  }

  function syncRuleDocumentFromSource(eventSpace = activeEventSpace(), force = false) {
    if (!eventSpace) return false;
    const settings = ruleSettings(eventSpace);
    const fingerprint = ruleSourceFingerprint(eventSpace);
    if (!force && eventSpace.ruleSourceFingerprint === fingerprint && eventSpace.ruleDraftHtml) return false;
    eventSpace.ruleDraftHtml = buildRuleDocument(eventSpace, settings);
    eventSpace.ruleSourceFingerprint = fingerprint;
    settings.hasUnpublishedChanges = true;
    return true;
  }

  function renderEventRules() {
    const eventSpace = activeEventSpace();
    const settings = ruleSettings(eventSpace);
    const fixedTemplateVersion = 'small-basketball-fixed-v4';
    let sourceUpdated = false;
    if (settings.template !== 'small-basketball' || settings.templateSchemaVersion !== fixedTemplateVersion || !eventSpace?.ruleDraftHtml) {
      Object.assign(settings, {
        template: 'small-basketball',
        templateSelected: true,
        templateSchemaVersion: fixedTemplateVersion,
        ruleBase: '中国篮协小篮球规则及赛事特别规定'
      });
      sourceUpdated = true;
    }
    sourceUpdated = syncRuleDocumentFromSource(eventSpace, sourceUpdated) || sourceUpdated;
    if (sourceUpdated) persistEventSpaces();
    const groups = Array.isArray(eventSpace?.groupRows) ? eventSpace.groupRows : [];
    const outline = ruleTemplateOutline(settings.template);
    const documentHtml = eventSpace.ruleDraftHtml || buildRuleDocument(eventSpace, settings);
    const completenessItems = [eventSpace?.name, eventSpace?.startDate, eventSpace?.endDate, eventSpace?.regionLabel, groups.length, registrationSettings(eventSpace).contactName, settings.organizer, settings.undertaker];
    const completeness = Math.round(completenessItems.filter(Boolean).length / completenessItems.length * 100);
    const durationSummary = [...new Set(groups.map((group) => group.duration).filter(Boolean))].join('、') || '待配置';
    const clockSummary = '按年龄组特别规定';
    const foulSummary = '按年龄组特别规定';
    return `${heading('赛事规程', '统一采用“小篮球竞赛规程”正式版式，系统读取赛事资料生成正文后可逐条微调。')}
      <div class="formal-rules-layout">
        <section class="panel formal-rules-editor">
          <header class="formal-rule-meta" data-rule-meta>
            <div class="formal-rule-unit-source">
              <div><span>主办单位</span><b>${esc(settings.organizer || '待补充')}</b></div><div><span>承办单位</span><b>${esc(settings.undertaker || '待补充')}</b></div><div><span>协办单位</span><b>${esc(settings.coOrganizer || '无')}</b></div>
              <button type="button" data-action="go-event-profile">前往赛事资料修改 ${icon('chevron-right')}</button>
            </div>
            <div class="field"><label>规程名称</label><input name="title" value="${esc(settings.title)}"></div>
            <div class="field"><label>适用范围</label><select name="scope">${['全部竞赛组别','仅 5V5 组别','仅 3V3 组别'].map((value) => `<option${settings.scope === value ? ' selected' : ''}>${value}</option>`).join('')}</select></div>
            <div class="field"><label>规则基准</label><input name="ruleBase" value="中国篮协小篮球规则及赛事特别规定" disabled></div>
            <div class="field"><label>生效日期</label><input name="effectiveDate" type="date" value="${esc(settings.effectiveDate)}"></div>
            <div class="field"><label>当前版本</label><input value="V${esc(settings.version)}" disabled></div>
          </header>
          <div class="rule-format-toolbar" aria-label="规程编辑工具">
            <button type="button" data-action="rule-format" data-command="bold"><b>B</b> 加粗</button>
            <button type="button" data-action="rule-format" data-command="insertUnorderedList">• 条目</button>
            <button type="button" data-action="rule-format" data-command="insertOrderedList">1. 编号</button>
            <button type="button" data-action="rule-insert-clause">${icon('plus')} 插入条款</button>
            <span>${icon('save')} 正文修改将保存为赛事草稿</span>
          </div>
          <div class="formal-rule-workspace">
            <nav class="rule-outline" aria-label="规程目录">${outline.map((item, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-action="rule-outline" data-rule-section="${index + 1}"><b>${index + 1}</b><span>${item}</span></button>`).join('')}</nav>
            <article class="formal-rule-document template-${esc(settings.template || 'universal')}" contenteditable="true" spellcheck="false" aria-label="赛事规程正文">${documentHtml}</article>
          </div>
        </section>
        <aside class="stack formal-rules-side">
          ${panel('生成完整度', `<div class="rule-completeness"><div><strong>${completeness}%</strong><span>${completeness === 100 ? '赛事参数已完整' : '仍有赛事资料待补充'}</span></div><div class="progress"><i style="width:${completeness}%"></i></div><p>已按当前模板生成 ${outline.length} 个章节，并自动关联 ${groups.length} 个竞赛组别。</p></div>`)}
          ${panel('关键条款设置', `<div class="formal-rule-controls" data-rule-settings>
            <label><span>迟到弃权</span><select name="lateMinutes">${['10','15','20','30'].map((value) => `<option value="${value}"${settings.lateMinutes === value ? ' selected' : ''}>超过 ${value} 分钟</option>`).join('')}</select></label>
            <label><span>弃权比分</span><select name="forfeitScore">${['0:20','0:10','0:2'].map((value) => `<option${settings.forfeitScore === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
            <label><span>申诉时限</span><select name="protestWindow">${['比赛结束后 15 分钟内','比赛结束后 30 分钟内','比赛结束后 60 分钟内'].map((value) => `<option${settings.protestWindow === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
            <label><span>申诉保证金</span><div class="rule-inline-input"><input name="protestDeposit" value="${esc(settings.protestDeposit)}"><em>元</em></div></label>
            <label><span>赛事保险</span><select name="insuranceRequired">${['必须购买赛事意外保险','建议购买赛事意外保险','由主办方统一购买'].map((value) => `<option${settings.insuranceRequired === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
            <label><span>影像授权</span><select name="imageAuthorization">${['报名即确认赛事影像授权','监护人单独勾选授权','不开放赛事影像宣传'].map((value) => `<option${settings.imageAuthorization === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
            <p class="rule-control-note">以上参数用于保存和发布校验；规程正文统一使用小篮球标准结构，不再切换其他模板。</p>
          </div>`)}
          ${panel('竞赛参数摘要', `<div class="formal-rule-params"><div><span>竞赛组别</span><b>${groups.length || 0} 个</b></div><div><span>比赛时长</span><b>${esc(durationSummary)}</b></div><div><span>进攻计时</span><b>${esc(clockSummary)}</b></div><div><span>犯规离场</span><b>${esc(foulSummary)}</b></div><div><span>排名顺序</span><b>相互战绩 → 净胜分 → 总得分</b></div></div><button class="text-action rule-param-link" data-action="go-event-groups">前往组别与赛制修改参数 →</button>`)}
          ${panel('版本与发布', `<div class="service-row-dark"><span>当前版本</span><b>V${esc(settings.version)} · ${esc(settings.effectiveDate)}</b></div><div class="service-row-dark"><span>公开状态</span><b class="${settings.published ? 'green-text' : 'orange-text'}">${settings.published ? '已发布' : '草稿'}</b></div><div class="service-row-dark"><span>最后编辑</span><b>${esc(settings.lastEditedAt || '尚未保存')}</b></div><div class="review-actions">${btn('保存草稿', 'save-page', 'outline', 'save')}${btn('发布新版本', 'publish-rules', 'primary', 'upload')}</div><div class="rule-export-actions">${btn('保存 PDF', 'export-rules-pdf', 'outline', 'download')}${btn('导出 Word', 'export-rules-word', 'outline', 'file-text')}</div><p class="publish-note">PDF 使用 A4 正式版式；Word 可继续修改。两种文件均不包含后台导航和操作按钮。</p>`)}
        </aside>
      </div>`;
  }

  function sanitizeRuleDocument(editor) {
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach((node) => node.remove());
    clone.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        if (/^on/i.test(attribute.name) || attribute.name === 'style' || attribute.name === 'contenteditable') node.removeAttribute(attribute.name);
      });
    });
    return clone.innerHTML.trim();
  }

  function captureRuleState(eventSpace = activeEventSpace()) {
    if (!eventSpace) return null;
    const settings = ruleSettings(eventSpace);
    const meta = content.querySelector('[data-rule-meta]');
    const controls = content.querySelector('[data-rule-settings]');
    const valuesFrom = (root) => Object.fromEntries([...root.querySelectorAll('[name]')].map((field) => [field.name, field.value]));
    if (meta) Object.assign(settings, valuesFrom(meta));
    if (controls) Object.assign(settings, valuesFrom(controls));
    settings.publisher = settings.organizer || settings.publisher;
    const editor = content.querySelector('.formal-rule-document');
    if (editor) eventSpace.ruleDraftHtml = sanitizeRuleDocument(editor);
    eventSpace.ruleSourceFingerprint = ruleSourceFingerprint(eventSpace);
    settings.lastEditedAt = `赵负责人 · ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`;
    settings.hasUnpublishedChanges = true;
    persistEventSpaces();
    return settings;
  }

  function ruleExportHtml(eventSpace = activeEventSpace()) {
    const settings = ruleSettings(eventSpace);
    const body = eventSpace.ruleDraftHtml || buildRuleDocument(eventSpace, settings);
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(settings.title)}</title><style>
      @page{size:A4;margin:18mm 17mm 18mm}*{box-sizing:border-box}body{margin:0;color:#222;background:#fff;font-family:"Noto Serif SC","Songti SC","SimSun",serif;font-size:12pt;line-height:1.85}h2{margin:0 0 6mm;text-align:center;font-size:22pt}h3{margin:8mm 0 2mm;padding-bottom:1.5mm;border-bottom:1px solid #bbb;font-size:14pt;break-after:avoid}p{margin:0;text-indent:2em;text-align:justify}.rule-document-unit{text-align:center;text-indent:0;color:#555;font-size:10pt}.rule-document-table{width:100%;margin:4mm 0;border-collapse:collapse;table-layout:fixed;font-size:8.5pt;break-inside:avoid}.rule-document-table th,.rule-document-table td{padding:2mm 1.5mm;border:1px solid #888;text-align:center;word-break:break-word}.rule-document-table th{background:#eee}ul,ol{margin:2mm 0 2mm 2em} @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body>${body}</body></html>`;
  }

  function safeRuleFileName(eventSpace = activeEventSpace()) {
    const title = ruleSettings(eventSpace).title || `${eventSpace.name}竞赛规程`;
    return String(title).replace(/[\\/:*?"<>|]/g, '-').trim() || '赛事竞赛规程';
  }

  function downloadRuleWord(eventSpace = activeEventSpace()) {
    const html = ruleExportHtml(eventSpace);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeRuleFileName(eventSpace)}.doc`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openRulePdfPrint(eventSpace = activeEventSpace()) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return false;
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(ruleExportHtml(eventSpace));
    printWindow.document.close();
    printWindow.document.title = safeRuleFileName(eventSpace);
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
    return true;
  }

  function renderRegistrationProgress() {
    const eventSpace = activeEventSpace();
    const playerDataEnabled = usesPlayerData(eventSpace);
    const rows = registrationTeamRows(eventSpace);
    const groupNames = [...new Set([...(eventSpace?.groupRows || []).map((group) => group.name), ...rows.map((team) => team.group)].filter(Boolean))];
    const claimStatuses = ['待邀请', '邀请已发送', '已认领'];
    if (!groupNames.includes(registrationGroupFilter)) registrationGroupFilter = '';
    if (!claimStatuses.includes(registrationStatusFilter)) registrationStatusFilter = '';
    const groupOptions = `<option value="">全部组别</option>${groupNames.map((name) => `<option value="${esc(name)}"${registrationGroupFilter === name ? ' selected' : ''}>${esc(name)}</option>`).join('')}`;
    const statusOptions = `<option value="">全部状态</option>${claimStatuses.map((name) => `<option value="${name}"${registrationStatusFilter === name ? ' selected' : ''}>${name}</option>`).join('')}`;
    const targetTeams = eventGroupRows.reduce((sum, group) => sum + Number(group.target || 0), 0);
    const teamCount = rows.length;
    const pendingCount = rows.filter((team) => team.claimStatus !== '已认领').length;
    const exceptionCount = playerDataEnabled ? registrationPlayers(eventSpace).filter((player) => player.reviewResult && player.reviewResult !== '通过').length : 0;
    const groupProgress = eventGroupRows.map((group) => ({
      group,
      current: officialTeams(eventSpace).filter((team) => team.group === group.name).length,
      target: Number(group.target || 0)
    }));
    const readyGroups = groupProgress.filter((item) => item.target > 0 && item.current >= item.target);
    const focusedGroupProgress = registrationGroupFilter
      ? groupProgress.find((item) => item.group.name === registrationGroupFilter)
      : null;
    const actionableGroup = focusedGroupProgress?.target > 0 && focusedGroupProgress.current >= focusedGroupProgress.target
      ? focusedGroupProgress
      : readyGroups[0];
    const drawOverviewTitle = focusedGroupProgress
      ? (focusedGroupProgress.current >= focusedGroupProgress.target
        ? `${groupDisplayName(focusedGroupProgress.group)} 已达到抽签条件`
        : `${groupDisplayName(focusedGroupProgress.group)} 还差 ${Math.max(0, focusedGroupProgress.target - focusedGroupProgress.current)} 支正式参赛队`)
      : `${readyGroups.length} / ${groupProgress.length} 个组别已达到抽签条件`;
    const groupReadinessCards = groupProgress.map((item) => {
      const ready = item.target > 0 && item.current >= item.target;
      const missing = Math.max(0, item.target - item.current);
      return `<article class="registration-group-readiness${ready ? ' ready' : ' waiting'}${focusedGroupProgress?.group.id === item.group.id ? ' focused' : ''}"><b>${esc(groupDisplayName(item.group))}</b><span>${item.current} / ${item.target} 支</span><small>${ready ? '已满足 · 可抽签' : item.target > 0 ? `未满足 · 还缺 ${missing} 支` : '未设置目标球队数'}</small></article>`;
    }).join('');
    const drawStep = groupProgress.length
      ? `<section class="registration-next-step registration-next-step-multi${readyGroups.length ? ' ready' : ''}"><header><div>${icon(readyGroups.length ? 'circle-check-big' : 'info')}<span><b>${esc(drawOverviewTitle)}</b><small>仅统计已认领且赛事资格审核通过的正式参赛球队；各组独立判断抽签条件。</small></span></div>${actionableGroup ? `<button type="button" class="btn primary" data-action="go-draw-next" data-group-id="${esc(actionableGroup.group.id)}">${icon('shuffle')} 进入${esc(groupDisplayName(actionableGroup.group))}抽签</button>` : ''}</header><div class="registration-group-readiness-grid">${groupReadinessCards}</div></section>`
      : '';
    return `<div class="primary-page registration-progress-page">
      <section class="compact-metrics">
        ${metric('目标球队',String(targetTeams),'支','users-round','本届赛事目标')}
        ${metric('已添加',String(teamCount),'支','circle-check-big','主办方已录入')}
        ${metric('待认领',String(pendingCount),'支','user-round','邀请后等待领队')}
        ${playerDataEnabled ? metric('资格异常',String(exceptionCount),'人','triangle-alert',exceptionCount ? '等待处理' : '暂无球员资料') : metric('资料模式','仅球队','','users-round','不审核球员资格')}
      </section>
      ${!playerDataEnabled ? `<div class="info-banner team-only-registration-note">本赛事不录入球员，不进行球员资格审核；请在球队管理中查看已通过的正式参赛球队。</div>` : ''}
      <div class="registration-main-grid">
        <section class="panel registration-table-panel${rows.length ? '' : ' is-empty'}">
          <div class="table-toolbar"><div><select class="control" data-registration-group-filter>${groupOptions}</select><select class="control" data-registration-status-filter>${statusOptions}</select></div><label class="icon-input">${icon('search')}<input data-registration-search placeholder="搜索球队名称或负责人"></label></div>
          <table class="data-table"><thead><tr><th>球队</th><th>所属组别</th><th>领队</th><th>手机号</th><th>认领状态</th><th>赛事资格</th><th>${playerDataEnabled ? '球员资料' : '数据范围'}</th><th>更新时间</th><th>操作</th></tr></thead><tbody>
            ${rows.map((team) => { const [state, tone] = registrationTeamStatus(team); const qualification = teamQualificationStatus(team); const qualificationLabel = qualification; const virtualActions = `<button type="button" data-action="view-virtual-team" data-team-id="${esc(team.id)}">查看资料</button><button type="button" class="danger" data-action="request-delete-registration-team" data-team-id="${esc(team.id)}">删除</button>`; const reviewLabel = qualification === '待审核' ? '审核资格' : '查看审核'; const regularActions = `<button type="button" data-action="edit-registration-team" data-team-id="${esc(team.id)}">编辑</button>${team.claimStatus === '已认领' ? `<button type="button" data-action="audit-registration-team" data-team-id="${esc(team.id)}">${reviewLabel}</button>` : `<button type="button" data-action="invite-captain" data-team-id="${esc(team.id)}">${team.claimStatus === '邀请已发送' ? '再邀' : '邀请'}</button>`}<button type="button" class="danger" data-action="request-delete-registration-team" data-team-id="${esc(team.id)}">删除</button>`; return `<tr class="registration-row${team.isVirtual ? ' virtual-registration-row' : ''}" data-search="${esc([team.name, team.group, team.owner, team.phone].join(' '))}" data-group="${esc(team.group)}" data-claim-status="${esc(state)}"><td>${teamCell(team.name, team.isVirtual ? '历史模拟数据' : '', team.logo || '')}</td><td>${esc(team.group)}</td><td>${esc(team.owner)}</td><td>${team.isVirtual ? '<span class="muted-text">不适用</span>' : esc(maskMobile(team.phone))}</td><td>${status(state, tone)}</td><td>${status(qualificationLabel, qualification === '已通过' ? 'ok' : qualification === '已驳回' ? 'error' : 'warn')}</td><td><span class="muted-text">${team.isVirtual ? `${team.players?.length || 0} 人历史名单` : playerDataEnabled ? '领队上线后维护' : '仅球队数据'}</span></td><td>${esc(team.updatedAt || '刚刚')}</td><td><div class="registration-row-actions">${team.isVirtual ? virtualActions : regularActions}</div></td></tr>`; }).join('') || `<tr><td colspan="9"><div class="registration-empty-guide">${icon('qr-code')}<h3>等待球队扫码报名</h3><p>点击右上角“生成球队报名码”，发送给球队领队。</p><div><span><b>1</b>领队扫码选择球队</span><span><b>2</b>确认参赛并关注通知</span><span><b>3</b>主办方审核报名</span></div><button type="button" class="btn outline" data-action="add-registration-team">+ 异常情况人工添加</button></div></td></tr>`}
          </tbody></table>
          <footer class="table-pagination"><span data-registration-count>共 ${teamCount} 条</span><div><button>‹</button><button class="active">1</button><button>›</button><select><option>10 条/页</option></select></div></footer>
        </section>
      </div>
      ${drawStep}
      <div class="boundary-note">${icon('info')} 线上报名由球队领队扫码选择球队并确认参赛；人工添加仅用于无法扫码时的异常补录。</div>
    </div>`;
  }

  function renderClaims() {
    const rows = registrationTeamRows();
    const playerDataEnabled = usesPlayerData();
    const pendingClaimCount = rows.filter((team) => team.claimStatus !== '已认领').length;
    return `<div class="registration-claims-page">${heading('球队认领', '真实球队通过邀请完成认领；虚拟球队可直接用于抽签、排赛、计分和球员数据测试。', `${pendingClaimCount ? btn(`全部认领（${pendingClaimCount}）`, 'claim-all-registration-teams', 'outline', 'circle-check-big') : ''}`)}
      ${panel('认领记录', `<table class="data-table"><thead><tr><th>球队</th><th>领队</th><th>手机号</th><th>来源</th><th>邀请时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map((team) => { const [state, tone] = registrationTeamStatus(team); return `<tr class="${team.isVirtual ? 'virtual-registration-row' : ''}"><td>${teamCell(team.name, team.isVirtual ? '虚拟球队' : '', team.logo || '')}</td><td>${esc(team.owner)}</td><td>${team.isVirtual ? '<span class="muted-text">不适用</span>' : esc(maskMobile(team.phone))}</td><td>${esc(team.source || '主办方人工添加')}</td><td>${esc(team.claimedAt || team.invitedAt || '—')}</td><td>${status(state, tone)}</td><td>${team.isVirtual ? `<button class="btn small" type="button" data-action="view-virtual-team" data-team-id="${esc(team.id)}">${icon('users-round')} 查看资料</button>` : `<button class="btn small" type="button" data-action="invite-captain" data-team-id="${esc(team.id)}">${icon('send')} ${team.claimStatus === '邀请已发送' ? '再次邀请' : '发送邀请'}</button>`}</td></tr>`; }).join('') || `<tr><td colspan="7"><div class="module-empty compact">${icon('users-round')}<b>尚未添加球队</b><span>可添加虚拟球队体验完整流程，也可人工添加真实球队并发送认领邀请。</span><div class="empty-actions">${btn('添加虚拟球队','add-virtual-teams','outline','flask-conical')}${btn('人工添加球队','add-registration-team','primary','plus')}</div></div></td></tr>`}</tbody></table>`)}
      <div class="info-banner"><b>归属规则：</b>${playerDataEnabled ? '领队只管理自己的球队；家长只补全自己孩子的资料；主办方负责审核与赛事名单确认。' : '领队只维护球队基础资料和联系方式；平台不要求球员填报，也不执行球员资格审查。'}</div></div>`;
  }

  function renderQualification() {
    if (!usesPlayerData()) {
      return `${heading('球员资格', '当前赛事采用“仅球队数据”模式。')}${panel('无需球员资格审核', `<div class="module-empty">${icon('shield-check')}<b>本赛事不录入球员</b><span>平台只维护球队、赛程、比分和球队统计，不收集球员名单，也不进行球员资格审查。</span>${btn('返回入驻进度','go-registration-progress','outline','chevron-right')}</div>`)}`;
    }
    const players = registrationPlayers();
    return `${heading('球员资格', '当前阶段不人工添加球员；正式上线并完成球队绑定后，由领队提交球员资料。')}
      ${panel('资格审核队列', players.length ? `<table class="data-table"><thead><tr><th>球员</th><th>球队</th><th>组别</th><th>出生年月</th><th>审核结果</th></tr></thead><tbody>${players.map((player) => `<tr><td><b>${esc(player.name)}</b></td><td>${teamCell(player.teamName)}</td><td>${esc(player.group)}</td><td>${esc(player.birth || '—')}</td><td>${status(player.reviewResult || '待审核','warn')}</td></tr>`).join('')}</tbody></table>` : `<div class="module-empty">${icon('shield-check')}<b>暂无球员资格资料</b><span>人工添加球队不会生成球员；等待正式上线后由领队完成球队绑定和球员提交。</span>${btn('查看球队认领','go-claims','outline','chevron-right')}</div>`)}
      <div class="info-banner"><b>数据包边界：</b>球员基础资料、球队名单和参赛资格属于赛事基础能力；个人技术统计数据包是赛后增值服务，二者完全分离。</div>`;
  }

  function renderRosters() {
    if (!usesPlayerData()) {
      return `${heading('正式名单', '当前赛事采用“仅球队数据”模式。')}${panel('无需球员名单', `<div class="module-empty">${icon('clipboard-list')}<b>本赛事不生成球员名单</b><span>参赛和排赛均以球队为单位，不要求领队提交球员资料。</span>${btn('查看球队认领','go-claims','outline','chevron-right')}</div>`)}`;
    }
    const players = registrationPlayers();
    return `${heading('正式名单', '资格审核通过后生成正式参赛名单；当前测试阶段不人工添加球员。')}
      ${panel('正式参赛名单', players.length ? `<div class="info-banner">已收到 ${players.length} 名球员资料，待资格审核完成后生成正式名单。</div>` : `<div class="module-empty">${icon('clipboard-list')}<b>暂无正式名单</b><span>人工添加球队只用于测试邀请，不创建球员和名单。正式上线完成球队绑定、球员提交和资格审核后，名单将在这里生成。</span>${btn('查看球队认领','go-claims','outline','chevron-right')}</div>`)}`;
  }

  function balancedKnockoutSeedOrder(teamNames, bracketSize, randomize = false) {
    const pool = [...teamNames];
    if (randomize) {
      for (let index = pool.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
      }
    }
    const matchCount = Math.max(1, bracketSize / 2);
    const byeCount = Math.max(0, bracketSize - pool.length);
    const byeMatches = new Set(Array.from({ length: byeCount }, (_, index) => Math.floor(index * matchCount / Math.max(1, byeCount))));
    const seeds = [];
    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      seeds.push(pool.shift() || '');
      seeds.push(byeMatches.has(matchIndex) ? '' : (pool.shift() || ''));
    }
    return seeds;
  }

  function currentDrawContext() {
    const eventSpace = activeEventSpace();
    const groups = eventGroupRows.length ? eventGroupRows : (eventSpace?.groupRows || []);
    if (!groups.some((group) => group.id === selectedDrawGroupId)) {
      selectedDrawGroupId = selectedFormatGroupId && groups.some((group) => group.id === selectedFormatGroupId)
        ? selectedFormatGroupId
        : groups[0]?.id || '';
    }
    const group = groups.find((item) => item.id === selectedDrawGroupId) || groups[0];
    if (!eventSpace || !group) return null;
    if (eventSpace.drawSelectedGroupId !== group.id) {
      eventSpace.drawSelectedGroupId = group.id;
      persistEventSpaces();
    }
    const config = competitionConfig(group);
    const registrationTeams = officialTeams(eventSpace).filter((team) => team.group === group.name);
    const teamNames = registrationTeams.map((team) => team.name);
    const teamLogos = Object.fromEntries(registrationTeams.map((team) => [team.name, team.logo || '']));
    eventSpace.drawStates = eventSpace.drawStates || {};
    const groupCount = Math.max(1, Number(config.groupCount || 1));
    const teamsPerGroup = Math.max(1, Number(config.teamsPerGroup || Math.ceil(teamNames.length / groupCount) || 1));
    const letters = Array.from({ length: groupCount }, (_, index) => String.fromCharCode(65 + index));
    const saved = eventSpace.drawStates[group.id] || {};
    const seen = new Set();
    const assignments = Object.fromEntries(letters.map((letter) => [letter, (saved.assignments?.[letter] || []).filter((name) => teamNames.includes(name) && !seen.has(name) && seen.add(name)).slice(0, teamsPerGroup)]));
    const unassignedTeams = teamNames.filter((name) => !seen.has(name));
    const savedOrder = Array.isArray(saved.order) ? saved.order.filter((name) => teamNames.includes(name)) : [];
    const order = [...savedOrder, ...teamNames.filter((name) => !savedOrder.includes(name))];
    const bracketSize = teamNames.length > 1 ? 2 ** Math.ceil(Math.log2(teamNames.length)) : Math.max(1, teamNames.length);
    const seenSeeds = new Set();
    let seedOrder = Array.from({ length: bracketSize }, (_, index) => {
      const name = Array.isArray(saved.seedOrder) ? saved.seedOrder[index] : '';
      if (!teamNames.includes(name) || seenSeeds.has(name)) return '';
      seenSeeds.add(name);
      return name;
    });
    const knockoutDrawMode = ['knockout', 'knockout-full-placement', 'double-knockout'].includes(config.preset);
    const resetLegacySeedDraft = Boolean(knockoutDrawMode && saved.seedResetRevision !== KNOCKOUT_EMPTY_RESET_REVISION);
    if (!saved.seedOrder) seedOrder = Array.from({ length: bracketSize }, () => '');
    if (resetLegacySeedDraft) seedOrder = Array.from({ length: bracketSize }, () => '');
    const state = { assignments, unassignedTeams, order, seedOrder, seedLayoutVersion: 9, seedResetRevision: KNOCKOUT_EMPTY_RESET_REVISION, seedInitializedEmpty: true, seedAssignmentStarted: resetLegacySeedDraft ? false : Boolean(saved.seedAssignmentStarted), saved: resetLegacySeedDraft ? false : Boolean(saved.saved), updatedAt: saved.updatedAt || '' };
    eventSpace.drawStates[group.id] = state;
    if (resetLegacySeedDraft) {
      eventWorkflow(eventSpace).drawCompleted = false;
      eventWorkflow(eventSpace).drawSaved = false;
      persistEventSpaces();
    }
    return { eventSpace, group, config, teamNames, teamLogos, groupCount, teamsPerGroup, letters, state };
  }

  function refreshDrawWorkflow(eventSpace = activeEventSpace()) {
    if (!eventSpace) return false;
    const official = officialTeams(eventSpace);
    const groups = eventGroupRows.length ? eventGroupRows : (eventSpace.groupRows || []);
    const allReadyAndSaved = groups.length > 0 && groups.every((group) => {
      const approvedCount = official.filter((team) => team.group === group.name).length;
      const target = Number(group.target || 0);
      return target > 0 && approvedCount >= target && Boolean(eventSpace.drawStates?.[group.id]?.saved);
    });
    const workflow = eventWorkflow(eventSpace);
    workflow.drawCompleted = allReadyAndSaved;
    workflow.drawSaved = allReadyAndSaved;
    syncEventLifecycle(eventSpace);
    return allReadyAndSaved;
  }

  function drawExportData(context = currentDrawContext()) {
    if (!context) return null;
    return {
      eventName: context.eventSpace.name,
      logo: context.eventSpace.logo || '',
      logoBackground: normalizeLogoBackground(context.eventSpace.logoBackground),
      groupName: context.group.name,
      competition: context.group.competition || '小组赛',
      formatPreset: context.config.preset || 'group-only',
      teamLogos: { ...context.teamLogos },
      assignments: Object.fromEntries(Object.entries(context.state.assignments).map(([letter, names]) => [letter, [...names]])),
      exportedAt: new Date().toLocaleString('zh-CN', { hour12: false })
    };
  }

  function drawExportReady(context = currentDrawContext()) {
    if (!context) {
      showToast('暂无可导出的竞赛组别');
      return false;
    }
    if (context.state.unassignedTeams.length) {
      showToast(`还有 ${context.state.unassignedTeams.length} 支球队未分组，请先完成分配`);
      return false;
    }
    if (!context.state.saved) {
      showToast('请先保存分组结果，再进行导出');
      return false;
    }
    return true;
  }

  async function refreshDrawPosterEditor() {
    const canvas = modalBody.querySelector('[data-draw-poster-canvas]');
    const data = drawExportData();
    if (!canvas || !data || !window.SXFDrawExport) return;
    const dimensions = await window.SXFDrawExport.drawPoster(canvas, data, drawPosterDraft);
    const size = modalBody.querySelector('[data-draw-poster-size]');
    if (size) size.textContent = `${dimensions.width} × ${dimensions.height} PNG`;
    modalBody.querySelectorAll('[data-action="set-draw-poster-ratio"]').forEach((button) => button.classList.toggle('active', button.dataset.ratio === drawPosterDraft.ratio));
    modalBody.querySelectorAll('[data-action="set-draw-poster-style"]').forEach((button) => button.classList.toggle('active', button.dataset.style === drawPosterDraft.style));
    modalBody.querySelectorAll('[data-action="set-draw-poster-team-size"]').forEach((button) => button.classList.toggle('active', Number(button.dataset.teamScale) === drawPosterDraft.teamScale));
    const hint = modalBody.querySelector('[data-draw-poster-team-size-hint]');
    if (hint) {
      const presentation = window.SXFDrawExport.teamPresentation(Object.entries(data.assignments || {}), drawPosterDraft.ratio === '9:16', drawPosterDraft.teamScale);
      hint.textContent = `智能适配：${presentation.groupCount} 个小组、每组最多 ${presentation.maxTeams} 队；当前为 ${drawPosterDraft.teamScale === 100 ? '自动大小' : `${drawPosterDraft.teamScale}% 微调`}。`;
    }
  }

  function openDrawPosterExport() {
    const styles = window.SXFDrawExport?.posterStyles || [];
    openModal('导出分组海报', `<div class="draw-poster-editor">
      <section class="draw-poster-preview"><div><canvas data-draw-poster-canvas aria-label="分组海报预览"></canvas></div><footer><span>实时预览</span><b data-draw-poster-size>1600 × 900 PNG</b></footer></section>
      <aside class="draw-poster-controls">
        <section><header><b>海报比例</b><small>选择发布渠道对应尺寸</small></header><div class="draw-poster-ratios">
          <button type="button" data-action="set-draw-poster-ratio" data-ratio="16:9" class="${drawPosterDraft.ratio === '16:9' ? 'active' : ''}"><i class="ratio-landscape"></i><span><b>横版 16:9</b><small>大屏、公众号配图</small></span></button>
          <button type="button" data-action="set-draw-poster-ratio" data-ratio="9:16" class="${drawPosterDraft.ratio === '9:16' ? 'active' : ''}"><i class="ratio-portrait"></i><span><b>竖版 9:16</b><small>朋友圈、视频号</small></span></button>
        </div></section>
        <section><header><b>海报样式</b><small>配色可选，底版会按当前赛制自动匹配</small></header><div class="draw-poster-styles">${styles.map((style) => `<button type="button" data-action="set-draw-poster-style" data-style="${style.id}" class="${drawPosterDraft.style === style.id ? 'active' : ''}"><i>${style.swatches.map((color) => `<em style="background:${color}"></em>`).join('')}</i><span><b>${esc(style.name)}</b><small>${esc(style.description)}</small></span></button>`).join('')}</div></section>
        <section class="draw-poster-team-size"><header><b>队徽与队名大小</b><small data-draw-poster-team-size-hint>智能适配当前分组密度</small></header><div class="draw-poster-team-size-options"><button type="button" data-action="set-draw-poster-team-size" data-team-scale="75">紧凑</button><button type="button" data-action="set-draw-poster-team-size" data-team-scale="100">智能适配</button><button type="button" data-action="set-draw-poster-team-size" data-team-scale="125">加大</button><button type="button" data-action="set-draw-poster-team-size" data-team-scale="150">特大</button></div></section>
        <div class="draw-format-base">${icon('layout-dashboard')}<span><small>当前赛制底版</small><b>${esc(drawExportData()?.competition || '小组赛')}</b></span></div>
        <div class="draw-export-note">${icon('info')}<span>小组循环、纯循环、单败淘汰和双败淘汰使用不同底版；切换比例或配色不会修改抽签结果。</span></div>
      </aside>
    </div>`, `${btn('取消','close-modal','outline')}${btn('下载 PNG 海报','download-draw-poster','primary','download')}`, 'draw-poster-modal');
    window.requestAnimationFrame(() => refreshDrawPosterEditor());
  }

  function drawPageForCompetition(config = {}) {
    if (['round-robin', 'double-round'].includes(config.preset)) return 'round-robin';
    if (['knockout', 'knockout-full-placement', 'double-knockout'].includes(config.preset)) return 'knockout';
    return 'groups';
  }

  function rememberSelectedDrawGroup(groupId) {
    const nextId = eventGroupRows.some((group) => group.id === groupId) ? groupId : eventGroupRows[0]?.id || '';
    selectedDrawGroupId = nextId;
    const eventSpace = activeEventSpace();
    if (eventSpace && eventSpace.drawSelectedGroupId !== nextId) {
      eventSpace.drawSelectedGroupId = nextId;
      persistEventSpaces();
    }
    return eventGroupRows.find((group) => group.id === nextId);
  }

  function drawWorkspaceNavigator(context = currentDrawContext()) {
    if (!context) return '';
    const options = eventGroupRows.map((group) => {
      const config = competitionConfig(group);
      const saved = Boolean(context.eventSpace.drawStates?.[group.id]?.saved);
      const drawPage = drawPageForCompetition(config);
      const operation = drawPage === 'round-robin' ? '循环排序' : drawPage === 'knockout' ? '淘汰赛签位' : '抽签分组';
      return `<option value="${esc(group.id)}"${group.id === context.group.id ? ' selected' : ''}>${esc(groupDisplayName(group))} · ${operation} · ${saved ? '已保存' : '未保存'}</option>`;
    }).join('');
    return `<section class="draw-workspace-navigator"><div><button type="button" class="btn outline" data-action="go-registration-progress">${icon('chevron-left')} 返回组别抽签总览</button><span>当前竞赛组别</span><select class="control" data-draw-group-switch>${options}</select></div><div><small>赛制</small><b>${esc(context.group.competition || '待配置')}</b><em class="${context.state.saved ? 'saved' : 'pending'}">${context.state.saved ? '抽签已保存' : '抽签未保存'}</em></div></section>`;
  }

  function drawNavigationForCurrentGroup() {
    const context = currentDrawContext();
    const preset = context?.config?.preset || 'group-only';
    const page = drawPageForCompetition(context?.config);
    const label = ({
      'group-only': '小组抽签',
      'group-full-placement': '小组抽签与全员排位',
      'group-round-robin': '小组抽签与晋级组',
      'group-knockout': '小组抽签与淘汰签位',
      'group-double-knockout': '小组抽签与双败签位',
      'round-robin': '单循环赛排序',
      'double-round': '双循环赛排序',
      knockout: '单败淘汰签位',
      'knockout-full-placement': '单败淘汰全员排位签位',
      'double-knockout': '双败淘汰签位'
    })[preset] || '抽签与分组';
    return [[page, label]];
  }

  function renderDrawGroups(mode = 'groups') {
    const context = currentDrawContext();
    const title = mode === 'round-robin' ? '纯循环赛' : mode === 'knockout' ? '单败淘汰' : '小组赛及晋级';
    const description = mode === 'round-robin'
      ? '循环赛无需分组，拖动调整球队顺序，系统据此生成轮次。'
      : mode === 'knockout'
          ? '将球队拖入签位；轮空与对阵关系会在赛果与复核页统一展示。'
        : '默认人工拖动分组，也可一键自动抽签；第二阶段规则在本页下方设置。';
    if (mode === 'round-robin') return renderRoundRobin();
    if (mode === 'knockout') return renderKnockout();
    if (!context) return `${heading('抽签与分组', '请先创建组别并添加参赛球队。')}<div class="panel module-empty">${icon('shuffle')}<b>暂无可抽签组别</b><span>返回组别设置创建竞赛组别后再继续。</span></div>`;
    const { eventSpace, group, config, teamNames, teamLogos, groupCount, teamsPerGroup, state } = context;
    const assignedCount = teamNames.length - state.unassignedTeams.length;
    const advanceTotal = groupCount * Number(config.advancePerGroup || 1);
    const saveGroupButton = state.saved
      ? `<button type="button" class="btn primary" disabled>${icon('circle-check-big')} 分组已保存</button>`
      : btn('保存分组','save-groups','primary','save');
    const groupCards = Object.entries(state.assignments).map(([groupLetter, names]) => `
      <section class="group-card"><h4>${groupLetter} 组 <small>（${names.length}/${teamsPerGroup}）</small></h4>
        ${Array.from({ length: teamsPerGroup }, (_, index) => {
          const name = names[index];
          return `<div class="group-slot ${name ? 'filled' : ''}" data-group="${groupLetter}" data-index="${index}">${name ? `<i>${index + 1}</i>${teamBadge(name, teamLogos[name] || '')}<b>${esc(name)}</b>` : `<i>${index + 1}</i><span>拖入球队</span>`}</div>`;
        }).join('')}
      </section>`).join('');
    return `<div class="primary-page draw-groups-page">
      ${drawWorkspaceNavigator(context)}
      <section class="draw-context-bar" data-draw-group-id="${esc(group.id)}">
        <div><h2>${title}</h2><span>竞赛组别：<b>${esc(groupDisplayName(group))}</b></span><span>当前赛制：<b>${esc(group.competition)}</b></span><span>球队数量：<b>${teamNames.length} 支</b></span></div>
        <div>${btn('修改赛制','go-event-groups','outline','settings')}${btn('自动抽签','auto-draw','outline','shuffle')}${saveGroupButton}</div>
      </section>
      <div class="draw-layout">
        <section class="panel team-pool">
          <header><h3>待分配球队 <small>（${state.unassignedTeams.length}）</small></h3><p>拖拽球队到右侧分组空位</p></header>
          <div id="teamPool">${state.unassignedTeams.map((name) => `<div class="draggable-team" draggable="true" data-team="${esc(name)}">${teamBadge(name, teamLogos[name] || '')}<b>${esc(name)}</b></div>`).join('') || '<div class="empty-state compact">全部球队已分组</div>'}</div>
        </section>
        <section class="panel groups-panel">
          <header class="draw-result-heading"><h3>分组结果 <small>（已分配 ${assignedCount}/${teamNames.length}）</small></h3><div>${btn('导出分组结果','export-draw-table','outline','file-text')}${btn('导出分组海报','open-draw-poster','outline','download')}</div></header>
          <div class="group-grid">${groupCards}</div>
        </section>
      </div>
      <section class="advancement-bar">
        <div><h3>${config.preset === 'group-full-placement' ? '第二阶段分层排位规则' : '第二阶段晋级规则'} <small>（来自组别赛制）</small></h3><div class="advancement-matchups">${config.preset === 'group-only' ? '<span>仅进行组内循环，无第二阶段</span>' : config.preset === 'group-full-placement' ? Object.keys(state.assignments).map((letter) => `<span>${letter}组第 1—${Number(config.teamsPerGroup || 1)} 名</span>`).join('') : Object.keys(state.assignments).map((letter) => `<span>${letter}组前 ${Number(config.advancePerGroup || 1)} 名</span>`).join('')}</div></div>
        <p>${config.preset === 'group-full-placement' ? `所有 ${teamNames.length} 支球队均进入对应名次层；系统按 ${Number(config.groupCount || 1)} 个小组自动计算每队 ${Number(config.placementMatchesPerTeam || 1)} 场排位赛，最终决出全部名次。` : config.preset === 'group-round-robin' ? `${advanceTotal} 支晋级球队进入晋级组单循环，按积分排定最终名次。` : config.preset === 'group-only' ? '各小组独立按积分排名，不产生跨组晋级。' : `共 ${advanceTotal} 支球队晋级，后续签位与对阵路径按已保存赛制生成。`}</p>
        ${btn('修改晋级规则','edit-advancement','outline','settings')}
      </section>
    </div>`;
  }

  function renderRoundRobin() {
    const context = currentDrawContext();
    if (!context) return `${heading('循环赛排序', '请先完成组别设置和球队资格审核。')}<div class="panel module-empty">${icon('shuffle')}<b>暂无可排序球队</b></div>`;
    const order = context.state.order || context.teamNames || [];
    const isDoubleRound = context?.config?.preset === 'double-round';
    const teamCount = order.length;
    const rounds = teamCount > 1 ? (teamCount - 1) * (isDoubleRound ? 2 : 1) : 0;
    const matches = teamCount > 1 ? teamCount * (teamCount - 1) / 2 * (isDoubleRound ? 2 : 1) : 0;
    const saveOrderButton = context.state.saved ? `<button type="button" class="btn primary" disabled>${icon('circle-check-big')} 排序已保存</button>` : btn('保存循环排序', 'save-round-robin-draw', 'primary', 'save');
    return `<div class="primary-page draw-special-page">${drawWorkspaceNavigator(context)}${heading(isDoubleRound ? '双循环赛排序' : '单循环赛排序', '循环赛不分组；保存球队排序后，系统按联赛轮转表生成每轮两两对阵。', `${btn('随机排序', 'randomize-round-robin-order', 'outline', 'shuffle')}${saveOrderButton}`)}
      <div class="split-layout">
        ${panel('参赛球队顺序', `<div class="ranking-list">${order.map((name, index) => `<div class="rank-row"><i>${index + 1}</i>${teamCell(name, '', context?.teamLogos?.[name] || '')}<span class="round-order-actions"><button type="button" data-action="move-round-robin-order" data-index="${index}" data-direction="up"${index === 0 ? ' disabled' : ''}>↑</button><button type="button" data-action="move-round-robin-order" data-index="${index}" data-direction="down"${index === order.length - 1 ? ' disabled' : ''}>↓</button></span></div>`).join('') || '<div class="empty-state compact">当前组别尚无球队</div>'}</div>`)}
        ${panel('赛制摘要', `<div class="summary-strip compact"><div><span>球队</span><strong>${teamCount}</strong></div><div><span>轮次</span><strong>${rounds}</strong></div><div><span>总场次</span><strong>${matches}</strong></div><div><span>每队场次</span><strong>${teamCount > 1 ? (teamCount - 1) * (isDoubleRound ? 2 : 1) : 0}</strong></div></div><div class="rule-summary"><h4>排名规则</h4><ol><li>胜场积分</li><li>相互胜负</li><li>净胜分</li><li>总得分</li></ol></div>`)}
      </div></div>`;
  }

  function knockoutRoundLabel(bracketSize, roundIndex, roundCount) {
    if (roundIndex === roundCount - 1) return '决赛';
    if (roundIndex === roundCount - 2) return '半决赛';
    if (roundIndex === roundCount - 3) return '1/4 决赛';
    return `${bracketSize / (2 ** roundIndex)} 强赛`;
  }

  function renderKnockoutBracketTree(seeds, context) {
    const bracketSize = seeds.length;
    const roundCount = Math.max(1, Math.log2(Math.max(2, bracketSize)));
    const halfSize = Math.max(1, bracketSize / 2);
    const halfRoundCount = Math.max(1, roundCount - 1);
    const allTeamsPlaced = seeds.filter(Boolean).length === context.teamNames.length;
    const teamLine = (name, firstRound, seedIndex = -1) => name === '轮空'
      ? `<span class="knockout-tree-team is-bye${firstRound ? ' knockout-direct-drop' : ''}"${firstRound ? ` data-knockout-drop-index="${seedIndex}"` : ''}><i class="bye-gap">${allTeamsPlaced ? 'BYE' : '+'}</i><b>${allTeamsPlaced ? '轮空位' : '拖入球队'}</b></span>`
      : firstRound
        ? `<span class="knockout-tree-team knockout-direct-drop" data-knockout-drop-index="${seedIndex}" draggable="true" data-knockout-team="${esc(name)}">${teamBadge(name, context.teamLogos?.[name] || '')}<b>${esc(name)}</b></span>`
        : `<span class="knockout-tree-team is-source"><i class="bye-gap">胜</i><b>${esc(name)}</b></span>`;
    const connectorSvg = (sourceCount, mirrored) => {
      const count = Math.max(2, Number(sourceCount || 2));
      const sourceX = mirrored ? 100 : 0;
      const targetX = mirrored ? 0 : 100;
      const jointX = 50;
      const paths = Array.from({ length: count / 2 }, (_, index) => {
        const firstY = (index * 2 + 0.5) * 100 / count;
        const secondY = (index * 2 + 1.5) * 100 / count;
        const middleY = (firstY + secondY) / 2;
        return `<path d="M ${sourceX} ${firstY} H ${jointX} M ${sourceX} ${secondY} H ${jointX} M ${jointX} ${firstY} V ${secondY} M ${jointX} ${middleY} H ${targetX}"/>`;
      }).join('');
      return `<div class="knockout-round-connector${mirrored ? ' mirrored' : ''}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}</svg></div>`;
    };
    const renderHalf = (halfSeeds, zone, mirrored = false, seedOffset = 0) => {
      const rounds = Array.from({ length: halfRoundCount }, (_, roundIndex) => {
        const matchCount = halfSize / (2 ** (roundIndex + 1));
        const cards = Array.from({ length: matchCount }, (_, matchIndex) => {
          const firstRound = roundIndex === 0;
          const home = firstRound ? (halfSeeds[matchIndex * 2] || '轮空') : `上轮第 ${matchIndex * 2 + 1} 组胜者`;
          const away = firstRound ? (halfSeeds[matchIndex * 2 + 1] || '轮空') : `上轮第 ${matchIndex * 2 + 2} 组胜者`;
          const byeTeam = firstRound && allTeamsPlaced ? (home === '轮空' ? away : away === '轮空' ? home : '') : '';
          const firstSeedIndex = seedOffset + matchIndex * 2;
          return `<article class="knockout-tree-match${byeTeam ? ' has-bye' : ''}"><small>${firstRound ? '首轮签位' : '晋级路径'} ${matchIndex + 1}</small>${teamLine(home, firstRound, firstSeedIndex)}${teamLine(away, firstRound, firstSeedIndex + 1)}${byeTeam ? `<em>${esc(byeTeam)} 轮空晋级</em>` : ''}</article>`;
        }).join('');
        const actualMatchCount = roundIndex === 0
          ? Array.from({ length: matchCount }, (_, index) => Boolean(halfSeeds[index * 2] && halfSeeds[index * 2 + 1])).filter(Boolean).length
          : matchCount;
        const roundByeCount = roundIndex === 0 ? matchCount - actualMatchCount : 0;
        const statusText = roundIndex === 0 && !allTeamsPlaced
          ? `${halfSeeds.filter(Boolean).length} / ${halfSize} 队已放入`
          : `${actualMatchCount} 场${roundByeCount ? ` + ${roundByeCount} 轮空` : ''}`;
        return { matchCount, html: `<section class="knockout-zone-round${roundIndex === 0 ? ' first-round' : ' advance-round'}" style="--zone-match-count:${matchCount}"><header><b>${knockoutRoundLabel(bracketSize, roundIndex, roundCount)}</b><span>${statusText}</span></header><div>${cards}</div></section>` };
      });
      if (mirrored) rounds.reverse();
      const pieces = [];
      const columns = [];
      rounds.forEach((round, index) => {
        pieces.push(round.html);
        columns.push('minmax(110px,1fr)');
        if (index < rounds.length - 1) {
          pieces.push(connectorSvg(Math.max(round.matchCount, rounds[index + 1].matchCount), mirrored));
          columns.push('24px');
        }
      });
      return `<section class="knockout-zone knockout-zone-${zone}${mirrored ? ' mirrored' : ''}"><header><b>${zone === 'upper' ? '上半区' : '下半区'}</b><span>${halfSize} 个签位</span></header><div style="grid-template-columns:${columns.join(' ')}">${pieces.join('')}</div></section>`;
    };
    const upper = renderHalf(seeds.slice(0, halfSize), 'upper', false, 0);
    const lower = renderHalf(seeds.slice(halfSize), 'lower', true, halfSize);
    return `<div class="knockout-tree-scroll"><div class="knockout-zone-board" style="--half-rounds:${halfRoundCount}">${upper}<section class="knockout-final-center"><span>总决赛</span><div>${teamLine('上半区冠军', false)}<em>VS</em>${teamLine('下半区冠军', false)}</div><small>胜者为冠军</small></section>${lower}</div></div>`;
  }

  function renderKnockout() {
    const context = currentDrawContext();
    if (!context) return `${heading('淘汰赛签位', '请先完成组别设置和球队资格审核。')}<div class="panel module-empty">${icon('shuffle')}<b>暂无可抽签球队</b></div>`;
    const order = context.teamNames || [];
    const isDoubleKnockout = context?.config?.preset === 'double-knockout';
    const bracketSize = order.length > 1 ? 2 ** Math.ceil(Math.log2(order.length)) : Math.max(1, order.length);
    const seeds = Array.from({ length: bracketSize }, (_, index) => context.state.seedOrder?.[index] || '');
    const byeCount = Math.max(0, bracketSize - order.length);
    const placedCount = seeds.filter(Boolean).length;
    const saveSeedsButton = context.state.saved ? `<button type="button" class="btn primary" disabled>${icon('circle-check-big')} 签位已保存</button>` : btn('保存淘汰赛签位', 'save-knockout-draw', 'primary', 'save');
    return `<div class="primary-page draw-special-page">${drawWorkspaceNavigator(context)}${heading(isDoubleKnockout ? '双败淘汰签位' : context.config.preset === 'knockout-full-placement' ? '单败淘汰全员排位签位' : '单败淘汰签位', `为当前组别的 ${order.length} 支正式球队确定首轮签位；空签位自动轮空。`, `${btn('重新自动抽签', 'auto-knockout', 'outline', 'shuffle')}${btn('清空签位', 'reset-knockout-seeds', 'outline', 'circle-x')}${saveSeedsButton}`)}
      <div class="knockout-draw-layout">
        ${panel('参赛球队池', `<p class="knockout-drag-hint">将球队直接拖到下方淘汰赛对阵图的首轮空位；图中的球队也可以继续拖动交换。</p><div class="team-pool-inline knockout-team-pool">${order.map((name) => `<div class="draggable-team knockout-pool-team${seeds.includes(name) ? ' assigned' : ''}" draggable="true" data-knockout-team="${esc(name)}">${teamBadge(name, context?.teamLogos?.[name] || '')}<b>${esc(name)}</b><small>${seeds.includes(name) ? `签位 ${seeds.indexOf(name) + 1}` : '拖入对阵图'}</small></div>`).join('') || '<div class="empty-state compact">当前组别尚无球队</div>'}</div>`)}
        ${panel('淘汰赛对阵图', `<div class="knockout-bye-summary"><b>${order.length} 支球队</b><span>进入 ${bracketSize} 个标准签位</span><em>${placedCount === order.length ? (byeCount ? `${byeCount} 个轮空位` : '无轮空') : `已放入 ${placedCount} / ${order.length} 队`}</em></div>${renderKnockoutBracketTree(seeds, context)}<div class="info-banner">直接把球队拖入首轮空位；全部球队放入后，剩余空位自动作为轮空。保存签位后，自动排赛将严格读取该对阵树。</div>`)}
      </div></div>`;
  }

  function renderTeams() {
    const rows = [
      ['猛虎队','TIGER-2023001','张伟','138****5678','U12组','18人','已认领','第2版'],
      ['飞鹰队','EAGLE-2023012','李强','139****2468','U14组','16人','待认领','第1版'],
      ['星火队','SPARK-2023045','王磊','137****1357','U12组','14人','认证审核中','第3版'],
      ['飓风队','HURRI-2023056','陈晨','136****8642','U16组','15人','已认领','第2版'],
      ['闪电队','LIGHT-2023068','刘洋','150****9753','U14组','12人','待认领','第1版']
    ];
    const selected = rows.find((row) => row[0] === selectedTeamName) || rows[0];
    return `<div class="primary-page teams-page">
      <div class="table-toolbar teams-toolbar"><label class="icon-input">${icon('search')}<input data-filter-target="team-library-row" placeholder="搜索球队名称/负责人"></label><select class="control"><option>全部组别</option><option>U12组</option><option>U14组</option><option>U16组</option></select><select class="control"><option>全部认领状态</option><option>已认领</option><option>待认领</option></select><span></span><button class="btn outline" data-action="show-qr">查看小程序入驻码</button></div>
      <div class="teams-main-grid">
        <section class="panel teams-list-panel">
          <table class="data-table"><thead><tr><th>球队</th><th>长期球队ID</th><th>负责人</th><th>当前参赛组别</th><th>球员人数</th><th>认领状态</th><th>操作</th></tr></thead><tbody>
            ${rows.map((row)=>`<tr class="team-library-row ${row[0]===selected[0]?'selected':''}" data-search="${row.join(' ')}" data-team-name="${row[0]}"><td>${teamCell(row[0],row[1].split('-')[0])}</td><td>${row[1]}</td><td><b>${row[2]}</b><small class="cell-note">${row[3]}</small></td><td>${row[4]}</td><td>${row[5]}</td><td>${status(row[6],row[6]==='已认领'?'ok':row[6]==='待认领'?'warn':'live')}</td><td><button class="text-action" data-action="select-team" data-team="${row[0]}">查看球队</button>　<button class="text-action" data-action="${row[6]==='已认领'?'view-roster':'audit-team'}">${row[6]==='已认领'?'审核关系':'审核异常'}</button></td></tr>`).join('')}
          </tbody></table>
          <footer class="table-pagination"><span>共 5 支球队</span><div><button>‹</button><button class="active">1</button><button>›</button><select><option>10 条/页</option></select></div></footer>
        </section>
        <aside class="panel team-detail-panel">
          <header><div>${teamBadge(selected[0])}<div><h3>${selected[0]}</h3><span>长期球队ID　${selected[1]}</span></div></div><span class="relation-badge">本届赛事关系</span></header>
          <dl><div><dt>负责人</dt><dd>${selected[2]}（${selected[3]}）</dd></div><div><dt>长期成员</dt><dd>${selected[5]}</dd></div><div><dt>当前赛事</dt><dd>U12组（正式名单 12 人）</dd></div><div><dt>历史参赛</dt><dd>3 届</dd></div></dl>
          <div class="detail-actions"><button data-action="view-team">查看球队</button><button data-action="audit-team">审核关系</button></div>
          <section><h4>本届赛事关系</h4><dl><div><dt>参赛编号</dt><dd>HNYC-U12-009</dd></div><div><dt>名单版本</dt><dd>${selected[7]}</dd></div><div><dt>关系状态</dt><dd class="green-text">正常</dd></div><div><dt>最后更新时间</dt><dd>2026.07.18 10:30</dd></div></dl></section>
        </aside>
      </div>
      <div class="boundary-note">${icon('info')} 球队在赛小蜂篮球小程序中自行创建或认领，并维护球员与参赛关系；主办方 PC 仅查看进度、审核关系和处理异常。</div>
    </div>`;
  }

  function renderPlayers() {
    const players = [
      ['张子轩', '#4', '雷霆队', 'PG', '2014-05', '资料完整', '已通过'],
      ['李明宇', '#7', '雷霆队', 'SG', '2013-11', '资料完整', '待复核'],
      ['周浩然', '#9', '飞跃队', 'SF', '2014-03', '待补照片', '退回补充'],
      ['陈梓豪', '#12', '极光队', 'PF', '2014-08', '资料完整', '已通过'],
      ['赵天宇', '#15', '猎鹰队', 'C', '2014-01', '资料完整', '已通过']
    ];
    return `${heading('球员档案', '查看赛事球员基础档案、资格状态和数据服务状态。')}
      <div class="toolbar"><div class="toolbar-group"><input class="control search" placeholder="搜索姓名、号码或球队"><select class="control"><option>全部组别</option></select></div>${btn('导出球员库', 'export', 'outline', 'download')}</div>
      ${panel('球员列表', `<table class="data-table"><thead><tr><th>球员</th><th>号码</th><th>球队</th><th>位置</th><th>出生年月</th><th>资料</th><th>资格</th><th>数据包</th></tr></thead><tbody>${players.map(([name, number, team, position, birth, data, qualification], index) => `<tr><td><b>${name}</b></td><td>${number}</td><td>${teamCell(team)}</td><td>${position}</td><td>${birth}</td><td>${status(data, data === '资料完整' ? 'ok' : 'warn')}</td><td>${status(qualification, qualification === '已通过' ? 'ok' : qualification.includes('退回') ? 'error' : 'warn')}</td><td>${index < 3 ? status('已购买','live') : status('未购买')}</td></tr>`).join('')}</tbody></table>`)}
      <div class="info-banner">未购买个人数据包的球员仍会进入球队名单、赛程、比赛结果与基础得分记录；只是不生成完整个人技术统计报告。</div>`;
  }

  function avatarMarkup(player, className = 'player-avatar') {
    const label = String(player?.name || '球员').slice(0, 1);
    return player?.avatar
      ? `<img class="${className}" src="${esc(player.avatar)}" alt="${esc(player.name || '球员')}头像">`
      : `<span class="${className} placeholder-avatar" aria-label="${esc(player?.name || '球员')}头像">${esc(label)}</span>`;
  }

  function teamIdentifier(team) {
    return team?.longTeamId || team?.teamSystemId || team?.id || '—';
  }

  function renderTeamsLibrary() {
    const eventSpace = activeEventSpace();
    const rows = officialTeams(eventSpace);
    const groups = [...new Set(rows.map((team) => team.group).filter(Boolean))];
    if (!rows.some((team) => team.name === selectedTeamName)) selectedTeamName = rows[0]?.name || '';
    const selected = rows.find((team) => team.name === selectedTeamName) || rows[0];
    const groupOptions = `<option value="">全部组别</option>${groups.map((group) => `<option value="${esc(group)}"${teamLibraryGroupFilter === group ? ' selected' : ''}>${esc(group)}</option>`).join('')}`;
    const teamRows = rows.map((team) => {
      const count = usesPlayerData(eventSpace) ? (team.players || []).filter((player) => (player.reviewResult || '待审核') === '通过').length : 0;
      return `<tr class="team-library-row${team.name === selected?.name ? ' selected' : ''}" data-search="${esc([team.name, teamIdentifier(team), team.owner, team.phone, team.group].join(' '))}" data-group="${esc(team.group || '')}" data-status="已通过">
        <td>${teamCell(team.name, '', team.logo || '')}</td>
        <td>${esc(teamIdentifier(team))}</td>
        <td><b>${esc(team.owner || '—')}</b><small class="cell-note">${esc(maskMobile(team.phone))}</small></td>
        <td>${esc(team.group || '未分组')}</td>
        <td>${usesPlayerData(eventSpace) ? `${count} 人` : '仅球队'}</td>
        <td>${status('已通过', 'ok')}</td>
        <td><button type="button" class="text-action" data-action="select-team" data-team="${esc(team.name)}">查看球队</button><button type="button" class="text-action" data-action="view-team-audit" data-team-id="${esc(team.id)}">审核关系</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="7"><div class="module-empty compact">${icon('users-round')}<b>暂无正式参赛球队</b><span>球队完成认领并审核通过后，会自动出现在这里；不在此处创建第二份球队数据。</span>${btn('前往报名与资格', 'go-registration-progress', 'primary', 'chevron-right')}</div></td></tr>`;
    const rosterCount = selected ? (selected.players || []).filter((player) => (player.reviewResult || '待审核') === '通过').length : 0;
    return `<div class="primary-page teams-page">
      <div class="table-toolbar teams-toolbar"><label class="icon-input">${icon('search')}<input data-team-library-search placeholder="搜索球队名称/负责人"></label><select class="control" data-team-library-group-filter>${groupOptions}</select><select class="control" data-team-library-status-filter><option value="">全部赛事资格</option><option value="已通过" selected>已通过</option></select><span></span><small class="data-source-note">数据来自报名与资格 · 已认领且审核通过</small></div>
      <div class="teams-main-grid">
        <section class="panel teams-list-panel"><table class="data-table"><thead><tr><th>球队</th><th>长期球队ID</th><th>负责人</th><th>当前参赛组别</th><th>球员人数</th><th>赛事资格</th><th>操作</th></tr></thead><tbody>${teamRows}</tbody></table><footer class="table-pagination"><span data-team-library-count>共 ${rows.length} 支球队</span><div><button type="button">‹</button><button class="active" type="button">1</button><button type="button">›</button><select><option>10 条/页</option></select></div></footer></section>
        <aside class="panel team-detail-panel">${selected ? `<header><div>${teamBadge(selected.name, selected.logo || '')}<div><h3>${esc(selected.name)}</h3><span>长期球队ID　${esc(teamIdentifier(selected))}</span></div></div><span class="relation-badge">本届赛事关系</span></header><dl><div><dt>负责人</dt><dd>${esc(selected.owner || '—')}（${esc(maskMobile(selected.phone))}）</dd></div><div><dt>长期成员</dt><dd>${usesPlayerData(eventSpace) ? `${rosterCount} 人` : '不采集球员数据'}</dd></div><div><dt>当前赛事</dt><dd>${esc(selected.group || '未分组')}（正式参赛队）</dd></div><div><dt>认领状态</dt><dd class="green-text">已认领 · 已通过</dd></div></dl><div class="detail-actions"><button type="button" data-action="view-team" data-team-id="${esc(selected.id)}">查看球队</button><button type="button" data-action="view-team-audit" data-team-id="${esc(selected.id)}">审核记录</button></div><section><h4>本届赛事关系</h4><dl><div><dt>参赛编号</dt><dd>${esc(selected.id || '—')}</dd></div><div><dt>名单版本</dt><dd>${usesPlayerData(eventSpace) ? `已审核 ${rosterCount} 人` : '球队资料版'}</dd></div><div><dt>关系状态</dt><dd class="green-text">正常</dd></div><div><dt>最后更新时间</dt><dd>${esc(selected.qualificationUpdatedAt || selected.updatedAt || '—')}</dd></div></dl></section>` : `<div class="module-empty">${icon('users-round')}<b>等待审核通过</b><span>正式球队详情将在资格审核完成后显示。</span></div>`}</aside>
      </div>
      <div class="boundary-note">${icon('info')} 球队资料只在“报名与资格”中创建、认领和审核；这里是已审核正式参赛名单的赛事关系视图。</div>
    </div>`;
  }

  function renderPlayersArchive() {
    const eventSpace = activeEventSpace();
    const players = officialPlayers(eventSpace);
    const teams = [...new Set(players.map((player) => player.teamName).filter(Boolean))];
    if (!players.some((player) => player.key === selectedPlayerKey)) selectedPlayerKey = players[0]?.key || '';
    const selected = players.find((player) => player.key === selectedPlayerKey) || players[0];
    const teamOptions = `<option value="">全部球队</option>${teams.map((name) => `<option value="${esc(name)}"${playerArchiveTeamFilter === name ? ' selected' : ''}>${esc(name)}</option>`).join('')}`;
    const rows = players.map((player) => {
      const realName = player.realNameStatus || player.realName || '已实名';
      const dataStatus = player.dataStatus || (player.avatar ? '资料完成' : '待家长补充');
      return `<tr class="player-archive-row${player.key === selected?.key ? ' selected' : ''}" data-player-key="${esc(player.key)}" data-search="${esc([player.name, player.systemId, player.number, player.teamName].join(' '))}" data-team="${esc(player.teamName)}" data-realname="${esc(realName)}" data-data-status="${esc(dataStatus)}"><td><div class="player-cell">${avatarMarkup(player)}<b>${esc(player.name || '未命名球员')}</b></div></td><td>${esc(player.systemId || '—')}</td><td>${teamCell(player.teamName, '', player.team?.logo || '')}</td><td>${esc(player.birth || player.birthMonth || '—')}</td><td>${esc(player.guardianRelation || player.guardian || '—')}</td><td>${status(realName, realName.includes('待') ? 'warn' : 'ok')}</td><td>${status(player.avatar ? '已完成' : '待形象照', player.avatar ? 'ok' : 'warn')}</td><td>${status(dataStatus, dataStatus.includes('完成') ? 'ok' : 'warn')}</td><td><button type="button" class="text-action" data-action="select-player" data-player-key="${esc(player.key)}">查看</button></td></tr>`;
    }).join('') || `<tr><td colspan="9"><div class="module-empty compact">${icon('user-round')}<b>暂无正式球员档案</b><span>球队审核通过且球员资格通过后，会使用报名页的同一份资料自动生成档案。</span></div></td></tr>`;
    const selectedDataStatus = selected?.dataStatus || (selected?.avatar ? '资料完成' : '待家长补充');
    return `<div class="primary-page players-page"><div class="player-archive-toolbar"><div><select class="control" data-player-archive-team-filter>${teamOptions}</select><select class="control" data-player-archive-realname-filter><option value="">全部实名状态</option><option value="已实名"${playerArchiveRealNameFilter === '已实名' ? ' selected' : ''}>已实名</option><option value="待实名"${playerArchiveRealNameFilter === '待实名' ? ' selected' : ''}>待实名</option></select><select class="control" data-player-archive-data-filter><option value="">全部资料状态</option><option value="资料完成"${playerArchiveDataFilter === '资料完成' ? ' selected' : ''}>资料完成</option><option value="待家长补充"${playerArchiveDataFilter === '待家长补充' ? ' selected' : ''}>待家长补充</option></select></div><button type="button" class="btn primary" data-action="export-official-players">${icon('download')} 导出当前结果</button></div><div class="players-main-grid"><section class="panel players-list-panel"><table class="data-table"><thead><tr><th>球员</th><th>球员系统编号</th><th>当前球队</th><th>出生年月</th><th>监护关系</th><th>实名状态</th><th>形象照</th><th>资料状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table><footer class="table-pagination"><span data-player-archive-count>共 ${players.length} 条</span><div><button type="button">‹</button><button class="active" type="button">1</button><button type="button">›</button><select><option>10 条/页</option></select></div></footer></section><aside class="panel player-detail-panel">${selected ? `<header>${avatarMarkup(selected, 'player-profile-avatar')}<div><h3>${esc(selected.name || '未命名球员')}</h3><p>系统编号：${esc(selected.systemId || '—')}</p><p>出生年月：${esc(selected.birth || selected.birthMonth || '—')}</p><p>当前球队：${esc(selected.teamName)}</p><p>监护关系：${esc(selected.guardianRelation || selected.guardian || '—')}</p><p>实名状态：${status(selected.realNameStatus || selected.realName || '已实名', 'ok')}</p><p>形象照：${status(selected.avatar ? '已完成' : '待形象照', selected.avatar ? 'ok' : 'warn')}</p></div></header><section><h4>长期身份</h4><dl><div><dt>出生年月</dt><dd>${esc(selected.birth || selected.birthMonth || '—')}</dd></div><div><dt>监护关系</dt><dd>${esc(selected.guardianRelation || selected.guardian || '—')}</dd></div><div><dt>实名状态</dt><dd>${esc(selected.realNameStatus || selected.realName || '已实名')}</dd></div><div><dt>形象照</dt><dd>${esc(selected.avatar ? '已完成' : '待补充')}</dd></div></dl></section><section><h4>当前球队关系</h4><dl><div><dt>当前球队</dt><dd>${esc(selected.teamName)}</dd></div><div><dt>加入时间</dt><dd>${esc(selected.joinedAt || '本届报名')}</dd></div><div><dt>球队角色</dt><dd>${esc(selected.role || '球员')}</dd></div></dl></section><section><h4>本届赛事关系（非长期档案内容）</h4><dl><div><dt>参赛编号</dt><dd>${esc(selected.id || '—')}</dd></div><div><dt>球衣号码</dt><dd>${esc(selected.number || '—')}</dd></div><div><dt>资料状态</dt><dd class="green-text">${esc(selectedDataStatus)}</dd></div></dl></section><button type="button" class="btn primary detail-primary-action" data-action="view-player" data-player-key="${esc(selected.key)}">查看完整档案</button>` : `<div class="module-empty">${icon('user-round')}<b>暂无可展示球员</b><span>先在报名与资格中完成球队和球员审核。</span></div>`}</aside></div><div class="boundary-note">${icon('info')} 球员档案只展示已通过球队资格和球员资格的同一份报名资料；缺失头像时使用统一占位，不使用原型截图素材。</div></div>`;
  }

  function renderAutoSchedule() {
    const eventSpace = activeEventSpace();
    const plan = plannedScheduleSummary(eventSpace);
    const generatedRows = generatedScheduleRows(eventSpace);
    const hasGeneratedSchedule = generatedRows.length > 0;
    const plannedMatches = plan.maximum;
    const officialTeamCount = officialTeams(eventSpace).length;
    const venueSettings = eventVenueSettings(eventSpace);
    const courtResources = scheduleCourtResources(venueSettings, eventSpace);
    const courtCount = courtResources.length;
    const enabledVenueCount = (venueSettings?.venues || []).filter((venue) => venue.enabled !== false).length;
    const availability = venueSettings?.availability || {};
    const courtIntervalSummary = [...new Set(courtResources.map((resource) => `${resource.matchMinutes}+${resource.bufferMinutes}=${resource.matchMinutes + resource.bufferMinutes} 分钟`))].join(' / ') || '待设置';
    const dateRange = `${availability.startDate || eventSpace?.startDate || '待设置'} 至 ${availability.endDate || eventSpace?.endDate || '待设置'}`;
    const dailyCapacity = Math.max(1, venueResourceSummary(venueSettings).dailySlots);
    const estimatedDays = plannedMatches ? Math.ceil(plannedMatches / dailyCapacity) : 0;
    const dailyMatches = estimatedDays ? `${Math.ceil(plannedMatches / estimatedDays)} 场` : '—';
    const utilization = plannedMatches ? Math.min(100, Math.round(plannedMatches / Math.max(1, estimatedDays * dailyCapacity) * 100)) : 0;
    const checks = [['组别数据', `${plan.groupCount} / ${plan.groupCount}`],['参赛球队', `${officialTeamCount} / ${plan.targetTeams || officialTeamCount}`],['场馆与球场', `${courtCount} / ${courtCount}`],['时间窗口','完整'],['冲突规则','已设置']];
    return `<div class="primary-page auto-schedule-page">
      ${scheduleFeasibilityAlert(eventSpace, scheduleStageOrderIssues(generatedRows, availability))}
      ${eventSpace.scheduleStale ? `<div class="info-banner warning">${icon('triangle-alert')} 当前日历是旧赛程，请重新生成。</div>` : ''}
      <div class="schedule-layout">
        <section class="schedule-workflow">
          <article class="workflow-block" data-step="1"><header><div><h3>数据校验</h3><p>系统读取组别、赛制、球队和抽签结果</p></div>${status('全部通过','ok')}</header><div class="schedule-check-grid">${checks.map(([label,value])=>`<div>${icon('circle-check-big')}<span>${label}</span><b>${value}</b></div>`).join('')}</div><small>所有必需数据已就绪，可进入下一步。如需修改，请前往相关模块处理。</small></article>
          <article class="workflow-block" data-step="2"><header><div><h3>时间与场馆</h3><p>设置赛事日期、上午/下午首场、最晚结束时间和球场</p></div><button data-action="go-schedule-settings">编辑</button></header><div class="schedule-facts"><div>${icon('calendar-days')}<span>赛事日期</span><b>${dateRange}</b></div><div>${icon('clock-3')}<span>每日开赛时段</span><b>${(availability.morningStartTime || availability.startTime || '待设置')} / ${availability.afternoonStartTime || '待设置'}</b></div><div>${icon('clock-3')}<span>最晚结束</span><b>${availability.endTime || '待设置'}</b></div><div>${icon('land-plot')}<span>单场 / 缓冲</span><b>${availability.matchMinutes || '—'} / ${availability.bufferMinutes || '—'} 分钟</b></div><div>${icon('land-plot')}<span>场馆与场地</span><b>${enabledVenueCount} 个场馆，${courtCount} 片场地</b></div></div></article>
          <article class="workflow-block" data-step="3"><header><div><h3>排赛约束</h3><p>系统优先满足硬性约束，再优化赛程体验</p></div><button data-action="edit-constraints">编辑</button></header><div class="constraint-grid"><div><b>同队不同时开赛</b><span class="switch on"></span></div><div><b>同队每半天最多一场</b><strong>硬约束</strong></div><div><b>同一球场不重叠</b><span class="switch on"></span></div><div><b>小组赛允许多场并行</b><span class="switch on"></span></div><div><b>半决赛与决赛逐场进行</b><strong>默认规则</strong></div><div><b>淘汰赛等待上轮结果</b><span class="switch on"></span></div></div><div class="key-match-rule-note">${icon('trophy')} 关键场次默认集中在主场地逐场进行，便于观众、裁判和直播聚焦；如无需单场进行，可在赛程日历中手动拖拽为并行场次。</div></article>
          <article class="workflow-block preview-block" data-step="4"><header><div><h3>${hasGeneratedSchedule ? '已建比赛' : '生成预览'}</h3><p>${hasGeneratedSchedule ? '赛历与场次列表均读取已生成比赛，不再使用预估或示例数据。' : '系统将根据当前组别赛制生成赛程草案。'}</p></div>${hasGeneratedSchedule ? status('已生成','ok') : status('等待生成')}</header><div class="preview-stats"><div><span>${hasGeneratedSchedule ? '已建比赛' : '预计比赛场次'}</span><b>${hasGeneratedSchedule ? generatedRows.length : plan.label} 场</b></div><div><span>${hasGeneratedSchedule ? '比赛日期' : '预计比赛日数'}</span><b>${hasGeneratedSchedule ? new Set(generatedRows.map((match) => String(match.time).split(' ')[0])).size : (estimatedDays || '—')}${hasGeneratedSchedule || estimatedDays ? ' 天' : ''}</b></div><div><span>每日场次</span><b>${hasGeneratedSchedule ? `${Math.max(...Object.values(generatedRows.reduce((counts, match) => { const date = String(match.time).split(' ')[0]; counts[date] = (counts[date] || 0) + 1; return counts; }, {})))} 场` : dailyMatches}</b></div><div><span>使用场地数</span><b>${hasGeneratedSchedule ? new Set(generatedRows.map((match) => match.venue)).size : courtCount} 片</b></div><div><span>资源利用率（预计）</span><b>${utilization}%</b><i><em style="width:${utilization}%"></em></i></div><div><span>${hasGeneratedSchedule ? '数据来源' : '预计完成时间'}</span><b>${hasGeneratedSchedule ? '已建比赛' : (plannedMatches ? '约 1 - 2 分钟' : '待配置赛制')}</b></div></div></article>
        </section>
        <aside class="schedule-side">
          <section class="panel readiness-panel"><h3>排赛前检查</h3>${checks.map(([label,value])=>`<div>${icon('circle-check-big')}<span>${label}</span><b>${value}</b></div>`).join('')}</section>
          <section class="panel schedule-tips"><h3>${icon('info')} 提示</h3><p>自动生成后将进入多组别统一日历，可手动调整并实时检查冲突。</p><p>已发布赛程再次生成前需确认是否保留已通知的场次。</p></section>
        </aside>
      </div>
      <div class="schedule-actions">${btn(hasGeneratedSchedule ? '查看已建场次' : '保存排赛条件', hasGeneratedSchedule ? 'go-schedule-matches' : 'save-schedule-rules', 'outline', hasGeneratedSchedule ? 'calendar-days' : 'save')}${btn(hasGeneratedSchedule ? '重新生成赛程' : '自动生成赛程','generate-schedule','primary',hasGeneratedSchedule ? 'refresh-cw':'circle-play')}</div>
    </div>`;
  }

  function renderCalendar() {
    const eventSpace = activeEventSpace();
    const scheduleRows = generatedScheduleRows(eventSpace);
    const configuredTimeSlots = Array.isArray(eventSpace.calendarTimeSlots) ? eventSpace.calendarTimeSlots : [];
    if (!scheduleRows.length) {
      return `${heading('赛程日历', '展示当前赛事全部组别的已建比赛；先完成赛程设置，再生成并保存赛程。', `${btn('赛程设置', 'go-schedule-settings', 'outline', 'settings')}${btn('重新自动排赛', 'generate-schedule', 'primary', 'refresh-cw')}`)}
        ${scheduleFeasibilityAlert(eventSpace)}
        <div class="empty-state">${icon('calendar-days','empty-icon')}<b>暂无已建比赛</b><span>请先在赛程设置中统一配置全部组别共用的比赛日、场地和时间，再自动排赛。</span><div>${btn('前往赛程设置', 'go-schedule-settings', 'primary', 'settings')}</div></div>`;
    }
    const byDay = scheduleRows.reduce((days, match) => {
      const date = String(match.time || '').split(' ')[0] || '待排日期';
      (days[date] ||= []).push(match);
      return days;
    }, {});
    configuredTimeSlots.forEach((slot) => {
      if (slot && typeof slot === 'object' && slot.date && slot.time) byDay[slot.date] ||= [];
    });
    const venueCount = new Set(scheduleRows.map((match) => match.venue)).size;
    const calendarCourts = scheduleCourtNames(eventVenueSettings());
    const configuredTimes = configuredTimeSlots.map((slot) => typeof slot === 'string' ? slot : slot?.time).filter(Boolean);
    const calendarTimes = [...new Set([...scheduleRows.map((match) => String(match.time).split(' ')[1]).filter(Boolean), ...configuredTimes])].sort();
    const venueOptions = `<option value="">全部场地</option>${calendarCourts.map((venue) => `<option value="${esc(venue)}"${calendarVenueFilter === venue ? ' selected' : ''}>${esc(venue)}</option>`).join('')}`;
    const timeOptions = `<option value="">全部时间段</option>${calendarTimes.map((time) => `<option value="${esc(time)}"${calendarTimeFilter === time ? ' selected' : ''}>${esc(time)}</option>`).join('')}`;
    const plan = plannedScheduleSummary(eventSpace);
    const availability = eventVenueSettings(eventSpace)?.availability || {};
    const teamPeriodIssues = scheduleTeamPeriodIssues(scheduleRows, availability);
    const stageOrderIssues = scheduleStageOrderIssues(scheduleRows, availability);
    const scheduleSaved = eventSpace.scheduleSavedAt ? new Date(eventSpace.scheduleSavedAt).toLocaleString('zh-CN', { hour12: false }) : '尚未保存';
    return `${heading('赛程日历', '按真实比赛日汇总全部组别的已建比赛；保存后同步更新场次表与导出内容。', `${btn('赛程设置', 'go-schedule-settings', 'outline', 'settings')}${btn('新增时间段', 'add-calendar-time-slot', 'outline', 'clock-3')}${btn('新增场地', 'add-calendar-court', 'outline', 'land-plot')}${btn('清空赛程', 'clear-calendar-schedule', 'danger', 'trash-2')}${btn('保存赛程', 'save-calendar-schedule', 'primary', 'save')}`)}
      ${scheduleFeasibilityAlert(eventSpace, stageOrderIssues)}
      ${eventSpace.scheduleStale ? `<div class="info-banner warning">${icon('triangle-alert')} 当前日历是旧赛程，请重新生成。</div>` : ''}
      <section class="calendar-schedule-control"><div class="calendar-control-main"><div><span>全赛事排赛设置</span><b>${plan.label} 场计划比赛</b><small>${availability.startDate || eventSpace.startDate} 至 ${availability.endDate || eventSpace.endDate}　上午 ${availability.morningStartTime || availability.startTime || '09:00'}—${availability.morningEndTime || '12:00'}　下午 ${availability.afternoonStartTime || '14:00'}—${availability.afternoonEndTime || availability.endTime || '18:00'}${availability.eveningEnabled ? `　晚上 ${availability.eveningStartTime || '19:00'}—${availability.eveningEndTime || '21:30'}` : ''}</small></div><div class="calendar-control-actions">${btn('赛程设置', 'go-schedule-settings', 'outline', 'settings')}${btn('重新自动排赛', 'generate-schedule', 'outline', 'refresh-cw')}</div></div><div class="calendar-control-note">${icon('info')} 当前日历覆盖全部组别。拖拽、换场、加场后请点击“保存赛程”；最近保存：${scheduleSaved}</div></section>
      <section class="schedule-calendar-summary"><div><span>已建比赛</span><b>${scheduleRows.length} 场</b></div><div><span>比赛日</span><b>${Object.keys(byDay).length} 天</b></div><div><span>使用场地</span><b>${venueCount} 片</b></div><div><span>关键场次</span><b>${scheduleRows.filter(isKeyScheduleMatch).length} 场逐场进行</b></div></section>
      <div class="toolbar schedule-calendar-toolbar"><div class="toolbar-group"><select class="control" data-calendar-venue-filter>${venueOptions}</select><select class="control" data-calendar-time-filter>${timeOptions}</select></div><span>拖到空白单元格可调整；拖到已有比赛可交换。</span></div>
      <section class="schedule-day-list">${Object.entries(byDay).sort(([left], [right]) => String(left).localeCompare(String(right))).map(([date, matches]) => { const courts = (calendarCourts.length ? calendarCourts : [...new Set(matches.map((match) => match.venue))]).filter((court) => !calendarVenueFilter || court === calendarVenueFilter); const dayConfiguredTimes = configuredTimeSlots.map((slot) => typeof slot === 'string' ? slot : (slot?.date === date ? slot.time : '')).filter(Boolean); const timeSlots = [...new Set([...matches.map((match) => String(match.time).split(' ')[1]).filter(Boolean), ...dayConfiguredTimes])].sort().filter((time) => !calendarTimeFilter || time === calendarTimeFilter); return `<article class="schedule-day-panel"><header><div><b>${scheduleDayLabel(date)}</b><small>${matches.length} 场已建比赛</small></div><span>${matches.map((match) => match.phase).filter((value, index, array) => array.indexOf(value) === index).join(' · ') || '待添加场次'}</span></header><div class="unified-calendar-grid" style="--calendar-courts:${courts.length}"><div class="calendar-grid-corner">时间 / 场地</div>${courts.map((court) => `<div class="calendar-grid-court">${court}</div>`).join('')}${timeSlots.map((time) => `${calendarTimeCell(date, time, matches)}${courts.map((court) => { const match = matches.find((item) => String(item.time).split(' ')[1] === time && item.venue === court); const tone = match?.subgroup === 'A组' ? 'group-a' : match?.subgroup === 'B组' ? 'group-b' : 'group-knockout'; const keyClass = match && isKeyScheduleMatch(match) ? ' key-match' : ''; return `<div class="calendar-grid-cell" data-schedule-drop-date="${date}" data-schedule-drop-time="${time}" data-schedule-drop-venue="${court}">${match ? `<button type="button" class="calendar-grid-match ${tone}${keyClass}" draggable="true" data-schedule-match-id="${match.id}" data-action="match-detail"><small>${match.phase}${match.subgroup ? ` · ${match.subgroup}` : ''} · ${match.round}</small><b>${match.group}</b><span class="calendar-team-versus">${teamBadge(match.home, teamLogoFor(match.home, eventSpace))}<strong>${match.home}</strong><em>VS</em><strong>${match.away}</strong>${teamBadge(match.away, teamLogoFor(match.away, eventSpace))}</span></button>` : `<button type="button" class="calendar-grid-empty add-match-cell" data-action="add-schedule-match" data-schedule-date="${date}" data-schedule-time="${time}" data-schedule-venue="${court}">＋ 添加场次</button>`}</div>`; }).join('')}`).join('')}</div></article>`; }).join('')}</section>
      <div class="info-banner${teamPeriodIssues.length || stageOrderIssues.length ? ' warning' : ''}">${icon(teamPeriodIssues.length || stageOrderIssues.length ? 'triangle-alert' : 'shield-check')} 当前已建 ${scheduleRows.length} 场比赛：${stageOrderIssues.length ? `发现 ${stageOrderIssues.length} 处阶段顺序冲突，小组赛结束前不得进入半决赛` : teamPeriodIssues.length ? `发现 ${teamPeriodIssues.length} 处同队半天多场冲突，请调整后保存` : '未发现阶段倒置或同队半天多场冲突'}。</div>`;
  }

  function renderMatches() {
    const eventSpace = activeEventSpace();
    const legacyPlaceholderTeam = (name) => /^(?:全部球队(?:单循环)?待定|待抽签球队)\s*\d+$/.test(String(name || '').trim());
    const allRows = generatedScheduleRows(eventSpace).filter((match) => (
      !legacyPlaceholderTeam(match.home)
      && !legacyPlaceholderTeam(match.away)
      && !/名次层/.test(String(match.round || ''))
    ));
    const groupValues = [...new Set([
      ...(eventSpace?.groupRows || []).map((group) => group.name),
      ...allRows.map((match) => match.competitionGroup || baseCompetitionGroup(match.group))
    ].filter(Boolean))];
    if (!groupValues.includes(matchSheetFilters.group)) {
      matchSheetFilters.group = groupValues[0] || '';
      matchSheetFilters.subgroup = '';
    }
    const currentGroupRows = allRows.filter((match) => (match.competitionGroup || baseCompetitionGroup(match.group)) === matchSheetFilters.group);
    const currentGroup = (eventSpace?.groupRows || []).find((group) => group.name === matchSheetFilters.group);
    const currentDrawState = eventSpace?.drawStates?.[currentGroup?.id] || {};
    const selectedGroupConfig = competitionConfig(currentGroup);
    const selectedGroupTeamCount = Math.max(2, Number(currentGroup?.target || selectedGroupConfig?.groupCount * selectedGroupConfig?.teamsPerGroup || 2));
    const inferredPlacementTeamCount = ({ 12: 8, 32: 16, 80: 32 })[currentGroupRows.length] || 0;
    const placementScheduleTeamCount = [8, 16, 32].includes(inferredPlacementTeamCount) ? inferredPlacementTeamCount : selectedGroupTeamCount;
    const fullPlacementMatchCount = placementScheduleTeamCount / 2 * Math.log2(placementScheduleTeamCount);
    const legacyFullPlacementSchedule = [8, 16, 32].includes(placementScheduleTeamCount)
      && currentGroupRows.length === fullPlacementMatchCount
      && currentGroupRows.some((match) => /8强|16强|32强|1\/\d+决赛/.test(String(match.round || '')));
    const usesFullPlacementSchedule = selectedGroupConfig?.preset === 'knockout-full-placement' || legacyFullPlacementSchedule;
    const fullPlacementReferences = usesFullPlacementSchedule
      ? knockoutFullPlacementReferences(selectedGroupConfig, placementScheduleTeamCount)
      : new Map();
    const fullPlacementLabels = usesFullPlacementSchedule
      ? new Map(knockoutFullPlacementPlan(placementScheduleTeamCount).matches.map((match) => [match.serial, match.round]))
      : new Map();
    const displayRoundLabel = (match, index = 0) => {
      const serial = Number(match.competitionSerial || index + 1);
      if (fullPlacementLabels.has(serial)) return fullPlacementLabels.get(serial);
      const references = fullPlacementReferences.get(serial) || [];
      const sourceSerials = references.map((value) => Number(String(value).match(/场序(\d+)/)?.[1] || 0));
      const outcome = references.length && references.every((value) => String(value).endsWith('胜者')) ? '胜者'
        : references.length && references.every((value) => String(value).endsWith('负者')) ? '负者' : '';
      const sourceMinimum = Math.min(...sourceSerials.filter(Boolean));
      const sourceMaximum = Math.max(...sourceSerials.filter(Boolean));
      if (placementScheduleTeamCount === 8) {
        if (sourceMinimum >= 1 && sourceMaximum <= 4 && outcome === '胜者') return '半决赛';
        if (sourceMinimum >= 1 && sourceMaximum <= 4 && outcome === '负者') return '5-8名排位赛';
        if (sourceMinimum >= 5 && sourceMaximum <= 6 && outcome === '胜者') return '决赛';
        if (sourceMinimum >= 5 && sourceMaximum <= 6 && outcome === '负者') return '3、4名决赛';
        if (sourceMinimum >= 7 && sourceMaximum <= 8 && outcome === '胜者') return '5-6名排位赛';
        if (sourceMinimum >= 7 && sourceMaximum <= 8 && outcome === '负者') return '7-8名排位赛';
      }
      if (!usesFullPlacementSchedule) return match.round || '—';
      if (serial >= 1 && serial <= placementScheduleTeamCount / 2) return `1/${placementScheduleTeamCount / 2}决赛`;
      if (serial >= 5 && serial <= 6) return '半决赛';
      if (serial >= 7 && serial <= 8) return '5-8名排位赛';
      return ({ 9: '决赛', 10: '3、4名决赛', 11: '5-6名排位赛', 12: '7-8名排位赛' })[serial] || match.round || '—';
    };
    const sheetRows = currentGroupRows.filter((match) => (
      (!matchSheetFilters.phase || match.phase === matchSheetFilters.phase)
      && (!matchSheetFilters.round || displayRoundLabel(match) === matchSheetFilters.round)
      && (!matchSheetFilters.subgroup || match.subgroup === matchSheetFilters.subgroup)
      && (!matchSheetFilters.team || match.home === matchSheetFilters.team || match.away === matchSheetFilters.team)
      && (!matchSheetFilters.venue || match.venue === matchSheetFilters.venue)
      && (!matchSheetFilters.state || match.state === matchSheetFilters.state)
    )).sort((left, right) => {
      const timeCompare = String(left.time || '').localeCompare(String(right.time || ''));
      const serialCompare = Number(left.competitionSerial || 0) - Number(right.competitionSerial || 0);
      return timeCompare || serialCompare || String(left.venue || '').localeCompare(String(right.venue || ''));
    });
    const valuesFor = (key) => [...new Set(currentGroupRows.map((match) => match[key]).filter(Boolean))];
    const roundValues = [...new Set(currentGroupRows.map((match, index) => displayRoundLabel(match, index)).filter(Boolean))];
    const officialGroupTeamNames = officialTeams(eventSpace).filter((team) => team.group === matchSheetFilters.group).map((team) => team.name);
    const savedDrawTeamNames = [
      ...(Array.isArray(currentDrawState.order) ? currentDrawState.order : []),
      ...(Array.isArray(currentDrawState.seedOrder) ? currentDrawState.seedOrder : []),
      ...Object.keys(currentDrawState.assignments || {}).sort().flatMap((letter) => currentDrawState.assignments[letter] || [])
    ];
    const scheduleReferenceName = (name) => /^(?:A|B|C|D)组第\d+|^场序\d+(?:胜者|负者)|待定|轮空|全部球队/.test(String(name || '').trim());
    const teamNames = [...new Set([...officialGroupTeamNames, ...savedDrawTeamNames].filter((name) => name && !scheduleReferenceName(name)))];
    const optionSet = (values, selected, label) => `<option value="">${label}</option>${values.map((value) => `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${esc(value)}</option>`).join('')}`;
    const spans = (keyFor) => {
      const result = new Map();
      for (let index = 0; index < sheetRows.length;) {
        const key = keyFor(sheetRows[index]);
        let end = index + 1;
        while (end < sheetRows.length && keyFor(sheetRows[end]) === key) end += 1;
        result.set(index, end - index);
        index = end;
      }
      return result;
    };
    const dateSpans = spans((match) => String(match.time || '').split(' ')[0]);
    const roundSpans = spans((match) => `${String(match.time || '').split(' ')[0]}|${displayRoundLabel(match)}`);
    const venueNameOf = (value) => String(value || '').split('·')[0].trim() || '待安排';
    const courtNumberOf = (value) => {
      const text = String(value || '');
      const number = text.match(/(?:球场|场地)\s*([A-Za-z0-9]+)/)?.[1] || text.match(/([A-Za-z0-9]+)(?:半场)?$/)?.[1];
      return number || text.replace(/^.*?·\s*/, '').replace(/球场|场地|半场/g, '').trim() || '—';
    };
    const scheduleVenues = [...new Set(sheetRows.map((match) => venueNameOf(match.venue)).filter(Boolean))];
    const subgroupValues = [...new Set(currentGroupRows.map((match) => match.subgroup).filter(Boolean))];
    const groupTitle = matchSheetFilters.group || '当前组别';
    const groupTabs = groupValues.map((group) => {
      const count = allRows.filter((match) => (match.competitionGroup || baseCompetitionGroup(match.group)) === group).length;
      return `<button type="button" class="${matchSheetFilters.group === group ? 'active' : ''}" data-action="select-schedule-sheet-group" data-group="${esc(group)}"><b>${esc(group)}</b><small>${count} 场</small></button>`;
    }).join('');
    const formatScheduleDate = (value) => {
      const [year, month, day] = String(value || '').split('-');
      if (!year || !month || !day) return esc(value || '—');
      const weekday = ['日','一','二','三','四','五','六'][new Date(`${value}T00:00:00`).getDay()];
      return `${Number(month)}月<br>${Number(day)}日<br>（${weekday}）`;
    };
    const semifinalIndexes = sheetRows.map((match, index) => /半决赛/.test(match.round || '') ? index + 1 : 0).filter(Boolean);
    const displayOpponents = (match, index) => {
      const serialReference = fullPlacementReferences.get(Number(match.competitionSerial || index + 1));
      if (serialReference) return serialReference;
      if (/半决赛/.test(match.round || '') && semifinalIndexes.length === 2) {
        const semifinalIndex = semifinalIndexes.indexOf(index + 1);
        return semifinalIndex === 0 ? ['A组第一', 'B组第二'] : ['B组第一', 'A组第二'];
      }
      if (/三.?四名/.test(match.round || '') && semifinalIndexes.length >= 2) return [`场序${semifinalIndexes[0]}负者`, `场序${semifinalIndexes[1]}负者`];
      if (/^决赛$/.test(match.round || '') && semifinalIndexes.length >= 2) return [`场序${semifinalIndexes[0]}胜者`, `场序${semifinalIndexes[1]}胜者`];
      const normalizeLegacyLeagueTeam = (name) => String(name || '待定').replace(/^全部球队(?:单循环)?待定\s*/i, '全部球队 ');
      return [normalizeLegacyLeagueTeam(match.home), normalizeLegacyLeagueTeam(match.away)];
    };
    const bodyRows = sheetRows.map((match, index) => {
      const [date, time] = String(match.time || '').split(' ');
      const [home, away] = displayOpponents(match, index);
      const serial = Number(match.competitionSerial || index + 1);
      const baseGroup = match.competitionGroup || baseCompetitionGroup(match.group) || '—';
      return `<tr>${dateSpans.has(index) ? `<td class="schedule-date-cell" rowspan="${dateSpans.get(index)}">${formatScheduleDate(date)}</td>` : ''}<td>${esc(time || '—')}</td>${roundSpans.has(index) ? `<td class="schedule-round-cell" rowspan="${roundSpans.get(index)}">${esc(displayRoundLabel(match, index))}</td>` : ''}<td>${esc(baseGroup)}</td><td>${esc(match.subgroup || '—')}</td><td class="schedule-teams-cell"><b>${esc(home)}</b><span>VS</span><b>${esc(away)}</b></td><td class="schedule-court-cell">${esc(courtNumberOf(match.venue))}</td><td class="schedule-serial-cell">${serial}</td></tr>`;
    }).join('') || '<tr><td colspan="8" class="schedule-sheet-empty">暂无符合当前筛选条件的竞赛日程</td></tr>';
    const orientationActions = `<span class="schedule-orientation-switch"><button type="button" class="${competitionScheduleOrientation === 'portrait' ? 'active' : ''}" data-action="set-schedule-orientation" data-orientation="portrait">A4 竖版</button><button type="button" class="${competitionScheduleOrientation === 'landscape' ? 'active' : ''}" data-action="set-schedule-orientation" data-orientation="landscape">A4 横版</button></span>`;
    const isRoundRobinGroup = ['round-robin', 'double-round', 'group-round-robin'].includes(selectedGroupConfig?.preset)
      || /单循环|双循环/.test(String(currentGroup?.competition || ''));
    const savedRoundRobinOrder = isRoundRobinGroup && currentDrawState.saved && Array.isArray(currentDrawState.order) ? currentDrawState.order.filter(Boolean) : [];
    const staleScheduleNotice = eventSpace.scheduleStale
      ? savedRoundRobinOrder.length
        ? `<div class="info-banner warning">${icon('triangle-alert')} ${esc(groupTitle)} 已保存 ${savedRoundRobinOrder.length} 支球队的循环排序，但当前仍是旧赛程。请按已保存顺序重新排赛，系统将生成 ${savedRoundRobinOrder.length - 1} 轮、${savedRoundRobinOrder.length * (savedRoundRobinOrder.length - 1) / 2} 场不重复对阵。${btn('按循环排序重新排赛', 'generate-schedule', 'outline', 'refresh-cw')}</div>`
        : `<div class="info-banner warning">${icon('triangle-alert')} 赛制结构已经修正，旧版“名次层”和占位球队赛程已停止展示。请按新赛制重新生成：各名次区间先交叉对阵，再由胜者、负者分别进行名次赛。${btn('按新赛制重新排赛', 'generate-schedule', 'outline', 'refresh-cw')}</div>`
      : '';
    const emptyGroupNotice = currentGroupRows.length || eventSpace.scheduleStale ? '' : `<div class="info-banner warning">${icon('triangle-alert')} 当前组别尚未取得正式球队名单或已保存的真实抽签结果，因此不生成虚拟球队和占位赛程。请先完成球队准入与抽签，再重新自动排赛。</div>`;
    return `${heading('竞赛日程', '每个竞赛组别生成独立日程文件；打印和导出只包含当前组别。', `${orientationActions}${btn('导出当前组别', 'export-schedule-sheet', 'outline', 'download')}${btn('打印当前组别', 'print-schedule-sheet', 'primary', 'printer')}`)}
      <nav class="schedule-group-tabs" aria-label="竞赛组别日程">${groupTabs}</nav>
      ${staleScheduleNotice}
      ${emptyGroupNotice}
      <div class="schedule-sheet-filters"><select class="control" data-match-sheet-filter="phase">${optionSet(valuesFor('phase'), matchSheetFilters.phase, '全部阶段')}</select><select class="control" data-match-sheet-filter="round">${optionSet(roundValues, matchSheetFilters.round, '全部轮次')}</select><select class="control" data-match-sheet-filter="subgroup">${optionSet(subgroupValues, matchSheetFilters.subgroup, '全部分组')}</select><select class="control" data-match-sheet-filter="team">${optionSet(teamNames, matchSheetFilters.team, '全部球队')}</select><select class="control" data-match-sheet-filter="venue">${optionSet(valuesFor('venue'), matchSheetFilters.venue, '全部场地')}</select><select class="control" data-match-sheet-filter="state">${optionSet(valuesFor('state'), matchSheetFilters.state, '全部状态')}</select>${btn('清除当前组筛选', 'reset-schedule-sheet-filter', 'outline', 'refresh-cw')}</div>
      <style id="schedulePrintOrientation">@media print{@page{size:A4 ${competitionScheduleOrientation};margin:9mm}}</style><section class="schedule-sheet-preview competition-schedule-sheet ${competitionScheduleOrientation}"><header><div class="competition-sheet-heading"><span>赛小蜂篮球 · 正式竞赛文件</span><h2>竞赛日程（${esc(groupTitle)}）</h2><p>赛事：${esc(eventSpace?.name || '赛事')}　｜　共 ${sheetRows.length} 场</p></div><div class="competition-sheet-venue"><small>场馆</small><b>${esc(scheduleVenues.join('、') || '待安排')}</b></div></header><table><colgroup><col class="col-date"><col class="col-time"><col class="col-round"><col class="col-group"><col class="col-subgroup"><col class="col-teams"><col class="col-venue"><col class="col-serial"></colgroup><thead><tr><th>日期</th><th>时间</th><th>轮次</th><th>组别</th><th>分组</th><th>比赛队</th><th>场地</th><th>场序</th></tr></thead><tbody>${bodyRows}</tbody></table><footer><span>注：比赛时间与场地以主办方最新发布的竞赛日程为准。</span><span>制表日期：${new Date().toLocaleDateString('zh-CN')}</span></footer></section>`;
  }

  function renderMatchDetail() {
    return `${heading('场次详情 · G1003', '集中查看单场比赛信息、名单、技术台人员与控制台连接。', btn('保存场次', 'save-page', 'primary', 'save'))}
      <div class="match-hero panel">
        <div><span>U12 竞技组 · 第 3 轮</span><b>2026-07-20 10:15</b><small>${icon('map-pin')} 浦东体育馆 A场</small></div>
        <div class="match-versus">${teamCell('蓝鲸队')}<strong>VS</strong>${teamCell('勇士队')}</div>
        <div><span>状态</span>${status('人员待确认','warn')}<small>赛前 48 小时</small></div>
      </div>
      <div class="bottom-grid">
        ${panel('球队与名单', `<div class="exception-list"><div><span>蓝鲸队正式名单</span><b class="green-text">12 人已锁定</b></div><div><span>勇士队正式名单</span><b class="green-text">11 人已锁定</b></div></div>${btn('查看双方名单', 'go-rosters', 'outline', 'users-round')}`)}
        ${panel('现场人员任务', `<div class="exception-list"><div><span>主控计分</span><b>王教练</b></div><div><span>球员数据</span><b class="orange-text">李娜 · 待接受</b></div><div><span>MC 控制</span><b>陈教练</b></div></div>${btn('管理人员任务', 'go-people', 'outline', 'users-round')}`)}
        ${panel('控制台', `<div class="exception-list"><div><span>主控设备</span><b class="green-text">在线</b></div><div><span>数据台</span><b>未连接</b></div><div><span>MC 台</span><b class="green-text">在线</b></div></div>${btn('查看设备状态', 'go-consoles', 'outline', 'monitor-cog')}`)}
      </div>`;
  }

  function renderScheduleVenues() {
    const rows = [
      ['蜂动体育中心','1号场','07-18—08-26','09:00—21:00','28 场','正常'],
      ['蜂动体育中心','2号场','07-18—08-26','09:00—21:00','26 场','正常'],
      ['蜂动体育中心','3号场','07-18—08-26','12:00—20:00','12 场','正常'],
      ['浦东体育馆','A场','07-20—08-20','09:00—18:00','14 场','正常'],
      ['浦东体育馆','B场','07-20—08-20','09:00—18:00','6 场','07-27 停用']
    ];
    return `${heading('场馆与球场', '为自动排赛维护球场可用日期、每日时段和停用规则。', btn('新增球场', 'add-court', 'primary', 'plus'))}
      ${panel('球场可用性', `<table class="data-table"><thead><tr><th>场馆</th><th>球场</th><th>可用日期</th><th>每日时段</th><th>已排场次</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(([venue,court,dates,times,count,state]) => `<tr><td>${venue}</td><td><b>${court}</b></td><td>${dates}</td><td>${times}</td><td>${count}</td><td>${status(state,state==='正常'?'ok':'warn')}</td><td>${btn('设置', 'edit-court', 'small', 'settings')}</td></tr>`).join('')}</tbody></table>`)}
    `;
  }

  const onsiteRoleMeta = {
    scorer: { label: '计分员', source: '内部教练', permission: '仅获得本场比分、比赛时间及节次操作权限', icon: 'clipboard-check' },
    recorder: { label: '记录员/数据员', source: '外请人员', permission: '仅获得本场球员数据记录权限', icon: 'list-checks' },
    mc: { label: 'MC', source: '内部教练', permission: '仅获得本场音效与播报控制权限', icon: 'volume-2' }
  };
  const onsiteRoleChoices = Object.entries(onsiteRoleMeta).map(([key, meta]) => ({ key, label: meta.label }));

  function onsiteRoleLabels(roles = []) {
    return (Array.isArray(roles) ? roles : [])
      .map((role) => onsiteRoleMeta[role]?.label || role)
      .filter(Boolean);
  }

  // 组别筛选按赛事组展示，不把抽签后的 A/B 子组当成独立赛事组。
  function baseCompetitionGroup(label = '') {
    return String(label || '')
      .replace(/\s*[·•]\s*[A-ZＡ-Ｚ]\s*组\s*$/i, '')
      .replace(/\s+[A-ZＡ-Ｚ]\s*组\s*$/i, '')
      .trim();
  }

  function onsiteOperatorCount(match, eventSpace = activeEventSpace()) {
    const saved = Number(eventSpace?.onsiteAssignments?.[match?.id]?.operatorCount);
    if ([1, 2, 3].includes(saved)) return saved;
    // 球员数据模式默认三席；仅球队模式默认计分员 + MC 两席。
    return usesPlayerData(eventSpace) ? 3 : 2;
  }

  function onsiteOperatorRoles(count = 3) {
    if (Number(count) === 1) return ['scorer'];
    if (Number(count) === 2) return ['scorer', 'mc'];
    return ['scorer', 'recorder', 'mc'];
  }

  function onsiteOperatorDescription(count = 3) {
    return Number(count) === 1
      ? '1 人：仅计分员'
      : Number(count) === 2
        ? '2 人：计分员 + MC'
        : '3 人：计分员 + 记录员/数据员 + MC';
  }

  function onsiteRequiredRoles(match, eventSpace = activeEventSpace()) {
    return onsiteOperatorRoles(onsiteOperatorCount(match, eventSpace))
      .filter((role) => role !== 'recorder' || usesPlayerData(eventSpace));
  }

  function eventOnsitePeople(eventSpace = activeEventSpace()) {
    if (!eventSpace) return [];
    if (!Array.isArray(eventSpace.onsitePeople)) eventSpace.onsitePeople = [];
    return eventSpace.onsitePeople;
  }

  function onsiteRowsForEvent(eventSpace = activeEventSpace()) {
    const matches = generatedScheduleRows(eventSpace);
    if (!matches.length) return [];
    const assignments = eventSpace.onsiteAssignments || {};
    return matches.map((match) => {
      const [date, time] = String(match.time || '').split(' ');
      const saved = assignments[match.id] || {};
      const row = {
        ...match,
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
        time: time || '待安排',
        scorer: saved.scorer ?? '待分配',
        scorerSource: saved.scorerSource ?? '未绑定',
        recorder: saved.recorder ?? (usesPlayerData(eventSpace) ? '待分配' : '不适用'),
        recorderSource: saved.recorderSource ?? (usesPlayerData(eventSpace) ? '未绑定' : '仅球队模式'),
        mc: saved.mc ?? '待分配',
        mcSource: saved.mcSource ?? '未绑定',
        operatorCount: onsiteOperatorCount(match, eventSpace)
      };
      const requiredRoles = onsiteRequiredRoles(row, eventSpace);
      const ready = requiredRoles.every((role) => row[role] && !['待分配', '不适用'].includes(row[role]));
      const assignedCount = requiredRoles.filter((role) => row[role] && !['待分配', '不适用'].includes(row[role])).length;
      row.assignmentStatus = ready ? '准备完成' : assignedCount ? '待确认' : '人员不足';
      return row;
    }).sort((left, right) => String(left.time || '').localeCompare(String(right.time || '')) || String(left.id || '').localeCompare(String(right.id || '')));
  }

  function onsiteStatusType(value) {
    return value === '准备完成' ? 'ok' : value === '人员不足' ? 'error' : 'warn';
  }

  function onsiteOptionList(values, selected, label) {
    return `<option value="">${label}</option>${values.map((value) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(value)}</option>`).join('')}`;
  }

  function openOnsiteAssignment(matchId = selectedOnsiteMatchId, role = 'scorer', preferredPerson = '') {
    const eventSpace = activeEventSpace();
    const rows = onsiteRowsForEvent(eventSpace);
    const match = rows.find((item) => item.id === matchId) || rows[0];
    if (!match) {
      showToast('当前没有已建赛程，暂不能安排现场人员');
      return;
    }
    selectedOnsiteMatchId = match.id;
    const activeRole = onsiteRoleMeta[role] ? role : 'scorer';
    const meta = onsiteRoleMeta[activeRole];
    const roster = eventOnsitePeople(eventSpace);
    const currentPerson = preferredPerson || match[activeRole] || '待分配';
    const source = match[`${activeRole}Source`] || meta.source;
    const supportedRoles = onsiteRoleChoices.filter(({ key }) => key !== 'recorder' || usesPlayerData(eventSpace));
    const peopleForRole = (roleKey, selectedPerson = '待分配') => {
      const people = [...new Set(roster
        .filter((person) => !Array.isArray(person.roles) || person.roles.includes(roleKey))
        .map((person) => person.name)
        .filter(Boolean))];
      if (selectedPerson && !people.includes(selectedPerson) && !['待分配', '不适用'].includes(selectedPerson)) people.unshift(selectedPerson);
      return people;
    };
    const people = peopleForRole(activeRole, currentPerson);
    if (!people.length && currentPerson === '待分配') {
      showToast('请先新增现场人员，再绑定到具体场次');
      return;
    }
    openModal(`安排现场岗位`, `<form class="form-grid onsite-assignment-form" data-onsite-assignment-form data-match-id="${esc(match.id)}" data-onsite-role="${activeRole}" data-onsite-original-role="${activeRole}">
      ${namedField('场次', 'match', `${match.id} · ${match.home || '待定'} VS ${match.away || '待定'}`)}
      <div class="field"><label>岗位（可切换）</label><select name="roleKey" data-onsite-role-select>${supportedRoles.map(({ key, label }) => `<option value="${key}"${key === activeRole ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></div>
      ${namedField('人员来源', 'source', source, 'select', ['内部教练', '外请人员', '未绑定'])}
      <div class="field"><label>选择人员</label><select name="person" data-onsite-person-select>${['待分配', ...people].map((person) => `<option${person === currentPerson ? ' selected' : ''}>${esc(person)}</option>`).join('')}</select></div>
      <div class="info-banner field full" data-onsite-permission>权限范围：${meta.permission}。外请人员仅能访问被分配的本场任务，不进入机构教务人员库。</div>
    </form>`, `${btn('取消', 'close-modal', 'outline')}${btn('确认安排', 'confirm-assign', 'primary', 'user-round-check')}`);
    const form = modalBody.querySelector('[data-onsite-assignment-form]');
    const roleSelect = modalBody.querySelector('[data-onsite-role-select]');
    const personSelect = modalBody.querySelector('[data-onsite-person-select]');
    const permission = modalBody.querySelector('[data-onsite-permission]');
    roleSelect?.addEventListener('change', () => {
      const nextRole = onsiteRoleMeta[roleSelect.value] ? roleSelect.value : 'scorer';
      const nextMeta = onsiteRoleMeta[nextRole];
      const nextCurrent = match[nextRole] || '待分配';
      const nextPeople = peopleForRole(nextRole, nextCurrent);
      if (form) form.dataset.onsiteRole = nextRole;
      if (personSelect) personSelect.innerHTML = ['待分配', ...nextPeople].map((person) => `<option${person === nextCurrent ? ' selected' : ''}>${esc(person)}</option>`).join('');
      if (permission) permission.innerHTML = `权限范围：${nextMeta.permission}。外请人员仅能访问被分配的本场任务，不进入机构教务人员库。`;
    });
  }

  function defaultSimulationReferees() {
    return [
      { id: 'ref-001', name: '王裁判', phone: '138****2201', source: '内部裁判', qualification: '国家二级裁判', status: '可用', accepted: true },
      { id: 'ref-002', name: '李裁判', phone: '139****4872', source: '外请裁判', qualification: '青少年篮球裁判员', status: '待接受', accepted: false },
      { id: 'ref-003', name: '陈裁判', phone: '136****9914', source: '外请裁判', qualification: '国家三级裁判', status: '可用', accepted: true }
    ];
  }

  function eventRefereeList(eventSpace = activeEventSpace()) {
    if (!eventSpace) return [];
    if (!Array.isArray(eventSpace.referees)) {
      eventSpace.referees = isDemoMode ? defaultSimulationReferees() : [];
    }
    // 清理上一轮本地联调自动生成、尚未被使用的虚拟裁判；用户已新增或绑定的名单不会被改动。
    const seeded = defaultSimulationReferees();
    const assignments = eventSpace.refereeAssignments || {};
    const onlyUnusedSeeded = !isDemoMode
      && eventSpace.referees.length === seeded.length
      && eventSpace.referees.every((item, index) => item.id === seeded[index].id && item.name === seeded[index].name)
      && Object.keys(assignments).length === 0;
    if (onlyUnusedSeeded) {
      eventSpace.referees = [];
      persistEventSpaces();
    }
    return eventSpace.referees;
  }

  function openRefereeBinding(refereeId = selectedRefereeId) {
    const eventSpace = activeEventSpace();
    const referees = eventRefereeList(eventSpace);
    const referee = referees.find((item) => item.id === refereeId);
    const matches = generatedScheduleRows(eventSpace);
    if (!referee || !matches.length) {
      showToast('请先完成裁判名单或生成竞赛日程');
      return;
    }
    const assignments = eventSpace.refereeAssignments || {};
    const existingMatch = matches.find((match) => Array.isArray(assignments[match.id]?.refereeIds) && assignments[match.id].refereeIds.includes(referee.id));
    const availableMatches = matches;
    const defaultMatch = existingMatch || availableMatches.find((match) => !assignments[match.id]) || availableMatches[0];
    const existingIds = existingMatch ? assignments[existingMatch.id].refereeIds : [referee.id];
    const refereeOptions = referees.filter((item) => item.status !== '已停用' || existingIds.includes(item.id));
    openModal('绑定并发送裁判任务', `<form class="form-grid referee-binding-form" data-referee-binding-form data-referee-id="${esc(referee.id)}">
      <div class="field full"><label>比赛场次</label><select name="matchId">${availableMatches.map((match) => `<option value="${esc(match.id)}"${match.id === defaultMatch.id ? ' selected' : ''}>${esc(`${match.id} · ${match.time} · ${match.home || '待定'} VS ${match.away || '待定'} · ${match.venue || '待安排'}`)}</option>`).join('')}</select></div>
      <div class="field full"><label>裁判组（可选 1–3 人）</label><div class="referee-checkbox-grid">${refereeOptions.map((item) => `<label class="referee-checkbox"><input type="checkbox" name="refereeIds" value="${esc(item.id)}"${existingIds.includes(item.id) ? ' checked' : ''}><span><b>${esc(item.name)}</b><small>${esc(item.source)} · ${esc(item.qualification)}</small></span></label>`).join('')}</div></div>
      <div class="info-banner field full"><b>发送规则：</b>绑定后直接发送比赛任务；裁判首次接受授权后，后续被安排的场次自动进入任务列表，无需逐场确认。裁判组人数按本场预先配置，可为 1 人、2 人或 3 人。</div>
    </form>`, `${btn('取消', 'close-modal', 'outline')}${btn('绑定并发送任务', 'confirm-bind-referee', 'primary', 'send')}`);
  }

  function openRefereeEditor(refereeId = selectedRefereeId) {
    const eventSpace = activeEventSpace();
    const person = eventRefereeList(eventSpace).find((item) => item.id === refereeId);
    if (!person) return;
    const source = ['内部人员', '内部裁判', '内部教练'].includes(person.source) ? '内部人员' : '外请人员';
    const roles = Array.isArray(person.roles) ? person.roles : [];
    openModal('编辑现场人员', `<form class="form-grid referee-form" data-referee-editor data-referee-id="${esc(person.id)}">
      ${namedField('姓名', 'name', person.name)}
      ${namedField('联系方式', 'phone', person.phone || '')}
      ${namedField('来源', 'source', source, 'select', ['内部人员', '外请人员'])}
      <div class="field full"><label>可承担岗位（可多选）</label><div class="role-check-grid">${onsiteRoleChoices.map(({ key, label }) => `<label class="role-check"><input type="checkbox" name="roles" value="${key}"${roles.includes(key) ? ' checked' : ''}><span>${esc(label)}</span></label>`).join('')}</div><small class="field-help">调整后会同步影响现场任务的可选人员。</small></div>
    </form>`, `${btn('取消', 'close-modal', 'outline')}${btn('保存修改', 'confirm-edit-referee', 'primary', 'save')}`);
  }

  function openRefereeDelete(refereeId = selectedRefereeId) {
    const eventSpace = activeEventSpace();
    const person = eventRefereeList(eventSpace).find((item) => item.id === refereeId);
    if (!person) return;
    const refereeMatches = Object.values(eventSpace.refereeAssignments || {}).filter((assignment) => Array.isArray(assignment?.refereeIds) ? assignment.refereeIds.includes(person.id) : assignment?.refereeId === person.id).length;
    const onsiteMatches = Object.values(eventSpace.onsiteAssignments || {}).filter((assignment) => Object.values(assignment || {}).some((value) => value === person.name)).length;
    openModal('删除现场人员', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('trash-2')}</span><h3>${esc(person.name)}</h3><p>确定删除此人员及其岗位能力吗？</p><div class="info-banner">${refereeMatches || onsiteMatches ? `该人员当前关联 ${refereeMatches} 场裁判任务、${onsiteMatches} 场现场任务；删除后关联场次会恢复为待分配。` : '删除后不会再出现在任何岗位的绑定列表中。'}</div></div>`, `${btn('取消', 'close-modal', 'outline')}${btn('确认删除', 'confirm-delete-referee', 'outline', 'trash-2')}`);
    modalBody.querySelector('[data-action="confirm-delete-referee"]')?.setAttribute('data-referee-id', person.id);
  }

  function renderReferees() {
    const eventSpace = activeEventSpace();
    const referees = eventRefereeList(eventSpace);
    const assignments = eventSpace.refereeAssignments || {};
    const matches = generatedScheduleRows(eventSpace);
    const onsiteMatches = onsiteRowsForEvent(eventSpace);
    const statuses = ['可用', '待接受', '已停用'];
    if (refereeStatusFilter && !statuses.includes(refereeStatusFilter)) refereeStatusFilter = '';
    const rows = referees.filter((referee) => !refereeStatusFilter || referee.status === refereeStatusFilter);
    const selected = rows.find((referee) => referee.id === selectedRefereeId) || rows[0] || referees[0] || null;
    selectedRefereeId = selected?.id || '';
    const assignedMatches = selected ? matches.filter((match) => {
      const assignment = assignments[match.id];
      return Array.isArray(assignment?.refereeIds)
        ? assignment.refereeIds.includes(selected.id)
        : assignment?.refereeId === selected.id;
    }) : [];
    const selectedRosterPerson = selected ? eventOnsitePeople(eventSpace).find((person) => person.id === selected.id || person.name === selected.name) : null;
    const selectedRoles = selectedRosterPerson?.roles || selected?.roles || [];
    const assignableTasks = selected ? selectedRoles.flatMap((role) => onsiteMatches
      .filter((match) => onsiteOperatorRoles(match.operatorCount).includes(role) && match[role] === '待分配')
      .map((match) => ({ match, role }))) : [];
    const assignableTaskHtml = selected ? `<section class="panel referee-available-task-panel"><header><div><h3>当前可安排的工作任务</h3><p>按 ${esc(onsiteRoleLabels(selectedRoles).join('、') || '已选岗位')} 筛选未分配场次</p></div><span>${assignableTasks.length} 项</span></header>${assignableTasks.length ? `<div class="referee-available-task-list">${assignableTasks.map(({ match, role }) => `<div class="referee-available-task"><div><b>${esc(match.id)} · ${esc(onsiteRoleMeta[role]?.label || role)}</b><span>${esc(match.time || '待安排')} · ${esc(match.venue || '待安排')}</span><small>${esc([match.phase, match.round, match.group || match.competitionGroup, `${match.home || '待定'} VS ${match.away || '待定'}`].filter(Boolean).join(' · '))}</small></div><button class="text-action" data-action="assign-person-task" data-referee-id="${esc(selected.id)}" data-match="${esc(match.id)}" data-onsite-role="${esc(role)}">安排此任务</button></div>`).join('')}</div>` : '<div class="module-empty compact"><b>当前没有可安排任务</b><span>该人员的岗位目前没有未分配场次。</span></div>'}</section>` : '';
    const statusType = (value) => value === '可用' ? 'ok' : value === '已停用' ? 'error' : 'warn';
    return `<div class="primary-page referee-page">
      <div class="referee-page-intro"><div><h2>裁判名单</h2><p>先建立本届赛事人员与岗位能力，再绑定具体场次并发送任务；一人可同时承担计分员、记录员/数据员和 MC。</p></div>${btn('新增人员', 'add-referee', 'primary', 'user-round-plus')}</div>
      <div class="metrics referee-metrics">${metric('名单人数', String(referees.length), '人', 'users-round', '本届赛事名单')}${metric('已绑定场次', String(Object.keys(assignments).length), '场', 'link-2', '已发送任务')}${metric('待接受', String(referees.filter((item) => item.status === '待接受').length), '人', 'clock-3', '首次授权')}</div>
      <div class="referee-toolbar"><span>裁判状态</span><select class="control" data-referee-status-filter><option value="">全部状态</option>${statuses.map((value) => `<option value="${esc(value)}"${value === refereeStatusFilter ? ' selected' : ''}>${esc(value)}</option>`).join('')}</select><span class="referee-toolbar-note">裁判名单只属于当前赛事，不进入机构教练或学员库。</span></div>
      <div class="referee-layout"><section class="panel referee-list-panel"><header><h3>本届赛事人员</h3><span>${rows.length} 人</span></header><table class="data-table"><thead><tr><th>人员</th><th>来源</th><th>可承担岗位</th><th>联系方式</th><th>状态</th><th>已绑定</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map((referee) => { const count = Object.values(assignments).filter((assignment) => Array.isArray(assignment?.refereeIds) ? assignment.refereeIds.includes(referee.id) : assignment?.refereeId === referee.id).length; const roles = onsiteRoleLabels(referee.roles); return `<tr class="${referee.id === selected?.id ? 'selected' : ''}" data-action="select-referee" data-referee-id="${esc(referee.id)}"><td><b>${esc(referee.name)}</b></td><td>${esc(referee.source)}</td><td><div class="role-chip-list">${roles.length ? roles.map((role) => `<span>${esc(role)}</span>`).join('') : `<span>${esc(referee.qualification || '未设置')}</span>`}</div></td><td>${esc(referee.phone)}</td><td>${status(referee.status, statusType(referee.status))}</td><td>${count} 场</td><td><button class="text-action" data-action="bind-referee" data-referee-id="${esc(referee.id)}">绑定并发送</button><button class="text-action" data-action="edit-referee" data-referee-id="${esc(referee.id)}">编辑</button><button class="text-action danger-text" data-action="delete-referee" data-referee-id="${esc(referee.id)}">删除</button></td></tr>`; }).join('') : '<tr><td colspan="7"><div class="module-empty compact"><b>暂无符合条件的人员</b><span>请调整筛选条件或新增人员。</span></div></td></tr>'}</tbody></table></section>
        <aside class="panel referee-detail-panel">${selected ? `<header><div><h3>${esc(selected.name)}</h3><p>${esc(selected.source)} · ${esc(onsiteRoleLabels(selected.roles).join('、') || selected.qualification || '岗位未设置')}</p></div>${status(selected.status, statusType(selected.status))}</header><div class="referee-detail-meta"><span>联系方式</span><b>${esc(selected.phone)}</b><span>可承担岗位</span><b>${esc(onsiteRoleLabels(selected.roles).join('、') || selected.qualification || '未设置')}</b><span>授权状态</span><b>${selected.accepted ? '已接受一次授权' : '待接受首次授权'}</b></div><div class="referee-assignment-head"><h4>已安排场次</h4>${assignedMatches.length ? `<span>${assignedMatches.length} 场</span>` : ''}</div>${assignedMatches.length ? `<div class="referee-assignment-list">${assignedMatches.map((match) => { const assignment = assignments[match.id] || {}; const refereeCount = Array.isArray(assignment.refereeIds) ? assignment.refereeIds.length : assignment.refereeId ? 1 : 0; return `<div><b>${esc(match.id)}</b><span>${esc(match.time)} · ${esc(match.venue || '待安排')}</span><small>${esc(match.home || '待定')} VS ${esc(match.away || '待定')}</small><em>${refereeCount} 人裁判组 · ${assignment.taskStatus || '任务已发送'}</em></div>`; }).join('')}</div>` : '<div class="module-empty compact"><b>暂未绑定比赛</b><span>绑定后任务会直接发送给该裁判。</span></div>'}${btn('绑定并发送比赛任务', 'bind-referee', 'primary', 'send')}</aside>` : '<aside class="panel referee-detail-panel"><div class="module-empty"><b>请选择裁判</b></div></aside>'}</div>
      ${assignableTaskHtml}
    </div>`;
  }

  function renderPeople() {
    const eventSpace = activeEventSpace();
    const workflow = eventWorkflow(eventSpace);
    const roster = eventOnsitePeople(eventSpace);
    const allRows = onsiteRowsForEvent(eventSpace);
    const dates = [...new Set(allRows.map((row) => row.date).filter(Boolean))].sort();
    const groupOf = (row) => baseCompetitionGroup(row.group || row.competitionGroup);
    const groups = [...new Set(allRows.map(groupOf).filter(Boolean))];
    const venues = [...new Set(allRows.map((row) => row.venue).filter(Boolean))];
    const statuses = ['准备完成', '待确认', '人员不足'];
    if (!dates.includes(onsiteDateFilter)) onsiteDateFilter = dates[0] || eventSpace?.startDate || '';
    onsiteGroupFilter = baseCompetitionGroup(onsiteGroupFilter);
    if (onsiteGroupFilter && !groups.includes(onsiteGroupFilter)) onsiteGroupFilter = '';
    if (onsiteVenueFilter && !venues.includes(onsiteVenueFilter)) onsiteVenueFilter = '';
    if (onsiteStatusFilter && !statuses.includes(onsiteStatusFilter)) onsiteStatusFilter = '';
    const rows = allRows.filter((row) => (
      (!onsiteDateFilter || row.date === onsiteDateFilter)
      && (!onsiteGroupFilter || groupOf(row) === onsiteGroupFilter)
      && (!onsiteVenueFilter || row.venue === onsiteVenueFilter)
      && (!onsiteStatusFilter || row.assignmentStatus === onsiteStatusFilter)
    ));
    const selected = rows.find((row) => row.id === selectedOnsiteMatchId) || rows[0] || allRows[0] || null;
    selectedOnsiteMatchId = selected?.id || '';
    const valueCell = (row, role) => {
      if (!onsiteOperatorRoles(row.operatorCount).includes(role)) {
        return '<span class="muted-text">不需要</span><small class="source-tag">当前模式未启用</small>';
      }
      if (role === 'recorder' && !usesPlayerData(eventSpace)) {
        return '<span class="muted-text">不适用</span><small class="source-tag">仅球队模式</small>';
      }
      const person = row[role] || '待分配';
      const source = row[`${role}Source`] || '未绑定';
      return `<span class="${person === '待分配' ? 'orange-text' : ''}">${esc(person)}</span><small class="source-tag${source === '外请人员' ? ' external' : ''}">${esc(source)}</small>`;
    };
    const seat = (role, person, source) => {
      const meta = onsiteRoleMeta[role];
      const unavailable = person === '不适用';
      return `<article class="onsite-seat-card${unavailable ? ' is-unavailable' : ''}"><header><span>${icon(meta.icon)}</span><div><b>${meta.label}</b><small>${unavailable ? '仅球队模式' : person === '待分配' ? '待分配' : esc(source || meta.source)}</small></div><div>${unavailable ? '' : `<button data-action="assign-match" data-onsite-role="${role}" data-match="${esc(selected.id)}">更换</button><button data-action="remove-seat" data-onsite-role="${role}" data-match="${esc(selected.id)}">移除</button>`}</div></header><p>${esc(person)}</p><div>${meta.permission}</div></article>`;
    };
    const dateRange = dates.length ? `${dates[0]} 至 ${dates[dates.length - 1]}` : '尚未生成赛程';
    const rosterText = roster.length
      ? roster.map((person) => `<span class="onsite-roster-chip"><b>${esc(person.name)}</b><small>${esc((person.roles || []).map((role) => onsiteRoleMeta[role]?.label || role).join(' / ') || '现场人员')} · ${esc(person.source || '未绑定')}</small></span>`).join('')
      : '<span class="onsite-roster-empty">尚未建立现场人员名单，请先新增计分员、记录员或 MC。</span>';
    return `<div class="primary-page onsite-people-page">
      ${isDemoMode && workflow.onsiteAssigned && !workflow.executionReturned ? `<div class="info-banner test-flow-banner"><b>测试模式：</b>PC 后台只负责任务安排与监控，真实比分由小程序计分台回传。 ${btn('模拟小程序回传比赛结果','test-return-results','outline','refresh-cw')}</div>` : ''}
      <div class="onsite-page-intro"><div><h2>人员与任务</h2><p>竞赛日程保存后自动生成每场任务；现场人员由主办方先建立名单，再按场次绑定，并为每场选择 1/2/3 人操作模式，人员可跨场次动态复用。</p></div>${btn('新增现场人员','add-onsite-person','primary','user-round-plus')}</div>
      <div class="onsite-roster-strip"><div><b>现场人员名单</b><small>名单由你维护，任务不会自动虚构人员</small></div><div class="onsite-roster-list">${rosterText}</div></div>
      <div class="onsite-filterbar"><label>比赛日期 <input class="control" type="date" value="${esc(onsiteDateFilter)}" min="${esc(dates[0] || '')}" max="${esc(dates[dates.length - 1] || '')}" data-onsite-filter="date"></label><label>组别 <select class="control" data-onsite-filter="group">${onsiteOptionList(groups, onsiteGroupFilter, '全部组别')}</select></label><label>场馆 <select class="control" data-onsite-filter="venue">${onsiteOptionList(venues, onsiteVenueFilter, '全部场馆')}</select></label><label>人员状态 <select class="control" data-onsite-filter="status">${onsiteOptionList(statuses, onsiteStatusFilter, '全部状态')}</select></label></div>
      <div class="onsite-schedule-note">${icon('calendar-days')} 已按已保存竞赛日程载入 ${allRows.length} 场任务 · 当前筛选 ${rows.length} 场 · 比赛日 ${dateRange}</div>
      <div class="onsite-main-grid">
        <section class="panel onsite-task-list">
          <header><h3>当天场次任务</h3><span>每场可配置 1/2/3 人操作席位 · 共 ${rows.length} 场</span></header>
          <table class="data-table"><thead><tr><th>时间</th><th>场次 / 阶段</th><th>场地</th><th>计分员</th><th>记录员</th><th>MC</th><th>操作人数</th><th>准备状态</th><th>操作</th></tr></thead><tbody>
            ${rows.length ? rows.map((row) => `<tr class="${row.id === selected?.id ? 'selected' : ''}" data-action="select-onsite-match" data-match="${esc(row.id)}"><td><b>${esc(row.time)}</b></td><td><b>${esc(row.id)}</b><small>${esc([row.phase, row.subgroup || row.group, row.round].filter(Boolean).join(' · '))}</small></td><td>${esc(row.venue || '待安排')}</td><td>${valueCell(row, 'scorer')}</td><td>${valueCell(row, 'recorder')}</td><td>${valueCell(row, 'mc')}</td><td><b>${row.operatorCount} 人</b><small>${esc(onsiteOperatorDescription(row.operatorCount))}</small></td><td>${status(row.assignmentStatus, onsiteStatusType(row.assignmentStatus))}</td><td><button class="text-action" data-action="select-onsite-match" data-match="${esc(row.id)}">分配人员</button></td></tr>`).join('') : '<tr><td colspan="9"><div class="module-empty compact"><b>当前筛选没有场次</b><span>请调整比赛日期、组别、场馆或人员状态。</span></div></td></tr>'}
          </tbody></table>
        </section>
        <aside class="panel onsite-assignment">
          ${selected ? `<header><div><h3>人员分配</h3><p>场次　<b>${esc(selected.id)}</b></p><p>组别　${esc(groupOf(selected) || '待定组别')}</p><p>${esc([selected.date, selected.time, selected.phase, selected.round].filter(Boolean).join(' · '))}</p><p>${esc(selected.home || '待定')} VS ${esc(selected.away || '待定')}</p></div></header>
          <div class="onsite-operator-mode"><label for="onsiteOperatorCount">本场操作人数</label><select id="onsiteOperatorCount" class="control" data-onsite-operator-count data-match="${esc(selected.id)}">${[1,2,3].map((count) => `<option value="${count}"${selected.operatorCount === count ? ' selected' : ''}>${count} 人操作</option>`).join('')}</select><small>${esc(onsiteOperatorDescription(selected.operatorCount))}。保存后将作为本场房间的席位配置。</small></div>
          <div class="onsite-seat-mode-hint">${icon('monitor-cog')} ${esc(onsiteOperatorDescription(selected.operatorCount))}</div>
          ${onsiteOperatorRoles(selected.operatorCount).map((role) => seat(role, selected[role], selected[`${role}Source`])).join('')}
          <button class="invite-person" data-action="invite-external" data-match="${esc(selected.id)}">${icon('send')} 邀请外请人员</button>
          <p class="permission-footnote">通过统一服务号发送邀请，手机号码验证后绑定本场任务。</p>
          ${btn('保存分配','save-assignment','primary','save')}` : '<div class="module-empty compact"><b>暂无可分配场次</b><span>请先完成赛程生成，或清除当前筛选。</span></div>'}
        </aside>
      </div>
    </div>`;
  }

  function renderBindings() {
    const state = store.read();
    const accepted = state.invitation.status === 'accepted';
    return `${heading('技术台人员绑定', '赛事负责人可指派内部教练，也可通过统一服务号邀请外请人员；权限只限指定赛事和场次。', btn('邀请外请人员', 'invite-external', 'primary', 'send'))}
      <div class="binding-layout">
        <section class="panel match-list"><header class="panel-header"><h3>07月20日 · 场次</h3></header>${[
          ['G1001','09:00','雷霆 VS 飞跃','已就绪'],
          ['G1002','09:00','晨光 VS 雄鹿','已就绪'],
          ['G1003','10:15','蓝鲸 VS 勇士',accepted ? '已就绪' : '待确认'],
          ['G1004','10:15','极光 VS 猎鹰','缺 2 人']
        ].map(([id,time,match,statusText], index) => `<button type="button" class="match-list-row ${index === 2 ? 'active' : ''}" data-action="select-match"><b>${id}</b><span>${time}</span><span>${match}</span>${status(statusText,statusText==='已就绪'?'ok':statusText.includes('缺')?'error':'warn')}</button>`).join('')}</section>
        <div>
          <div class="seat-grid">
            <article class="seat-card"><h3>主控计分席</h3><div class="seat-source"><span>内部教练</span><b>直接指派</b></div><div class="person-chip"><span>${teamBadge('雷霆队')} 赵教练</span>${icon('circle-check-big')}</div><div class="permission-note"><b>权限：</b>比分、时间、节次、暂停、队伍犯规和比赛结束。</div>${btn('更换人员', 'assign-internal', 'outline small', 'users-round')}</article>
            <article class="seat-card"><h3>球员数据席</h3><div class="seat-source"><span>${accepted ? '外请人员' : '等待服务号接受'}</span><b>${accepted ? '已绑定' : '待确认'}</b></div><div class="person-chip"><span>${icon('user-round')} ${accepted ? '李娜 · 138****5678' : '李娜 · 邀请已发送'}</span>${accepted ? icon('circle-check-big') : icon('clock-3')}</div><div class="permission-note"><b>权限：</b>阵容、换人、球员得分归属、命中/出手、篮板、助攻、抢断、盖帽和失误。</div>${btn(accepted ? '查看绑定' : '打开服务号接受', accepted ? 'view-binding' : 'open-service', 'outline small', accepted ? 'link-2' : 'smartphone')}</article>
            <article class="seat-card"><h3>MC 控制席</h3><div class="seat-source"><span>内部教练</span><b>直接指派</b></div><div class="person-chip"><span>${teamBadge('飞跃队')} 陈教练</span>${icon('circle-check-big')}</div><div class="permission-note"><b>权限：</b>进攻/防守音效、欢呼、出场音乐和语音播报；不可修改比分。</div>${btn('更换人员', 'assign-internal', 'outline small', 'users-round')}</article>
          </div>
          <div class="panel seat-flow"><div><i>${icon('send')}</i>平台发送邀请</div><span>${icon('chevron-right')}</span><div><i>${icon('phone')}</i>手机号核验</div><span>${icon('chevron-right')}</span><div><i>${icon('smartphone')}</i>服务号接受</div><span>${icon('chevron-right')}</span><div><i>${icon('link-2')}</i>绑定场次权限</div><span>${icon('chevron-right')}</span><div><i>${icon('circle-dollar-sign')}</i>任务完成结算</div></div>
        </div>
      </div>`;
  }

  function renderDataTasks() {
    const rows = [
      ['G1003','李娜','5 人','张子轩、李明宇、周浩然等','待接受','¥162.50'],
      ['G1004','王教练','3 人','陈梓豪、赵天宇、孙嘉乐','已确认','¥97.50'],
      ['G1005','刘涛','5 人','杨帆、郑凯、吴桐等','进行中','¥162.50'],
      ['G1006','待安排','4 人','数据包已购买','待安排','¥130.00']
    ];
    return `${heading('球员数据任务', '每名记录员单场最多负责 5 名已购买数据包的球员；主办方负责落地安排。', btn('批量分配', 'batch-data-task', 'primary', 'users'))}
      <div class="metrics">${metric('已售数据包','17','份','credit-card','今日 4 场')}${metric('待分配球员','4','人','triangle-alert','不得超过单席 5 人')}${metric('记录员收入','¥552.50','','wallet-cards','按完成任务结算')}${metric('主办方分成','¥170.00','','circle-dollar-sign','20% 分成')}</div>
      ${panel('记录任务', `<table class="data-table"><thead><tr><th>场次</th><th>记录员</th><th>球员数</th><th>负责球员</th><th>状态</th><th>预计记录员收入</th><th>操作</th></tr></thead><tbody>${rows.map(([match,recorder,count,playersText,state,income]) => `<tr><td><b>${match}</b></td><td>${recorder}</td><td>${count}</td><td>${playersText}</td><td>${status(state,state==='已确认'?'ok':state==='进行中'?'live':'warn')}</td><td class="money">${income}</td><td>${btn('分配', 'assign-data-task', 'small', 'user-round-check')}</td></tr>`).join('')}</tbody></table>`)}
      <div class="info-banner"><b>记录规则：</b>数据台记录投篮命中与出手，并自动计算两分、三分、罚球和综合命中率。</div>`;
  }

  function renderConsoles() {
    const eventSpace = activeEventSpace();
    const matches = onsiteRowsForEvent(eventSpace);
    const rolePresentation = {
      scorer: { label: '主控计分台', icon: 'monitor-cog', permission: '比分、时间、节次与暂停' },
      recorder: { label: '球员数据台', icon: 'database', permission: '球员数据记录' },
      mc: { label: 'MC 控制台', icon: 'radio-tower', permission: '音效与播报控制' }
    };
    const consoles = matches.flatMap((match, matchIndex) => onsiteOperatorRoles(match.operatorCount)
      .filter((role) => role !== 'recorder' || usesPlayerData(eventSpace))
      .map((role, roleIndex) => {
        const presentation = rolePresentation[role];
        const person = match[role] || '待分配';
        const assigned = !['待分配', '不适用'].includes(person);
        return {
          match,
          role,
          type: presentation.label,
          icon: presentation.icon,
          device: assigned ? `SIM-${match.id}-${role.toUpperCase()}` : '未连接',
          person,
          state: assigned ? '在线（模拟）' : '待绑定',
          latency: assigned ? `${12 + ((matchIndex * 7 + roleIndex * 5) % 18)} ms` : '—',
          permission: presentation.permission
        };
      }));
    const cards = consoles.map((item) => `<article class="mini-panel console-card"><span class="big-icon">${icon(item.icon)}</span><div><small>${esc(item.match.id)} · ${esc(item.match.date)} ${esc(item.match.time)}</small><h3>${esc(item.type)}</h3><p>${esc(item.device)} · ${esc(item.person)}</p></div><div>${status(item.state,item.state.startsWith('在线')?'ok':'warn')}<small>${esc(item.latency)}</small></div><button type="button" class="btn small" data-action="view-console" data-console-match="${esc(item.match.id)}" data-console-type="${esc(item.type)}" data-console-device="${esc(item.device)}" data-console-person="${esc(item.person)}" data-console-state="${esc(item.state)}" data-console-latency="${esc(item.latency)}" data-console-permission="${esc(item.permission)}">${icon('chevron-right')}<span>查看</span></button></article>`).join('');
    return `${heading('控制台状态', '监控主控、球员数据与 MC 三席连接；PC 后台只监控，不直接操作现场计分。', btn('刷新状态', 'refresh-consoles', 'outline', 'refresh-cw'))}
      <div class="console-live-summary"><span>${icon('calendar-days')} 已读取当前赛事 ${matches.length} 场比赛</span><b>${consoles.length} 个模拟控制台席位</b><small>席位由每场 1/2/3 人操作配置自动生成</small></div>
      ${cards ? `<div class="console-grid">${cards}</div>` : `<div class="module-empty console-empty">${icon('monitor-cog')}<b>暂无可监控的比赛房间</b><span>请先保存竞赛日程，再为比赛设置操作人数并安排现场人员。</span>${btn('前往人员与任务','go-people','outline','users-round')}</div>`}
      <div class="info-banner">当前为本地房间连接模拟：已绑定人员显示“在线（模拟）”，未绑定席位显示“待绑定”。接入真实房间后，此处将替换为设备心跳、服务号授权和实际连接状态；PC 后台仍不直接修改现场比分。</div>`;
  }

  function scoreValue(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function resultStatusLabel(value) {
    return value === 'approved' ? '已通过' : value === 'returned' ? '已退回' : value === 'warning' ? '待处理' : value === 'pending' ? '待确认' : '待录入';
  }

  function resultStatusTone(value) {
    return value === 'approved' ? 'ok' : value === 'returned' ? 'error' : value === 'warning' ? 'error' : 'warn';
  }

  function resultRowsForEvent(eventSpace = activeEventSpace()) {
    const state = store.read();
    const scheduleRows = generatedScheduleRows(eventSpace);
    if (scheduleRows.length) {
      const records = eventSpace.resultRecords || {};
      return scheduleRows.map((match) => {
        const record = records[match.id] || {};
        const homeScore = scoreValue(record.homeScore ?? match.homeScore);
        const awayScore = scoreValue(record.awayScore ?? match.awayScore);
        const scoreReady = homeScore !== null && awayScore !== null;
        const isAdminRecord = ['PC后台', '赛事后台'].includes(record.source) || ['PC后台', '赛事后台'].includes(record.submittedBy);
        const reviewStatus = scoreReady && isAdminRecord ? 'approved' : (record.reviewStatus || state.resultReviews?.[match.id] || (scoreReady ? 'pending' : 'not-submitted'));
        const time = String(match.time || '待安排');
        return {
          id: match.id,
          match,
          group: match.group || match.competitionGroup || '未分组',
          phase: match.phase || match.stage || '待定阶段',
          round: match.round || '待定轮次',
          home: match.home || '待定',
          away: match.away || '待定',
          homeScore,
          awayScore,
          scoreReady,
          scoreText: scoreReady ? `${homeScore} : ${awayScore}` : '待录入',
          time,
          venue: match.venue || '待安排',
          submittedBy: record.submittedBy || record.source || (scoreReady ? '现场计分台' : '未回传'),
          reviewStatus,
          anomaly: record.anomaly || '',
          record,
          isSchedule: true
        };
      });
    }
    const legacyRows = [
      ['G1001', '猛虎U12', '闪电U12', 72, 58, '07-18 09:00', '李远', 'approved'],
      ['G1002', '星火U12', '飓风U12', 59, 61, '07-18 10:30', '王越', 'returned'],
      ['G1003', '雷霆U12', '星火U12', 68, 66, '07-18 10:30', '孙海', 'warning'],
      ['G1004', '闪电U12', '飓风U12', 64, 60, '07-18 15:00', '李远', 'pending'],
      ['G1005', '雷霆U12', '猛虎U12', 80, 75, '07-18 15:30', '刘敏', 'approved'],
      ['G1006', '猛虎U12', '闪电U12', 62, 55, '07-18 18:00', '赵静', 'pending']
    ];
    return legacyRows.map(([id, home, away, homeScore, awayScore, time, submittedBy, fallbackStatus]) => {
      const saved = state.resultReviews?.[id];
      const manual = state.resultManualRecords?.[id] || {};
      const finalHomeScore = scoreValue(manual.homeScore) ?? homeScore;
      const finalAwayScore = scoreValue(manual.awayScore) ?? awayScore;
      const manualSubmittedBy = manual.submittedBy || submittedBy;
      const manualReviewStatus = ['PC后台', '赛事后台'].includes(manualSubmittedBy) ? 'approved' : (manual.reviewStatus || saved || fallbackStatus);
      return { id, group: 'U12 竞技组', phase: '小组赛', round: '第 1 轮', home, away, homeScore: finalHomeScore, awayScore: finalAwayScore, scoreReady: true, scoreText: `${finalHomeScore} : ${finalAwayScore}`, time, venue: '1号场', submittedBy: manualSubmittedBy, reviewStatus: manualReviewStatus, anomaly: fallbackStatus === 'warning' ? '球员得分合计与球队总分相差 2 分' : '', record: manual, isSchedule: false };
    });
  }

  function resultPosterSettings(eventSpace = activeEventSpace()) {
    const defaults = { style: 'orange', qrUrl: '', title: '赛事战报' };
    if (!eventSpace) return defaults;
    eventSpace.resultReportSettings = Object.assign(defaults, eventSpace.resultReportSettings || {});
    return eventSpace.resultReportSettings;
  }

  function resultPosterMarkup(eventSpace, rows, settings = resultPosterSettings(eventSpace), date = '') {
    const completedRows = rows.filter((row) => row.scoreReady && row.reviewStatus === 'approved' && (!date || String(row.time).startsWith(date)));
    const title = settings.title || `${eventSpace?.name || '赛事'} · 赛事战报`;
    const reportDate = date || (completedRows[0] ? String(completedRows[0].time).split(' ')[0] : '比赛日待定');
    return `<div class="result-poster result-poster-${esc(settings.style || 'orange')}" data-result-poster>
      <header class="result-poster-header"><span>赛小蜂篮球 · 正式赛事战报</span><h2>${esc(title)}</h2><p>${esc(reportDate)}　·　${completedRows.length} 场已完成</p></header>
      <div class="result-poster-list">${completedRows.length ? completedRows.map((row, index) => `<article class="result-poster-match"><span class="result-poster-index">${String(index + 1).padStart(2, '0')}</span><div class="result-poster-team home">${teamBadge(row.home, teamLogoFor(row.home, eventSpace))}<b>${esc(row.home)}</b></div><strong>${row.homeScore}</strong><em>VS</em><strong>${row.awayScore}</strong><div class="result-poster-team away"><b>${esc(row.away)}</b>${teamBadge(row.away, teamLogoFor(row.away, eventSpace))}</div><small>${esc([row.group, row.phase, row.round].filter(Boolean).join(' · '))}</small></article>`).join('') : '<div class="result-poster-empty"><b>暂无已复核赛果</b><span>只有主办方确认后的比分会进入正式赛事战报。</span></div>'}</div>
      <footer class="result-poster-footer"><span>${esc(eventSpace?.name || '赛事')} · 以后台复核发布版本为准</span>${settings.qrUrl ? `<div class="result-poster-qr"><img src="${esc(settings.qrUrl)}" alt="服务号二维码"><small>扫码关注服务号</small></div>` : '<div class="result-poster-qr is-empty"><span>可在版面调整中设置二维码</span></div>'}</footer>
    </div>`;
  }

  function resultMatchupCell(row, eventSpace = activeEventSpace()) {
    const scoreText = row.scoreReady ? row.scoreText : '- : -';
    return `<div class="result-matchup"><div class="result-team-inline home">${teamBadge(row.home, teamLogoFor(row.home, eventSpace))}<b>${esc(row.home)}</b></div><div class="result-score-center"><strong class="${row.scoreReady ? '' : 'is-pending'}">${esc(scoreText)}</strong></div><div class="result-team-inline away"><b>${esc(row.away)}</b>${teamBadge(row.away, teamLogoFor(row.away, eventSpace))}</div></div>`;
  }

  function knockoutBracketMarkup(eventSpace, rows) {
    const knockoutRows = rows.filter((row) => row.phase === '淘汰赛' || /淘汰|半决赛|三.?四名|决赛/.test(`${row.phase || ''} ${row.round || ''}`));
    if (!knockoutRows.length) return '';
    const stagePriority = (label) => {
      const value = String(label || '');
      if (/半决赛/.test(value)) return 20;
      if (/三.?四名/.test(value)) return 30;
      if (/决赛/.test(value)) return 40;
      if (/八强|四分之一|1\/4/.test(value)) return 10;
      return 15;
    };
    const stageValue = (row) => {
      const slot = Number(row.match?.slot);
      const fallback = stagePriority(row.round || row.phase);
      return (Number.isFinite(slot) ? slot : 99) * 100 + fallback;
    };
    const groups = new Map();
    knockoutRows.forEach((row) => {
      const baseGroup = String(row.match?.competitionGroup || row.group || '全部组别').split(' · ')[0].trim() || '全部组别';
      const stage = String(row.round || row.match?.stage || row.phase || '淘汰赛').trim() || '淘汰赛';
      if (!groups.has(baseGroup)) groups.set(baseGroup, new Map());
      const stages = groups.get(baseGroup);
      if (!stages.has(stage)) stages.set(stage, []);
      stages.get(stage).push(row);
    });
    const bracketIdentity = (name) => {
      const value = String(name || '待定');
      if (/待定|场序|胜者|负者|第[一二三四]|[AB]组第/.test(value)) {
        const slot = value.match(/[A-Z]/i)?.[0] || value.match(/\d+/)?.[0] || '签';
        return `<span class="bracket-slot-icon">${esc(slot)}</span>`;
      }
      return teamBadge(value, teamLogoFor(value, eventSpace));
    };
    const card = (row, stage = '') => {
      const ready = row.scoreReady;
      const statusLabel = ready ? resultStatusLabel(row.reviewStatus) : '待录入';
      const statusTone = ready ? resultStatusTone(row.reviewStatus) : 'warn';
      const homeWinner = ready && Number(row.homeScore) > Number(row.awayScore);
      const awayWinner = ready && Number(row.awayScore) > Number(row.homeScore);
      return `<article class="bracket-pair ${ready && row.reviewStatus === 'approved' ? 'is-approved' : ''}">
        <header><b>${esc(row.id)}${stage ? ` · ${esc(stage)}` : ''}</b>${status(statusLabel, statusTone)}</header>
        <div class="bracket-team-row ${homeWinner ? 'is-winner' : ready && !homeWinner ? 'is-loser' : ''}">${bracketIdentity(row.home)}<b>${esc(row.home)}</b><strong>${ready ? row.homeScore : '—'}</strong></div>
        <div class="bracket-team-row ${awayWinner ? 'is-winner' : ready && !awayWinner ? 'is-loser' : ''}">${bracketIdentity(row.away)}<b>${esc(row.away)}</b><strong>${ready ? row.awayScore : '—'}</strong></div>
        <footer><span>${esc(row.time || '待安排')}</span><span>${esc(row.venue || '场地待定')}</span></footer>
      </article>`;
    };
    const snakeCard = (row, stage = '') => {
      const ready = row.scoreReady;
      const statusLabel = ready ? resultStatusLabel(row.reviewStatus) : '待录入';
      const statusTone = ready ? resultStatusTone(row.reviewStatus) : 'warn';
      const homeWinner = ready && Number(row.homeScore) > Number(row.awayScore);
      const awayWinner = ready && Number(row.awayScore) > Number(row.homeScore);
      const score = ready ? `${row.homeScore} : ${row.awayScore}` : '—';
      return `<article class="knockout-match-card ${ready && row.reviewStatus === 'approved' ? 'is-approved' : ''}">
        <header><b>${esc(row.id)}${stage ? ` · ${esc(stage)}` : ''}</b>${status(statusLabel, statusTone)}</header>
        <div class="knockout-match-team ${homeWinner ? 'is-winner' : ready && !homeWinner ? 'is-loser' : ''}">${bracketIdentity(row.home)}<b>${esc(row.home)}</b></div>
        <div class="knockout-match-score"><strong class="${ready ? '' : 'is-pending'}">${esc(score)}</strong></div>
        <div class="knockout-match-team is-away ${awayWinner ? 'is-winner' : ready && !awayWinner ? 'is-loser' : ''}">${bracketIdentity(row.away)}<b>${esc(row.away)}</b></div>
        <footer><span>${esc(row.time || '待安排')}</span><span>${esc(row.venue || '场地待定')}</span></footer>
      </article>`;
    };
    const groupMarkup = [...groups.entries()].map(([groupName, stages]) => {
      const orderedStages = [...stages.entries()].sort((left, right) => {
        const leftValue = Math.min(...left[1].map(stageValue));
        const rightValue = Math.min(...right[1].map(stageValue));
        return leftValue - rightValue;
      });
      const semiMatches = orderedStages.filter(([stage]) => /半决赛/.test(stage)).flatMap(([, matches]) => matches);
      const bronzeMatches = orderedStages.filter(([stage]) => /三.?四名/.test(stage)).flatMap(([, matches]) => matches);
      const finalMatches = orderedStages.filter(([stage]) => /决赛/.test(stage) && !/半决赛|三.?四名/.test(stage)).flatMap(([, matches]) => matches);
      const hasFinalFlow = semiMatches.length && (bronzeMatches.length || finalMatches.length);
      const semifinalCards = semiMatches.map((row) => snakeCard(row, '半决赛')).join('') || '<div class="knockout-match-card is-empty">半决赛场次待生成</div>';
      const finalCards = finalMatches.map((row) => snakeCard(row, '决赛')).join('') || '<div class="knockout-match-card is-empty">决赛场次待生成</div>';
      const bronzeCards = bronzeMatches.map((row) => snakeCard(row, '三、四名赛')).join('') || '<div class="knockout-match-card is-empty">三、四名赛待生成</div>';
      const roundsMarkup = hasFinalFlow
        ? `<div class="knockout-snake-flow"><section class="knockout-bracket-round knockout-snake-semifinals"><h4>半决赛</h4>${semifinalCards}</section><div class="knockout-snake-connectors" aria-hidden="true"><svg viewBox="0 0 120 240" preserveAspectRatio="none"><path class="winner-path" d="M0 70 H58 V70 H120"/><path class="loser-path" d="M0 174 H58 V174 H120"/></svg><span class="winner-label">胜者</span><span class="loser-label">负者</span></div><div class="knockout-final-round">${finalCards}${bronzeCards}</div></div>`
        : `<div class="knockout-bracket-rounds">${orderedStages.map(([stage, matches]) => `<section class="knockout-bracket-round"><h4>${esc(stage)}</h4>${matches.sort((left, right) => Number(String(left.id).replace(/\D/g, '')) - Number(String(right.id).replace(/\D/g, ''))).map((row) => card(row, stage)).join('')}</section>`).join('')}</div>`;
      return `<section class="knockout-bracket-group"><header class="knockout-bracket-group-heading"><div><h3>${esc(groupName)} · 淘汰赛</h3><p>蛇形晋级图：胜者晋级决赛，负者进入三、四名赛</p></div><b>${orderedStages.reduce((sum, [, matches]) => sum + matches.length, 0)} 场</b></header>${roundsMarkup}</section>`;
    }).join('');
    return `<section class="panel knockout-bracket-panel"><header class="knockout-bracket-panel-heading"><div><h2>淘汰赛对阵图</h2><p>按真实赛程展示蛇形晋级路径，比分和晋级队伍随赛果同步更新。</p></div><strong>${knockoutRows.length} 场</strong></header><div class="knockout-bracket-scroll"><div class="knockout-bracket">${groupMarkup}</div></div><div class="info-banner knockout-bracket-note">${icon('git-branch')} 淘汰赛不计入小组积分；实线为胜者晋级路径，虚线为负者进入三、四名赛路径。</div></section>`;
  }

  function resultViewportSnapshot() {
    const list = content.querySelector('.results-list');
    return { listScrollTop: list?.scrollTop ?? 0, pageScrollTop: window.scrollY };
  }

  function restoreResultViewport(snapshot, matchId) {
    requestAnimationFrame(() => {
      const list = content.querySelector('.results-list');
      if (list) {
        list.scrollTop = snapshot?.listScrollTop ?? 0;
        const selectedRow = [...list.querySelectorAll('.result-row')].find((row) => row.dataset.match === matchId);
        if (selectedRow) selectedRow.classList.add('selected');
      }
      window.scrollTo({ top: snapshot?.pageScrollTop ?? window.scrollY, left: window.scrollX, behavior: 'auto' });
    });
  }

  function renderReview() {
    const eventSpace = activeEventSpace();
    const state = store.read();
    const workflow = eventWorkflow(eventSpace);
    const rows = resultRowsForEvent(eventSpace);
    if (!rows.length) return `${heading('赛果与复核', '赛后录入、核定并发布正式比分。', btn('前往赛程', 'go-schedule', 'primary', 'calendar-days'))}<div class="empty-state">${icon('clipboard-list', 'empty-icon')}<b>暂无已建比赛</b><span>请先生成竞赛日程，再录入赛果。</span></div>`;
    const selected = rows.find((row) => row.id === selectedReviewMatchId) || rows.find((row) => row.scoreReady && row.reviewStatus !== 'approved') || rows[0];
    selectedReviewMatchId = selected.id;
    const pendingInput = rows.filter((row) => !row.scoreReady).length;
    const pendingReview = rows.filter((row) => row.scoreReady && row.reviewStatus !== 'approved').length;
    const anomalies = rows.filter((row) => row.anomaly || row.reviewStatus === 'warning').length;
    const approved = rows.filter((row) => row.reviewStatus === 'approved').length;
    const dateOptions = [...new Set(rows.map((row) => String(row.time).split(' ')[0]).filter(Boolean))];
    const resultRowActions = (row) => {
      const editAction = `<button class="text-action" data-action="edit-result" data-match="${esc(row.id)}">${row.scoreReady ? '修改比分' : '录入比分'}</button>`;
      if (!row.scoreReady) return editAction;
      if (row.reviewStatus !== 'approved') return `${editAction}<button class="result-review-button" data-action="approve-result" data-match="${esc(row.id)}">复核</button>`;
      const completedLabel = ['PC后台', '赛事后台'].includes(row.submittedBy) ? '已生效' : '已复核';
      return `${editAction}<span class="result-reviewed-label">${completedLabel}</span>`;
    };
    const reviewMetrics = `<div class="review-metrics">${metric('待录入', String(pendingInput), '场', 'pencil-line', '后台补录后直接生效')}${metric('待确认', String(pendingReview), '场', 'clock-3', '现场比分点击复核')}${metric('异常数据', String(anomalies), '场', 'triangle-alert', '需要重点检查')}${metric('已通过', String(approved), '场', 'circle-check-big', '可进入积分与战报')}</div>`;
    if (resultReviewView === 'poster') {
      return `<div class="primary-page results-review-page">
        ${isDemoMode && !workflow.resultsApproved ? `<div class="info-banner test-flow-banner"><b>测试模式：</b>用于验证“现场回传—后台录入/修正—主办方复核—发布战报”的闭环。 ${btn('模拟现场回传全部赛果','test-return-results','outline','refresh-cw')}</div>` : ''}
        <div class="results-view-heading"><div><h2>赛果与复核</h2><p>同一份赛果同时提供结构化表格和图片式赛事战报。</p></div><div class="result-view-toggle"><button type="button" class="${resultReviewView === 'table' ? 'active' : ''}" data-action="set-result-view" data-view="table">表格展示</button><button type="button" class="${resultReviewView === 'poster' ? 'active' : ''}" data-action="set-result-view" data-view="poster">图片战报</button></div></div>
        <section class="result-poster-workspace"><div class="result-poster-stage">${resultPosterMarkup(eventSpace, rows, resultPosterSettings(eventSpace), dateOptions[0] || '')}</div><aside class="result-poster-side"><h3>每日赛事战报</h3><p>选择比赛日即可生成当天战报；样式与二维码在“赛事战报”中统一调整。</p><label class="field"><span>比赛日</span><select class="control" data-result-review-date>${dateOptions.map((date) => `<option value="${esc(date)}">${esc(date)}</option>`).join('')}</select></label>${btn('进入赛事战报设置','go-result-reports','primary','settings')}<div class="info-banner">当前已完成 ${approved} 场确认，${pendingReview} 场现场比分待确认，${pendingInput} 场待录入。图片战报只展示已保存比分。</div></aside></section>
      </div>`;
    }
    return `<div class="primary-page results-review-page">
      ${isDemoMode && !workflow.resultsApproved ? `<div class="info-banner test-flow-banner"><b>测试模式：</b>用于验证“现场回传—后台录入/修正—主办方复核—发布战报”的闭环。 ${btn('模拟现场回传全部赛果','test-return-results','outline','refresh-cw')}</div>` : ''}
      <div class="results-view-heading"><div><h2>赛果与复核</h2><p>现场裁判/计分员可回传比分；赛后主办方也可手动录入、修正并结束比赛。</p></div><div class="result-view-toggle"><button type="button" class="active" data-action="set-result-view" data-view="table">表格展示</button><button type="button" data-action="set-result-view" data-view="poster">图片战报</button></div></div>
      <div class="results-filterbar"><label>比赛日期 <select class="control"><option>全部比赛日</option>${dateOptions.map((date) => `<option>${esc(date)}</option>`).join('')}</select></label><label class="icon-input">${icon('search')}<input data-filter-target="result-row" placeholder="输入场次 / 队伍 / 提交人"></label><button class="btn" data-action="refresh">重置</button></div>
      <div class="results-main-grid"><section class="panel results-list"><header><div><h3>赛果列表</h3><span>共 ${rows.length} 场</span></div><label class="result-match-picker-label"><span>快速选择场次</span><select class="control result-match-picker" data-result-match-picker>${rows.map((row) => `<option value="${esc(row.id)}"${row.id === selected.id ? ' selected' : ''}>${esc(`${row.id} · ${row.phase} · ${row.home} - ${row.away}`)}</option>`).join('')}</select></label></header><table class="data-table"><thead><tr><th>场次</th><th>组别 / 阶段</th><th>对阵与比分</th><th>比赛时间</th><th>记录来源</th><th>操作</th></tr></thead><tbody>
        ${rows.map((row) => `<tr class="result-row ${row.id === selected.id ? 'selected' : ''}" data-search="${esc([row.id, row.group, row.phase, row.round, row.home, row.away, row.submittedBy, resultStatusLabel(row.reviewStatus)].join(' '))}" data-action="select-review" data-match="${esc(row.id)}"><td><b class="result-match-id">${esc(row.id)}</b></td><td>${esc(row.group)}<small>${esc([row.phase, row.round].join(' · '))}</small></td><td class="result-matchup-cell">${resultMatchupCell(row, eventSpace)}</td><td>${esc(row.time)}</td><td><span class="result-source">${esc(row.submittedBy)}</span></td><td class="result-actions">${resultRowActions(row)}</td></tr>`).join('')}
      </tbody></table><footer class="table-pagination"><span>已完成 ${rows.filter((row) => row.scoreReady).length} / ${rows.length} 场</span><div><button>‹</button><button class="active">1</button><button>›</button><select><option>10 条/页</option></select></div></footer></section>
      <aside class="panel result-detail"><header><div><h3>单场复核详情</h3><p>${esc([selected.group, selected.phase, selected.round].filter(Boolean).join(' · '))}</p></div><span>${esc(selected.id)}</span></header><div class="score-summary"><div>${teamBadge(selected.home, teamLogoFor(selected.home, eventSpace))}<b>${esc(selected.home)}</b></div><strong>${esc(selected.scoreText)}</strong><div>${teamBadge(selected.away, teamLogoFor(selected.away, eventSpace))}<b>${esc(selected.away)}</b></div></div><div class="result-state">${status(selected.scoreReady ? '比赛结束' : '等待赛后录入', selected.scoreReady ? 'ok' : 'warn')}<span>${esc(selected.time)} · ${esc(selected.venue)}</span></div>
        <section class="review-checklist"><div><span>比分记录</span>${status(selected.scoreReady ? '已录入' : '待录入', selected.scoreReady ? 'ok' : 'warn')}<small>${selected.scoreReady ? `主队 ${selected.homeScore} / 客队 ${selected.awayScore}` : '可由现场回传或后台补录'}</small></div><div><span>记录来源</span>${status(selected.submittedBy, selected.scoreReady ? 'ok' : 'warn')}<small>${selected.record?.lastEditedAt ? `最后编辑 ${selected.record.lastEditedAt}` : '尚无后台修正记录'}</small></div><div><span>确认状态</span>${status(resultStatusLabel(selected.reviewStatus), resultStatusTone(selected.reviewStatus))}<small>${selected.reviewStatus === 'approved' ? '已进入积分榜和赛事战报' : '现场比分确认后进入正式发布链路'}</small></div><div><span>操作日志</span>${status(`${selected.record?.history?.length || 0} 次`, 'ok')}<small>后台修改会追加记录，不覆盖历史版本</small></div></section>
        <div class="score-totals"><div><span>主队得分</span><b>${selected.homeScore === null ? '—' : selected.homeScore}</b></div><div><span>客队得分</span><b>${selected.awayScore === null ? '—' : selected.awayScore}</b></div></div><div class="result-detail-actions"><button type="button" class="btn outline" data-action="edit-result" data-match="${esc(selected.id)}">${selected.scoreReady ? '后台修正比分' : '后台录入比分'}</button></div><label class="review-note">复核备注（选填）<textarea data-result-review-note placeholder="记录异常说明或后台复核意见">${esc(selected.record?.reviewNote || '')}</textarea></label><div class="review-actions">${selected.scoreReady && selected.reviewStatus !== 'approved' ? btn('退回修改','return-selected-result','outline') : ''}${selected.scoreReady && selected.reviewStatus !== 'approved' ? btn('确认赛果','approve-selected-result','primary') : selected.reviewStatus === 'approved' ? '<span class="approved-result-note">赛果已确认，可在赛事战报中发布</span>' : ''}</div><p class="audit-note">${icon('info')} 确认赛果后进入积分榜和战报；后台修正必须保留修改原因和操作时间。</p>
      </aside></div>
      ${reviewMetrics}
    </div>`;
  }

  function renderReports() {
    const eventSpace = activeEventSpace();
    const rows = resultRowsForEvent(eventSpace);
    const dates = [...new Set(rows.map((row) => String(row.time || '').split(' ')[0]).filter(Boolean))];
    if (!dates.includes(resultReportDateFilter)) resultReportDateFilter = dates[0] || '';
    const settings = resultPosterSettings(eventSpace);
    const reportRows = rows.filter((row) => !resultReportDateFilter || String(row.time).startsWith(resultReportDateFilter));
    const completed = reportRows.filter((row) => row.scoreReady && row.reviewStatus === 'approved').length;
    const styles = [
      ['orange', '橙焰赛事', '醒目橙红，适合公众号与现场发布'],
      ['paper', '白底简报', '打印友好，适合每日赛事文件'],
      ['dark', '深色战报', '深色背景，适合大屏与社群分享']
    ];
    return `<div class="primary-page result-reports-page">
      ${heading('赛事战报', '按比赛日生成可发布的赛事战报；样式、二维码与打印版面统一在这里调整。', `${btn('版面调整','open-report-layout','outline','settings')}${btn('打印当前战报','print-result-report','primary','printer')}`)}
      <div class="report-toolbar"><label>赛事日期 <select class="control" data-result-report-date>${dates.map((date) => `<option value="${esc(date)}"${date === resultReportDateFilter ? ' selected' : ''}>${esc(date)}</option>`).join('')}</select></label><span>当前日期已复核 ${completed} / ${reportRows.length} 场</span><span class="report-qr-state">${settings.qrUrl ? `${icon('qr-code')} 已配置服务号二维码` : `${icon('qr-code')} 尚未配置二维码`}</span></div>
      <div class="report-style-picker"><div><b>战报样式</b><small>选择后即时预览，保存后作为本届赛事默认样式</small></div><div class="report-style-options">${styles.map(([key, label, description]) => `<button type="button" class="${settings.style === key ? 'active' : ''}" data-action="set-report-style" data-style="${key}"><span class="report-style-swatch report-style-swatch-${key}"></span><span><b>${esc(label)}</b><small>${esc(description)}</small></span></button>`).join('')}</div></div>
      <section class="result-poster-workspace"><div class="result-poster-stage">${resultPosterMarkup(eventSpace, rows, settings, resultReportDateFilter)}</div><aside class="result-poster-side"><h3>版面调整</h3><p>二维码仅用于引导关注服务号，不影响赛果核定。二维码可在本页“版面调整”中替换。</p><div class="report-layout-summary"><div><span>赛事</span><b>${esc(eventSpace?.name || '赛事')}</b></div><div><span>比赛日</span><b>${esc(resultReportDateFilter || '待定')}</b></div><div><span>战报场次</span><b>${completed} 场</b></div><div><span>二维码</span><b>${settings.qrUrl ? '已配置' : '未配置'}</b></div></div>${btn('设置二维码与标题','open-report-layout','primary','qr-code')}<div class="info-banner">正式发布前请先完成赛果复核；未复核的比分不会出现在正式战报中。</div></aside></section>
    </div>`;
  }

  function standingRowMeta(eventSpace, row) {
    const match = row?.match || row || {};
    const rawGroup = String(match.group || row?.group || match.competitionGroup || row?.competitionGroup || '全部组别');
    const baseName = String(match.competitionGroup || row?.competitionGroup || rawGroup.split(' · ')[0] || '全部组别').trim() || '全部组别';
    const subgroup = String(match.subgroup || row?.subgroup || (rawGroup.includes(' · ') ? rawGroup.split(' · ').slice(1).join(' · ') : '')).trim();
    const stageName = String(match.stage || row?.stage || '').trim();
    const phaseName = String(match.phase || row?.phase || '').trim();
    // 只有循环/小组阶段进入积分榜；淘汰赛、半决赛、三四名和决赛永远不计入积分。
    const isStanding = Boolean(match.standingsEligible)
      || phaseName === '小组赛'
      || (/循环/.test(stageName) && !/淘汰/.test(stageName));
    const groupRow = (eventSpace?.groupRows || []).find((item) => item.name === baseName);
    const config = groupRow ? competitionConfig(groupRow) : defaultCompetitionConfig({ target: 2 });
    const points = config?.points || {};
    const pointRule = {
      win: Number.isFinite(Number(points.win)) ? Number(points.win) : 2,
      draw: Number.isFinite(Number(points.draw)) ? Number(points.draw) : 1,
      loss: Number.isFinite(Number(points.loss)) ? Number(points.loss) : 0
    };
    const normalizedStage = stageName || (phaseName === '小组赛' ? '小组单循环' : phaseName || '循环赛');
    const scope = subgroup || (normalizedStage !== '小组单循环' && normalizedStage !== '小组赛' ? normalizedStage : '');
    return {
      key: `${baseName}|||${scope}`,
      baseName,
      subgroup,
      stageName: normalizedStage,
      label: [baseName, scope].filter(Boolean).join(' · '),
      isStanding,
      pointRule,
      advancePerGroup: subgroup ? Math.max(0, Number(config?.advancePerGroup || 0)) : 0,
      competition: groupRow?.competition || formatTypeLabel(config?.formatType)
    };
  }

  function isPlaceholderStandingTeam(name) {
    return !name || /^(待定|待抽签球队|半决赛待定|决赛待定|三、四名决赛待定)/.test(String(name).trim());
  }

  function pointForStandingResult(homeScore, awayScore, pointRule) {
    if (homeScore === awayScore) return pointRule.draw;
    return homeScore > awayScore ? pointRule.win : pointRule.loss;
  }

  function standingResultState(row) {
    if (!row?.scoreReady) return 'excluded';
    if (row.reviewStatus === 'approved') return 'official';
    if (row.reviewStatus === 'returned' || row.reviewStatus === 'warning') return 'excluded';
    return 'provisional';
  }

  function standingsDataForEvent(eventSpace = activeEventSpace()) {
    const sourceRows = resultRowsForEvent(eventSpace);
    const groups = new Map();
    const ensureGroup = (meta) => {
      if (!groups.has(meta.key)) groups.set(meta.key, { ...meta, teams: new Map() });
      return groups.get(meta.key);
    };
    const ensureTeam = (group, name) => {
      if (isPlaceholderStandingTeam(name)) return null;
      if (!group.teams.has(name)) group.teams.set(name, { name, played: 0, win: 0, draw: 0, loss: 0, forScore: 0, against: 0, approvedMatches: 0, provisionalMatches: 0, points: 0 });
      return group.teams.get(name);
    };
    sourceRows.forEach((row) => {
      const meta = standingRowMeta(eventSpace, row);
      if (!meta.isStanding) return;
      const group = ensureGroup(meta);
      ensureTeam(group, row.home);
      ensureTeam(group, row.away);
      const resultState = standingResultState(row);
      if (resultState === 'excluded') return;
      const home = ensureTeam(group, row.home);
      const away = ensureTeam(group, row.away);
      if (!home || !away) return;
      home.played += 1; away.played += 1;
      home.forScore += row.homeScore; home.against += row.awayScore;
      away.forScore += row.awayScore; away.against += row.homeScore;
      if (resultState === 'official') {
        home.approvedMatches += 1; away.approvedMatches += 1;
      } else {
        home.provisionalMatches += 1; away.provisionalMatches += 1;
      }
      if (row.homeScore === row.awayScore) {
        home.draw += 1; away.draw += 1;
      } else if (row.homeScore > row.awayScore) {
        home.win += 1; away.loss += 1;
      } else {
        away.win += 1; home.loss += 1;
      }
      home.points += pointForStandingResult(row.homeScore, row.awayScore, group.pointRule);
      away.points += pointForStandingResult(row.awayScore, row.homeScore, group.pointRule);
    });
    return [...groups.values()].map((group) => ({
      ...group,
      teams: [...group.teams.values()].map((team) => ({
        ...team,
        diff: team.forScore - team.against
      })).sort((a, b) => b.points - a.points || b.diff - a.diff || b.forScore - a.forScore || a.name.localeCompare(b.name, 'zh-CN'))
    }));
  }

  function standingsMatrixMarkup(eventSpace, group) {
    const teams = group.teams.map((team) => team.name);
    const rows = resultRowsForEvent(eventSpace).filter((row) => {
      const meta = standingRowMeta(eventSpace, row);
      return meta.isStanding && meta.key === group.key && standingResultState(row) !== 'excluded';
    });
    if (!teams.length) return '';
    const findCell = (team, opponent) => {
      const match = rows.find((row) => (row.home === team && row.away === opponent) || (row.home === opponent && row.away === team));
      if (!match) return '<span class="matrix-empty">—</span>';
      const homePerspective = match.home === team;
      const teamScore = homePerspective ? match.homeScore : match.awayScore;
      const opponentScore = homePerspective ? match.awayScore : match.homeScore;
      const score = `<b class="matrix-scoreline"><span class="${teamScore > opponentScore ? 'is-winner' : ''}">${teamScore}</span><i>:</i><span class="${opponentScore > teamScore ? 'is-winner' : ''}">${opponentScore}</span></b>`;
      const point = homePerspective
        ? pointForStandingResult(match.homeScore, match.awayScore, group.pointRule)
        : pointForStandingResult(match.awayScore, match.homeScore, group.pointRule);
      const provisional = standingResultState(match) === 'provisional';
      return `<span class="matrix-score ${provisional ? 'is-provisional' : ''}">${score}<small>${provisional ? `${point}分 · 试算` : point}</small></span>`;
    };
    const provisionalCount = rows.filter((row) => standingResultState(row) === 'provisional').length;
    return `<section class="panel standings-matrix-panel"><header class="panel-header"><h3>${esc(group.label)} · 赛果矩阵</h3><span>已录入即时更新${provisionalCount ? ` · ${provisionalCount} 场试算` : ''}</span></header><div class="standings-matrix-wrap"><div class="standings-matrix-canvas"><table class="standings-matrix"><thead><tr><th>球队</th>${teams.map((team) => `<th>${esc(team)}</th>`).join('')}</tr></thead><tbody>${teams.map((team) => `<tr><th>${esc(team)}</th>${teams.map((opponent) => `<td class="${team === opponent ? 'matrix-diagonal' : ''}">${team === opponent ? '' : findCell(team, opponent)}</td>`).join('')}</tr>`).join('')}</tbody></table><span class="matrix-diagonal-guide" aria-hidden="true"></span></div></div><div class="matrix-legend"><span><b>${group.pointRule.win}</b> 胜</span><span><b>${group.pointRule.draw}</b> 平</span><span><b>${group.pointRule.loss}</b> 负</span>${provisionalCount ? '<span class="matrix-provisional-legend"><i></i> 现场比分试算</span>' : ''}</div></section>`;
  }

  function renderStandings() {
    const eventSpace = activeEventSpace();
    const groups = standingsDataForEvent(eventSpace);
    const totalApproved = groups.reduce((sum, group) => sum + group.teams.reduce((count, team) => count + team.approvedMatches, 0), 0) / 2;
    const totalProvisional = groups.reduce((sum, group) => sum + group.teams.reduce((count, team) => count + team.provisionalMatches, 0), 0) / 2;
    const totalRecorded = totalApproved + totalProvisional;
    const hasRecorded = totalRecorded > 0;
    const configuredGroups = (eventSpace?.groupRows || []).map((item) => {
      const config = competitionConfig(item);
      return { name: item.name, competition: item.competition || formatTypeLabel(config?.formatType), points: config?.points || {} };
    });
    const formatSummary = configuredGroups.length
      ? configuredGroups.map((item) => `${item.name} · ${item.competition}`).join('；')
      : '尚未配置组别赛制';
    const blocks = groups.length ? groups.map((group) => {
      const descriptor = group.subgroup ? `小组赛 · ${group.subgroup}` : `${group.stageName} · ${group.competition}`;
      const advanceHint = group.advancePerGroup ? `前 ${group.advancePerGroup} 名进入下一阶段` : '本阶段按积分排名';
      return `${panel(`${esc(group.label)}积分榜`, `<div class="standings-block-meta"><span>${esc(descriptor)}</span><b>${esc(advanceHint)}</b></div><table class="data-table standings-table"><thead><tr><th>排名</th><th>球队</th><th>赛</th><th>胜</th><th>平</th><th>负</th><th>得分</th><th>失分</th><th>净胜分</th><th>积分</th></tr></thead><tbody>${group.teams.map((team, index) => {
        return `<tr class="${team.provisionalMatches ? 'has-provisional-result' : ''}"><td><b class="${group.advancePerGroup && index < group.advancePerGroup ? 'orange-text' : ''}">${index + 1}</b></td><td>${teamCell(team.name, '', teamLogoFor(team.name, eventSpace))}</td><td>${team.played}</td><td>${team.win}</td><td>${team.draw}</td><td>${team.loss}</td><td>${team.forScore}</td><td>${team.against}</td><td>${team.diff > 0 ? '+' : ''}${team.diff}</td><td><b>${team.points}</b>${team.provisionalMatches ? '<small class="standings-provisional-tag">试算</small>' : ''}</td></tr>`;
      }).join('')}</tbody></table>`)}${standingsMatrixMarkup(eventSpace, group)}`;
    }).join('') : `<section class="panel"><div class="module-empty compact"><b>暂无可统计球队</b><span>当前赛制尚未产生可排名的循环赛场次，或尚未录入有效赛果。</span></div></section>`;
    const pointRules = configuredGroups.length ? [...new Map(configuredGroups.map((item) => [`${item.points.win}-${item.points.draw}-${item.points.loss}`, item.points])).values()].map((points) => `胜 ${Number(points.win ?? 2)} 分 / 平 ${Number(points.draw ?? 1)} 分 / 负 ${Number(points.loss ?? 0)} 分`).join('；') : '按当前组别赛制配置';
    return `${heading('积分与球队', '积分榜、赛果矩阵与淘汰赛对阵图按赛制自动生成；淘汰赛不计入小组积分。', `${btn('前往赛果复核', 'go-results-review', 'outline', 'circle-check-big')}${btn('发布积分榜', 'publish-standings', 'primary', 'upload')}`)}
      <div class="standings-scope-summary"><div><span>当前赛制</span><b>${esc(formatSummary)}</b></div><div><span>统计状态</span><b>按已录入比分动态统计</b></div><div><span>晋级关系</span><b>在本页查看淘汰赛对阵图</b></div></div>
      <div class="toolbar"><div class="toolbar-group"><span class="filter-summary">当前赛事 · ${configuredGroups.length} 个赛制组别 · ${groups.length} 个积分分组 · ${hasRecorded ? `${Math.round(totalRecorded)} 场已录入${totalProvisional ? `（${Math.round(totalProvisional)} 场试算）` : ''}` : '尚无已录入循环赛'}</span></div>${btn('排名规则', 'ranking-rules', 'outline', 'settings')}</div>
      ${blocks}
      ${knockoutBracketMarkup(eventSpace, resultRowsForEvent(eventSpace))}
      <div class="info-banner">积分规则：${esc(pointRules)}。现场回传比分发布前以“试算”展示；后台录入比分直接进入正式积分，退回或异常赛果不计入。淘汰赛比分不会改变小组积分榜或小组赛果矩阵。</div>`;
  }

  function renderBracket() {
    const matches = [
      ['1/4 决赛 1','A1 雷霆队','B2 飞跃队','68 : 55'],
      ['1/4 决赛 2','B1 蓝鲸队','A2 勇士队','72 : 66'],
      ['1/4 决赛 3','C1 晨光队','D2 猎鹰队','待赛'],
      ['1/4 决赛 4','D1 雄鹿队','C2 极光队','待赛']
    ];
    return `${heading('淘汰赛晋级', '小组赛结束后按第二阶段规则自动生成签位，并随复核赛果推进。', btn('发布对阵图', 'publish-bracket', 'primary', 'upload'))}
      <section class="panel bracket"><div class="bracket-round"><h3>1/4 决赛</h3>${matches.map(([label,home,away,score]) => `<div class="bracket-match"><small>${label}</small><div><span>${home}</span><b>${score}</b></div><div><span>${away}</span></div></div>`).join('')}</div><div class="bracket-connect">${icon('chevron-right')}${icon('chevron-right')}</div><div class="bracket-round"><h3>半决赛</h3><div class="bracket-match tall"><small>半决赛 1</small><div><span>雷霆队</span><b>待赛</b></div><div><span>蓝鲸队</span></div></div><div class="bracket-match tall"><small>半决赛 2</small><div><span>待定</span><b>待赛</b></div><div><span>待定</span></div></div></div><div class="bracket-connect">${icon('chevron-right')}</div><div class="bracket-round final"><h3>决赛</h3><div class="bracket-match final-card"><small>总决赛</small><div><span>待定</span><b>08-26 19:00</b></div><div><span>待定</span></div></div></div></section>
      <div class="info-banner">晋级结果只读取“已复核通过”的赛果。退回补录不会提前推进下一轮。</div>`;
  }

  function renderPlayerData() {
    const rows = [
      ['张子轩','雷霆队','4','18.5','6.8','5.2','2.1','0.6','2.3','48.6%','38.2%','82.5%'],
      ['李明宇','雷霆队','4','15.3','3.1','4.8','1.7','0.4','1.8','45.2%','35.0%','76.9%'],
      ['陈梓豪','极光队','4','14.7','8.2','2.1','1.1','1.2','2.0','52.8%','28.6%','71.4%'],
      ['周浩然','飞跃队','3','13.9','5.4','3.6','2.4','0.3','1.6','44.1%','40.0%','88.9%']
    ];
    return `${heading('球员数据', '展示已购买数据包且完成记录任务的球员统计；命中率由命中/出手自动计算。', btn('导出数据', 'export', 'outline', 'download'))}
      <div class="toolbar"><div class="toolbar-group"><select class="control"><option>U12 竞技组</option></select><select class="control"><option>全部球队</option></select></div><span class="legend-note">两分命中率 · 三分命中率 · 罚球命中率</span></div>
      ${panel('球员场均技术统计', `<table class="data-table player-stats"><thead><tr><th>球员</th><th>球队</th><th>场次</th><th>得分</th><th>篮板</th><th>助攻</th><th>抢断</th><th>盖帽</th><th>失误</th><th>两分%</th><th>三分%</th><th>罚球%</th></tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell,index) => `<td>${index===0?`<b>${cell}</b>`:index===1?teamCell(cell):index>=9?`<b class="orange-text">${cell}</b>`:cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`)}
      <div class="info-banner">记录台必须录入“命中”与“出手”两类动作，不能只点得分；系统据此计算命中率并生成家长端个人报告。</div>`;
  }

  function renderSettlement() {
    const state = store.read();
    const settled = state.settlementStatus === 'settled';
    const orders = [
      ['DP20260720001','G1003','张子轩','¥50.00','¥7.50','¥10.00','¥32.50','待比赛完成'],
      ['DP20260720002','G1003','李明宇','¥50.00','¥7.50','¥10.00','¥32.50','待比赛完成'],
      ['DP20260720003','G1004','陈梓豪','¥50.00','¥7.50','¥10.00','¥32.50','可结算'],
      ['DP20260720004','G1005','杨帆','¥50.00','¥7.50','¥10.00','¥32.50',settled?'已结算':'可结算']
    ];
    return `${heading('数据包分账', '平台统一收取球员数据包费用，任务完成并通过赛果复核后按 15% / 20% / 65% 分账。', btn(settled?'已完成结算':'发起结算', 'settle', settled?'outline':'primary', 'wallet-cards'))}
      <div class="metrics finance-metrics">${metric('数据包实收','¥850.00','','credit-card','17 份 × ¥50')}${metric('平台服务费','¥127.50','','percent','15%')}${metric('主办方分成','¥170.00','','building-2','20%')}${metric('记录员收入','¥552.50','','user-round-check','65%')}</div>
      <div class="split-layout">
        ${panel('分账明细', `<table class="data-table"><thead><tr><th>订单</th><th>场次</th><th>球员</th><th>实收</th><th>平台 15%</th><th>主办方 20%</th><th>记录员 65%</th><th>状态</th></tr></thead><tbody>${orders.map((row) => `<tr>${row.map((cell,index) => `<td class="${index>=3&&index<=6?'money':''}">${index===0?`<b>${cell}</b>`:index===7?status(cell,cell==='已结算'?'ok':cell==='可结算'?'live':'warn'):cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`)}
        ${panel('分账结构', `<div class="donut-wrap"><div class="donut"><span>¥850</span></div><div class="legend-list"><div><i class="orange"></i><span>平台服务费</span><b>15%</b></div><div><i class="yellow"></i><span>主办方</span><b>20%</b></div><div><i class="green"></i><span>记录员</span><b>65%</b></div></div></div><div class="info-banner">主办方负责安排记录任务、处理异常和确认履约，因此保留 20% 分成。</div>`)}
      </div>`;
  }

  function renderPage(section, page) {
    if (section === 'spaces') return renderEventSpace();
    if (section === 'workbench') return renderWorkbench();
    const workflow = eventWorkflow();
    const hasRegisteredTeams = registrationTeamRows(activeEventSpace()).length > 0;
    const hasOfficialTeams = officialTeams(activeEventSpace()).length > 0;
    const blockedSection = (
      (section === 'registration' && !workflow.registrationConfigured)
      || ((section === 'draw' || section === 'teams') && !hasOfficialTeams)
      // 赛程设置是排赛前置资源，可在抽签完成前维护；日历与场次列表仍需等待抽签结果。
      || (section === 'schedule' && !workflow.drawSaved && page !== 'settings')
      || (section === 'onsite' && !workflow.scheduleGenerated)
      || (section === 'results' && !workflow.executionReturned && !workflow.scheduleGenerated)
    );
    if (blockedSection && !['event'].includes(section)) {
      const emptyPages = {
        registration: ['报名与资格', '尚无球队入驻', '先在赛事管理中完成报名设置并生成入驻入口。', 'go-event-registration', '前往报名设置'],
        draw: ['抽签与分组', '尚无可分组球队', '当前赛事还没有参赛球队。人工添加或小程序入驻的球队保存后，会自动进入对应组别的抽签名单。', 'go-registration-progress', '查看入驻进度'],
        teams: ['球队与球员', '尚无球队和球员', '球队负责人将在小程序中创建或认领球队，家长通过服务号补全球员资料。', 'go-registration-progress', '查看入驻进度'],
        schedule: ['赛程与场次', '尚未生成赛程', '请先完成组别、球队、赛制和场馆配置，再启动自动排赛。', 'go-event-groups', '配置组别与赛制'],
        onsite: ['现场执行', '尚无现场任务', '赛程生成后，系统才会按场次建立技术台人员与设备任务。', 'go-schedule', '查看赛程条件'],
        results: ['赛果与数据', '尚无比赛结果', '先生成竞赛日程；赛后可由现场计分台回传，也可由后台直接录入比分。', 'go-schedule', '查看赛程']
      };
      const [title, emptyTitle, description, action, label] = emptyPages[section];
      return `${heading(title, '当前赛事只展示已经完成前置步骤后产生的数据。')}
        <section class="panel blank-module-page"><div class="module-empty">${icon('clipboard-list')}<b>${emptyTitle}</b><span>${description}</span>${btn(label, action, 'primary', 'chevron-right')}</div></section>`;
    }
    const key = `${section}/${page}`;
    const renderers = {
      'event/profile': renderEventProfile,
      'event/groups': renderEventGroupList,
      'event/format': renderEventFormat,
      'event/registration': renderEventRegistration,
      'event/posters': renderEventPosters,
      'event/rules': renderEventRules,
      'registration/progress': renderRegistrationProgress,
      'registration/claims': renderClaims,
      'registration/qualification': renderQualification,
      'registration/rosters': renderRosters,
      'draw/groups': () => renderDrawGroups('groups'),
      'draw/round-robin': () => renderDrawGroups('round-robin'),
      'draw/knockout': () => renderDrawGroups('knockout'),
      'teams/teams': renderTeamsLibrary,
      'teams/players': renderPlayersArchive,
      'schedule/auto': renderAutoSchedule,
      'schedule/calendar': renderCalendar,
      'schedule/matches': renderMatches,
      'schedule/detail': renderMatchDetail,
      'schedule/settings': renderScheduleSettings,
      'onsite/people': renderPeople,
      'onsite/referees': renderReferees,
      'onsite/data-tasks': renderDataTasks,
      'onsite/consoles': renderConsoles,
      'results/review': renderReview,
      'results/standings': renderStandings,
      'results/reports': renderReports,
      'results/bracket': renderBracket,
      'results/players': renderPlayerData,
      'results/settlement': renderSettlement
    };
    return renderers[key] ? renderers[key]() : '<div class="empty-state"><b>页面未找到</b></div>';
  }

  function syncEventContext() {
    const eventSpace = activeEventSpace();
    eventSelector.innerHTML = eventSpaces.map((item) => `<option value="${esc(item.id)}"${item.id === eventSpace?.id ? ' selected' : ''}>${esc(item.name)}</option>`).join('');
    eventSelector.disabled = !eventSpace;
    eventStatus.textContent = eventSpace?.state || '待创建';
    eventDate.textContent = eventSpace ? displayEventDate(eventSpace) : '—';
  }

  function render() {
    const current = route();
    const routeKey = `${current.section}/${current.page}`;
    const routeChanged = routeKey !== lastRenderRouteKey;
    lastRenderRouteKey = routeKey;
    if (current.section === 'onsite' && current.page === 'people' && ['#onsite/bindings', '#onsite/data-tasks'].includes(location.hash)) {
      routeTo('onsite', 'people');
      return;
    }
    if (!eventSpaces.length && !current.isSpaceList) {
      routeTo('spaces');
      return;
    }
    if (current.section === 'teams' && !usesPlayerData() && location.hash !== '#teams/teams') {
      routeTo('teams', 'teams');
      return;
    }
    if (current.section === 'schedule' && current.page === 'auto') {
      routeTo('schedule', 'calendar');
      return;
    }
    if (current.section === 'draw') {
      const expectedDrawPage = drawNavigationForCurrentGroup()[0]?.[0] || 'groups';
      if (current.page !== expectedDrawPage) {
        routeTo('draw', expectedDrawPage);
        return;
      }
    }
    const navItem = currentNavItems().find((item) => item.id === current.section);
    shell.classList.toggle('space-list-mode', current.isSpaceList);
    renderNav(current.section, current.isSpaceList);
    if (current.isSpaceList) {
      subnavBar.hidden = true;
      subnavElement.innerHTML = '';
      pageActions.innerHTML = '';
    } else {
      renderSubnav(current.section, current.page);
    }
    moduleTitle.textContent = current.isSpaceList ? '赛事空间' : (navItem ? navItem.label : '赛事中心');
    spaceReturn.hidden = current.isSpaceList;
    syncEventContext();
    content.classList.toggle('workbench-content', current.section === 'workbench');
    content.classList.toggle('space-list-content', current.isSpaceList);
    content.innerHTML = renderPage(current.section, current.page);
    bindRegionPickers(content);
    bindDragAndDrop();
    bindPageInteractions();
    if (current.section === 'event' && current.page === 'rules') hydrateRuleRegistrationQr();
    if (current.section === 'registration' && current.page === 'progress' && (routeChanged || Date.now() - registrationCloudSyncAt > 15000)) syncCloudRegistrationTeams(false);
    if (current.section === 'event' && current.page === 'posters' && window.SXFPosterStudio) {
      const eventSpace = activeEventSpace();
      window.SXFPosterStudio.mount(document.getElementById('posterStudioRoot'), {
        event: eventSpace,
        settings: registrationSettings(eventSpace),
        toast: showToast,
        onPostersChange(records) {
          eventSpace.posterIds = records.map(record => record.id);
          eventSpace.primaryPosterId = records.find(record => record.isPrimary)?.id || records[0]?.id || '';
          persistEventSpaces();
        }
      }).catch((error) => {
        console.error('海报编辑器加载失败', error);
        showToast(location.protocol === 'file:' ? '请通过本地服务访问：npm run admin:serve 后打开 http://127.0.0.1:5174/tournament-center.html' : '海报编辑器加载失败，请刷新后重试');
      });
    }
    if (routeChanged) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function hydrateRuleRegistrationQr() {
    const eventSpace = activeEventSpace();
    const images = content.querySelectorAll('[data-rule-registration-qr]');
    if (!eventSpace || !images.length || !window.SXFTournamentQrCodeAdapter) return;
    try {
      const result = await window.SXFTournamentQrCodeAdapter.create({ eventId: eventSpace.id });
      if (!result?.url) return;
      eventSpace.registrationQrDataUrl = result.url;
      images.forEach((image) => { image.src = result.url; });
      persistEventSpaces();
    } catch (error) {
      console.warn('赛事规程报名码生成失败', error);
    }
  }

  function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toastElement.classList.remove('show'), 2600);
  }

  function openCompetitionSchedulePrint() {
    const sheet = content.querySelector('.competition-schedule-sheet');
    if (!sheet) {
      showToast('当前没有可打印的竞赛日程');
      return;
    }
    const orientation = competitionScheduleOrientation === 'landscape' ? 'landscape' : 'portrait';
    const printWindow = window.open('', '_blank', 'popup=yes,width=1100,height=850');
    if (!printWindow) {
      showToast('打印预览被浏览器拦截，请允许打开新窗口后重试');
      return;
    }
    const stylesheet = new URL('./tournament-center.css', window.location.href).href;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>竞赛日程打印预览</title><link rel="stylesheet" href="${esc(stylesheet)}"><style>@page{size:A4 ${orientation};margin:9mm}html,body{margin:0;background:#e9ecef}.print-preview-toolbar{position:sticky;top:0;z-index:10;height:58px;padding:0 24px;background:#11171b;color:#fff;display:flex;align-items:center;justify-content:space-between;font-family:system-ui,sans-serif}.print-preview-toolbar div{display:flex;gap:10px}.print-preview-toolbar button{height:36px;padding:0 20px;border:1px solid #ff7200;border-radius:5px;background:#ff7200;color:#fff;font-weight:700}.print-preview-toolbar button.secondary{background:transparent;color:#ff8a2c}.print-preview-page{padding:24px}.competition-schedule-sheet{box-sizing:border-box;margin:0 auto!important;max-width:${orientation === 'portrait' ? '210mm' : '297mm'}!important;min-height:${orientation === 'portrait' ? '297mm' : '210mm'};box-shadow:0 8px 30px #0003}.competition-schedule-sheet th:last-child,.competition-schedule-sheet td.schedule-serial-cell,.competition-schedule-sheet td.schedule-court-cell{text-align:center!important;vertical-align:middle!important}@media print{html,body{background:#fff}.print-preview-toolbar{display:none!important}.print-preview-page{padding:0}.competition-schedule-sheet{max-width:none!important;min-height:0!important;padding:0!important;border:0!important;box-shadow:none!important}}</style></head><body><div class="print-preview-toolbar"><b>竞赛日程 · A4 ${orientation === 'portrait' ? '竖版' : '横版'}</b><div><button type="button" onclick="window.print()">打印</button><button class="secondary" type="button" onclick="window.close()">关闭</button></div></div><main class="print-preview-page">${sheet.outerHTML}</main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    showToast('已打开竞赛日程打印预览');
    window.setTimeout(() => {
      try { printWindow.print(); } catch (_) { /* 打印预览页仍保留手动打印按钮 */ }
    }, 500);
  }

  function openResultReportPrint() {
    const poster = content.querySelector('.result-poster');
    if (!poster) {
      showToast('当前没有可打印的赛事战报');
      return;
    }
    const printWindow = window.open('', '_blank', 'popup=yes,width=900,height=1100');
    if (!printWindow) {
      showToast('打印预览被浏览器拦截，请允许打开新窗口后重试');
      return;
    }
    const stylesheet = new URL('./tournament-center.css', window.location.href).href;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>赛事战报打印预览</title><link rel="stylesheet" href="${esc(stylesheet)}"><style>@page{size:A4 portrait;margin:10mm}html,body{margin:0;background:#e9ecef}.print-preview-toolbar{position:sticky;top:0;z-index:10;height:58px;padding:0 24px;background:#11171b;color:#fff;display:flex;align-items:center;justify-content:space-between;font-family:system-ui,sans-serif}.print-preview-toolbar div{display:flex;gap:10px}.print-preview-toolbar button{height:36px;padding:0 20px;border:1px solid #ff7200;border-radius:5px;background:#ff7200;color:#fff;font-weight:700}.print-preview-toolbar button.secondary{background:transparent;color:#ff8a2c}.print-preview-page{padding:24px}.result-poster{margin:0 auto!important;max-width:180mm!important;min-height:260mm;box-shadow:0 8px 30px #0003}@media print{html,body{background:#fff}.print-preview-toolbar{display:none!important}.print-preview-page{padding:0}.result-poster{max-width:none!important;min-height:0!important;box-shadow:none!important}}</style></head><body><div class="print-preview-toolbar"><b>赛事战报 · A4 竖版</b><div><button type="button" onclick="window.print()">打印</button><button class="secondary" type="button" onclick="window.close()">关闭</button></div></div><main class="print-preview-page">${poster.outerHTML}</main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    showToast('已打开赛事战报打印预览');
    window.setTimeout(() => {
      try { printWindow.print(); } catch (_) { /* 预览页保留手动打印按钮 */ }
    }, 500);
  }

  async function exportCompetitionScheduleWorkbook() {
    const sheet = content.querySelector('.competition-schedule-sheet');
    const scheduleTable = sheet?.querySelector('table');
    if (!sheet || !scheduleTable) {
      showToast('当前没有可导出的竞赛日程');
      return;
    }
    if (!window.ExcelJS) {
      showToast('Excel 导出组件加载失败，请刷新页面后重试');
      return;
    }
    const eventSpace = activeEventSpace();
    const orientation = competitionScheduleOrientation === 'landscape' ? 'landscape' : 'portrait';
    const venue = sheet.querySelector('.competition-sheet-venue b')?.textContent.trim() || '待安排';
    const title = sheet.querySelector('.competition-sheet-heading h2')?.textContent.trim() || '竞赛日程';
    const summary = sheet.querySelector('.competition-sheet-heading p')?.textContent.trim() || '';
    const note = sheet.querySelector('footer span:first-child')?.textContent.trim() || '';
    const preparedAt = sheet.querySelector('footer span:last-child')?.textContent.trim() || '';
    showToast('正在生成正式 Excel 竞赛日程…');
    try {
      const workbook = new window.ExcelJS.Workbook();
      workbook.creator = '赛小蜂篮球';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('竞赛日程', {
        views: [{ showGridLines: false, zoomScale: 100 }],
        pageSetup: {
          paperSize: 9,
          orientation,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          horizontalCentered: true,
          margins: { left: 0.35, right: 0.35, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 }
        }
      });
      const widths = orientation === 'portrait' ? [9, 9, 11, 14, 8, 30, 10, 7] : [11, 11, 14, 17, 9, 43, 11, 7];
      worksheet.columns = widths.map((width) => ({ width }));
      worksheet.properties.defaultRowHeight = 22;

      [['A1:H1', '赛小蜂篮球 · 正式竞赛文件'], ['A2:H2', title], ['A3:H3', summary], ['A4:H4', `场馆  ${venue}`]].forEach(([range, value]) => {
        worksheet.mergeCells(range);
        worksheet.getCell(range.split(':')[0]).value = value;
      });
      worksheet.getRow(1).height = 20;
      worksheet.getRow(2).height = 30;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 22;
      worksheet.getCell('A1').font = { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FFE36E00' } };
      worksheet.getCell('A2').font = { name: '宋体', size: 18, bold: true, color: { argb: 'FF111111' } };
      worksheet.getCell('A3').font = { name: '宋体', size: 9, color: { argb: 'FF444444' } };
      worksheet.getCell('A4').value = { richText: [
        { font: { name: '宋体', size: 10, bold: false, color: { argb: 'FF111111' } }, text: '场馆  ' },
        { font: { name: '宋体', size: 10, bold: true, color: { argb: 'FF111111' } }, text: venue }
      ] };
      ['A1', 'A2', 'A3'].forEach((address) => { worksheet.getCell(address).alignment = { horizontal: 'center', vertical: 'middle' }; });
      worksheet.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle' };

      const headers = [...scheduleTable.querySelectorAll('thead th')].map((cell) => cell.textContent.trim());
      const headerRow = worksheet.getRow(5);
      headerRow.values = headers;
      headerRow.height = 26;
      const occupied = Array(8).fill(0);
      const bodyRows = [...scheduleTable.querySelectorAll('tbody tr')];
      bodyRows.forEach((sourceRow, rowIndex) => {
        const excelRowNumber = rowIndex + 6;
        const excelRow = worksheet.getRow(excelRowNumber);
        excelRow.height = 22;
        let columnIndex = 1;
        [...sourceRow.cells].forEach((sourceCell) => {
          while (columnIndex <= 8 && occupied[columnIndex - 1] > 0) columnIndex += 1;
          const rowSpan = Math.max(1, Number(sourceCell.rowSpan || 1));
          const columnSpan = Math.max(1, Number(sourceCell.colSpan || 1));
          let value = sourceCell.innerText.trim().replace(/\n{2,}/g, '\n');
          if (sourceCell.classList.contains('schedule-teams-cell')) {
            const teams = [...sourceCell.querySelectorAll('b')].map((node) => node.textContent.trim());
            value = teams.length === 2 ? `${teams[0]}  VS  ${teams[1]}` : sourceCell.textContent.trim();
          }
          const targetCell = worksheet.getCell(excelRowNumber, columnIndex);
          targetCell.value = value;
          if (rowSpan > 1 || columnSpan > 1) {
            worksheet.mergeCells(excelRowNumber, columnIndex, excelRowNumber + rowSpan - 1, columnIndex + columnSpan - 1);
          }
          for (let offset = 0; offset < columnSpan; offset += 1) occupied[columnIndex - 1 + offset] = rowSpan;
          columnIndex += columnSpan;
        });
        for (let index = 0; index < occupied.length; index += 1) occupied[index] = Math.max(0, occupied[index] - 1);
      });

      const lastDataRow = bodyRows.length + 5;
      for (let row = 5; row <= lastDataRow; row += 1) {
        for (let column = 1; column <= 8; column += 1) {
          const cell = worksheet.getCell(row, column);
          cell.font = { name: '宋体', size: row === 5 ? 10 : 9, bold: false, color: { argb: 'FF111111' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: row === 5 ? 'medium' : 'thin', color: { argb: 'FF555555' } },
            left: { style: column === 1 ? 'medium' : 'thin', color: { argb: 'FF555555' } },
            bottom: { style: row === lastDataRow ? 'medium' : 'thin', color: { argb: 'FF555555' } },
            right: { style: column === 8 ? 'medium' : 'thin', color: { argb: 'FF555555' } }
          };
        }
      }

      const footerRow = lastDataRow + 1;
      worksheet.mergeCells(footerRow, 1, footerRow, 4);
      worksheet.mergeCells(footerRow, 5, footerRow, 8);
      worksheet.getCell(footerRow, 1).value = note;
      worksheet.getCell(footerRow, 5).value = preparedAt;
      worksheet.getRow(footerRow).height = 20;
      worksheet.getCell(footerRow, 1).alignment = { horizontal: 'left', vertical: 'middle' };
      worksheet.getCell(footerRow, 5).alignment = { horizontal: 'right', vertical: 'middle' };
      [worksheet.getCell(footerRow, 1), worksheet.getCell(footerRow, 5)].forEach((cell) => {
        cell.font = { name: '宋体', size: 8, bold: false, color: { argb: 'FF555555' } };
      });
      worksheet.pageSetup.printArea = `A1:H${footerRow}`;
      worksheet.pageSetup.printTitlesRow = '5:5';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${String(eventSpace?.name || '赛事').replace(/[\\/:*?"<>|]/g, '_')}-竞赛日程-A4${orientation === 'portrait' ? '竖版' : '横版'}.xlsx`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      showToast(`已导出与页面一致的 A4 ${orientation === 'portrait' ? '竖版' : '横版'} Excel`);
    } catch (error) {
      console.error('竞赛日程 Excel 导出失败', error);
      showToast('Excel 导出失败，请刷新页面后重试');
    }
  }

  function openModal(title, body, footer = '', variant = '') {
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    modalFooter.innerHTML = footer || `${btn('关闭', 'close-modal', 'outline')}`;
    modalLayer.querySelector('.modal-card').className = `modal-card${variant ? ` ${variant}` : ''}`;
    modalLayer.hidden = false;
    bindRegionPickers(modalBody);
  }

  function closeModal() {
    modalLayer.hidden = true;
    pendingImageEdit = null;
  }

  function captureCreateEventDraft() {
    const form = modalBody.querySelector('[data-create-event-form]');
    if (!form) return createEventDraft || {};
    const picker = form.querySelector('[data-region-picker]');
    const data = Object.fromEntries(new FormData(form).entries());
    return {
      name: String(data.name || '').trim(),
      startDate: String(data.startDate || ''),
      endDate: String(data.endDate || ''),
      logoBackground: normalizeLogoBackground(String(data.logoBackground || 'dark')),
      regionCode: String(data.regionCode || ''),
      regionLabel: selectedRegionLabel(picker)
    };
  }

  function openCreateEvent(draft = {}) {
    const value = {
      name: draft.name || '',
      startDate: draft.startDate || '',
      endDate: draft.endDate || '',
      logoBackground: normalizeLogoBackground(draft.logoBackground),
      regionCode: draft.regionCode || '310115'
    };
    const regionPath = regionPathForCounty(value.regionCode);
    openModal('创建赛事空间', `<form class="form-grid create-event-form" data-create-event-form>
      ${namedField('赛事名称', 'name', value.name)}
      <div class="field event-date-range-field"><label>举办日期</label><div class="event-date-range"><input type="date" name="startDate" value="${esc(value.startDate)}"><span>至</span><input type="date" name="endDate" value="${esc(value.endDate)}"></div></div>
      ${regionPickerField('举办地区', regionPath.provinceCode, regionPath.cityCode, regionPath.countyCode, true)}
      <div class="field full create-event-logo-field"><label>赛事 Logo <b>*</b></label>
        <input type="hidden" name="logoBackground" value="${esc(value.logoBackground)}">
        <div class="create-logo-config-row">
          <div class="create-logo-display-preview" data-logo-background-preview="${esc(value.logoBackground)}">${eventUploadBox('createLogo', '上传赛事 Logo', '裁剪输出 512×512 透明 PNG')}</div>
          ${logoBackgroundPicker(value.logoBackground)}
        </div>
        <small>用于赛事空间卡片、报名页、赛程和赛事对外展示。</small>
      </div>
    </form><div class="info-banner">创建后只生成赛事空间，不在此创建组别；进入赛事空间后，可新增多个竞赛组别并分别配置赛制。</div>`, `${btn('取消','close-modal','outline')}${btn('完成创建','confirm-create-event','primary','plus')}`, 'create-event-modal');
  }

  function openEventBrandEditor() {
    const eventSpace = activeEventSpace();
    if (!eventSpace) return;
    const background = normalizeLogoBackground(eventSpace.logoBackground);
    openModal('修改赛事标识', `<div class="event-brand-editor" data-event-brand-form>
      <div class="create-logo-display-preview" data-logo-background-preview="${background}">${eventUploadBox('logo', '重新上传赛事 Logo', '裁剪输出 512×512 透明 PNG')}</div>
      ${logoBackgroundPicker(background)}
      <p class="upload-note">Logo 将进行 1:1 裁剪并输出透明 PNG；展示底色只用于赛事卡片和标识预览。</p>
    </div>`, `${btn('完成','close-modal','primary','circle-check-big')}`);
  }

  function groupNameOptions(currentName = '') {
    return ['请选择组别', ...Array.from({ length: 13 }, (_, index) => `U${index + 6}`)];
  }

  function normalizedGroupGender(value) {
    return ['男子组', '女子组', '混合组'].includes(value) ? value : '混合组';
  }

  function groupDisplayName(group = {}) {
    const ageGroup = standardGroupFor(group);
    if (!ageGroup || ageGroup === '请选择组别') return String(group.name || '未命名组别');
    return `${ageGroup} ${normalizedGroupGender(group.gender)}`;
  }

  function createGroupId() {
    return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function standardGroupFor(group = {}) {
    const options = groupNameOptions();
    const source = String(group.baseGroup || group.name || '');
    const exact = options.find((item) => item === source);
    if (exact) return exact;
    const age = source.match(/^U\d+/i)?.[0]?.toUpperCase();
    return options.includes(age) ? age : '请选择组别';
  }

  function loadEventGroupRows() {
    const eventSpace = activeEventSpace();
    const rows = Array.isArray(eventSpace?.groupRows) ? eventSpace.groupRows.map((group) => ({ ...group })) : [];
    let changed = false;
    const usedIds = new Set();
    rows.forEach((group) => {
      if (!group.id || usedIds.has(group.id)) {
        group.id = createGroupId();
        changed = true;
      }
      usedIds.add(group.id);
      if (!group.baseGroup) {
        group.baseGroup = standardGroupFor(group);
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(group, 'joined')) {
        delete group.joined;
        changed = true;
      }
    });
    if (eventSpace && changed) {
      eventSpace.groupRows = rows;
      eventSpace.firstGroupId = rows.find((group) => group.name === eventSpace.firstGroup)?.id || rows[0]?.id || '';
      localStorage.setItem(eventSpacesKey, JSON.stringify(eventSpaces));
    }
    return rows;
  }

  function selectedFormatGroup() {
    return eventGroupRows.find((group) => group.id === selectedFormatGroupId) || eventGroupRows[0];
  }

  function eligibilityDateForGroup(groupName, eventSpace = activeEventSpace()) {
    const match = String(groupName || '').match(/^U(\d+)/i);
    if (!match) return '';
    const eventYear = Number(String(eventSpace?.startDate || '').slice(0, 4)) || new Date().getFullYear();
    return `${eventYear - Number(match[1])}-01-01`;
  }

  function eligibilityDateField(value = '') {
    return `<div class="field eligibility-date-field"><label>最早出生日期</label><input type="date" name="birthCutoff" value="${esc(value)}" data-eligibility-date><small data-eligibility-hint>${value ? `${esc(value.replaceAll('-', '年').replace(/年(\d{2})年(\d{2})$/, '年$1月$2日'))}前出生的球员不能参赛` : '选择组别后自动生成，主办方可手动调整'}</small></div>`;
  }

  function bindGroupEligibility() {
    const form = modalBody.querySelector('[data-group-form]');
    const groupSelect = form?.querySelector('select[name="baseGroup"]');
    const nameInput = form?.querySelector('input[name="name"]');
    const genderSelect = form?.querySelector('select[name="gender"]');
    const dateInput = form?.querySelector('[data-eligibility-date]');
    const hint = form?.querySelector('[data-eligibility-hint]');
    if (!groupSelect || !nameInput || !genderSelect || !dateInput || !hint) return;
    const refreshName = () => {
      nameInput.value = groupSelect.value === '请选择组别' ? '' : `${groupSelect.value} ${normalizedGroupGender(genderSelect.value)}`;
    };
    const refreshHint = () => {
      if (!dateInput.value) {
        hint.textContent = '该组别不自动限制出生年份，可按赛事要求手动设置';
        return;
      }
      const [year, month, day] = dateInput.value.split('-');
      hint.textContent = `${year}年${Number(month)}月${Number(day)}日前出生的球员不能参赛`;
    };
    groupSelect.addEventListener('change', () => {
      refreshName();
      dateInput.value = eligibilityDateForGroup(groupSelect.value);
      refreshHint();
    });
    genderSelect.addEventListener('change', refreshName);
    refreshName();
    dateInput.addEventListener('change', refreshHint);
    refreshHint();
  }

  function openGroupEditor(groupId = '') {
    const current = eventGroupRows.find((group) => group.id === groupId) || {
      name: '', format: '5V5', competition: '小组循环 + 淘汰赛', target: '8',
      status: '筹备中', birthCutoff: '', gender: '不限', roster: '8—16 人', duration: '4×10 分钟',
      groupCount: 2, teamsPerGroup: 4, advancePerGroup: 2, advancement: '每组前 2 名'
    };
    const currentConfig = current.competitionConfig || {};
    const currentGroupCount = Math.max(1, Number(current.groupCount || currentConfig.groupCount || 2));
    const currentTeamsPerGroup = Math.max(2, Number(current.teamsPerGroup || currentConfig.teamsPerGroup || 4));
    const currentAdvancePerGroup = Math.max(1, Number(current.advancePerGroup || currentConfig.advancePerGroup || 2));
    const currentPlacementEnabled = ['group-full-placement', 'knockout-full-placement'].includes(currentConfig.preset);
    const currentThirdPlaceMatch = Boolean(current.thirdPlaceMatch ?? currentConfig.thirdPlaceMatch ?? false);
    const currentGender = normalizedGroupGender(current.gender);
    const editing = Boolean(groupId);
    const baseGroup = standardGroupFor(current);
    const title = editing ? `编辑组别 · ${current.name}` : '新增竞赛组别';
    const body = `<form class="form-grid group-editor-form" data-group-form data-original-id="${esc(groupId)}">
      ${namedField('标准组别', 'baseGroup', baseGroup, 'select', groupNameOptions())}
      <div class="field"><label>组别名称</label><input name="name" value="${esc(baseGroup === '请选择组别' ? '' : `${baseGroup} ${currentGender}`)}" readonly><small>由年龄组和性别自动生成</small></div>
      ${namedField('比赛形式', 'format', current.format, 'select', ['3V3', '4V4', '5V5'])}
      ${eligibilityDateField(current.birthCutoff || current.age || '')}
      ${namedField('性别限制', 'gender', currentGender, 'select', ['男子组', '女子组', '混合组'])}
      ${namedField('竞赛赛制', 'competition', normalizeCompetitionName(current.competition), 'select', competitionOptions)}
      <div class="field" data-placement-enabled-field><label>全员排位赛</label><select name="placementEnabled"><option value="no"${currentPlacementEnabled ? '' : ' selected'}>不进行</option><option value="yes"${currentPlacementEnabled ? ' selected' : ''}>进行（决出全部名次）</option></select><small data-placement-enabled-hint>开启后，首轮胜者和负者分别进入不同排位线，后续继续比赛直至名次确定。</small></div>
      <div class="field third-place-field" data-third-place-field><label>是否进行三、四名决赛</label><select name="thirdPlaceMatch"><option value="no"${currentThirdPlaceMatch ? '' : ' selected'}>不进行三、四名决赛</option><option value="yes"${currentThirdPlaceMatch ? ' selected' : ''}>进行三、四名决赛（增加 1 场）</option></select><small data-third-place-hint>由两场半决赛的负者争夺第三名，适用于单败淘汰赛制。</small></div>
      <section class="group-structure-editor full" data-group-structure-editor>
        <header><div><b>组别竞赛结构</b><small>保存后由赛制阶段、抽签分组和自动排赛统一读取</small></div></header>
        <div class="group-structure-fields">
          <label data-group-structure-field><span>分组数</span><select name="groupCount">${[1,2,3,4,6,8].map((value) => `<option value="${value}"${currentGroupCount === value ? ' selected' : ''}>${value} 组</option>`).join('')}</select></label>
          <label data-group-structure-field><span>每组球队数</span><select name="teamsPerGroup">${[2,3,4,5,6,8].map((value) => `<option value="${value}"${currentTeamsPerGroup === value ? ' selected' : ''}>${value} 队</option>`).join('')}</select></label>
          <label data-group-structure-field data-group-advance-field><span>每组晋级</span><select name="advancePerGroup">${[1,2,3,4].map((value) => `<option value="${value}"${currentAdvancePerGroup === value ? ' selected' : ''}>前 ${value} 名</option>`).join('')}</select></label>
          <label><span>计划参赛球队数</span><input name="target" value="${esc(current.target)}"></label>
        </div>
        <small data-group-structure-summary></small>
      </section>
      ${namedField('每队名单人数', 'roster', current.roster, 'select', ['3—6 人', '5—10 人', '8—16 人', '10—18 人'])}
      ${namedField('单场比赛时长', 'duration', current.duration, 'select', ['2×6 分钟', '2×8 分钟', '2×10 分钟', '2×12 分钟', '4×6 分钟', '4×8 分钟', '4×10 分钟', '10 分钟', '12 分钟'])}
      ${namedField('组别状态', 'status', current.status, 'select', ['筹备中', '报名中', '已确认'])}
    </form><div class="info-banner"><b>保存后影响：</b>报名资格、抽签分组与自动排赛均读取本组别参数；已有赛程时修改赛制需重新生成赛程。</div>`;
    openModal(title, body, `${btn('取消','close-modal','outline')}${btn(editing ? '保存' : '创建组别','save-group','primary','save')}`, 'group-editor-modal');
    bindGroupEligibility();
    bindGroupStructureEditor();
  }

  function isGroupedCompetition(competition) {
    return normalizeCompetitionName(competition).startsWith('小组');
  }

  function supportsThirdPlaceMatch(competition) {
    return ['小组循环 + 淘汰赛', '单败淘汰'].includes(normalizeCompetitionName(competition));
  }

  function presetForCompetition(competition) {
    const normalized = normalizeCompetitionName(competition);
    return ({
      '小组循环 + 淘汰赛': 'group-knockout',
      '小组循环 + 单循环': 'group-round-robin',
      '全部球队单循环': 'round-robin',
      '单败淘汰': 'knockout'
    })[normalized];
  }

  function bindGroupStructureEditor() {
    const form = modalBody.querySelector('[data-group-form]');
    const competition = form?.querySelector('[name="competition"]');
    const groupCount = form?.querySelector('[name="groupCount"]');
    const teamsPerGroup = form?.querySelector('[name="teamsPerGroup"]');
    const advancePerGroup = form?.querySelector('[name="advancePerGroup"]');
    const advanceField = form?.querySelector('[data-group-advance-field]');
    const placementEnabledField = form?.querySelector('[data-placement-enabled-field]');
    const placementEnabled = form?.querySelector('[name="placementEnabled"]');
    const placementEnabledHint = form?.querySelector('[data-placement-enabled-hint]');
    const structureFields = form?.querySelector('.group-structure-fields');
    const target = form?.querySelector('[name="target"]');
    const thirdPlaceField = form?.querySelector('[data-third-place-field]');
    const thirdPlaceMatch = form?.querySelector('[name="thirdPlaceMatch"]');
    const thirdPlaceHint = form?.querySelector('[data-third-place-hint]');
    const summary = form?.querySelector('[data-group-structure-summary]');
    if (!form || !competition || !groupCount || !teamsPerGroup || !advancePerGroup || !advanceField || !placementEnabledField || !placementEnabled || !placementEnabledHint || !structureFields || !target || !thirdPlaceField || !thirdPlaceMatch || !thirdPlaceHint || !summary) return;
    const refresh = () => {
      const grouped = isGroupedCompetition(competition.value);
      const normalizedCompetition = normalizeCompetitionName(competition.value);
      const groupOnly = false;
      const canEnablePlacement = ['小组循环 + 淘汰赛', '单败淘汰'].includes(normalizedCompetition);
      const fullPlacement = canEnablePlacement && placementEnabled.value === 'yes';
      const knockoutTeams = grouped ? Number(groupCount.value) * Number(advancePerGroup.value) : Math.max(2, Number(target.value || 2));
      const allowThirdPlace = supportsThirdPlaceMatch(competition.value) && knockoutTeams >= 4;
      form.querySelectorAll('[data-group-structure-field]').forEach((field) => { field.hidden = !grouped; });
      placementEnabledField.hidden = !canEnablePlacement;
      placementEnabledHint.textContent = normalizedCompetition === '单败淘汰'
        ? '开启后，首轮胜者争夺 1—8 名，负者争夺 9—16 名；每一轮继续按胜负排位，直至全部名次确定。'
        : '开启后，各小组同名次球队进入对应排位层，未晋级争冠淘汰的球队也可继续比赛。';
      advanceField.hidden = !grouped || groupOnly || fullPlacement;
      structureFields.classList.toggle('group-only', grouped && groupOnly);
      thirdPlaceField.hidden = fullPlacement;
      thirdPlaceField.classList.toggle('is-disabled', !allowThirdPlace || fullPlacement);
      thirdPlaceMatch.disabled = !allowThirdPlace || fullPlacement;
      if (!allowThirdPlace || fullPlacement) thirdPlaceMatch.value = 'no';
      if (allowThirdPlace) {
        thirdPlaceHint.textContent = '由两场半决赛的负者争夺第三名；开启后赛事总场次增加 1 场。';
      } else if (normalizeCompetitionName(competition.value).includes('双败')) {
        thirdPlaceHint.textContent = '当前为双败淘汰赛，第三名由败者组成绩确定，无需单独设置季军赛。';
      } else if (!supportsThirdPlaceMatch(competition.value)) {
        thirdPlaceHint.textContent = '当前为循环赛，最终名次按积分排名，不设置三、四名决赛。';
      } else {
        thirdPlaceHint.textContent = '进入淘汰阶段的球队少于 4 支，不具备三、四名决赛条件。';
      }
      target.readOnly = grouped;
      if (grouped) {
        const capacity = Number(groupCount.value) * Number(teamsPerGroup.value);
        const advanceTeams = Number(groupCount.value) * Number(advancePerGroup.value);
        target.value = String(capacity);
        const groupRoundRobin = normalizedCompetition === '小组循环 + 单循环';
        summary.textContent = groupOnly
          ? `${groupCount.value} 个小组 × 每组 ${teamsPerGroup.value} 队，共 ${capacity} 队；组内循环结束后按积分独立排名，不产生晋级球队，也不设置第二阶段。`
          : fullPlacement
            ? `${groupCount.value} 个小组 × 每组 ${teamsPerGroup.value} 队，共 ${capacity} 队；组内名次确定后，同名次球队进入对应排位层，系统按 ${groupCount.value} 个小组自动计算每队进行 ${automaticPlacementMatchesPerTeam(groupCount.value)} 场排位赛，最终决出全部名次。`
            : groupRoundRobin
            ? `${groupCount.value} 个小组 × 每组 ${teamsPerGroup.value} 队，共 ${capacity} 队；每组前 ${advancePerGroup.value} 名晋级，共 ${advanceTeams} 队进入晋级组单循环，按积分排定最终名次。`
            : `${groupCount.value} 个小组 × 每组 ${teamsPerGroup.value} 队，共 ${capacity} 队；每组前 ${advancePerGroup.value} 名晋级，共 ${advanceTeams} 队进入下一阶段${allowThirdPlace ? (thirdPlaceMatch.value === 'yes' ? '；另设 1 场三、四名决赛。' : '；不设置三、四名决赛。') : '。'}`;
      } else {
        summary.textContent = fullPlacement
          ? `${target.value || 2} 支球队单败淘汰；首轮胜者进入高位名次线，负者进入低位名次线，随后继续比赛直至决出全部名次。16 队全员排位共需 32 场。`
          : `非分组赛制只需填写计划参赛球队数，赛制结构将自动生成${allowThirdPlace ? (thirdPlaceMatch.value === 'yes' ? '；另设 1 场三、四名决赛。' : '；不设置三、四名决赛。') : '。'}`;
      }
    };
    [competition, groupCount, teamsPerGroup, advancePerGroup, placementEnabled, thirdPlaceMatch].forEach((field) => field?.addEventListener('change', refresh));
    target.addEventListener('input', refresh);
    refresh();
  }

  function openEventVenueEditor(venueId = '') {
    const settings = eventVenueSettings();
    const existing = settings?.venues.find((venue) => venue.id === venueId);
    openModal(existing ? '编辑赛程场馆' : '新增赛程场馆', `<form class="form-grid" data-event-venue-form data-venue-id="${esc(existing?.id || '')}">
      ${namedField('场馆名称', 'name', existing?.name || '')}
      ${namedField('场馆地址', 'address', existing?.address || '')}
      ${existing ? '<div class="info-banner full">球场数量与全场/半场类型请在下方“球场配置”中维护；半场会自动拆分为 A 半场、B 半场。</div>' : `${namedField('初始球场数量', 'courtCount', '1', 'select', ['1','2','3','4','6','8'])}${namedField('默认球场类型', 'courtType', '标准全场', 'select', ['标准全场','半场'])}`}
    </form><div class="info-banner">场馆归属于当前赛事的全组别赛程资源，保存后可用于自动排赛。</div>`, `${btn('取消','close-modal','outline')}${btn(existing ? '保存修改' : '确认新增','save-event-venue','primary',existing ? 'save' : 'plus')}`);
  }

  function openEventCourtEditor() {
    const settings = eventVenueSettings();
    const venue = settings?.venues.find((item) => item.id === selectedVenueId);
    if (!venue) return;
    const nextNumber = (venue.courts?.length || 0) + 1;
    openModal(`新增球场 · ${venue.name}`, `<form class="form-grid" data-event-court-form>
      ${namedField('球场名称', 'name', `球场 ${nextNumber}`)}
      ${namedField('场馆内位置', 'location', `${venue.name}${nextNumber}号场`)}
      ${namedField('场地类型', 'type', '标准全场', 'select', ['标准全场','半场'])}
    </form>`, `${btn('取消','close-modal','outline')}${btn('确认新增','save-event-court','primary','plus')}`);
  }

  function openEventImagePicker(kind) {
    document.querySelector('[data-event-image-picker]')?.remove();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.hidden = true;
    input.dataset.eventImagePicker = kind;
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) {
        input.remove();
        return;
      }
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        showToast('请选择 JPG、PNG 或 WEBP 图片');
        input.remove();
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast('原图不能超过 15MB');
        input.remove();
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const image = new Image();
        image.addEventListener('load', () => {
          openImageEditor(kind, image, file);
          input.remove();
        });
        image.addEventListener('error', () => {
          showToast('图片读取失败，请重新选择');
          input.remove();
        });
        image.src = String(reader.result || '');
      });
      reader.readAsDataURL(file);
    });
    input.click();
  }

  function imageEditorBody(kind, file) {
    const isLogo = kind !== 'cover';
    return `<div class="image-editor" data-image-editor>
      <div class="image-editor-stage ${isLogo ? 'logo-stage' : 'cover-stage'}">
        <canvas id="imageEditorCanvas" width="${isLogo ? 512 : 800}" height="${isLogo ? 512 : 450}" aria-label="${isLogo ? 'Logo 方形裁剪预览' : '赛事封面 16比9 裁剪预览'}"></canvas>
        <span class="crop-frame-label">${isLogo ? '1:1 方形裁剪框' : '16:9 封面裁剪框'}</span>
      </div>
      <div class="image-editor-controls">
        <div class="image-source-meta"><b>${esc(file.name)}</b><span>${Math.round(file.size / 1024)} KB · ${pendingImageEdit.image.naturalWidth}×${pendingImageEdit.image.naturalHeight}px</span></div>
        <label><span>缩放</span><input type="range" min="30" max="300" value="100" data-image-control="zoom"><output>100%</output></label>
        <label><span>水平位置</span><input type="range" min="-100" max="100" value="0" data-image-control="x"><output>居中</output></label>
        <label><span>垂直位置</span><input type="range" min="-100" max="100" value="0" data-image-control="y"><output>居中</output></label>
        ${isLogo ? `<div class="remove-background-controls">
          <label class="image-toggle"><span><b>只抠除外围连通背景</b><small>从图片四周向内识别背景，保留队徽内部相同颜色</small></span><button class="switch on" type="button" data-action="toggle-background-removal" aria-pressed="true"></button></label>
          <label><span>去底容差</span><input type="range" min="12" max="90" value="38" data-image-control="tolerance"><output>38</output></label>
          <div class="transparency-check"><i></i><span>透明图层预览已开启，请检查主体边缘是否完整</span></div>
        </div>` : `<label><span>压缩质量</span><input type="range" min="60" max="92" value="82" data-image-control="quality"><output>82%</output></label>
          <div class="compression-check">${icon('circle-check-big')}<span>确认后输出 1600×900 WEBP/JPEG 压缩图，适合作为赛事主背景</span></div>`}
      </div>
    </div>`;
  }

  function openImageEditor(kind, image, file) {
    const isTeamLogo = kind === 'teamLogo';
    pendingImageEdit = {
      kind,
      image,
      file,
      zoom: 1,
      x: 0,
      y: 0,
      tolerance: 38,
      quality: 0.82,
      removeBackground: kind !== 'cover'
    };
    openModal(
      kind === 'cover' ? '裁剪赛事主背景' : isTeamLogo ? '裁剪球队队徽' : '裁剪赛事 Logo',
      imageEditorBody(kind, file),
      `${btn('取消',kind === 'createLogo' ? 'cancel-create-logo-edit' : isTeamLogo ? 'cancel-team-logo-edit' : 'close-modal','outline')}${btn(kind !== 'cover' ? '确认透明图层' : '压缩并使用','apply-image-edit','primary','circle-check-big')}`,
      'image-editor-modal'
    );
    bindImageEditor();
  }

  function getImageCrop(image, aspect, zoom, offsetX, offsetY) {
    let cropWidth = image.naturalWidth;
    let cropHeight = cropWidth / aspect;
    if (cropHeight > image.naturalHeight) {
      cropHeight = image.naturalHeight;
      cropWidth = cropHeight * aspect;
    }
    cropWidth /= zoom;
    cropHeight /= zoom;
    const maxX = Math.max(0, image.naturalWidth - cropWidth);
    const maxY = Math.max(0, image.naturalHeight - cropHeight);
    return {
      x: maxX * ((offsetX + 100) / 200),
      y: maxY * ((offsetY + 100) / 200),
      width: cropWidth,
      height: cropHeight
    };
  }

  function removeCanvasBackground(context, width, height, tolerance) {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const cornerIndexes = [0, (width - 1) * 4, (height - 1) * width * 4, (width * height - 1) * 4];
    const cornerAlpha = cornerIndexes.reduce((sum, index) => sum + data[index + 3], 0) / cornerIndexes.length;
    if (cornerAlpha < 32) {
      context.putImageData(imageData, 0, 0);
      return;
    }
    const background = [0, 1, 2].map((channel) => Math.round(cornerIndexes.reduce((sum, index) => sum + data[index + channel], 0) / 4));
    const softEdge = 24;
    const pixelCount = width * height;
    const connected = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let head = 0;
    let tail = 0;
    const distanceAt = (pixel) => {
      const index = pixel * 4;
      return Math.sqrt(
        ((data[index] - background[0]) ** 2) +
        ((data[index + 1] - background[1]) ** 2) +
        ((data[index + 2] - background[2]) ** 2)
      );
    };
    const enqueue = (pixel) => {
      if (connected[pixel] || distanceAt(pixel) >= tolerance + softEdge) return;
      connected[pixel] = 1;
      queue[tail++] = pixel;
    };
    for (let x = 0; x < width; x += 1) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x < width - 1) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y < height - 1) enqueue(pixel + width);
    }
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      if (!connected[pixel]) continue;
      const index = pixel * 4;
      const distance = distanceAt(pixel);
      if (distance <= tolerance) data[index + 3] = 0;
      else data[index + 3] = Math.round(data[index + 3] * ((distance - tolerance) / softEdge));
    }
    context.putImageData(imageData, 0, 0);
  }

  function drawEditedImage(canvas, outputWidth = canvas.width, outputHeight = canvas.height) {
    if (!pendingImageEdit) return;
    const { image, kind, zoom, x, y, tolerance, removeBackground } = pendingImageEdit;
    const context = canvas.getContext('2d', { willReadFrequently: kind !== 'cover' });
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    context.clearRect(0, 0, outputWidth, outputHeight);
    if (kind === 'cover') {
      const crop = getImageCrop(image, outputWidth / outputHeight, zoom, x, y);
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
      return;
    }

    let source = image;
    if (removeBackground) {
      const maxSourceSide = 1200;
      const sourceScale = Math.min(1, maxSourceSide / Math.max(image.naturalWidth, image.naturalHeight));
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = Math.max(1, Math.round(image.naturalWidth * sourceScale));
      sourceCanvas.height = Math.max(1, Math.round(image.naturalHeight * sourceScale));
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
      removeCanvasBackground(sourceContext, sourceCanvas.width, sourceCanvas.height, tolerance);
      source = sourceCanvas;
    }

    const sourceWidth = source.naturalWidth || source.width;
    const sourceHeight = source.naturalHeight || source.height;
    const fitScale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight);
    const drawWidth = sourceWidth * fitScale * zoom;
    const drawHeight = sourceHeight * fitScale * zoom;
    const centeredX = (outputWidth - drawWidth) / 2;
    const centeredY = (outputHeight - drawHeight) / 2;
    const drawX = centeredX + (x / 100) * Math.abs(centeredX);
    const drawY = centeredY + (y / 100) * Math.abs(centeredY);
    context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
  }

  function refreshImageEditor() {
    const canvas = document.getElementById('imageEditorCanvas');
    if (!canvas || !pendingImageEdit) return;
    drawEditedImage(canvas, pendingImageEdit.kind !== 'cover' ? 512 : 800, pendingImageEdit.kind !== 'cover' ? 512 : 450);
  }

  function bindImageEditor() {
    const editor = modalBody.querySelector('[data-image-editor]');
    if (!editor || !pendingImageEdit) return;
    editor.querySelectorAll('[data-image-control]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.imageControl;
        const value = Number(input.value);
        if (key === 'zoom') pendingImageEdit.zoom = value / 100;
        if (key === 'x') pendingImageEdit.x = value;
        if (key === 'y') pendingImageEdit.y = value;
        if (key === 'tolerance') pendingImageEdit.tolerance = value;
        if (key === 'quality') pendingImageEdit.quality = value / 100;
        const output = input.parentElement.querySelector('output');
        if (output) output.textContent = key === 'zoom' || key === 'quality' ? `${value}%` : key === 'x' || key === 'y' ? (value === 0 ? '居中' : `${value > 0 ? '+' : ''}${value}`) : String(value);
        refreshImageEditor();
      });
    });
    refreshImageEditor();
  }

  function applyImageEdit() {
    if (!pendingImageEdit) return;
    const { kind, quality } = pendingImageEdit;
    const isLogo = kind !== 'cover';
    const output = document.createElement('canvas');
    drawEditedImage(output, isLogo ? 512 : 1600, isLogo ? 512 : 900);
    uploadedEventImages[kind] = isLogo
      ? output.toDataURL('image/png')
      : output.toDataURL('image/webp', quality);
    if (kind === 'createLogo') {
      closeModal();
      openCreateEvent(createEventDraft || {});
      showToast('赛事 Logo 已处理，请确认信息后创建');
      return;
    }
    if (kind === 'teamLogo') {
      const teamId = registrationTeamDraft?.id || '';
      closeModal();
      openRegistrationTeamEditor(teamId, { ...(registrationTeamDraft || {}), logo: uploadedEventImages.teamLogo });
      showToast('球队队徽已完成裁剪和透明背景处理');
      return;
    }
    const eventSpace = activeEventSpace();
    if (eventSpace) {
      if (kind === 'logo') eventSpace.logo = uploadedEventImages.logo;
      if (kind === 'cover') eventSpace.cover = uploadedEventImages.cover;
      persistEventSpaces();
      uploadedEventImages[kind] = '';
    }
    closeModal();
    render();
    showToast(isLogo ? 'Logo 已裁剪并同步到赛事空间卡片' : '赛事主背景已按 16:9 裁剪并压缩');
  }

  function openInvite(matchId = selectedOnsiteMatchId) {
    const state = store.read();
    const match = onsiteRowsForEvent(activeEventSpace()).find((item) => item.id === matchId);
    const matchLabel = match ? `${match.id} · ${match.home || '待定'} VS ${match.away || '待定'}` : (matchId || '待选择场次');
    openModal('邀请外请技术台人员', `<div class="form-grid">${field('场次',matchLabel,'select',false,[matchLabel])}${field('席位','球员数据记录员','select',false,['主控计分员','球员数据记录员','MC 控制员'])}${field('姓名',state.invitation.displayName)}${field('手机号',state.invitation.phone)}</div><div class="info-banner"><b>权限边界：</b>接受后只可进入 ${esc(matchId || '当前场次')} 的球员数据台，不能进入机构教务、课消、薪酬和经营数据。</div>`, `${btn('取消','close-modal','outline')}${btn('发送服务号邀请','confirm-invite','primary','send')}`);
  }

  function cloudPcSessionToken() {
    try { return JSON.parse(localStorage.getItem(cloudSessionKey) || 'null')?.sessionToken || ''; }
    catch (_) { return ''; }
  }

  async function invokePcAuth(action, payload = {}) {
    const response = await fetch(PC_AUTH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
    const result = await response.json();
    if (!result?.ok) throw new Error(result?.message || result?.error || '云端请求失败');
    return result;
  }

  function registrationCloudPayload(eventSpace) {
    return {
      eventId: eventSpace.id,
      name: eventSpace.name,
      description: eventSpace.description || '',
      organizationName: document.getElementById('organizationName')?.textContent || '',
      scenarioType: eventSpace.scenarioType || 'other',
      competitionFormat: eventSpace.competitionFormat || 'single_round_robin',
      schoolStage: eventSpace.schoolStage || '',
      gradeCode: eventSpace.gradeCode || '',
      gradeName: eventSpace.gradeName || '',
      groupCount: Math.max(2, eventSpace.groupRows?.length || 2),
      advanceCount: 2
    };
  }

  async function openQr() {
    const eventSpace = activeEventSpace();
    if (!eventSpace) return showToast('请先选择赛事');
    openModal('球队报名二维码', `<div class="registration-qr-loading"><span></span><b>正在创建正式报名码</b><small>同步赛事、生成邀请并连接小程序…</small></div>`, `${btn('关闭','close-modal','outline')}`);
    const sessionToken = cloudPcSessionToken();
    if (!sessionToken) {
      modalBody.innerHTML = '<div class="info-banner">当前PC会话已失效，请返回机构入口使用微信重新登录。</div>';
      return;
    }
    try {
      const result = await invokePcAuth('createRegistrationQr', { sessionToken, tournament: registrationCloudPayload(eventSpace) });
      eventSpace.registrationInviteKey = result.inviteKey;
      eventSpace.registrationQrUrl = result.qrUrl;
      eventSpace.registrationQrFileID = result.qrFileID;
      persistEventSpaces();
      modalBody.innerHTML = `<div class="registration-qr-card"><img src="${esc(result.qrUrl)}" alt="${esc(result.tournamentName)}报名小程序码"><div class="registration-qr-copy"><h3>${esc(result.tournamentName)}</h3><p>领队使用微信扫码，进入赛小蜂篮球小程序完成球队报名。</p><ol><li><b>进入小程序</b><span>创建或认领球队，提交报名资料</span></li><li><b>关注服务号</b><span>接收审核结果、赛程变更和比赛通知</span></li><li><b>查看球队与任务</b><span>在小程序查看球队数据并完成名单、确认等任务</span></li></ol><div class="registration-qr-tags"><span>正式小程序码</span><span>服务号通知</span><span>任务中心</span></div></div></div>`;
      modalFooter.innerHTML = `${btn('复制报名说明','copy-registration-guide','outline','copy')}${btn('刷新报名码','refresh-registration-qr','outline','refresh-cw')}${btn('下载报名码','download-registration-qr','primary','download')}`;
    } catch (error) {
      modalBody.innerHTML = `<div class="info-banner"><b>报名码生成失败：</b>${esc(error.message)}</div>`;
    }
  }

  function captureRegistrationTeamDraft() {
    const form = modalBody.querySelector('[data-registration-team-form]');
    if (!form) return registrationTeamDraft || {};
    const values = Object.fromEntries(new FormData(form).entries());
    return {
      id: form.dataset.originalId || '',
      name: String(values.name || ''),
      group: String(values.group || ''),
      owner: String(values.owner || ''),
      phone: String(values.phone || ''),
      logo: uploadedEventImages.teamLogo || registrationTeamDraft?.logo || ''
    };
  }

  function openRegistrationTeamEditor(teamId = '', draft = null) {
    const eventSpace = activeEventSpace();
    const current = draft || registrationTeamRows(eventSpace).find((team) => team.id === teamId) || {};
    const groupNames = (eventSpace?.groupRows || []).map((group) => group.name).filter(Boolean);
    if (!groupNames.length) groupNames.push('未分组');
    const editing = Boolean(current.id);
    if (current.group && !groupNames.includes(current.group)) groupNames.push(current.group);
    registrationTeamDraft = { ...current };
    openModal(editing ? `编辑球队 · ${current.name}` : '人工添加球队', `<form class="form-grid" data-registration-team-form data-original-id="${esc(current.id || '')}">
      <div class="field full registration-team-logo-field"><label>球队队徽</label><div class="registration-team-logo-upload">${eventUploadBox('teamLogo', '上传球队队徽', '1:1 裁剪 · 只抠除外围背景', current.logo || '')}<div><b>上传透明队徽</b><small>支持 JPG、PNG、WEBP，最大 15MB；上传后可缩放、移动和裁剪，只删除与图片外围连通的背景，保留队徽内部白色等组成部分。</small></div></div></div>
      ${namedField('球队名称','name',current.name || '')}
      ${namedField('参赛组别','group',current.group || groupNames[0],'select',groupNames)}
      ${namedField('领队姓名','owner',current.owner || '')}
      ${namedField('领队手机号','phone',current.phone || '')}
      <div class="info-banner field full"><b>当前测试范围：</b>这里只创建报名球队和邀请对象，不添加球员、不绑定正式球队库。</div>
    </form>`, `${btn('取消','close-modal','outline')}${btn(editing ? '保存' : '保存并继续邀请','save-registration-team','primary','save')}`);
  }

  function teamClaimInviteLink(team) {
    const target = new URL('./service-account-demo.html', location.href);
    target.searchParams.set('flow', 'team-claim');
    target.searchParams.set('eventId', activeEventSpace()?.id || '');
    target.searchParams.set('teamId', team.id);
    return target.href;
  }

  function openTeamClaimInvite(teamId) {
    const team = registrationTeamRows().find((item) => item.id === teamId);
    if (!team) {
      showToast('球队记录不存在，请刷新后重试');
      return;
    }
    pendingRegistrationTeamId = team.id;
    openModal('发送球队认领邀请', `<div class="rule-summary team-invite-summary">
      <h4>${esc(team.name)}</h4>
      <p>参赛组别：${esc(team.group)}　领队：${esc(team.owner)}</p>
      <p>邀请手机号：${esc(maskMobile(team.phone))}</p>
      <div class="field"><label>测试邀请链接</label><input value="${esc(teamClaimInviteLink(team))}" readonly data-team-invite-link></div>
      <div class="info-banner"><b>测试说明：</b>确认发送后，本地赛事记录会变为“邀请已发送”。正式上线后再接入服务号消息和球队绑定。</div>
    </div>`, `${btn('取消','close-modal','outline')}${btn('复制邀请链接','copy-team-invite-link','outline','link-2')}${btn(team.claimStatus === '邀请已发送' ? '再次发送' : '确认发送','confirm-team-invite','primary','send')}`);
  }

  function openVirtualTeamImporter() {
    const data = virtualDataset();
    if (!data) {
      showToast('虚拟球队数据未加载，请刷新页面后重试');
      return;
    }
    const existingTeams = virtualRegistrationTeams();
    const existingIds = new Set(existingTeams.map((team) => team.virtualSourceTeamId || team.id));
    const existing = existingTeams.length;
    const groups = (activeEventSpace()?.groupRows || []).map((group) => group.name).filter(Boolean);
    const targetTeams = (activeEventSpace()?.groupRows || []).reduce((sum, group) => sum + Number(group.target || 0), 0);
    const currentTeams = registrationTeamRows().length;
    const remainingTarget = targetTeams ? Math.max(0, targetTeams - currentTeams) : 0;
    const ageGroupOrder = ['U8', 'U10', 'U12', 'U14'];
    const sortedTeams = data.teams.slice().sort((left, right) => ageGroupOrder.indexOf(left.ageGroup.split('（')[0]) - ageGroupOrder.indexOf(right.ageGroup.split('（')[0]));
    pendingVirtualTeamIds = new Set();
    openModal(existing ? '管理虚拟球队' : '添加虚拟球队', `<div class="virtual-team-import-summary">
      <div class="virtual-team-import-metrics"><article><strong>${data.metadata.teamCount}</strong><span>支虚拟球队</span></article><article><strong>${data.metadata.playerCount}</strong><span>名虚拟球员</span></article><article><strong>4</strong><span>个年龄段</span></article></div>
      <div class="info-banner"><b>按需添加：</b>点击下方球队卡片选择，单次最多添加 4 支；保留当前真实报名球队，并优先分配到球队较少的组别。${targetTeams ? `当前赛事目标 ${targetTeams} 支，剩余 ${remainingTarget} 个目标名额。` : ''}</div>
      <div class="virtual-team-picker-head"><div><b>选择虚拟球队</b><small>已选 <strong data-virtual-team-selection-count>0</strong> / 4 支</small></div><button type="button" data-action="clear-virtual-team-selection" disabled>清空选择</button></div>
      <div class="virtual-team-age-filters"><button type="button" class="active" data-action="filter-virtual-team-age" data-age-group="all">全部 32</button>${ageGroupOrder.map((ageGroup) => `<button type="button" data-action="filter-virtual-team-age" data-age-group="${ageGroup}">${ageGroup} · 8 支</button>`).join('')}</div>
      <div class="virtual-team-picker">${sortedTeams.map((team) => { const added = existingIds.has(team.id); const ageGroup = team.ageGroup.split('（')[0]; return `<button type="button" class="virtual-team-choice${added ? ' added' : ''}" data-action="toggle-virtual-team-selection" data-age-group="${ageGroup}" data-virtual-team-id="${esc(team.id)}" aria-pressed="false"${added ? ' disabled' : ''}><img src="${esc(virtualAssetUrl(team.logoUrl))}" alt=""><span><b>${esc(team.name)}</b><small>${esc(team.ageGroup)} · 12 名球员</small></span><em>${added ? '已加入' : '选择'}</em></button>`; }).join('')}</div>
      <p>头像为真人摄影感的原创虚构儿童形象；每队固定球服版型、纹样、号码字体和号码位置。所有联系方式均为空，不发送邀请，不进入真实保险、支付或身份审核。</p>
      ${existing ? `<div class="virtual-team-existing">当前赛事已有 <b>${existing}</b> 支虚拟球队；可继续选择未加入的球队，或整批移除后重新选择。</div>` : ''}
    </div>`, `${btn('取消','close-modal','outline')}${existing ? btn('移除全部虚拟球队','remove-virtual-teams','outline','trash-2') : ''}<button type="button" class="btn primary" data-action="confirm-add-virtual-teams" disabled>请先选择球队</button>`, 'virtual-team-picker-modal');
  }

  function syncVirtualTeamSelection() {
    const count = pendingVirtualTeamIds.size;
    const countNode = modalBody.querySelector('[data-virtual-team-selection-count]');
    const clearButton = modalBody.querySelector('[data-action="clear-virtual-team-selection"]');
    const confirmButton = modalFooter.querySelector('[data-action="confirm-add-virtual-teams"]');
    if (countNode) countNode.textContent = String(count);
    if (clearButton) clearButton.disabled = count === 0;
    if (confirmButton) {
      confirmButton.disabled = count === 0;
      confirmButton.textContent = count ? `添加所选 ${count} 支球队` : '请先选择球队';
    }
  }

  function openVirtualTeamDetails(teamId) {
    const team = registrationTeamRows().find((item) => item.id === teamId && item.isVirtual);
    if (!team) return showToast('虚拟球队资料不存在');
    const roster = team.players || [];
    openModal(`虚拟球队 · ${team.name}`, `<div class="virtual-team-detail">
      <header>${teamBadge(team.name, team.logo || '')}<div><h3>${esc(team.name)}</h3><p>${esc(team.ageGroup || team.group)} · ${esc(team.coachName || team.owner)} · ${roster.length} 人</p></div><span class="status-pill">虚拟演示</span></header>
      <div class="virtual-roster-grid">${roster.map((player) => `<article><img src="${esc(player.avatar || '')}" alt=""><div><b>#${esc(player.number)} ${esc(player.name)}</b><small>${esc(player.position)} · ${esc(player.age)}岁 · ${esc(player.height)}cm / ${esc(player.weight)}kg</small></div></article>`).join('')}</div>
      <div class="info-banner">所有人物、姓名和资料均为原创虚构演示内容，不对应现实中的未成年人。</div>
    </div>`, btn('关闭','close-modal','primary'));
  }

  function bindDragAndDrop() {
    const draggables = content.querySelectorAll('.draw-groups-page .draggable-team[draggable="true"]');
    const slots = content.querySelectorAll('.group-slot');
    draggables.forEach((element) => {
      element.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', element.dataset.team);
        event.dataTransfer.effectAllowed = 'move';
      });
    });
    slots.forEach((slot) => {
      slot.addEventListener('dragover', (event) => {
        event.preventDefault();
        slot.classList.add('dragover');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
      slot.addEventListener('drop', (event) => {
        event.preventDefault();
        slot.classList.remove('dragover');
        const name = event.dataTransfer.getData('text/plain');
        if (!name || slot.classList.contains('filled')) return;
        const context = currentDrawContext();
        if (!context) return;
        context.state.unassignedTeams = context.state.unassignedTeams.filter((team) => team !== name);
        context.state.assignments[slot.dataset.group][Number(slot.dataset.index)] = name;
        context.state.assignments[slot.dataset.group] = context.state.assignments[slot.dataset.group].filter(Boolean);
        context.state.saved = false;
        context.state.updatedAt = new Date().toISOString();
        persistEventSpaces();
        render();
        showToast(`${name} 已放入 ${slot.dataset.group} 组`);
      });
    });
    const knockoutTeams = content.querySelectorAll('[data-knockout-team][draggable="true"]');
    const knockoutSlots = content.querySelectorAll('[data-knockout-drop-index]');
    knockoutTeams.forEach((element) => {
      element.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/x-sxf-knockout-team', element.dataset.knockoutTeam || '');
        event.dataTransfer.effectAllowed = 'move';
        element.classList.add('dragging');
      });
      element.addEventListener('dragend', () => element.classList.remove('dragging'));
    });
    knockoutSlots.forEach((slot) => {
      slot.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        slot.classList.add('dragover');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
      slot.addEventListener('drop', (event) => {
        event.preventDefault();
        slot.classList.remove('dragover');
        const name = event.dataTransfer.getData('application/x-sxf-knockout-team');
        const targetIndex = Number(slot.dataset.knockoutDropIndex);
        const context = currentDrawContext();
        if (!name || !context || !Number.isInteger(targetIndex)) return;
        const sourceIndex = context.state.seedOrder.findIndex((seed) => seed === name);
        const targetName = context.state.seedOrder[targetIndex] || '';
        if (sourceIndex >= 0 && sourceIndex !== targetIndex) context.state.seedOrder[sourceIndex] = targetName;
        context.state.seedOrder[targetIndex] = name;
        context.state.seedAssignmentStarted = true;
        context.state.saved = false;
        context.state.updatedAt = new Date().toISOString();
        persistEventSpaces();
        render();
        showToast(`${name} 已放入第 ${targetIndex + 1} 签位`);
      });
    });
    const scheduleMatches = content.querySelectorAll('[data-schedule-match-id]');
    const scheduleCells = content.querySelectorAll('[data-schedule-drop-date]');
    scheduleMatches.forEach((matchElement) => {
      matchElement.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/x-sxf-schedule-match', matchElement.dataset.scheduleMatchId);
        event.dataTransfer.effectAllowed = 'move';
        matchElement.classList.add('dragging');
      });
      matchElement.addEventListener('dragend', () => matchElement.classList.remove('dragging'));
    });
    scheduleCells.forEach((cell) => {
      cell.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        cell.classList.add('schedule-dragover');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('schedule-dragover'));
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        cell.classList.remove('schedule-dragover');
        const matchId = event.dataTransfer.getData('application/x-sxf-schedule-match');
        const date = cell.dataset.scheduleDropDate;
        const time = cell.dataset.scheduleDropTime;
        const venue = cell.dataset.scheduleDropVenue;
        if (!matchId || !date || !time || !venue) return;
        const eventSpace = activeEventSpace();
        const scheduleRows = generatedScheduleRows(eventSpace);
        const movingMatch = scheduleRows.find((match) => match.id === matchId);
        if (!movingMatch) return;
        if (movingMatch.time === `${date} ${time}` && movingMatch.venue === venue) return;
        const availability = eventVenueSettings(eventSpace)?.availability || {};
        const targetIssue = matchTimeWindowIssue(time, availability);
        if (targetIssue) {
          const boundary = targetIssue.segment?.end ? `，会超过 ${targetIssue.segment.end} 的结束线` : '，不在已配置的可用时段内';
          showToast(`无法调整：${time} 开赛${boundary}。请先到赛程设置调整时段、缓冲或首场时间。`);
          return;
        }
        const occupied = scheduleRows.some((match) => match.id !== matchId && match.time === `${date} ${time}` && match.venue === venue);
        const occupiedId = scheduleRows.find((match) => match.id !== matchId && match.time === `${date} ${time}` && match.venue === venue)?.id || '';
        const occupiedMatch = scheduleRows.find((match) => match.id === occupiedId);
        const movingDraft = { ...movingMatch, time: `${date} ${time}`, venue };
        const movingConflict = teamPeriodConflict(scheduleRows, movingDraft, availability, [matchId, occupiedId]);
        const occupiedDraft = occupiedMatch ? { ...occupiedMatch, time: movingMatch.time, venue: movingMatch.venue } : null;
        const occupiedConflict = occupiedDraft ? teamPeriodConflict(scheduleRows, occupiedDraft, availability, [matchId, occupiedId]) : null;
        if (movingConflict || occupiedConflict) {
          const conflictTeam = movingConflict
            ? [movingDraft.home, movingDraft.away].find((team) => team === movingConflict.home || team === movingConflict.away)
            : [occupiedDraft.home, occupiedDraft.away].find((team) => team === occupiedConflict.home || team === occupiedConflict.away);
          showToast(`无法调整：${conflictTeam || '该球队'}在同一天同一半天已有比赛`);
          return;
        }
        const originalTime = String(movingMatch.time || '').split(' ')[1] || '';
        if (occupied && matchTimeWindowIssue(originalTime, availability)) {
          showToast('无法交换：原时间不符合当前时间段约束，请先在赛程设置中调整时间。');
          return;
        }
        const scrollY = window.scrollY;
        updateActiveEvent((currentEvent) => {
          const target = (currentEvent.scheduleRows || []).find((match) => match.id === matchId);
          if (!target) return;
          const targetTime = target.time;
          const targetVenue = target.venue;
          const targetOccupiedMatch = (currentEvent.scheduleRows || []).find((match) => match.id !== matchId && match.time === `${date} ${time}` && match.venue === venue);
          if (targetOccupiedMatch) {
            targetOccupiedMatch.time = targetTime;
            targetOccupiedMatch.venue = targetVenue;
            targetOccupiedMatch.updatedAt = new Date().toISOString();
          }
          target.time = `${date} ${time}`;
          target.venue = venue;
          target.updatedAt = new Date().toISOString();
        });
        render();
        requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
        showToast(occupied ? `已交换 ${matchId} 与 ${occupiedId || '目标场次'}` : `已调整 ${matchId} 至 ${date} ${time} · ${venue}`);
      });
    });
  }

  function bindPageInteractions() {
    const calendarVenue = content.querySelector('[data-calendar-venue-filter]');
    const calendarTime = content.querySelector('[data-calendar-time-filter]');
    if (calendarVenue || calendarTime) {
      const applyCalendarFilters = () => {
        calendarVenueFilter = calendarVenue?.value || '';
        calendarTimeFilter = calendarTime?.value || '';
        const scrollY = window.scrollY;
        render();
        requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
      };
      calendarVenue?.addEventListener('change', applyCalendarFilters);
      calendarTime?.addEventListener('change', applyCalendarFilters);
    }
    const onsiteFilters = content.querySelectorAll('[data-onsite-filter]');
    if (onsiteFilters.length) {
      const applyOnsiteFilters = () => {
        onsiteFilters.forEach((field) => {
          const key = field.dataset.onsiteFilter;
          if (key === 'date') onsiteDateFilter = field.value || '';
          if (key === 'group') onsiteGroupFilter = baseCompetitionGroup(field.value || '');
          if (key === 'venue') onsiteVenueFilter = field.value || '';
          if (key === 'status') onsiteStatusFilter = field.value || '';
        });
        const scrollY = window.scrollY;
        render();
        requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
      };
      onsiteFilters.forEach((field) => field.addEventListener('change', applyOnsiteFilters));
    }
    const onsiteOperatorMode = content.querySelector('[data-onsite-operator-count]');
    onsiteOperatorMode?.addEventListener('change', () => {
      const matchId = onsiteOperatorMode.dataset.match || selectedOnsiteMatchId;
      const count = Number(onsiteOperatorMode.value);
      if (!matchId || ![1, 2, 3].includes(count)) return;
      updateActiveEvent((eventSpace) => {
        eventSpace.onsiteAssignments = eventSpace.onsiteAssignments || {};
        eventSpace.onsiteAssignments[matchId] = eventSpace.onsiteAssignments[matchId] || {};
        eventSpace.onsiteAssignments[matchId].operatorCount = count;
        delete eventSpace.onsiteAssignments[matchId].assignmentStatus;
      });
      selectedOnsiteMatchId = matchId;
      render();
      showToast(`${matchId} 已设置为${onsiteOperatorDescription(count)}，请按席位补齐人员`);
    });
    const refereeStatus = content.querySelector('[data-referee-status-filter]');
    refereeStatus?.addEventListener('change', () => {
      refereeStatusFilter = refereeStatus.value || '';
      render();
    });
    content.querySelectorAll('[data-match-sheet-filter]').forEach((select) => {
      select.addEventListener('change', () => {
        matchSheetFilters[select.dataset.matchSheetFilter] = select.value;
        render();
      });
    });
    content.querySelector('[data-match-sheet-sort]')?.addEventListener('change', (event) => {
      matchSheetSort = ['group-time', 'time-group', 'group-serial'].includes(event.target.value) ? event.target.value : 'group-time';
      render();
    });
    content.querySelectorAll('[data-filter-target]').forEach((input) => {
      const targetClass = input.dataset.filterTarget;
      input.addEventListener('input', () => {
        const keyword = input.value.trim().toLowerCase();
        content.querySelectorAll(`.${targetClass}`).forEach((element) => {
          element.hidden = Boolean(keyword)
            && !String(element.dataset.search || element.textContent).toLowerCase().includes(keyword);
        });
      });
    });
    content.querySelector('[data-result-report-date]')?.addEventListener('change', (event) => {
      resultReportDateFilter = event.target.value || '';
      render();
    });
    content.querySelector('[data-result-review-date]')?.addEventListener('change', (event) => {
      resultReportDateFilter = event.target.value || '';
      resultReviewView = 'poster';
      render();
    });
    content.querySelector('[data-result-match-picker]')?.addEventListener('change', (event) => {
      const viewport = resultViewportSnapshot();
      selectedReviewMatchId = event.target.value || selectedReviewMatchId;
      resultReviewView = 'table';
      render();
      restoreResultViewport(viewport, selectedReviewMatchId);
    });
    const registrationSearch = content.querySelector('[data-registration-search]');
    const registrationGroup = content.querySelector('[data-registration-group-filter]');
    const registrationStatus = content.querySelector('[data-registration-status-filter]');
    if (registrationSearch || registrationGroup || registrationStatus) {
      const applyRegistrationFilters = () => {
        const keyword = String(registrationSearch?.value || '').trim().toLowerCase();
        registrationGroupFilter = registrationGroup?.value || '';
        registrationStatusFilter = registrationStatus?.value || '';
        let visibleCount = 0;
        content.querySelectorAll('.registration-row').forEach((row) => {
          const matchesKeyword = !keyword || String(row.dataset.search || row.textContent).toLowerCase().includes(keyword);
          const matchesGroup = !registrationGroupFilter || row.dataset.group === registrationGroupFilter;
          const matchesStatus = !registrationStatusFilter || row.dataset.claimStatus === registrationStatusFilter;
          row.hidden = !(matchesKeyword && matchesGroup && matchesStatus);
          if (!row.hidden) visibleCount += 1;
        });
        const count = content.querySelector('[data-registration-count]');
        if (count) count.textContent = `共 ${visibleCount} 条`;
      };
      registrationSearch?.addEventListener('input', applyRegistrationFilters);
      registrationGroup?.addEventListener('change', applyRegistrationFilters);
      registrationStatus?.addEventListener('change', applyRegistrationFilters);
      applyRegistrationFilters();
    }
    const teamLibrarySearch = content.querySelector('[data-team-library-search]');
    const teamLibraryGroup = content.querySelector('[data-team-library-group-filter]');
    const teamLibraryStatus = content.querySelector('[data-team-library-status-filter]');
    if (teamLibrarySearch || teamLibraryGroup || teamLibraryStatus) {
      const applyTeamLibraryFilters = () => {
        const keyword = String(teamLibrarySearch?.value || '').trim().toLowerCase();
        teamLibraryGroupFilter = teamLibraryGroup?.value || '';
        teamLibraryStatusFilter = teamLibraryStatus?.value || '';
        let visibleCount = 0;
        content.querySelectorAll('.team-library-row').forEach((row) => {
          const matched = (!keyword || String(row.dataset.search || row.textContent).toLowerCase().includes(keyword))
            && (!teamLibraryGroupFilter || row.dataset.group === teamLibraryGroupFilter)
            && (!teamLibraryStatusFilter || row.dataset.status === teamLibraryStatusFilter);
          row.hidden = !matched;
          if (matched) visibleCount += 1;
        });
        const count = content.querySelector('[data-team-library-count]');
        if (count) count.textContent = `共 ${visibleCount} 支球队`;
      };
      teamLibrarySearch?.addEventListener('input', applyTeamLibraryFilters);
      teamLibraryGroup?.addEventListener('change', applyTeamLibraryFilters);
      teamLibraryStatus?.addEventListener('change', applyTeamLibraryFilters);
      applyTeamLibraryFilters();
    }
    content.querySelectorAll('.team-library-row').forEach((row) => {
      row.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        const selection = row.querySelector('[data-action="select-team"]');
        if (!selection?.dataset.team) return;
        selectedTeamName = selection.dataset.team;
        render();
        showToast(`已选中 ${selectedTeamName}，右侧详情已更新`);
      });
    });
    const playerArchiveTeam = content.querySelector('[data-player-archive-team-filter]');
    const playerArchiveRealName = content.querySelector('[data-player-archive-realname-filter]');
    const playerArchiveData = content.querySelector('[data-player-archive-data-filter]');
    if (playerArchiveTeam || playerArchiveRealName || playerArchiveData) {
      const applyPlayerArchiveFilters = () => {
        playerArchiveTeamFilter = playerArchiveTeam?.value || '';
        playerArchiveRealNameFilter = playerArchiveRealName?.value || '';
        playerArchiveDataFilter = playerArchiveData?.value || '';
        let visibleCount = 0;
        content.querySelectorAll('.player-archive-row').forEach((row) => {
          const matched = (!playerArchiveTeamFilter || row.dataset.team === playerArchiveTeamFilter)
            && (!playerArchiveRealNameFilter || row.dataset.realname === playerArchiveRealNameFilter)
            && (!playerArchiveDataFilter || row.dataset.dataStatus === playerArchiveDataFilter);
          row.hidden = !matched;
          if (matched) visibleCount += 1;
        });
        const count = content.querySelector('[data-player-archive-count]');
        if (count) count.textContent = `共 ${visibleCount} 条`;
      };
      playerArchiveTeam?.addEventListener('change', applyPlayerArchiveFilters);
      playerArchiveRealName?.addEventListener('change', applyPlayerArchiveFilters);
      playerArchiveData?.addEventListener('change', applyPlayerArchiveFilters);
      applyPlayerArchiveFilters();
    }
    const statusFilter = content.querySelector('[data-filter-status]');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        content.querySelectorAll('.event-space-card').forEach((card) => {
          card.hidden = Boolean(statusFilter.value) && card.dataset.status !== statusFilter.value;
        });
      });
    }
    const formatGroupSwitch = content.querySelector('[data-format-group-switch]');
    formatGroupSwitch?.addEventListener('change', () => {
      selectedFormatGroupId = formatGroupSwitch.value;
      selectedFormatGroupName = selectedFormatGroup()?.name || '';
      selectedFormatStageId = 'group-stage';
      render();
    });
    const drawGroupSwitch = content.querySelector('[data-draw-group-switch]');
    drawGroupSwitch?.addEventListener('change', () => {
      const group = rememberSelectedDrawGroup(drawGroupSwitch.value);
      const targetPage = drawPageForCompetition(competitionConfig(group));
      if (location.hash === `#draw/${targetPage}`) render();
      else routeTo('draw', targetPage);
    });
    content.querySelectorAll('[data-format-setting]').forEach((select) => {
      select.addEventListener('change', () => {
        const group = selectedFormatGroup();
        const config = competitionConfig(group);
        if (!config) return;
        config[select.dataset.formatSetting] = Number(select.value);
        if (config.preset === 'group-knockout' && ['groupCount', 'advancePerGroup'].includes(select.dataset.formatSetting)) {
          config.stages = groupKnockoutStages(config);
          config.groupKnockoutSchemaVersion = 2;
          config.groupKnockoutAdvanceTeams = Math.max(2, Number(config.groupCount || 1) * Number(config.advancePerGroup || 1));
          selectedFormatStageId = config.stages.some((stage) => stage.id === selectedFormatStageId)
            ? selectedFormatStageId
            : config.stages[0].id;
        }
        if (config.preset === 'group-full-placement' && ['groupCount', 'teamsPerGroup'].includes(select.dataset.formatSetting)) {
          config.stages = groupFullPlacementStages(config);
          selectedFormatStageId = config.stages.some((stage) => stage.id === selectedFormatStageId)
            ? selectedFormatStageId
            : config.stages[0].id;
        }
        config.dirty = true;
        render();
      });
    });
    content.querySelectorAll('[data-format-point]').forEach((select) => {
      select.addEventListener('change', () => {
        const group = selectedFormatGroup();
        const config = competitionConfig(group);
        if (!config) return;
        config.points[select.dataset.formatPoint] = Number(select.value);
        config.dirty = true;
        render();
      });
    });
    const venueGroupSwitch = content.querySelector('[data-venue-group-switch]');
    venueGroupSwitch?.addEventListener('change', () => {
      const settings = eventVenueSettings();
      if (!settings) return;
      settings.groupName = venueGroupSwitch.value;
      render();
    });
    content.querySelectorAll('[data-venue-field]').forEach((field) => {
      field.addEventListener('change', () => {
        const settings = eventVenueSettings();
        if (!settings) return;
        const key = field.dataset.venueField;
        settings.availability[key] = ['matchMinutes', 'bufferMinutes'].includes(key) ? Number(field.value) : field.value;
        if (['morningStartTime', 'morningEndTime', 'afternoonStartTime', 'afternoonEndTime', 'eveningStartTime', 'eveningEndTime', 'matchMinutes', 'bufferMinutes'].includes(key)) {
          settings.availability.scheduleTimeSlots = [];
        }
        if (key === 'startDate' || key === 'endDate') {
          const range = scheduleEditableDateRange(settings.availability);
          settings.availability.startDate = range.startDate;
          settings.availability.endDate = range.endDate;
        }
        render();
      });
    });
    content.querySelectorAll('[data-venue-date-picker]').forEach((field) => {
      field.addEventListener('click', () => {
        // 部分桌面浏览器在 file 页面不会自动拉起日期面板，显式调用以保证结束日期可选。
        try { field.showPicker?.(); } catch (_) { /* 浏览器不支持时继续使用原生交互 */ }
      });
    });
    content.querySelector('[data-venue-evening-enabled]')?.addEventListener('change', (event) => {
      const settings = eventVenueSettings();
      if (!settings) return;
      settings.availability.eveningEnabled = event.target.checked;
      settings.availability.scheduleTimeSlots = [];
      render();
    });
    content.querySelectorAll('[data-venue-court-type]').forEach((select) => {
      select.addEventListener('change', () => {
        const settings = eventVenueSettings();
        const venue = settings?.venues.find((item) => item.id === selectedVenueId);
        const court = venue?.courts?.find((item) => item.id === select.dataset.courtId);
        if (!court) return;
        court.type = select.value;
        render();
      });
    });
    content.querySelectorAll('[data-venue-court-group]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const settings = eventVenueSettings();
        const venue = settings?.venues.find((item) => item.id === selectedVenueId);
        const court = venue?.courts?.find((item) => item.id === checkbox.dataset.courtId);
        if (!court) return;
        court.groupIds = [...content.querySelectorAll(`[data-venue-court-group][data-court-id="${CSS.escape(court.id)}"]:checked`)].map((field) => field.value);
        render();
      });
    });
    content.querySelectorAll('[data-venue-court-match-minutes],[data-venue-court-buffer-minutes]').forEach((select) => {
      select.addEventListener('change', () => {
        const settings = eventVenueSettings();
        const venue = settings?.venues.find((item) => item.id === selectedVenueId);
        const court = venue?.courts?.find((item) => item.id === select.dataset.courtId);
        if (!court) return;
        if (select.matches('[data-venue-court-match-minutes]')) court.matchMinutes = Number(select.value);
        else court.bufferMinutes = Number(select.value);
        court.scheduleProfileVersion = 1;
        render();
      });
    });
    content.querySelectorAll('[data-venue-court-time]').forEach((field) => {
      field.addEventListener('change', () => {
        const settings = eventVenueSettings();
        const venue = settings?.venues.find((item) => item.id === selectedVenueId);
        const court = venue?.courts?.find((item) => item.id === field.dataset.courtId);
        if (!court || !field.dataset.key) return;
        court[field.dataset.key] = field.value;
        court.scheduleProfileVersion = 2;
        render();
      });
    });
    content.querySelectorAll('[data-venue-court-evening]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const settings = eventVenueSettings();
        const venue = settings?.venues.find((item) => item.id === selectedVenueId);
        const court = venue?.courts?.find((item) => item.id === checkbox.dataset.courtId);
        if (!court) return;
        court.eveningEnabled = checkbox.checked;
        court.scheduleProfileVersion = 2;
        render();
      });
    });
  }

  async function handleAction(action, target) {
    const readOnlyActions = new Set([
      'upload-event-image', 'choose-logo-background', 'edit-event-brand', 'toggle-background-removal', 'apply-image-edit', 'add-group', 'edit-group', 'save-group', 'request-delete-group', 'confirm-delete-group',
      'open-format-settings', 'back-to-groups', 'select-format-group', 'apply-format-preset', 'select-format-type', 'select-format-stage', 'add-format-stage', 'save-added-stage', 'remove-format-stage', 'save-format-next', 'edit-format-flow', 'save-format-flow', 'clear-format-flow', 'copy-format-settings', 'save-copy-format',
      'set-venue-scope', 'select-event-venue', 'toggle-event-venue', 'toggle-event-court', 'add-venue', 'edit-venue', 'save-event-venue', 'request-delete-event-venue', 'confirm-delete-event-venue', 'add-event-court', 'save-event-court', 'request-delete-event-court', 'confirm-delete-event-court', 'reset-court-schedule', 'reset-all-court-schedules', 'add-schedule-time-slot', 'edit-schedule-time-slot', 'save-schedule-time-slot', 'reset-schedule-time-slots',
      'show-qr', 'registration-settings', 'add-registration-team', 'edit-registration-team', 'edit-current-team', 'save-registration-team', 'request-delete-registration-team', 'confirm-delete-registration-team', 'invite-captain', 'copy-team-invite-link', 'confirm-team-invite', 'claim-all-registration-teams', 'confirm-claim-all-registration-teams', 'test-admit-all-registration-teams', 'confirm-test-admit-all-registration-teams', 'audit-registration-team', 'approve-registration-team', 'reject-registration-team', 'test-admit-registration-team', 'confirm-test-admission', 'revoke-test-admission', 'test-import-teams', 'auto-draw', 'reset-draw', 'save-groups', 'randomize-round-robin-order', 'move-round-robin-order', 'save-round-robin-draw', 'auto-knockout', 'reset-knockout-seeds', 'save-knockout-draw',
      'edit-advancement', 'use-rule-template', 'apply-rule-template', 'regenerate-rules', 'rule-format', 'rule-insert-clause',
      'generate-schedule', 'generate-round-robin', 'edit-times', 'edit-constraints', 'save-schedule-rules', 'resolve-schedule-evening', 'confirm-resolve-schedule-evening', 'resolve-schedule-extra-day', 'confirm-resolve-schedule-extra-day', 'add-schedule-match', 'save-manual-schedule-match', 'confirm-manual-match-next-slot', 'add-calendar-time-slot', 'save-calendar-time-slot', 'remove-calendar-time-slot', 'add-calendar-court', 'save-calendar-court', 'clear-calendar-schedule', 'confirm-clear-calendar-schedule', 'save-cleared-schedule-settings', 'save-and-generate-cleared-schedule', 'save-calendar-schedule',
      'save-assignment', 'remove-seat', 'select-referee', 'add-referee', 'confirm-add-referee', 'bind-referee', 'confirm-bind-referee', 'send-access-notifications', 'confirm-send-access-notifications', 'approve-result', 'return-result', 'approve-selected-result',
      'return-selected-result', 'test-return-results', 'test-approve-all-results', 'edit-result', 'save-result-record', 'set-result-view', 'set-report-style', 'open-report-layout', 'save-report-layout', 'print-result-report', 'settle', 'toggle',
      'review-player', 'approve-player-modal', 'assign-match', 'assign-data-task', 'batch-assign',
      'batch-data-task', 'assign-internal', 'confirm-assign', 'save-modal', 'save-page', 'publish-rules',
      'publish-schedule', 'publish-standings', 'publish-bracket'
    ]);
    if (eventWorkflow().finished && readOnlyActions.has(action)) {
      showToast('赛事已结束，当前空间仅供查看历史数据');
      return;
    }
    const routes = {
      'go-event': ['spaces',''], 'go-profile': ['event','profile'], 'go-qualification': ['registration','qualification'],
      'go-event-profile': ['event','profile'], 'go-event-registration': ['event','registration'], 'go-event-venues': ['schedule','settings'], 'go-schedule-settings': ['schedule','settings'],
      'go-review': ['results','review'], 'go-people': ['onsite','people'],
      'go-calendar': ['schedule','calendar'], 'go-auto': ['schedule','calendar'], 'go-rosters': ['registration','rosters'],
      'go-consoles': ['onsite','consoles'], 'match-detail': ['schedule','detail'],
      'go-schedule': ['schedule','matches'], 'go-schedule-matches': ['schedule','matches'], 'go-claims': ['registration','claims'],
      'go-data-tasks': ['onsite','data-tasks'], 'go-registration-progress': ['registration','progress'],
      'go-event-groups': ['event','groups'], 'go-event-posters': ['event','posters'], 'go-result-reports': ['results','reports'], 'go-results-review': ['results','review']
    };
    if (action === 'export-schedule-sheet') {
      exportCompetitionScheduleWorkbook();
      return;
    }
    if (action === 'select-schedule-sheet-group') {
      matchSheetFilters = {
        phase: '',
        round: '',
        group: target.dataset.group || '',
        subgroup: '',
        team: '',
        venue: '',
        state: ''
      };
      render();
      return;
    }
    if (action === 'reset-schedule-sheet-filter') {
      const currentGroup = matchSheetFilters.group;
      matchSheetFilters = { phase: '', round: '', group: currentGroup, subgroup: '', team: '', venue: '', state: '' };
      render();
      return;
    }
    if (action === 'print-schedule-sheet') {
      openCompetitionSchedulePrint();
      return;
    }
    if (action === 'set-schedule-orientation') {
      competitionScheduleOrientation = target.dataset.orientation === 'landscape' ? 'landscape' : 'portrait';
      render();
      return;
    }
    if (action === 'add-schedule-time-slot') {
      openModal('添加每日开赛时间', `<div class="form-grid"><label class="field full"><span>开赛时间</span><input type="time" value="09:00" data-schedule-time-input></label></div><div class="info-banner">新增后将作为所有比赛日共用的开赛时间，自动排赛时会在各已启用场地中使用该时间。</div>`, `${btn('取消','close-modal','outline')}${btn('确认添加','save-schedule-time-slot','primary','plus')}`);
      return;
    }
    if (action === 'edit-schedule-time-slot') {
      const originalTime = target.dataset.scheduleTime || '';
      openModal('调整每日开赛时间', `<div class="form-grid"><label class="field full"><span>开赛时间</span><input type="time" value="${esc(originalTime)}" data-schedule-time-input></label></div><div class="info-banner">该时间将应用于赛事每天的自动排赛。修改基础时段或单场时长后，系统会重新推算开赛时间。</div>`, `${btn('取消','close-modal','outline')}${btn('保存调整','save-schedule-time-slot','primary','save')}`);
      modalBody.querySelector('[data-schedule-time-input]')?.setAttribute('data-original-time', originalTime);
      return;
    }
    if (action === 'save-schedule-time-slot') {
      const input = modalBody.querySelector('[data-schedule-time-input]');
      const originalTime = input?.dataset.originalTime || '';
      const nextTime = input?.value || '';
      if (!/^\d{2}:\d{2}$/.test(nextTime)) {
        showToast('请选择有效的开赛时间');
        return;
      }
      updateActiveEvent((eventSpace) => {
        const availability = eventVenueSettings(eventSpace).availability;
        const baseTimes = automaticScheduleTimes(availability);
        const slots = Array.isArray(availability.scheduleTimeSlots) && availability.scheduleTimeSlots.length
          ? [...availability.scheduleTimeSlots]
          : [...baseTimes];
        const index = slots.indexOf(originalTime);
        if (originalTime && index >= 0) slots[index] = nextTime;
        else slots.push(nextTime);
        availability.scheduleTimeSlots = [...new Set(slots.filter((time) => /^\d{2}:\d{2}$/.test(String(time))))].sort();
      });
      closeModal();
      render();
      showToast(`每日开赛时间已调整为 ${nextTime}`);
      return;
    }
    if (action === 'reset-schedule-time-slots') {
      updateActiveEvent((eventSpace) => {
        eventVenueSettings(eventSpace).availability.scheduleTimeSlots = [];
      });
      render();
      showToast('已按上午、下午和晚上时段重新推算开赛时间');
      return;
    }
    if (action === 'add-calendar-time-slot') {
      const eventSpace = activeEventSpace();
      const defaultDate = eventSpace.startDate || new Date().toISOString().slice(0, 10);
      openModal('新增时间段', `<div class="form-grid"><div class="field"><label>比赛日期</label><input type="date" value="${esc(defaultDate)}" data-calendar-new-date></div><div class="field"><label>开赛时间</label><input type="time" value="09:00" data-calendar-new-time></div></div><div class="info-banner">时间段只添加到所选比赛日；新增后可在该日期的空白场地直接添加场次或拖放比赛。</div>`, `${btn('取消','close-modal','outline')}${btn('确认新增','save-calendar-time-slot','primary','plus')}`);
      return;
    }
    if (action === 'save-calendar-time-slot') {
      const date = modalBody.querySelector('[data-calendar-new-date]')?.value;
      const time = modalBody.querySelector('[data-calendar-new-time]')?.value;
      if (!date || !time) {
        showToast('请选择比赛日期和开赛时间');
        return;
      }
      updateActiveEvent((currentEvent) => {
        const slots = Array.isArray(currentEvent.calendarTimeSlots) ? currentEvent.calendarTimeSlots : [];
        const normalized = slots.map((slot) => typeof slot === 'string' ? { date: '', time: slot } : slot).filter((slot) => slot?.time);
        if (!normalized.some((slot) => slot.date === date && slot.time === time)) normalized.push({ date, time });
        currentEvent.calendarTimeSlots = normalized.sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
      });
      closeModal();
      render();
      showToast(`已为 ${date} 新增 ${time} 时间段`);
      return;
    }
    if (action === 'remove-calendar-time-slot') {
      const date = target.dataset.calendarTimeDate || '';
      const time = target.dataset.calendarTime || '';
      const currentEvent = activeEventSpace();
      const hasMatches = generatedScheduleRows(currentEvent).some((match) => String(match.time || '') === `${date} ${time}`);
      if (hasMatches) {
        showToast('该时间段已有比赛，不能删除');
        return;
      }
      updateActiveEvent((eventSpace) => {
        const slots = Array.isArray(eventSpace.calendarTimeSlots) ? eventSpace.calendarTimeSlots : [];
        eventSpace.calendarTimeSlots = slots.filter((slot) => {
          if (typeof slot === 'string') return slot !== time;
          return !(slot?.date === date && slot?.time === time);
        });
      });
      render();
      showToast(`已删除 ${date} ${time} 时间段`);
      return;
    }
    if (action === 'add-calendar-court') {
      const settings = eventVenueSettings();
      const options = (settings?.venues || []).filter((venue) => venue.enabled !== false).map((venue) => `<option value="${esc(venue.id)}">${esc(venue.name)}</option>`).join('');
      openModal('新增场地', `<div class="form-grid"><div class="field"><label>所属场馆</label><select data-calendar-new-court-venue>${options}</select></div><div class="field"><label>场地名称</label><input data-calendar-new-court-name placeholder="例如：球场 5"></div></div><div class="info-banner">新增后会立即作为日历固定列，并同步写入当前赛事的场馆设置。</div>`, `${btn('取消','close-modal','outline')}${btn('确认新增','save-calendar-court','primary','plus')}`);
      return;
    }
    if (action === 'save-calendar-court') {
      const venueId = modalBody.querySelector('[data-calendar-new-court-venue]')?.value;
      const courtName = modalBody.querySelector('[data-calendar-new-court-name]')?.value.trim();
      if (!venueId || !courtName) {
        showToast('请选择场馆并填写场地名称');
        return;
      }
      updateActiveEvent((currentEvent) => {
        const settings = eventVenueSettings(currentEvent);
        const venue = settings?.venues.find((item) => item.id === venueId);
        if (!venue) return;
        if ((venue.courts || []).some((court) => court.name === courtName)) return;
        venue.courts ||= [];
        venue.courts.push({ id: `court-${Date.now()}`, name: courtName, location: courtName, type: '标准全场', enabled: true });
        settings.updatedAt = new Date().toISOString();
      });
      closeModal();
      render();
      showToast(`已新增 ${courtName}`);
      return;
    }
    if (action === 'save-calendar-schedule') {
      const currentEvent = activeEventSpace();
      const periodIssues = scheduleTeamPeriodIssues(generatedScheduleRows(currentEvent), eventVenueSettings(currentEvent)?.availability || {});
      if (periodIssues.length) {
        const issue = periodIssues[0];
        showToast(`无法保存：${issue.team}在${issue.date}${issue.period}安排了多场比赛`);
        return;
      }
      const stageIssues = scheduleStageOrderIssues(generatedScheduleRows(currentEvent), eventVenueSettings(currentEvent)?.availability || {});
      if (stageIssues.length) {
        showToast('无法保存：小组赛尚未全部结束就进入了半决赛或决赛，请重新自动排赛');
        return;
      }
      updateActiveEvent((currentEvent, workflow) => {
        currentEvent.scheduleSavedAt = new Date().toISOString();
        currentEvent.matches = (currentEvent.scheduleRows || []).length;
        workflow.scheduleGenerated = currentEvent.matches > 0;
      });
      showToast('赛程已保存，场次表与导出内容已同步更新');
      return;
    }
    if (action === 'clear-calendar-schedule') {
      openModal('清空当前赛程', `<div class="info-banner warning">${icon('triangle-alert')} 将清除当前赛事的全部已建比赛与保存版本，不影响已审核球队、分组、场馆和球场。确认后将立即进入赛程设置，再决定是否自动排赛。</div>`, `${btn('取消','close-modal','outline')}${btn('清空并重新设置','confirm-clear-calendar-schedule','danger','trash-2')}`);
      return;
    }
    if (action === 'confirm-clear-calendar-schedule') {
      updateActiveEvent((currentEvent, workflow) => {
        currentEvent.scheduleRows = [];
        currentEvent.matches = 0;
        currentEvent.scheduleSavedAt = '';
        workflow.scheduleGenerated = false;
      });
      closeModal();
      routeTo('schedule', 'settings');
      showToast('赛程已清空，请先完成全部组别共用的赛程设置');
      return;
    }
    if (action === 'save-cleared-schedule-settings' || action === 'save-and-generate-cleared-schedule') {
      const form = modalBody.querySelector('[data-cleared-schedule-settings]');
      const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
      if (!data.startDate || !data.endDate || data.startDate > data.endDate || !data.startTime || !data.endTime || data.startTime >= data.endTime) {
        showToast('请填写有效的比赛日期范围和每日时间');
        return;
      }
      updateActiveEvent((currentEvent) => {
        const availability = eventVenueSettings(currentEvent).availability;
        Object.assign(availability, { startDate: data.startDate, endDate: data.endDate, startTime: data.startTime, endTime: data.endTime, matchMinutes: Number(data.matchMinutes), bufferMinutes: Number(data.bufferMinutes) });
        currentEvent.startDate = data.startDate;
        currentEvent.endDate = data.endDate;
      });
      closeModal();
      if (action === 'save-and-generate-cleared-schedule') return handleAction('generate-schedule', target);
      render();
      showToast('赛程设置已保存，可在确认场馆后重新自动排赛');
      return;
    }
    if (action === 'add-schedule-match') {
      pendingManualScheduleSlot = { date: target.dataset.scheduleDate, time: target.dataset.scheduleTime, venue: target.dataset.scheduleVenue };
      const scheduleRows = generatedScheduleRows();
      const teams = officialTeams().map((team) => team.name).filter(Boolean);
      const phases = [...new Set(scheduleRows.map((match) => match.phase).filter(Boolean))];
      const rounds = [...new Set(scheduleRows.map((match) => match.round).filter(Boolean))];
      const groups = [...new Set(scheduleRows.map((match) => match.group).filter(Boolean))];
      const selectOptions = (values, placeholder) => `<option value="">${placeholder}</option>${values.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
      openModal('手动添加场次', `<div class="form-grid"><div class="field"><label>比赛日期</label><input value="${esc(pendingManualScheduleSlot.date || '')}" readonly></div><div class="field"><label>开赛时间</label><input value="${esc(pendingManualScheduleSlot.time || '')}" readonly></div><div class="field full"><label>场地</label><input value="${esc(pendingManualScheduleSlot.venue || '')}" readonly></div><div class="field"><label>阶段</label><select data-manual-match-phase>${selectOptions(phases, '请选择阶段')}</select></div><div class="field"><label>轮次</label><select data-manual-match-round>${selectOptions(rounds, '请选择轮次')}</select></div><div class="field full"><label>组别</label><select data-manual-match-group>${selectOptions(groups, '请选择组别')}</select></div><div class="field"><label>主队</label><select data-manual-match-home>${selectOptions(teams, '请选择主队')}</select></div><div class="field"><label>客队</label><select data-manual-match-away>${selectOptions(teams, '请选择客队')}</select></div></div>`, `${btn('取消','close-modal','outline')}${btn('确认添加','save-manual-schedule-match','primary','plus')}`);
      return;
    }
    if (action === 'save-manual-schedule-match') {
      if (!pendingManualScheduleSlot?.date || !pendingManualScheduleSlot?.time || !pendingManualScheduleSlot?.venue) return;
      const home = modalBody.querySelector('[data-manual-match-home]')?.value.trim();
      const away = modalBody.querySelector('[data-manual-match-away]')?.value.trim();
      if (!home || !away) {
        showToast('请选择主队和客队');
        return;
      }
      if (home === away) {
        showToast('主队和客队不能相同');
        return;
      }
      const phase = modalBody.querySelector('[data-manual-match-phase]')?.value.trim() || '手动添加';
      const round = modalBody.querySelector('[data-manual-match-round]')?.value.trim() || '待确定';
      const group = modalBody.querySelector('[data-manual-match-group]')?.value.trim() || '未分组';
      const availability = eventVenueSettings()?.availability || {};
      const manualDraft = { time: `${pendingManualScheduleSlot.date} ${pendingManualScheduleSlot.time}`, home, away };
      const periodConflict = teamPeriodConflict(generatedScheduleRows(), manualDraft, availability);
      if (periodConflict) {
        const conflictTeam = [home, away].find((team) => team === periodConflict.home || team === periodConflict.away);
        showToast(`无法添加：${conflictTeam || '该球队'}在当天同一半天已有比赛`);
        return;
      }
      const issue = matchTimeWindowIssue(pendingManualScheduleSlot.time, availability);
      if (issue) {
        pendingManualScheduleDraft = { ...pendingManualScheduleSlot, phase, round, group, home, away };
        const nextTime = nextSafeScheduleTime(pendingManualScheduleSlot.time, availability);
        const isKnockout = /淘汰|半决|决赛/.test(phase);
        const segmentName = issue.segment?.label || '已配置时段';
        const endingText = issue.type === 'crosses-end'
          ? `该场次从 ${pendingManualScheduleSlot.time} 开始，按单场 ${availability.matchMinutes || 90} 分钟计算将于 ${issue.finish} 结束，超过${segmentName}的 ${issue.segment?.end || ''} 结束线。`
          : `${pendingManualScheduleSlot.time} 不在任何已配置的可用时段内。`;
        openModal('该场次会跨越时间段', `<div class="rule-summary"><h4>请先选择排赛策略</h4><p>${esc(endingText)}</p><div class="info-banner warning">${icon('triangle-alert')} ${isKnockout ? '当前为淘汰赛阶段，不建议直接移到下午：这可能压缩晋级队伍的恢复时间。优先考虑延长当前时段、缩短场间缓冲或提前开赛。' : '比赛不允许跨越中午、下午或晚间结束线，系统不会直接保存这条场次。'}</div><ol class="schedule-conflict-options"><li><b>优先：</b>调整时间设置，延长当前时段，或缩短场间缓冲、提前首场开赛。</li><li><b>备选：</b>${nextTime ? `移到下一可用时段 ${nextTime}` : '当前没有下一可用时段，请先增加或调整时间段'}。</li></ol></div>`, `${btn('返回修改', 'close-modal', 'outline')}${btn('调整时间设置', 'go-schedule-settings', 'outline', 'settings')}${nextTime ? `<button class="btn primary" type="button" data-action="confirm-manual-match-next-slot" data-next-time="${esc(nextTime)}">移至 ${esc(nextTime)}</button>` : ''}`);
        return;
      }
      const scrollY = window.scrollY;
      updateActiveEvent((currentEvent) => {
        const rows = currentEvent.scheduleRows ||= [];
        const maxId = rows.reduce((max, match) => Math.max(max, Number(String(match.id || '').replace(/\D/g, '')) || 0), 0);
        rows.push({ id: `M${String(maxId + 1).padStart(3, '0')}`, time: `${pendingManualScheduleSlot.date} ${pendingManualScheduleSlot.time}`, venue: pendingManualScheduleSlot.venue, phase, round, stage: phase, group, subgroup: '', home, away, state: '待开始', scheduleVersion: 3, updatedAt: new Date().toISOString() });
        currentEvent.matches = rows.length;
      });
      pendingManualScheduleSlot = null;
      closeModal();
      render();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
      showToast('已手动添加场次');
      return;
    }
    if (action === 'confirm-manual-match-next-slot') {
      const draft = pendingManualScheduleDraft;
      const nextTime = target.dataset.nextTime || '';
      if (!draft || !nextTime) return;
      const availability = eventVenueSettings()?.availability || {};
      const nextDraft = { ...draft, time: `${draft.date} ${nextTime}` };
      const periodConflict = teamPeriodConflict(generatedScheduleRows(), nextDraft, availability);
      if (periodConflict) {
        const conflictTeam = [draft.home, draft.away].find((team) => team === periodConflict.home || team === periodConflict.away);
        showToast(`无法添加：${conflictTeam || '该球队'}在当天同一半天已有比赛`);
        return;
      }
      const scrollY = window.scrollY;
      updateActiveEvent((currentEvent) => {
        const rows = currentEvent.scheduleRows ||= [];
        const maxId = rows.reduce((max, match) => Math.max(max, Number(String(match.id || '').replace(/\D/g, '')) || 0), 0);
        rows.push({ id: `M${String(maxId + 1).padStart(3, '0')}`, time: `${draft.date} ${nextTime}`, venue: draft.venue, phase: draft.phase, round: draft.round, stage: draft.phase, group: draft.group, subgroup: '', home: draft.home, away: draft.away, state: '待开始', scheduleVersion: 3, updatedAt: new Date().toISOString() });
        currentEvent.matches = rows.length;
      });
      pendingManualScheduleSlot = null;
      pendingManualScheduleDraft = null;
      closeModal();
      render();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
      showToast(`已将场次安排到下一可用时段 ${nextTime}`);
      return;
    }
    if (action === 'go-draw-next') {
      const group = rememberSelectedDrawGroup(target.dataset.groupId || eventGroupRows[0]?.id || '');
      selectedFormatGroupId = selectedDrawGroupId;
      routeTo('draw', drawPageForCompetition(competitionConfig(group)));
      return;
    }
    if (action === 'edit-event') {
      selectedEventId = target.closest('[data-event-id]')?.dataset.eventId || target.closest('.event-space-card')?.querySelector('[data-event-id]')?.dataset.eventId || selectedEventId;
      eventGroupRows = loadEventGroupRows();
      selectedFormatGroupId = activeEventSpace()?.firstGroupId || eventGroupRows[0]?.id || '';
      selectedFormatGroupName = selectedFormatGroup()?.name || '';
      selectedDrawGroupId = eventGroupRows.some((group) => group.id === activeEventSpace()?.drawSelectedGroupId) ? activeEventSpace().drawSelectedGroupId : selectedFormatGroupId;
      persistEventSpaces();
      routeTo('event', 'profile');
      return;
    }
    if (action === 'enter-event') {
      selectedEventId = target.dataset.eventId || selectedEventId;
      eventGroupRows = loadEventGroupRows();
      selectedFormatGroupId = activeEventSpace()?.firstGroupId || eventGroupRows[0]?.id || '';
      selectedFormatGroupName = selectedFormatGroup()?.name || '';
      selectedDrawGroupId = eventGroupRows.some((group) => group.id === activeEventSpace()?.drawSelectedGroupId) ? activeEventSpace().drawSelectedGroupId : selectedFormatGroupId;
      persistEventSpaces();
      routeTo('event', 'groups');
      return;
    }
    if (routes[action]) {
      routeTo(routes[action][0], routes[action][1]);
      return;
    }
    if (action === 'return-spaces') {
      routeTo('spaces');
      return;
    }
    if (action === 'open-format-settings') {
      selectedFormatGroupId = target.dataset.group || selectedFormatGroupId;
      const selectedGroup = eventGroupRows.find((item) => item.id === selectedFormatGroupId) || eventGroupRows[0];
      selectedFormatGroupName = selectedGroup?.name || '';
      selectedFormatStageId = competitionConfig(selectedGroup)?.stages?.[0]?.id || '';
      routeTo('event', 'format');
      return;
    }
    if (action === 'back-to-groups') {
      routeTo('event', 'groups');
      return;
    }
    if (action === 'set-venue-scope') {
      const settings = eventVenueSettings();
      if (!settings) return;
      settings.scope = target.dataset.scope === 'all' ? 'all' : 'current';
      render();
      return;
    }
    if (action === 'select-event-venue') {
      const settings = eventVenueSettings();
      const venueId = target.dataset.venueId || '';
      if (!settings?.venues.some((venue) => venue.id === venueId)) return;
      selectedVenueId = venueId;
      settings.selectedVenueId = venueId;
      render();
      return;
    }
    if (action === 'toggle-event-venue') {
      const settings = eventVenueSettings();
      const venue = settings?.venues.find((item) => item.id === target.dataset.venueId);
      if (!venue) return;
      venue.enabled = !venue.enabled;
      render();
      showToast(`${venue.name}已${venue.enabled ? '启用' : '停用'}`);
      return;
    }
    if (action === 'request-delete-event-venue') {
      const settings = eventVenueSettings();
      const venue = settings?.venues.find((item) => item.id === target.dataset.venueId);
      if (!venue) return;
      if (settings.venues.length <= 1) {
        openModal('场馆暂不能删除', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(venue.name)}</h3><p>当前赛事至少需要保留一个场馆，不能删除最后一个场馆。</p></div>`, btn('我知道了','close-modal','outline'));
        return;
      }
      if (eventWorkflow(activeEventSpace()).scheduleGenerated) {
        openModal('场馆暂不能删除', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(venue.name)}</h3><p>当前赛事已经生成赛程。为避免比赛场次与场馆、球场断链，请先撤销或重新生成赛程后再删除。</p></div>`, btn('我知道了','close-modal','outline'));
        return;
      }
      openModal('确认删除场馆', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('circle-x')}</span><h3>${esc(venue.name)}</h3><p>删除后，该场馆及其 ${venue.courts?.length || 0} 片球场将从当前赛事移除。</p><div class="info-banner"><b>请确认：</b>资源摘要和自动排赛可用球场数量将同步减少，保存场馆设置后生效。</div></div>`, `${btn('取消','close-modal','outline')}<button class="btn danger" type="button" data-action="confirm-delete-event-venue" data-venue-id="${esc(venue.id)}">确认删除</button>`);
      return;
    }
    if (action === 'confirm-delete-event-venue') {
      const settings = eventVenueSettings();
      const venueId = target.dataset.venueId || '';
      const venueIndex = settings?.venues.findIndex((item) => item.id === venueId) ?? -1;
      if (!settings || venueIndex < 0 || settings.venues.length <= 1) return;
      const [removedVenue] = settings.venues.splice(venueIndex, 1);
      const nextVenue = settings.venues.find((item) => item.id === selectedVenueId)
        || settings.venues[Math.min(venueIndex, settings.venues.length - 1)]
        || settings.venues[0];
      selectedVenueId = nextVenue?.id || '';
      settings.selectedVenueId = selectedVenueId;
      closeModal();
      render();
      showToast(`${removedVenue.name}已删除，请保存场馆设置`);
      return;
    }
    if (action === 'toggle-event-court') {
      const settings = eventVenueSettings();
      const venue = settings?.venues.find((item) => item.id === selectedVenueId);
      const court = venue?.courts?.find((item) => item.id === target.dataset.courtId);
      if (!court) return;
      court.enabled = !court.enabled;
      render();
      showToast(`${court.name}已${court.enabled ? '启用' : '停用'}`);
      return;
    }
    if (action === 'reset-court-schedule') {
      const settings = eventVenueSettings();
      const venue = settings?.venues.find((item) => item.id === selectedVenueId);
      const courtIndex = venue?.courts?.findIndex((item) => item.id === target.dataset.courtId) ?? -1;
      const court = venue?.courts?.[courtIndex];
      if (!court) return;
      Object.assign(court, defaultCourtScheduleProfile(court, courtIndex, settings));
      render();
      showToast(`${court.name}已恢复默认组别与时间段`);
      return;
    }
    if (action === 'reset-all-court-schedules') {
      const settings = eventVenueSettings();
      (settings?.venues || []).forEach((venue) => (venue.courts || []).forEach((court, index) => {
        Object.assign(court, defaultCourtScheduleProfile(court, index, settings));
      }));
      render();
      showToast('全部球场已按年龄组恢复默认时间段');
      return;
    }
    if (action === 'request-delete-event-court') {
      const settings = eventVenueSettings();
      const venue = settings?.venues.find((item) => item.id === selectedVenueId);
      const court = venue?.courts?.find((item) => item.id === target.dataset.courtId);
      if (!venue || !court) return;
      if ((venue.courts || []).length <= 1) {
        openModal('球场暂不能删除', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(court.name)}</h3><p>${esc(venue.name)}至少需要保留一片球场，不能删除最后一片球场。</p></div>`, btn('我知道了','close-modal','outline'));
        return;
      }
      if (eventWorkflow(activeEventSpace()).scheduleGenerated) {
        openModal('球场暂不能删除', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(court.name)}</h3><p>当前赛事已经生成赛程。为避免已排比赛与球场断链，请先撤销或重新生成赛程后再删除。</p></div>`, btn('我知道了','close-modal','outline'));
        return;
      }
      openModal('确认删除球场', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('circle-x')}</span><h3>${esc(venue.name)} · ${esc(court.name)}</h3><p>删除后，该球场将不再提供给当前赛事的自动排赛引擎。</p><div class="info-banner"><b>请确认：</b>球场数量和预计可排场次将同步减少，保存场馆设置后生效。</div></div>`, `${btn('取消','close-modal','outline')}<button class="btn danger" type="button" data-action="confirm-delete-event-court" data-court-id="${esc(court.id)}">确认删除</button>`);
      return;
    }
    if (action === 'confirm-delete-event-court') {
      const settings = eventVenueSettings();
      const venue = settings?.venues.find((item) => item.id === selectedVenueId);
      const courtId = target.dataset.courtId || '';
      const courtIndex = venue?.courts?.findIndex((item) => item.id === courtId) ?? -1;
      if (!venue || courtIndex < 0 || venue.courts.length <= 1) return;
      const [removedCourt] = venue.courts.splice(courtIndex, 1);
      closeModal();
      render();
      showToast(`${removedCourt.name}已删除，请保存场馆设置`);
      return;
    }
    if (action === 'add-venue') {
      openEventVenueEditor();
      return;
    }
    if (action === 'edit-venue') {
      openEventVenueEditor(selectedVenueId || eventVenueSettings()?.selectedVenueId || '');
      return;
    }
    if (action === 'save-event-venue') {
      const form = modalBody.querySelector('[data-event-venue-form]');
      const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
      const name = String(data.name || '').trim();
      const address = String(data.address || '').trim();
      if (!name || !address) {
        showToast('请填写场馆名称和地址');
        return;
      }
      const settings = eventVenueSettings();
      const venueId = form?.dataset.venueId || '';
      const existingVenue = settings?.venues.find((venue) => venue.id === venueId);
      if (existingVenue) {
        Object.assign(existingVenue, { name, address });
        closeModal();
        render();
        showToast(`${name}已修改，请保存赛程设置`);
        return;
      }
      const id = `venue-${Date.now()}`;
      const courts = defaultVenueCourts(Math.max(1, Number(data.courtCount || 1)), name).map((court) => ({ ...court, type: String(data.courtType || '标准全场') }));
      settings.venues.push({ id, name, address, enabled: true, imagePosition: '72% 68%', courts });
      selectedVenueId = id;
      settings.selectedVenueId = id;
      closeModal();
      render();
      showToast(`${name}已添加，请保存场馆设置`);
      return;
    }
    if (action === 'add-event-court') {
      openEventCourtEditor();
      return;
    }
    if (action === 'save-event-court') {
      const form = modalBody.querySelector('[data-event-court-form]');
      const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
      const settings = eventVenueSettings();
      const venue = settings?.venues.find((item) => item.id === selectedVenueId);
      if (!venue || !String(data.name || '').trim()) {
        showToast('请填写球场名称');
        return;
      }
      venue.courts = Array.isArray(venue.courts) ? venue.courts : [];
      venue.courts.push({ id: `court-${Date.now()}`, name: String(data.name).trim(), location: String(data.location || venue.name).trim(), type: String(data.type || '标准全场'), enabled: true });
      closeModal();
      render();
      showToast('球场已添加，请保存场馆设置');
      return;
    }
    if (action === 'select-format-group') {
      selectedFormatGroupId = target.dataset.group || selectedFormatGroupId;
      selectedFormatGroupName = selectedFormatGroup()?.name || '';
      selectedFormatStageId = 'group-stage';
      render();
      return;
    }
    if (action === 'apply-format-preset') {
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      if (!config) return;
      applyFormatPreset(config, target.dataset.formatPreset || 'blank', Number(group.target || 8));
      group.competition = config.stages.length ? (target.dataset.formatPreset === 'round-robin' ? '单循环赛' : target.dataset.formatPreset === 'knockout' ? '单场淘汰赛' : '组合赛制') : '待设置';
      render();
      return;
    }
    if (action === 'select-format-type') {
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      if (!config) return;
      config.formatType = target.dataset.formatType || 'combined';
      syncStagesForFormat(config);
      config.dirty = true;
      group.competition = formatTypeLabel(config.formatType);
      render();
      return;
    }
    if (action === 'select-format-stage') {
      selectedFormatStageId = target.dataset.stageId || selectedFormatStageId;
      render();
      return;
    }
    if (action === 'add-format-stage') {
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      if (!config) return;
      openModal('添加比赛阶段', `<form class="form-grid" data-add-format-stage-form><div class="field"><label>阶段类型</label><select name="type"><option value="group">小组循环赛</option><option value="single-round">晋级组单循环</option><option value="knockout">淘汰赛</option><option value="final">决赛</option></select></div><div class="field"><label>阶段名称</label><input name="name" value="${config.stages.length ? '下一阶段' : '小组单循环'}"></div></form><div class="info-banner">阶段将添加到当前流程末尾，添加后仍可删除并继续调整参数。</div>`, `${btn('取消','close-modal','outline')}${btn('确认添加','save-added-stage','primary','plus')}`);
      return;
    }
    if (action === 'save-added-stage') {
      const form = modalBody.querySelector('[data-add-format-stage-form]');
      const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      if (!config) return;
      const type = data.type || 'knockout';
      const stage = { id: `${type}-${Date.now()}`, name: String(data.name || '下一阶段').trim() || '下一阶段', type };
      config.stages.push(stage);
      config.formatType = config.stages.length > 1 ? 'combined' : type;
      config.preset = '';
      config.dirty = true;
      selectedFormatStageId = stage.id;
      group.competition = config.stages.length > 1 ? '自定义组合赛制' : formatTypeLabel(type);
      closeModal();
      render();
      showToast('比赛阶段已添加');
      return;
    }
    if (action === 'remove-format-stage') {
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      if (!config) return;
      config.stages = config.stages.filter((stage) => stage.id !== target.dataset.stageId);
      config.preset = '';
      config.dirty = true;
      selectedFormatStageId = config.stages[0]?.id || '';
      group.competition = config.stages.length ? '自定义组合赛制' : '待设置';
      render();
      showToast('比赛阶段已删除');
      return;
    }
    if (action === 'save-format-next') {
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      const blockingIssue = formatConfigIssues(group, config).find((issue) => issue.level === 'error');
      if (blockingIssue) return showToast(blockingIssue.message);
      updateActiveEvent((eventSpace, workflow) => {
        config.configured = true;
        config.dirty = false;
        config.updatedAt = new Date().toISOString();
        eventSpace.groupRows = [...eventGroupRows];
        eventSpace.groups = eventGroupRows.length;
        workflow.groupsConfigured = eventGroupRows.every((item) => competitionConfig(item).configured);
        workflow.formatConfigured = workflow.groupsConfigured;
      });
      routeTo('event', 'registration');
      showToast(`${group.name} 赛制已保存，继续设置报名`);
      return;
    }
    if (action === 'edit-format-flow') {
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      openModal('编辑赛制流程', `<form class="form-grid" data-format-flow-form><div class="field"><label>流程阶段数</label><select name="stageCount">${[1,2,3,4].map((value) => `<option value="${value}"${config.stages.length === value ? ' selected' : ''}>${value} 个阶段</option>`).join('')}</select></div><div class="field"><label>首阶段方式</label><select name="firstStage"><option value="group"${config.stages[0]?.type === 'group' ? ' selected' : ''}>小组单循环</option><option value="single-round"${config.stages[0]?.type === 'single-round' ? ' selected' : ''}>全部球队单循环</option></select></div></form><div class="info-banner">阶段数大于 1 时，系统依次生成八强淘汰赛、半决赛和决赛，并校验晋级数量。</div>`, `${btn('取消','close-modal','outline')}${btn('保存流程','save-format-flow','primary','save')}`);
      return;
    }
    if (action === 'save-format-flow') {
      const form = modalBody.querySelector('[data-format-flow-form]');
      const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      if (!config) return;
      const count = Math.max(1, Math.min(4, Number(data.stageCount || 1)));
      const first = data.firstStage === 'single-round'
        ? { id: 'round-robin', name: '单循环赛', type: 'single-round' }
        : { id: 'group-stage', name: '小组单循环', type: 'group' };
      const knockoutStages = [
        { id: 'quarter-final', name: '八强淘汰赛', type: 'knockout' },
        { id: 'semi-final', name: '半决赛', type: 'knockout' },
        { id: 'final', name: '决赛', type: 'final' }
      ];
      config.formatType = count > 1 ? 'combined' : first.type;
      config.stages = [first, ...knockoutStages.slice(knockoutStages.length - (count - 1))];
      config.dirty = true;
      selectedFormatStageId = config.stages[0].id;
      group.competition = count > 1 ? '组合赛制' : formatTypeLabel(first.type);
      closeModal();
      render();
      showToast('赛制流程已更新');
      return;
    }
    if (action === 'clear-format-flow') {
        const group = selectedFormatGroup();
      const config = competitionConfig(group);
      if (!config) return;
      config.stages = [];
      config.dirty = true;
      selectedFormatStageId = '';
      render();
      showToast('赛制流程已清空，可重新选择赛制或添加阶段');
      return;
    }
    if (action === 'copy-format-settings') {
      const targets = eventGroupRows.filter((item) => item.id !== selectedFormatGroupId);
      if (!targets.length) {
        showToast('至少需要两个组别才能复制设置');
        return;
      }
      openModal('复制组别赛制设置', `<form class="form-grid" data-copy-format-form><div class="field full"><label>复制到组别</label><select name="targetGroup">${targets.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></div></form><div class="info-banner">仅复制赛制、阶段、晋级和积分规则，不修改目标组别的年龄、名单人数及比赛时长。</div>`, `${btn('取消','close-modal','outline')}${btn('确认复制','save-copy-format','primary','save')}`);
      return;
    }
    if (action === 'save-copy-format') {
      const form = modalBody.querySelector('[data-copy-format-form]');
      const targetId = form ? new FormData(form).get('targetGroup') : '';
      const source = selectedFormatGroup();
      const destination = eventGroupRows.find((item) => item.id === targetId);
      if (!source || !destination) return;
      destination.competitionConfig = JSON.parse(JSON.stringify(competitionConfig(source)));
      destination.competitionConfig.dirty = true;
      destination.competitionConfig.configured = false;
      destination.competition = source.competition;
      closeModal();
      showToast(`赛制设置已复制到 ${destination.name}`);
      return;
    }
    if (action === 'generate-poster') {
      const eventSpace = updateActiveEvent((eventSpace) => {
        const form = content.querySelector('[data-registration-form]');
        if (form) {
          const values = Object.fromEntries(new FormData(form).entries());
          eventSpace.registrationSettings = Object.assign(registrationSettings(eventSpace), values);
          eventSpace.registrationDataVersion = Number(eventSpace.registrationDataVersion || 0) + 1;
        }
      });
      if (window.SXFPosterStudio) {
        const posterId = await window.SXFPosterStudio.ensureDefault(eventSpace, registrationSettings(eventSpace));
        if (!Array.isArray(eventSpace.posterIds) || !eventSpace.posterIds.length) {
          eventSpace.posterIds = [posterId];
          eventSpace.primaryPosterId = posterId;
          persistEventSpaces();
        }
      }
      routeTo('event', 'posters');
      showToast('报名海报已生成');
      return;
    }
    if (action === 'create-event') {
      createEventDraft = null;
      uploadedEventImages.createLogo = '';
      openCreateEvent();
      return;
    }
    if (action === 'upload-event-image') {
      if (target.dataset.uploadKind === 'createLogo') createEventDraft = captureCreateEventDraft();
      if (target.dataset.uploadKind === 'teamLogo') registrationTeamDraft = captureRegistrationTeamDraft();
      openEventImagePicker(target.dataset.uploadKind || 'logo');
      return;
    }
    if (action === 'edit-event-brand') {
      openEventBrandEditor();
      return;
    }
    if (action === 'choose-logo-background') {
      const background = normalizeLogoBackground(target.dataset.logoBackground);
      const createForm = target.closest('[data-create-event-form]');
      if (createForm) {
        const hiddenInput = createForm.querySelector('[name="logoBackground"]');
        if (hiddenInput) hiddenInput.value = background;
        createForm.querySelector('[data-logo-background-preview]')?.setAttribute('data-logo-background-preview', background);
        createForm.querySelectorAll('[data-action="choose-logo-background"]').forEach((button) => {
          const isActive = button.dataset.logoBackground === background;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });
        createEventDraft = captureCreateEventDraft();
        return;
      }
      const brandForm = target.closest('[data-event-brand-form]');
      if (brandForm) {
        updateActiveEvent((eventSpace) => { eventSpace.logoBackground = background; });
        brandForm.querySelector('[data-logo-background-preview]')?.setAttribute('data-logo-background-preview', background);
        brandForm.querySelectorAll('[data-action="choose-logo-background"]').forEach((button) => {
          const isActive = button.dataset.logoBackground === background;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });
        showToast('Logo 展示底色已应用');
        return;
      }
      updateActiveEvent((eventSpace) => { eventSpace.logoBackground = background; });
      render();
      showToast('Logo 展示底色已应用');
      return;
    }
    if (action === 'toggle-background-removal') {
      if (!pendingImageEdit) return;
      pendingImageEdit.removeBackground = !pendingImageEdit.removeBackground;
      target.classList.toggle('on', pendingImageEdit.removeBackground);
      target.setAttribute('aria-pressed', String(pendingImageEdit.removeBackground));
      refreshImageEditor();
      return;
    }
    if (action === 'apply-image-edit') {
      applyImageEdit();
      return;
    }
    if (action === 'cancel-create-logo-edit') {
      pendingImageEdit = null;
      openCreateEvent(createEventDraft || {});
      return;
    }
    if (action === 'cancel-team-logo-edit') {
      const teamId = registrationTeamDraft?.id || '';
      pendingImageEdit = null;
      openRegistrationTeamEditor(teamId, registrationTeamDraft || {});
      return;
    }
    if (action === 'add-group') {
      openGroupEditor();
      return;
    }
    if (action === 'edit-group') {
      openGroupEditor(target.dataset.group || '');
      return;
    }
    if (action === 'request-delete-group') {
      const groupId = target.dataset.groupId || '';
      const group = eventGroupRows.find((item) => item.id === groupId);
      if (!group) return showToast('组别不存在或已被删除');
      const registeredTeamCount = registeredTeamCountForGroup(group.name);
      if (registeredTeamCount > 0) {
        openModal('组别暂不能删除', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(groupDisplayName(group))}</h3><p>本组已有 ${registeredTeamCount} 支球队入驻，删除会造成报名资料失去归属。</p><div class="info-banner"><b>处理方式：</b>请先将球队移至其他组别或删除本组报名球队。</div></div>`, btn('我知道了','close-modal','outline'));
        return;
      }
      pendingGroupId = group.id;
      const willResetDownstream = hasGroupDownstreamData();
      openModal('确认删除组别', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('circle-x')}</span><h3>${esc(groupDisplayName(group))}</h3><p>删除后，该组别资料及已保存的赛制配置将从当前赛事移除，无法撤销。</p><div class="info-banner"><b>${willResetDownstream ? '全局影响：' : '请确认：'}</b>${willResetDownstream ? '当前赛事已有抽签或赛程；确认删除后将同步清空全部组别的抽签结果、赛程、现场任务和赛果数据。' : '此组别当前没有入驻球队，也没有关联抽签和赛程。'}</div></div>`, `${btn('取消','close-modal','outline')}${btn('确认删除','confirm-delete-group','danger','circle-x')}`);
      return;
    }
    if (action === 'confirm-delete-group') {
      const group = eventGroupRows.find((item) => item.id === pendingGroupId);
      if (!group) {
        closeModal();
        return showToast('组别不存在或已被删除');
      }
      const deletedName = group.name;
      const deletedId = group.id;
      eventGroupRows = eventGroupRows.filter((item) => item.id !== deletedId);
      const eventSpace = activeEventSpace();
      if (eventSpace) {
        const downstreamResetRequired = hasGroupDownstreamData(eventSpace);
        if (downstreamResetRequired) clearGroupDownstreamData(eventSpace);
        eventSpace.groupRows = [...eventGroupRows];
        eventSpace.groups = eventGroupRows.length;
        eventSpace.firstGroup = eventGroupRows[0]?.name || '';
        eventSpace.firstGroupId = eventGroupRows[0]?.id || '';
        eventWorkflow(eventSpace).groupsConfigured = eventGroupRows.length > 0
          && eventGroupRows.every((group) => competitionConfig(group).configured);
        syncEventLifecycle(eventSpace);
        persistEventSpaces();
      }
      if (selectedFormatGroupId === deletedId) {
        selectedFormatGroupId = eventGroupRows[0]?.id || '';
        selectedFormatGroupName = eventGroupRows[0]?.name || '';
      }
      pendingGroupId = '';
      closeModal();
      render();
      showToast(`${deletedName} 已删除`);
      return;
    }
    if (action === 'save-group') {
      const form = modalBody.querySelector('[data-group-form]');
      const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
      const baseGroup = String(data.baseGroup || '').trim();
      const gender = normalizedGroupGender(String(data.gender || '混合组'));
      const name = baseGroup && baseGroup !== '请选择组别' ? `${baseGroup} ${gender}` : '';
      if (!baseGroup || baseGroup === '请选择组别') {
        showToast('请先选择标准组别');
        form?.querySelector('[name="baseGroup"]')?.focus();
        return;
      }
      if (!name) {
        showToast('请选择年龄组和性别限制');
        form?.querySelector('[name="baseGroup"]')?.focus();
        return;
      }
      const originalId = form?.dataset.originalId || '';
      if (eventGroupRows.some((group) => group.id !== originalId && group.name === name)) {
        showToast('组别名称已存在，请使用甲组、乙组等名称区分');
        form?.querySelector('[name="name"]')?.focus();
        return;
      }
      const existingGroup = eventGroupRows.find((group) => group.id === originalId);
      const competition = normalizeCompetitionName(String(data.competition || '小组循环 + 淘汰赛'));
      const grouped = isGroupedCompetition(competition);
      const groupCount = Math.max(1, Number(data.groupCount || existingGroup?.groupCount || 1));
      const teamsPerGroup = Math.max(2, Number(data.teamsPerGroup || existingGroup?.teamsPerGroup || 2));
      const advancePerGroup = Math.max(1, Number(data.advancePerGroup || existingGroup?.advancePerGroup || 1));
      const placementEnabled = ['小组循环 + 淘汰赛', '单败淘汰'].includes(competition) && String(data.placementEnabled || 'no') === 'yes';
      const placementMatchesPerTeam = placementEnabled && competition === '小组循环 + 淘汰赛'
        ? automaticPlacementMatchesPerTeam(groupCount)
        : Math.max(1, Number(existingGroup?.placementMatchesPerTeam || existingGroup?.competitionConfig?.placementMatchesPerTeam || 1));
      const selectedPreset = placementEnabled
        ? (competition === '单败淘汰' ? 'knockout-full-placement' : 'group-full-placement')
        : presetForCompetition(competition);
      if (grouped && advancePerGroup > teamsPerGroup) {
        showToast('每组晋级数量不能大于每组球队数量');
        return;
      }
      const target = grouped ? groupCount * teamsPerGroup : Math.max(2, Number(data.target || 8));
      const knockoutTeams = grouped ? groupCount * advancePerGroup : target;
      const thirdPlaceMatch = !placementEnabled && supportsThirdPlaceMatch(competition) && knockoutTeams >= 4 && String(data.thirdPlaceMatch || 'no') === 'yes';
      const structureChanged = !existingGroup
        || existingGroup.competition !== competition
        || Number(existingGroup.groupCount || existingGroup.competitionConfig?.groupCount || 0) !== groupCount
        || Number(existingGroup.teamsPerGroup || existingGroup.competitionConfig?.teamsPerGroup || 0) !== teamsPerGroup
        || Number(existingGroup.advancePerGroup || existingGroup.competitionConfig?.advancePerGroup || 0) !== advancePerGroup
        || Number(existingGroup.placementMatchesPerTeam || existingGroup.competitionConfig?.placementMatchesPerTeam || 1) !== placementMatchesPerTeam
        || (['小组循环 + 淘汰赛', '单败淘汰'].includes(competition) && existingGroup.competitionConfig?.preset !== selectedPreset)
        || Boolean(existingGroup.thirdPlaceMatch ?? existingGroup.competitionConfig?.thirdPlaceMatch ?? false) !== thirdPlaceMatch
        || Number(existingGroup.target || 0) !== target;
      const groupSettingsChanged = structureChanged
        || String(existingGroup?.name || '') !== name
        || String(existingGroup?.format || '5V5') !== String(data.format || '5V5')
        || normalizedGroupGender(existingGroup?.gender) !== gender
        || String(existingGroup?.birthCutoff || '') !== String(data.birthCutoff || '')
        || String(existingGroup?.roster || '8—16 人') !== String(data.roster || '8—16 人')
        || String(existingGroup?.duration || '4×10 分钟') !== String(data.duration || '4×10 分钟');
      const downstreamResetRequired = groupSettingsChanged && hasGroupDownstreamData();
      const commitGroupMutation = () => {
        const nextGroup = {
        ...(existingGroup || {}),
        id: existingGroup?.id || createGroupId(),
        baseGroup,
        name,
        format: String(data.format || '5V5'),
        competition,
        target: String(target),
        groupCount,
        teamsPerGroup,
        advancePerGroup,
        placementMatchesPerTeam,
        thirdPlaceMatch,
        status: String(data.status || '筹备中'),
        birthCutoff: String(data.birthCutoff || ''),
        gender,
        roster: String(data.roster || '8—16 人'),
        duration: String(data.duration || '4×10 分钟'),
        advancement: placementEnabled
          ? (competition === '单败淘汰' ? '首轮胜负分线，全员排位' : '按组内名次进入对应排位层')
            : grouped ? `每组前 ${advancePerGroup} 名` : (competition.includes('淘汰') ? '胜者晋级' : '按积分排名'),
        competitionConfig: existingGroup?.competitionConfig
      };
      const nextConfig = nextGroup.competitionConfig || defaultCompetitionConfig(nextGroup);
      nextConfig.groupCount = groupCount;
      nextConfig.teamsPerGroup = teamsPerGroup;
      nextConfig.advancePerGroup = advancePerGroup;
      nextConfig.placementMatchesPerTeam = placementMatchesPerTeam;
      nextConfig.thirdPlaceMatch = thirdPlaceMatch;
      if (structureChanged) {
        applyFormatPreset(nextConfig, selectedPreset, target);
      }
      nextConfig.configured = true;
      nextConfig.dirty = false;
      nextConfig.updatedAt = new Date().toISOString();
      nextGroup.competitionConfig = nextConfig;
      if (originalId) {
        eventGroupRows = eventGroupRows.map((group) => group.id === originalId ? nextGroup : group);
      } else {
        eventGroupRows.push(nextGroup);
      }
      const eventSpace = activeEventSpace();
      if (eventSpace) {
        if (downstreamResetRequired) clearGroupDownstreamData(eventSpace);
        if (existingGroup && existingGroup.name !== name) {
          registrationTeamRows(eventSpace).forEach((team) => {
            if (team.group === existingGroup.name) team.group = name;
          });
        }
        eventSpace.groupRows = [...eventGroupRows];
        eventSpace.groups = eventGroupRows.length;
        eventSpace.firstGroup = eventGroupRows[0]?.name || '';
        eventSpace.firstGroupId = eventGroupRows[0]?.id || '';
        eventWorkflow(eventSpace).groupsConfigured = eventGroupRows.length > 0;
        syncEventLifecycle(eventSpace);
        persistEventSpaces();
      }
      selectedFormatGroupId = nextGroup.id;
      selectedFormatGroupName = name;
      closeModal();
      render();
        showToast(downstreamResetRequired
          ? `${name} 已保存；全部抽签和赛程数据已清空，请重新操作`
          : (originalId ? `${name} 已保存` : `${name} 已创建`));
      };
      if (downstreamResetRequired) {
        pendingGroupMutationCommit = commitGroupMutation;
        openModal('组别设置变更将重置赛事流程', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(originalId ? groupDisplayName(existingGroup) : name)}</h3><p>${originalId ? '当前组别设置已发生变更。' : '当前赛事新增了竞赛组别。'}现有抽签和赛程已不再与最新组别结构一致。</p><div class="info-banner"><b>确认后将全局清空：</b>全部组别的抽签结果、已生成赛程、裁判与现场人员任务、控制台房间及赛果数据。球队报名和组别资料保留，之后需重新抽签并重新排赛。</div><small>此操作无法撤销。</small></div>`, `${btn('取消','cancel-group-mutation-reset','outline')}<button class="btn danger" type="button" data-action="confirm-group-mutation-reset">确认更改并清空</button>`);
        return;
      }
      commitGroupMutation();
      return;
    }
    if (action === 'cancel-group-mutation-reset') {
      pendingGroupMutationCommit = null;
      closeModal();
      return;
    }
    if (action === 'confirm-group-mutation-reset') {
      const commit = pendingGroupMutationCommit;
      pendingGroupMutationCommit = null;
      closeModal();
      commit?.();
      return;
    }
    if (action === 'invite-external') return openInvite(target.dataset.match || selectedOnsiteMatchId);
    if (action === 'show-qr') {
      updateActiveEvent((eventSpace, workflow) => {
        workflow.registrationConfigured = true;
      });
      openQr();
      return;
    }
    if (action === 'close-modal') {
      pendingGroupMutationCommit = null;
      return closeModal();
    }
    if (action === 'registration-settings') {
      openModal('球队入驻设置', `<div class="form-grid">${field('允许入驻组别','全部组别','select',false,['全部组别','U12组','U15组'])}${field('入驻截止时间','2026-07-10 18:00')}${field('名单最少人数','8 人')}${field('名单最多人数','16 人')}</div>`, `${btn('取消','close-modal','outline')}${btn('保存设置','save-modal','primary','save')}`);
      return;
    }
    if (action === 'sync-registration-data') {
      syncCloudRegistrationTeams(true);
      return;
    }
    if (action === 'add-registration-team') {
      uploadedEventImages.teamLogo = '';
      registrationTeamDraft = null;
      openRegistrationTeamEditor();
      return;
    }
    if (action === 'add-virtual-teams') {
      openVirtualTeamImporter();
      return;
    }
    if (action === 'filter-virtual-team-age') {
      const ageGroup = target.dataset.ageGroup || 'all';
      modalBody.querySelectorAll('[data-action="filter-virtual-team-age"]').forEach((button) => button.classList.toggle('active', button === target));
      modalBody.querySelectorAll('.virtual-team-choice').forEach((card) => { card.hidden = ageGroup !== 'all' && card.dataset.ageGroup !== ageGroup; });
      return;
    }
    if (action === 'toggle-virtual-team-selection') {
      const teamId = target.dataset.virtualTeamId || '';
      if (!teamId || target.disabled) return;
      if (pendingVirtualTeamIds.has(teamId)) pendingVirtualTeamIds.delete(teamId);
      else if (pendingVirtualTeamIds.size >= 4) return showToast('单次最多添加 4 支虚拟球队');
      else pendingVirtualTeamIds.add(teamId);
      const selected = pendingVirtualTeamIds.has(teamId);
      target.classList.toggle('selected', selected);
      target.setAttribute('aria-pressed', String(selected));
      const state = target.querySelector('em');
      if (state) state.textContent = selected ? '已选' : '选择';
      syncVirtualTeamSelection();
      return;
    }
    if (action === 'clear-virtual-team-selection') {
      pendingVirtualTeamIds.clear();
      modalBody.querySelectorAll('.virtual-team-choice.selected').forEach((card) => {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
        const state = card.querySelector('em');
        if (state) state.textContent = '选择';
      });
      syncVirtualTeamSelection();
      return;
    }
    if (action === 'confirm-add-virtual-teams') {
      const selectedIds = [...pendingVirtualTeamIds];
      if (!selectedIds.length) return showToast('请先选择要添加的虚拟球队');
      const eventSpace = updateActiveEvent((currentEvent, workflow) => {
        const rows = registrationTeamRows(currentEvent);
        const existingSourceIds = new Set(rows.filter(isCompatibleVirtualTeam).map((team) => team.virtualSourceTeamId || team.id));
        const newRows = buildVirtualRegistrationTeams(currentEvent, selectedIds.filter((id) => !existingSourceIds.has(id)));
        currentEvent.registrationTeams = rows.concat(newRows);
        currentEvent.teams = currentEvent.registrationTeams.length;
        workflow.teamsImported = officialTeams(currentEvent).length > 0;
        workflow.qualificationCompleted = true;
      });
      const addedCount = selectedIds.length;
      pendingVirtualTeamIds.clear();
      closeModal();
      render();
      showToast(`已添加 ${addedCount} 支虚拟球队和 ${addedCount * 12} 名虚拟球员`);
      return;
    }
    if (action === 'remove-virtual-teams') {
      const eventSpace = updateActiveEvent((currentEvent, workflow) => {
        currentEvent.registrationTeams = registrationTeamRows(currentEvent).filter((team) => !isCompatibleVirtualTeam(team));
        currentEvent.teams = currentEvent.registrationTeams.length;
        workflow.teamsImported = officialTeams(currentEvent).length > 0;
        workflow.qualificationCompleted = !usesPlayerData(currentEvent) || officialPlayers(currentEvent).length > 0;
      });
      closeModal();
      render();
      showToast(`已移除虚拟球队，保留 ${eventSpace.registrationTeams.length} 支其他球队`);
      return;
    }
    if (action === 'view-virtual-team') {
      openVirtualTeamDetails(target.dataset.teamId || '');
      return;
    }
    if (action === 'edit-registration-team') {
      uploadedEventImages.teamLogo = '';
      registrationTeamDraft = null;
      openRegistrationTeamEditor(target.dataset.teamId || '');
      return;
    }
    if (action === 'claim-all-registration-teams') {
      const pending = registrationTeamRows().filter((team) => team.claimStatus !== '已认领');
      if (!pending.length) return showToast('当前球队均已完成认领');
      openModal('确认全部认领', `<div class="rule-summary"><h4>批量认领 ${pending.length} 支球队</h4><p>该操作仅将未认领球队标记为“已认领”，用于演示或联调；不会自动通过赛事资格审核。</p><div class="info-banner">如需跳过审核进入抽签与球队管理，请在入驻进度中对指定球队使用“测试直通”。</div></div>`, `${btn('取消', 'close-modal', 'outline')}${btn('确认全部认领', 'confirm-claim-all-registration-teams', 'primary', 'circle-check-big')}`);
      return;
    }
    if (action === 'confirm-claim-all-registration-teams') {
      const eventSpace = activeEventSpace();
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      const pending = registrationTeamRows(eventSpace).filter((team) => team.claimStatus !== '已认领');
      pending.forEach((team) => { team.claimStatus = '已认领'; team.claimedAt = now; team.updatedAt = now; });
      eventWorkflow(eventSpace).qualificationCompleted = false;
      persistEventSpaces();
      closeModal();
      render();
      showToast(`已完成 ${pending.length} 支球队认领，请继续审核赛事资格`);
      return;
    }
    if (action === 'test-admit-all-registration-teams') {
      const pending = registrationTeamRows().filter((team) => !team.testAdmission);
      if (!pending.length) return showToast('当前球队均已测试直通');
      openModal('确认全部测试直通', `<div class="rule-summary"><h4>批量放行 ${pending.length} 支球队</h4><p>所有球队将被标记为“测试免审核”，并直接进入球队管理、抽签分组、赛程和导出。</p><div class="info-banner">该操作仅用于联调。正式赛事请使用正常认领和审核流程，或逐队撤销测试直通。</div></div>`, `${btn('取消', 'close-modal', 'outline')}${btn('确认全部测试直通', 'confirm-test-admit-all-registration-teams', 'primary', 'circle-check-big')}`);
      return;
    }
    if (action === 'confirm-test-admit-all-registration-teams') {
      const eventSpace = activeEventSpace();
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      const rows = registrationTeamRows(eventSpace);
      const pending = rows.filter((team) => !team.testAdmission);
      pending.forEach((team) => {
        team.claimStatus = '已认领';
        team.teamQualificationStatus = '已通过';
        team.testAdmission = true;
        team.claimedAt = team.claimedAt || now;
        team.qualificationUpdatedAt = now;
        team.updatedAt = now;
      });
      eventWorkflow(eventSpace).qualificationCompleted = rows.length > 0;
      persistEventSpaces();
      closeModal();
      render();
      showToast(`已将 ${pending.length} 支球队标记为测试免审核，可进入抽签分组`);
      return;
    }
    if (action === 'test-admit-registration-team') {
      const team = registrationTeamRows().find((item) => item.id === target.dataset.teamId);
      if (!team) return;
      openModal('确认测试直通', `<div class="rule-summary"><h4>${esc(team.name)}</h4><p>将跳过认领与赛事资格审核，直接以“测试免审核”身份进入球队管理、抽签分组、赛程与导出。</p><div class="info-banner">此标记仅用于测试；正式赛事请撤销测试直通后，按认领和审核流程执行。</div></div>`, `${btn('取消', 'close-modal', 'outline')}${btn('确认测试直通', 'confirm-test-admission', 'primary', 'circle-check-big')}`);
      pendingRegistrationTeamId = team.id;
      return;
    }
    if (action === 'confirm-test-admission') {
      const eventSpace = activeEventSpace();
      const team = registrationTeamRows(eventSpace).find((item) => item.id === pendingRegistrationTeamId);
      if (!team) return;
      const now = new Date().toLocaleString('zh-CN', { hour12: false });
      team.claimStatus = '已认领';
      team.teamQualificationStatus = '已通过';
      team.testAdmission = true;
      team.claimedAt = team.claimedAt || now;
      team.qualificationUpdatedAt = now;
      team.updatedAt = now;
      eventWorkflow(eventSpace).qualificationCompleted = registrationTeamRows(eventSpace)
        .filter((item) => item.claimStatus === '已认领')
        .every((item) => teamQualificationStatus(item) !== '待审核');
      persistEventSpaces();
      pendingRegistrationTeamId = '';
      closeModal();
      render();
      showToast(`${team.name} 已测试直通，可进入球队管理与抽签分组`);
      return;
    }
    if (action === 'revoke-test-admission') {
      const eventSpace = activeEventSpace();
      const team = registrationTeamRows(eventSpace).find((item) => item.id === target.dataset.teamId);
      if (!team?.testAdmission) return;
      team.testAdmission = false;
      team.teamQualificationStatus = '待审核';
      team.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
      eventWorkflow(eventSpace).qualificationCompleted = false;
      persistEventSpaces();
      render();
      showToast(`${team.name} 已撤销测试直通，等待正常审核`);
      return;
    }
    if (action === 'audit-registration-team') {
      const team = registrationTeamRows().find((item) => item.id === target.dataset.teamId);
      if (!team) return;
      if (team.claimStatus !== '已认领') {
        showToast('请先完成球队认领，再进行赛事资格审核');
        return;
      }
      const qualification = teamQualificationStatus(team);
      const reviewedAt = Number(team.reviewedAt || 0) ? new Date(team.reviewedAt).toLocaleString('zh-CN', { hour12: false }) : (team.qualificationUpdatedAt || '—');
      const details = `<div class="registration-review-summary"><div><span>球队</span><b>${esc(team.name)}</b></div><div><span>领队</span><b>${esc(team.owner || '待完善')}</b></div><div><span>联系方式</span><b>${esc(maskMobile(team.phone))}</b></div><div><span>参赛组别</span><b>${esc(team.group || '待分组')}</b></div><div><span>球员资料</span><b>${(team.players || []).length} 人</b></div><div><span>当前状态</span><b>${esc(qualification)}</b></div></div>`;
      if (qualification !== '待审核') {
        openModal('球队资格审核记录', `${details}<div class="info-banner"><b>审核意见：</b>${esc(team.reviewNote || (qualification === '已通过' ? '资料符合参赛要求' : '未填写'))}<br><b>审核时间：</b>${esc(reviewedAt)}</div>`, btn('关闭','close-modal','outline'));
        return;
      }
      openModal('审核赛事参赛资格', `${details}<form class="form-grid registration-review-form" data-registration-review-form><div class="field full"><label>审核意见</label><textarea name="note" placeholder="通过可选填；驳回时请说明需要补充的资料"></textarea></div></form><div class="info-banner">审核结果会同步至小程序任务中心，并通过服务号通知球队领队。</div>`, `${btn('取消','close-modal','outline')}${btn('驳回','reject-registration-team','danger','circle-x')}${btn('审核通过','approve-registration-team','primary','circle-check-big')}`, 'registration-review-modal');
      pendingRegistrationTeamId = team.id;
      return;
    }
    if (action === 'approve-registration-team' || action === 'reject-registration-team') {
      const eventSpace = activeEventSpace();
      const team = registrationTeamRows(eventSpace).find((item) => item.id === pendingRegistrationTeamId);
      if (!team) return;
      const decision = action === 'approve-registration-team' ? 'approve' : 'reject';
      const note = String(modalBody.querySelector('[data-registration-review-form] [name="note"]')?.value || '').trim();
      if (decision === 'reject' && !note) return showToast('驳回时请填写需要补充的资料');
      if (team.cloudTeamId) {
        const sessionToken = cloudPcSessionToken();
        if (!sessionToken) return showToast('PC会话已失效，请重新微信登录');
        try {
          await invokePcAuth('reviewRegistrationTeam', { sessionToken, eventId: eventSpace.id, teamId: team.cloudTeamId, decision, note });
        } catch (error) {
          showToast(error.message || '云端审核失败');
          return;
        }
      }
      team.teamQualificationStatus = decision === 'approve' ? '已通过' : '已驳回';
      team.reviewNote = note;
      team.testAdmission = false;
      team.qualificationUpdatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
      const claimed = registrationTeamRows(eventSpace).filter((item) => item.claimStatus === '已认领');
      eventWorkflow(eventSpace).qualificationCompleted = claimed.length > 0 && claimed.every((item) => teamQualificationStatus(item) !== '待审核');
      syncEventLifecycle(eventSpace);
      persistEventSpaces();
      pendingRegistrationTeamId = '';
      closeModal();
      render();
      showToast(`${team.name} 已${decision === 'approve' ? '通过' : '驳回'}赛事资格审核`);
      if (team.cloudTeamId) syncCloudRegistrationTeams(false);
      return;
    }
    if (action === 'request-delete-registration-team') {
      const team = registrationTeamRows().find((item) => item.id === target.dataset.teamId);
      if (!team) return showToast('球队记录不存在或已被删除');
      const workflow = eventWorkflow();
      if (workflow.drawCompleted || workflow.scheduleGenerated) {
        openModal('球队暂不能删除', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(team.name)}</h3><p>该球队已经关联抽签或赛程。请先撤销相关抽签和赛程，再删除球队，避免签位与场次数据断链。</p></div>`, btn('我知道了','close-modal','outline'));
        return;
      }
      pendingRegistrationTeamId = team.id;
      const playerCount = Array.isArray(team.players) ? team.players.length : 0;
      openModal('确认删除球队', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('circle-x')}</span><h3>${esc(team.name)}</h3><p>删除后，该球队的报名占位、领队邀请记录${playerCount ? `及 ${playerCount} 名球员资料` : ''}将从本赛事移除，无法撤销。</p></div>`, `${btn('取消','close-modal','outline')}${btn('确认删除','confirm-delete-registration-team','danger','circle-x')}`);
      return;
    }
    if (action === 'confirm-delete-registration-team') {
      const eventSpace = activeEventSpace();
      const rows = registrationTeamRows(eventSpace);
      const team = rows.find((item) => item.id === pendingRegistrationTeamId);
      if (!team) {
        closeModal();
        return showToast('球队记录不存在或已被删除');
      }
      eventSpace.registrationTeams = rows.filter((item) => item.id !== team.id);
      eventSpace.teams = eventSpace.registrationTeams.length;
      eventWorkflow(eventSpace).teamsImported = eventSpace.registrationTeams.length > 0;
      syncEventLifecycle(eventSpace);
      persistEventSpaces();
      pendingRegistrationTeamId = '';
      closeModal();
      render();
      showToast(`${team.name} 已删除`);
      return;
    }
    if (action === 'save-registration-team') {
      const form = modalBody.querySelector('[data-registration-team-form]');
      if (!form) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const name = String(values.name || '').trim();
      const owner = String(values.owner || '').trim();
      const phone = String(values.phone || '').replace(/\D/g, '');
      const group = String(values.group || '').trim() || '未分组';
      const originalId = form.dataset.originalId || '';
      const teamLogo = uploadedEventImages.teamLogo || registrationTeamDraft?.logo || '';
      if (!name) {
        showToast('请填写球队名称');
        form.querySelector('[name="name"]')?.focus();
        return;
      }
      if (!owner) {
        showToast('请填写领队姓名');
        form.querySelector('[name="owner"]')?.focus();
        return;
      }
      if (!/^1\d{10}$/.test(phone)) {
        showToast('请填写正确的 11 位领队手机号');
        form.querySelector('[name="phone"]')?.focus();
        return;
      }
      const duplicate = registrationTeamRows().some((team) => team.id !== originalId && (team.name === name || team.phone === phone));
      if (duplicate) {
        showToast('球队名称或领队手机号已存在');
        return;
      }
      const eventSpace = updateActiveEvent((currentEvent, workflow) => {
        const rows = registrationTeamRows(currentEvent);
        const now = new Date().toLocaleString('zh-CN', { hour12: false });
        const existingTeam = rows.find((team) => team.id === originalId);
        if (existingTeam) {
          Object.assign(existingTeam, { name, group, owner, phone, logo: teamLogo || existingTeam.logo || '', updatedAt: now });
        } else {
          rows.push({
            id: `REG-${Date.now()}`,
            name,
            group,
            owner,
            phone,
            logo: teamLogo,
            source: '主办方人工添加',
            claimStatus: '待邀请',
            teamQualificationStatus: '待审核',
            createdAt: now,
            updatedAt: now,
            players: []
          });
        }
        currentEvent.teams = rows.length;
        workflow.teamsImported = false;
        workflow.qualificationCompleted = false;
      });
      pendingRegistrationTeamId = originalId || eventSpace.registrationTeams.at(-1).id;
      uploadedEventImages.teamLogo = '';
      registrationTeamDraft = null;
      closeModal();
      render();
      if (originalId) {
        showToast(`${name} 已保存`);
        return;
      }
      openTeamClaimInvite(pendingRegistrationTeamId);
      showToast(`${name} 已添加，可以发送邀请`);
      return;
    }
    if (action === 'invite-captain') {
      openTeamClaimInvite(target.dataset.teamId || '');
      return;
    }
    if (action === 'copy-team-invite-link') {
      const team = registrationTeamRows().find((item) => item.id === pendingRegistrationTeamId);
      if (!team) return;
      const link = teamClaimInviteLink(team);
      if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
      else {
        const input = modalBody.querySelector('[data-team-invite-link]');
        input?.select();
        document.execCommand('copy');
      }
      showToast('球队邀请链接已复制');
      return;
    }
    if (action === 'confirm-team-invite') {
      const eventSpace = activeEventSpace();
      const team = registrationTeamRows(eventSpace).find((item) => item.id === pendingRegistrationTeamId);
      if (!team) return;
      team.claimStatus = '邀请已发送';
      team.invitedAt = new Date().toLocaleString('zh-CN', { hour12: false });
      team.updatedAt = team.invitedAt;
      team.inviteCount = Number(team.inviteCount || 0) + 1;
      persistEventSpaces();
      closeModal();
      render();
      showToast(`已向 ${team.owner} 发送球队认领邀请`);
      return;
    }
    if (action === 'test-import-teams') {
      if (!isDemoMode) return;
      const eventSpace = updateActiveEvent((currentEvent, workflow) => {
        const groupName = currentEvent.groupRows?.[0]?.name || '测试组';
        currentEvent.testTeams = [
          ['启航队', '王领队'], ['飞跃队', '李领队'], ['雷霆队', '陈领队'], ['星火队', '赵领队']
        ].map(([name, owner], index) => ({
          id: `TEST-${index + 1}`,
          name,
          owner,
          group: groupName,
          updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
        }));
        currentEvent.teams = currentEvent.testTeams.length;
        currentEvent.groupRows = (currentEvent.groupRows || []).map((group, index) => ({
          ...group,
          status: index === 0 ? '已确认' : group.status
        }));
        eventGroupRows = [...currentEvent.groupRows];
        workflow.teamsImported = true;
        workflow.qualificationCompleted = true;
      });
      render();
      showToast(`已模拟接收 ${eventSpace.teams} 支测试球队；该操作只在测试模式可用`);
      return;
    }
    if (action === 'event-more') {
      pendingEventId = target.dataset.eventId || '';
      const eventSpace = eventSpaces.find((item) => item.id === pendingEventId);
      openModal('赛事更多操作', `<div class="event-action-list">
        <button type="button" data-action="copy-event"><span><b>复制赛事配置</b><small>创建一份新的赛事副本</small></span><strong>创建副本</strong></button>
        <button type="button" data-action="archive-event"><span><b>归档赛事</b><small>赛事转为只读并保留全部数据</small></span><strong>保留全部数据</strong></button>
        <button type="button" data-action="finish-event"><span><b>结束赛事</b><small>停止报名及现场任务，需二次确认</small></span><strong>结束</strong></button>
        <button class="danger" type="button" data-action="request-delete-event"><span><b>删除赛事</b><small>删除“${esc(eventSpace?.name || '当前赛事')}”及本地演示数据</small></span><strong>删除</strong></button>
      </div>`);
      return;
    }
    if (action === 'request-delete-event') {
      const eventSpace = eventSpaces.find((item) => item.id === pendingEventId);
      if (!eventSpace) {
        closeModal();
        showToast('赛事不存在或已被删除');
        return;
      }
      openModal('确认删除赛事', `<div class="delete-event-confirm">
        <span class="delete-event-icon">${icon('circle-x')}</span>
        <h3>${esc(eventSpace.name)}</h3>
        <p>删除后，该赛事空间卡片及当前浏览器保存的赛事资料将被移除，无法撤销。</p>
        <div class="info-banner"><b>请确认：</b>归档适合保留历史数据；只有确定不再需要时才执行删除。</div>
      </div>`, `${btn('取消','close-modal','outline')}${btn('确认删除','confirm-delete-event','danger','circle-x')}`);
      return;
    }
    if (action === 'confirm-delete-event') {
      const eventSpace = eventSpaces.find((item) => item.id === pendingEventId);
      if (!eventSpace) {
        closeModal();
        showToast('赛事不存在或已被删除');
        return;
      }
      eventSpaces = eventSpaces.filter((item) => item.id !== pendingEventId);
      if (selectedEventId === pendingEventId) selectedEventId = eventSpaces[0]?.id || '';
      persistEventSpaces();
      pendingEventId = '';
      closeModal();
      routeTo('spaces');
      render();
      showToast(`${eventSpace.name} 已删除`);
      return;
    }
    if (action === 'confirm-create-event') {
      const draft = captureCreateEventDraft();
      if (!draft.name) {
        showToast('请填写赛事名称');
        modalBody.querySelector('[name="name"]')?.focus();
        return;
      }
      if (!draft.startDate || !draft.endDate || draft.endDate < draft.startDate) {
        showToast('请填写正确的赛事起止日期');
        return;
      }
      if (!uploadedEventImages.createLogo) {
        showToast('请先上传并确认赛事 Logo');
        modalBody.querySelector('[data-upload-kind="createLogo"]')?.focus();
        return;
      }
      const id = `event-${Date.now()}`;
      const initialGroups = [];
      const newEventSpace = {
        id,
        name: draft.name,
        state: '筹备中',
        stateClass: 'blue',
        groups: initialGroups.length,
        teams: 0,
        matches: 0,
        startDate: draft.startDate,
        endDate: draft.endDate,
        progress: 0,
        logo: uploadedEventImages.createLogo,
        cover: '',
        logoBackground: normalizeLogoBackground(draft.logoBackground),
        participationMode: 'team-player',
        playerQualificationRequired: true,
        playerDataServiceEnabled: true,
        regionCode: draft.regionCode,
        regionLabel: draft.regionLabel,
        firstGroup: '',
        groupRows: initialGroups,
        isBlank: true,
        workflow: {
          profileSaved: false,
          groupsConfigured: initialGroups.length > 0,
          registrationConfigured: false,
          teamsImported: false,
          qualificationCompleted: false,
          drawCompleted: false,
          drawSaved: false,
          venuesConfigured: false,
          scheduleGenerated: false,
          onsiteAssigned: false,
          executionReturned: false,
          resultsApproved: false,
          finished: false
        },
        testTeams: []
      };
      eventSpaces.push(newEventSpace);
      selectedEventId = id;
      eventGroupRows = [...initialGroups];
      persistEventSpaces();
      uploadedEventImages.createLogo = '';
      createEventDraft = null;
      closeModal();
      routeTo('spaces');
      render();
      showToast('赛事空间已创建，新赛事卡片已添加');
      return;
    }
    if (action === 'confirm-invite') {
      store.update((state) => { state.invitation.status = 'pending'; });
      closeModal();
      showToast('邀请已发送，等待对方在服务号接受');
      return;
    }
    if (action === 'open-service' || action === 'open-service-parent') {
      const flow = action === 'open-service-parent' ? 'parent' : 'invite';
      location.href = `./service-account-demo.html?flow=${flow}`;
      return;
    }
    if (action === 'copy-registration-guide') {
      const eventSpace = activeEventSpace();
      const guide = `${eventSpace?.name || '赛事'}球队报名：请使用微信扫描报名二维码，进入赛小蜂篮球小程序创建或认领球队，按页面引导关注服务号并开启通知。报名后可在小程序查看球队数据和待办任务。`;
      if (navigator.clipboard) navigator.clipboard.writeText(guide).catch(() => {});
      showToast('报名说明已复制');
      return;
    }
    if (action === 'refresh-registration-qr') {
      openQr();
      return;
    }
    if (action === 'download-registration-qr') {
      const eventSpace = activeEventSpace();
      if (!eventSpace?.registrationQrUrl) return showToast('请先生成报名码');
      const anchor = document.createElement('a');
      anchor.href = eventSpace.registrationQrUrl;
      anchor.download = `${eventSpace.name || '赛事'}-球队报名码.png`;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      showToast('报名码已开始下载');
      return;
    }
    if (action === 'copy-link') {
      const link = `${location.origin}${location.pathname.replace('tournament-center.html','service-account-demo.html')}?flow=parent`;
      if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
      showToast('演示链接已复制');
      return;
    }
    if (action === 'export-draw-table') {
      const context = currentDrawContext();
      if (!drawExportReady(context)) return;
      if (!window.SXFDrawExport) {
        showToast('分组导出组件未加载，请刷新页面后重试');
        return;
      }
      window.SXFDrawExport.downloadTable(drawExportData(context));
      showToast('分组结果表格已导出，包含明细和分组总览');
      return;
    }
    if (action === 'open-draw-poster') {
      if (!drawExportReady()) return;
      if (!window.SXFDrawExport) {
        showToast('分组海报组件未加载，请刷新页面后重试');
        return;
      }
      openDrawPosterExport();
      return;
    }
    if (action === 'set-draw-poster-ratio') {
      drawPosterDraft.ratio = target.dataset.ratio === '9:16' ? '9:16' : '16:9';
      await refreshDrawPosterEditor();
      return;
    }
    if (action === 'set-draw-poster-style') {
      const available = window.SXFDrawExport?.posterStyles?.map((style) => style.id) || [];
      if (available.includes(target.dataset.style)) drawPosterDraft.style = target.dataset.style;
      await refreshDrawPosterEditor();
      return;
    }
    if (action === 'set-draw-poster-team-size') {
      const scale = Number(target.dataset.teamScale);
      if ([75, 100, 125, 150].includes(scale)) drawPosterDraft.teamScale = scale;
      await refreshDrawPosterEditor();
      return;
    }
    if (action === 'download-draw-poster') {
      const context = currentDrawContext();
      if (!drawExportReady(context)) return;
      const canvas = modalBody.querySelector('[data-draw-poster-canvas]');
      if (!canvas || !window.SXFDrawExport) return;
      await refreshDrawPosterEditor();
      await window.SXFDrawExport.downloadPoster(canvas, drawExportData(context), drawPosterDraft);
      showToast(`分组海报已按 ${drawPosterDraft.ratio} 导出`);
      return;
    }
    if (action === 'randomize-round-robin-order') {
      const context = currentDrawContext();
      if (!context) return;
      const order = [...context.teamNames];
      for (let index = order.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
      }
      context.state.order = order;
      context.state.saved = false;
      context.state.updatedAt = new Date().toISOString();
      persistEventSpaces();
      render();
      showToast(`${groupDisplayName(context.group)} 已重新随机排序`);
      return;
    }
    if (action === 'move-round-robin-order') {
      const context = currentDrawContext();
      if (!context) return;
      const index = Number(target.dataset.index);
      const nextIndex = target.dataset.direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= context.state.order.length) return;
      [context.state.order[index], context.state.order[nextIndex]] = [context.state.order[nextIndex], context.state.order[index]];
      context.state.saved = false;
      context.state.updatedAt = new Date().toISOString();
      persistEventSpaces();
      render();
      return;
    }
    if (action === 'save-round-robin-draw') {
      const context = currentDrawContext();
      if (!context || context.state.order.length < 2) return showToast('当前组别至少需要 2 支正式球队才能保存循环排序');
      context.state.saved = true;
      context.state.updatedAt = new Date().toISOString();
      refreshDrawWorkflow(context.eventSpace);
      persistEventSpaces();
      render();
      showToast(`${groupDisplayName(context.group)} 循环排序已保存`);
      return;
    }
    if (action === 'auto-knockout') {
      const context = currentDrawContext();
      if (!context) return;
      context.state.seedOrder = balancedKnockoutSeedOrder(context.teamNames, context.state.seedOrder.length, true);
      context.state.seedLayoutVersion = 9;
      context.state.seedResetRevision = KNOCKOUT_EMPTY_RESET_REVISION;
      context.state.seedInitializedEmpty = true;
      context.state.seedAssignmentStarted = true;
      context.state.saved = false;
      context.state.updatedAt = new Date().toISOString();
      persistEventSpaces();
      render();
      showToast(`${groupDisplayName(context.group)} 淘汰赛签位已重新生成`);
      return;
    }
    if (action === 'reset-knockout-seeds') {
      const context = currentDrawContext();
      if (!context) return;
      context.state.seedOrder = context.state.seedOrder.map(() => '');
      context.state.seedAssignmentStarted = false;
      context.state.saved = false;
      context.state.updatedAt = new Date().toISOString();
      persistEventSpaces();
      render();
      return;
    }
    if (action === 'save-knockout-draw') {
      const context = currentDrawContext();
      if (!context) return;
      const seededTeams = context.state.seedOrder.filter(Boolean);
      if (seededTeams.length !== context.teamNames.length) return showToast(`还有 ${context.teamNames.length - seededTeams.length} 支球队未放入签位`);
      const hasEmptyPair = Array.from({ length: context.state.seedOrder.length / 2 }, (_, index) => !context.state.seedOrder[index * 2] && !context.state.seedOrder[index * 2 + 1]).some(Boolean);
      if (hasEmptyPair) return showToast('轮空位不能相互对阵，请将轮空位分散到不同首轮对阵');
      context.state.saved = true;
      context.state.seedAssignmentStarted = true;
      context.state.updatedAt = new Date().toISOString();
      refreshDrawWorkflow(context.eventSpace);
      persistEventSpaces();
      render();
      showToast(`${groupDisplayName(context.group)} 淘汰赛签位已保存`);
      return;
    }
    if (action === 'auto-draw' || action === 'reset-draw') {
      const context = currentDrawContext();
      if (!context) return;
      Object.keys(context.state.assignments).forEach((letter) => { context.state.assignments[letter] = []; });
      context.state.unassignedTeams = [...context.teamNames];
      if (action === 'auto-draw') {
        const pool = context.state.unassignedTeams.splice(0);
        pool.forEach((name, index) => {
          const letter = context.letters[index % context.letters.length];
          context.state.assignments[letter].push(name);
        });
      }
      context.state.saved = false;
      context.state.updatedAt = new Date().toISOString();
      updateActiveEvent((eventSpace, workflow) => {
        workflow.drawCompleted = action === 'auto-draw' && context.state.unassignedTeams.length === 0;
        if (action === 'reset-draw') workflow.drawSaved = false;
      });
      persistEventSpaces();
      render();
      showToast(action === 'auto-draw' ? `${context.group.name} 自动抽签已完成，可继续人工调整` : '已清空分组，球队已返回待分配区');
      return;
    }
    if (action === 'save-groups') {
      const context = currentDrawContext();
      if (!context || context.state.unassignedTeams.length) {
        showToast(`还有 ${context?.state.unassignedTeams.length || 0} 支球队未分组`);
        return;
      }
      updateActiveEvent((eventSpace, currentWorkflow) => {
        context.state.saved = true;
        context.state.updatedAt = new Date().toISOString();
        refreshDrawWorkflow(eventSpace);
      });
      persistEventSpaces();
      showToast(`${context.group.name} 分组结果和晋级来源已保存`);
      return;
    }
    if (action === 'edit-advancement') {
      openModal('修改第二阶段晋级规则', `<div class="form-grid">${field('晋级数量','每组前 2 名','select',false,['每组前 1 名','每组前 2 名','各组前 2 名 + 最佳第三名'])}${field('交叉原则','相邻组交叉','select',false,['相邻组交叉','上下半区交叉'])}</div><div class="info-banner">这里只设置晋级来源；实际签位由赛果自动生成。</div>`, `${btn('取消','close-modal','outline')}${btn('保存规则','save-modal','primary','save')}`);
      return;
    }
    if (action === 'use-rule-template') {
      selectedRuleTemplatePreview = ruleSettings(activeEventSpace()).template || 'universal';
      openRuleTemplateChooser();
      return;
    }
    if (action === 'preview-rule-template') {
      selectedRuleTemplatePreview = target.dataset.template || 'universal';
      if (!modalLayer.hidden) openRuleTemplateChooser();
      else render();
      return;
    }
    if (action === 'confirm-rule-template' || action === 'apply-rule-template') {
      applyRuleTemplateToEvent(target.dataset.template || selectedRuleTemplatePreview || 'universal');
      return;
    }
    if (action === 'regenerate-rules') {
      const eventSpace = activeEventSpace();
      const settings = captureRuleState(eventSpace);
      eventSpace.ruleDraftHtml = buildRuleDocument(eventSpace, settings);
      eventSpace.ruleSourceFingerprint = ruleSourceFingerprint(eventSpace);
      settings.hasUnpublishedChanges = true;
      persistEventSpaces();
      render();
      showToast('已重新读取最新赛事参数并生成正式规程');
      return;
    }
    if (action === 'rule-outline') {
      const section = content.querySelector(`[data-rule-section-target="${target.dataset.ruleSection}"]`);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      content.querySelectorAll('.rule-outline button').forEach((button) => button.classList.toggle('active', button === target));
      return;
    }
    if (action === 'rule-format') {
      document.execCommand(target.dataset.command || 'bold', false);
      content.querySelector('.formal-rule-document')?.focus();
      return;
    }
    if (action === 'rule-insert-clause') {
      const documentEditor = content.querySelector('.formal-rule-document');
      documentEditor?.focus();
      document.execCommand('insertHTML', false, '<p>新增条款：请在此填写规则内容。</p>');
      showToast('已插入一条规则条款');
      return;
    }
    if (action === 'export-rules-word') {
      const eventSpace = activeEventSpace();
      captureRuleState(eventSpace);
      downloadRuleWord(eventSpace);
      showToast('Word 竞赛规程已导出，可继续编辑');
      return;
    }
    if (action === 'export-rules-pdf') {
      const eventSpace = activeEventSpace();
      captureRuleState(eventSpace);
      if (openRulePdfPrint(eventSpace)) showToast('已打开 A4 规程，请在打印窗口选择“另存为 PDF”');
      else showToast('浏览器拦截了打印窗口，请允许弹窗后重试');
      return;
    }
    if (action === 'publish-rules') {
      const eventSpace = activeEventSpace();
      const settings = captureRuleState(eventSpace);
      settings.version = Number(settings.version || 0) + 1;
      settings.published = true;
      settings.hasUnpublishedChanges = false;
      settings.effectiveDate = settings.effectiveDate || eventSpace.startDate;
      eventSpace.ruleDraftHtml = String(eventSpace.ruleDraftHtml || '').replace(/版本：V\d+/, `版本：V${settings.version}`);
      persistEventSpaces();
      render();
      showToast(`竞赛规程 V${settings.version} 已发布，并同步至赛事公开端`);
      return;
    }
    if (action === 'select-team') {
      selectedTeamName = target.dataset.team || selectedTeamName;
      render();
      showToast(`已选中 ${selectedTeamName}，右侧可查看赛事关系或编辑报名资料`);
      return;
    }
    if (action === 'edit-current-team') {
      const team = registrationTeamRows().find((item) => item.name === selectedTeamName) || officialTeams()[0];
      if (!team) return showToast('请先选择一支正式参赛球队');
      uploadedEventImages.teamLogo = '';
      registrationTeamDraft = null;
      openRegistrationTeamEditor(team.id);
      return;
    }
    if (action === 'select-player') {
      selectedPlayerKey = target.dataset.playerKey || selectedPlayerKey;
      render();
      return;
    }
    if (action === 'view-team-audit') {
      const team = registrationTeamRows().find((item) => item.id === target.dataset.teamId);
      if (!team) return;
      openModal('球队赛事关系审核记录', `<div class="rule-summary"><h4>${esc(team.name)}</h4><p>认领状态：${esc(team.claimStatus || '待邀请')}</p><p>赛事资格：${esc(teamQualificationStatus(team))}</p><p>审核完成时间：${esc(team.qualificationUpdatedAt || '—')}</p><div class="info-banner">报名与资格是唯一审核入口。审核通过后，球队才会进入球队管理、抽签、赛程与正式导出。</div></div>`, btn('关闭', 'close-modal', 'outline'));
      return;
    }
    if (action === 'view-team' || action === 'view-roster' || action === 'audit-team') {
      const team = registrationTeamRows().find((item) => item.id === target.dataset.teamId || item.name === selectedTeamName);
      if (!team) return;
      const rosterCount = (team.players || []).filter((player) => (player.reviewResult || '待审核') === '通过').length;
      openModal('球队资料', `<div class="rule-summary"><h4>${esc(team.name)}</h4><p>负责人：${esc(team.owner || '—')}（${esc(maskMobile(team.phone))}）</p><p>参赛组别：${esc(team.group || '未分组')}</p><p>赛事资格：${esc(teamQualificationStatus(team))}</p><p>正式球员：${usesPlayerData() ? `${rosterCount} 人` : '本赛事不采集球员数据'}</p><div class="info-banner">球队长期资料由报名资料同步而来；本页不维护独立球队副本。</div></div>`, btn('关闭', 'close-modal', 'outline'));
      return;
    }
    if (action === 'view-player') {
      const player = officialPlayers().find((item) => item.key === target.dataset.playerKey);
      if (!player) return;
      openModal('球员完整档案', `<div class="rule-summary"><h4>${esc(player.name || '未命名球员')}</h4><p>当前球队：${esc(player.teamName)}</p><p>出生年月：${esc(player.birth || player.birthMonth || '—')}</p><p>监护关系：${esc(player.guardianRelation || player.guardian || '—')}</p><p>本届号码：${esc(player.number || '—')}</p><p>资格状态：已通过</p><div class="info-banner">本页只读展示报名页的同一份已审核资料，不创建机构学员档案。</div></div>`, btn('关闭', 'close-modal', 'outline'));
      return;
    }
    if (action === 'export-official-players') {
      const visibleKeys = new Set([...content.querySelectorAll('.player-archive-row:not([hidden])')].map((row) => row.dataset.playerKey));
      const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csvRows = [['球员', '球员系统编号', '球队', '组别', '出生年月', '监护关系', '球衣号码', '资格状态'], ...officialPlayers().filter((player) => visibleKeys.has(player.key)).map((player) => [player.name, player.systemId || '—', player.teamName, player.group, player.birth || player.birthMonth, player.guardianRelation || player.guardian, player.number, '已通过'])];
      const blob = new Blob([`\uFEFF${csvRows.map((row) => row.map(quote).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${String(activeEventSpace()?.name || '赛事').replace(/[\\/:*?"<>|]/g, '_')}-已审核球员.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast(`已导出 ${csvRows.length - 1} 名已审核球员`);
      return;
    }
    if (action === 'generate-schedule' || action === 'generate-round-robin') {
      const currentWorkflow = eventWorkflow();
      if (!currentWorkflow.venuesConfigured) {
        showToast('请先在赛程设置中保存场地与可用时间');
        return;
      }
      const plannedResult = plannedScheduleResult(activeEventSpace());
      if (plannedResult.unscheduled.length) {
        const availability = eventVenueSettings(activeEventSpace())?.availability || {};
        const stageIssues = scheduleStageOrderIssues(plannedResult.rows, availability);
        const guidance = scheduleFeasibilityAlert(activeEventSpace(), stageIssues) || `<div class="info-banner warning">${icon('triangle-alert')} 当前资源仍有 ${plannedResult.unscheduled.length} 场无法安排。请增加比赛日、时间段或场地后重新生成。</div>`;
        openModal('当前条件无法生成合理赛程', `${guidance}<div class="info-banner">排赛会按阶段顺序进行：淘汰赛在上一阶段全部结束后才开始。</div>`, btn('稍后调整', 'close-modal', 'outline'));
        return;
      }
      store.update((state) => { state.scheduleGenerated = true; });
      const eventSpace = updateActiveEvent((currentEvent, workflow) => {
        currentEvent.scheduleRows = plannedResult.rows;
        currentEvent.matches = currentEvent.scheduleRows.length;
        currentEvent.scheduleStale = false;
        workflow.scheduleGenerated = true;
      });
      render();
      showToast(`自动排赛完成：${eventSpace.matches} 场，硬冲突 0 个`);
      return;
    }
    if (action === 'resolve-schedule-evening') {
      const feasibility = scheduleStageFeasibility(activeEventSpace());
      openModal('开启晚间场次', `<div class="info-banner warning">${icon('clock-3')} 开启晚间时段后，将新增 19:00—21:30 的可用排赛时间。</div><div class="rule-summary"><p>当前比赛日：${feasibility.days} 天</p><p>新增晚间时段：19:00—21:30</p><p>排赛规则：淘汰赛在上一阶段全部结束后开始</p></div>`, `${btn('取消', 'close-modal', 'outline')}${btn('开启并重新排赛', 'confirm-resolve-schedule-evening', 'primary', 'clock-3')}`);
      return;
    }
    if (action === 'resolve-schedule-extra-day') {
      const feasibility = scheduleStageFeasibility(activeEventSpace());
      openModal('增加比赛日', `<div class="info-banner">${icon('calendar-days')} 保持上午、下午比赛，将赛事截止日期延长至 ${feasibility.suggestedEndDate}，为剩余场次提供更多可用时间。</div><div class="rule-summary"><p>调整前：${feasibility.range.startDate} 至 ${feasibility.range.endDate}</p><p>调整后：${feasibility.range.startDate} 至 ${feasibility.suggestedEndDate}</p><p>排赛规则：淘汰赛在上一阶段全部结束后开始</p></div>`, `${btn('取消', 'close-modal', 'outline')}${btn('增加并重新排赛', 'confirm-resolve-schedule-extra-day', 'primary', 'calendar-days')}`);
      return;
    }
    if (action === 'confirm-resolve-schedule-evening' || action === 'confirm-resolve-schedule-extra-day') {
      const extendDays = action === 'confirm-resolve-schedule-extra-day';
      const feasibility = scheduleStageFeasibility(activeEventSpace());
      updateActiveEvent((currentEvent) => {
        const availability = eventVenueSettings(currentEvent).availability;
        if (extendDays) {
          availability.endDate = feasibility.suggestedEndDate;
          currentEvent.endDate = feasibility.suggestedEndDate;
        } else {
          availability.eveningEnabled = true;
          availability.eveningStartTime ||= '19:00';
          availability.eveningEndTime ||= '21:30';
          availability.scheduleTimeSlots = [];
        }
      });
      closeModal();
      if (!eventWorkflow().venuesConfigured) {
        routeTo('schedule', 'settings');
        showToast('解决方案已写入赛程设置，请确认场地后生成赛程');
        return;
      }
      const plannedResult = plannedScheduleResult(activeEventSpace());
      if (plannedResult.unscheduled.length) {
        routeTo('schedule', 'settings');
        showToast(`设置已更新，但仍有 ${plannedResult.unscheduled.length} 场无法安排，请继续增加时间段或场地`);
        return;
      }
      const eventSpace = updateActiveEvent((currentEvent, workflow) => {
        currentEvent.scheduleRows = plannedResult.rows;
        currentEvent.matches = plannedResult.rows.length;
        currentEvent.scheduleSavedAt = '';
        currentEvent.scheduleStale = false;
        workflow.scheduleGenerated = true;
      });
      render();
      showToast(`${extendDays ? '已增加比赛日' : '已开启晚间场次'}并重新生成 ${eventSpace.matches} 场比赛`);
      return;
    }
    if (action === 'edit-times' || action === 'edit-constraints') {
      const isTime = action === 'edit-times';
      openModal(isTime ? '编辑时间与场馆' : '编辑排赛约束', isTime
        ? `<div class="form-grid">${field('赛事日期','2026-07-18 至 2026-08-26')}${field('每日时间','08:00 - 20:00')}${field('单场时长','90 分钟')}${field('缓冲时间','15 分钟')}</div>`
        : `<div class="form-grid">${field('同队最少休息','90 分钟')}${field('同组赛程策略','尽量集中','select',false,['尽量集中','平均分散'])}${field('低龄组最晚开赛','19:00')}${field('淘汰赛间隔','至少 1 场')}</div>`,
      `${btn('取消','close-modal','outline')}${btn('保存条件','save-modal','primary','save')}`);
      return;
    }
    if (action === 'save-schedule-rules') {
      showToast('排赛条件已保存，尚未重新生成赛程');
      return;
    }
    if (action === 'select-referee') {
      selectedRefereeId = target.dataset.refereeId || selectedRefereeId;
      render();
      return;
    }
    if (action === 'add-onsite-person') {
      openModal('新增现场人员', `<form class="form-grid onsite-person-form" data-onsite-person-form>
        ${namedField('姓名', 'name', '')}
        ${namedField('联系方式', 'phone', '')}
        ${namedField('人员来源', 'source', '内部教练', 'select', ['内部教练', '外请人员'])}
        ${namedField('默认岗位', 'role', '计分员', 'select', ['计分员', '记录员/数据员', 'MC'])}
      </form><div class="info-banner">人员名单由主办方维护；保存后可在具体场次中重复绑定或更换，不会自动占用所有场次。</div>`, `${btn('取消', 'close-modal', 'outline')}${btn('保存人员', 'confirm-add-onsite-person', 'primary', 'save')}`);
      return;
    }
    if (action === 'confirm-add-onsite-person') {
      const form = modalBody.querySelector('[data-onsite-person-form]');
      const values = form ? Object.fromEntries(new FormData(form).entries()) : {};
      const name = String(values.name || '').trim();
      if (!name) {
        showToast('请填写现场人员姓名');
        return;
      }
      const roleKey = { 计分员: 'scorer', 记录员: 'recorder', '记录员/数据员': 'recorder', MC: 'mc' }[String(values.role || '')] || 'scorer';
      const person = {
        id: `onsite-${Date.now()}`,
        name,
        phone: String(values.phone || '').trim(),
        source: String(values.source || '内部教练'),
        roles: [roleKey]
      };
      updateActiveEvent((eventSpace) => {
        const roster = eventOnsitePeople(eventSpace);
        const existing = roster.find((item) => item.name === person.name);
        if (existing) {
          existing.phone = person.phone || existing.phone;
          existing.source = person.source;
          existing.roles = [...new Set([...(existing.roles || []), roleKey])];
        } else {
          roster.push(person);
        }
      });
      closeModal();
      render();
      showToast(`${name} 已加入现场人员名单`);
      return;
    }
    if (action === 'add-referee') {
      openModal('新增本届赛事人员', `<form class="form-grid referee-form" data-referee-form>
        ${namedField('姓名', 'name', '')}
        ${namedField('联系方式', 'phone', '')}
        ${namedField('来源', 'source', '内部人员', 'select', ['内部人员', '外请人员'])}
        <div class="field full"><label>可承担岗位（可多选）</label><div class="role-check-grid">${onsiteRoleChoices.map(({ key, label }) => `<label class="role-check"><input type="checkbox" name="roles" value="${key}"><span>${esc(label)}</span></label>`).join('')}</div><small class="field-help">按人员特长选择；同一人可同时承担多个岗位，安排场次时会出现在对应岗位的人员列表中。</small></div>
      </form>`, `${btn('取消', 'close-modal', 'outline')}${btn('保存名单', 'confirm-add-referee', 'primary', 'save')}`);
      return;
    }
    if (action === 'confirm-add-referee') {
      const form = modalBody.querySelector('[data-referee-form]');
      const formData = form ? new FormData(form) : null;
      const values = formData ? Object.fromEntries(formData.entries()) : {};
      const roles = formData ? [...new Set(formData.getAll('roles').map(String))] : [];
      if (!String(values.name || '').trim() || !String(values.phone || '').trim()) {
        showToast('请填写人员姓名和联系方式');
        return;
      }
      if (!roles.length) {
        showToast('请至少选择一项可承担岗位');
        return;
      }
      const roleLabels = onsiteRoleLabels(roles);
      const isInternal = String(values.source || '') === '内部人员';
      const referee = {
        id: `ref-${Date.now()}`,
        name: String(values.name).trim(),
        phone: String(values.phone).trim(),
        source: String(values.source || '外请人员'),
        roles,
        qualification: roleLabels.join('、'),
        status: isInternal ? '可用' : '待接受',
        accepted: isInternal
      };
      updateActiveEvent((eventSpace) => {
        eventRefereeList(eventSpace).push(referee);
        const roster = eventOnsitePeople(eventSpace);
        const existing = roster.find((person) => person.name === referee.name);
        if (existing) {
          existing.phone = referee.phone || existing.phone;
          existing.source = isInternal ? '内部教练' : '外请人员';
          existing.roles = [...new Set([...(existing.roles || []), ...roles])];
        } else {
          roster.push({
            id: referee.id,
            name: referee.name,
            phone: referee.phone,
            source: isInternal ? '内部教练' : '外请人员',
            roles
          });
        }
      });
      selectedRefereeId = referee.id;
      closeModal();
      render();
      showToast(`${referee.name} 已加入名单，可承担：${roleLabels.join('、')}`);
      return;
    }
    if (action === 'edit-referee') {
      openRefereeEditor(target.dataset.refereeId || selectedRefereeId);
      return;
    }
    if (action === 'delete-referee') {
      openRefereeDelete(target.dataset.refereeId || selectedRefereeId);
      return;
    }
    if (action === 'assign-person-task') {
      const person = eventRefereeList(activeEventSpace()).find((item) => item.id === target.dataset.refereeId);
      openOnsiteAssignment(target.dataset.match || selectedOnsiteMatchId, target.dataset.onsiteRole || 'scorer', person?.name || '');
      return;
    }
    if (action === 'confirm-edit-referee') {
      const form = modalBody.querySelector('[data-referee-editor]');
      const formData = form ? new FormData(form) : null;
      const values = formData ? Object.fromEntries(formData.entries()) : {};
      const roles = formData ? [...new Set(formData.getAll('roles').map(String))] : [];
      const refereeId = form?.dataset.refereeId || '';
      const name = String(values.name || '').trim();
      const phone = String(values.phone || '').trim();
      if (!name || !phone) {
        showToast('请填写人员姓名和联系方式');
        return;
      }
      if (!roles.length) {
        showToast('请至少选择一项可承担岗位');
        return;
      }
      const isInternal = String(values.source || '') === '内部人员';
      updateActiveEvent((eventSpace) => {
        const referee = eventRefereeList(eventSpace).find((item) => item.id === refereeId);
        if (!referee) return;
        const oldName = referee.name;
        const oldRoles = Array.isArray(referee.roles) ? referee.roles : [];
        referee.name = name;
        referee.phone = phone;
        referee.source = isInternal ? '内部人员' : '外请人员';
        referee.roles = roles;
        referee.qualification = onsiteRoleLabels(roles).join('、');
        referee.status = isInternal ? '可用' : '待接受';
        referee.accepted = isInternal;
        const roster = eventOnsitePeople(eventSpace);
        const person = roster.find((item) => item.id === refereeId || item.name === oldName);
        if (person) {
          person.id = refereeId;
          person.name = name;
          person.phone = phone;
          person.source = isInternal ? '内部教练' : '外请人员';
          person.roles = roles;
        } else {
          roster.push({ id: refereeId, name, phone, source: isInternal ? '内部教练' : '外请人员', roles });
        }
        const onsiteAssignments = eventSpace.onsiteAssignments || {};
        Object.values(onsiteAssignments).forEach((assignment) => {
          Object.keys(onsiteRoleMeta).forEach((role) => {
            if (assignment[role] === oldName) assignment[role] = name;
            if (assignment[role] === name && oldRoles.includes(role) && !roles.includes(role)) {
              assignment[role] = '待分配';
              assignment[`${role}Source`] = '未绑定';
              delete assignment.assignmentStatus;
            }
          });
        });
      });
      selectedRefereeId = refereeId;
      closeModal();
      render();
      showToast(`${name} 的资料和岗位能力已更新`);
      return;
    }
    if (action === 'confirm-delete-referee') {
      const refereeId = target.dataset.refereeId || selectedRefereeId;
      updateActiveEvent((eventSpace) => {
        const referees = eventRefereeList(eventSpace);
        const refereeIndex = referees.findIndex((item) => item.id === refereeId);
        if (refereeIndex < 0) return;
        const [removed] = referees.splice(refereeIndex, 1);
        const roster = eventOnsitePeople(eventSpace);
        const rosterIndex = roster.findIndex((item) => item.id === refereeId || item.name === removed.name);
        if (rosterIndex >= 0) roster.splice(rosterIndex, 1);
        const onsiteAssignments = eventSpace.onsiteAssignments || {};
        Object.values(onsiteAssignments).forEach((assignment) => {
          Object.keys(onsiteRoleMeta).forEach((role) => {
            if (assignment[role] === removed.name) {
              assignment[role] = '待分配';
              assignment[`${role}Source`] = '未绑定';
              delete assignment.assignmentStatus;
            }
          });
        });
        const refereeAssignments = eventSpace.refereeAssignments || {};
        Object.keys(refereeAssignments).forEach((matchId) => {
          const assignment = refereeAssignments[matchId];
          if (Array.isArray(assignment?.refereeIds)) {
            assignment.refereeIds = assignment.refereeIds.filter((id) => id !== refereeId);
            if (!assignment.refereeIds.length) delete refereeAssignments[matchId];
            else {
              assignment.crewSize = assignment.refereeIds.length;
              assignment.taskStatus = '待重新发送';
            }
          } else if (assignment?.refereeId === refereeId) {
            delete refereeAssignments[matchId];
          }
        });
      });
      selectedRefereeId = '';
      closeModal();
      render();
      showToast('人员已删除，相关场次已恢复待分配');
      return;
    }
    if (action === 'bind-referee') {
      openRefereeBinding(target.dataset.refereeId || selectedRefereeId);
      return;
    }
    if (action === 'send-access-notifications') {
      const eventSpace = activeEventSpace();
      const rows = onsiteRowsForEvent(eventSpace).filter((row) => !onsiteDateFilter || row.date === onsiteDateFilter);
      const refereeAssignments = eventSpace.refereeAssignments || {};
      const missingReferee = rows.filter((row) => !(refereeAssignments[row.id]?.refereeIds || []).length).length;
      openModal('一键发送比赛接入通知', `<div class="notification-preview">
        <div class="metrics"><div><span>比赛日期</span><strong>${esc(onsiteDateFilter || rows[0]?.date || '全部')}</strong></div><div><span>场次数量</span><strong>${rows.length}</strong></div><div><span>缺少裁判</span><strong>${missingReferee}</strong></div></div>
        <div class="info-banner">服务号、小程序订阅和微信分享卡共同指向同一比赛任务；不发送短信。再次发送时只补发失败或未确认对象。</div>
        <div class="form-grid"><label class="field"><span>发送范围</span><select data-notification-scope><option value="filtered">当前筛选场次</option><option value="unconfirmed">仅未确认人员</option><option value="all">全部场次</option></select></label><label class="field"><span>二次确认时间</span><input type="time" value="18:00" data-notification-confirm-time></label></div>
        <div class="notification-channel-list"><span>服务号通知</span><span>小程序订阅通知</span><span>微信分享卡</span></div>
      </div>`, `${btn('取消','close-modal','outline')}${btn('确认发送','confirm-send-access-notifications','primary','send')}`);
      return;
    }
    if (action === 'confirm-send-access-notifications') {
      const eventSpace = activeEventSpace();
      const scope = modalBody.querySelector('[data-notification-scope]')?.value || 'filtered';
      const confirmTime = modalBody.querySelector('[data-notification-confirm-time]')?.value || '18:00';
      let rows = onsiteRowsForEvent(eventSpace);
      if (scope === 'filtered' && onsiteDateFilter) rows = rows.filter((row) => row.date === onsiteDateFilter);
      const batchId = `NB-${Date.now()}`;
      updateActiveEvent((currentEvent) => {
        currentEvent.collaborationNotifications ||= [];
        currentEvent.collaborationTasks ||= {};
        rows.forEach((row) => {
          const assignment = currentEvent.refereeAssignments?.[row.id] || {};
          const scheduleVersion = Number(currentEvent.collaborationTasks[row.id]?.scheduleVersion || 1);
          currentEvent.collaborationTasks[row.id] = {
            matchId: row.id,
            scheduleVersion,
            refereeIds: assignment.refereeIds || [],
            refereeStatus: (assignment.refereeIds || []).length ? '待接受' : '缺少裁判',
            homeStatus: '待球队确认',
            awayStatus: '待球队确认',
            channels: ['official_account', 'mini_subscription', 'wechat_share'],
            sentAt: new Date().toISOString(),
            secondConfirmationTime: confirmTime
          };
        });
        currentEvent.collaborationNotifications.push({ batchId, scope, matchIds: rows.map((row) => row.id), confirmTime, status: '已创建发送批次', createdAt: new Date().toISOString() });
      });
      closeModal();
      render();
      showToast(`已创建通知批次 ${batchId}，共 ${rows.length} 场`);
      return;
    }
    if (action === 'confirm-bind-referee') {
      const form = modalBody.querySelector('[data-referee-binding-form]');
      const formData = form ? new FormData(form) : null;
      const values = formData ? Object.fromEntries(formData.entries()) : {};
      const refereeIds = formData ? [...new Set(formData.getAll('refereeIds'))] : [];
      const matchId = String(values.matchId || '');
      if (!matchId || refereeIds.length < 1 || refereeIds.length > 3) {
        showToast('每场比赛请选择 1 至 3 名裁判');
        return;
      }
      const listedReferees = eventRefereeList(activeEventSpace());
      const pendingAuthorization = refereeIds.some((id) => !listedReferees.find((referee) => referee.id === id)?.accepted);
      updateActiveEvent((eventSpace) => {
        eventSpace.refereeAssignments = eventSpace.refereeAssignments || {};
        eventSpace.refereeAssignments[matchId] = {
          refereeIds,
          crewSize: refereeIds.length,
          taskStatus: pendingAuthorization ? '待首次授权' : '任务已发送',
          sentAt: new Date().toISOString()
        };
      });
      selectedRefereeId = String(form?.dataset.refereeId || refereeIds[0]);
      closeModal();
      render();
      showToast(pendingAuthorization ? '裁判组已绑定，已发送首次授权邀请' : '裁判组已绑定，比赛任务已发送');
      return;
    }
    if (action === 'select-onsite-match') {
      selectedOnsiteMatchId = target.dataset.match || target.closest('[data-match]')?.dataset.match || selectedOnsiteMatchId;
      render();
      return;
    }
    if (action === 'save-assignment') {
      const eventSpace = activeEventSpace();
      const rows = onsiteRowsForEvent(eventSpace);
      const readyRows = rows.filter((row) => row.assignmentStatus === '准备完成');
      updateActiveEvent((currentEvent, workflow) => {
        currentEvent.onsiteAssignmentSavedAt = new Date().toISOString();
        workflow.onsiteAssigned = rows.length > 0 && readyRows.length === rows.length;
      });
      render();
      showToast(rows.length && readyRows.length === rows.length
        ? `已保存全部 ${rows.length} 场现场人员安排`
        : `已保存当前安排，仍有 ${Math.max(0, rows.length - readyRows.length)} 场待补齐`);
      return;
    }
    if (action === 'remove-seat') {
      const matchId = target.dataset.match || selectedOnsiteMatchId;
      const role = onsiteRoleMeta[target.dataset.onsiteRole] ? target.dataset.onsiteRole : 'scorer';
      updateActiveEvent((eventSpace) => {
        eventSpace.onsiteAssignments = eventSpace.onsiteAssignments || {};
        eventSpace.onsiteAssignments[matchId] = eventSpace.onsiteAssignments[matchId] || {};
        eventSpace.onsiteAssignments[matchId][role] = role === 'recorder' && !usesPlayerData(eventSpace) ? '不适用' : '待分配';
        eventSpace.onsiteAssignments[matchId][`${role}Source`] = role === 'recorder' && !usesPlayerData(eventSpace) ? '仅球队模式' : '未绑定';
        delete eventSpace.onsiteAssignments[matchId].assignmentStatus;
      });
      selectedOnsiteMatchId = matchId;
      render();
      showToast(`${onsiteRoleMeta[role].label} 已移除，请重新分配人员`);
      return;
    }
    if (action === 'set-result-view') {
      resultReviewView = target.dataset.view === 'poster' ? 'poster' : 'table';
      render();
      return;
    }
    if (action === 'set-report-style') {
      const style = ['orange', 'paper', 'dark'].includes(target.dataset.style) ? target.dataset.style : 'orange';
      updateActiveEvent((eventSpace) => {
        const settings = resultPosterSettings(eventSpace);
        settings.style = style;
      });
      render();
      return;
    }
    if (action === 'open-report-layout') {
      const eventSpace = activeEventSpace();
      const settings = resultPosterSettings(eventSpace);
      openModal('赛事战报版面调整', `<form class="form-grid report-layout-form" data-report-layout><div class="field full"><label>战报标题</label><input name="title" value="${esc(settings.title || eventSpace?.name || '赛事战报')}" placeholder="例如：U8 启蒙组 · 赛事战报"></div><div class="field"><label>默认样式</label><select name="style"><option value="orange"${settings.style === 'orange' ? ' selected' : ''}>橙焰赛事</option><option value="paper"${settings.style === 'paper' ? ' selected' : ''}>白底简报</option><option value="dark"${settings.style === 'dark' ? ' selected' : ''}>深色战报</option></select></div><div class="field"><label>服务号二维码</label><input name="qrUrl" type="url" value="${esc(settings.qrUrl || '')}" placeholder="粘贴二维码图片地址或 data URL"></div><div class="info-banner field full">二维码只会显示在图片式战报的底部，用于引导关注服务号；不影响比分录入、复核或积分计算。</div></form>`, `${btn('取消','close-modal','outline')}${btn('保存版面','save-report-layout','primary','save')}`);
      return;
    }
    if (action === 'save-report-layout') {
      const form = modalBody.querySelector('[data-report-layout]');
      if (!form) return;
      const values = Object.fromEntries(new FormData(form).entries());
      updateActiveEvent((eventSpace) => {
        eventSpace.resultReportSettings = { ...resultPosterSettings(eventSpace), title: String(values.title || '').trim() || '赛事战报', qrUrl: String(values.qrUrl || '').trim(), style: ['orange', 'paper', 'dark'].includes(values.style) ? values.style : 'orange' };
      });
      closeModal();
      render();
      showToast('赛事战报版面已保存');
      return;
    }
    if (action === 'print-result-report') {
      openResultReportPrint();
      return;
    }
    if (action === 'edit-result') {
      const eventSpace = activeEventSpace();
      const row = resultRowsForEvent(eventSpace).find((item) => item.id === (target.dataset.match || selectedReviewMatchId));
      if (!row) return;
      selectedReviewMatchId = row.id;
      openModal(`${row.scoreReady ? '后台修正比分' : '后台录入比分'} · ${row.id}`, `<form class="form-grid result-editor-form" data-result-editor data-match-id="${esc(row.id)}"><div class="field full"><label>比赛</label><input value="${esc(`${row.id} · ${row.home} VS ${row.away}`)}" readonly></div><div class="field"><label>主队得分</label><input name="homeScore" type="number" min="0" step="1" value="${row.homeScore === null ? '' : row.homeScore}" placeholder="请输入主队得分" required></div><div class="field"><label>客队得分</label><input name="awayScore" type="number" min="0" step="1" value="${row.awayScore === null ? '' : row.awayScore}" placeholder="请输入客队得分" required></div><label class="field full result-finish-toggle"><input name="finishMatch" type="checkbox" checked><span>保存后标记为“比赛结束”，进入赛果复核</span></label><div class="field full"><label>修改原因 / 复核备注</label><textarea name="note" rows="3" placeholder="例如：现场计分台漏记 2 分，依据裁判签字单修正">${esc(row.record?.reviewNote || '')}</textarea></div><div class="info-banner field full">后台操作不会删除现场记录；每次保存都会追加操作时间、操作人、前后比分和修改原因。</div></form>`, `${btn('取消','close-modal','outline')}${btn('保存并结束比赛','save-result-record','primary','save')}`);
      return;
    }
    if (action === 'save-result-record') {
      const form = modalBody.querySelector('[data-result-editor]');
      if (!form) return;
      const viewport = resultViewportSnapshot();
      const values = Object.fromEntries(new FormData(form).entries());
      const homeScore = scoreValue(values.homeScore);
      const awayScore = scoreValue(values.awayScore);
      const matchId = form.dataset.matchId || selectedReviewMatchId;
      if (homeScore === null || awayScore === null) {
        showToast('请先填写有效的主队和客队得分');
        return;
      }
      const reason = String(values.note || '').trim() || '后台赛后录入';
      const now = new Date().toISOString();
      const currentEvent = activeEventSpace();
      const hasScheduleMatch = generatedScheduleRows(currentEvent).some((match) => match.id === matchId);
      if (hasScheduleMatch) {
        updateActiveEvent((eventSpace, workflow) => {
          eventSpace.resultRecords = eventSpace.resultRecords || {};
          const previous = eventSpace.resultRecords[matchId] || {};
          const history = Array.isArray(previous.history) ? previous.history : [];
          history.push({ homeScore, awayScore, reason, operator: '赛事负责人', source: 'PC后台', updatedAt: now });
          eventSpace.resultRecords[matchId] = { ...previous, homeScore, awayScore, scoreReady: true, reviewStatus: 'approved', submittedBy: 'PC后台', source: 'PC后台', reviewNote: reason, lastEditedAt: now, reviewedAt: now, reviewedBy: '赛事负责人', history };
          const match = (eventSpace.scheduleRows || []).find((item) => item.id === matchId);
          if (match) {
            match.homeScore = homeScore;
            match.awayScore = awayScore;
            match.state = values.finishMatch === 'on' ? '已结束' : '进行中';
            match.resultStatus = '已通过';
            match.updatedAt = now;
          }
          const resultRows = resultRowsForEvent(eventSpace);
          workflow.resultsApproved = resultRows.every((row) => row.scoreReady && row.reviewStatus === 'approved');
        });
      } else {
        store.update((state) => {
          state.resultManualRecords = state.resultManualRecords || {};
          state.resultManualRecords[matchId] = { homeScore, awayScore, reviewStatus: 'approved', submittedBy: 'PC后台', reviewNote: reason, lastEditedAt: now, reviewedAt: now, reviewedBy: '赛事负责人', history: [{ homeScore, awayScore, reason, operator: '赛事负责人', source: 'PC后台', updatedAt: now }] };
          state.resultReviews[matchId] = 'approved';
        });
      }
      closeModal();
      selectedReviewMatchId = matchId;
      render();
      restoreResultViewport(viewport, matchId);
      showToast(`${matchId} 已保存 ${homeScore} : ${awayScore}，后台录入比分已直接生效`);
      return;
    }
    if (action === 'approve-result' || action === 'return-result') {
      selectedReviewMatchId = target.dataset.match || selectedReviewMatchId;
      action = action === 'approve-result' ? 'approve-selected-result' : 'return-selected-result';
    }
    if (action === 'select-review') {
      const viewport = resultViewportSnapshot();
      selectedReviewMatchId = target.dataset.match || target.closest('[data-match]')?.dataset.match || selectedReviewMatchId;
      render();
      restoreResultViewport(viewport, selectedReviewMatchId);
      return;
    }
    if (action === 'approve-selected-result' || action === 'return-selected-result') {
      const viewport = resultViewportSnapshot();
      const nextStatus = action === 'approve-selected-result' ? 'approved' : 'returned';
      const note = String(content.querySelector('[data-result-review-note]')?.value || '').trim();
      const currentEvent = activeEventSpace();
      const hasScheduleMatch = generatedScheduleRows(currentEvent).some((match) => match.id === selectedReviewMatchId);
      if (hasScheduleMatch) {
        updateActiveEvent((eventSpace, workflow) => {
          eventSpace.resultRecords = eventSpace.resultRecords || {};
          const previous = eventSpace.resultRecords[selectedReviewMatchId] || {};
          eventSpace.resultRecords[selectedReviewMatchId] = { ...previous, reviewStatus: nextStatus, reviewNote: note || previous.reviewNote || '', reviewedAt: new Date().toISOString(), reviewedBy: '赛事负责人' };
          const rows = resultRowsForEvent(eventSpace);
          workflow.resultsApproved = nextStatus === 'approved' && rows.every((row) => row.scoreReady && row.reviewStatus === 'approved');
        });
      } else {
        store.update((currentState) => {
          currentState.resultReviews[selectedReviewMatchId] = nextStatus;
          currentState.resultManualRecords = currentState.resultManualRecords || {};
          currentState.resultManualRecords[selectedReviewMatchId] = { ...(currentState.resultManualRecords[selectedReviewMatchId] || {}), reviewStatus: nextStatus, reviewNote: note, reviewedAt: new Date().toISOString(), reviewedBy: '赛事负责人' };
        });
      }
      render();
      restoreResultViewport(viewport, selectedReviewMatchId);
      showToast(nextStatus === 'approved' ? `${selectedReviewMatchId} 赛果已确认并进入积分与战报` : `${selectedReviewMatchId} 已退回修改`);
      return;
    }
    if (action === 'test-return-results') {
      if (!isDemoMode) return;
      updateActiveEvent((eventSpace, workflow) => {
        workflow.onsiteAssigned = true;
        workflow.executionReturned = true;
        const rows = generatedScheduleRows(eventSpace);
        const now = new Date().toISOString();
        eventSpace.resultRecords = eventSpace.resultRecords || {};
        rows.forEach((match, index) => {
          const homeScore = 58 + (index % 5) * 4 + (index % 2 ? 1 : 0);
          const awayScore = 52 + (index % 4) * 3;
          eventSpace.resultRecords[match.id] = {
            ...(eventSpace.resultRecords[match.id] || {}),
            homeScore,
            awayScore,
            scoreReady: true,
            reviewStatus: 'pending',
            submittedBy: '现场计分台',
            source: '现场计分台',
            lastEditedAt: now,
            history: [{ homeScore, awayScore, reason: '模拟现场回传', operator: '现场计分台', source: '现场计分台', updatedAt: now }]
          };
          const scheduleMatch = (eventSpace.scheduleRows || []).find((item) => item.id === match.id);
          if (scheduleMatch) {
            scheduleMatch.homeScore = homeScore;
            scheduleMatch.awayScore = awayScore;
            scheduleMatch.state = '已结束';
            scheduleMatch.resultStatus = '待确认';
            scheduleMatch.updatedAt = now;
          }
        });
        eventSpace.completedMatches = rows.length;
      });
      render();
      showToast('已模拟小程序计分台回传全部比赛结果');
      return;
    }
    if (action === 'test-approve-all-results') {
      if (!isDemoMode) return;
      updateActiveEvent((eventSpace, workflow) => {
        const rows = generatedScheduleRows(eventSpace);
        eventSpace.resultRecords = eventSpace.resultRecords || {};
        rows.forEach((match) => {
          const previous = eventSpace.resultRecords[match.id] || {};
          if (scoreValue(previous.homeScore) === null || scoreValue(previous.awayScore) === null) return;
          eventSpace.resultRecords[match.id] = { ...previous, reviewStatus: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: '赛事负责人' };
        });
        workflow.resultsApproved = true;
      });
      store.update((state) => {
        Object.keys(state.resultReviews || {}).forEach((matchId) => { state.resultReviews[matchId] = 'approved'; });
      });
      render();
      showToast('全部测试赛果已复核通过');
      return;
    }
    if (action === 'settle') {
      store.update((state) => { state.settlementStatus = 'settled'; });
      render();
      showToast('可结算订单已完成分账');
      return;
    }
    if (action === 'toggle') {
      target.classList.toggle('on');
      showToast(target.classList.contains('on') ? '功能已开启' : '功能已关闭');
      return;
    }
    if (action === 'notifications') {
      openModal('消息通知', `<div class="todo-list"><div class="todo-row"><i></i><div><b>G1003 外请人员待接受</b><small>5 分钟前</small></div></div><div class="todo-row"><i></i><div><b>6 份球员资格资料待审核</b><small>20 分钟前</small></div></div><div class="todo-row"><i></i><div><b>自动排赛规则已更新</b><small>今天 09:10</small></div></div></div>`);
      return;
    }
    if (action === 'review-player') {
      openModal('球员资格审核', `<div class="player-review-card"><div>${icon('user-round')}<h3>李明宇 · 雷霆队</h3><p>U12 竞技组 · 2013年11月出生</p></div><div class="exception-list"><div><span>身份照片</span><b class="green-text">清晰</b></div><div><span>年龄规则</span><b class="orange-text">临界年龄</b></div><div><span>重复报名</span><b class="green-text">未发现</b></div></div></div>`, `${btn('退回补充','close-modal','danger','circle-x')}${btn('审核通过','approve-player-modal','primary','circle-check-big')}`);
      return;
    }
    if (action === 'approve-player-modal') {
      closeModal();
      showToast('球员资格已审核通过');
      return;
    }
    if (action === 'assign-match') {
      openOnsiteAssignment(target.dataset.match || selectedOnsiteMatchId, target.dataset.onsiteRole || 'scorer');
      return;
    }
    if (action === 'assign-data-task' || action === 'batch-assign' || action === 'batch-data-task' || action === 'assign-internal') {
      openModal('安排现场人员', `<div class="form-grid">${field('任务场次','G1003 · 蓝鲸队 VS 勇士队')}${field('岗位','球员数据记录员','select',false,['主控计分员','球员数据记录员','MC 控制员'])}${field('人员来源','内部教练','select',false,['内部教练','外请人员'])}${field('选择人员','王教练','select',false,['王教练','陈教练','周教练','新增外请人员'])}</div>`, `${btn('取消','close-modal','outline')}${btn('确认安排','confirm-assign','primary','user-round-check')}`);
      return;
    }
    if (action === 'confirm-assign') {
      const assignmentForm = modalBody.querySelector('[data-onsite-assignment-form]');
      if (assignmentForm) {
        const values = Object.fromEntries(new FormData(assignmentForm).entries());
        const matchId = assignmentForm.dataset.matchId;
        const role = onsiteRoleMeta[values.roleKey] ? values.roleKey : (onsiteRoleMeta[assignmentForm.dataset.onsiteRole] ? assignmentForm.dataset.onsiteRole : 'scorer');
        const originalRole = onsiteRoleMeta[assignmentForm.dataset.onsiteOriginalRole] ? assignmentForm.dataset.onsiteOriginalRole : role;
        updateActiveEvent((eventSpace) => {
          eventSpace.onsiteAssignments = eventSpace.onsiteAssignments || {};
          eventSpace.onsiteAssignments[matchId] = eventSpace.onsiteAssignments[matchId] || {};
          if (originalRole !== role) {
            eventSpace.onsiteAssignments[matchId][originalRole] = originalRole === 'recorder' && !usesPlayerData(eventSpace) ? '不适用' : '待分配';
            eventSpace.onsiteAssignments[matchId][`${originalRole}Source`] = originalRole === 'recorder' && !usesPlayerData(eventSpace) ? '仅球队模式' : '未绑定';
          }
          eventSpace.onsiteAssignments[matchId][role] = values.person || '待分配';
          eventSpace.onsiteAssignments[matchId][`${role}Source`] = values.source || '未绑定';
          delete eventSpace.onsiteAssignments[matchId].assignmentStatus;
        });
        selectedOnsiteMatchId = matchId;
        closeModal();
        render();
        showToast(`${matchId} 的${onsiteRoleMeta[role].label}已安排`);
        return;
      }
      closeModal();
      showToast('现场人员已安排');
      return;
    }
    if (action === 'view-console') {
      const match = target.dataset.consoleMatch || '待定场次';
      const type = target.dataset.consoleType || '现场控制台';
      const device = target.dataset.consoleDevice || '未登记设备';
      const person = target.dataset.consolePerson || '未绑定人员';
      const state = target.dataset.consoleState || '待连接';
      const latency = target.dataset.consoleLatency || '—';
      const stateTone = state.startsWith('在线') ? 'ok' : state === '待绑定' || state === '待接受' ? 'warn' : 'error';
      const permission = target.dataset.consolePermission || (type.includes('主控') ? '比分、时间、节次与暂停' : type.includes('数据') ? '球员数据记录' : '音效与播报控制');
      openModal(`${match} · ${type}`, `<div class="console-detail-modal"><div class="console-detail-hero"><div>${icon(type.includes('主控') ? 'monitor-cog' : type.includes('数据') ? 'database' : 'radio-tower')}</div><section><b>${esc(type)}</b><span>${status(state, stateTone)}</span><small>${esc(device)} · ${esc(person)}</small></section></div><div class="console-detail-grid"><div><span>所属场次</span><b>${esc(match)}</b></div><div><span>连接延迟</span><b>${esc(latency)}</b></div><div><span>当前权限</span><b>${esc(permission)}</b></div><div><span>后台能力</span><b>仅查看连接、心跳与绑定信息</b></div></div><div class="info-banner">这里用于查看设备心跳、连接状态、绑定人员和本场权限；PC 后台不会直接修改比分或接管现场操作。</div></div>`, `${btn('关闭', 'close-modal', 'outline')}`);
      return;
    }
    if (action === 'refresh-consoles') {
      const eventSpace = activeEventSpace();
      const count = onsiteRowsForEvent(eventSpace).reduce((total, match) => total + onsiteOperatorRoles(match.operatorCount).filter((role) => role !== 'recorder' || usesPlayerData(eventSpace)).length, 0);
      render();
      showToast(`已刷新 ${count} 个模拟控制台席位状态`);
      return;
    }
    if (action === 'save-modal') {
      const current = route();
      if (current.section === 'event' && current.page === 'registration') {
        updateActiveEvent((eventSpace, workflow) => {
          workflow.registrationConfigured = true;
        });
      }
      closeModal();
      showToast('设置已保存');
      return;
    }
    if (action === 'finish-event') {
      const eventSpace = eventSpaces.find((item) => item.id === pendingEventId);
      if (!eventSpace) return;
      const workflow = eventWorkflow(eventSpace);
      const missing = [];
      if (!workflow.scheduleGenerated) missing.push('尚未生成赛程');
      if (!workflow.executionReturned) missing.push('尚有比赛未回传赛果');
      if (!workflow.resultsApproved) missing.push('尚有赛果未复核');
      if (missing.length) {
        openModal('赛事暂不能结束', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('triangle-alert')}</span><h3>${esc(eventSpace.name)}</h3><p>${missing.join('；')}。</p><div class="info-banner">请先完成现场执行和赛果复核，避免结束后留下未处理任务。</div></div>`, btn('我知道了','close-modal','outline'));
        return;
      }
      openModal('确认结束赛事', `<div class="delete-event-confirm"><span class="delete-event-icon">${icon('circle-check-big')}</span><h3>${esc(eventSpace.name)}</h3><p>结束后停止报名与现场任务，赛事数据转为历史记录。</p></div>`, `${btn('取消','close-modal','outline')}${btn('确认结束','confirm-finish-event','primary','circle-check-big')}`);
      return;
    }
    if (action === 'confirm-finish-event') {
      const eventSpace = eventSpaces.find((item) => item.id === pendingEventId);
      if (!eventSpace) return;
      eventWorkflow(eventSpace).finished = true;
      syncEventLifecycle(eventSpace);
      persistEventSpaces();
      closeModal();
      render();
      showToast(`${eventSpace.name} 已结束并转为历史赛事`);
      return;
    }
    if (action === 'save-page') {
      const current = route();
      if (current.section === 'event' && current.page === 'rules') {
        captureRuleState(activeEventSpace());
        render();
        showToast('竞赛规程草稿与关键条款已保存');
        return;
      }
      if (current.section === 'event' && current.page === 'format') {
        const group = selectedFormatGroup();
        const config = competitionConfig(group);
        const blockingIssue = formatConfigIssues(group, config).find((issue) => issue.level === 'error');
        if (blockingIssue) {
          showToast(blockingIssue.message);
          return;
        }
      }
      if (current.section === 'schedule' && current.page === 'settings') {
        const settings = eventVenueSettings();
        const availability = settings?.availability;
        // 保存时以表单当前显示值为准。时间选择器在部分桌面浏览器中可能尚未触发 change，
        // 但用户已经完成选择；若只校验内存旧值会产生“已填写仍提示未填写”的误报。
        content.querySelectorAll('[data-venue-field]').forEach((field) => {
          const key = field.dataset.venueField;
          if (!key || !availability) return;
          availability[key] = ['matchMinutes', 'bufferMinutes'].includes(key)
            ? Number(field.value)
            : String(field.value || '').trim();
        });
        const eveningToggle = content.querySelector('[data-venue-evening-enabled]');
        if (availability && eveningToggle) availability.eveningEnabled = eveningToggle.checked;
        if (availability) Object.assign(availability, scheduleEditableDateRange(availability));
        const summary = settings ? venueResourceSummary(settings) : { venues: 0, courts: 0 };
        if (!availability?.startDate || !availability?.endDate || availability.startDate > availability.endDate) {
          showToast('请检查比赛日期范围');
          return;
        }
        const invalidMainSegment = !availability.morningStartTime || !availability.morningEndTime || !availability.afternoonStartTime || !availability.afternoonEndTime
          || availability.morningStartTime >= availability.morningEndTime || availability.afternoonStartTime >= availability.afternoonEndTime;
        const invalidEvening = availability.eveningEnabled && (!availability.eveningStartTime || !availability.eveningEndTime || availability.eveningStartTime >= availability.eveningEndTime);
        if (invalidMainSegment || invalidEvening || !automaticScheduleTimes(availability).length) {
          const invalidPart = invalidMainSegment ? '上午、下午' : invalidEvening ? '晚上' : '每日开赛时间';
          showToast(`请检查${invalidPart}设置`);
          return;
        }
        if (!summary.venues || !summary.courts) {
          showToast('请至少启用一个场馆和一个球场');
          return;
        }
        const enabledCourts = settings.venues.filter((venue) => venue.enabled !== false).flatMap((venue) => (venue.courts || []).filter((court) => court.enabled !== false));
        const unassignedCourt = enabledCourts.find((court) => !Array.isArray(court.groupIds) || !court.groupIds.length);
        if (unassignedCourt) {
          showToast(`请为${unassignedCourt.name}至少选择一个适用组别`);
          return;
        }
        const invalidCourtProfile = enabledCourts.find((court) => !Number(court.matchMinutes) || Number(court.bufferMinutes) < 0);
        if (invalidCourtProfile) {
          showToast(`请检查${invalidCourtProfile.name}的比赛时长与缓冲时间`);
          return;
        }
        const invalidCourtTime = enabledCourts.find((court) => (
          !court.morningStartTime || !court.morningEndTime || court.morningStartTime >= court.morningEndTime
          || !court.afternoonStartTime || !court.afternoonEndTime || court.afternoonStartTime >= court.afternoonEndTime
          || (court.eveningEnabled && (!court.eveningStartTime || !court.eveningEndTime || court.eveningStartTime >= court.eveningEndTime))
        ));
        if (invalidCourtTime) {
          showToast(`请检查${invalidCourtTime.name}的上午、下午或晚间时间段`);
          return;
        }
        const emptyCourtSlots = enabledCourts.find((court) => !derivedScheduleTimes({ ...availability, ...court, matchMinutes: court.matchMinutes, bufferMinutes: court.bufferMinutes }).length);
        if (emptyCourtSlots) {
          showToast(`${emptyCourtSlots.name}当前时段无法容纳完整比赛，请调整时间或时长`);
          return;
        }
      }
      const eventSpace = updateActiveEvent((eventSpace, workflow) => {
        if (current.section === 'event' && current.page === 'profile') {
          const form = content.querySelector('[data-event-profile-form]');
          if (form) {
            const values = Object.fromEntries(new FormData(form).entries());
            const regionPicker = form.querySelector('[data-region-picker]');
            const nextEventName = String(values.eventName || '').trim();
            if (nextEventName) eventSpace.name = nextEventName;
            eventSpace.shortName = String(values.eventShortName || '').trim() || nextEventName || eventSpace.name;
            eventSpace.startDate = String(values.startDate || eventSpace.startDate || '');
            eventSpace.endDate = String(values.endDate || eventSpace.endDate || '');
            eventSpace.eventType = String(values.eventType || eventSpace.eventType || '青少年篮球联赛');
            eventSpace.description = String(values.description || '').trim();
            eventSpace.regionCode = String(values.regionCode || eventSpace.regionCode || '');
            eventSpace.regionLabel = selectedRegionLabel(regionPicker) || eventSpace.regionLabel || '';
            const nextParticipationMode = values.participationMode === 'team-only' ? 'team-only' : 'team-player';
            eventSpace.participationMode = nextParticipationMode;
            eventSpace.playerQualificationRequired = nextParticipationMode === 'team-player';
            eventSpace.playerDataServiceEnabled = nextParticipationMode === 'team-player';
            if (nextParticipationMode === 'team-only') workflow.qualificationCompleted = true;
            else if (!registrationPlayers(eventSpace).length) workflow.qualificationCompleted = false;
            eventSpace.organizationUnits = {
              organizer: String(values.organizer || '').trim(),
              undertaker: String(values.undertaker || '').trim(),
              coOrganizer: String(values.coOrganizer || '').trim()
            };
            if (eventSpace.ruleSettings) Object.assign(eventSpace.ruleSettings, eventSpace.organizationUnits, { publisher: eventSpace.organizationUnits.organizer });
            syncOrganizationUnitsToRuleDraft(eventSpace);
          }
          workflow.profileSaved = true;
        }
        if (current.section === 'schedule' && current.page === 'settings') {
          const settings = eventVenueSettings(eventSpace);
          settings.updatedAt = new Date().toISOString();
          eventSpace.startDate = settings.availability.startDate;
          eventSpace.endDate = settings.availability.endDate;
          workflow.venuesConfigured = true;
        }
        if (current.section === 'event' && current.page === 'format') {
        const group = selectedFormatGroup();
          const config = competitionConfig(group);
          config.configured = true;
          config.dirty = false;
          config.updatedAt = new Date().toISOString();
          eventSpace.groupRows = [...eventGroupRows];
          eventSpace.groups = eventGroupRows.length;
          eventSpace.firstGroup = eventGroupRows[0]?.name || '';
          eventSpace.firstGroupId = eventGroupRows[0]?.id || '';
          workflow.groupsConfigured = true;
          workflow.formatConfigured = eventGroupRows.every((item) => competitionConfig(item)?.configured);
        }
        if (current.section === 'event' && current.page === 'registration') {
          const form = content.querySelector('[data-registration-form]');
          if (form) {
            const values = Object.fromEntries(new FormData(form).entries());
            eventSpace.registrationSettings = Object.assign(registrationSettings(eventSpace), values);
            eventSpace.registrationDataVersion = Number(eventSpace.registrationDataVersion || 0) + 1;
          }
          workflow.registrationConfigured = true;
        }
      });
      let createdPoster = false;
      if (current.section === 'event' && current.page === 'registration' && window.SXFPosterStudio) {
        const posterId = await window.SXFPosterStudio.ensureDefault(eventSpace, registrationSettings(eventSpace));
        if (!Array.isArray(eventSpace.posterIds) || !eventSpace.posterIds.length) {
          eventSpace.posterIds = [posterId]; eventSpace.primaryPosterId = posterId; createdPoster = true; persistEventSpaces();
        }
      }
      render();
      if (current.section === 'schedule' && current.page === 'settings') {
        routeTo('schedule', 'calendar');
        showToast('赛程设置已保存，全部组别将使用同一套场地与时间资源');
        return;
      }
      showToast(createdPoster ? '报名设置已保存，并自动生成默认海报' : '当前页面设置已保存');
      return;
    }
    if (action === 'ranking-rules') {
      const eventSpace = activeEventSpace();
      const rules = (eventSpace?.groupRows || []).map((item) => {
        const config = competitionConfig(item);
        const points = config?.points || {};
        const stages = (config?.stages || []).map((stage) => stage.name).filter(Boolean).join(' → ') || '待配置';
        return `<article class="rule-summary-item"><h4>${esc(item.name)} · ${esc(item.competition || '组合赛制')}</h4><p>阶段：${esc(stages)}</p><p>积分：胜 ${Number(points.win ?? 2)} 分、平 ${Number(points.draw ?? 1)} 分、负 ${Number(points.loss ?? 0)} 分。</p><p>循环赛进入积分榜和赛果矩阵；淘汰赛只决定晋级与最终名次，不计入小组积分。</p></article>`;
      }).join('') || '<p>当前赛事尚未配置组别赛制。</p>';
      openModal('赛制与排名规则', `<div class="rule-summary">${rules}<p>同分时依次比较相互战绩、净胜分和总得分；具体晋级名额以当前组别设置为准。</p></div>`);
      return;
    }
    if (action === 'format-help') {
      openModal('赛制与排名规则', `<div class="rule-summary"><h4>循环赛阶段</h4><p>按当前组别配置的胜、平、负积分生成积分榜和赛果矩阵。</p><h4>淘汰赛阶段</h4><p>不进入积分榜，仅根据赛果决定晋级、三四名和决赛名次。</p></div>`);
      return;
    }
    const genericMessages = {
      'save-page':'当前页面设置已保存', 'add-venue':'已打开新增场馆', 'edit-venue':'已打开场馆管理',
      'publish-rules':'赛事规则新版本已发布', 'batch-approve':'已通过所选正常资料', 'export':'导出任务已生成', 'invite-captain':'球队认领邀请已发送',
      'registration-row':'已打开球队入驻详情', 'change-roster':'正式名单变更申请已创建',
      'auto-knockout':'淘汰赛签位已自动生成', 'publish-schedule':'赛程已发布并通知球队',
      'show-conflicts':'当前无硬冲突，存在 3 条休息间隔提醒', 'add-court':'已打开新增球场',
      'refresh-consoles':'控制台连接状态已刷新', 'approve-normal':'正常场次已批量通过',
      'publish-standings':'积分榜已发布', 'publish-bracket':'淘汰赛对阵图已发布',
      'refresh':'页面数据已刷新'
    };
    showToast(genericMessages[action] || '演示操作已完成');
  }

  document.addEventListener('click', (event) => {
    const routeTarget = event.target.closest('[data-route]');
    if (routeTarget) {
      const [section, page] = routeTarget.dataset.route.split('/');
      routeTo(section, page);
      return;
    }
    const actionTarget = event.target.closest('[data-action]');
    if (actionTarget) handleAction(actionTarget.dataset.action, actionTarget);
  });

  document.addEventListener('input', (event) => {
    const field = event.target.closest('[data-rule-unit-field]');
    if (!field) return;
    const key = field.dataset.ruleUnitField;
    const value = field.value.trim() || (key === 'coOrganizer' ? '无' : '待补充');
    content.querySelectorAll(`[data-rule-unit-value="${key}"]`).forEach((node) => { node.textContent = value; });
  });

  document.getElementById('closeModal').addEventListener('click', closeModal);
  modalLayer.addEventListener('click', (event) => {
    if (event.target === modalLayer) closeModal();
  });
  document.getElementById('collapseSidebar').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
  eventSelector.addEventListener('change', (event) => {
    selectedEventId = event.target.value;
    registrationGroupFilter = '';
    registrationStatusFilter = '';
    eventGroupRows = loadEventGroupRows();
    selectedFormatGroupId = activeEventSpace()?.firstGroupId || eventGroupRows[0]?.id || '';
    selectedFormatGroupName = selectedFormatGroup()?.name || '';
    selectedDrawGroupId = eventGroupRows.some((group) => group.id === activeEventSpace()?.drawSelectedGroupId) ? activeEventSpace().drawSelectedGroupId : selectedFormatGroupId;
    selectedFormatStageId = 'group-stage';
    persistEventSpaces();
    store.update((state) => { state.eventId = event.target.value; });
    render();
    showToast('已切换赛事空间');
  });
  document.getElementById('eventUnlockForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeSession) return;
    const input = document.getElementById('eventUnlockPin');
    const message = document.getElementById('eventLockMessage');
    const pin = input.value.trim();
    const guards = readJson(pinGuardKey, {});
    const key = pinRecordKey(activeSession);
    const guard = guards[key] || { failures: 0, blockedUntil: 0 };
    const now = Date.now();
    if (Number(guard.blockedUntil) > now) {
      message.textContent = `连续输错次数过多，请 ${Math.ceil((guard.blockedUntil - now) / 1000)} 秒后再试。`;
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      message.textContent = '请输入四位数字锁屏密码。';
      return;
    }
    const pins = readJson(pinsKey, {});
    const expected = pins[key];
    const actual = await digest(`${activeSession.deviceId}:${activeSession.phone}:${pin}`);
    if (expected !== actual) {
      guard.failures = Number(guard.failures) + 1;
      if (guard.failures >= 5) {
        guard.failures = 0;
        guard.blockedUntil = now + 60 * 1000;
        message.textContent = '连续输错 5 次，已限制输入 60 秒。登录状态仍会保留。';
      } else {
        message.textContent = `密码不正确，还可尝试 ${5 - guard.failures} 次。`;
      }
      guards[key] = guard;
      writeJson(pinGuardKey, guards);
      input.value = '';
      return;
    }
    guards[key] = { failures: 0, blockedUntil: 0 };
    writeJson(pinGuardKey, guards);
    activeSession.lastActiveAt = now;
    writeJson(sessionKey, activeSession);
    eventLocked = false;
    document.getElementById('eventLock').hidden = true;
    input.value = '';
    message.textContent = '';
  });
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, recordSessionActivity, { passive: true });
  });
  window.setInterval(checkSessionIdle, 30 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkSessionIdle();
  });
  window.addEventListener('hashchange', render);
  window.addEventListener('sxf:tournament-state', render);

  render();

  if (isDemoMode) {
    window.__sxfScheduleDebug = {
      activeEventSpace,
      plannedScheduleResult,
      scheduleStageFeasibility,
      generatedScheduleRows,
      eventVenueSettings,
      scheduleStageOrderIssues,
      scheduleTeamPeriodIssues,
      eventWorkflow,
      scheduleBlueprint,
      updateActiveEvent,
      persistEventSpaces,
      eventSpacesKey,
      selectedEventKey
    };
  }
})();
