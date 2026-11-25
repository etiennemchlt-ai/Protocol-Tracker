// The protocol map in the far-left column: one row per protocol, one
// column per version.
// - protocol-base.json is V1: the full Day 0 list, with the ones never
//   used in a "Never Used" group at the bottom.
// - Each later file (protocol-v2.json, ...) lists only what changed:
//   "change" is added / changed / dropped, with the note saying how or why.
//   ("same" keeps the gray dot but gives it an updated note.)
// A row's dot in each version column: gray = doing it, no change; green =
// added (or reintroduced after a drop); blue = changed; red ✕ = dropped;
// faded ✕ = still dropped; hollow = never used. Hover (or tap) a dot to see
// its note.
// Items are matched across versions by their exact "text".
// To add a version: add its file to VERSIONS.

import { renderNote } from './protocol-shared.js';

const VERSIONS = [
  { url: 'protocol-base.json', label: 'V1', days: 'Days 0-30' },
  { url: 'protocol-v2.json', label: 'V2', days: 'Days 30-60' },
  { url: 'protocol-v3.json', label: 'V3', days: 'Days 60-84' },
  { url: 'protocol-v4.json', label: 'V4', days: 'Days 84-90' },
];

const KIND_LABEL = {
  base: 'Started',
  same: 'No change',
  added: 'Added',
  reintroduced: 'Reintroduced',
  changed: 'Changed',
  dropped: 'Dropped',
  still: 'Still dropped',
  never: 'Never used',
};

// Rows grouped by category, in order of first appearance. A category that
// first shows up in a later version goes in front of the next category
// that file lists (so V2's "Personally Implemented" lands on top).
function buildRows(files) {
  const cats = [];
  const rowsByText = new Map();

  files.forEach((data, vi) => {
    const list = data.categories || [];
    list.forEach((category, ci) => {
      let cat = cats.find((c) => c.name === category.name);
      if (!cat) {
        cat = { name: category.name, rows: [] };
        const nextKnown = list.slice(ci + 1).map((c) => cats.findIndex((k) => k.name === c.name)).find((i) => i >= 0);
        if (nextKnown === undefined) cats.push(cat);
        else cats.splice(nextKnown, 0, cat);
      }
      (category.items || []).forEach((item) => {
        let row = rowsByText.get(item.text);
        if (!row) {
          row = { text: item.text, cells: [] };
          rowsByText.set(item.text, row);
          cat.rows.push(row);
        }
        let kind = item.change;
        if (vi === 0) kind = item.status === 'dropped' ? 'never' : 'base';
        row.cells[vi] = { kind, item };
      });
    });
  });

  // Fill the versions where an item wasn't mentioned: still running (gray,
  // carrying its latest note), or still dropped (faded ✕). "Added" again
  // after a drop is "reintroduced".
  rowsByText.forEach((row) => {
    let last = null;
    for (let vi = 0; vi < files.length; vi += 1) {
      const cell = row.cells[vi];
      if (cell) {
        if (cell.kind === 'added' && last && last.kind === 'dropped') cell.kind = 'reintroduced';
        last = cell;
      } else if (last && last.kind === 'dropped') {
        row.cells[vi] = { kind: 'still', item: last.item };
      } else if (last && last.kind !== 'never') {
        row.cells[vi] = { kind: 'same', item: last.item };
      }
    }
    const final = row.cells[files.length - 1];
    row.inactive = !final || ['dropped', 'still', 'never'].includes(final.kind);
  });

  return cats.filter((c) => c.rows.length);
}

// ---------- tooltip ----------

const tip = document.createElement('div');
tip.className = 'pmap-tip';
tip.setAttribute('role', 'tooltip');
tip.hidden = true;
document.body.appendChild(tip);
let pinned = null;

function showTip(dot) {
  const { kind, item, version, text } = dot._cell;
  tip.innerHTML = '';
  const head = document.createElement('div');
  head.className = `pmap-tip-head kind-${kind}`;
  head.textContent = `${version} · ${KIND_LABEL[kind]}`;
  const name = document.createElement('div');
  name.className = 'pmap-tip-name';
  name.textContent = text;
  tip.append(head, name);
  if (item.note) tip.appendChild(renderNote(item));
  tip.hidden = false;

  const r = dot.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(8, Math.min(left, document.documentElement.clientWidth - w - 8));
  let top = r.top - h - 8;
  if (top < 8) top = r.bottom + 8;
  tip.style.left = `${left + window.scrollX}px`;
  tip.style.top = `${top + window.scrollY}px`;
}

function hideTip() {
  if (pinned) return;
  tip.hidden = true;
}

function unpin() {
  if (pinned) pinned.classList.remove('is-pinned');
  pinned = null;
  tip.hidden = true;
}

document.addEventListener('click', (e) => {
  if (pinned && !tip.contains(e.target) && !e.target.closest('.pmap-dot')) unpin();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') unpin(); });
window.addEventListener('resize', unpin);

// ---------- render ----------

function renderMap(cats, target) {
  const table = document.createElement('table');
  table.className = 'pmap';

  const colgroup = document.createElement('colgroup');
  colgroup.appendChild(document.createElement('col'));
  VERSIONS.forEach(() => {
    const col = document.createElement('col');
    col.className = 'pmap-vcol';
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  VERSIONS.forEach((v) => {
    const th = document.createElement('th');
    th.className = 'pmap-vhead';
    th.scope = 'col';
    th.innerHTML = `<span class="pmap-vlabel">${v.label}</span><span class="pmap-vdays">${v.days.replace('Days ', '')}</span>`;
    th.title = v.days;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  cats.forEach((cat) => {
    const catRow = document.createElement('tr');
    catRow.className = 'pmap-cat';
    const catCell = document.createElement('th');
    catCell.colSpan = VERSIONS.length + 1;
    catCell.scope = 'colgroup';
    catCell.textContent = cat.name;
    catRow.appendChild(catCell);
    tbody.appendChild(catRow);

    cat.rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.className = `pmap-row${row.inactive ? ' is-inactive' : ''}`;
      const name = document.createElement('th');
      name.scope = 'row';
      name.className = 'pmap-name';
      name.textContent = row.text;
      tr.appendChild(name);

      VERSIONS.forEach((v, vi) => {
        const td = document.createElement('td');
        td.className = 'pmap-cell';
        const cell = row.cells[vi];
        if (cell) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `pmap-dot kind-${cell.kind}`;
          dot._cell = { ...cell, version: v.label, text: row.text };
          const note = cell.item.note ? `. ${cell.item.note}` : '';
          dot.setAttribute('aria-label', `${row.text}, ${v.label}: ${KIND_LABEL[cell.kind]}${note}`);
          dot.addEventListener('mouseenter', () => { if (!pinned) showTip(dot); });
          dot.addEventListener('mouseleave', hideTip);
          dot.addEventListener('focus', () => { if (!pinned) showTip(dot); });
          dot.addEventListener('blur', hideTip);
          // Click / tap pins the note open (so phones can read it and links
          // in it can be clicked); click again or anywhere else to close.
          dot.addEventListener('click', () => {
            if (pinned === dot) { unpin(); return; }
            if (pinned) pinned.classList.remove('is-pinned');
            pinned = dot;
            dot.classList.add('is-pinned');
            showTip(dot);
          });
          td.appendChild(dot);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  });
  table.appendChild(tbody);

  target.innerHTML = '';
  target.appendChild(table);
}

async function init() {
  const target = document.getElementById('protocol-map');
  if (!target) return;
  try {
    const files = await Promise.all(VERSIONS.map(async ({ url }) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      return res.json();
    }));
    renderMap(buildRows(files), target);
  } catch (err) {
    console.error(err);
    target.innerHTML = '<p class="protocol-error">Couldn’t load the protocols.</p>';
  }
}

init();
