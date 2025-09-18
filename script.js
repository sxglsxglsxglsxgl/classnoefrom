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
