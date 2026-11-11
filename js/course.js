// The course: modules in order, each listing lesson ids from js/lessons.js.
// Add your lessons to js/lessons.js, then list them here in the order students should take them.

import { LESSONS, findLesson } from './lessons.js';
import { store } from './util.js';

export const COURSE = {
  id: 'music-theory',
  academy: 'EverythingSound Academy',
  title: 'Music Theory',
  intro:
    'Learn music theory by doing it. Each lesson has a short video and exercises you play, build and compose in the browser, with instant feedback where there is a right answer and personal feedback from your teacher where there isn’t.',
  modules: [
    {
      title: 'Sample lessons from class',
      intro: 'The two lessons we used in class. The full course lessons will appear here, step by step.',
      lessons: ['progressions-1', 'listen-form-1'],
    },
  ],
};

/** All lessons in course order. */
export function courseLessons() {
  return COURSE.modules.flatMap((m) => m.lessons.map(findLesson).filter(Boolean));
}

export function lessonNeighbours(id) {
  const all = courseLessons();
  const i = all.findIndex((l) => l.id === id);
  return { index: i, total: all.length, prev: i > 0 ? all[i - 1] : null, next: i >= 0 && i < all.length - 1 ? all[i + 1] : null };
}

/** Progress of one lesson on this device: how many exercises were checked, passed or submitted. */
export function lessonProgress(lesson) {
  const status = store.get(`es.status.${lesson.id}`, {});
  const total = lesson.exercises.length;
  const done = lesson.exercises.filter((e) => status[e.id] === 'passed' || status[e.id] === 'submitted').length;
  const started = lesson.exercises.some((e) => status[e.id]);
  return { total, done, started };
}

export { LESSONS };
