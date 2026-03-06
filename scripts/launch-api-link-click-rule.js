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

const PROPERTY_ID = process.env.LAUNCH_PROPERTY_ID || 'PR5057e9b14a5e4fae942acbb8a85da6c8';
const REACTOR_BASE = 'https://reactor.adobe.io';

// Scope - get from Developer Console: OAuth credential → "Generate access token" shows scope
// If invalid_target_scope, add ADOBE_OAUTH_SCOPE to .env with the scope from your credential
const OAUTH_SCOPE = process.env.ADOBE_OAUTH_SCOPE;

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
  if (OAUTH_SCOPE) body.append('scope', OAUTH_SCOPE);

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
  for (const ext of extensions) {
    const rel = ext.relationships?.['extension_package']?.links?.related;
    if (!rel) continue;
    try {
      const pkgRes = await reactorFetch(accessToken, 'GET', rel);
      const name = pkgRes?.data?.attributes?.name || '';
      if (name.toLowerCase().includes(packageName.toLowerCase())) {
        return ext;
      }
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
  const webSdkExt = await findExtensionByPackageName(extensions, accessToken, 'Adobe Experience Platform Web SDK');

  if (!coreExt) throw new Error('Core extension not found in property');
  if (!webSdkExt) throw new Error('Adobe Experience Platform Web SDK extension not found');

  console.log('Core extension:', coreExt.id);
  console.log('Web SDK extension:', webSdkExt.id);

  // Create data elements
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

  // Data element: Link Click URL (Core custom code)
  const deUrl = await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/data_elements`, {
    data: {
      type: 'data_elements',
      attributes: {
        name: 'Link Click URL',
        delegate_descriptor_id: 'adobe.core::dataElements::custom-code',
        settings: JSON.stringify({ language: 'javascript', source: linkClickUrlCode }),
        enabled: true,
      },
      relationships: {
        extension: { data: { id: coreExt.id, type: 'extensions' } },
      },
    },
  });
  const deUrlId = deUrl.data.id;
  console.log('Created data element: Link Click URL', deUrlId);

  // Data element: Link Click Text
  const deText = await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/data_elements`, {
    data: {
      type: 'data_elements',
      attributes: {
        name: 'Link Click Text',
        delegate_descriptor_id: 'adobe.core::dataElements::custom-code',
        settings: JSON.stringify({ language: 'javascript', source: linkClickTextCode }),
        enabled: true,
      },
      relationships: {
        extension: { data: { id: coreExt.id, type: 'extensions' } },
      },
    },
  });
  const deTextId = deText.data.id;
  console.log('Created data element: Link Click Text', deTextId);

  // Create rule
  const rule = await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/rules`, {
    data: {
      type: 'rules',
      attributes: { name: 'Link Clicks - Send to Web SDK', enabled: true },
    },
  });
  const ruleId = rule.data.id;
  console.log('Created rule:', ruleId);

  // Rule component: Click event (Core)
  const clickSettings = JSON.stringify({
    elementSelector: 'a[href]',
    bubbleFireIfChildFired: true,
    bubbleFireIfParentFired: true,
  });
  await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/rule_components`, {
    data: {
      type: 'rule_components',
      attributes: {
        delegate_descriptor_id: 'adobe.core::events::click',
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

  // Rule component: Condition - Link Click URL is set (Core value comparison)
  const condSettings = JSON.stringify({
    leftOperand: '%Link Click URL%',
    operator: 'is_set',
    rightOperand: '',
  });
  await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/rule_components`, {
    data: {
      type: 'rule_components',
      attributes: {
        delegate_descriptor_id: 'adobe.core::conditions::value-comparison',
        name: 'Link Click URL is set',
        order: 1,
        rule_order: 50,
        negate: false,
        settings: condSettings,
      },
      relationships: {
        extension: { data: { id: coreExt.id, type: 'extensions' } },
        rules: { data: [{ id: ruleId, type: 'rules' }] },
      },
    },
  });
  console.log('Added condition');

  // Rule component: Action - Send Event (Web SDK)
  // XDM for web.webinteraction.linkClicks
  const xdmData = {
    eventType: 'web.webinteraction.linkClicks',
    web: {
      webInteraction: {
        name: '%Link Click Text%',
        URL: '%Link Click URL%',
        linkClicks: { value: 1 },
      },
    },
  };
  const actionSettings = JSON.stringify({
    type: 'sendEvent',
    xdm: xdmData,
  });
  await reactorFetch(accessToken, 'POST', `/properties/${PROPERTY_ID}/rule_components`, {
    data: {
      type: 'rule_components',
      attributes: {
        delegate_descriptor_id: 'adobe.web-sdk::actions::send-event',
        name: 'Send Event - Link Clicks',
        order: 2,
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
