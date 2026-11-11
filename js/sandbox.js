// Sandbox: the whole app with nothing locked. Several named pieces, saved in this browser.

import { projectToMidi } from './midi.js';
import { newProject, normalizeProject } from './project.js';
import { copyText, downloadBytes, h, pack, slug, store, toast, uid, unpack } from './util.js';
import { Workspace } from './workspace.js';

const $ = (sel) => document.querySelector(sel);
const KEY = 'es.sandbox.pieces';
const CUR = 'es.sandbox.current';

let pieces = store.get(KEY, []).filter((x) => x && x.id).map((x) => ({ ...x, project: normalizeProject(x.project) }));
let current = null;

const ws = new Workspace($('#workspace'), {
  onChange: (p) => {
    if (!current) return;
    current.project = p;
    current.updatedAt = new Date().toISOString();
    save();
  },
});

function save() {
  if (!store.set(KEY, pieces)) toast('Could not save: this browser’s storage is full or blocked.');
  if (current) store.set(CUR, current.id);
}

function blankPiece(title = 'Untitled piece') {
  return { id: uid(), title, updatedAt: new Date().toISOString(), project: newProject({ key: 'C', mode: 'major', bpm: 90, bars: 8 }) };
}

function open(id) {
  current = pieces.find((x) => x.id === id) || pieces[0];
  ws.setProject(current.project, { title: current.title });
  $('#piece-title').value = current.title;
  renderList();
  save();
}

function renderList() {
  const sorted = [...pieces].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  $('#piece-list').replaceChildren(...sorted.map((x) => h('option', { value: x.id, selected: x.id === current?.id }, x.title || 'Untitled piece')));
}

$('#piece-list').addEventListener('change', (e) => open(e.target.value));

$('#piece-title').addEventListener('input', (e) => {
  current.title = e.target.value.trim() || 'Untitled piece';
  ws.title = current.title;
  save();
  renderList();
});

$('#new-btn').addEventListener('click', () => {
  const p = blankPiece(`Piece ${pieces.length + 1}`);
  pieces.push(p);
  open(p.id);
  $('#piece-title').select();
});

$('#dup-btn').addEventListener('click', () => {
  const p = { ...blankPiece(`${current.title} (copy)`), project: ws.getProject() };
  pieces.push(p);
  open(p.id);
  toast('Duplicated. You are now editing the copy.');
});

$('#del-btn').addEventListener('click', () => {
  if (!confirm(`Delete “${current.title}”? This can’t be undone.`)) return;
  pieces = pieces.filter((x) => x.id !== current.id);
  if (!pieces.length) pieces.push(blankPiece());
  open(pieces[0].id);
  toast('Piece deleted.');
});

document.querySelectorAll('[data-export]').forEach((btn) => btn.addEventListener('click', () => {
  const which = btn.dataset.export;
  const bytes = projectToMidi(ws.getProject(), { name: current.title, only: which === 'all' ? null : which });
  downloadBytes(bytes, `${slug(current.title)}-${which}.mid`, 'audio/midi');
}));

$('#share-btn').addEventListener('click', async () => {
  const url = new URL('sandbox.html', location.href);
  url.search = new URLSearchParams({ p: await pack({ title: current.title, project: ws.getProject() }) }).toString();
  const ok = await copyText(url.href);
  $('#share-status').replaceChildren(
    ok ? 'Link copied.' : 'Copy this link:',
    h('input', { class: 'linkbox', readonly: true, value: url.href, onfocus: (e) => e.target.select() }));
});

// Start: open a shared piece as a new copy, or the last piece, or a blank one.
(async () => {
  const shared = new URLSearchParams(location.search).get('p');
  if (shared) {
    try {
      const data = await unpack(shared);
      const p = { ...blankPiece(String(data.title || 'Shared piece').slice(0, 80)), project: normalizeProject(data.project) };
      pieces.push(p);
      history.replaceState(null, '', 'sandbox.html');
      open(p.id);
      toast('Opened a shared piece as a new copy in your Sandbox.');
      return;
    } catch (err) {
      toast('That share link could not be opened: ' + (err.message || err));
    }
  }
  if (!pieces.length) pieces.push(blankPiece());
  open(store.get(CUR) || pieces[0].id);
})();
