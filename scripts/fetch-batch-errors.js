#!/usr/bin/env node
/**
 * Fetch failed batch errors from Adobe Experience Platform Data Access API.
 *
 * Prerequisites:
 * - .env with ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET, ADOBE_ORG_ID
 * - OAuth credential with "Adobe Experience Platform" or Data Access API scope
 *
 * Usage: node scripts/fetch-batch-errors.js [BATCH_ID] [SANDBOX_NAME]
 * Example: node scripts/fetch-batch-errors.js 01KK22MR1EHHNTBDT8FH1N2FZD prod
 */

const path = require('path');
const fs = require('fs');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const BATCH_ID = process.argv[2] || '01KK22MR1EHHNTBDT8FH1N2FZD';
const SANDBOX_NAME = process.argv[3] || process.env.AEP_SANDBOX_NAME || 'apalmer';
const PLATFORM_BASE = process.env.AEP_PLATFORM_BASE || 'https://platform-nld2.adobe.io';

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}. Set in .env or environment.`);
  return v;
}

async function getAccessToken() {
  // Use direct token if provided (e.g. from Postman / Platform UI)
  const direct = process.env.ADOBE_ACCESS_TOKEN;
  if (direct) return String(direct).trim().replace(/[\r\n]/g, '');

  // Use Platform-specific credentials if set (Platform may be on a different project)
  const clientId = process.env.ADOBE_PLATFORM_CLIENT_ID || getEnv('ADOBE_CLIENT_ID');
  const clientSecret = process.env.ADOBE_PLATFORM_CLIENT_SECRET || getEnv('ADOBE_CLIENT_SECRET');
  // For Platform API: don't pass scope to get credential's full scopes (including Platform).
  // Passing adobeio_api etc. can restrict token to Launch-only.
  const scope = process.env.ADOBE_OAUTH_SCOPE_PLATFORM || process.env.ADOBE_OAUTH_SCOPE_PLATFORM_OVERRIDE;

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
  return json.access_token;
}

async function platformFetch(accessToken, url, opts = {}) {
  const apiKey = process.env.ADOBE_PLATFORM_CLIENT_ID || process.env.ADOBE_CLIENT_ID || process.env.API_KEY || getEnv('ADOBE_CLIENT_ID');
  const orgId = process.env.ADOBE_ORG_ID || process.env.IMS_ORG || getEnv('ADOBE_ORG_ID');
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': apiKey,
    'x-gw-ims-org-id': orgId,
    'x-sandbox-name': SANDBOX_NAME,
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`Platform API ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function main() {
  console.log('Fetching failed batch:', BATCH_ID);
  console.log('Sandbox:', SANDBOX_NAME);
  console.log('Platform base:', PLATFORM_BASE);

  const accessToken = await getAccessToken();
  const listUrl = `${PLATFORM_BASE}/data/foundation/export/batches/${BATCH_ID}/failed`;
  const list = await platformFetch(accessToken, listUrl);

  const outDir = path.join(__dirname, '..', 'batch-errors');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const data = list.data || list;
  if (!Array.isArray(data) || data.length === 0) {
    console.log('No failed files in batch (or empty response).');
    console.log('Raw response:', JSON.stringify(list, null, 2));
    fs.writeFileSync(path.join(outDir, `${BATCH_ID}-list.json`), JSON.stringify(list, null, 2));
    return;
  }

  console.log('Failed files:', data.length);
  const errors = [];

  for (const item of data) {
    const name = item.name || item;
    if (name === '_SUCCESS' || name.endsWith('/_SUCCESS')) continue;

    const fileUrl = `${listUrl}?path=${encodeURIComponent(name)}`;
    try {
      const content = await platformFetch(accessToken, fileUrl);
      const parsed = typeof content === 'string' ? content.split('\n').filter(Boolean).map((l) => {
        try { return JSON.parse(l); } catch (e) { return l; }
      }) : (Array.isArray(content) ? content : [content]);

      const outPath = path.join(outDir, `${BATCH_ID}-${name.replace(/[/\\]/g, '_')}`);
      fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
      console.log('Saved:', outPath);

      for (const row of parsed) {
        if (row && typeof row === 'object') {
          errors.push({ file: name, ...row });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch', name, e.message);
    }
  }

  const summaryPath = path.join(outDir, `${BATCH_ID}-summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(errors, null, 2));
  console.log('Summary:', summaryPath);

  if (errors.length > 0) {
    console.log('\n--- Error summary ---');
    const byReason = {};
    for (const e of errors) {
      const msg = e.errorCode || e.message || e.reason || JSON.stringify(e).slice(0, 100);
      byReason[msg] = (byReason[msg] || 0) + 1;
    }
    for (const [msg, count] of Object.entries(byReason)) {
      console.log(`  ${count}x: ${msg}`);
    }
  }
}

main().catch((e) => {
  if (e.body?.error_code === '403027') {
    console.error('\n--- Platform API: User region is missing ---');
    console.error('Your OAuth credential needs Adobe Experience Platform API access.');
    console.error('\n1. Go to https://console.adobe.io/ → Your Project');
    console.error('2. Add API → Adobe Experience Platform → Experience Platform API');
    console.error('3. Generate token: Credentials → OAuth Server-to-Server → Generate access token');
    console.error('4. Add to .env: ADOBE_ACCESS_TOKEN=<paste_token>');
    console.error('5. Run this script again\n');
  }
  console.error(e);
  process.exit(1);
});
