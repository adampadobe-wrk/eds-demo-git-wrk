# Launch API Setup (Core)

This document covers the **core setup** for using the Launch (Reactor) API with this project—token generation, credentials, and troubleshooting. Scripts such as `fetch-launch-data-elements.js` and `launch-api-link-click-rule.js` depend on this setup.

## Status: Working

- **Token endpoint:** `https://ims-na1.adobelogin.com/ims/token/v3` (OAuth v3)
- **Reactor API:** `https://reactor.adobe.io`
- **Company ID:** `CO72fab825b7fc466d94f9ef13723dde55`
- **Property ID:** `PR5057e9b14a5e4fae942acbb8a85da6c8`
- **Org ID:** `BF9C27AA6464801C0A495FD0@AdobeOrg`

---

## Prerequisites

1. **Adobe Developer Console** – OAuth Server-to-Server credential with:
   - **Adobe Experience Platform Data Collection** API
   - Same client ID used for Launch/Reactor API calls

2. **Admin Console** – OAuth tech account in a product profile with **Launch (Tags)** access for your org:
   - **Admin Console** → **Products** → **Adobe Experience Platform Data Collection** → your profile → **Users**
   - Add the tech account if missing

3. **`.env` file** (never commit):

   ```
   ADOBE_CLIENT_ID=your_client_id
   ADOBE_CLIENT_SECRET=your_client_secret
   ADOBE_ORG_ID=BF9C27AA6464801C0A495FD0@AdobeOrg
   LAUNCH_PROPERTY_ID=PR5057e9b14a5e4fae942acbb8a85da6c8
   ```

---

## OAuth Scope (Required)

**Scope is required.** Without it, token requests return `invalid_target_scope`.

For Launch/Reactor API access, you must use the **full scope** from your OAuth credential. A minimal scope (e.g. `openid,session,AdobeID` only) produces a token without Launch access and yields `no-available-orgs`.

### What to do

- **Recommended:** Do **not** set `ADOBE_OAUTH_SCOPE` in `.env`. The scripts use a full default scope.
- **Optional:** If you set `ADOBE_OAUTH_SCOPE`, it must contain the full scope (20+ comma-separated values). Get it from **Developer Console** → your project → **OAuth S2S credential** → **Generate access token** (the UI shows the scope).

### Safeguard

If `ADOBE_OAUTH_SCOPE` in `.env` has fewer than 15 scopes, the scripts automatically use the full default scope and print a warning. Remove or fix `ADOBE_OAUTH_SCOPE` in `.env` to avoid the warning.

---

## Token Generation

Scripts use **client credentials** flow:

```
POST https://ims-na1.adobelogin.com/ims/token/v3
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id={ADOBE_CLIENT_ID}
client_secret={ADOBE_CLIENT_SECRET}
scope={full scope string}
```

## Reactor API Headers

```
Authorization: Bearer {access_token}
x-api-key: {ADOBE_CLIENT_ID}
x-gw-ims-org-id: {ADOBE_ORG_ID}
Accept: application/vnd.api+json;revision=1
Content-Type: application/vnd.api+json
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid_target_scope` | No scope sent | Ensure scripts send `scope`; do not omit it |
| `no-available-orgs` | Token lacks Launch access | Use full scope; remove `ADOBE_OAUTH_SCOPE` from `.env` or set it to the full scope string |
| `no-available-orgs` | Tech account not in Launch product profile | Add tech account to product profile in Admin Console |
| 401 from token endpoint | Wrong client_id/client_secret | Verify credentials in Developer Console |

### Verify setup

```bash
# Audit rules, data elements, and extensions
node scripts/audit-launch-config.js

# List properties (should return JSON)
node scripts/fetch-launch-data-elements.js --company=CO72fab825b7fc466d94f9ef13723dde55

# Fetch data elements
node scripts/fetch-launch-data-elements.js
```

---

## Related Docs

- [LAUNCH_API_DATA_ELEMENTS.md](./LAUNCH_API_DATA_ELEMENTS.md) – Fetch data elements
- [LAUNCH_API_LINK_CLICK.md](./LAUNCH_API_LINK_CLICK.md) – Create link-click rules via API
- [AEP_CONFIG.md](./AEP_CONFIG.md) – Launch property and AEP configuration
