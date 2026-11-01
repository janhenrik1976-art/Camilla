-- Add task lists and pinned notes without changing existing note contents or access rules.
begin;
alter table public.notes add column if not exists pinned boolean not null default false;
alter table public.notes add column if not exists tasks jsonb not null default '[]'::jsonb;
create or replace function public.valid_note_tasks(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare task jsonb;
begin
  if jsonb_typeof(value) is distinct from 'array' then return false; end if;
  if jsonb_array_length(value) > 200 then return false; end if;
  for task in select jsonb_array_elements(value) loop
    if jsonb_typeof(task) is distinct from 'object'
      or jsonb_typeof(task->'id') is distinct from 'string'
      or jsonb_typeof(task->'text') is distinct from 'string'
      or length(task->>'text') > 500
      or jsonb_typeof(task->'done') is distinct from 'boolean'
    then return false; end if;
  end loop;
  return true;
end;
$$;
alter table public.notes drop constraint if exists notes_tasks_valid;
alter table public.notes add constraint notes_tasks_valid check (public.valid_note_tasks(tasks));
commit;
