(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let data = window.DIARY_DATA;
  if (!data || !window.LoveTime) return;
  if (new URLSearchParams(location.search).get('rascunho') === '1') {
    try {
      const draft = JSON.parse(localStorage.getItem('diario-para-voce-draft-v1'));
      if (draft?.site && Array.isArray(draft.entries)) data = draft;
    } catch (_) { /* Published data is the fallback. */ }
  }
  const settings = data.loveClock || { startDate: '2026-11-09', startTime: '14:52' };
  const setText = (id, value) => { const element = $(id); if (element && element.textContent !== String(value)) element.textContent = value; };
  const number = new Intl.NumberFormat('pt-BR');
  const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const recipient = data.site.recipient || 'você';
  setText('love-recipient', recipient.toLocaleUpperCase('pt-BR'));
  setText('love-dedication', settings.message || 'Desde aquele dia, cada segundo tem um pouco de você.');
  const firstReading = window.LoveTime.calculate(settings.startDate, settings.startTime);
  if (!firstReading.valid) {
    document.querySelector('.love-card').classList.add('love-card-empty');
    setText('love-origin', 'Cada história tem o seu primeiro instante.');
    setText('love-next-month', 'Esta página está esperando a data do nosso começo.');
    document.querySelector('.love-live').hidden = true;
  } else {
    const origin = dateFormat.format(new Date(firstReading.startMs));
    const time = settings.startTime || '00:00';
    const originTime = document.createElement('time');
    originTime.dateTime = settings.startDate + 'T' + time + ':00-03:00';
    originTime.textContent = origin + ', às ' + time.replace(':', 'h');
    const zone = document.createElement('small');
    zone.textContent = 'HORÁRIO DE BRASÍLIA';
    $('love-origin').replaceChildren(document.createTextNode('Desde '), originTime, zone);
    $('love-counter').setAttribute('aria-label', 'Tempo apaixonado desde ' + origin + ', às ' + time.replace(':', 'h') + ', horário de Brasília');
    const units = [ ['years','ano','anos'], ['months','mês','meses'], ['days','dia','dias'], ['hours','hora','horas'], ['minutes','minuto','minutos'], ['seconds','segundo','segundos'] ];
    function tick() {
      const elapsed = window.LoveTime.calculate(settings.startDate, settings.startTime);
      if (!elapsed.valid) return;
      units.forEach(([key, singular, plural]) => {
        setText('love-' + key, String(elapsed[key]).padStart(2, '0'));
        setText('love-' + key + '-label', elapsed[key] === 1 ? singular : plural);
      });
      setText('love-total-hours', number.format(elapsed.totalHours));
      setText('love-total-minutes', number.format(elapsed.totalMinutes));
      setText('love-total-seconds', number.format(elapsed.totalSeconds));
      if (elapsed.future) setText('love-next-month', 'O primeiro segundo desta história começa em ' + origin + ', às ' + time.replace(':', 'h') + '.');
      else setText('love-next-month', 'Mais um mês apaixonado em ' + dateFormat.format(new Date(elapsed.nextMonthMs)) + '. Até lá, cada segundo conta.');
    }
    tick();
    // Recompute from the original instant; no accumulated interval or background-tab drift.
    const timer = setInterval(() => { if (!document.hidden) tick(); }, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    window.addEventListener('pageshow', tick);
    window.addEventListener('pagehide', (event) => { if (!event.persisted) clearInterval(timer); });
  }

  function safeMedia(value, image = false) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const raw = value.trim();
    if (image && /^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(raw)) return raw;
    if (/^https:\/\//i.test(raw)) {
      try { const url = new URL(raw); return url.username || url.password ? null : url.href; } catch (_) { return null; }
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(raw) || raw.startsWith('/') || raw.includes('\\') || raw.split('/').some((part) => part === '..' || part === '.')) return null;
    try { const decoded = decodeURIComponent(raw); if (decoded.includes('..') || decoded.includes('\\') || decoded.startsWith('//')) return null; } catch (_) { return null; }
    return raw;
  }
  const photos = (Array.isArray(settings.photos) ? settings.photos : []).slice(0, 6).filter((photo) => safeMedia(photo.src, true));
  const photoDialog = $('love-photo-dialog');
  photos.forEach((photo, index) => {
    const figure = document.createElement('figure');
    figure.className = 'love-photo';
    figure.style.margin = '0';
    const button = document.createElement('button');
    button.type = 'button';
    const caption = photo.caption || 'Uma lembrança para guardar';
    button.setAttribute('aria-label', 'Ampliar foto ' + (index + 1) + ': ' + caption);
    const image = document.createElement('img');
    image.src = safeMedia(photo.src, true);
    image.alt = caption;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'love-photo-error';
      fallback.textContent = 'Esta lembrança não carregou.';
      button.replaceChildren(fallback);
      button.disabled = true;
    }, { once: true });
    button.append(image);
    button.addEventListener('click', () => {
      $('love-photo-full').src = image.src;
      $('love-photo-full').alt = caption;
      setText('love-photo-caption', caption);
      photoDialog.showModal();
      $('love-photo-close').focus();
    });
    const captionElement = document.createElement('p');
    captionElement.textContent = caption;
    figure.append(button, captionElement);
    $('love-gallery').append(figure);
  });
  $('love-gallery-section').hidden = !photos.length;
  $('love-photo-close').addEventListener('click', () => photoDialog.close());
  photoDialog.addEventListener('click', (event) => {
    if (event.target !== photoDialog) return;
    const box = photoDialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) photoDialog.close();
  });
  const musicUrl = safeMedia(settings.music?.url);
  if (musicUrl) {
    const container = $('love-music');
    const icon = document.createElement('span');
    icon.className = 'love-music-icon';
    icon.textContent = '♫';
    icon.setAttribute('aria-hidden', 'true');
    const info = document.createElement('div');
    info.className = 'love-music-info';
    const label = document.createElement('small');
    label.textContent = 'UMA TRILHA PARA ESTAS PÁGINAS';
    const name = document.createElement('p');
    name.textContent = settings.music.title || 'Uma música que me lembra você';
    info.append(label, name);
    container.append(icon, info);
    if (/\.(mp3|ogg|wav|m4a)(?:[?#]|$)/i.test(musicUrl)) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'none';
      audio.src = musicUrl;
      audio.setAttribute('aria-label', name.textContent);
      container.append(audio);
    } else {
      const link = document.createElement('a');
      link.className = 'love-music-link';
      link.href = musicUrl;
      link.textContent = 'Ouvir a música ↗';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      container.append(link);
    }
    container.hidden = false;
  }
})();
