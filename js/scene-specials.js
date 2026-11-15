// Producer specials: famous songs, chords only. A chord progression is not protected by copyright,
// so the page plays only the chords, the roman numerals and the rhythm. The presenter plays or sings
// the melody on camera, inside TikTok (personal or creator account), never on this site.

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const pc = (x) => (PC[x[0]] + (x[1] === '#' ? 1 : x[1] === 'b' ? -1 : 0) + 12) % 12;
const name = (m, flats) => `${(flats ? FLAT : SHARP)[m % 12]}${Math.floor(m / 12) - 1}`;
const pretty = (sym) => sym.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭');

/** 'Bm', 'Eb', 'F#', 'E/G#', 'F5' -> [bass, ...upper]: bass between E2 and D♯3, root of the upper chord between G3 and F♯4. */
function chordOf(sym, bassNote = null) {
  const m = /^([A-G][#b]?)(m|5)?(?:\/([A-G][#b]?))?$/.exec(sym);
  if (!m) throw new Error(`Bad chord ${sym}`);
  const flats = /b/.test(sym) || ['Cm', 'Fm', 'Gm', 'F'].includes(m[1] + (m[2] || ''));
  const r = pc(m[1]);
  const shape = m[2] === 'm' ? [0, 3, 7] : m[2] === '5' ? [0, 7, 12] : [0, 4, 7];
  const top = 55 + ((r - 7 + 12) % 12);
  const b = m[3] ? pc(m[3]) : r;
  const bass = 40 + ((b - 4 + 12) % 12);
  return [bassNote || name(bass, flats), ...shape.map((i) => name(top + i, flats))];
}
/** [['D', 'I'], ['Bm', 'vi'], ...] -> a progression for S.prog, chips like "Bm · vi". */
const prog = (list, numerals = true) => list.map(([sym, rn, bass]) => [numerals ? `${pretty(sym)} · ${rn}` : pretty(sym), chordOf(sym, bass)]);
const KB = ['D2', 'E5'];
const NOTE = 'Chords only: play or sing the melody yourself on camera.';
const FILM = 'Play a few bars of the melody yourself; the scene plays the chords';

/** The usual opening: the song's chords with their numbers, twice round. */
async function songChords(S, title, list, { gap = 1.5, rounds = 2 } = {}) {
  S.cap(title);
  S.kb(...KB);
  for (let i = 0; i < rounds; i++) await S.prog(prog(list), { gap });
}

const SCENES = [
  {
    n: 1, hook: '“Last Christmas” walks straight down the gravity map.', song: 'Last Christmas (Wham!)', chords: 'D – Bm – Em – A',
    film: `${FILM}, then the gravity map`, lesson: '11 Harmonic gravity',
    async run(S) {
      const list = [['D', 'I'], ['Bm', 'vi'], ['Em', 'ii'], ['A', 'V']];
      await songChords(S, '“Last Christmas”: the chords', list);
      S.reset();
      S.cap('On the gravity map');
      S.map();
      await S.prog(list.map(([sym, rn]) => [rn, chordOf(sym)]), { light: false, mapOn: true, gap: 1.6 });
      await S.prog([['I', chordOf('D'), 2]], { light: false, mapOn: true });
      S.tag('vi → ii → V → I: one level down each time');
      await S.wait(1.8);
    },
  },
  {
    n: 2, hook: '“Let It Be” uses the 4 chords behind hundreds of hits.', song: 'Let It Be (The Beatles)', chords: 'C – G – Am – F',
    film: FILM, lesson: 'The I – V – vi – IV family',
    async run(S) {
      await songChords(S, '“Let It Be”: the chords', [['C', 'I'], ['G', 'V'], ['Am', 'vi'], ['F', 'IV']]);
      S.tag('I – V – vi – IV: learn it once, hear it everywhere');
      await S.wait(2);
    },
  },
  {
    n: 3, hook: '“Despacito”: the same 4 chords, starting on the sad one.', song: 'Despacito (Luis Fonsi)', chords: 'Bm – G – D – A',
    film: `${FILM}, then the same chords starting on I`, lesson: 'The I – V – vi – IV family',
    async run(S) {
      await songChords(S, '“Despacito”: the chords', [['Bm', 'vi'], ['G', 'IV'], ['D', 'I'], ['A', 'V']], { gap: 1.3 });
      S.cap('Start on I instead');
      await S.prog(prog([['D', 'I'], ['A', 'V'], ['Bm', 'vi'], ['G', 'IV']]), { gap: 1.3 });
      S.tag('Same chords. Start on vi and it turns moody');
      await S.wait(1.8);
    },
  },
  {
    n: 4, hook: 'Why “Someone Like You” sounds so smooth: watch the bass.', song: 'Someone Like You (Adele)', chords: 'A – E/G♯ – F♯m – D',
    film: `${FILM}, then the bass line alone`, lesson: '12 Inversions',
    async run(S) {
      const list = [['A', 'I', 'A2'], ['E/G#', 'V', 'G#2'], ['F#m', 'vi', 'F#2'], ['D', 'IV', 'D2']];
      await songChords(S, '“Someone Like You”: the chords', list);
      S.cap('Now just the bass');
      S.clearKb();
      await S.notes(['A2', 'G#2', 'F#2', 'D2'], { gap: 0.9, keep: true, synth: 'bass', cls: 'lh' });
      S.tag('E/G♯ is an inversion: it lets the bass walk down');
      await S.wait(1.8);
    },
  },
  {
    n: 5, hook: '“Stand By Me” is the 50s loop. Producers still use it.', song: 'Stand By Me (Ben E. King)', chords: 'A – F♯m – D – E',
    film: FILM, lesson: 'The I – V – vi – IV family',
    async run(S) {
      await songChords(S, '“Stand By Me”: the chords', [['A', 'I'], ['F#m', 'vi'], ['D', 'IV'], ['E', 'V']], { gap: 1.7 });
      S.tag('I – vi – IV – V: the doo-wop loop, 70 years old and still going');
      await S.wait(2);
    },
  },
  {
    n: 6, hook: 'The one chord that makes “Creep” sound so sad.', song: 'Creep (Radiohead)', chords: 'G – B – C – Cm',
    film: `${FILM}, then C major against C minor`, lesson: '9 Chords over a scale',
    async run(S) {
      await songChords(S, '“Creep”: the chords', [['G', 'I'], ['B', 'III'], ['C', 'IV'], ['Cm', 'iv']], { gap: 1.7 });
      S.cap('Listen to the last two');
      await S.prog(prog([['C', 'IV'], ['Cm', 'iv']]), { gap: 2 });
      S.tag('E drops to E♭: a minor iv borrowed from G minor');
      await S.wait(2);
    },
  },
  {
    n: 7, hook: '“Royals” uses a chord that isn’t in its key.', song: 'Royals (Lorde)', chords: 'D – C – G',
    film: `${FILM}, then C major against the C♯ the key expects`, lesson: '9 Chords over a scale',
    async run(S) {
      await songChords(S, '“Royals”: the chorus chords', [['D', 'I'], ['C', '♭VII'], ['G', 'IV']], { gap: 1.8 });
      S.cap('D major has C♯, not C');
      S.clearKb();
      S.mark(['C4'], 'rh', 'C, not C♯');
      S.tag('♭VII: borrowed, and instantly cooler');
      await S.prog(prog([['C', '♭VII'], ['D', 'I']]), { gap: 1.6, light: false });
      await S.wait(1);
    },
  },
  {
    n: 8, hook: '“Hit the Road Jack” walks down 4 steps.', song: 'Hit the Road Jack (Ray Charles)', chords: 'Am – G – F – E',
    film: `${FILM}, then the bass walking down`, lesson: '5 Minor scale',
    async run(S) {
      await songChords(S, '“Hit the Road Jack”: the chords (in A minor)', [['Am', 'i'], ['G', 'VII'], ['F', 'VI'], ['E', 'V']], { gap: 0.9, rounds: 3 });
      S.cap('The bass: A, G, F, E');
      S.clearKb();
      await S.notes(['A2', 'G2', 'F2', 'E2'], { gap: 0.7, keep: true, synth: 'bass', cls: 'lh' });
      S.tag('E major, with G♯: it pulls back to A minor');
      await S.prog(prog([['E', 'V'], ['Am', 'i']]), { gap: 1.6 });
    },
  },
  {
    n: 9, hook: '“Shape of You” is a 4-chord loop in a minor key.', song: 'Shape of You (Ed Sheeran)', chords: 'C♯m – F♯m – A – B',
    film: FILM, lesson: '5 Minor scale',
    async run(S) {
      await songChords(S, '“Shape of You”: the chords', [['C#m', 'i'], ['F#m', 'iv'], ['A', 'VI'], ['B', 'VII']], { gap: 1.3 });
      S.tag('i – iv – VI – VII: a minor key that never feels sad');
      await S.wait(2);
    },
  },
  {
    n: 10, hook: 'The 80s trick in “Blinding Lights”: a major chord in a minor key.', song: 'Blinding Lights (The Weeknd)', chords: 'Fm – Cm – E♭ – B♭',
    film: `${FILM}, then B♭ major against B♭ minor`, lesson: '5 Minor scale',
    async run(S) {
      await songChords(S, '“Blinding Lights”: the chords', [['Fm', 'i'], ['Cm', 'v'], ['Eb', 'VII'], ['Bb', 'IV']], { gap: 1.1 });
      S.cap('F minor would give B♭ minor…');
      await S.prog(prog([['Bbm', 'iv']]), { gap: 1.8 });
      S.cap('…the song uses B♭ major');
      await S.prog(prog([['Bb', 'IV']]), { gap: 1.8 });
      S.tag('D instead of D♭: a minor key with a bright lift');
      await S.wait(1.6);
    },
  },
  {
    n: 11, hook: 'Why rock uses power chords: no 3rd, no mood.', song: 'Smells Like Teen Spirit (Nirvana)', chords: 'F5 – B♭5 – A♭5 – D♭5',
    film: `${FILM}, then a full chord against a power chord`, lesson: '7 Building a chord',
    async run(S) {
      await songChords(S, '“Smells Like Teen Spirit”: the power chords', [['F5', 'I'], ['Bb5', 'IV'], ['Ab5', '♭III'], ['Db5', '♭VI']], { gap: 1.1 });
      S.cap('A full F major chord');
      await S.prog(prog([['F', 'major']], false), { gap: 1.6 });
      S.cap('A power chord: root, 5th, octave');
      await S.prog(prog([['F5', 'power']], false), { gap: 1.6 });
      S.tag('No 3rd: not major, not minor. Just loud.');
      await S.wait(1.6);
    },
  },
  {
    n: 12, hook: '“Clocks” hides a 3 + 3 + 2 rhythm.', song: 'Clocks (Coldplay)', chords: 'E♭ – B♭m – B♭m – Fm',
    film: `${FILM}, then the 3 + 3 + 2 grouping clapped`, lesson: '10 Rhythm',
    async run(S) {
      S.cap('“Clocks”: the chords, in 3 + 3 + 2');
      S.kb(...KB);
      S.beats([3, 3, 2]);
      const bars = [['Eb', 'I'], ['Bbm', 'v'], ['Bbm', 'v'], ['Fm', 'ii']];
      S.chips(bars.map(([sym, rn]) => `${pretty(sym)} · ${rn}`));
      const dots = () => S.beatsEl.querySelectorAll('.sc-dot');
      for (let round = 0; round < 2; round++) {
        for (let b = 0; b < bars.length; b++) {
          S.chipOn(b);
          const v = chordOf(bars[b][0]);
          S.clearKb(); S.mark(v.slice(1), 'rh', false); S.mark(v[0], 'lh', false);
          for (let i = 0; i < 8; i++) {
            dots()[i].classList.add('on');
            if ([0, 3, 6].includes(i)) S.sound(v, 0.5, { synth: 'chords', vel: 0.8 });
            else S.sound(v[1 + (i % 3)], 0.15, { synth: 'chords', vel: 0.35 });
            await S.wait(0.2);
            dots()[i].classList.remove('on');
          }
        }
      }
      S.chipsOff();
      S.tag('8 notes in a bar, grouped 3 + 3 + 2: it never sits still');
      await S.wait(1.8);
    },
  },
  {
    n: 13, hook: '“Hotel California”: 8 chords and a twist.', song: 'Hotel California (Eagles)', chords: 'Bm – F♯ – A – E – G – D – Em – F♯',
    film: `${FILM}, then F♯ major against F♯ minor`, lesson: '11 Harmonic gravity',
    async run(S) {
      await songChords(S, '“Hotel California”: 8 chords', [['Bm', 'i'], ['F#', 'V'], ['A', 'VII'], ['E', 'IV'], ['G', 'VI'], ['D', 'III'], ['Em', 'iv'], ['F#', 'V']], { gap: 1.2, rounds: 1 });
      S.cap('B minor’s own 5th chord would be F♯ minor…');
      await S.prog(prog([['F#m', 'v'], ['Bm', 'i']]), { gap: 1.4 });
      S.cap('…F♯ major pulls home much harder');
      await S.prog(prog([['F#', 'V'], ['Bm', 'i']]), { gap: 1.6 });
      S.tag('A♯ instead of A: the leading note');
      await S.wait(1.4);
    },
  },
  {
    n: 14, hook: 'Green Day borrowed this from Pachelbel.', song: 'Basket Case (Green Day)', chords: 'E♭ – B♭ – Cm – Gm – A♭ – E♭ – B♭',
    film: `${FILM}, then Pachelbel’s Canon chords`, lesson: '11 Harmonic gravity',
    async run(S) {
      await songChords(S, '“Basket Case”: the chords', [['Eb', 'I'], ['Bb', 'V'], ['Cm', 'vi'], ['Gm', 'iii'], ['Ab', 'IV'], ['Eb', 'I'], ['Bb', 'V']], { gap: 1, rounds: 1 });
      S.cap('Pachelbel’s Canon, 1700ish');
      await S.prog(prog([['C', 'I'], ['G', 'V'], ['Am', 'vi'], ['Em', 'iii'], ['F', 'IV'], ['C', 'I'], ['F', 'IV'], ['G', 'V']]), { gap: 1.1 });
      S.tag('I – V – vi – iii – IV: 300 years, still a hit');
      await S.wait(1.6);
    },
  },
  {
    n: 15, hook: 'The Beatles, Journey, Adele: spot the 4 chords.', song: 'Let It Be · Don’t Stop Believin’ · Someone Like You', chords: 'I – V – vi – IV in C, E and A',
    film: 'Hum a line of each song over its key; the scene plays the same 4 chords in 3 keys', lesson: 'The I – V – vi – IV family',
    async run(S) {
      S.kb(...KB);
      for (const [title, list] of [
        ['“Let It Be”: C major', [['C', 'I'], ['G', 'V'], ['Am', 'vi'], ['F', 'IV']]],
        ['“Don’t Stop Believin’”: E major', [['E', 'I'], ['B', 'V'], ['C#m', 'vi'], ['A', 'IV']]],
        ['“Someone Like You”: A major', [['A', 'I'], ['E', 'V'], ['F#m', 'vi'], ['D', 'IV']]],
      ]) {
        S.cap(title);
        await S.prog(prog(list), { gap: 1.2 });
      }
      S.cap('');
      S.tag('Same 4 chords, 3 keys, 3 hits');
      await S.wait(2);
    },
  },
];

SCENES.forEach((s) => { s.group = 'Producer specials'; s.slot = 'Special'; s.note = NOTE; s.id = `sp-${s.n}`; });
export { SCENES };
