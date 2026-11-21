// The Zen Master: the last challenge of the course. Four gates of questions, no mistakes allowed.
// One wrong answer closes the gate: begin it again with new questions. Pass all four for 100 XP
// and the Zen Theory Master badge. The questions come from the course's own quick-fire types (quiz.js).

import { COURSE, courseLessons, lessonProgress } from './course.js?v=202611210057';
import { QuizView, stopNotes } from './quiz.js?v=202611210057';
import { Player } from './audio.js?v=202611210057';
import { h, store, toast } from './util.js?v=202611210057';
import { awardZen, myProfile, myProgress, myXpEvents, renderAccountWidget } from './auth.js?v=202611210057';
import { summarise } from './game.js?v=202611210057';

const $ = (s) => document.querySelector(s);
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SEVENTHS5 = ['major triad + major 7th', 'major triad + minor 7th', 'minor triad + minor 7th', 'diminished triad + minor 7th', 'diminished triad + diminished 7th'];

const GATES = [
  { name: 'Sound', line: 'First, the ear. Listen as if it were the last sound you will ever hear.', mix: [
    { type: 'hear-interval', options: { set: ALL } },
    { type: 'hear-interval', options: { set: ALL, together: true } },
    { type: 'chord-quality', options: { ear: true } },
    { type: 'chord-quality', options: { ear: true, kind: 'seventh', qualities: SEVENTHS5 } },
    { type: 'hear-cadence' },
  ] },
  { name: 'Names', line: 'Second, the names. A note with the wrong name is a stranger in its own house.', mix: [
    { type: 'scale-spelling' },
    { type: 'enharmonic', options: { tricky: true } },
    { type: 'name-interval', options: { set: ALL } },
    { type: 'build-chord', options: { kind: 'seventh', qualities: SEVENTHS5 } },
    { type: 'find-fundamental' },
  ] },
  { name: 'Harmony', line: 'Third, harmony. Every chord has a home. Do you know yours?', mix: [
    { type: 'diatonic-chord', options: { mode: 'minor' } },
    { type: 'build-diatonic' },
    { type: 'relative-key' },
    { type: 'common-chord' },
    { type: 'modulation-fifth' },
  ] },
  { name: 'Gravity', line: 'Last, gravity. Everything falls. Learn where.', mix: [
    { type: 'gravity-path' },
    { type: 'tendency-tone' },
    { type: 'chord-pull' },
    { type: 'name-inversion' },
    { type: 'hear-meter' },
  ] },
];

// Few words. Heavy ones.
const WRONG = [
  'No.',
  'Hmm. No.',
  'Still more to learn. Much more.',
  'You heard with your eyes.',
  'A minor third. A major mistake.',
  'The leading note leads. You wandered off.',
  'Silence would have been more correct.',
  'The fifth is perfect. You are not. Yet.',
  'Even the metronome is disappointed.',
  'The tritone lives in you. Sit with it.',
  'Your ears are open. Your mind is on holiday.',
  'Empty your cup. Then come back.',
  'Fall seven times. Spell it right the eighth.',
  'That answer has no home. Go back to the tonic.',
  'The river does not hurry. You should have.',
  'Wrong. But wrong with conviction. That is something.',
];
const PASSED = [
  'Good. Do not smile yet.',
  'The gate opens. Breathe.',
  'Acceptable. The next gate is heavier.',
];
const INTRO = 'Four gates. Five questions each. One mistake, and the gate closes.';
const LOCKED = 'The cup is not yet full. Finish every lesson. Then come.';
const WON = 'There is nothing left for me to teach you. Go. Teach someone else.';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---------- The Master ----------

$('#zen-master').innerHTML = `<svg viewBox="0 0 160 160" role="img" aria-label="The Zen Master">
  <circle class="zm-aura" cx="80" cy="78" r="70"/>
  <path class="zm-robe" d="M20 150 C 24 104, 50 88, 80 88 C 110 88, 136 104, 140 150 Z"/>
  <path class="zm-robe-fold" d="M80 92 L 66 150 M80 92 L 98 150"/>
  <ellipse class="zm-hands" cx="80" cy="128" rx="20" ry="7"/>
  <circle class="zm-head" cx="80" cy="58" r="26"/>
  <ellipse class="zm-ear" cx="54" cy="60" rx="4" ry="7"/><ellipse class="zm-ear" cx="106" cy="60" rx="4" ry="7"/>
  <path class="zm-brow" d="M62 50 q 8 -6 15 0 M83 50 q 7 -6 15 0"/>
  <path class="zm-brow-long" d="M62 50 q -8 2 -12 12 M98 50 q 8 2 12 12"/>
  <path class="zm-eye" d="M65 58 q 6 4 11 0 M84 58 q 6 4 11 0"/>
  <path class="zm-beard" d="M62 70 C 64 96, 96 96, 98 70 C 92 80, 68 80, 62 70 Z"/>
  <path class="zm-moustache" d="M68 70 q 12 -6 24 0"/>
  <ellipse class="zm-mouth" cx="80" cy="76" rx="4" ry="1"/>
</svg>`;

const voiceBox = $('#zen-voice');
voiceBox.checked = store.get('es.zen.voice', true);
voiceBox.addEventListener('change', () => { store.set('es.zen.voice', voiceBox.checked); if (!voiceBox.checked) speechSynthesis?.cancel(); });

function lowVoice() {
  const vs = (window.speechSynthesis?.getVoices() || []).filter((v) => /^en/i.test(v.lang));
  return vs.find((v) => /daniel|fred|alex|male|google uk english male|arthur|aaron|ralph/i.test(v.name)) || vs[0] || null;
}

/** The Master speaks: words in the bubble and, if allowed, a slow, low voice. */
function say(text) {
  const el = $('#zen-words');
  el.textContent = text;
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  const master = $('#zen-master');
  master.classList.add('speaking');
  const stop = () => master.classList.remove('speaking');
  if (voiceBox.checked && window.speechSynthesis && window.SpeechSynthesisUtterance) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.1;
    u.rate = 0.72;
    const v = lowVoice();
    if (v) u.voice = v;
    u.onend = stop;
    u.onerror = stop;
    speechSynthesis.speak(u);
    setTimeout(stop, 600 + text.length * 90); // in case the browser never says it ended
  } else {
    setTimeout(stop, 400 + text.length * 45);
  }
}

// ---------- The gates ----------

const player = new Player();
let quiz = null;
let gate = 0; // the gate being attempted (0..3); passed gates are kept until the page is closed
let teacher = false;

function drawGates(state = '') {
  $('#zen-gates').replaceChildren(...GATES.map((g, i) => h('li', {
    class: `zen-gate${i < gate || state === 'won' ? ' passed' : ''}${i === gate && state !== 'won' ? ' current' : ''}${i === gate && state === 'failed' ? ' failed' : ''}`,
  }, h('span', { class: 'zen-gate-n' }, i < gate || state === 'won' ? '✓' : String(i + 1)), h('span', {}, g.name))));
}

function actions(...btns) {
  $('#zen-actions').replaceChildren(...btns);
}

function closeQuiz() {
  quiz?.destroy();
  quiz = null;
  $('#zen-quiz').hidden = true;
}

function enterGate() {
  closeQuiz();
  const g = GATES[gate];
  drawGates();
  say(g.line);
  actions(h('span', { class: 'muted small' }, `Gate ${gate + 1} of 4 · ${g.name} · five questions, no mistakes`));
  const box = $('#zen-quiz');
  box.hidden = false;
  quiz = new QuizView(box, {
    quiz: { mix: shuffle(g.mix), pass: g.mix.length },
    player,
    autostart: true,
    onAnswer: (ok) => {
      if (ok) return true;
      // One mistake: the gate closes. The answer stays on screen to learn from.
      stopNotes();
      say(pick(WRONG));
      drawGates('failed');
      actions(h('button', { type: 'button', class: 'btn primary', onclick: enterGate }, `Begin gate ${gate + 1} again`),
        h('span', { class: 'muted small' }, 'New questions every time.'));
      return false;
    },
    onResult: (correct, total) => {
      if (correct < total) return;
      gate++;
      if (gate >= GATES.length) { won(); return; }
      closeQuiz();
      drawGates();
      say(pick(PASSED));
      actions(h('button', { type: 'button', class: 'btn primary', onclick: enterGate }, `Enter gate ${gate + 1}: ${GATES[gate].name}`));
    },
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function won() {
  closeQuiz();
  drawGates('won');
  say(WON);
  store.set('es.zen.done', new Date().toISOString());
  actions(h('div', { class: 'zen-won' },
    h('span', { class: 'zen-won-icon', 'aria-hidden': 'true' }, '🧘'),
    h('div', {}, h('strong', {}, 'Zen Theory Master'),
      h('div', { class: 'muted small' }, teacher ? 'Four gates, no mistakes. (Teachers don’t collect XP.)' : 'Four gates, no mistakes. The badge is yours.'))),
  h('button', { type: 'button', class: 'btn', onclick: () => { gate = 0; start(); } }, 'Face the Master again'));
  if (!teacher) {
    const gained = await awardZen();
    if (!gained && !(await myProfile())) toast('Sign in to keep the badge and the XP.');
  }
}

function start() {
  drawGates();
  say(INTRO);
  actions(h('button', { type: 'button', class: 'btn primary', onclick: enterGate }, gate ? `Enter gate ${gate + 1}: ${GATES[gate].name}` : 'Enter the first gate'),
    h('span', { class: 'muted small' }, 'Turn your sound on: some questions are played.'));
}

// ---------- Who may enter: everyone who finished every lesson (the teacher always) ----------

function lessonsLeft() {
  return courseLessons().filter((l) => lessonProgress(l).done < l.exercises.length);
}

async function mergeRemoteProgress() {
  const remote = await myProgress().catch(() => null);
  if (!remote) return;
  const rank = { tried: 1, passed: 2, submitted: 3 };
  for (const [lessonId, ex] of Object.entries(remote)) {
    const all = store.get(`es.status.${lessonId}`, {});
    for (const [k, v] of Object.entries(ex)) if ((rank[v] || 0) > (rank[all[k]] || 0)) all[k] = v;
    store.set(`es.status.${lessonId}`, all);
  }
}

(async () => {
  renderAccountWidget($('#account-widget'));
  const p = await myProfile().catch(() => null);
  teacher = p?.role === 'teacher';
  await mergeRemoteProgress();
  const ev = p && !teacher ? await myXpEvents().catch(() => null) : null;
  const already = ev ? summarise(ev).count['zen-master'] >= 1 : false;
  const left = teacher ? [] : lessonsLeft();
  if (left.length) {
    drawGates();
    say(LOCKED);
    actions(h('div', {},
      h('p', { class: 'muted' }, `${left.length} lesson${left.length === 1 ? '' : 's'} of ${courseLessons().length} still to finish:`),
      h('ul', { class: 'small' }, left.map((l) => h('li', {}, h('a', { href: `lesson.html?lesson=${encodeURIComponent(l.id)}` }, l.title)))),
      h('a', { class: 'btn primary', href: 'index.html' }, `Back to ${COURSE.title}`)));
    return;
  }
  start();
  if (already) $('#zen-actions').append(h('span', { class: 'muted small' }, ' You are already a Zen Theory Master. The Master does not mind being beaten twice.'));
  if (teacher) $('#zen-actions').append(h('span', { class: 'muted small' }, ' As the teacher you can always enter; students need every lesson finished.'));
})();
