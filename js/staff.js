// Staff view: turns a project into ABC notation and renders it with abcjs (global `ABCJS`).

import { chordEvents } from './project.js?v=202611210057';
import { chordInfo, chordVoicing, keySignatureSf, midiForDegree, noteName, accidentalOffset, pcOf, signatureNames } from './theory.js?v=202611210057';

const ABC_ACC = { '-2': '__', '-1': '_', 0: '=', 1: '^', 2: '^^' };

// The major key with the same signature: written in the K: line, so any scale or mode shows the right signature.
const MAJOR_FOR_SF = { '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F', 0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#' };

/**
 * The key signature supplies the accidentals of most notes. Any other note (the raised 7th of harmonic minor,
 * a ♯4 drawn with the sharp pen…) gets its own sign, and a note after it in the same bar gets its sign back.
 * `bar` remembers the signs used in this bar.
 */
function abcPitch(p, note, bar = new Map()) {
  return abcNote(p, noteName(p.key, p.mode, note.deg, note.acc), midiForDegree(p.key, p.mode, note.deg, note.oct, note.acc), bar);
}

/** A spelled note name at a MIDI pitch, as ABC, with a sign only where the signature or the bar needs one. */
function abcNote(p, name, midi, bar = new Map()) {
  const octave = Math.floor((midi - accidentalOffset(name)) / 12) - 1; // scientific octave of the letter
  const letter = name[0];
  const pitch = octave >= 5 ? letter.toLowerCase() + "'".repeat(octave - 5) : letter + ','.repeat(Math.max(0, 4 - octave));
  const acc = accidentalOffset(name);
  const sigName = signatureNames(p.key, p.mode).find((n) => n[0] === letter);
  const inSig = sigName ? accidentalOffset(sigName) : 0;
  const slot = letter + octave;
  const current = bar.has(slot) ? bar.get(slot) : inSig;
  const sign = current === acc ? '' : ABC_ACC[acc];
  if (sign) bar.set(slot, acc);
  return sign + pitch;
}

const dur = (n) => (n === 1 ? '' : String(n));
// ABC chord symbols use the same spelling; "dim" and "m7b5" are understood by abcjs.
const abcChord = (s) => `"${s.replace(/"/g, '')}"`;

export function projectToAbc(p, title = '') {
  const events = chordEvents(p).map((ev) => {
    const info = chordInfo(p.key, p.mode, ev.chord);
    const notes = chordVoicing(info).chord.map((m) => ({ m, name: info.names.find((n) => pcOf(n) === ((m % 12) + 12) % 12) }));
    return { step: ev.start * 2, end: (ev.start + ev.len) * 2, symbol: info.symbol, notes };
  });
  // The melody staff is left out when there is no melody but there are chords: the chord staff then carries the symbols.
  const showMelody = p.melody.length > 0 || !events.length;
  const showChords = events.length > 0;
  const melodyBars = [];
  const chordBars = [];
  for (let b = 0; b < p.bars; b++) {
    const s = b * 8;
    const e = s + 8;
    const points = new Set([s, e]);
    for (const c of events) if (c.step > s && c.step < e) points.add(c.step);
    const chordPoints = new Set(points);
    for (const n of p.melody) {
      if (n.start > s && n.start < e) points.add(n.start);
      if (n.start + n.len > s && n.start + n.len < e) points.add(n.start + n.len);
    }
    // Melody, with the chord symbols above it.
    const sorted = [...points].sort((a, b2) => a - b2);
    const toks = [];
    const signs = new Map(); // accidentals written in this bar
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const q = sorted[i + 1];
      const ch = events.find((c) => c.step === a);
      const sym = ch && showMelody ? abcChord(ch.symbol) : '';
      const note = p.melody.find((n) => n.start <= a && a < n.start + n.len);
      if (note) toks.push(sym + abcPitch(p, note, signs) + dur(q - a) + (note.start + note.len > q ? '-' : ''));
      else toks.push(sym + 'z' + dur(q - a));
    }
    melodyBars.push(toks.join(' '));
    // Chords, as written in the piano part: the same notes that play.
    const cs = [...chordPoints].sort((a, b2) => a - b2);
    const ctoks = [];
    const csigns = new Map();
    for (let i = 0; i < cs.length - 1; i++) {
      const a = cs[i];
      const q = cs[i + 1];
      const ch = events.find((c) => c.step <= a && a < c.end);
      const sym = ch && ch.step === a && !showMelody ? abcChord(ch.symbol) : '';
      if (ch) ctoks.push(`${sym}[${ch.notes.map((n) => abcNote(p, n.name, n.m, csigns)).join('')}]${dur(q - a)}${ch.end > q ? '-' : ''}`);
      else ctoks.push('z' + dur(q - a));
    }
    chordBars.push(ctoks.join(' '));
  }
  const lines = [];
  const voices = [showMelody && ['1', melodyBars], showChords && ['2', chordBars]].filter(Boolean);
  for (let b = 0; b < p.bars; b += 4) {
    const last = b + 4 >= p.bars;
    for (const [v, bars] of voices) {
      if (voices.length > 1) lines.push(`V:${v}`);
      lines.push(bars.slice(b, b + 4).join(' | ') + (last ? ' |]' : ' |'));
    }
  }
  const key = p.mode === 'minor' ? `${p.key}m` : p.mode === 'major' ? p.key : MAJOR_FOR_SF[keySignatureSf(p.key, p.mode)] || 'C';
  const head = [`X:1`, title ? `T:${title.replace(/[\r\n]/g, ' ')}` : '', `M:4/4`, `L:1/8`, `Q:1/4=${p.bpm}`];
  if (voices.length > 1) head.push('%%score {1 2}', 'V:1 clef=treble', 'V:2 clef=bass');
  return [...head, `K:${key}${!showMelody ? ' clef=bass' : ''}`, ...lines].filter(Boolean).join('\n');
}

export function renderStaff(el, p, title = '') {
  if (typeof ABCJS === 'undefined') {
    el.textContent = 'Staff view needs the abcjs library, which did not load.';
    return;
  }
  ABCJS.renderAbc(el, projectToAbc(p, title), { responsive: 'resize', add_classes: true, paddingtop: 4, paddingbottom: 4 });
}
