(function () {
  const data = window.BOARD_DATA;
  const storageKey = 'sxf-referee-coach-prototype-review-v1';
  const state = JSON.parse(localStorage.getItem(storageKey) || '{"notes":[]}');
  const board = document.getElementById('board');
  const viewer = document.getElementById('viewer');
  const viewerImage = document.getElementById('viewer-image');
  const noteCenter = document.getElementById('note-center');
  let currentNode = null;
  let zoom = 1;
  let filter = 'open';

  const nodes = data.sections.flatMap(section => section.groups.flatMap(group => group.nodes.map(node => ({...node, sectionTitle: section.title}))));
  const typeNames = { entry:'总览', pc:'PC', mini:'教练端', service:'服务号', referee:'裁判端', closed:'数据视图' };
  const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
  const openNotes = () => state.notes.filter(note => !note.resolved);

  function renderSummary() {
    const transitions = data.sections.flatMap(s => s.groups.flatMap(g => g.transitions || [])).length;
    document.getElementById('summary').innerHTML = `
      <div class="metric"><span>评审区段</span><strong>${data.sections.length}</strong></div>
      <div class="metric"><span>正式原型页面</span><strong>${nodes.length}</strong></div>
      <div class="metric"><span>明确页面衔接</span><strong>${transitions}</strong></div>
      <div class="metric"><span>待处理意见</span><strong>${openNotes().length}</strong></div>`;
    document.getElementById('open-count').textContent = openNotes().length;
  }

  function nodeNotes(nodeId) { return state.notes.filter(note => note.nodeId === nodeId); }

  function renderBoard() {
    board.textContent = '';
    data.sections.forEach(section => {
      const sectionEl = document.createElement('section');
      sectionEl.className = 'section';
      sectionEl.dataset.section = section.id;
      const head = document.createElement('div');
      head.className = 'section-head';
      head.innerHTML = `<div><h2>${section.title}</h2><p>${section.description}</p></div><button class="flow-question" data-section-question="${section.id}">＋ 对整段流程提问或提出调整</button>`;
      sectionEl.appendChild(head);
      section.groups.forEach(group => {
        const groupEl = document.createElement('div'); groupEl.className = 'group';
        const groupTitle = document.createElement('div'); groupTitle.className = 'group-title'; groupTitle.textContent = group.title; groupEl.appendChild(groupTitle);
        const nodesEl = document.createElement('div'); nodesEl.className = 'nodes';
        group.nodes.forEach(node => {
          const notes = nodeNotes(node.id); const open = notes.filter(note => !note.resolved).length;
          const card = document.createElement('article'); card.className = node.orientation === 'portrait' ? 'node portrait' : 'node'; card.id = `node-${node.id}`;
          card.innerHTML = `<button class="thumb" data-view="${node.id}"><img src="${node.path}?v=${Date.now()}" alt="${node.label}" /></button><div class="node-body"><div class="node-top"><span class="type">${typeNames[node.type] || node.type}</span><h3>${node.label}</h3><button class="note-badge" data-notes="${node.id}" title="查看本页意见">${open || (notes.length ? '✓' : '0')}</button></div><p class="logic">${node.logic}</p><div class="node-actions"><button data-view="${node.id}">查看大图</button><button data-source="${node.id}">打开交互原型</button></div></div>`;
          nodesEl.appendChild(card);
        });
        groupEl.appendChild(nodesEl);
        if ((group.transitions || []).length) {
          const list = document.createElement('div'); list.className = 'transition-list';
          (group.transitions || []).forEach(t => { const from = nodes.find(n=>n.id===t.from)?.label || t.from; const to = nodes.find(n=>n.id===t.to)?.label || t.to; const item = document.createElement('span'); item.className='transition'; item.innerHTML = `<b>${from}</b> → ${to}：${t.label}`; list.appendChild(item); });
          groupEl.appendChild(list);
        }
        sectionEl.appendChild(groupEl);
      });
      board.appendChild(sectionEl);
    });
  }

  function openViewer(node) {
    currentNode = node; zoom = 1;
    document.getElementById('viewer-title').textContent = node.label;
    document.getElementById('viewer-logic').textContent = node.logic;
    viewerImage.src = `${node.path}?v=${Date.now()}`;
    document.getElementById('feedback-text').value = '';
    applyZoom(); viewer.classList.add('open'); viewer.setAttribute('aria-hidden','false');
  }
  function applyZoom() { viewerImage.style.width = `${Math.round(100 * zoom)}%`; document.getElementById('zoom-label').textContent = `${Math.round(zoom*100)}%`; }
  function openSource(node) { window.open(`../prototype.html?${node.sourceQuery || 'screen=flow'}`, '_blank', 'noopener'); }

  function renderNotes() {
    const list = document.getElementById('note-list');
    const visible = state.notes.filter(note => filter === 'all' || (filter === 'open' ? !note.resolved : note.resolved));
    list.textContent = '';
    if (!visible.length) { list.innerHTML = '<div class="empty">当前筛选条件下没有评审意见</div>'; return; }
    visible.forEach(note => {
      const node = nodes.find(n => n.id === note.nodeId);
      const item = document.createElement('article'); item.className = 'note-item';
      item.innerHTML = `<strong>${node ? node.label : note.sectionTitle}</strong><p></p><span>${new Date(note.createdAt).toLocaleString('zh-CN')}</span><br><button data-locate-note="${note.id}">定位</button> <button data-toggle-note="${note.id}">${note.resolved?'重新打开':'标记解决'}</button>`;
      item.querySelector('p').textContent = note.text;
      list.appendChild(item);
    });
  }

  function addNote(text, nodeId, sectionTitle) {
    state.notes.push({ id:`note-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, nodeId:nodeId || '', sectionTitle:sectionTitle || '', text, resolved:false, createdAt:new Date().toISOString() });
    save(); renderSummary(); renderBoard(); renderNotes();
  }

  document.addEventListener('click', event => {
    const view = event.target.closest('[data-view]'); if (view) { openViewer(nodes.find(n=>n.id===view.dataset.view)); return; }
    const source = event.target.closest('[data-source]'); if (source) { openSource(nodes.find(n=>n.id===source.dataset.source)); return; }
    const badge = event.target.closest('[data-notes]'); if (badge) { filter='all'; noteCenter.classList.add('open'); renderNotes(); return; }
    const question = event.target.closest('[data-section-question]'); if (question) { const section=data.sections.find(s=>s.id===question.dataset.sectionQuestion); const text=prompt(`对“${section.title}”提出流程问题或调整：`); if(text&&text.trim()) addNote(text.trim(),'',section.title); return; }
    const locate = event.target.closest('[data-locate-note]'); if (locate) { const note=state.notes.find(n=>n.id===locate.dataset.locateNote); noteCenter.classList.remove('open'); if(note.nodeId){ document.getElementById(`node-${note.nodeId}`)?.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>openViewer(nodes.find(n=>n.id===note.nodeId)),350); } else { const section=data.sections.find(s=>s.title===note.sectionTitle); document.querySelector(`[data-section="${section?.id}"]`)?.scrollIntoView({behavior:'smooth'}); } return; }
    const toggle = event.target.closest('[data-toggle-note]'); if(toggle){ const note=state.notes.find(n=>n.id===toggle.dataset.toggleNote); note.resolved=!note.resolved; save(); renderSummary(); renderBoard(); renderNotes(); return; }
  });

  document.getElementById('close-viewer').onclick = () => { viewer.classList.remove('open'); viewer.setAttribute('aria-hidden','true'); };
  document.getElementById('zoom-in').onclick = () => { zoom=Math.min(2,zoom+.25); applyZoom(); };
  document.getElementById('zoom-out').onclick = () => { zoom=Math.max(.5,zoom-.25); applyZoom(); };
  document.getElementById('open-source').onclick = () => currentNode && openSource(currentNode);
  document.getElementById('save-feedback').onclick = () => { const text=document.getElementById('feedback-text').value.trim(); if(!text||!currentNode) return; addNote(text,currentNode.id,currentNode.sectionTitle); document.getElementById('feedback-text').value=''; };
  document.getElementById('close-notes').onclick = () => noteCenter.classList.remove('open');
  document.getElementById('next-note').onclick = () => { const note=openNotes()[0]; if(note?.nodeId){ document.getElementById(`node-${note.nodeId}`)?.scrollIntoView({behavior:'smooth',block:'center'}); } else { noteCenter.classList.add('open'); renderNotes(); } };
  document.getElementById('refresh-board').onclick = () => renderBoard();
  document.getElementById('export-notes').onclick = () => { const blob=new Blob([JSON.stringify({board:data.title,exportedAt:new Date().toISOString(),notes:state.notes},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='裁判教练协同原型评审记录.json'; a.click(); URL.revokeObjectURL(a.href); };
  document.querySelectorAll('.note-filters button').forEach(button => button.onclick=()=>{ filter=button.dataset.filter; document.querySelectorAll('.note-filters button').forEach(b=>b.classList.toggle('active',b===button)); renderNotes(); });

  renderSummary(); renderBoard(); renderNotes();
})();
