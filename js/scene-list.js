// The 63 scenes of the TikTok plan (3 weeks × 7 days × morning, afternoon, evening).
// Each run(S) uses the Stage in scenes.js. Notes are names like 'C4', 'F#4', 'Bb3'.
// end: quiz | recap | learn | part2 | challenge (the end card).

// Chords in C major (bass first, then the triad) and a few in G major.
const C = {
  I: ['C3', 'C4', 'E4', 'G4'], ii: ['D3', 'D4', 'F4', 'A4'], iii: ['E3', 'E4', 'G4', 'B4'], IV: ['F3', 'F4', 'A4', 'C5'],
  V: ['G2', 'G3', 'B3', 'D4'], vi: ['A2', 'A3', 'C4', 'E4'], 'vii°': ['B2', 'B3', 'D4', 'F4'],
};
const G = { I: ['G2', 'G3', 'B3', 'D4'], IV: ['C3', 'C4', 'E4', 'G4'], V: ['D3', 'D4', 'F#4', 'A4'], ii: ['A2', 'A3', 'C4', 'E4'] };
const P = (...labels) => labels.map((l) => [l, C[l]]);
const KB = ['G2', 'C5']; // keyboard range for progressions

/** Show an interval: light both notes, play one after the other, then together, and name it. */
async function interval(S, a, b, name) {
  S.clearKb();
  S.mark([a, b], 'rh');
  await S.notes([a, b], { gap: 0.8, light: false });
  await S.chord([a, b], { light: false, len: 1.2 });
  S.tag(name);
  await S.wait(1.6);
}

const SCENES = [
  // ================= WEEK 1: pitch, intervals and scales =================
  {
    week: 1, day: 1, slot: 'Morning', hook: 'Higher or lower? Only 3 seconds.', end: 'quiz',
    async run(S) {
      S.cap('Is the second note higher or lower than the first?');
      S.kb('C4', 'B5');
      await S.notes(['A4', 'F4'], { gap: 0.9, light: false });
      await S.ask({ choices: ['Higher', 'Lower'], answer: 'Lower', reveal: 'Lower: A down to F.',
        after: async () => { await S.notes(['A4', 'F4'], { gap: 0.9, keep: true }); await S.wait(1.5); } });
    },
  },
  {
    week: 1, day: 1, slot: 'Afternoon', hook: 'Church bells use just 4 notes. Here they are.', note: 'Starts with a card for your church-bell clip.',
    async run(S) {
      await S.clip('Your clip: church bells');
      S.cap('The Westminster chime: just 4 notes');
      S.kb('A3', 'B4');
      await S.notes([['G#4', 0.8], ['F#4', 0.8], ['E4', 0.8], ['B3', 1.4]], { keep: true });
      S.tag('G♯ · F♯ · E · B');
      await S.notes([['E4', 0.8], ['G#4', 0.8], ['F#4', 0.8], ['B3', 1.4]], { keep: true });
      S.cap('The big drop: E down to B');
      S.tag('');
      await interval(S, 'E4', 'B3', 'Perfect 4th · 5 semitones');
    },
  },
  {
    week: 1, day: 1, slot: 'Evening', hook: 'I’ll write a melody in 30 seconds using only 2 rules.',
    async run(S) {
      S.cap('Rule 1: only steps and 3rds');
      await S.wait(2);
      S.cap('Rule 2: end on C, home');
      await S.wait(2);
      S.cap('Watch.');
      const mel = [['C4', 0, 1], ['D4', 1, 1], ['E4', 2, 1], ['C4', 3, 1], ['E4', 4, 1], ['F4', 5, 1], ['G4', 6, 1], ['E4', 7, 1],
        ['F4', 8, 1], ['A4', 9, 1], ['G4', 10, 1], ['F4', 11, 1], ['E4', 12, 1], ['D4', 13, 1], ['C4', 14, 2]];
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 110 });
      S.tag('Steps ✓  3rds ✓  ends on C ✓');
      await S.rollPlay(mel, { bpm: 110, keepRoll: false });
    },
  },
  {
    week: 1, day: 2, slot: 'Morning', hook: 'Tone or semitone? Most people guess wrong.', end: 'quiz',
    async run(S) {
      S.cap('Two notes. A tone, or a semitone?');
      S.kb('C4', 'B4');
      await S.notes(['E4', 'F4'], { gap: 0.9, light: false });
      await S.notes(['E4', 'F4'], { gap: 0.9, light: false });
      await S.ask({ choices: ['Tone', 'Semitone'], answer: 'Semitone', reveal: 'Semitone: E to F. There is no key in between.',
        after: async () => { await S.notes(['E4', 'F4'], { gap: 0.9, keep: true }); await S.wait(1.5); } });
    },
  },
  {
    week: 1, day: 2, slot: 'Afternoon', hook: 'Why the shark film theme is just two notes.',
    async run(S) {
      S.cap('Two notes, a semitone apart');
      S.kb('C3', 'B3');
      S.mark(['E3', 'F3'], 'rh');
      await S.notes([['E3', 1.1], ['F3', 1.1], ['E3', 1.1], ['F3', 1.1]], { light: false, synth: 'bass' });
      S.cap('Now closer together…');
      await S.notes([['E3', 0.55], ['F3', 0.55], ['E3', 0.55], ['F3', 0.55]], { light: false, synth: 'bass' });
      await S.notes(Array.from({ length: 10 }, (_, i) => [i % 2 ? 'F3' : 'E3', 0.25]), { light: false, synth: 'bass' });
      S.cap('');
      S.tag('A semitone: the smallest step, the most tension');
      await S.notes(Array.from({ length: 12 }, (_, i) => [i % 2 ? 'F3' : 'E3', 0.18]), { light: false, synth: 'bass' });
      await S.wait(1);
    },
  },
  {
    week: 1, day: 2, slot: 'Evening', hook: 'Every major scale follows one pattern. Here it is.',
    async run(S) {
      S.cap('C major');
      S.kb('C4', 'B5');
      await S.scale(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
      S.tag('T = tone · S = semitone');
      await S.wait(1.5);
      S.cap('Same pattern from F');
      S.clearKb();
      await S.scale(['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5']);
      S.tag('Tone, tone, semitone, tone, tone, tone, semitone');
      await S.wait(2);
    },
  },
  {
    week: 1, day: 3, slot: 'Morning', hook: 'Which one is the octave?', end: 'quiz',
    async run(S) {
      S.cap('First pair…');
      S.kb('C4', 'C5');
      await S.notes(['C4', 'C5'], { gap: 0.8, light: false });
      await S.wait(0.5);
      S.cap('Second pair…');
      await S.notes(['C4', 'B4'], { gap: 0.8, light: false });
      S.cap('Which pair is an octave?');
      await S.ask({ choices: ['First', 'Second'], answer: 'First', reveal: 'The first: C to C, 12 semitones. The second is a major 7th, one semitone short.',
        after: async () => { await S.notes(['C4', 'C5'], { gap: 0.8, keep: true }); await S.wait(1.5); } });
    },
  },
  {
    week: 1, day: 3, slot: 'Afternoon', hook: '“Here Comes the Bride” starts with this interval.',
    async run(S) {
      S.cap('Here comes the bride…');
      S.kb('C4', 'B4');
      await S.notes([['D4', 0.9], ['G4', 0.7], ['G4', 0.25], ['G4', 1.4]], { keep: true });
      S.cap('The first leap: D up to G');
      await interval(S, 'D4', 'G4', 'Perfect 4th · 5 semitones');
    },
  },
  {
    week: 1, day: 3, slot: 'Evening', hook: 'Start a major scale on any key. Watch.',
    async run(S) {
      S.cap('Start on E♭ and follow the pattern');
      S.kb('C4', 'B5');
      await S.scale(['Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5', 'D5', 'Eb5'], { gap: 0.6 });
      S.tag('Same pattern, any starting key');
      await S.notes(['Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5', 'D5', 'Eb5'], { gap: 0.3, light: false });
      await S.wait(1.2);
    },
  },
  {
    week: 1, day: 4, slot: 'Morning', hook: 'Major or minor scale? Trust your ear.', end: 'quiz',
    async run(S) {
      S.cap('Listen to this scale');
      S.kb('C4', 'C5');
      await S.notes(['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'], { gap: 0.4, light: false });
      await S.ask({ choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor. Listen to the 3rd note: E♭.',
        after: async () => {
          S.cap('Major');
          await S.notes(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], { gap: 0.35 });
          S.cap('Minor');
          await S.notes(['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'], { gap: 0.35 });
        } });
    },
  },
  {
    week: 1, day: 4, slot: 'Afternoon', hook: '“Twinkle Twinkle” is secretly an interval lesson.',
    async run(S) {
      S.cap('Twinkle, twinkle, little star…');
      S.kb('C4', 'B4');
      await S.notes([['C4', 0.45], ['C4', 0.45], ['G4', 0.45], ['G4', 0.45], ['A4', 0.45], ['A4', 0.45], ['G4', 0.9]], { keep: true });
      S.cap('The leap: C up to G');
      await interval(S, 'C4', 'G4', 'Perfect 5th · 7 semitones');
    },
  },
  {
    week: 1, day: 4, slot: 'Evening', hook: 'Why minor sounds darker: one note changes everything.',
    async run(S) {
      S.kb('C4', 'B4');
      S.cap('C major');
      await S.chord(['C4', 'E4', 'G4'], { len: 1.6, keep: false });
      S.cap('Lower one note: E becomes E♭');
      S.clearKb();
      S.mark(['C4', 'G4'], 'rh');
      S.mark('Eb4', 'mel');
      await S.chord(['C4', 'Eb4', 'G4'], { len: 1.6, light: false });
      S.tag('Grade 3 decides: major or minor');
      S.cap('Major…');
      await S.chord(['C4', 'E4', 'G4'], { len: 1.2, keep: false });
      S.cap('…minor');
      await S.chord(['C4', 'Eb4', 'G4'], { len: 1.6, keep: false });
    },
  },
  {
    week: 1, day: 5, slot: 'Morning', hook: 'Major 3rd or minor 3rd?', end: 'quiz',
    async run(S) {
      S.cap('Two notes together. Major 3rd or minor 3rd?');
      S.kb('G3', 'G4');
      await S.chord(['A3', 'C4'], { light: false, len: 1.4 });
      await S.chord(['A3', 'C4'], { light: false, len: 1.4 });
      await S.ask({ choices: ['Major 3rd', 'Minor 3rd'], answer: 'Minor 3rd', reveal: 'Minor 3rd: A to C, 3 semitones.',
        after: async () => { await S.chord(['A3', 'C4'], { len: 1.4 }); await S.wait(1); } });
    },
  },
  {
    week: 1, day: 5, slot: 'Afternoon', hook: '“Greensleeves” opens with a minor 3rd.',
    async run(S) {
      S.cap('Greensleeves');
      S.kb('G4', 'G5');
      await S.notes([['A4', 0.4], ['C5', 0.8], ['D5', 0.4], ['E5', 0.6], ['F5', 0.2], ['E5', 0.4], ['D5', 0.8], ['B4', 0.8]], { keep: false });
      S.cap('The first leap: A up to C');
      await interval(S, 'A4', 'C5', 'Minor 3rd · 3 semitones');
    },
  },
  {
    week: 1, day: 5, slot: 'Evening', hook: 'Flip an interval upside down. The maths is beautiful.',
    async run(S) {
      S.kb('C4', 'C5');
      S.cap('C up to E: a 3rd');
      await interval(S, 'C4', 'E4', '3rd');
      S.cap('Flip it: E up to C');
      await interval(S, 'E4', 'C5', '6th');
      S.tag('3 + 6 = 9');
      await S.wait(1.5);
      S.cap('C up to G: a 5th');
      await interval(S, 'C4', 'G4', '5th');
      S.cap('Flip it: G up to C');
      await interval(S, 'G4', 'C5', '4th');
      S.tag('5 + 4 = 9. Always 9.');
      await S.wait(2);
    },
  },
  {
    week: 1, day: 6, slot: 'Morning', hook: 'Find the black key: F♯ or G♭?', end: 'quiz',
    async run(S) {
      S.cap('This black key: F♯ or G♭?');
      S.kb('C4', 'B4');
      S.mark('F#4', 'rh', '?');
      await S.notes(['F#4'], { gap: 1, light: false });
      await S.ask({ choices: ['F♯', 'G♭', 'Both'], answer: 'Both', reveal: 'Both: one key, two names. They are enharmonic.',
        after: async () => { S.mark('F#4', 'rh', 'F♯ G♭'); S.tag('F♯ = G♭'); await S.wait(2.5); } });
    },
  },
  {
    week: 1, day: 6, slot: 'Afternoon', hook: 'Why sirens feel urgent: the interval behind them.',
    async run(S) {
      S.cap('A two-tone siren, slowed down');
      S.kb('A4', 'G5');
      S.mark(['B4', 'E5'], 'rh');
      await S.notes(Array.from({ length: 6 }, (_, i) => [i % 2 ? 'B4' : 'E5', 0.9]), { light: false, len: 0.85 });
      S.cap('Two notes a 4th apart, back and forth');
      S.tag('Perfect 4th, repeated: urgent');
      await S.notes(Array.from({ length: 10 }, (_, i) => [i % 2 ? 'B4' : 'E5', 0.45]), { light: false, len: 0.42 });
      await S.wait(0.8);
    },
  },
  {
    week: 1, day: 6, slot: 'Evening', hook: 'C♯ and D♭: same key, different name. Here’s why it matters.',
    async run(S) {
      S.kb('G4', 'B5');
      S.cap('A major: this key is C♯');
      for (const x of ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5']) await S.notes([x], { gap: 0.45, keep: true, cls: x === 'C#5' ? 'mel' : 'rh' });
      await S.wait(1);
      S.clearKb();
      S.cap('A♭ major: the same key is D♭');
      for (const x of ['Ab4', 'Bb4', 'C5', 'Db5', 'Eb5', 'F5', 'G5', 'Ab5']) await S.notes([x], { gap: 0.45, keep: true, cls: x === 'Db5' ? 'mel' : 'rh' });
      S.tag('Each letter once per scale: so C♯ in A, D♭ in A♭');
      await S.wait(2.5);
    },
  },
  {
    week: 1, day: 7, slot: 'Morning', hook: '90% get this one wrong: name the interval.', end: 'quiz',
    async run(S) {
      S.cap('Name the interval');
      S.kb('C4', 'B4');
      await S.notes(['F4', 'B4'], { gap: 0.8, light: false });
      await S.chord(['F4', 'B4'], { light: false, len: 1.4 });
      await S.ask({ choices: ['Perfect 4th', 'Tritone', 'Perfect 5th', 'Major 3rd'], answer: 'Tritone', reveal: 'Tritone: F to B, 6 semitones. Not a 4th, not a 5th: right in between.',
        after: async () => { S.mark(['F4', 'B4'], 'rh'); await S.chord(['F4', 'B4'], { light: false, len: 1.4 }); await S.wait(1); } });
    },
  },
  {
    week: 1, day: 7, slot: 'Afternoon', hook: '“Happy Birthday” hides an octave leap.',
    async run(S) {
      S.cap('Happy birthday to you…');
      S.kb('F4', 'B5');
      await S.notes([['G4', 0.3], ['G4', 0.2], ['A4', 0.55], ['G4', 0.55], ['C5', 0.55], ['B4', 1.1]]);
      S.cap('Happy birthday dear…');
      await S.notes([['G4', 0.3], ['G4', 0.2], ['G5', 0.6], ['E5', 0.55], ['C5', 1.0]]);
      S.cap('The leap: G up to G');
      await interval(S, 'G4', 'G5', 'Octave · 12 semitones');
    },
  },
  {
    week: 1, day: 7, slot: 'Evening', hook: 'Week 1 recap: can you pass this 5-question test?', end: 'recap',
    async run(S) {
      S.kb('C4', 'B5');
      const q = async (i, text, play, choices, answer, reveal) => {
        S.cap(`${i}/5 · ${text}`);
        S.clearKb();
        await play();
        await S.ask({ choices, answer, reveal, think: 2 });
        S.clearAsk();
      };
      await q(1, 'Higher or lower?', () => S.notes(['E5', 'G5'], { gap: 0.8, light: false }), ['Higher', 'Lower'], 'Higher', 'Higher: E up to G.');
      await q(2, 'Tone or semitone?', () => S.notes(['B4', 'C5'], { gap: 0.8, light: false }), ['Tone', 'Semitone'], 'Semitone', 'Semitone: B to C.');
      await q(3, 'Major or minor 3rd?', () => S.chord(['C4', 'E4'], { light: false }), ['Major 3rd', 'Minor 3rd'], 'Major 3rd', 'Major 3rd: C to E, 4 semitones.');
      await q(4, 'Octave or 7th?', () => S.notes(['D4', 'D5'], { gap: 0.8, light: false }), ['Octave', '7th'], 'Octave', 'Octave: D to D.');
      await q(5, 'Tritone or 5th?', () => S.chord(['C4', 'F#4'], { light: false }), ['Tritone', 'Perfect 5th'], 'Tritone', 'Tritone: C to F♯, 6 semitones.');
    },
  },

  // ================= WEEK 2: chords and harmonic gravity =================
  {
    week: 2, day: 8, slot: 'Morning', hook: 'Major or minor chord? 3 seconds.', end: 'quiz',
    async run(S) {
      S.cap('Major or minor chord?');
      S.kb('C4', 'B4');
      await S.chord(['D4', 'F4', 'A4'], { light: false, len: 1.5 });
      await S.chord(['D4', 'F4', 'A4'], { light: false, len: 1.5 });
      await S.ask({ choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor: D – F – A. A minor 3rd at the bottom.',
        after: async () => { await S.chord(['D4', 'F4', 'A4'], { len: 1.5 }); await S.wait(1); } });
    },
  },
  {
    week: 2, day: 8, slot: 'Afternoon', hook: 'Why game victory jingles all end the same way.',
    async run(S) {
      S.cap('A victory jingle');
      S.kb('C5', 'C6');
      await S.notes([['C5', 0.13], ['E5', 0.13], ['G5', 0.13], ['C6', 0.5]], { keep: true });
      await S.chord(['C5', 'E5', 'G5', 'C6'], { len: 1.4, light: false });
      S.tag('A major arpeggio, landing on C: home');
      await S.wait(1.5);
      S.clearKb();
      S.tag('');
      S.cap('End it anywhere else…');
      await S.notes([['C5', 0.13], ['E5', 0.13], ['G5', 0.13], ['B5', 1.2]], { keep: true });
      S.tag('…and it sounds unfinished');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 8, slot: 'Evening', hook: 'Every chord is built the same way: stacked 3rds.',
    async run(S) {
      S.kb('C4', 'B4');
      S.cap('Start on E');
      await S.notes(['E4'], { gap: 1, keep: true });
      S.cap('Add a major 3rd: G♯');
      await S.notes(['G#4'], { gap: 1, keep: true });
      S.cap('Add a minor 3rd: B');
      await S.notes(['B4'], { gap: 1, keep: true });
      await S.chord(['E4', 'G#4', 'B4'], { len: 1.6, light: false });
      S.tag('Major 3rd + minor 3rd = major chord');
      await S.wait(1.5);
      S.cap('Swap them: minor 3rd, then major 3rd');
      S.tag('');
      await S.chord(['E4', 'G4', 'B4'], { len: 1.6, keep: false });
      S.tag('Minor 3rd + major 3rd = minor chord');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 9, slot: 'Morning', hook: 'Does this progression end, or not?', end: 'quiz',
    async run(S) {
      S.cap('Does it end, or not?');
      S.kb(...KB);
      await S.prog(P('I', 'vi', 'I'), { chips: false, light: false });
      await S.ask({ choices: ['It ends', 'It floats'], answer: 'It floats', reveal: 'It floats: I – vi – I. vi shares two notes with I, so no tension is released.',
        after: async () => { await S.prog(P('I', 'vi', 'I')); await S.wait(1); } });
    },
  },
  {
    week: 2, day: 9, slot: 'Afternoon', hook: 'Why this sound makes you feel something is wrong.',
    async run(S) {
      S.cap('An “error” sound');
      S.kb('G4', 'G5');
      await S.notes([['F5', 0.14], ['D5', 0.14], ['B4', 0.5]], { keep: true });
      await S.chord(['B4', 'D5', 'F5'], { len: 1.2, light: false });
      S.tag('A diminished chord, falling');
      await S.wait(1.5);
      S.cap('Minor 3rd + minor 3rd: unstable');
      S.tag('');
      await S.chord(['B4', 'D5', 'F5'], { len: 1.4, keep: false });
      S.cap('Compare: a major chord, rising');
      await S.notes([['C5', 0.14], ['E5', 0.14], ['G5', 0.6]], { keep: true });
      S.tag('Rising major = success. Falling diminished = error.');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 9, slot: 'Evening', hook: 'This chord makes you want to go home.', end: 'part2',
    async run(S) {
      S.kb(...KB);
      S.cap('Home: C major');
      await S.prog([['I', C.I, 2]]);
      S.cap('Now V…');
      await S.prog([['V', C.V, 3.5]], { len: 3.4 });
      S.cap('Does it bother you that it didn’t finish?');
      await S.wait(2.5);
    },
  },
  {
    week: 2, day: 10, slot: 'Morning', hook: 'Diminished or augmented? The hardest pair.', end: 'quiz',
    async run(S) {
      S.cap('Diminished or augmented?');
      S.kb('C4', 'B4');
      await S.chord(['C4', 'E4', 'G#4'], { light: false, len: 1.5 });
      await S.chord(['C4', 'E4', 'G#4'], { light: false, len: 1.5 });
      await S.ask({ choices: ['Diminished', 'Augmented'], answer: 'Augmented', reveal: 'Augmented: C – E – G♯, two major 3rds.',
        after: async () => {
          await S.chord(['C4', 'E4', 'G#4'], { len: 1.4 });
          S.cap('Diminished, for comparison: two minor 3rds');
          await S.chord(['C4', 'Eb4', 'Gb4'], { len: 1.4, keep: false });
        } });
    },
  },
  {
    week: 2, day: 10, slot: 'Afternoon', hook: 'Part 2: here’s the chord that brings you home.',
    async run(S) {
      S.map();
      S.cap('Yesterday we stopped on V');
      await S.prog([['I', C.I, 1.6], ['V', C.V, 2]], { light: false, mapOn: true });
      S.cap('V → I: the strongest pull home');
      await S.prog([['I', C.I, 1.6], ['V', C.V, 1.6], ['I', C.I, 2.6]], { light: false, mapOn: true });
      S.tag('The perfect cadence');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 10, slot: 'Evening', hook: '4 chords, 4 moods, one root.',
    async run(S) {
      S.kb('C4', 'B4');
      const four = [['Major', ['C4', 'E4', 'G4'], 'major 3rd + minor 3rd'], ['Minor', ['C4', 'Eb4', 'G4'], 'minor 3rd + major 3rd'],
        ['Diminished', ['C4', 'Eb4', 'Gb4'], 'minor 3rd + minor 3rd'], ['Augmented', ['C4', 'E4', 'G#4'], 'major 3rd + major 3rd']];
      for (const [name, notes, how] of four) {
        S.cap(`C ${name.toLowerCase()}`);
        S.tag(how);
        await S.chord(notes, { len: 1.8, keep: false });
        await S.wait(0.6);
      }
      S.tag('');
      S.cap('All four');
      for (const [, notes] of four) await S.chord(notes, { len: 0.9, keep: false, hold: 1 });
    },
  },
  {
    week: 2, day: 11, slot: 'Morning', hook: 'Which chord pulls home the strongest?', end: 'quiz',
    async run(S) {
      S.cap('In C major: which chord pulls home to I the strongest?');
      S.kb(...KB);
      await S.ask({ choices: ['V (G)', 'vi (Am)'], answer: 'V (G)', reveal: 'V. Listen: V → I, then vi → I.',
        after: async () => { await S.prog(P('V', 'I')); await S.wait(0.4); await S.prog(P('vi', 'I')); } });
    },
  },
  {
    week: 2, day: 11, slot: 'Afternoon', hook: 'The “Amen” at the end of hymns is a theory lesson.',
    async run(S) {
      S.kb(...KB);
      S.cap('A…');
      await S.prog([['IV', C.IV, 2]]);
      S.cap('…men');
      await S.prog([['I', C.I, 2.8]]);
      S.chips(['IV', 'I']);
      S.tag('IV → I: the plagal cadence');
      S.cap('');
      await S.prog([['IV', C.IV, 1.8], ['I', C.I, 2.6]]);
    },
  },
  {
    week: 2, day: 11, slot: 'Evening', hook: 'The gravity map, in 40 seconds.',
    async run(S) {
      S.map({ shown: false });
      S.cap('vi and iii: no direct pull home');
      S.mapLevel(0);
      await S.prog(P('vi', 'iii'), { chips: false, light: false, mapOn: true, gap: 1.8 });
      S.cap('IV and ii: a strong pull');
      S.mapLevel(1);
      await S.prog(P('IV', 'ii'), { chips: false, light: false, mapOn: true, gap: 1.8 });
      S.cap('V and vii°: the strongest pull');
      S.mapLevel(2);
      await S.prog(P('V', 'vii°'), { chips: false, light: false, mapOn: true, gap: 1.8 });
      S.cap('…and home');
      S.mapLevel(3);
      await S.prog([['I', C.I, 2.6]], { chips: false, light: false, mapOn: true });
      S.cap('Walk down the map: vi → ii → V → I');
      await S.prog([['vi', C.vi], ['ii', C.ii], ['V', C.V], ['I', C.I, 2.4]], { light: false, mapOn: true, gap: 1.6 });
      S.tag('Learn the map by heart');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 12, slot: 'Morning', hook: 'Fill the gap: I – vi – ? – I', end: 'quiz',
    async run(S) {
      S.cap('Which chord fills the gap and brings it home?');
      S.kb(...KB);
      S.chips(['I', 'vi', '?', 'I']);
      await S.prog([['I', C.I], ['vi', C.vi]], { chips: false, light: false });
      await S.wait(1.2);
      await S.prog([['I', C.I, 1.6]], { chips: false, light: false });
      await S.ask({ choices: ['iii', 'V', 'vi'], answer: 'V', reveal: 'V: from vi, step down the map to V, then home.',
        after: async () => { await S.prog(P('I', 'vi', 'V', 'I')); await S.wait(0.8); } });
    },
  },
  {
    week: 2, day: 12, slot: 'Afternoon', hook: 'A happy key, a sad moment: one chord does it.',
    async run(S) {
      S.kb(...KB);
      S.cap('C major: bright');
      await S.prog(P('I', 'IV', 'V', 'I'));
      S.cap('Now one chord: vi');
      await S.prog([['I', C.I], ['V', C.V], ['vi', C.vi, 3]]);
      S.tag('vi: the minor chord inside a major key');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 12, slot: 'Evening', hook: 'Every major key gives you 7 chords for free.',
    async run(S) {
      S.kb(...KB);
      S.cap('C major: one chord on each grade');
      await S.prog(P('I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'), { gap: 1.1 });
      S.chips(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
      S.tag('Major: I IV V · Minor: ii iii vi · Diminished: vii°');
      await S.wait(3);
    },
  },
  {
    week: 2, day: 13, slot: 'Morning', hook: 'Major 7th or minor 7th chord?', end: 'quiz',
    async run(S) {
      S.cap('A major triad plus a 7th. Major 7th or minor 7th?');
      S.kb('C4', 'B4');
      await S.chord(['C4', 'E4', 'G4', 'B4'], { light: false, len: 1.6 });
      await S.chord(['C4', 'E4', 'G4', 'B4'], { light: false, len: 1.6 });
      await S.ask({ choices: ['Major 7th', 'Minor 7th'], answer: 'Major 7th', reveal: 'Major 7th: C – E – G – B, the 7th one semitone below C.',
        after: async () => {
          await S.chord(['C4', 'E4', 'G4', 'B4'], { len: 1.4 });
          S.cap('Minor 7th, for comparison: B♭');
          await S.chord(['C4', 'E4', 'G4', 'Bb4'], { len: 1.4, keep: false });
        } });
    },
  },
  {
    week: 2, day: 13, slot: 'Afternoon', hook: 'That “dreamy” lo-fi sound is one extra note.',
    async run(S) {
      S.kb('C4', 'G5');
      S.cap('A plain chord: F major');
      await S.chord(['F4', 'A4', 'C5'], { len: 1.6, keep: false });
      S.cap('Add one note: the major 7th, E');
      S.clearKb();
      S.mark(['F4', 'A4', 'C5'], 'rh');
      S.mark('E5', 'mel');
      await S.chord(['F4', 'A4', 'C5', 'E5'], { len: 1.8, light: false });
      S.tag('Major 7th chords: instant lo-fi');
      S.cap('');
      for (let i = 0; i < 2; i++) {
        await S.chord(['F4', 'A4', 'C5', 'E5'], { len: 1.5, keep: false });
        await S.chord(['C4', 'E4', 'G4', 'B4'], { len: 1.5, keep: false });
      }
    },
  },
  {
    week: 2, day: 13, slot: 'Evening', hook: 'Leave home, get lost, come back: 8 bars.',
    async run(S) {
      S.map();
      S.cap('I – vi – iii – IV – ii – V – I');
      await S.prog([['I', C.I], ['vi', C.vi], ['iii', C.iii], ['IV', C.IV], ['ii', C.ii], ['V', C.V], ['I', C.I, 1.25], ['I', C.I, 2]], { light: false, mapOn: true });
      S.tag('Away through vi and iii, home through IV, ii and V');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 14, slot: 'Morning', hook: 'Which progression comes home? Pick one.', end: 'quiz',
    async run(S) {
      S.cap('Which one comes home and confirms the key?');
      S.kb(...KB);
      await S.ask({ choices: ['I – vi – iii – I', 'I – IV – V – I', 'I – V – vi', 'I – ii – vi – I'], answer: 'I – IV – V – I', think: 4,
        reveal: 'I – IV – V – I: V has the strongest pull home. The others end on vi, or reach I from vi or iii.',
        after: async () => { await S.prog(P('I', 'IV', 'V', 'I')); await S.wait(0.6); } });
    },
  },
  {
    week: 2, day: 14, slot: 'Afternoon', hook: 'The fake ending composers use to surprise you.',
    async run(S) {
      S.kb(...KB);
      S.cap('What you expect…');
      await S.prog(P('I', 'IV', 'V', 'I'));
      S.cap('What you get:');
      await S.prog([['I', C.I], ['IV', C.IV], ['V', C.V], ['vi', C.vi, 2.6]]);
      S.tag('V → vi: the deceptive cadence, a fake ending');
      await S.wait(2);
    },
  },
  {
    week: 2, day: 14, slot: 'Evening', hook: 'Week 2 recap: name these 5 chords by ear.', end: 'recap',
    async run(S) {
      S.kb('C4', 'B4');
      const four = ['Major', 'Minor', 'Diminished', 'Augmented'];
      const q = async (i, notes, choices, answer, reveal) => {
        S.cap(`${i}/5 · Name the chord`);
        S.clearKb();
        await S.chord(notes, { light: false, len: 1.4 });
        await S.ask({ choices, answer, reveal, think: 2 });
        S.clearAsk();
      };
      await q(1, ['G4', 'B4', 'D5'], four, 'Major', 'Major: G – B – D.');
      await q(2, ['E4', 'G4', 'B4'], four, 'Minor', 'Minor: E – G – B.');
      await q(3, ['B4', 'D5', 'F5'], four, 'Diminished', 'Diminished: B – D – F.');
      await q(4, ['F4', 'A4', 'C#5'], four, 'Augmented', 'Augmented: F – A – C♯.');
      await q(5, ['G4', 'B4', 'D5', 'F5'], ['Major 7th', 'Minor 7th'], 'Minor 7th', 'Major triad + minor 7th: G – B – D – F.');
    },
  },

  // ================= WEEK 3: rhythm, inversions and modulation =================
  {
    week: 3, day: 15, slot: 'Morning', hook: 'Binary or ternary? Count along.', end: 'quiz',
    async run(S) {
      S.cap('Is each beat split in two, or in three?');
      await S.pulse([3, 3, 3, 3], { gap: 0.22, rounds: 2, light: false });
      await S.ask({ choices: ['Binary (2)', 'Ternary (3)'], answer: 'Ternary (3)', reveal: 'Ternary: 1 a a, 2 a a, 3 a a, 4 a a.',
        after: async () => { S.beats([3, 3, 3, 3]); await S.pulse([3, 3, 3, 3], { gap: 0.22, rounds: 2 }); } });
    },
  },
  {
    week: 3, day: 15, slot: 'Afternoon', hook: 'Your heartbeat has a time signature.', note: 'Starts with a card for your heartbeat clip.',
    async run(S) {
      await S.clip('Your clip: a heartbeat');
      S.cap('Lub-dub: strong, weak');
      S.beats([2, 2, 2, 2]);
      for (let r = 0; r < 3; r++) {
        const dots = [...document.querySelectorAll('.sc-dot')];
        for (let i = 0; i < 8; i++) {
          dots[i].classList.add('on');
          S.sound(i % 2 ? 'E2' : 'C2', 0.2, { synth: 'bass', vel: i % 2 ? 0.5 : 0.95 });
          await S.wait(i % 2 ? 0.55 : 0.25);
          dots[i].classList.remove('on');
        }
      }
      S.tag('Strong, weak, in groups of 2: a binary pulse');
      await S.wait(2);
    },
  },
  {
    week: 3, day: 15, slot: 'Evening', hook: 'One whole note = how many 16ths?', end: 'quiz',
    async run(S) {
      S.cap('One whole note = how many 16th notes?');
      await S.ask({ choices: ['8', '12', '16', '32'], answer: '16', reveal: '16. Each value is half the one before.',
        after: async () => {
          S.clearAsk();
          S.cap('');
          S.values();
          for (let r = 0; r < 5; r++) await S.valuesPlay(r, 2.2, ['C5', 'E5', 'G5', 'C6', 'E6'][r]);
          await S.wait(1);
        } });
    },
  },
  {
    week: 3, day: 16, slot: 'Morning', hook: 'Is this 3/4 or 6/8? Even musicians argue.', end: 'quiz',
    async run(S) {
      S.cap('Six notes. Is it 3/4 or 6/8?');
      await S.pulse([3, 3], { gap: 0.3, rounds: 3, light: false });
      await S.ask({ choices: ['3/4', '6/8'], answer: '6/8', reveal: '6/8: two groups of three. 3/4 is three groups of two.',
        after: async () => {
          S.clearAsk();
          S.cap('6/8: 1 2 3 4 5 6');
          S.beats([3, 3]);
          await S.pulse([3, 3], { gap: 0.3, rounds: 2 });
          S.clearVis();
          S.cap('3/4: 1 2 3 4 5 6');
          S.beats([2, 2, 2]);
          await S.pulse([2, 2, 2], { gap: 0.3, rounds: 2 });
        } });
    },
  },
  {
    week: 3, day: 16, slot: 'Afternoon', hook: 'Why a waltz makes you sway.',
    async run(S) {
      S.cap('1 – 2 – 3, 1 – 2 – 3');
      S.beats([3]);
      const bar = async (bass, chord, mel = null) => {
        const dots = [...document.querySelectorAll('.sc-dot')];
        for (let i = 0; i < 3; i++) {
          dots[i].classList.add('on');
          if (i === 0) { S.sound(bass, 0.5, { synth: 'bass', vel: 0.9 }); if (mel) S.sound(mel, 1.6); }
          else S.sound(chord, 0.3, { synth: 'chords', vel: 0.45 });
          await S.wait(0.55);
          dots[i].classList.remove('on');
        }
      };
      for (let r = 0; r < 2; r++) { await bar('C3', ['E4', 'G4', 'C5']); await bar('G2', ['D4', 'F4', 'B4']); }
      S.cap('Strong, weak, weak: add a melody');
      const mel = ['E5', 'D5', 'C5', 'B4'];
      for (let r = 0; r < 2; r++) { await bar('C3', ['E4', 'G4', 'C5'], mel[r * 2]); await bar('G2', ['D4', 'F4', 'B4'], mel[r * 2 + 1]); }
      S.tag('3/4: one strong beat, two weak ones');
      await S.wait(1.5);
    },
  },
  {
    week: 3, day: 16, slot: 'Evening', hook: 'Same melody, new rhythm, new feeling.',
    async run(S) {
      const even = [['C4', 0, 1], ['D4', 1, 1], ['E4', 2, 1], ['F4', 3, 1], ['G4', 4, 2]];
      const dotted = [['C4', 0, 0.75], ['D4', 0.75, 0.25], ['E4', 1, 0.75], ['F4', 1.75, 0.25], ['G4', 2, 0.75], ['F4', 2.75, 0.25], ['E4', 3, 0.75], ['D4', 3.75, 0.25], ['C4', 4, 2]];
      S.cap('Even quarter notes: calm');
      S.rollSetup(even);
      await S.rollPlay(even, { bpm: 100 });
      S.clearVis();
      S.cap('Dotted: it skips');
      S.rollSetup(dotted);
      await S.rollPlay(dotted, { bpm: 100 });
      S.tag('Same notes, new rhythm, new feeling');
      await S.rollPlay(dotted, { bpm: 100, keepRoll: false });
    },
  },
  {
    week: 3, day: 17, slot: 'Morning', hook: 'Fundamental state or inversion?', end: 'quiz',
    async run(S) {
      S.cap('C major. Which position?');
      S.kb('C4', 'B5');
      await S.chord(['E4', 'G4', 'C5'], { len: 1.5 });
      await S.ask({ choices: ['Fundamental state', 'First inversion', 'Second inversion'], answer: 'First inversion', reveal: 'First inversion: E, the 3rd of C major, is at the bottom.',
        after: async () => { await S.chord(['E4', 'G4', 'C5'], { len: 1.5 }); await S.wait(1); } });
    },
  },
  {
    week: 3, day: 17, slot: 'Afternoon', hook: 'Why pianists barely move their hands.',
    async run(S) {
      S.kb('A3', 'E5');
      S.cap('Every chord in fundamental state: jumps');
      for (const c of [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4']]) await S.chord(c, { len: 1, keep: false, hold: 1.15 });
      S.cap('With inversions: hands barely move');
      for (const c of [['C4', 'E4', 'G4'], ['C4', 'F4', 'A4'], ['B3', 'D4', 'G4'], ['C4', 'E4', 'G4']]) await S.chord(c, { len: 1, keep: false, hold: 1.15 });
      S.tag('Same chords: 1 or 2 notes move a step');
      await S.wait(2);
    },
  },
  {
    week: 3, day: 17, slot: 'Evening', hook: 'Same 4 chords. Jumpy vs smooth.',
    async run(S) {
      S.kb('G3', 'E5');
      S.chips(['I', 'iii', 'vi', 'V', 'I']);
      S.cap('Fundamental state: jumpy');
      const jumpy = [['C4', 'E4', 'G4'], ['E4', 'G4', 'B4'], ['A4', 'C5', 'E5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4']];
      for (let i = 0; i < 5; i++) { S.chipOn(i); await S.chord(jumpy[i], { len: 1.1, keep: false, hold: 1.25 }); }
      S.cap('With inversions: smooth');
      const smooth = [['C4', 'E4', 'G4'], ['B3', 'E4', 'G4'], ['C4', 'E4', 'A4'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4']];
      for (let i = 0; i < 5; i++) { S.chipOn(i); await S.chord(smooth[i], { len: 1.1, keep: false, hold: 1.25 }); }
      S.chipsOff();
      S.tag('V and I stay in fundamental state: a strong ending');
      await S.wait(2);
    },
  },
  {
    week: 3, day: 18, slot: 'Morning', hook: 'Find the real root of this chord.', end: 'quiz',
    async run(S) {
      S.cap('Which chord is this?');
      S.kb('C4', 'B5');
      await S.chord(['E4', 'A4', 'C5'], { len: 1.5 });
      await S.ask({ choices: ['A minor', 'E minor', 'C major', 'E major'], answer: 'A minor', reveal: 'A minor: rearrange in 3rds, A – C – E. E is at the bottom: second inversion.',
        after: async () => { await S.chord(['A4', 'C5', 'E5'], { len: 1.5, keep: false }); await S.wait(1); } });
    },
  },
  {
    week: 3, day: 18, slot: 'Afternoon', hook: 'Why endings stay in fundamental state.',
    async run(S) {
      S.kb('G2', 'C5');
      S.cap('V → I in fundamental state');
      await S.chord(['G3', 'B3', 'D4'], { bass: 'G2', len: 1.3, keep: false });
      await S.chord(['C4', 'E4', 'G4'], { bass: 'C3', len: 2, keep: false });
      S.cap('V → I inverted');
      await S.chord(['B3', 'D4', 'G4'], { bass: 'B2', len: 1.3, keep: false });
      await S.chord(['E4', 'G4', 'C5'], { bass: 'E3', len: 2, keep: false });
      S.tag('Inverted, the ending loses its power');
      await S.wait(2);
    },
  },
  {
    week: 3, day: 18, slot: 'Evening', hook: 'Every key has a relative key. Here’s the shortcut.',
    async run(S) {
      S.kb('A3', 'C5');
      S.cap('C major');
      await S.notes(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], { gap: 0.4 });
      S.cap('A minor');
      await S.notes(['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'], { gap: 0.4 });
      S.cap('Same 7 notes, a different home');
      S.mark('C4', 'rh', 'C');
      S.mark('A3', 'lh', 'A');
      S.tag('Shortcut: 3 semitones down from C is A');
      await S.notes(['C4', 'B3', 'Bb3', 'A3'], { gap: 0.6, light: false });
      await S.wait(1.5);
    },
  },
  {
    week: 3, day: 19, slot: 'Morning', hook: 'Did the key just change?', end: 'quiz',
    async run(S) {
      S.cap('Listen. Did the key change?');
      S.kb(...KB);
      await S.prog(P('I', 'IV', 'V', 'I'), { chips: false, light: false, gap: 1 });
      await S.prog([['I', G.I], ['IV', G.IV], ['V', G.V], ['I', G.I, 1.6]], { chips: false, light: false, gap: 1 });
      await S.ask({ choices: ['Yes', 'No'], answer: 'Yes', reveal: 'Yes: F♯ appeared and G became home. We moved up a 5th, to G major.',
        after: async () => { await S.prog([['V in G', G.V, 1.3], ['I in G', G.I, 1.8]]); } });
    },
  },
  {
    week: 3, day: 19, slot: 'Afternoon', hook: 'The key change at the end of every big ballad.',
    async run(S) {
      S.kb('C4', 'B4');
      const phrase = async (notes, chord) => {
        S.sound(chord, 2.6, { synth: 'chords', vel: 0.4 });
        await S.notes(notes.map((x, i) => [x, i === notes.length - 1 ? 0.9 : 0.4]));
      };
      S.cap('A phrase in C');
      await phrase(['E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4'], ['C3', 'G3', 'C4']);
      await S.wait(0.3);
      S.cap('The same phrase, one step higher');
      await phrase(['F#4', 'E4', 'D4', 'E4', 'F#4', 'F#4', 'F#4'], ['D3', 'A3', 'D4']);
      S.tag('Up a step for the last chorus: an instant lift');
      await S.wait(2);
    },
  },
  {
    week: 3, day: 19, slot: 'Evening', hook: 'Change key smoothly with one shared chord.',
    async run(S) {
      S.kb(...KB);
      S.cap('In C major: I – vi');
      await S.prog([['I', C.I], ['vi', C.vi, 1.8]]);
      S.cap('Am is vi in C… and ii in G');
      S.tag('One chord, two keys');
      await S.wait(2);
      S.cap('So continue in G: ii – V – I');
      await S.prog([['C: I', C.I], ['vi = ii', C.vi], ['G: V', G.V], ['G: I', G.I, 2.4]]);
      S.tag('Smooth: the shared chord carries you over');
      await S.wait(1.5);
    },
  },
  {
    week: 3, day: 20, slot: 'Morning', hook: 'Name the scale grade: speed round.', end: 'recap',
    async run(S) {
      S.cap('C major. Which grade?');
      S.kb('C4', 'C5');
      for (const [x, g] of [['G4', 5], ['E4', 3], ['A4', 6], ['D4', 2], ['B4', 7]]) {
        S.clearKb();
        S.tag('');
        await S.notes([x], { gap: 0.6, keep: true });
        await S.timer(2);
        S.tag(`${x[0]} = grade ${g}`);
        await S.wait(1.3);
      }
    },
  },
  {
    week: 3, day: 20, slot: 'Afternoon', hook: 'Turn any everyday sound into a melody.', note: 'Starts with a card for your everyday-sound clip.',
    async run(S) {
      await S.clip('Your clip: an everyday sound');
      S.cap('Its note: A');
      S.kb('E4', 'F5');
      await S.notes([['A4', 1.4]], { keep: true });
      S.clearVis();
      S.cap('Build 4 bars around it: steps and 3rds, end on A');
      const mel = [['A4', 0, 1], ['C5', 1, 1], ['B4', 2, 1], ['A4', 3, 1], ['C5', 4, 1], ['D5', 5, 1], ['E5', 6, 1], ['C5', 7, 1],
        ['D5', 8, 1], ['B4', 9, 1], ['C5', 10, 1], ['A4', 11, 1], ['B4', 12, 1], ['G4', 13, 1], ['A4', 14, 2]];
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 104 });
      S.tag('One sound → one note → a melody');
      await S.wait(1.5);
    },
  },
  {
    week: 3, day: 20, slot: 'Evening', hook: 'Challenge: write 4 bars with only steps and 3rds. Duet me.', end: 'challenge',
    async run(S) {
      S.cap('My 4 bars: steps and 3rds, ending on G');
      const mel = [['G4', 0, 1], ['A4', 1, 1], ['B4', 2, 1], ['G4', 3, 1], ['B4', 4, 1], ['C5', 5, 1], ['D5', 6, 1], ['B4', 7, 1],
        ['C5', 8, 1], ['E5', 9, 1], ['D5', 10, 1], ['C5', 11, 1], ['B4', 12, 1], ['A4', 13, 1], ['G4', 14, 2]];
      S.rollSetup(mel);
      await S.rollPlay(mel, { bpm: 108 });
      S.cap('Your turn');
      S.tag('Only steps and 3rds · end on home · duet me');
      await S.wait(2.5);
    },
  },
  {
    week: 3, day: 21, slot: 'Morning', hook: 'The hardest ear test so far.', end: 'recap',
    async run(S) {
      S.kb('C4', 'B5');
      const types = ['Major triad + major 7th', 'Major triad + minor 7th', 'Minor triad + minor 7th'];
      const q = async (i, notes, answer, reveal) => {
        S.cap(`${i}/3 · Which 7th chord?`);
        S.clearKb();
        await S.chord(notes, { light: false, len: 1.5 });
        await S.chord(notes, { light: false, len: 1.5 });
        await S.ask({ choices: types, answer, reveal, think: 3 });
        S.clearAsk();
      };
      await q(1, ['F4', 'A4', 'C5', 'E5'], types[0], 'F – A – C – E: major triad + major 7th.');
      await q(2, ['G4', 'B4', 'D5', 'F5'], types[1], 'G – B – D – F: major triad + minor 7th.');
      await q(3, ['D4', 'F4', 'A4', 'C5'], types[2], 'D – F – A – C: minor triad + minor 7th.');
    },
  },
  {
    week: 3, day: 21, slot: 'Afternoon', hook: 'Sound design for games is coming. Here’s a preview.',
    async run(S) {
      S.kb('C4', 'C6');
      S.cap('Success');
      await S.notes([['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.5]], { keep: true });
      S.tag('Rising major arpeggio');
      await S.wait(1.2);
      S.clearKb(); S.tag('');
      S.cap('Error');
      await S.notes([['F5', 0.12], ['D5', 0.12], ['B4', 0.5]], { keep: true });
      S.tag('Falling diminished');
      await S.wait(1.2);
      S.clearKb(); S.tag('');
      S.cap('Level up');
      await S.notes([['C4', 0.07], ['E4', 0.07], ['G4', 0.07], ['C5', 0.07], ['E5', 0.07], ['G5', 0.07], ['C6', 0.3]], { keep: true });
      await S.chord(['C5', 'E5', 'G5', 'C6'], { light: false, len: 1.2 });
      S.tag('Same intervals, a new job: sound design');
      await S.wait(2);
    },
  },
  {
    week: 3, day: 21, slot: 'Evening', hook: '3 weeks of theory in 60 seconds.',
    async run(S) {
      S.kb('G3', 'B5');
      const bit = async (title, fn) => { S.clearKb(); S.tag(''); S.hideChips(); S.cap(title); await fn(); await S.wait(0.6); };
      await bit('Semitone: the smallest step', () => S.notes(['E4', 'F4', 'E4', 'F4'], { gap: 0.4 }));
      await bit('The major scale: T T S T T T S', () => S.scale(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], { gap: 0.3 }));
      await bit('Perfect 4th: here comes the bride', () => S.notes([['D4', 0.7], ['G4', 1]], { keep: true }));
      await bit('Chords: stacked 3rds', () => S.chord(['E4', 'G#4', 'B4'], { len: 1.3 }));
      await bit('Gravity: V → I', async () => { await S.chord(['G3', 'B3', 'D4'], { len: 1, keep: false }); await S.chord(['C4', 'E4', 'G4'], { len: 1.4, keep: false }); });
      await bit('Inversions: smooth', async () => { for (const c of [['C4', 'E4', 'G4'], ['B3', 'E4', 'G4'], ['C4', 'E4', 'A4']]) await S.chord(c, { len: 0.8, keep: false, hold: 0.9 }); });
      await bit('Key change: one step up', async () => {
        await S.notes(['E4', 'D4', 'C4', 'D4', 'E4'], { gap: 0.3 });
        await S.notes(['F#4', 'E4', 'D4', 'E4', 'F#4'], { gap: 0.3 });
      });
      S.cap('All free, in the app');
      await S.wait(1.5);
    },
  },
];

export { SCENES };
SCENES.forEach((s) => { s.id = `d${s.day}-${s.slot.toLowerCase()}`; });
