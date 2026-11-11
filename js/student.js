// Student lesson page: video, exercises, composer, checks, DAW round-trip, submission, feedback.

import { chordsFound, runChecks } from './checks.js';
import { FORM_LABELS } from './form.js';
import { KIND_LABELS, LESSONS, findExercise, findLesson } from './lessons.js';
import { analyseMidi, projectToMidi, readMidi } from './midi.js';
import { renderChecks, renderMidiAnalysis } from './panels.js';
import { newProject, normalizeProject, setBars } from './project.js';
import { MAX_ATTACHMENT_BYTES, makeSubmission, parseAnswers, parseFeedback, submissionFileName } from './submission.js';
import { base64ToBytes, bytesToBase64, copyText, downloadBytes, formatBytes, h, pack, readFileBytes, slug, store, toast, unpack } from './util.js';
import { Workspace } from './workspace.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);

let lesson = findLesson(params.get('lesson')) || LESSONS[0];
let exercise = null;
let feedback = null; // when viewing a teacher's feedback link
const attachments = {}; // exerciseId -> { midi: [{fileName, size, bytes, parsed}], audio: {fileName, size, type, bytes, url} }

const workKey = (ex) => `es.work.${lesson.id}.${ex.id}`;
const answersKey = (ex) => `es.answers.${lesson.id}.${ex.id}`;
let answers = { formLabels: [], sameRhythm: [], samePitch: [] }; // form-analysis answers for the open exercise
const midiKey = (ex) => `es.midi.${lesson.id}.${ex.id}`;
const statusAll = () => store.get(`es.status.${lesson.id}`, {});
function setStatus(exId, status) {
  const all = statusAll();
  const rank = { tried: 1, passed: 2, submitted: 3 };
  if ((rank[status] || 0) >= (rank[all[exId]] || 0)) {
    all[exId] = status;
    store.set(`es.status.${lesson.id}`, all);
  }
  renderTabs();
}

const ws = new Workspace($('#workspace'), {
  onChange: (p) => {
    if (!feedback && exercise) store.set(workKey(exercise), p);
    updateMelodyGate(p);
  },
});

// Listening exercises: the melody grid unlocks once the key and chords are right.
let melodyUnlocked = null;
function gateLock(unlocked) {
  return { ...(exercise.lock || {}), melody: !unlocked, note: unlocked ? null : 'Find the key and the chords first: the melody grid unlocks when they’re right.' };
}
function updateMelodyGate(p, { initial = false } = {}) {
  if (!exercise?.gateMelody) { melodyUnlocked = null; return; }
  const unlocked = chordsFound(exercise, p) || (feedback != null);
  if (unlocked === melodyUnlocked && !initial) return;
  const wasLocked = melodyUnlocked === false;
  melodyUnlocked = unlocked;
  ws.setLock(gateLock(unlocked));
  if (unlocked && wasLocked) toast('Key and chords are right! The melody grid is unlocked.');
}

// ---------- Lesson ----------

function renderLesson() {
  $('#lesson-nav').replaceChildren(...(LESSONS.length > 1 ? LESSONS.map((l, i) => h('button', {
    type: 'button',
    class: `lesson-link${l.id === lesson.id ? ' on' : ''}`,
    'aria-current': l.id === lesson.id ? 'page' : null,
    onclick: () => { if (l.id !== lesson.id) { closeFeedback(false); lesson = l; renderLesson(); selectExercise(l.exercises[0].id); } },
  }, `Lesson ${i + 1}`)) : []));
  $('#crumb').textContent = lesson.course;
  $('#lesson-course').textContent = lesson.course;
  $('#lesson-title').textContent = lesson.title;
  $('#lesson-intro').textContent = lesson.intro;
  document.title = `${lesson.title} · EverythingSound`;
  setVideo();
  renderTabs();
}

function setVideo(startAt = null) {
  const box = $('#video');
  if (!lesson.youtubeId) {
    box.replaceChildren(h('div', { class: 'video-placeholder' },
      h('span', { class: 'big' }, '▶'),
      h('strong', {}, 'Lesson video goes here'),
      h('span', {}, 'Add the YouTube video ID to this lesson in js/lessons.js.')));
    return;
  }
  const id = encodeURIComponent(lesson.youtubeId);
  const q = new URLSearchParams({ rel: '0' });
  if (startAt != null) { q.set('start', String(Math.floor(startAt))); q.set('autoplay', '1'); }
  box.replaceChildren(h('iframe', {
    src: `https://www.youtube-nocookie.com/embed/${id}?${q}`,
    title: `${lesson.title} (video)`,
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    allowfullscreen: true,
    loading: 'lazy',
    referrerpolicy: 'strict-origin-when-cross-origin',
  }));
}

function renderTabs() {
  const status = statusAll();
  const label = { tried: 'In progress', passed: 'Checks passed', submitted: 'Submitted' };
  $('#ex-tabs').replaceChildren(...lesson.exercises.map((ex) => h('button', {
    type: 'button',
    class: `ex-tab${exercise?.id === ex.id ? ' on' : ''}`,
    'aria-current': exercise?.id === ex.id ? 'true' : null,
    onclick: () => selectExercise(ex.id),
  }, h('span', { class: `st st-${status[ex.id] || 'new'}`, title: label[status[ex.id]] || 'Not started' }), ex.title)));
}

// ---------- Exercise ----------

function selectExercise(id, { project = null, fromFeedback = false } = {}) {
  if (!fromFeedback) closeFeedback(false);
  exercise = lesson.exercises.find((e) => e.id === id) || lesson.exercises[0];
  $('#ex-kind').textContent = KIND_LABELS[exercise.kind] || '';
  $('#ex-kind').className = `badge kind-${exercise.kind}`;
  $('#ex-title').textContent = exercise.title;
  $('#ex-brief').replaceChildren(...exercise.brief.map((s) => h('li', {}, s)));
  const watch = $('#watch-btn');
  watch.hidden = !(lesson.youtubeId && exercise.videoAt != null);
  watch.onclick = () => { setVideo(exercise.videoAt); $('#video').scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  answers = normalizeAnswers(feedback?.answers || store.get(answersKey(exercise), null));
  const saved = store.get(workKey(exercise));
  let p = project || (saved ? normalizeProject(saved) : newProject(exercise.start));
  if (exercise.patternChoice && !project) p = setBars(p, patternBars());
  ws.setProject(p, { lock: exercise.lock || {}, title: exerciseTitle(), phraseBars: currentPhraseBars() });
  melodyUnlocked = null;
  updateMelodyGate(p, { initial: true });
  renderListenBox();
  renderFormPanel();

  $('#check-results').replaceChildren();
  $('#submit-status').replaceChildren();
  $('#daw-details').open = exercise.kind === 'daw';
  restoreMidi();
  renderAttachments();
  renderTabs();
  if (!fromFeedback) {
    const u = new URL(location.href);
    u.search = new URLSearchParams({ lesson: lesson.id, ex: exercise.id }).toString();
    history.replaceState(null, '', u);
  }
}

$('#reset-btn').addEventListener('click', () => {
  if (!confirm('Start this exercise again? Your work on it will be cleared.')) return;
  store.remove(workKey(exercise));
  store.remove(answersKey(exercise));
  selectExercise(exercise.id);
});

// ---------- Listening clip ----------

function clipUrl(l, autoplay) {
  const q = new URLSearchParams({ rel: '0', start: String(Math.floor(l.start || 0)) });
  if (l.end) q.set('end', String(Math.floor(l.end)));
  if (autoplay) q.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(l.youtubeId)}?${q}`;
}
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function renderListenBox() {
  const l = exercise.listen;
  const box = $('#listen-box');
  if (!l) { box.replaceChildren(); return; }
  const frame = h('iframe', {
    src: clipUrl(l, false),
    title: l.label || 'Listening clip',
    allow: 'autoplay; encrypted-media; picture-in-picture',
    allowfullscreen: true,
    referrerpolicy: 'strict-origin-when-cross-origin',
  });
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(l.youtubeId)}&t=${Math.floor(l.start || 0)}s`;
  box.replaceChildren(h('div', { class: 'listen' },
    h('div', { class: 'listen-video' }, frame),
    h('div', { class: 'listen-info' },
      h('p', { class: 'eyebrow' }, 'Listen'),
      h('h3', {}, l.label || 'Listening clip'),
      h('p', { class: 'muted' }, `${l.end ? `Clip ${mmss(l.start || 0)}–${mmss(l.end)}` : `From ${mmss(l.start || 0)}`}. Play it as many times as you like, then use the Play button below to hear your own work.`),
      h('div', { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn', onclick: () => { frame.src = clipUrl(l, true); } }, '↺ Play the clip from the start'),
        h('a', { class: 'btn ghost', href: watchUrl, target: '_blank', rel: 'noopener' }, `Open on YouTube at ${mmss(l.start || 0)} ↗`)))));
}

// ---------- Form panel (phrases) ----------

function normalizeAnswers(a) {
  const out = parseAnswers(a) || parseAnswers({});
  const pc = exercise?.patternChoice;
  if (pc) {
    if (!pc.options.includes(out.pattern)) out.pattern = pc.options[0];
    if (!pc.phraseBars.includes(out.phraseBars)) out.phraseBars = pc.phraseBars[0];
  }
  return out;
}

const exerciseTitle = () => exercise.title.replace(/^\d+\s*·\s*/, '');
const patternLabels = () => answers.pattern.split(' ');
const patternBars = () => patternLabels().length * answers.phraseBars;
function currentPhraseBars() {
  if (exercise.patternChoice) return answers.phraseBars;
  return exercise.form?.phraseBars || 0;
}

/** A new pattern or phrase length changes how many bars the piece has. */
function applyPattern() {
  saveAnswers();
  const p = setBars(ws.getProject(), patternBars());
  ws.setProject(p, { lock: exercise.lock || {}, title: exerciseTitle(), phraseBars: currentPhraseBars() });
  if (!feedback) store.set(workKey(exercise), p);
  renderFormPanel();
}

function saveAnswers() {
  if (!feedback) store.set(answersKey(exercise), answers);
}

function renderFormPanel() {
  const pc = exercise.patternChoice;
  const f = pc ? { phraseBars: answers.phraseBars, show: patternLabels() } : exercise.form;
  const panel = $('#form-panel');
  if (!f) { panel.replaceChildren(); return; }
  const p = ws.getProject();
  const n = Math.floor(p.bars / f.phraseBars);
  const analyse = Array.isArray(f.answer);
  const rows = Array.from({ length: n }, (_, i) => {
    const a = i * f.phraseBars + 1;
    const b = a + f.phraseBars - 1;
    const cells = [
      h('button', { type: 'button', class: 'btn small', onclick: () => ws.playRange(i * f.phraseBars, f.phraseBars), 'aria-label': `Play phrase ${i + 1}` }, '▶'),
      h('span', { class: 'phrase-name' }, h('strong', {}, `Phrase ${i + 1}`), h('span', { class: 'muted small' }, ` bars ${a}–${b}`)),
    ];
    if (analyse) {
      cells.push(h('select', {
        'aria-label': `Label for phrase ${i + 1}`,
        onchange: (e) => { answers.formLabels[i] = e.target.value; saveAnswers(); },
      }, h('option', { value: '' }, 'Label…'), FORM_LABELS.map((l) => h('option', { value: l, selected: answers.formLabels[i] === l }, l))));
      if (f.askRhythmPitch && i > 0) {
        const tick = (field, text) => h('label', { class: 'toggle' }, h('input', {
          type: 'checkbox', checked: !!answers[field][i],
          onchange: (e) => { answers[field][i] = e.target.checked; saveAnswers(); },
        }), ` ${text}`);
        cells.push(tick('sameRhythm', 'Same rhythm as phrase 1'), tick('samePitch', 'Same pitches as phrase 1'));
      }
    } else if (f.show) {
      cells.push(h('span', { class: 'form-target' }, f.show[i] || ''));
    }
    return h('div', { class: 'phrase-row' }, ...cells);
  });
  const chooser = pc ? h('div', { class: 'row wrap pattern-choice' },
    h('label', { class: 'field inline' }, 'Pattern',
      h('select', { onchange: (e) => { answers.pattern = e.target.value; applyPattern(); } },
        pc.options.map((o) => h('option', { value: o, selected: o === answers.pattern }, o)))),
    h('label', { class: 'field inline' }, 'Each phrase',
      h('select', { onchange: (e) => { answers.phraseBars = Number(e.target.value); applyPattern(); } },
        pc.phraseBars.map((n) => h('option', { value: n, selected: n === answers.phraseBars }, `${n} bar${n > 1 ? 's' : ''}`)))),
    h('span', { class: 'muted small' }, `${patternLabels().length} phrases · ${patternBars()} bars`)) : '';
  panel.replaceChildren(h('div', { class: 'form-panel' },
    h('h3', {}, analyse ? 'Your analysis' : pc ? 'Your pattern' : 'The form'),
    chooser,
    analyse ? h('p', { class: 'muted small' }, 'A = first idea · A′ = the same idea changed · B, C = new material.') : '',
    ...rows));
}

// ---------- Checks ----------

function checkContext() {
  const a = attachments[exercise.id] || {};
  const p = ws.getProject();
  let midi = null;
  if (a.midi?.length) {
    const merged = { tracks: a.midi.flatMap((m) => m.parsed.tracks), bpm: a.midi[0].parsed.bpm, keySig: a.midi[0].parsed.keySig };
    midi = { fileName: a.midi.map((m) => m.fileName).join(', '), analysis: analyseMidi(merged, p.key, p.mode) };
  }
  return { midi, audio: a.audio ? { fileName: a.audio.fileName } : null, answers };
}

function check() {
  const results = runChecks(exercise, ws.getProject(), checkContext());
  $('#check-results').replaceChildren(renderChecks(results));
  if (!feedback) setStatus(exercise.id, results.length && results.every((r) => r.pass) ? 'passed' : 'tried');
  return results;
}
$('#check-btn').addEventListener('click', check);

// ---------- DAW round-trip ----------

document.querySelectorAll('[data-export]').forEach((btn) => btn.addEventListener('click', () => {
  const which = btn.dataset.export;
  const p = ws.getProject();
  const bytes = projectToMidi(p, { name: exercise.title, only: which === 'all' ? null : which });
  const who = slug(studentName() || 'me');
  downloadBytes(bytes, `${slug(exercise.title)}-${who}-${which}.mid`, 'audio/midi');
}));

$('#daw-midi').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const list = [];
  for (const f of files) {
    if (f.size > 2 * 1024 * 1024) { toast(`${f.name} is too big for a MIDI file.`); continue; }
    try {
      const bytes = await readFileBytes(f);
      list.push({ fileName: f.name, size: f.size, bytes, parsed: readMidi(bytes) });
    } catch (err) {
      toast(`${f.name}: ${err.message || err}`);
    }
  }
  if (!list.length) return;
  (attachments[exercise.id] ||= {}).midi = list;
  store.set(midiKey(exercise), list.map((m) => ({ fileName: m.fileName, size: m.size, data: bytesToBase64(m.bytes) })));
  renderAttachments();
});

$('#daw-audio').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > MAX_ATTACHMENT_BYTES) {
    toast(`That file is ${formatBytes(f.size)}. Please export an MP3 instead (under ${formatBytes(MAX_ATTACHMENT_BYTES)}).`);
    e.target.value = '';
    return;
  }
  const a = (attachments[exercise.id] ||= {});
  if (a.audio?.url) URL.revokeObjectURL(a.audio.url);
  const bytes = await readFileBytes(f);
  a.audio = { fileName: f.name, size: f.size, type: f.type || 'audio/mpeg', bytes, url: URL.createObjectURL(new Blob([bytes], { type: f.type || 'audio/mpeg' })) };
  renderAttachments();
});

function restoreMidi() {
  const a = (attachments[exercise.id] ||= {});
  if (a.midi) return;
  const saved = store.get(midiKey(exercise));
  if (!Array.isArray(saved)) return;
  try {
    a.midi = saved.map((m) => {
      const bytes = base64ToBytes(m.data);
      return { fileName: m.fileName, size: m.size, bytes, parsed: readMidi(bytes) };
    });
  } catch {
    store.remove(midiKey(exercise));
  }
}

function renderAttachments() {
  const a = attachments[exercise.id] || {};
  const ctx = checkContext();
  $('#daw-midi').value = '';
  $('#daw-midi-info').replaceChildren(a.midi?.length
    ? h('div', { class: 'attached' },
      h('div', { class: 'row' }, h('span', {}, `Attached: ${a.midi.map((m) => m.fileName).join(', ')}`),
        h('button', { type: 'button', class: 'btn ghost small', onclick: () => { delete a.midi; store.remove(midiKey(exercise)); renderAttachments(); } }, 'Remove')),
      renderMidiAnalysis(ctx.midi.analysis, ws.getProject()))
    : '');
  $('#daw-audio-info').replaceChildren(a.audio
    ? h('div', { class: 'attached' },
      h('audio', { controls: true, src: a.audio.url, preload: 'metadata' }),
      h('div', { class: 'row' }, h('span', {}, `${a.audio.fileName} · ${formatBytes(a.audio.size)}`),
        h('button', { type: 'button', class: 'btn ghost small', onclick: () => { URL.revokeObjectURL(a.audio.url); delete a.audio; renderAttachments(); } }, 'Remove')))
    : h('p', { class: 'muted small' }, 'Audio stays on this device until you download your submission file.'));
}

// ---------- Submit ----------

const nameInput = $('#student-name');
nameInput.value = store.get('es.studentName', '');
nameInput.addEventListener('input', () => store.set('es.studentName', nameInput.value.trim()));
const studentName = () => nameInput.value.trim();

function requireName() {
  if (studentName()) return true;
  toast('Add your name at the top first.');
  nameInput.focus();
  return false;
}

function buildSubmission({ withFiles }) {
  const results = runChecks(exercise, ws.getProject(), checkContext());
  const a = attachments[exercise.id] || {};
  const files = [];
  if (withFiles) {
    for (const m of a.midi || []) files.push({ kind: 'midi', fileName: m.fileName, type: 'audio/midi', size: m.size, data: bytesToBase64(m.bytes) });
    if (a.audio) files.push({ kind: 'audio', fileName: a.audio.fileName, type: a.audio.type, size: a.audio.size, data: bytesToBase64(a.audio.bytes) });
  }
  return makeSubmission({
    lessonId: lesson.id,
    exerciseId: exercise.id,
    exerciseTitle: exercise.title,
    student: studentName(),
    message: $('#message').value.trim(),
    project: ws.getProject(),
    checks: results,
    attachments: files,
    answers: exercise.form?.answer || exercise.patternChoice ? answers : null,
  });
}

$('#submit-file').addEventListener('click', () => {
  if (!requireName()) return;
  const sub = buildSubmission({ withFiles: true });
  downloadBytes(new TextEncoder().encode(JSON.stringify(sub)), submissionFileName(sub), 'application/json');
  setStatus(exercise.id, 'submitted');
  $('#submit-status').replaceChildren(`Saved ${submissionFileName(sub)}. Send this file to your teacher.`);
});

$('#submit-link').addEventListener('click', async () => {
  if (!requireName()) return;
  const sub = buildSubmission({ withFiles: false });
  const url = new URL('mark.html', location.href);
  url.search = new URLSearchParams({ s: await pack(sub) }).toString();
  const ok = await copyText(url.href);
  setStatus(exercise.id, 'submitted');
  const a = attachments[exercise.id] || {};
  $('#submit-status').replaceChildren(
    ok ? 'Link copied. Paste it into an email or message to your teacher.' : 'Copy this link and send it to your teacher:',
    h('input', { class: 'linkbox', readonly: true, value: url.href, onfocus: (e) => e.target.select() }),
    a.audio || a.midi?.length ? h('p', { class: 'warn' }, 'This link doesn’t include your MIDI or audio files. Use “Download submission file” to send those.') : '');
});

// ---------- Feedback from the teacher ----------

function closeFeedback(reload = true) {
  if (!feedback) return;
  feedback = null;
  $('#feedback-banner').hidden = true;
  document.body.classList.remove('viewing-feedback');
  const u = new URL(location.href);
  u.searchParams.delete('feedback');
  history.replaceState(null, '', u);
  if (reload && exercise) selectExercise(exercise.id);
}

function showFeedback(fb) {
  const total = fb.scores.reduce((s, x) => s + x.score, 0);
  const max = fb.scores.reduce((s, x) => s + x.max, 0);
  const banner = $('#feedback-banner');
  banner.replaceChildren(h('div', { class: 'feedback' },
    h('div', { class: 'fb-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, 'Feedback from your teacher'), h('h2', {}, fb.exerciseTitle || 'Your submission'),
        h('p', { class: 'muted' }, `For ${fb.student.name || 'you'}${fb.markedAt ? ` · marked ${new Date(fb.markedAt).toLocaleDateString()}` : ''}. Your submitted piece is loaded below. Press Play to hear it.`)),
      max ? h('div', { class: 'score-big' }, h('span', {}, String(total)), h('small', {}, `/ ${max}`)) : ''),
    fb.scores.length ? h('ul', { class: 'score-list' }, fb.scores.map((s) => h('li', {}, h('span', {}, s.label), h('b', {}, `${s.score} / ${s.max}`)))) : '',
    fb.comment ? h('blockquote', { class: 'comment' }, fb.comment) : '',
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', onclick: () => { store.set(workKey(exercise), ws.getProject()); closeFeedback(); toast('Opened the marked version as your working copy.'); } }, 'Keep working on this version'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => closeFeedback() }, 'Back to my latest work'))));
  banner.hidden = false;
  document.body.classList.add('viewing-feedback');
}

// ---------- Start ----------

async function start() {
  renderLesson();
  const fbParam = params.get('feedback');
  if (fbParam) {
    try {
      const fb = parseFeedback(await unpack(fbParam));
      const found = findExercise(fb.lessonId, fb.exerciseId);
      if (found.lesson) { lesson = found.lesson; renderLesson(); }
      feedback = fb;
      selectExercise(found.exercise?.id || lesson.exercises[0].id, { project: fb.project, fromFeedback: true });
      showFeedback(fb);
      return;
    } catch (err) {
      toast('That feedback link could not be opened: ' + (err.message || err));
    }
  }
  selectExercise(params.get('ex') || lesson.exercises[0].id);
}

start();
