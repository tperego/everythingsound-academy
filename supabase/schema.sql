-- EverythingSound Academy: database setup.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.
-- It is safe to run again (it only creates what is missing and replaces the security rules).

-- ---------- Private settings (the class code lives here; no one can read it from the website) ----------
create schema if not exists private;
create table if not exists private.settings (key text primary key, value text not null);
revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

-- ---------- Profiles: one per account ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

-- A new account needs the right class code; then its profile is created.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  code text;
begin
  select value into code from private.settings where key = 'class_code';
  if code is null or coalesce(new.raw_user_meta_data ->> 'class_code', '') <> code then
    raise exception 'Invalid class code';
  end if;
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

drop policy if exists "profiles: read own, teacher reads all" on public.profiles;
create policy "profiles: read own, teacher reads all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_teacher());
drop policy if exists "profiles: update own name" on public.profiles;
create policy "profiles: update own name" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Students may change their name only, never their role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- ---------- Submissions and the teacher's feedback ----------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  course_id text not null,
  lesson_id text not null,
  exercise_id text not null,
  exercise_title text not null default '',
  project jsonb,
  answers jsonb,
  checks jsonb,
  message text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in ('submitted', 'marked')),
  scores jsonb,
  comment text,
  marked_at timestamptz,
  marked_by uuid references public.profiles(id)
);
alter table public.submissions enable row level security;
create index if not exists submissions_student_idx on public.submissions (student_id, created_at desc);
create index if not exists submissions_status_idx on public.submissions (status, created_at desc);

drop policy if exists "submissions: read own, teacher reads all" on public.submissions;
create policy "submissions: read own, teacher reads all" on public.submissions
  for select to authenticated using (student_id = auth.uid() or public.is_teacher());
drop policy if exists "submissions: students add their own" on public.submissions;
create policy "submissions: students add their own" on public.submissions
  for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "submissions: teacher marks" on public.submissions;
create policy "submissions: teacher marks" on public.submissions
  for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
-- Students can only fill in their work; only the feedback columns can be updated (and only by the teacher).
revoke insert, update, delete on public.submissions from anon, authenticated;
grant insert (course_id, lesson_id, exercise_id, exercise_title, project, answers, checks, message, attachments)
  on public.submissions to authenticated;
grant update (status, scores, comment, marked_at, marked_by) on public.submissions to authenticated;

-- ---------- Progress through the course ----------
create table if not exists public.progress (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  lesson_id text not null,
  exercise_id text not null,
  status text not null check (status in ('tried', 'passed', 'submitted')),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id, exercise_id)
);
alter table public.progress enable row level security;
drop policy if exists "progress: read own, teacher reads all" on public.progress;
create policy "progress: read own, teacher reads all" on public.progress
  for select to authenticated using (user_id = auth.uid() or public.is_teacher());
drop policy if exists "progress: write own" on public.progress;
create policy "progress: write own" on public.progress
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "progress: update own" on public.progress;
create policy "progress: update own" on public.progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.progress from anon;

-- ---------- Sandbox pieces ----------
create table if not exists public.pieces (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null default 'Untitled piece',
  project jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.pieces enable row level security;
drop policy if exists "pieces: own" on public.pieces;
create policy "pieces: own" on public.pieces
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.pieces from anon;
revoke all on public.submissions from anon;
revoke all on public.profiles from anon;

-- ---------- Attachments (MIDI and audio from DAWs): private storage ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "attachments: students upload to their folder" on storage.objects;
create policy "attachments: students upload to their folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "attachments: read own, teacher reads all" on storage.objects;
create policy "attachments: read own, teacher reads all" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_teacher()));
