(() => {
  const PAGE = 24;
  const list = document.getElementById('films-list');
  const wall = document.getElementById('films-wall');
  if (!list || !wall) return;

  const reviews = Array.from(list.querySelectorAll('.films-review'));
  const tiles = Array.from(wall.querySelectorAll('.films-wall-item'));
  const search = document.getElementById('films-search');
  const yearSelect = document.getElementById('films-year');
  const countLabel = document.getElementById('films-count');
  const empty = document.getElementById('films-empty');
  const more = document.getElementById('films-more');
  const state = { rating: 'all', year: 'all', q: '', view: 'list', shown: PAGE };

  // ---- Stats & charts, computed from the full watched list ----
  const rated = tiles.map((t) => Number(t.dataset.rating)).filter((r) => r > 0);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  const avgEl = document.getElementById('films-avg');
  if (avgEl && rated.length) avgEl.textContent = avg.toFixed(2);

  const years = {};
  tiles.forEach((t) => { if (t.dataset.year) years[t.dataset.year] = (years[t.dataset.year] || 0) + 1; });
  const yearKeys = Object.keys(years).sort();
  yearKeys.slice().reverse().forEach((y) => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  const drawBars = (el, rows, onPick) => {
    if (!el) return;
    const max = Math.max(1, ...rows.map((r) => r.value));
    const tip = document.createElement('div');
    tip.className = 'films-tip';
    tip.hidden = true;
    rows.forEach((r) => {
      const bar = document.createElement('div');
      bar.className = 'films-bar';
      bar.tabIndex = 0;
      bar.setAttribute('role', 'button');
      bar.setAttribute('aria-label', `${r.label}: ${r.value}`);
      const fill = document.createElement('i');
      fill.style.height = `${(r.value / max) * 100}%`;
      const value = document.createElement('em');
      value.textContent = r.value;
      value.style.bottom = `calc(${(r.value / max) * 100}% + 3px)`;
      const label = document.createElement('b');
      label.textContent = r.short || r.label;
      bar.append(fill, value, label);
      const show = () => {
        tip.innerHTML = `${r.label} · <strong>${r.value}</strong> ${r.unit}`;
        tip.hidden = false;
        tip.style.left = `${bar.offsetLeft + bar.offsetWidth / 2}px`;
        tip.style.top = `${bar.offsetTop + bar.offsetHeight * (1 - r.value / max) - 18}px`;
      };
      bar.addEventListener('mouseenter', show);
      bar.addEventListener('focus', show);
      bar.addEventListener('mouseleave', () => { tip.hidden = true; });
      bar.addEventListener('blur', () => { tip.hidden = true; });
      if (onPick) {
        bar.style.cursor = 'pointer';
        bar.addEventListener('click', () => onPick(r));
        bar.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(r); } });
      }
      el.appendChild(bar);
    });
    el.appendChild(tip);
  };

  const scrollToArchive = () => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });

  drawBars(document.getElementById('chart-rating'), [1, 2, 3, 4, 5].map((s) => ({
    key: s, label: `${s} star${s > 1 ? 's' : ''}`, short: `★${s}`, unit: 'films',
    value: rated.filter((r) => r === s).length,
  })), (r) => { setRating(r.key <= 2 ? 'low' : String(r.key)); scrollToArchive(); });

  drawBars(document.getElementById('chart-year'), yearKeys.map((y) => ({
    key: y, label: y, short: yearKeys.length > 8 ? `’${y.slice(2)}` : y, unit: 'films logged', value: years[y],
  })), (r) => { yearSelect.value = r.key; state.year = r.key; reset(); scrollToArchive(); });

  // ---- Filtering ----
  const matches = (el) => {
    const r = Number(el.dataset.rating);
    if (state.rating === 'low' && !(r >= 1 && r <= 2)) return false;
    if (state.rating !== 'all' && state.rating !== 'low' && r !== Number(state.rating)) return false;
    if (state.year !== 'all' && el.dataset.year !== state.year) return false;
    if (state.q && !el.dataset.search.includes(state.q)
        && !(el.querySelector('.films-comment')?.textContent.toLowerCase().includes(state.q))) return false;
    return true;
  };

  const render = () => {
    const items = state.view === 'list' ? reviews : tiles;
    let hits = 0;
    items.forEach((el) => {
      const ok = matches(el);
      if (ok) hits += 1;
      el.classList.toggle('is-hidden', !ok || hits > state.shown);
    });
    list.hidden = state.view !== 'list';
    wall.hidden = state.view !== 'wall';
    empty.hidden = hits > 0;
    more.hidden = hits <= state.shown;
    more.textContent = `Load more (${hits - Math.min(hits, state.shown)} left)`;
    countLabel.textContent = state.view === 'list' ? `${hits} review${hits === 1 ? '' : 's'}` : `${hits} film${hits === 1 ? '' : 's'}`;
  };

  const reset = () => { state.shown = state.view === 'wall' ? PAGE * 2 : PAGE; render(); };

  const setRating = (value) => {
    state.rating = value;
    document.querySelectorAll('[data-rating]').forEach((b) => {
      if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.rating === value));
    });
    reset();
  };

  document.querySelectorAll('button[data-rating]').forEach((b) => b.addEventListener('click', () => setRating(b.dataset.rating)));
  document.querySelectorAll('button[data-view]').forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    document.querySelectorAll('button[data-view]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    reset();
  }));
  yearSelect.addEventListener('change', () => { state.year = yearSelect.value; reset(); });
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = search.value.trim().toLowerCase(); reset(); }, 120);
  });
  more.addEventListener('click', () => { state.shown += state.view === 'wall' ? PAGE * 2 : PAGE; render(); });

  // A link to #review-<id> (e.g. from the five-star shelf) must reveal that card even if paged out.
  const revealHash = () => {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (!target || !target.classList.contains('films-review')) return;
    if (state.view !== 'list' || !matches(target)) {
      state.view = 'list'; state.rating = 'all'; state.year = 'all'; state.q = '';
      search.value = ''; yearSelect.value = 'all'; setRating('all');
      document.querySelectorAll('button[data-view]').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.view === 'list')));
    }
    while (target.classList.contains('is-hidden') && state.shown < reviews.length) { state.shown += PAGE; render(); }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  window.addEventListener('hashchange', revealHash);

  reset();
  revealHash();
})();
