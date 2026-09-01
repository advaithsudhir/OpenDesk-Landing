-- Opendesk: real consumables tracking, scoped per clinic.
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

create table public.consumables (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  product_name text not null,
  supplier text,
  quantity integer not null default 0,
  unit text not null default 'units',
  min_level integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.consumables enable row level security;

create policy "Users can view own clinic consumables"
  on public.consumables for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic consumables"
  on public.consumables for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic consumables"
  on public.consumables for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic consumables"
  on public.consumables for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));
