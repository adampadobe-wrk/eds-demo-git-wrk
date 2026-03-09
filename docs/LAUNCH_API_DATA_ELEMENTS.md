# Launch API: Fetch Data Elements

Fetch data elements from an Adobe Launch (Tags) property via the [Reactor API](https://experienceleague.adobe.com/en/docs/experience-platform/tags/api/endpoints/data-elements).

**See [LAUNCH_API_SETUP.md](./LAUNCH_API_SETUP.md)** for core credentials, OAuth scope, and troubleshooting.

## Usage

**List companies and properties** (to find your property ID):
```bash
node scripts/fetch-launch-data-elements.js --list-properties
```

**Fetch data elements**:
```bash
node scripts/fetch-launch-data-elements.js
```

Output is JSON matching the [Reactor API response format](https://experienceleague.adobe.com/en/docs/experience-platform/tags/api/endpoints/data-elements#list).

## Property ID

This project's Launch property:
- **Company ID:** `CO72fab825b7fc466d94f9ef13723dde55`
- **Property ID:** `PR5057e9b14a5e4fae942acbb8a85da6c8`
- **URL:** `https://experience.adobe.com/#/@demoemea/.../companies/CO72fab825b7fc466d94f9ef13723dde55/properties/PR5057e9b14a5e4fae942acbb8a85da6c8/overview`
