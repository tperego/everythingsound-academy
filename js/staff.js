// Staff view: turns a project into ABC notation and renders it with abcjs (global `ABCJS`).

import { chordEvents } from './project.js?v=202611161458';
import { chordInfo, midiForDegree, noteName, accidentalOffset } from './theory.js?v=202611161458';

const ABC_ACC = { '-2': '__', '-1': '_', 0: '=', 1: '^', 2: '^^' };

/**
 * The key signature supplies the accidentals of diatonic notes. A raised 6th or 7th (minor) gets its own sign,
 * and a plain note after it in the same bar gets its sign back. `bar` remembers the signs used in this bar.
 */
function abcPitch(p, note, bar = new Map()) {
  const name = noteName(p.key, p.mode, note.deg, note.acc);
  const midi = midiForDegree(p.key, p.mode, note.deg, note.oct, note.acc);
  const octave = Math.floor((midi - accidentalOffset(name)) / 12) - 1; // scientific octave of the letter
  const letter = name[0];
  const pitch = octave >= 5 ? letter.toLowerCase() + "'".repeat(octave - 5) : letter + ','.repeat(Math.max(0, 4 - octave));
  const acc = accidentalOffset(name);
  const slot = letter + octave;
  let sign = '';
  if (note.acc) sign = bar.get(slot) === acc ? '' : ABC_ACC[acc];
  else if (bar.has(slot) && bar.get(slot) !== acc) sign = ABC_ACC[acc];
  if (sign || bar.has(slot)) bar.set(slot, acc);
  return sign + pitch;
}

const dur = (n) => (n === 1 ? '' : String(n));
// ABC chord symbols use the same spelling; "dim" and "m7b5" are understood by abcjs.
const abcChord = (s) => `"${s.replace(/"/g, '')}"`;

export function projectToAbc(p, title = '') {
  const chords = chordEvents(p).map((ev) => ({ step: ev.start * 2, symbol: chordInfo(p.key, p.mode, ev.chord).symbol }));
  const lines = [];
  let line = [];
  for (let b = 0; b < p.bars; b++) {
    const s = b * 8;
    const e = s + 8;
    const points = new Set([s, e]);
    for (const c of chords) if (c.step > s && c.step < e) points.add(c.step);
    for (const n of p.melody) {
      if (n.start > s && n.start < e) points.add(n.start);
      if (n.start + n.len > s && n.start + n.len < e) points.add(n.start + n.len);
    }
    const sorted = [...points].sort((a, b2) => a - b2);
    const toks = [];
    const signs = new Map(); // accidentals written in this bar
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const q = sorted[i + 1];
      const ch = chords.find((c) => c.step === a);
      const sym = ch ? abcChord(ch.symbol) : '';
      const note = p.melody.find((n) => n.start <= a && a < n.start + n.len);
      if (note) toks.push(sym + abcPitch(p, note, signs) + dur(q - a) + (note.start + note.len > q ? '-' : ''));
      else toks.push(sym + 'z' + dur(q - a));
    }
    line.push(toks.join(' '));
    if ((b + 1) % 4 === 0 || b === p.bars - 1) {
      lines.push(line.join(' | ') + (b === p.bars - 1 ? ' |]' : ' |'));
      line = [];
    }
  }
  const key = p.mode === 'minor' ? `${p.key}m` : p.key;
  return [`X:1`, title ? `T:${title.replace(/[\r\n]/g, ' ')}` : '', `M:4/4`, `L:1/8`, `Q:1/4=${p.bpm}`, `K:${key}`, ...lines].filter(Boolean).join('\n');
}

export function renderStaff(el, p, title = '') {
  if (typeof ABCJS === 'undefined') {
    el.textContent = 'Staff view needs the abcjs library, which did not load.';
    return;
  }
  ABCJS.renderAbc(el, projectToAbc(p, title), { responsive: 'resize', add_classes: true, paddingtop: 4, paddingbottom: 4 });
}
