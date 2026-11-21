import { siteMeta, units } from './data.js?v=20261121k';

const intro = units.find((unit) => unit.id === 'intro');
const contact = units.find((unit) => unit.id === 'contact');
const workUnits = units.filter((unit) => !['intro', 'works', 'contact'].includes(unit.id));

const categoryMap = {
  illustration: '手绘作品',
  graphic: '展板设计',
  interactive: '展板设计',
  resonance: '交互设计',
  modeling: '空间设计',
  installation: '装置艺术',
  ip: 'IP设计',
  huaxia: '展板设计',
  zhihui: '空间设计',
  dorm: '空间设计',
  bloom: '装置艺术',
  wedding: '空间设计',
};
const categoryOf = (unit) => (unit.id.startsWith('sketch-') ? '手绘作品' : categoryMap[unit.id] || '其他作品');
const isDrawing = (unit) => categoryOf(unit) === '手绘作品';
const carouselUnits = workUnits.filter((unit) => !isDrawing(unit));
const drawingUnits = workUnits.filter(isDrawing);
const categories = [...new Set([...carouselUnits.map(categoryOf), '手绘作品'])];

const grid = document.querySelector('#work-grid');
const filters = document.querySelector('#work-filters');
const modal = document.querySelector('#project-modal');
const toast = document.querySelector('#toast');
let railPauseUntil = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function renderIntro() {
  document.querySelector('#about-portrait').src = intro.hotspots[0].image;
  document.querySelector('#about-paragraphs').innerHTML = intro.left.paragraphs
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');

  document.querySelector('#about-skills').innerHTML = (intro.skills || [])
    .map(
      (skill) => `
        <div class="skill reveal" style="--level: ${skill.level}%">
          <span class="skill-name">${skill.name}</span>
          <span class="skill-track"><span class="skill-bar"></span></span>
          <span class="skill-value">${skill.level}%</span>
        </div>`
    )
    .join('');
}

function renderContact() {
  document.querySelector('#mail-link').textContent = siteMeta.email;
  document.querySelector('#mail-link').href = `mailto:${siteMeta.email}`;
  document.querySelector('#contact-qr').src = contact.hotspots[0].image;
  document.querySelector('#contact-facts').innerHTML = contact.left.facts
    .map((fact) => `<span>${fact.label}：${fact.value}</span>`)
    .join('');
}

function renderFilters() {
  const options = ['全部', ...categories];
  filters.innerHTML = options
    .map(
      (option, index) => `
        <button class="filter ${index === 0 ? 'is-active' : ''}" type="button" data-filter="${option}">
          ${option}
        </button>`
    )
    .join('');

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filters.querySelectorAll('.filter').forEach((item) => item.classList.toggle('is-active', item === button));
    renderWorks(button.dataset.filter);
  });
}

function renderWorks(filter = '全部') {
  const isDrawingFilter = filter === '手绘作品';
  const source = isDrawingFilter ? drawingUnits : carouselUnits;
  const list = source.filter((unit) => filter === '全部' || isDrawingFilter || categoryOf(unit) === filter);
  const loop = !isDrawingFilter && list.length >= 5;
  grid.dataset.loop = loop ? 'true' : 'false';
  grid.dataset.static = isDrawingFilter ? 'true' : 'false';
  grid.classList.toggle('is-static', isDrawingFilter);
  document.querySelector('.rail-actions')?.classList.toggle('is-hidden', isDrawingFilter);

  const cardMarkup = (unit, clone = false) => {
    const image = unit.hotspots[0]?.image || '';
    return `
      <button class="work-card ${clone ? '' : 'reveal'}" type="button" data-work-id="${unit.id}" title="${categoryOf(unit)}" ${clone ? 'aria-hidden="true" tabindex="-1"' : ''}>
        <img src="${image}" alt="${unit.title}" loading="lazy" />
        <span class="work-arrow">↗</span>
        <span class="work-info">
          <h3>${unit.title}</h3>
        </span>
      </button>`;
  };

  const original = list.map((unit) => cardMarkup(unit)).join('');
  grid.innerHTML = original + (loop ? list.map((unit) => cardMarkup(unit, true)).join('') : '');

  grid.scrollLeft = 0;
  observeReveals(grid);
}

function openProject(unit) {
  const meta = [
    { label: 'CATEGORY', value: categoryOf(unit) },
    ...unit.left.facts.map((fact) => ({ label: fact.label, value: fact.value })),
    { label: 'INDEX', value: unit.kicker },
  ];
  document.querySelector('#modal-meta').innerHTML = meta
    .map((item) => `<div><span>${item.label}</span><strong>${item.value}</strong></div>`)
    .join('');

  const paragraphs = [
    ...unit.left.paragraphs,
    ...unit.right.sections.map((section) => `${section.title}：${section.body}`),
    ...unit.hotspots.map((hotspot) => hotspot.description).filter(Boolean),
  ]
    .map((text) => `<p>${text}</p>`)
    .join('');

  document.querySelector('#modal-kicker').textContent = `${categoryOf(unit)} · PROJECT DETAIL`;
  document.querySelector('#modal-title').textContent = unit.title;
  document.querySelector('#modal-lead').textContent = unit.left.lead;
  document.querySelector('#modal-body').innerHTML = paragraphs;
  document.querySelector('#modal-gallery').innerHTML = unit.hotspots
    .map(
      (hotspot) => `
        <figure>
          <img src="${hotspot.image}" alt="${hotspot.title}" loading="lazy" />
          <figcaption>${hotspot.title} · ${hotspot.caption || ''}</figcaption>
        </figure>`
    )
    .join('');

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeProject() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

function initScratch() {
  const wrap = document.querySelector('#scratch-wrap');
  const canvas = document.querySelector('#scratch-canvas');
  const reset = document.querySelector('#scratch-reset');
  if (!wrap || !canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let drawing = false;
  let last = null;

  function paintCover() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff2e93';
    ctx.fillRect(0, 0, width, height);
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintCover();
  }

  function position(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function scratch(point) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 54;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (last) {
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    } else {
      ctx.arc(point.x, point.y, 27, 0, Math.PI * 2);
      ctx.fill();
    }
    last = point;
  }

  canvas.addEventListener('pointerdown', (event) => {
    drawing = true;
    last = null;
    canvas.setPointerCapture?.(event.pointerId);
    scratch(position(event));
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drawing) scratch(position(event));
  });
  const stop = () => {
    drawing = false;
    last = null;
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  reset?.addEventListener('click', paintCover);
  window.addEventListener('resize', resize);

  resize();
}

function initRailAutoScroll() {
  let paused = false;
  let phase = 0;
  grid.addEventListener('pointerenter', () => { paused = true; });
  grid.addEventListener('pointerleave', () => { paused = false; });

  function updateFocus() {
    const center = grid.scrollLeft + grid.clientWidth / 2;
    grid.querySelectorAll('.work-card').forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - center);
      const focus = Math.max(0.86, 1 - Math.min(distance / (grid.clientWidth * 0.7), 1) * 0.14);
      card.style.setProperty('--focus', focus.toFixed(3));
      card.style.setProperty('--focus-opacity', (0.55 + focus * 0.45).toFixed(2));
    });
  }

  grid.addEventListener('scroll', updateFocus);

  function loop() {
    if (!paused && grid.dataset.static !== 'true' && Date.now() > railPauseUntil && modal.hidden && grid.scrollWidth > grid.clientWidth) {
      if (grid.dataset.loop === 'true') {
        const half = grid.scrollWidth / 2;
        let next = grid.scrollLeft + 0.9;
        if (next >= half) next -= half;
        grid.scrollLeft = next;
      } else {
        const max = grid.scrollWidth - grid.clientWidth;
        phase += 0.006;
        grid.scrollLeft = (max / 2) * (1 + Math.sin(phase));
      }
      updateFocus();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  updateFocus();
}

function bindEvents() {
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-work-id]');
    if (!card) return;
    const unit = workUnits.find((item) => item.id === card.dataset.workId);
    if (unit) openProject(unit);
  });

  document.querySelector('#rail-prev')?.addEventListener('click', () => {
    railPauseUntil = Date.now() + 1800;
    grid.scrollBy({ left: -grid.clientWidth * 0.7, behavior: 'smooth' });
  });
  document.querySelector('#rail-next')?.addEventListener('click', () => {
    railPauseUntil = Date.now() + 1800;
    grid.scrollBy({ left: grid.clientWidth * 0.7, behavior: 'smooth' });
  });

  modal.querySelectorAll('[data-close]').forEach((element) => element.addEventListener('click', closeProject));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeProject();
  });

  document.querySelector('#contact-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = `来自个人网站的消息：${data.get('name')}`;
    const body = `${data.get('message')}\n\n—— ${data.get('name')} (${data.get('email')})`;
    window.location.href = `mailto:${siteMeta.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast('已为你打开邮件客户端');
  });

  const nav = document.querySelector('#nav');
  const progress = document.querySelector('#scroll-progress');
  const updateScrollState = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 20);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener('scroll', updateScrollState);
  updateScrollState();
}

const observedRevealTargets = new WeakSet();
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  },
  { threshold: 0.12 }
);

function observeReveals(scope = document) {
  scope.querySelectorAll('.reveal').forEach((target) => {
    if (observedRevealTargets.has(target)) return;
    observedRevealTargets.add(target);
    revealObserver.observe(target);
  });
}

function bindNavigation() {
  const links = [...document.querySelectorAll('.nav-links a')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    },
    { rootMargin: '-35% 0px -55% 0px' }
  );
  sections.forEach((section) => observer.observe(section));
}

function bindCursorGlow() {
  const glow = document.querySelector('#cursor-glow');
  const dot = document.querySelector('#cursor-dot');
  const ring = document.querySelector('#cursor-ring');
  if (!glow || !dot || !ring) return;

  document.body.classList.add('has-custom-cursor');

  const themes = {
    pink: { color: '#ff2e93', glow: 'rgba(255, 46, 147, 0.26)' },
    blue: { color: '#62e6ff', glow: 'rgba(98, 230, 255, 0.25)' },
    dark: { color: '#4de8ce', glow: 'rgba(77, 232, 206, 0.30)' },
    lime: { color: '#dcff57', glow: 'rgba(220, 255, 87, 0.28)' },
  };

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let ringX = targetX;
  let ringY = targetY;
  let currentMode = '';

  const initialTransform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
  dot.style.transform = initialTransform;
  glow.style.transform = initialTransform;

  function setMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    const theme = themes[mode];
    document.documentElement.style.setProperty('--cursor-color', theme.color);
    document.documentElement.style.setProperty('--cursor-glow', theme.glow);
    glow.dataset.mode = mode;
  }

  document.addEventListener('pointermove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    const cursorTransform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
    dot.style.transform = cursorTransform;
    glow.style.transform = cursorTransform;

    const under = document.elementFromPoint(targetX, targetY);
    const section = under?.closest('.hero, .about, .works, .contact, .modal');
    let mode = 'pink';
    if (section?.classList.contains('works') || section?.classList.contains('modal')) mode = 'dark';
    else if (section?.classList.contains('about')) mode = 'blue';
    else if (section?.classList.contains('contact')) mode = 'lime';
    setMode(mode);

    ring.classList.toggle('is-hover', Boolean(under?.closest('a, button, .work-card, .gallery-figure')));
  });

  function animateRing() {
    ringX += (targetX - ringX) * 0.2;
    ringY += (targetY - ringY) * 0.2;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();
}

renderIntro();
renderContact();
renderFilters();
renderWorks();
initRailAutoScroll();
bindEvents();
bindNavigation();
bindCursorGlow();
initScratch();
observeReveals();
