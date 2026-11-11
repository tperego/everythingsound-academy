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
        'Choose your own key, tempo and chords. Use ▶ next to each phrase to compare them. Check, then submit it for marking.',
      ],
      start: { key: 'A', mode: 'major', bpm: 76, bars: 8 },
      lock: { bars: true },
      patternChoice: { options: SIGUR_ROS_PATTERNS, phraseBars: [1, 2] },
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
};
