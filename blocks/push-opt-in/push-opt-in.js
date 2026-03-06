/**
 * Push opt-in block: registers for web push and sends subscription to AEP via Web SDK.
 * Requires push credentials and channel config in Journey Optimizer (see PUSH_SETUP.md).
 */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default async function decorate(block) {
  const config = window.__pushConfig;
  if (!config?.vapidPublicKey || !window.alloy) {
    block.textContent = 'Push not configured.';
    return;
  }

  const btn = block.querySelector('a, button') || document.createElement('button');
  if (!btn.textContent.trim()) btn.textContent = 'Enable notifications';
  btn.type = 'button';
  btn.className = 'push-opt-in-button';

  btn.addEventListener('click', async () => {
    try {
      if (Notification.permission === 'granted') {
        btn.textContent = 'Notifications enabled';
        btn.disabled = true;
        return;
      }
      if (Notification.permission === 'denied') {
        btn.textContent = 'Notifications blocked';
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        btn.textContent = 'Permission denied';
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration('/') || await navigator.serviceWorker.register('/scripts/alloyServiceWorker.min.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      });

      await window.alloy('sendPushSubscription', { subscription: subscription.toJSON() });
      btn.textContent = 'Notifications enabled';
      btn.disabled = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Push opt-in error:', err);
      btn.textContent = 'Error – try again';
    }
  });

  block.replaceChildren(btn);
}
