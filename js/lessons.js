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
};
