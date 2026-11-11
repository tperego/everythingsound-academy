// Logic tests, run in the browser: open tests.html.

import { runChecks } from './checks.js';
import { LESSONS } from './lessons.js';
import { analyseMidi, projectToMidi, readMidi } from './midi.js';
import { buildEvents, chordEvents, newProject, normalizeProject, removeOverlaps } from './project.js';
import { projectToAbc } from './staff.js';
import { makeSubmission, parseSubmission } from './submission.js';
import { chordInfo, keySignatureSf, scaleNames } from './theory.js';
import { pack, unpack } from './util.js';

const results = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, ok: true }))
    .catch((err) => results.push({ name, ok: false, err: String(err?.stack || err) }));
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function assertEq(a, b, msg = '') {
  if (!eq(a, b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

const ex = (id) => LESSONS[0].exercises.find((e) => e.id === id);

await test('scale spelling', () => {
  assertEq(scaleNames('G', 'major'), ['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
  assertEq(scaleNames('F', 'major'), ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
  assertEq(scaleNames('Db', 'major'), ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
  assertEq(scaleNames('C#', 'minor'), ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B']);
  assertEq(keySignatureSf('D', 'major'), 2);
  assertEq(keySignatureSf('Eb', 'major'), -3);
  assertEq(keySignatureSf('A', 'minor'), 0);
});

await test('chord numerals and symbols', () => {
  const r = (k, m, deg, seventh = false) => chordInfo(k, m, { deg, seventh });
  assertEq([1, 2, 3, 4, 5, 6, 7].map((d) => r('C', 'major', d).roman), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assertEq(r('G', 'major', 5).symbol, 'D');
  assertEq(r('G', 'major', 6).symbol, 'Em');
  assertEq(r('G', 'major', 7).symbol, 'F#dim');
  assertEq(r('A', 'minor', 5).roman, 'V');
  assertEq(r('A', 'minor', 5).symbol, 'E');
  assertEq(r('A', 'minor', 7).symbol, 'G#dim');
  assertEq(r('A', 'minor', 3).roman, 'III');
  assertEq(r('C', 'major', 5, true).roman, 'V7');
  assertEq(r('C', 'major', 1, true).roman, 'Imaj7');
  assertEq(r('C', 'major', 2, true).symbol, 'Dm7');
  assertEq(r('C', 'major', 7, true).roman, 'viiø7');
  assertEq(r('A', 'minor', 7, true).roman, 'vii°7');
});

await test('project model', () => {
  const p = newProject({ key: 'G', bars: 4, progression: [1, 5, 6, 4] });
  assertEq(chordEvents(p).map((e) => [e.start, e.len, e.chord.deg]), [[0, 4, 1], [4, 4, 5], [8, 4, 6], [12, 4, 4]]);
  const n = normalizeProject({ key: 'H', mode: 'weird', bars: 999, bpm: 'x', chords: [{ deg: 9 }], melody: [{ start: -3, deg: 2 }, { start: 2, len: 50, deg: 3, oct: 5 }] });
  assertEq([n.key, n.mode, n.bars, n.bpm], ['C', 'major', 32, 90]);
  // Out-of-range values are pulled back into range rather than crashing the composer.
  assertEq(n.melody.map((x) => [x.start, x.oct]), [[0, 0], [2, 1]]);
  assertEq(n.chords[0], { deg: 7, seventh: false });
  assertEq(removeOverlaps([{ start: 0, len: 4, deg: 1, oct: 0 }, { start: 2, len: 2, deg: 2, oct: 0 }]).map((x) => x.len), [2, 2]);
});

await test('exercise 1 check', () => {
  const good = newProject({ key: 'G', bars: 4, progression: [1, 5, 6, 4] });
  assert(runChecks(ex('p1-build'), good).every((r) => r.pass), 'correct answer should pass');
  const bad = newProject({ key: 'G', bars: 4, progression: [1, 4, 6, 5] });
  assert(!runChecks(ex('p1-build'), bad)[0].pass, 'wrong answer should fail');
  const sevenths = newProject({ key: 'G', bars: 4, progression: [1, { deg: 5, seventh: true }, 6, 4] });
  assert(runChecks(ex('p1-build'), sevenths)[0].pass, 'V7 should count as V');
});

await test('exercise 2 checks', () => {
  const good = newProject({ key: 'C', bars: 8, progression: [1, 6, 2, 5, 1, 4, 5, 1] });
  const res = runChecks(ex('p1-cadence'), good);
  assert(res.every((r) => r.pass), JSON.stringify(res));
  const noCadence = newProject({ key: 'C', bars: 8, progression: [1, 6, 2, 5, 1, 4, 5, 6] });
  assert(!runChecks(ex('p1-cadence'), noCadence)[3].pass, 'ending on vi is not perfect');
  const gap = newProject({ key: 'C', bars: 8, progression: [null, 6, 2, 5, 1, 4, 5, 1] });
  assert(!runChecks(ex('p1-cadence'), gap)[0].pass && !runChecks(ex('p1-cadence'), gap)[1].pass, 'empty first bar fails');
});

await test('exercise 3 melody checks', () => {
  const e = ex('p1-melody');
  const melody = [];
  // Chord tones on beats 1 and 3, passing notes between; ends on 1.
  const tones = [[1, 3], [6, 1], [4, 6], [5, 7], [3, 5], [4, 1], [2, 7], [1, 1]];
  tones.forEach(([a, b], bar) => {
    melody.push({ start: bar * 8, len: 4, deg: a, oct: 0 });
    melody.push({ start: bar * 8 + 4, len: 4, deg: b, oct: b === 7 ? -1 : 0 });
  });
  melody[melody.length - 2].len = 8;
  melody.pop();
  const p = newProject({ ...e.start, melody });
  const res = runChecks(e, p);
  assert(res.every((r) => r.pass), JSON.stringify(res));
});

await test('MIDI round trip + DAW analysis', () => {
  const p = newProject(ex('p1-daw').start);
  const bytes = projectToMidi(p, { name: 'Test' });
  const parsed = readMidi(bytes);
  assertEq(parsed.tracks.map((t) => t.name), ['Test', 'Chords', 'Bass', 'Melody']);
  assertEq(Math.round(parsed.bpm), 96);
  assertEq(parsed.keySig, { sf: 1, minor: false });
  const evs = buildEvents(p);
  assertEq(parsed.tracks[1].notes.length, evs.filter((e) => e.track === 'chords').reduce((a, e) => a + e.pitches.length, 0));
  assertEq(parsed.tracks[3].notes.map((n) => n.pitch), evs.filter((e) => e.track === 'melody').map((e) => e.pitches[0]));
  assertEq(parsed.tracks[3].notes[0].start, 0);
  const a = analyseMidi(parsed, 'G', 'major');
  assertEq(a.bars.map((b) => b.roman), ['I', 'V', 'vi', 'IV']);
  assertEq(a.outOfKeyCount, 0);
  const ctx = { midi: { fileName: 'x.mid', analysis: a }, audio: { fileName: 'x.mp3' } };
  const res = runChecks(ex('p1-daw'), p, ctx);
  assert(res.every((r) => r.pass), JSON.stringify(res));
  const single = readMidi(projectToMidi(p, { only: 'bass' }));
  assertEq(single.tracks.length, 2);
});

await test('MIDI reader: running status and note-on velocity 0', () => {
  // Format 0, one track: C4 on, E4 on (running status), both off via velocity 0.
  const trk = [0x00, 0x90, 60, 100, 0x00, 64, 100, 0x83, 0x60, 60, 0, 0x00, 64, 0, 0x00, 0xff, 0x2f, 0x00];
  const bytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, trk.length, ...trk]);
  const m = readMidi(bytes);
  assertEq(m.tracks[0].notes.map((n) => [n.pitch, n.start, n.dur]), [[60, 0, 1], [64, 0, 1]]);
  let threw = false;
  try { readMidi(new Uint8Array([1, 2, 3, 4])); } catch { threw = true; }
  assert(threw, 'garbage should throw');
});

await test('staff (ABC) export', () => {
  const p = newProject({ key: 'F', bars: 2, progression: [1, 5], melody: [{ start: 0, len: 6, deg: 1 }, { start: 6, len: 4, deg: 3 }] });
  const abc = projectToAbc(p, 'T');
  assert(abc.includes('K:F'), abc);
  assert(abc.includes('"F"F6 A2- | "C"A2 z6 |]'), abc);
  const minor = projectToAbc(newProject({ key: 'A', mode: 'minor', bars: 1, melody: [{ start: 0, len: 8, deg: 3, oct: 1 }] }));
  assert(minor.includes("K:Am") && minor.includes("c'8"), minor);
});

await test('submission + link packing', async () => {
  const p = newProject({ key: 'G', bars: 4, progression: [1, 5, 6, 4] });
  const sub = makeSubmission({ lessonId: 'l', exerciseId: 'e', exerciseTitle: 'E', student: 'Sam', message: 'hi', project: p, checks: [{ label: 'x', pass: true }] });
  const back = parseSubmission(await unpack(await pack(sub)));
  assertEq(back.project, p);
  assertEq(back.student.name, 'Sam');
  let threw = false;
  try { parseSubmission({ format: 'nope' }); } catch { threw = true; }
  assert(threw, 'wrong format should throw');
});

const failed = results.filter((r) => !r.ok);
window.__testResults = { passed: results.length - failed.length, failed: failed.length, results };
const out = document.getElementById('out');
out.textContent = results.map((r) => `${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : '\n    ' + r.err}`).join('\n') + `\n\n${results.length - failed.length} passed, ${failed.length} failed`;
document.title = failed.length ? `✗ ${failed.length} failed` : `✓ all ${results.length} passed`;
