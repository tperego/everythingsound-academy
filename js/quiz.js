// Quick-fire practice: keyboard and ear questions, checked instantly (10 questions, a score, try again).
//
// Exercise data: quiz: { type, count, pass, options }
// Types: higher-lower, tone-semitone, count-semitones, find-key, name-black-key, semitone-step,
//        name-interval, build-interval, hear-interval, build-scale, spot-mistake, scale-degree,
//        relative-key, hear-scale-mode, enharmonic, find-spelled, scale-spelling,
//        build-chord, chord-quality, diatonic-chord, build-diatonic, name-white-key, invert-interval,
//        note-values, time-signature, hear-meter, chord-pull, tendency-tone, hear-cadence,
//        name-inversion, find-fundamental, common-chord, modulation-fifth

import { keyboardSvg } from './piano.js?v=202611141607';
import { KEY_OPTIONS, LETTERS, MODES, chordInfo, chordVoicing, pcOf, scaleNames } from './theory.js?v=202611141607';
import { h } from './util.js?v=202611141607';

const NATURAL = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
const BLACK_PAIRS = { 1: 'C♯ / D♭', 3: 'D♯ / E♭', 6: 'F♯ / G♭', 8: 'G♯ / A♭', 10: 'A♯ / B♭' };
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = [1, 3, 6, 8, 10];
export const INTERVAL_NAMES = {
  1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd', 4: 'major 3rd', 5: 'perfect 4th', 6: 'tritone',
  7: 'perfect 5th', 8: 'minor 6th', 9: 'major 6th', 10: 'minor 7th', 11: 'major 7th', 12: 'octave',
};

const pc = (m) => ((m % 12) + 12) % 12;
const keyName = (m) => NATURAL[pc(m)] || BLACK_PAIRS[pc(m)];
const pretty = (n) => n.replace(/#/g, '♯').replace(/^([A-G])b/, '$1♭');
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** A random MIDI note between lo and hi (inclusive), optionally limited to some pitch classes. */
function noteIn(lo, hi, pcs = null) {
  const opts = [];
  for (let m = lo; m <= hi; m++) if (!pcs || pcs.includes(pc(m))) opts.push(m);
  return pick(opts);
}
/** Four answer choices including the right one. */
function choicesFrom(correct, pool, n = 4) {
  const others = shuffle(pool.filter((x) => x !== correct)).slice(0, n - 1);
  return shuffle([correct, ...others]);
}

const KB = { low: 48, high: 83 }; // the keyboard shown in quizzes: C3 to B5

// ---------- Spelling: chords and enharmonic names ----------

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Notes of a chord stacked in 3rds, spelled with one letter each: ('D', [0,3,7]) -> D F A. */
function spellStack(root, ivs) {
  const li = LETTERS.indexOf(root[0]);
  const r = pcOf(root);
  return ivs.map((iv, i) => {
    const L = LETTERS[(li + 2 * i) % 7];
    let d = (((r + iv - LETTER_PC[L]) % 12) + 12) % 12;
    if (d > 6) d -= 12;
    return L + (d > 0 ? '#'.repeat(d) : 'b'.repeat(-d));
  });
}
const prettyAll = (n) => n.replace(/#/g, '♯').replace(/([A-G])bb/, '$1𝄫').replace(/([A-G])b/, '$1♭');
const ENHARMONIC = {
  0: ['C', 'B#'], 1: ['C#', 'Db'], 3: ['D#', 'Eb'], 4: ['E', 'Fb'], 5: ['F', 'E#'],
  6: ['F#', 'Gb'], 8: ['G#', 'Ab'], 10: ['A#', 'Bb'], 11: ['B', 'Cb'],
};
const ALL_NAMES = ['C', 'B#', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'Fb', 'F', 'E#', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Cb'];

export const TRIADS = { major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8] };
// The 7th chords as the course names them: the triad, plus the 7th on top.
export const SEVENTHS = {
  'major triad + major 7th': [0, 4, 7, 11],
  'major triad + minor 7th': [0, 4, 7, 10],
  'minor triad + minor 7th': [0, 3, 7, 10],
  'diminished triad + minor 7th': [0, 3, 6, 10],
  'diminished triad + diminished 7th': [0, 3, 6, 9],
  'minor triad + major 7th': [0, 3, 7, 11],
  'augmented triad + major 7th': [0, 4, 8, 11],
};
const SEVENTH_COMMON = {
  'major triad + major 7th': 'major 7th, e.g. Cmaj7',
  'major triad + minor 7th': 'dominant 7th, e.g. C7',
  'minor triad + minor 7th': 'minor 7th, e.g. Cm7',
  'diminished triad + minor 7th': 'half-diminished, e.g. Cm7♭5',
  'diminished triad + diminished 7th': 'diminished 7th, e.g. Cdim7',
  'minor triad + major 7th': 'minor-major 7th',
  'augmented triad + major 7th': 'augmented major 7th',
};
const MAJOR_ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const NATURAL_MINOR_ROMANS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
/** The triad on a grade of the scale, using only scale notes (natural minor: no raised 7th). */
function naturalTriad(key, mode, deg) {
  const ivs = MODES[mode];
  const tonic = 55 + ((pcOf(key) - 7 + 12) % 12); // G3 to F#4
  const idx = [deg - 1, deg + 1, deg + 3];
  const midis = idx.map((i) => tonic + ivs[i % 7] + 12 * Math.floor(i / 7));
  const names = idx.map((i) => scaleNames(key, mode)[i % 7]);
  const third = midis[1] - midis[0];
  const fifth = midis[2] - midis[0];
  const quality = third === 4 ? (fifth === 8 ? 'augmented' : 'major') : fifth === 6 ? 'diminished' : 'minor';
  return { midis, names, quality };
}
const NOTE_VALUES = [
  { name: 'whole note (semibreve)', plural: 'whole notes', len: 16 },
  { name: 'half note', plural: 'half notes', len: 8 },
  { name: 'quarter note', plural: 'quarter notes', len: 4 },
  { name: 'eighth note', plural: 'eighth notes', len: 2 },
  { name: 'sixteenth note', plural: 'sixteenth notes', len: 1 },
];
const CHORD_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'Ab', 'F#', 'Db'];
const THIRD_NAME = { 3: 'minor 3rd', 4: 'major 3rd', 2: 'diminished 3rd', 5: 'augmented 3rd' };

/** A random chord with no double sharps or flats: {root, quality, ivs, names, midis}. */
function randomChord(table, qualities) {
  for (;;) {
    const root = pick(CHORD_ROOTS);
    const quality = pick(qualities);
    const ivs = table[quality];
    const names = spellStack(root, ivs);
    if (names.some((n) => /##|bb/.test(n))) continue;
    const base = 53 + ((pcOf(root) - 5 + 12) % 12); // F3 to E4
    return { root, quality, ivs, names, midis: ivs.map((iv) => base + iv) };
  }
}
const stackText = (c) => c.ivs.slice(1).map((iv, i) => THIRD_NAME[iv - c.ivs[i]]).join(' + ');

const symbolText = (info) => prettyAll(info.symbol.replace('m7b5', 'm7♭5'));
const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'];
const tonicMidi = (key) => 60 + pcOf(key) - (pcOf(key) > 7 ? 12 : 0);

// ---------- Question generators ----------

const GEN = {
  'higher-lower'() {
    const a = noteIn(55, 76);
    const d = 1 + rand(12);
    const up = Math.random() < 0.5;
    const b = up ? a + d : a - d;
    return {
      text: 'Listen. Is the second note higher or lower than the first?',
      play: [a, b], choices: ['Higher', 'Lower'], answer: up ? 'Higher' : 'Lower',
      reveal: `${up ? 'Higher' : 'Lower'}: the second note was ${plural(d, 'semitone')} ${up ? 'above' : 'below'}.`,
      showAfter: [a, b],
    };
  },

  'tone-semitone'() {
    const a = noteIn(53, 76);
    const d = 1 + rand(2);
    return {
      text: 'These two notes: a tone or a semitone apart?',
      marks: [a, a + d], play: [a, a + d], choices: ['Semitone', 'Tone'], answer: d === 1 ? 'Semitone' : 'Tone',
      reveal: d === 1 ? 'Semitone: next-door keys, with nothing in between.' : 'Tone: two semitones, with one key in between.',
    };
  },

  'count-semitones'({ max = 12 } = {}) {
    const d = 1 + rand(max);
    const a = noteIn(KB.low, KB.high - d);
    const pool = Array.from({ length: max }, (_, i) => String(i + 1));
    return {
      text: 'How many semitones from the lower key to the higher key?',
      marks: [a, a + d], play: [a, a + d], choices: choicesFrom(String(d), pool.filter((x) => Math.abs(Number(x) - d) <= 3)), answer: String(d),
      reveal: `${plural(d, 'semitone')}. Count every key, black and white, after the first one.`,
      showSteps: [a, a + d],
    };
  },

  'find-key'({ black = false } = {}) {
    const target = black && Math.random() < 0.5 ? pick(BLACK_PCS) : pick(WHITE_PCS);
    const name = NATURAL[target] || pick(BLACK_PAIRS[target].split(' / '));
    return {
      text: `Click any ${name}.`,
      clickPc: target,
      reveal: NATURAL[target]
        ? `Every ${name} is shown. ${({ 0: 'C is just left of the group of two black keys.', 5: 'F is just left of the group of three black keys.' })[target] || 'Use the groups of two and three black keys to find it.'}`
        : `${BLACK_PAIRS[target]}: one key, two names.`,
    };
  },

  'name-black-key'() {
    const p = pick(BLACK_PCS);
    const m = noteIn(KB.low, KB.high, [p]);
    return {
      text: 'This black key has two names. Which pair is right?',
      marks: [m], play: [m], choices: choicesFrom(BLACK_PAIRS[p], Object.values(BLACK_PAIRS)), answer: BLACK_PAIRS[p],
      reveal: `${BLACK_PAIRS[p]}: ♯ means a semitone up from ${NATURAL[(p + 11) % 12]}, ♭ means a semitone down from ${NATURAL[(p + 1) % 12]}.`,
    };
  },

  'semitone-step'({ sizes = [1, 2] } = {}) {
    // Half the time, start on E, B, C or F: where white keys are a semitone apart.
    const base = Math.random() < 0.5 ? noteIn(KB.low + 2, KB.high - 2, [4, 11, 0, 5]) : noteIn(KB.low + 2, KB.high - 2);
    const size = pick(sizes);
    const up = Math.random() < 0.5;
    const target = up ? base + size : base - size;
    const natural = size === 1 && [[4, 5], [11, 0], [5, 4], [0, 11]].some(([a, b]) => pc(base) === a && pc(target) === b);
    return {
      text: `Click the key a ${size === 1 ? 'semitone' : 'tone'} ${up ? 'above' : 'below'} this ${keyName(base)}.`,
      marks: [base], clickMidi: target, play: [base],
      reveal: `${keyName(target)}.${natural ? ' E–F and B–C are semitones with no black key between them.' : ''}`,
    };
  },

  'name-white-key'() {
    const m = noteIn(KB.low, KB.high, WHITE_PCS);
    return {
      text: 'What is the name of this key?',
      marks: [m], play: [m], choices: choicesFrom(NATURAL[pc(m)], Object.values(NATURAL)), answer: NATURAL[pc(m)],
      reveal: `${NATURAL[pc(m)]}. Find C (before the two black keys) or F (before the three), then count along the alphabet: C D E F G A B.`,
    };
  },

  'name-interval'({ set = [1, 2, 3, 4, 5, 7, 12] } = {}) {
    const d = pick(set);
    const a = noteIn(KB.low, KB.high - d);
    return {
      text: 'Name the interval between these two keys.',
      marks: [a, a + d], play: [a, a + d], choices: choicesFrom(INTERVAL_NAMES[d], set.map((x) => INTERVAL_NAMES[x])), answer: INTERVAL_NAMES[d],
      reveal: `${INTERVAL_NAMES[d]}: ${plural(d, 'semitone')}.${d === 6 ? ' Also called an augmented 4th or a diminished 5th.' : ''}`, showSteps: [a, a + d],
    };
  },

  'build-interval'({ set = [2, 3, 4, 5, 7, 12] } = {}) {
    const d = pick(set);
    const a = noteIn(KB.low, KB.high - d);
    return {
      text: `Click a ${INTERVAL_NAMES[d]} above this ${keyName(a)}.`,
      marks: [a], clickMidi: a + d, play: [a],
      reveal: `${keyName(a + d)}: a ${INTERVAL_NAMES[d]} is ${plural(d, 'semitone')} up.`, showSteps: [a, a + d],
    };
  },

  'hear-interval'({ set = [2, 4, 7, 12], together = false } = {}) {
    const d = pick(set);
    const a = noteIn(55, 72);
    return {
      text: together ? 'Listen: one note after the other, then together. Which interval is it?' : 'Listen. Which interval is it?',
      play: together ? [a, a + d, [a, a + d]] : [a, a + d], choices: set.map((x) => INTERVAL_NAMES[x]), answer: INTERVAL_NAMES[d],
      reveal: `${INTERVAL_NAMES[d]} (${plural(d, 'semitone')}).`, showAfter: [a, a + d],
    };
  },

  'invert-interval'() {
    const d = pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11]);
    const inv = 12 - d;
    const a = noteIn(55, 66);
    const pool = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11].map((x) => INTERVAL_NAMES[x]);
    return {
      text: `Turn a ${INTERVAL_NAMES[d]} upside down: the lower note goes up an octave. What interval do you get?`,
      marks: [a, a + d], play: [a, a + d, a + d, a + 12], choices: choicesFrom(INTERVAL_NAMES[inv], pool), answer: INTERVAL_NAMES[inv],
      reveal: `${INTERVAL_NAMES[inv]}: ${d} + ${inv} = 12 semitones. Majors become minors (and the other way round); perfects stay perfect.`,
      showAfter: [a + d, a + 12],
    };
  },

  'build-scale'({ keys = ['C', 'G', 'F', 'D', 'Bb', 'A'], mode = 'major' } = {}) {
    const key = pick(keys);
    const tonic = tonicMidi(key);
    const seq = [...MODES[mode].map((iv) => tonic + iv), tonic + 12];
    const names = [...scaleNames(key, mode), key].map(pretty);
    return {
      text: `Build ${pretty(key)} ${mode === 'minor' ? 'natural minor' : 'major'}: click its 8 notes, from this ${pretty(key)} up to the next ${pretty(key)}.`,
      marks: [tonic], sequence: seq, play: [tonic],
      reveal: `${pretty(key)} ${mode === 'minor' ? 'natural minor' : 'major'}: ${names.join(' – ')} (${mode === 'minor' ? 'whole–half–whole–whole–half–whole–whole' : 'whole–whole–half–whole–whole–whole–half'}).`, names,
    };
  },

  'spot-mistake'({ keys = ['C', 'G', 'F', 'D', 'Bb', 'A', 'E'] } = {}) {
    const key = pick(keys);
    const tonic = tonicMidi(key);
    const seq = [...MODES.major.map((iv) => tonic + iv), tonic + 12];
    const i = 1 + rand(6);
    let wrong = seq[i] + (Math.random() < 0.5 ? 1 : -1);
    if (wrong <= seq[i - 1] || wrong >= seq[i + 1]) wrong = seq[i] + (wrong > seq[i] ? -1 : 1);
    const shown = seq.map((m, k) => (k === i ? wrong : m));
    const right = pretty(scaleNames(key, 'major')[i]);
    return {
      text: `This is meant to be ${pretty(key)} major, but one note is wrong. Click it.`,
      marks: shown, clickMidi: wrong, play: shown,
      reveal: `Grade ${i + 1} should be ${right}, not ${keyName(wrong)}.`,
    };
  },

  'scale-degree'({ keys = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E'], mode = 'major' } = {}) {
    const key = pick(keys);
    const names = scaleNames(key, mode).map(pretty);
    const n = 2 + rand(6);
    const answer = names[n - 1];
    const letter = answer[0];
    const pool = [...names, `${letter}♯`, `${letter}♭`, letter].filter((x, i, a) => a.indexOf(x) === i);
    return {
      text: `In ${pretty(key)} ${mode}, which note is grade ${n}?`,
      choices: choicesFrom(answer, pool), answer,
      reveal: `${pretty(key)} ${mode}: ${names.map((x, i) => (i === n - 1 ? `[${x}]` : x)).join(' ')}. Count the letters from ${pretty(key)}, then check the ♯ or ♭.`,
    };
  },

  // ----- Minor scale and modulation -----
  'relative-key'({ keys = ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb', 'E'] } = {}) {
    const major = pick(keys);
    const minor = scaleNames(major, 'major')[5];
    const toMinor = Math.random() < 0.5;
    const answer = pretty(toMinor ? `${minor} minor` : `${major} major`);
    const pool = toMinor ? KEY_OPTIONS.minor.map((k) => `${k} minor`) : KEY_OPTIONS.major.map((k) => `${k} major`);
    return {
      text: toMinor ? `${pretty(major)} major and which minor key share exactly the same notes and chords?` : `${pretty(minor)} minor and which major key share exactly the same notes and chords?`,
      choices: choicesFrom(answer, [...new Set(pool.map(pretty))]), answer,
      reveal: `${pretty(major)} major and ${pretty(minor)} minor: the relative minor starts on grade 6 of the major scale (${pretty(minor)} minor's chord i is chord vi of ${pretty(major)} major).`,
    };
  },

  'common-chord'({ keys = ['C', 'G', 'D', 'F', 'Bb', 'A'] } = {}) {
    const major = pick(keys);
    const minor = scaleNames(major, 'major')[5];
    const g = pick([1, 2, 3, 4, 5, 6]); // grade in the major key (skip vii°)
    const info = chordInfo(major, 'major', { deg: g });
    const minorGrade = ((g + 1) % 7) + 1; // grade 6 of major = grade 1 of the relative minor
    const answer = NATURAL_MINOR_ROMANS[minorGrade - 1];
    return {
      text: `${symbolText(info)} is chord ${info.roman} (grade ${g}) in ${pretty(major)} major. Which grade is the same chord in ${pretty(minor)} minor?`,
      choices: choicesFrom(answer, NATURAL_MINOR_ROMANS), answer,
      reveal: `${answer}: in ${pretty(minor)} minor, ${symbolText(info)} sits on grade ${minorGrade}. The same chord belongs to both keys, so you can use it as a door from one to the other.`,
    };
  },

  'modulation-fifth'() {
    const from = pick(['C', 'G', 'F', 'D']);
    const to = pick(KEY_OPTIONS.major.filter((k) => k !== from));
    const v = chordInfo(to, 'major', { deg: 5 });
    const pool = KEY_OPTIONS.major.map((k) => symbolText(chordInfo(k, 'major', { deg: 1 })));
    return {
      text: `You are in ${pretty(from)} major and want to go straight to ${pretty(to)} major. Which chord do you play just before ${pretty(to)}?`,
      choices: choicesFrom(symbolText(v), pool), answer: symbolText(v),
      reveal: `${symbolText(v)}: the chord on grade 5 of ${pretty(to)} major. The fifth grade can enter at any time and lead you into its key.`,
    };
  },

  'hear-scale-mode'() {
    const mode = Math.random() < 0.5 ? 'major' : 'minor';
    const tonic = noteIn(55, 65);
    const seq = [...MODES[mode].map((iv) => tonic + iv), tonic + 12];
    return {
      text: 'Listen to this scale. Major or minor?',
      play: seq, gap: 0.42, choices: ['Major', 'Minor'], answer: mode === 'major' ? 'Major' : 'Minor',
      reveal: mode === 'major' ? 'Major: whole–whole–half at the start, so the 3rd note is bright.' : 'Minor: whole–half at the start, so the 3rd note is darker.',
      showAfter: seq,
    };
  },

  // ----- Enharmony -----
  'enharmonic'({ tricky = false } = {}) {
    const pcs = Object.keys(ENHARMONIC).map(Number).filter((p) => tricky || BLACK_PCS.includes(p));
    const p = pick(pcs);
    const [a, b] = shuffle(ENHARMONIC[p]);
    const m = noteIn(KB.low, KB.high, [p]);
    const pool = ALL_NAMES.filter((n) => !ENHARMONIC[p].includes(n) && (tricky || /[#b]/.test(n)) && Math.abs(((pcOf(n) - p + 18) % 12) - 6) <= 2);
    return {
      text: `This key is ${prettyAll(a)}. What is its other name?`,
      marks: [m], play: [m], choices: choicesFrom(prettyAll(b), [prettyAll(b), ...pool.map(prettyAll)]), answer: prettyAll(b),
      reveal: `${prettyAll(a)} = ${prettyAll(b)}: same sound, two names. ♯ is a semitone up from ${prettyAll((a.includes('#') ? a : b)[0])}, ♭ a semitone down from ${prettyAll((a.includes('b') ? a : b)[0])}.`,
    };
  },

  'find-spelled'({ names = ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb'] } = {}) {
    const name = pick(names);
    const p = pcOf(name);
    return {
      text: `Click any ${prettyAll(name)}.`,
      clickPc: p,
      reveal: `${prettyAll(name)} is the same key as ${prettyAll(ENHARMONIC[p].find((n) => n !== name))}: ♯ is one semitone up, ♭ one semitone down.`,
    };
  },

  'scale-spelling'({ keys = ['G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db'] } = {}) {
    for (;;) {
      const key = pick(keys);
      const names = scaleNames(key, 'major');
      const n = 1 + rand(7);
      const right = names[n - 1];
      const twin = (ENHARMONIC[pcOf(right)] || []).find((x) => x !== right);
      if (!twin || !/[#b]/.test(right)) continue;
      return {
        text: `In ${pretty(key)} major, grade ${n} is a black key with two names. Which name does the scale use?`,
        choices: shuffle([prettyAll(right), prettyAll(twin)]), answer: prettyAll(right),
        reveal: `${prettyAll(right)}. A scale uses every letter once, in alphabetical order: ${names.map(prettyAll).join(' ')}. ${prettyAll(twin)} would repeat or skip a letter.`,
      };
    }
  },

  // ----- Chords -----
  'build-chord'({ kind = 'triad', qualities = ['major', 'minor'] } = {}) {
    const c = randomChord(kind === 'seventh' ? SEVENTHS : TRIADS, qualities);
    const what = kind === 'seventh' ? `${pretty(c.root)} chord: ${c.quality}` : `${pretty(c.root)} ${c.quality} triad`;
    return {
      text: kind === 'seventh'
        ? `Build this 7th chord on ${pretty(c.root)} (${c.quality}): click its 4 notes from this ${pretty(c.root)} upwards.`
        : `Build ${/^[AEF]/.test(c.root) ? 'an' : 'a'} ${what}: click its 3 notes, from this ${pretty(c.root)} upwards.`,
      marks: [c.midis[0]], sequence: c.midis, play: [c.midis[0]], names: c.names.map(prettyAll), chord: true,
      reveal: `${c.names.map(prettyAll).join(' – ')}: ${stackText(c)}${SEVENTH_COMMON[c.quality] ? ` (often called ${SEVENTH_COMMON[c.quality]})` : ''}.`,
    };
  },

  'chord-quality'({ kind = 'triad', qualities = ['major', 'minor', 'diminished', 'augmented'], ear = false } = {}) {
    const c = randomChord(kind === 'seventh' ? SEVENTHS : TRIADS, qualities);
    const cap = (q) => q[0].toUpperCase() + q.slice(1);
    return {
      text: ear ? 'Listen. What kind of chord is it?' : 'What kind of chord is this?',
      marks: ear ? undefined : c.midis, showAfter: ear ? c.midis : undefined,
      play: [...c.midis, c.midis], choices: qualities.map(cap), answer: cap(c.quality),
      reveal: `${c.names.map(prettyAll).join(' – ')}: ${c.quality} (${stackText(c)})${SEVENTH_COMMON[c.quality] ? `, often called ${SEVENTH_COMMON[c.quality]}` : ''}.`,
    };
  },

  'diatonic-chord'({ keys = MAJOR_KEYS, mode = 'major' } = {}) {
    const key = pick(mode === 'minor' ? ['A', 'E', 'D', 'G', 'C', 'B'] : keys);
    const deg = 1 + rand(7);
    const d = naturalTriad(key, mode, deg);
    const romans = mode === 'minor' ? NATURAL_MINOR_ROMANS : MAJOR_ROMANS;
    const cap = (x) => x[0].toUpperCase() + x.slice(1);
    return {
      text: `In ${pretty(key)} ${mode === 'minor' ? 'natural minor' : 'major'}, what kind of triad is built on grade ${deg}?`,
      choices: ['Major', 'Minor', 'Diminished'], answer: cap(d.quality), play: [...d.midis, d.midis], showAfter: d.midis,
      reveal: `${romans[deg - 1]}: ${d.names.map(prettyAll).join(' – ')}, ${d.quality}. In every ${mode} key: ${romans.join(' ')}.`,
    };
  },

  'build-diatonic'({ keys = ['C', 'G', 'F', 'D', 'A', 'Bb'], mode = 'major' } = {}) {
    const key = pick(mode === 'minor' ? ['A', 'E', 'D', 'G'] : keys);
    const deg = 1 + rand(7);
    const d = naturalTriad(key, mode, deg);
    return {
      text: `In ${pretty(key)} ${mode === 'minor' ? 'natural minor' : 'major'}, build the triad on grade ${deg}: click its 3 notes from this ${prettyAll(d.names[0])} upwards, using only notes of the scale.`,
      marks: [d.midis[0]], sequence: d.midis, play: [d.midis[0]], names: d.names.map(prettyAll), chord: true,
      reveal: `${(mode === 'minor' ? NATURAL_MINOR_ROMANS : MAJOR_ROMANS)[deg - 1]}: ${d.names.map(prettyAll).join(' – ')} (${d.quality}). Skip one scale note each time: that makes the 3rds.`,
    };
  },

  // ----- Rhythm -----
  'note-values'() {
    const vals = NOTE_VALUES;
    let i = rand(vals.length - 1);
    let j = i + 1 + rand(vals.length - 1 - i);
    const n = vals[i].len / vals[j].len;
    const pool = ['2', '3', '4', '6', '8', '12', '16'];
    return {
      text: `How many ${vals[j].plural} last as long as one ${vals[i].name}?`,
      choices: choicesFrom(String(n), pool), answer: String(n),
      reveal: `${n}. Each note value lasts half the one before: whole → half → quarter → eighth → sixteenth.`,
    };
  },

  'time-signature'() {
    const sigs = [
      { s: '4/4', kind: 'Binary', beats: '4 quarter notes' },
      { s: '2/4', kind: 'Binary', beats: '2 quarter notes' },
      { s: '3/4', kind: 'Binary', beats: '3 quarter notes' },
      { s: '6/8', kind: 'Ternary', beats: '2 beats, each split in 3 eighth notes' },
      { s: '9/8', kind: 'Ternary', beats: '3 beats, each split in 3 eighth notes' },
      { s: '12/8', kind: 'Ternary', beats: '4 beats, each split in 3 eighth notes' },
    ];
    const t = pick(sigs);
    return {
      text: `Is ${t.s} a binary or a ternary time signature?`,
      choices: ['Binary', 'Ternary'], answer: t.kind,
      reveal: `${t.kind}: a bar of ${t.s} holds ${t.beats}. ${t.kind === 'Binary' ? 'Each beat divides in two.' : 'Each beat divides in three.'}`,
    };
  },

  'hear-meter'() {
    const ternary = Math.random() < 0.5;
    const per = ternary ? 3 : 2;
    const base = noteIn(60, 67);
    const notes = [];
    for (let beat = 0; beat < 4; beat++) for (let s = 0; s < per; s++) notes.push(s === 0 ? base + (beat === 0 ? 12 : 7) : base);
    return {
      text: 'Listen to the pulse: high notes are the beats. Is each beat divided in two (binary) or in three (ternary)?',
      play: [...notes, ...notes], gap: 0.2, choices: ['Binary', 'Ternary'], answer: ternary ? 'Ternary' : 'Binary',
      reveal: ternary ? 'Ternary: 1 a a, 2 a a, 3 a a, 4 a a, like 12/8.' : 'Binary: 1 and, 2 and, 3 and, 4 and, like 4/4.',
    };
  },

  // ----- Harmonic gravity -----
  'chord-pull'({ keys = MAJOR_KEYS } = {}) {
    const key = pick(keys);
    const deg = 2 + rand(6);
    const info = chordInfo(key, 'major', { deg });
    const level = { 5: 'Strongest pull', 7: 'Strongest pull', 4: 'Strong pull', 2: 'Strong pull', 3: 'No direct pull', 6: 'No direct pull' }[deg];
    const why = {
      5: 'it has the note a semitone below home that pushes up to it, and a note that falls down to it: the perfect cadence (V – I).',
      7: 'like V, it holds the note a semitone below home that pushes up to it.',
      4: 'it resolves home too, a little less strongly than V: the plagal cadence. It also leads nicely to V (it is a “pre-dominant”).',
      2: 'it resolves home too, a little less strongly than V. It also leads nicely to V (it is a “pre-dominant”).',
      3: 'it shares two notes with I, so going back to I releases no tension: it doesn’t confirm the key.',
      6: 'it shares two notes with I, so going back to I releases no tension: it doesn’t confirm the key.',
    }[deg];
    return {
      text: `In ${pretty(key)} major, how strongly does the ${info.roman} chord (${symbolText(info)}) pull back home to I?`,
      choices: ['Strongest pull', 'Strong pull', 'No direct pull'], answer: level,
      reveal: `${level}: ${why}`,
    };
  },

  'tendency-tone'({ keys = MAJOR_KEYS } = {}) {
    const key = pick(keys);
    const t = tonicMidi(key);
    const names = scaleNames(key, 'major');
    const tend = pick([
      { from: 11, fd: 7, why: 'it is a semitone below home, so it pushes up to it' },
      { from: 2, fd: 2, why: 'it falls back down to home' },
    ]);
    const from = t + tend.from;
    return {
      text: `In ${pretty(key)} major, ${prettyAll(names[tend.fd - 1])} (grade ${tend.fd}, a note of the V chord) wants to resolve. Click the note it goes to.`,
      marks: [from], play: [t, t + 4, t + 7, t + 12, from], clickPc: pcOf(key),
      reveal: `${prettyAll(names[0])}, home: ${tend.why}.`,
    };
  },

  'hear-cadence'({ keys = ['C', 'D', 'F', 'G', 'A', 'Bb'] } = {}) {
    const key = pick(keys);
    const pattern = pick([
      { degs: [1, 5, 1], home: true, name: 'I – V – I', why: 'V resolves home with the strongest pull (perfect cadence).' },
      { degs: [1, 6, 2, 1], home: true, name: 'I – vi – ii – I', why: 'ii resolves home (plagal cadence).' },
      { degs: [1, 6, 5, 1], home: true, name: 'I – vi – V – I', why: 'after vi, V brings the music home.' },
      { degs: [1, 6, 1], home: false, name: 'I – vi – I', why: 'vi shares two notes with I, so no tension is released.' },
      { degs: [1, 3, 1], home: false, name: 'I – iii – I', why: 'iii shares two notes with I, so no tension is released.' },
    ]);
    const chords = pattern.degs.map((d) => chordVoicing(chordInfo(key, 'major', { deg: d })).chord);
    const yes = 'Resolves: it confirms the key';
    const no = 'Floats: no real resolution';
    return {
      text: 'Listen. Does the last chord resolve the tension and confirm the key, or does it just float?',
      play: chords, choices: [yes, no], answer: pattern.home ? yes : no,
      reveal: `${pattern.name}: ${pattern.why}`,
    };
  },

  // ----- Inversions -----
  'name-inversion'() {
    const c = randomChord(TRIADS, ['major', 'minor']);
    const inv = rand(3);
    const midis = c.midis.map((m, i) => (i < inv ? m + 12 : m)).sort((a, b) => a - b);
    const names = ['Fundamental state', 'First inversion', 'Second inversion'];
    return {
      text: `This is ${/^[AEF]/.test(c.root) ? 'an' : 'a'} ${pretty(c.root)} ${c.quality} chord. Which position is it in?`,
      marks: midis, play: [...midis, midis], choices: names, answer: names[inv],
      reveal: `${names[inv]}: the lowest note is ${prettyAll(c.names[inv])}${inv === 0 ? ', the fundamental' : inv === 1 ? ', the 3rd of the chord' : ', the 5th of the chord'}.`,
    };
  },

  'find-fundamental'() {
    const c = randomChord(TRIADS, ['major', 'minor']);
    const inv = 1 + rand(2);
    const midis = c.midis.map((m, i) => (i < inv ? m + 12 : m)).sort((a, b) => a - b);
    const answer = `${pretty(c.root)} ${c.quality}`;
    const others = [
      `${prettyAll(c.names[inv])} ${c.quality}`, `${prettyAll(c.names[inv])} ${c.quality === 'major' ? 'minor' : 'major'}`,
      `${pretty(c.root)} ${c.quality === 'major' ? 'minor' : 'major'}`, `${prettyAll(c.names[(inv + 1) % 3])} major`,
    ];
    return {
      text: 'Which chord is this? Rearrange its notes in 3rds to find the fundamental.',
      marks: midis, play: [...midis, midis], choices: choicesFrom(answer, [answer, ...new Set(others)]), answer,
      reveal: `${answer}: in 3rds it is ${c.names.map(prettyAll).join(' – ')}. Here it is in ${inv === 1 ? 'first' : 'second'} inversion.`,
    };
  },
};

export const QUIZ_TYPES = Object.keys(GEN);
/** One question of a type (used by the tests). */
export const makeQuestion = (type, options = {}) => GEN[type](options);

// ---------- Sound ----------

let lastNoteAt = 0;
/** Plays notes one after another; an array inside the list is a chord, played together. */
async function playNotes(player, notes, gap = 0.65) {
  if (!player || !notes?.length) return;
  await player.ensure();
  const t = Tone.now() + 0.05;
  const f = (m) => 440 * 2 ** ((m - 69) / 12);
  let at = t;
  notes.forEach((m) => {
    if (Array.isArray(m)) {
      player.synths.chords.triggerAttackRelease(m.map(f), 1.0, at, 0.6);
      at += 1.15;
    } else {
      // The melody synth plays one note at a time and can't take a note earlier than one already
      // scheduled (e.g. a key clicked while the question still plays): those go to the chord synth.
      if (at > lastNoteAt) {
        player.synths.melody.triggerAttackRelease(f(m), Math.min(0.55, gap * 0.9), at, 0.8);
        lastNoteAt = at;
      } else {
        player.synths.chords.triggerAttackRelease([f(m)], Math.min(0.55, gap * 0.9), at, 0.6);
      }
      at += gap;
    }
  });
}

// ---------- The quiz view ----------

export class QuizView {
  /** onResult(correct, total) is called at the end of each round. best = {best, total} from earlier rounds. */
  constructor(root, { quiz, player, best = null, onResult = () => {} }) {
    this.root = root;
    this.quiz = { count: 10, pass: 8, options: {}, ...quiz };
    this.player = player;
    this.best = best;
    this.onResult = onResult;
    this.onKey = (e) => {
      if (e.key === 'Enter' && this.nextBtn && !this.nextBtn.hidden && !e.target.closest('input, textarea, select')) { e.preventDefault(); this.nextBtn.click(); }
    };
    document.addEventListener('keydown', this.onKey);
    this.renderStart();
  }

  destroy() {
    document.removeEventListener('keydown', this.onKey);
    this.root.replaceChildren();
  }

  renderStart() {
    const q = this.quiz;
    this.root.replaceChildren(h('div', { class: 'quiz quiz-start' },
      h('div', {},
        h('p', { class: 'eyebrow' }, 'Quick-fire practice'),
        h('h3', {}, `${q.count} questions · get ${q.pass} right to pass`),
        this.best ? h('p', { class: 'muted' }, `Your best so far: ${this.best.best} / ${this.best.total}`) : h('p', { class: 'muted' }, 'Turn your sound on: some questions are played.')),
      h('button', { type: 'button', class: 'btn primary', onclick: () => this.start() }, this.best ? 'Play again' : 'Start')));
  }

  start() {
    const gen = GEN[this.quiz.type];
    this.questions = [];
    let last = null;
    for (let i = 0; i < this.quiz.count; i++) {
      let qn;
      for (let tries = 0; tries < 6; tries++) {
        qn = gen(this.quiz.options || {});
        if (!last || qn.text !== last.text || JSON.stringify(qn.marks || qn.play) !== JSON.stringify(last.marks || last.play)) break;
      }
      this.questions.push(qn);
      last = qn;
    }
    this.i = 0;
    this.correct = 0;
    this.show();
  }

  show() {
    const qn = this.questions[this.i];
    this.answered = false;
    this.picked = [];
    const total = this.questions.length;
    this.feedback = h('p', { class: 'quiz-feedback', role: 'status' });
    this.nextBtn = h('button', { type: 'button', class: 'btn primary', hidden: true, onclick: () => this.next() }, this.i + 1 < total ? 'Next →' : 'See my score');
    this.kbBox = h('div', { class: 'kbd-scroll quiz-kbd' });
    this.controls = h('div', { class: 'quiz-controls' });
    this.root.replaceChildren(h('div', { class: 'quiz' },
      h('div', { class: 'quiz-top' },
        h('span', { class: 'muted small' }, `Question ${this.i + 1} of ${total}`),
        h('div', { class: 'quiz-bar' }, h('span', { style: { width: `${(this.i / total) * 100}%` } })),
        h('span', { class: 'small quiz-score' }, `${this.correct} right`)),
      h('p', { class: 'quiz-q' }, qn.text),
      this.kbBox,
      this.controls,
      this.feedback,
      h('div', { class: 'row wrap' },
        qn.play ? h('button', { type: 'button', class: 'btn small', onclick: () => playNotes(this.player, qn.play, qn.gap) }, '▶ Play again') : '',
        this.nextBtn)));
    this.drawKeyboard();
    this.drawControls();
    if (qn.play) playNotes(this.player, qn.play, qn.gap);
  }

  /** Draw the keyboard with the question's keys, the student's clicks and (after answering) the answer. */
  drawKeyboard(extra = new Map()) {
    const qn = this.questions[this.i];
    const clickable = qn.clickPc != null || qn.clickMidi != null || qn.sequence;
    const shown = (qn.marks || []).length || clickable || (this.answered && qn.showAfter);
    if (!shown) { this.kbBox.replaceChildren(); return; }
    const marks = new Map();
    const mark = (m, cls, label) => {
      const mk = marks.get(m) || { hands: new Set(), finger: null };
      mk.hands.add(cls);
      if (label) mk.label = label;
      marks.set(m, mk);
    };
    (qn.marks || []).forEach((m) => mark(m, 'given'));
    if (this.answered && qn.showAfter) qn.showAfter.forEach((m) => mark(m, 'given'));
    extra.forEach((v, m) => mark(m, v.cls, v.label));
    const svg = keyboardSvg({ low: KB.low, high: KB.high, marks, whiteW: 26, height: 120, fingers: false, labels: true, title: qn.text });
    if (clickable && !this.answered) {
      svg.classList.add('clickable');
      svg.addEventListener('click', (e) => {
        const k = e.target.closest('[data-midi]');
        if (k) this.clickKey(Number(k.dataset.midi));
      });
    }
    this.kbBox.replaceChildren(svg);
  }

  drawControls() {
    const qn = this.questions[this.i];
    if (qn.choices) {
      this.controls.replaceChildren(h('div', { class: 'quiz-choices' }, qn.choices.map((c) => h('button', {
        type: 'button', class: 'btn quiz-choice', onclick: (e) => this.choose(c, e.target),
      }, c))));
    } else if (qn.sequence) {
      this.controls.replaceChildren(h('div', { class: 'row wrap' },
        h('span', { class: 'muted small' }, `${this.picked.length} of ${qn.sequence.length} notes`),
        h('button', { type: 'button', class: 'btn small ghost', disabled: !this.picked.length || this.answered, onclick: () => { this.picked.pop(); this.redrawSequence(); } }, 'Undo'),
        h('button', { type: 'button', class: 'btn small ghost', disabled: !this.picked.length || this.answered, onclick: () => { this.picked = []; this.redrawSequence(); } }, 'Clear')));
    } else {
      this.controls.replaceChildren();
    }
  }

  clickKey(m) {
    const qn = this.questions[this.i];
    playNotes(this.player, [m]);
    if (qn.sequence) {
      if (this.picked.length >= qn.sequence.length) return;
      this.picked.push(m);
      if (this.picked.length === qn.sequence.length) {
        const ok = this.picked.every((x, k) => x === qn.sequence[k]);
        this.finish(ok);
        const extra = new Map();
        qn.sequence.forEach((x, k) => extra.set(x, { cls: 'ok', label: qn.names[k] }));
        this.picked.forEach((x, k) => { if (x !== qn.sequence[k]) extra.set(x, { cls: 'bad' }); });
        this.drawKeyboard(extra);
        this.drawControls();
        setTimeout(() => playNotes(this.player, qn.chord ? [...qn.sequence, qn.sequence] : qn.sequence, 0.4), 400);
      } else {
        this.redrawSequence();
      }
      return;
    }
    const ok = qn.clickPc != null ? pc(m) === qn.clickPc : m === qn.clickMidi;
    const extra = new Map();
    if (qn.clickPc != null) {
      for (let k = KB.low; k <= KB.high; k++) if (pc(k) === qn.clickPc) extra.set(k, { cls: 'ok' });
    } else {
      extra.set(qn.clickMidi, { cls: 'ok' });
    }
    if (!ok) extra.set(m, { cls: 'bad' });
    this.finish(ok);
    this.drawKeyboard(extra);
  }

  /** Building a scale: show the student's notes with T / S between them as they click. */
  redrawSequence() {
    const qn = this.questions[this.i];
    const extra = new Map();
    this.picked.forEach((m, k) => {
      const step = k ? m - this.picked[k - 1] : null;
      const label = qn.chord
        ? (k === 0 ? 'R' : step === 3 ? 'm3' : step === 4 ? 'M3' : String(step))
        : (k === 0 ? '1' : step === 1 ? 'H' : step === 2 ? 'W' : '?');
      extra.set(m, { cls: 'pick', label });
    });
    this.drawKeyboard(extra);
    this.drawControls();
  }

  choose(c, btn) {
    if (this.answered) return;
    const qn = this.questions[this.i];
    const ok = c === qn.answer;
    this.controls.querySelectorAll('.quiz-choice').forEach((b) => {
      b.disabled = true;
      if (b.textContent === qn.answer) b.classList.add('right');
    });
    if (!ok) btn.classList.add('wrong');
    this.finish(ok);
    const extra = new Map();
    if (qn.showSteps) for (let k = qn.showSteps[0] + 1; k < qn.showSteps[1]; k++) extra.set(k, { cls: 'step' });
    this.drawKeyboard(extra);
  }

  finish(ok) {
    this.answered = true;
    if (ok) this.correct++;
    const qn = this.questions[this.i];
    this.feedback.className = `quiz-feedback ${ok ? 'ok' : 'bad'}`;
    this.feedback.replaceChildren(h('strong', {}, ok ? '✓ Right! ' : '✗ Not quite. '), qn.reveal);
    this.root.querySelector('.quiz-score').textContent = `${this.correct} right`;
    this.nextBtn.hidden = false;
    this.nextBtn.focus({ preventScroll: true });
  }

  next() {
    if (this.i + 1 < this.questions.length) {
      this.i++;
      this.show();
      return;
    }
    const total = this.questions.length;
    const passed = this.correct >= this.quiz.pass;
    this.best = { best: Math.max(this.best?.best || 0, this.correct), total };
    this.onResult(this.correct, total);
    this.root.replaceChildren(h('div', { class: `quiz quiz-end ${passed ? 'passed' : ''}` },
      h('p', { class: 'eyebrow' }, passed ? 'Passed' : 'Keep practising'),
      h('div', { class: 'score-big' }, h('span', {}, String(this.correct)), h('small', {}, `/ ${total}`)),
      h('p', {}, passed
        ? (this.correct === total ? 'Perfect score! 🎉' : `Well done: you needed ${this.quiz.pass}.`)
        : `You need ${this.quiz.pass} to pass. Every round has new questions: try again!`),
      h('p', { class: 'muted small' }, `Best score: ${this.best.best} / ${total}`),
      h('button', { type: 'button', class: 'btn primary', onclick: () => this.start() }, 'Play again')));
  }
}
