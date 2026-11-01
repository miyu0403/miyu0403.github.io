(() => {
  const nav = document.querySelector('.top-nav');
  const header = document.querySelector('.site-header');
  const links = [...document.querySelectorAll('.top-nav a')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  if (!nav || !header || !links.length || sections.some(section => !section)) return;

  const indicator = document.createElement('span');
  indicator.className = 'nav-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  nav.prepend(indicator);

  let current = 0;
  let gesture = null;
  let holdTimer;
  let dragFrame = null;
  let suppressClick = false;
  let destination = links.findIndex(link => link.hash === window.location.hash);
  if (destination < 0) destination = null;

  function moveIndicator(index) {
    const link = links[index];
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.height = `${link.offsetHeight}px`;
    indicator.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
  }

  function updateCurrentSection() {
    if (gesture?.dragging) return;
    const readingLine = window.scrollY + header.offsetHeight + Math.min(100, window.innerHeight * 0.1);
    current = 0;
    sections.forEach((section, index) => {
      if (section.offsetTop <= readingLine) current = index;
    });
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = links.length - 1;
    }
    if (destination !== null) current = destination;
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    moveIndicator(current);
  }

  function updateLayout() {
    document.documentElement.style.setProperty('--nav-offset', `${header.offsetHeight + 24}px`);
    updateCurrentSection();
  }

  function linkAt(x, y) {
    const bounds = nav.getBoundingClientRect();
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
    let nearest = 0;
    let distance = Infinity;
    links.forEach((link, index) => {
      const rect = link.getBoundingClientRect();
      const dx = Math.max(rect.left - x, 0, x - rect.right);
      const dy = Math.max(rect.top - y, 0, y - rect.bottom);
      const next = dx ** 2 + dy ** 2;
      if (next < distance) {
        nearest = index;
        distance = next;
      }
    });
    return nearest;
  }

  function preview(x, y) {
    const grab = gesture.grab;
    const left = Math.max(grab.minX, Math.min(grab.maxX, grab.left + x - gesture.startX));
    const top = Math.max(grab.minY, Math.min(grab.maxY, grab.top + y - gesture.startY));
    const bounds = nav.getBoundingClientRect();
    const index = linkAt(bounds.left + nav.clientLeft + left + grab.width / 2, bounds.top + nav.clientTop + top + grab.height / 2);
    gesture.candidate = index;
    links.forEach((link, i) => link.classList.toggle('is-preview', i === index));
    const scale = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1.04;
    indicator.style.width = `${grab.width}px`;
    indicator.style.height = `${grab.height}px`;
    indicator.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${scale})`;
  }

  function beginDrag() {
    if (!gesture) return;
    window.clearTimeout(holdTimer);
    gesture.dragging = true;
    suppressClick = true;
    const index = linkAt(gesture.startX, gesture.startY) ?? current;
    const link = links[index];
    gesture.grab = {
      left: link.offsetLeft,
      top: link.offsetTop,
      width: link.offsetWidth,
      height: link.offsetHeight,
      minX: Math.min(...links.map(item => item.offsetLeft)),
      maxX: Math.max(...links.map(item => item.offsetLeft + item.offsetWidth)) - link.offsetWidth,
      minY: Math.min(...links.map(item => item.offsetTop)),
      maxY: Math.max(...links.map(item => item.offsetTop + item.offsetHeight)) - link.offsetHeight,
    };
    nav.setPointerCapture(gesture.id);
    nav.classList.add('is-dragging');
    preview(gesture.x, gesture.y);
  }

  function finishGesture(event, cancelled = false) {
    if (!gesture || (event?.pointerId !== undefined && event.pointerId !== gesture.id)) return;
    if (dragFrame !== null) window.cancelAnimationFrame(dragFrame);
    dragFrame = null;
    if (!cancelled && gesture.dragging) preview(event.clientX, event.clientY);
    const finished = gesture;
    const canDrop = !cancelled && finished.dragging && linkAt(event.clientX, event.clientY) !== null;
    const target = canDrop ? finished.candidate : null;
    window.clearTimeout(holdTimer);
    gesture = null;
    nav.classList.remove('is-dragging');
    links.forEach(link => link.classList.remove('is-preview'));
    if (nav.hasPointerCapture(finished.id)) nav.releasePointerCapture(finished.id);
    if (target !== null) {
      destination = target;
      const link = links[target];
      if (window.location.hash === link.hash) {
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        sections[target].scrollIntoView({ behavior, block: 'start' });
      } else window.location.hash = link.hash;
    }
    updateCurrentSection();
  }

  nav.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || gesture) return;
    suppressClick = false;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, dragging: false };
    holdTimer = window.setTimeout(beginDrag, 240);
  });
  window.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    gesture.x = event.clientX;
    gesture.y = event.clientY;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) beginDrag();
    if (gesture.dragging && dragFrame === null) {
      dragFrame = window.requestAnimationFrame(() => {
        dragFrame = null;
        if (gesture?.dragging) preview(gesture.x, gesture.y);
      });
    }
  });
  window.addEventListener('pointerup', event => finishGesture(event));
  window.addEventListener('pointercancel', event => finishGesture(event, true));
  window.addEventListener('blur', () => finishGesture(null, true));
  nav.addEventListener('lostpointercapture', event => finishGesture(event, true));
  nav.addEventListener('dragstart', event => event.preventDefault());
  nav.addEventListener('contextmenu', event => {
    if (gesture) event.preventDefault();
  });
  nav.addEventListener('click', event => {
    const suppress = suppressClick && event.detail !== 0;
    suppressClick = false;
    if (suppress) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const index = links.indexOf(event.target.closest('a'));
    if (index >= 0 && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      destination = index;
      updateCurrentSection();
    }
  }, true);
  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape' && gesture) finishGesture(null, true);
  });
  window.addEventListener('wheel', () => { destination = null; }, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (!nav.contains(event.target)) destination = null;
  });
  window.addEventListener('touchstart', event => {
    if (!nav.contains(event.target)) destination = null;
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) destination = null;
  });

  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      updateCurrentSection();
      queued = false;
    });
  }, { passive: true });
  window.addEventListener('resize', () => {
    finishGesture(null, true);
    updateLayout();
  });
  window.addEventListener('hashchange', () => {
    destination = links.findIndex(link => link.hash === window.location.hash);
    if (destination < 0) destination = null;
    updateCurrentSection();
  });
  window.addEventListener('load', updateLayout);
  if (document.fonts) document.fonts.ready.then(updateLayout);
  updateLayout();
  nav.classList.add('has-indicator');
})();
