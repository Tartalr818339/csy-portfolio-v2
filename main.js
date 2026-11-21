import { siteMeta, units } from './data.js?v=20261121a';

const intro = units.find((unit) => unit.id === 'intro');
const contact = units.find((unit) => unit.id === 'contact');
const workUnits = units.filter((unit) => !['intro', 'works', 'contact'].includes(unit.id));

const chapterAliases = { '装置艺术': '第五展区' };
const displayChapter = (chapter) => chapterAliases[chapter] || chapter;
const chapters = [...new Set(workUnits.map((unit) => displayChapter(unit.chapter)))];

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
  document.querySelector('#hero-portrait').src = intro.hotspots[0].image;
  document.querySelector('#about-portrait').src = intro.hotspots[0].image;
  document.querySelector('#about-lead').textContent = intro.left.lead;
  document.querySelector('#about-paragraphs').innerHTML = intro.left.paragraphs
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');

  const stats = [
    { value: workUnits.length, label: '件作品' },
    { value: chapters.length, label: '个展区' },
    { value: '2026', label: '作品集版本' },
  ];
  document.querySelector('#about-stats').innerHTML = stats
    .map((stat) => `<div class="stat"><strong>${stat.value}</strong><small>${stat.label}</small></div>`)
    .join('');

  const skills = intro.skills || [];
  document.querySelector('#about-skills').innerHTML = skills
    .map(
      (skill) => `
        <div class="skill" style="--level: ${skill.level}%">
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
  const options = ['全部', ...chapters];
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
  const list = workUnits.filter(
    (unit) => filter === '全部' || displayChapter(unit.chapter) === filter
  );

  grid.innerHTML = list
    .map((unit) => {
      const chapter = displayChapter(unit.chapter);
      const image = unit.hotspots[0]?.image || '';
      return `
        <button class="work-card" type="button" data-work-id="${unit.id}">
          <img src="${image}" alt="${unit.title}" loading="lazy" />
          <span class="work-arrow">↗</span>
          <span class="work-info">
            <span class="work-tag">${chapter} · ${unit.kicker.split(' · ')[0]}</span>
            <h3>${unit.title}</h3>
            <p>${unit.left.lead}</p>
          </span>
        </button>`;
    })
    .join('');

  grid.querySelectorAll('.work-card').forEach((card) => {
    card.classList.add('reveal');
  });
  observeReveals(grid);
}

function openProject(unit) {
  const chapter = displayChapter(unit.chapter);
  const gallery = unit.hotspots
    .map(
      (hotspot) => `
        <a href="${hotspot.image}" target="_blank" rel="noopener">
          <img src="${hotspot.image}" alt="${hotspot.title}" loading="lazy" />
        </a>`
    )
    .join('');

  const paragraphs = [
    ...unit.left.paragraphs,
    ...unit.right.sections.map((section) => `${section.title}：${section.body}`),
    ...unit.hotspots.map((hotspot) => hotspot.description).filter(Boolean),
  ]
    .map((text) => `<p>${text}</p>`)
    .join('');

  const facts = unit.left.facts
    .map((fact) => `<dt>${fact.label}</dt><dd>${fact.value}</dd>`)
    .join('');

  document.querySelector('#modal-kicker').textContent = `${chapter} · ${unit.kicker}`;
  document.querySelector('#modal-title').textContent = unit.title;
  document.querySelector('#modal-lead').textContent = unit.left.lead;
  document.querySelector('#modal-gallery').innerHTML = gallery;
  document.querySelector('#modal-body').innerHTML = `${paragraphs}<dl>${facts}</dl>`;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeProject() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

function bindEvents() {
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-work-id]');
    if (!card) return;
    const unit = workUnits.find((item) => item.id === card.dataset.workId);
    if (unit) openProject(unit);
  });

  modal.querySelectorAll('[data-close]').forEach((element) => {
    element.addEventListener('click', closeProject);
  });
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
  });
}

renderIntro();
renderContact();
renderFilters();
renderWorks();
bindEvents();
bindNavigation();
bindCursorGlow();
observeReveals();
