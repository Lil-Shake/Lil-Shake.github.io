// Music page: shows the index (stats, timeline, cards) or one band, chosen by the URL hash.
// Without this script the page lists everything in order and the same links still work.
(() => {
  const root = document.getElementById('music');
  if (!root) return;

  const BAND_PREFIX = '#band-';
  const baseTitle = document.title;
  const bands = Array.from(root.querySelectorAll('.music-band'));
  let shownBand = null;

  const bandFromHash = () => {
    if (!location.hash.startsWith(BAND_PREFIX)) return null;
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch (err) {
      return null; // malformed escape in a hand-edited URL: fall back to the index
    }
    return bands.find((band) => band.id === id) || null;
  };

  const route = () => {
    const open = bandFromHash();
    root.dataset.view = open ? 'band' : 'index';
    bands.forEach((band) => band.classList.toggle('is-open', band === open));
    document.title = open ? `${open.dataset.name} · ${baseTitle}` : baseTitle;

    if (open && open !== shownBand) {
      window.scrollTo(0, 0);
      const heading = open.querySelector('.music-band-name');
      if (heading) heading.focus({ preventScroll: true });
    } else if (!open && shownBand) {
      // Coming back from a band: land on the section the link pointed at, or on the cards.
      const target = document.getElementById(location.hash.slice(1)) || document.getElementById('bands');
      if (target) target.scrollIntoView();
    }
    shownBand = open;
  };

  root.classList.add('is-js');
  window.addEventListener('hashchange', route);
  route();
})();
