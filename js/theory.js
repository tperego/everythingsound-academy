// Music theory core: keys, scale degrees, diatonic chords, roman numerals.
// Everything in a project is stored as scale degrees, so changing key just transposes.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Every scale has 7 degrees, so pieces are always stored as degrees 1–7.
 * sig: the scale whose notes make the key signature (harmonic and melodic minor use the natural minor's).
 * outside: degrees left out of a pentatonic scale (still playable, shown faded).
 */
export const SCALES = {
  major: { label: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Minor', steps: [0, 2, 3, 5, 7, 8, 10], minor: true }, // natural minor; V and vii° borrow the raised 7th
  'harmonic-minor': { label: 'Harmonic minor', steps: [0, 2, 3, 5, 7, 8, 11], sig: 'minor', minor: true },
  'melodic-minor': { label: 'Melodic minor', steps: [0, 2, 3, 5, 7, 9, 11], sig: 'minor', minor: true },
  dorian: { label: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { label: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { label: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10] },
  locrian: { label: 'Locrian', steps: [0, 1, 3, 5, 6, 8, 10] },
  'major-pentatonic': { label: 'Major pentatonic', steps: [0, 2, 4, 5, 7, 9, 11], sig: 'major', outside: [4, 7] },
  'minor-pentatonic': { label: 'Minor pentatonic', steps: [0, 2, 3, 5, 7, 8, 10], sig: 'minor', outside: [2, 6], minor: true },
};

export const MODES = Object.fromEntries(Object.entries(SCALES).map(([id, s]) => [id, s.steps]));

export const modeLabel = (mode) => SCALES[mode]?.label || mode;
/** "E minor", "D Dorian", "C major pentatonic" */
export const keyText = (key, mode) => `${key} ${['major', 'minor'].includes(mode) ? mode : modeLabel(mode).replace(/^(Major|Minor|Harmonic|Melodic) /, (m) => m.toLowerCase())}`;

const CANDIDATE_TONICS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];

export const KEY_OPTIONS = {
  major: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'],
  minor: ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb'],
};

export const FUNCTION_OF_DEGREE = { 1: 'T', 3: 'T', 6: 'T', 2: 'PD', 4: 'PD', 5: 'D', 7: 'D' };
export const FUNCTION_NAMES = { T: 'Tonic', PD: 'Pre-dominant', D: 'Dominant' };

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function accidentalOffset(name) {
  let n = 0;
  for (const ch of name.slice(1)) {
    if (ch === '#') n++;
    else if (ch === 'b') n--;
  }
  return n;
}

export function pcOf(name) {
  return (((LETTER_PC[name[0]] + accidentalOffset(name)) % 12) + 12) % 12;
}

/** Spelled note names of the scale, e.g. ('F','major') -> F G A Bb C D E */
export function scaleNames(tonic, mode) {
  const li = LETTERS.indexOf(tonic[0]);
  const t = pcOf(tonic);
  return MODES[mode].map((iv, i) => {
    const letter = LETTERS[(li + i) % 7];
    let diff = (((t + iv - LETTER_PC[letter]) % 12) + 12) % 12;
    if (diff > 6) diff -= 12;
    return letter + (diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff));
  });
}

function raiseName(name) {
  return name.endsWith('b') ? name.slice(0, -1) : name + '#';
}

function lowerName(name) {
  return name.endsWith('#') ? name.slice(0, -1) : name + 'b';
}

/** The notes that make the key signature (for modes: the scale itself; for harmonic and melodic minor: natural minor). */
export function signatureNames(key, mode) {
  return scaleNames(key, SCALES[mode]?.sig || mode);
}

// Tonics offered for the other scales: those spelled with at most 6 sharps or flats and no double sharps or flats.
for (const mode of Object.keys(SCALES)) {
  if (KEY_OPTIONS[mode]) continue;
  const ok = CANDIDATE_TONICS
    .map((k) => ({ k, names: signatureNames(k, mode), own: scaleNames(k, mode) }))
    .filter((x) => [...x.names, ...x.own].every((n) => !/##|bb/.test(n)))
    .map((x) => ({ k: x.k, sf: x.names.reduce((a, n) => a + accidentalOffset(n), 0) }))
    .filter((x) => Math.abs(x.sf) <= 6);
  // One spelling per pitch: the one with fewer accidentals.
  const best = new Map();
  for (const x of ok) {
    const pc = pcOf(x.k);
    if (!best.has(pc) || Math.abs(x.sf) < Math.abs(best.get(pc).sf)) best.set(pc, x);
  }
  // Listed by tonic round the circle of fifths: C G D A E B F# … then F Bb Eb …
  KEY_OPTIONS[mode] = [...best.values()].sort((a, b) => CANDIDATE_TONICS.indexOf(a.k) - CANDIDATE_TONICS.indexOf(b.k)).map((x) => x.k);
}

/** Natural minor (and minor pentatonic): V and vii° borrow the raised 7th, and the melody gets ♯6 and ♯7 rows. */
export const borrowsLeadingNote = (mode) => mode === 'minor' || mode === 'minor-pentatonic';

/** Name of a scale degree (1..7). `raised` raises the 7th in minor (leading tone). */
export function degreeName(key, mode, deg, raised = false) {
  const n = scaleNames(key, mode)[deg - 1];
  return raised && borrowsLeadingNote(mode) && deg === 7 ? raiseName(n) : n;
}

export function degreePc(key, mode, deg, raised = false) {
  const extra = raised && borrowsLeadingNote(mode) && deg === 7 ? 1 : 0;
  return (pcOf(key) + MODES[mode][deg - 1] + extra) % 12;
}

/** MIDI pitch for a melody degree; octave 0 is the octave starting on the tonic above middle C. acc 1 sharpens it, -1 flattens it. */
export function midiForDegree(key, mode, deg, oct = 0, acc = 0) {
  return 60 + pcOf(key) + MODES[mode][deg - 1] + 12 * oct + (acc || 0);
}

/** A melody note's name: the scale degree's name, sharpened (acc 1) or flattened (acc -1): in E minor ♯7 is D#, in G minor ♯6 is E. */
export function noteName(key, mode, deg, acc = 0) {
  const n = scaleNames(key, mode)[deg - 1];
  return acc === 1 ? raiseName(n) : acc === -1 ? lowerName(n) : n;
}

/** Label for a melody row or note: "7", "♯7" or "♭7". */
export const degreeLabel = (deg, acc = 0) => `${acc === 1 ? '♯' : acc === -1 ? '♭' : ''}${deg}`;

/** Scale degrees (1..7) contained in the chord built on `deg`. */
export function chordDegrees(deg, seventh = false) {
  const n = seventh ? 4 : 3;
  return Array.from({ length: n }, (_, i) => ((deg - 1 + 2 * i) % 7) + 1);
}

// ---------- Chords from another key (modulation, borrowed chords, secondary dominants) ----------
// A chord may carry rel = {shift: 0..11, mode: 'major' | 'minor'}: it is degree `deg` of the key whose tonic is
// `shift` semitones above the piece's tonic. Stored relative, so changing the piece's key still transposes everything.

/** The key a chord comes from: {key, mode}. */
export function chordKey(key, mode, chord) {
  const r = chord?.rel;
  if (!r || !['major', 'minor'].includes(r.mode)) return { key, mode };
  const pc = (pcOf(key) + r.shift) % 12;
  const k = KEY_OPTIONS[r.mode].find((x) => pcOf(x) === pc) || key;
  return { key: k, mode: r.mode };
}

/** Short key name: "G", "Em". */
export const keyShort = (key, mode) => key + (SCALES[mode]?.minor ? 'm' : '');

/** The rel for a chord taken from `toKey`/`toMode` while the piece is in `key`/`mode` (null when it is the piece's own key). */
export function relFor(key, mode, toKey, toMode) {
  const shift = (pcOf(toKey) - pcOf(key) + 12) % 12;
  return shift === 0 && toMode === mode ? null : { shift, mode: toMode };
}

/** Full description of a chord: pitch classes, quality, roman numeral, symbol, function. */
export function chordInfo(key, mode, chord) {
  if (chord.rel) return foreignChordInfo(key, mode, chord);
  const { deg, seventh = false } = chord;
  const raise = borrowsLeadingNote(mode) && (deg === 5 || deg === 7);
  const degs = chordDegrees(deg, seventh);
  const pcs = degs.map((d) => degreePc(key, mode, d, raise));
  const names = degs.map((d) => degreeName(key, mode, d, raise));
  const iv = (i) => (pcs[i] - pcs[0] + 12) % 12;
  const third = iv(1);
  const fifth = iv(2);
  let quality = 'maj';
  if (third === 3 && fifth === 7) quality = 'min';
  else if (third === 3 && fifth === 6) quality = 'dim';
  else if (third === 4 && fifth === 8) quality = 'aug';

  let roman = ROMAN[deg - 1];
  if (quality === 'min' || quality === 'dim') roman = roman.toLowerCase();
  let symbol = names[0] + { maj: '', min: 'm', dim: 'dim', aug: 'aug' }[quality];
  let suffix = { maj: '', min: '', dim: '°', aug: '+' }[quality];

  if (seventh) {
    const s7 = iv(3);
    if (quality === 'maj' && s7 === 11) { suffix = 'maj7'; symbol = names[0] + 'maj7'; }
    else if (quality === 'maj' && s7 === 10) { suffix = '7'; symbol = names[0] + '7'; }
    else if (quality === 'min') { suffix = s7 === 11 ? '(maj7)' : '7'; symbol = names[0] + (s7 === 11 ? 'm(maj7)' : 'm7'); }
    else if (quality === 'dim' && s7 === 10) { suffix = 'ø7'; symbol = names[0] + 'm7b5'; }
    else if (quality === 'dim' && s7 === 9) { suffix = '°7'; symbol = names[0] + 'dim7'; }
    else if (quality === 'aug') { suffix = '+7'; symbol = names[0] + 'aug7'; }
  }

  const info = {
    deg,
    seventh,
    degs,
    pcs,
    names,
    quality,
    roman: roman + suffix,
    // The chord's identity without 7ths or inversions: used when checking answers.
    baseRoman: roman + (quality === 'dim' ? '°' : quality === 'aug' ? '+' : ''),
    symbol,
    func: FUNCTION_OF_DEGREE[deg],
    bassPc: pcs[0],
    inversion: 0,
  };
  return chord.bass ? withBass(info, key, mode, chord.bass) : info;
}

/**
 * A chord from another key. Its roman numeral is analysed in its own key: V7/V when it is the V (or vii°) of a key
 * whose tonic is a chord of the piece (a secondary dominant), otherwise with the key in front, "G: V" or "Cm: iv".
 */
function foreignChordInfo(key, mode, chord) {
  const own = chordKey(key, mode, chord);
  const { rel, bass, ...plain } = chord;
  const info = chordInfo(own.key, own.mode, plain);
  const homeDeg = MODES[mode].findIndex((iv) => (pcOf(key) + iv) % 12 === pcOf(own.key)) + 1;
  let roman;
  if (homeDeg > 1 && (chord.deg === 5 || chord.deg === 7)) {
    const target = chordInfo(key, mode, { deg: homeDeg });
    // Only when that degree's chord matches the key's mode (major chord → major key, minor chord → minor key).
    const fits = (target.quality === 'maj') === (own.mode === 'major') && target.quality !== 'dim';
    roman = fits ? `${info.roman}/${target.baseRoman}` : null;
  }
  if (!roman) roman = `${keyShort(own.key, own.mode)}: ${info.roman}`;
  const out = { ...info, roman, baseRoman: `${keyShort(own.key, own.mode)}:${info.baseRoman}`, from: own };
  return bass ? withBass(out, key, mode, bass) : out;
}

// ---------- Bass notes: inversions and slash chords ----------

const ACC_SIGN = { '-1': '♭', 0: '', 1: '♯' };

/** bass = {deg: 1..7, acc: -1 | 0 | 1}: a scale degree, optionally flattened or sharpened. */
export function bassPc(key, mode, bass) {
  return (degreePc(key, mode, bass.deg) + (bass.acc || 0) + 12) % 12;
}

export function bassName(key, mode, bass) {
  let n = degreeName(key, mode, bass.deg);
  if (bass.acc === 1) n = n.endsWith('b') ? n.slice(0, -1) : n + '#';
  if (bass.acc === -1) n = n.endsWith('#') ? n.slice(0, -1) : n + 'b';
  return n;
}

export const bassDegreeLabel = (bass) => `${ACC_SIGN[bass.acc || 0]}${bass.deg}`;

/** The bass note that puts a chord tone (0 root, 1 third, 2 fifth, 3 seventh) in the bass. */
export function bassForChordTone(key, mode, chord, tone) {
  const info = chordInfo(key, mode, { deg: chord.deg, seventh: chord.seventh, ...(chord.rel ? { rel: chord.rel } : {}) });
  if (chord.rel) {
    // A chord from another key: its bass as a degree of the piece's key, spelled like the chord (D7/F#, not D7/Gb).
    const letter = info.names[tone][0];
    const d = scaleNames(key, mode).findIndex((n) => n[0] === letter) + 1;
    let acc = ((info.pcs[tone] - degreePc(key, mode, d)) % 12 + 12) % 12;
    if (acc > 6) acc -= 12;
    if (Math.abs(acc) <= 1) return { deg: d, acc };
    const o = bassOptions(key, mode).find((b) => b.pc === info.pcs[tone]);
    return { deg: o.deg, acc: o.acc };
  }
  const deg = info.degs[tone];
  let acc = ((info.pcs[tone] - degreePc(key, mode, deg)) % 12 + 12) % 12;
  if (acc > 6) acc -= 12;
  return { deg, acc };
}

/** The 12 possible bass notes in a key, named as scale degrees (diatonic first, then ♭ and ♯). */
export function bassOptions(key, mode) {
  const seen = new Set();
  const out = [];
  const add = (deg, acc) => {
    const b = { deg, acc };
    const pc = bassPc(key, mode, b);
    if (seen.has(pc)) return;
    seen.add(pc);
    out.push({ ...b, pc, label: `${bassDegreeLabel(b)} · ${bassName(key, mode, b)}` });
  };
  for (let d = 1; d <= 7; d++) add(d, 0);
  for (let d = 1; d <= 7; d++) add(d, -1);
  for (let d = 1; d <= 7; d++) add(d, 1);
  return out;
}

function withBass(info, key, mode, bass) {
  const bpc = bassPc(key, mode, bass);
  const idx = info.pcs.indexOf(bpc);
  if (idx === 0) return info;
  const slash = `${info.symbol}/${bassName(key, mode, bass)}`;
  if (idx > 0) {
    // Inversion: figured-bass numbers (I6, I64, V65, V43, V42).
    const fig = info.seventh ? ['', '65', '43', '42'][idx] : ['', '6', '64'][idx];
    // A secondary dominant keeps its "/V" after the figures: V7/V in first inversion is V65/V.
    const [head, ...tail] = info.roman.split('/');
    const core = info.seventh ? head.replace(/7$/, '') : head;
    return { ...info, roman: [core + fig, ...tail].join('/'), symbol: slash, bassPc: bpc, inversion: idx };
  }
  // A bass note outside the chord (e.g. E/D = I/♭7).
  return { ...info, roman: `${info.roman}/${bassDegreeLabel(bass)}`, symbol: slash, bassPc: bpc, inversion: -1 };
}

/** A simple playable voicing: close-position chord around C3–B4 plus the bass note. Inversions are voiced from the bass up. */
export function chordVoicing(info) {
  const order = info.inversion > 0 ? [...info.pcs.slice(info.inversion), ...info.pcs.slice(0, info.inversion)] : info.pcs;
  const chord = [48 + order[0]];
  for (let i = 1; i < order.length; i++) {
    let m = 48 + order[i];
    while (m <= chord[chord.length - 1]) m += 12;
    chord.push(m);
  }
  return { chord, bass: 36 + (info.bassPc ?? info.pcs[0]) };
}

/** Key signature as number of sharps (+) or flats (-), for MIDI and notation. */
export function keySignatureSf(key, mode) {
  let n = 0;
  for (const name of signatureNames(key, mode)) n += accidentalOffset(name);
  return n;
}

export function keyLabel(key, mode) {
  return keyText(key, mode);
}

/** Pitch classes counted as "in key" when analysing MIDI from a DAW. */
export function inKeyPcs(key, mode) {
  const set = new Set(MODES[mode].map((iv) => (pcOf(key) + iv) % 12));
  if (SCALES[mode]?.minor) {
    set.add((pcOf(key) + 11) % 12); // raised 7th (harmonic minor)
    set.add((pcOf(key) + 9) % 12); // raised 6th (melodic minor)
  }
  return set;
}

/** Best-matching diatonic triad for a bar's pitch-class weights (used for DAW MIDI analysis). */
export function detectChord(weights, bassPc, key, mode) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let best = null;
  for (let deg = 1; deg <= 7; deg++) {
    const info = chordInfo(key, mode, { deg });
    const tones = new Set(info.pcs);
    let inside = 0;
    for (let pc = 0; pc < 12; pc++) if (tones.has(pc)) inside += weights[pc];
    // Every chord tone present is a strong sign; the root in the bass is a tie-breaker.
    const covered = info.pcs.filter((pc) => weights[pc] > 0).length;
    const score = inside - 0.5 * (total - inside) + covered * 0.25 * (total / 4) + (bassPc === info.pcs[0] ? total * 0.2 : 0);
    if (!best || score > best.score) best = { score, info, confidence: inside / total };
  }
  return best;
}
