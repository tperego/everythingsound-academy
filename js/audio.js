// Playback with Tone.js (global `Tone` from the CDN script), plus optional live MIDI out to a DAW.

import { buildEvents } from './project.js?v=202611141612';

const MIDI_CHANNEL = { chords: 0, bass: 1, melody: 2 };

export class Player {
  constructor() {
    this.ready = false;
    this.playing = false;
    this.loop = true;
    this.internal = true; // play the built-in sounds
    this.mute = { chords: false, bass: false, melody: false };
    this.midiOut = null; // a Web MIDI output port
    this.onStep = null; // (step | -1) => void, for the playhead
    this.onStop = null;
    this.project = null;
  }

  async ensure() {
    if (this.ready) return;
    await Tone.start();
    const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 }).toDestination();
    this.synths = {
      chords: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fattriangle', count: 2, spread: 12 },
        envelope: { attack: 0.03, decay: 0.4, sustain: 0.55, release: 0.9 },
        volume: -16,
      }).connect(reverb),
      bass: new Tone.MonoSynth({
        oscillator: { type: 'square' },
        filter: { Q: 1, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.3 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3, baseFrequency: 120, octaves: 2.2 },
        volume: -15,
      }).connect(reverb),
      melody: new Tone.Synth({
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.5, release: 0.35 },
        volume: -9,
      }).connect(reverb),
    };
    this.ready = true;
  }

  async previewChord(midis) {
    await this.ensure();
    if (this.internal) this.synths.chords.triggerAttackRelease(midis.map(toFreq), 0.8, undefined, 0.6);
    this._sendNow(MIDI_CHANNEL.chords, midis, 800);
  }

  async previewNote(midi) {
    await this.ensure();
    if (this.internal) this.synths.melody.triggerAttackRelease(toFreq(midi), 0.3, undefined, 0.8);
    this._sendNow(MIDI_CHANNEL.melody, [midi], 300);
  }

  /** once: play through a single time, ignoring the Loop setting (used for single phrases). */
  async play(project, { once = false } = {}) {
    await this.ensure();
    this.once = once;
    const tr = Tone.getTransport();
    tr.stop();
    tr.position = 0;
    this.playing = true;
    this.schedule(project);
    tr.start('+0.05');
  }

  /** (Re)schedule a project. Safe to call while playing: the transport keeps its position. */
  schedule(project) {
    this.project = project;
    if (!this.ready) return;
    const tr = Tone.getTransport();
    tr.cancel(0);
    tr.bpm.value = project.bpm;
    const ppq = tr.PPQ;
    const at = (beats) => `${Math.round(beats * ppq)}i`;
    const spb = 60 / project.bpm;
    for (const ev of buildEvents(project)) {
      tr.schedule((time) => this._trigger(ev, time, spb), at(ev.start));
    }
    const steps = project.bars * 8;
    tr.scheduleRepeat(
      (time) => {
        const step = Math.round(tr.getTicksAtTime(time) / (ppq / 2)) % steps;
        Tone.getDraw().schedule(() => this.playing && this.onStep?.(step), time);
      },
      '8n',
      0,
    );
    const loop = this.loop && !this.once;
    tr.loop = loop;
    tr.loopStart = 0;
    tr.loopEnd = at(project.bars * 4);
    if (!loop) {
      tr.schedule((time) => Tone.getDraw().schedule(() => this.stop(), time), at(project.bars * 4));
    }
  }

  setLoop(on) {
    this.loop = on;
    if (this.playing && this.project) this.schedule(this.project);
  }

  stop() {
    if (!this.ready) return;
    const tr = Tone.getTransport();
    tr.stop();
    tr.cancel(0);
    this.synths.chords.releaseAll();
    this.synths.bass.triggerRelease();
    this.synths.melody.triggerRelease();
    this.playing = false;
    this.once = false;
    this._allNotesOff();
    this.onStep?.(-1);
    this.onStop?.();
  }

  _trigger(ev, time, spb) {
    const dur = Math.max(0.05, ev.dur * spb * 0.97);
    if (this.internal && !this.mute[ev.track]) {
      const s = this.synths[ev.track];
      if (ev.track === 'chords') s.triggerAttackRelease(ev.pitches.map(toFreq), dur, time, ev.vel);
      else s.triggerAttackRelease(toFreq(ev.pitches[0]), dur, time, ev.vel);
    }
    if (this.midiOut && !this.mute[ev.track]) {
      const ts = performance.now() + (time - Tone.getContext().currentTime) * 1000;
      const ch = MIDI_CHANNEL[ev.track];
      const vel = Math.round(ev.vel * 127);
      try {
        for (const p of ev.pitches) {
          this.midiOut.send([0x90 | ch, p, vel], ts);
          this.midiOut.send([0x80 | ch, p, 0], ts + dur * 1000);
        }
      } catch (err) {
        console.warn('MIDI send failed', err);
      }
    }
  }

  _sendNow(ch, pitches, ms) {
    if (!this.midiOut) return;
    const now = performance.now();
    try {
      for (const p of pitches) {
        this.midiOut.send([0x90 | ch, p, 90], now);
        this.midiOut.send([0x80 | ch, p, 0], now + ms);
      }
    } catch (err) {
      console.warn('MIDI send failed', err);
    }
  }

  _allNotesOff() {
    if (!this.midiOut) return;
    try {
      for (const ch of Object.values(MIDI_CHANNEL)) this.midiOut.send([0xb0 | ch, 123, 0]);
    } catch {
      /* port may have gone away */
    }
  }
}

function toFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Ask for Web MIDI access and list output ports. Returns null where the browser has no Web MIDI. */
export async function listMidiOutputs() {
  if (!navigator.requestMIDIAccess) return null;
  const access = await navigator.requestMIDIAccess();
  return [...access.outputs.values()];
}
