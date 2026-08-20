(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealItems = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  }

  const filterButtons = document.querySelectorAll('[data-pub-filter]');
  const publications = document.querySelectorAll('#publication-list .list__item');
  const countLabel = document.querySelector('#pub-count');

  const applyFilter = (filter) => {
    let visible = 0;
    publications.forEach((item) => {
      const venueText = item.querySelector('.venue-badge')?.textContent || '';
      const is2026 = venueText.includes('2026');
      const shouldShow = filter === 'all' || (filter === '2026' && is2026) || (filter === 'earlier' && !is2026);
      item.classList.toggle('is-filtered-out', !shouldShow);
      if (shouldShow) visible += 1;
    });

    filterButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.pubFilter === filter));
    });

    if (countLabel) countLabel.textContent = `${visible} publication${visible === 1 ? '' : 's'}`;
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.pubFilter));
  });

  if (filterButtons.length && publications.length) applyFilter('all');
})();
