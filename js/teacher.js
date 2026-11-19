import { keyText } from './theory.js?v=202611190054';
// Teacher marking page: open submissions, listen, see checks and DAW analysis, score, send feedback link.

import { runChecks } from './checks.js?v=202611190054';
import { KIND_LABELS, findExercise } from './lessons.js?v=202611190054';
import { analyseMidi, readMidi } from './midi.js?v=202611190054';
import { renderChecks, renderMidiAnalysis } from './panels.js?v=202611190054';
import { makeFeedback, parseAnswers, parseSubmission } from './submission.js?v=202611190054';
import { base64ToBytes, bytesToBase64, copyText, downloadBytes, formatBytes, h, pack, store, toast, unpack } from './util.js?v=202611190054';
import { normalizeProject } from './project.js?v=202611190054';
import { downloadAttachment, inbox, myProfile, renderAccountWidget, saveFeedback } from './auth.js?v=202611190054';
import { Workspace } from './workspace.js?v=202611190054';
import { Player } from './audio.js?v=202611190054';

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

let hideMarked = store.get('es.hideMarked', false);

const isMarked = (s) => s.status === 'marked' || !!store.get(marksKey(s.id))?.done;
const byDate = (a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '');
/** Waiting submissions, oldest first: the order to mark them in. */
const toMark = () => [...subs.values()].filter((s) => !isMarked(s)).sort((a, b) => byDate(b, a));

function renderList() {
  const item = (s) => {
    const m = store.get(marksKey(s.id));
    const marked = isMarked(s);
    const { exercise } = findExercise(s.lessonId, s.exerciseId);
    return h('li', {},
      h('button', { type: 'button', class: `sub-item${current?.id === s.id ? ' on' : ''}`, onclick: () => open(s.id) },
        h('span', { class: `st ${marked ? 'st-submitted' : m ? 'st-tried' : 'st-new'}`, title: marked ? 'Marked' : m ? 'Draft' : 'Not marked' }),
        h('span', { class: 'sub-text' }, h('strong', {}, s.student.name),
          h('span', { class: 'muted small' }, `${s.exerciseTitle || s.exerciseId}${s.submittedAt ? ' · ' + new Date(s.submittedAt).toLocaleDateString() : ''}`),
          h('span', { class: 'small' }, marked ? h('span', { class: 'muted' }, '✓ Marked') : h('b', { class: 'waiting' }, m ? 'Draft: not sent yet' : 'To mark'),
            ['auto', 'quiz', 'form'].includes(exercise?.kind) ? h('span', { class: 'muted' }, ' · checked instantly') : '',
            s.message ? h('span', { class: 'muted' }, ' · 💬 message') : ''))));
  };
  const waiting = toMark().reverse(); // newest first in the list
  const done = [...subs.values()].filter((s) => isMarked(s) && !(hideMarked && s.id !== current?.id)).sort(byDate);
  $('#sub-list').replaceChildren(
    h('li', { class: 'inbox-title' }, `To mark (${waiting.length})`),
    ...(waiting.length ? waiting.map(item) : [h('li', { class: 'muted small' }, 'Nothing waiting. 🎉')]),
    done.length ? h('li', { class: 'inbox-title' }, `Marked (${done.length})`) : '',
    ...done.map(item));
}

// ---------- Online inbox (teacher account) ----------

function fromRow(r) {
  return {
    id: r.id,
    cloud: true,
    status: r.status,
    submittedAt: r.created_at,
    lessonId: r.lesson_id,
    exerciseId: r.exercise_id,
    exerciseTitle: r.exercise_title || '',
    student: { name: r.student?.full_name || 'Student' },
    message: r.message || '',
    project: normalizeProject(r.project),
    checks: (Array.isArray(r.checks) ? r.checks : []).map((c) => ({ label: String(c?.label || ''), pass: !!c?.pass, detail: String(c?.detail || '') })),
    attachments: (Array.isArray(r.attachments) ? r.attachments : []).map((a) => ({ kind: a.kind === 'audio' ? 'audio' : 'midi', fileName: String(a.fileName || 'file'), type: String(a.type || ''), size: Number(a.size) || 0, path: String(a.path || '') })),
    answers: parseAnswers(r.answers),
    cloudScores: Array.isArray(r.scores) ? r.scores : null,
    cloudComment: r.comment || '',
  };
}

async function loadInbox() {
  const box = $('#cloud-box');
  const me = await myProfile();
  renderAccountWidget($('#account-widget'));
  if (!me || me.role !== 'teacher') {
    box.replaceChildren(h('p', { class: 'muted small' }, me
      ? 'You are signed in as a student. Online submissions are only shown to the teacher account.'
      : 'Sign in with your teacher account to see students’ online submissions.'),
      me ? '' : h('a', { class: 'btn small primary', href: 'account.html?next=mark.html' }, 'Sign in'));
    return;
  }
  box.replaceChildren(h('p', { class: 'muted small' }, 'Loading online submissions…'));
  try {
    const rows = await inbox();
    rows.forEach((r) => subs.set(r.id, fromRow(r)));
    const waiting = rows.filter((r) => r.status !== 'marked').length;
    box.replaceChildren(
      h('h3', { class: 'inbox-title' }, `Online: ${waiting} waiting · ${rows.length} in total`),
      h('div', { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn small', onclick: loadInbox }, '↻ Refresh'),
        h('label', { class: 'toggle small' }, h('input', { type: 'checkbox', checked: hideMarked, onchange: (e) => { hideMarked = e.target.checked; store.set('es.hideMarked', hideMarked); renderList(); } }), ' Hide marked')));
    renderList();
  } catch (err) {
    box.replaceChildren(h('p', { class: 'warn' }, `Couldn’t load submissions: ${err.message}`));
  }
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

async function open(id) {
  const sub = subs.get(id);
  if (!sub) return;
  current = sub;
  renderList();
  // Online submissions: fetch the attached MIDI/audio from private storage the first time.
  if (sub.cloud && !sub.filesLoaded) {
    $('#detail').replaceChildren(h('p', { class: 'muted' }, sub.attachments.length ? 'Loading the attached files…' : 'Loading…'));
    for (const a of sub.attachments) {
      try {
        a.data = bytesToBase64(await downloadAttachment(a.path));
      } catch (err) {
        a.error = err.message;
      }
    }
    sub.attachments = sub.attachments.filter((a) => a.data || toast(`${a.fileName}: ${a.error}`));
    sub.filesLoaded = true;
    if (current !== sub) return;
  }
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  const { lesson, exercise } = findExercise(sub.lessonId, sub.exerciseId);
  const mctx = midiContext(sub);
  const audio = sub.attachments.find((a) => a.kind === 'audio');
  const ctx = { midi: mctx.midi, audio: audio ? { fileName: audio.fileName } : null, answers: sub.answers };
  const checks = exercise ? runChecks(exercise, sub.project, ctx) : sub.checks;
  const rubric = exercise?.rubric?.length ? exercise.rubric : [{ label: 'Overall', max: 10 }];
  const saved = store.get(marksKey(sub.id), null) || (sub.cloudScores ? { scores: sub.cloudScores, comment: sub.cloudComment, done: true } : {});
  const scores = rubric.map((r, i) => ({ label: r.label, max: r.max, score: saved.scores?.[i]?.score ?? '' }));

  const detail = $('#detail');
  detail.replaceChildren();

  // Header
  detail.append(h('section', { class: 'card' },
    h('div', { class: 'ex-head' },
      h('div', {},
        exercise ? h('span', { class: `badge kind-${exercise.kind}` }, KIND_LABELS[exercise.kind]) : h('span', { class: 'badge' }, 'Unknown exercise'),
        h('h2', {}, `${sub.student.name}: ${sub.exerciseTitle || sub.exerciseId}`),
        h('p', { class: 'muted' }, `${lesson ? lesson.title + ' · ' : ''}submitted ${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'unknown date'} · ${keyText(sub.project.key, sub.project.mode)}, ${sub.project.bpm} BPM, ${sub.project.bars} bars`))),
    sub.message ? h('blockquote', { class: 'comment' }, sub.message) : '',
    !exercise ? h('p', { class: 'warn' }, 'This exercise isn’t in this copy of the course, so the checks shown are the ones the student saw.') : ''));

  // Composer (read-only)
  const wsEl = h('div');
  detail.append(h('section', { class: 'card', hidden: !!exercise?.noComposer }, h('h3', {}, 'Their piece'), wsEl));
  ws?.destroy();
  ws = new Workspace(wsEl, { readOnly: true, player });
  ws.setProject(sub.project, { title: `${sub.student.name}: ${sub.exerciseTitle}`, phraseBars: exercise?.patternChoice ? (sub.answers?.phraseBars || 1) : (exercise?.form?.phraseBars || 0),
    phraseLabels: exercise?.patternChoice && sub.answers?.pattern ? sub.answers.pattern.split(' ') : (exercise?.form?.show || []) });

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
        : '',
      exercise?.sections && sub.answers?.sectionLabels?.length
        ? h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Section'), h('th', {}, 'Their letters'), h('th', {}, 'Your analysis'))),
          h('tbody', {}, exercise.sections.map((sec, i) => h('tr', {},
            h('td', {}, String(i + 1)),
            h('td', {}, (sub.answers.sectionLabels[i] || []).map((l) => l || '·').join(' ')),
            h('td', {}, sec)))))
        : '',
      sub.answers?.pattern && exercise?.patternChoice
        ? h('p', { class: 'muted small' }, `Pattern they chose: ${sub.answers.pattern} (${sub.answers.phraseBars} bar${sub.answers.phraseBars > 1 ? 's' : ''} per phrase)`)
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
    const url = new URL('lesson.html', location.href);
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
      sub.cloud ? h('button', {
        type: 'button', class: 'btn primary',
        onclick: async (e) => {
          e.target.disabled = true;
          try {
            await saveFeedback(sub.id, { scores: allScores(), comment: comment.value.trim() });
            sub.status = 'marked';
            sub.cloudScores = allScores();
            sub.cloudComment = comment.value.trim();
            saved.done = true;
            persist({ done: true });
            const nx = nextToMark(sub);
            linkOut.replaceChildren(`Feedback saved. ${sub.student.name} can see it in their profile now. `,
              nx ? h('button', { type: 'button', class: 'btn small primary', onclick: () => open(nx.id) }, `Next: ${nx.student.name} →`) : 'Nothing else is waiting. 🎉');
          } catch (err) {
            linkOut.replaceChildren(h('p', { class: 'warn' }, `Not saved: ${err.message}`));
          } finally {
            e.target.disabled = false;
          }
        },
      }, sub.status === 'marked' ? 'Update feedback' : 'Save feedback') : '',
      h('button', {
        type: 'button', class: sub.cloud ? 'btn' : 'btn primary',
        onclick: async () => {
          const url = await feedbackUrl();
          const ok = await copyText(url);
          saved.done = true;
          persist({ done: true });
          linkOut.replaceChildren(ok ? 'Feedback link copied. Send it to the student.' : 'Copy this link and send it to the student:',
            h('input', { class: 'linkbox', readonly: true, value: url, onfocus: (e) => e.target.select() }));
        },
      }, 'Copy feedback link'),
      h('button', { type: 'button', class: 'btn', onclick: async () => window.open(await feedbackUrl(), '_blank', 'noopener') }, 'Preview as student'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => {
        const nx = nextToMark(sub);
        if (nx) open(nx.id); else toast('Nothing else is waiting to be marked.');
      } }, 'Next to mark →')),
    linkOut));

  updateTotal();
  detail.scrollTop = 0;
  // The page may be scrolled down (or, on a phone, the list sits above): bring the submission's top into view.
  const top = detail.getBoundingClientRect().top;
  if (top < 0 || top > innerHeight * 0.6) detail.scrollIntoView({ block: 'start' });
}

/** The next submission waiting for a mark after this one (oldest first), or null. */
function nextToMark(sub) {
  const list = toMark().filter((s) => s.id !== sub.id);
  return list[0] || null;
}

// ---------- Start: a submission link opens straight here ----------

// From the Students page: mark.html?open=<submission id> opens that online submission.
loadInbox().then(() => {
  const id = new URLSearchParams(location.search).get('open');
  if (id && subs.has(id)) open(id);
});

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
