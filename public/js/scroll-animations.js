/**
 * ====================================================================
 * SCROLL REVEAL OBSERVER & SMOOTH SCROLLER
 * Profesionales Ecuador
 * ====================================================================
 */

(function () {
  'use strict';

  // 1. Skip on dashboards & admin
  const currentPath = window.location.pathname.toLowerCase();
  if (
    currentPath.startsWith('/dashboard') ||
    currentPath.startsWith('/admin') ||
    currentPath.includes('/admin-')
  ) {
    return;
  }

  function initScrollReveals() {
    const elements = document.querySelectorAll('[data-reveal], .sr-reveal, .reveal-init');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.05
      }
    );

    // Stagger containers
    const staggers = document.querySelectorAll('[data-reveal-stagger], .reveal-stagger');
    staggers.forEach(function (container) {
      const step = parseInt(container.getAttribute('data-stagger-step') || '80', 10);
      const maxDelay = parseInt(container.getAttribute('data-stagger-max') || '600', 10);
      const children = container.querySelectorAll(':scope > *');

      children.forEach(function (child, i) {
        if (!child.hasAttribute('data-reveal')) {
          child.setAttribute('data-reveal', 'fade-up');
        }
        const delay = Math.min(i * step, maxDelay);
        child.style.transitionDelay = delay + 'ms';
        observer.observe(child);
      });
    });

    elements.forEach(function (el) {
      if (!el.classList.contains('is-revealed')) {
        const delay = el.getAttribute('data-reveal-delay');
        if (delay) {
          el.style.transitionDelay = delay + 'ms';
        }
        observer.observe(el);
      }
    });
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollReveals);
  } else {
    initScrollReveals();
  }

  window.addEventListener('load', initScrollReveals);
  window.refreshScrollReveals = function () {
    setTimeout(initScrollReveals, 50);
  };
})();
