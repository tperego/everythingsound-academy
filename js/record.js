// Recording mode: one quiz question at a time, big and vertical, for short videos.
// Separate from the course: it only reads the lesson list and the question generators.
// Nothing here signs in, saves progress or awards XP.

import { Player } from './audio.js?v=202611161458';
import { LESSONS } from './lessons.js?v=202611161458';
import { keyboardSvg } from './piano.js?v=202611161458';
import { makeQuestion } from './quiz.js?v=202611161458';
import { h } from './util.js?v=202611161458';

const $ = (s) => document.querySelector(s);
const player = new Player();
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
const isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

// Exercises whose questions are answered by picking a choice (they reveal cleanly on screen).
const EXERCISES = LESSONS.flatMap((l) => l.exercises
  .filter((e) => e.quiz && Array.from({ length: 12 }, () => makeQuestion(e.quiz.type, e.quiz.options)).every((q) => q.choices))
  .map((e) => ({ id: `${l.id}/${e.id}`, label: `${l.title} · ${e.title}`, quiz: e.quiz })));

const select = $('#exercise');
select.replaceChildren(...EXERCISES.map((x) => h('option', { value: x.id }, x.label)));
const saved = (k, d) => { try { return localStorage.getItem(`es.rec.${k}`) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(`es.rec.${k}`, v); } catch { /* private mode */ } };
for (const [id, key, d] of [['#exercise', 'ex', EXERCISES[0]?.id], ['#hook-input', 'hook', ''], ['#count', 'count', '1'], ['#think', 'think', '3'], ['#theme', 'theme', 'dark'], ['#foot-input', 'foot', 'Free lessons · link in bio']]) {
  const el = $(id);
  const v = saved(key, d);
  if (v != null && (el.tagName !== 'SELECT' || [...el.options].some((o) => o.value === v))) el.value = v;
  el.addEventListener('input', () => { save(key, el.value); applyText(); });
}

function applyText() {
  document.body.dataset.theme = $('#theme').value;
  $('#hook').textContent = $('#hook-input').value.trim();
  $('#hook').hidden = !$('#hook-input').value.trim();
  $('#foot').textContent = $('#foot-input').value.trim();
}

const current = () => EXERCISES.find((x) => x.id === select.value) || EXERCISES[0];

// ---------- Sound (same sound as the course quizzes) ----------

const f = (m) => 440 * 2 ** ((m - 69) / 12);
/** Plays the question's sound and resolves when it has finished. */
async function play(qn) {
  const notes = qn.play || (qn.marks?.length ? [...qn.marks, qn.marks] : null);
  if (!notes) return;
  await player.ensure();
  const gap = qn.gap || 0.65;
  let at = Tone.now() + 0.05;
  for (const m of notes) {
    if (Array.isArray(m)) { player.synths.chords.triggerAttackRelease(m.map(f), 1.0, at, 0.6); at += 1.15; }
    else { player.synths.chords.triggerAttackRelease([f(m)], Math.min(0.55, gap * 0.9), at, 0.7); at += gap; }
  }
  await wait(at - Tone.now() + 0.2);
}

// ---------- Drawing ----------

function keyboardFor(qn) {
  if (!qn.marks?.length) return '';
  let low = Math.min(...qn.marks); let high = Math.max(...qn.marks);
  low -= ((low % 12) + 12) % 12; // down to a C
  high = Math.max(high, low + 23);
  while (((high % 12) + 12) % 12 !== 11) high++; // up to a B
  if (isBlack(low)) low--;
  const marks = new Map(qn.marks.map((m) => [m, { hands: new Set(['given']), finger: null }]));
  return h('div', { class: 'rec-kbd' }, keyboardSvg({ low, high, marks, whiteW: 26, height: 120, fingers: false, labels: false, title: qn.text }));
}

function drawQuestion(qn, n, total) {
  const choices = qn.choices.map((c) => h('div', { class: 'rec-choice', 'data-c': c }, c));
  const timer = h('div', { class: 'rec-timer', hidden: true });
  $('#card').replaceChildren(
    total > 1 ? h('p', { class: 'rec-count' }, `${n} / ${total}`) : '',
    h('p', { class: 'rec-q' }, qn.text),
    keyboardFor(qn),
    h('div', { class: `rec-choices${qn.choices.length > 2 ? ' grid' : ''}` }, choices),
    timer,
    h('p', { class: 'rec-reveal', hidden: true }));
  return { choices, timer };
}

async function countdown(timer, secs) {
  timer.hidden = false;
  for (let s = secs; s > 0; s--) {
    timer.textContent = s;
    timer.classList.remove('tick'); void timer.offsetWidth; timer.classList.add('tick');
    await wait(1);
  }
  timer.hidden = true;
}

function reveal(qn, choices) {
  for (const el of choices) el.classList.add(el.dataset.c === qn.answer ? 'right' : 'dim');
  const r = $('.rec-reveal');
  r.textContent = qn.reveal || '';
  r.hidden = !qn.reveal;
}

// ---------- Running ----------

let running = false;
async function run() {
  if (running || !current()) return;
  running = true;
  await player.ensure(); // must start from the tap
  document.body.classList.add('rolling');
  const { quiz } = current();
  const total = Number($('#count').value);
  const think = Number($('#think').value);
  let last = null;
  for (let i = 0; i < total; i++) {
    let qn;
    for (let tries = 0; tries < 6; tries++) { qn = makeQuestion(quiz.type, quiz.options); if (!last || qn.text !== last.text || JSON.stringify(qn.play) !== JSON.stringify(last.play)) break; }
    last = qn;
    const { choices, timer } = drawQuestion(qn, i + 1, total);
    await wait(0.6);
    await play(qn);
    await countdown(timer, think);
    reveal(qn, choices);
    if ($('#replay').checked) await play(qn);
    await wait(total > 1 ? 2.2 : 3);
  }
  $('#card').replaceChildren(h('div', { class: 'rec-end' },
    h('p', { class: 'rec-end-big' }, total > 1 ? 'How many did you get?' : 'Did you get it?'),
    h('p', {}, 'Practise with the free lessons and the Sandbox.'),
    h('p', { class: 'rec-url' }, 'everythingsoundacademy.com')));
  await wait(3.5);
  document.body.classList.remove('rolling');
  running = false;
}

function preview() {
  const qn = makeQuestion(current().quiz.type, current().quiz.options);
  drawQuestion(qn, 1, 1);
}

$('#go').addEventListener('click', run);
$('#hide').addEventListener('click', () => document.body.classList.add('panel-off'));
// Settings hidden: tapping the frame starts the run; the ⚙ button brings the settings back.
$('#stage').addEventListener('click', (e) => {
  if (running || e.target.closest('#gear')) return;
  if (document.body.classList.contains('panel-off')) run();
});
$('#gear').addEventListener('click', () => document.body.classList.remove('panel-off'));
$('#preview').addEventListener('click', preview);
select.addEventListener('change', preview);
applyText();
preview();
