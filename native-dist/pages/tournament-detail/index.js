function list(key){const value=wx.getStorageSync(key)||[];return Array.isArray(value)?value:[]}
function gameKey(id){return 'games:'+id}
function tournament(id){return list('tournaments').find(x=>String(x.id)===String(id))||null}
function teams(){const map={};const add=x=>{const name=String(x.label||x.name||x.teamName||x.team||'').trim();if(!name||name==='未分队')return;const key=String(x.key||x.id||x.filter||name);if(!map[key])map[key]={id:x.id||key,key,label:name,playerCount:Number(x.playerCount||0),logoUrl:x.logoUrl||x.teamLogo||'/assets/pages/team/mini-logo-unassigned.png'};else if(!map[key].logoUrl&&x.teamLogo)map[key].logoUrl=x.teamLogo};list('teams').filter(x=>x&&x.enabled!==false&&x.status!=='draft').forEach(add);list('teamCategories').filter(x=>x&&x.key!=='all'&&x.key!=='unassigned').forEach(add);list('players').forEach(x=>{if(x&&x.team&&x.team!=='未分队')add({key:x.filter||x.team,label:x.team,teamLogo:x.teamLogo})});return Object.keys(map).map(k=>map[k])}
function teamKey(item){return String(item&& (item.key||item.id||item.label)||'')}
function gameHasTeam(game,team){const ids=[game.homeTeamId,game.homeTeamKey,game.homeTeamName,game.awayTeamId,game.awayTeamKey,game.awayTeamName].map(x=>String(x||''));return [team.id,team.key,team.label].map(x=>String(x||'')).some(x=>x&&ids.indexOf(x)>=0)}
function tournamentTeamKeys(item,games,allTeams){if(item&&Array.isArray(item.teamKeys))return item.teamKeys.map(x=>String(x));const keys=[];allTeams.forEach(team=>{if(games.some(game=>gameHasTeam(game,team)))keys.push(teamKey(team))});return keys}
function decorateGames(items,teamOptions){const byKey={};teamOptions.forEach(x=>{byKey[String(x.id)]=x;byKey[String(x.key)]=x;byKey[String(x.label)]=x});return items.map((x,i)=>{const home=byKey[String(x.homeTeamId)]||byKey[String(x.homeTeamKey)]||byKey[String(x.homeTeamName)]||{};const away=byKey[String(x.awayTeamId)]||byKey[String(x.awayTeamKey)]||byKey[String(x.awayTeamName)]||{};return Object.assign({},x,{orderText:'第 '+(items.length-i)+' 场',dateText:x.date||'日期待排',homeTeamText:x.homeTeamName||'主队待定',awayTeamText:x.awayTeamName||'客队待定',homeLogo:home.logoUrl||'/assets/pages/team/mini-logo-unassigned.png',awayLogo:away.logoUrl||'/assets/pages/team/mini-logo-unassigned.png',statusText:x.statusText||'待开始'})})}
function roundRobin(items){const pool=items.slice();if(pool.length%2)pool.push(null);const out=[];for(let r=0;r<pool.length-1;r++){for(let i=0;i<pool.length/2;i++){const a=pool[i],b=pool[pool.length-1-i];if(a&&b)out.push({roundNo:r+1,stageText:'第 '+(r+1)+' 轮',homeTeam:(r+i)%2?b:a,awayTeam:(r+i)%2?a:b})}pool.splice(1,0,pool.pop())}return out}
function elimination(items){const out=[];for(let i=0;i+1<items.length;i+=2)out.push({roundNo:1,stageText:'淘汰赛首轮',homeTeam:items[i],awayTeam:items[i+1]});return out}
Page({data:{tournamentId:'',tournament:null,teamOptions:[],allTeamOptions:[],availableTeamOptions:[],tournamentTeams:[],hasTeams:false,hasTournamentTeams:false,hasAvailableTeams:false,teamAddText:'选择球队',games:[],emptyGames:true,simpleMode:true,regularMode:false,simpleClass:'mode-option active',regularClass:'mode-option',gameName:'',gameDate:'',gameDateText:'选择场次日期',homeIndex:-1,awayIndex:-1,homeText:'请选择主队',awayText:'请选择客队',formatIndex:0,formatOptions:['单循环赛','单败淘汰赛'],format:'roundRobin',formatText:'单循环赛',selectedKeys:[],selectedCount:0,scheduleTeams:[],startDate:'',startDateText:'选择赛程开始日期',preview:[],hasPreview:false,previewCount:0,editingGameId:'',gameFormTitle:'添加场次',gameSubmitText:'保存场次'},onLoad(o){const id=decodeURIComponent(String(o.id||''));this.setData({tournamentId:id});this.loadData()},onShow(){if(this.data.tournamentId)this.loadData()},loadData(){
  const item=tournament(this.data.tournamentId),allTeamOptions=teams(),storedGames=list(gameKey(this.data.tournamentId));
  const keys=tournamentTeamKeys(item,storedGames,allTeamOptions);
  const teamOptions=allTeamOptions.filter(team=>keys.indexOf(teamKey(team))>=0);
  const availableTeamOptions=allTeamOptions.filter(team=>keys.indexOf(teamKey(team))<0);
  const games=decorateGames(storedGames,allTeamOptions),regular=!!(item&&item.scheduleMode==='regular');
  const name=String(item&&item.name||'未命名赛事');
  this.setData({
    tournament:item?Object.assign({},item,{metaText:(item.location||'未填写地点')+' · '+(item.date||'未选择日期'),logoUrl:item.logoUrl||item.logoFileID||item.logo||'',logoText:name.slice(0,1)}):null,
    allTeamOptions,
    availableTeamOptions,
    tournamentTeams:teamOptions,
    teamOptions,
    hasTeams:teamOptions.length>0,
    hasTournamentTeams:teamOptions.length>0,
    hasAvailableTeams:availableTeamOptions.length>0,
    teamAddText:availableTeamOptions.length?'选择球队':'暂无更多球队',
    games,
    emptyGames:games.length===0,
    simpleMode:!regular,
    regularMode:regular,
    simpleClass:regular?'mode-option':'mode-option active',
    regularClass:regular?'mode-option active':'mode-option',
    scheduleTeams:teamOptions.map(x=>Object.assign({},x,{mark:'',className:'team-select'}))
  });
},
addTournamentTeam(e){
  const index=Number(e.detail.value),team=this.data.availableTeamOptions[index];
  if(!team)return;
  const keys=this.data.tournamentTeams.map(teamKey);
  const key=teamKey(team);
  if(keys.indexOf(key)<0)keys.push(key);
  wx.setStorageSync('tournaments',list('tournaments').map(item=>String(item.id)===String(this.data.tournamentId)?Object.assign({},item,{teamKeys:keys,teams:keys.length,updatedAt:new Date().toISOString()}):item));
  this.loadData();
  wx.showToast({title:'球队已加入赛事',icon:'success'});
},
removeTournamentTeam(e){
  const key=String(e.currentTarget.dataset.key||''),team=this.data.tournamentTeams.find(item=>teamKey(item)===key);
  if(!team)return;
  const storedGames=list(gameKey(this.data.tournamentId));
  if(storedGames.some(game=>gameHasTeam(game,team))){
    wx.showToast({title:'该球队已有赛程，请先删除相关场次',icon:'none'});
    return;
  }
  wx.showModal({title:'移除球队',content:'确认将“'+team.label+'”移出当前赛事吗？',confirmText:'移除',confirmColor:'#d93025',success:result=>{
    if(!result.confirm)return;
    const keys=this.data.tournamentTeams.map(teamKey).filter(itemKey=>itemKey!==key);
    wx.setStorageSync('tournaments',list('tournaments').map(item=>String(item.id)===String(this.data.tournamentId)?Object.assign({},item,{teamKeys:keys,teams:keys.length,updatedAt:new Date().toISOString()}):item));
    this.loadData();
    wx.showToast({title:'球队已移除',icon:'success'});
  }});
},
changeMode(e){const regular=e.currentTarget.dataset.mode==='regular';this.setData({simpleMode:!regular,regularMode:regular,simpleClass:regular?'mode-option':'mode-option active',regularClass:regular?'mode-option active':'mode-option'});wx.setStorageSync('tournaments',list('tournaments').map(x=>String(x.id)===String(this.data.tournamentId)?Object.assign({},x,{scheduleMode:regular?'regular':'simple'}):x))},onName(e){this.setData({gameName:e.detail.value})},onDate(e){const v=e.detail.value;this.setData({gameDate:v,gameDateText:v||'选择场次日期'})},onHome(e){const i=Number(e.detail.value),x=this.data.teamOptions[i];this.setData({homeIndex:i,homeText:x?x.label:'请选择主队'})},onAway(e){const i=Number(e.detail.value),x=this.data.teamOptions[i];this.setData({awayIndex:i,awayText:x?x.label:'请选择客队'})},saveGame(){
  const h=this.data.teamOptions[this.data.homeIndex],a=this.data.teamOptions[this.data.awayIndex];
  if(!h||!a)return wx.showToast({title:'请选择主队和客队',icon:'none'});
  if(h.key===a.key)return wx.showToast({title:'主客队不能相同',icon:'none'});
  const old=list(gameKey(this.data.tournamentId)),editingId=String(this.data.editingGameId||'');
  const fields={tournamentId:this.data.tournamentId,name:this.data.gameName.trim()||'第 '+(old.length+1)+' 场',homeTeamId:h.id,homeTeamKey:h.key,homeTeamName:h.label,awayTeamId:a.id,awayTeamKey:a.key,awayTeamName:a.label,date:this.data.gameDate};
  let stored;
  if(editingId){
    stored=old.map(x=>String(x.id)===editingId?Object.assign({},x,fields):x);
  }else{
    stored=[Object.assign({id:Date.now(),status:'pending',statusText:'待开始',homePlayers:[],awayPlayers:[]},fields)].concat(old);
  }
  wx.setStorageSync(gameKey(this.data.tournamentId),stored);
  wx.setStorageSync('tournaments',list('tournaments').map(x=>String(x.id)===String(this.data.tournamentId)?Object.assign({},x,{games:stored.length,updatedAt:new Date().toISOString()}):x));
  this.setData({editingGameId:'',gameFormTitle:'添加场次',gameSubmitText:'保存场次',gameName:'',gameDate:'',gameDateText:'选择场次日期',homeIndex:-1,awayIndex:-1,homeText:'请选择主队',awayText:'请选择客队'});
  this.loadData();
  wx.showToast({title:editingId?'场次已更新':'场次已创建',icon:'success'});
},
editGame(e){
  const id=String(e.currentTarget.dataset.id||''),game=list(gameKey(this.data.tournamentId)).find(x=>String(x.id)===id);
  if(!game)return wx.showToast({title:'未找到该场比赛',icon:'none'});
  const options=this.data.teamOptions;
  const findIndex=(gameId,gameKeyValue,gameName)=>options.findIndex(x=>String(x.id)===String(gameId)||String(x.key)===String(gameKeyValue)||String(x.label)===String(gameName));
  const homeIndex=findIndex(game.homeTeamId,game.homeTeamKey,game.homeTeamName),awayIndex=findIndex(game.awayTeamId,game.awayTeamKey,game.awayTeamName);
  this.setData({editingGameId:id,gameFormTitle:'编辑场次',gameSubmitText:'保存修改',gameName:game.name||'',gameDate:game.date||'',gameDateText:game.date||'选择场次日期',homeIndex,awayIndex,homeText:homeIndex>=0?options[homeIndex].label:'请选择主队',awayText:awayIndex>=0?options[awayIndex].label:'请选择客队',simpleMode:true,regularMode:false,simpleClass:'mode-option active',regularClass:'mode-option'});
},
cancelEditGame(){
  this.setData({editingGameId:'',gameFormTitle:'添加场次',gameSubmitText:'保存场次',gameName:'',gameDate:'',gameDateText:'选择场次日期',homeIndex:-1,awayIndex:-1,homeText:'请选择主队',awayText:'请选择客队'});
},
deleteGame(e){
  const id=String(e.currentTarget.dataset.id||''),game=list(gameKey(this.data.tournamentId)).find(x=>String(x.id)===id);
  if(!game)return wx.showToast({title:'未找到该场比赛',icon:'none'});
  wx.showModal({title:'删除场次',content:'确认删除“'+(game.name||'未命名场次')+'”吗？已完成的比赛记录和统计仍会保留。',confirmText:'删除',confirmColor:'#d93025',success:r=>{
    if(!r.confirm)return;
    const stored=list(gameKey(this.data.tournamentId)).filter(x=>String(x.id)!==id);
    wx.setStorageSync(gameKey(this.data.tournamentId),stored);
    wx.setStorageSync('tournaments',list('tournaments').map(x=>String(x.id)===String(this.data.tournamentId)?Object.assign({},x,{games:stored.length,updatedAt:new Date().toISOString()}):x));
    if(String(this.data.editingGameId)===id)this.cancelEditGame();
    this.loadData();
    wx.showToast({title:'场次已删除',icon:'success'});
  }});
},
toggleTeam(e){const key=String(e.currentTarget.dataset.key),keys=this.data.selectedKeys.slice(),i=keys.indexOf(key);if(i<0)keys.push(key);else keys.splice(i,1);this.setData({selectedKeys:keys,selectedCount:keys.length,preview:[],hasPreview:false,scheduleTeams:this.data.teamOptions.map(x=>Object.assign({},x,{mark:keys.indexOf(x.key)>=0?'✓':'',className:keys.indexOf(x.key)>=0?'team-select selected':'team-select'}))})},onFormat(e){const i=Number(e.detail.value);this.setData({formatIndex:i,format:i===1?'elimination':'roundRobin',formatText:this.data.formatOptions[i],preview:[],hasPreview:false})},onStart(e){const v=e.detail.value;this.setData({startDate:v,startDateText:v||'选择赛程开始日期'})},generate(){const chosen=this.data.teamOptions.filter(x=>this.data.selectedKeys.indexOf(x.key)>=0);if(chosen.length<2)return wx.showToast({title:'请至少选择 2 支球队',icon:'none'});const raw=this.data.format==='elimination'?elimination(chosen):roundRobin(chosen),preview=raw.map((x,i)=>Object.assign({},x,{id:'p'+i,homeText:x.homeTeam.label,awayText:x.awayTeam.label,dateText:this.data.startDate||'日期待排'}));this.setData({preview,hasPreview:preview.length>0,previewCount:preview.length})},publish(){if(!this.data.preview.length)return;const stamp=Date.now(),generated=this.data.preview.map((x,i)=>({id:stamp+i,tournamentId:this.data.tournamentId,name:x.stageText+' 第 '+(i+1)+' 场',source:'generated',stage:this.data.format,roundNo:x.roundNo,homeTeamId:x.homeTeam.id,homeTeamKey:x.homeTeam.key,homeTeamName:x.homeTeam.label,awayTeamId:x.awayTeam.id,awayTeamKey:x.awayTeam.key,awayTeamName:x.awayTeam.label,date:this.data.startDate,status:'pending',statusText:'待开始',homePlayers:[],awayPlayers:[]})),stored=generated.concat(list(gameKey(this.data.tournamentId)));wx.setStorageSync(gameKey(this.data.tournamentId),stored);wx.setStorageSync('tournaments',list('tournaments').map(x=>String(x.id)===String(this.data.tournamentId)?Object.assign({},x,{scheduleMode:'regular',scheduleStatus:'published',games:stored.length}):x));this.setData({preview:[],hasPreview:false});this.loadData();wx.showToast({title:'赛程已发布',icon:'success'})},openGame(e){const id=String(e.currentTarget.dataset.id||''),game=this.data.games.find(x=>String(x.id)===id);if(!game)return wx.showToast({title:'未找到该场比赛',icon:'none'});const item=this.data.tournament||{};wx.setStorageSync('quickMatchActiveConfig',{mode:'quick',source:'tournament-game',tournamentId:this.data.tournamentId,gameId:id,matchName:game.name||item.name||'赛事场次',homeTeam:{id:game.homeTeamId,key:game.homeTeamKey,name:game.homeTeamName,logoUrl:game.homeLogo},awayTeam:{id:game.awayTeamId,key:game.awayTeamKey,name:game.awayTeamName,logoUrl:game.awayLogo},homePlayers:[],awayPlayers:[],periodMinutes:Number(item.periodMinutes||game.periodMinutes||10),periods:Number(item.periods||game.periods||4),createdAt:Date.now()});wx.navigateTo({url:'/pages/scorer-board/index?mode=quick&boardOnly=1'})},editTournament(){if(!this.data.tournamentId)return;wx.navigateTo({url:'/pages/tournament-create/index?id='+encodeURIComponent(this.data.tournamentId)})},
deleteTournament(){
  const item=this.data.tournament;
  if(!item)return;
  wx.showModal({title:'删除赛事',content:'确认删除“'+(item.name||'未命名赛事')+'”吗？赛事和全部赛程删除后不可恢复，已完成的比赛记录和统计仍会保留。',confirmText:'删除',confirmColor:'#d93025',success:r=>{
    if(!r.confirm)return;
    wx.setStorageSync('tournaments',list('tournaments').filter(x=>String(x.id)!==String(this.data.tournamentId)));
    wx.removeStorageSync(gameKey(this.data.tournamentId));
    wx.showToast({title:'赛事已删除',icon:'success'});
    setTimeout(()=>{const pages=getCurrentPages();if(pages.length>1)wx.navigateBack();else wx.redirectTo({url:'/pages/tournament/index'})},350);
  }});
},
goTeam(){wx.navigateTo({url:'/pages/team-create/index?from=tournament-detail'})}})
