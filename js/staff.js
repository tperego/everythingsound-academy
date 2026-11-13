// Staff view: turns a project into ABC notation and renders it with abcjs (global `ABCJS`).

import { chordEvents } from './project.js?v=202611122359';
import { chordInfo, degreeName, midiForDegree, accidentalOffset } from './theory.js?v=202611122359';

function abcPitch(p, note) {
  const name = degreeName(p.key, p.mode, note.deg);
  const midi = midiForDegree(p.key, p.mode, note.deg, note.oct);
  const octave = Math.floor((midi - accidentalOffset(name)) / 12) - 1; // scientific octave of the letter
  const letter = name[0];
  // The key signature supplies the accidentals, since every note is diatonic.
  if (octave >= 5) return letter.toLowerCase() + "'".repeat(octave - 5);
  return letter + ','.repeat(Math.max(0, 4 - octave));
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
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const q = sorted[i + 1];
      const ch = chords.find((c) => c.step === a);
      const sym = ch ? abcChord(ch.symbol) : '';
      const note = p.melody.find((n) => n.start <= a && a < n.start + n.len);
      if (note) toks.push(sym + abcPitch(p, note) + dur(q - a) + (note.start + note.len > q ? '-' : ''));
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
