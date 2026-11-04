(() => {
  const figures = document.querySelectorAll('.paper-figure');
  if (!figures.length) return;

  const preview = document.createElement('dialog');
  preview.className = 'figure-preview';
  preview.id = 'figure-preview';
  preview.setAttribute('aria-label', 'Enlarged paper figure');

  const enlarged = document.createElement('img');
  enlarged.decoding = 'async';
  preview.append(enlarged);
  document.body.append(preview);

  let opener = null;

  function close() {
    preview.close();
  }

  figures.forEach(figure => {
    figure.setAttribute('aria-haspopup', 'dialog');
    figure.setAttribute('aria-controls', preview.id);
    figure.addEventListener('click', () => {
      const image = figure.querySelector('img');
      if (!image || preview.open) return;
      opener = figure;
      enlarged.src = image.dataset.fullSrc || image.currentSrc || image.src;
      enlarged.alt = image.alt;
      preview.showModal();
      document.documentElement.classList.add('figure-preview-open');
    });
  });

  // A backdrop click targets the dialog; clicking the image keeps it open.
  preview.addEventListener('click', event => {
    if (event.target === preview) close();
  });
  preview.addEventListener('close', () => {
    document.documentElement.classList.remove('figure-preview-open');
    opener?.focus({ preventScroll: true });
    opener = null;
  });
  // Native dialog handles Escape, focus trapping, and an inert background.
})();
