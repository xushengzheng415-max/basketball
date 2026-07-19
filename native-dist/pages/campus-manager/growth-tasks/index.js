const COMMON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20, navHeight: 44, navSpacer: 76,
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', calendar: COMMON_ROOT + 'icon-calendar-orange-256.png', user: COMMON_ROOT + 'icon-user-orange-256.png', warning: COMMON_ROOT + 'icon-warning-orange-256.png', chevron: COMMON_ROOT + 'icon-chevron-orange-256.png' },
    metrics: [ { label: '待处理', value: '6', symbol: '◔' }, { label: '进行中', value: '9', symbol: '▶' }, { label: '待复盘', value: '3', symbol: '◕' } ],
    tabs: [ { key: 'all', label: '全部', activeClass: 'active' }, { key: 'renewal', label: '续费', activeClass: '' }, { key: 'parent', label: '家长服务', activeClass: '' }, { key: 'content', label: '内容传播', activeClass: '' }, { key: 'referral', label: '转介绍', activeClass: '' } ],
    tasks: [
      { id: 1, title: '到期学员续费跟进', source: '续费提醒', deadline: '05-28 18:00', owner: '张主管', status: '待处理', tone: 'orange', icon: COMMON_ROOT + 'icon-calendar-orange-256.png' },
      { id: 2, title: '低满意度家长回访', source: '家长反馈', deadline: '05-27 20:00', owner: '李主管', status: '进行中', tone: 'yellow', icon: COMMON_ROOT + 'icon-user-orange-256.png' },
      { id: 3, title: '成长周报发布', source: '内容计划', deadline: '05-30 12:00', owner: '王主管', status: '进行中', tone: 'yellow', icon: COMMON_ROOT + 'icon-download-orange-256.png' },
      { id: 4, title: '老学员转介绍', source: '转介绍线索', deadline: '05-29 18:00', owner: '赵主管', status: '待复盘', tone: 'blue', icon: COMMON_ROOT + 'icon-user-orange-256.png' }
    ]
  },
  onLoad() { let navTop=20,navHeight=44; try{const menu=wx.getMenuButtonBoundingClientRect&&wx.getMenuButtonBoundingClientRect();if(menu&&menu.top){navTop=menu.top;navHeight=menu.height||32}else{navTop=wx.getSystemInfoSync().statusBarHeight||20}}catch(error){console.warn('[campus-manager-growth-tasks] nav metrics unavailable',error)}this.setData({navTop,navHeight,navSpacer:navTop+navHeight+16}); },
  goBack(){if(getCurrentPages().length>1){wx.navigateBack({delta:1});return}wx.reLaunch({url:'/pages/campus-manager/home/index'});},
  switchTab(event){const key=event.currentTarget.dataset.key;this.setData({tabs:this.data.tabs.map((item)=>Object.assign({},item,{activeClass:item.key===key?'active':''}))});},
  openTask(){wx.navigateTo({url:'/pages/campus-manager/growth-task-detail/index'});}
});
