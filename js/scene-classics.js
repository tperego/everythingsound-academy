// Extra scenes: classical favourites, opera, jazz standards and London sounds.
// Classical and opera melodies here are out of copyright (Tchaikovsky, Mozart, Verdi, Puccini, Bizet, Ravel…).
// Jazz standards are still protected, so those scenes play only chords, roman numerals and rhythm, like the
// producer specials; the presenter plays the tune on camera inside TikTok. Prokofiev is treated the same way.
// Short tunes are written from memory: the presenter checks them by ear before filming.

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const pc = (x) => (PC[x[0]] + (x[1] === '#' ? 1 : x[1] === 'b' ? -1 : 0) + 12) % 12;
const noteName = (m, flats) => `${(flats ? FLAT : SHARP)[m % 12]}${Math.floor(m / 12) - 1}`;
const pretty = (sym) => sym.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭').replace('m7b5', 'm7♭5');

const QUAL = {
  '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7, 12], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], dim: [0, 3, 6], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], sus4: [0, 5, 7],
};
/** 'Cm7', 'Bbmaj7', 'Am7b5', 'D7', 'E/G#' -> [bass, ...upper]: bass E2–D♯3, upper root G3–F♯4. */
function ch(sym, { flats = null } = {}) {
  const m = /^([A-G][#b]?)(maj7|m7b5|m7|m6|m|dim7|dim|sus4|7|6|5)?(?:\/([A-G][#b]?))?$/.exec(sym);
  if (!m) throw new Error(`Bad chord ${sym}`);
  const fl = flats ?? (/b/.test(m[1]) || ['F', 'Dm', 'Gm', 'Cm', 'Fm'].includes(m[1] + (m[2] === 'm' ? 'm' : '')));
  const r = pc(m[1]);
  const top = 55 + ((r - 7 + 12) % 12);
  const b = m[3] ? pc(m[3]) : r;
  return [noteName(40 + ((b - 4 + 12) % 12), fl), ...QUAL[m[2] || ''].map((i) => noteName(top + i, fl))];
}
/** [['Cm7', 'ii'], ...] -> a progression for S.prog with chips like "Cm7 · ii". */
const prog = (list, numerals = true) => list.map(([sym, rn, gap]) => {
  const row = [numerals && rn ? `${pretty(sym)} · ${rn}` : pretty(sym), ch(sym)];
  if (gap) row.push(gap);
  return row;
});
/** 'G4:1.5 A4:.5 r:1' at a tempo -> [[note | null, seconds], ...] for S.notes. */
const tune = (str, bpm = 100) => str.trim().split(/\s+/).map((tok) => {
  const [x, d = '1'] = tok.split(':');
  return [x === 'r' ? null : x, (Number(d) * 60) / bpm];
});
const KB = ['D2', 'G5'];

/** Plays a rhythm on one sound: durations in beats; '>' before a value makes it louder. */
async function rhythm(S, durs, { bpm = 100, note = 'C5', vel = 0.55, accent = 0.9, len = 0.09 } = {}) {
  for (const d of durs) {
    const strong = String(d).startsWith('>');
    const beats = Number(String(d).replace('>', ''));
    S.sound(note, len, { synth: 'chords', vel: strong ? accent : vel });
    await S.wait((beats * 60) / bpm);
  }
}
/** Oom-pah-pah: bass on 1, chord on 2 and 3, for each [label, chord symbol] bar. */
async function waltz(S, bars, { bpm = 160, chips = true } = {}) {
  if (chips) S.chips(bars.map(([label]) => label));
  const beat = 60 / bpm;
  for (let i = 0; i < bars.length; i++) {
    if (chips) S.chipOn(i);
    const [bass, ...upper] = ch(bars[i][1]);
    if (S.kbBox) { S.clearKb(); S.mark(upper, 'rh', false); S.mark(bass, 'lh', false); }
    if (S.beatsEl) S.beatsEl.querySelectorAll('.sc-dot').forEach((d, k) => d.classList.toggle('on', k === 0));
    S.sound(bass, beat * 0.9, { synth: 'bass', vel: 0.8 });
    await S.wait(beat);
    for (let k = 1; k < 3; k++) {
      if (S.beatsEl) S.beatsEl.querySelectorAll('.sc-dot').forEach((d, j) => d.classList.toggle('on', j === k));
      S.sound(upper, beat * 0.6, { synth: 'chords', vel: 0.45 });
      await S.wait(beat);
    }
  }
  if (S.beatsEl) S.beatsEl.querySelectorAll('.sc-dot').forEach((d) => d.classList.remove('on'));
  if (chips) S.chipsOff();
}
/** An ear question: play, choices, countdown, answer, play again. */
async function quiz(S, { cap, play, choices, answer, reveal, think = 3 }) {
  if (cap) S.cap(cap);
  await play(false);
  await S.ask({ choices, answer, reveal, think, after: async () => { await play(true); await S.wait(1.2); } });
}

const CHRISTMAS = [
  {
    n: 1, hook: 'The Nutcracker’s biggest tune is just a scale going down.', post: '12–24 Dec',
    film: 'Play the Pas de deux theme with full chords on piano; the scene shows the scale', lesson: '4 Major scale',
    async run(S) {
      S.cap('Tchaikovsky, The Nutcracker: Pas de deux');
      S.kb('F3', 'A4');
      await S.notes(tune('G4:2 F#4 E4 D4 C4 B3 A3 G3:2', 60), { keep: true });
      S.tag('G, F♯, E, D, C, B, A, G: the G major scale, top to bottom');
      await S.wait(2);
      S.reset();
      S.cap('The same 8 notes, going up: the first scale anyone learns');
      S.kb('F3', 'A4');
      await S.scale(['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4'], { gap: 0.45 });
      S.tag('Slow it down, add an orchestra: a masterpiece');
      await S.wait(2);
    },
  },
  {
    n: 2, hook: 'Waltz of the Flowers: why you can’t help swaying.', post: '12–24 Dec',
    film: 'Sway to it, then play the horn tune on piano over oom-pah-pah', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Count with me: ONE two three');
      S.beats([3]);
      S.kb('D2', 'G4');
      await waltz(S, [['D', 'D'], ['D', 'D'], ['A7', 'A7'], ['A7', 'A7'], ['A7', 'A7'], ['A7', 'A7'], ['D', 'D'], ['D', 'D']], { bpm: 170 });
      S.tag('3 beats in a bar, a strong ONE: that’s a waltz');
      await S.wait(2);
    },
  },
  {
    n: 3, hook: 'Tchaikovsky smuggled a secret instrument from Paris for this.', post: '12–24 Dec',
    film: 'Play the Sugar Plum Fairy tune high and soft on piano, like a celesta', lesson: '5 Minor scale',
    async run(S) {
      await S.clip('Your clip: the Sugar Plum Fairy on piano, high and soft');
      S.cap('The celesta: a keyboard with hammers hitting metal bars');
      S.tag('He found it in Paris in 1891 and asked for it to be kept secret');
      await S.wait(3.2);
      S.reset();
      S.kb('B4', 'G6');
      await quiz(S, {
        cap: 'The dance is in E. Major or minor?',
        play: (on) => S.notes(['E5', 'G5', 'B5', 'E6', 'B5', 'G5', 'E5'], { gap: 0.22, keep: on }),
        choices: ['Major', 'Minor'], answer: 'Minor', reveal: 'Minor: E, G, B. Sweet, but a little spooky.',
      });
    },
  },
  {
    n: 4, hook: 'The Nutcracker’s Russian Dance speeds up until it explodes.', post: '12–24 Dec',
    film: 'Clap or stamp along as it gets faster', lesson: '10 Rhythm',
    async run(S) {
      S.cap('The Trepak: 2 beats in a bar');
      S.beats([2]);
      for (const gap of [0.42, 0.36, 0.3, 0.25, 0.2, 0.16]) await S.pulse([2], { gap, rounds: 2 });
      S.tag('Accelerando: the same beat, faster and faster');
      await S.wait(2);
    },
  },
  {
    n: 5, hook: 'Why so much Christmas music is in D major: blame the trumpets.', post: '12–24 Dec',
    film: 'Handel’s “Hallelujah” (Messiah, first sung in London in 1743), then the scene', lesson: '4 Major scale',
    async run(S) {
      S.cap('Handel’s trumpets had no valves');
      S.kb('C3', 'D6');
      await S.notes(['D3', 'D4', 'A4', 'D5', 'F#5', 'A5', 'D6'], { gap: 0.55, keep: true });
      S.tag('A trumpet built in D could only play these notes: D major’s chord');
      await S.wait(2.2);
      S.reset();
      S.cap('So the brightest music went where the trumpets could go');
      S.kb(...KB);
      await S.prog(prog([['D', 'I'], ['G', 'IV'], ['A', 'V'], ['D', 'I']]), { gap: 1.2 });
      S.tag('Hallelujah, Joy to the World, Bach’s Christmas Oratorio: all in D');
      await S.wait(2.2);
    },
  },
];

const NEW_YEAR = [
  {
    n: 1, hook: 'The Blue Danube’s famous tune is just a D major chord.', post: '1 Jan (the Vienna New Year’s Concert)',
    film: 'Play the waltz tune on piano; the scene shows the chord inside it', lesson: '7 Building a chord',
    async run(S) {
      S.cap('Johann Strauss II, The Blue Danube');
      S.kb('C4', 'B5');
      await S.notes(tune('D4 D4 F#4 A4 A4:3 r:1 A5:.5 A5:1.5 r:1 F#5:.5 F#5:1.5', 150), { keep: false });
      S.cap('The notes it climbs');
      await S.chord(['D4', 'F#4', 'A4'], { len: 1.6 });
      S.tag('D, F♯, A: a D major chord, played one note at a time');
      await S.wait(2.2);
    },
  },
  {
    n: 2, hook: 'Why the whole audience claps along to the Radetzky March.', post: '1 Jan',
    film: 'Clap along: soft, then loud, like the Vienna audience', lesson: '10 Rhythm',
    async run(S) {
      S.cap('A march: 2 strong beats in a bar');
      S.beats([2, 2]);
      S.cap('Soft…');
      await S.pulse([2, 2], { gap: 0.36, rounds: 2 });
      S.cap('…then loud!');
      for (let i = 0; i < 8; i++) { S.sound(['C5', 'G5'], 0.1, { synth: 'chords', vel: 1 }); await S.wait(0.36); }
      S.tag('The conductor turns the audience into the drum section');
      await S.wait(2);
    },
  },
];

const JANUARY = [
  {
    n: 1, hook: 'Swan Lake’s theme in minor, then in major. Hear the difference.', post: 'January',
    film: 'Play the theme on piano in B minor, then in B major', lesson: '5 Minor scale',
    async run(S) {
      S.cap('Tchaikovsky, Swan Lake: the theme, in B minor');
      S.kb('A3', 'G#4');
      await S.notes(tune('F#4:3 B3:.5 C#4:.5 D4:.5 E4:.5 F#4:1.5 D4:.5 F#4:1.5 D4:.5 F#4:2', 90));
      S.reset();
      S.cap('The same tune in B major: D becomes D♯');
      S.kb('A3', 'G#4');
      await S.notes(tune('F#4:3 B3:.5 C#4:.5 D#4:.5 E4:.5 F#4:1.5 D#4:.5 F#4:1.5 D#4:.5 F#4:2', 90));
      S.tag('One note changed: from tragic to a fairy tale');
      await S.wait(2);
    },
  },
  {
    n: 2, hook: 'Four swans, perfectly in step: what staccato means.', post: 'January',
    film: 'Dance of the Little Swans: play it short and bouncy, then smooth', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Short and detached: staccato');
      S.kb('E4', 'A5');
      await S.notes(['F#4', 'A4', 'C#5', 'F#5', 'C#5', 'A4', 'F#4', 'C#5'], { gap: 0.32, len: 0.08 });
      S.cap('Smooth and joined: legato');
      await S.notes(['F#4', 'A4', 'C#5', 'F#5', 'C#5', 'A4', 'F#4', 'C#5'], { gap: 0.32, len: 0.36 });
      S.tag('Same notes. Staccato makes the swans tiptoe.');
      await S.wait(2);
    },
  },
  {
    n: 3, hook: 'Vivaldi makes the whole orchestra shiver.', post: 'January (Winter, The Four Seasons)',
    film: 'A cold London morning, then play the opening of Winter', lesson: '7 Building a chord',
    async run(S) {
      S.cap('Vivaldi, “Winter”: repeated notes, one voice at a time');
      S.kb('E3', 'G5');
      const layers = ['F3', 'C4', 'Ab4', 'Db5', 'E5'];
      for (let i = 1; i <= layers.length; i++) {
        S.clearKb();
        S.mark(layers.slice(0, i), 'rh');
        for (let k = 0; k < 8; k++) { S.sound(layers.slice(0, i), 0.12, { synth: 'chords', vel: 0.45 }); await S.wait(0.18); }
      }
      S.tag('Fast repeated notes = shivering. Each new voice adds a clash.');
      await S.wait(2.2);
    },
  },
  {
    n: 4, hook: 'Ravel repeats one rhythm for 15 minutes. Then one chord changes everything.', post: 'January',
    film: 'Tap the Boléro rhythm on anything: a table, a bin, a bus stop', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Boléro: this rhythm, over and over');
      S.beats([3]);
      const t = 1 / 6;
      const bar1 = ['>.5', t, t, t, '.5', t, t, t, '.5', '.5'];
      const bar2 = ['>.5', t, t, t, '.5', t, t, t, t, t, t, t, t, t];
      await rhythm(S, [...bar1, ...bar2, ...bar1, ...bar2], { bpm: 72 });
      S.reset();
      S.cap('All in C major, for nearly 15 minutes…');
      S.kb(...KB);
      await S.prog(prog([['C', 'I', 2.2]]));
      S.cap('…then, near the end: E major');
      await S.prog(prog([['E', 'III', 2.2]]));
      await S.prog(prog([['C', 'I', 1.6]]));
      S.tag('One key change after 15 minutes feels like an earthquake');
      await S.wait(2);
    },
  },
  {
    n: 5, hook: 'The Apprentice theme is a ballet from 1935.', post: 'January',
    film: 'Play the Dance of the Knights tune yourself (Prokofiev: the scene plays only rhythm and chords)', lesson: '10 Rhythm',
    note: 'Prokofiev: rhythm and chords only on screen; you play the tune.',
    async run(S) {
      S.cap('Prokofiev, Romeo and Juliet: Dance of the Knights');
      S.kb(...KB);
      S.cap('Straight: even notes');
      for (let i = 0; i < 8; i++) { S.sound(ch('Em'), 0.3, { synth: 'chords', vel: i % 2 ? 0.45 : 0.75 }); await S.wait(0.4); }
      S.cap('Dotted: long-short, long-short');
      for (let i = 0; i < 4; i++) {
        S.sound(ch('Em'), 0.5, { synth: 'chords', vel: 0.85 }); await S.wait(0.6);
        S.sound(ch('Em'), 0.15, { synth: 'chords', vel: 0.5 }); await S.wait(0.2);
      }
      S.tag('The dotted rhythm makes it stomp like armour');
      await S.wait(2);
    },
  },
  {
    n: 6, hook: 'Holst’s “Mars” counts to 5. That’s why it never settles.', post: 'January',
    film: 'Tap the rhythm of Mars on your double bass body or a table', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Holst, The Planets: Mars, in 5/4');
      S.beats([5]);
      const t = 1 / 3;
      for (let r = 0; r < 4; r++) {
        await rhythm(S, ['>' + t, t, t, 1, 1, '.5', '.5', 1], { bpm: 150, note: 'G2', len: 0.12, vel: 0.6, accent: 0.95 });
      }
      S.tag('5 beats in a bar: it keeps tripping forward');
      await S.wait(2);
    },
  },
  {
    n: 7, hook: 'The most famous 4 notes ever: how many different notes?', post: 'January', end: 'quiz',
    film: 'Play the opening of Beethoven’s 5th on piano', lesson: '1 Pitch',
    async run(S) {
      S.kb('C3', 'C6');
      await quiz(S, {
        cap: 'Beethoven’s 5th: how many different notes?',
        play: (on) => S.notes(tune('r:.5 G4:.5 G4:.5 G4:.5 Eb4:3 r:.5 F4:.5 F4:.5 F4:.5 D4:3', 150), { keep: on }),
        choices: ['2', '3', '4', '8'], answer: '4', reveal: '4 notes: G and E♭, then F and D. Short-short-short-LONG, twice.',
      });
    },
  },
  {
    n: 8, hook: 'The Swan, on double bass.', post: 'January',
    film: 'You on double bass playing the melody over the scene', lesson: '7 Building a chord',
    note: 'The scene plays the rippling piano part; play the melody on double bass over it.',
    async run(S) {
      S.cap('Saint-Saëns, The Swan: the piano ripples underneath');
      S.kb('G2', 'G5');
      for (const sym of ['G', 'G', 'C', 'G', 'D7', 'G']) {
        const [bass, ...up] = ch(sym);
        S.clearKb(); S.mark(up, 'rh', false); S.mark(bass, 'lh', false);
        S.sound(bass, 1.6, { synth: 'bass', vel: 0.5 });
        await S.notes([...up, ...up.slice().reverse()].map((x) => [x, 0.2]), { light: false, vel: 0.4 });
        await S.wait(0.2);
      }
      S.tag('The swan glides on top; the water moves below');
      await S.wait(2);
    },
  },
];

const OPERA = [
  {
    n: 1, hook: 'Carmen’s Habanera slides down by semitones.', post: 'January',
    film: 'Sing or play the start of the Habanera', lesson: '1 Pitch',
    async run(S) {
      S.cap('Bizet, Carmen: the Habanera');
      S.kb('G4', 'E5');
      await S.notes(['D5', 'C#5', 'C5', 'B4', 'Bb4', 'A4'], { gap: 0.6, keep: true });
      S.tag('D, C♯, C, B, B♭, A: every semitone on the way down');
      await S.wait(1.6);
      S.reset();
      S.cap('Underneath: the habanera rhythm');
      S.beats([2]);
      for (let i = 0; i < 4; i++) await rhythm(S, ['>.75', '.25', '.5', '.5'], { bpm: 100, note: 'D3', len: 0.15 });
      S.tag('Long-short-short-short: a dance from Cuba');
      await S.wait(2);
    },
  },
  {
    n: 2, hook: 'The Queen of the Night sings one of the highest notes in opera.', post: 'January',
    film: 'Play the high F on piano, then hum where your voice gives up', lesson: '1 Pitch',
    async run(S) {
      S.cap('Mozart, The Magic Flute: “Der Hölle Rache”');
      S.kb('C4', 'G6');
      await S.notes(['D5', 'F5', 'A5', 'D6', 'F6'], { gap: 0.45, keep: true });
      S.tag('Up the D minor chord to a high F: F6');
      await S.wait(1.8);
      S.cap('Middle C is here. She sings 2½ octaves higher.');
      S.mark('C4', 'lh', 'Middle C');
      await S.notes(['C4', 'F6'], { gap: 0.9, light: false });
      await S.wait(1.4);
    },
  },
  {
    n: 3, hook: 'Papageno’s whistle is the first 5 notes of a scale.', post: 'January',
    film: 'Whistle it, or play it on a recorder or piano', lesson: '4 Major scale',
    async run(S) {
      S.cap('Mozart, The Magic Flute: Papageno’s pipe');
      S.kb('F4', 'A5');
      for (let i = 0; i < 3; i++) await S.notes(tune('G4:.5 A4:.5 B4:.5 C5:.5 D5:1.5', 140));
      S.tag('G, A, B, C, D: five steps up the G major scale');
      await S.wait(2);
    },
  },
  {
    n: 4, hook: 'Verdi kept this tune secret until opening night.', post: 'January',
    film: 'Sing or play “La donna è mobile” over the oom-pah', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('Verdi, Rigoletto: “La donna è mobile”');
      S.beats([3]);
      S.kb(...KB);
      await waltz(S, [['I', 'B'], ['V7', 'F#7'], ['V7', 'F#7'], ['I', 'B'], ['I', 'B'], ['V7', 'F#7'], ['V7', 'F#7'], ['I', 'B']], { bpm: 190 });
      S.tag('He feared the gondoliers would be singing it before the premiere');
      await S.wait(2.2);
    },
  },
  {
    n: 5, hook: 'The high B in “Nessun dorma” and where it lands.', post: 'January',
    film: 'Sing the last “Vincerò” (or play it on piano)', lesson: '3 Intervals',
    async run(S) {
      S.cap('Puccini, Turandot: “Vin-ce-rò!”');
      S.kb('D3', 'D5');
      S.mark('B4', 'rh');
      S.sound(ch('D'), 3, { synth: 'chords', vel: 0.4 });
      S.sound('B4', 2.6, { vel: 0.9 });
      await S.wait(2.8);
      S.unmark('B4');
      S.mark('A4', 'rh');
      await S.chord(['D4', 'F#4', 'A4'], { len: 1.8 });
      S.tag('A tenor’s high B, held… then down a step to A, home in D major');
      await S.wait(2);
    },
  },
  {
    n: 6, hook: 'This aria turns from minor to major. Listen for the moment.', post: 'January', end: 'quiz',
    film: 'Donizetti, “Una furtiva lagrima”: play the start, then the turn to major', lesson: '5 Minor scale',
    async run(S) {
      S.kb(...KB);
      await quiz(S, {
        cap: 'Donizetti, “Una furtiva lagrima”: which chord is the start?',
        play: (on) => S.prog(prog([['Bbm', 'i', 2]]), { chips: false, light: on }),
        choices: ['B♭ major', 'B♭ minor'], answer: 'B♭ minor', reveal: 'Minor. Then, at “Cielo, si può morir”, it turns to B♭ major: D♭ rises to D.',
      });
      S.reset();
      S.kb(...KB);
      await S.prog(prog([['Bbm', 'i', 1.8], ['Bb', 'I', 2.2]]));
    },
  },
  {
    n: 7, hook: 'The tenor’s high C in “Che gelida manina”.', post: 'January',
    film: 'La Bohème: play or sing up to the high C', lesson: '1 Pitch',
    async run(S) {
      S.cap('Puccini, La Bohème: the tenor’s high C');
      S.kb('C3', 'D5');
      S.mark('C4', 'lh', 'Middle C');
      await S.notes(['C4', 'E4', 'G4', 'C5'], { gap: 0.6, keep: true });
      S.tag('C5: an octave above middle C, the top of most tenors’ range');
      await S.wait(2.2);
    },
  },
  {
    n: 8, hook: 'Musetta’s Waltz: a waltz that takes its time.', post: 'January',
    film: 'La Bohème: play “Quando m’en vo” slowly, stretching the beat', lesson: '10 Rhythm',
    async run(S) {
      S.cap('Puccini, La Bohème: Musetta’s Waltz');
      S.beats([3]);
      S.kb(...KB);
      await waltz(S, [['I', 'E'], ['I', 'E'], ['IV', 'A'], ['V7', 'B7'], ['I', 'E']], { bpm: 120 });
      S.tag('3 in a bar, but slow and stretched: rubato');
      await S.wait(2);
    },
  },
];

const JAZZ = [
  {
    n: 1, hook: '“Autumn Leaves” is a lap of the circle of fifths.', song: 'Autumn Leaves', post: 'January',
    film: 'Play the tune yourself on piano or bass; the scene plays only the chords', lesson: '13 Modulation',
    async run(S) {
      S.cap('“Autumn Leaves”: the chords');
      S.kb(...KB);
      await S.prog(prog([['Cm7', 'ii'], ['F7', 'V'], ['Bbmaj7', 'I'], ['Ebmaj7', 'IV'], ['Am7b5', 'ii'], ['D7', 'V'], ['Gm', 'i']]), { gap: 1.3 });
      S.tag('C, F, B♭, E♭, A, D, G: each root a 5th below the last');
      await S.wait(2);
      S.cap('B♭ major, then its relative minor, G minor');
      await S.prog(prog([['Bbmaj7', 'I', 1.6], ['Gm', 'vi = i', 1.8]]));
    },
  },
  {
    n: 2, hook: '“Fly Me to the Moon”: every chord falls a 5th.', song: 'Fly Me to the Moon', post: 'January',
    film: 'Sing or play the tune yourself; the scene plays only the chords', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('“Fly Me to the Moon”: the chords');
      S.kb(...KB);
      await S.prog(prog([['Am7', 'vi'], ['Dm7', 'ii'], ['G7', 'V'], ['Cmaj7', 'I'], ['Fmaj7', 'IV'], ['Bm7b5', 'vii'], ['E7', 'V/vi'], ['Am7', 'vi']]), { gap: 1.2 });
      S.tag('A, D, G, C, F, B, E, A: gravity, all the way round');
      await S.wait(2);
    },
  },
  {
    n: 3, hook: 'ii – V – I: three chords that are half of jazz.', post: 'January',
    film: 'Play the ii–V–I in a few keys on piano', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('ii – V – I in C');
      S.kb(...KB);
      await S.prog(prog([['Dm7', 'ii'], ['G7', 'V'], ['Cmaj7', 'I']]), { gap: 1.5 });
      S.reset();
      S.cap('Watch two notes move by one step');
      S.kb('A3', 'D5');
      for (const [sym, pair] of [['Dm7', ['F4', 'C5']], ['G7', ['F4', 'B4']], ['Cmaj7', ['E4', 'B4']]]) {
        S.clearKb();
        S.mark(pair, 'rh');
        S.sound(ch(sym), 1.3, { synth: 'chords', vel: 0.4 });
        S.sound(pair, 1.3, { synth: 'chords', vel: 0.7 });
        await S.wait(1.5);
      }
      S.tag('The 3rds and 7ths step smoothly: that’s jazz voice leading');
      await S.wait(2);
    },
  },
  {
    n: 4, hook: 'The 12-bar blues in 30 seconds.', post: 'January',
    film: 'Play a blues shuffle on piano or a walking line on bass', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('12 bars: I, IV and V');
      S.kb(...KB);
      const bars = ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'];
      const rn = { C7: 'I', F7: 'IV', G7: 'V' };
      await S.prog(bars.map((b) => [rn[b], ch(b)]), { gap: 1 });
      S.tag('4 bars of I, 2 of IV, 2 of I, then V, IV, I: the blues');
      await S.wait(2);
    },
  },
  {
    n: 5, hook: '“Take Five” counts 3 + 2.', song: 'Take Five', post: 'January',
    film: 'Count 1-2-3-1-2 and clap the 1s; the scene plays only the chords', lesson: '10 Rhythm',
    async run(S) {
      S.cap('“Take Five”: 5 beats, grouped 3 + 2');
      S.beats([3, 2]);
      S.kb(...KB);
      const dots = () => S.beatsEl.querySelectorAll('.sc-dot');
      for (let bar = 0; bar < 4; bar++) {
        const v = ch(bar % 2 ? 'Bbm7' : 'Ebm');
        S.clearKb(); S.mark(v.slice(1), 'rh', false); S.mark(v[0], 'lh', false);
        for (let i = 0; i < 5; i++) {
          dots().forEach((d, k) => d.classList.toggle('on', k === i));
          if (i === 0 || i === 3) S.sound(v, 0.4, { synth: 'chords', vel: i === 0 ? 0.8 : 0.6 });
          else S.sound(v[0], 0.12, { synth: 'bass', vel: 0.35 });
          await S.wait(0.36);
        }
      }
      dots().forEach((d) => d.classList.remove('on'));
      S.tag('E♭m to B♭m7, in 5/4: 1-2-3, 1-2');
      await S.wait(2);
    },
  },
  {
    n: 6, hook: '“So What”: one scale, two chords, a whole tune.', song: 'So What (Miles Davis)', post: 'January',
    film: 'Play the bass riff on double bass; the scene plays the chords and the scale', lesson: 'Scales: modes',
    async run(S) {
      S.cap('D Dorian: the white notes from D to D');
      S.kb('C3', 'C6');
      await S.notes(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'], { gap: 0.38, keep: true });
      S.reset();
      S.cap('The “So What” chord: 4ths stacked up, a 3rd on top');
      S.kb('C3', 'C6');
      await S.chord(['E4', 'A4', 'D5', 'G5', 'B5'], { len: 1.4, bass: 'D3' });
      S.clearKb();
      await S.chord(['F4', 'Bb4', 'Eb5', 'Ab5', 'C6'], { len: 1.4, bass: 'Eb3' });
      S.tag('16 bars in D, 8 a semitone up in E♭, 8 back in D');
      await S.wait(2);
    },
  },
  {
    n: 7, hook: '“Giant Steps” splits the octave into 3 keys.', song: 'Giant Steps (John Coltrane)', post: 'January',
    film: 'Play the first bars on piano as fast as you dare', lesson: '13 Modulation',
    async run(S) {
      S.cap('“Giant Steps”: the first chords');
      S.kb(...KB);
      await S.prog(prog([['Bmaj7', 'B'], ['D7', 'V of G'], ['Gmaj7', 'G'], ['Bb7', 'V of E♭'], ['Ebmaj7', 'E♭']]), { gap: 0.9 });
      S.reset();
      S.cap('B, G, E♭, B: down a major 3rd each time');
      S.kb('A2', 'C4');
      await S.notes(['B3', 'G3', 'Eb3', 'B2'], { gap: 0.7, keep: true });
      S.tag('3 keys a major 3rd apart split the octave in three equal parts');
      await S.wait(2);
    },
  },
  {
    n: 8, hook: 'The chords jazz musicians play more than any others: “rhythm changes”.', song: 'I Got Rhythm (Gershwin)', post: 'January',
    film: 'Play the tune yourself; the scene plays the chords', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('“I Got Rhythm”: I – vi – ii – V');
      S.kb(...KB);
      for (let i = 0; i < 2; i++) await S.prog(prog([['Bb', 'I'], ['Gm7', 'vi'], ['Cm7', 'ii'], ['F7', 'V']]), { gap: 0.8 });
      S.cap('The middle: a chain of dominant 7ths');
      await S.prog(prog([['D7', 'V/vi'], ['G7', 'V/ii'], ['C7', 'V/V'], ['F7', 'V']]), { gap: 1.2 });
      S.tag('Hundreds of jazz tunes borrow these chords');
      await S.wait(2);
    },
  },
  {
    n: 9, hook: '“Summertime” is a lullaby on two chords.', song: 'Summertime (Gershwin)', post: 'January',
    film: 'Sing or play the tune yourself; the scene plays the chords', lesson: '5 Minor scale',
    async run(S) {
      S.cap('“Summertime”: rocking between i and V');
      S.kb(...KB);
      await S.prog(prog([['Am6', 'i'], ['E7', 'V'], ['Am6', 'i'], ['E7', 'V'], ['Dm6', 'iv'], ['E7', 'V'], ['Am6', 'i']]), { gap: 1.4 });
      S.tag('G♯ in the E7 pulls the lullaby back to A minor');
      await S.wait(2);
    },
  },
  {
    n: 10, hook: 'How a walking bass line works.', post: 'January',
    film: 'You on double bass, walking over the chords', lesson: '11 Harmonic gravity',
    async run(S) {
      S.cap('ii – V – I, with a walking bass');
      S.kb('D2', 'G5');
      const bars = [['Dm7', 'D2 F2 A2 Ab2'], ['G7', 'G2 B2 D3 Db3'], ['Cmaj7', 'C2 E2 G2 B2']];
      S.chips(bars.map(([c]) => pretty(c)));
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < bars.length; i++) {
          S.chipOn(i);
          const v = ch(bars[i][0]);
          S.sound(v.slice(1), 2.2, { synth: 'chords', vel: 0.35 });
          await S.notes(bars[i][1].split(' '), { gap: 0.6, synth: 'bass', cls: 'lh' });
        }
      }
      S.chipsOff();
      S.tag('Beat 1: the root. Then chord notes. Beat 4: a step into the next root.');
      await S.wait(2.2);
    },
  },
];

const LONDON = [
  {
    n: 1, hook: 'Big Ben’s chime uses just 4 notes.', post: 'Any day',
    film: 'Your clip of the Westminster chimes, then play them on piano', lesson: '4 Major scale',
    async run(S) {
      await S.clip('Your clip: the chimes at Westminster');
      S.cap('The quarter chime: 4 notes');
      S.kb('A3', 'A4');
      await S.notes(tune('G#4 F#4 E4 B3:2', 60), { keep: true });
      S.tag('G♯, F♯, E, B: all from E major');
      await S.wait(1.8);
      S.cap('And Big Ben itself strikes the hours on an E');
      S.clearKb();
      for (let i = 0; i < 3; i++) { S.mark('E3', 'lh'); S.sound('E3', 1.4, { synth: 'chords', vel: 0.8 }); await S.wait(1.1); S.clearKb(); }
    },
  },
  {
    n: 2, hook: 'English church bells ring a scale. Listen.', post: 'Any day (Sunday mornings)',
    film: 'Your clip of church bells ringing, then the scene', lesson: '4 Major scale',
    async run(S) {
      await S.clip('Your clip: church bells');
      S.cap('8 bells, rung in order: “rounds”');
      S.kb('B3', 'D5');
      for (let i = 0; i < 2; i++) {
        await S.notes(['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'], { gap: 0.32, synth: 'chords', len: 0.9 });
        await S.wait(0.3);
      }
      S.tag('Highest to lowest: a major scale going down');
      await S.wait(2);
    },
  },
  {
    n: 3, hook: 'The ice-cream van plays a song over 400 years old.', post: 'Any sunny day',
    film: 'Your clip of an ice-cream van, then play Greensleeves', lesson: 'Scales: melodic minor',
    async run(S) {
      await S.clip('Your clip: an ice-cream van');
      S.cap('“Greensleeves”, in A minor');
      S.kb('D4', 'G5');
      await S.notes(tune('A4 C5:2 D5 E5:1.5 F#5:.5 E5 D5:2 B4 G4:1.5 A4:.5 B4 C5:2 A4 A4:1.5 G#4:.5 A4 B4:2 G#4 E4:2', 150));
      S.tag('Spot the F♯ and G♯: the raised 6th and 7th of minor');
      await S.wait(2.2);
    },
  },
  {
    n: 4, hook: 'I answered a London sound on my piano.', post: 'Any day',
    film: 'A city sound (a bus bell, a siren, a busker), then you find its note and build a chord on it', lesson: '7 Building a chord',
    note: 'Send me the clip (in content/) and I can measure the note, then set the scene to match.',
    async run(S) {
      await S.clip('Your clip: a London sound', 3);
      await S.clip('Your clip: you finding its note on piano or bass', 3);
      S.cap('One note can become any chord');
      S.kb(...KB);
      await S.prog(prog([['C', 'major'], ['Cm', 'minor'], ['Ab', 'C is the 3rd'], ['F', 'C is the 5th']]), { gap: 1.4 });
      S.tag('The city plays the note. You choose the harmony.');
      await S.wait(2);
    },
  },
];

const GROUPS = [
  ['Classics: Christmas', 'xm', CHRISTMAS],
  ['Classics: New Year', 'ny', NEW_YEAR],
  ['Classics: January', 'jan', JANUARY],
  ['Opera', 'op', OPERA],
  ['Jazz standards', 'jz', JAZZ],
  ['London sounds', 'ldn', LONDON],
];
const SCENES = GROUPS.flatMap(([group, key, list]) => list.map((s) => Object.assign(s, {
  group, slot: 'Special', id: `${key}-${s.n}`,
  note: [`Post: ${s.post}.`, s.note || (group === 'Jazz standards' && s.song ? 'Chords only: play or sing the tune yourself on camera.' : ''), `Film: ${s.film}.`].filter(Boolean).join(' '),
})));
export { SCENES, ch };
