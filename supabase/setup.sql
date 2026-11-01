-- Run once in the Supabase SQL Editor. Safe to rerun for this schema.
begin;
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  body text not null default '',
  area text not null check (area in ('Innboks', 'Privat', 'Jobb')),
  updated bigint not null,
  revision integer not null default 1
);
alter table public.notes enable row level security;
revoke all on public.notes from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
create index if not exists notes_user_id_idx on public.notes(user_id);
drop policy if exists "Own notes only" on public.notes;
create policy "Own notes only" on public.notes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create or replace function public.advance_note_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end;
$$;
drop trigger if exists advance_note_revision on public.notes;
create trigger advance_note_revision before update on public.notes
  for each row execute function public.advance_note_revision();
commit;
