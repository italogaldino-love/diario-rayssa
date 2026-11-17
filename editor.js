(() => {
  'use strict';
  const STORAGE_KEY = 'diario-para-voce-draft-v1';
  const $ = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
  const uid = () => window.crypto?.randomUUID?.() || `pagina-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  let data;
  let published;
  let saveTimer;
  let toastTimer;
  let storageWorking = true;

  function showToast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 6000);
  }

  function string(value, label, max = 50000) {
    if (typeof value !== 'string' || value.length > max) throw new Error(`O campo “${label}” precisa ser um texto válido.`);
    return value;
  }

  function date(value, label, optional = true) {
    if ((value === null || value === undefined || value === '') && optional) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Confira a data de ${label}.`);
    const parsed = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Confira a data de ${label}.`);
    return value;
  }

  function time(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Confira o horário do Tempo apaixonado.');
    return value;
  }

  function localPath(value) {
    let decoded;
    try { decoded = decodeURIComponent(value); } catch (_) { return false; }
    return Boolean(decoded) && decoded === decoded.trim() && !/^[a-z][a-z\d+.-]*:/i.test(decoded) && !/^[/?#]/.test(decoded) && !/[\\<>\u0000-\u001f\u007f]/.test(decoded) && !decoded.split(/[/?#]/).some((part) => part === '..');
  }

  function httpsUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
    catch (_) { return false; }
  }

  function photoSource(value) {
    if (typeof value !== 'string' || value.length > 1500000) throw new Error('Uma das fotos é grande demais. Adicione uma imagem menor.');
    if (/^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/]+={0,2}$/i.test(value) || httpsUrl(value) || localPath(value)) return value;
    throw new Error('A foto precisa ser uma imagem JPEG, PNG ou WebP, um arquivo do projeto ou um link HTTPS.');
  }

  function musicUrl(value, draft) {
    const url = string(value ?? '', 'link da música', 2000).trim();
    if (!url || draft) return url;
    if (httpsUrl(url)) {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (['spotify.com', 'open.spotify.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'].includes(hostname) || /\.(mp3|ogg|wav)$/i.test(parsed.pathname)) return url;
    }
    if (localPath(url) && /\.(mp3|ogg|wav)(?:[?#].*)?$/i.test(url)) return url;
    throw new Error('Use um link HTTPS do Spotify ou YouTube, ou um arquivo .mp3, .ogg ou .wav para a música.');
  }

  function normalize(input, { draft = false } = {}) {
    if (!input || input.version !== 1 || !input.site || !input.longing || !Array.isArray(input.entries) || !Array.isArray(input.announcements) || !Array.isArray(input.milestones)) throw new Error('Este arquivo não tem o formato do diário (versão 1).');
    if ([input.entries, input.announcements, input.milestones].some((items) => items.length > 1000)) throw new Error('O arquivo contém itens demais. Importe até 1.000 itens de cada tipo.');
    const level = Number(input.longing.level);
    if (!Number.isFinite(level) || level < 0 || level > 100) throw new Error('A saudade deve ter um valor entre 0 e 100.');
    const itemId = (item) => typeof item.id === 'string' && item.id.length < 200 ? item.id : uid();
    const love = input.loveClock || { startDate: '2026-11-09', startTime: '14:52' };
    if (love.photos !== undefined && !Array.isArray(love.photos)) throw new Error('As fotos do Tempo apaixonado precisam estar em uma lista.');
    if ((love.photos || []).length > 6) throw new Error('Escolha até 6 fotos para o Tempo apaixonado.');
    const result = {
      version: 1,
      demo: Boolean(input.demo),
      site: {
        title: string(input.site.title, 'nome do diário', 160),
        recipient: string(input.site.recipient, 'nome dela', 100),
        author: string(input.site.author, 'assinatura', 100),
        subtitle: string(input.site.subtitle ?? '', 'apresentação', 600),
        startDate: date(input.site.startDate, 'início da conversa')
      },
      longing: { level: Math.round(level), message: string(input.longing.message ?? '', 'mensagem da saudade', 600), updatedAt: date(input.longing.updatedAt, 'atualização da saudade', draft) },
      loveClock: {
        startDate: date(love.startDate, 'início do Tempo apaixonado'),
        startTime: time(love.startTime),
        message: string(love.message ?? '', 'mensagem do Tempo apaixonado', 600),
        photos: (love.photos || []).map((item) => ({ id: itemId(item), src: photoSource(item.src), caption: string(item.caption ?? '', 'legenda da foto', 160) })),
        music: { url: musicUrl(love.music?.url, draft), title: string(love.music?.title ?? '', 'nome da música', 160) }
      },
      announcements: input.announcements.map((item) => ({ id: itemId(item), label: string(item.label ?? '', 'etiqueta do recado', 100), title: string(item.title, 'título do recado', 160), message: string(item.message, 'recado', 3000), active: Boolean(item.active), date: date(item.date, 'recado') })),
      entries: input.entries.map((item) => ({ id: itemId(item), date: date(item.date, 'página', draft), title: string(item.title, 'título da página', 160), category: string(item.category ?? '', 'categoria', 100), mood: string(item.mood ?? '', 'sentimento', 100), excerpt: string(item.excerpt ?? '', 'resumo', 600), content: string(item.content, 'conteúdo da página'), featured: Boolean(item.featured) })),
      milestones: input.milestones.map((item) => ({ id: itemId(item), date: date(item.date, 'marco'), label: string(item.label, 'título do marco', 160), description: string(item.description ?? '', 'descrição do marco', 3000) }))
    };
    for (const items of [result.entries, result.announcements, result.milestones, result.loveClock.photos]) {
      const seen = new Set();
      items.forEach((item) => { if (seen.has(item.id)) item.id = uid(); seen.add(item.id); });
    }
    return result;
  }

  function persist(announce = false) {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      storageWorking = true;
      $('save-status').textContent = 'Rascunho salvo neste navegador';
      if (announce) showToast('Rascunho salvo. Baixe data.js para publicar as mudanças.');
    } catch (_) {
      storageWorking = false;
      $('save-status').textContent = 'Sem acesso ao armazenamento. Baixe seu arquivo para guardar.';
      if (announce) showToast('O navegador não permitiu salvar o rascunho. Baixe data.js para guardar seu texto.');
    }
  }

  function scheduleSave() {
    $('save-status').textContent = 'Guardando suas palavras…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
  }

  function collectSettings() {
    data.site.title = $('site-title').value;
    data.site.recipient = $('site-recipient').value;
    data.site.author = $('site-author').value;
    data.site.subtitle = $('site-subtitle').value;
    data.site.startDate = $('site-start').value || null;
    data.demo = $('demo-mode').checked;
    data.longing.level = Number($('longing-level').value);
    data.longing.message = $('longing-message').value;
    data.longing.updatedAt = $('longing-date').value;
    data.loveClock.startDate = $('love-start-date').value || null;
    data.loveClock.startTime = $('love-start-time').value || null;
    data.loveClock.message = $('love-message').value;
    data.loveClock.music.url = $('love-music-url').value;
    data.loveClock.music.title = $('love-music-title').value;
    $('longing-value').value = `${data.longing.level}%`;
    $('longing-value').textContent = `${data.longing.level}%`;
  }

  function makeField(item, key, labelText, options = {}) {
    const wrap = document.createElement('div');
    wrap.className = `field${options.full ? ' full' : ''}`;
    const label = document.createElement('label');
    const id = `field-${uid()}`;
    label.htmlFor = id;
    label.textContent = labelText;
    const control = document.createElement(options.multiline ? 'textarea' : 'input');
    control.id = id;
    if (!options.multiline) control.type = options.type || 'text';
    if (options.multiline) control.rows = options.rows || 3;
    if (options.max) control.maxLength = options.max;
    if (options.list) control.setAttribute('list', options.list);
    control.required = Boolean(options.required);
    control.value = item[key] ?? '';
    control.addEventListener('input', () => {
      item[key] = control.value || (options.type === 'date' && !options.required ? null : '');
      if (key === 'title' || key === 'label' && options.isTitle) {
        const summary = control.closest('details')?.querySelector('summary');
        if (summary) summary.textContent = control.value || 'Sem título';
      }
      scheduleSave();
    });
    wrap.append(label, control);
    return wrap;
  }

  function checkbox(item, key, labelText) {
    const label = document.createElement('label');
    label.className = 'check-field';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = Boolean(item[key]);
    input.addEventListener('change', () => { item[key] = input.checked; scheduleSave(); });
    const text = document.createElement('span'); text.textContent = labelText;
    label.append(input, text);
    return label;
  }

  function renderItems(type, containerId, openId) {
    const container = $(containerId);
    container.replaceChildren();
    if (!data[type].length) {
      const empty = document.createElement('p'); empty.className = 'empty-list';
      empty.textContent = { announcements: 'Nenhum recadinho por aqui. Que tal escrever o primeiro?', entries: 'Uma página em branco também é um começo.', milestones: 'Cada história tem seus dias especiais. Adicione o primeiro.' }[type];
      container.append(empty); return;
    }
    data[type].forEach((item) => {
      const detail = document.createElement('details'); detail.className = 'item-editor'; detail.open = item.id === openId;
      const summary = document.createElement('summary'); summary.textContent = item.title || item.label || 'Sem título';
      const body = document.createElement('div'); body.className = 'item-body';
      const grid = document.createElement('div'); grid.className = 'fields-grid';
      if (type === 'announcements') {
        grid.append(makeField(item, 'label', 'Etiqueta curta (ex.: Recadinho)', { max: 100 }), makeField(item, 'date', 'Data do recado (opcional)', { type: 'date' }), makeField(item, 'title', 'Título do recado', { full: true, max: 160, required: true }), makeField(item, 'message', 'Mensagem', { full: true, multiline: true, max: 3000, required: true }));
      } else if (type === 'entries') {
        grid.append(makeField(item, 'title', 'Título da página', { full: true, max: 160, required: true }), makeField(item, 'date', 'Data desta página', { type: 'date', required: true }), makeField(item, 'category', 'Categoria', { max: 100, list: 'category-options' }), makeField(item, 'mood', 'Sentimento (ex.: Com carinho)', { full: true, max: 100 }), makeField(item, 'excerpt', 'Pequeno resumo (opcional)', { full: true, multiline: true, rows: 2, max: 600 }), makeField(item, 'content', 'O que você quer contar', { full: true, multiline: true, rows: 10, max: 50000, required: true }));
      } else {
        grid.append(makeField(item, 'label', 'Título do marco', { full: true, max: 160, required: true, isTitle: true }), makeField(item, 'date', 'Data (opcional)', { type: 'date' }), makeField(item, 'description', 'Por que esse dia importa', { full: true, multiline: true, max: 3000 }));
      }
      const footer = document.createElement('div'); footer.className = 'item-footer';
      if (type === 'announcements') footer.append(checkbox(item, 'active', 'Mostrar no banner'));
      else { const note = document.createElement('small'); note.textContent = type === 'entries' ? 'Uma página feita para ficar.' : 'Um pedacinho da história.'; footer.append(note); }
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-button'; remove.textContent = 'Excluir';
      remove.setAttribute('aria-label', `Excluir ${item.title || item.label || 'item sem título'}`);
      remove.addEventListener('click', () => {
        if (!window.confirm(`Excluir “${item.title || item.label || 'este item'}” do rascunho?`)) return;
        data[type] = data[type].filter((candidate) => candidate !== item);
        renderItems(type, containerId); persist(); showToast('Item excluído do rascunho.');
      });
      footer.append(remove); body.append(grid, footer); detail.append(summary, body); container.append(detail);
    });
  }

  function renderAll() {
    $('site-title').value = data.site.title;
    $('site-recipient').value = data.site.recipient;
    $('site-author').value = data.site.author;
    $('site-subtitle').value = data.site.subtitle;
    $('site-start').value = data.site.startDate || '';
    $('demo-mode').checked = data.demo;
    $('longing-level').value = data.longing.level;
    $('longing-message').value = data.longing.message;
    $('longing-date').value = data.longing.updatedAt;
    $('longing-value').textContent = `${data.longing.level}%`;
    $('love-start-date').value = data.loveClock.startDate || '';
    $('love-start-time').value = data.loveClock.startTime || '';
    $('love-message').value = data.loveClock.message;
    $('love-music-url').value = data.loveClock.music.url;
    $('love-music-title').value = data.loveClock.music.title;
    renderPhotos();
    renderItems('announcements', 'announcements-list');
    renderItems('entries', 'entries-list');
    renderItems('milestones', 'milestones-list');
  }

  function renderPhotos() {
    const container = $('love-photos-list');
    container.replaceChildren();
    $('add-love-photos').disabled = data.loveClock.photos.length >= 6;
    if (!data.loveClock.photos.length) {
      const empty = document.createElement('p'); empty.className = 'empty-list';
      empty.textContent = 'As fotos são opcionais. O contador já funciona sem elas.';
      container.append(empty); return;
    }
    data.loveClock.photos.forEach((photo, index) => {
      const card = document.createElement('article'); card.className = 'love-photo-card';
      const image = document.createElement('img'); image.src = photo.src; image.alt = photo.caption || `Foto ${index + 1}`; image.loading = 'lazy';
      const fields = document.createElement('div'); fields.className = 'love-photo-fields';
      fields.append(makeField(photo, 'caption', `Legenda da foto ${index + 1}`, { max: 160 }));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-button'; remove.textContent = 'Remover foto';
      remove.setAttribute('aria-label', `Remover foto ${index + 1}`);
      remove.addEventListener('click', () => {
        if (!window.confirm(`Remover a foto ${index + 1} do rascunho?`)) return;
        data.loveClock.photos = data.loveClock.photos.filter((item) => item !== photo);
        renderPhotos(); persist(); showToast('Foto removida do rascunho.');
      });
      fields.append(remove); card.append(image, fields); container.append(card);
    });
  }

  async function preparePhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha fotos JPEG, PNG ou WebP.');
    if (file.size > 6 * 1024 * 1024) throw new Error(`A foto “${file.name}” ultrapassa 6 MB. Escolha uma versão menor.`);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error(`Não foi possível abrir a foto “${file.name}”.`)); image.src = url; });
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 80000000) throw new Error('A foto tem dimensões muito grandes. Escolha uma versão menor.');
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Este navegador não conseguiu preparar a foto.');
      context.fillStyle = '#fffdf8'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let result = canvas.toDataURL('image/jpeg', .82);
      if (result.length > 1350000) result = canvas.toDataURL('image/jpeg', .68);
      if (result.length > 1350000) throw new Error('Essa foto ainda ficou grande demais. Escolha uma versão menor.');
      return { id: uid(), src: photoSource(result), caption: '' };
    } finally { URL.revokeObjectURL(url); }
  }

  function addItem(type, containerId, item) {
    data[type].push(item); renderItems(type, containerId, item.id); persist();
    const added = $(containerId).lastElementChild;
    added?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    added?.querySelector('input,textarea')?.focus({ preventScroll: true });
  }

  function validateForExport() {
    collectSettings();
    const invalid = $('diary-form').querySelector(':invalid');
    if (invalid) {
      const detail = invalid.closest('details'); if (detail) detail.open = true;
      invalid.focus(); invalid.reportValidity();
      showToast('Preencha os campos obrigatórios antes de baixar.');
      return false;
    }
    try { normalize(data); return true; }
    catch (error) { showToast(error.message); return false; }
  }

  try {
    published = normalize(window.DIARY_DATA);
    data = clone(published);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { data = normalize(JSON.parse(saved), { draft: true }); $('save-status').textContent = 'Seu rascunho foi recuperado'; }
      else $('save-status').textContent = 'Pronto para escrever · rascunho neste navegador';
    } catch (_) { showToast('Não foi possível recuperar um rascunho. A versão publicada foi carregada.'); }
  } catch (error) {
    $('save-status').textContent = 'Não foi possível carregar data.js. Confira o arquivo do diário.';
    $('diary-form').hidden = true;
    $('export-button').disabled = true;
    $('preview-button').hidden = true;
    showToast(error.message);
    return;
  }

  renderAll();
  $('diary-form').addEventListener('submit', (event) => event.preventDefault());
  ['site-title', 'site-recipient', 'site-author', 'site-subtitle', 'site-start', 'demo-mode', 'longing-level', 'longing-message', 'longing-date', 'love-start-date', 'love-start-time', 'love-message', 'love-music-url', 'love-music-title'].forEach((id) => $(id).addEventListener('input', () => { collectSettings(); scheduleSave(); }));
  $('add-love-photos').addEventListener('click', () => $('love-photo-files').click());
  $('love-photo-files').addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []); if (!files.length) return;
    $('add-love-photos').disabled = true;
    showToast('Preparando suas fotos…');
    let added = 0;
    try {
      for (const file of files) {
        if (data.loveClock.photos.length >= 6) { showToast('Você já tem 6 fotos. Remova uma antes de acrescentar outra.'); break; }
        data.loveClock.photos.push(await preparePhoto(file)); added += 1; renderPhotos(); persist(); $('add-love-photos').disabled = true;
      }
      if (added) showToast(`${added === 1 ? 'Foto adicionada' : `${added} fotos adicionadas`} ao rascunho. Baixe data.js para publicar.`);
    } catch (error) { showToast(error.message); }
    finally { event.target.value = ''; renderPhotos(); }
  });
  $('add-announcement').addEventListener('click', () => addItem('announcements', 'announcements-list', { id: uid(), label: 'Recadinho', title: '', message: '', active: true, date: today() }));
  $('add-entry').addEventListener('click', () => addItem('entries', 'entries-list', { id: uid(), date: today(), title: '', category: 'Nós', mood: 'Com carinho', excerpt: '', content: '', featured: false }));
  $('add-milestone').addEventListener('click', () => addItem('milestones', 'milestones-list', { id: uid(), date: null, label: '', description: '' }));
  $('preview-button').addEventListener('click', (event) => {
    collectSettings(); persist();
    if (!storageWorking) { event.preventDefault(); showToast('A prévia precisa do armazenamento deste navegador. Você ainda pode baixar data.js.'); }
  });
  $('export-button').addEventListener('click', () => {
    if (!validateForExport()) return;
    persist();
    const content = `window.DIARY_DATA = ${JSON.stringify(data, null, 2)};\n`;
    const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'data.js'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('Arquivo preparado. Substitua data.js no GitHub para publicar.');
  });
  $('import-button').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('O arquivo deve ter até 10 MB.');
      let text = (await file.text()).replace(/^\uFEFF/, '').trim();
      text = text.replace(/^window\.DIARY_DATA\s*=\s*/, '').replace(/;\s*$/, '');
      const imported = normalize(JSON.parse(text));
      if (!window.confirm('Importar este arquivo e substituir o rascunho deste navegador?')) return;
      data = imported; renderAll(); persist(); showToast('Arquivo importado. Revise suas páginas antes de publicar.');
    } catch (error) { showToast(error instanceof SyntaxError ? 'Não foi possível ler o arquivo. Use um data.js ou JSON exportado pelo editor.' : error.message); }
    finally { $('import-file').value = ''; }
  });
  $('restore-button').addEventListener('click', () => {
    if (!window.confirm('Substituir o rascunho pela versão de data.js carregada neste editor? As mudanças locais serão descartadas.')) return;
    data = clone(published); renderAll(); persist(); showToast('Rascunho restaurado a partir de data.js.');
  });
  window.addEventListener('pagehide', () => { collectSettings(); persist(); });
})();
