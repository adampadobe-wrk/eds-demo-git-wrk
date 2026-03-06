'use strict';

/**
 * Initialize AEP Web SDK tracking: page views and link clicks.
 * Requires the Adobe Experience Platform Web SDK extension (window.alloy).
 * Uses onPageActivation (prerender-aware) and documentUnloading.
 */
module.exports = function (settings) {
  var includePageView = settings.includePageView !== false;
  var includeLinkClicks = settings.includeLinkClicks !== false;

  function onPageActivation(cb) {
    if (document.prerendering) {
      document.addEventListener('prerenderingchange', cb, { once: true });
    } else {
      cb();
    }
  }

  function waitForAlloy(maxWait) {
    maxWait = maxWait || 10000;
    return new Promise(function (resolve) {
      if (typeof window.alloy === 'function') {
        resolve();
        return;
      }
      var start = Date.now();
      var check = function () {
        if (typeof window.alloy === 'function') {
          resolve();
          return;
        }
        if (Date.now() - start > maxWait) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  function sendPageView() {
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
              pageViews: { value: 1 }
            },
            webReferrer: {
              URL: document.referrer || ''
            }
          }
        }
      });
    } catch (e) {
      console.warn('AEP page view failed:', e);
    }
  }

  function sendLinkClick(link) {
    if (typeof window.alloy !== 'function') return;
    try {
      var href = link.href || '';
      var name = (link.textContent || link.getAttribute('aria-label') || href).trim().substring(0, 255);
      window.alloy('sendEvent', {
        documentUnloading: true,
        xdm: {
          _demoemea: {},
          eventType: 'web.webinteraction.linkClicks',
          web: {
            webInteraction: {
              name: name || href,
              URL: href,
              linkClicks: { value: 1 }
            },
            webPageDetails: {
              URL: window.location.href
            },
            webReferrer: {
              URL: document.referrer || ''
            }
          }
        }
      });
    } catch (e) {
      console.warn('AEP link click failed:', e);
    }
  }

  function setupLinkClickTracking() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.href;
      if (!href || href.indexOf('javascript:') === 0 || href === '#') return;
      try {
        var url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin && href.indexOf('/') !== 0) return;
      } catch (err) {
        return;
      }
      sendLinkClick(link);
    }, true);
  }

  if (includeLinkClicks) {
    setupLinkClickTracking();
  }

  function run() {
    waitForAlloy().then(function () {
      if (includePageView && typeof window.alloy === 'function') {
        onPageActivation(sendPageView);
      } else if (includePageView && document.readyState !== 'complete') {
        window.addEventListener('load', function () {
          if (typeof window.alloy === 'function') {
            onPageActivation(sendPageView);
          }
        });
      }
    });
  }

  run();
};
