// Scenes for weeks 4–10 of the TikTok plan (Days 22–65: Saturday 19 December to Sunday 31 January).
// Same Stage API as scene-list.js. Each scene also carries `film` and `lesson`, the "What to film" and
// "Lesson" columns of the plan doc. Every melody here is traditional or out of copyright.

// Chords in C major, bass first (for S.prog), and lower voicings for playing under a melody (L).
const C = {
  I: ['C3', 'C4', 'E4', 'G4'], ii: ['D3', 'D4', 'F4', 'A4'], iii: ['E3', 'E4', 'G4', 'B4'], IV: ['F3', 'F4', 'A4', 'C5'],
  V: ['G2', 'G3', 'B3', 'D4'], vi: ['A2', 'A3', 'C4', 'E4'], 'vii°': ['B2', 'B3', 'D4', 'F4'],
  V7: ['G2', 'G3', 'B3', 'F4'], iv: ['F3', 'F4', 'Ab4', 'C5'], i: ['C3', 'C4', 'Eb4', 'G4'], 'V/V': ['D3', 'D4', 'F#4', 'C5'],
};
const L = {
  I: ['C3', 'E3', 'G3'], ii: ['D3', 'F3', 'A3'], IV: ['F2', 'C3', 'A3'], V: ['G2', 'D3', 'B3'], vi: ['A2', 'E3', 'C4'],
  i: ['C3', 'Eb3', 'G3'], iv: ['F2', 'C3', 'Ab3'],
};
const G = { I: ['G2', 'G3', 'B3', 'D4'], IV: ['C3', 'C4', 'E4', 'G4'], V: ['D3', 'D4', 'F#4', 'A4'], vi: ['E3', 'E4', 'G4', 'B4'] };
const P = (...labels) => labels.map((l) => [l, C[l]]);
const KB = ['G2', 'C5'];

/** 'G4:1.5 A4:.5 r:1' -> roll events [[note, startBeat, beats, voice]] (r = rest). */
const seq = (str, t0 = 0, voice) => {
  let t = t0;
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const [x, d = '1'] = tok.split(':');
    const b = Number(d);
    if (x !== 'r') out.push(voice ? [x, t, b, voice] : [x, t, b]);
    t += b;
  }
  return out;
};
/** The same text as [note | null, seconds] for S.notes, at a tempo. */
const tune = (str, bpm = 100) => str.trim().split(/\s+/).map((tok) => {
  const [x, d = '1'] = tok.split(':');
  return [x === 'r' ? null : x, (Number(d) * 60) / bpm];
});
const CHROM = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];

/** Show an interval: light both notes, play one after the other, then together, and name it. */
async function interval(S, a, b, name) {
  S.clearKb();
  S.mark([a, b], 'rh');
  await S.notes([a, b], { gap: 0.8, light: false });
  await S.chord([a, b], { light: false, len: 1.2 });
  S.tag(name);
  await S.wait(1.6);
}

/** An ear test. play(lit) plays the question; lit = true when it plays again, shown on the keyboard. */
async function quiz(S, { cap, kb, play, choices, answer, reveal, think = 3, after = null }) {
  if (cap) S.cap(cap);
  if (kb) S.kb(...kb);
  await play(false);
  await S.ask({ choices, answer, reveal, think,
    after: after || (async () => { if (S.kbBox) S.clearKb(); await play(true); await S.wait(1.5); }) });
}

/** Several quick questions in one scene: [{ cap, kb, play, choices, answer, reveal }]. */
async function round(S, qs) {
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    S.reset();
    S.cap(`${i + 1}/${qs.length} · ${q.cap}`);
    if (q.kb) S.kb(...q.kb);
    await q.play(false);
    await S.ask({ choices: q.choices, answer: q.answer, reveal: q.reveal, think: 3 });
  }
}
const lit = (on) => ({ light: on, keep: on });

// Melodies used more than once (C major unless named).
const JINGLE = 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 G4 G4 F4 D4 C4:4';
const JINGLE_CHORDS = (I, IV, V) => [['I', I, 0, 16], ['IV', IV, 16, 4], ['I', I, 20, 4], ['V', V, 24, 4], ['I', I, 28, 4]];
const SILENT = 'G4:1.5 A4:.5 G4 E4:3 G4:1.5 A4:.5 G4 E4:3 D5:2 D5 B4:3 C5:2 C5 G4:3 A4:2 A4 C5:1.5 B4:.5 A4 G4:1.5 A4:.5 G4 E4:3';
const ODE = 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2';
const AULD = 'G3 C4:1.5 C4:.5 C4 E4 D4:1.5 C4:.5 D4 E4:.5 D4:.5 C4:1.5 C4:.5 E4 G4 A4:3';
const GRACE = 'G3 C4:2 E4:.5 C4:.5 E4:2 D4 C4:2 A3 G3:2';

const SCENES = [
  // ================= WEEK 4 (19–25 Dec): Christmas carols, explained =================
  {
    week: 4, day: 22, slot: 'Morning', hook: 'Major or minor? Christmas carol edition.', end: 'quiz',
    film: 'The opening of “God Rest Ye Merry Gentlemen”, then the reveal', lesson: '5 Minor scale',
    async run(S) {
      await quiz(S, {
        cap: '“God Rest Ye Merry Gentlemen”: major or minor?', kb: ['C4', 'C5'],
        play: (on) => S.notes(tune('E4 E4 B4 B4 A4 G4 F#4 E4 D4 E4 F#4 G4 A4 B4:2', 150), lit(on)),
        choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor: it lives in E minor. Most carols are major; this one isn’t.',
      });
    },
  },
  {
    week: 4, day: 22, slot: 'Afternoon', hook: '“Joy to the World” is just a scale. Listen.',
    film: 'Play the opening, then the C major scale from the top down', lesson: '4 Major scale',
    async run(S) {
      S.cap('“Joy to the World”');
      S.kb('C4', 'C5');
      await S.notes(tune('C5:1 B4:.75 A4:.25 G4:1.5 F4:.5 E4 D4 C4:2', 92), { keep: true });
      await S.wait(0.6);
      S.cap('Now without the rhythm');
      S.clearKb();
      await S.scale(['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'], { steps: ['S', 'T', 'T', 'T', 'S', 'T', 'T'], gap: 0.45 });
      S.tag('The C major scale, top to bottom');
      await S.wait(2);
    },
  },
  {
    week: 4, day: 22, slot: 'Evening', hook: 'Harmonise “Jingle Bells” with just 3 chords.',
    film: 'Sandbox: the chorus melody, then add I, IV and V under it', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('“Jingle Bells”: the melody alone');
      const mel = seq(JINGLE);
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 150 });
      S.cap('Add 3 chords: I, IV and V');
      await S.rollPlay(mel, { bpm: 150, keepRoll: false, chords: JINGLE_CHORDS(L.I, L.IV, L.V) });
      S.tag('3 chords: the whole chorus');
      await S.wait(2);
    },
  },
  {
    week: 4, day: 23, slot: 'Morning', hook: '“Silent Night”: 2 beats in a bar, or 3?', end: 'quiz',
    film: 'Play the opening; ask viewers to count; reveal with the beat dots', lesson: '10 Rhythm',
    async run(S) {
      S.cap('“Silent Night”: count along. 2 or 3 beats in each bar?');
      const play = () => S.notes(tune('G4:1.5 A4:.5 G4 E4:3 G4:1.5 A4:.5 G4 E4:3', 100));
      await play();
      await S.ask({ choices: ['2 beats', '3 beats'], answer: '3 beats', reveal: '3: ONE-two-three, like a lullaby.',
        after: async () => { S.beats([3]); await Promise.all([play(), S.pulse([3], { rounds: 4, gap: 0.6 })]); } });
    },
  },
  {
    week: 4, day: 23, slot: 'Afternoon', hook: '“Carol of the Bells” is 4 notes on repeat.',
    film: 'Play the 4-note pattern, then slow it down and name the two intervals', lesson: '3 Intervals',
    async run(S) {
      S.cap('“Carol of the Bells”: 4 notes, on repeat');
      S.kb('F4', 'C5');
      const bar = tune('Bb4:1 A4:.5 Bb4:.5 G4:1', 150);
      for (let i = 0; i < 4; i++) await S.notes(bar);
      S.cap('Slow it down');
      S.mark(['Bb4', 'A4'], 'rh');
      await S.notes(['Bb4', 'A4', 'Bb4'], { gap: 0.8, light: false });
      S.tag('B♭ to A: a semitone');
      await S.wait(1.4);
      S.tag('');
      await interval(S, 'Bb4', 'G4', 'B♭ to G: a minor 3rd');
      S.clearKb();
      S.cap('A semitone and a minor 3rd: that’s the whole bell');
      S.tag('');
      for (let i = 0; i < 2; i++) await S.notes(bar);
    },
  },
  {
    week: 4, day: 23, slot: 'Evening', hook: '“We Wish You a Merry Christmas” climbs a staircase.',
    film: 'Play the first verse, then the three phrases one by one: each a step higher', lesson: '4 Major scale',
    async run(S) {
      S.cap('“We Wish You a Merry Christmas”');
      S.kb('G4', 'G5');
      await S.notes(tune('G4 C5 C5:.5 D5:.5 C5:.5 B4:.5 A4 A4 A4 D5 D5:.5 E5:.5 D5:.5 C5:.5 B4 G4 G4 E5 E5:.5 F5:.5 E5:.5 D5:.5 C5 A4 G4:.5 G4:.5 A4 D5 B4 C5:3', 170));
      S.cap('Same shape, one step higher each time');
      S.chips(['from C', 'from D', 'from E']);
      const frags = ['C5 C5:.5 D5:.5 C5:.5 B4:.5', 'D5 D5:.5 E5:.5 D5:.5 C5:.5', 'E5 E5:.5 F5:.5 E5:.5 D5:.5'];
      for (let i = 0; i < 3; i++) { S.chipOn(i); await S.notes(tune(frags[i], 120), { keep: true }); await S.wait(0.5); S.clearKb(); }
      S.tag('A pattern that climbs: a sequence');
      await S.wait(2);
    },
  },
  {
    week: 4, day: 24, slot: 'Morning', hook: 'How many different notes in the “Jingle Bells” chorus?', end: 'quiz',
    film: 'Play the chorus; ask for a number; light the 5 keys', lesson: '4 Major scale',
    async run(S) {
      S.cap('Count the different notes in the “Jingle Bells” chorus');
      S.kb('C4', 'B4');
      await S.notes(tune(JINGLE, 160), { light: false });
      await S.ask({ choices: ['3', '5', '7'], answer: '5', reveal: 'Just 5: C, D, E, F, G. Five neighbours on the keyboard.',
        after: async () => { await S.notes(['C4', 'D4', 'E4', 'F4', 'G4'], { gap: 0.4, keep: true }); await S.wait(1.5); } });
    },
  },
  {
    week: 4, day: 24, slot: 'Afternoon', hook: '“Deck the Halls” walks down the scale.',
    film: 'Play the first line; isolate the 5 notes going down', lesson: '4 Major scale',
    async run(S) {
      S.cap('“Deck the Halls”');
      S.kb('A3', 'A4');
      await S.notes(tune('G4:1.5 F4:.5 E4 D4 C4 D4 E4 C4 D4:.5 E4:.5 F4:.5 D4:.5 E4:1.5 D4:.5 C4 B3 C4:2', 140));
      S.cap('The first 5 notes');
      await S.scale(['G4', 'F4', 'E4', 'D4', 'C4'], { steps: ['T', 'S', 'T', 'T'], gap: 0.55 });
      S.tag('Five steps down the C major scale');
      await S.wait(2);
    },
  },
  {
    week: 4, day: 24, slot: 'Evening', hook: 'Why Christmas songs love 7th chords.',
    film: 'I – vi – ii – V with plain chords, then with a 7th on every chord', lesson: '8 Sevenths',
    async run(S) {
      S.kb(...KB);
      S.cap('Plain chords');
      await S.prog(P('I', 'vi', 'ii', 'V', 'I'), { gap: 1.3 });
      S.cap('Now add the 7th');
      await S.prog([['Imaj7', ['C3', 'E4', 'G4', 'B4']], ['vi7', ['A2', 'E4', 'G4', 'C5']], ['ii7', ['D3', 'F4', 'A4', 'C5']],
        ['V7', ['G2', 'B3', 'D4', 'F4']], ['Imaj7', ['C3', 'E4', 'G4', 'B4'], 2.4]], { gap: 1.5 });
      S.tag('One extra note: instant cosy Christmas sound');
      await S.wait(2);
    },
  },
  {
    week: 4, day: 25, slot: 'Morning', hook: 'Name the carol from its first 4 notes.', end: 'quiz',
    film: 'Four notes only, three carols to choose from', lesson: '4 Major scale',
    async run(S) {
      await quiz(S, {
        cap: 'Name the carol from 4 notes', kb: ['C4', 'C5'],
        play: (on) => S.notes(tune(on ? 'C5:1 B4:.75 A4:.25 G4:1.5 F4:.5 E4 D4 C4:2' : 'C5:1 B4:.75 A4:.25 G4:1.5', 92), lit(on)),
        choices: ['Silent Night', 'Joy to the World', 'Jingle Bells'], answer: 'Joy to the World',
        reveal: '“Joy to the World”: it starts walking down the scale.',
      });
    },
  },
  {
    week: 4, day: 25, slot: 'Afternoon', hook: 'Two carols, the same first leap.',
    film: '“O Christmas Tree”, then “Hark! The Herald Angels Sing”; name the leap: a perfect 4th', lesson: '3 Intervals',
    async run(S) {
      S.kb('G3', 'G4');
      S.cap('“O Christmas Tree”');
      await S.notes(tune('G3 C4:.75 C4:.25 C4:1.5 D4:.5 E4:.75 E4:.25 E4:2', 110));
      await S.wait(0.5);
      S.cap('“Hark! The Herald Angels Sing”');
      await S.notes(tune('G3 C4 C4:1.5 B3:.5 C4 E4 E4 D4:2', 120));
      S.cap('The same first leap: G up to C');
      await interval(S, 'G3', 'C4', 'Perfect 4th · 5 semitones');
    },
  },
  {
    week: 4, day: 25, slot: 'Evening', hook: '“Silent Night” needs only 3 chords.',
    film: 'Sandbox: the melody with I, V and IV under it, chord names lighting up', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('“Silent Night”: watch the chords change');
      const mel = seq(SILENT);
      S.rollSetup(mel, { bpb: 3 });
      await S.rollPlay(mel, { bpm: 100, chords: [['I', L.I, 0, 12], ['V', L.V, 12, 6], ['I', L.I, 18, 6], ['IV', L.IV, 24, 6], ['I', L.I, 30, 6]] });
      S.cap('');
      S.tag('I, IV and V: that’s all it needs');
      await S.wait(2.2);
    },
  },
  {
    week: 4, day: 26, slot: 'Morning', hook: 'Perfect or plagal? The ending test.', end: 'quiz',
    film: 'A short progression; ask which ending it was: V → I or IV → I', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('How does it end: V → I or IV → I?');
      S.kb(...KB);
      await S.prog(P('I', 'V', 'vi', 'IV', 'I'), { light: false });
      await S.ask({ choices: ['Perfect (V → I)', 'Plagal (IV → I)'], answer: 'Plagal (IV → I)',
        reveal: 'Plagal: IV to I, the “Amen” ending.', after: async () => { await S.prog(P('IV', 'I'), { gap: 1.6 }); } });
    },
  },
  {
    week: 4, day: 26, slot: 'Afternoon', hook: 'Sleigh bells play the rhythm of “Jingle Bells”.', note: 'Starts with a card for your sleigh-bell clip.',
    film: 'Sleigh bells, then the chorus rhythm on one note: short, short, long', lesson: '10 Rhythm',
    async run(S) {
      await S.clip('Your clip: sleigh bells');
      S.cap('The chorus');
      const mel = seq('E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4');
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 140 });
      S.cap('Now the rhythm alone, on one note');
      await S.rollPlay(seq('C6 C6 C6:2 C6 C6 C6:2 C6 C6 C6:1.5 C6:.5 C6:4', 0, 'chords'), { bpm: 140, keepRoll: false });
      S.tag('Short, short, long: quarter, quarter, half');
      await S.wait(2);
    },
  },
  {
    week: 4, day: 26, slot: 'Evening', hook: 'The 4-chord loop behind so many Christmas songs.',
    film: 'Sandbox: I – vi – IV – V on repeat, then a bell melody on top', lesson: 'The I – V – vi – IV family',
    async run(S) {
      S.kb(...KB);
      S.cap('I – vi – IV – V');
      await S.prog(P('I', 'vi', 'IV', 'V'), { gap: 1.4 });
      S.cap('Add a bell melody on top');
      const mel = seq('E5 G5 C6:2 C5 E5 A5:2 C5 F5 A5:2 B4 D5 G5:2', 0);
      await Promise.all([S.prog(P('I', 'vi', 'IV', 'V'), { gap: 1.4, light: false }),
        S.notes(mel.map(([x, , d]) => [x, (d * 1.4) / 4]), { light: false })]);
      S.tag('The 50s loop: still in every Christmas playlist');
      await S.prog(P('I'), { gap: 2 });
    },
  },
  {
    week: 4, day: 27, slot: 'Morning', hook: '“Silent Night” drops down. What interval is it?', end: 'quiz',
    film: 'G – A – G – E, then name the drop', lesson: '3 Intervals',
    async run(S) {
      await quiz(S, {
        cap: '“Silent Night”: G, A, G, then down to E. What is that drop?', kb: ['C4', 'C5'],
        play: (on) => S.notes(tune('G4:1.5 A4:.5 G4 E4:3', 100), lit(on)),
        choices: ['Major 3rd', 'Minor 3rd'], answer: 'Minor 3rd',
        after: async () => { await interval(S, 'G4', 'E4', 'Minor 3rd · 3 semitones'); },
      });
    },
  },
  {
    week: 4, day: 27, slot: 'Afternoon', hook: '“The First Noel” climbs one step at a time.',
    film: 'Play the first line slowly, lighting each key: almost only steps', lesson: '3 Intervals',
    async run(S) {
      S.cap('“The First Noel”');
      S.kb('C4', 'C5');
      await S.notes(tune('E4:.5 D4:.5 C4:1.5 D4:.5 E4:.5 F4:.5 G4:2 A4:.5 B4:.5 C5 B4 A4 G4:2', 100), { keep: true });
      S.tag('Almost only steps: one key to the next');
      await S.wait(1.5);
      S.clearKb();
      S.cap('Steps are easy to sing: your voice moves one note at a time');
      await S.notes(tune('E4:.5 D4:.5 C4:1.5 D4:.5 E4:.5 F4:.5 G4:2', 130));
      await S.wait(1);
    },
  },
  {
    week: 4, day: 27, slot: 'Evening', hook: '“Jingle Bells” in a minor key sounds like a horror film.',
    film: 'The chorus as usual, then in C minor (E becomes E♭), slower', lesson: '5 Minor scale',
    async run(S) {
      S.cap('“Jingle Bells”, as you know it');
      const mel = seq(JINGLE);
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 150, chords: JINGLE_CHORDS(L.I, L.IV, L.V) });
      S.cap('Now in C minor: E becomes E♭');
      const minor = seq(JINGLE.replace(/E4/g, 'Eb4'));
      await S.rollPlay(minor, { bpm: 105, keepRoll: false, chords: JINGLE_CHORDS(L.i, L.iv, L.V).map(([l, v, s, d]) => [l === 'I' ? 'i' : l === 'IV' ? 'iv' : l, v, s, d]) });
      S.tag('Change one note, lose all the joy');
      await S.wait(2);
    },
  },
  {
    week: 4, day: 28, slot: 'Morning', hook: 'Christmas Day ear test: one note is wrong.', end: 'quiz',
    film: 'Three bars of “Jingle Bells”, one wrong note; ask which bar', lesson: '4 Major scale',
    async run(S) {
      S.cap('One note is wrong. Which bar?');
      S.kb('C4', 'B4');
      const bars = ['E4 E4 E4:2', 'E4 E4 F4:2', 'E4 G4 C4:1.5 D4:.5 E4:4'];
      for (let i = 0; i < 3; i++) { S.tag(`Bar ${i + 1}`); await S.notes(tune(bars[i], 150), { light: false }); }
      S.tag('');
      await S.ask({ choices: ['Bar 1', 'Bar 2', 'Bar 3'], answer: 'Bar 2', reveal: 'Bar 2: the last note should be E, not F.',
        after: async () => { S.tag('Bar 2, fixed'); await S.notes(tune('E4 E4 E4:2', 150), { keep: true }); await S.wait(1.5); } });
    },
  },
  {
    week: 4, day: 28, slot: 'Afternoon', hook: 'Every church bell hides a minor chord.', note: 'Starts with a card for your bell clip.',
    film: 'A bell, then its 5 main notes one by one on the keyboard, then all together', lesson: '7 Building a chord',
    async run(S) {
      await S.clip('Your clip: a church bell');
      S.cap('One strike, many notes inside');
      S.kb('C3', 'C5');
      const parts = [['C3', 'Hum: an octave below'], ['C4', 'Prime: the note you hear'], ['Eb4', 'Tierce: a minor 3rd'], ['G4', 'Quint: a 5th'], ['C5', 'Nominal: an octave above']];
      for (const [x, t] of parts) { S.tag(t); await S.notes([x], { gap: 1.1, keep: true }); }
      S.cap('All together');
      S.tag('C · E♭ · G: a minor chord');
      await S.chord(parts.map(([x]) => x), { len: 2.8, light: false });
      S.cap('That’s why bells sound a little sad');
      await S.wait(1.5);
    },
  },
  {
    week: 4, day: 28, slot: 'Evening', hook: 'One carol, 5 theory lessons. Merry Christmas!', end: 'learn',
    film: '“Silent Night” taken apart: notes, a minor 3rd, 3 beats, 3 chords, the ending', lesson: '1–11',
    async run(S) {
      const bit = async (title, fn) => { S.reset(); S.cap(title); await fn(); await S.wait(0.6); };
      await bit('1 · The melody', async () => { S.kb('C4', 'C5'); await S.notes(tune('G4:1.5 A4:.5 G4 E4:3', 100)); });
      await bit('2 · A minor 3rd: G down to E', async () => { S.kb('C4', 'C5'); await interval(S, 'G4', 'E4', 'Minor 3rd'); });
      await bit('3 · 3 beats in a bar', async () => { S.beats([3]); await S.pulse([3], { rounds: 2, gap: 0.5 }); });
      await bit('4 · 3 chords: I, IV, V', async () => { S.kb(...KB); await S.prog(P('I', 'IV', 'V'), { gap: 1.1 }); });
      await bit('5 · The ending: V → I', async () => { S.kb(...KB); await S.prog([['V', C.V, 1.2], ['I', C.I, 2]]); });
      S.reset();
      S.cap('Merry Christmas from Everything Sound Academy');
      await S.wait(2);
    },
  },

  // ================= WEEK 5 (26 Dec – 1 Jan): tunes everybody knows, and New Year =================
  {
    week: 5, day: 29, slot: 'Morning', hook: 'Steps or leaps? Trust your ear.', end: 'quiz',
    film: 'A melody that jumps along a chord; ask steps or leaps', lesson: '3 Intervals',
    async run(S) {
      await quiz(S, {
        cap: 'Steps or leaps?', kb: ['C4', 'C5'],
        play: (on) => S.notes(tune('C4 E4 G4 C5 G4 E4 C4:2', 130), lit(on)),
        choices: ['Mostly steps', 'Mostly leaps'], answer: 'Mostly leaps', reveal: 'Leaps: it jumps along the notes of a C major chord.',
      });
    },
  },
  {
    week: 5, day: 29, slot: 'Afternoon', hook: '“Ode to Joy” uses almost only steps. That’s why it’s easy to sing.',
    film: 'Play the first line slowly, lighting each key', lesson: '3 Intervals',
    async run(S) {
      S.cap('“Ode to Joy”, Beethoven');
      S.kb('C4', 'C5');
      await S.notes(tune(ODE, 130));
      S.cap('Count the leaps');
      await S.notes(tune(ODE, 100), { keep: true });
      S.tag('None: every note is a step from the last');
      await S.wait(2);
    },
  },
  {
    week: 5, day: 29, slot: 'Evening', hook: 'Four chords. Hundreds of songs.',
    film: 'Sandbox: I – V – vi – IV in C, then in G', lesson: 'The I – V – vi – IV family',
    async run(S) {
      S.kb(...KB);
      S.cap('I – V – vi – IV');
      await S.prog(P('I', 'V', 'vi', 'IV'), { gap: 1.2 });
      await S.prog(P('I', 'V', 'vi', 'IV'), { gap: 1.2 });
      S.cap('The same 4 in G major');
      S.kb('C3', 'C5');
      await S.prog([['I', G.I], ['V', G.V], ['vi', G.vi], ['IV', G.IV]], { gap: 1.2 });
      S.tag('Any key, the same feeling');
      await S.wait(1.5);
    },
  },
  {
    week: 5, day: 30, slot: 'Morning', hook: 'How many notes in this chord?', end: 'quiz',
    film: 'One chord, played twice; ask 3, 4 or 5', lesson: '8 Sevenths',
    async run(S) {
      await quiz(S, {
        cap: 'How many notes in this chord?', kb: ['C4', 'C5'],
        play: (on) => S.chord(['C4', 'E4', 'G4', 'B4'], { light: on, len: 1.6 }),
        choices: ['3', '4', '5'], answer: '4', reveal: '4: C, E, G and B. A major 7th chord.',
      });
    },
  },
  {
    week: 5, day: 30, slot: 'Afternoon', hook: 'Why “Frère Jacques” works as a round.',
    film: 'One voice, then a second voice starting 2 bars later', lesson: '3 Intervals',
    async run(S) {
      S.cap('“Frère Jacques”: one voice');
      const one = seq('C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2');
      S.rollSetup([...one, ...seq('C5 D5 E5 C5 C5 D5 E5 C5 E5 F5 G5:2 E5 F5 G5:2', 8, 'chords')]);
      await S.rollPlay(one, { bpm: 130 });
      S.cap('Now a second voice, 2 bars later');
      const v1 = [...one, ...seq('G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4', 16)];
      const v2 = seq('C5 D5 E5 C5 C5 D5 E5 C5 E5 F5 G5:2 E5 F5 G5:2', 8, 'chords');
      await S.rollPlay([...v1, ...v2], { bpm: 130, keepRoll: false });
      S.tag('Same tune, overlapping: it makes its own harmony');
      await S.wait(2);
    },
  },
  {
    week: 5, day: 30, slot: 'Evening', hook: 'Same 4 chords. Start on vi and they turn sad.',
    film: 'Sandbox: I – V – vi – IV, then vi – IV – I – V', lesson: 'The I – V – vi – IV family',
    async run(S) {
      S.kb(...KB);
      S.cap('Starting on I');
      await S.prog(P('I', 'V', 'vi', 'IV'), { gap: 1.2 });
      S.cap('Now start on vi');
      await S.prog(P('vi', 'IV', 'I', 'V'), { gap: 1.2 });
      await S.prog(P('vi', 'IV', 'I', 'V'), { gap: 1.2 });
      S.tag('Same chords, a sad first chord: a new mood');
      await S.wait(1.5);
    },
  },
  {
    week: 5, day: 31, slot: 'Morning', hook: 'Semitone, tone, or 3rd?', end: 'quiz',
    film: 'Two notes; three choices; reveal with the keys in between', lesson: '1 Pitch',
    async run(S) {
      await quiz(S, {
        cap: 'Semitone, tone, or minor 3rd?', kb: ['C4', 'C5'],
        play: (on) => S.notes(['D4', 'E4', 'D4', 'E4'], { gap: 0.6, ...lit(on) }),
        choices: ['Semitone', 'Tone', 'Minor 3rd'], answer: 'Tone',
        after: async () => { S.clearKb(); await S.notes(['D4', 'D#4', 'E4'], { gap: 0.6, keep: true }); S.tag('D to E: 2 semitones = 1 tone'); await S.wait(1.8); },
      });
    },
  },
  {
    week: 5, day: 31, slot: 'Afternoon', hook: '“Für Elise” starts with the smallest step in music.',
    film: 'Play the opening, then isolate E – D♯: a semitone', lesson: '1 Pitch',
    async run(S) {
      S.cap('“Für Elise”, Beethoven');
      S.kb('G4', 'F5');
      await S.notes(tune('E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5', 110));
      S.cap('It starts with a wobble: E, D♯, E, D♯');
      await interval(S, 'E5', 'D#5', 'A semitone: the smallest step');
      S.clearKb();
      await S.notes(tune('E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5', 110));
    },
  },
  {
    week: 5, day: 31, slot: 'Evening', hook: 'Pachelbel’s Canon is 8 chords walking downhill.',
    film: 'Sandbox: the 8 chords, then the bass line alone', lesson: '11 Harmonic gravity',
    async run(S) {
      S.kb('C2', 'C5');
      S.cap('Pachelbel’s Canon: 8 chords');
      const canon = [['I', ['C3', 'C4', 'E4', 'G4']], ['V', ['G2', 'B3', 'D4', 'G4']], ['vi', ['A2', 'A3', 'C4', 'E4']], ['iii', ['E2', 'G3', 'B3', 'E4']],
        ['IV', ['F2', 'A3', 'C4', 'F4']], ['I', ['C2', 'G3', 'C4', 'E4']], ['IV', ['F2', 'A3', 'C4', 'F4']], ['V', ['G2', 'B3', 'D4', 'G4']]];
      await S.prog(canon, { gap: 1.3 });
      S.cap('Now just the bass');
      S.clearKb();
      await S.notes(['C3', 'G2', 'A2', 'E2', 'F2', 'C2', 'F2', 'G2'], { gap: 0.8, keep: true, synth: 'bass', cls: 'lh' });
      S.tag('Down a 4th, up a step: a staircase going down');
      await S.prog([['I', C.I, 2.2]], { light: false });
    },
  },
  {
    week: 5, day: 32, slot: 'Morning', hook: 'Beethoven’s 5th: major 3rd or minor 3rd?', end: 'quiz',
    film: 'Da-da-da-DUM, then name the drop', lesson: '3 Intervals',
    async run(S) {
      await quiz(S, {
        cap: 'Da-da-da-DUM. Is the drop a major or minor 3rd?', kb: ['C4', 'A4'],
        play: (on) => S.notes(tune('G4:.5 G4:.5 G4:.5 Eb4:3', 110), lit(on)),
        choices: ['Major 3rd', 'Minor 3rd'], answer: 'Major 3rd',
        reveal: 'Major 3rd: G down to E♭, 4 semitones. The next one, F down to D, is a minor 3rd.',
        after: async () => { await interval(S, 'G4', 'Eb4', 'Major 3rd · 4 semitones'); S.clearKb(); await S.notes(tune('F4:.5 F4:.5 F4:.5 D4:3', 110), { keep: true }); S.tag('Minor 3rd · 3 semitones'); await S.wait(1.5); },
      });
    },
  },
  {
    week: 5, day: 32, slot: 'Afternoon', hook: '“When the Saints Go Marching In” opens with a major 3rd.',
    film: 'Play the opening, then the C – E leap alone', lesson: '3 Intervals',
    async run(S) {
      S.cap('“When the Saints Go Marching In”');
      S.kb('C4', 'C5');
      await S.notes(tune('C4 E4 F4 G4:4 C4 E4 F4 G4:4', 150));
      S.cap('The first leap: C up to E');
      await interval(S, 'C4', 'E4', 'Major 3rd · 4 semitones');
      S.cap('A bright, marching start');
      await S.wait(1);
    },
  },
  {
    week: 5, day: 32, slot: 'Evening', hook: 'The black keys are a ready-made scale.',
    film: 'Play only the black keys, then a random melody on them', lesson: '2 The piano keyboard',
    async run(S) {
      S.kb('C4', 'C6');
      S.cap('Only the black keys');
      await S.notes(['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'], { gap: 0.3, keep: true });
      S.tag('5 notes: the pentatonic scale');
      await S.wait(1.5);
      S.clearKb();
      S.cap('Any order sounds good');
      await S.notes(tune('F#4:.5 G#4:.5 A#4 C#5:.5 A#4:.5 G#4 F#4:.5 D#4:.5 F#4:2 C#5:.5 D#5:.5 F#5 D#5:.5 C#5:.5 A#4:2', 130));
      S.tag('No semitones, so nothing clashes');
      await S.wait(1.5);
    },
  },
  {
    week: 5, day: 33, slot: 'Morning', hook: 'Perfect 4th or perfect 5th?', end: 'quiz',
    film: 'Two notes, then together; reveal with “Twinkle Twinkle”', lesson: '3 Intervals',
    async run(S) {
      await quiz(S, {
        cap: 'Perfect 4th or perfect 5th?', kb: ['C4', 'C5'],
        play: async (on) => { await S.notes(['C4', 'G4'], { gap: 0.8, ...lit(on) }); await S.chord(['C4', 'G4'], { light: on }); },
        choices: ['Perfect 4th', 'Perfect 5th'], answer: 'Perfect 5th', reveal: 'Perfect 5th: C up to G, 7 semitones. Think “Twinkle Twinkle”.',
      });
    },
  },
  {
    week: 5, day: 33, slot: 'Afternoon', hook: 'A cuckoo sings a falling 3rd.', note: 'Starts with a card for your cuckoo clip.',
    film: 'A cuckoo (or a cuckoo clock), then the two notes on the keyboard', lesson: '3 Intervals',
    async run(S) {
      await S.clip('Your clip: a cuckoo or a cuckoo clock');
      S.cap('Cuck-oo: two notes, falling');
      S.kb('C5', 'C6');
      for (let i = 0; i < 3; i++) { await S.notes([['E5', 0.45], ['C5', 0.9]]); }
      await interval(S, 'E5', 'C5', 'A falling major 3rd · 4 semitones');
      S.cap('Real cuckoos sing a 3rd: major or minor');
      await S.wait(1.2);
    },
  },
  {
    week: 5, day: 33, slot: 'Evening', hook: 'Challenge: write a melody on the black keys only. Duet me.', end: 'challenge',
    film: 'Your own 4 bars on the black keys, then “your turn”', lesson: '2 The piano keyboard',
    async run(S) {
      S.cap('Challenge: black keys only');
      S.kb('C4', 'C6');
      const mel = seq('C#5 D#5 F#5:2 D#5 C#5 A#4:2 G#4 A#4 C#5 D#5 C#5:4');
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 120 });
      S.cap('Your turn: 4 bars, black keys only');
      S.tag('Duet this video with yours');
      await S.wait(2.5);
    },
  },
  {
    week: 5, day: 34, slot: 'Morning', hook: 'The last ear test of 2026: perfect 5th or tritone?', end: 'quiz',
    film: 'One interval played together; reveal, then compare with the 5th', lesson: '3 Intervals',
    async run(S) {
      await quiz(S, {
        cap: 'The last ear test of 2026: perfect 5th or tritone?', kb: ['C4', 'C5'],
        play: (on) => S.chord(['C4', 'F#4'], { light: on, len: 1.6 }),
        choices: ['Perfect 5th', 'Tritone'], answer: 'Tritone', reveal: 'Tritone: C to F♯, 6 semitones. Exactly half an octave.',
        after: async () => { await S.chord(['C4', 'F#4'], { len: 1.4 }); S.tag('Tritone'); await S.wait(0.6); S.clearKb(); await S.chord(['C4', 'G4'], { len: 1.4 }); S.tag('Perfect 5th: calm'); await S.wait(1.5); },
      });
    },
  },
  {
    week: 5, day: 34, slot: 'Afternoon', hook: 'Why a countdown makes your heart race: the riser.', note: 'Starts with a card for your fireworks clip.',
    film: 'Fireworks, then a rising, speeding-up line on the keyboard into a big chord', lesson: '1 Pitch',
    async run(S) {
      await S.clip('Your clip: fireworks');
      S.cap('Rising pitch…');
      S.kb('C4', 'C5');
      await S.notes(CHROM.map((x, i) => [x, Math.max(0.12, 0.6 - i * 0.045)]), { keep: true });
      S.cap('…rising speed…');
      S.clearKb();
      await S.notes(CHROM.map((x) => [x, 0.09]), { keep: true });
      S.cap('…and release');
      await S.chord(['C3', 'C4', 'E4', 'G4', 'C5'], { len: 2.4, keep: false });
      S.tag('Higher and faster: your body feels the build-up');
      await S.wait(1.5);
    },
  },
  {
    week: 5, day: 34, slot: 'Evening', hook: 'New Year countdown: every interval from 12 semitones to 1.',
    film: 'Count down from the octave to the semitone, naming each interval; “Happy New Year” on a big chord', lesson: '3 Intervals',
    async run(S) {
      S.kb('C4', 'C5');
      S.cap('Countdown to midnight');
      const names = ['Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave'];
      for (let k = 12; k >= 1; k--) {
        S.clearKb();
        S.mark(['C4', CHROM[k]], 'rh');
        S.tag(`${k} · ${names[k - 1]}`);
        await S.notes(['C4', CHROM[k]], { gap: 0.35, light: false });
        await S.chord(['C4', CHROM[k]], { light: false, len: 0.6, hold: 0.7 });
      }
      S.clearKb();
      S.cap('Happy New Year!');
      S.tag('');
      await S.chord(['C3', 'C4', 'E4', 'G4', 'C5'], { len: 2.6 });
    },
  },
  {
    week: 5, day: 35, slot: 'Morning', hook: 'First ear test of 2027: major or minor?', end: 'quiz',
    film: 'One chord; reveal; compare with the major', lesson: '7 Building a chord',
    async run(S) {
      await quiz(S, {
        cap: 'First ear test of 2027: major or minor?', kb: ['C4', 'C5'],
        play: (on) => S.chord(['D4', 'F4', 'A4'], { light: on, len: 1.6 }),
        choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor: D, F, A. F is a minor 3rd above D.',
        after: async () => { await S.chord(['D4', 'F4', 'A4'], { len: 1.4 }); S.tag('D minor'); await S.wait(0.6); S.clearKb(); await S.chord(['D4', 'F#4', 'A4'], { len: 1.4 }); S.tag('D major: F becomes F♯'); await S.wait(1.5); },
      });
    },
  },
  {
    week: 5, day: 35, slot: 'Afternoon', hook: '“Auld Lang Syne” uses only 5 notes.',
    film: 'Play the first line, then light the 5 notes it uses', lesson: '4 Major scale',
    async run(S) {
      S.cap('“Auld Lang Syne”');
      S.kb('G3', 'A4');
      await S.notes(tune(AULD, 110));
      S.cap('Count the notes it uses');
      S.mark(['C4', 'D4', 'E4', 'G4', 'A4'], 'rh');
      S.mark(['G3'], 'rh');
      S.tag('C · D · E · G · A');
      await S.wait(1.5);
      S.tag('The major scale without F and B: the pentatonic scale');
      await S.notes(tune(AULD, 110), { light: false });
    },
  },
  {
    week: 5, day: 35, slot: 'Evening', hook: 'New year, new skill: music theory from zero starts tomorrow.', end: 'series',
    film: 'A 20-second taste: a note, a scale, a chord, a progression', lesson: '1 Pitch',
    async run(S) {
      S.cap('New year, new skill');
      S.kb('C4', 'C5');
      S.tag('A note');
      await S.notes([['C4', 1]]);
      S.tag('A scale');
      await S.notes(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], { gap: 0.25 });
      S.tag('A chord');
      await S.chord(['C4', 'E4', 'G4'], { keep: false });
      S.kb(...KB);
      S.tag('A progression');
      await S.prog(P('I', 'IV', 'V', 'I'), { gap: 0.9 });
      S.tag('');
      S.cap('Music theory from zero: 14 parts, starting tomorrow');
      await S.wait(2);
    },
  },

  // ================= WEEK 6 (2–8 Jan): music theory from zero, part 1 =================
  {
    week: 6, day: 36, slot: 'Morning', hook: 'Three notes. Which one is highest?', end: 'quiz',
    film: 'Three notes, one after another; reveal with the keys', lesson: '1 Pitch',
    async run(S) {
      await quiz(S, {
        cap: 'Three notes. Which one is highest?', kb: ['C4', 'B5'],
        play: (on) => S.notes(['E5', 'G4', 'C5'], { gap: 0.9, ...lit(on), labels: on ? ['1st', '2nd', '3rd'] : true }),
        choices: ['1st', '2nd', '3rd'], answer: '1st', reveal: 'The 1st: E, the furthest right on the keyboard.',
      });
    },
  },
  {
    week: 6, day: 36, slot: 'Afternoon', hook: 'In the UK, your fridge hums a G.', note: 'Starts with a card for your fridge clip.',
    film: 'Your fridge humming, then a G on the keyboard to match it', lesson: '1 Pitch',
    async run(S) {
      await S.clip('Your clip: your fridge humming');
      S.cap('UK mains power makes a 100 Hz hum');
      S.kb('C2', 'E4');
      await S.notes([['G2', 2.6]], { synth: 'bass', keep: true });
      S.tag('That’s a G, almost exactly (98 Hz)');
      await S.wait(1.4);
      S.cap('Play a G major chord over it');
      await S.chord(['G2', 'G3', 'B3', 'D4'], { len: 2.6 });
      S.tag('Your kitchen is in G');
      await S.wait(1.4);
    },
  },
  {
    week: 6, day: 36, slot: 'Evening', hook: 'Music theory from zero, part 1: what is a note?', end: 'next',
    film: 'Low, middle, high; then the same note an octave apart', lesson: '1 Pitch',
    async run(S) {
      S.cap('Part 1 · What is a note?');
      await S.wait(1.2);
      S.cap('A sound with a pitch: how high or low it is');
      S.kb('C3', 'C6');
      await S.notes(['C3', 'C4', 'C5'], { gap: 0.9, keep: true, labels: ['Low', 'Middle', 'High'] });
      await S.wait(0.8);
      S.cap('Same name, different height');
      S.clearKb();
      await interval(S, 'C4', 'C5', 'C to C: an octave');
      S.cap('Next: the 12 notes');
      await S.wait(1.2);
    },
  },
  {
    week: 6, day: 37, slot: 'Morning', hook: 'Up or down? Easy… or is it?', end: 'quiz',
    film: 'A short melody that wobbles but ends lower', lesson: '1 Pitch',
    async run(S) {
      await quiz(S, {
        cap: 'Does this melody go up or down?', kb: ['C4', 'C5'],
        play: (on) => S.notes(tune('G4 F4 A4 E4 F4 D4 C4:2', 130), lit(on)),
        choices: ['Up', 'Down'], answer: 'Down', reveal: 'Down: it wobbles, but it ends lower than it starts.',
      });
    },
  },
  {
    week: 6, day: 37, slot: 'Afternoon', hook: 'Many car horns play a chord. Here it is.', note: 'Starts with a card for your car-horn clip.',
    film: 'A car horn, then its two notes on the keyboard: a major 3rd', lesson: '3 Intervals',
    async run(S) {
      await S.clip('Your clip: a car horn');
      S.cap('Many car horns play 2 notes at once');
      S.kb('C4', 'C5');
      await S.chord(['G4', 'B4'], { len: 0.5, hold: 0.7 });
      await S.chord(['G4', 'B4'], { len: 1.4 });
      await interval(S, 'G4', 'B4', 'A major 3rd · 4 semitones');
      S.cap('Loud, but not ugly');
      await S.wait(1.2);
    },
  },
  {
    week: 6, day: 37, slot: 'Evening', hook: 'Music theory from zero, part 2: the 12 notes.', end: 'next',
    film: 'White keys, black keys, then the 12 notes repeating', lesson: '2 The piano keyboard',
    async run(S) {
      S.cap('Part 2 · The 12 notes');
      S.kb('C4', 'C5');
      await S.notes(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], { gap: 0.4, keep: true });
      S.tag('7 white keys: C D E F G A B');
      await S.wait(1.4);
      await S.notes(['C#4', 'D#4', 'F#4', 'G#4', 'A#4'], { gap: 0.4, keep: true, cls: 'lh' });
      S.tag('5 black keys, in groups of 2 and 3');
      await S.wait(1.4);
      S.clearKb();
      S.cap('12 notes, then the pattern repeats');
      await S.notes(CHROM, { gap: 0.25, keep: true });
      S.tag('');
      await S.wait(1);
    },
  },
  {
    week: 6, day: 38, slot: 'Morning', hook: 'Same note twice, or two different notes?', end: 'quiz',
    film: 'Two very close notes; reveal: a semitone apart', lesson: '1 Pitch',
    async run(S) {
      await quiz(S, {
        cap: 'Same note twice, or two different notes?', kb: ['F4', 'C5'],
        play: (on) => S.notes(['A4', 'A#4'], { gap: 0.9, ...lit(on) }),
        choices: ['Same', 'Different'], answer: 'Different', reveal: 'Different: A, then A♯, a semitone higher.',
      });
    },
  },
  {
    week: 6, day: 38, slot: 'Afternoon', hook: 'A ticking clock is a metronome at 60 BPM.', note: 'Starts with a card for your clock clip.',
    film: 'A ticking clock, then the beat dots at 60 and 120 BPM', lesson: '10 Rhythm',
    async run(S) {
      await S.clip('Your clip: a ticking clock');
      S.cap('One tick per second = 60 BPM');
      S.beats([4]);
      await S.pulse([4], { gap: 1, rounds: 1 });
      S.cap('120 BPM: twice as fast');
      await S.pulse([4], { gap: 0.5, rounds: 2 });
      S.tag('BPM = beats per minute');
      await S.wait(1.5);
    },
  },
  {
    week: 6, day: 38, slot: 'Evening', hook: 'Music theory from zero, part 3: tones and semitones.', end: 'next',
    film: 'E – F, the next key; then C – D with a key in between', lesson: '1 Pitch',
    async run(S) {
      S.cap('Part 3 · Tones and semitones');
      S.kb('C4', 'C5');
      await S.notes(['E4', 'F4'], { gap: 0.8, keep: true });
      S.tag('Semitone: the very next key');
      await S.wait(1.4);
      S.clearKb();
      await S.notes(['C4', 'C#4', 'D4'], { gap: 0.6, keep: true });
      S.tag('Tone: 2 semitones, one key skipped');
      await S.wait(1.4);
      S.clearKb();
      S.cap('E – F and B – C: no black key between');
      S.mark(['E4', 'F4', 'B4', 'C5'], 'rh');
      S.tag('These two pairs are semitones');
      await S.notes(['E4', 'F4', 'B4', 'C5'], { gap: 0.6, light: false });
      await S.wait(1);
    },
  },
  {
    week: 6, day: 39, slot: 'Morning', hook: 'How many notes did you hear? Count fast.', end: 'quiz',
    film: 'A fast little run; reveal slowly', lesson: '1 Pitch',
    async run(S) {
      await quiz(S, {
        cap: 'How many notes? Count them.', kb: ['C5', 'B5'],
        play: (on) => S.notes(['C5', 'D5', 'E5', 'G5', 'E5'], { gap: on ? 0.5 : 0.17, ...lit(on) }),
        choices: ['4', '5', '6'], answer: '5', reveal: '5: C, D, E, G, E.',
      });
    },
  },
  {
    week: 6, day: 39, slot: 'Afternoon', hook: 'Why wind chimes never sound wrong.', note: 'Starts with a card for your wind-chime clip.',
    film: 'Wind chimes, then 5 notes in random order on the keyboard', lesson: '4 Major scale',
    async run(S) {
      await S.clip('Your clip: wind chimes');
      S.cap('Many wind chimes use just 5 notes');
      S.kb('C5', 'C6');
      await S.notes([['E5', 0.5], ['A5', 0.3], ['C5', 0.7], ['G5', 0.4], ['D5', 0.6], ['A5', 0.3], ['E5', 0.8], ['G5', 0.5], ['C6', 1]]);
      S.mark(['C5', 'D5', 'E5', 'G5', 'A5'], 'rh');
      S.tag('C · D · E · G · A: the pentatonic scale');
      await S.wait(1.2);
      S.cap('No semitones, so any two notes sound good together');
      await S.chord(['D5', 'A5'], { light: false, len: 0.9 });
      await S.chord(['C5', 'E5', 'G5'], { light: false, len: 0.9 });
      await S.chord(['D5', 'G5', 'A5'], { light: false, len: 1.4 });
    },
  },
  {
    week: 6, day: 39, slot: 'Evening', hook: 'Music theory from zero, part 4: intervals.', end: 'next',
    film: 'Three intervals from C, counting the semitones', lesson: '3 Intervals',
    async run(S) {
      S.cap('Part 4 · Intervals: the distance between two notes');
      S.kb('C4', 'C5');
      await interval(S, 'C4', 'E4', 'Major 3rd · 4 semitones');
      await interval(S, 'C4', 'G4', 'Perfect 5th · 7 semitones');
      await interval(S, 'C4', 'C5', 'Octave · 12 semitones');
      S.cap('Count the semitones, then name it');
      await S.wait(1.2);
    },
  },
  {
    week: 6, day: 40, slot: 'Morning', hook: 'Happy or sad? Major or minor chord.', end: 'quiz',
    film: 'One chord; reveal; then hear its minor version', lesson: '7 Building a chord',
    async run(S) {
      await quiz(S, {
        cap: 'Happy or sad? Major or minor chord.', kb: ['C4', 'C5'],
        play: (on) => S.chord(['C4', 'E4', 'G4'], { light: on, len: 1.6 }),
        choices: ['Major (happy)', 'Minor (sad)'], answer: 'Major (happy)',
        after: async () => { await S.chord(['C4', 'E4', 'G4'], { len: 1.4 }); S.tag('C major: C · E · G'); await S.wait(0.8); S.clearKb(); await S.chord(['C4', 'Eb4', 'G4'], { len: 1.4 }); S.tag('C minor: E becomes E♭'); await S.wait(1.5); },
      });
    },
  },
  {
    week: 6, day: 40, slot: 'Afternoon', hook: 'A bugle can only play the notes of one chord.',
    film: 'A bugle-style call on the keyboard, then light its notes: C, E, G', lesson: '7 Building a chord',
    async run(S) {
      S.cap('A bugle has no valves');
      S.kb('G3', 'C5');
      await S.notes(tune('G3:.5 C4:.5 E4:.5 G4 E4:.5 G4:.5 C5:2 G4:.5 E4:.5 C4:2', 120));
      S.cap('Look at the notes it used');
      S.mark(['G3', 'C4', 'E4', 'G4', 'C5'], 'rh');
      S.tag('Only C, E and G: the notes of a C major chord');
      await S.wait(1.6);
      S.cap('A tube on its own only gives these natural notes');
      await S.chord(['C4', 'E4', 'G4', 'C5'], { light: false, len: 2 });
    },
  },
  {
    week: 6, day: 40, slot: 'Evening', hook: 'Music theory from zero, part 5: the major scale.', end: 'next',
    film: 'C major with the tone/semitone pattern, then the same pattern from G', lesson: '4 Major scale',
    async run(S) {
      S.cap('Part 5 · The major scale');
      S.kb('C4', 'B5');
      await S.scale(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
      S.tag('Tone, tone, semitone, tone, tone, tone, semitone');
      await S.wait(1.8);
      S.clearKb();
      S.cap('Same pattern from G: F becomes F♯');
      await S.scale(['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5']);
      await S.wait(1.4);
    },
  },
  {
    week: 6, day: 41, slot: 'Morning', hook: 'This melody stops early. Which note is home?', end: 'quiz',
    film: 'A melody that stops on D; ask for the home note; play it with C at the end', lesson: '4 Major scale',
    async run(S) {
      S.cap('This melody stops early. Which note sounds like home?');
      S.kb('C4', 'C5');
      const mel = tune('E4 D4 E4 F4 G4 F4 E4 D4:2', 120);
      await S.notes(mel, { light: false });
      await S.ask({ choices: ['C', 'D', 'G'], answer: 'C', reveal: 'C: in C major, C is home.',
        after: async () => { await S.notes([...mel, ['C4', 1.6]], { keep: true }); await S.wait(1); } });
    },
  },
  {
    week: 6, day: 41, slot: 'Afternoon', hook: '“Mary Had a Little Lamb” uses only 4 notes.',
    film: 'Play the song, then light C, D, E and G', lesson: '2 The piano keyboard',
    async run(S) {
      S.cap('“Mary Had a Little Lamb”');
      S.kb('C4', 'B4');
      const mary = 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4';
      await S.notes(tune(mary, 150));
      S.mark(['C4', 'D4', 'E4', 'G4'], 'rh');
      S.tag('C · D · E · G: that’s all');
      await S.wait(1.8);
      S.cap('Mostly the first three: an easy start for any beginner');
      await S.wait(1.4);
    },
  },
  {
    week: 6, day: 41, slot: 'Evening', hook: 'Music theory from zero, part 6: the minor scale.', end: 'next',
    film: 'A minor on the white keys, with its own pattern', lesson: '5 Minor scale',
    async run(S) {
      S.cap('Part 6 · The minor scale');
      S.kb('A3', 'C5');
      await S.scale(['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'], { steps: ['T', 'S', 'T', 'T', 'S', 'T', 'T'] });
      S.tag('A minor: the same white keys, a new home');
      await S.wait(1.8);
      S.clearKb();
      S.cap('Major vs minor from the same note');
      await S.notes(['A3', 'B3', 'C#4', 'D4', 'E4'], { gap: 0.35, keep: true });
      await S.wait(0.4);
      S.clearKb();
      await S.notes(['A3', 'B3', 'C4', 'D4', 'E4'], { gap: 0.35, keep: true });
      S.tag('The 3rd note decides: C♯ is major, C is minor');
      await S.wait(1.6);
    },
  },
  {
    week: 6, day: 42, slot: 'Morning', hook: 'Week test: 3 questions, beginner level.', end: 'recap',
    film: 'Higher or lower, tone or semitone, major or minor', lesson: '1–7',
    async run(S) {
      await round(S, [
        { cap: 'Higher or lower?', kb: ['C4', 'C5'], play: () => S.notes(['G4', 'D4'], { gap: 0.8, light: false }), choices: ['Higher', 'Lower'], answer: 'Lower', reveal: 'Lower: G down to D.' },
        { cap: 'Tone or semitone?', kb: ['C4', 'C5'], play: () => S.notes(['B4', 'C5'], { gap: 0.8, light: false }), choices: ['Tone', 'Semitone'], answer: 'Semitone', reveal: 'Semitone: B to C.' },
        { cap: 'Major or minor?', kb: ['C4', 'C5'], play: () => S.chord(['A4', 'C5', 'E4'], { light: false }), choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor: A minor.' },
      ]);
    },
  },
  {
    week: 6, day: 42, slot: 'Afternoon', hook: 'Your footsteps have a tempo.', note: 'Starts with a card for your footsteps clip.',
    film: 'Footsteps, then the beat dots at walking speed with chords', lesson: '10 Rhythm',
    async run(S) {
      await S.clip('Your clip: footsteps');
      S.cap('A relaxed walk: around 110 BPM');
      S.beats([4]);
      await S.pulse([4], { gap: 0.55, rounds: 2 });
      S.cap('Lots of songs sit right there');
      await Promise.all([S.pulse([4], { gap: 0.55, rounds: 4 }), S.prog(P('I', 'V', 'vi', 'IV'), { gap: 2.2, light: false })]);
      S.tag('Music at walking speed makes you move');
      await S.wait(1.4);
    },
  },
  {
    week: 6, day: 42, slot: 'Evening', hook: 'Music theory from zero, part 7: sharps and flats.', end: 'next',
    film: 'One black key, two names; ♯ raises, ♭ lowers', lesson: '6 Enharmony',
    async run(S) {
      S.cap('Part 7 · Sharps and flats');
      S.kb('C4', 'C5');
      S.mark(['C#4'], 'rh', 'C♯ / D♭');
      S.tag('One key, two names');
      await S.notes(['C#4'], { gap: 1.2, light: false });
      S.clearKb();
      S.cap('♯ raises a note by a semitone');
      await S.notes(['C4', 'C#4'], { gap: 0.8, keep: true });
      S.tag('C → C♯');
      await S.wait(1.2);
      S.clearKb();
      S.cap('♭ lowers it by a semitone');
      await S.notes(['D4', 'Db4'], { gap: 0.8, keep: true });
      S.tag('D → D♭: the same key as C♯');
      await S.wait(1.6);
    },
  },

  // ================= WEEK 7 (9–15 Jan): music theory from zero, part 2 =================
  {
    week: 7, day: 43, slot: 'Morning', hook: 'Major, minor or diminished?', end: 'quiz',
    film: 'One chord, three choices', lesson: '7 Building a chord',
    async run(S) {
      await quiz(S, {
        cap: 'Major, minor or diminished?', kb: ['A3', 'A4'],
        play: (on) => S.chord(['B3', 'D4', 'F4'], { light: on, len: 1.6 }),
        choices: ['Major', 'Minor', 'Diminished'], answer: 'Diminished', reveal: 'Diminished: B, D, F. Two minor 3rds stacked.',
      });
    },
  },
  {
    week: 7, day: 43, slot: 'Afternoon', hook: 'Why so many lullabies are in 3.',
    film: 'Brahms’ Lullaby with the 1-2-3 beat dots rocking under it', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Brahms’ Lullaby');
      S.kb('C4', 'C5');
      S.beats([3]);
      const mel = tune('E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5 B4 A4 G4:2', 100);
      await Promise.all([S.notes(mel), S.pulse([3], { rounds: 4, gap: 0.6 })]);
      S.tag('ONE-two-three: it rocks like a cradle');
      await S.wait(1.8);
    },
  },
  {
    week: 7, day: 43, slot: 'Evening', hook: 'Music theory from zero, part 8: your first chord.', end: 'next',
    film: 'Stack 3rds: C – E – G; change the middle note for minor', lesson: '7 Building a chord',
    async run(S) {
      S.cap('Part 8 · Your first chord');
      S.kb('C4', 'C5');
      await S.notes(['C4', 'E4', 'G4'], { gap: 0.7, keep: true });
      S.tag('Skip a note, skip a note: stacked 3rds');
      await S.chord(['C4', 'E4', 'G4'], { len: 1.6 });
      S.clearKb();
      S.cap('Lower the middle note');
      await S.chord(['C4', 'Eb4', 'G4'], { len: 1.6 });
      S.tag('Major or minor: the 3rd decides');
      await S.wait(1.2);
      S.clearKb();
      S.cap('Two more colours');
      await S.chord(['C4', 'Eb4', 'Gb4'], { len: 1.2 });
      S.tag('Diminished');
      await S.wait(0.6);
      S.clearKb();
      await S.chord(['C4', 'E4', 'G#4'], { len: 1.2 });
      S.tag('Augmented');
      await S.wait(1.2);
    },
  },
  {
    week: 7, day: 44, slot: 'Morning', hook: 'Major 7th or dominant 7th?', end: 'quiz',
    film: 'One 7th chord; reveal, then hear where it wants to go', lesson: '8 Sevenths',
    async run(S) {
      await quiz(S, {
        cap: 'Major 7th or dominant 7th?', kb: ['G3', 'G4'],
        play: (on) => S.chord(['G3', 'B3', 'D4', 'F4'], { light: on, len: 1.6 }),
        choices: ['Major 7th', 'Dominant 7th'], answer: 'Dominant 7th', reveal: 'Dominant 7th: G, B, D, F. It wants to move to C.',
        after: async () => { await S.chord(['G3', 'B3', 'D4', 'F4'], { len: 1.2 }); S.clearKb(); await S.chord(['C4', 'E4', 'G4'], { len: 1.8 }); },
      });
    },
  },
  {
    week: 7, day: 44, slot: 'Afternoon', hook: 'The interval horror films can’t live without.',
    film: 'The tritone, slowly; then move one note to a 5th and back', lesson: '3 Intervals',
    async run(S) {
      S.cap('Listen');
      S.kb('C3', 'C5');
      await S.notes([['C3', 1.2], ['F#3', 1.2], ['C3', 1.2], ['F#3', 1.6]], { synth: 'bass' });
      await S.chord(['C4', 'F#4'], { len: 2 });
      S.tag('The tritone: 6 semitones, exactly half an octave');
      await S.wait(1.2);
      S.clearKb();
      S.cap('Move one note up a semitone');
      await S.chord(['C4', 'G4'], { len: 1.6 });
      S.tag('A perfect 5th: calm again');
      await S.wait(1);
      S.clearKb();
      S.cap('…and back');
      await S.chord(['C4', 'F#4'], { len: 2.2 });
      S.tag('');
    },
  },
  {
    week: 7, day: 44, slot: 'Evening', hook: 'Music theory from zero, part 9: 7th chords.', end: 'next',
    film: 'Add one more 3rd: major 7th, dominant 7th, minor 7th', lesson: '8 Sevenths',
    async run(S) {
      S.cap('Part 9 · Add one more 3rd: 7th chords');
      S.kb('C4', 'C5');
      for (const [notes, name] of [[['C4', 'E4', 'G4', 'B4'], 'Major 7th: dreamy'], [['C4', 'E4', 'G4', 'Bb4'], 'Dominant 7th: wants to move'], [['C4', 'Eb4', 'G4', 'Bb4'], 'Minor 7th: soft and sad']]) {
        S.clearKb();
        await S.notes(notes, { gap: 0.35, keep: true });
        await S.chord(notes, { len: 1.6 });
        S.tag(name);
        await S.wait(1);
      }
    },
  },
  {
    week: 7, day: 45, slot: 'Morning', hook: 'In C major: I, IV or V?', end: 'quiz',
    film: 'Home chord first, then a mystery chord', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('Home first: this is I');
      S.kb(...KB);
      await S.prog([['I', C.I, 1.8]], { chips: false, light: false });
      S.cap('Now: I, IV or V?');
      await S.prog([['IV', C.IV, 1.8]], { chips: false, light: false });
      await S.ask({ choices: ['I', 'IV', 'V'], answer: 'IV', reveal: 'IV: F, A, C.', after: async () => { await S.prog(P('I', 'IV', 'I'), { gap: 1.3 }); } });
    },
  },
  {
    week: 7, day: 45, slot: 'Afternoon', hook: 'Why every fanfare sounds royal.',
    film: 'A fanfare call, then its 4ths and 5ths alone', lesson: '3 Intervals',
    async run(S) {
      S.cap('A fanfare');
      S.kb('C4', 'C6');
      await S.notes(tune('G4:.33 G4:.33 G4:.34 C5:1.5 G4:.5 C5:.5 E5:.5 G5:2 E5:.5 C5:.5 G4:.5 C5:2', 110));
      S.cap('Built from 4ths, 5ths and octaves');
      await interval(S, 'G4', 'C5', 'Perfect 4th');
      await interval(S, 'C5', 'G5', 'Perfect 5th');
      S.cap('Open, bright intervals: the sound of a big entrance');
      await S.wait(1.2);
    },
  },
  {
    week: 7, day: 45, slot: 'Evening', hook: 'Music theory from zero, part 10: the 7 chords of a key.', end: 'next',
    film: 'A chord on every note of C major, with its number', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('Part 10 · Every key gives you 7 chords');
      S.kb('C4', 'B5');
      const labels = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
      const scale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'];
      S.chips(labels);
      for (let i = 0; i < 7; i++) { S.chipOn(i); await S.chord([scale[i], scale[i + 2], scale[i + 4]], { keep: false, len: 0.9, hold: 1.1 }); }
      S.chipsOff();
      S.tag('Capital = major · small = minor · ° = diminished');
      await S.wait(2);
    },
  },
  {
    week: 7, day: 46, slot: 'Morning', hook: '2, 3 or 4 beats in a bar?', end: 'quiz',
    film: 'A melody with a soft beat under it; reveal with the beat dots', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Count along: 2, 3 or 4 beats in each bar?');
      const play = () => Promise.all([S.notes(tune('C4 E4 G4 E4 F4 A4 C5 A4 G4:2 E4:2 C4:4', 120)), S.pulse([4], { rounds: 4, gap: 0.5, light: !!S.beatsEl })]);
      await play();
      await S.ask({ choices: ['2', '3', '4'], answer: '4', reveal: '4: ONE-two-three-four.', after: async () => { S.beats([4]); await play(); } });
    },
  },
  {
    week: 7, day: 46, slot: 'Afternoon', hook: 'One tune, 4 speeds: that’s how Grieg builds panic.',
    film: '“In the Hall of the Mountain King”, faster each time', lesson: '10 Rhythm',
    async run(S) {
      S.cap('“In the Hall of the Mountain King”, Grieg');
      S.kb('A3', 'A4');
      const phrase = 'A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4 D#4:.5 B3:.5 D#4 D4:.5 Bb3:.5 D4';
      for (const bpm of [90, 130, 180, 240]) { S.tag(`${bpm} BPM`); await S.notes(tune(phrase, bpm)); }
      S.tag('Faster and faster: accelerando');
      await S.wait(1.5);
    },
  },
  {
    week: 7, day: 46, slot: 'Evening', hook: 'Music theory from zero, part 11: rhythm.', end: 'next',
    film: 'Whole, half, quarter, 8th, 16th: each splits the last in half', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Part 11 · Rhythm: how long each note lasts');
      S.values();
      for (let r = 0; r < 5; r++) await S.valuesPlay(r, 2.2);
      S.tag('Each one splits the last in half');
      await S.wait(1.8);
    },
  },
  {
    week: 7, day: 47, slot: 'Morning', hook: 'Does it end at home, or leave you hanging?', end: 'quiz',
    film: 'A progression that stops on V; then finish it', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('Does it end at home, or leave you hanging?');
      S.kb(...KB);
      await S.prog(P('I', 'IV', 'ii', 'V'), { light: false });
      await S.ask({ choices: ['Home', 'Hanging'], answer: 'Hanging', reveal: 'Hanging: it stops on V. A half cadence.',
        after: async () => { await S.prog([['V', C.V, 1.3], ['I', C.I, 2]]); S.tag('Now it’s home'); await S.wait(1); } });
    },
  },
  {
    week: 7, day: 47, slot: 'Afternoon', hook: 'The gallop rhythm: 3 notes that sound like hooves.',
    film: 'Da-da-DUM on one note, then as a melody', lesson: '10 Rhythm',
    async run(S) {
      S.cap('The gallop: da-da-DUM');
      const r = seq('C5:.25 C5:.25 C5:.5 C5:.25 C5:.25 C5:.5 C5:.25 C5:.25 C5:.5 C5:.5 C5:.5', 0, 'chords');
      S.rollSetup(r);
      await S.rollPlay(r, { bpm: 130 });
      S.tag('Two 16ths and an 8th');
      await S.wait(1);
      S.cap('Now as a melody');
      await S.rollPlay(seq('G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 C5:.5 D5:.5 E5:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 C5:.5 E5:.5 D5:.5'), { bpm: 130, keepRoll: false });
      S.tag('Short-short-long: hooves on the ground');
      await S.wait(1.5);
    },
  },
  {
    week: 7, day: 47, slot: 'Evening', hook: 'Music theory from zero, part 12: harmonic gravity.', end: 'next',
    film: 'The gravity map level by level, then walk down it to I', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('Part 12 · Harmonic gravity');
      S.map({ shown: false });
      S.mapLevel(3);
      S.cap('I is home');
      await S.prog([['I', C.I, 1.8]], { chips: false, light: false, mapOn: true });
      S.mapLevel(2);
      S.cap('V and vii°: the strongest pull home');
      await S.prog([['V', C.V], ['I', C.I, 1.8]], { chips: false, light: false, mapOn: true, gap: 1.4 });
      S.mapLevel(1);
      S.cap('IV and ii: they lead to V');
      await S.prog([['IV', C.IV], ['V', C.V], ['I', C.I, 1.8]], { chips: false, light: false, mapOn: true, gap: 1.4 });
      S.mapLevel(0);
      S.cap('vi and iii: the furthest from home');
      await S.prog([['vi', C.vi], ['ii', C.ii], ['V', C.V], ['I', C.I, 2]], { chips: false, light: false, mapOn: true, gap: 1.4 });
      S.tag('Walk down the map and you always get home');
      await S.wait(1.6);
    },
  },
  {
    week: 7, day: 48, slot: 'Morning', hook: 'Fundamental state or inversion?', end: 'quiz',
    film: 'One chord with the 3rd in the bass; reveal and compare', lesson: '12 Inversions',
    async run(S) {
      await quiz(S, {
        cap: 'Fundamental state or inversion?', kb: ['C3', 'C5'],
        play: (on) => S.chord(['E3', 'G3', 'C4'], { light: on, len: 1.6 }),
        choices: ['Fundamental state', 'Inversion'], answer: 'Inversion', reveal: 'Inversion: C major with E in the bass.',
        after: async () => { await S.chord(['E3', 'G3', 'C4'], { len: 1.4 }); S.tag('E in the bass'); await S.wait(0.6); S.clearKb(); await S.chord(['C3', 'E3', 'G3'], { len: 1.4 }); S.tag('C in the bass: fundamental state'); await S.wait(1.5); },
      });
    },
  },
  {
    week: 7, day: 48, slot: 'Afternoon', hook: '“My Bonnie Lies Over the Ocean” opens with a big leap.',
    film: 'Play the opening, then G up to E: a major 6th', lesson: '3 Intervals',
    async run(S) {
      S.cap('“My Bonnie Lies Over the Ocean”');
      S.kb('E3', 'E4');
      await S.notes(tune('G3 E4:1.5 D4:.5 C4 D4 C4 A3 G3 E3:2', 110));
      S.cap('The first leap: G up to E');
      await interval(S, 'G3', 'E4', 'Major 6th · 9 semitones');
    },
  },
  {
    week: 7, day: 48, slot: 'Evening', hook: 'Music theory from zero, part 13: inversions.', end: 'next',
    film: 'C major with C, then E, then G in the bass; then smooth chord changes', lesson: '12 Inversions',
    async run(S) {
      S.cap('Part 13 · Inversions: same chord, new bass');
      S.kb('C3', 'C5');
      for (const [notes, name] of [[['C3', 'E3', 'G3'], 'C in the bass: fundamental state'], [['E3', 'G3', 'C4'], 'E in the bass: 1st inversion'], [['G3', 'C4', 'E4'], 'G in the bass: 2nd inversion']]) {
        S.clearKb();
        await S.chord(notes, { len: 1.4 });
        S.tag(name);
        await S.wait(1);
      }
      S.cap('Why? Smooth changes, hands barely move');
      S.tag('');
      for (const c of [['C4', 'E4', 'G4'], ['C4', 'F4', 'A4'], ['B3', 'D4', 'G4'], ['C4', 'E4', 'G4']]) await S.chord(c, { keep: false, len: 1, hold: 1.1 });
      await S.wait(0.6);
    },
  },
  {
    week: 7, day: 49, slot: 'Morning', hook: 'The tune moves to a new key. Up or down?', end: 'quiz',
    film: 'A phrase in C, then in A; ask up or down', lesson: '13 Modulation',
    async run(S) {
      await quiz(S, {
        cap: 'The phrase moves to a new key. Up or down?', kb: ['G3', 'G4'],
        play: async (on) => { await S.notes(tune('C4 E4 G4 E4 C4:2', 130), lit(on)); if (on) S.clearKb(); await S.notes(tune('A3 C#4 E4 C#4 A3:2', 130), lit(on)); },
        choices: ['Up', 'Down'], answer: 'Down', reveal: 'Down: C major to A major, a minor 3rd lower.',
      });
    },
  },
  {
    week: 7, day: 49, slot: 'Afternoon', hook: 'Why game coin sounds always go up.',
    film: 'A short coin sound, slowed down: B up to E, a perfect 4th', lesson: '3 Intervals',
    async run(S) {
      S.cap('A coin pick-up: two notes, fast');
      S.kb('G5', 'F6');
      for (let i = 0; i < 3; i++) { await S.notes([['B5', 0.08], ['E6', 0.5]]); }
      S.cap('Slow it down');
      await interval(S, 'B5', 'E6', 'Perfect 4th · 5 semitones');
      S.clearKb();
      S.cap('Short, rising, bright: your brain hears a reward');
      for (let i = 0; i < 2; i++) { await S.notes([['B5', 0.08], ['E6', 0.5]]); }
    },
  },
  {
    week: 7, day: 49, slot: 'Evening', hook: 'Music theory from zero, part 14: changing key.', end: 'learn',
    film: 'A progression in C, then through a shared chord into G', lesson: '13 Modulation',
    async run(S) {
      S.cap('Part 14 · Changing key');
      S.kb('C3', 'C5');
      await S.prog(P('I', 'IV', 'V', 'I'), { gap: 1.2 });
      S.cap('C is I in C major… and IV in G major');
      await S.prog([['I = IV', C.I, 1.8]]);
      S.cap('So it can lead into G');
      await S.prog([['V', G.V], ['I', G.I, 2.2]], { gap: 1.4 });
      S.tag('From C major to G major through a shared chord');
      await S.wait(1.6);
      S.cap('That’s the whole course, from zero. All free in the app.');
      S.tag('');
      await S.wait(2);
    },
  },

  // ================= WEEK 8 (16–22 Jan): rhythm and feel =================
  {
    week: 8, day: 50, slot: 'Morning', hook: 'Straight or swing? Listen to the 8ths.', end: 'quiz',
    film: 'A swung phrase; reveal by playing it straight, then swung', lesson: '10 Rhythm',
    async run(S) {
      const swung = 'C4:.67 E4:.33 G4:.67 E4:.33 A4:.67 G4:.33 E4:.67 C4:.33 D4:2';
      await quiz(S, {
        cap: 'Straight or swing?', kb: ['C4', 'C5'],
        play: (on) => S.notes(tune(swung, 110), lit(on)),
        choices: ['Straight', 'Swing'], answer: 'Swing', reveal: 'Swing: long-short, long-short.',
        after: async () => { S.tag('Straight'); await S.notes(tune(swung.replace(/:\.67|:\.33/g, ':.5'), 110)); S.tag('Swing'); await S.notes(tune(swung, 110)); await S.wait(1); },
      });
    },
  },
  {
    week: 8, day: 50, slot: 'Afternoon', hook: 'A train is a drum kit on rails.', note: 'Starts with a card for your train clip.',
    film: 'A train, then its clickety-clack as a rhythm on the keyboard', lesson: '10 Rhythm',
    async run(S) {
      await S.clip('Your clip: a train');
      S.cap('Clickety-clack');
      const bar = (t) => seq('C3:.25 C3:.25 C3:.5 G2:.5 G2:.5', t, 'bass');
      const r = [0, 2, 4, 6].flatMap(bar);
      S.rollSetup(r);
      await S.rollPlay(r, { bpm: 120 });
      S.tag('The wheels hit the joints in the rails: a repeating rhythm');
      await S.rollPlay(r, { bpm: 150, keepRoll: false });
    },
  },
  {
    week: 8, day: 50, slot: 'Evening', hook: 'Swing it: same melody, new groove.',
    film: 'Sandbox: a melody in straight 8ths, then swung', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Straight 8ths');
      const straight = seq('C4:.5 E4:.5 G4:.5 A4:.5 Bb4:.5 A4:.5 G4:.5 E4:.5 F4:.5 A4:.5 C5:.5 D5:.5 Eb5:.5 D5:.5 C5:.5 A4:.5');
      S.rollSetup(straight);
      await S.rollPlay(straight, { bpm: 110 });
      S.cap('Now swung: long-short');
      const swung = straight.map(([x, s]) => [x, Math.floor(s) + (s % 1 ? 0.67 : 0), s % 1 ? 0.33 : 0.67]);
      await S.rollPlay(swung, { bpm: 110, keepRoll: false });
      S.tag('Same notes, new feel: swing');
      await S.rollPlay(swung, { bpm: 110, keepRoll: false });
    },
  },
  {
    week: 8, day: 51, slot: 'Morning', hook: 'Does this tune start on the beat? Listen.', end: 'quiz',
    film: '“Amazing Grace” with the beat clicks; ask if it starts on beat 1', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Does this tune start on beat 1, or before it?');
      S.kb('G3', 'G4');
      const play = (on) => Promise.all([S.pulse([3], { rounds: 5, gap: 0.55, light: on }), S.notes(tune(`r:2 ${GRACE}`, 109), { light: false })]);
      await play(false);
      await S.ask({ choices: ['On beat 1', 'Before beat 1'], answer: 'Before beat 1', reveal: 'Before: “A-” comes before the strong beat. It’s called an upbeat.',
        after: async () => { S.beats([3]); await play(true); } });
    },
  },
  {
    week: 8, day: 51, slot: 'Afternoon', hook: 'Morse code is pure rhythm. Listen to SOS.',
    film: 'SOS as short and long notes, then the same rhythm with a melody', lesson: '10 Rhythm',
    async run(S) {
      S.cap('SOS in Morse code');
      const dot = 0.15; const dash = 0.45; const gap = 0.12; const letter = 0.4;
      const sos = (a, b) => [[a, dot], [null, gap], [a, dot], [null, gap], [a, dot], [null, letter], [b, dash], [null, gap], [b, dash], [null, gap], [b, dash], [null, letter], [a, dot], [null, gap], [a, dot], [null, gap], [a, dot], [null, 0.8]];
      S.tag('· · ·   — — —   · · ·');
      await S.notes(sos('A5', 'A5'));
      await S.notes(sos('A5', 'A5'));
      S.cap('Rhythm carries a message with no melody at all');
      await S.wait(1.2);
      S.cap('Add two pitches: now it’s music');
      await S.notes(sos('C5', 'G4'));
      await S.notes(sos('E5', 'C5'));
    },
  },
  {
    week: 8, day: 51, slot: 'Evening', hook: 'Syncopation: push a note early.',
    film: 'Sandbox: a phrase on the beat, then with notes between the beats', lesson: '10 Rhythm',
    async run(S) {
      S.cap('On the beat');
      const a = seq('C4 E4 G4 E4 F4 A4 G4:2');
      const b = seq('C4 E4:.5 G4 E4 F4:.5 A4 G4:3');
      S.rollSetup(a);
      await Promise.all([S.rollPlay(a, { bpm: 100 }), S.pulse([4], { rounds: 2, gap: 0.6, light: false })]);
      S.cap('Now push some notes early');
      await Promise.all([S.rollPlay(b, { bpm: 100, keepRoll: false }), S.pulse([4], { rounds: 2, gap: 0.6, light: false })]);
      S.tag('Notes between the beats: syncopation');
      await Promise.all([S.rollPlay(b, { bpm: 100, keepRoll: false }), S.pulse([4], { rounds: 2, gap: 0.6, light: false })]);
    },
  },
  {
    week: 8, day: 52, slot: 'Morning', hook: 'Count the beats: how long is the last note?', end: 'quiz',
    film: 'Four short notes and one long one over a beat', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Count the beats. How long is the last note?');
      const play = (on) => Promise.all([S.pulse([4], { rounds: 2, gap: 0.5, light: on }), S.notes(tune('C4 D4 E4 F4 G4:4', 120))]);
      await play(false);
      await S.ask({ choices: ['1 beat', '2 beats', '4 beats'], answer: '4 beats', reveal: '4 beats: a whole note.', after: async () => { S.beats([4, 4]); await play(true); } });
    },
  },
  {
    week: 8, day: 52, slot: 'Afternoon', hook: 'A ping-pong rally is an accelerando.', note: 'Starts with a card for your ping-pong clip.',
    film: 'A rally, then two notes bouncing faster and faster', lesson: '10 Rhythm',
    async run(S) {
      await S.clip('Your clip: a ping-pong rally');
      S.cap('Ping… pong…');
      const hits = Array.from({ length: 22 }, (_, i) => [i % 2 ? 'G5' : 'C6', Math.max(0.12, 0.75 * 0.9 ** i)]);
      await S.notes(hits, { synth: 'chords' });
      S.tag('Faster and faster: accelerando');
      await S.wait(1.5);
    },
  },
  {
    week: 8, day: 52, slot: 'Evening', hook: 'Dotted rhythms: why some melodies bounce.',
    film: 'Sandbox: even 8ths, then long-short dotted pairs', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Even 8ths');
      const even = seq('C4:.5 D4:.5 E4:.5 F4:.5 G4:.5 F4:.5 E4:.5 D4:.5 C4:2');
      S.rollSetup(even);
      await S.rollPlay(even, { bpm: 100 });
      S.cap('Now long-short');
      await S.rollPlay(seq('C4:.75 D4:.25 E4:.75 F4:.25 G4:.75 F4:.25 E4:.75 D4:.25 C4:2'), { bpm: 100, keepRoll: false });
      S.tag('The dotted rhythm: it bounces');
      await S.wait(1.6);
    },
  },
  {
    week: 8, day: 53, slot: 'Morning', hook: 'Guess the tempo: 60, 90 or 120 BPM?', end: 'quiz',
    film: 'A beat on its own; reveal, then compare 60 and 120', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Guess the tempo: 60, 90 or 120 BPM?');
      await S.pulse([4], { rounds: 2, gap: 0.5, light: false });
      await S.ask({ choices: ['60', '90', '120'], answer: '120', reveal: '120 BPM: two beats every second.',
        after: async () => { S.beats([4]); S.tag('60 BPM'); await S.pulse([4], { rounds: 1, gap: 1 }); S.tag('120 BPM'); await S.pulse([4], { rounds: 2, gap: 0.5 }); } });
    },
  },
  {
    week: 8, day: 53, slot: 'Afternoon', hook: 'Every pop beat is built on this pattern.',
    film: 'Kick on 1 and 3, then the snare on 2 and 4, then the hi-hat', lesson: '10 Rhythm',
    async run(S) {
      S.beats([4]);
      const dots = () => S.beatsEl.querySelectorAll('.sc-dot');
      const bar = async ({ snare, hats }) => {
        for (let b = 0; b < 4; b++) {
          dots()[b].classList.add('on');
          for (let half = 0; half < 2; half++) {
            if (half === 0 && b % 2 === 0) S.sound('C2', 0.15, { synth: 'bass', vel: 0.9 });
            if (half === 0 && b % 2 === 1 && snare) S.sound(['D5', 'F#5', 'A#5'], 0.07, { synth: 'chords', vel: 0.55 });
            if (hats) S.sound('C7', 0.03, { synth: 'chords', vel: 0.22 });
            await S.wait(0.27);
          }
          dots()[b].classList.remove('on');
        }
      };
      S.cap('Kick: beats 1 and 3');
      for (let i = 0; i < 2; i++) await bar({});
      S.cap('Snare: beats 2 and 4');
      for (let i = 0; i < 2; i++) await bar({ snare: true });
      S.cap('Hi-hat: every 8th');
      for (let i = 0; i < 3; i++) await bar({ snare: true, hats: true });
      S.tag('Kick, snare, hi-hat: the backbone of pop');
      await S.wait(1.2);
    },
  },
  {
    week: 8, day: 53, slot: 'Evening', hook: 'Triplets: three notes in the space of two.',
    film: 'Sandbox: 8ths, then triplets, over the same beat', lesson: '10 Rhythm',
    async run(S) {
      S.cap('8ths: 2 per beat');
      const eighths = seq('C4:.5 E4:.5 G4:.5 E4:.5 C4:.5 E4:.5 G4:.5 E4:.5');
      S.rollSetup(eighths);
      await Promise.all([S.rollPlay(eighths, { bpm: 90 }), S.pulse([4], { rounds: 1, gap: 2 / 3, light: false })]);
      S.cap('Triplets: 3 per beat');
      const trip = seq(Array(4).fill('C4:.3333 E4:.3333 G4:.3334').join(' '));
      await Promise.all([S.rollPlay(trip, { bpm: 90, keepRoll: false }), S.pulse([4], { rounds: 1, gap: 2 / 3, light: false })]);
      S.tag('Three in the space of two: triplets');
      await Promise.all([S.rollPlay(trip, { bpm: 90, keepRoll: false }), S.pulse([4], { rounds: 1, gap: 2 / 3, light: false })]);
    },
  },
  {
    week: 8, day: 54, slot: 'Morning', hook: 'Triplets or 8ths?', end: 'quiz',
    film: 'Fast notes over a beat; reveal by playing both', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Triplets or 8ths? Count the notes in each beat.');
      const play = (k) => Promise.all([S.pulse([4], { rounds: 1, gap: 0.6, light: false }), S.notes(Array.from({ length: 4 * k }, (_, i) => [['C5', 'E5', 'G5'][i % 3], 0.6 / k]))]);
      await play(3);
      await S.ask({ choices: ['8ths (2 per beat)', 'Triplets (3 per beat)'], answer: 'Triplets (3 per beat)', reveal: 'Triplets: 3 notes in each beat.',
        after: async () => { S.tag('8ths'); await play(2); S.tag('Triplets'); await play(3); } });
    },
  },
  {
    week: 8, day: 54, slot: 'Afternoon', hook: 'Left, right: why marches are in 2.',
    film: 'A march tune with LEFT-right beat dots', lesson: '10 Rhythm',
    async run(S) {
      S.cap('A march');
      S.kb('G4', 'F5');
      S.beats([2]);
      const mel = tune('G4:.75 G4:.25 C5 C5 E5 D5:.75 C5:.25 B4 C5:2', 110);
      await Promise.all([S.notes(mel), S.pulse([2], { rounds: 4, gap: 60 / 110 })]);
      S.tag('LEFT-right, LEFT-right: two beats, for two feet');
      await Promise.all([S.notes(mel), S.pulse([2], { rounds: 4, gap: 60 / 110 })]);
    },
  },
  {
    week: 8, day: 54, slot: 'Evening', hook: 'Rests are music too.',
    film: 'Sandbox: a phrase with no gaps, then the same notes with rests', lesson: '10 Rhythm',
    async run(S) {
      S.cap('No rests');
      const a = seq('C4 E4 G4 C5 G4 E4 C4:2');
      S.rollSetup(seq('C4 r E4 r G4:.5 C5 r:.5 G4 C4:2'));
      await S.rollPlay(a, { bpm: 110 });
      S.cap('Now with rests');
      await S.rollPlay(seq('C4 r E4 r G4:.5 C5 r:.5 G4 C4:2'), { bpm: 110, keepRoll: false });
      S.tag('Silence makes the notes around it stronger');
      await S.wait(1.6);
    },
  },
  {
    week: 8, day: 55, slot: 'Morning', hook: 'Is there a silence in this rhythm?', end: 'quiz',
    film: 'A rhythm over a beat with one rest; reveal with the beat dots', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Is there a silence in this rhythm?');
      const play = (on) => Promise.all([S.pulse([4], { rounds: 2, gap: 0.5, light: on }), S.notes(tune('C5 C5 r C5 C5 C5 C5:2', 120))]);
      await play(false);
      await S.ask({ choices: ['Yes', 'No'], answer: 'Yes', reveal: 'Yes: beat 3 is a rest. Silence counts too.', after: async () => { S.beats([4, 4]); await play(true); } });
    },
  },
  {
    week: 8, day: 55, slot: 'Afternoon', hook: 'Cha-cha-cha: a dance named after its rhythm.',
    film: 'The rhythm on one note, then with a melody: one, two, cha-cha-cha', lesson: '10 Rhythm',
    async run(S) {
      S.cap('One, two, cha-cha-cha');
      S.kb('C5', 'C6');
      for (let i = 0; i < 2; i++) await S.notes(tune('C5 C5 C5:.5 C5:.5 C5', 110), { light: false, synth: 'chords' });
      S.tag('Quarter, quarter, 8th, 8th, quarter');
      await S.wait(0.6);
      S.cap('Now with notes');
      for (const m of ['E5 G5 A5:.5 A5:.5 A5', 'G5 E5 D5:.5 D5:.5 D5', 'E5 G5 A5:.5 B5:.5 C6:2']) await S.notes(tune(m, 110));
      S.tag('The rhythm says its own name');
      await S.wait(1.2);
    },
  },
  {
    week: 8, day: 55, slot: 'Evening', hook: 'Same tune at 3 speeds, 3 moods.',
    film: 'Sandbox: one melody at 60, 100 and 170 BPM', lesson: '10 Rhythm',
    async run(S) {
      S.kb('C4', 'C5');
      const mel = 'E4 G4 A4 G4 E4 D4 C4:2';
      for (const [bpm, mood] of [[60, 'Slow: thoughtful, a bit sad'], [100, 'Medium: calm'], [170, 'Fast: excited']]) {
        S.cap(`${bpm} BPM`);
        S.tag(mood);
        await S.notes(tune(mel, bpm));
        await S.wait(0.5);
      }
      S.cap('Tempo changes the feeling, not the notes');
      S.tag('');
      await S.wait(1.5);
    },
  },
  {
    week: 8, day: 56, slot: 'Morning', hook: 'Rhythm round: 3 questions.', end: 'recap',
    film: 'Beats per bar, swing or straight, the tempo', lesson: '10 Rhythm',
    async run(S) {
      await round(S, [
        { cap: '2, 3 or 4 beats in a bar?', play: () => S.pulse([3], { rounds: 3, gap: 0.5, light: false }), choices: ['2', '3', '4'], answer: '3', reveal: '3: ONE-two-three.' },
        { cap: 'Straight or swing?', play: () => S.notes(tune('C5:.5 D5:.5 E5:.5 G5:.5 E5:.5 D5:.5 C5', 120)), choices: ['Straight', 'Swing'], answer: 'Straight', reveal: 'Straight: every 8th the same length.' },
        { cap: '60 or 120 BPM?', play: () => S.pulse([4], { rounds: 1, gap: 1, light: false }), choices: ['60', '120'], answer: '60', reveal: '60 BPM: one beat per second.' },
      ]);
    },
  },
  {
    week: 8, day: 56, slot: 'Afternoon', hook: 'Tap a rhythm on any table. I’ll turn it into music.', note: 'Starts with a card for your table-tapping clip.', end: 'learn',
    film: 'You tapping a rhythm, then the same rhythm on one note, then as a melody', lesson: '10 Rhythm',
    async run(S) {
      await S.clip('Your clip: tapping a rhythm on a table');
      S.cap('Your rhythm, on one note');
      const r = 'C5:.5 C5:.5 C5 C5:.5 C5:.5 C5 C5:.75 C5:.25 C5:.5 C5:.5 C5:2';
      const ev = seq(r, 0, 'chords');
      S.rollSetup(seq('C4:.5 E4:.5 G4 A4:.5 G4:.5 E4 F4:.75 E4:.25 D4:.5 E4:.5 C4:2'));
      await S.rollPlay(ev, { bpm: 110 });
      S.cap('Give each tap a note');
      await S.rollPlay(seq('C4:.5 E4:.5 G4 A4:.5 G4:.5 E4 F4:.75 E4:.25 D4:.5 E4:.5 C4:2'), { bpm: 110, keepRoll: false });
      S.tag('Rhythm first, then notes: that’s a melody');
      await S.wait(1.4);
    },
  },
  {
    week: 8, day: 56, slot: 'Evening', hook: 'Challenge: clap this rhythm back. Duet me.', end: 'challenge',
    film: 'A 2-bar rhythm on one note, twice; then “your turn”', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Clap this back');
      const r = seq('C5 C5:.5 C5:.5 r:.5 C5:.5 C5 C5:.75 C5:.25 C5:.5 C5:.5 r C5:2', 0, 'chords');
      S.rollSetup(r);
      await Promise.all([S.rollPlay(r, { bpm: 100 }), S.pulse([4], { rounds: 2, gap: 0.6, light: false })]);
      S.cap('Once more');
      await Promise.all([S.rollPlay(r, { bpm: 100, keepRoll: false }), S.pulse([4], { rounds: 2, gap: 0.6, light: false })]);
      S.cap('Your turn: clap it. Duet this video.');
      await S.pulse([4], { rounds: 2, gap: 0.6, light: false });
    },
  },

  // ================= WEEK 9 (23–29 Jan): harmony tricks =================
  {
    week: 9, day: 57, slot: 'Morning', hook: 'Perfect ending or fake ending?', end: 'quiz',
    film: 'A progression ending V – vi; reveal, then the real ending', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('Does it really end?');
      S.kb(...KB);
      await S.prog(P('I', 'IV', 'V', 'vi'), { light: false });
      await S.ask({ choices: ['Perfect (V → I)', 'Interrupted (V → vi)'], answer: 'Interrupted (V → vi)', reveal: 'Interrupted: V goes to vi instead of home.',
        after: async () => { await S.prog(P('V', 'vi'), { gap: 1.4 }); await S.wait(0.4); await S.prog(P('V', 'I'), { gap: 1.4 }); } });
    },
  },
  {
    week: 9, day: 57, slot: 'Afternoon', hook: 'The sad chord hiding in happy songs.',
    film: 'I – IV – iv – I: the major IV turns minor', lesson: '9 Chords over a scale',
    async run(S) {
      S.kb(...KB);
      S.cap('I – IV – I');
      await S.prog(P('I', 'IV', 'I'), { gap: 1.5 });
      S.cap('Now make the IV minor');
      await S.prog(P('I', 'IV', 'iv', 'I'), { gap: 1.7 });
      S.tag('A becomes A♭: a sad chord borrowed from C minor');
      await S.prog(P('iv', 'I'), { gap: 1.8 });
    },
  },
  {
    week: 9, day: 57, slot: 'Evening', hook: 'Borrow a chord from another key: the V of V.',
    film: 'Sandbox: I – ii – V – I, then swap ii for D major', lesson: '11 Harmonic gravity',
    async run(S) {
      S.kb(...KB);
      S.cap('I – ii – V – I');
      await S.prog(P('I', 'ii', 'V', 'I'), { gap: 1.3 });
      S.cap('Make the ii major: D, F♯, A');
      await S.prog(P('I', 'V/V', 'V', 'I'), { gap: 1.5 });
      S.tag('The V of G: it points to V, which points home');
      await S.wait(1.6);
    },
  },
  {
    week: 9, day: 58, slot: 'Morning', hook: 'Which chord doesn’t belong in C major?', end: 'quiz',
    film: 'Four chords; one has a note from outside the key', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('Which chord doesn’t belong in C major?');
      S.kb(...KB);
      S.chips(['1', '2', '3', '4']);
      await S.prog([['1', C.I], ['2', C.IV], ['3', C.V], ['4', C['V/V']]], { light: false });
      await S.ask({ choices: ['1st', '2nd', '3rd', '4th'], answer: '4th', reveal: '4th: D major. Its F♯ isn’t in C major.',
        after: async () => { await S.prog([['I', C.I], ['IV', C.IV], ['V', C.V], ['D', C['V/V']]]); } });
    },
  },
  {
    week: 9, day: 58, slot: 'Afternoon', hook: 'A sad piece, a happy last chord: the Picardy third.',
    film: 'A progression in C minor ending minor, then ending major', lesson: '5 Minor scale',
    async run(S) {
      S.kb(...KB);
      S.cap('In C minor');
      await S.prog(P('i', 'iv', 'V', 'i'), { gap: 1.5 });
      S.cap('Now end on C major');
      await S.prog([['i', C.i], ['iv', C.iv], ['V', C.V], ['I', C.I, 2.6]], { gap: 1.5 });
      S.tag('E♭ becomes E: the Picardy third, a ray of light');
      await S.wait(1.4);
    },
  },
  {
    week: 9, day: 58, slot: 'Evening', hook: 'ii – V – I: the strongest way home.',
    film: 'The gravity map: ii, V, I lighting up; then with 7ths', lesson: '11 Harmonic gravity',
    async run(S) {
      S.map();
      S.cap('ii – V – I: down the map, level by level');
      await S.prog(P('ii', 'V', 'I'), { light: false, mapOn: true, gap: 1.5 });
      S.cap('Add 7ths: the jazz version');
      await S.prog([['ii7', ['D3', 'F4', 'A4', 'C5']], ['V7', ['G2', 'F4', 'B3', 'D4']], ['Imaj7', ['C3', 'E4', 'G4', 'B4'], 2.4]], { light: false, gap: 1.5 });
      S.tag('Every jazz tune is full of these');
      await S.wait(1.4);
    },
  },
  {
    week: 9, day: 59, slot: 'Morning', hook: 'Sus4 or major? No 3rd allowed.', end: 'quiz',
    film: 'One chord; reveal; then let it resolve', lesson: '7 Building a chord',
    async run(S) {
      await quiz(S, {
        cap: 'Major chord or sus4?', kb: ['C4', 'C5'],
        play: (on) => S.chord(['C4', 'F4', 'G4'], { light: on, len: 1.6 }),
        choices: ['Major', 'Sus4'], answer: 'Sus4', reveal: 'Sus4: C, F, G. No 3rd, so it’s neither major nor minor.',
        after: async () => { await S.chord(['C4', 'F4', 'G4'], { len: 1.3 }); S.clearKb(); await S.chord(['C4', 'E4', 'G4'], { len: 1.8 }); S.tag('F falls to E: resolved'); await S.wait(1.2); },
      });
    },
  },
  {
    week: 9, day: 59, slot: 'Afternoon', hook: 'Why film trailers sit on one low note.',
    film: 'A long low C with chords moving above it', lesson: '11 Harmonic gravity',
    async run(S) {
      S.kb('C2', 'C5');
      S.cap('One low note that never stops');
      S.mark('C2', 'lh');
      S.sound('C2', 10, { synth: 'bass', vel: 0.8 });
      await S.wait(1.5);
      S.cap('Chords move above it');
      await S.prog([['i', ['C3', 'C4', 'Eb4', 'G4']], ['VI', ['C3', 'Ab3', 'C4', 'Eb4']], ['VII', ['C3', 'Bb3', 'D4', 'F4']], ['i', ['C3', 'C4', 'Eb4', 'G4'], 2.4]], { gap: 1.9, light: false });
      S.tag('A pedal note: the chords move, the bass holds');
      await S.wait(1.2);
    },
  },
  {
    week: 9, day: 59, slot: 'Evening', hook: 'Build tension, then release: the sus4.',
    film: 'Sandbox: I – IV – Vsus4 – V – I', lesson: '7 Building a chord',
    async run(S) {
      S.kb(...KB);
      S.cap('I – IV – V – I');
      await S.prog(P('I', 'IV', 'V', 'I'), { gap: 1.2 });
      S.cap('Hold the V back with a sus4');
      await S.prog([['I', C.I], ['IV', C.IV], ['Vsus4', ['G2', 'G3', 'C4', 'D4'], 1.8], ['V', C.V], ['I', C.I, 2.2]], { gap: 1.3 });
      S.tag('C falls to B: tension, then release');
      await S.wait(1.4);
    },
  },
  {
    week: 9, day: 60, slot: 'Morning', hook: 'Does the bass note change? Listen low.', end: 'quiz',
    film: 'Four chords over one bass note; reveal the pedal', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('The chords change. Does the bass note?');
      S.kb('C2', 'C5');
      const ped = [['I', ['C2', 'C4', 'E4', 'G4']], ['IV', ['C2', 'C4', 'F4', 'A4']], ['V', ['C2', 'B3', 'D4', 'G4']], ['I', ['C2', 'C4', 'E4', 'G4']]];
      await S.prog(ped, { light: false, chips: false });
      await S.ask({ choices: ['It changes', 'It stays the same'], answer: 'It stays the same', reveal: 'It stays on C: a pedal note.', after: async () => { await S.prog(ped); } });
    },
  },
  {
    week: 9, day: 60, slot: 'Afternoon', hook: '“Ode to Joy” needs only 2 chords.',
    film: 'The melody with I and V lighting up under it', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('“Ode to Joy”: watch the chords');
      const mel = seq(`${ODE} E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2`);
      S.rollSetup(mel);
      const ch = [['I', 0, 4], ['V', 4, 4], ['I', 8, 4], ['V', 12, 4], ['I', 16, 4], ['V', 20, 4], ['I', 24, 4], ['V', 28, 2], ['I', 30, 2]];
      await S.rollPlay(mel, { bpm: 130, chords: ch.map(([l, s, d]) => [l, L[l], s, d]) });
      S.tag('I and V: that’s all');
      await S.wait(1.8);
    },
  },
  {
    week: 9, day: 60, slot: 'Evening', hook: 'Fake the ending, then really end.',
    film: 'Sandbox: I – IV – V – vi (fake), then IV – V – I (real)', lesson: '11 Harmonic gravity',
    async run(S) {
      S.kb(...KB);
      S.cap('Make them expect home…');
      await S.prog(P('I', 'IV', 'V', 'vi'), { gap: 1.3 });
      S.tag('…and go to vi instead: a fake ending');
      await S.wait(1);
      S.tag('');
      S.cap('Then go round again and really land');
      await S.prog([['IV', C.IV], ['V', C.V], ['I', C.I, 2.4]], { gap: 1.3 });
      S.tag('The surprise makes the real ending feel bigger');
      await S.wait(1.4);
    },
  },
  {
    week: 9, day: 61, slot: 'Morning', hook: 'Major key or minor key? Four chords.', end: 'quiz',
    film: 'A progression in A minor; reveal', lesson: '5 Minor scale',
    async run(S) {
      S.cap('Major key or minor key?');
      S.kb(...KB);
      const am = [['i', ['A2', 'A3', 'C4', 'E4']], ['iv', ['D3', 'D4', 'F4', 'A4']], ['V', ['E3', 'E4', 'G#4', 'B4']], ['i', ['A2', 'A3', 'C4', 'E4'], 2]];
      await S.prog(am, { light: false, chips: false });
      await S.ask({ choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor: A minor, home on Am.', after: async () => { await S.prog(am); } });
    },
  },
  {
    week: 9, day: 61, slot: 'Afternoon', hook: '“Amazing Grace”, moved to its relative minor.',
    film: 'The melody in C major, then the same shape in A minor', lesson: '13 Modulation',
    async run(S) {
      S.cap('“Amazing Grace” in C major');
      S.kb('E3', 'E4');
      await S.notes(tune(GRACE, 100));
      S.cap('Same shape in A minor: same white keys, a new home');
      await S.notes(tune('E3 A3:2 C4:.5 A3:.5 C4:2 B3 A3:2 F3 E3:2', 90));
      S.tag('Relative keys: C major and A minor');
      await S.wait(1.6);
    },
  },
  {
    week: 9, day: 61, slot: 'Evening', hook: 'Turn 4 chords into a walking bass line.',
    film: 'Sandbox: I – vi – ii – V, then a bass walking between the roots', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('I – vi – ii – V');
      const up = { I: ['E4', 'G4', 'C5'], vi: ['E4', 'A4', 'C5'], ii: ['F4', 'A4', 'D5'], V: ['D4', 'G4', 'B4'] };
      const ch = [['I', up.I, 0, 4], ['vi', up.vi, 4, 4], ['ii', up.ii, 8, 4], ['V', up.V, 12, 4], ['I', up.I, 16, 4]];
      const roots = seq('C3:4 A2:4 D3:4 G2:4 C3:4', 0, 'bass');
      S.rollSetup(seq('C3 D3 E3 G3 A2 B2 C3 E3 D3 E3 F3 A3 G2 A2 B2 D3 C3:4', 0, 'bass'));
      await S.rollPlay(roots, { bpm: 110, chords: ch });
      S.cap('Now walk: root on beat 1, steps in between');
      await S.rollPlay(seq('C3 D3 E3 G3 A2 B2 C3 E3 D3 E3 F3 A3 G2 A2 B2 D3 C3:4', 0, 'bass'), { bpm: 110, keepRoll: false, chords: ch });
      S.tag('A walking bass');
      await S.wait(1.2);
    },
  },
  {
    week: 9, day: 62, slot: 'Morning', hook: 'Count the chords: 3, 4 or 5?', end: 'quiz',
    film: 'A loop of chords with no chips; reveal with the names', lesson: '9 Chords over a scale',
    async run(S) {
      S.cap('How many different chords?');
      S.kb(...KB);
      await S.prog(P('I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'), { light: false, chips: false, gap: 1 });
      await S.ask({ choices: ['3', '4', '5'], answer: '4', reveal: '4: I, vi, IV and V, twice round.', after: async () => { await S.prog(P('I', 'vi', 'IV', 'V'), { gap: 1.1 }); } });
    },
  },
  {
    week: 9, day: 62, slot: 'Afternoon', hook: 'The UK national anthem is in 3, not 4. Count it.',
    film: '“God Save the King” with ONE-two-three beat dots', lesson: '10 Rhythm',
    async run(S) {
      S.cap('“God Save the King”: count along');
      S.kb('A3', 'G4');
      const mel = tune('C4 C4 D4 B3:1.5 C4:.5 D4 E4 E4 F4 E4:1.5 D4:.5 C4 D4 C4 B3 C4:3', 90);
      S.beats([3]);
      await Promise.all([S.notes(mel), S.pulse([3], { rounds: 6, gap: 60 / 90 })]);
      S.tag('ONE-two-three: the same time as a waltz');
      await S.wait(1.6);
    },
  },
  {
    week: 9, day: 62, slot: 'Evening', hook: 'The circle of 5ths in 40 seconds.',
    film: 'Key by key up a 5th, adding one sharp each time', lesson: '13 Modulation',
    async run(S) {
      S.cap('Go up a 5th, add one sharp');
      S.kb('G3', 'C5');
      const keys = [['C', ['C4', 'E4', 'G4']], ['G', ['G3', 'B3', 'D4']], ['D', ['D4', 'F#4', 'A4']], ['A', ['A3', 'C#4', 'E4']], ['E', ['E4', 'G#4', 'B4']], ['B', ['B3', 'D#4', 'F#4']], ['F♯', ['F#4', 'A#4', 'C#5']]];
      S.chips(keys.map(([k]) => k));
      for (let i = 0; i < keys.length; i++) {
        S.chipOn(i);
        S.tag(`${keys[i][0]} major · ${i === 0 ? 'no sharps' : i === 1 ? '1 sharp' : `${i} sharps`}`);
        await S.chord(keys[i][1], { keep: false, len: 1.2, hold: 1.5 });
      }
      S.chipsOff();
      S.tag('Each key is next door to the one before');
      await S.wait(1.6);
    },
  },
  {
    week: 9, day: 63, slot: 'Morning', hook: 'The hardest harmony test so far.', end: 'recap',
    film: 'Ending type, sus4 or minor, which 7th: 3 fast questions', lesson: '7–13',
    async run(S) {
      await round(S, [
        { cap: 'Perfect or interrupted?', kb: KB, play: () => S.prog(P('IV', 'V', 'vi'), { light: false, chips: false }), choices: ['Perfect', 'Interrupted'], answer: 'Interrupted', reveal: 'Interrupted: V → vi.' },
        { cap: 'Sus4 or minor?', kb: ['C4', 'C5'], play: () => S.chord(['D4', 'G4', 'A4'], { light: false }), choices: ['Sus4', 'Minor'], answer: 'Sus4', reveal: 'Sus4: D, G, A.' },
        { cap: 'Dominant 7th or major 7th?', kb: ['C4', 'C5'], play: () => S.chord(['C4', 'E4', 'G4', 'B4'], { light: false }), choices: ['Dominant 7th', 'Major 7th'], answer: 'Major 7th', reveal: 'Major 7th: C, E, G, B.' },
      ]);
    },
  },
  {
    week: 9, day: 63, slot: 'Afternoon', hook: 'Coming soon: two melodies at once.', end: 'learn',
    film: 'A preview of Composition & Counterpoint: two lines that fit together', lesson: 'Composition & Counterpoint (coming soon)',
    async run(S) {
      S.cap('Coming soon: Composition & Counterpoint');
      const low = seq('C4:2 D4:2 F4:2 E4:2 D4:2 C4:4');
      const high = seq('G4:2 F4:2 A4:2 G4:2 B4:2 C5:4', 0, 'chords');
      S.rollSetup([...low, ...high]);
      S.tag('Melody 1');
      await S.rollPlay(low, { bpm: 80 });
      S.tag('Melody 2');
      await S.rollPlay(high, { bpm: 80, keepRoll: false });
      S.tag('Together: two melodies, one harmony');
      await S.rollPlay([...low, ...high], { bpm: 80, keepRoll: false });
    },
  },
  {
    week: 9, day: 63, slot: 'Evening', hook: '9 weeks of theory in 60 seconds.',
    film: 'Fast montage of weeks 4–9, ending on the app', lesson: '1–13',
    async run(S) {
      const bit = async (title, fn) => { S.reset(); S.cap(title); await fn(); await S.wait(0.5); };
      await bit('A carol is a scale', async () => { S.kb('C4', 'C5'); await S.notes(tune('C5:1 B4:.75 A4:.25 G4:1.5 F4:.5 E4 D4 C4:2', 130)); });
      await bit('Black keys: the pentatonic', async () => { S.kb('C4', 'C6'); await S.notes(['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5'], { gap: 0.2, keep: true }); });
      await bit('Intervals: count the semitones', async () => { S.kb('C4', 'C5'); await interval(S, 'C4', 'G4', 'Perfect 5th'); });
      await bit('Swing: long-short', () => S.notes(tune('C5:.67 E5:.33 G5:.67 E5:.33 C5:2', 130)));
      await bit('Gravity: ii – V – I', async () => { S.kb(...KB); await S.prog(P('ii', 'V', 'I'), { gap: 0.9 }); });
      await bit('The Picardy third', async () => { S.kb(...KB); await S.prog([['i', C.i, 1], ['V', C.V, 1], ['I', C.I, 1.6]]); });
      S.reset();
      S.cap('All free, in the app');
      await S.wait(1.6);
    },
  },

  // ================= WEEKEND (30–31 Jan): before the new term =================
  {
    week: 10, day: 64, slot: 'Morning', hook: 'The final ear test: 5 questions from 9 weeks.', end: 'recap',
    film: 'Interval, chord, ending, beats per bar, key', lesson: '1–13',
    async run(S) {
      await round(S, [
        { cap: 'Major 3rd or perfect 4th?', kb: ['C4', 'C5'], play: () => S.chord(['C4', 'F4'], { light: false }), choices: ['Major 3rd', 'Perfect 4th'], answer: 'Perfect 4th', reveal: 'Perfect 4th: C to F.' },
        { cap: 'Major or diminished?', kb: ['C4', 'C5'], play: () => S.chord(['B3', 'D4', 'F4'], { light: false }), choices: ['Major', 'Diminished'], answer: 'Diminished', reveal: 'Diminished: B, D, F.' },
        { cap: 'Home or hanging?', kb: KB, play: () => S.prog(P('I', 'ii', 'V'), { light: false, chips: false }), choices: ['Home', 'Hanging'], answer: 'Hanging', reveal: 'Hanging: it stops on V.' },
        { cap: '3 or 4 beats in a bar?', play: () => S.pulse([4], { rounds: 3, gap: 0.45, light: false }), choices: ['3', '4'], answer: '4', reveal: '4: ONE-two-three-four.' },
        { cap: 'Major key or minor key?', kb: KB, play: () => S.prog(P('vi', 'IV', 'V', 'vi'), { light: false, chips: false }), choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor: it keeps coming home to Am.' },
      ]);
    },
  },
  {
    week: 10, day: 64, slot: 'Afternoon', hook: 'Comment a sound. I’ll find its note.', note: 'Starts with a card for a sound from your comments.', end: 'learn',
    film: 'A sound from the comments, then search up the keyboard until it matches', lesson: '1 Pitch',
    async run(S) {
      await S.clip('Your clip: a sound from the comments');
      S.cap('Search up the keyboard until it matches');
      S.kb('C4', 'C5');
      for (const x of ['E4', 'F4', 'G4', 'G#4']) { S.tag(`${x.replace('#', '♯').replace(/\d/, '')}?`); await S.notes([[x, 0.9]]); }
      S.tag('A! Found it');
      await S.notes([['A4', 1.6]], { keep: true });
      S.cap('Comment your sound for the next one');
      await S.wait(1.4);
    },
  },
  {
    week: 10, day: 64, slot: 'Evening', hook: 'Challenge: 4 chords, your melody. Duet me.', end: 'challenge',
    film: 'I – V – vi – IV on repeat with a sample melody, then the chords alone for them', lesson: 'The I – V – vi – IV family',
    async run(S) {
      S.cap('Here’s mine');
      const mel = seq('E4:2 G4 E4 D4:2 B3:2 C4 E4 A4 G4 F4:2 E4 D4');
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 100, chords: [['I', L.I, 0, 4], ['V', L.V, 4, 4], ['vi', L.vi, 8, 4], ['IV', L.IV, 12, 4]] });
      S.cap('Your turn: write a melody over these. Duet me.');
      S.kb(...KB);
      await S.prog(P('I', 'V', 'vi', 'IV'), { gap: 2.4 });
    },
  },
  {
    week: 10, day: 65, slot: 'Morning', hook: 'Speed round: major, minor, diminished, augmented.', end: 'recap',
    film: 'Four chords, four types, fast', lesson: '7 Building a chord',
    async run(S) {
      const types = ['Major', 'Minor', 'Diminished', 'Augmented'];
      await round(S, [
        { cap: 'Which type?', kb: ['C4', 'C5'], play: () => S.chord(['E4', 'G#4', 'C5'], { light: false }), choices: types, answer: 'Augmented', reveal: 'Augmented: E, G♯, C.' },
        { cap: 'Which type?', kb: ['C4', 'C5'], play: () => S.chord(['D4', 'F#4', 'A4'], { light: false }), choices: types, answer: 'Major', reveal: 'Major: D, F♯, A.' },
        { cap: 'Which type?', kb: ['C4', 'C5'], play: () => S.chord(['C#4', 'E4', 'G4'], { light: false }), choices: types, answer: 'Diminished', reveal: 'Diminished: C♯, E, G.' },
        { cap: 'Which type?', kb: ['C4', 'C5'], play: () => S.chord(['E4', 'G4', 'B4'], { light: false }), choices: types, answer: 'Minor', reveal: 'Minor: E, G, B.' },
      ]);
    },
  },
  {
    week: 10, day: 65, slot: 'Afternoon', hook: 'New term? Here’s how to use the free app.', note: 'Starts with a card for your screen recording of the app.', end: 'learn',
    film: 'A screen recording of the course on your phone: lessons, exercises, Sandbox, feedback', lesson: 'Course page',
    async run(S) {
      await S.clip('Your clip: scrolling the app on your phone', 4);
      S.kb('C4', 'C5');
      const parts = [['Lessons', 'Short videos and notes'], ['Exercises', 'Ear and theory drills'], ['Sandbox', 'Make music with what you learn'], ['Feedback', 'Send your work to your teacher']];
      for (const [i, [t, d]] of parts.entries()) { S.cap(t); S.tag(d); await S.chord([['C4', 'E4', 'G4'], ['D4', 'F4', 'A4'], ['E4', 'G4', 'B4'], ['C4', 'F4', 'A4']][i], { keep: false, len: 1, hold: 1.9 }); }
      S.cap('Free, on your phone');
      S.tag('');
      await S.wait(1.4);
    },
  },
  {
    week: 10, day: 65, slot: 'Evening', hook: 'What’s next: sound design and composition.', end: 'learn',
    film: 'A taste of both new courses: game sounds, then two melodies at once', lesson: 'Coming soon',
    async run(S) {
      S.cap('Next: Sound Design for Games');
      S.kb('C4', 'C6');
      S.tag('Success');
      await S.notes([['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.5]], { keep: true });
      await S.wait(0.6);
      S.clearKb();
      S.tag('Error');
      await S.notes([['F5', 0.12], ['D5', 0.12], ['B4', 0.5]], { keep: true });
      await S.wait(0.8);
      S.reset();
      S.cap('And: Composition & Counterpoint');
      const two = [...seq('C4:2 D4:2 F4:2 E4:2 D4:2 C4:4'), ...seq('G4:2 F4:2 A4:2 G4:2 B4:2 C5:4', 0, 'chords')];
      S.rollSetup(two);
      await S.rollPlay(two, { bpm: 90 });
      S.cap('Follow so you don’t miss them');
      await S.wait(1.6);
    },
  },
];

export { SCENES };
SCENES.forEach((s) => { s.id = `d${s.day}-${s.slot.toLowerCase()}`; });
