#!/usr/bin/env node
/**
 * Generate an Adobe access token via OAuth client credentials.
 * Use for Platform API, Launch API, etc.
 *
 * Usage: node scripts/generate-token.js
 * Output: Token printed to stdout. Add to .env as ADOBE_ACCESS_TOKEN=<token>
 */

const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}. Set in .env`);
  return v;
}

async function main() {
  const clientId = getEnv('ADOBE_CLIENT_ID');
  const clientSecret = getEnv('ADOBE_CLIENT_SECRET');
  const scope = process.env.ADOBE_OAUTH_SCOPE_PLATFORM || process.env.ADOBE_OAUTH_SCOPE;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });
  if (scope) body.append('scope', scope);

  const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`OAuth failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  console.log(json.access_token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
