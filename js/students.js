// Teacher: every student's level, badges, streak, lesson progress and submissions.
// The database only lets the teacher account read other students' rows (supabase/schema.sql, game.sql).

import { classData, myProfile, renderAccountWidget } from './auth.js?v=202611200102';
import { courseLessons } from './course.js?v=202611200102';
import { earnedBadges, journeyCard, summarise } from './game.js?v=202611200102';
import { findExercise } from './lessons.js?v=202611200102';
import { h, store, toast } from './util.js?v=202611200102';

const listEl = document.getElementById('student-list');
const detailEl = document.getElementById('detail');
const DONE = new Set(['passed', 'submitted']);
const STATUS_TEXT = { tried: 'tried', passed: 'checks passed', submitted: 'sent to you' };

let rows = []; // one per student, see build()
let currentId = new URLSearchParams(location.search).get('id');
let sortBy = store.get('es.students.sort', 'active');
let filter = '';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '');

/** One summary per student from the whole class's rows. */
function build({ students, events, progress, subs }) {
  const by = (list, key) => {
    const m = new Map();
    for (const r of list) (m.get(r[key]) || m.set(r[key], []).get(r[key])).push(r);
    return m;
  };
  const ev = by(events, 'user_id');
  const pr = by(progress, 'user_id');
  const sb = by(subs, 'student_id');
  const lessons = courseLessons();
  return students.map((p) => {
    const evs = (ev.get(p.id) || []).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const status = {};
    for (const r of pr.get(p.id) || []) (status[r.lesson_id] ||= {})[r.exercise_id] = r.status;
    const s = summarise(evs);
    const lessonsDone = lessons.filter((l) => l.exercises.length && l.exercises.every((e) => DONE.has(status[l.id]?.[e.id]))).length;
    const practice = [...evs.filter((e) => e.kind !== 'marked').map((e) => e.created_at), ...(pr.get(p.id) || []).map((r) => r.updated_at)].filter(Boolean).sort();
    const mine = sb.get(p.id) || [];
    return {
      id: p.id,
      name: p.full_name || 'Student (no name yet)',
      joined: p.created_at,
      listed: p.show_on_leaderboard,
      events: evs,
      summary: s,
      badges: earnedBadges(s).length,
      status,
      lessonsDone,
      lessonsTotal: lessons.length,
      lastActive: practice[practice.length - 1] || null,
      subs: mine,
      waiting: mine.filter((x) => x.status !== 'marked').length,
    };
  });
}

// ---------- The list on the left ----------

function sorted() {
  const f = filter.trim().toLowerCase();
  const list = rows.filter((r) => !f || r.name.toLowerCase().includes(f));
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (sortBy === 'xp') return list.sort((a, b) => b.summary.xp - a.summary.xp || byName(a, b));
  if (sortBy === 'active') return list.sort((a, b) => String(b.lastActive || '').localeCompare(String(a.lastActive || '')) || byName(a, b));
  return list.sort(byName);
}

function renderList() {
  const tab = (id, label) => h('button', {
    type: 'button', class: sortBy === id ? 'on' : '', 'aria-pressed': String(sortBy === id),
    onclick: () => { sortBy = id; store.set('es.students.sort', id); renderList(); },
  }, label);
  const search = h('input', {
    type: 'search', class: 'student-search', placeholder: 'Find a student', value: filter, 'aria-label': 'Find a student',
    oninput: (e) => { filter = e.target.value; drawItems(); },
  });
  const items = h('ul', { class: 'sub-list' });
  const drawItems = () => {
    const list = sorted();
    items.replaceChildren(...(list.length ? list.map((r) => h('li', {},
      h('button', { type: 'button', class: `sub-item${r.id === currentId ? ' on' : ''}`, onclick: () => select(r.id) },
        h('span', { class: 'lvl-badge small-lvl', title: `Level ${r.summary.level.n}` }, String(r.summary.level.n)),
        h('span', { class: 'sub-text' },
          h('strong', {}, r.name),
          h('span', { class: 'muted small' }, [
            `${r.summary.xp} XP`,
            `${r.lessonsDone}/${r.lessonsTotal} lessons`,
            `🏅 ${r.badges}`,
            r.summary.current ? `🔥 ${r.summary.current}` : '',
          ].filter(Boolean).join(' · ')),
          h('span', { class: 'muted small' }, r.lastActive ? `Active ${fmtDay(r.lastActive)}` : 'Not started yet',
            r.waiting ? h('b', { class: 'waiting' }, ` · ${r.waiting} to mark`) : ''))))) : [h('li', { class: 'muted small' }, filter ? 'No student with that name.' : 'No students yet.')]));
  };
  drawItems();
  listEl.replaceChildren(
    h('h3', { class: 'inbox-title' }, `${rows.length} student${rows.length === 1 ? '' : 's'}`),
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Sort students' }, tab('active', 'Recent'), tab('xp', 'XP'), tab('name', 'A–Z')),
    rows.length > 6 ? search : '',
    items,
    h('button', { type: 'button', class: 'btn small', onclick: load }, '↻ Refresh'));
  if (filter) {
    search.focus();
    search.setSelectionRange(filter.length, filter.length);
  }
}

function select(id) {
  currentId = id;
  const url = new URL(location.href);
  url.searchParams.set('id', id);
  history.replaceState(null, '', url);
  renderList();
  renderDetail();
  if (matchMedia('(max-width: 860px)').matches) detailEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

// ---------- One student ----------

function progressCard(r) {
  const lessons = courseLessons();
  const exDone = lessons.reduce((a, l) => a + l.exercises.filter((e) => DONE.has(r.status[l.id]?.[e.id])).length, 0);
  const exTotal = lessons.reduce((a, l) => a + l.exercises.length, 0);
  return h('section', { class: 'card' },
    h('h2', {}, 'Lesson progress'),
    h('p', { class: 'muted small' }, `${r.lessonsDone} of ${lessons.length} lessons finished · ${exDone} of ${exTotal} exercises done. Each dot is an exercise: grey not opened, yellow tried, teal checks passed, green sent to you.`),
    h('ol', { class: 'lesson-list compact' }, lessons.map((l, i) => {
      const st = r.status[l.id] || {};
      const done = l.exercises.filter((e) => DONE.has(st[e.id])).length;
      const state = done === l.exercises.length && done ? 'done' : Object.keys(st).length ? 'started' : 'new';
      return h('li', {}, h('div', { class: `lesson-card ${state}` },
        h('span', { class: 'lesson-num' }, String(i + 1)),
        h('span', { class: 'lesson-text' }, h('strong', {}, l.title),
          h('span', { class: 'ex-dots' }, l.exercises.map((e) => h('span', {
            class: `st${st[e.id] ? ` st-${st[e.id]}` : ''}`,
            title: `${e.title}: ${STATUS_TEXT[st[e.id]] || 'not opened'}`,
          })))),
        h('span', { class: `lesson-progress ${state}` }, `${done} / ${l.exercises.length}`)));
    })));
}

function submissionsCard(r) {
  return h('section', { class: 'card' },
    h('h2', {}, 'Submissions'),
    r.subs.length
      ? h('div', { class: 'sub-cards' }, r.subs.map((s) => {
        const { lesson } = findExercise(s.lesson_id, s.exercise_id);
        const scores = Array.isArray(s.scores) ? s.scores : [];
        const total = scores.reduce((a, x) => a + (Number(x.score) || 0), 0);
        const max = scores.reduce((a, x) => a + (Number(x.max) || 0), 0);
        return h('article', { class: `sub-card ${s.status}` },
          h('div', { class: 'sub-card-head' },
            h('div', {},
              h('strong', {}, s.exercise_title || s.exercise_id),
              h('div', { class: 'muted small' }, `${lesson ? lesson.title + ' · ' : ''}sent ${fmtDay(s.created_at)}${s.marked_at ? ` · marked ${fmtDay(s.marked_at)}` : ''}`)),
            s.status === 'marked'
              ? h('span', { class: 'score-pill' }, max ? `${total} / ${max}` : 'Marked')
              : h('span', { class: 'badge' }, 'Waiting for you')),
          s.status === 'marked' && s.comment ? h('blockquote', { class: 'comment' }, s.comment) : '',
          h('a', { class: 'btn small', href: `mark.html?open=${encodeURIComponent(s.id)}` }, s.status === 'marked' ? 'Open in Inbox' : 'Mark it in Inbox'));
      }))
      : h('p', { class: 'muted' }, 'Nothing sent yet.'));
}

function renderDetail() {
  const r = rows.find((x) => x.id === currentId);
  if (!r) return;
  const s = r.summary;
  detailEl.replaceChildren(
    h('section', { class: 'profile-head' },
      h('div', {},
        h('p', { class: 'eyebrow' }, 'Student'),
        h('h1', {}, r.name),
        h('p', { class: 'muted' }, [
          r.joined ? `Joined ${fmtDay(r.joined)}` : '',
          r.lastActive ? `last practised ${fmtDay(r.lastActive)}` : 'hasn’t practised yet',
          r.listed ? 'on the class leaderboard' : 'hidden from classmates',
        ].filter(Boolean).join(' · '))),
      h('div', { class: 'row wrap' },
        h('a', { class: 'btn primary', href: `chat.html?dm=${encodeURIComponent(r.id)}` }, '💬 Message'))),
    h('div', { class: 'cols' },
      progressCard(r),
      journeyCard(s, r.events, { title: 'Level, streak and badges', id: 'journey' })),
    submissionsCard(r));
}

// ---------- Start ----------

async function load() {
  const me = await myProfile();
  renderAccountWidget(document.getElementById('account-widget'));
  if (!me || me.role !== 'teacher') {
    listEl.replaceChildren(h('p', { class: 'muted small' }, me
      ? 'This page is only for the teacher account.'
      : 'Sign in with your teacher account to see your students’ progress.'),
    me ? '' : h('a', { class: 'btn small primary', href: 'account.html?next=students.html' }, 'Sign in'));
    return;
  }
  listEl.replaceChildren(h('p', { class: 'muted small' }, 'Loading your students…'));
  try {
    rows = build(await classData());
  } catch (err) {
    listEl.replaceChildren(h('p', { class: 'warn' }, `Couldn’t load your students: ${err.message}`));
    return;
  }
  if (!rows.some((r) => r.id === currentId)) currentId = null;
  renderList();
  if (currentId) renderDetail();
  else if (rows.length && !matchMedia('(max-width: 860px)').matches) select(sorted()[0].id);
}

load().catch((err) => toast(err.message));
