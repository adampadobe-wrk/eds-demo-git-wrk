# Web push setup (Journey Optimizer)

This project is configured for web push with Adobe Journey Optimizer. Complete the steps below in Adobe so push can be sent to opted-in users.

**Reference:** [Configure web push – Journey Optimizer](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/channels/push/push-config/push-configuration-web)

---

## Values used in this site

| Item | Value |
|------|--------|
| **App ID** | `eds-demo-git-wrk-web` |
| **VAPID public key** | Set in `scripts/scripts.js` → `window.__pushConfig` |
| **VAPID private key** | Store in `vapid-private.txt` (gitignored). Paste into AJO in Step 1. |

**Generate VAPID keys:** Use `npx web-push generate-vapid-keys` or [web-push](https://www.npmjs.com/package/web-push).

---

## Step 1: Add push credentials in Journey Optimizer

1. Go to **Journey Optimizer** → **Channels** → **Push settings** → **Push credentials**.
2. Click **Create push credential**.
3. **Platform:** **Web**.
4. **App ID:** `eds-demo-git-wrk-web` (must match `applicationId` in `scripts/scripts.js`).
5. **VAPID public key:** From `window.__pushConfig.vapidPublicKey` (in scripts.js).
6. **VAPID private key:** Paste from `vapid-private.txt` (local file, never commit).
7. Click **Submit**.

---

## Step 2: Create channel configuration

1. **Channels** → **General settings** → **Channel configurations** → **Create channel configuration**.
2. Name (e.g. `EDS Demo Web Push`), optional description.
3. **Channel:** **Push**.
4. **Platform:** **Web**.
5. **App id:** select `eds-demo-git-wrk-web` (same as Step 1).
6. Add **Marketing action(s)** if required by your consent setup.
7. Save.

---

## Step 3: On the site (already implemented)

- **Web SDK** is configured via Launch with push notifications in the extension.
- **Push opt-in block:** add a **push-opt-in** block in your page content; users who click it get a subscription and it is sent via `alloy('sendPushSubscription', { subscription })`.
- **Service workers:**
  - **Launch "Web Push" rule** registers the Adobe Alloy service worker for open/click tracking. Use **`/scripts/alloyServiceWorker.min.js`** with scope **`/`** in Launch.
  - **`/scripts/sw.js`** – custom worker used when the user opts in via the push-opt-in block (receives push from AJO).

---

## Step 4: Launch configuration (Web SDK extension)

In your Launch property, in the **Adobe Experience Platform Web SDK** extension:

1. **Configure** → **Push notifications**
2. **Application ID:** `eds-demo-git-wrk-web` (same as above)
3. **VAPID public key:** Same as in scripts.js
4. **Service worker path:** `/scripts/alloyServiceWorker.min.js` (for open/click tracking)
5. **Tracking dataset ID** (optional): Your CJM Push Tracking Experience Event dataset for open/click events in AEP

---

## Step 5: Test

1. Publish a page that contains the **push-opt-in** block (add a section with block name `push-opt-in` in your content).
2. Open the page, click **Enable notifications**, allow when prompted.
3. In Journey Optimizer, create a journey that uses **Push** and the channel configuration from Step 2.
4. Send a test push and confirm it appears in the browser.

---

## Troubleshooting

### "Push not configured"
- Ensure `window.__pushConfig` and `window.alloy` are defined (Launch + Web SDK must load).
- Check `scripts/scripts.js` has the correct `PUSH_APP_ID` and `VAPID_PUBLIC_KEY`.

### Service worker 404
- `sw.js` and `alloyServiceWorker.min.js` live in `/scripts/` and are served at `/scripts/sw.js` and `/scripts/alloyServiceWorker.min.js`. EDS does not serve arbitrary root-level files.

### Permission popup not showing
- Must be triggered by a **user click** on the Enable notifications button.
- Check browser site settings – if already Allow/Block, use Incognito to test again.

---

## Optional: Reuse credentials from old project

If you use the same Journey Optimizer setup as `demo-emea-eds-verify`:

- **App ID:** `demo-emea-eds-web`
- **VAPID public key:** `BLHda1pyWwF9FBI-pGP0ihaMVINkpegv9aeZorxeH4qXRkqGU53W3NFgpFxQj5TQWXo9g8Y13MkDfx1oq0WUbdQ`

Update `scripts/scripts.js` with these values. The private key stays in AJO (never in the repo).
