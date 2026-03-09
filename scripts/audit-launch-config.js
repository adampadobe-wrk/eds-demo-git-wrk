#!/usr/bin/env node
/**
 * Launch API: Audit rules, data elements, and extensions for page view / link click tracking
 *
 * Usage: node scripts/audit-launch-config.js
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const PROPERTY_ID = process.env.LAUNCH_PROPERTY_ID || 'PR5057e9b14a5e4fae942acbb8a85da6c8';
const REACTOR_BASE = 'https://reactor.adobe.io';
const DEFAULT_SCOPE = 'cjm.suppression_service.client.delete,cjm.suppression_service.client.all,openid,session,AdobeID,read_organizations,additional_info.projectedProductContext,assurance_manage_sessions,assurance_read_events,assurance_read_annotations,assurance_read_session_annotations,assurance_read_plugins,assurance_read_clients,additional_info.roles,adobeio_api,read_client_secret,manage_client_secrets,campaign_sdk,campaign_config_server_general,deliverability_service_general,read_pc.acp,read_pc,read_pc.dma_tartan,additional_info,target_sdk,additional_info.job_function,event_receiver_api';
const _envScope = process.env.ADOBE_OAUTH_SCOPE;
const OAUTH_SCOPE = (_envScope && _envScope.split(',').length >= 15) ? _envScope : DEFAULT_SCOPE;

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
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
  return json.access_token;
}

async function reactorFetch(accessToken, method, pathname) {
  const url = pathname.startsWith('http') ? pathname : REACTOR_BASE + pathname;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': getEnv('ADOBE_CLIENT_ID'),
      'x-gw-ims-org-id': getEnv('ADOBE_ORG_ID'),
      Accept: 'application/vnd.api+json;revision=1',
    },
  });
  const data = res.ok ? await res.json() : null;
  if (!res.ok) throw new Error(`API ${method} ${pathname}: ${res.status}`);
  return data;
}

async function main() {
  console.log('Launch Config Audit – Property', PROPERTY_ID, '\n');

  const token = await getAccessToken();

  // Data elements
  const dataElements = await reactorFetch(token, 'GET', `/properties/${PROPERTY_ID}/data_elements?page[size]=100`);
  const elements = dataElements.data || [];
  console.log('=== DATA ELEMENTS (' + elements.length + ') ===');
  const linkClickUrl = elements.find(e => (e.attributes?.name || '').toLowerCase().includes('link click url'));
  const linkClickText = elements.find(e => (e.attributes?.name || '').toLowerCase().includes('link click text'));
  const linkClickXdm = elements.find(e => (e.attributes?.name || '').toLowerCase().includes('link click xdm'));
  const pageName = elements.find(e => (e.attributes?.name || '').toLowerCase().includes('page') && (e.attributes?.name || '').toLowerCase().includes('name'));
  const pageUrl = elements.find(e => (e.attributes?.name || '').toLowerCase().includes('page') && (e.attributes?.name || '').toLowerCase().includes('url'));
  console.log('  Link Click URL:', linkClickUrl ? 'YES (' + linkClickUrl.id + ')' : 'MISSING');
  console.log('  Link Click Text:', linkClickText ? 'YES (' + linkClickText.id + ')' : 'MISSING');
  console.log('  Link Click XDM:', linkClickXdm ? 'YES (' + linkClickXdm.id + ')' : 'MISSING');
  console.log('  Page - Name:', pageName ? 'YES (' + pageName.id + ')' : 'MISSING');
  console.log('  Page - URL:', pageUrl ? 'YES (' + pageUrl.id + ')' : 'MISSING');

  // Extensions
  const extensionsRes = await reactorFetch(token, 'GET', `/properties/${PROPERTY_ID}/extensions`);
  const extensions = extensionsRes.data || [];
  const coreExt = extensions.find(e => /^core$/i.test(e.attributes?.name || ''));
  const webSdkExt = extensions.find(e => /web sdk|experience platform|alloy/i.test(e.attributes?.name || ''));
  console.log('\n=== EXTENSIONS (' + extensions.length + ') ===');
  extensions.forEach(e => console.log('  -', e.attributes?.name || e.id));
  console.log('  Core:', coreExt ? coreExt.id : 'MISSING');
  console.log('  Web SDK:', webSdkExt ? webSdkExt.id : 'MISSING');

  // Rules
  const rulesRes = await reactorFetch(token, 'GET', `/properties/${PROPERTY_ID}/rules?page[size]=100`);
  const rules = rulesRes.data || [];
  console.log('\n=== RULES (' + rules.length + ') ===');

  let pageViewRule = null;
  let linkClickRule = null;

  for (const rule of rules) {
    const name = rule.attributes?.name || rule.id;
    const rcRes = await reactorFetch(token, 'GET', `/rules/${rule.id}/rule_components`);
    const components = rcRes.data || [];

    let eventType = '';
    let actionType = '';
    for (const rc of components) {
      const desc = rc.attributes?.delegate_descriptor_id || '';
      if (desc.includes('library-loaded') || desc.includes('libraryloaded')) eventType = 'Library Loaded';
      else if (desc.includes('click')) eventType = 'Click';
      if (desc.includes('send-event') || desc.includes('sendEvent')) actionType = 'Send Event';
    }

    if (name.toLowerCase().includes('page view') || name.toLowerCase().includes('pageview') || (eventType === 'Library Loaded' && actionType === 'Send Event')) {
      pageViewRule = rule;
    }
    if (name.toLowerCase().includes('link click') || (eventType === 'Click' && actionType === 'Send Event')) {
      linkClickRule = rule;
    }

    console.log('  -', name, '| event:', eventType || '-', '| action:', actionType || '-');
  }

  console.log('\n=== GAP ANALYSIS ===');
  console.log('  Page view rule (Library Loaded → Send Event):', pageViewRule ? 'EXISTS (' + pageViewRule.id + ')' : 'MISSING – need to create');
  console.log('  Link click rule (Click → Send Event):', linkClickRule ? 'EXISTS (' + linkClickRule.id + ')' : 'MISSING – need to create');

  return { rules, dataElements: elements, coreExt, webSdkExt, pageViewRule, linkClickRule, linkClickUrl, linkClickText };
}

main().catch(e => {
  console.error(e.message);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});
