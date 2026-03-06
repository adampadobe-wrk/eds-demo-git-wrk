# AEP Implementation Plan – EDS + Launch + Datastream

**Goal:** Send page views and link clicks from the EDS site to Adobe Experience Platform using the standard Adobe approach: **Launch (Tags) + Web SDK extension + Datastream**. No custom stub, no direct alloy embed.

---

## Adobe’s Recommended Flow

1. **Launch embed** on the page loads the tag library.
2. **Web SDK extension** in Launch injects the alloy stub and library, and configures it with the datastream.
3. **Launch rules** send events (page view, link clicks) via the Web SDK extension’s “Send Event” action.
4. **Datastream** routes data to AEP and other Experience Cloud solutions.

This matches the working setup in `ExperienceManager/demo-emea-eds-verify`.

---

## What Went Wrong Before

- **Direct Web SDK in head.html** – Custom alloy stub + alloy.min.js + configure script were added because “Launch was unreliable.”
- **EDS processing** – EDS template processing broke the stub (e.g. `}}`).
- **CDN issues** – External stub (raw.githack, jsDelivr) served cached/broken code.
- **Duplicate approaches** – Both direct SDK and Launch were present, causing conflicts.

---

## Clean Implementation

### Step 1: Remove Direct Web SDK from head.html

- Remove: alloy-stub script, alloy.min.js, configure script.
- Keep: Launch embed, preconnect to edge.adobedc.net.
- Result: Launch is the only source of Web SDK.

### Step 2: Remove Custom AEP Tracking Script

- Remove `initAepTracking()` from `scripts.js`.
- Remove or archive `scripts/aep-tracking.js`.
- Page views and link clicks will be handled by Launch rules.

### Step 3: Configure Launch (Tag Property)

In **Data Collection → Tags** for property `9f8bfb0ead12`:

1. **Web SDK extension**
   - Datastream: `cd2c9528-abe4-4593-aa31-56a9135be5d9` (or your new datastream ID).
   - Org ID: `BF9C27AA6464801C0A495FD0@AdobeOrg`.

2. **Rules**
   - **Page view:** Library Loaded → Send Event (Web SDK) with:
     - Event type: `web.webpagedetails.pageViews`
     - XDM: `web.webPageDetails.name`, `web.webPageDetails.URL`, `web.webPageDetails.pageViews.value = 1`
   - **Link clicks:** Click event → Send Event with:
     - Event type: `web.webinteraction.linkClicks`
     - Include link URL, link name, etc. in XDM.

3. **Publish** the library to the Development environment.

### Step 4: Verify

- Load the site.
- In DevTools console: `typeof window.alloy` → `"function"`.
- In Network tab: requests to `edge.adobedc.net` with event payloads.
- In AEP: events in the dataset.

---

## If You Create a New Datastream + Tag

1. **Datastream:** Data Collection → Datastreams → New datastream → Add Adobe Experience Platform service → Save.
2. **Tag property:** Data Collection → Tags → New property (or use existing).
3. **Web SDK extension:** Install and configure with the new datastream ID.
4. **Embed code:** Copy the script URL from the Tag property’s Install instructions.
5. **Update head.html** with the new Launch embed URL.

---

## Files Changed

| File | Change |
|------|--------|
| `head.html` | Remove alloy-stub, alloy.min.js, configure; keep Launch + preconnect |
| `scripts/scripts.js` | Remove `initAepTracking()` call and import |
| `scripts/aep-tracking.js` | Remove or archive (optional: keep for custom events only) |

---

## Rollback

If Launch-only does not work:

1. Restore the previous `head.html` (with direct SDK).
2. Restore `initAepTracking()` in `scripts.js`.
3. Investigate why the Web SDK extension in Launch is not loading (e.g. extension config, rule order, environment).
