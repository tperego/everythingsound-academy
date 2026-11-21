// Project data model. Times: chord slots are half-bars (2 beats); melody steps are 8th notes.
//
// project = {
//   v: 1, key: 'G', mode: 'major', bpm: 96, bars: 4,
//   chords: [ {deg, seventh, bass?, rel?} | null, ... ]   // length bars*2; null = keep the previous chord
//     rel = {shift, mode}: the chord is degree `deg` of another key, `shift` semitones above the tonic (modulation, V/V…)
//   melody: [ {start, len, deg, oct, acc?}, ... ]  // start/len in 8th-note steps, deg 1..7, oct -1..1; acc 1 sharp, -1 flat
//   mode: 'major', 'minor', 'harmonic-minor', 'dorian', 'major-pentatonic'… (see SCALES in theory.js)
//   form: [ {start, len, label}, ... ]       // optional (Sandbox): lettered phrases in bars, e.g. {start: 0, len: 4, label: 'A'}
// }

import { KEY_OPTIONS, MODES, borrowsLeadingNote, chordInfo, chordVoicing, midiForDegree, pcOf } from './theory.js?v=202611210006';

export const STEPS_PER_BAR = 8;
export const SLOTS_PER_BAR = 2;
export const BAR_OPTIONS = [4, 8, 12, 16, 24, 32];

/** Melody rows from top to bottom: 3 above the octave down to 5 below the tonic. */
export const MELODY_ROWS = [
  { deg: 3, oct: 1 }, { deg: 2, oct: 1 }, { deg: 1, oct: 1 },
  { deg: 7, oct: 0 }, { deg: 6, oct: 0 }, { deg: 5, oct: 0 }, { deg: 4, oct: 0 },
  { deg: 3, oct: 0 }, { deg: 2, oct: 0 }, { deg: 1, oct: 0 },
  { deg: 7, oct: -1 }, { deg: 6, oct: -1 }, { deg: 5, oct: -1 },
];

// In minor keys the melody also gets the raised 7th (leading note, as in V and vii°) and the raised 6th (melodic minor).
const MINOR_ROWS = MELODY_ROWS.flatMap((r) => (r.deg === 7 || r.deg === 6 ? [{ ...r, acc: 1 }, r] : [r]));

/** The melody grid's rows, top to bottom, for a mode. */
export function melodyRows(mode = 'major') {
  return borrowsLeadingNote(mode) ? MINOR_ROWS : MELODY_ROWS;
}

export const sameRow = (r, n) => r.deg === n.deg && r.oct === n.oct && (r.acc || 0) === (n.acc || 0);

/** The row a note sits on: its own (♯7 in minor), or its degree's row with a ♯ or ♭ on the note. */
export function rowIndexOf(deg, oct, acc = 0, mode = 'major') {
  const rows = melodyRows(mode);
  const exact = rows.findIndex((r) => sameRow(r, { deg, oct, acc }));
  return exact >= 0 ? exact : rows.findIndex((r) => sameRow(r, { deg, oct, acc: 0 }));
}

/**
 * Change the scale. Notes keep their degree, so they move into the new scale; a sharp or flat note whose pitch
 * the new scale already has becomes a plain note (C major's ♭7 is C Mixolydian's 7).
 */
export function changeMode(p, mode, key) {
  const from = MODES[p.mode];
  const to = MODES[mode];
  const melody = p.melody.map((n) => {
    if (!n.acc) return n;
    const { acc, ...rest } = n;
    return from[n.deg - 1] + acc === to[n.deg - 1] ? rest : n;
  });
  return normalizeProject({ ...p, mode, key, melody });
}

/** A key for a new scale: the same tonic when that scale offers it (C# for Db if needed). */
export function keyForMode(key, mode) {
  const opts = KEY_OPTIONS[mode];
  return opts.includes(key) ? key : opts.find((k) => pcOf(k) === pcOf(key)) || opts[0];
}

export function newProject({ key = 'C', mode = 'major', bpm = 90, bars = 4, progression = null, melody = [] } = {}) {
  const p = { v: 1, key, mode, bpm, bars, chords: Array(bars * SLOTS_PER_BAR).fill(null), melody: [] };
  if (progression) {
    // One entry per bar: a degree, {deg, seventh}, or an array of two for two chords in the bar.
    const toChord = (c) => (typeof c === 'number' ? { deg: c, seventh: false } : { deg: c.deg, seventh: !!c.seventh, ...(c.bass ? { bass: c.bass } : {}) });
    progression.forEach((c, bar) => {
      if (c == null || bar >= bars) return;
      const parts = Array.isArray(c) ? c : [c];
      parts.slice(0, SLOTS_PER_BAR).forEach((part, i) => {
        if (part != null) p.chords[bar * SLOTS_PER_BAR + i] = toChord(part);
      });
    });
  }
  p.melody = melody.map((n) => ({ start: n.start, len: n.len, deg: n.deg, oct: n.oct ?? 0, ...(n.acc ? { acc: n.acc } : {}) }));
  return normalizeProject(p);
}

export function cloneProject(p) {
  return JSON.parse(JSON.stringify(p));
}

const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/** Validate and repair a project (projects can arrive from links and files, so never trust them). */
export function normalizeProject(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const mode = Object.hasOwn(MODES, r.mode) ? r.mode : 'major';
  const key = KEY_OPTIONS[mode].includes(r.key) ? r.key : KEY_OPTIONS[mode][0];
  const bars = clampInt(r.bars, 1, 32, 4);
  const bpm = clampInt(r.bpm, 40, 220, 90);
  const slots = bars * SLOTS_PER_BAR;
  const chords = Array.from({ length: slots }, (_, i) => {
    const c = Array.isArray(r.chords) ? r.chords[i] : null;
    if (!c || typeof c !== 'object') return null;
    const deg = clampInt(c.deg, 1, 7, null);
    if (!deg) return null;
    const out = { deg, seventh: !!c.seventh };
    // A chord from another key (see chordKey in theory.js).
    if (c.rel && ['major', 'minor'].includes(c.rel.mode)) {
      const shift = clampInt(c.rel.shift, 0, 11, 0);
      if (shift || c.rel.mode !== mode) out.rel = { shift, mode: c.rel.mode };
    }
    const bd = clampInt(c.bass?.deg, 1, 7, null);
    if (bd) out.bass = { deg: bd, acc: clampInt(c.bass.acc, -1, 1, 0) };
    return out;
  });
  const steps = bars * STEPS_PER_BAR;
  const melody = (Array.isArray(r.melody) ? r.melody : [])
    .map((n) => ({
      start: clampInt(n?.start, 0, steps - 1, -1),
      len: clampInt(n?.len, 1, steps, 1),
      deg: clampInt(n?.deg, 1, 7, 0),
      oct: clampInt(n?.oct, -1, 1, 0),
      ...(n?.acc === 1 || n?.acc === -1 ? { acc: n.acc } : {}),
    }))
    .filter((n) => n.start >= 0 && n.deg > 0 && rowIndexOf(n.deg, n.oct, n.acc, mode) >= 0)
    .map((n) => ({ ...n, len: Math.min(n.len, steps - n.start) }))
    .sort((a, b) => a.start - b.start);
  const out = { v: 1, key, mode, bpm, bars, chords, melody: removeOverlaps(melody) };
  const form = [];
  for (const f of (Array.isArray(r.form) ? r.form : [])
    .map((x) => ({ start: clampInt(x?.start, 0, bars - 1, -1), len: clampInt(x?.len, 1, bars, 0), label: x?.label }))
    .filter((x) => x.start >= 0 && x.len > 0 && typeof x.label === 'string' && FORM_LETTER.test(x.label))
    .sort((a, b) => a.start - b.start)) {
    const prev = form[form.length - 1];
    if (prev && prev.start + prev.len > f.start) continue; // overlapping phrases: keep the first
    form.push({ start: f.start, len: Math.min(f.len, bars - f.start), label: f.label });
  }
  if (form.length) out.form = form;
  return out;
}

/** A form letter: A to H, optionally with one or two primes (A′, A″). */
export const FORM_LETTER = /^[A-H][′″]?$/;
const baseOf = (label) => String(label || '').replace(/[′″']/g, '');

/** The lettered phrases, in order: [{label, start, len}] (start and len in bars). */
export function formSections(p) {
  return p.form || [];
}

/** Letter bars from..to (or clear them, label = null): phrases that overlap are cut back or split. */
export function letterBars(form, from, to, label) {
  const out = [];
  for (const f of form || []) {
    const end = f.start + f.len - 1;
    if (end < from || f.start > to) { out.push({ ...f }); continue; }
    if (f.start < from) out.push({ ...f, len: from - f.start });
    if (end > to) out.push({ ...f, start: to + 1, len: end - to });
  }
  if (label) out.push({ start: from, len: to - from + 1, label });
  return out.sort((a, b) => a.start - b.start);
}

/**
 * For each section that repeats a letter (a second A, or A′ after A), the melody of the first section
 * with that letter, moved to where it would go: shown faded as a guide, never added to the piece.
 */
export function ghostNotes(p) {
  const secs = formSections(p);
  const out = [];
  secs.forEach((sec, i) => {
    const src = secs.slice(0, i).find((s) => baseOf(s.label) === baseOf(sec.label));
    if (!src) return;
    const bars = Math.min(src.len, sec.len);
    const from = src.start * STEPS_PER_BAR;
    const to = (src.start + bars) * STEPS_PER_BAR;
    const shift = (sec.start - src.start) * STEPS_PER_BAR;
    for (const n of p.melody) {
      if (n.start < from || n.start >= to) continue;
      out.push({ start: n.start + shift, len: Math.min(n.len, to - n.start), deg: n.deg, oct: n.oct, acc: n.acc || 0, from: src.label });
    }
  });
  return out;
}

/** Keep the melody monophonic: a later note cuts the previous one short. */
export function removeOverlaps(notes) {
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  const out = [];
  for (const n of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.start === n.start) out.pop();
    else if (prev && prev.start + prev.len > n.start) prev.len = n.start - prev.start;
    out.push({ ...n });
  }
  return out;
}

export function setBars(p, bars) {
  const q = cloneProject(p);
  q.bars = bars;
  const slots = bars * SLOTS_PER_BAR;
  q.chords = Array.from({ length: slots }, (_, i) => p.chords[i] ?? null);
  return normalizeProject(q);
}

/** Chord events in beats: [{start, len, chord, slot}] */
export function chordEvents(p) {
  const out = [];
  p.chords.forEach((c, i) => {
    if (!c) return;
    const prev = out[out.length - 1];
    if (prev) prev.len = i * 2 - prev.start;
    out.push({ start: i * 2, len: 0, chord: c, slot: i });
  });
  const last = out[out.length - 1];
  if (last) last.len = p.bars * 4 - last.start;
  return out;
}

export function chordAtBeat(p, beat) {
  let found = null;
  for (const ev of chordEvents(p)) if (ev.start <= beat) found = ev;
  return found && beat < found.start + found.len ? found : null;
}

/** Everything that sounds, as MIDI pitches in beats: shared by playback and MIDI export. */
export function buildEvents(p) {
  const events = [];
  for (const ev of chordEvents(p)) {
    const info = chordInfo(p.key, p.mode, ev.chord);
    const v = chordVoicing(info);
    events.push({ track: 'chords', pitches: v.chord, start: ev.start, dur: ev.len, vel: 0.55 });
    events.push({ track: 'bass', pitches: [v.bass], start: ev.start, dur: ev.len, vel: 0.7 });
  }
  for (const n of p.melody) {
    events.push({
      track: 'melody',
      pitches: [midiForDegree(p.key, p.mode, n.deg, n.oct, n.acc)],
      start: n.start / 2,
      dur: n.len / 2,
      vel: 0.8,
    });
  }
  return events.sort((a, b) => a.start - b.start);
}

/** A few bars cut out of a project (used to play one phrase). The chord sounding at the cut carries over. */
export function sliceProject(p, fromBar, nBars) {
  const s = fromBar * SLOTS_PER_BAR;
  const chords = p.chords.slice(s, s + nBars * SLOTS_PER_BAR);
  if (!chords[0]) {
    const ev = chordAtBeat(p, fromBar * 4);
    if (ev) chords[0] = ev.chord;
  }
  const from = fromBar * STEPS_PER_BAR;
  const to = (fromBar + nBars) * STEPS_PER_BAR;
  return normalizeProject({
    ...p,
    bars: nBars,
    chords,
    form: letterBars(letterBars(p.form, 0, fromBar - 1, null), fromBar + nBars, 9999, null).map((f) => ({ ...f, start: f.start - fromBar })),
    melody: p.melody.filter((n) => n.start >= from && n.start < to).map((n) => ({ ...n, start: n.start - from })),
  });
}
