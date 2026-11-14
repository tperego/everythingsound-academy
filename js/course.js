// The course: modules in order, each listing lesson ids from js/lessons.js.
// Add your lessons to js/lessons.js, then list them here in the order students should take them.

import { LESSONS, findLesson } from './lessons.js?v=202611141938';
import { store } from './util.js?v=202611141938';

export const COURSE = {
  id: 'music-theory',
  academy: 'EverythingSound Academy',
  title: 'Music Theory',
  intro:
    'Learn music theory by doing it. Each lesson has a short video and exercises you play, build and compose in the browser, with instant feedback where there is a right answer and personal feedback from your teacher where there isn’t.',
  // Chat channels everyone in the course can see. "Announcements" is for the teacher only.
  chatChannels: [
    { id: 'course:announcements', name: 'Announcements', icon: '📢', about: 'News and tips from your teacher.', teacherOnly: true },
    { id: 'course:general', name: 'General', icon: '#', about: 'Say hello, share what you’re working on, ask anything.' },
    { id: 'course:foundations', name: 'Foundations Q&A', icon: '#', about: 'Questions about Module 1: pitch, the keyboard, intervals, scales and enharmony.' },
    { id: 'course:chords', name: 'Chords & harmony Q&A', icon: '#', about: 'Questions about Modules 2 and 3: chords, rhythm, gravity, inversions, modulation.' },
  ],
  // The two lessons from class (progressions-1, listen-form-1) are hidden: not part of the course,
  // but they still open from a direct link (lesson.html?lesson=…).
  modules: [
    {
      title: 'Foundations',
      intro: 'Pitch, the keyboard, intervals, the major and minor scales and enharmony: the building blocks for everything that follows.',
      lessons: ['mt-01-pitch', 'mt-02-keyboard', 'mt-03-intervals', 'mt-04-major-scale', 'mt-05-minor-scale', 'mt-06-enharmony'],
    },
    {
      title: 'Chords',
      intro: 'How chords are built by 3rds, 7th chords, and the chords that grow on every grade of the scale.',
      lessons: ['mt-07-chords', 'mt-08-sevenths', 'mt-09-chords-scale'],
    },
    {
      title: 'Rhythm and harmony',
      intro: 'Note durations and time signatures, the harmonic gravity system, inversions and modulation.',
      lessons: ['mt-10-rhythm', 'mt-11-gravity', 'mt-12-inversions', 'mt-13-modulation'],
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
