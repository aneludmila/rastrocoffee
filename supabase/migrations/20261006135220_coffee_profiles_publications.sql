-- Mutable working profile; immutable sensory data is copied into each new version.
create table if not exists public.coffee_profiles (
 lot_id uuid primary key references public.records(id),
 owner uuid not null references auth.users(id),
 data jsonb not null check(jsonb_typeof(data)='object'),
 updated_at timestamptz not null default now()
);
create table if not exists public.publications (
 version_id uuid primary key references public.records(id),
 owner uuid not null references auth.users(id),
 published_at timestamptz not null default now()
);
alter table public.coffee_profiles enable row level security;
alter table public.publications enable row level security;
revoke all on public.coffee_profiles, public.publications from anon, authenticated;
grant select, insert, update on public.coffee_profiles to service_role;
grant select, insert, delete on public.publications to service_role;
create index if not exists coffee_profiles_owner_idx on public.coffee_profiles(owner);
create index if not exists publications_owner_idx on public.publications(owner);
create or replace function public.guard_coffee_publication() returns trigger language plpgsql set search_path=public as $$
declare r public.records;
begin
 if TG_TABLE_NAME='coffee_profiles' then
   select * into r from public.records where id=new.lot_id;
   if r.id is null or r.kind<>'lot' or r.owner<>new.owner then raise exception 'Invalid lot owner'; end if;
   if TG_OP='UPDATE' and (new.lot_id<>old.lot_id or new.owner<>old.owner) then raise exception 'Immutable identity'; end if;
 else
   select * into r from public.records where id=new.version_id;
   if r.id is null or r.kind<>'version' or r.owner<>new.owner or nullif(r.data->>'signature','') is null or nullif(r.data->>'confirmedAt','') is null then raise exception 'Only confirmed versions can be published'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_coffee_publication() from public, anon, authenticated;
drop trigger if exists coffee_profile_guard on public.coffee_profiles;
create trigger coffee_profile_guard before insert or update on public.coffee_profiles for each row execute function public.guard_coffee_publication();
drop trigger if exists publication_guard on public.publications;
create trigger publication_guard before insert on public.publications for each row execute function public.guard_coffee_publication();
