/**
 * Admin API Config Update Script
 *
 * Run in browser console while logged into admin.hlx.page
 * (e.g. https://admin.hlx.page/status/adampadobe-wrk/eds-demo-git-wrk/main/)
 *
 * Uses partial update to content.json (may work when full config POST returns 403)
 */

const ORG = 'adampadobe-wrk';
const SITE = 'eds-demo-git-wrk';
const CONTENT_PAYLOAD = {
  source: {
    type: 'markup',
    url: 'https://author-p151367-e1559221.adobeaemcloud.com/bin/franklin.delivery/adampadobe-wrk/eds-demo-git-wrk/main',
    suffix: '.html'
  }
};

async function updateConfig() {
  const base = 'https://admin.hlx.page';
  const url = `${base}/config/${ORG}/sites/${SITE}/content.json`;

  console.log('POSTing to', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CONTENT_PAYLOAD)
  });

  if (res.ok) {
    const result = await res.json();
    console.log('Success!', result);
    alert('Content source updated. Refresh status to verify.');
    return result;
  }

  const errText = await res.text();
  console.error(res.status, errText);
  alert(`Failed ${res.status}. See console. If 403, try Cloud Manager.`);
}

updateConfig();
