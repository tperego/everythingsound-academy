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

await test('inversions and slash chords', async () => {
  const { bassForChordTone, chordVoicing } = await import('./theory.js');
  const c = (k, m, chord) => chordInfo(k, m, chord);
  const first = { deg: 1, bass: bassForChordTone('C', 'major', { deg: 1 }, 1) };
  assertEq([c('C', 'major', first).roman, c('C', 'major', first).symbol], ['I6', 'C/E']);
  const second = { deg: 1, bass: bassForChordTone('C', 'major', { deg: 1 }, 2) };
  assertEq(c('C', 'major', second).roman, 'I64');
  const v65 = { deg: 5, seventh: true, bass: bassForChordTone('C', 'major', { deg: 5, seventh: true }, 1) };
  assertEq([c('C', 'major', v65).roman, c('C', 'major', v65).symbol], ['V65', 'G7/B']);
  // Minor key: V6 has the raised leading tone in the bass.
  const minorV6 = { deg: 5, bass: bassForChordTone('A', 'minor', { deg: 5 }, 1) };
  assertEq(c('A', 'minor', minorV6).symbol, 'E/G#');
  // Sigur Rós: E/D in E major is I with ♭7 in the bass.
  const eOverD = { deg: 1, bass: { deg: 7, acc: -1 } };
  assertEq([c('E', 'major', eOverD).roman, c('E', 'major', eOverD).symbol], ['I/♭7', 'E/D']);
  assertEq(chordVoicing(c('E', 'major', eOverD)).bass % 12, 2);
  assertEq(chordVoicing(c('C', 'major', first)).chord[0] % 12, 4);
  // Inversions still count as the same chord in checks.
  const p = newProject({ key: 'G', bars: 4, progression: [1, { deg: 5, bass: bassForChordTone('G', 'major', { deg: 5 }, 1) }, 6, 4] });
  assert(runChecks(LESSONS[0].exercises[0], p)[0].pass, 'V6 counts as V');
  // Bass survives save/load and MIDI export.
  const n = normalizeProject(JSON.parse(JSON.stringify(newProject({ key: 'E', bars: 1, progression: [eOverD] }))));
  assertEq(n.chords[0].bass, { deg: 7, acc: -1 });
  const bassTrack = readMidi(projectToMidi(n, { only: 'bass' })).tracks[1].notes;
  assertEq(bassTrack[0].pitch % 12, 2);
});

await test('Sigur Rós chord loop: E | E/D | A/C# | A', () => {
  const e = LESSONS[1].exercises.find((x) => x.id === 'l2-pattern-compose');
  const p = newProject({ key: 'E', mode: 'major', bars: 4, progression: e.chordTemplate.progression });
  const infos = chordEvents(p).map((ev) => chordInfo('E', 'major', ev.chord));
  assertEq(infos.map((i) => i.symbol), ['E', 'E/D', 'A/C#', 'A']);
  assertEq(infos.map((i) => i.roman), ['I', 'I/♭7', 'IV6', 'IV']);
  const bass = readMidi(projectToMidi(p, { only: 'bass' })).tracks[1].notes.map((n) => n.pitch % 12);
  assertEq(bass, [4, 2, 1, 9]); // E D C# A
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

await test('form: phrase comparison + Ode to Joy analysis', async () => {
  const { comparePhrases, phraseNotes } = await import('./form.js');
  const e = LESSONS[1].exercises.find((x) => x.id === 'l2-form-analyse');
  const p = newProject(e.start);
  const ph = [0, 1, 2, 3].map((i) => phraseNotes(p, i, 4));
  const c1 = comparePhrases(ph[0], ph[1]);
  assert(c1.sameRhythm && !c1.samePitch, 'A vs A′: same rhythm, different pitches ' + JSON.stringify(c1));
  assert(!comparePhrases(ph[0], ph[2]).sameRhythm, 'B has a different rhythm');
  assert(comparePhrases(ph[1], ph[3]).samePitch, 'last phrase repeats A′');
  const right = { formLabels: ['A', 'A′', 'B', 'A′'], sameRhythm: [false, true, false, true], samePitch: [false, false, false, false] };
  assert(runChecks(e, p, { answers: right }).every((r) => r.pass), JSON.stringify(runChecks(e, p, { answers: right })));
  const wrong = { formLabels: ['A', 'B', 'B', 'A′'], sameRhythm: [false, true, true, true], samePitch: [] };
  const res = runChecks(e, p, { answers: wrong });
  assert(!res[0].pass && res[0].detail.includes('phrase 2'), res[0].detail);
  assert(!res[1].pass && res[1].detail.includes('phrase 3'), res[1].detail);
});

await test('form: composing A A′ B A′', () => {
  const e = LESSONS[1].exercises.find((x) => x.id === 'l2-form-compose');
  const A = [q(0, 1), q(2, 3), q(4, 5), q(6, 3), q(8, 2), q(10, 7, 2, -1), q(12, 5, 4, -1)];
  const Ap = [q(16, 1), q(18, 3), q(20, 5), q(22, 3), q(24, 2), q(26, 2), q(28, 1, 4)];
  const B = [q(32, 4, 1), q(33, 5, 1), q(34, 6, 4), q(38, 4, 2), q(40, 5, 6), q(46, 7, 2, -1)];
  const shift = (notes, by) => notes.map((n) => ({ ...n, start: n.start + by }));
  const good = newProject({ ...e.start, melody: [...A, ...Ap, ...B, ...shift(Ap, 32)] });
  const res = runChecks(e, good);
  assert(res.every((r) => r.pass), JSON.stringify(res.filter((r) => !r.pass)));
  // Phrase 4 not repeating phrase 2 should fail.
  const bad = newProject({ ...e.start, melody: [...A, ...Ap, ...B, ...shift(B, 16)] });
  assert(runChecks(e, bad).some((r) => !r.pass), 'wrong form should fail');
  function q(start, deg, len = 2, oct = 0) { return { start, len, deg, oct }; }
});

await test('listening: key, chords by bar, melody unlock', async () => {
  const { chordsFound } = await import('./checks.js');
  const e = LESSONS[1].exercises.find((x) => x.id === 'l2-listen');
  const wrongKey = newProject({ key: 'C', bars: 4, progression: [1, 6, 2, [2, 5]] });
  assert(!chordsFound(e, wrongKey), 'right chords in the wrong key stay locked');
  const half = newProject({ key: 'Bb', bars: 4, progression: [1, 6, 4, 4] });
  const r = runChecks(e, half)[1];
  assert(!r.pass && r.detail.includes('Right: bar 1, 2') && r.detail.includes('bar 3, 4'), r.detail);
  assert(chordsFound(e, newProject({ key: 'Bb', bars: 4, progression: [1, 6, { deg: 2, seventh: true }, [2, { deg: 5, seventh: true }]] })), 'sevenths count');
});

await test('Bohemian: split last bar (Cm then F)', async () => {
  const { chordsFound } = await import('./checks.js');
  const e = LESSONS[1].exercises.find((x) => x.id === 'l2-listen');
  const right = newProject({ key: 'Bb', bars: 4, progression: [1, 6, 2, [2, 5]] });
  assert(chordsFound(e, right), 'Bb Gm Cm Cm-F should be right');
  const noSplit = newProject({ key: 'Bb', bars: 4, progression: [1, 6, 2, 5] });
  const r = runChecks(e, noSplit)[1];
  assert(!r.pass && r.detail.includes('bar 4'), r.detail);
});

await test('Sigur Rós: compose in a chosen pattern', () => {
  const e = LESSONS[1].exercises.find((x) => x.id === 'l2-pattern-compose');
  const q = (start, deg, len = 2, oct = 0) => ({ start, len, deg, oct });
  const bar = (b, notes) => notes.map(([st, deg, len = 2]) => q(b * 8 + st, deg, len));
  // Pattern D G D G, one bar per phrase.
  const D = [[0, 3], [2, 2], [4, 1, 4]];
  const G = [[0, 5, 1], [1, 6, 1], [2, 7, 6]];
  const melody = [...bar(0, D), ...bar(1, G), ...bar(2, D), ...bar(3, G)];
  const p = newProject({ key: 'A', bars: 4, melody });
  const ok = runChecks(e, p, { answers: { pattern: 'D G D G', phraseBars: 1 } });
  assert(ok.every((r) => r.pass), JSON.stringify(ok.filter((r) => !r.pass)));
  assert(!runChecks(e, p, { answers: { pattern: 'not a pattern', phraseBars: 1 } })[0].pass, 'unknown pattern fails');
  const notRepeated = newProject({ key: 'A', bars: 4, melody: [...bar(0, D), ...bar(1, G), ...bar(2, G), ...bar(3, D)] });
  assert(runChecks(e, notRepeated, { answers: { pattern: 'D G D G', phraseBars: 1 } }).some((r) => !r.pass), 'wrong order fails');
});

await test('Sigur Rós: labelling sections, any consistent letters', () => {
  const e = LESSONS[1].exercises.find((x) => x.id === 'l2-sigur-analyse');
  const teacher = e.sections.map((s) => s.split(' '));
  assert(runChecks(e, null, { answers: { sectionLabels: teacher } })[0].pass, 'teacher answer passes');
  // Same structure with different letters (A<->D swapped everywhere) still passes.
  const swap = { A: 'D', D: 'A' };
  const renamed = teacher.map((sec) => sec.map((l) => (swap[l[0]] || l[0]) + l.slice(1)));
  assert(runChecks(e, null, { answers: { sectionLabels: renamed } })[0].pass, 'consistent renaming passes');
  // One wrong section is reported by number.
  const oneWrong = teacher.map((sec) => [...sec]);
  oneWrong[2] = ['A', 'E', 'E', 'A'];
  const r = runChecks(e, null, { answers: { sectionLabels: oneWrong } })[0];
  assert(!r.pass && r.detail.includes('Listen again to section 3'), r.detail);
  // Missing prime is wrong.
  const noPrime = teacher.map((sec) => sec.map((l) => l.replace('′', '')));
  const r2 = runChecks(e, null, { answers: { sectionLabels: noPrime } })[0];
  assert(!r2.pass && r2.detail.includes('section 1'), r2.detail);
});

await test('lesson 1 is unchanged', () => {
  assertEq(LESSONS[0].exercises.map((x) => x.id), ['p1-build', 'p1-cadence', 'p1-melody', 'p1-daw']);
});

const failed = results.filter((r) => !r.ok);
window.__testResults = { passed: results.length - failed.length, failed: failed.length, results };
const out = document.getElementById('out');
out.textContent = results.map((r) => `${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : '\n    ' + r.err}`).join('\n') + `\n\n${results.length - failed.length} passed, ${failed.length} failed`;
document.title = failed.length ? `✗ ${failed.length} failed` : `✓ all ${results.length} passed`;
