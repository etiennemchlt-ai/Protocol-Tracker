// The protocol versions in the far-left column, read top to bottom:
// - Protocol V1 (base protocol): the full list from Day 0, with the ones
//   never used in a "Dropped Protocols" group at the bottom
//   (protocol-base.json).
// - Each later version lists only what changed from the one before; the
//   note says it in words ("Added.", "Changed:", "Dropped:") and the reason
//   (protocol-v2.json, protocol-v3.json).
// Every dot in this column is green (see style.css); the words carry it.
// To add a version: a <details> block in index.html and a line in VERSIONS.
// (protocol.json, the old full list, is no longer shown on the page.)

import { renderCategory } from './protocol-shared.js';

const VERSIONS = [
  { url: 'protocol-base.json', bodyId: 'base-body', name: 'Protocol V1' },
  { url: 'protocol-v2.json', bodyId: 'v2-body', name: 'Protocol V2' },
  { url: 'protocol-v3.json', bodyId: 'v3-body', name: 'Protocol V3' },
];

async function renderVersion({ url, bodyId, name }) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const data = await res.json();
    body.innerHTML = '';
    (data.categories || []).forEach((c) => body.appendChild(renderCategory(c)));
  } catch (err) {
    console.error(err);
    body.innerHTML = `<p class="protocol-error">Couldn’t load ${name}.</p>`;
  }
}

VERSIONS.forEach(renderVersion);
