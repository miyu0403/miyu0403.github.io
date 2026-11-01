(() => {
  const figures = document.querySelectorAll('.paper-figure');
  if (!figures.length) return;

  const preview = document.createElement('div');
  preview.className = 'figure-preview';
  preview.hidden = true;
  preview.setAttribute('aria-hidden', 'true');
  const enlarged = document.createElement('img');
  enlarged.alt = '';
  enlarged.decoding = 'async';
  preview.append(enlarged);
  document.body.append(preview);

  function hide() {
    preview.hidden = true;
  }

  function show(figure) {
    const image = figure.querySelector('img');
    if (!image) return;
    const margin = 16;
    const frame = 26; // Two 12px paddings and two 1px borders.
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    const topLimit = Math.max(margin, headerBottom + 12);
    const maxWidth = Math.min(900, window.innerWidth - margin * 2) - frame;
    const maxHeight = Math.min(620, window.innerHeight - topLimit - margin) - frame;
    if (maxWidth < 80 || maxHeight < 80) return hide();

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) return hide();
    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    const width = sourceWidth * scale + frame;
    const height = sourceHeight * scale + frame;
    const rect = figure.getBoundingClientRect();
    const left = Math.max(margin, Math.min(rect.right + 14, window.innerWidth - width - margin));
    const top = Math.max(topLimit, Math.min(rect.top + (rect.height - height) / 2, window.innerHeight - height - margin));

    const source = image.currentSrc || image.src;
    if (enlarged.src !== source) enlarged.src = source;
    Object.assign(preview.style, {
      width: `${width}px`, height: `${height}px`,
      left: `${left}px`, top: `${top}px`,
    });
    preview.hidden = false;
  }

  figures.forEach(figure => {
    figure.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && window.matchMedia('(any-hover: hover)').matches) show(figure);
    });
    figure.addEventListener('pointerleave', hide);
    figure.addEventListener('focus', () => {
      if (figure.matches(':focus-visible')) show(figure);
    });
    figure.addEventListener('blur', hide);
    figure.addEventListener('click', hide);
  });
  window.addEventListener('scroll', () => {
    const focused = document.activeElement;
    if (!preview.hidden && focused?.matches('.paper-figure:focus-visible')) show(focused);
    else hide();
  }, { passive: true });
  window.addEventListener('resize', hide);
  window.addEventListener('blur', hide);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
  });
})();
