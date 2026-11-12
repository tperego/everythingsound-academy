-- EverythingSound Academy: two settings only you (the teacher) make. Run in Supabase SQL Editor.
-- Replace the placeholder text first. Don't save your real values in this file.

-- 1) The class code students need to create an account (change it any time; old accounts keep working).
insert into private.settings (key, value) values ('class_code', 'REPLACE-WITH-YOUR-CLASS-CODE')
on conflict (key) do update set value = excluded.value;

-- 2) After you have created your own account on the website (with the class code), make it the teacher account.
update public.profiles set role = 'teacher'
where id = (select id from auth.users where email = 'REPLACE-WITH-YOUR-EMAIL');

-- Check: this should show your name with role = teacher.
select p.full_name, p.role, u.email from public.profiles p join auth.users u on u.id = p.id where p.role = 'teacher';
