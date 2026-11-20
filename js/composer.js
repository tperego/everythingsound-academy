// The composer grid: a chord lane (half-bar slots) and a scale-degree melody grid (8th-note steps).

import { SLOTS_PER_BAR, STEPS_PER_BAR, chordEvents, cloneProject, formSections, ghostNotes, letterBars, melodyRows, removeOverlaps, rowIndexOf } from './project.js?v=202611200111';
import { FUNCTION_NAMES, SCALES, bassForChordTone, bassOptions, chordInfo, chordVoicing, degreeLabel, midiForDegree, noteName } from './theory.js?v=202611200111';
import { h, store } from './util.js?v=202611200111';

const ROW_H = 22;
// Letters offered on the Form lane (any of A–H can also be typed, ' adds a prime).
const FORM_PAD = ['A', 'A′', 'A″', 'B', 'B′', 'B″', 'C', 'C′', 'D'];
const FORM_LEN_OPTIONS = [1, 2, 4, 8];
const letterBase = (l) => String(l || '').replace(/[′″]/g, '');

export class Composer {
  constructor(root, { player, onChange = () => {}, onSelect = () => {}, onStartBar = null, readOnly = false, letters = false } = {}) {
    this.onStartBar = onStartBar; // a click on a bar number: play from there
    this.startBar = 0;
    this.letters = letters; // the Form lane: letters over bars (Sandbox)
    this.pen = 0; // melody pen: 0 scale notes, 1 sharp, -1 flat
    this.formSel = { from: 0, to: 3 };
    this.formLen = store.get('es.formLen', 4);
    this.showGhost = store.get('es.formGhost', true);
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
    const last = this.project.bars - 1;
    this.formSel = { from: Math.min(this.formSel.from, last), to: Math.min(this.formSel.to, last) };
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

  /** Melody rows for the current mode (minor adds the raised 6th and 7th). */
  get rows() {
    return melodyRows(this.project?.mode);
  }

  build() {
    const p = this.project;
    const ROWS = this.rows;
    const steps = p.bars * STEPS_PER_BAR;
    this.root.replaceChildren();
    this.root.style.setProperty('--steps', steps);
    this.root.style.setProperty('--bars', p.bars);
    this.root.style.setProperty('--slots', p.bars * SLOTS_PER_BAR);

    // Ruler with bar numbers
    // (phrase starts are marked when the exercise is about melodic form)
    const pb = this.phraseBars;
    const ruler = h('div', { class: 'ruler' + (this.onStartBar ? ' clickable' : ''), 'aria-hidden': 'true' }, Array.from({ length: p.bars }, (_, b) => {
      const phraseStart = pb && b % pb === 0;
      return h('span', {
        class: (phraseStart ? `phrase-start${(b / pb) % 2 ? ' alt' : ''}` : (pb && Math.floor(b / pb) % 2 ? 'alt' : '')) + (b === this.startBar && b > 0 ? ' play-from' : ''),
        title: this.onStartBar ? (b === this.startBar && b > 0 ? 'Playing from here. Click again to play from the start.' : `Play from bar ${b + 1}`) : null,
        onclick: this.onStartBar ? () => this.onStartBar(b === this.startBar ? 0 : b) : null,
      },
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
      style: { height: `${ROWS.length * ROW_H}px` },
      'aria-label': 'Melody grid',
    });
    ROWS.forEach((r, i) => {
      this.melodyGrid.append(h('div', { class: `row-stripe${r.deg === 1 ? ' tonic' : ''}${i % 2 ? ' odd' : ''}${r.acc ? ' raised' : ''}`, style: { top: `${i * ROW_H}px`, height: `${ROW_H}px` } }));
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
    this.rowLabels = h('div', { class: 'row-labels', style: { height: `${ROWS.length * ROW_H}px` } });

    // Form lane: letters over bars
    this.formLane = null;
    if (this.letters) {
      this.formLane = h('div', {
        class: 'form-lane' + (this.readOnly ? '' : ' editable'),
        tabindex: this.readOnly ? null : '0',
        'aria-label': 'Form lane. Tap a bar or drag across bars, then pick a letter. Keys A to H set a letter, apostrophe adds a prime, Backspace clears.',
      });
      if (!this.readOnly) {
        this.formLane.addEventListener('pointerdown', (e) => this.onFormDown(e));
        this.formLane.addEventListener('pointermove', (e) => this.onFormMove(e));
        this.formLane.addEventListener('pointerup', () => this.onFormUp());
        this.formLane.addEventListener('pointercancel', () => { this.formDrag = null; });
        this.formLane.addEventListener('keydown', (e) => this.onFormKey(e));
      }
    }

    const grid = h('div', { class: 'comp-grid' },
      h('div', { class: 'lbl' }),
      ruler,
      ...(this.formLane ? [h('div', { class: 'lbl chord-lbl' }, 'Form'), this.formLane] : []),
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
    const ROWS = this.rows;
    // The grid is built for a number of rows: rebuild it when the mode changes that number.
    if (this.melodyGrid.querySelectorAll('.row-stripe').length !== ROWS.length) { this.build(); return; }
    const rowOf = (n) => rowIndexOf(n.deg, n.oct, n.acc, p.mode);
    // Pentatonic scales: the two degrees left out stay playable but faded.
    const outside = SCALES[p.mode]?.outside || [];
    this.melodyGrid.querySelectorAll('.row-stripe').forEach((el, i) => el.classList.toggle('outside', outside.includes(ROWS[i].deg) && !ROWS[i].acc));

    // Row labels (depend on key)
    this.rowLabels.replaceChildren(
      ...ROWS.map((r) =>
        h('div', { class: `row-label${r.deg === 1 ? ' tonic' : ''}${r.acc ? ' raised' : ''}${outside.includes(r.deg) && !r.acc ? ' outside' : ''}`, style: { height: `${ROW_H}px` }, title: r.acc ? (r.deg === 7 ? 'Raised 7th (leading note): the 3rd of V' : 'Raised 6th (melodic minor, going up to the raised 7th)') : outside.includes(r.deg) ? 'Not in the pentatonic scale: you can still use it' : null },
          h('b', { class: `deg deg-${r.deg}` }, degreeLabel(r.deg, r.acc)), ' ', noteName(p.key, p.mode, r.deg, r.acc))),
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

    // Chord-tone guides: rows that sound a note of the chord (over V in minor, the raised 7th)
    const guides = [];
    for (const ev of events) {
      const info = chordInfo(p.key, p.mode, { deg: ev.chord.deg, seventh: ev.chord.seventh });
      ROWS.forEach((r, i) => {
        if (info.pcs.includes(midiForDegree(p.key, p.mode, r.deg, r.oct, r.acc) % 12)) {
          guides.push(h('div', { class: `guide fn-${info.func}`, style: { left: pct(ev.start * 2), width: pct(ev.len * 2), top: `${i * ROW_H}px`, height: `${ROW_H}px` } }));
        }
      });
    }
    // Ghost: the melody of an earlier phrase with the same letter, faded, where it would repeat.
    if (this.letters && this.showGhost) {
      for (const n of ghostNotes(p)) {
        const row = rowOf(n);
        if (row < 0) continue;
        guides.push(h('div', {
          class: `ghost-note deg-${n.deg}`,
          style: { left: pct(n.start), width: pct(n.len), top: `${row * ROW_H + 2}px`, height: `${ROW_H - 4}px` },
        }, n.len >= 1 ? degreeLabel(n.deg, n.acc) : ''));
      }
    }
    this.guideLayer.replaceChildren(...guides);
    this.renderFormLane();

    // Notes
    const notes = this.pending ? previewMerge(p.melody, this.pending) : p.melody;
    this.noteLayer.replaceChildren(
      ...notes.map((n) => {
        const row = rowOf(n);
        return h('div', {
          class: `note deg-${n.deg}${n.acc ? ' raised' : ''}${n.acc === -1 ? ' flat' : ''}${n === this.pending ? ' pending' : ''}`,
          style: { left: pct(n.start), width: pct(n.len), top: `${row * ROW_H + 2}px`, height: `${ROW_H - 4}px` },
          title: `Degree ${degreeLabel(n.deg, n.acc)} · ${noteName(p.key, p.mode, n.deg, n.acc)}`,
        }, n.len >= 1 ? degreeLabel(n.deg, n.acc) : '');
      }),
    );

    this.renderPalette();
    this.onSelect(this.selected);
  }

  renderPalette() {
    const p = this.project;
    // An exercise can explain why something is locked (e.g. "the melody unlocks when the chords are right").
    const note = this.lock.note && !this.readOnly ? h('p', { class: 'lock-note' }, this.lock.note) : '';
    const formRow = this.formPalette();
    const penRow = this.penPalette();
    if (!this.chordsEditable) {
      this.palette.replaceChildren(
        formRow,
        penRow,
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
      formRow,
      penRow,
      note,
      h('div', { class: 'palette-row' }, ...buttons),
      bassRow,
      h('div', { class: 'palette-row small' }, seventh, clear, legend,
        h('span', { class: 'hint' }, `Selected: bar ${Math.floor(this.selected / 2) + 1}${this.selected % 2 ? ', beat 3' : ''}. An empty slot keeps the chord before it.`)),
    );
  }

  /** Mark the bar playback starts from (0 = the beginning). */
  setStartBar(b) {
    this.startBar = b;
    this.build();
  }

  /** The melody pen: draw scale notes, or sharpen or flatten the next notes you draw (any degree, any scale). */
  penPalette() {
    if (!this.melodyEditable) return '';
    const b = (val, label, title) => h('button', {
      type: 'button', class: this.pen === val ? 'on' : '', 'aria-pressed': String(this.pen === val), title,
      onclick: () => { this.pen = val; this.renderPalette(); },
    }, label);
    return h('div', { class: 'palette-row small pen-row' },
      h('span', { class: 'tb-label' }, 'Melody'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Melody pen' },
        b(0, 'Scale notes', 'Draw notes of the scale'),
        b(1, '♯ Sharp', 'The notes you draw next are sharpened'),
        b(-1, '♭ Flat', 'The notes you draw next are flattened')),
      h('span', { class: 'hint' }, this.pen ? `Drawing ${this.pen > 0 ? 'sharp' : 'flat'} notes: they show ${this.pen > 0 ? '♯' : '♭'} on the note. Switch back to Scale notes when you’re done.` : 'Need a note outside the scale? Pick ♯ or ♭, then draw it on its degree.'));
  }

  // ---------- Form lane: letters over bars ----------

  renderFormLane() {
    if (!this.formLane) return;
    const p = this.project;
    const pct = (b) => `${(b / p.bars) * 100}%`;
    const { from, to } = this.formSel;
    const kids = [];
    if (!this.readOnly) kids.push(h('div', { class: 'form-sel', style: { left: pct(from), width: pct(to - from + 1) } }));
    for (const sec of formSections(p)) {
      kids.push(h('div', {
        class: `form-block fl-${letterBase(sec.label)}${sec.label.length > 1 ? ' prime' : ''}`,
        style: { left: pct(sec.start), width: pct(sec.len) },
        title: `${sec.label}: bar${sec.len > 1 ? 's' : ''} ${sec.start + 1}${sec.len > 1 ? `–${sec.start + sec.len}` : ''}`,
      }, sec.label));
    }
    this.formLane.replaceChildren(...kids);
  }

  formPalette() {
    if (!this.letters || this.readOnly) return '';
    const p = this.project;
    const { from, to } = this.formSel;
    const sel = from === to ? `bar ${from + 1}` : `bars ${from + 1}–${to + 1}`;
    return h('div', { class: 'palette-row small form-row' },
      h('span', { class: 'tb-label' }, 'Form'),
      ...FORM_PAD.map((l) => h('button', {
        type: 'button', class: `form-btn fl-${letterBase(l)}${l.length > 1 ? ' prime' : ''}`, title: `Mark ${sel} as ${l}`,
        onclick: () => this.setLetter(l),
      }, l)),
      h('button', { type: 'button', class: 'btn ghost small', onclick: () => this.setLetter(null) }, 'Clear'),
      h('label', { class: 'field inline' }, 'Tap selects',
        h('select', {
          'aria-label': 'Bars selected by a tap on the Form lane',
          onchange: (e) => {
            this.formLen = Number(e.target.value);
            store.set('es.formLen', this.formLen);
            this.selectBars(this.formSel.from, this.formSel.from + this.formLen - 1);
          },
        }, FORM_LEN_OPTIONS.map((n) => h('option', { value: n, selected: n === this.formLen }, `${n} bar${n > 1 ? 's' : ''}`)))),
      h('label', { class: 'toggle' },
        h('input', { type: 'checkbox', checked: this.showGhost, onchange: (e) => { this.showGhost = e.target.checked; store.set('es.formGhost', this.showGhost); this.renderLayers(); } }),
        ' Show ghosts'),
      h('span', { class: 'hint' }, `Selected: ${sel}. A later A or A′ shows the first A’s melody faded, as a target.`),
      p.form?.length ? '' : h('span', { class: 'hint' }, 'Tap a bar on the Form lane (or drag across bars), then pick a letter.'));
  }

  barAt(e) {
    const rect = this.formLane.getBoundingClientRect();
    const bars = this.project.bars;
    return Math.max(0, Math.min(bars - 1, Math.floor(((e.clientX - rect.left) / rect.width) * bars)));
  }

  selectBars(a, b) {
    const last = this.project.bars - 1;
    const from = Math.max(0, Math.min(last, Math.min(a, b)));
    const to = Math.max(from, Math.min(last, Math.max(a, b)));
    this.formSel = { from, to };
    this.renderFormLane();
    this.renderPalette();
  }

  onFormDown(e) {
    if (e.button !== 0) return;
    const b = this.barAt(e);
    this.formDrag = { start: b, moved: false };
    this.formLane.setPointerCapture(e.pointerId);
    this.formLane.focus({ preventScroll: true });
    this.selectBars(b, b);
  }

  onFormMove(e) {
    if (!this.formDrag) return;
    const b = this.barAt(e);
    if (b !== this.formDrag.start) this.formDrag.moved = true;
    if (this.formDrag.moved) this.selectBars(this.formDrag.start, b);
  }

  onFormUp() {
    if (!this.formDrag) return;
    // A tap selects a whole phrase (the "Tap selects" length); a drag selects exactly the bars dragged over.
    if (!this.formDrag.moved) this.selectBars(this.formDrag.start, this.formDrag.start + this.formLen - 1);
    this.formDrag = null;
  }

  onFormKey(e) {
    const { from, to } = this.formSel;
    const len = to - from + 1;
    if (/^[a-h]$/i.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      this.setLetter(e.key.toUpperCase());
      e.preventDefault();
    } else if (e.key === "'" || e.key === '′' || e.key === '’') {
      // Add a prime to the selected phrase, or the one just lettered: A → A′ → A″ → A.
      const secs = formSections(this.project);
      const sec = secs.find((f) => f.start === from) || (this.lastLettered && secs.find((f) => f.start === this.lastLettered.from));
      if (sec) {
        const l = sec.label;
        const next = l.endsWith('″') ? letterBase(l) : l.endsWith('′') ? `${letterBase(l)}″` : `${l}′`;
        this.setLetter(next, { from: sec.start, to: sec.start + sec.len - 1 }, false);
      }
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      this.setLetter(null);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      this.selectBars(from + len, to + len);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      this.selectBars(Math.max(0, from - len), Math.max(0, from - len) + len - 1);
      e.preventDefault();
    }
  }

  /** Letter the selected bars as one phrase, then move on to the next phrase of the same length (so A A B A is four taps). */
  setLetter(label, range = this.formSel, advance = true) {
    const p = this.project;
    p.form = letterBars(p.form, range.from, range.to, label);
    this.lastLettered = { ...range };
    const len = range.to - range.from + 1;
    if (advance && label && range.to + 1 < p.bars) this.formSel = { from: range.to + 1, to: Math.min(p.bars - 1, range.to + len) };
    this.emit();
    this.formLane?.focus({ preventScroll: true });
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
    const row = Math.max(0, Math.min(this.rows.length - 1, Math.floor((e.clientY - rect.top) / ROW_H)));
    return { step, row };
  }

  onMelodyDown(e) {
    if (e.button !== 0) return;
    const { step, row } = this.cellAt(e);
    const r = this.rows[row];
    const p = this.project;
    const hit = p.melody.find((n) => rowIndexOf(n.deg, n.oct, n.acc, p.mode) === row && n.start <= step && step < n.start + n.len);
    if (hit) {
      this.project.melody = this.project.melody.filter((n) => n !== hit);
      this.emit();
      return;
    }
    // A raised row (♯7 in minor) is already sharp; elsewhere the pen decides.
    const acc = r.acc || this.pen;
    this.pending = { start: step, len: 1, deg: r.deg, oct: r.oct, ...(acc ? { acc } : {}) };
    this.melodyGrid.setPointerCapture(e.pointerId);
    this.player?.previewNote(midiForDegree(p.key, p.mode, r.deg, r.oct, acc));
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
    this.project.melody = previewMerge(this.project.melody, this.pending).map((n) => ({ start: n.start, len: n.len, deg: n.deg, oct: n.oct, ...(n.acc ? { acc: n.acc } : {}) }));
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
