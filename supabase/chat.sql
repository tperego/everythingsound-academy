-- EverythingSound Academy: chat (course channels + private chat with the teacher).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run. (Run schema.sql first.)
-- Safe to run again.

-- ---------- Messages ----------
-- channel is either 'course:<name>' (everyone in the course) or 'dm:<student id>' (that student + the teacher).
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  channel text not null check (channel ~ '^(course:[a-z0-9-]{1,40}|dm:[0-9a-f-]{36})$'),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  author_role text not null default 'student',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists messages_channel_idx on public.messages (channel, created_at desc);
create index if not exists messages_created_idx on public.messages (created_at desc);
alter table public.messages enable row level security;

-- The author, their name and the time are always set by the database, never by the sender.
create or replace function private.stamp_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  select coalesce(full_name, ''), role into new.author_name, new.author_role from public.profiles where id = auth.uid();
  new.created_at := now();
  new.deleted := false;
  return new;
end;
$$;
drop trigger if exists stamp_message on public.messages;
create trigger stamp_message before insert on public.messages
  for each row execute function private.stamp_message();

create or replace function public.can_read_channel(ch text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when ch like 'course:%' then exists (select 1 from public.profiles where id = auth.uid())
    when ch like 'dm:%' then ch = 'dm:' || auth.uid()::text or public.is_teacher()
    else false
  end;
$$;

create or replace function public.can_post_channel(ch text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when ch = 'course:announcements' then public.is_teacher()
    when ch like 'course:%' then exists (select 1 from public.profiles where id = auth.uid())
    when ch like 'dm:%' then ch = 'dm:' || auth.uid()::text or public.is_teacher()
    else false
  end;
$$;

drop policy if exists "messages: read where allowed" on public.messages;
create policy "messages: read where allowed" on public.messages
  for select to authenticated using (public.can_read_channel(channel));
drop policy if exists "messages: post where allowed" on public.messages;
create policy "messages: post where allowed" on public.messages
  for insert to authenticated with check (public.can_post_channel(channel));
drop policy if exists "messages: delete own, teacher deletes any" on public.messages;
create policy "messages: delete own, teacher deletes any" on public.messages
  for update to authenticated
  using (author_id = auth.uid() or public.is_teacher())
  with check (author_id = auth.uid() or public.is_teacher());
-- Senders choose only the channel and the text; the only change allowed afterwards is "deleted".
revoke all on public.messages from anon;
revoke insert, update, delete on public.messages from authenticated;
grant insert (channel, body) on public.messages to authenticated;
grant update (deleted) on public.messages to authenticated;

-- ---------- What each person has read (for unread badges) ----------
create table if not exists public.chat_reads (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  channel text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel)
);
alter table public.chat_reads enable row level security;
drop policy if exists "chat_reads: own" on public.chat_reads;
create policy "chat_reads: own" on public.chat_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.chat_reads from anon;

-- ---------- Live updates ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
