# AEP Tracking Tag Extension

Sends page views and link clicks to Adobe Experience Platform via the Web SDK (`alloy`). Requires the **Adobe Experience Platform Web SDK** extension to be installed in your Tag property.

## Prerequisites

- [Adobe Experience Platform Web SDK](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) extension installed and configured in your Tag property
- `window.alloy` available at runtime (provided by the Web SDK)

## Extension Contents

- **Initialize AEP Tracking** action: Sets up page view tracking (on page activation) and link click tracking. Add this action to a rule triggered by **Library Loaded** (Core extension).

## Deploy to Your Tag Property

### 1. Package the extension

From the `aep-tracking-extension` directory:

```bash
cd aep-tracking-extension
npx @adobe/reactor-packager
```

This creates a `.zip` file (e.g. `aep-tracking-extension-1.0.0.zip`).

### 2. Upload the extension

You need an [Adobe I/O integration](https://experienceleague.adobe.com/en/docs/experience-platform/tags/api/getting-started) with access to the Tags API.

```bash
npx @adobe/reactor-uploader
```

When prompted:
- **clientId**: From your Adobe I/O integration
- **clientSecret**: From your Adobe I/O integration
- **extension package**: Select the `.zip` file created in step 1

The uploader will output an `extension_package` ID. The extension will appear in your org's catalog with status **Pending** until processing completes.

### 3. Enable extension development (if needed)

To use a development extension, your property must allow extension development:

1. In Data Collection UI: **Property** → **Extensions** → **Catalog**
2. Enable **Extension Development** (if available for your org)

### 4. Install the extension

1. Go to **Extensions** → **Catalog**
2. Find **AEP Tracking** and click **Install**
3. Configure the action (page views / link clicks toggles) and save

### 5. Add to a rule

1. Create or edit a rule
2. **Event**: Library Loaded (Core extension)
3. **Action**: Initialize AEP Tracking (AEP Tracking extension)
4. Save and publish your library

## XDM Schema

The extension sends events with:
- `eventType`: `web.webpagedetails.pageViews` or `web.webinteraction.linkClicks`
- `_demoemea`: `{}` (required for demo EMEA schema validation)
- Standard `web.webPageDetails`, `web.webReferrer`, `web.webInteraction` fields

## References

- [Extension development overview](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extension-dev/overview)
- [Create extension package zip](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extension-dev/submit/create-extension-package-zip)
- [Upload and test](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extension-dev/submit/upload-and-test)
