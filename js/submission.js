// Submission and feedback formats. Both travel as files or links, so everything is validated on load.

import { normalizeProject } from './project.js';
import { slug, uid } from './util.js';
import { FORM_LABELS } from './form.js';

export const SUBMISSION_FORMAT = 'everythingsound-submission';
export const FEEDBACK_FORMAT = 'everythingsound-feedback';
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Form-analysis answers: phrase labels and "same rhythm / same pitches" ticks. */
export function parseAnswers(a) {
  if (!a || typeof a !== 'object') return null;
  const arr = (x) => (Array.isArray(x) ? x.slice(0, 32) : []);
  return {
    formLabels: arr(a.formLabels).map((v) => (FORM_LABELS.includes(v) ? v : '')),
    sameRhythm: arr(a.sameRhythm).map(Boolean),
    samePitch: arr(a.samePitch).map(Boolean),
  };
}

export function makeSubmission({ lessonId, exerciseId, exerciseTitle, student, message, project, checks, attachments = [], answers = null }) {
  return {
    format: SUBMISSION_FORMAT,
    version: 1,
    id: uid(),
    submittedAt: new Date().toISOString(),
    lessonId,
    exerciseId,
    exerciseTitle,
    student: { name: student },
    message,
    project,
    checks: checks.map((c) => ({ label: c.label, pass: !!c.pass, detail: c.detail || '' })),
    attachments, // [{kind: 'midi'|'audio', fileName, type, size, data: base64}]
    answers,
  };
}

export function parseSubmission(raw) {
  if (!raw || raw.format !== SUBMISSION_FORMAT) throw new Error('This is not an EverythingSound submission file.');
  return {
    format: SUBMISSION_FORMAT,
    version: 1,
    id: str(raw.id, 64) || uid(),
    submittedAt: str(raw.submittedAt, 40),
    lessonId: str(raw.lessonId, 80),
    exerciseId: str(raw.exerciseId, 80),
    exerciseTitle: str(raw.exerciseTitle, 200),
    student: { name: str(raw.student?.name, 120) || 'Unnamed student' },
    message: str(raw.message, 5000),
    project: normalizeProject(raw.project),
    checks: (Array.isArray(raw.checks) ? raw.checks : []).slice(0, 50).map((c) => ({ label: str(c?.label), pass: !!c?.pass, detail: str(c?.detail, 400) })),
    attachments: (Array.isArray(raw.attachments) ? raw.attachments : []).slice(0, 6)
      .filter((a) => (a?.kind === 'midi' || a?.kind === 'audio') && typeof a.data === 'string')
      .map((a) => ({ kind: a.kind, fileName: str(a.fileName, 160) || a.kind, type: str(a.type, 80), size: Number(a.size) || 0, data: a.data })),
    answers: parseAnswers(raw.answers),
  };
}

export function submissionFileName(sub) {
  return `${slug(sub.exerciseId)}--${slug(sub.student.name)}.esound.json`;
}

export function makeFeedback({ submission, scores, comment, checks }) {
  return {
    format: FEEDBACK_FORMAT,
    version: 1,
    submissionId: submission.id,
    markedAt: new Date().toISOString(),
    lessonId: submission.lessonId,
    exerciseId: submission.exerciseId,
    exerciseTitle: submission.exerciseTitle,
    student: submission.student,
    project: submission.project,
    answers: submission.answers || null,
    scores, // [{label, score, max}]
    comment,
    checks: checks.map((c) => ({ label: c.label, pass: !!c.pass })),
  };
}

export function parseFeedback(raw) {
  if (!raw || raw.format !== FEEDBACK_FORMAT) throw new Error('This is not an EverythingSound feedback link.');
  return {
    submissionId: str(raw.submissionId, 64),
    markedAt: str(raw.markedAt, 40),
    lessonId: str(raw.lessonId, 80),
    exerciseId: str(raw.exerciseId, 80),
    exerciseTitle: str(raw.exerciseTitle, 200),
    student: { name: str(raw.student?.name, 120) },
    project: normalizeProject(raw.project),
    answers: parseAnswers(raw.answers),
    scores: (Array.isArray(raw.scores) ? raw.scores : []).slice(0, 20).map((s) => ({
      label: str(s?.label), max: Math.max(0, Math.min(100, Number(s?.max) || 0)), score: Math.max(0, Math.min(100, Number(s?.score) || 0)),
    })),
    comment: str(raw.comment, 8000),
    checks: (Array.isArray(raw.checks) ? raw.checks : []).slice(0, 50).map((c) => ({ label: str(c?.label), pass: !!c?.pass })),
  };
}
