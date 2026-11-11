// Teacher marking page: open submissions, listen, see checks and DAW analysis, score, send feedback link.

import { runChecks } from './checks.js';
import { KIND_LABELS, findExercise } from './lessons.js';
import { analyseMidi, readMidi } from './midi.js';
import { renderChecks, renderMidiAnalysis } from './panels.js';
import { makeFeedback, parseSubmission } from './submission.js';
import { base64ToBytes, copyText, downloadBytes, formatBytes, h, pack, store, toast, unpack } from './util.js';
import { Workspace } from './workspace.js';
import { Player } from './audio.js';

const $ = (sel) => document.querySelector(sel);
const subs = new Map(); // id -> submission
let current = null;
let ws = null;
let audioUrl = null;
const player = new Player(); // shared, so opening many submissions doesn't pile up synths

const marksKey = (id) => `es.marks.${id}`;

// ---------- Loading ----------

async function addFiles(files) {
  let added = 0;
  for (const f of files) {
    try {
      const sub = parseSubmission(JSON.parse(await f.text()));
      subs.set(sub.id, sub);
      added++;
      if (!current) current = sub;
    } catch (err) {
      toast(`${f.name}: ${err.message || err}`);
    }
  }
  if (added) {
    renderList();
    if (current) open(current.id);
  }
}

$('#files').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
const dz = $('#dropzone');
['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, () => dz.classList.remove('over')));
dz.addEventListener('drop', (e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); });
// Dropping anywhere on the page works too.
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => { if (!dz.contains(e.target)) { e.preventDefault(); addFiles([...e.dataTransfer.files]); } });

function renderList() {
  const list = [...subs.values()].sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  $('#sub-list').replaceChildren(...list.map((s) => {
    const m = store.get(marksKey(s.id));
    return h('li', {},
      h('button', { type: 'button', class: `sub-item${current?.id === s.id ? ' on' : ''}`, onclick: () => open(s.id) },
        h('span', { class: `st ${m?.done ? 'st-submitted' : m ? 'st-tried' : 'st-new'}`, title: m?.done ? 'Marked' : m ? 'Draft' : 'Not marked' }),
        h('span', { class: 'sub-text' }, h('strong', {}, s.student.name), h('span', { class: 'muted small' }, s.exerciseTitle || s.exerciseId))));
  }));
}

// ---------- Detail ----------

function midiContext(sub) {
  const midis = sub.attachments.filter((a) => a.kind === 'midi');
  if (!midis.length) return { midi: null, errors: [] };
  const errors = [];
  const tracks = [];
  let bpm = null;
  for (const m of midis) {
    try {
      const parsed = readMidi(base64ToBytes(m.data));
      tracks.push(...parsed.tracks);
      bpm ??= parsed.bpm;
    } catch (err) {
      errors.push(`${m.fileName}: ${err.message || err}`);
    }
  }
  if (!tracks.length) return { midi: null, errors };
  return { midi: { fileName: midis.map((m) => m.fileName).join(', '), analysis: analyseMidi({ tracks, bpm }, sub.project.key, sub.project.mode) }, errors };
}

function open(id) {
  const sub = subs.get(id);
  if (!sub) return;
  current = sub;
  renderList();
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  const { lesson, exercise } = findExercise(sub.lessonId, sub.exerciseId);
  const mctx = midiContext(sub);
  const audio = sub.attachments.find((a) => a.kind === 'audio');
  const ctx = { midi: mctx.midi, audio: audio ? { fileName: audio.fileName } : null, answers: sub.answers };
  const checks = exercise ? runChecks(exercise, sub.project, ctx) : sub.checks;
  const rubric = exercise?.rubric?.length ? exercise.rubric : [{ label: 'Overall', max: 10 }];
  const saved = store.get(marksKey(sub.id), {});
  const scores = rubric.map((r, i) => ({ label: r.label, max: r.max, score: saved.scores?.[i]?.score ?? '' }));

  const detail = $('#detail');
  detail.replaceChildren();

  // Header
  detail.append(h('section', { class: 'card' },
    h('div', { class: 'ex-head' },
      h('div', {},
        exercise ? h('span', { class: `badge kind-${exercise.kind}` }, KIND_LABELS[exercise.kind]) : h('span', { class: 'badge' }, 'Unknown exercise'),
        h('h2', {}, `${sub.student.name}: ${sub.exerciseTitle || sub.exerciseId}`),
        h('p', { class: 'muted' }, `${lesson ? lesson.title + ' · ' : ''}submitted ${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'unknown date'} · ${sub.project.key} ${sub.project.mode}, ${sub.project.bpm} BPM, ${sub.project.bars} bars`))),
    sub.message ? h('blockquote', { class: 'comment' }, sub.message) : '',
    !exercise ? h('p', { class: 'warn' }, 'This exercise isn’t in this copy of the course, so the checks shown are the ones the student saw.') : ''));

  // Composer (read-only)
  const wsEl = h('div');
  detail.append(h('section', { class: 'card' }, h('h3', {}, 'Their piece'), wsEl));
  ws?.destroy();
  ws = new Workspace(wsEl, { readOnly: true, player });
  ws.setProject(sub.project, { title: `${sub.student.name}: ${sub.exerciseTitle}`, phraseBars: exercise?.form?.phraseBars || 0 });

  // Checks + attachments
  const attach = h('div', {});
  if (audio) {
    audioUrl = URL.createObjectURL(new Blob([base64ToBytes(audio.data)], { type: audio.type || 'audio/mpeg' }));
    attach.append(h('h4', {}, 'Bounce'), h('audio', { controls: true, src: audioUrl, preload: 'metadata' }),
      h('p', { class: 'muted small' }, `${audio.fileName} · ${formatBytes(audio.size)}`));
  }
  if (mctx.midi) attach.append(h('h4', {}, 'MIDI from their DAW'), renderMidiAnalysis(mctx.midi.analysis, sub.project));
  for (const e of mctx.errors) attach.append(h('p', { class: 'warn' }, e));
  if (sub.attachments.length) {
    attach.append(h('div', { class: 'row wrap' }, sub.attachments.map((a) => h('button', {
      type: 'button', class: 'btn small',
      onclick: () => downloadBytes(base64ToBytes(a.data), a.fileName, a.type || 'application/octet-stream'),
    }, `Download ${a.fileName}`))));
  } else {
    attach.append(h('p', { class: 'muted' }, 'No files attached.'));
  }
  detail.append(h('div', { class: 'cols' },
    h('section', { class: 'card' }, h('h3', {}, 'Automatic checks'), renderChecks(checks),
      sub.answers?.formLabels?.some(Boolean)
        ? h('p', { class: 'muted small' }, `Their form labels: ${sub.answers.formLabels.map((l) => l || '–').join(' ')}${exercise?.form?.answer ? ` · answer: ${exercise.form.answer.join(' ')}` : ''}`)
        : ''),
    h('section', { class: 'card' }, h('h3', {}, 'Attachments'), attach)));

  // Marking
  const totalEl = h('span', { class: 'score-big' });
  const comment = h('textarea', { rows: 5, placeholder: 'What worked, and one thing to try next time…' });
  comment.value = saved.comment || '';
  const autoPassed = checks.filter((c) => c.pass).length;
  const includeAuto = exercise?.kind === 'auto' && checks.length > 0;

  const allScores = () => [
    ...scores.map((s) => ({ label: s.label, max: s.max, score: Number(s.score) || 0 })),
    ...(includeAuto ? [{ label: 'Automatic checks', max: checks.length, score: autoPassed }] : []),
  ];
  const updateTotal = () => {
    const all = allScores();
    totalEl.replaceChildren(h('span', {}, String(all.reduce((a, s) => a + s.score, 0))), h('small', {}, `/ ${all.reduce((a, s) => a + s.max, 0)}`));
  };
  const persist = (extra = {}) => {
    store.set(marksKey(sub.id), { scores, comment: comment.value, done: saved.done, ...extra });
    renderList();
  };

  const rows = scores.map((s) => {
    const seg = h('div', { class: 'seg score-seg', role: 'group', 'aria-label': s.label });
    const paint = () => seg.replaceChildren(...Array.from({ length: s.max + 1 }, (_, v) => h('button', {
      type: 'button', class: String(s.score) === String(v) ? 'on' : '', 'aria-pressed': String(String(s.score) === String(v)),
      onclick: () => { s.score = v; paint(); updateTotal(); persist(); },
    }, String(v))));
    paint();
    return h('div', { class: 'rubric-row' }, h('span', {}, s.label), seg);
  });
  comment.addEventListener('input', () => persist());

  const feedbackUrl = async () => {
    const fb = makeFeedback({ submission: sub, scores: allScores(), comment: comment.value.trim(), checks });
    const url = new URL('index.html', location.href);
    url.search = new URLSearchParams({ feedback: await pack(fb) }).toString();
    return url.href;
  };
  const linkOut = h('div');

  detail.append(h('section', { class: 'card' },
    h('div', { class: 'ex-head' }, h('h3', {}, 'Mark'), totalEl),
    ...rows,
    includeAuto ? h('div', { class: 'rubric-row' }, h('span', {}, 'Automatic checks'), h('b', {}, `${autoPassed} / ${checks.length}`)) : '',
    h('label', { class: 'field' }, 'Comment for the student', comment),
    h('div', { class: 'row wrap' },
      h('button', {
        type: 'button', class: 'btn primary',
        onclick: async () => {
          const url = await feedbackUrl();
          const ok = await copyText(url);
          saved.done = true;
          persist({ done: true });
          linkOut.replaceChildren(ok ? 'Feedback link copied. Send it to the student.' : 'Copy this link and send it to the student:',
            h('input', { class: 'linkbox', readonly: true, value: url, onfocus: (e) => e.target.select() }));
        },
      }, 'Copy feedback link'),
      h('button', { type: 'button', class: 'btn', onclick: async () => window.open(await feedbackUrl(), '_blank', 'noopener') }, 'Preview as student')),
    linkOut));

  updateTotal();
  detail.scrollTop = 0;
}

// ---------- Start: a submission link opens straight here ----------

(async () => {
  const s = new URLSearchParams(location.search).get('s');
  if (!s) return;
  try {
    const sub = parseSubmission(await unpack(s));
    subs.set(sub.id, sub);
    renderList();
    open(sub.id);
  } catch (err) {
    toast('That submission link could not be opened: ' + (err.message || err));
  }
})();
