// Student lesson page: video, exercises, composer, checks, DAW round-trip, submission, feedback.

import { chordsFound, runChecks } from './checks.js?v=202611120105';
import { FORM_LABELS } from './form.js?v=202611120105';
import { QuizView } from './quiz.js?v=202611120105';
import { KIND_LABELS, LESSONS, findExercise, findLesson } from './lessons.js?v=202611120105';
import { COURSE, courseLessons, lessonNeighbours } from './course.js?v=202611120105';
import { analyseMidi, projectToMidi, readMidi } from './midi.js?v=202611120105';
import { renderChecks, renderMidiAnalysis } from './panels.js?v=202611120105';
import { newProject, normalizeProject, setBars } from './project.js?v=202611120105';
import { MAX_ATTACHMENT_BYTES, makeSubmission, parseAnswers, parseFeedback, submissionFileName } from './submission.js?v=202611120105';
import { base64ToBytes, bytesToBase64, copyText, downloadBytes, formatBytes, h, pack, readFileBytes, slug, store, toast, unpack } from './util.js?v=202611120105';
import { Workspace } from './workspace.js?v=202611120105';
import { getSubmission, myProfile, myProgress, renderAccountWidget, saveProgress, submitOnline } from './auth.js?v=202611120105';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);

let lesson = findLesson(params.get('lesson')) || courseLessons()[0] || LESSONS[0];
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
    saveProgress(lesson.id, exId, status).catch(() => {});
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
  // Course navigation: back to all lessons, position in the course, previous / next lesson.
  const nb = lessonNeighbours(lesson.id);
  const link = (l, text) => h('a', { class: 'btn small', href: `lesson.html?lesson=${encodeURIComponent(l.id)}` }, text);
  $('#lesson-nav').replaceChildren(
    h('a', { class: 'lesson-link', href: 'index.html' }, `← ${COURSE.title}`),
    nb.index >= 0 ? h('span', { class: 'muted small' }, `Lesson ${nb.index + 1} of ${nb.total}`) : '');
  $('#lesson-pager').replaceChildren(
    nb.prev ? link(nb.prev, `← ${nb.prev.title}`) : h('span'),
    nb.next ? link(nb.next, `Next lesson: ${nb.next.title} →`) : h('a', { class: 'btn small', href: 'index.html' }, 'Back to the course'));
  $('#crumb').textContent = lesson.course;
  $('#lesson-course').textContent = lesson.course;
  $('#lesson-title').textContent = lesson.title;
  $('#lesson-intro').textContent = lesson.intro;
  document.title = `${lesson.title} · EverythingSound Academy`;
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
  ws.setProject(p, { lock: exercise.lock || {}, title: exerciseTitle(), phraseBars: currentPhraseBars(), phraseLabels: currentPhraseLabels() });
  // Pure listening/labelling exercises don't need the composer or the DAW panel.
  $('#workspace').hidden = !!exercise.noComposer;
  $('#daw-panel').hidden = !!exercise.noComposer;
  selSlot = { i: 0, k: 0 };
  melodyUnlocked = null;
  updateMelodyGate(p, { initial: true });
  renderListenBox();
  renderFormPanel();
  renderQuiz();

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

// ---------- Quick-fire practice ----------

let quizView = null;
function renderQuiz() {
  quizView?.destroy();
  quizView = null;
  if (!exercise.quiz) { $('#quiz-panel').replaceChildren(); return; }
  quizView = new QuizView($('#quiz-panel'), {
    quiz: exercise.quiz,
    player: ws.player,
    best: answers.quiz?.total ? { best: answers.quiz.best, total: answers.quiz.total } : null,
    onResult: (correct, total) => {
      const prev = answers.quiz || { best: 0, rounds: 0 };
      answers.quiz = { best: Math.max(prev.best || 0, correct), last: correct, total, rounds: (prev.rounds || 0) + 1 };
      saveAnswers();
      check();
    },
  });
}

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
/** Letters shown on the grid's phrase markers: the chosen pattern, or the form to compose in. */
function currentPhraseLabels() {
  if (exercise.patternChoice) return patternLabels();
  return exercise.form?.show || [];
}
function currentPhraseBars() {
  if (exercise.patternChoice) return answers.phraseBars;
  return exercise.form?.phraseBars || 0;
}

/** A new pattern or phrase length changes how many bars the piece has. */
function applyPattern() {
  saveAnswers();
  const p = setBars(ws.getProject(), patternBars());
  ws.setProject(p, { lock: exercise.lock || {}, title: exerciseTitle(), phraseBars: currentPhraseBars(), phraseLabels: currentPhraseLabels() });
  if (!feedback) store.set(workKey(exercise), p);
  renderFormPanel();
}

function saveAnswers() {
  if (!feedback) store.set(answersKey(exercise), answers);
}

// ---------- Whole-song labelling (click a box, then a letter) ----------

let selSlot = { i: 0, k: 0 };
const LETTERS = 'ABCDEFGHIJKLMNO'.split('');

function setSlot(value) {
  const secs = answers.sectionLabels;
  secs[selSlot.i][selSlot.k] = value;
  saveAnswers();
}
function advanceSlot() {
  const secs = answers.sectionLabels;
  if (selSlot.k + 1 < secs[selSlot.i].length) selSlot.k++;
  else if (selSlot.i + 1 < secs.length) selSlot = { i: selSlot.i + 1, k: 0 };
}
function pickLetter(letter) {
  setSlot(letter);
  advanceSlot();
  renderFormPanel(true);
}
/** ′ applies to the selected box, or (if it's empty) to the box just filled, so "A then ′" gives A′. */
function togglePrime() {
  const secs = answers.sectionLabels;
  let t = { ...selSlot };
  if (!secs[t.i][t.k]) {
    if (t.k > 0) t.k--;
    else if (t.i > 0) t = { i: t.i - 1, k: secs[t.i - 1].length - 1 };
  }
  const cur = secs[t.i][t.k];
  if (!cur) return;
  secs[t.i][t.k] = cur.endsWith('′') ? cur.slice(0, -1) : `${cur}′`;
  saveAnswers();
  renderFormPanel(true);
}

function renderSections(panel, refocus) {
  const notes = exercise.sectionNotes || {};
  answers.sectionLabels = exercise.sections.map((sec, i) => {
    const cur = answers.sectionLabels?.[i] || [];
    return sec.split(' ').map((_, k) => cur[k] || '');
  });
  const rows = exercise.sections.map((_, i) => h('div', { class: 'sec-row' },
    h('span', { class: 'phrase-name' }, h('strong', {}, `Section ${i + 1}`), notes[i] ? h('span', { class: 'muted small' }, ` (${notes[i]})`) : ''),
    h('div', { class: 'slots' }, answers.sectionLabels[i].map((v, k) => h('button', {
      type: 'button',
      class: `slot-btn${selSlot.i === i && selSlot.k === k ? ' on' : ''}${v ? ' filled' : ''}`,
      'aria-label': `Section ${i + 1}, phrase ${k + 1}: ${v || 'empty'}`,
      onclick: () => { selSlot = { i, k }; renderFormPanel(true); },
    }, v || '·')))));
  const pad = h('div', { class: 'letter-pad' },
    LETTERS.map((l) => h('button', { type: 'button', class: 'letter-btn', onclick: () => pickLetter(l) }, l)),
    h('button', { type: 'button', class: 'letter-btn prime', title: 'Changed version (prime)', onclick: togglePrime }, '′'),
    h('button', { type: 'button', class: 'btn ghost small', onclick: () => { setSlot(''); renderFormPanel(true); } }, 'Clear box'));
  const box = h('div', { class: 'form-panel sections', tabindex: '0', 'aria-label': 'Pattern labels. Type a letter, an apostrophe for prime, Backspace to clear, arrow keys to move.' },
    h('h3', {}, 'Your analysis'),
    h('p', { class: 'muted small' }, `Selected: section ${selSlot.i + 1}, phrase ${selSlot.k + 1}. Type letters too: ' adds a prime, Backspace clears, arrow keys move.`),
    pad,
    ...rows);
  panel.replaceChildren(box);
  if (refocus) box.focus({ preventScroll: true });
}

$('#form-panel').addEventListener('keydown', (e) => {
  if (!exercise?.sections || e.target.closest('input, select, textarea')) return;
  const key = e.key;
  if (/^[a-oA-O]$/.test(key)) { pickLetter(key.toUpperCase()); e.preventDefault(); }
  else if (key === "'" || key === '′') { togglePrime(); e.preventDefault(); }
  else if (key === 'Backspace' || key === 'Delete') { setSlot(''); renderFormPanel(true); e.preventDefault(); }
  else if (key === 'ArrowRight') { advanceSlot(); renderFormPanel(true); e.preventDefault(); }
  else if (key === 'ArrowLeft') {
    if (selSlot.k > 0) selSlot.k--;
    else if (selSlot.i > 0) selSlot = { i: selSlot.i - 1, k: answers.sectionLabels[selSlot.i - 1].length - 1 };
    renderFormPanel(true);
    e.preventDefault();
  }
});

function renderFormPanel(refocus = false) {
  if (exercise.sections) { renderSections($('#form-panel'), refocus); return; }
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
  const tpl = exercise.chordTemplate;
  const chordsBtn = tpl ? h('button', {
    type: 'button',
    class: 'btn small',
    title: 'Fill the chord lane with the song’s chord loop, repeated to the end',
    onclick: () => {
      const cur = ws.getProject();
      if (cur.chords.some(Boolean) && !confirm('Replace your chords with the song’s chords?')) return;
      const loop = newProject({ key: cur.key, mode: cur.mode, bars: tpl.progression.length, progression: tpl.progression }).chords;
      const chords = cur.chords.map((_, i) => loop[i % loop.length]);
      ws.update({ ...cur, chords }, { rebuild: true });
      toast(`Chords set: ${tpl.label}`);
    },
  }, `Use the song’s chords (${tpl.label})`) : '';
  const chooser = pc ? h('div', { class: 'row wrap pattern-choice' },
    h('label', { class: 'field inline' }, 'Pattern',
      h('select', { onchange: (e) => { answers.pattern = e.target.value; applyPattern(); } },
        pc.options.map((o) => h('option', { value: o, selected: o === answers.pattern }, o)))),
    h('label', { class: 'field inline' }, 'Each phrase',
      h('select', { onchange: (e) => { answers.phraseBars = Number(e.target.value); applyPattern(); } },
        pc.phraseBars.map((n) => h('option', { value: n, selected: n === answers.phraseBars }, `${n} bar${n > 1 ? 's' : ''}`)))),
    h('span', { class: 'muted small' }, `${patternLabels().length} phrases · ${patternBars()} bars`), chordsBtn) : '';
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
  if (studentName() || profile) return true;
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
    student: profile?.full_name || studentName(),
    message: $('#message').value.trim(),
    project: ws.getProject(),
    checks: results,
    attachments: files,
    answers: exercise.form?.answer || exercise.patternChoice || exercise.sections || exercise.quiz ? answers : null,
  });
}

// Signed in: submit straight to the teacher's inbox (files are uploaded privately).
let profile = null;
async function setupAccount() {
  profile = await myProfile();
  renderAccountWidget($('#account-widget'));
  const signed = !!profile;
  $('#name-label').hidden = signed;
  $('#submit-online').hidden = !signed;
  $('#ask-teacher').hidden = !signed || profile.role === 'teacher';
  const link = $('#signin-to-submit');
  link.hidden = signed;
  link.href = `account.html?next=${encodeURIComponent(`lesson.html?lesson=${lesson.id}&ex=${exercise?.id || ''}`)}`;
  $('#submit-intro').textContent = signed
    ? `Signed in as ${profile.full_name || profile.email}. Your work goes straight to your teacher, and their feedback appears in your profile.`
    : 'Sign in to send your work straight to your teacher. Their feedback will appear in your profile.';
  if (signed) {
    // Bring this lesson's progress from the account (another device may have done more).
    const remote = (await myProgress())?.[lesson.id];
    if (remote) {
      const all = statusAll();
      const rank = { tried: 1, passed: 2, submitted: 3 };
      for (const [k, v] of Object.entries(remote)) if ((rank[v] || 0) > (rank[all[k]] || 0)) all[k] = v;
      store.set(`es.status.${lesson.id}`, all);
      renderTabs();
    }
  }
}

// "Ask your teacher" opens the private chat with a first line saying which exercise it's about.
$('#ask-teacher').addEventListener('click', (e) => {
  e.preventDefault();
  const about = `About “${lesson.title}”, exercise “${exercise.title}”:`;
  location.href = `chat.html?dm=me&about=${encodeURIComponent(about)}`;
});

$('#submit-online').addEventListener('click', async () => {
  const btn = $('#submit-online');
  const sub = buildSubmission({ withFiles: false });
  const a = attachments[exercise.id] || {};
  const files = [
    ...(a.midi || []).map((m) => ({ kind: 'midi', fileName: m.fileName, type: 'audio/midi', size: m.size, bytes: m.bytes })),
    ...(a.audio ? [{ kind: 'audio', fileName: a.audio.fileName, type: a.audio.type, size: a.audio.size, bytes: a.audio.bytes }] : []),
  ];
  btn.disabled = true;
  $('#submit-status').replaceChildren(files.length ? 'Sending your work and uploading your files…' : 'Sending…');
  try {
    const id = await submitOnline(sub, files);
    setStatus(exercise.id, 'submitted');
    $('#submit-status').replaceChildren('Sent! ',
      h('a', { href: `lesson.html?lesson=${lesson.id}&ex=${exercise.id}&submission=${id}` }, 'See what you sent'),
      ' · ', h('a', { href: 'account.html' }, 'My profile'));
  } catch (err) {
    $('#submit-status').replaceChildren(`Not sent: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
});

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
  u.searchParams.delete('submission');
  history.replaceState(null, '', u);
  if (reload && exercise) selectExercise(exercise.id);
}

function showFeedback(fb, { pending = false } = {}) {
  const total = fb.scores.reduce((s, x) => s + x.score, 0);
  const max = fb.scores.reduce((s, x) => s + x.max, 0);
  const banner = $('#feedback-banner');
  banner.replaceChildren(h('div', { class: `feedback${pending ? ' pending' : ''}` },
    h('div', { class: 'fb-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, pending ? 'Your submission' : 'Feedback from your teacher'), h('h2', {}, fb.exerciseTitle || 'Your submission'),
        h('p', { class: 'muted' }, pending
          ? `Sent${fb.sentAt ? ` on ${new Date(fb.sentAt).toLocaleDateString()}` : ''}. Your teacher hasn’t marked it yet. This is the piece you sent: press Play to hear it.`
          : `For ${fb.student.name || 'you'}${fb.markedAt ? ` · marked ${new Date(fb.markedAt).toLocaleDateString()}` : ''}. Your submitted piece is loaded below. Press Play to hear it.`)),
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
  setupAccount().catch(() => {});
  // From "My profile": a submission stored in the account, with the teacher's feedback if it's marked.
  const subId = params.get('submission');
  if (subId) {
    try {
      const row = await getSubmission(subId);
      const found = findExercise(row.lesson_id, row.exercise_id);
      if (found.lesson) { lesson = found.lesson; renderLesson(); }
      const fb = {
        exerciseTitle: row.exercise_title,
        student: { name: row.student?.full_name || '' },
        markedAt: row.marked_at,
        sentAt: row.created_at,
        scores: (Array.isArray(row.scores) ? row.scores : []).map((s) => ({ label: String(s.label || ''), score: Number(s.score) || 0, max: Number(s.max) || 0 })),
        comment: row.comment || '',
        project: normalizeProject(row.project),
        answers: parseAnswers(row.answers),
      };
      feedback = fb;
      selectExercise(found.exercise?.id || lesson.exercises[0].id, { project: fb.project, fromFeedback: true });
      showFeedback(fb, { pending: row.status !== 'marked' });
      return;
    } catch (err) {
      toast('That submission could not be opened: ' + (err.message || err));
    }
  }
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
