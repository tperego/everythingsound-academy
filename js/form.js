// Melodic form: split a melody into phrases and compare them for rhythm and pitch.

import { STEPS_PER_BAR } from './project.js?v=202611141651';

export const FORM_LABELS = ['A', 'A′', 'A″', 'B', 'B′', 'C', 'C′', 'D'];

/** Notes of phrase i (0-based), with start times made relative to the phrase start. */
export function phraseNotes(p, i, phraseBars) {
  const s = i * phraseBars * STEPS_PER_BAR;
  const e = s + phraseBars * STEPS_PER_BAR;
  return p.melody
    .filter((n) => n.start >= s && n.start < e)
    .map((n) => ({ start: n.start - s, len: Math.min(n.len, e - n.start), deg: n.deg, oct: n.oct }));
}

export function phraseCount(p, phraseBars) {
  return Math.floor(p.bars / phraseBars);
}

/**
 * Compare two phrases.
 * rhythm: share of note onsets (with the same length) the two phrases have in common, 0..1
 * pitch:  share of notes that match in both time and pitch, 0..1
 */
export function comparePhrases(a, b) {
  if (!a.length && !b.length) return { rhythm: 1, pitch: 1, sameRhythm: true, samePitch: true };
  const key = (n) => `${n.start}:${n.len}`;
  const ra = new Set(a.map(key));
  const rb = new Set(b.map(key));
  const sharedR = [...ra].filter((k) => rb.has(k)).length;
  const rhythm = sharedR / Math.max(ra.size, rb.size);
  const pk = (n) => `${n.start}:${n.len}:${n.deg}:${n.oct}`;
  const pa = new Set(a.map(pk));
  const pb = new Set(b.map(pk));
  const sharedP = [...pa].filter((k) => pb.has(k)).length;
  const pitch = sharedP / Math.max(pa.size, pb.size);
  return { rhythm, pitch, sameRhythm: rhythm === 1, samePitch: pitch === 1 };
}

/** The base letter of a label: "A′" -> "A". */
export const baseLetter = (label) => String(label || '').replace(/[′″']/g, '');
