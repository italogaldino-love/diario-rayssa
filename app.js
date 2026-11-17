(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const source = window.DIARY_DATA;
  if (!source || !source.site) {
    $('demo-notice').hidden = false;
    $('demo-notice').textContent = 'Não foi possível carregar o diário. Confira se o arquivo data.js está na mesma pasta.';
    return;
  }
  let data = source;
  if (new URLSearchParams(location.search).get('rascunho') === '1') {
    try {
      const draft = JSON.parse(localStorage.getItem('diario-para-voce-draft-v1'));
      if (draft && draft.site && draft.longing && Array.isArray(draft.entries) && Array.isArray(draft.announcements) && Array.isArray(draft.milestones)) {
        data = draft;
        $('draft-ribbon').hidden = false;
      }
    } catch (_) { /* Published content remains usable when browser storage is unavailable. */ }
  }
  for (const notice of data.announcements || []) notice.message = window.cleanDiaryText(notice.message);
  for (const entry of data.entries || []) entry.content = window.cleanDiaryText(entry.content);
  const site = data.site;
  const entries = [...(data.entries || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const notices = (data.announcements || []).filter((notice) => notice.active);
  let selectedCategory = 'Todas as páginas';
  let selectedNotice = 0;
  let currentEntryId = null;
  const dialog = $('reading-dialog');
  const dateValue = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const parsed = new Date(value + 'T12:00:00');
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const formatDate = (value, long = false) => {
    const date = dateValue(value);
    return date ? new Intl.DateTimeFormat('pt-BR', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace(/\./g, '') : 'Uma lembrança sem data';
  };
  const make = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const text = (id, content) => { $(id).textContent = content || ''; };
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const title = site.title || 'Entre linhas, você.';
  document.title = title + ' — um diário com carinho';
  text('brand-title', title);
  text('footer-brand', title);
  text('site-subtitle', site.subtitle);
  text('card-recipient', (site.recipient || 'você').toLocaleUpperCase('pt-BR'));
  text('signature', site.author || 'De mim, com carinho');


  function showDialog(label, heading, content, date, mood, isEntry) {
    text('dialog-label', label);
    text('dialog-title', heading);
    text('dialog-date', date ? formatDate(date, true) : 'Um bilhete para guardar');
    text('dialog-mood', mood ? '♡ ' + mood : '');
    $('dialog-mood').hidden = !mood;
    text('dialog-signature', site.author || 'De mim, com carinho');
    $('dialog-body').replaceChildren();
    String(content || '').split(/\n\s*\n/).forEach((paragraph) => $('dialog-body').append(make('p', '', paragraph)));
    $('dialog-navigation').hidden = !isEntry || entries.length < 2;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    $('close-dialog').focus({ preventScroll: true });
  }
  function openEntry(id) {
    const index = entries.findIndex((entry) => entry.id === id);
    if (index < 0) return;
    const entry = entries[index];
    currentEntryId = entry.id;
    showDialog(entry.category || 'Uma página do diário', entry.title, entry.content, entry.date, entry.mood, true);
    $('previous-entry').disabled = index === 0;
    $('next-entry').disabled = index === entries.length - 1;
  }
  function openNotice(notice) {
    currentEntryId = null;
    showDialog(notice.label || 'No nosso mural', notice.title, notice.message, notice.date, '', false);
  }
  $('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  $('previous-entry').addEventListener('click', () => {
    const index = entries.findIndex((entry) => entry.id === currentEntryId);
    if (index > 0) openEntry(entries[index - 1].id);
  });
  $('next-entry').addEventListener('click', () => {
    const index = entries.findIndex((entry) => entry.id === currentEntryId);
    if (index >= 0 && index < entries.length - 1) openEntry(entries[index + 1].id);
  });
  function renderBanner() {
    if (!notices.length) return;
    const notice = notices[selectedNotice];
    text('announcement-label', notice.label || 'Um recado importante');
    text('announcement-title', notice.title);
    text('announcement-count', (selectedNotice + 1) + ' / ' + notices.length);
    $('previous-announcement').hidden = notices.length < 2;
    $('next-announcement').hidden = notices.length < 2;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('diario-banner-dismissed') === JSON.stringify(notices.map((item) => [item.id, item.title, item.message])); } catch (_) { /* Nonessential preference. */ }
    $('announcement').hidden = dismissed;
  }
  renderBanner();
  $('read-announcement').addEventListener('click', () => { if (notices.length) openNotice(notices[selectedNotice]); });
  $('previous-announcement').addEventListener('click', () => { selectedNotice = (selectedNotice - 1 + notices.length) % notices.length; renderBanner(); });
  $('next-announcement').addEventListener('click', () => { selectedNotice = (selectedNotice + 1) % notices.length; renderBanner(); });
  $('dismiss-announcement').addEventListener('click', () => {
    $('announcement').hidden = true;
    try { sessionStorage.setItem('diario-banner-dismissed', JSON.stringify(notices.map((item) => [item.id, item.title, item.message]))); } catch (_) { /* Nonessential preference. */ }
    document.querySelector('.hero .button').focus({ preventScroll: true });
  });

  const categories = ['Todas as páginas', ...new Set(entries.map((entry) => entry.category).filter(Boolean))];
  categories.forEach((category) => {
    const button = make('button', 'filter', category);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(category === selectedCategory));
    button.addEventListener('click', () => {
      selectedCategory = category;
      Array.from($('filters').children).forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      renderEntries();
    });
    $('filters').append(button);
  });
  function renderEntries() {
    const query = normalize($('search').value.trim());
    const shown = entries.filter((entry) => (selectedCategory === 'Todas as páginas' || selectedCategory === entry.category) && normalize([entry.title, entry.category, entry.content, entry.excerpt, entry.mood].join(' ')).includes(query));
    const container = $('entries');
    container.replaceChildren();
    shown.forEach((entry) => {
      const article = make('article', 'entry');
      const header = make('div', 'entry-header');
      const date = make('time', 'entry-date', formatDate(entry.date));
      if (dateValue(entry.date)) date.dateTime = entry.date;
      header.append(date, make('span', 'entry-number', String(entries.indexOf(entry) + 1).padStart(2, '0')));
      article.append(header, make('p', 'entry-category', entry.category || 'Do meu diário'));
      const heading = make('h3');
      const titleButton = make('button', 'entry-title-button', entry.title);
      titleButton.type = 'button';
      titleButton.addEventListener('click', () => openEntry(entry.id));
      heading.append(titleButton);
      article.append(heading, make('p', 'entry-excerpt', entry.excerpt || String(entry.content || '').slice(0, 145)));
      const footer = make('div', 'entry-footer');
      const openButton = make('button', 'entry-open', '↗');
      openButton.type = 'button';
      openButton.setAttribute('aria-label', 'Ler: ' + entry.title);
      openButton.addEventListener('click', () => openEntry(entry.id));
      footer.append(make('span', 'entry-mood', entry.mood || 'Com carinho'), openButton);
      article.append(footer);
      container.append(article);
    });
    $('empty-state').hidden = shown.length !== 0;
    text('empty-message', entries.length ? 'Tente outra palavra ou outro assunto.' : 'As próximas lembranças vão encontrar um lugar aqui.');
    $('clear-search').hidden = entries.length === 0;
    text('results-count', shown.length + (shown.length === 1 ? ' página encontrada.' : ' páginas encontradas.'));
  }
  renderEntries();
  $('search').addEventListener('input', renderEntries);
  $('clear-search').addEventListener('click', () => {
    $('search').value = '';
    selectedCategory = 'Todas as páginas';
    Array.from($('filters').children).forEach((button, index) => button.setAttribute('aria-pressed', String(index === 0)));
    renderEntries();
  });
  const level = Math.min(100, Math.max(0, Number(data.longing?.level) || 0));
  text('longing-value', level);
  // text() intentionally treats empty strings as empty; zero is a meaningful reading.
  $('longing-value').textContent = String(level);
  text('longing-label', level >= 90 ? 'Não cabe no peito' : level >= 70 ? 'Quase transbordando' : level >= 40 ? 'Vontade de estar perto' : level > 0 ? 'Você nos pensamentos' : 'Aconchego de estar perto');
  text('longing-message', data.longing?.message);
  text('longing-updated', data.longing?.updatedAt ? 'REGISTRADO EM ' + formatDate(data.longing.updatedAt).toLocaleUpperCase('pt-BR') : '');
  $('longing-fill').style.width = level + '%';
  $('longing-progress').setAttribute('aria-valuenow', String(level));
  $('longing-progress').setAttribute('aria-valuetext', level + '% de saudade');
  const start = dateValue(site.startDate);
  if (start) {
    const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = (name) => Number(todayParts.find((item) => item.type === name).value);
    const days = Math.round((Date.UTC(part('year'), part('month') - 1, part('day')) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
    text('days-together', days >= 0 ? 'Desde ' + formatDate(site.startDate, true) + '. ' + days + (days === 1 ? ' dia de história para guardar.' : ' dias de história para guardar.') : 'Um novo capítulo começa em ' + formatDate(site.startDate, true) + '.');
  }
  const milestones = [...(data.milestones || [])].sort((a, b) => a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0);
  milestones.forEach((item) => {
    const article = make('article', 'timeline-item');
    article.append(make('p', 'timeline-date', item.date ? formatDate(item.date, true) : 'Um capítulo para guardar'), make('h3', '', item.label), make('p', '', item.description));
    $('timeline').append(article);
  });
  if (!milestones.length) $('timeline').append(make('p', 'notice-empty', 'Cada começo merece ser lembrado. As memórias vão aparecer aqui.'));
  notices.forEach((notice) => {
    const article = make('article', 'notice');
    article.append(make('p', 'eyebrow', notice.label || 'Um recado para você'), make('h3', '', notice.title), make('p', 'notice-excerpt', String(notice.message || '').split(/\n\s*\n/)[0]));
    const button = make('button', 'text-button', 'Abrir bilhete ↗');
    button.type = 'button';
    button.setAttribute('aria-label', 'Abrir bilhete: ' + notice.title);
    button.addEventListener('click', () => openNotice(notice));
    article.append(button);
    $('notices').append(article);
  });
  if (!notices.length) $('notices').append(make('p', 'notice-empty', 'Por enquanto, só um lembrete: este cantinho continua aqui.'));
})();
