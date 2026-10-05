-- Execute no SQL Editor de um projeto Supabase novo.
-- O navegador acessa apenas o backend Next.js; não há permissões diretas ao banco.
begin;
create table if not exists public.records (
 id uuid primary key,
 owner uuid not null references auth.users(id),
 kind text not null check (kind in ('producer','property','lot','stage','version','access','document')),
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 created timestamptz not null default now()
);
alter table public.records enable row level security;
revoke all on public.records from anon, authenticated;
grant select, insert, update, delete on public.records to service_role;
create index if not exists records_owner_created on public.records(owner,created,id);
create unique index if not exists access_email_unique on public.records(lower(data->>'email')) where kind='access';
create unique index if not exists lot_code_unique on public.records(owner,lower(data->>'code')) where kind='lot';
create unique index if not exists stage_unique on public.records(owner,(data->>'lotId'),(data->>'type'),(data->>'date')) where kind='stage';
create unique index if not exists version_number_unique on public.records(owner,(data->>'lotId'),(data->>'number')) where kind='version';
create unique index if not exists document_hash_unique on public.records(owner,(data->>'lotId'),(data->>'hash')) where kind='document';

-- Versões e documentos são imutáveis. Somente a primeira confirmação da versão pode ser adicionada.
create or replace function public.guard_record() returns trigger
language plpgsql set search_path = public as $$
begin
 if TG_OP = 'UPDATE' then
  if old.id <> new.id or old.owner <> new.owner or old.kind <> new.kind or old.created <> new.created then
   raise exception 'Identidade do registro imutável';
  end if;
  if old.kind = 'document' and old.data <> new.data then
   raise exception 'Documento imutável';
  end if;
  if old.kind = 'version' then
   if (old.data - array['signature','wallet','confirmedAt']) <> (new.data - array['signature','wallet','confirmedAt'])
     or old.data->>'signature' is not null then
    raise exception 'Versão imutável';
   end if;
   if new.data->>'signature' is null or new.data->>'wallet' is null then
    raise exception 'Confirmação incompleta';
   end if;
  end if;
 end if;
 if TG_OP = 'INSERT' and new.kind = 'document' then
  -- Serializa inserções concorrentes para o mesmo lote.
  perform 1 from public.records where id = (new.data->>'lotId')::uuid and owner = new.owner and kind = 'lot' for update;
  if not found then raise exception 'Lote inválido'; end if;
  if (select count(*) from public.records where owner = new.owner and kind = 'document' and data->>'lotId' = new.data->>'lotId') >= 3 then
   raise exception 'Máximo de três laudos por lote';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists records_guard on public.records;
create trigger records_guard before insert or update on public.records for each row execute function public.guard_record();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('laudos','laudos',false,4194304,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=4194304,allowed_mime_types=array['application/pdf'];
-- Não criar policies que liberem este bucket ao navegador. O backend usa a chave secreta.
commit;
