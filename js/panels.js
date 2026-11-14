// Shared display pieces used on both the student and the teacher page.

import { midiNoteName } from './midi.js?v=202611141651';
import { h } from './util.js?v=202611141651';

export function renderChecks(results) {
  if (!results.length) return h('p', { class: 'muted' }, 'No automatic checks for this exercise.');
  const passed = results.filter((r) => r.pass).length;
  return h('div', { class: 'checks' },
    h('p', { class: `check-summary ${passed === results.length ? 'ok' : ''}` },
      passed === results.length
        ? (results.length === 1 ? 'Check passed ✓' : `All ${results.length} checks passed ✓`)
        : `${passed} of ${results.length} checks passed`),
    h('ul', { class: 'check-list' },
      results.map((r) => h('li', { class: r.pass ? 'pass' : 'fail' },
        h('span', { class: 'mark', 'aria-label': r.pass ? 'passed' : 'not yet' }, r.pass ? '✓' : '✗'),
        h('div', {}, h('div', {}, r.label), r.detail ? h('div', { class: 'detail' }, r.detail) : '')))));
}

export function renderMidiAnalysis(a, project) {
  if (!a) return '';
  return h('div', { class: 'analysis' },
    h('div', { class: 'analysis-stats' },
      stat('Notes', a.noteCount),
      stat('Tracks', a.tracks.length),
      stat('Outside the key', `${a.outOfKeyCount} (${Math.round(a.outOfKeyRatio * 100)}%)`),
      a.bpm ? stat('Tempo in file', `${a.bpm} BPM`) : ''),
    a.tracks.length
      ? h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Track'), h('th', {}, 'Notes'), h('th', {}, 'Range'))),
        h('tbody', {}, a.tracks.map((t) => h('tr', {}, h('td', {}, t.name), h('td', {}, String(t.count)), h('td', {}, `${midiNoteName(t.low)} – ${midiNoteName(t.high)}`)))))
      : '',
    h('p', { class: 'muted small' }, `Chords heard in each bar (in ${project.key} ${project.mode}):`),
    h('div', { class: 'bar-chips' },
      a.bars.map((b) => h('span', { class: 'chip', title: `Bar ${b.bar}: ${b.symbol} (${Math.round(b.confidence * 100)}% of the notes fit)` },
        h('small', {}, String(b.bar)), b.roman))));
}

function stat(label, value) {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, String(value)), h('div', { class: 'stat-l' }, label));
}
