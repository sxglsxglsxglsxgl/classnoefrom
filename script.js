(function () {
  const { SENTENCES } = window.SITE_CONFIG || {};
  if (!Array.isArray(SENTENCES) || SENTENCES.length === 0) return;

  const container = document.getElementById('sentences');
  if (!container) return;

  const total = SENTENCES.length;
  const nodes = SENTENCES.map((text, index) => {
    const sentence = document.createElement('p');
    sentence.className = 'sentence';
    sentence.textContent = text;
    sentence.setAttribute('role', 'listitem');
    sentence.setAttribute('aria-setsize', String(total));
    sentence.setAttribute('aria-posinset', String(index + 1));
    container.appendChild(sentence);
    return sentence;
  });

  const revealed = new Set();
  let activeIndex = -1;
  let ticking = false;

  function applyStates(currentIndex) {
    nodes.forEach((node, index) => {
      const isActive = index === currentIndex;
      const isPast = index < currentIndex;
      const hasBeenRevealed = revealed.has(index) || isPast || isActive;

      if (isPast) {
        revealed.add(index);
      }

      node.classList.toggle('is-active', isActive);
      node.classList.toggle('is-past', isPast);
      node.classList.toggle('is-visible', hasBeenRevealed);

      if (!hasBeenRevealed) {
        node.classList.remove('is-past', 'is-active');
      }
    });
  }

  function updateActiveSentence() {
    const viewportCenter = window.innerHeight / 2;
    let closestIndex = -1;
    let smallestDistance = Infinity;

    nodes.forEach((node, index) => {
      const rect = node.getBoundingClientRect();
      const nodeCenter = rect.top + rect.height / 2;
      const distance = Math.abs(nodeCenter - viewportCenter);

      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex === -1) return;

    if (!revealed.has(closestIndex)) {
      revealed.add(closestIndex);
    }

    if (activeIndex !== closestIndex) {
      activeIndex = closestIndex;
      applyStates(activeIndex);
    }
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateActiveSentence();
    });
  }

  updateActiveSentence();
  requestAnimationFrame(updateActiveSentence);

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
})();

(function () {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('site-menu');
  if (!toggle || !menu) return;

  const menuContainer = menu.querySelector('.site-menu__container');
  const menuCloseTargets = menu.querySelectorAll('[data-menu-close]');
  const menuLinks = menu.querySelectorAll('[data-menu-link]');
  const focusAnchor = menu.querySelector('[data-menu-focus]');
  const toggleLabel = toggle.querySelector('.menu-toggle__label');

  let lastFocusedElement = null;
  let hideTimeoutId = null;

  function getFocusableElements() {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];
    return Array.from(menu.querySelectorAll(selectors.join(','))).filter((element) => {
      const isHidden = element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true';
      const isDisabled = element.getAttribute('aria-disabled') === 'true';
      const rect = element.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      return !isHidden && !isDisabled && isVisible;
    });
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first || !menu.contains(document.activeElement)) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    trapFocus(event);
  }

  function setExpandedState(isExpanded) {
    toggle.setAttribute('aria-expanded', String(isExpanded));
    if (toggleLabel) {
      toggleLabel.textContent = isExpanded ? 'Close' : 'Menu';
    }
  }

  function focusInitialElement() {
    const focusTarget = focusAnchor || menuContainer || menu;
    const target = focusTarget instanceof HTMLElement ? focusTarget : menu;
    requestAnimationFrame(() => {
      target.focus();
    });
  }

  function openMenu() {
    if (document.body.classList.contains('menu-open')) return;

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (hideTimeoutId !== null) {
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }

    menu.hidden = false;
    menu.removeAttribute('hidden');
    menu.setAttribute('aria-hidden', 'false');

    document.body.classList.add('menu-open');
    menu.classList.add('is-open');

    setExpandedState(true);
    focusInitialElement();

    document.addEventListener('keydown', handleKeydown);
  }

  function closeMenu({ focusToggle = true } = {}) {
    if (!document.body.classList.contains('menu-open')) return;

    document.body.classList.remove('menu-open');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    setExpandedState(false);
    document.removeEventListener('keydown', handleKeydown);

    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finalizeHide = () => {
      menu.setAttribute('hidden', '');
      menu.hidden = true;
    };

    if (prefersReducedMotion) {
      finalizeHide();
    } else {
      const handleTransitionEnd = (event) => {
        if (event.target !== menu || event.propertyName !== 'opacity') return;
        menu.removeEventListener('transitionend', handleTransitionEnd);
        if (hideTimeoutId !== null) {
          window.clearTimeout(hideTimeoutId);
          hideTimeoutId = null;
        }
        if (!document.body.classList.contains('menu-open') && !menu.classList.contains('is-open')) {
          finalizeHide();
        }
      };

      menu.addEventListener('transitionend', handleTransitionEnd);
      hideTimeoutId = window.setTimeout(() => {
        menu.removeEventListener('transitionend', handleTransitionEnd);
        finalizeHide();
        hideTimeoutId = null;
      }, 400);
    }

    const focusTarget = focusToggle
      ? toggle
      : lastFocusedElement && lastFocusedElement !== toggle && document.body.contains(lastFocusedElement)
        ? lastFocusedElement
        : null;

    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
  }

  toggle.addEventListener('click', () => {
    if (document.body.classList.contains('menu-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuCloseTargets.forEach((element) => {
    element.addEventListener('click', () => {
      closeMenu();
    });
  });

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu({ focusToggle: false });
    });
  });
})();
