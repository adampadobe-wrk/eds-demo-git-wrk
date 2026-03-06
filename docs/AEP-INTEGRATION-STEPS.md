# AEP Integration Steps – eds-demo-git-wrk

This document outlines how to connect your EDS site to Adobe Experience Platform (AEP) and what’s needed for Launch API automation.

---

## Current Setup

- **Site:** main--eds-demo-git-wrk--adampadobe-wrk.aem.page
- **Launch:** Already embedded (`b2f5fbf72a47/9f8bfb0ead12` – development)
- **Adobe Target:** Configured (`at_property: 549d426b-0bcc-be60-ce27-b9923bfcad4f`)
- **Datastream ID:** `cd2c9528-abe4-4593-aa31-56a9135be5d9`

---

## What I Need From You (for Launch API automation)

To use the Launch/Data Collection API to manage your property, I need:

### 1. **Integration (JWT) credentials**

Create an integration in [Adobe Developer Console](https://developer.adobe.com/console):

- **OAuth Server-to-Server** or **Service Account (JWT)** credentials
- Scopes: `Adobe Experience Platform Data Collection` (or `Reactor`)

You’ll get:

- **Client ID** (API Key)
- **Client Secret**
- **Technical Account ID**
- **Org ID** (Experience Cloud Org ID, e.g. `XXXXXXXX@AdobeOrg`)
- **Private Key** (for JWT)

Store these in a `.env` file (add to `.gitignore`) or as environment variables.

### 2. **Org ID** (for Web SDK config)

- Format: `XXXXXXXX@AdobeOrg` (24-character hex + `@AdobeOrg`)
- Location: **Experience Platform** → **Data Collection** → **Datastreams** → your datastream → **Settings** → **Experience Cloud Org ID`
- Or: **Admin** → **Properties** in the Data Collection UI

### 3. **Launch property ID** (optional, for API)

- From your Launch embed URL: `9f8bfb0ead12` (property ID)
- Org ID in the URL: `b2f5fbf72a47` (IMS org, may differ from Experience Cloud Org ID)

---

## Integration Approaches

### Option A: Direct Web SDK (implemented)

- AEP Web SDK is added to `head.html` with your datastream ID.
- Sends page views and events to AEP via the datastream.
- No Launch API needed.
- You only need to add your **Org ID** if it’s not already in the script.

### Option B: Launch/Data Collection (AEP Web SDK extension)

- Add the **Adobe Experience Platform Web SDK** extension to your Launch property.
- Configure the extension with datastream `cd2c9528-abe4-4593-aa31-56a9135be5d9`.
- Use Launch rules for page views, link clicks, form submits, etc.
- Requires Launch UI or Launch API.

### Option C: Launch API automation

With integration credentials, I can:

1. Add/update the AEP Web SDK extension in your Launch property.
2. Configure the datastream in the extension.
3. Create rules for page views, custom events, etc.
4. Build and publish libraries.

---

## Steps to Complete Integration

### 1. Add Org ID to Web SDK (required)

Replace `REPLACE_WITH_YOUR_ORG_ID@AdobeOrg` in `head.html` with your Experience Cloud Org ID.

**Where to find it:**
- **Data Collection** → **Datastreams** → your datastream → **Settings** tab → **Experience Cloud Org ID**
- Or: **Admin** → **Company Settings** in experience.adobe.com
- Format: `C0BF1A2B3C4D5E6F7@AdobeOrg` (24 hex chars + `@AdobeOrg`)

### 2. Verify datastream configuration

In **Experience Platform** → **Data Collection** → **Datastreams** → `cd2c9528-abe4-4593-aa31-56a9135be5d9`:

- [ ] Adobe Analytics (if used)
- [ ] Adobe Target (if used)
- [ ] Experience Platform (for datasets)
- [ ] Identity (first-party domain, etc.)

### 3. Test data flow

1. Open your site with the Web SDK loaded.
2. Use **Adobe Experience Platform Debugger** (Chrome extension).
3. Confirm events are sent to your datastream.
4. Check datasets in Experience Platform for incoming data.

### 4. Optional: Launch API setup

If you want Launch API automation:

1. Create an integration in [Adobe Developer Console](https://developer.adobe.com/console).
2. Add the **Adobe Experience Platform Data Collection** API.
3. Generate a JWT or OAuth token.
4. Share the credentials (securely) so I can call the Launch API.

---

## Files Modified

- `head.html` – AEP Web SDK base code and library loader with datastream ID
- `scripts/aep-send-events.js` – Optional: helpers for custom events (e.g. `alloy("sendEvent", {...})`)

---

## References

- [Install Web SDK](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/install/library)
- [Configure Web SDK](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/overview)
- [Launch API (Reactor)](https://developer.adobe.com/experience-platform-apis/references/launch/)
