-- Opendesk: real stock tracking, scoped per clinic.
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  product_name text not null,
  supplier text,
  batch text,
  expiry_date date,
  quantity integer not null default 0,
  unit text not null default 'units',
  reorder_level integer not null default 0,
  unit_cost numeric(10, 2),
  created_at timestamptz not null default now()
);

alter table public.stock_items enable row level security;

create policy "Users can view own clinic stock"
  on public.stock_items for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic stock"
  on public.stock_items for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic stock"
  on public.stock_items for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic stock"
  on public.stock_items for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));
