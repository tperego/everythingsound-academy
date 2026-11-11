// Music theory core: keys, scale degrees, diatonic chords, roman numerals.
// Everything in a project is stored as scale degrees, so changing key just transposes.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor; V and vii° borrow the raised 7th (harmonic minor)
};

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

/** Name of a scale degree (1..7). `raised` raises the 7th in minor (leading tone). */
export function degreeName(key, mode, deg, raised = false) {
  const n = scaleNames(key, mode)[deg - 1];
  return raised && mode === 'minor' && deg === 7 ? raiseName(n) : n;
}

export function degreePc(key, mode, deg, raised = false) {
  const extra = raised && mode === 'minor' && deg === 7 ? 1 : 0;
  return (pcOf(key) + MODES[mode][deg - 1] + extra) % 12;
}

/** MIDI pitch for a melody degree; octave 0 is the octave starting on the tonic above middle C. */
export function midiForDegree(key, mode, deg, oct = 0) {
  return 60 + pcOf(key) + MODES[mode][deg - 1] + 12 * oct;
}

/** Scale degrees (1..7) contained in the chord built on `deg`. */
export function chordDegrees(deg, seventh = false) {
  const n = seventh ? 4 : 3;
  return Array.from({ length: n }, (_, i) => ((deg - 1 + 2 * i) % 7) + 1);
}

/** Full description of a diatonic chord: pitch classes, quality, roman numeral, symbol, function. */
export function chordInfo(key, mode, chord) {
  const { deg, seventh = false } = chord;
  const raise = mode === 'minor' && (deg === 5 || deg === 7);
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
  const info = chordInfo(key, mode, { deg: chord.deg, seventh: chord.seventh });
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
    const core = info.seventh ? info.roman.replace(/7$/, '') : info.roman;
    return { ...info, roman: core + fig, symbol: slash, bassPc: bpc, inversion: idx };
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
  for (const name of scaleNames(key, mode)) n += accidentalOffset(name);
  return n;
}

export function keyLabel(key, mode) {
  return `${key} ${mode}`;
}

/** Pitch classes counted as "in key" when analysing MIDI from a DAW. */
export function inKeyPcs(key, mode) {
  const set = new Set(MODES[mode].map((iv) => (pcOf(key) + iv) % 12));
  if (mode === 'minor') {
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
