#!/usr/bin/env node
/**
 * Launch API: Create link click data elements and rule via Reactor API
 *
 * Uses OAuth Server-to-Server (client credentials). JWT is deprecated.
 *
 * Prerequisites:
 * - .env with ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET, ADOBE_ORG_ID
 * - OAuth Server-to-Server credential in Adobe Developer Console
 *   (Add "Adobe Experience Platform Data Collection" or "Experience Platform Launch API")
 *
 * Usage: node scripts/launch-api-link-click-rule.js
 *
 * Property ID from URL:
 * https://experience.adobe.com/.../properties/PR5057e9b14a5e4fae942acbb8a85da6c8/rules
 * => PR5057e9b14a5e4fae942acbb8a85da6c8
 */

const path = require('path');

// Load .env if present
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv optional
}

// Company: CO72fab825b7fc466d94f9ef13723dde55
const PROPERTY_ID = process.env.LAUNCH_PROPERTY_ID || 'PR5057e9b14a5e4fae942acbb8a85da6c8';
const REACTOR_BASE = 'https://reactor.adobe.io';

// Scope is REQUIRED – omit and you get "invalid_target_scope". Launch API needs full scope.
const DEFAULT_SCOPE = 'cjm.suppression_service.client.delete,cjm.suppression_service.client.all,openid,session,AdobeID,read_organizations,additional_info.projectedProductContext,assurance_manage_sessions,assurance_read_events,assurance_read_annotations,assurance_read_session_annotations,assurance_read_plugins,assurance_read_clients,additional_info.roles,adobeio_api,read_client_secret,manage_client_secrets,campaign_sdk,campaign_config_server_general,deliverability_service_general,read_pc.acp,read_pc,read_pc.dma_tartan,additional_info,target_sdk,additional_info.job_function,event_receiver_api';
const _envScope = process.env.ADOBE_OAUTH_SCOPE;
const OAUTH_SCOPE = (_envScope && _envScope.split(',').length >= 15) ? _envScope : DEFAULT_SCOPE;

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}. Set in .env or environment.`);
  return v;
}

async function getAccessToken() {
  const clientId = getEnv('ADOBE_CLIENT_ID');
  const clientSecret = getEnv('ADOBE_CLIENT_SECRET');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });
  body.append('scope', OAUTH_SCOPE);

  const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`OAuth token failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
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

async function getExtensions(accessToken) {
  const data = await reactorFetch(accessToken, 'GET', `/properties/${PROPERTY_ID}/extensions`);
  return data.data || [];
}

async function findExtensionByPackageName(extensions, accessToken, packageName) {
  const patterns = packageName.toLowerCase().split(',').map(s => s.trim());
  for (const ext of extensions) {
    const extName = (ext.attributes?.name || '').toLowerCase();
    if (patterns.some(p => extName.includes(p))) return ext;
    const rel = ext.relationships?.['extension_package']?.links?.related;
    if (!rel) continue;
    try {
      const pkgRes = await reactorFetch(accessToken, 'GET', rel);
      const name = (pkgRes?.data?.attributes?.name || '').toLowerCase();
      if (patterns.some(p => name.includes(p))) return ext;
    } catch (e) {
      // skip if we can't fetch package
    }
  }
  return null;
}

async function main() {
  console.log('Launch API: Creating link click data elements and rule\n');
  console.log('Property ID:', PROPERTY_ID);

  const accessToken = await getAccessToken();
  console.log('Got access token');

  const extensions = await getExtensions(accessToken);
  console.log('Found', extensions.length, 'extensions');

  const coreExt = await findExtensionByPackageName(extensions, accessToken, 'Core');
  const webSdkExt = await findExtensionByPackageName(extensions, accessToken, 'web sdk,alloy,experience platform');

  if (!coreExt) throw new Error('Core extension not found in property');
  if (!webSdkExt) throw new Error('Adobe Experience Platform Web SDK extension not found');

  console.log('Core extension:', coreExt.id);
  console.log('Web SDK extension:', webSdkExt.id);

  // Check for existing data elements and rule
  const dataElementsRes = await reactorFetch(accessToken, 'GET', `/properties/${PROPERTY_ID}/data_elements?page[size]=100`);
  const existingElements = dataElementsRes.data || [];
  let deUrl = existingElements.find(e => (e.attributes?.name || '') === 'Link Click URL');
  let deText = existingElements.find(e => (e.attributes?.name || '') === 'Link Click Text');
  const rulesRes = await reactorFetch(accessToken, 'GET', `/properties/${PROPERTY_ID}/rules?page[size]=100`);
  const existingRules = rulesRes.data || [];
  let rule = existingRules.find(r => (r.attributes?.name || '').includes('Link Clicks'));

  // Create data elements if missing
  const linkClickUrlCode = `return (function() {
  var target = event.target;
  while (target && target !== document) {
    if (target.href) return target.href;
    target = target.parentElement;
  }
  return '';
})();`;

  const linkClickTextCode = `return (function() {
  var target = event.target;
  while (target && target !== document) {
    var text = target.textContent || target.innerText;
    if (text && target.href) return text.trim().substring(0, 255);
    target = target.parentElement;
  }
  return '';
})();`;

  if (!deUrl) {
  const deUrlRes = await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/data_elements`, {
    data: {
      type: 'data_elements',
      attributes: {
        name: 'Link Click URL',
        delegate_descriptor_id: 'core::dataElements::custom-code',
        settings: JSON.stringify({ source: linkClickUrlCode }),
        enabled: true,
      },
      relationships: {
        extension: { data: { id: coreExt.id, type: 'extensions' } },
      },
    },
  });
  deUrl = deUrlRes.data;
  console.log('Created data element: Link Click URL', deUrl.id);
  }
  const deUrlId = deUrl.id;

  if (!deText) {
  const deTextRes = await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/data_elements`, {
    data: {
      type: 'data_elements',
      attributes: {
        name: 'Link Click Text',
        delegate_descriptor_id: 'core::dataElements::custom-code',
        settings: JSON.stringify({ source: linkClickTextCode }),
        enabled: true,
      },
      relationships: {
        extension: { data: { id: coreExt.id, type: 'extensions' } },
      },
    },
  });
  deText = deTextRes.data;
  console.log('Created data element: Link Click Text', deText.id);
  }
  const deTextId = deText.id;

  // Data element: Link Click XDM (for Send Event - xdm must be a data element reference)
  let deXdm = existingElements.find(e => (e.attributes?.name || '') === 'Link Click XDM');
  if (!deXdm) {
    const xdmCode = `return (function() {
  var url = _satellite.getVar('Link Click URL') || '';
  var text = _satellite.getVar('Link Click Text') || '';
  return { eventType: 'web.webinteraction.linkClicks', web: { webInteraction: { name: text, URL: url, linkClicks: { value: 1 } } } };
})();`;
    const deXdmRes = await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/data_elements`, {
      data: {
        type: 'data_elements',
        attributes: {
          name: 'Link Click XDM',
          delegate_descriptor_id: 'core::dataElements::custom-code',
          settings: JSON.stringify({ source: xdmCode }),
          enabled: true,
        },
        relationships: {
          extension: { data: { id: coreExt.id, type: 'extensions' } },
        },
      },
    });
    deXdm = deXdmRes.data;
    console.log('Created data element: Link Click XDM', deXdm.id);
  }

  if (!rule) {
  const ruleRes = await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/rules`, {
    data: {
      type: 'rules',
      attributes: { name: 'Link Clicks - Send to Web SDK', enabled: true },
    },
  });
  rule = ruleRes.data;
  console.log('Created rule:', rule.id);
  }
  const ruleId = rule.id;

  // Rule component: Click event (Core)
  const clickSettings = JSON.stringify({
    elementSelector: 'a[href]',
  });
  await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/rule_components`, {
    data: {
      type: 'rule_components',
      attributes: {
        delegate_descriptor_id: 'core::events::click',
        name: 'Click - Links',
        order: 0,
        rule_order: 50,
        delay_next: false,
        settings: clickSettings,
      },
      relationships: {
        extension: { data: { id: coreExt.id, type: 'extensions' } },
        rules: { data: [{ id: ruleId, type: 'rules' }] },
      },
    },
  });
  console.log('Added Click event');

  // Rule component: Action - Send Event (Web SDK / Alloy)
  // xdm must be a data element reference like %Link Click XDM%
  const actionSettings = JSON.stringify({
    instanceName: 'alloy',
    type: 'sendEvent',
    xdm: '%Link Click XDM%',
  });
  await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/rule_components`, {
    data: {
      type: 'rule_components',
      attributes: {
        delegate_descriptor_id: 'adobe-alloy::actions::send-event',
        name: 'Send Event - Link Clicks',
        order: 1,
        rule_order: 50,
        settings: actionSettings,
      },
      relationships: {
        extension: { data: { id: webSdkExt.id, type: 'extensions' } },
        rules: { data: [{ id: ruleId, type: 'rules' }] },
      },
    },
  });
  console.log('Added Send Event action');

  console.log('\nDone. Next steps:');
  console.log('1. In Launch UI, add this rule to your library');
  console.log('2. Build and publish the library');
  console.log('Rule ID:', ruleId);
}

main().catch((err) => {
  console.error(err);
  if (err.body) console.error('API response:', JSON.stringify(err.body, null, 2));
  process.exit(1);
});
