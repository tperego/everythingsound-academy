// Workspace = toolbar (transport, key, tempo, bars, view, mutes, MIDI out) + composer + staff view.

import { Player, listMidiOutputs } from './audio.js?v=202611141607';
import { Composer } from './composer.js?v=202611141607';
import { BAR_OPTIONS, cloneProject, normalizeProject, setBars, sliceProject } from './project.js?v=202611141607';
import { renderStaff } from './staff.js?v=202611141607';
import { ChordSheet, PianoView } from './piano.js?v=202611141607';
import { KEY_OPTIONS } from './theory.js?v=202611141607';
import { h, store, toast } from './util.js?v=202611141607';

export class Workspace {
  constructor(root, { readOnly = false, onChange = () => {}, player = null } = {}) {
    this.root = root;
    this.readOnly = readOnly;
    this.onChange = onChange;
    this.player = player || new Player();
    // Extra views shown with the grid: staff, piano keyboard, chord sheet.
    const oldView = store.get('es.view', 'grid');
    this.views = { staff: oldView === 'staff', piano: false, sheet: false, ...store.get('es.views', {}) };
    this.cursorStep = 0; // where the piano looks when not playing (the selected chord)
    this.title = '';
    this.lock = {};
    this.project = null;

    this.toolbar = h('div', { class: 'toolbar' });
    this.composerEl = h('div');
    this.staffEl = h('div', { class: 'staff', hidden: true });
    this.pianoEl = h('div', { hidden: true });
    this.sheetEl = h('div', { hidden: true });
    root.classList.add('workspace');
    root.append(this.toolbar, this.composerEl, this.pianoEl, this.staffEl, this.sheetEl);
    this.piano = new PianoView(this.pianoEl);
    this.sheet = new ChordSheet(this.sheetEl, {
      title: () => this.title,
      onPick: (ev) => { this.cursorStep = ev.start * 2; if (!this.views.piano) this.toggleView('piano', true); else this.renderPiano(); },
    });

    this.composer = new Composer(this.composerEl, {
      player: this.player,
      readOnly,
      onChange: (p) => this.update(p, { fromComposer: true }),
      onSelect: (slot) => {
        if (this.player.playing) return;
        this.cursorStep = slot * 4;
        this.renderPiano();
      },
    });
    this.stepOffset = 0; // when playing a single phrase, where it starts in the full piece
    this.player.onStep = (s) => {
      const step = s < 0 ? -1 : s + this.stepOffset;
      this.composer.setPlayhead(step);
      this.renderPiano(step < 0 ? this.cursorStep : step);
      if (this.views.sheet) this.sheet.highlight(step);
    };
    this.player.onStop = () => this.renderToolbar();

    this.onKey = (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      const t = e.target;
      if (t.closest('input, textarea, select, button, [contenteditable]')) return;
      e.preventDefault();
      this.togglePlay();
    };
    document.addEventListener('keydown', this.onKey);
  }

  setProject(project, { lock = {}, title = '', phraseBars = 0, phraseLabels = [] } = {}) {
    this.player.stop();
    this.project = normalizeProject(project);
    this.lock = lock;
    this.title = title;
    this.phraseBars = phraseBars;
    this.phraseLabels = phraseLabels;
    this.composer.setProject(this.project, lock, phraseBars, phraseLabels);
    this.renderToolbar();
    this.renderView();
  }

  /** Change what is locked without resetting the piece (e.g. unlock the melody once the chords are right). */
  setLock(lock) {
    this.lock = lock;
    this.composer.setProject(this.project, lock, this.phraseBars, this.phraseLabels);
    this.renderToolbar();
  }

  /** Play only some bars, once (e.g. one phrase). */
  async playRange(fromBar, nBars) {
    this.player.stop();
    this.stepOffset = fromBar * 8;
    try {
      await this.player.play(sliceProject(this.project, fromBar, nBars), { once: true });
    } catch (err) {
      toast('Could not start audio: ' + (err.message || err));
    }
    this.renderToolbar();
  }

  destroy() {
    this.player.stop();
    document.removeEventListener('keydown', this.onKey);
  }

  getProject() {
    return cloneProject(this.project);
  }

  update(p, { fromComposer = false, rebuild = false } = {}) {
    this.project = normalizeProject(p);
    if (!fromComposer) {
      if (rebuild) this.composer.setProject(this.project, this.lock, this.phraseBars, this.phraseLabels);
      else { this.composer.project = cloneProject(this.project); this.composer.renderLayers(); }
      this.renderToolbar();
    }
    if (this.player.playing && !this.player.once) this.player.schedule(this.project);
    this.renderView();
    this.onChange(this.getProject());
  }

  async togglePlay() {
    if (this.player.playing) this.player.stop();
    else {
      this.stepOffset = 0;
      try {
        await this.player.play(this.project);
      } catch (err) {
        toast('Could not start audio: ' + (err.message || err));
      }
    }
    this.renderToolbar();
  }

  renderView() {
    if (!this.project) return;
    this.staffEl.hidden = !this.views.staff;
    if (this.views.staff) renderStaff(this.staffEl, this.project, this.title);
    this.sheetEl.hidden = !this.views.sheet;
    if (this.views.sheet) this.sheet.render(this.project);
    this.renderPiano();
  }

  renderPiano(step = this.cursorStep) {
    this.pianoEl.hidden = !this.views.piano;
    if (!this.views.piano || !this.project) return;
    const max = this.project.bars * 8 - 1;
    this.piano.show(this.project, Math.max(0, Math.min(max, step)));
  }

  toggleView(name, on = !this.views[name]) {
    this.views[name] = on;
    store.set('es.views', this.views);
    this.renderView();
    this.renderToolbar();
  }

  renderToolbar() {
    const p = this.project;
    if (!p) return;
    const ro = this.readOnly;
    const playing = this.player.playing;

    const playBtn = h('button', { type: 'button', class: 'btn primary play', onclick: () => this.togglePlay(), 'aria-label': playing ? 'Stop' : 'Play', title: 'Play / stop (Space)' },
      playing ? '■ Stop' : '▶ Play');
    const loop = h('label', { class: 'toggle' },
      h('input', { type: 'checkbox', checked: this.player.loop, onchange: (e) => this.player.setLoop(e.target.checked) }), ' Loop');

    const keySel = h('select', { 'aria-label': 'Key', disabled: ro || this.lock.key, onchange: (e) => this.update({ ...this.project, key: e.target.value }) },
      KEY_OPTIONS[p.mode].map((k) => h('option', { value: k, selected: k === p.key }, k)));
    const modeSel = h('select', {
      'aria-label': 'Mode', disabled: ro || this.lock.key,
      onchange: (e) => {
        const mode = e.target.value;
        const key = KEY_OPTIONS[mode].includes(this.project.key) ? this.project.key : KEY_OPTIONS[mode][0];
        this.update({ ...this.project, mode, key });
      },
    }, ['major', 'minor'].map((m) => h('option', { value: m, selected: m === p.mode }, m)));

    const tempo = h('input', {
      type: 'number', min: 40, max: 220, value: p.bpm, 'aria-label': 'Tempo (BPM)', class: 'num', disabled: ro,
      onchange: (e) => this.update({ ...this.project, bpm: Number(e.target.value) }),
    });
    const barsSel = h('select', { 'aria-label': 'Bars', disabled: ro || this.lock.bars, onchange: (e) => this.update(setBars(this.project, Number(e.target.value)), { rebuild: true }) },
      [...new Set([...BAR_OPTIONS, p.bars])].sort((a, b) => a - b).map((n) => h('option', { value: n, selected: n === p.bars }, `${n} bars`)));

    const viewSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Show alongside the grid' },
      [['piano', 'Piano'], ['staff', 'Staff'], ['sheet', 'Chord sheet']].map(([v, label]) => h('button', {
        type: 'button', class: this.views[v] ? 'on' : '', 'aria-pressed': String(!!this.views[v]),
        onclick: () => this.toggleView(v),
      }, label)));

    const mutes = h('div', { class: 'seg mutes', role: 'group', 'aria-label': 'Tracks' },
      ['chords', 'bass', 'melody'].map((t) => h('button', {
        type: 'button', class: this.player.mute[t] ? '' : 'on', 'aria-pressed': String(!this.player.mute[t]), title: `Mute or unmute ${t}`,
        onclick: () => { this.player.mute[t] = !this.player.mute[t]; this.renderToolbar(); },
      }, t[0].toUpperCase() + t.slice(1))));

    const midiBtn = h('button', { type: 'button', class: 'btn ghost small', onclick: () => this.setupMidiOut(), title: 'Play the composer into Ableton, Logic or Pro Tools in real time' },
      this.player.midiOut ? `MIDI → ${this.player.midiOut.name}` : 'Live MIDI out…');

    this.toolbar.replaceChildren(
      h('div', { class: 'tb-group' }, playBtn, loop),
      h('div', { class: 'tb-group' }, h('span', { class: 'tb-label' }, 'Key'), keySel, modeSel),
      h('div', { class: 'tb-group' }, h('span', { class: 'tb-label' }, 'BPM'), tempo, barsSel),
      h('div', { class: 'tb-group' }, h('span', { class: 'tb-label' }, 'Show'), viewSeg),
      h('div', { class: 'tb-group' }, mutes, midiBtn),
    );
  }

  async setupMidiOut() {
    let outputs;
    try {
      outputs = await listMidiOutputs();
    } catch (err) {
      toast('MIDI access was blocked: ' + (err.message || err));
      return;
    }
    if (!outputs) {
      toast('This browser has no Web MIDI. Use Chrome or Edge for live MIDI out.');
      return;
    }
    const dlg = h('dialog', { class: 'dialog' });
    const close = () => { dlg.close(); dlg.remove(); this.renderToolbar(); };
    const list = outputs.length
      ? outputs.map((o) => h('button', { type: 'button', class: 'btn block' + (this.player.midiOut?.id === o.id ? ' primary' : ''), onclick: () => { this.player.midiOut = o; close(); toast(`Sending MIDI to ${o.name}`); } }, o.name))
      : [h('p', {}, 'No MIDI outputs found. On a Mac, open Audio MIDI Setup → Window → Show MIDI Studio, double-click "IAC Driver" and tick "Device is online". On Windows, install loopMIDI. Then try again.')];
    dlg.append(
      h('h3', {}, 'Live MIDI out'),
      h('p', { class: 'muted' }, 'Chords go out on channel 1, bass on 2 and melody on 3. In your DAW, set each MIDI track’s input to this port and channel, and arm it (Ableton: set Monitor to "In").'),
      ...list,
      h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: this.player.internal, onchange: (e) => { this.player.internal = e.target.checked; } }), ' Also play the built-in sounds'),
      h('div', { class: 'row-end' },
        this.player.midiOut ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { this.player.midiOut = null; this.player.internal = true; close(); } }, 'Turn off MIDI out') : '',
        h('button', { type: 'button', class: 'btn', onclick: close }, 'Done')),
    );
    document.body.append(dlg);
    dlg.showModal();
  }
}
