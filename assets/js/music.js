// Music page, band view: shows the index or one band, chosen by the URL hash, and finishes the
// parts of a band page that need the browser (today's date, generated placeholder art).
// Without this script the page lists everything in order and the same links still work.
(() => {
  const root = document.getElementById('music');
  if (!root) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const FLASH_MS = 1800;
  const TILE_COLORS = ['var(--accent)', 'var(--star)', 'var(--ink-faint)', 'var(--ink)'];
  const baseTitle = document.title;
  const bands = Array.from(root.querySelectorAll('.music-band'));
  let shownBand = null;

  // ---- Routing: #band-<id> opens a band, #story-<id>-<n> opens it at one story ----

  const targetFromHash = () => {
    if (location.hash.length < 2) return null;
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch (err) {
      return null; // malformed escape in a hand-edited URL: fall back to the index
    }
    const el = document.getElementById(id);
    const band = el && el.closest('.music-band');
    return band ? { band, el } : null;
  };

  const flash = (el) => {
    el.classList.add('is-flash');
    setTimeout(() => el.classList.remove('is-flash'), FLASH_MS);
  };

  const route = () => {
    const target = targetFromHash();
    const open = target ? target.band : null;
    root.dataset.view = open ? 'band' : 'index';
    bands.forEach((band) => band.classList.toggle('is-open', band === open));
    document.title = open ? `${open.dataset.name} · ${baseTitle}` : baseTitle;

    if (open && target.el !== open) {
      target.el.scrollIntoView({ block: 'center' });
      flash(target.el);
    } else if (open && open !== shownBand) {
      window.scrollTo(0, 0);
      const heading = open.querySelector('.music-band-name');
      if (heading) heading.focus({ preventScroll: true });
    } else if (!open && shownBand) {
      // Coming back from a band: land on the section the link pointed at, or on the cards.
      const section = document.getElementById(location.hash.slice(1)) || document.getElementById('bands');
      if (section) section.scrollIntoView();
    }
    shownBand = open;
  };

  // ---- Live shows: split each list into upcoming and past around today ----

  const splitShows = (list) => {
    const today = new Date().toISOString().slice(0, 10);
    const items = Array.from(list.children);
    const upcoming = items.filter((li) => li.dataset.date >= today);
    const past = items.filter((li) => li.dataset.date < today).reverse();
    const parts = document.createDocumentFragment();
    const addGroup = (label, shows) => {
      const heading = document.createElement('h4');
      heading.className = 'music-shows-h';
      heading.textContent = label;
      const group = document.createElement('ul');
      group.className = 'music-shows';
      group.append(...shows);
      parts.append(heading, group);
    };
    if (upcoming.length) {
      addGroup('接下来', upcoming);
    } else {
      const none = document.createElement('p');
      none.className = 'note';
      none.textContent = '目前没有记录到接下来的演出。';
      parts.append(none);
    }
    if (past.length) addGroup('已经过去', past);
    list.replaceWith(parts);
  };

  // ---- Placeholder art: an abstract tile drawn from the name, shown until a real picture exists ----

  const hashText = (text) => {
    let x = 2166136261;
    for (const ch of text) x = Math.imul(x ^ ch.codePointAt(0), 16777619) >>> 0;
    return x;
  };

  const shape = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  };

  const drawTile = (seed) => {
    // Unsigned shifts throughout: the hash uses all 32 bits, and >> would turn half of them negative.
    const n = hashText(seed);
    const first = n % 4;
    const second = (first + 1 + ((n >>> 3) % 3)) % 4;
    const cx = 30 + ((n >>> 5) % 40);
    const cy = 30 + ((n >>> 9) % 40);
    const r = 16 + ((n >>> 13) % 20);
    const kind = (n >>> 17) % 3;
    const svg = shape('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
    svg.append(shape('rect', { width: 100, height: 100, style: 'fill:var(--wash)' }));
    if (kind === 0) {
      const tilt = ((n >>> 7) % 50) - 25;
      for (let i = 0; i < 7; i += 1) {
        svg.append(shape('rect', { x: -20, y: 2 + i * 15, width: 140, height: 6, transform: `rotate(${tilt} 50 50)`,
          style: `fill:${TILE_COLORS[second]};opacity:.6` }));
      }
    } else if (kind === 1) {
      for (let i = 5; i > 0; i -= 1) {
        svg.append(shape('circle', { cx: 100 - cx, cy: 100 - cy, r: i * 9,
          style: `fill:none;stroke:${TILE_COLORS[second]};stroke-width:3` }));
      }
    } else {
      svg.append(shape('rect', { x: 8 + ((n >>> 4) % 36), y: 8 + ((n >>> 8) % 36), width: 48, height: 48,
        style: `fill:${TILE_COLORS[second]};opacity:.75` }));
    }
    svg.append(
      shape('circle', { cx, cy, r, style: `fill:${TILE_COLORS[first]};opacity:.92` }),
      shape('circle', { cx: cx + 4, cy: cy + 4, r, style: 'fill:none;stroke:var(--ink);stroke-width:1.5' }),
    );
    return svg;
  };

  root.querySelectorAll('[data-shows]').forEach(splitShows);
  root.querySelectorAll('[data-tile]').forEach((el) => el.replaceChildren(drawTile(el.dataset.tile)));
  root.classList.add('is-js');
  window.addEventListener('hashchange', route);
  route();
})();
