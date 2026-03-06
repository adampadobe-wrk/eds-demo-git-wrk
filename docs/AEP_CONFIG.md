# AEP (Adobe Experience Platform) Connection – eds-demo-git-wrk

This site loads the Web SDK (Alloy) via **Adobe Launch (Tags)** only. No direct Web SDK code on the page. All datastream, consent, rules, and Web Push configuration is done in the Launch property. This matches the working setup from **ExperienceManager/demo-emea-eds-verify**.

**See also:** [AEP-IMPLEMENTATION-PLAN.md](./AEP-IMPLEMENTATION-PLAN.md) for the step-by-step approach and rollback instructions.

---

## 1. Launch Property

- **Property:** `b2f5fbf72a47/9f8bfb0ead12`
- **Embed URL:** `https://assets.adobedtm.com/b2f5fbf72a47/9f8bfb0ead12/launch-6e7d1b4318bd-development.min.js`
- **Loaded from:** `head.html`

---

## 2. Configure in Launch (Required for AEP)

In **Data Collection → Tags** → your property → **Extensions** and **Rules**:

### 2a. Web SDK extension (Adobe Experience Platform Web SDK)

1. Go to **Extensions** → **Adobe Experience Platform Web SDK** → **Configure**.
2. **Datastream:** Select or enter `cd2c9528-abe4-4593-aa31-56a9135be5d9` (Development environment).
3. **Org ID:** `BF9C27AA6464801C0A495FD0@AdobeOrg`
4. Save. The extension injects the alloy stub and library; no code on the page is needed.

### 2b. Rules – Page view and link clicks

1. **Page view rule**
   - Event: **Library Loaded**
   - Action: **Send Event** (Web SDK extension)
   - Event type: `web.webpagedetails.pageViews`
   - XDM: `web.webPageDetails.name`, `web.webPageDetails.URL`, `web.webPageDetails.pageViews.value = 1`

2. **Link clicks rule** (optional)
   - Event: **Click** (e.g. all links or specific elements)
   - Action: **Send Event** with event type `web.webinteraction.linkClicks`

3. **Publish** the library to Development.

### Web Push (optional)

If you use the push-opt-in block and want open/click tracking in AEP:

- In the Web SDK extension, configure **Push notifications** with:
  - VAPID public key (from your push setup)
  - Application ID (e.g. `eds-demo-git-wrk-web`)
  - Tracking dataset ID (your AJO Push Tracking Experience Event dataset)
- The service worker is registered from the push-opt-in block at `/scripts/alloyServiceWorker.min.js` (the extension has no path setting).

---

## 3. On the Site (already done)

- **`head.html`** – Preconnect to `edge.adobedc.net`, Launch script. No direct Web SDK.
- **`scripts/scripts.js`** – If you add push-opt-in, set `window.__pushConfig` with `applicationId` and `vapidPublicKey` so the block can call `alloy("sendPushSubscription", { subscription })`.

---

## 4. Target "Unauthorized mbox host"

To fix the Target error:

1. Go to **Adobe Target** → **Administration** → **Implementation**
2. Add to **Authorized hosts:** `main--eds-demo-git-wrk--adampadobe-wrk.aem.page` (or `*.aem.page`)

---

## 5. Same Datastream for Multiple Sites

Both `demo-emea-eds-verify` and `eds-demo-git-wrk` can use datastream `cd2c9528-abe4-4593-aa31-56a9135be5d9`. Data is distinguished by URL and other XDM fields. When you retire the old site, only the new one will send data.

---

## References

- [Web SDK configure](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/overview)
- [Web SDK extension (Launch)](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extensions/client/web-sdk/overview)
- [Web Push (Web SDK)](https://experienceleague.adobe.com/en/docs/experience-platform/collection/js/commands/configure/pushnotifications)
- [AEP Integration Steps](./AEP-INTEGRATION-STEPS.md)
