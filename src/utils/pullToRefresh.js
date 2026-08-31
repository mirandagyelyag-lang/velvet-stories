const REFRESH_THRESHOLD = 76;
const START_SLOP = 8;
const MAX_PULL = 118;

const SCROLL_OWNER_SELECTOR = [
  '.app--chat .chat__content',
  '.app__content',
].join(',');

const BLOCKED_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="dialog"]',
  '.memory-book',
  '.story-hub',
  '.relationship-drawer',
  '.conversation-picker',
  '.group-story-sheet',
  '.message-sheet',
  '.director-sheet',
  '.chat-controls',
  '.chat__menu',
  '.character-profile-sheet',
  '.catchup-card',
  '.v312-cast-peek',
  '.world-studio',
  '.story-setup-sheet',
  '.character-studio-lite',
  '.character-studio',
  '.timeline-drawer',
  '.memory-editor',
].join(',');

function keyboardIsOpen() {
  const viewport = window.visualViewport;
  if (!viewport) return false;
  return viewport.height < window.innerHeight * 0.78;
}

function getScrollOwner(target) {
  if (!(target instanceof Element)) return null;
  const direct = target.closest(SCROLL_OWNER_SELECTOR);
  if (direct) return direct;
  if (target.closest('.app')) {
    return document.querySelector('.app--chat .chat__content') || document.querySelector('.app__content');
  }
  return null;
}

function ownerIsAtTop(owner) {
  return owner && owner.scrollTop <= 1;
}

function createIndicator() {
  const node = document.createElement('div');
  node.className = 'velvet-pull-refresh';
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = `
    <span class="velvet-pull-refresh__icon" aria-hidden="true">↻</span>
    <span class="velvet-pull-refresh__label">Pull to refresh</span>
  `;
  document.body.appendChild(node);
  return node;
}

async function refreshPage(indicator) {
  indicator.classList.add('is-refreshing');
  indicator.classList.remove('is-ready');
  const label = indicator.querySelector('.velvet-pull-refresh__label');
  if (label) label.textContent = 'Refreshing…';

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await Promise.race([
          registration.update().catch(() => undefined),
          new Promise((resolve) => window.setTimeout(resolve, 450)),
        ]);
      }
    }
  } catch {
    // Refreshing the current route is still useful even if the SW update check fails.
  }

  window.location.reload();
}

export function installVelvetPullToRefresh() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (!('ontouchstart' in window) && navigator.maxTouchPoints <= 0) return () => {};
  if (window.__VELVET_PULL_TO_REFRESH_INSTALLED__) return window.__VELVET_PULL_TO_REFRESH_CLEANUP__ || (() => {});

  window.__VELVET_PULL_TO_REFRESH_INSTALLED__ = true;

  let indicator = null;
  let owner = null;
  let startX = 0;
  let startY = 0;
  let pullDistance = 0;
  let tracking = false;
  let pulling = false;
  let cancelled = false;

  const resetIndicator = () => {
    if (!indicator) return;
    indicator.classList.remove('is-visible', 'is-ready', 'is-refreshing');
    indicator.style.setProperty('--pull-progress', '0');
    const label = indicator.querySelector('.velvet-pull-refresh__label');
    if (label) label.textContent = 'Pull to refresh';
  };

  const reset = () => {
    tracking = false;
    pulling = false;
    cancelled = false;
    owner = null;
    pullDistance = 0;
    resetIndicator();
  };

  const onTouchStart = (event) => {
    if (event.touches.length !== 1 || keyboardIsOpen()) return reset();
    const target = event.target;
    if (!(target instanceof Element) || target.closest(BLOCKED_SELECTOR)) return reset();

    const candidate = getScrollOwner(target);
    if (!ownerIsAtTop(candidate)) return reset();

    const touch = event.touches[0];
    owner = candidate;
    startX = touch.clientX;
    startY = touch.clientY;
    pullDistance = 0;
    tracking = true;
    pulling = false;
    cancelled = false;
  };

  const onTouchMove = (event) => {
    if (!tracking || cancelled || event.touches.length !== 1 || !owner) return;
    if (!ownerIsAtTop(owner)) return reset();

    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!pulling) {
      if (Math.abs(dx) < START_SLOP && Math.abs(dy) < START_SLOP) return;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) * 0.9) {
        cancelled = true;
        return;
      }
      pulling = true;
      indicator ||= createIndicator();
    }

    if (dy <= 0) return reset();

    // Keep the document visually locked while still offering a native-feeling pull gesture.
    event.preventDefault();

    pullDistance = Math.min(MAX_PULL, dy * 0.72);
    const progress = Math.min(1, pullDistance / REFRESH_THRESHOLD);
    indicator.style.setProperty('--pull-progress', String(progress));
    indicator.classList.add('is-visible');

    const ready = pullDistance >= REFRESH_THRESHOLD;
    indicator.classList.toggle('is-ready', ready);
    const label = indicator.querySelector('.velvet-pull-refresh__label');
    if (label) label.textContent = ready ? 'Release to refresh' : 'Pull to refresh';
  };

  const onTouchEnd = () => {
    if (!tracking) return reset();
    const shouldRefresh = pulling && pullDistance >= REFRESH_THRESHOLD;
    if (shouldRefresh && indicator) {
      tracking = false;
      pulling = false;
      refreshPage(indicator);
      return;
    }
    reset();
  };

  const onTouchCancel = () => reset();

  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onTouchCancel, { passive: true, capture: true });

  const cleanup = () => {
    document.removeEventListener('touchstart', onTouchStart, true);
    document.removeEventListener('touchmove', onTouchMove, true);
    document.removeEventListener('touchend', onTouchEnd, true);
    document.removeEventListener('touchcancel', onTouchCancel, true);
    indicator?.remove();
    delete window.__VELVET_PULL_TO_REFRESH_INSTALLED__;
    delete window.__VELVET_PULL_TO_REFRESH_CLEANUP__;
  };

  window.__VELVET_PULL_TO_REFRESH_CLEANUP__ = cleanup;
  return cleanup;
}
