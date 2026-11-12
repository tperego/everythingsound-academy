// Piano view: a keyboard showing the chord (left hand bass + right hand chord, with finger numbers)
// and the melody note, following the playhead. Plus a chord sheet with a mini keyboard per chord.

import { STEPS_PER_BAR, chordAtBeat, chordEvents } from './project.js?v=202611122344';
import { bassName, chordInfo, chordVoicing, degreeName, midiForDegree } from './theory.js?v=202611122344';
import { h } from './util.js?v=202611122344';

const SVG = 'http://www.w3.org/2000/svg';
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const isBlack = (m) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
export const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const pretty = (n) => n.replace(/#/g, '♯').replace(/^([A-G])b/, '$1♭').replace(/b$/, '♭');
/** A note name spelled for the key (G♯ in E major, not A♭), with its octave. */
const spelled = (name, m) => `${pretty(name)}${Math.floor(m / 12) - 1}`;

function s(tag, attrs = {}, text = null) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  if (text != null) el.textContent = text;
  return el;
}

/**
 * Standard fingerings for one chord.
 * Right hand: triads 1-3-5 (root position and 2nd inversion), 1-2-5 (1st inversion); 7th chords 1-2-3-5.
 * Left hand: the bass note with finger 5.
 */
export function chordHands(info, key, mode, chord) {
  const v = chordVoicing(info);
  let fingers;
  if (v.chord.length >= 4) fingers = [1, 2, 3, 5];
  else if (info.inversion === 1) fingers = [1, 2, 5];
  else fingers = [1, 3, 5];
  const nameOf = {};
  info.pcs.forEach((pc, i) => { nameOf[pc] = info.names[i]; });
  const bassPcName = nameOf[v.bass % 12] || (chord?.bass ? bassName(key, mode, chord.bass) : NAMES[v.bass % 12]);
  return {
    lh: [{ midi: v.bass, finger: 5, name: spelled(bassPcName, v.bass) }],
    rh: v.chord.map((midi, i) => ({ midi, finger: fingers[i], name: spelled(nameOf[midi % 12] || NAMES[midi % 12], midi) })),
  };
}

/**
 * Draw a keyboard. marks: Map(midi -> {hands: Set('lh'|'rh'|'mel'), finger})
 */
export function keyboardSvg({ low = 36, high = 88, marks = new Map(), whiteW = 22, height = 112, fingers = true, labels = true, title = 'Piano keyboard' }) {
  const whites = [];
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
  const W = whites.length * whiteW;
  const bw = whiteW * 0.62;
  const bh = height * 0.62;
  const svg = s('svg', { viewBox: `0 0 ${W} ${height}`, class: 'kbd', role: 'img', 'aria-label': title, preserveAspectRatio: 'xMinYMin meet' });
  const cls = (m, base) => {
    const mk = marks.get(m);
    if (!mk) return base;
    return [base, ...mk.hands].join(' ');
  };
  const fingerBadge = (m, cx, cy, r) => {
    const mk = marks.get(m);
    if (!fingers || !mk?.finger) return;
    svg.append(s('circle', { cx, cy, r, class: 'fbadge' }), s('text', { x: cx, y: cy + r * 0.38, class: 'ftext', 'font-size': r * 1.15 }, String(mk.finger)));
  };
  whites.forEach((m, i) => {
    const x = i * whiteW;
    svg.append(s('rect', { x: x + 0.5, y: 0.5, width: whiteW - 1, height: height - 1, rx: 3, class: cls(m, 'wk'), 'data-midi': m }));
    if (labels && m % 12 === 0 && !marks.get(m)) svg.append(s('text', { x: x + whiteW / 2, y: height - 6, class: 'clabel', 'font-size': Math.max(7, whiteW * 0.38) }, noteName(m)));
    fingerBadge(m, x + whiteW / 2, height - whiteW * 0.55, whiteW * 0.36);
    const lab = marks.get(m)?.label;
    if (lab) svg.append(s('text', { x: x + whiteW / 2, y: height - 8, class: 'klabel', 'font-size': Math.max(9, whiteW * 0.42) }, lab));
  });
  let wi = 0;
  for (let m = low; m <= high; m++) {
    if (!isBlack(m)) { wi++; continue; }
    const x = wi * whiteW - bw / 2;
    svg.append(s('rect', { x, y: 0, width: bw, height: bh, rx: 2, class: cls(m, 'bk'), 'data-midi': m }));
    fingerBadge(m, x + bw / 2, bh - bw * 0.7, bw * 0.42);
    const lab = marks.get(m)?.label;
    if (lab) svg.append(s('text', { x: x + bw / 2, y: bh - 6, class: 'klabel on-black', 'font-size': Math.max(8, bw * 0.5) }, lab));
  }
  return svg;
}

function addMark(marks, midi, hand, finger) {
  const mk = marks.get(midi) || { hands: new Set(), finger: null };
  mk.hands.add(hand);
  if (finger && !mk.finger) mk.finger = finger;
  marks.set(midi, mk);
}

/** Live keyboard under the grid. */
export class PianoView {
  constructor(root) {
    this.root = root;
    root.classList.add('piano-view');
  }

  show(p, step) {
    const ev = chordAtBeat(p, step / 2);
    const mel = p.melody.find((n) => n.start <= step && step < n.start + n.len);
    const marks = new Map();
    let chordText = 'No chord here';
    let handsText = '';
    if (ev) {
      const info = chordInfo(p.key, p.mode, ev.chord);
      const hands = chordHands(info, p.key, p.mode, ev.chord);
      hands.lh.forEach((k) => addMark(marks, k.midi, 'lh', k.finger));
      hands.rh.forEach((k) => addMark(marks, k.midi, 'rh', k.finger));
      chordText = `${pretty(info.symbol)} · ${info.roman}`;
      handsText = `Left hand: ${hands.lh.map((k) => `${k.name} (${k.finger})`).join(' ')} · Right hand: ${hands.rh.map((k) => k.name).join(' ')} (${hands.rh.map((k) => k.finger).join('-')})`;
    }
    let melText = '';
    if (mel) {
      const m = midiForDegree(p.key, p.mode, mel.deg, mel.oct);
      addMark(marks, m, 'mel', null);
      melText = `Melody: ${spelled(degreeName(p.key, p.mode, mel.deg), m)} (degree ${mel.deg})`;
    }
    const bar = Math.floor(step / STEPS_PER_BAR) + 1;
    const beat = Math.floor((step % STEPS_PER_BAR) / 2) + 1;
    this.root.replaceChildren(
      h('div', { class: 'piano-head' },
        h('strong', { class: 'piano-chord' }, chordText),
        h('span', { class: 'muted small' }, `Bar ${bar}, beat ${beat}`),
        h('span', { class: 'legend' }, h('span', { class: 'dot lh' }), 'Left hand ', h('span', { class: 'dot rh' }), 'Right hand ', h('span', { class: 'dot mel' }), 'Melody')),
      h('div', { class: 'kbd-scroll' }, keyboardSvg({ low: 36, high: 88, marks, title: `${chordText}. ${handsText}. ${melText}` })),
      h('p', { class: 'muted small piano-hands' }, [handsText, melText].filter(Boolean).join(' · ') || 'Press Play, or click a chord in the grid, to see it on the keyboard.'),
    );
  }
}

/** Chord sheet: one card per chord with a mini keyboard and fingering. Printable. */
export class ChordSheet {
  constructor(root, { onPick = () => {}, title = () => '' } = {}) {
    this.root = root;
    this.onPick = onPick;
    this.title = title;
    root.classList.add('chord-sheet');
    this.cards = [];
  }

  render(p) {
    const events = chordEvents(p);
    this.events = events;
    this.cards = events.map((ev) => {
      const info = chordInfo(p.key, p.mode, ev.chord);
      const hands = chordHands(info, p.key, p.mode, ev.chord);
      const marks = new Map();
      hands.lh.forEach((k) => addMark(marks, k.midi, 'lh', k.finger));
      hands.rh.forEach((k) => addMark(marks, k.midi, 'rh', k.finger));
      const bar = Math.floor(ev.start / 4) + 1;
      const half = ev.start % 4 ? ', beat 3' : '';
      return h('button', {
        type: 'button',
        class: `chord-card fn-${info.func}`,
        onclick: () => this.onPick(ev),
        title: 'Show this chord on the keyboard',
      },
        h('span', { class: 'cc-top' }, h('span', { class: 'cc-sym' }, pretty(info.symbol)), h('span', { class: 'cc-roman' }, info.roman)),
        keyboardSvg({ low: 36, high: 71, marks, whiteW: 10, height: 50, fingers: false, labels: false, title: info.symbol }),
        h('span', { class: 'cc-fing' }, `LH ${hands.lh.map((k) => k.name.replace(/-?\d+$/, '')).join(' ')} (5) · RH ${hands.rh.map((k) => k.name.replace(/-?\d+$/, '')).join(' ')} (${hands.rh.map((k) => k.finger).join('-')})`),
        h('span', { class: 'cc-bar' }, `Bar ${bar}${half} · ${ev.len} beat${ev.len > 1 ? 's' : ''}`));
    });
    this.root.replaceChildren(
      h('div', { class: 'sheet-head' },
        h('h4', {}, `Chord sheet · ${p.key} ${p.mode}, ${p.bpm} BPM`),
        h('button', { type: 'button', class: 'btn small', onclick: () => this.print() }, 'Print chord sheet')),
      this.cards.length ? h('div', { class: 'sheet-grid' }, this.cards) : h('p', { class: 'muted' }, 'No chords yet.'),
    );
  }

  highlight(step) {
    const beat = step / 2;
    (this.events || []).forEach((ev, i) => this.cards[i]?.classList.toggle('now', step >= 0 && ev.start <= beat && beat < ev.start + ev.len));
  }

  print() {
    // Print only the chord sheet: mark it, hide everything else with print CSS, then clean up.
    const t = this.title();
    this.root.dataset.printTitle = t;
    document.body.classList.add('printing-sheet');
    this.root.classList.add('print-target');
    const done = () => {
      document.body.classList.remove('printing-sheet');
      this.root.classList.remove('print-target');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }
}
