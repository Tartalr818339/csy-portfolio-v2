import { siteMeta, units } from './data.js?v=20261121e';

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
};
const categoryOf = (unit) => categoryMap[unit.id] || '其他作品';
const categories = [...new Set(workUnits.map(categoryOf))];

const grid = document.querySelector('#work-grid');
const filters = document.querySelector('#work-filters');
const modal = document.querySelector('#project-modal');
const toast = document.querySelector('#toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function renderIntro() {
  document.querySelector('#about-portrait').src = intro.hotspots[0].image;
  document.querySelector('#about-lead').textContent = intro.left.lead;
  document.querySelector('#about-paragraphs').innerHTML = intro.left.paragraphs
    .map((paragraph) => `<p>${paragraph}</p>`)
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
  const list = workUnits.filter((unit) => filter === '全部' || categoryOf(unit) === filter);
  const cardMarkup = (unit, clone = false) => {
    const image = unit.hotspots[0]?.image || '';
    return `
      <button class="work-card ${clone ? '' : 'reveal'}" type="button" data-work-id="${unit.id}" ${clone ? 'aria-hidden="true" tabindex="-1"' : ''}>
        <img src="${image}" alt="${unit.title}" loading="lazy" />
        <span class="work-arrow">↗</span>
        <span class="work-info">
          <span class="work-tag">${categoryOf(unit)}</span>
          <h3>${unit.title}</h3>
          <p>${unit.left.lead}</p>
        </span>
      </button>`;
  };

  grid.innerHTML =
    list.map((unit) => cardMarkup(unit)).join('') +
    list.map((unit) => cardMarkup(unit, true)).join('');

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
    if (!paused && modal.hidden && grid.scrollWidth > grid.clientWidth) {
      const half = grid.scrollWidth / 2;
      let next = grid.scrollLeft + 1.1;
      if (next >= half) next -= half;
      grid.scrollLeft = next;
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
    grid.scrollBy({ left: -grid.clientWidth * 0.7, behavior: 'smooth' });
  });
  document.querySelector('#rail-next')?.addEventListener('click', () => {
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
  window.addEventListener('scroll', () => nav.classList.toggle('is-scrolled', window.scrollY > 20));
}

function observeReveals(scope = document) {
  const targets = scope.querySelectorAll('.reveal:not(.is-visible)');
  if (!targets.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((target) => observer.observe(target));
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
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', (event) => {
    glow.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    glow.dataset.mode = under?.closest('.works, .modal') ? 'dark' : 'light';
  });
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
