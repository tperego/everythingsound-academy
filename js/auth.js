// Student accounts, online submissions, feedback, progress and Sandbox pieces, via Supabase.
// The URL and publishable key are meant to be public: the database's security rules (supabase/schema.sql)
// decide what each signed-in person can read or change.

import { h } from './util.js?v=202611141938';
import { celebrate, summarise, xpChip } from './game.js?v=202611141938';

const SUPABASE_URL = 'https://joiozvkdjhgmgrlsbooy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XA9xQHE9c_juWcnk2V7y5g_hTS0pIIb';
export const COURSE_ID = 'music-theory';
const BUCKET = 'attachments';

let client = null;
/** The Supabase client, or null when the library didn't load (the site then works on this device only). */
export function sb() {
  if (!client && window.supabase?.createClient) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

export async function currentUser() {
  const c = sb();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user || null;
}

let profilePromise = null;
/** {id, full_name, role} of whoever is signed in, or null. */
export function myProfile(refresh = false) {
  if (!profilePromise || refresh) {
    profilePromise = (async () => {
      const user = await currentUser();
      if (!user) return null;
      const { data, error } = await sb().from('profiles').select('*').eq('id', user.id).single();
      if (error) return { id: user.id, full_name: user.user_metadata?.full_name || '', role: 'student', email: user.email };
      return { ...data, email: user.email };
    })();
  }
  return profilePromise;
}

function friendly(error) {
  const m = String(error?.message || error || '');
  if (/database error saving new user|invalid class code/i.test(m)) return 'That class code isn’t right. Check it with your teacher.';
  if (/invalid login credentials/i.test(m)) return 'Email or password not recognised.';
  if (/already registered|already been registered/i.test(m)) return 'There is already an account with this email. Sign in instead.';
  if (/password should be at least/i.test(m)) return 'The password needs at least 8 characters.';
  if (/rate limit/i.test(m)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/same.*(old|previous|current).*password|different from the old/i.test(m)) return 'Choose a password you haven’t used before.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first: open the link in the email we sent you (check your spam folder too).';
  if (/error sending confirmation email/i.test(m)) return 'The confirmation email couldn’t be sent right now. Please try again later, or ask your teacher.';
  if (/error sending (recovery|reset) email|smtp/i.test(m)) return 'The reset email couldn’t be sent right now. Please try again later, or ask your teacher.';
  return m || 'Something went wrong.';
}

export async function signUp({ name, email, password, code }) {
  const c = sb();
  if (!c) throw new Error('Accounts are unavailable right now. Please reload the page.');
  const emailRedirectTo = new URL('account.html', location.href).href;
  const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo, data: { full_name: name, class_code: code } } });
  if (error) throw new Error(friendly(error));
  // With "Confirm email" on, there is no session until the student clicks the link in the email.
  if (!data.session) return { needsConfirm: true };
  myProfile(true);
  return { user: data.user };
}

export async function resendConfirmation(email) {
  const c = sb();
  if (!c) throw new Error('Accounts are unavailable right now. Please reload the page.');
  const emailRedirectTo = new URL('account.html', location.href).href;
  const { error } = await c.auth.resend({ type: 'signup', email, options: { emailRedirectTo } });
  if (error) throw new Error(friendly(error));
}

export async function signIn({ email, password }) {
  const c = sb();
  if (!c) throw new Error('Accounts are unavailable right now. Please reload the page.');
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) {
    const err = new Error(friendly(error));
    if (/email not confirmed/i.test(error.message || '')) err.unconfirmed = true;
    throw err;
  }
  myProfile(true);
}

// ---------- Forgotten password ----------

/** Emails a reset link (if an account exists). The link opens account.html, where a new password is chosen. */
export async function requestPasswordReset(email) {
  const c = sb();
  if (!c) throw new Error('Accounts are unavailable right now. Please reload the page.');
  const redirectTo = new URL('account.html', location.href).href;
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(friendly(error));
}

/** Called when the student arrives from the reset link (Supabase signs them in for this one purpose). */
export function onPasswordRecovery(cb) {
  sb()?.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') cb(); });
}

export async function setNewPassword(password) {
  const { error } = await sb().auth.updateUser({ password });
  if (error) throw new Error(friendly(error));
  myProfile(true);
}

export async function signOut() {
  await sb()?.auth.signOut();
  myProfile(true);
  xpPromise = null;
  // On a shared computer the next person shouldn't see this student's work: it's all in their account anyway.
  const keep = new Set(['es.views', 'es.view', 'es.hideMarked']);
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('es.') && !keep.has(k)) localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
}

export async function updateMyName(name) {
  const p = await myProfile();
  const { error } = await sb().from('profiles').update({ full_name: name.slice(0, 120) }).eq('id', p.id);
  if (error) throw new Error(friendly(error));
  myProfile(true);
}

/** Header: "Sign in" or the student's name with a menu. */
export async function renderAccountWidget(el) {
  if (!el) return;
  const p = await myProfile();
  if (!p) {
    el.replaceChildren(h('a', { class: 'btn small primary', href: 'account.html' }, 'Sign in'));
    return;
  }
  const badge = h('span', { class: 'chat-badge', hidden: true });
  el.replaceChildren(
    h('a', { class: 'btn small', href: 'chat.html', title: 'Course chat and messages with your teacher' }, '💬 Chat', badge),
    h('a', { class: 'btn small', href: 'account.html', title: 'My profile: your work and your teacher’s feedback' }, `👤 ${p.full_name || 'My profile'}`),
    p.role === 'teacher' ? h('a', { class: 'btn small ghost', href: 'mark.html' }, 'Inbox') : '',
  );
  if (p.role !== 'teacher') {
    myXpEvents().then((ev) => { if (ev) el.prepend(xpChip(summarise(ev))); }).catch(() => {});
  }
  unreadChatCount().then((n) => {
    if (n > 0) { badge.textContent = n > 9 ? '9+' : String(n); badge.hidden = false; }
  }).catch(() => {});
}

// ---------- XP (see supabase/game.sql and js/game.js) ----------

let xpPromise = null;
/** This student's XP events, or null when signed out (or before game.sql has been run). */
export function myXpEvents(refresh = false) {
  if (!xpPromise || refresh) {
    xpPromise = (async () => {
      const user = await currentUser();
      if (!user) return null;
      const { data, error } = await sb().from('xp_events').select('kind, ref, xp, created_at').eq('user_id', user.id).order('created_at');
      if (error) return null;
      return data;
    })();
  }
  return xpPromise;
}

let awardQueue = Promise.resolve();
/** Ask the database for XP (it decides how much, once per exercise, with daily limits), then celebrate.
 *  Calls run one after another, so each celebration compares with the one before. */
export function awardXp(kind, ref) {
  const run = awardQueue.then(() => doAward(kind, ref));
  awardQueue = run.catch(() => 0);
  return run;
}

async function doAward(kind, ref) {
  try {
    const p = await myProfile();
    if (!p || p.role === 'teacher') return 0;
    const before = await myXpEvents();
    if (!before) return 0;
    const { data, error } = await sb().rpc('award_xp', { p_kind: kind, p_ref: ref });
    if (error) return 0;
    const gained = data?.[0]?.gained || 0;
    if (gained) {
      const after = await myXpEvents(true);
      celebrate({ gained, before: summarise(before), after: after ? summarise(after) : null });
      const chip = document.querySelector('.xp-chip');
      if (chip && after) chip.replaceWith(xpChip(summarise(after)));
    }
    return gained;
  } catch {
    return 0;
  }
}

export async function leaderboard() {
  const { data, error } = await sb().rpc('leaderboard');
  if (error) throw new Error(friendly(error));
  return data || [];
}

export async function setLeaderboardOptIn(on) {
  const p = await myProfile();
  const { error } = await sb().from('profiles').update({ show_on_leaderboard: !!on }).eq('id', p.id);
  if (error) throw new Error(friendly(error));
  myProfile(true);
}

// ---------- Progress ----------

export async function saveProgress(lessonId, exerciseId, status) {
  const user = await currentUser();
  if (!user) return;
  await sb().from('progress').upsert({ user_id: user.id, lesson_id: lessonId, exercise_id: exerciseId, status, updated_at: new Date().toISOString() });
}

/** Map of lessonId -> {exerciseId: status}. */
export async function myProgress() {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await sb().from('progress').select('lesson_id, exercise_id, status').eq('user_id', user.id);
  if (error) return null;
  const out = {};
  for (const r of data) (out[r.lesson_id] ||= {})[r.exercise_id] = r.status;
  return out;
}

// ---------- Submissions ----------

const safeName = (s) => String(s || 'file').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);

/** files: [{kind, fileName, type, size, bytes}] uploaded privately, then the submission row is created. */
export async function submitOnline(sub, files = []) {
  const user = await currentUser();
  if (!user) throw new Error('Please sign in first.');
  const folder = `${user.id}/${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  const attachments = [];
  for (const f of files) {
    const path = `${folder}/${safeName(f.fileName)}`;
    const { error } = await sb().storage.from(BUCKET).upload(path, new Blob([f.bytes], { type: f.type || 'application/octet-stream' }), { contentType: f.type || 'application/octet-stream', upsert: false });
    if (error) throw new Error(`Uploading ${f.fileName} failed: ${error.message}`);
    attachments.push({ kind: f.kind, fileName: f.fileName, type: f.type, size: f.size, path });
  }
  const { data, error } = await sb().from('submissions').insert({
    course_id: COURSE_ID,
    lesson_id: sub.lessonId,
    exercise_id: sub.exerciseId,
    exercise_title: sub.exerciseTitle,
    project: sub.project,
    answers: sub.answers,
    checks: sub.checks,
    message: sub.message || '',
    attachments,
  }).select('id').single();
  if (error) throw new Error(friendly(error));
  return data.id;
}

const SUB_FIELDS = 'id, student_id, lesson_id, exercise_id, exercise_title, project, answers, checks, message, attachments, created_at, status, scores, comment, marked_at';

export async function mySubmissions() {
  const user = await currentUser();
  if (!user) return [];
  const { data, error } = await sb().from('submissions').select(SUB_FIELDS).eq('student_id', user.id).order('created_at', { ascending: false });
  if (error) throw new Error(friendly(error));
  return data;
}

export async function getSubmission(id) {
  const { data, error } = await sb().from('submissions').select(`${SUB_FIELDS}, student:profiles!submissions_student_id_fkey(full_name)`).eq('id', id).single();
  if (error) throw new Error(friendly(error));
  return data;
}

/** Teacher: every submission, newest first, with the student's name. */
export async function inbox() {
  const { data, error } = await sb().from('submissions')
    .select(`${SUB_FIELDS}, student:profiles!submissions_student_id_fkey(full_name)`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(friendly(error));
  return data;
}

export async function saveFeedback(id, { scores, comment }) {
  const p = await myProfile();
  const { error } = await sb().from('submissions').update({
    status: 'marked', scores, comment, marked_at: new Date().toISOString(), marked_by: p.id,
  }).eq('id', id);
  if (error) throw new Error(friendly(error));
}

export async function downloadAttachment(path) {
  const { data, error } = await sb().storage.from(BUCKET).download(path);
  if (error) throw new Error(friendly(error));
  return new Uint8Array(await data.arrayBuffer());
}

// ---------- Sandbox pieces ----------

export async function listPieces() {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await sb().from('pieces').select('id, title, project, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false });
  if (error) return null;
  return data;
}

export async function savePiece(piece) {
  const user = await currentUser();
  if (!user) return;
  const { error } = await sb().from('pieces').upsert({ id: piece.id, user_id: user.id, title: piece.title, project: piece.project, updated_at: piece.updatedAt || new Date().toISOString() });
  if (error) throw new Error(friendly(error));
}

export async function deletePiece(id) {
  const user = await currentUser();
  if (!user) return;
  await sb().from('pieces').delete().eq('id', id);
}

// ---------- Chat ----------

const MSG_FIELDS = 'id, channel, author_id, author_name, author_role, body, created_at, deleted';

export const dmChannel = (studentId) => `dm:${studentId}`;

export async function chatFetch(channel, limit = 150) {
  const { data, error } = await sb().from('messages').select(MSG_FIELDS).eq('channel', channel).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(friendly(error));
  return data.reverse();
}

export async function chatSend(channel, body) {
  const { data, error } = await sb().from('messages').insert({ channel, body }).select(MSG_FIELDS).single();
  if (error) throw new Error(friendly(error));
  return data;
}

export async function chatDelete(id) {
  const { error } = await sb().from('messages').update({ deleted: true }).eq('id', id);
  if (error) throw new Error(friendly(error));
}

/** Recent messages across every channel this person can read (for unread counts and the teacher's list). */
export async function chatRecent(limit = 500) {
  const { data, error } = await sb().from('messages').select('id, channel, author_id, author_name, author_role, body, created_at, deleted').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(friendly(error));
  return data;
}

export async function chatReads() {
  const { data, error } = await sb().from('chat_reads').select('channel, last_read_at');
  if (error) return {};
  return Object.fromEntries(data.map((r) => [r.channel, r.last_read_at]));
}

export async function chatMarkRead(channel) {
  const user = await currentUser();
  if (!user) return;
  await sb().from('chat_reads').upsert({ user_id: user.id, channel, last_read_at: new Date().toISOString() });
}

/** Unread messages per channel (messages by others, after the last time this person looked). */
export function unreadByChannel(recent, reads, myId) {
  const out = {};
  for (const m of recent) {
    if (m.deleted || m.author_id === myId) continue;
    const seen = reads[m.channel];
    if (!seen || m.created_at > seen) out[m.channel] = (out[m.channel] || 0) + 1;
  }
  return out;
}

export async function unreadChatCount() {
  const user = await currentUser();
  if (!user) return 0;
  const [recent, reads] = await Promise.all([chatRecent(300), chatReads()]);
  return Object.values(unreadByChannel(recent, reads, user.id)).reduce((a, b) => a + b, 0);
}

/** Live updates: calls onChange(message) for new and deleted messages. Returns a function to stop. */
export function chatSubscribe(onChange) {
  const c = sb();
  if (!c) return () => {};
  const ch = c.channel(`messages-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => onChange(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (p) => onChange(p.new))
    .subscribe();
  return () => c.removeChannel(ch);
}

/** Teacher: everyone in the course, for starting a private chat. */
export async function listStudents() {
  const { data, error } = await sb().from('profiles').select('id, full_name, role').eq('role', 'student').order('full_name');
  if (error) throw new Error(friendly(error));
  return data;
}
