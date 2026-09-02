-- Opendesk: unified product catalog + batch-based stock/consumables tracking.
-- Replaces stock_items and consumables, which each stored a free-text
-- product_name with no shared catalog. Run once in the Supabase SQL Editor.
-- Creates the new tables AND migrates every existing row into them, then
-- drops the old tables.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  category text not null check (category in ('Injectable', 'Skincare', 'Consumable', 'Device', 'Other')),
  unit text not null default 'units',
  cost_per_unit numeric(10, 2),
  default_supplier text,
  reorder_level integer not null default 0,
  is_s4 boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, clinic_id)
);

create unique index products_clinic_name_unique
  on public.products (clinic_id, lower(name));

alter table public.products enable row level security;

create policy "Users can view own clinic products"
  on public.products for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic products"
  on public.products for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic products"
  on public.products for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic products"
  on public.products for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create table public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  product_id uuid not null,
  batch_number text,
  expiry_date date,
  quantity integer not null default 0,
  unit_cost numeric(10, 2),
  created_at timestamptz not null default now(),
  foreign key (product_id, clinic_id) references public.products (id, clinic_id) on delete cascade
);

alter table public.stock_batches enable row level security;

create policy "Users can view own clinic stock batches"
  on public.stock_batches for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic stock batches"
  on public.stock_batches for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic stock batches"
  on public.stock_batches for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic stock batches"
  on public.stock_batches for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

-- Migrate stock_items -> products (category Injectable) + stock_batches
insert into public.products (clinic_id, name, category, unit, cost_per_unit, default_supplier, reorder_level, is_s4)
select distinct on (clinic_id, lower(product_name))
  clinic_id, product_name, 'Injectable', unit, unit_cost, supplier, reorder_level, false
from public.stock_items
order by clinic_id, lower(product_name), created_at desc;

insert into public.stock_batches (clinic_id, product_id, batch_number, expiry_date, quantity, unit_cost, created_at)
select si.clinic_id, p.id, si.batch, si.expiry_date, si.quantity, si.unit_cost, si.created_at
from public.stock_items si
join public.products p
  on p.clinic_id = si.clinic_id and lower(p.name) = lower(si.product_name);

-- Migrate consumables -> products (category Consumable) + stock_batches
insert into public.products (clinic_id, name, category, unit, cost_per_unit, default_supplier, reorder_level, is_s4)
select distinct on (clinic_id, lower(product_name))
  clinic_id, product_name, 'Consumable', unit, null, supplier, min_level, false
from public.consumables
order by clinic_id, lower(product_name), created_at desc
on conflict (clinic_id, lower(name)) do nothing;

insert into public.stock_batches (clinic_id, product_id, batch_number, expiry_date, quantity, unit_cost, created_at)
select c.clinic_id, p.id, null, null, c.quantity, null, c.created_at
from public.consumables c
join public.products p
  on p.clinic_id = c.clinic_id and lower(p.name) = lower(c.product_name);

-- Optional: mark known Schedule 4 products (no edit-product screen exists
-- yet, so this is the easiest way to fix is_s4 on migrated rows).
-- update public.products set is_s4 = true
--   where lower(name) like '%botox%' or lower(name) like '%neuromodulator%';

drop table public.stock_items;
drop table public.consumables;
