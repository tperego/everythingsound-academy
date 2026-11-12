// Chat: course channels for everyone, and a private chat between each student and the teacher.
// Everything is shown as text (never as HTML), so messages can't run code or change the page.

import {
  chatDelete, chatFetch, chatMarkRead, chatReads, chatRecent, chatSend, chatSubscribe, dmChannel,
  listStudents, myProfile, renderAccountWidget, unreadByChannel,
} from './auth.js?v=202611122344';
import { COURSE } from './course.js?v=202611122344';
import { h, toast } from './util.js?v=202611122344';

const root = document.getElementById('chat');
const params = new URLSearchParams(location.search);

let me = null;
let active = null; // channel id
let messages = []; // of the active channel
let unread = {};
let dmList = []; // teacher: [{channel, name, last}]
let lastSent = 0;

const isTeacher = () => me?.role === 'teacher';
const fmtTime = (s) => {
  const d = new Date(s);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function channelInfo(id) {
  const c = COURSE.chatChannels.find((x) => x.id === id);
  if (c) return c;
  if (id?.startsWith('dm:')) {
    if (!isTeacher()) return { id, name: 'Your teacher', icon: '✉', about: 'A private chat between you and your teacher. Nobody else can see it.' };
    const d = dmList.find((x) => x.channel === id);
    return { id, name: d?.name || 'Student', icon: '✉', about: `Private chat with ${d?.name || 'this student'}. Only the two of you can see it.` };
  }
  return null;
}

// ---------- Start ----------

async function start() {
  me = await myProfile();
  renderAccountWidget(document.getElementById('account-widget'));
  if (!me) {
    root.replaceChildren(h('section', { class: 'card auth-card' },
      h('h1', {}, 'Chat'),
      h('p', { class: 'muted' }, 'Sign in to chat with your class and send private messages to your teacher.'),
      h('a', { class: 'btn primary', href: 'account.html?next=chat.html' }, 'Sign in')));
    return;
  }
  try {
    await refreshSidebarData();
  } catch (err) {
    root.replaceChildren(h('p', { class: 'warn' }, `Chat isn’t available yet: ${err.message}`));
    return;
  }
  const want = params.get('channel');
  const dm = params.get('dm');
  if (dm === 'me' && !isTeacher()) active = dmChannel(me.id);
  else if (dm && isTeacher()) active = dmChannel(dm);
  else if (want && channelInfo(want)) active = want;
  else active = isTeacher() ? (dmList.find((d) => unread[d.channel])?.channel || 'course:general') : 'course:general';
  layout();
  await openChannel(active, { prefill: params.get('about') });
  chatSubscribe(onLive);
  // Fallback in case live updates are blocked by the network: check every 20 seconds.
  setInterval(() => { if (document.visibilityState === 'visible') refreshActive(); }, 20000);
}

async function refreshSidebarData() {
  const [recent, reads] = await Promise.all([chatRecent(500), chatReads()]);
  unread = unreadByChannel(recent, reads, me.id);
  if (isTeacher()) {
    const students = await listStudents().catch(() => []);
    const byChannel = new Map(students.map((s) => [dmChannel(s.id), { channel: dmChannel(s.id), name: s.full_name || 'Student', last: null }]));
    for (const m of recent) {
      if (!m.channel.startsWith('dm:')) continue;
      const d = byChannel.get(m.channel) || { channel: m.channel, name: m.author_role === 'student' ? m.author_name : 'Student', last: null };
      if (!d.last || m.created_at > d.last.created_at) d.last = m;
      byChannel.set(m.channel, d);
    }
    dmList = [...byChannel.values()].sort((a, b) => (b.last?.created_at || '').localeCompare(a.last?.created_at || '') || a.name.localeCompare(b.name));
  }
}

// ---------- Layout ----------

let els = {};
function layout() {
  els.sidebar = h('nav', { class: 'chat-side', 'aria-label': 'Chats' });
  els.head = h('div', { class: 'chat-head' });
  els.list = h('div', { class: 'chat-list', role: 'log', 'aria-live': 'polite' });
  els.input = h('textarea', { rows: 2, maxlength: 2000, placeholder: 'Write a message… (Enter to send, Shift+Enter for a new line)', 'aria-label': 'Message' });
  els.send = h('button', { type: 'submit', class: 'btn primary' }, 'Send');
  els.form = h('form', { class: 'chat-compose', onsubmit: (e) => { e.preventDefault(); send(); } }, els.input, els.send);
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  root.replaceChildren(els.sidebar, h('section', { class: 'chat-main' }, els.head, els.list, els.form));
  renderSidebar();
}

function renderSidebar() {
  const item = (id, label, icon, extra = '') => h('button', {
    type: 'button',
    class: `chat-item${id === active ? ' on' : ''}`,
    'aria-current': id === active ? 'true' : null,
    onclick: () => openChannel(id),
  }, h('span', { class: 'chat-icon', 'aria-hidden': 'true' }, icon), h('span', { class: 'chat-name' }, label, extra),
    unread[id] ? h('span', { class: 'chat-badge' }, unread[id] > 9 ? '9+' : String(unread[id])) : '');

  const course = COURSE.chatChannels.map((c) => item(c.id, c.name, c.icon));
  let privateSection;
  if (isTeacher()) {
    privateSection = [
      h('p', { class: 'chat-section' }, 'Private chats with students'),
      ...(dmList.length ? dmList.map((d) => item(d.channel, d.name, '✉', d.last ? h('span', { class: 'chat-preview' }, d.last.deleted ? 'Message deleted' : d.last.body) : '')) : [h('p', { class: 'muted small' }, 'No students yet.')]),
    ];
  } else {
    privateSection = [h('p', { class: 'chat-section' }, 'Private'), item(dmChannel(me.id), 'Your teacher', '✉')];
  }
  els.sidebar.replaceChildren(h('p', { class: 'chat-section' }, 'Course'), ...course, ...privateSection,
    h('p', { class: 'muted small chat-rules' }, 'Be kind and helpful. Your teacher can see and remove messages in the course channels.'));
}

// ---------- A channel ----------

async function openChannel(id, { prefill = null } = {}) {
  active = id;
  const info = channelInfo(id);
  history.replaceState(null, '', `chat.html?channel=${encodeURIComponent(id)}`);
  els.head.replaceChildren(h('div', {}, h('h2', {}, `${info.icon === '#' ? '# ' : ''}${info.name}`), h('p', { class: 'muted small' }, info.about)));
  const canPost = !(info.teacherOnly && !isTeacher());
  els.form.hidden = !canPost;
  els.list.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
  try {
    messages = await chatFetch(id);
  } catch (err) {
    els.list.replaceChildren(h('p', { class: 'warn' }, err.message));
    return;
  }
  renderMessages(true);
  unread[id] = 0;
  renderSidebar();
  chatMarkRead(id).catch(() => {});
  if (prefill && canPost) {
    els.input.value = `${String(prefill).slice(0, 200)}\n`;
    els.input.focus();
  }
}

function renderMessages(scroll = false) {
  const nearBottom = els.list.scrollHeight - els.list.scrollTop - els.list.clientHeight < 120;
  const visible = messages.filter((m) => !m.deleted || isTeacher());
  if (!visible.length) {
    const info = channelInfo(active);
    els.list.replaceChildren(h('p', { class: 'muted chat-empty' }, active.startsWith('dm:') && !isTeacher()
      ? 'Ask your teacher anything here: about an exercise, your feedback, or what to practise next.'
      : `No messages yet in ${info.name}. Say hello!`));
    return;
  }
  let lastDay = '';
  const out = [];
  for (const m of visible) {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDay) { out.push(h('p', { class: 'chat-day' }, new Date(m.created_at).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }))); lastDay = day; }
    const mine = m.author_id === me.id;
    const canDelete = !m.deleted && (mine || isTeacher());
    out.push(h('div', { class: `msg${mine ? ' mine' : ''}${m.author_role === 'teacher' ? ' teacher' : ''}${m.deleted ? ' deleted' : ''}` },
      h('div', { class: 'msg-meta' },
        h('strong', {}, mine ? 'You' : (m.author_name || 'Someone')),
        m.author_role === 'teacher' ? h('span', { class: 'teacher-tag' }, 'Teacher') : '',
        h('span', { class: 'muted' }, fmtTime(m.created_at)),
        canDelete ? h('button', { type: 'button', class: 'msg-del', title: 'Delete this message', onclick: () => remove(m) }, 'Delete') : ''),
      h('div', { class: 'msg-body' }, m.deleted ? (isTeacher() ? `(deleted) ${m.body}` : 'Message deleted') : m.body)));
  }
  els.list.replaceChildren(...out);
  if (scroll || nearBottom) els.list.scrollTop = els.list.scrollHeight;
}

async function send() {
  const body = els.input.value.trim();
  if (!body) return;
  if (Date.now() - lastSent < 1500) { toast('Slow down a little 🙂'); return; }
  lastSent = Date.now();
  els.send.disabled = true;
  try {
    const m = await chatSend(active, body.slice(0, 2000));
    if (!messages.some((x) => x.id === m.id)) messages.push(m);
    els.input.value = '';
    renderMessages(true);
    chatMarkRead(active).catch(() => {});
  } catch (err) {
    toast(`Not sent: ${err.message}`);
  } finally {
    els.send.disabled = false;
    els.input.focus();
  }
}

async function remove(m) {
  if (!confirm('Delete this message?')) return;
  try {
    await chatDelete(m.id);
    m.deleted = true;
    renderMessages();
  } catch (err) {
    toast(err.message);
  }
}

async function refreshActive() {
  try {
    const fresh = await chatFetch(active);
    if (fresh.length !== messages.length || fresh.some((m, i) => m.id !== messages[i]?.id || m.deleted !== messages[i]?.deleted)) {
      messages = fresh;
      renderMessages();
      chatMarkRead(active).catch(() => {});
    }
  } catch {
    /* offline for a moment */
  }
}

/** A message arrived or was deleted somewhere. */
function onLive(m) {
  if (!m?.channel) return;
  if (m.channel === active) {
    const i = messages.findIndex((x) => x.id === m.id);
    if (i >= 0) messages[i] = { ...messages[i], ...m };
    else messages.push(m);
    renderMessages();
    if (document.visibilityState === 'visible') chatMarkRead(active).catch(() => {});
  } else if (!m.deleted && m.author_id !== me.id) {
    unread[m.channel] = (unread[m.channel] || 0) + 1;
    if (isTeacher() && m.channel.startsWith('dm:')) {
      const d = dmList.find((x) => x.channel === m.channel);
      if (d) { d.last = m; dmList.sort((a, b) => (b.last?.created_at || '').localeCompare(a.last?.created_at || '')); }
    }
    renderSidebar();
  }
}

start();
