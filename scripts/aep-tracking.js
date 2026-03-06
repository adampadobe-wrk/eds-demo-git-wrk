/**
 * AEP Web SDK tracking: page views and link clicks.
 * Fires via alloy() so it works regardless of Launch rules.
 * Requires Launch + Web SDK to load (window.alloy).
 */

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
  if (typeof window.alloy !== 'function') return;
  try {
    window.alloy('sendEvent', {
      xdm: {
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
      xdm: {
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
  await waitForAlloy();
  if (typeof window.alloy !== 'function') return;
  sendPageView();
  setupLinkClickTracking();
}
