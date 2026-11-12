// Quick-fire practice: keyboard and ear questions, checked instantly (10 questions, a score, try again).
//
// Exercise data: quiz: { type, count, pass, options }
// Types: higher-lower, tone-semitone, count-semitones, find-key, name-black-key, semitone-step,
//        name-interval, build-interval, hear-interval, build-scale, spot-mistake, scale-degree

import { keyboardSvg } from './piano.js';
import { MODES, pcOf, scaleNames } from './theory.js';
import { h } from './util.js';

const NATURAL = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
const BLACK_PAIRS = { 1: 'C♯ / D♭', 3: 'D♯ / E♭', 6: 'F♯ / G♭', 8: 'G♯ / A♭', 10: 'A♯ / B♭' };
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = [1, 3, 6, 8, 10];
export const INTERVAL_NAMES = {
  1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd', 4: 'major 3rd', 5: 'perfect 4th', 6: 'tritone',
  7: 'perfect 5th', 8: 'minor 6th', 9: 'major 6th', 10: 'minor 7th', 11: 'major 7th', 12: 'octave',
};

const pc = (m) => ((m % 12) + 12) % 12;
const keyName = (m) => NATURAL[pc(m)] || BLACK_PAIRS[pc(m)];
const pretty = (n) => n.replace(/#/g, '♯').replace(/^([A-G])b/, '$1♭');
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** A random MIDI note between lo and hi (inclusive), optionally limited to some pitch classes. */
function noteIn(lo, hi, pcs = null) {
  const opts = [];
  for (let m = lo; m <= hi; m++) if (!pcs || pcs.includes(pc(m))) opts.push(m);
  return pick(opts);
}
/** Four answer choices including the right one. */
function choicesFrom(correct, pool, n = 4) {
  const others = shuffle(pool.filter((x) => x !== correct)).slice(0, n - 1);
  return shuffle([correct, ...others]);
}

const KB = { low: 48, high: 83 }; // the keyboard shown in quizzes: C3 to B5

// ---------- Question generators ----------

const GEN = {
  'higher-lower'() {
    const a = noteIn(55, 76);
    const d = 1 + rand(12);
    const up = Math.random() < 0.5;
    const b = up ? a + d : a - d;
    return {
      text: 'Listen. Is the second note higher or lower than the first?',
      play: [a, b], choices: ['Higher', 'Lower'], answer: up ? 'Higher' : 'Lower',
      reveal: `${up ? 'Higher' : 'Lower'}: the second note was ${plural(d, 'semitone')} ${up ? 'above' : 'below'}.`,
      showAfter: [a, b],
    };
  },

  'tone-semitone'() {
    const a = noteIn(53, 76);
    const d = 1 + rand(2);
    return {
      text: 'These two notes: a tone or a semitone apart?',
      marks: [a, a + d], play: [a, a + d], choices: ['Semitone', 'Tone'], answer: d === 1 ? 'Semitone' : 'Tone',
      reveal: d === 1 ? 'Semitone: next-door keys, with nothing in between.' : 'Tone: two semitones, with one key in between.',
    };
  },

  'count-semitones'({ max = 12 } = {}) {
    const d = 1 + rand(max);
    const a = noteIn(KB.low, KB.high - d);
    const pool = Array.from({ length: max }, (_, i) => String(i + 1));
    return {
      text: 'How many semitones from the lower key to the higher key?',
      marks: [a, a + d], play: [a, a + d], choices: choicesFrom(String(d), pool.filter((x) => Math.abs(Number(x) - d) <= 3)), answer: String(d),
      reveal: `${plural(d, 'semitone')}. Count every key, black and white, after the first one.`,
      showSteps: [a, a + d],
    };
  },

  'find-key'({ black = false } = {}) {
    const target = black && Math.random() < 0.5 ? pick(BLACK_PCS) : pick(WHITE_PCS);
    const name = NATURAL[target] || pick(BLACK_PAIRS[target].split(' / '));
    return {
      text: `Click any ${name}.`,
      clickPc: target,
      reveal: NATURAL[target]
        ? `Every ${name} is shown. ${({ 0: 'C is just left of the group of two black keys.', 5: 'F is just left of the group of three black keys.' })[target] || 'Use the groups of two and three black keys to find it.'}`
        : `${BLACK_PAIRS[target]}: one key, two names.`,
    };
  },

  'name-black-key'() {
    const p = pick(BLACK_PCS);
    const m = noteIn(KB.low, KB.high, [p]);
    return {
      text: 'This black key has two names. Which pair is right?',
      marks: [m], play: [m], choices: choicesFrom(BLACK_PAIRS[p], Object.values(BLACK_PAIRS)), answer: BLACK_PAIRS[p],
      reveal: `${BLACK_PAIRS[p]}: ♯ means a semitone up from ${NATURAL[(p + 11) % 12]}, ♭ means a semitone down from ${NATURAL[(p + 1) % 12]}.`,
    };
  },

  'semitone-step'({ sizes = [1, 2] } = {}) {
    // Half the time, start on E, B, C or F: where white keys are a semitone apart.
    const base = Math.random() < 0.5 ? noteIn(KB.low + 2, KB.high - 2, [4, 11, 0, 5]) : noteIn(KB.low + 2, KB.high - 2);
    const size = pick(sizes);
    const up = Math.random() < 0.5;
    const target = up ? base + size : base - size;
    const natural = size === 1 && [[4, 5], [11, 0], [5, 4], [0, 11]].some(([a, b]) => pc(base) === a && pc(target) === b);
    return {
      text: `Click the key a ${size === 1 ? 'semitone' : 'tone'} ${up ? 'above' : 'below'} this ${keyName(base)}.`,
      marks: [base], clickMidi: target, play: [base],
      reveal: `${keyName(target)}.${natural ? ' E–F and B–C are semitones with no black key between them.' : ''}`,
    };
  },

  'name-interval'({ set = [1, 2, 3, 4, 5, 7, 12] } = {}) {
    const d = pick(set);
    const a = noteIn(KB.low, KB.high - d);
    return {
      text: 'Name the interval between these two keys.',
      marks: [a, a + d], play: [a, a + d], choices: choicesFrom(INTERVAL_NAMES[d], set.map((x) => INTERVAL_NAMES[x])), answer: INTERVAL_NAMES[d],
      reveal: `${INTERVAL_NAMES[d]}: ${plural(d, 'semitone')}.`, showSteps: [a, a + d],
    };
  },

  'build-interval'({ set = [2, 3, 4, 5, 7, 12] } = {}) {
    const d = pick(set);
    const a = noteIn(KB.low, KB.high - d);
    return {
      text: `Click a ${INTERVAL_NAMES[d]} above this ${keyName(a)}.`,
      marks: [a], clickMidi: a + d, play: [a],
      reveal: `${keyName(a + d)}: a ${INTERVAL_NAMES[d]} is ${plural(d, 'semitone')} up.`, showSteps: [a, a + d],
    };
  },

  'hear-interval'({ set = [2, 4, 7, 12] } = {}) {
    const d = pick(set);
    const a = noteIn(55, 72);
    return {
      text: 'Listen. Which interval is it?',
      play: [a, a + d], choices: set.map((x) => INTERVAL_NAMES[x]), answer: INTERVAL_NAMES[d],
      reveal: `${INTERVAL_NAMES[d]} (${plural(d, 'semitone')}).`, showAfter: [a, a + d],
    };
  },

  'build-scale'({ keys = ['C', 'G', 'F', 'D', 'Bb', 'A'] } = {}) {
    const key = pick(keys);
    const tonic = 60 + pcOf(key) - (pcOf(key) > 7 ? 12 : 0);
    const seq = [...MODES.major.map((iv) => tonic + iv), tonic + 12];
    const names = [...scaleNames(key, 'major'), key].map(pretty);
    return {
      text: `Build ${pretty(key)} major: click its 8 notes, from this ${pretty(key)} up to the next ${pretty(key)}.`,
      marks: [tonic], sequence: seq, play: [tonic],
      reveal: `${pretty(key)} major: ${names.join(' – ')} (T–T–S–T–T–T–S).`, names,
    };
  },

  'spot-mistake'({ keys = ['C', 'G', 'F', 'D', 'Bb', 'A', 'E'] } = {}) {
    const key = pick(keys);
    const tonic = 60 + pcOf(key) - (pcOf(key) > 7 ? 12 : 0);
    const seq = [...MODES.major.map((iv) => tonic + iv), tonic + 12];
    const i = 1 + rand(6);
    let wrong = seq[i] + (Math.random() < 0.5 ? 1 : -1);
    if (wrong <= seq[i - 1] || wrong >= seq[i + 1]) wrong = seq[i] + (wrong > seq[i] ? -1 : 1);
    const shown = seq.map((m, k) => (k === i ? wrong : m));
    const right = pretty(scaleNames(key, 'major')[i]);
    return {
      text: `This is meant to be ${pretty(key)} major, but one note is wrong. Click it.`,
      marks: shown, clickMidi: wrong, play: shown,
      reveal: `Degree ${i + 1} should be ${right}, not ${keyName(wrong)}.`,
    };
  },

  'scale-degree'({ keys = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E'] } = {}) {
    const key = pick(keys);
    const names = scaleNames(key, 'major').map(pretty);
    const n = 2 + rand(6);
    const answer = names[n - 1];
    // Distractors: the neighbouring degrees and the same letter with a different accidental.
    const letter = answer[0];
    const pool = [...names, `${letter}♯`, `${letter}♭`, letter].filter((x, i, a) => a.indexOf(x) === i);
    return {
      text: `In ${pretty(key)} major, which note is degree ${n}?`,
      choices: choicesFrom(answer, pool), answer,
      reveal: `${pretty(key)} major: ${names.map((x, i) => (i === n - 1 ? `[${x}]` : x)).join(' ')}.`,
    };
  },
};

export const QUIZ_TYPES = Object.keys(GEN);

// ---------- Sound ----------

async function playNotes(player, notes, gap = 0.65) {
  if (!player || !notes?.length) return;
  await player.ensure();
  const t = Tone.now() + 0.05;
  const f = (m) => 440 * 2 ** ((m - 69) / 12);
  notes.forEach((m, i) => player.synths.melody.triggerAttackRelease(f(m), Math.min(0.55, gap * 0.9), t + i * gap, 0.8));
}

// ---------- The quiz view ----------

export class QuizView {
  /** onResult(correct, total) is called at the end of each round. best = {best, total} from earlier rounds. */
  constructor(root, { quiz, player, best = null, onResult = () => {} }) {
    this.root = root;
    this.quiz = { count: 10, pass: 8, options: {}, ...quiz };
    this.player = player;
    this.best = best;
    this.onResult = onResult;
    this.onKey = (e) => {
      if (e.key === 'Enter' && this.nextBtn && !this.nextBtn.hidden && !e.target.closest('input, textarea, select')) { e.preventDefault(); this.nextBtn.click(); }
    };
    document.addEventListener('keydown', this.onKey);
    this.renderStart();
  }

  destroy() {
    document.removeEventListener('keydown', this.onKey);
    this.root.replaceChildren();
  }

  renderStart() {
    const q = this.quiz;
    this.root.replaceChildren(h('div', { class: 'quiz quiz-start' },
      h('div', {},
        h('p', { class: 'eyebrow' }, 'Quick-fire practice'),
        h('h3', {}, `${q.count} questions · get ${q.pass} right to pass`),
        this.best ? h('p', { class: 'muted' }, `Your best so far: ${this.best.best} / ${this.best.total}`) : h('p', { class: 'muted' }, 'Turn your sound on: some questions are played.')),
      h('button', { type: 'button', class: 'btn primary', onclick: () => this.start() }, this.best ? 'Play again' : 'Start')));
  }

  start() {
    const gen = GEN[this.quiz.type];
    this.questions = [];
    let last = null;
    for (let i = 0; i < this.quiz.count; i++) {
      let qn;
      for (let tries = 0; tries < 6; tries++) {
        qn = gen(this.quiz.options || {});
        if (!last || qn.text !== last.text || JSON.stringify(qn.marks || qn.play) !== JSON.stringify(last.marks || last.play)) break;
      }
      this.questions.push(qn);
      last = qn;
    }
    this.i = 0;
    this.correct = 0;
    this.show();
  }

  show() {
    const qn = this.questions[this.i];
    this.answered = false;
    this.picked = [];
    const total = this.questions.length;
    this.feedback = h('p', { class: 'quiz-feedback', role: 'status' });
    this.nextBtn = h('button', { type: 'button', class: 'btn primary', hidden: true, onclick: () => this.next() }, this.i + 1 < total ? 'Next →' : 'See my score');
    this.kbBox = h('div', { class: 'kbd-scroll quiz-kbd' });
    this.controls = h('div', { class: 'quiz-controls' });
    this.root.replaceChildren(h('div', { class: 'quiz' },
      h('div', { class: 'quiz-top' },
        h('span', { class: 'muted small' }, `Question ${this.i + 1} of ${total}`),
        h('div', { class: 'quiz-bar' }, h('span', { style: { width: `${(this.i / total) * 100}%` } })),
        h('span', { class: 'small quiz-score' }, `${this.correct} right`)),
      h('p', { class: 'quiz-q' }, qn.text),
      this.kbBox,
      this.controls,
      this.feedback,
      h('div', { class: 'row wrap' },
        qn.play ? h('button', { type: 'button', class: 'btn small', onclick: () => playNotes(this.player, qn.play) }, '▶ Play again') : '',
        this.nextBtn)));
    this.drawKeyboard();
    this.drawControls();
    if (qn.play) playNotes(this.player, qn.play);
  }

  /** Draw the keyboard with the question's keys, the student's clicks and (after answering) the answer. */
  drawKeyboard(extra = new Map()) {
    const qn = this.questions[this.i];
    const clickable = qn.clickPc != null || qn.clickMidi != null || qn.sequence;
    const shown = (qn.marks || []).length || clickable || (this.answered && qn.showAfter);
    if (!shown) { this.kbBox.replaceChildren(); return; }
    const marks = new Map();
    const mark = (m, cls, label) => {
      const mk = marks.get(m) || { hands: new Set(), finger: null };
      mk.hands.add(cls);
      if (label) mk.label = label;
      marks.set(m, mk);
    };
    (qn.marks || []).forEach((m) => mark(m, 'given'));
    if (this.answered && qn.showAfter) qn.showAfter.forEach((m) => mark(m, 'given'));
    extra.forEach((v, m) => mark(m, v.cls, v.label));
    const svg = keyboardSvg({ low: KB.low, high: KB.high, marks, whiteW: 26, height: 120, fingers: false, labels: true, title: qn.text });
    if (clickable && !this.answered) {
      svg.classList.add('clickable');
      svg.addEventListener('click', (e) => {
        const k = e.target.closest('[data-midi]');
        if (k) this.clickKey(Number(k.dataset.midi));
      });
    }
    this.kbBox.replaceChildren(svg);
  }

  drawControls() {
    const qn = this.questions[this.i];
    if (qn.choices) {
      this.controls.replaceChildren(h('div', { class: 'quiz-choices' }, qn.choices.map((c) => h('button', {
        type: 'button', class: 'btn quiz-choice', onclick: (e) => this.choose(c, e.target),
      }, c))));
    } else if (qn.sequence) {
      this.controls.replaceChildren(h('div', { class: 'row wrap' },
        h('span', { class: 'muted small' }, `${this.picked.length} of ${qn.sequence.length} notes`),
        h('button', { type: 'button', class: 'btn small ghost', disabled: !this.picked.length || this.answered, onclick: () => { this.picked.pop(); this.redrawSequence(); } }, 'Undo'),
        h('button', { type: 'button', class: 'btn small ghost', disabled: !this.picked.length || this.answered, onclick: () => { this.picked = []; this.redrawSequence(); } }, 'Clear')));
    } else {
      this.controls.replaceChildren();
    }
  }

  clickKey(m) {
    const qn = this.questions[this.i];
    playNotes(this.player, [m]);
    if (qn.sequence) {
      if (this.picked.length >= qn.sequence.length) return;
      this.picked.push(m);
      if (this.picked.length === qn.sequence.length) {
        const ok = this.picked.every((x, k) => x === qn.sequence[k]);
        this.finish(ok);
        const extra = new Map();
        qn.sequence.forEach((x, k) => extra.set(x, { cls: 'ok', label: qn.names[k] }));
        this.picked.forEach((x, k) => { if (x !== qn.sequence[k]) extra.set(x, { cls: 'bad' }); });
        this.drawKeyboard(extra);
        this.drawControls();
        setTimeout(() => playNotes(this.player, qn.sequence, 0.4), 400);
      } else {
        this.redrawSequence();
      }
      return;
    }
    const ok = qn.clickPc != null ? pc(m) === qn.clickPc : m === qn.clickMidi;
    const extra = new Map();
    if (qn.clickPc != null) {
      for (let k = KB.low; k <= KB.high; k++) if (pc(k) === qn.clickPc) extra.set(k, { cls: 'ok' });
    } else {
      extra.set(qn.clickMidi, { cls: 'ok' });
    }
    if (!ok) extra.set(m, { cls: 'bad' });
    this.finish(ok);
    this.drawKeyboard(extra);
  }

  /** Building a scale: show the student's notes with T / S between them as they click. */
  redrawSequence() {
    const extra = new Map();
    this.picked.forEach((m, k) => {
      const step = k ? m - this.picked[k - 1] : null;
      extra.set(m, { cls: 'pick', label: k === 0 ? '1' : step === 1 ? 'S' : step === 2 ? 'T' : '?' });
    });
    this.drawKeyboard(extra);
    this.drawControls();
  }

  choose(c, btn) {
    if (this.answered) return;
    const qn = this.questions[this.i];
    const ok = c === qn.answer;
    this.controls.querySelectorAll('.quiz-choice').forEach((b) => {
      b.disabled = true;
      if (b.textContent === qn.answer) b.classList.add('right');
    });
    if (!ok) btn.classList.add('wrong');
    this.finish(ok);
    const extra = new Map();
    if (qn.showSteps) for (let k = qn.showSteps[0] + 1; k < qn.showSteps[1]; k++) extra.set(k, { cls: 'step' });
    this.drawKeyboard(extra);
  }

  finish(ok) {
    this.answered = true;
    if (ok) this.correct++;
    const qn = this.questions[this.i];
    this.feedback.className = `quiz-feedback ${ok ? 'ok' : 'bad'}`;
    this.feedback.replaceChildren(h('strong', {}, ok ? '✓ Right! ' : '✗ Not quite. '), qn.reveal);
    this.root.querySelector('.quiz-score').textContent = `${this.correct} right`;
    this.nextBtn.hidden = false;
    this.nextBtn.focus({ preventScroll: true });
  }

  next() {
    if (this.i + 1 < this.questions.length) {
      this.i++;
      this.show();
      return;
    }
    const total = this.questions.length;
    const passed = this.correct >= this.quiz.pass;
    this.best = { best: Math.max(this.best?.best || 0, this.correct), total };
    this.onResult(this.correct, total);
    this.root.replaceChildren(h('div', { class: `quiz quiz-end ${passed ? 'passed' : ''}` },
      h('p', { class: 'eyebrow' }, passed ? 'Passed' : 'Keep practising'),
      h('div', { class: 'score-big' }, h('span', {}, String(this.correct)), h('small', {}, `/ ${total}`)),
      h('p', {}, passed
        ? (this.correct === total ? 'Perfect score! 🎉' : `Well done: you needed ${this.quiz.pass}.`)
        : `You need ${this.quiz.pass} to pass. Every round has new questions: try again!`),
      h('p', { class: 'muted small' }, `Best score: ${this.best.best} / ${total}`),
      h('button', { type: 'button', class: 'btn primary', onclick: () => this.start() }, 'Play again')));
  }
}
