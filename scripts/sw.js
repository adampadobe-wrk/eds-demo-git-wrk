/* eslint-disable no-restricted-globals */
// Service worker for web push. Journey Optimizer (AJO) sends the payload to this origin.
// Notification title/body come from AJO message content; use context data below to override or enrich.

self.addEventListener('push', (event) => {
  const raw = event.data ? event.data.json() : {};
  // ——— Context data: AJO may send title/body in different shapes or inside custom/context ———
  // Flatten: some providers nest payload under .data or .notification or send custom key-value pairs.
  const data = raw.data || raw.notification || raw.payload || raw;
  const custom = data.customData || data.context || data.contextData || data.custom || {};
  // Title: AJO message title, or context override
  const title = custom.title ?? data.title ?? data.subject ?? data.adb_title ?? raw.title ?? 'Notification';
  // Body: AJO message body, or context override (ensure not empty so the real text shows)
  const body = custom.body ?? custom.message ?? data.body ?? data.message ?? data.adb_body ?? raw.body ?? '';
  const url = custom.url ?? custom.clickUrl ?? data.url ?? data.adb_uri ?? data.click_action ?? '';
  const icon = custom.icon ?? data.icon ?? data.adb_icon ?? '/favicon.ico';
  const tag = custom.tag ?? data.tag ?? 'default';
  const options = {
    body: String(body || '').trim() || ' ', // avoid empty body (can show as blank)
    icon,
    tag,
    data: url ? { url } : {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
