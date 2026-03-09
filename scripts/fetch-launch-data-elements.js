#!/usr/bin/env node
/**
 * Launch API: Fetch data elements from a Tag property via Reactor API
 *
 * See: https://experienceleague.adobe.com/en/docs/experience-platform/tags/api/endpoints/data-elements
 *
 * Prerequisites:
 * - .env with ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET, ADOBE_ORG_ID
 * - OAuth Server-to-Server credential with "Adobe Experience Platform Data Collection" API
 *
 * Usage:
 *   node scripts/fetch-launch-data-elements.js
 *   node scripts/fetch-launch-data-elements.js --list-properties   # Find property ID first
 *   node scripts/fetch-launch-data-elements.js --company CO72fab825b7fc466d94f9ef13723dde55  # List properties for company
 *
 * Property ID: Set LAUNCH_PROPERTY_ID in .env, or get from Launch UI URL:
 *   https://experience.adobe.com/.../properties/PRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/rules
 *   => PRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */

const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  /* dotenv optional */
}

// Company: CO72fab825b7fc466d94f9ef13723dde55
const PROPERTY_ID = process.env.LAUNCH_PROPERTY_ID || 'PR5057e9b14a5e4fae942acbb8a85da6c8';
const REACTOR_BASE = 'https://reactor.adobe.io';
// Scope is REQUIRED – omit and you get "invalid_target_scope".
// Must match scope from Developer Console → OAuth S2S credential (Generate access token).
// Launch/Reactor API needs the full scope; a minimal scope (e.g. 3 items) yields "no-available-orgs".
const DEFAULT_SCOPE = 'cjm.suppression_service.client.delete,cjm.suppression_service.client.all,openid,session,AdobeID,read_organizations,additional_info.projectedProductContext,assurance_manage_sessions,assurance_read_events,assurance_read_annotations,assurance_read_session_annotations,assurance_read_plugins,assurance_read_clients,additional_info.roles,adobeio_api,read_client_secret,manage_client_secrets,campaign_sdk,campaign_config_server_general,deliverability_service_general,read_pc.acp,read_pc,read_pc.dma_tartan,additional_info,target_sdk,additional_info.job_function,event_receiver_api';
const envScope = process.env.ADOBE_OAUTH_SCOPE;
const OAUTH_SCOPE = (envScope && envScope.split(',').length >= 15) ? envScope : DEFAULT_SCOPE;
if (envScope && envScope.split(',').length < 15) {
  console.warn('[WARN] ADOBE_OAUTH_SCOPE in .env has <15 scopes (Launch needs full scope). Using default. Remove or fix ADOBE_OAUTH_SCOPE in .env.');
}

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}. Set in .env. See .env.example`);
  return v;
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: getEnv('ADOBE_CLIENT_ID'),
    client_secret: getEnv('ADOBE_CLIENT_SECRET'),
    grant_type: 'client_credentials',
  });
  body.append('scope', OAUTH_SCOPE);

  const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`OAuth failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const token = json.access_token;
  if (process.argv.includes('--debug-token') && token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      const scopeCount = (payload.scope || '').split(',').length;
      console.log('[DEBUG] Token payload: org=%s user_id=%s scope_count=%d', payload.org, payload.user_id, scopeCount);
    } catch (_) {}
  }
  return token;
}

async function reactorFetch(accessToken, method, pathname, body = null) {
  const url = pathname.startsWith('http') ? pathname : REACTOR_BASE + pathname;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': getEnv('ADOBE_CLIENT_ID'),
    'x-gw-ims-org-id': getEnv('ADOBE_ORG_ID'),
    Accept: 'application/vnd.api+json;revision=1',
    'Content-Type': 'application/vnd.api+json',
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(`Reactor API ${method} ${pathname}: ${res.status}`);
    err.status = res.status;
    err.body = data || text;
    throw err;
  }
  return data;
}

/**
 * GET /properties/{PROPERTY_ID}/data_elements
 * Supports pagination via page[number] and page[size]
 */
async function fetchDataElements(accessToken, propertyId, page = 1, pageSize = 100) {
  const query = new URLSearchParams({
    'page[number]': String(page),
    'page[size]': String(pageSize),
  });
  const pathname = `/properties/${propertyId}/data_elements?${query}`;
  return reactorFetch(accessToken, 'GET', pathname);
}

async function listCompanies(accessToken) {
  const data = await reactorFetch(accessToken, 'GET', '/companies');
  return data.data || [];
}

async function listProperties(accessToken, companyId) {
  const data = await reactorFetch(accessToken, 'GET', `/companies/${companyId}/properties`);
  return data.data || [];
}

async function listPropertiesByCompany(accessToken, companyId) {
  const data = await reactorFetch(accessToken, 'GET', `/companies/${companyId}/properties`);
  return data;
}

async function listPropertiesMode(accessToken, companyId = null) {
  if (companyId) {
    console.log(`Listing properties for company ${companyId}:\n`);
    const res = await listPropertiesByCompany(accessToken, companyId);
    const props = res.data || [];
    console.log(JSON.stringify(res, null, 2));
    console.log(`\nFound ${props.length} property(ies). Set LAUNCH_PROPERTY_ID in .env to the id (PR...) of your property.`);
    return;
  }
  console.log('Listing companies and properties (to find LAUNCH_PROPERTY_ID):\n');
  const companies = await listCompanies(accessToken);
  if (!companies.length) {
    console.log('No companies found.');
    return;
  }
  for (const co of companies) {
    const attrs = co.attributes || {};
    console.log(`Company: ${attrs.name || co.id} (${co.id})`);
    const props = await listProperties(accessToken, co.id);
    for (const pr of props) {
      const pa = pr.attributes || {};
      console.log(`  - ${pa.name || pr.id}  token=${pa.token}  id=${pr.id}`);
    }
    console.log('');
  }
  console.log('Set LAUNCH_PROPERTY_ID in .env to the id (PR...) of your property, then run again.');
}

async function main() {
  const listProps = process.argv.includes('--list-properties');
  const companyArg = process.argv.find((a) => a.startsWith('--company='));
  const companyId = companyArg ? companyArg.split('=')[1] : null;
  console.log('Launch API: Fetch data elements\n');

  const accessToken = await getAccessToken();
  console.log('Authenticated\n');

  if (companyId || listProps) {
    await listPropertiesMode(accessToken, companyId);
    return;
  }

  console.log(`Property ID: ${PROPERTY_ID}\n`);
  const all = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetchDataElements(accessToken, PROPERTY_ID, page);
    const data = res.data || [];
    all.push(...data);
    const pagination = res.meta?.pagination || {};
    hasMore = pagination.next_page != null;
    page += 1;
    if (!data.length) break;
  }

  console.log(`Found ${all.length} data element(s):\n`);
  console.log(JSON.stringify({ data: all, meta: { total_count: all.length } }, null, 2));
}

main().catch((e) => {
  console.error(e.message);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});
