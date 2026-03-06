/**
 * AEP Web SDK tracking: page views and link clicks.
 * Fires via alloy() so it works regardless of Launch rules.
 * Requires Launch + Web SDK to load (window.alloy).
 * Uses onPageActivation (prerender-aware) and documentUnloading per reference martech.
 */
// eslint-disable-next-line no-console
console.log('[AEP] aep-tracking.js module loaded');

function onPageActivation(cb) {
  if (document.prerendering) {
    document.addEventListener('prerenderingchange', cb, { once: true });
  } else {
    cb();
  }
}

function waitForAlloy(maxWait = 10000) {
  return new Promise((resolve) => {
    if (typeof window.alloy === 'function') {
      resolve();
      return;
    }
    const start = Date.now();
    const check = () => {
      if (typeof window.alloy === 'function') {
        resolve();
        return;
      }
      if (Date.now() - start > maxWait) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

function sendPageView() {
  // eslint-disable-next-line no-console
  console.log('[AEP] sendPageView called');
  if (typeof window.alloy !== 'function') return;
  try {
    window.alloy('sendEvent', {
      documentUnloading: true,
      xdm: {
        _demoemea: {},
        eventType: 'web.webpagedetails.pageViews',
        web: {
          webPageDetails: {
            name: document.title || '',
            URL: window.location.href,
            pageViews: { value: 1 },
          },
          webReferrer: {
            URL: document.referrer || '',
          },
        },
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('AEP page view failed:', e);
  }
}

function sendLinkClick(link) {
  if (typeof window.alloy !== 'function') return;
  try {
    const href = link.href || '';
    const name = (link.textContent || link.getAttribute('aria-label') || href).trim().substring(0, 255);
    window.alloy('sendEvent', {
      documentUnloading: true,
      xdm: {
        _demoemea: {},
        eventType: 'web.webinteraction.linkClicks',
        web: {
          webInteraction: {
            name: name || href,
            URL: href,
            linkClicks: { value: 1 },
          },
          webPageDetails: {
            URL: window.location.href,
          },
          webReferrer: {
            URL: document.referrer || '',
          },
        },
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('AEP link click failed:', e);
  }
}

function setupLinkClickTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.href;
    if (!href || href.startsWith('javascript:') || href === '#') return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin && !href.startsWith('/')) return;
    sendLinkClick(link);
  }, true);
}

export async function initAepTracking() {
  // eslint-disable-next-line no-console
  console.log('[AEP] initAepTracking called');
  await waitForAlloy();
  // eslint-disable-next-line no-console
  console.log('[AEP] alloy ready:', typeof window.alloy === 'function');
  if (typeof window.alloy !== 'function') {
    // Fallback: retry when load completes (Launch may load alloy late)
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        if (typeof window.alloy === 'function') {
          onPageActivation(sendPageView);
        }
      });
    }
    setupLinkClickTracking();
    return;
  }
  onPageActivation(sendPageView);
  setupLinkClickTracking();
}
