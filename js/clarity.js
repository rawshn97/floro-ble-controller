/** Microsoft Clarity for FloRo Remote (rawshn.com/floro-remote/). */

export const CLARITY_PROJECT_ID = 'yakgofwgk3';

export function trackClarityEvent(name) {
  if (typeof window.clarity !== 'function' || !name) return;
  window.clarity('event', name);
}

export function initClarity() {
  if (window.__floroClarityReady) return;
  window.__floroClarityReady = true;

  trackClarityEvent('sc_app_open');
  if (typeof window.clarity === 'function') {
    window.clarity('set', 'app', 'floro-remote');
  }

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target?.closest?.('[data-clarity-event]');
      if (!target) return;
      const name = target.getAttribute('data-clarity-event')?.trim();
      if (name) trackClarityEvent(name);
    },
    { capture: true },
  );
}
