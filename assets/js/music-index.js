// Music page, index view: the interactive version of the timeline.
// Groups bands by any dimension, filters them, switches between the chart and a list, and shows
// how the selected band is tied to the others. Reads the slim copy of the data that
// scripts/music_sync.py writes (inlined as #music-data). If anything is missing, the static
// timeline rendered by Jekyll stays in place.
(() => {
  const root = document.getElementById('music');
  const source = document.getElementById('music-data');
  const controls = document.getElementById('music-controls');
  const board = document.getElementById('music-board');
  const stage = document.getElementById('music-stage');
  const panel = document.getElementById('music-panel');
  const legend = document.getElementById('music-legend');
  const countLabel = document.getElementById('music-count');
  if (!root || !source || !controls || !board || !stage || !panel) return;

  let index;
  try {
    index = JSON.parse(source.textContent);
  } catch (err) {
    return; // unreadable data: keep the static timeline
  }
  if (!index || !Array.isArray(index.bands) || !Array.isArray(index.dims) || !index.bands.length) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const THIS_YEAR = new Date().getFullYear();
  const DECADE = 'decade';
  const DEFAULT_GROUP = 'country';
  const VIEWS = [['chart', '时间谱'], ['list', '清单']];
  const STATUSES = [['all', '全部'], ['like', '喜欢'], ['explore', '想了解']];
  const STATUS_LABEL = { like: '喜欢', explore: '想了解' };
  const ALWAYS_GROUPABLE = ['country', 'genres'];
  const PLACE_DIMS = ['country', 'city'];
  const PANEL_CHIP_LIMIT = 40;
  const PANEL_LINK_LIMIT = 12;
  const CHART = { padLeft: 12, padRight: 190, top: 28, laneHead: 30, row: 40, laneGap: 10, minYearWidth: 9,
    barTop: 22, barHeight: 5, storyRadius: 3.2, nameChar: 16, namePad: 70, padYears: 2 };

  const bands = index.bands;
  const dims = index.dims;
  const byId = new Map(bands.map((band) => [band.id, band]));
  const low = (text) => text.toLowerCase();
  const valuesOf = (band, key) => band.values[key] || [];
  const dimOf = (key) => dims.find((dim) => dim.key === key);

  // ---- Small DOM builders: text always goes in as text nodes ----

  const fill = (el, attrs, kids) => {
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    });
    kids.flat(3).forEach((kid) => {
      if (kid == null || kid === false) return;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });
    return el;
  };
  const h = (tag, attrs, ...kids) => fill(document.createElement(tag), attrs, kids);
  const s = (tag, attrs, ...kids) => fill(document.createElementNS(SVG_NS, tag), attrs, kids);

  // ---- State, mirrored in the query string so a filtered view can be shared ----

  const readUrl = () => {
    const params = new URLSearchParams(location.search);
    const key = params.get('fk');
    const value = params.get('fv');
    return {
      view: params.get('view') === 'list' ? 'list' : 'chart',
      group: params.get('group') || DEFAULT_GROUP,
      status: ['like', 'explore'].includes(params.get('only')) ? params.get('only') : 'all',
      filter: key && value && dimOf(key) ? { key, value } : null,
      selected: null,
    };
  };

  const writeUrl = (state) => {
    const params = new URLSearchParams();
    if (state.view !== 'chart') params.set('view', state.view);
    if (state.group !== DEFAULT_GROUP) params.set('group', state.group);
    if (state.status !== 'all') params.set('only', state.status);
    if (state.filter) {
      params.set('fk', state.filter.key);
      params.set('fv', state.filter.value);
    }
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
  };

  let state = readUrl();
  const update = (patch) => {
    state = { ...state, ...patch };
    render();
  };

  // ---- Derived data ----

  const groupOptions = () => {
    const options = [];
    dims.forEach((dim) => {
      if (ALWAYS_GROUPABLE.includes(dim.key) || bands.some((band) => valuesOf(band, dim.key).length)) {
        options.push([dim.key, dim.label]);
      }
      if (dim.key === 'genres') options.push([DECADE, '年代']);
    });
    return options;
  };

  const groupKey = (band) => {
    if (state.group === DECADE) return band.formed ? `${Math.floor(band.formed / 10) * 10} 年代` : '年份未填';
    const dim = dimOf(state.group) || dims[0];
    return valuesOf(band, dim.key)[0] || `${dim.label}未填`;
  };

  const visibleBands = () => bands.filter((band) => (state.status === 'all' || band.status === state.status)
    && (!state.filter || valuesOf(band, state.filter.key).some((value) => low(value) === low(state.filter.value))));

  const byFormed = (a, b) => (a.formed || 9999) - (b.formed || 9999) || a.name.localeCompare(b.name);

  const grouped = (list) => {
    const groups = new Map();
    list.forEach((band) => {
      const key = groupKey(band);
      groups.set(key, [...(groups.get(key) || []), band]);
    });
    const firstYear = (members) => Math.min(...members.map((band) => band.formed || 9999));
    return [...groups.entries()]
      .map(([key, members]) => [key, [...members].sort(byFormed)])
      .sort((a, b) => firstYear(a[1]) - firstYear(b[1]) || a[0].localeCompare(b[0]));
  };

  const linksOf = (band) => band.links.filter((link) => byId.has(link.id))
    .map((link) => ({ ...link, band: byId.get(link.id) }));

  // ---- Actions ----

  const openBand = (id) => { location.hash = `#band-${id}`; };

  const select = (id, scrollIntoView) => {
    if (state.selected === id && !scrollIntoView) {
      openBand(id);
      return;
    }
    update({ selected: id });
    if (!scrollIntoView) return;
    const row = stage.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', inline: 'center' });
  };

  const toggleFilter = (key, value) => {
    const same = state.filter && state.filter.key === key && low(state.filter.value) === low(value);
    update({ filter: same ? null : { key, value } });
  };

  const chip = (key, value, count) => h('button', { type: 'button', class: 'music-chip',
    'aria-pressed': String(!!state.filter && state.filter.key === key && low(state.filter.value) === low(value)),
    onclick: () => toggleFilter(key, value) }, value, count ? h('small', null, count) : null);

  // ---- Controls ----

  const segment = (label, options, current, onPick) => h('div', { class: 'music-seg', role: 'group', 'aria-label': label },
    h('span', null, label),
    options.map(([value, text]) => h('button', { type: 'button', 'aria-pressed': String(value === current),
      onclick: () => onPick(value) }, text)));

  const renderControls = () => {
    const groupSelect = h('select', { id: 'music-group',
      onchange: (event) => update({ group: event.target.value }) },
      groupOptions().map(([value, text]) => h('option', { value, selected: value === state.group }, text)));
    const clear = state.filter && h('button', { type: 'button', class: 'music-clear',
      onclick: () => update({ filter: null }) },
      `只看${dimOf(state.filter.key).label}：${state.filter.value}`, h('span', { 'aria-hidden': 'true' }, ' ×'),
      h('span', { class: 'music-sr' }, '，取消筛选'));
    controls.replaceChildren(
      segment('视图', VIEWS, state.view, (view) => update({ view })),
      h('label', { class: 'music-seg' }, h('span', null, '分组'), groupSelect),
      segment('只看', STATUSES, state.status, (status) => update({ status })),
      clear || '');
    controls.hidden = false;
  };

  // ---- Chart: lanes of bands on a shared year axis ----

  const renderChart = (list) => {
    const formedYears = list.map((band) => band.formed).filter(Boolean);
    const startYear = formedYears.length
      ? Math.floor((Math.min(...formedYears) - CHART.padYears) / 10) * 10 : THIS_YEAR - 60;
    const endYear = THIS_YEAR + 1;
    const available = stage.clientWidth || 800;
    const yearWidth = Math.max(CHART.minYearWidth,
      (available - CHART.padLeft - CHART.padRight) / (endYear - startYear));
    const width = Math.round(CHART.padLeft + CHART.padRight + yearWidth * (endYear - startYear));
    const x = (year) => CHART.padLeft + (year - startYear) * yearWidth;

    const positions = new Map();
    const lanes = [];
    let y = CHART.top;
    grouped(list).forEach(([key, members]) => {
      lanes.push({ key, y, size: members.length });
      y += CHART.laneHead;
      members.forEach((band) => {
        positions.set(band.id, { x: band.formed ? x(band.formed) : x(startYear), y });
        y += CHART.row;
      });
      y += CHART.laneGap;
    });
    const height = y + 6;
    const barMiddle = CHART.barTop + CHART.barHeight / 2;

    const svg = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': '乐队时间谱' });
    const grid = s('g', { class: 'music-grid' });
    for (let decade = Math.ceil(startYear / 10) * 10; decade <= endYear; decade += 10) {
      grid.append(s('line', { x1: x(decade), x2: x(decade), y1: 18, y2: height }),
        s('text', { x: x(decade) + 5, y: 12 }, decade));
    }
    svg.append(grid);
    lanes.forEach((lane) => svg.append(s('g', { class: 'music-lane' },
      s('line', { x1: 0, x2: width, y1: lane.y + CHART.laneHead - 6, y2: lane.y + CHART.laneHead - 6 }),
      s('text', { x: 0, y: lane.y + CHART.laneHead - 14 }, lane.key, s('tspan', { dx: 8 }, lane.size)))));

    const selected = state.selected ? list.find((band) => band.id === state.selected) : null;
    const linked = new Map();
    if (selected) {
      linksOf(selected).filter((link) => list.includes(link.band)).forEach((link) => linked.set(link.id, link));
      const from = positions.get(selected.id);
      linked.forEach((link) => {
        const to = positions.get(link.id);
        const left = Math.min(from.x, to.x) - Math.min(58, 22 + Math.abs(to.y - from.y) * 0.12);
        svg.append(s('path', { class: 'music-arc', 'stroke-width': Math.min(3.5, 0.8 + link.score * 0.22),
          d: `M${from.x} ${from.y + barMiddle} C${left} ${from.y + barMiddle}, ${left} ${to.y + barMiddle}, ${to.x} ${to.y + barMiddle}` }));
      });
    }

    list.forEach((band) => {
      const at = positions.get(band.id);
      const isSelected = !!selected && selected.id === band.id;
      const dimmed = !!selected && !isSelected && !linked.has(band.id);
      const row = s('g', { class: `music-row${isSelected ? ' is-selected' : ''}${dimmed ? ' is-dim' : ''}`,
        tabindex: 0, role: 'button', 'data-id': band.id, 'aria-pressed': String(isSelected),
        'aria-label': `${band.name}，${STATUS_LABEL[band.status]}，${band.where}，${band.years}`,
        onclick: () => select(band.id),
        onkeydown: (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          select(band.id);
        } });
      const barWidth = band.formed ? Math.max(6, x(Math.min(band.ended || THIS_YEAR, endYear)) - at.x) : 0;
      const nameWidth = band.name.length * CHART.nameChar + CHART.namePad;
      row.append(
        s('rect', { class: 'music-halo', x: at.x - 8, y: at.y + 1, width: Math.max(barWidth + 28, nameWidth), height: CHART.row - 4, rx: 2 }),
        s('text', { class: 'music-row-name', x: at.x, y: at.y + 15 }, band.name,
          s('tspan', { class: 'music-row-years', dx: 8 }, band.formed ? band.years : '年份未填')));
      if (band.formed) {
        row.append(s('rect', { class: `music-bar music-bar--${band.status}`, x: at.x, y: at.y + CHART.barTop, width: barWidth, height: CHART.barHeight }));
        row.append(band.ended
          ? s('line', { class: 'music-bar-end', x1: at.x + barWidth, x2: at.x + barWidth, y1: at.y + CHART.barTop - 4, y2: at.y + CHART.barTop + CHART.barHeight + 4 })
          : s('line', { class: 'music-bar-on', x1: at.x + barWidth + 3, x2: at.x + barWidth + 18, y1: at.y + barMiddle, y2: at.y + barMiddle }));
      } else {
        row.append(s('line', { class: 'music-bar-unknown', x1: at.x, x2: at.x + 140, y1: at.y + barMiddle, y2: at.y + barMiddle }));
      }
      band.stories.filter((story) => story.year >= startYear && story.year <= endYear).forEach((story) => {
        row.append(s('circle', { class: 'music-story', cx: x(story.year), cy: at.y + barMiddle, r: CHART.storyRadius },
          s('title', null, `${story.year} ${story.title}`)));
      });
      svg.append(row);
    });

    const scroller = stage.querySelector('.music-chart');
    const scrollLeft = scroller ? scroller.scrollLeft : 0;
    const chart = h('div', { class: 'music-chart' }, svg);
    stage.replaceChildren(chart);
    chart.scrollLeft = scrollLeft;
  };

  // ---- List ----

  const renderList = (list) => {
    stage.replaceChildren(h('div', { class: 'music-list' }, grouped(list).map(([key, members]) => [
      h('h3', null, key, h('span', null, members.length)),
      members.map((band) => h('button', { type: 'button', class: `music-list-row music-list-row--${band.status}`,
        'data-id': band.id, 'aria-current': String(state.selected === band.id), onclick: () => select(band.id) },
        h('strong', null, band.name), h('span', null, band.where), h('span', null, band.years),
        h('span', null, valuesOf(band, 'genres').join('、') || '类型未填'))),
    ])));
  };

  // ---- Side panel ----

  const renderGuide = () => {
    const dim = dimOf(state.group === DECADE ? 'genres' : state.group) || dimOf('genres');
    const counts = new Map();
    bands.forEach((band) => valuesOf(band, dim.key).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1)));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, PANEL_CHIP_LIMIT);
    return [
      h('h4', null, '怎么用'),
      h('p', null, '点一支乐队，看它和谁有关联。再点一次，进入它的详情。'),
      top.length ? [h('h4', null, `按${dim.label}筛选`),
        h('div', { class: 'music-chips' }, top.map(([value, count]) => chip(dim.key, value, count)))] : null,
      h('p', { class: 'note' }, '分组可以换成任何填过的维度。'),
    ];
  };

  const renderSelected = (band, list) => {
    const links = linksOf(band);
    const hidden = links.filter((link) => !list.includes(link.band)).length;
    const dimRows = dims.filter((dim) => !PLACE_DIMS.includes(dim.key) && valuesOf(band, dim.key).length)
      .map((dim) => [h('h4', null, dim.label),
        h('div', { class: 'music-chips' }, valuesOf(band, dim.key).map((value) => chip(dim.key, value)))]);
    return [
      h('h3', { class: 'music-panel-name' }, band.name),
      h('p', { class: 'music-panel-where' },
        h('span', { class: `music-status music-status--${band.status}` }, STATUS_LABEL[band.status]),
        `${band.where} · ${band.years}`),
      h('div', { class: 'music-panel-acts' },
        h('button', { type: 'button', class: 'text-btn', onclick: () => openBand(band.id) }, '进入详情'),
        h('button', { type: 'button', class: 'text-btn', onclick: () => update({ selected: null }) }, '取消选中')),
      h('p', { class: 'note' },
        `详情里有 ${band.counts.releases} 张唱片，${band.counts.people} 位人物，${band.counts.stories} 条故事。`),
      dimRows,
      band.note ? [h('h4', null, '笔记'), h('p', { class: 'music-panel-note' }, band.note)] : null,
      h('h4', null, links.length ? '关联的乐队' : '关联'),
      links.length
        ? h('ul', { class: 'music-links' }, links.slice(0, PANEL_LINK_LIMIT).map((link) => h('li', null,
          h('button', { type: 'button', class: 'music-link-btn', onclick: () => select(link.id, true) }, link.band.name),
          h('p', null, link.reasons.join('；')))))
        : h('p', null, '索引里暂时没有和它共享足够多维度的乐队。'),
      hidden ? h('p', { class: 'note' }, `其中 ${hidden} 支被当前筛选隐藏了。`) : null,
    ];
  };

  // ---- Render ----

  const render = () => {
    if (!groupOptions().some(([value]) => value === state.group)) state = { ...state, group: DEFAULT_GROUP };
    if (state.filter && !dimOf(state.filter.key)) state = { ...state, filter: null };
    if (state.selected && !byId.has(state.selected)) state = { ...state, selected: null };

    const list = visibleBands();
    renderControls();
    if (!list.length) {
      stage.replaceChildren(h('p', { class: 'music-empty' }, '当前筛选下没有乐队。换一个筛选条件试试。'));
    } else if (state.view === 'chart') {
      renderChart(list);
    } else {
      renderList(list);
    }
    if (legend) legend.hidden = state.view !== 'chart' || !list.length;
    if (countLabel) {
      countLabel.textContent = list.length === bands.length ? `${bands.length} bands` : `${list.length} / ${bands.length} bands`;
    }

    const selected = state.selected ? byId.get(state.selected) : null;
    panel.replaceChildren(...[selected ? renderSelected(selected, list) : renderGuide()].flat(4).filter(Boolean));
    panel.hidden = false;

    const shown = new Set(list.map((band) => band.id));
    root.querySelectorAll('.music-card[data-band]').forEach((card) => { card.hidden = !shown.has(card.dataset.band); });
    writeUrl(state);
  };

  board.classList.add('is-live');
  render();

  // The chart is sized to its container, so redraw it when the width changes.
  let lastWidth = stage.clientWidth;
  let pending = 0;
  new ResizeObserver(() => {
    if (stage.clientWidth === lastWidth || !stage.clientWidth) return;
    lastWidth = stage.clientWidth;
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { if (state.view === 'chart') render(); });
  }).observe(stage);
})();
