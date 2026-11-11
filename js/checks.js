// Auto-checks. Each exercise lists checks as data; each check returns {label, pass, detail}.

import { chordAtBeat, chordEvents } from './project.js';
import { chordDegrees, chordInfo } from './theory.js';

const strip7 = (r) => r.replace(/(maj7|\(maj7\)|ø7|°7|\+7|7)$/, (m) => (m === 'ø7' || m === '°7' ? '°' : m === '+7' ? '+' : ''));

function romans(project) {
  return chordEvents(project).map((ev) => ({ ...ev, info: chordInfo(project.key, project.mode, ev.chord) }));
}

const CHECKS = {
  // Chords must match a given roman-numeral sequence, one chord per bar.
  progression({ sequence }, p) {
    const evs = romans(p);
    const got = evs.map((e) => e.info.roman);
    const okCount = evs.length === sequence.length;
    const perBar = evs.every((e, i) => e.start === i * 4 && e.len === 4);
    const match = okCount && sequence.every((want, i) => (want.includes('7') ? got[i] === want : strip7(got[i]) === want));
    return {
      label: `Chords are ${sequence.join(' – ')}, one per bar`,
      pass: match && perBar,
      detail: got.length ? `You have: ${got.join(' – ')}${match && !perBar ? ' (but not one chord per bar)' : ''}` : 'No chords yet.',
    };
  },

  'all-bars-filled'(_, p) {
    const empty = [];
    for (let b = 0; b < p.bars; b++) if (!chordAtBeat(p, b * 4)) empty.push(b + 1);
    return { label: 'Every bar has a chord', pass: empty.length === 0, detail: empty.length ? `Empty bar${empty.length > 1 ? 's' : ''}: ${empty.join(', ')}` : '' };
  },

  'starts-on-tonic'(_, p) {
    const evs = romans(p);
    const first = evs[0];
    return { label: 'Starts on the tonic chord', pass: !!first && first.start === 0 && first.chord.deg === 1, detail: first ? `First chord: ${first.info.roman}` : 'No chords yet.' };
  },

  'ends-with-cadence'({ cadence = 'perfect' }, p) {
    const evs = romans(p);
    const a = evs[evs.length - 2];
    const b = evs[evs.length - 1];
    const names = { perfect: 'a perfect cadence (V – I)', plagal: 'a plagal cadence (IV – I)', half: 'a half cadence (ends on V)', imperfect: 'an imperfect cadence (ends on V)' };
    let pass = false;
    if (cadence === 'perfect') pass = !!a && !!b && a.chord.deg === 5 && b.chord.deg === 1;
    if (cadence === 'plagal') pass = !!a && !!b && a.chord.deg === 4 && b.chord.deg === 1;
    if (cadence === 'half' || cadence === 'imperfect') pass = !!b && b.chord.deg === 5;
    const lastBarStart = (p.bars - 1) * 4;
    if (cadence !== 'half' && cadence !== 'imperfect') pass = pass && b.start <= lastBarStart;
    return { label: `Ends with ${names[cadence]}`, pass, detail: b ? `Your ending: ${a ? a.info.roman + ' – ' : ''}${b.info.roman}` : 'No chords yet.' };
  },

  'predominant-before-dominant'(_, p) {
    const evs = romans(p);
    const found = evs.some((e, i) => i > 0 && e.chord.deg === 5 && evs[i - 1].info.func === 'PD');
    return { label: 'Uses a pre-dominant (ii or IV) right before V', pass: found, detail: found ? '' : 'Try ii – V or IV – V.' };
  },

  'chord-count'({ min = 1, max = 99 }, p) {
    const n = chordEvents(p).length;
    return { label: `Uses between ${min} and ${max} chord changes`, pass: n >= min && n <= max, detail: `You have ${n}.` };
  },

  'chords-unchanged'({ progression }, p) {
    const evs = chordEvents(p);
    const pass = evs.length === progression.length && progression.every((deg, i) => evs[i].chord.deg === deg && evs[i].start === i * 4);
    return { label: 'The given chords are unchanged', pass, detail: pass ? '' : 'Reset the exercise to get the original chords back.' };
  },

  'melody-fills'({ minNotes = 8 }, p) {
    const emptyBars = [];
    for (let b = 0; b < p.bars; b++) if (!p.melody.some((n) => n.start < (b + 1) * 8 && n.start + n.len > b * 8)) emptyBars.push(b + 1);
    const pass = p.melody.length >= minNotes && emptyBars.length === 0;
    return {
      label: `At least ${minNotes} notes, with something in every bar`,
      pass,
      detail: `${p.melody.length} notes${emptyBars.length ? `; silent bar${emptyBars.length > 1 ? 's' : ''}: ${emptyBars.join(', ')}` : ''}`,
    };
  },

  // Notes that start on beats 1 and 3 should mostly be chord tones.
  'melody-chord-tones'({ minRatio = 0.6 }, p) {
    const strong = p.melody.filter((n) => n.start % 4 === 0);
    let hits = 0;
    for (const n of strong) {
      const ev = chordAtBeat(p, n.start / 2);
      if (ev && chordDegrees(ev.chord.deg, ev.chord.seventh).includes(n.deg)) hits++;
    }
    const ratio = strong.length ? hits / strong.length : 0;
    return {
      label: `Most notes on beats 1 and 3 are chord tones (≥ ${Math.round(minRatio * 100)}%)`,
      pass: strong.length > 0 && ratio >= minRatio,
      detail: strong.length ? `${hits} of ${strong.length} strong-beat notes are chord tones (${Math.round(ratio * 100)}%).` : 'No notes on beats 1 or 3 yet.',
    };
  },

  'melody-ends-on-tonic'(_, p) {
    const last = [...p.melody].sort((a, b) => a.start - b.start).pop();
    return { label: 'The melody ends on the tonic (degree 1)', pass: !!last && last.deg === 1, detail: last ? `Last note: degree ${last.deg}` : 'No notes yet.' };
  },

  'melody-range'({ maxRows = 10 }, p) {
    if (!p.melody.length) return { label: 'Melody stays within a singable range', pass: false, detail: 'No notes yet.' };
    const idx = p.melody.map((n) => n.oct * 7 + n.deg);
    const span = Math.max(...idx) - Math.min(...idx) + 1;
    return { label: 'Melody stays within a singable range', pass: span <= maxRows, detail: `Spans ${span} scale steps.` };
  },

  // DAW round-trip checks use the attached files.
  'daw-midi-attached'(_, p, ctx) {
    return { label: 'MIDI exported from your DAW is attached', pass: !!ctx.midi, detail: ctx.midi ? ctx.midi.fileName : 'Attach the .mid file you exported.' };
  },
  'daw-audio-attached'(_, p, ctx) {
    return { label: 'Audio bounce (MP3 or WAV) is attached', pass: !!ctx.audio, detail: ctx.audio ? ctx.audio.fileName : 'Attach your bounce.' };
  },
  'daw-tracks'({ min = 2 }, p, ctx) {
    const n = ctx.midi?.analysis?.tracks.length ?? 0;
    return { label: `Your DAW MIDI has at least ${min} tracks with notes`, pass: n >= min, detail: ctx.midi ? `${n} track${n === 1 ? '' : 's'} with notes` : 'No MIDI attached.' };
  },
  'daw-in-key'({ maxOutRatio = 0.1 }, p, ctx) {
    const a = ctx.midi?.analysis;
    if (!a) return { label: 'Your DAW MIDI stays in key', pass: false, detail: 'No MIDI attached.' };
    return {
      label: `Your DAW MIDI stays in key (≤ ${Math.round(maxOutRatio * 100)}% outside notes)`,
      pass: a.outOfKeyRatio <= maxOutRatio,
      detail: `${a.outOfKeyCount} of ${a.noteCount} notes are outside ${p.key} ${p.mode}.`,
    };
  },
  'daw-progression'({ sequence, minMatch = 0.75 }, p, ctx) {
    const a = ctx.midi?.analysis;
    if (!a) return { label: `The ${sequence.join(' – ')} progression is still there`, pass: false, detail: 'No MIDI attached.' };
    // The arrangement may loop the progression; compare each bar against the repeating pattern.
    const bars = a.bars.filter((b) => b.roman !== '–');
    const hits = bars.filter((b, i) => strip7(b.baseRoman) === sequence[(b.bar - 1) % sequence.length]).length;
    const ratio = bars.length ? hits / bars.length : 0;
    return {
      label: `The ${sequence.join(' – ')} progression is still there`,
      pass: ratio >= minMatch,
      detail: `Heard as: ${a.bars.map((b) => b.roman).join(' ')} (${Math.round(ratio * 100)}% of bars match)`,
    };
  },
};

/** ctx = { midi: {fileName, analysis} | null, audio: {fileName} | null } */
export function runChecks(exercise, project, ctx = {}) {
  return (exercise.checks || []).map((c) => {
    const fn = CHECKS[c.type];
    if (!fn) return { label: `Unknown check "${c.type}"`, pass: false, detail: '' };
    try {
      return fn(c, project, ctx);
    } catch (err) {
      return { label: c.type, pass: false, detail: String(err.message || err) };
    }
  });
}
