-- EverythingSound Academy: XP, levels, streaks, badges and the class leaderboard.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run. Safe to run again.
-- Run it after schema.sql and chat.sql.
--
-- How XP works: the website asks for XP with award_xp(kind, ref) and the database decides how much,
-- once per exercise, with daily limits, so a student can't give themselves points from the browser.
-- Teacher feedback gives XP automatically, based on the score (a trigger on submissions).

-- ---------- XP events: one row per thing that earned XP ----------
create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('passed', 'submitted', 'lesson', 'quiz-pass', 'quiz-round', 'quiz-perfect', 'daily', 'marked')),
  ref text not null,
  xp int not null check (xp between 0 and 100),
  day date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table public.xp_events enable row level security;
create index if not exists xp_events_user_idx on public.xp_events (user_id, created_at);

drop policy if exists "xp: read own, teacher reads all" on public.xp_events;
create policy "xp: read own, teacher reads all" on public.xp_events
  for select to authenticated using (user_id = auth.uid() or public.is_teacher());
-- Nobody writes XP directly: only award_xp() and the marking trigger below.
revoke all on public.xp_events from anon, authenticated;
grant select on public.xp_events to authenticated;

-- ---------- Earning XP from the website ----------
create or replace function public.award_xp(p_kind text, p_ref text)
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
  if p_ref is null or p_ref !~ '^[a-z0-9-]{1,60}(/[a-z0-9-]{1,60})?$' then raise exception 'Bad reference'; end if;

  case p_kind
    when 'passed' then base := 20; per_day := 40;           -- an exercise's checks all pass (once per exercise)
    when 'submitted' then base := 30; per_day := 40;        -- an exercise sent to the teacher (once per exercise)
    when 'lesson' then base := 50; per_day := 40;           -- every exercise of a lesson done (once per lesson)
    when 'quiz-perfect' then base := 15; per_day := 40;     -- every answer right in a quick-fire round (once per exercise)
    when 'quiz-pass' then base := 10; per_day := 5; repeatable := true;   -- a quick-fire round passed (5 a day)
    when 'quiz-round' then base := 3; per_day := 10; repeatable := true;  -- a quick-fire round finished (10 a day)
    else raise exception 'Unknown kind';
  end case;

  -- Daily limits: one-off rewards share a limit of 40 a day; practice rounds have their own.
  if repeatable then
    select count(*) into n from public.xp_events where user_id = uid and kind = p_kind and day = today;
    r := p_ref || '@' || today || '#' || (n + 1);
  else
    select count(*) into n from public.xp_events
      where user_id = uid and kind in ('passed', 'submitted', 'lesson', 'quiz-perfect') and day = today;
    r := p_ref;
  end if;

  if n < per_day then
    insert into public.xp_events (user_id, kind, ref, xp) values (uid, p_kind, r, base)
      on conflict (user_id, kind, ref) do nothing;
    get diagnostics ins = row_count;
    if ins > 0 then got := base; end if;
  end if;

  -- First practice of the day: a small bonus (this is also what keeps a streak going).
  insert into public.xp_events (user_id, kind, ref, xp) values (uid, 'daily', today::text, 5)
    on conflict (user_id, kind, ref) do nothing;
  get diagnostics ins = row_count;
  if ins > 0 then got := got + 5; end if;

  return query select got, coalesce((select sum(xp) from public.xp_events where user_id = uid), 0)::int;
end;
$$;
revoke execute on function public.award_xp(text, text) from public, anon;
grant execute on function public.award_xp(text, text) to authenticated;

-- ---------- Teacher feedback gives XP: 10 for being marked, up to 40 more for the score ----------
create or replace function private.marked_xp(scores jsonb) returns int
language sql immutable as $$
  with s as (
    select
      coalesce(sum(case when e ->> 'score' ~ '^[0-9]+(\.[0-9]+)?$' then (e ->> 'score')::numeric end), 0) as got,
      coalesce(sum(case when e ->> 'max' ~ '^[0-9]+(\.[0-9]+)?$' then (e ->> 'max')::numeric end), 0) as tot
    from jsonb_array_elements(case when jsonb_typeof(scores) = 'array' then scores else '[]'::jsonb end) e
    where jsonb_typeof(e) = 'object'
  )
  select 10 + case when tot > 0 then round(40 * least(got / tot, 1))::int else 20 end from s;
$$;

create or replace function private.xp_for_marking() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.status = 'marked' then
    insert into public.xp_events (user_id, kind, ref, xp)
    values (new.student_id, 'marked', new.id::text, private.marked_xp(new.scores))
    on conflict (user_id, kind, ref) do update set xp = excluded.xp;
  end if;
  return new;
end;
$$;
drop trigger if exists submissions_xp on public.submissions;
create trigger submissions_xp after insert or update of status, scores on public.submissions
  for each row execute function private.xp_for_marking();

-- ---------- The leaderboard: students choose whether classmates can see them ----------
alter table public.profiles add column if not exists show_on_leaderboard boolean not null default false;
grant update (full_name, show_on_leaderboard) on public.profiles to authenticated;

-- Students see classmates who opted in, plus themselves. The teacher sees every student, and when they were last active.
create or replace function public.leaderboard()
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
  left join public.xp_events e on e.user_id = p.id
  where auth.uid() is not null
    and p.role = 'student'
    and (p.show_on_leaderboard or p.id = auth.uid() or public.is_teacher())
  group by p.id
  order by 3 desc, 2;
$$;
revoke execute on function public.leaderboard() from public, anon;
grant execute on function public.leaderboard() to authenticated;

-- ---------- Give XP for work done before this existed ----------
insert into public.xp_events (user_id, kind, ref, xp, day, created_at)
select user_id, status, lesson_id || '/' || exercise_id, case status when 'submitted' then 30 else 20 end,
       (updated_at at time zone 'utc')::date, updated_at
from public.progress
where status in ('passed', 'submitted')
on conflict (user_id, kind, ref) do nothing;

insert into public.xp_events (user_id, kind, ref, xp, day, created_at)
select student_id, 'marked', id::text, private.marked_xp(scores),
       (coalesce(marked_at, created_at) at time zone 'utc')::date, coalesce(marked_at, created_at)
from public.submissions
where status = 'marked'
on conflict (user_id, kind, ref) do nothing;
