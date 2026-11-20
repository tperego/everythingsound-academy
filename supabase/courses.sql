-- Everything Sound Academy: more than one course on the same accounts.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run. Safe to run again.
-- Run it after schema.sql, chat.sql and game.sql.
--
-- What it adds:
--   * courses: Music Theory and Recording (more later).
--   * a class code per course (kept private). A new account joins the course whose code it typed;
--     a student who already has an account joins another course with join_course(code).
--   * enrolments: who is in which course, and how they got in (code, paid, teacher).
--   * XP, levels, streaks, badges and the leaderboard run per course, side by side.
-- The live theory site keeps working unchanged: award_xp(kind, ref) and leaderboard() still mean Music Theory.

-- ---------- Courses ----------
create table if not exists public.courses (id text primary key, title text not null);
insert into public.courses (id, title) values
  ('music-theory', 'Music Theory'),
  ('recording', 'Recording and Signal Flow')
on conflict (id) do update set title = excluded.title;
alter table public.courses enable row level security;
drop policy if exists "courses: everyone reads" on public.courses;
create policy "courses: everyone reads" on public.courses for select to anon, authenticated using (true);
revoke insert, update, delete on public.courses from anon, authenticated;

-- ---------- Class codes, one or more per course (private: the website can't read them) ----------
create table if not exists private.course_codes (
  code text primary key,
  course_id text not null references public.courses(id) on delete cascade
);
revoke all on private.course_codes from anon, authenticated;
-- The existing theory class code carries over.
insert into private.course_codes (code, course_id)
select value, 'music-theory' from private.settings where key = 'class_code'
on conflict (code) do nothing;

-- ---------- Enrolments ----------
create table if not exists public.enrolments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  source text not null default 'code' check (source in ('code', 'paid', 'teacher')),
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
alter table public.enrolments enable row level security;
drop policy if exists "enrolments: read own, teacher reads all" on public.enrolments;
create policy "enrolments: read own, teacher reads all" on public.enrolments
  for select to authenticated using (user_id = auth.uid() or public.is_teacher());
revoke insert, update, delete on public.enrolments from anon, authenticated;
grant select on public.enrolments to authenticated;
-- Everyone who signed up before this existed did so with the theory class code.
insert into public.enrolments (user_id, course_id, source)
select id, 'music-theory', 'code' from public.profiles where role = 'student'
on conflict do nothing;

create or replace function public.is_enrolled(p_course text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_teacher() or exists (select 1 from public.enrolments where user_id = auth.uid() and course_id = p_course);
$$;
grant execute on function public.is_enrolled(text) to authenticated;

-- A new account needs a valid class code for some course; it is enrolled in that course.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  c text;
begin
  select course_id into c from private.course_codes where code = coalesce(new.raw_user_meta_data ->> 'class_code', '');
  if c is null then
    raise exception 'Invalid class code';
  end if;
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  insert into public.enrolments (user_id, course_id, source) values (new.id, c, 'code') on conflict do nothing;
  return new;
end;
$$;

-- A signed-in student joins another course with its class code. Returns the course id.
create or replace function public.join_course(p_code text) returns text
language plpgsql security definer set search_path = public, private as $$
declare
  c text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select course_id into c from private.course_codes where code = trim(coalesce(p_code, ''));
  if c is null then raise exception 'Invalid class code'; end if;
  insert into public.enrolments (user_id, course_id, source) values (auth.uid(), c, 'code') on conflict do nothing;
  return c;
end;
$$;
revoke execute on function public.join_course(text) from public, anon;
grant execute on function public.join_course(text) to authenticated;

-- ---------- XP per course ----------
alter table public.xp_events add column if not exists course_id text not null default 'music-theory' references public.courses(id);
-- Replace the old one-course rules: uniqueness and the list of kinds now include the course.
do $$ declare k text; begin
  for k in select conname from pg_constraint where conrelid = 'public.xp_events'::regclass and contype in ('u', 'c') loop
    execute format('alter table public.xp_events drop constraint %I', k);
  end loop;
end $$;
alter table public.xp_events add constraint xp_events_xp_range check (xp between 0 and 100);
alter table public.xp_events add constraint xp_events_kind_ok check (kind in (
  'passed', 'submitted', 'lesson', 'quiz-pass', 'quiz-round', 'quiz-perfect', 'daily', 'marked',
  'desk-task', 'exam-pass', 'exam-perfect'));
alter table public.xp_events add constraint xp_events_once unique (user_id, course_id, kind, ref);
create index if not exists xp_events_course_idx on public.xp_events (course_id, user_id, created_at);

create or replace function public.award_xp(p_course text, p_kind text, p_ref text)
returns table (gained int, total int)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  base int;
  per_day int;
  repeatable boolean := false;
  n int;
  r text;
  ins int;
  got int := 0;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.enrolments where user_id = uid and course_id = p_course) then raise exception 'Not enrolled'; end if;
  if p_ref is null or p_ref !~ '^[a-z0-9-]{1,60}(/[a-z0-9-]{1,60})?$' then raise exception 'Bad reference'; end if;

  case p_kind
    when 'passed' then base := 20; per_day := 40;           -- an exercise's checks all pass (once per exercise)
    when 'submitted' then base := 30; per_day := 40;        -- an exercise sent to the teacher (once per exercise)
    when 'lesson' then base := 50; per_day := 40;           -- every exercise of a lesson done (once per lesson)
    when 'quiz-perfect' then base := 15; per_day := 40;     -- every answer right in a quick-fire round (once per exercise)
    when 'desk-task' then base := 20; per_day := 40;        -- a desk (console) task done on the simulator (once per task)
    when 'exam-pass' then base := 50; per_day := 40;        -- the signal flow exam passed, 70% or more (once per exam)
    when 'exam-perfect' then base := 30; per_day := 40;     -- every simulator block of the exam right (once per exam)
    when 'quiz-pass' then base := 10; per_day := 5; repeatable := true;   -- a quick-fire round passed (5 a day)
    when 'quiz-round' then base := 3; per_day := 10; repeatable := true;  -- a quick-fire round finished (10 a day)
    else raise exception 'Unknown kind';
  end case;

  if repeatable then
    select count(*) into n from public.xp_events where user_id = uid and course_id = p_course and kind = p_kind and day = today;
    r := p_ref || '@' || today || '#' || (n + 1);
  else
    select count(*) into n from public.xp_events
      where user_id = uid and course_id = p_course and kind in ('passed', 'submitted', 'lesson', 'quiz-perfect', 'desk-task', 'exam-pass', 'exam-perfect') and day = today;
    r := p_ref;
  end if;

  if n < per_day then
    insert into public.xp_events (user_id, course_id, kind, ref, xp) values (uid, p_course, p_kind, r, base)
      on conflict (user_id, course_id, kind, ref) do nothing;
    get diagnostics ins = row_count;
    if ins > 0 then got := base; end if;
  end if;

  -- First practice of the day in this course: a small bonus, and it keeps this course's streak going.
  insert into public.xp_events (user_id, course_id, kind, ref, xp) values (uid, p_course, 'daily', today::text, 5)
    on conflict (user_id, course_id, kind, ref) do nothing;
  get diagnostics ins = row_count;
  if ins > 0 then got := got + 5; end if;

  return query select got, coalesce((select sum(xp) from public.xp_events where user_id = uid and course_id = p_course), 0)::int;
end;
$$;
revoke execute on function public.award_xp(text, text, text) from public, anon;
grant execute on function public.award_xp(text, text, text) to authenticated;

-- The old two-argument call (used by the live theory site) means Music Theory.
create or replace function public.award_xp(p_kind text, p_ref text)
returns table (gained int, total int)
language sql security definer set search_path = public as $$
  select * from public.award_xp('music-theory', p_kind, p_ref);
$$;
revoke execute on function public.award_xp(text, text) from public, anon;
grant execute on function public.award_xp(text, text) to authenticated;

-- Teacher feedback gives XP in the course the work belongs to.
create or replace function private.xp_for_marking() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  c text := case when exists (select 1 from public.courses where id = new.course_id) then new.course_id else 'music-theory' end;
begin
  if new.status = 'marked' then
    insert into public.xp_events (user_id, course_id, kind, ref, xp)
    values (new.student_id, c, 'marked', new.id::text, private.marked_xp(new.scores))
    on conflict (user_id, course_id, kind, ref) do update set xp = excluded.xp;
  end if;
  return new;
end;
$$;

-- ---------- Leaderboard per course: students enrolled in that course ----------
create or replace function public.leaderboard(p_course text)
returns table (student_id uuid, name text, xp int, week_xp int, last_active timestamptz, is_me boolean, listed boolean)
language sql stable security definer set search_path = public as $$
  select
    case when public.is_teacher() or p.id = auth.uid() then p.id end,
    p.full_name,
    coalesce(sum(e.xp), 0)::int,
    coalesce(sum(e.xp) filter (where e.created_at > now() - interval '7 days'), 0)::int,
    case when public.is_teacher() or p.id = auth.uid() then max(e.created_at) filter (where e.kind <> 'marked') end,
    p.id = auth.uid(),
    p.show_on_leaderboard
  from public.profiles p
  join public.enrolments en on en.user_id = p.id and en.course_id = p_course
  left join public.xp_events e on e.user_id = p.id and e.course_id = p_course
  where auth.uid() is not null
    and p.role = 'student'
    and (p.show_on_leaderboard or p.id = auth.uid() or public.is_teacher())
  group by p.id
  order by 3 desc, 2;
$$;
revoke execute on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;

create or replace function public.leaderboard()
returns table (student_id uuid, name text, xp int, week_xp int, last_active timestamptz, is_me boolean, listed boolean)
language sql stable security definer set search_path = public as $$
  select * from public.leaderboard('music-theory');
$$;
revoke execute on function public.leaderboard() from public, anon;
grant execute on function public.leaderboard() to authenticated;

-- ---------- Your recording class code ----------
-- Pick a code for the recording class and put it here (keep the quotes), then run this file.
-- Codes are unique across courses: a student's code decides which course they join.
-- insert into private.course_codes (code, course_id) values ('YOUR-RECORDING-CODE', 'recording') on conflict (code) do nothing;
