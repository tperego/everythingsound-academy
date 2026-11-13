// Course content. Add a lesson by copying one below; exercises are plain data.
//
// Exercise fields:
//   id, title, kind: 'auto' (checked instantly) | 'creative' (you mark it) | 'daw' (DAW round-trip, you mark it)
//   brief: array of steps shown to the student
//   start: starting project {key, mode, bpm, bars, progression?: [degrees per bar], melody?: [...]}
//   lock: {key, bars, chords}  — stops students changing those
//   checks: auto-checks (see js/checks.js for the list)
//   rubric: [{label, max}] — what you mark by hand
//   videoAt: seconds into the lesson video this exercise belongs to (optional)

export const LESSONS = [
  {
    id: 'progressions-1',
    course: 'Music Theory · Chords & Progressions',
    title: 'The I – V – vi – IV family',
    // Paste the YouTube video ID here (the part after "v=" in the URL).
    youtubeId: '',
    intro:
      'Four chords, endless songs. In this lesson you build the most-used progression in pop, learn why V wants to go home to I, write a melody that fits the chords, and then take it into your DAW.',
    exercises: [
      {
        id: 'p1-build',
        title: '1 · Build I – V – vi – IV',
        kind: 'auto',
        brief: [
          'We are in G major. Click bar 1 in the Chords lane, then pick chords from the palette (or type 1–7).',
          'Build I – V – vi – IV, one chord per bar.',
          'Press Play, then Check.',
        ],
        start: { key: 'G', mode: 'major', bpm: 96, bars: 4 },
        lock: { key: true, bars: true },
        checks: [{ type: 'progression', sequence: ['I', 'V', 'vi', 'IV'] }],
        rubric: [],
      },
      {
        id: 'p1-cadence',
        title: '2 · Write a progression that lands',
        kind: 'auto',
        brief: [
          'Write an 8-bar progression in C major.',
          'Start on I, put a chord in every bar, and finish with a perfect cadence (V – I) in the last two bars.',
          'Somewhere, use a pre-dominant (ii or IV) right before V.',
          'Use 7ths if you like: switch on "Add 7th" before picking a chord.',
        ],
        start: { key: 'C', mode: 'major', bpm: 92, bars: 8 },
        lock: { key: true, bars: true },
        checks: [
          { type: 'starts-on-tonic' },
          { type: 'all-bars-filled' },
          { type: 'predominant-before-dominant' },
          { type: 'ends-with-cadence', cadence: 'perfect' },
        ],
        rubric: [
          { label: 'Sense of direction toward the cadence', max: 5 },
          { label: 'Variety and choice of chords', max: 5 },
        ],
      },
      {
        id: 'p1-melody',
        title: '3 · Write a melody over the chords',
        kind: 'creative',
        brief: [
          'The chords are given (F major: I – vi – IV – V – I – IV – V – I).',
          'Draw a melody in the grid: click to add a note, drag right to make it longer, click a note to delete it.',
          'The shaded rows are chord tones. Land on them on beats 1 and 3, and use the other rows to move between them.',
          'End on the tonic (degree 1). Check, then submit it for marking.',
        ],
        start: { key: 'F', mode: 'major', bpm: 100, bars: 8, progression: [1, 6, 4, 5, 1, 4, 5, 1] },
        lock: { key: true, bars: true, chords: true },
        checks: [
          { type: 'chords-unchanged', progression: [1, 6, 4, 5, 1, 4, 5, 1] },
          { type: 'melody-fills', minNotes: 12 },
          { type: 'melody-chord-tones', minRatio: 0.6 },
          { type: 'melody-ends-on-tonic' },
          { type: 'melody-range', maxRows: 10 },
        ],
        rubric: [
          { label: 'Shape and contour', max: 5 },
          { label: 'Fit with the chords', max: 5 },
          { label: 'Rhythm and phrasing', max: 5 },
          { label: 'Ending', max: 5 },
        ],
      },
      {
        id: 'p1-daw',
        title: '4 · Take it into your DAW',
        kind: 'daw',
        brief: [
          'Here is I – V – vi – IV in G with a starter melody. Change anything you like first.',
          'Export the MIDI (all tracks) and bring it into Ableton Live, Logic or Pro Tools.',
          'Put each track on an instrument, re-voice the chords (try inversions), and give the bass a rhythm. Loop it to 8 or 16 bars if you want.',
          'Export the MIDI of all tracks and bounce an MP3 from your DAW. Attach both below and submit.',
        ],
        start: {
          key: 'G', mode: 'major', bpm: 96, bars: 4, progression: [1, 5, 6, 4],
          melody: [
            { start: 0, len: 2, deg: 3 }, { start: 2, len: 2, deg: 5 }, { start: 4, len: 4, deg: 5 },
            { start: 8, len: 2, deg: 2 }, { start: 10, len: 2, deg: 5 }, { start: 12, len: 4, deg: 7, oct: -1 },
            { start: 16, len: 2, deg: 1 }, { start: 18, len: 2, deg: 3 }, { start: 20, len: 4, deg: 6 },
            { start: 24, len: 2, deg: 6 }, { start: 26, len: 2, deg: 4 }, { start: 28, len: 4, deg: 4 },
          ],
        },
        lock: { key: true },
        checks: [
          { type: 'daw-midi-attached' },
          { type: 'daw-audio-attached' },
          { type: 'daw-tracks', min: 2 },
          { type: 'daw-in-key', maxOutRatio: 0.1 },
          { type: 'daw-progression', sequence: ['I', 'V', 'vi', 'IV'], minMatch: 0.75 },
        ],
        rubric: [
          { label: 'Voicing and inversions', max: 5 },
          { label: 'Bass and rhythm', max: 5 },
          { label: 'Sound choice', max: 5 },
          { label: 'Balance and mix', max: 5 },
        ],
      },
    ],
  },
];

// ---------- Module 1 · Foundations ----------

const quizEx = (id, title, type, brief, { count = 10, pass = 8, options = {} } = {}) => ({
  id, title, kind: 'quiz', noComposer: true, brief,
  start: { key: 'C', mode: 'major', bpm: 90, bars: 4 },
  quiz: { type, count, pass, options },
  checks: [{ type: 'quiz-score', min: pass }],
  rubric: [],
});

LESSONS.push(
  {
    id: 'mt-01-pitch',
    course: 'Music Theory · Foundations',
    title: 'Pitch, tones and semitones',
    youtubeId: 'r5UU6ODpl5Y',
    intro: 'How high or low a note is, and the two smallest distances in Western music: the semitone and the tone.',
    exercises: [
      quizEx('mt01-higher-lower', '1 · Higher or lower?', 'higher-lower', [
        'Listen to two notes. Is the second one higher or lower?',
        'Use ▶ Play again as often as you like. Get 8 out of 10 to pass.',
      ]),
      quizEx('mt01-tone-semitone', '2 · Tone or semitone?', 'tone-semitone', [
        'Two keys light up and play. Are they a semitone apart (next-door keys) or a tone (one key in between)?',
        'Look and listen: a semitone sounds tighter, more “squeezed”.',
      ]),
      quizEx('mt01-count', '3 · Count the semitones', 'count-semitones', [
        'Two keys light up. Count the semitones from the lower to the higher one: every key counts, black and white.',
      ]),
    ],
  },
  {
    id: 'mt-02-keyboard',
    course: 'Music Theory · Foundations',
    title: 'The piano keyboard',
    youtubeId: '9kiI2B6duvQ',
    intro: 'How the keyboard is built: the pattern of black keys, the names of every key, and where the semitones are.',
    exercises: [
      quizEx('mt02-find-key', '1 · Find the key', 'find-key', [
        'Click any key with the name shown. Every octave counts.',
        'Tip: C sits just left of the group of two black keys, F just left of the group of three.',
      ]),
      quizEx('mt02-black-keys', '2 · Name the black key', 'name-black-key', [
        'A black key has two names: a ♯ name and a ♭ name. Choose the right pair.',
      ]),
      quizEx('mt02-steps', '3 · A tone or semitone away', 'semitone-step', [
        'Click the key a tone or a semitone above or below the one shown.',
        'Watch out for E–F and B–C: they are semitones with no black key between them.',
      ]),
    ],
  },
  {
    id: 'mt-03-intervals',
    course: 'Music Theory · Foundations',
    title: 'Intervals',
    youtubeId: 'tpy1MFZKAV0',
    intro: 'Naming the distance between two notes: seconds, thirds, fourths, fifths and the octave, by eye and by ear.',
    exercises: [
      quizEx('mt03-name', '1 · Name the interval', 'name-interval', [
        'Two keys light up and play. Name the interval between them.',
        'Count semitones if you need to: minor 2nd = 1, major 2nd = 2, minor 3rd = 3, major 3rd = 4, perfect 4th = 5, perfect 5th = 7, octave = 12.',
      ]),
      quizEx('mt03-build', '2 · Build the interval', 'build-interval', [
        'Click the key that makes the interval asked for, above the note shown.',
      ]),
      quizEx('mt03-hear', '3 · Hear the interval', 'hear-interval', [
        'Listen to two notes and choose the interval: major 2nd, major 3rd, perfect 5th or octave.',
        'Tip: link each one to a song you know.',
      ], { pass: 7 }),
      {
        id: 'mt03-melody',
        title: '4 · Write a melody with steps and 3rds',
        kind: 'creative',
        brief: [
          'Write a 4-bar melody in C major using only steps (2nds) and 3rds: no bigger leaps.',
          'Click in the grid to add notes, drag to make them longer. Press Play to hear it.',
          'End on C (degree 1). Check, then submit it to your teacher.',
        ],
        start: { key: 'C', mode: 'major', bpm: 90, bars: 4 },
        lock: { key: true, bars: true },
        checks: [
          { type: 'melody-fills', minNotes: 8 },
          { type: 'melody-intervals', maxSteps: 2 },
          { type: 'melody-ends-on-tonic' },
        ],
        rubric: [
          { label: 'Uses steps and 3rds well', max: 5 },
          { label: 'Shape: it goes somewhere', max: 5 },
          { label: 'Rhythm and musicality', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'mt-04-major-scale',
    course: 'Music Theory · Foundations',
    title: 'The major scale',
    youtubeId: 'v1_RLraa6ug',
    intro: 'The pattern behind every major scale, T–T–S–T–T–T–S, and how to build it from any note.',
    exercises: [
      quizEx('mt04-build', '1 · Build the scale', 'build-scale', [
        'Click the 8 notes of the major scale asked for, from the keynote up to the next one.',
        'As you click, the keys show T (tone) or S (semitone) from the note before. Follow T–T–S–T–T–T–S.',
      ], { count: 6, pass: 5 }),
      quizEx('mt04-mistake', '2 · Spot the mistake', 'spot-mistake', [
        'One note of this major scale is wrong. Click it.',
        'Listen too: the wrong note sticks out.',
      ], { count: 8, pass: 6 }),
      quizEx('mt04-degrees', '3 · Scale degrees', 'scale-degree', [
        'Which note is degree 2, 3, 4… of the major scale asked for?',
      ]),
      {
        id: 'mt04-melody',
        title: '4 · An 8-bar melody in a major key',
        kind: 'creative',
        brief: [
          'Choose any major key in the Key menu and write an 8-bar melody in it.',
          'The grid only offers the notes of your scale, so every note is in the key. Make it sing: steps, a few leaps, a high point.',
          'End on the keynote (degree 1). Turn on Piano to see your scale on the keyboard. Check, then submit.',
        ],
        start: { key: 'G', mode: 'major', bpm: 96, bars: 8 },
        lock: { bars: true },
        checks: [
          { type: 'melody-fills', minNotes: 12 },
          { type: 'melody-ends-on-tonic' },
          { type: 'melody-range', maxRows: 10 },
        ],
        rubric: [
          { label: 'Melodic shape and a high point', max: 5 },
          { label: 'Rhythm and phrasing', max: 5 },
          { label: 'Ending', max: 5 },
          { label: 'Overall musicality', max: 5 },
        ],
      },
    ],
  },
);

// ---------- Module 1 · Foundations (continued) ----------

LESSONS.push(
  {
    id: 'mt-05-minor-scale',
    course: 'Music Theory · Foundations',
    title: 'The minor scale',
    youtubeId: 'gsgkY6_pTD4',
    intro: 'The natural minor scale, T–S–T–T–S–T–T, its darker colour, and how every major key has a relative minor with the same notes.',
    exercises: [
      quizEx('mt05-build', '1 · Build the minor scale', 'build-scale', [
        'Click the 8 notes of the natural minor scale asked for, from the keynote up to the next one.',
        'The keys show T or S as you go. Follow T–S–T–T–S–T–T.',
      ], { count: 6, pass: 5, options: { mode: 'minor', keys: ['A', 'E', 'D', 'B', 'G', 'C'] } }),
      quizEx('mt05-relative', '2 · Relative keys', 'relative-key', [
        'Find the relative minor of a major key, or the relative major of a minor key.',
        'Tip: the relative minor starts on degree 6 of the major scale, 3 semitones below its keynote.',
      ]),
      quizEx('mt05-hear', '3 · Major or minor?', 'hear-scale-mode', [
        'Listen to a scale going up. Is it major or minor?',
        'Listen to the 3rd note: bright (major) or dark (minor)?',
      ]),
      {
        id: 'mt05-melody',
        title: '4 · An 8-bar melody in a minor key',
        kind: 'creative',
        brief: [
          'Write an 8-bar melody in a minor key. Any minor key: choose it in the Key menu (the mode must stay minor).',
          'Let the minor colour come through: lean on degree 3, and try the raised 7th just before the end.',
          'End on the keynote (degree 1). Check, then submit.',
        ],
        start: { key: 'A', mode: 'minor', bpm: 84, bars: 8 },
        lock: { bars: true },
        checks: [
          { type: 'mode-is', mode: 'minor' },
          { type: 'melody-fills', minNotes: 12 },
          { type: 'melody-ends-on-tonic' },
          { type: 'melody-range', maxRows: 10 },
        ],
        rubric: [
          { label: 'Minor colour and mood', max: 5 },
          { label: 'Melodic shape and rhythm', max: 5 },
          { label: 'Ending', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'mt-06-enharmony',
    course: 'Music Theory · Foundations',
    title: 'Enharmony',
    youtubeId: 'k-ksTtq8OCU',
    intro: 'One key, two names: why C♯ and D♭ are the same note on the piano, when E♯ and C♭ appear, and how a key decides which name is right.',
    exercises: [
      quizEx('mt06-twins', '1 · The other name', 'enharmonic', [
        'A key lights up with one of its names. Choose its other name.',
        'Watch out: white keys have other names too (E♯, B♯, C♭, F♭).',
      ]),
      quizEx('mt06-find', '2 · Find the spelled note', 'find-spelled', [
        'Click any key with the name shown. ♯ means a semitone up, ♭ a semitone down, whatever colour the key is.',
      ]),
      quizEx('mt06-spelling', '3 · Which name does the scale use?', 'scale-spelling', [
        'In a major scale, every letter is used once. Choose the right name for the degree asked.',
        'Tip: write the letters out in order first (G A B C D E F…), then add the ♯ or ♭.',
      ]),
    ],
  },
);

// ---------- Module 2 · Chords and harmony ----------

LESSONS.push(
  {
    id: 'mt-07-triads',
    course: 'Music Theory · Chords and harmony',
    title: 'Triads: building chords',
    youtubeId: 'TyEcpdtXfbk',
    videos: [
      { id: 'TyEcpdtXfbk', title: 'Part 1 · Building a chord' },
      { id: '9IuQ38Dq2MI', title: 'Part 2 · Chords over a scale' },
    ],
    intro: 'Stack two 3rds and you have a chord. Major, minor, diminished and augmented triads, and the chords that grow on every degree of the major scale.',
    exercises: [
      quizEx('mt07-build', '1 · Build the triad', 'build-chord', [
        'Watch Part 1 first. Click the 3 notes of the triad asked for, from the root up.',
        'The keys show m3 or M3 as you go. Major = M3 + m3. Minor = m3 + M3.',
      ], { count: 8, pass: 6, options: { qualities: ['major', 'minor'] } }),
      quizEx('mt07-quality', '2 · Major, minor, diminished or augmented?', 'chord-quality', [
        'A triad lights up and plays. Name its quality.',
        'Count the 3rds: M3 + m3 major, m3 + M3 minor, m3 + m3 diminished, M3 + M3 augmented.',
      ]),
      quizEx('mt07-hear', '3 · Hear major or minor', 'chord-quality', [
        'Listen to a chord (first note by note, then together). Is it major or minor?',
      ], { options: { ear: true, qualities: ['major', 'minor'] } }),
      { ...quizEx('mt07-scale', '4 · Chords over the scale', 'diatonic-chord', [
        'Watch Part 2 first. In a major key, what kind of chord grows on each degree?',
        'The pattern is the same in every major key: I ii iii IV V vi vii°.',
      ]), videoPart: 2 },
      {
        id: 'mt07-colours',
        title: '5 · Paint with major, minor and diminished',
        kind: 'creative',
        videoPart: 2,
        brief: [
          'Write an 8-bar chord progression in C major, one or two chords per bar.',
          'Use at least two minor chords (ii, iii, vi) and the diminished chord (vii°) somewhere. Tip: vii° sounds great just before I.',
          'Start on I and end on I. Listen to how each colour feels, then check and submit.',
        ],
        start: { key: 'C', mode: 'major', bpm: 88, bars: 8 },
        lock: { key: true, bars: true, melody: true },
        checks: [
          { type: 'starts-on-tonic' },
          { type: 'all-bars-filled' },
          { type: 'chord-qualities', need: { min: 2, dim: 1 } },
        ],
        rubric: [
          { label: 'Uses the chord colours with intention', max: 5 },
          { label: 'Sense of direction and ending', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'mt-08-sevenths',
    course: 'Music Theory · Chords and harmony',
    title: 'Seventh chords',
    youtubeId: '3Q3h4ASfl0A',
    intro: 'Add one more 3rd on top of a triad: major 7th, dominant 7th, minor 7th and half-diminished 7th, and where each lives in a major key.',
    exercises: [
      quizEx('mt08-build', '1 · Build the 7th chord', 'build-chord', [
        'Click the 4 notes of the 7th chord asked for, from the root up.',
        'Major 7th = major triad + M3. Dominant 7th = major triad + m3. Minor 7th = minor triad + m3. Half-diminished = diminished triad + M3.',
      ], { count: 8, pass: 6, options: { kind: 'seventh', qualities: ['major 7th', 'dominant 7th', 'minor 7th', 'half-diminished 7th'] } }),
      quizEx('mt08-quality', '2 · Name the 7th chord', 'chord-quality', [
        'A 7th chord lights up and plays. Which one is it?',
      ], { options: { kind: 'seventh', qualities: ['major 7th', 'dominant 7th', 'minor 7th', 'half-diminished 7th'] } }),
      quizEx('mt08-scale', '3 · 7th chords over the scale', 'diatonic-chord', [
        'In a major key, what 7th chord grows on each degree?',
        'The pattern: Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7. Only V has a dominant 7th.',
      ], { options: { seventh: true } }),
      {
        id: 'mt08-ii-v-i',
        title: '4 · The ii7 – V7 – Imaj7',
        kind: 'creative',
        brief: [
          'We are in F major. Switch on “Add 7th”, then build ii7 – V7 – Imaj7 – Imaj7, one chord per bar.',
          'Then write a melody over it: put chord tones (including the 7ths!) on beats 1 and 3.',
          'This is the most famous progression in jazz. Check, then submit.',
        ],
        start: { key: 'F', mode: 'major', bpm: 100, bars: 4 },
        lock: { key: true, bars: true },
        checks: [
          { type: 'progression', sequence: ['ii7', 'V7', 'Imaj7', 'Imaj7'] },
          { type: 'melody-fills', minNotes: 8 },
          { type: 'melody-chord-tones', minRatio: 0.6 },
        ],
        rubric: [
          { label: 'Melody brings out the 7ths', max: 5 },
          { label: 'Rhythm and phrasing', max: 5 },
          { label: 'Overall musicality', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'mt-09-gravity',
    course: 'Music Theory · Chords and harmony',
    title: 'Harmonic gravity',
    youtubeId: '74xos8HvpGk',
    intro: 'Tonality as it worked from Bach to Debussy: home (tonic), moving away (pre-dominant), tension (dominant), and the pull that brings us back.',
    exercises: [
      quizEx('mt09-function', '1 · Tonic, pre-dominant or dominant?', 'chord-function', [
        'What job does each chord do? Tonic = home (I, iii, vi). Pre-dominant = moving away (ii, IV). Dominant = tension that pulls home (V, vii°).',
      ]),
      quizEx('mt09-tendency', '2 · Where does the note want to go?', 'tendency-tone', [
        'Some notes of the scale are pulled by gravity. You hear the key, then one note: click the note it wants to move to.',
      ]),
      quizEx('mt09-cadence', '3 · Home or left hanging?', 'hear-cadence', [
        'Listen to a short progression. Does it land home (on I), or stop on V and leave you hanging?',
      ]),
      {
        id: 'mt09-journey',
        title: '4 · A journey away and home, in minor',
        kind: 'creative',
        brief: [
          'Gravity works in minor keys too. Choose any minor key and write 8 bars of chords.',
          'Start home (i), move away with a pre-dominant (iv or ii°), build tension with V, and land home with V – i at the end.',
          'In minor, V is major: its raised 7th is the leading tone that pulls home. Check, then submit.',
        ],
        start: { key: 'D', mode: 'minor', bpm: 80, bars: 8 },
        lock: { bars: true, melody: true },
        checks: [
          { type: 'mode-is', mode: 'minor' },
          { type: 'starts-on-tonic' },
          { type: 'all-bars-filled' },
          { type: 'predominant-before-dominant' },
          { type: 'ends-with-cadence', cadence: 'perfect' },
        ],
        rubric: [
          { label: 'Clear tension and release', max: 5 },
          { label: 'Choice of chords', max: 5 },
        ],
      },
    ],
  },
);

// ---------- Lesson 2 ----------

// The melodic patterns the class identified in the vocal parts of Sigur Rós, "Svefn-g-englar".
// Students pick one and compose a new melody that follows it. Each letter is one phrase.
export const SIGUR_ROS_PATTERNS = [
  'A B A B A′ C A′ C',
  'D D D D',
  'A E A E',
  'D D D F D D D F',
  'D G D G',
  'D G D G D G D G',
  'A H',
  'I L M L',
  'N O N O′ N O N O′',
  'D D D D D D',
];

// Beethoven, "Ode to Joy" (public domain), C major. Quarter note = 2 steps.
const q = (start, deg, len = 2, oct = 0) => ({ start, len, deg, oct });
const odeA = (o) => [
  q(o, 3), q(o + 2, 3), q(o + 4, 4), q(o + 6, 5),
  q(o + 8, 5), q(o + 10, 4), q(o + 12, 3), q(o + 14, 2),
  q(o + 16, 1), q(o + 18, 1), q(o + 20, 2), q(o + 22, 3),
];
const ODE_TO_JOY = [
  ...odeA(0), q(24, 3, 3), q(27, 2, 1), q(28, 2, 4), // A: ends E. D D
  ...odeA(32), q(56, 2, 3), q(59, 1, 1), q(60, 1, 4), // A′: ends D. C C
  q(64, 2), q(66, 2), q(68, 3), q(70, 1), // B
  q(72, 2), q(74, 3, 1), q(75, 4, 1), q(76, 3), q(78, 1),
  q(80, 2), q(82, 3, 1), q(83, 4, 1), q(84, 3), q(86, 2),
  q(88, 1), q(90, 2), q(92, 5, 4, -1),
  ...odeA(96), q(120, 2, 3), q(123, 1, 1), q(124, 1, 4), // A′
];

LESSONS.push({
  id: 'listen-form-1',
  course: 'Music Theory · Listening & Form',
  title: 'Hear it, name it, use it',
  youtubeId: '',
  intro:
    'Train your ears and your eyes. Find the chords of a real recording and write your own melody over them, then discover how melodies are built from repeating and changing phrases, and use that form in your own tune.',
  exercises: [
    {
      id: 'l2-listen',
      title: '1 · Bohemian Rhapsody: find the chords, invent a melody',
      kind: 'listen',
      // The clip is the official video, embedded from YouTube (nothing is copied or hosted here).
      listen: { youtubeId: 'fJ9rUzIMcZQ', start: 50, end: 105, label: 'Queen – Bohemian Rhapsody: the “Mama…” verse' },
      brief: [
        'Play the clip. Find the key: which note feels like home? Set it in the Key menu.',
        'Find the 4-bar chord loop and enter it in the chord lane. Careful: the last bar has two chords (click beat 3 of bar 4 for the second one). Press Play to compare with the recording. Check tells you which bars are right.',
        'When the key and all the chords are right, the melody grid unlocks. Invent a new melodic pattern over these chords: don’t copy Freddie’s!',
        'In your message to your teacher, name your pattern (e.g. A A′ B A). Check, then submit it for marking.',
      ],
      start: { key: 'C', mode: 'major', bpm: 72, bars: 4 },
      lock: { bars: true },
      gateMelody: true,
      checks: [
        { type: 'key-is', key: 'Bb', mode: 'major' },
        { type: 'progression-by-bar', sequence: ['I', 'vi', 'ii', ['ii', 'V']] }, // B♭ | Gm | Cm | Cm F
        { type: 'melody-fills', minNotes: 8 },
        { type: 'melody-chord-tones', minRatio: 0.6 },
      ],
      rubric: [
        { label: 'Chords found by ear', max: 5 },
        { label: 'Melody fits the harmony', max: 5 },
        { label: 'Melody has its own character', max: 5 },
      ],
    },
    {
      id: 'l2-sigur-analyse',
      title: '2 · Sigur Rós: label the vocal patterns',
      kind: 'form',
      noComposer: true,
      listen: { youtubeId: 'rtemrZ7-pj0', start: 0, label: 'Sigur Rós – Svefn-g-englar: the vocal parts' },
      brief: [
        'Listen to the vocal parts of Svefn-g-englar. The singing is split into 10 sections, in order, and each box is one phrase.',
        'Click a box, then a letter (or type it). Use the same letter whenever a phrase comes back, and a new letter for something new. Add ′ when a phrase comes back changed.',
        'Letters carry on through the whole song: if a phrase from section 1 returns in section 3, it gets the same letter.',
        'Press Check to see which sections are right, listen again, then submit.',
      ],
      start: { key: 'C', mode: 'major', bpm: 80, bars: 4 },
      sections: SIGUR_ROS_PATTERNS,
      sectionNotes: { 9: 'sung twice' },
      checks: [{ type: 'section-labels', sections: SIGUR_ROS_PATTERNS }],
      rubric: [],
    },
    {
      id: 'l2-pattern-compose',
      title: '3 · Sigur Rós: compose in one of its patterns',
      kind: 'creative',
      listen: { youtubeId: 'rtemrZ7-pj0', start: 0, label: 'Sigur Rós – Svefn-g-englar: listen to the vocal patterns' },
      brief: [
        'Listen to the vocal parts of Svefn-g-englar and follow the patterns we found in class.',
        'Choose one pattern from the list below, and how long each phrase is (1 or 2 bars). Each letter is one phrase.',
        'Compose a new melody that follows your pattern: the same letter repeats exactly, a prime (′) is a variation (same rhythm, some notes changed), and a new letter is new material.',
        'Choose your own key, tempo and chords, or press “Use the song’s chords” for the Svefn-g-englar loop: E | E/D | A/C♯ | A. The bass walks E – D – C♯ – A.',
        'Use ▶ next to each phrase to compare them. Check, then submit it for marking.',
      ],
      start: { key: 'E', mode: 'major', bpm: 76, bars: 8 },
      lock: { bars: true },
      patternChoice: { options: SIGUR_ROS_PATTERNS, phraseBars: [1, 2] },
      // The song's harmony (in E major): E | E/D | A/C♯ | A = I | I/♭7 | IV6 | IV.
      // E lasts two bars (the D is a passing bass note), then A lasts two bars (first over C♯, then on A).
      chordTemplate: {
        label: 'E | E/D | A/C♯ | A',
        progression: [1, { deg: 1, bass: { deg: 7, acc: -1 } }, { deg: 4, bass: { deg: 6, acc: 0 } }, 4],
      },
      checks: [{ type: 'melody-pattern', options: SIGUR_ROS_PATTERNS }],
      rubric: [
        { label: 'The pattern is clear when you listen', max: 5 },
        { label: 'Melodic invention', max: 5 },
        { label: 'Atmosphere and character', max: 5 },
        { label: 'Overall musicality', max: 5 },
      ],
    },
    {
      id: 'l2-form-analyse',
      title: '4 · Extra: analyse the form of Ode to Joy',
      kind: 'form',
      form: { phraseBars: 4, answer: ['A', 'A′', 'B', 'A′'], askRhythmPitch: true },
      brief: [
        'This is Beethoven’s “Ode to Joy”: 16 bars, four phrases of four bars.',
        'Play each phrase with its ▶ button and compare it with phrase 1.',
        'Label each phrase: the same letter for the same idea, a prime (A′) when it comes back changed, and a new letter (B) for new material.',
        'Tick whether each phrase has the same rhythm and the same pitches as phrase 1, then press Check.',
      ],
      start: { key: 'C', mode: 'major', bpm: 116, bars: 16, progression: [1, 5, 1, 5, 1, 5, 1, [5, 1], 5, 1, 5, 5, 1, 5, 1, [5, 1]], melody: ODE_TO_JOY },
      lock: { key: true, bars: true, chords: true, melody: true, note: 'This melody is for listening and analysis. Use the phrase buttons below the grid.' },
      checks: [
        { type: 'form-labels', answer: ['A', 'A′', 'B', 'A′'] },
        { type: 'form-rhythm-pitch', phraseBars: 4 },
      ],
      rubric: [],
    },
    {
      id: 'l2-form-compose',
      title: '5 · Extra: compose in the form A A′ B A′',
      kind: 'creative',
      form: { phraseBars: 2, show: ['A', 'A′', 'B', 'A′'] },
      brief: [
        'Now use the same form yourself: 8 bars, four phrases of two bars, over the given chords.',
        'Phrase 1 (A): write a short, catchy idea.',
        'Phrase 2 (A′): copy phrase 1 with the same rhythm, then change the last notes so it lands on the tonic.',
        'Phrase 3 (B): something new, with a different rhythm and shape. Phrase 4 (A′): bring phrase 2 back exactly.',
        'Check, then submit it for marking.',
      ],
      start: { key: 'C', mode: 'major', bpm: 100, bars: 8, progression: [1, 5, 1, [5, 1], 4, 5, 1, [5, 1]] },
      lock: { key: true, bars: true, chords: true },
      checks: [
        { type: 'melody-form', form: ['A', 'A′', 'B', 'A′'], phraseBars: 2 },
        { type: 'melody-ends-on-tonic' },
        { type: 'melody-chord-tones', minRatio: 0.5 },
      ],
      rubric: [
        { label: 'A: a clear, memorable idea', max: 5 },
        { label: 'A′: a convincing variation', max: 5 },
        { label: 'B: real contrast', max: 5 },
        { label: 'Overall musicality', max: 5 },
      ],
    },
  ],
});

export function findLesson(id) {
  return LESSONS.find((l) => l.id === id) || null;
}

export function findExercise(lessonId, exerciseId) {
  const lesson = findLesson(lessonId);
  const exercise = lesson?.exercises.find((e) => e.id === exerciseId) || null;
  return { lesson, exercise };
}

export const KIND_LABELS = {
  auto: 'Checked instantly',
  creative: 'Marked by your teacher',
  daw: 'DAW project · marked by your teacher',
  listen: 'Listening · chords checked, melody marked by your teacher',
  form: 'Analysis · checked instantly',
  quiz: 'Quick-fire practice · checked instantly',
};
