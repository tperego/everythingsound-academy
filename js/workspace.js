// Workspace = toolbar (transport, key, tempo, bars, view, mutes, MIDI out) + composer + staff view.

import { Player, listMidiOutputs } from './audio.js';
import { Composer } from './composer.js';
import { BAR_OPTIONS, cloneProject, normalizeProject, setBars, sliceProject } from './project.js';
import { renderStaff } from './staff.js';
import { KEY_OPTIONS } from './theory.js';
import { h, store, toast } from './util.js';

export class Workspace {
  constructor(root, { readOnly = false, onChange = () => {}, player = null } = {}) {
    this.root = root;
    this.readOnly = readOnly;
    this.onChange = onChange;
    this.player = player || new Player();
    this.view = store.get('es.view', 'grid');
    this.title = '';
    this.lock = {};
    this.project = null;

    this.toolbar = h('div', { class: 'toolbar' });
    this.composerEl = h('div');
    this.staffEl = h('div', { class: 'staff', hidden: true });
    root.classList.add('workspace');
    root.append(this.toolbar, this.composerEl, this.staffEl);

    this.composer = new Composer(this.composerEl, {
      player: this.player,
      readOnly,
      onChange: (p) => this.update(p, { fromComposer: true }),
    });
    this.stepOffset = 0; // when playing a single phrase, where it starts in the full piece
    this.player.onStep = (s) => this.composer.setPlayhead(s < 0 ? -1 : s + this.stepOffset);
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

  setProject(project, { lock = {}, title = '', phraseBars = 0 } = {}) {
    this.player.stop();
    this.project = normalizeProject(project);
    this.lock = lock;
    this.title = title;
    this.phraseBars = phraseBars;
    this.composer.setProject(this.project, lock, phraseBars);
    this.renderToolbar();
    this.renderView();
  }

  /** Change what is locked without resetting the piece (e.g. unlock the melody once the chords are right). */
  setLock(lock) {
    this.lock = lock;
    this.composer.setProject(this.project, lock, this.phraseBars);
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
      if (rebuild) this.composer.setProject(this.project, this.lock, this.phraseBars);
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
    const staff = this.view === 'staff';
    this.staffEl.hidden = !staff;
    if (staff) renderStaff(this.staffEl, this.project, this.title);
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

    const viewSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'View' },
      ['grid', 'staff'].map((v) => h('button', {
        type: 'button', class: this.view === v ? 'on' : '', 'aria-pressed': String(this.view === v),
        onclick: () => { this.view = v; store.set('es.view', v); this.renderView(); this.renderToolbar(); },
      }, v === 'grid' ? 'Grid only' : 'Grid + staff')));

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
      h('div', { class: 'tb-group' }, viewSeg),
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
