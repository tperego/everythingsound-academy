-- Everything Sound Academy: the Zen Master challenge (one per course).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run. Safe to run again.
-- Run it after courses.sql.
--
-- What it adds:
--   * award_zen(course): 100 XP, once, for beating the Zen Master of that course (kind 'zen-master').
--     It is its own function, so it never replaces award_xp() and works next to any other changes to it.
--   * XP kinds: instead of a fixed list, any well-formed kind is allowed. Only the database's own
--     functions can write XP (students can't insert rows), so the list was only bookkeeping, and new
--     kinds (this one, or new Recording ones) no longer need the constraint changed each time.

alter table public.xp_events drop constraint if exists xp_events_kind_ok;
alter table public.xp_events add constraint xp_events_kind_ok check (kind ~ '^[a-z][a-z0-9-]{1,30}$');

create or replace function public.award_zen(p_course text)
returns table (gained int, total int)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ins int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.enrolments where user_id = uid and course_id = p_course) then raise exception 'Not enrolled'; end if;
  insert into public.xp_events (user_id, course_id, kind, ref, xp) values (uid, p_course, 'zen-master', 'zen', 100)
    on conflict (user_id, course_id, kind, ref) do nothing;
  get diagnostics ins = row_count;
  return query select case when ins > 0 then 100 else 0 end,
    coalesce((select sum(xp) from public.xp_events where user_id = uid and course_id = p_course), 0)::int;
end;
$$;
revoke execute on function public.award_zen(text) from public, anon;
grant execute on function public.award_zen(text) to authenticated;
