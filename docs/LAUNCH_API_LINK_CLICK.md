# Launch API: Link Click Rule

This document describes how to create the link click data elements and rule via the **Reactor API** instead of manually in the Launch UI.

## Prerequisites

1. **Adobe Developer Console integration** with:
   - Adobe Experience Platform Data Collection API (or Experience Platform Launch API)
   - **OAuth Server-to-Server** credentials (JWT is deprecated)

2. **`.env` file** (copy from `.env.example`):
   ```
   ADOBE_CLIENT_ID=your_client_id
   ADOBE_CLIENT_SECRET=your_client_secret
   ADOBE_ORG_ID=your_org_id@AdobeOrg
   ```
   No private key needed—OAuth S2S uses client credentials only.

3. **Optional:** Set `LAUNCH_PROPERTY_ID` if different from default:
   ```
   LAUNCH_PROPERTY_ID=PR5057e9b14a5e4fae942acbb8a85da6c8
   ```

## Dependencies

```bash
npm install dotenv jsonwebtoken
```

(Or use `yarn add dotenv jsonwebtoken`)

## Run the Script

```bash
node scripts/launch-api-link-click-rule.js
```

## What It Creates

1. **Data Element: Link Click URL** – Returns the `href` of the clicked link
2. **Data Element: Link Click Text** – Returns the text of the clicked link
3. **Rule: Link Clicks - Send to Web SDK**
   - **Event:** Click on `a[href]` elements
   - **Condition:** Link Click URL is set
   - **Action:** Send Event with `web.webinteraction.linkClicks` XDM

## After Running

1. Open your Launch property in the UI
2. Add the new rule to your library (Publishing → Libraries → Add All Changed Resources)
3. Build and publish the library

## Property ID

From your Launch URL:
```
https://experience.adobe.com/.../properties/PR5057e9b14a5e4fae942acbb8a85da6c8/rules
```
The property ID is `PR5057e9b14a5e4fae942acbb8a85da6c8`.

## Troubleshooting

- **"Core extension not found"** – Ensure the Core extension is installed in your property
- **"Web SDK extension not found"** – Add the Adobe Experience Platform Web SDK extension
- **JWT exchange failed** – Verify credentials, org ID, and private key path
- **401/403 on Reactor API** – Check that your integration has the Data Collection API and correct scopes
