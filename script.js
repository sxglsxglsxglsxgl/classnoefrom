(function() {
  const { SENTENCES } = window.SITE_CONFIG || {};
  if (!Array.isArray(SENTENCES) || SENTENCES.length === 0) return;

  const list = document.getElementById('sentences');
  if (!list) return;

  const total = SENTENCES.length;
  const nodes = SENTENCES.map((text, index) => {
    const sentence = document.createElement('p');
    sentence.className = 'sentence';
    sentence.textContent = text;
    sentence.setAttribute('role', 'listitem');
    sentence.setAttribute('aria-setsize', total);
    sentence.setAttribute('aria-posinset', String(index + 1));
    list.appendChild(sentence);
    return sentence;
  });

  let activeIndex = -1;
  const revealed = new Set();
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
        node.classList.remove('is-past');
        node.classList.remove('is-active');
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

    activeIndex = closestIndex;
    applyStates(activeIndex);
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

(function() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const overlay = document.querySelector('[data-menu-overlay]');
  if (!toggle || !overlay) return;

  const toggleLabel = toggle.querySelector('[data-menu-toggle-label]');
  const menuLinks = overlay.querySelectorAll('[data-menu-link]');
  const initialFocusTarget = overlay.querySelector('[data-menu-initial-focus]');
  const focusableSelector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let lastFocusedElement = null;

  function setToggleLabel(isOpen) {
    const label = isOpen ? 'Закрыть меню' : 'Открыть меню';
    if (toggleLabel) toggleLabel.textContent = label;
    toggle.setAttribute('aria-label', label);
  }

  function lockScroll() {
    document.body.classList.add('menu-open');
  }

  function unlockScroll() {
    document.body.classList.remove('menu-open');
  }

  function getFocusableElements() {
    const elements = Array.from(overlay.querySelectorAll(focusableSelector));
    return elements.filter(el => {
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      return el.offsetParent !== null || el instanceof SVGElement;
    });
  }

  function handleKeydown(event) {
    if (!overlay.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === overlay) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openMenu() {
    if (overlay.classList.contains('is-open')) return;

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    toggle.classList.add('is-active');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('tabindex', '-1');
    setToggleLabel(true);
    lockScroll();

    document.addEventListener('keydown', handleKeydown);

    requestAnimationFrame(() => {
      const fallback = getFocusableElements()[0];
      const target = initialFocusTarget instanceof HTMLElement ? initialFocusTarget : fallback;
      if (target) target.focus();
    });
  }

  function closeMenu() {
    if (!overlay.classList.contains('is-open')) return;

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.removeAttribute('tabindex');
    setToggleLabel(false);
    document.removeEventListener('keydown', handleKeydown);
    unlockScroll();

    const returnFocusTarget = lastFocusedElement && typeof lastFocusedElement.focus === 'function'
      ? lastFocusedElement
      : toggle;

    requestAnimationFrame(() => {
      returnFocusTarget.focus();
    });
  }

  toggle.addEventListener('click', () => {
    if (overlay.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeMenu();
    }
  });

  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  setToggleLabel(false);
})();
