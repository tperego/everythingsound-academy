// Project data model. Times: chord slots are half-bars (2 beats); melody steps are 8th notes.
//
// project = {
//   v: 1, key: 'G', mode: 'major', bpm: 96, bars: 4,
//   chords: [ {deg, seventh} | null, ... ]   // length bars*2; null = keep the previous chord
//   melody: [ {start, len, deg, oct}, ... ]  // start/len in 8th-note steps, deg 1..7, oct -1..1
// }

import { KEY_OPTIONS, chordInfo, chordVoicing, midiForDegree } from './theory.js';

export const STEPS_PER_BAR = 8;
export const SLOTS_PER_BAR = 2;
export const BAR_OPTIONS = [4, 8, 12, 16];

/** Melody rows from top to bottom: 3 above the octave down to 5 below the tonic. */
export const MELODY_ROWS = [
  { deg: 3, oct: 1 }, { deg: 2, oct: 1 }, { deg: 1, oct: 1 },
  { deg: 7, oct: 0 }, { deg: 6, oct: 0 }, { deg: 5, oct: 0 }, { deg: 4, oct: 0 },
  { deg: 3, oct: 0 }, { deg: 2, oct: 0 }, { deg: 1, oct: 0 },
  { deg: 7, oct: -1 }, { deg: 6, oct: -1 }, { deg: 5, oct: -1 },
];

export function rowIndexOf(deg, oct) {
  return MELODY_ROWS.findIndex((r) => r.deg === deg && r.oct === oct);
}

export function newProject({ key = 'C', mode = 'major', bpm = 90, bars = 4, progression = null, melody = [] } = {}) {
  const p = { v: 1, key, mode, bpm, bars, chords: Array(bars * SLOTS_PER_BAR).fill(null), melody: [] };
  if (progression) {
    // One entry per bar: a degree, {deg, seventh}, or an array of two for two chords in the bar.
    const toChord = (c) => (typeof c === 'number' ? { deg: c, seventh: false } : { deg: c.deg, seventh: !!c.seventh });
    progression.forEach((c, bar) => {
      if (c == null || bar >= bars) return;
      const parts = Array.isArray(c) ? c : [c];
      parts.slice(0, SLOTS_PER_BAR).forEach((part, i) => {
        if (part != null) p.chords[bar * SLOTS_PER_BAR + i] = toChord(part);
      });
    });
  }
  p.melody = melody.map((n) => ({ start: n.start, len: n.len, deg: n.deg, oct: n.oct ?? 0 }));
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
  const mode = r.mode === 'minor' ? 'minor' : 'major';
  const key = KEY_OPTIONS[mode].includes(r.key) ? r.key : KEY_OPTIONS[mode][0];
  const bars = clampInt(r.bars, 1, 32, 4);
  const bpm = clampInt(r.bpm, 40, 220, 90);
  const slots = bars * SLOTS_PER_BAR;
  const chords = Array.from({ length: slots }, (_, i) => {
    const c = Array.isArray(r.chords) ? r.chords[i] : null;
    if (!c || typeof c !== 'object') return null;
    const deg = clampInt(c.deg, 1, 7, null);
    return deg ? { deg, seventh: !!c.seventh } : null;
  });
  const steps = bars * STEPS_PER_BAR;
  const melody = (Array.isArray(r.melody) ? r.melody : [])
    .map((n) => ({
      start: clampInt(n?.start, 0, steps - 1, -1),
      len: clampInt(n?.len, 1, steps, 1),
      deg: clampInt(n?.deg, 1, 7, 0),
      oct: clampInt(n?.oct, -1, 1, 0),
    }))
    .filter((n) => n.start >= 0 && n.deg > 0 && rowIndexOf(n.deg, n.oct) >= 0)
    .map((n) => ({ ...n, len: Math.min(n.len, steps - n.start) }))
    .sort((a, b) => a.start - b.start);
  return { v: 1, key, mode, bpm, bars, chords, melody: removeOverlaps(melody) };
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
      pitches: [midiForDegree(p.key, p.mode, n.deg, n.oct)],
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
    melody: p.melody.filter((n) => n.start >= from && n.start < to).map((n) => ({ ...n, start: n.start - from })),
  });
}
