// Account page: sign in / create account, then "My profile": progress, submissions and the teacher's feedback.

import { listPieces, myProfile, myProgress, mySubmissions, signIn, signOut, signUp, updateMyName } from './auth.js';
import { COURSE, courseLessons } from './course.js';
import { findExercise } from './lessons.js';
import { h, store, toast } from './util.js';

const main = document.getElementById('main');
const next = new URLSearchParams(location.search).get('next');

function goNext() {
  // Only go back to a page of this site.
  if (next && /^[a-z]+\.html(\?[^#]*)?$/.test(next)) location.href = next;
  else render();
}

async function render() {
  const p = await myProfile();
  if (!p) renderSignIn();
  else renderProfile(p);
}

// ---------- Sign in / create account ----------

function renderSignIn(mode = 'signin') {
  const msg = h('p', { class: 'status', role: 'status' });
  const field = (label, attrs) => h('label', { class: 'field' }, label, h('input', attrs));
  const busy = (form, on) => form.querySelectorAll('button, input').forEach((x) => { x.disabled = on; });

  const signinForm = h('form', {
    class: 'auth-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const f = e.target;
      busy(f, true);
      msg.textContent = 'Signing in…';
      try {
        await signIn({ email: f.email.value.trim(), password: f.password.value });
        goNext();
      } catch (err) {
        msg.textContent = err.message;
        busy(f, false);
      }
    },
  },
    field('Email', { type: 'email', name: 'email', required: true, autocomplete: 'email' }),
    field('Password', { type: 'password', name: 'password', required: true, autocomplete: 'current-password' }),
    h('button', { type: 'submit', class: 'btn primary' }, 'Sign in'));

  const signupForm = h('form', {
    class: 'auth-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.password.value.length < 8) { msg.textContent = 'The password needs at least 8 characters.'; return; }
      busy(f, true);
      msg.textContent = 'Creating your account…';
      try {
        await signUp({ name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, code: f.code.value.trim() });
        toast('Welcome! Your account is ready.');
        goNext();
      } catch (err) {
        msg.textContent = err.message;
        busy(f, false);
      }
    },
  },
    field('Your name', { type: 'text', name: 'name', required: true, autocomplete: 'name', maxlength: 120, placeholder: 'First and last name' }),
    field('Email', { type: 'email', name: 'email', required: true, autocomplete: 'email' }),
    field('Password (at least 8 characters)', { type: 'password', name: 'password', required: true, minlength: 8, autocomplete: 'new-password' }),
    field('Class code (from your teacher)', { type: 'text', name: 'code', required: true, autocomplete: 'off' }),
    h('button', { type: 'submit', class: 'btn primary' }, 'Create my account'));

  const tab = (id, label) => h('button', { type: 'button', class: mode === id ? 'on' : '', 'aria-pressed': String(mode === id), onclick: () => renderSignIn(id) }, label);
  main.replaceChildren(h('section', { class: 'card auth-card' },
    h('p', { class: 'eyebrow' }, COURSE.academy),
    h('h1', {}, mode === 'signin' ? 'Sign in' : 'Create your account'),
    h('p', { class: 'muted' }, 'With an account, your submissions and your teacher’s feedback are kept in your profile, and your Sandbox pieces are saved online.'),
    h('div', { class: 'seg' }, tab('signin', 'Sign in'), tab('signup', 'Create account')),
    mode === 'signin' ? signinForm : signupForm,
    msg,
    mode === 'signin' ? h('p', { class: 'muted small' }, 'Forgot your password? Ask your teacher to reset it.') : ''));
}

// ---------- Profile ----------

function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

async function renderProfile(p) {
  main.replaceChildren(h('p', { class: 'muted' }, 'Loading your work…'));
  let subs = [];
  let progress = null;
  let pieces = null;
  try {
    [subs, progress, pieces] = await Promise.all([mySubmissions(), myProgress(), listPieces()]);
  } catch (err) {
    toast(err.message);
  }

  const nameInput = h('input', { type: 'text', value: p.full_name, maxlength: 120, 'aria-label': 'Your name' });
  const head = h('section', { class: 'profile-head' },
    h('div', {},
      h('p', { class: 'eyebrow' }, p.role === 'teacher' ? 'Teacher' : 'Student'),
      h('h1', {}, p.full_name || 'My profile'),
      h('p', { class: 'muted' }, p.email)),
    h('div', { class: 'row wrap' },
      p.role === 'teacher' ? h('a', { class: 'btn primary', href: 'mark.html' }, 'Open the submissions inbox') : '',
      h('button', { type: 'button', class: 'btn ghost', onclick: async () => { await signOut(); toast('Signed out.'); render(); } }, 'Sign out')));

  // Progress per lesson
  const lessons = courseLessons();
  const local = (id) => store.get(`es.status.${id}`, {});
  const progressList = h('ol', { class: 'lesson-list' }, lessons.map((l, i) => {
    const st = { ...local(l.id), ...(progress?.[l.id] || {}) };
    const done = l.exercises.filter((e) => st[e.id] === 'passed' || st[e.id] === 'submitted').length;
    const state = done === l.exercises.length ? 'done' : done || Object.keys(st).length ? 'started' : 'new';
    return h('li', {}, h('a', { class: `lesson-card ${state}`, href: `lesson.html?lesson=${encodeURIComponent(l.id)}` },
      h('span', { class: 'lesson-num' }, String(i + 1)),
      h('span', { class: 'lesson-text' }, h('strong', {}, l.title)),
      h('span', { class: `lesson-progress ${state}` }, `${done} / ${l.exercises.length}`)));
  }));

  // Submissions and feedback
  const subList = subs.length
    ? h('div', { class: 'sub-cards' }, subs.map((s) => {
      const { lesson } = findExercise(s.lesson_id, s.exercise_id);
      const scores = Array.isArray(s.scores) ? s.scores : [];
      const total = scores.reduce((a, x) => a + (Number(x.score) || 0), 0);
      const max = scores.reduce((a, x) => a + (Number(x.max) || 0), 0);
      return h('article', { class: `sub-card ${s.status}` },
        h('div', { class: 'sub-card-head' },
          h('div', {},
            h('strong', {}, s.exercise_title || s.exercise_id),
            h('div', { class: 'muted small' }, `${lesson ? lesson.title + ' · ' : ''}sent ${fmtDate(s.created_at)}`)),
          s.status === 'marked'
            ? h('span', { class: 'score-pill' }, max ? `${total} / ${max}` : 'Marked')
            : h('span', { class: 'badge' }, 'Waiting for feedback')),
        s.status === 'marked' && s.comment ? h('blockquote', { class: 'comment' }, s.comment) : '',
        h('a', { class: 'btn small', href: `lesson.html?lesson=${encodeURIComponent(s.lesson_id)}&ex=${encodeURIComponent(s.exercise_id)}&submission=${encodeURIComponent(s.id)}` },
          s.status === 'marked' ? 'See the feedback and my piece' : 'See what I sent'));
    }))
    : h('p', { class: 'muted' }, 'Nothing submitted yet. When you submit an exercise, it appears here, and so does your teacher’s feedback.');

  const nameRow = h('div', { class: 'row wrap' }, nameInput,
    h('button', { type: 'button', class: 'btn small', onclick: async () => {
      try { await updateMyName(nameInput.value.trim()); toast('Name saved.'); render(); } catch (err) { toast(err.message); }
    } }, 'Save name'));

  main.replaceChildren(
    head,
    h('section', { class: 'card' }, h('h2', {}, 'My feedback'), subList),
    h('div', { class: 'cols' },
      h('section', { class: 'card' }, h('h2', {}, 'My progress'), progressList),
      h('section', { class: 'card' },
        h('h2', {}, 'My Sandbox'),
        h('p', { class: 'muted' }, pieces ? `${pieces.length} piece${pieces.length === 1 ? '' : 's'} saved to your account.` : 'Your Sandbox pieces are saved to your account.'),
        h('a', { class: 'btn primary', href: 'sandbox.html' }, 'Open the Sandbox'),
        h('h3', { class: 'mt' }, 'My name'),
        h('p', { class: 'muted small' }, 'This is the name your teacher sees.'),
        nameRow)));
}

render();
