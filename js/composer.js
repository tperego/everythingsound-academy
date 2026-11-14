// The composer grid: a chord lane (half-bar slots) and a scale-degree melody grid (8th-note steps).

import { MELODY_ROWS, SLOTS_PER_BAR, STEPS_PER_BAR, chordEvents, cloneProject, removeOverlaps } from './project.js?v=202611141938';
import { FUNCTION_NAMES, bassForChordTone, bassOptions, chordDegrees, chordInfo, chordVoicing, degreeName, midiForDegree } from './theory.js?v=202611141938';
import { h } from './util.js?v=202611141938';

const ROW_H = 22;

export class Composer {
  constructor(root, { player, onChange = () => {}, onSelect = () => {}, readOnly = false } = {}) {
    this.root = root;
    this.player = player;
    this.onChange = onChange;
    this.onSelect = onSelect;
    this.readOnly = readOnly;
    this.project = null;
    this.lock = {};
    this.selected = 0;
    this.seventh = false;
    this.pending = null;
    root.classList.add('composer');
  }

  setProject(project, lock = this.lock, phraseBars = this.phraseBars, phraseLabels = this.phraseLabels) {
    this.project = cloneProject(project);
    this.lock = lock || {};
    this.phraseBars = phraseBars || 0;
    this.phraseLabels = phraseLabels || [];
    this.selected = Math.min(this.selected, this.project.chords.length - 1);
    this.build();
  }

  get chordsEditable() {
    return !this.readOnly && !this.lock.chords;
  }

  get melodyEditable() {
    return !this.readOnly && !this.lock.melody;
  }

  emit() {
    this.renderLayers();
    this.onChange(cloneProject(this.project));
  }

  build() {
    const p = this.project;
    const steps = p.bars * STEPS_PER_BAR;
    this.root.replaceChildren();
    this.root.style.setProperty('--steps', steps);
    this.root.style.setProperty('--bars', p.bars);
    this.root.style.setProperty('--slots', p.bars * SLOTS_PER_BAR);

    // Ruler with bar numbers
    // (phrase starts are marked when the exercise is about melodic form)
    const pb = this.phraseBars;
    const ruler = h('div', { class: 'ruler', 'aria-hidden': 'true' }, Array.from({ length: p.bars }, (_, b) => {
      const phraseStart = pb && b % pb === 0;
      return h('span', { class: phraseStart ? `phrase-start${(b / pb) % 2 ? ' alt' : ''}` : (pb && Math.floor(b / pb) % 2 ? 'alt' : '') },
        String(b + 1), phraseStart ? h('b', {}, ` Phrase ${b / pb + 1}`) : '',
        phraseStart && this.phraseLabels[b / pb] ? h('span', { class: 'phrase-letter' }, this.phraseLabels[b / pb]) : '');
    }));

    // Chord lane
    this.chordLane = h('div', {
      class: 'chord-lane' + (this.chordsEditable ? ' editable' : ''),
      tabindex: this.chordsEditable ? '0' : null,
      role: this.chordsEditable ? 'listbox' : null,
      'aria-label': 'Chord lane. Arrow keys move, 1 to 7 picks a chord, Backspace clears.',
    });
    if (this.chordsEditable) {
      this.chordLane.addEventListener('pointerdown', (e) => this.onChordPointer(e));
      this.chordLane.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const slot = this.slotAt(e);
        this.selected = slot;
        this.clearSlot(slot);
      });
      this.chordLane.addEventListener('keydown', (e) => this.onChordKey(e));
    }

    // Melody grid
    this.melodyGrid = h('div', {
      class: 'melody-grid' + (this.melodyEditable ? ' editable' : ''),
      style: { height: `${MELODY_ROWS.length * ROW_H}px` },
      'aria-label': 'Melody grid',
    });
    MELODY_ROWS.forEach((r, i) => {
      this.melodyGrid.append(h('div', { class: `row-stripe${r.deg === 1 ? ' tonic' : ''}${i % 2 ? ' odd' : ''}`, style: { top: `${i * ROW_H}px`, height: `${ROW_H}px` } }));
    });
    this.guideLayer = h('div', { class: 'layer' });
    this.noteLayer = h('div', { class: 'layer' });
    this.melodyPlayhead = h('div', { class: 'playhead', hidden: true });
    this.chordPlayhead = h('div', { class: 'playhead', hidden: true });
    this.melodyGrid.append(this.guideLayer, this.noteLayer, this.melodyPlayhead);
    if (this.melodyEditable) {
      this.melodyGrid.addEventListener('pointerdown', (e) => this.onMelodyDown(e));
      this.melodyGrid.addEventListener('pointermove', (e) => this.onMelodyMove(e));
      this.melodyGrid.addEventListener('pointerup', (e) => this.onMelodyUp(e));
      this.melodyGrid.addEventListener('pointercancel', () => { this.pending = null; this.renderLayers(); });
    }

    // Row labels
    this.rowLabels = h('div', { class: 'row-labels', style: { height: `${MELODY_ROWS.length * ROW_H}px` } });

    const grid = h('div', { class: 'comp-grid' },
      h('div', { class: 'lbl' }),
      ruler,
      h('div', { class: 'lbl chord-lbl' }, 'Chords'),
      this.chordLane,
      this.rowLabels,
      this.melodyGrid,
    );
    const scroller = h('div', { class: 'comp-scroll' }, grid);

    this.palette = h('div', { class: 'palette' });
    this.root.append(scroller, this.palette);
    this.renderLayers();
  }

  renderLayers() {
    const p = this.project;
    const steps = p.bars * STEPS_PER_BAR;
    const pct = (s) => `${(s / steps) * 100}%`;
    const events = chordEvents(p);

    // Row labels (depend on key)
    this.rowLabels.replaceChildren(
      ...MELODY_ROWS.map((r) =>
        h('div', { class: `row-label${r.deg === 1 ? ' tonic' : ''}`, style: { height: `${ROW_H}px` } },
          h('b', { class: `deg deg-${r.deg}` }, String(r.deg)), ' ', degreeName(p.key, p.mode, r.deg))),
    );

    // Chord lane: slots + chord blocks
    const lane = [];
    for (let s = 0; s < p.chords.length; s++) {
      lane.push(h('div', {
        class: `slot${s % SLOTS_PER_BAR === 0 ? ' bar-start' : ''}${this.chordsEditable && s === this.selected ? ' selected' : ''}`,
        style: { left: pct(s * 4), width: pct(4) },
        role: this.chordsEditable ? 'option' : null,
        'aria-selected': this.chordsEditable && s === this.selected ? 'true' : null,
        'aria-label': `Bar ${Math.floor(s / 2) + 1}, beat ${(s % 2) * 2 + 1}`,
      }));
    }
    for (const ev of events) {
      const info = chordInfo(p.key, p.mode, ev.chord);
      lane.push(h('div', {
        class: `chord-block fn-${info.func}`,
        style: { left: pct(ev.start * 2), width: pct(ev.len * 2) },
        title: `${info.roman} · ${info.symbol} · ${FUNCTION_NAMES[info.func]}`,
      }, h('span', { class: 'roman' }, info.roman), h('span', { class: 'sym' }, info.symbol)));
    }
    lane.push(this.chordPlayhead);
    this.chordLane.replaceChildren(...lane);

    // Chord-tone guides
    const guides = [];
    for (const ev of events) {
      const degs = chordDegrees(ev.chord.deg, ev.chord.seventh);
      MELODY_ROWS.forEach((r, i) => {
        if (degs.includes(r.deg)) {
          guides.push(h('div', { class: `guide fn-${chordInfo(p.key, p.mode, ev.chord).func}`, style: { left: pct(ev.start * 2), width: pct(ev.len * 2), top: `${i * ROW_H}px`, height: `${ROW_H}px` } }));
        }
      });
    }
    this.guideLayer.replaceChildren(...guides);

    // Notes
    const notes = this.pending ? previewMerge(p.melody, this.pending) : p.melody;
    this.noteLayer.replaceChildren(
      ...notes.map((n) => {
        const row = MELODY_ROWS.findIndex((r) => r.deg === n.deg && r.oct === n.oct);
        return h('div', {
          class: `note deg-${n.deg}${n === this.pending ? ' pending' : ''}`,
          style: { left: pct(n.start), width: pct(n.len), top: `${row * ROW_H + 2}px`, height: `${ROW_H - 4}px` },
          title: `Degree ${n.deg} · ${degreeName(p.key, p.mode, n.deg)}`,
        }, n.len >= 1 ? String(n.deg) : '');
      }),
    );

    this.renderPalette();
    this.onSelect(this.selected);
  }

  renderPalette() {
    const p = this.project;
    // An exercise can explain why something is locked (e.g. "the melody unlocks when the chords are right").
    const note = this.lock.note && !this.readOnly ? h('p', { class: 'lock-note' }, this.lock.note) : '';
    if (!this.chordsEditable) {
      this.palette.replaceChildren(
        note || (this.lock.chords && !this.readOnly ? h('p', { class: 'hint' }, 'The chords are given in this exercise. Write your melody over them.') : ''),
      );
      return;
    }
    const buttons = [];
    for (let deg = 1; deg <= 7; deg++) {
      const info = chordInfo(p.key, p.mode, { deg, seventh: this.seventh });
      buttons.push(h('button', {
        class: `chord-btn fn-${info.func}`,
        type: 'button',
        title: `${FUNCTION_NAMES[info.func]} · key ${deg}`,
        onclick: () => this.assign(deg),
      }, h('span', { class: 'roman' }, info.roman), h('span', { class: 'sym' }, info.symbol)));
    }
    const seventh = h('label', { class: 'toggle' },
      h('input', { type: 'checkbox', checked: this.seventh, onchange: (e) => { this.seventh = e.target.checked; this.renderPalette(); } }),
      ' Add 7th');
    const clear = h('button', { type: 'button', class: 'btn ghost small', onclick: () => this.clearSlot(this.selected) }, 'Clear slot');

    // Bass: inversions (3rd/5th/7th in the bass) or any other bass note (slash chords like E/D).
    const t = this.bassTarget();
    const tc = t != null ? p.chords[t] : null;
    const ti = tc ? chordInfo(p.key, p.mode, tc) : null;
    const opts = bassOptions(p.key, p.mode);
    const toneBtn = (label, tone) => h('button', {
      type: 'button',
      class: `btn small${ti && ti.inversion === tone ? ' on' : ''}`,
      disabled: !tc || (tone === 3 && !tc.seventh),
      onclick: () => this.setBass(tone === 0 ? null : bassForChordTone(p.key, p.mode, tc, tone)),
    }, label);
    const bassRow = h('div', { class: 'palette-row small bass-row' },
      h('span', { class: 'tb-label' }, 'Bass'),
      toneBtn('Root', 0), toneBtn('3rd in bass', 1), toneBtn('5th in bass', 2), toneBtn('7th in bass', 3),
      h('select', {
        'aria-label': 'Other bass note',
        disabled: !tc,
        onchange: (e) => {
          const o = opts[Number(e.target.value)];
          if (o) this.setBass(o.pc === ti.pcs[0] ? null : { deg: o.deg, acc: o.acc });
        },
      }, h('option', { value: '' }, 'Any bass note…'), opts.map((o, i) => h('option', { value: i, selected: !!ti && ti.inversion === -1 && ti.bassPc === o.pc }, o.label))),
      h('span', { class: 'hint' }, tc ? `Changing: ${ti.symbol} (${ti.roman}), bar ${Math.floor(t / 2) + 1}${t % 2 ? ', beat 3' : ''}` : 'Pick a chord first, then its bass.'));
    const legend = h('div', { class: 'legend' },
      h('span', { class: 'dot fn-T' }), 'Tonic ', h('span', { class: 'dot fn-PD' }), 'Pre-dominant ', h('span', { class: 'dot fn-D' }), 'Dominant');
    this.palette.replaceChildren(
      note,
      h('div', { class: 'palette-row' }, ...buttons),
      bassRow,
      h('div', { class: 'palette-row small' }, seventh, clear, legend,
        h('span', { class: 'hint' }, `Selected: bar ${Math.floor(this.selected / 2) + 1}${this.selected % 2 ? ', beat 3' : ''}. An empty slot keeps the chord before it.`)),
    );
  }

  slotAt(e) {
    const rect = this.chordLane.getBoundingClientRect();
    const slots = this.project.chords.length;
    return Math.max(0, Math.min(slots - 1, Math.floor(((e.clientX - rect.left) / rect.width) * slots)));
  }

  onChordPointer(e) {
    if (e.button !== 0) return;
    this.selected = this.slotAt(e);
    const c = this.project.chords[this.selected];
    if (c) this.previewChord(c);
    this.renderLayers();
    this.chordLane.focus({ preventScroll: true });
  }

  onChordKey(e) {
    const slots = this.project.chords.length;
    if (/^[1-7]$/.test(e.key)) { this.assign(Number(e.key)); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { this.selected = Math.min(slots - 1, this.selected + 1); this.renderLayers(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { this.selected = Math.max(0, this.selected - 1); this.renderLayers(); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { this.clearSlot(this.selected); e.preventDefault(); }
  }

  /** The chord the Bass buttons change: the selected one, or the one just entered. */
  bassTarget() {
    if (this.project.chords[this.selected]) return this.selected;
    const l = this.lastAssigned;
    return l != null && this.project.chords[l] ? l : null;
  }

  setBass(bass) {
    const t = this.bassTarget();
    if (t == null) return;
    const c = { ...this.project.chords[t] };
    if (bass) c.bass = bass;
    else delete c.bass;
    this.project.chords[t] = c;
    this.previewChord(c);
    this.emit();
  }

  assign(deg) {
    const chord = { deg, seventh: this.seventh };
    this.project.chords[this.selected] = chord;
    this.lastAssigned = this.selected;
    this.previewChord(chord);
    // Jump to the next bar so a progression can be typed quickly.
    const next = this.selected % 2 === 0 ? this.selected + 2 : this.selected + 1;
    if (next < this.project.chords.length) this.selected = next;
    this.emit();
  }

  clearSlot(slot) {
    this.project.chords[slot] = null;
    this.emit();
  }

  previewChord(chord) {
    const v = chordVoicing(chordInfo(this.project.key, this.project.mode, chord));
    this.player?.previewChord([v.bass, ...v.chord]);
  }

  cellAt(e) {
    const rect = this.melodyGrid.getBoundingClientRect();
    const steps = this.project.bars * STEPS_PER_BAR;
    const step = Math.max(0, Math.min(steps - 1, Math.floor(((e.clientX - rect.left) / rect.width) * steps)));
    const row = Math.max(0, Math.min(MELODY_ROWS.length - 1, Math.floor((e.clientY - rect.top) / ROW_H)));
    return { step, row };
  }

  onMelodyDown(e) {
    if (e.button !== 0) return;
    const { step, row } = this.cellAt(e);
    const r = MELODY_ROWS[row];
    const hit = this.project.melody.find((n) => n.deg === r.deg && n.oct === r.oct && n.start <= step && step < n.start + n.len);
    if (hit) {
      this.project.melody = this.project.melody.filter((n) => n !== hit);
      this.emit();
      return;
    }
    this.pending = { start: step, len: 1, deg: r.deg, oct: r.oct };
    this.melodyGrid.setPointerCapture(e.pointerId);
    this.player?.previewNote(midiForDegree(this.project.key, this.project.mode, r.deg, r.oct));
    this.renderLayers();
  }

  onMelodyMove(e) {
    if (!this.pending) return;
    const { step } = this.cellAt(e);
    const len = Math.max(1, step - this.pending.start + 1);
    if (len !== this.pending.len) {
      this.pending.len = len;
      this.renderLayers();
    }
  }

  onMelodyUp() {
    if (!this.pending) return;
    this.project.melody = previewMerge(this.project.melody, this.pending).map((n) => ({ start: n.start, len: n.len, deg: n.deg, oct: n.oct }));
    this.pending = null;
    this.emit();
  }

  setPlayhead(step) {
    const steps = this.project.bars * STEPS_PER_BAR;
    for (const ph of [this.melodyPlayhead, this.chordPlayhead]) {
      if (!ph) continue;
      ph.hidden = step < 0;
      if (step >= 0) {
        ph.style.left = `${(step / steps) * 100}%`;
        ph.style.width = `${100 / steps}%`;
      }
    }
  }
}

/** The new note replaces anything it covers; earlier notes that run into it are shortened. */
function previewMerge(melody, note) {
  const end = note.start + note.len;
  const kept = melody.filter((n) => !(n.start >= note.start && n.start < end));
  return removeOverlaps([...kept, note]).map((n) => (n.start === note.start ? note : n));
}
