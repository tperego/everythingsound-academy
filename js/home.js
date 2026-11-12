// Course home: modules, lessons, progress, and a way back into where the student left off.

import { COURSE, courseLessons, lessonProgress } from './course.js';
import { h, store } from './util.js';
import { myProgress, renderAccountWidget } from './auth.js';

const $ = (sel) => document.querySelector(sel);

$('#academy').textContent = COURSE.academy;
$('#course-title').textContent = COURSE.title;
$('#course-intro').textContent = COURSE.intro;

const lessonUrl = (l) => `lesson.html?lesson=${encodeURIComponent(l.id)}`;

function render() {
let n = 0;
$('#modules').replaceChildren(...COURSE.modules.map((m, mi) => h('section', { class: 'module' },
  h('div', { class: 'module-head' },
    h('p', { class: 'eyebrow' }, `Module ${mi + 1}`),
    h('h2', {}, m.title),
    m.intro ? h('p', { class: 'muted' }, m.intro) : ''),
  h('ol', { class: 'lesson-list' }, m.lessons.map((id) => courseLessons().find((l) => l.id === id)).filter(Boolean).map((l) => {
    n++;
    const pr = lessonProgress(l);
    const state = pr.done === pr.total ? 'done' : pr.started ? 'started' : 'new';
    return h('li', {},
      h('a', { class: `lesson-card ${state}`, href: lessonUrl(l) },
        h('span', { class: 'lesson-num' }, String(n)),
        h('span', { class: 'lesson-text' },
          h('strong', {}, l.title),
          h('span', { class: 'muted small' }, `${l.exercises.length} exercise${l.exercises.length === 1 ? '' : 's'}${l.youtubeId ? ' · video' : ''}`)),
        h('span', { class: `lesson-progress ${state}` },
          state === 'done' ? '✓ Done' : state === 'started' ? `${pr.done} / ${pr.total}` : 'Start')));
  })))));

// "Continue" goes to the first lesson that isn't finished.
const all = courseLessons();
const next = all.find((l) => lessonProgress(l).done < l.exercises.length) || all[0];
const btn = $('#continue-btn');
if (next) {
  btn.href = lessonUrl(next);
  if (all.some((l) => lessonProgress(l).started)) btn.textContent = `Continue: ${next.title}`;
} else {
  btn.hidden = true;
}
}

render();

// Signed in: bring progress from the account (it may come from another computer) and show the account button.
renderAccountWidget($('#account-widget'));
myProgress().then((remote) => {
  if (!remote) return;
  const rank = { tried: 1, passed: 2, submitted: 3 };
  for (const [lessonId, ex] of Object.entries(remote)) {
    const all = store.get(`es.status.${lessonId}`, {});
    for (const [k, v] of Object.entries(ex)) if ((rank[v] || 0) > (rank[all[k]] || 0)) all[k] = v;
    store.set(`es.status.${lessonId}`, all);
  }
  render();
  $('#device-note').textContent = 'You are signed in: your progress, submissions and feedback are saved in your profile.';
}).catch(() => {});
