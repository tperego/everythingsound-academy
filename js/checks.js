// Auto-checks. Each exercise lists checks as data; each check returns {label, pass, detail}.

import { chordAtBeat, chordEvents } from './project.js';
import { chordDegrees, chordInfo } from './theory.js';
import { baseLetter, comparePhrases, phraseCount, phraseNotes } from './form.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const listBars = (arr) => arr.join(', ');

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
    const base = evs.map((e) => e.info.baseRoman);
    const match = okCount && sequence.every((want, i) => (want.includes('7') ? got[i] === want : base[i] === want));
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

  // ----- Listening: find the key and the chords of a recording -----
  'key-is'({ key, mode }, p) {
    const pass = p.key === key && p.mode === mode;
    return { label: 'You found the key', pass, detail: pass ? `${key} ${mode} ✓` : `You chose ${p.key} ${p.mode}. Listen for the note that feels like home.` };
  },

  // Like 'progression' but says which bars are right, without giving the answer away.
  'progression-by-bar'({ sequence }, p) {
    const right = [];
    const wrong = [];
    // Each bar is checked on beats 1 and 3; an entry like ['ii', 'V'] means two chords in that bar.
    sequence.forEach((want, b) => {
      const wants = Array.isArray(want) ? want : [want, want];
      const ok = wants.every((w, half) => {
        const ev = chordAtBeat(p, b * 4 + half * 2);
        return ev && chordInfo(p.key, p.mode, ev.chord).baseRoman === w;
      });
      (ok ? right : wrong).push(b + 1);
    });
    return {
      label: 'Your chords match the recording',
      pass: wrong.length === 0,
      detail: wrong.length === 0 ? 'Every bar is right.' : `${right.length ? `Right: bar ${listBars(right)}. ` : ''}Listen again to bar ${listBars(wrong)}.`,
    };
  },

  // ----- Melodic form -----
  // The student's phrase labels (A, A′, B…) against the answer.
  'form-labels'({ answer }, p, ctx) {
    const labels = ctx.answers?.formLabels || [];
    if (!labels.some(Boolean)) return { label: 'Each phrase is labelled (A, A′, B…)', pass: false, detail: 'Label each phrase first.' };
    const right = [];
    const wrong = [];
    answer.forEach((want, i) => (labels[i] === want ? right : wrong).push(i + 1));
    return {
      label: 'Your form labels are right',
      pass: wrong.length === 0,
      detail: wrong.length === 0 ? `Form: ${answer.join(' ')}` : `${right.length ? `Right: phrase ${listBars(right)}. ` : ''}Look again at phrase ${listBars(wrong)}.`,
    };
  },

  // The "same rhythm / same pitches as phrase 1" ticks, checked against the melody itself.
  'form-rhythm-pitch'({ phraseBars }, p, ctx) {
    const n = phraseCount(p, phraseBars);
    const first = phraseNotes(p, 0, phraseBars);
    const wrong = [];
    for (let i = 1; i < n; i++) {
      const c = comparePhrases(first, phraseNotes(p, i, phraseBars));
      const r = !!ctx.answers?.sameRhythm?.[i];
      const s = !!ctx.answers?.samePitch?.[i];
      if (r !== c.sameRhythm || s !== c.samePitch) wrong.push(i + 1);
    }
    return {
      label: 'Your rhythm and pitch comparisons are right',
      pass: wrong.length === 0,
      detail: wrong.length === 0 ? '' : `Compare phrase ${listBars(wrong)} with phrase 1 again: play them one after the other.`,
    };
  },

  // Labelling a whole song section by section (e.g. the vocal phrases of a recording).
  // Students may use different letters from the teacher, as long as they use them consistently:
  // the same idea must always get the same letter, and a prime (′) must match a prime.
  'section-labels'({ sections }, p, ctx) {
    const got = ctx.answers?.sectionLabels || [];
    if (!got.flat().some(Boolean)) return { label: 'Every phrase has a letter', pass: false, detail: 'Click a box, then a letter.' };
    const map = new Map(); // student letter -> teacher letter
    const rev = new Map(); // teacher letter -> student letter
    const right = [];
    const wrong = [];
    const missing = [];
    sections.forEach((sec, i) => {
      const want = sec.split(' ');
      const g = got[i] || [];
      if (want.some((_, k) => !g[k])) { missing.push(i + 1); return; }
      const m = new Map(map);
      const r = new Map(rev);
      const ok = want.every((w, k) => {
        const s = g[k];
        if (s.endsWith('′') !== w.endsWith('′')) return false;
        const sb = baseLetter(s);
        const wb = baseLetter(w);
        if (m.has(sb) || r.has(wb)) return m.get(sb) === wb && r.get(wb) === sb;
        m.set(sb, wb);
        r.set(wb, sb);
        return true;
      });
      if (ok) {
        right.push(i + 1);
        m.forEach((v, k) => map.set(k, v));
        r.forEach((v, k) => rev.set(k, v));
      } else {
        wrong.push(i + 1);
      }
    });
    const parts = [];
    if (right.length) parts.push(`Right: section ${listBars(right)}.`);
    if (wrong.length) parts.push(`Listen again to section ${listBars(wrong)}.`);
    if (missing.length) parts.push(`Not finished: section ${listBars(missing)}.`);
    return { label: 'Your letters match the patterns in the song', pass: right.length === sections.length, detail: parts.join(' ') };
  },

  // Composing in a given form: repeats must repeat, variations vary, new letters are new.
  'melody-form'({ form, phraseBars }, p) {
    return formResults(form, phraseBars, p);
  },

  // Composing in a pattern the student chose from a list (e.g. one of the patterns heard in a song).
  'melody-pattern'({ options = [] }, p, ctx) {
    const pattern = ctx.answers?.pattern;
    const phraseBars = ctx.answers?.phraseBars || 1;
    if (!pattern || !options.includes(pattern)) return { label: 'Choose a pattern', pass: false, detail: 'Pick one of the patterns from the list.' };
    return [
      { label: `Your pattern: ${pattern}`, pass: true, detail: `${phraseBars} bar${phraseBars > 1 ? 's' : ''} per phrase` },
      ...formResults(pattern.split(' '), phraseBars, p),
    ];
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

function formResults(form, phraseBars, p) {
  const n = Math.min(form.length, phraseCount(p, phraseBars));
  const phrases = Array.from({ length: n }, (_, i) => phraseNotes(p, i, phraseBars));
  const empty = phrases.map((ph, i) => (ph.length < 2 ? i + 1 : null)).filter(Boolean);
  const out = [{
    label: `Every phrase has a melody (${n} phrases of ${phraseBars} bar${phraseBars > 1 ? 's' : ''})`,
    pass: empty.length === 0,
    detail: empty.length ? `Phrase ${listBars(empty)} needs more notes.` : '',
  }];
  if (empty.length) return out;
  for (let i = 1; i < n; i++) {
    const label = form[i];
    // Compare with an earlier phrase of the same label if there is one (A′ … A′), else the first of its letter.
    let j = form.findIndex((l, k) => k < i && l === label);
    if (j < 0) j = form.findIndex((l, k) => k < i && baseLetter(l) === baseLetter(label));
    if (j < 0) {
      const tooClose = phrases.slice(0, i).map((ph, k) => ({ k, c: comparePhrases(ph, phrases[i]) })).filter(({ c }) => (c.rhythm + c.pitch) / 2 >= 0.5);
      out.push({
        label: `Phrase ${i + 1} (${label}) is new material`,
        pass: tooClose.length === 0,
        detail: tooClose.length ? `It is too close to phrase ${tooClose[0].k + 1}. Change its rhythm and its pitches.` : '',
      });
      continue;
    }
    const c = comparePhrases(phrases[j], phrases[i]);
    if (form[j] === label) {
      out.push({
        label: `Phrase ${i + 1} (${label}) repeats phrase ${j + 1}`,
        pass: c.samePitch,
        detail: c.samePitch ? '' : `Rhythm ${pct(c.rhythm)} and pitches ${pct(c.pitch)} the same. A repeat should be identical.`,
      });
    } else {
      const pass = c.rhythm >= 0.75 && !c.samePitch && c.pitch >= 0.25;
      out.push({
        label: `Phrase ${i + 1} (${label}) is a variation of phrase ${j + 1}`,
        pass,
        detail: `Rhythm ${pct(c.rhythm)} the same, pitches ${pct(c.pitch)} the same.${pass ? '' : c.samePitch ? ' Change a few pitches, especially at the end.' : ' Keep more of the rhythm, change only some notes.'}`,
      });
    }
  }
  return out;
}

/**
 * ctx = { midi: {fileName, analysis} | null, audio: {fileName} | null,
 *         answers: {formLabels: [], sameRhythm: [], samePitch: []} | null }
 * A check may return one result or a list of results.
 */
export function runChecks(exercise, project, ctx = {}) {
  return (exercise.checks || []).flatMap((c) => {
    const fn = CHECKS[c.type];
    if (!fn) return [{ label: `Unknown check "${c.type}"`, pass: false, detail: '' }];
    try {
      return fn(c, project, ctx);
    } catch (err) {
      return [{ label: c.type, pass: false, detail: String(err.message || err) }];
    }
  });
}

/** True when the chord-finding part of a listening exercise is right (used to unlock the melody). */
export function chordsFound(exercise, project) {
  const types = new Set(['key-is', 'progression-by-bar']);
  const relevant = (exercise.checks || []).filter((c) => types.has(c.type));
  return relevant.length > 0 && runChecks({ checks: relevant }, project).every((r) => r.pass);
}
