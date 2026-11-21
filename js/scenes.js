// Scenes (record2.html): scripted, vertical scenes for short videos, one per hook in the TikTok plan.
// Separate from the course: nothing here signs in, saves progress or awards XP.

import { Player } from './audio.js?v=202611210141';
import { keyboardSvg } from './piano.js?v=202611210141';
import { SCENES as WEEKS_1_3 } from './scene-list.js?v=202611210141';
import { SCENES as WEEKS_4_10 } from './scene-list-2.js?v=202611210141';
import { SCENES as SPECIALS } from './scene-specials.js?v=202611210141';
import { SCENES as EXTRAS } from './scene-classics.js?v=202611210141';
import { h } from './util.js?v=202611210141';

const $ = (s) => document.querySelector(s);
const SCENES = [...WEEKS_1_3, ...WEEKS_4_10, ...SPECIALS, ...EXTRAS];
const player = new Player();
// ?speed=10 runs scenes faster (for checking them); normal use is 1.
const SPEED = Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1);
const sleep = (s) => new Promise((r) => setTimeout(r, (s * 1000) / SPEED));
const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, text = null) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text != null) el.textContent = text;
  return el;
};

// ---------- Notes ----------

const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'F#4' / 'Bb3' / 60 -> MIDI number. */
export const n = (x) => {
  if (typeof x === 'number') return x;
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(x);
  if (!m) throw new Error(`Bad note ${x}`);
  return BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
};
/** 'F#4' -> 'F♯' */
export const nm = (x) => String(x).replace(/-?\d+$/, '').replace('#', '♯').replace(/^([A-G])b/, '$1♭');
const freq = (m) => 440 * 2 ** ((n(m) - 69) / 12);
const isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

// ---------- The stage API that scenes use ----------

/** Shrinks the scene's content when it is taller than the card. window.scFit keeps the largest overflow per scene (for checking). */
function fitCard() {
  const card = $('#card');
  const fit = card.querySelector('.sc-fit');
  if (!fit) return;
  const need = fit.offsetHeight;
  const room = card.clientHeight;
  const k = need > room ? room / need : 1;
  fit.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : '';
  const id = select?.value;
  if (id) (window.scFit ||= {})[id] = Math.max(window.scFit[id] || 1, need / room);
}
// Both: a resize (window, fonts) and any change to the scene's content (which also runs when the tab isn't painting).
const fitObserver = new ResizeObserver(fitCard);
const fitWatcher = new MutationObserver(fitCard);

class Stage {
  constructor() {
    this.slots = {
      cap: h('p', { class: 'rec-q', hidden: true }),
      vis: h('div', { class: 'sc-vis' }),
      tag: h('p', { class: 'sc-tag', hidden: true }),
      chips: h('div', { class: 'sc-chips', hidden: true }),
      ask: h('div', { class: 'sc-ask' }),
    };
    // Everything sits in one box that shrinks to fit the card, so a busy scene never spills over the hook or footer.
    const card = $('#card');
    const fit = h('div', { class: 'sc-fit' }, ...Object.values(this.slots));
    card.replaceChildren(fit);
    fitObserver.disconnect();
    fitObserver.observe(card);
    fitObserver.observe(fit);
    fitWatcher.disconnect();
    fitWatcher.observe(fit, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    this.kbBox = null;
    this.marks = new Map();
  }

  wait(s) { return sleep(s); }

  // --- text ---
  cap(text) {
    // No need to repeat the hook word for word when it is already shown big at the top.
    const hook = $('#hook');
    if (text && !hook.hidden && hook.textContent.trim() === text.trim()) text = '';
    this.slots.cap.textContent = text || ''; this.slots.cap.hidden = !text;
  }
  tag(text) { this.slots.tag.textContent = text || ''; this.slots.tag.hidden = !text; }
  clearVis() { this.slots.vis.replaceChildren(); this.kbBox = null; this.marks = new Map(); this.roll = null; this.mapEl = null; this.beatsEl = null; }
  /** A placeholder for a clip the presenter films (replace it in CapCut). */
  async clip(what, secs = 3.5) {
    this.clearVis();
    this.slots.vis.append(h('div', { class: 'sc-clip' }, h('strong', {}, what), h('span', {}, 'Replace this part with your own clip in CapCut')));
    await sleep(secs);
    this.clearVis();
  }

  // --- keyboard ---
  kb(low, high) {
    this.low = n(low); this.high = n(high);
    if (isBlack(this.low)) this.low--;
    if (isBlack(this.high)) this.high++;
    this.marks = new Map();
    if (!this.kbBox) { this.kbBox = h('div', { class: 'sc-kbd' }); this.slots.vis.append(this.kbBox); }
    this.drawKb();
  }
  drawKb() {
    if (!this.kbBox) return;
    const marks = new Map([...this.marks].map(([m, v]) => [m, { hands: new Set([v.cls]), finger: null, label: v.label }]));
    this.kbBox.replaceChildren(keyboardSvg({ low: this.low, high: this.high, marks, whiteW: 26, height: 120, fingers: false, labels: false, title: 'Keyboard' }));
  }
  /** Light keys. label: true = the note's name, a string, or an array of strings. */
  mark(notes, cls = 'rh', label = true) {
    [].concat(notes).forEach((x, i) => {
      const lab = Array.isArray(label) ? label[i] : label === true ? nm(x) : label || '';
      this.marks.set(n(x), { cls, label: lab });
    });
    this.drawKb();
  }
  unmark(notes) { [].concat(notes).forEach((x) => this.marks.delete(n(x))); this.drawKb(); }
  clearKb() { this.marks = new Map(); this.drawKb(); }

  // --- sound ---
  async ensure() { await player.ensure(); }
  sound(notes, len = 0.5, { synth = 'auto', vel = 0.75 } = {}) {
    const list = [].concat(notes).map(n);
    const at = Tone.now() + 0.02;
    if (synth === 'bass') player.synths.bass.triggerAttackRelease(freq(list[0]), len, at, vel);
    else if (list.length === 1 && synth !== 'chords') player.synths.melody.triggerAttackRelease(freq(list[0]), len, at, vel);
    else player.synths.chords.triggerAttackRelease(list.map(freq), len, at, vel * 0.8);
  }
  /** Play notes one after another. Options: gap, len, light (show on the keyboard), keep (leave lit), cls, labels, synth. */
  async notes(list, { gap = 0.55, len = null, light = true, keep = false, cls = 'rh', labels = true, synth = 'auto', vel = 0.75 } = {}) {
    for (let i = 0; i < list.length; i++) {
      const [x, d] = Array.isArray(list[i]) ? list[i] : [list[i], gap];
      if (x == null) { await sleep(d); continue; } // a rest
      if (light && this.kbBox) this.mark(x, cls, Array.isArray(labels) ? labels[i] : labels);
      this.sound(x, len ?? Math.min(0.9, d * 0.9), { synth, vel });
      await sleep(d);
      if (light && this.kbBox && !keep) this.unmark(x);
    }
  }
  /** Play a chord (notes together). */
  async chord(list, { len = 1.3, hold = null, light = true, keep = true, cls = 'rh', labels = true, bass = null } = {}) {
    if (light && this.kbBox) {
      if (!keep) this.clearKb();
      this.mark(list, cls, labels);
      if (bass) this.mark(bass, 'lh', labels);
    }
    this.sound(bass ? [bass, ...list] : list, len, { synth: 'chords' });
    await sleep(hold ?? len + 0.15);
  }
  /** A major or minor scale, with T/S chips lighting between notes. */
  async scale(list, { gap = 0.5, steps = ['T', 'T', 'S', 'T', 'T', 'T', 'S'], keep = true, cls = 'rh' } = {}) {
    if (steps) this.chips(steps);
    for (let i = 0; i < list.length; i++) {
      if (steps && i > 0) this.chipOn(i - 1);
      await this.notes([list[i]], { gap, keep, cls });
    }
  }

  // --- chips (progressions, steps) ---
  chips(list) {
    this.slots.chips.replaceChildren(...list.map((c) => h('span', { class: 'sc-chip' }, c)));
    this.slots.chips.hidden = !list.length;
  }
  chipOn(i) {
    [...this.slots.chips.children].forEach((c, j) => { c.classList.toggle('on', j === i); if (j < i) c.classList.add('done'); });
  }
  chipsOff() { [...this.slots.chips.children].forEach((c) => c.classList.remove('on')); }
  hideChips() { this.slots.chips.hidden = true; }
  /** Play chords from a chord table one by one, lighting the chip and the keyboard. prog: [['I', C.I], ...] */
  async prog(prog, { gap = 1.25, len = null, chips = true, light = true, mapOn = false } = {}) {
    if (chips) this.chips(prog.map(([label]) => label));
    for (let i = 0; i < prog.length; i++) {
      const [label, voicing, d = gap] = prog[i];
      if (chips) this.chipOn(i);
      if (mapOn) this.mapOn(label);
      const [bass, ...upper] = voicing;
      if (light && this.kbBox) { this.clearKb(); this.mark(upper, 'rh', false); this.mark(bass, 'lh', false); }
      this.sound(voicing, len ?? d * 0.95, { synth: 'chords' });
      await sleep(d);
    }
    if (chips) this.chipsOff();
  }

  // --- gravity map ---
  map({ shown = true } = {}) {
    const level = (chords, note) => h('div', { class: `sc-level${shown ? ' shown' : ''}` },
      h('div', { class: 'sc-chords' }, chords.map((c) => h('span', { class: 'sc-chip', 'data-c': c }, c))), h('small', {}, note));
    this.mapEl = h('div', { class: 'sc-map' },
      level(['vi', 'iii'], 'no direct pull'), level(['IV', 'ii'], 'strong pull'), level(['V', 'vii°'], 'strongest pull'), level(['I'], 'home'));
    this.slots.vis.append(this.mapEl);
  }
  mapLevel(i) { this.mapEl?.children[i]?.classList.add('shown'); }
  mapOn(label) { this.mapEl?.querySelectorAll('.sc-chip').forEach((c) => c.classList.toggle('on', c.dataset.c === label)); }

  // --- piano roll ---
  /** events: [[note, startBeat, beats], ...]. bpb = beats per bar. Notes appear as they play. */
  rollSetup(events, { bpb = 4 } = {}) {
    const ms = events.map(([x]) => n(x));
    const lo = Math.min(...ms) - 1; const hi = Math.max(...ms) + 1;
    const beats = Math.max(...events.map(([, s, d]) => s + d));
    const W = 340; const rowH = Math.max(8, Math.min(16, 180 / (hi - lo + 1)));
    const H = (hi - lo + 1) * rowH;
    const bw = W / beats;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    for (let m = lo; m <= hi; m++) if (m % 12 === 0) svg.append(svgEl('rect', { x: 0, y: (hi - m) * rowH, width: W, height: rowH, class: 'row-c' }));
    for (let b = 0; b <= beats; b++) svg.append(svgEl('line', { x1: b * bw, x2: b * bw, y1: 0, y2: H, class: b % bpb === 0 ? 'grid-bar' : 'grid-beat' }));
    this.roll = { svg, lo, hi, rowH, bw, rects: [] };
    this.slots.vis.append(h('div', { class: 'sc-roll' }, svg));
  }
  /** events can carry a 4th item, the synth ('chords' for a second voice).
   *  chords: [[label, voicing, startBeat, beats], ...] played under the melody, lighting chips. */
  async rollPlay(events, { bpm = 100, keepRoll = true, chords = null, chips = true } = {}) {
    if (!this.roll) this.rollSetup(events);
    const r = this.roll;
    if (!keepRoll) { r.rects.forEach((x) => x.remove()); r.rects = []; }
    const spb = 60 / bpm;
    if (chords) {
      if (chips) this.chips(chords.map(([label]) => label));
      chords.forEach(([, voicing, start, dur], i) => setTimeout(() => {
        if (chips) this.chipOn(i);
        this.sound(voicing, dur * spb * 0.95, { synth: 'chords', vel: 0.55 });
      }, (start * spb * 1000) / SPEED));
    }
    events = [...events].sort((a, b) => a[1] - b[1]);
    let t = 0;
    for (const [x, start, dur, voice = 'auto'] of events) {
      if (start > t) { await sleep((start - t) * spb); t = start; }
      const rect = svgEl('rect', { x: start * r.bw + 1, y: (r.hi - n(x)) * r.rowH + 1, width: dur * r.bw - 2, height: r.rowH - 2, class: 'nt now', rx: 3 });
      r.svg.append(rect); r.rects.push(rect);
      this.sound(x, dur * spb * 0.9, { synth: voice });
      if (this.kbBox) this.mark(x, 'rh');
      setTimeout(() => { rect.classList.remove('now'); if (this.kbBox) this.unmark(x); }, (dur * spb * 900) / SPEED);
    }
    const end = Math.max(...events.map(([, s, d]) => s + d), ...(chords || []).map(([, , s, d]) => s + d));
    await sleep((end - t) * spb + 0.2);
    if (chords && chips) this.chipsOff();
  }

  // --- note values (whole … 16th) ---
  values() {
    const rows = [['Whole', 1], ['Half', 2], ['Quarter', 4], ['Eighth', 8], ['16th', 16]];
    const W = 340; const rowH = 26; const left = 62;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${rows.length * (rowH + 6)}` });
    this.valueRows = rows.map(([name, k], r) => {
      svg.append(svgEl('text', { x: 0, y: r * (rowH + 6) + 18 }, name));
      const w = (W - left) / k;
      return Array.from({ length: k }, (_, i) => {
        const rect = svgEl('rect', { x: left + i * w + 1, y: r * (rowH + 6), width: w - 2, height: rowH, rx: 4 });
        svg.append(rect);
        return rect;
      });
    });
    this.slots.vis.append(h('div', { class: 'sc-values' }, svg));
  }
  async valuesPlay(r, barSecs = 2.4, note = 'C5') {
    const cells = this.valueRows[r];
    const d = barSecs / cells.length;
    for (const c of cells) { c.classList.add('on'); this.sound(note, d * 0.85, { synth: 'chords', vel: 0.6 }); await sleep(d); }
  }

  // --- pulse dots ---
  beats(groups) {
    this.beatsEl = h('div', { class: 'sc-beats' }, groups.map((k) => h('div', { class: 'sc-group' },
      Array.from({ length: k }, (_, i) => h('span', { class: `sc-dot${i === 0 ? ' big' : ''}` })))));
    this.slots.vis.append(this.beatsEl);
  }
  /** Play the pulse: strong first beat of each group, the first group loudest. */
  async pulse(groups, { gap = 0.3, rounds = 2, light = true } = {}) {
    for (let r = 0; r < rounds; r++) {
      let k = 0;
      for (let g = 0; g < groups.length; g++) {
        for (let i = 0; i < groups[g]; i++) {
          const dot = light ? this.beatsEl?.querySelectorAll('.sc-dot')[k] : null;
          dot?.classList.add('on');
          const note = g === 0 && i === 0 ? 'C6' : i === 0 ? 'G5' : 'C5';
          this.sound(note, 0.12, { synth: 'chords', vel: i === 0 ? 0.9 : 0.45 });
          await sleep(gap);
          dot?.classList.remove('on');
          k++;
        }
      }
    }
  }

  // --- questions ---
  /** Choices, a countdown, then the answer lit. reveal: text under it. after: async () => {} to show/play the answer. */
  async ask({ choices, answer, reveal = '', think = 3, after = null }) {
    const els = choices.map((c) => h('div', { class: 'rec-choice', 'data-c': c }, c));
    const timer = h('div', { class: 'rec-timer' });
    const rev = h('p', { class: 'rec-reveal', hidden: true });
    this.slots.ask.replaceChildren(h('div', { class: `rec-choices${choices.length > 2 ? ' grid' : ''}` }, els), timer, rev);
    for (let s = think; s > 0; s--) {
      timer.textContent = s;
      timer.classList.remove('tick'); void timer.offsetWidth; timer.classList.add('tick');
      await sleep(1);
    }
    timer.remove();
    els.forEach((el) => el.classList.add(el.dataset.c === answer ? 'right' : 'dim'));
    if (reveal) { rev.textContent = reveal; rev.hidden = false; }
    if (after) await after();
    else await sleep(2.5);
  }
  clearAsk() { this.slots.ask.replaceChildren(); }
  async timer(secs) {
    const t = h('div', { class: 'rec-timer' });
    this.slots.ask.replaceChildren(t);
    for (let s = secs; s > 0; s--) { t.textContent = s; t.classList.remove('tick'); void t.offsetWidth; t.classList.add('tick'); await sleep(1); }
    this.slots.ask.replaceChildren();
  }
  /** Reset everything between parts of a scene. */
  reset() { this.cap(''); this.tag(''); this.clearVis(); this.hideChips(); this.clearAsk(); }
}

// ---------- End cards ----------

const ENDS = {
  quiz: ['Did you get it?', 'Practise with the free lessons and the Sandbox.'],
  recap: ['How many did you get?', 'Practise with the free lessons and the Sandbox.'],
  learn: ['Learn it free', 'Lessons, exercises and the Sandbox.'],
  part2: ['Part 2 tomorrow', 'Follow so you don’t miss it.'],
  challenge: ['Your turn', 'Duet me with your 4 bars.'],
  next: ['Next part tomorrow', 'Follow so you don’t miss it.'],
  series: ['Part 1 tomorrow', 'Music theory from zero. Follow so you don’t miss it.'],
};

// ---------- Settings ----------

const select = $('#scene');
// Day 1 is Saturday 28 November 2026; each week runs Saturday to Friday.
const dayDate = (d) => new Date(2026, 10, 27 + d);
const short = (d) => dayDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const weekLabel = (w) => {
  const days = SCENES.filter((s) => s.week === w).map((s) => s.day);
  return `Week ${w} · ${short(Math.min(...days))} – ${short(Math.max(...days))}`;
};
// Dated scenes group by week; extra sets (like the producer specials) carry their own group name.
const groupOf = (s) => s.group || weekLabel(s.week);
const where = (s) => (s.group ? `${s.group} · ${s.n}` : `Day ${s.day} · ${short(s.day)} · ${s.slot}`);
const groups = [...new Set(SCENES.map(groupOf))].map((g) => h('optgroup', { label: g },
  SCENES.filter((s) => groupOf(s) === g).map((s) => h('option', { value: s.id }, s.group ? `${s.n} · ${s.hook}` : `Day ${s.day} · ${s.slot} · ${s.hook}`))));
select.replaceChildren(...groups);
const saved = (k, d) => { try { return localStorage.getItem(`es.scn.${k}`) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(`es.scn.${k}`, v); } catch { /* private mode */ } };
for (const [id, key, d, prop] of [['#scene', 'scene', SCENES[0].id, 'value'], ['#theme', 'theme', 'dark', 'value'], ['#foot-input', 'foot', 'Free lessons · link in bio', 'value'], ['#show-hook', 'hook', 'true', 'checked'], ['#auto-next', 'next', 'true', 'checked'], ['#auto-play', 'play', 'false', 'checked']]) {
  const el = $(id);
  const v = saved(key, d);
  if (prop === 'checked') el.checked = v === 'true';
  else if (el.tagName !== 'SELECT' || [...el.querySelectorAll('option')].some((o) => o.value === v)) el.value = v;
  el.addEventListener('input', () => { save(key, String(el[prop])); applyText(); });
  el.addEventListener('change', () => { save(key, String(el[prop])); applyText(); });
}
const current = () => SCENES.find((s) => s.id === select.value) || SCENES[0];

function applyText() {
  const sc = current();
  document.body.dataset.theme = $('#theme').value;
  const showHook = $('#show-hook').checked;
  $('#hook').textContent = showHook ? sc.hook : '';
  $('#hook').hidden = !showHook;
  $('#foot').textContent = $('#foot-input').value.trim();
  $('#scene-note').textContent = sc.note || '';
  if (!running) showCover();
}

function showCover() {
  const sc = current();
  $('#card').replaceChildren(h('div', { class: 'rec-end' },
    h('p', { class: 'muted' }, where(sc)),
    h('p', { class: 'rec-end-big' }, 'Ready'),
    h('p', {}, document.body.classList.contains('panel-off') ? 'Tap here to start.' : 'Tap Go to play this scene.')));
}

// ---------- Running ----------

let running = false;
let stopAfter = false; // a tap during auto-play stops it after the current scene
async function run() {
  if (running) return;
  running = true;
  await player.ensure();
  document.body.classList.add('rolling');
  const sc = current();
  const S = new Stage();
  try {
    await sleep(0.5);
    await sc.run(S);
  } catch (err) {
    console.error(err);
  }
  const [big, small] = ENDS[sc.end || 'learn'];
  $('#card').replaceChildren(h('div', { class: 'rec-end' },
    h('p', { class: 'rec-end-big' }, big), h('p', {}, small), h('p', { class: 'rec-url' }, 'everythingsoundacademy.com')));
  await sleep(3.5);
  document.body.classList.remove('rolling');
  running = false;
  let moved = false;
  if ($('#auto-next').checked) {
    const i = SCENES.indexOf(sc);
    if (i + 1 < SCENES.length) { select.value = SCENES[i + 1].id; save('scene', select.value); moved = true; }
  }
  applyText();
  // One long recording: play the next scene by itself after a short pause.
  if (moved && $('#auto-play').checked && !stopAfter) setTimeout(run, 1500);
  stopAfter = false;
}

$('#go').addEventListener('click', run);
$('#hide').addEventListener('click', () => { document.body.classList.add('panel-off'); applyText(); });
// Settings hidden: tapping the frame starts the run; the ⚙ button brings the settings back.
$('#stage').addEventListener('click', (e) => {
  if (e.target.closest('#gear')) return;
  if (running) { stopAfter = true; return; }
  if (document.body.classList.contains('panel-off')) run();
});
$('#gear').addEventListener('click', () => { document.body.classList.remove('panel-off'); applyText(); });
applyText();
