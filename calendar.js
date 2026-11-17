(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let data = window.DIARY_DATA || {};
  if (new URLSearchParams(location.search).get('rascunho') === '1') {
    try { const draft = JSON.parse(localStorage.getItem('diario-para-voce-draft-v1')); if (draft?.site && Array.isArray(draft.entries)) data = draft; } catch (_) {}
  }
  const notes = (data.calendarNotes || []).filter(note => /^\d{4}-\d{2}-\d{2}$/.test(note.date));
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  let year = Number(part('year')), month = Number(part('month')) - 1, selected = today;
  const key = day => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dateLabel = date => new Intl.DateTimeFormat('pt-BR',{dateStyle:'full',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
  const node = (tag, text, cls) => { const el = document.createElement(tag); el.textContent = text; if(cls) el.className = cls; return el; };
  function read() {
    const panel = $('calendar-reading'); panel.replaceChildren(node('p','RECADO DO DIA','eyebrow'),node('h3',dateLabel(selected)));
    const found = notes.filter(note => note.date === selected);
    if (!found.length) panel.append(node('p','Ainda não deixei um recado neste dia. As próximas palavras podem estar logo ali.','calendar-empty'));
    found.forEach(note => { const article = node('article',''); article.append(node('h4',note.title),node('p',note.content,'calendar-content')); panel.append(article); });
  }
  function render() {
    $('calendar-month').textContent = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));
    const grid = $('calendar-days'); grid.replaceChildren();
    const offset = new Date(Date.UTC(year,month,1)).getUTCDay();
    for(let i=0;i<offset;i++) grid.append(node('span',''));
    const count = new Date(Date.UTC(year,month+1,0)).getUTCDate();
    for(let day=1;day<=count;day++) {
      const date = key(day), hasNote = notes.some(note => note.date === date);
      const button = node('button',String(day),'calendar-day'); button.type='button';
      button.setAttribute('aria-label',`${dateLabel(date)}${hasNote ? ', tem recado' : ', sem recado'}`);
      button.setAttribute('aria-pressed',String(selected===date));
      if(date===today) button.setAttribute('aria-current','date');
      if(hasNote) {const dot=node('i','','calendar-dot'); dot.setAttribute('aria-hidden','true'); button.append(dot);}
      button.addEventListener('click',()=>{selected=date;render();grid.querySelector(`[aria-pressed="true"]`)?.focus();});
      grid.append(button);
    }
    read();
  }
  function move(delta) { const date=new Date(Date.UTC(year,month+delta,1)); year=date.getUTCFullYear();month=date.getUTCMonth();selected=key(1);render(); }
  $('calendar-prev').addEventListener('click',()=>move(-1));
  $('calendar-next').addEventListener('click',()=>move(1));
  $('calendar-today').addEventListener('click',()=>{year=Number(part('year'));month=Number(part('month'))-1;selected=today;render();});
  render();
})();
