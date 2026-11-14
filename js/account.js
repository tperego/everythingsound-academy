// Account page: sign in / create account, then "My profile": progress, submissions and the teacher's feedback.

import { leaderboard, listPieces, myProfile, myProgress, mySubmissions, myXpEvents, onPasswordRecovery, renderAccountWidget, requestPasswordReset, resendConfirmation, setLeaderboardOptIn, setNewPassword, signIn, signOut, signUp, updateMyName } from './auth.js?v=202611141938';
import { journeyCard, leaderboardList, summarise } from './game.js?v=202611141938';
import { COURSE, courseLessons } from './course.js?v=202611141938';
import { findExercise } from './lessons.js?v=202611141938';
import { h, store, toast } from './util.js?v=202611141938';

const main = document.getElementById('main');
const next = new URLSearchParams(location.search).get('next');
// Arriving from a password-reset or confirmation email: read the link before Supabase tidies the address bar.
const linkHash = new URLSearchParams(location.hash.slice(1));
let recovering = linkHash.get('type') === 'recovery';
const confirmed = linkHash.get('type') === 'signup';
const linkError = linkHash.get('error_description');

function goNext() {
  // Only go back to a page of this site.
  if (next && /^[a-z]+\.html(\?[^#]*)?$/.test(next)) location.href = next;
  else render();
}

async function render() {
  if (recovering) { renderNewPassword(); return; }
  const p = await myProfile();
  renderAccountWidget(document.getElementById('account-widget'));
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
        msg.replaceChildren(err.message);
        if (err.unconfirmed) msg.append(' ', resendLink(f.email.value.trim()));
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
        const email = f.email.value.trim();
        const r = await signUp({ name: f.name.value.trim(), email, password: f.password.value, code: f.code.value.trim() });
        if (r.needsConfirm) {
          f.replaceWith(h('div', { class: 'auth-form' },
            h('p', {}, h('strong', {}, 'Almost there! '), `We’ve sent an email to ${email}. Open the link in it to confirm your account, and you’ll be signed in.`),
            h('p', { class: 'muted small' }, 'Nothing after a few minutes? Check your spam folder, or ', resendLink(email), '.')));
          msg.textContent = '';
          return;
        }
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
    mode === 'signin' ? h('p', { class: 'muted small' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); renderForgot(); } }, 'Forgot your password?')) : ''));
  if (linkError && mode === 'signin') msg.textContent = /expired|invalid/i.test(linkError) ? 'That email link has expired or was already used. Sign in below, or ask for a new link.' : linkError;
}

// "Send it again" link for the confirmation email.
function resendLink(email) {
  const a = h('a', { href: '#', onclick: async (e) => {
    e.preventDefault();
    a.textContent = 'sending…';
    try { await resendConfirmation(email); a.replaceWith('a new confirmation email is on its way'); }
    catch (err) { a.replaceWith(err.message); }
  } }, 'send the confirmation email again');
  return a;
}

// ---------- Forgotten password ----------

function renderForgot() {
  const msg = h('p', { class: 'status', role: 'status' });
  const form = h('form', {
    class: 'auth-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const f = e.target;
      f.querySelectorAll('button, input').forEach((x) => { x.disabled = true; });
      msg.textContent = 'Sending…';
      try {
        await requestPasswordReset(f.email.value.trim());
        msg.textContent = 'If there is an account with this email, a link to choose a new password is on its way. Check your inbox (and spam). The link works once, for one hour.';
      } catch (err) {
        msg.textContent = err.message;
        f.querySelectorAll('button, input').forEach((x) => { x.disabled = false; });
      }
    },
  },
    h('label', { class: 'field' }, 'Email', h('input', { type: 'email', name: 'email', required: true, autocomplete: 'email' })),
    h('button', { type: 'submit', class: 'btn primary' }, 'Email me a reset link'));
  main.replaceChildren(h('section', { class: 'card auth-card' },
    h('p', { class: 'eyebrow' }, COURSE.academy),
    h('h1', {}, 'Forgot your password?'),
    h('p', { class: 'muted' }, 'Type the email you signed up with. We’ll send you a link to choose a new password.'),
    form, msg,
    h('p', { class: 'muted small' }, h('a', { href: '#', onclick: (e) => { e.preventDefault(); renderSignIn(); } }, '← Back to sign in'))));
}

function renderNewPassword() {
  const msg = h('p', { class: 'status', role: 'status' });
  const form = h('form', {
    class: 'auth-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.password.value.length < 8) { msg.textContent = 'The password needs at least 8 characters.'; return; }
      if (f.password.value !== f.again.value) { msg.textContent = 'The two passwords don’t match.'; return; }
      f.querySelectorAll('button, input').forEach((x) => { x.disabled = true; });
      msg.textContent = 'Saving…';
      try {
        await setNewPassword(f.password.value);
        recovering = false;
        history.replaceState(null, '', 'account.html');
        toast('New password saved. You’re signed in.');
        render();
      } catch (err) {
        msg.textContent = err.message;
        f.querySelectorAll('button, input').forEach((x) => { x.disabled = false; });
      }
    },
  },
    h('label', { class: 'field' }, 'New password (at least 8 characters)', h('input', { type: 'password', name: 'password', required: true, minlength: 8, autocomplete: 'new-password' })),
    h('label', { class: 'field' }, 'Type it again', h('input', { type: 'password', name: 'again', required: true, minlength: 8, autocomplete: 'new-password' })),
    h('button', { type: 'submit', class: 'btn primary' }, 'Save my new password'));
  main.replaceChildren(h('section', { class: 'card auth-card' },
    h('p', { class: 'eyebrow' }, COURSE.academy),
    h('h1', {}, 'Choose a new password'),
    form, msg));
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
  let events = null;
  let board = null;
  try {
    [subs, progress, pieces, events, board] = await Promise.all([mySubmissions(), myProgress(), listPieces(), myXpEvents(true), leaderboard().catch(() => null)]);
  } catch (err) {
    toast(err.message);
  }
  const teacher = p.role === 'teacher';

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

  // Leaderboard: this week or all time. Students choose whether classmates can see them.
  let boardCard = '';
  if (board) {
    let by = 'week_xp';
    const listBox = h('div');
    const draw = () => listBox.replaceChildren(leaderboardList(board, { by, teacher }));
    const tab = (id, label) => h('button', { type: 'button', class: by === id ? 'on' : '', 'aria-pressed': String(by === id), onclick: (e) => {
      by = id;
      e.target.parentNode.querySelectorAll('button').forEach((b) => { const on = b === e.target; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      draw();
    } }, label);
    draw();
    const optIn = teacher ? '' : h('label', { class: 'check-row' },
      h('input', { type: 'checkbox', checked: !!p.show_on_leaderboard, onchange: async (e) => {
        const on = e.target.checked;
        e.target.disabled = true;
        try {
          await setLeaderboardOptIn(on);
          toast(on ? 'You’re on the class leaderboard.' : 'You’re hidden from the class leaderboard.');
          render();
        } catch (err) {
          e.target.checked = !on;
          e.target.disabled = false;
          toast(err.message);
        }
      } }),
      ' Show me on the class leaderboard (classmates see your name and XP)');
    boardCard = h('section', { class: 'card' },
      h('h2', {}, teacher ? 'Class activity' : 'Class leaderboard'),
      h('p', { class: 'muted small' }, teacher
        ? 'Every student’s XP and when they last practised. Students only see classmates who chose to be on the leaderboard.'
        : 'Only classmates who choose to appear are listed.'),
      h('div', { class: 'seg' }, tab('week_xp', 'This week'), tab('xp', 'All time')),
      listBox,
      optIn);
  }

  main.replaceChildren(
    head,
    !teacher && events ? h('div', { class: 'cols' }, journeyCard(summarise(events), events), boardCard) : '',
    h('section', { class: 'card' }, h('h2', {}, 'My feedback'), subList),
    teacher ? boardCard : '',
    h('div', { class: 'cols' },
      h('section', { class: 'card' }, h('h2', {}, 'My progress'), progressList),
      h('section', { class: 'card' },
        h('h2', {}, 'My Sandbox'),
        h('p', { class: 'muted' }, pieces ? `${pieces.length} piece${pieces.length === 1 ? '' : 's'} saved to your account.` : 'Your Sandbox pieces are saved to your account.'),
        h('a', { class: 'btn primary', href: 'sandbox.html' }, 'Open the Sandbox'),
        h('h3', { class: 'mt' }, 'My name'),
        h('p', { class: 'muted small' }, 'This is the name your teacher sees.'),
        nameRow)));
  if (location.hash === '#journey') document.getElementById('journey')?.scrollIntoView({ block: 'start' });
}

onPasswordRecovery(() => { recovering = true; renderNewPassword(); });
render().then(() => { if (confirmed && !linkError) toast('Email confirmed. Welcome to the Academy!'); });
