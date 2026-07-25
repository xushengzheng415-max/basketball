Object.assign(pageNames,{schedule:'复杂排课管理',staff:'员工与身份权限',crm:'招生 CRM',trial:'试听转化中心',renewal:'续费策略中心',parents:'家长运营中心',contentOps:'内容与转介绍',attribution:'经营归因中心',campuses:'多校区增长对比'});
const login=document.getElementById('loginScreen');
const app=document.querySelector('.app');
function enterAdmin(){login.classList.add('login-hidden');app.removeAttribute('aria-hidden');localStorage.setItem('sx_institution_demo_login','1')}
function exitAdmin(){localStorage.removeItem('sx_institution_demo_login');login.classList.remove('login-hidden');app.setAttribute('aria-hidden','true')}
document.getElementById('loginForm').addEventListener('submit',event=>{event.preventDefault();enterAdmin()});
document.getElementById('logoutInstitution').addEventListener('click',exitAdmin);
if(localStorage.getItem('sx_institution_demo_login')==='1')enterAdmin();
document.querySelectorAll('[data-demo-action]').forEach(button=>button.addEventListener('click',()=>alert(button.dataset.demoAction+'：当前为机构端交互原型，接入云端接口后将执行真实操作。')));
const tournamentTabCopy={
  overview:['赛事总览','统一查看赛事状态、进度与下一步操作'],
  teams:['球队与名单','审核参赛球队、球员资格、号码与报名资料'],
  schedule:['赛程与分组','配置赛制分组、自动编排比赛并处理场地冲突'],
  onsite:['现场执行','向小程序下发检录、首发、计分和裁判任务'],
  results:['赛果与数据','复核比分与技术统计，生成积分榜和赛事报告']
};
function activateTournamentTab(key,updateUrl=true){
  const button=document.querySelector(`[data-tournament-tab="${key}"]`);
  if(!button||!tournamentTabCopy[key])return;
  document.querySelectorAll('[data-tournament-tab]').forEach(item=>{
    const active=item===button;
    item.classList.toggle('active',active);
    item.setAttribute('aria-selected',String(active));
  });
  document.querySelectorAll('[data-tournament-view]').forEach(view=>view.hidden=view.dataset.tournamentView!==key);
  const copy=tournamentTabCopy[key];
  document.getElementById('tournamentPanelTitle').textContent=copy[0];
  document.getElementById('tournamentPanelHint').textContent=copy[1];
  if(updateUrl)history.replaceState(null,'','#tournaments/'+key);
}
document.querySelectorAll('[data-tournament-tab]').forEach(button=>button.addEventListener('click',()=>activateTournamentTab(button.dataset.tournamentTab)));
document.querySelector('[data-page="tournaments"]').addEventListener('click',()=>activateTournamentTab('overview',false));
const initialTournamentTab=location.hash.split('/')[1];
activateTournamentTab(tournamentTabCopy[initialTournamentTab]?initialTournamentTab:'overview',false);
