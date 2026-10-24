(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const mobile = window.matchMedia('(max-width: 600px)');
  const closeMenu = (restoreFocus = false) => {
    if (!menuButton || !nav) return;
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menuButton.focus();
  };
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (mobile.matches && !event.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('focusin', event => {
    if (mobile.matches && !event.target.closest('.site-header')) closeMenu();
  });
  mobile.addEventListener('change', () => closeMenu());
  document.querySelectorAll('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });

  const reveals = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    document.documentElement.classList.add('motion-enabled');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-pending');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight * 0.9) element.classList.add('is-pending');
      observer.observe(element);
    });
    reduceMotion.addEventListener('change', event => {
      if (event.matches) {
        reveals.forEach(element => element.classList.remove('is-pending'));
        document.documentElement.classList.remove('motion-enabled');
        observer.disconnect();
      }
    });
  }

  const progress = document.querySelector('.reading-progress');
  let scrollScheduled = false;
  const updateScroll = () => {
    const range = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY / range) : 0})`;
    scrollScheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollScheduled) { requestAnimationFrame(updateScroll); scrollScheduled = true; }
  }, { passive: true });
  window.addEventListener('resize', updateScroll);
  updateScroll();

  const sections = [...document.querySelectorAll('main section[id]')];
  if ('IntersectionObserver' in window && nav) {
    const activeSection = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        nav.querySelectorAll('a').forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-18% 0px -55% 0px' });
    sections.forEach(section => activeSection.observe(section));
  }

  const services = [...document.querySelectorAll('.service')];
  services.forEach(service => service.addEventListener('toggle', () => {
    if (service.open) services.forEach(other => { if (other !== service) other.open = false; });
  }));

  const copyButton = document.querySelector('.copy-email');
  const feedback = document.querySelector('.copy-feedback');
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('Andreas.metzner@Software-Metzner.de');
      feedback.textContent = 'E-Mail-Adresse kopiert.';
    } catch {
      feedback.textContent = 'Bitte die E-Mail-Adresse oben markieren und kopieren.';
    }
  });
})();
