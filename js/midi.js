// Standard MIDI File writer and reader. Works with Ableton Live, Logic Pro and Pro Tools.

import { buildEvents } from './project.js?v=202611141938';
import { detectChord, inKeyPcs, keySignatureSf } from './theory.js?v=202611141938';

export const PPQ = 480;

const enc = new TextEncoder();
const u16 = (n) => [(n >> 8) & 255, n & 255];
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

function vlq(n) {
  const bytes = [n & 0x7f];
  n >>>= 7;
  while (n > 0) {
    bytes.unshift((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  return bytes;
}

function chunk(type, data) {
  return [...enc.encode(type), ...u32(data.length), ...data];
}

function metaText(type, text) {
  const b = [...enc.encode(text)];
  return [0xff, type, ...vlq(b.length), ...b];
}

function encodeTrack(events) {
  // At the same tick: meta first, then note-offs, then note-ons.
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const out = [];
  let last = 0;
  for (const e of events) {
    out.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  out.push(0x00, 0xff, 0x2f, 0x00);
  return chunk('MTrk', out);
}

/**
 * tracks: [{ name, channel (0-15), program (GM, optional), notes: [{pitch, start, dur, vel(0..1)}] }]
 * start/dur in beats (quarter notes).
 */
export function writeMidi({ name = 'EverythingSound', bpm, key, mode, tracks }) {
  const mpqn = Math.round(60000000 / bpm);
  const sf = keySignatureSf(key, mode);
  const conductor = [
    { tick: 0, order: 0, data: metaText(0x03, name) },
    { tick: 0, order: 0, data: [0xff, 0x51, 0x03, (mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255] },
    { tick: 0, order: 0, data: [0xff, 0x58, 0x04, 4, 2, 24, 8] },
    { tick: 0, order: 0, data: [0xff, 0x59, 0x02, sf & 255, mode === 'minor' ? 1 : 0] },
  ];
  const chunks = [encodeTrack(conductor)];
  for (const t of tracks) {
    const ch = t.channel & 15;
    const ev = [{ tick: 0, order: 0, data: metaText(0x03, t.name) }];
    if (t.program != null) ev.push({ tick: 0, order: 0, data: [0xc0 | ch, t.program & 127] });
    for (const n of t.notes) {
      const on = Math.round(n.start * PPQ);
      const off = Math.max(on + 1, Math.round((n.start + n.dur) * PPQ) - 1);
      const vel = Math.max(1, Math.min(127, Math.round((n.vel ?? 0.8) * 127)));
      ev.push({ tick: on, order: 2, data: [0x90 | ch, n.pitch & 127, vel] });
      ev.push({ tick: off, order: 1, data: [0x80 | ch, n.pitch & 127, 0] });
    }
    chunks.push(encodeTrack(ev));
  }
  const header = chunk('MThd', [...u16(1), ...u16(chunks.length), ...u16(PPQ)]);
  return new Uint8Array([...header, ...chunks.flat()]);
}

const TRACK_DEFS = {
  chords: { name: 'Chords', channel: 0, program: 0 },
  bass: { name: 'Bass', channel: 1, program: 33 },
  melody: { name: 'Melody', channel: 2, program: 0 },
};

/** Project -> MIDI file bytes. `only` limits to one track ('chords' | 'bass' | 'melody'). */
export function projectToMidi(project, { name = 'EverythingSound', only = null } = {}) {
  const events = buildEvents(project);
  const tracks = Object.entries(TRACK_DEFS)
    .filter(([id]) => !only || id === only)
    .map(([id, def]) => ({
      ...def,
      notes: events
        .filter((e) => e.track === id)
        .flatMap((e) => e.pitches.map((pitch) => ({ pitch, start: e.start, dur: e.dur, vel: e.vel }))),
    }));
  return writeMidi({ name, bpm: project.bpm, key: project.key, mode: project.mode, tracks });
}

/** Parse a MIDI file. Returns notes per track in beats. Throws on files that aren't MIDI. */
export function readMidi(buffer) {
  const d = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let p = 0;
  const need = (n) => {
    if (p + n > d.length) throw new Error('The MIDI file is cut short.');
  };
  const r32 = () => { need(4); const v = ((d[p] << 24) | (d[p + 1] << 16) | (d[p + 2] << 8) | d[p + 3]) >>> 0; p += 4; return v; };
  const r16 = () => { need(2); const v = (d[p] << 8) | d[p + 1]; p += 2; return v; };
  const rStr = (n) => { need(n); const s = String.fromCharCode(...d.subarray(p, p + n)); p += n; return s; };
  const rVlq = () => {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      need(1);
      const b = d[p++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
    return v;
  };

  if (rStr(4) !== 'MThd') throw new Error('This is not a MIDI file.');
  const hlen = r32();
  const format = r16();
  const ntrks = r16();
  const div = r16();
  p = 8 + hlen;
  const ppq = div & 0x8000 ? 480 : div || 480;

  let bpm = null;
  let keySig = null;
  let timeSig = null;
  const tracks = [];
  const dec = new TextDecoder();

  for (let t = 0; t < ntrks && p + 8 <= d.length; t++) {
    const type = rStr(4);
    const len = r32();
    const end = Math.min(d.length, p + len);
    if (type !== 'MTrk') { p = end; continue; }
    let tick = 0;
    let status = 0;
    let name = '';
    const notes = [];
    const open = new Map();
    while (p < end) {
      tick += rVlq();
      need(1);
      const b = d[p];
      if (b === 0xff) {
        p++;
        const mt = d[p++];
        const l = rVlq();
        need(l);
        const data = d.subarray(p, p + l);
        p += l;
        if (mt === 0x03 && !name) name = dec.decode(data);
        else if (mt === 0x51 && bpm == null && l >= 3) bpm = 60000000 / ((data[0] << 16) | (data[1] << 8) | data[2]);
        else if (mt === 0x59 && !keySig && l >= 2) keySig = { sf: data[0] > 127 ? data[0] - 256 : data[0], minor: data[1] === 1 };
        else if (mt === 0x58 && !timeSig && l >= 2) timeSig = [data[0], 2 ** data[1]];
        else if (mt === 0x2f) { p = end; break; }
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        p++;
        p += rVlq();
        continue;
      }
      if (b & 0x80) { status = b; p++; }
      if (!status) throw new Error('The MIDI file is damaged.');
      const hi = status & 0xf0;
      const ch = status & 0x0f;
      need(1);
      const a = d[p++];
      let c = 0;
      if (hi !== 0xc0 && hi !== 0xd0) { need(1); c = d[p++]; }
      const id = ch * 128 + a;
      if (hi === 0x90 && c > 0) {
        if (!open.has(id)) open.set(id, []);
        open.get(id).push({ tick, vel: c });
      } else if (hi === 0x80 || (hi === 0x90 && c === 0)) {
        const stack = open.get(id);
        if (stack && stack.length) {
          const s = stack.shift();
          notes.push({ pitch: a, channel: ch, vel: s.vel / 127, start: s.tick / ppq, dur: Math.max(0, tick - s.tick) / ppq });
        }
      }
    }
    for (const [id, stack] of open) {
      for (const s of stack) notes.push({ pitch: id % 128, channel: id >> 7, vel: s.vel / 127, start: s.tick / ppq, dur: Math.max(0, tick - s.tick) / ppq });
    }
    p = end;
    notes.sort((x, y) => x.start - y.start || x.pitch - y.pitch);
    tracks.push({ name: name || `Track ${t + 1}`, notes });
  }
  return { format, ppq, bpm, keySig, timeSig, tracks };
}

/** Analyse MIDI that came back from a DAW, against the exercise's key. */
export function analyseMidi(parsed, key, mode, { maxBars = 64 } = {}) {
  const notes = parsed.tracks.flatMap((t) => t.notes);
  const inKey = inKeyPcs(key, mode);
  const outOfKey = notes.filter((n) => !inKey.has(n.pitch % 12));
  const endBeat = notes.reduce((m, n) => Math.max(m, n.start + n.dur), 0);
  const nBars = Math.min(maxBars, Math.ceil(endBeat / 4 - 1e-6));
  const bars = [];
  for (let b = 0; b < nBars; b++) {
    const s = b * 4;
    const e = s + 4;
    const w = Array(12).fill(0);
    let bass = null;
    for (const n of notes) {
      const ov = Math.min(e, n.start + n.dur) - Math.max(s, n.start);
      if (ov <= 0) continue;
      w[n.pitch % 12] += ov;
      if (n.start <= s + 0.5 && (bass == null || n.pitch < bass)) bass = n.pitch;
    }
    const best = detectChord(w, bass == null ? null : bass % 12, key, mode);
    bars.push(best ? { bar: b + 1, roman: best.info.roman, baseRoman: best.info.baseRoman, symbol: best.info.symbol, confidence: best.confidence } : { bar: b + 1, roman: '–', baseRoman: '–', symbol: 'rest', confidence: 0 });
  }
  return {
    noteCount: notes.length,
    outOfKeyCount: outOfKey.length,
    outOfKeyRatio: notes.length ? outOfKey.length / notes.length : 0,
    tracks: parsed.tracks.filter((t) => t.notes.length).map((t) => ({
      name: t.name,
      count: t.notes.length,
      low: Math.min(...t.notes.map((n) => n.pitch)),
      high: Math.max(...t.notes.map((n) => n.pitch)),
    })),
    bpm: parsed.bpm ? Math.round(parsed.bpm) : null,
    declaredKey: parsed.keySig || null,
    bars,
  };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function midiNoteName(m) {
  return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
}

