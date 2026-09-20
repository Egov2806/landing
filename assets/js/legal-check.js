(() => {
  'use strict';

  const PRODUCTS = [
    {
      id: 'contracts',
      category: 'people',
      title: 'ДОГОВОРЫ',
      summary: 'Проверьте договор до того, как подпишете.',
      description: 'Чек-листы и инструкции, которые помогут увидеть существенные условия, риски и слабые места договора до возникновения проблемы.',
      image: 'contracts',
      href: '#products',
      imageAlt: 'Папка с договором, золотая печать и весы правосудия.',
      imagePosition: '56% 50%',
      mobileImagePosition: '50% 62%'
    },
    {
      id: 'team',
      category: 'people',
      title: 'КОМАНДА',
      summary: 'Проверьте, как защищен ваш бизнес внутри команды.',
      description: 'Сотрудники, подрядчики, самозанятые, результаты работы, конфиденциальность и права на созданный контент.',
      image: 'team',
      href: '#products',
      imageAlt: 'Светлая переговорная с круглым столом и креслами для команды.',
      imagePosition: '50% 50%',
      mobileImagePosition: '50% 50%'
    },
    {
      id: 'intellectual-property',
      category: 'product',
      title: 'ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ',
      summary: 'Проверьте, действительно ли вам принадлежит то, что вы создали.',
      description: 'Бренд, контент, методики, дизайн, фото, видео, тексты и другие результаты интеллектуальной деятельности.',
      image: 'intellectual-property',
      href: '#products',
      imageAlt: 'Золотой знак авторского права, скульптура и эскизы бренда.',
      imagePosition: '54% 50%',
      mobileImagePosition: '50% 47%'
    },
    {
      id: 'advertising',
      category: 'product',
      title: 'РЕКЛАМА',
      summary: 'Проверьте рекламу до того, как ее увидят все.',
      description: 'Чек-листы для проверки рекламных материалов, размещений, интеграций и других рекламных активностей бизнеса.',
      image: 'advertising',
      href: '#products',
      imageAlt: 'Планшет с рекламным макетом, мудборд и фотоаппарат.',
      imagePosition: '66% 50%',
      mobileImagePosition: '50% 47%'
    },
    {
      id: 'personal-data',
      category: 'security',
      title: 'ПЕРСОНАЛЬНЫЕ ДАННЫЕ',
      summary: 'Проверьте, как ваш бизнес работает с персональными данными.',
      description: 'Сайт, формы, CRM, рассылки, мессенджеры, документы и процессы, в которых появляются персональные данные.',
      image: 'personal-data',
      href: '#products',
      imageAlt: 'Ноутбук с интерфейсом защиты персональных данных и символом замка.',
      imagePosition: '55% 50%',
      mobileImagePosition: '50% 45%'
    },
    {
      id: 'taxes',
      category: 'security',
      title: 'НАЛОГИ',
      summary: 'Проверьте налоговую сторону бизнеса до того, как проверят вас.',
      description: 'Практические материалы, которые помогают разобраться в налоговых вопросах и увидеть потенциальные риски в своей модели работы.',
      image: 'taxes',
      href: '#products',
      imageAlt: 'Калькулятор, налоговая отчётность и финансовые диаграммы.',
      imagePosition: '35% 50%',
      mobileImagePosition: '50% 54%'
    }
  ];

  const IMAGES = {
    contracts: '/assets/design/lc-contracts.webp',
    team: '/assets/design/lc-team.webp',
    'intellectual-property': '/assets/design/lc-intellectual-property.webp',
    advertising: '/assets/design/lc-advertising.webp',
    'personal-data': '/assets/design/lc-personal-data.webp',
    taxes: '/assets/design/lc-taxes.webp'
  };

  const CATEGORY_LABELS = {
    people: 'БИЗНЕС И ЛЮДИ',
    product: 'ПРОДУКТ И ПРОДАЖИ',
    security: 'БЕЗОПАСНОСТЬ БИЗНЕСА'
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const num = value => String(value).padStart(2, '0');
  const preload = new Map();

  function prepareImage(src) {
    if (!src) return Promise.resolve();
    if (!preload.has(src)) {
      const img = new Image();
      img.src = src;
      preload.set(src, typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve());
    }
    return preload.get(src);
  }

  Object.values(IMAGES).forEach(prepareImage);

  document.querySelectorAll('[data-legal-check]').forEach(root => {
    if (root.dataset.initialized === 'true' || !PRODUCTS.length) return;
    root.dataset.initialized = 'true';
    const q = selector => root.querySelector(selector);
    const feature = q('[data-feature]');
    const viewport = q('.legal-check__viewport');
    const tabs = Array.from(root.querySelectorAll('[data-category]'));
    const prev = q('[data-prev]');
    const next = q('[data-next]');
    const progress = q('[data-progress]');
    const link = q('[data-link]');
    const image = q('[data-image]');
    const refs = {
      category: q('[data-category-label]'),
      num: q('[data-num]'),
      title: q('[data-title]'),
      summary: q('[data-summary]'),
      description: q('[data-description]'),
      mobileDescription: q('[data-mobile-description]'),
      current: q('[data-current]'),
      announcement: q('[data-announcement]')
    };
    const total = PRODUCTS.length;
    const wrap = index => ((index % total) + total) % total;
    let current = 0;
    let sequence = 0;
    let pointerStart = null;
    q('[data-total]').textContent = num(total);

    PRODUCTS.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'progress__step';
      button.setAttribute('aria-label', `${index + 1}. ${item.title}`);
      button.setAttribute('aria-controls', viewport.id);
      button.addEventListener('click', () => goTo(index, index >= current ? 1 : -1));
      progress.appendChild(button);
    });
    const progressButtons = Array.from(progress.children);

    function renderPreview(element, index, side) {
      const item = PRODUCTS[index];
      element.dataset.id = item.id;
      element.querySelector(`[data-${side}-num]`).textContent = num(index + 1);
      element.querySelector(`[data-${side}-title]`).textContent = item.title;
      const img = element.querySelector(`[data-${side}-image]`);
      const src = IMAGES[item.image];
      if (img.getAttribute('src') !== src) img.src = src;
      element.setAttribute('aria-label', `${side === 'prev' ? 'Предыдущая' : 'Следующая'} тема: ${item.title}`);
    }

    function render(announce = true) {
      const item = PRODUCTS[current];
      const src = IMAGES[item.image];
      feature.dataset.id = item.id;
      feature.setAttribute('aria-label', `${current + 1} из ${total}: ${item.title}`);
      feature.style.setProperty('--lc-image-position', item.imagePosition || '50% 50%');
      feature.style.setProperty('--lc-image-position-mobile', item.mobileImagePosition || '50% 50%');
      refs.category.textContent = CATEGORY_LABELS[item.category] || '';
      refs.num.textContent = refs.current.textContent = num(current + 1);
      refs.title.textContent = item.title;
      refs.summary.textContent = item.summary;
      refs.description.textContent = refs.mobileDescription.textContent = item.description;
      if (image.getAttribute('src') !== src) image.src = src;
      image.alt = item.imageAlt || '';
      link.setAttribute('href', item.href);
      link.setAttribute('aria-label', `Смотреть продукты: ${item.title}`);
      tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.category === item.category)));
      progressButtons.forEach((button, index) => {
        if (index === current) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      renderPreview(prev, wrap(current - 1), 'prev');
      renderPreview(next, wrap(current + 1), 'next');
      if (announce) refs.announcement.textContent = `${current + 1} из ${total}. ${CATEGORY_LABELS[item.category]}. ${item.title}.`;
    }

    async function goTo(index, direction = 1) {
      const destination = wrap(index);
      const token = ++sequence;
      if (destination === current) return;
      await prepareImage(IMAGES[PRODUCTS[destination].image]);
      if (token !== sequence) return;
      current = destination;
      if (typeof feature.getAnimations === 'function') feature.getAnimations().forEach(animation => animation.cancel());
      render();
      if (!reducedMotion.matches && typeof image.animate === 'function') {
        image.getAnimations().forEach(animation => animation.cancel());
        image.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 230, easing: 'ease-out' });
      }
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        const target = PRODUCTS.findIndex(item => item.category === tab.dataset.category);
        if (target >= 0) goTo(target, target >= current ? 1 : -1);
      });
      tab.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = tabs.length - 1;
        else return;
        event.preventDefault();
        event.stopPropagation();
        tabs[target].focus();
        tabs[target].click();
      });
    });

    root.querySelectorAll('[data-arrow]').forEach(button => {
      button.addEventListener('click', () => {
        const direction = Number(button.dataset.arrow);
        goTo(current + direction, direction);
      });
    });
    prev.addEventListener('click', () => goTo(current - 1, -1));
    next.addEventListener('click', () => goTo(current + 1, 1));

    root.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        goTo(current + direction, direction);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        goTo(event.key === 'Home' ? 0 : total - 1);
      }
    });

    viewport.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || event.target.closest('button, a')) return;
      pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      if (viewport.setPointerCapture) viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointerup', event => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.35) goTo(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    viewport.addEventListener('pointercancel', () => { pointerStart = null; });
    viewport.addEventListener('lostpointercapture', () => { pointerStart = null; });

    render(false);
  });
})();
