-- Opendesk: log a whole visit (one clinician, one date, many lines).
--
-- Step 1 of 2. Additive only: the currently deployed app keeps working
-- against this schema (old log_treatment() and treatment_log_areas are left
-- in place). Run supabase/visits_cleanup.sql right after the new app is
-- deployed.
--
--   visits ── visit_lines           what the clinician entered
--          ├─ treatment_logs        one per distinct procedure in the visit
--          └─ treatment_log_items   batch-by-batch FEFO deductions
--
-- No patient data anywhere: a visit is a clinician, a date and stock lines.

begin;

-- 1. Visits ------------------------------------------------------------------

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  clinician_id uuid not null,
  visit_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (id, clinic_id),
  foreign key (clinician_id, clinic_id) references public.staff (id, clinic_id)
);

alter table public.visits enable row level security;

create policy "Users can view own clinic visits"
  on public.visits for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic visits"
  on public.visits for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic visits"
  on public.visits for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic visits"
  on public.visits for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

-- 2. Visit lines -------------------------------------------------------------
-- Keep the area list in sync with lib/faceAreas.ts.

create table public.visit_lines (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  visit_id uuid not null,
  procedure_id uuid,
  product_id uuid,
  area text check (area in (
    'forehead', 'glabella', 'crows_feet_left', 'crows_feet_right',
    'cheek_left', 'cheek_right', 'nasolabial_folds', 'lips', 'chin',
    'jawline_left', 'jawline_right'
  )),
  quantity numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (id, clinic_id),
  check (procedure_id is not null or product_id is not null),
  check ((product_id is null and quantity is null) or (product_id is not null and quantity > 0)),
  foreign key (visit_id, clinic_id) references public.visits (id, clinic_id) on delete cascade,
  foreign key (procedure_id, clinic_id) references public.procedures (id, clinic_id),
  foreign key (product_id, clinic_id) references public.products (id, clinic_id)
);

alter table public.visit_lines enable row level security;

create policy "Users can view own clinic visit lines"
  on public.visit_lines for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic visit lines"
  on public.visit_lines for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic visit lines"
  on public.visit_lines for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic visit lines"
  on public.visit_lines for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

-- 3. Hang the existing tables off a visit -------------------------------------
-- Nullable for now so the deployed app keeps working; visits_cleanup.sql
-- makes visit_id NOT NULL once everything has one.

alter table public.treatment_logs add column visit_id uuid;
alter table public.treatment_logs
  add constraint treatment_logs_visit_fk
  foreign key (visit_id, clinic_id) references public.visits (id, clinic_id);
create unique index treatment_logs_visit_procedure_unique
  on public.treatment_logs (visit_id, procedure_id);

alter table public.treatment_log_items add column visit_id uuid;
alter table public.treatment_log_items add column visit_line_id uuid;
alter table public.treatment_log_items
  add constraint treatment_log_items_visit_fk
  foreign key (visit_id, clinic_id) references public.visits (id, clinic_id);
alter table public.treatment_log_items
  add constraint treatment_log_items_visit_line_fk
  foreign key (visit_line_id, clinic_id) references public.visit_lines (id, clinic_id);
-- A product-only line or a sample has no procedure, so no treatment_log.
alter table public.treatment_log_items alter column treatment_log_id drop not null;

-- 4. Backfill: every existing log becomes a one-procedure visit --------------
-- visit.id = the log's own id, so the mapping needs no lookup table.
-- visit_date is the log's original UTC date — the same boundary Treatment
-- margin's month filter already used, so no past month's figures move.
-- Order matters: the final update is what marks a log as migrated.
-- (Repeated verbatim in visits_cleanup.sql for anything logged in between.)

insert into public.visits (id, clinic_id, clinician_id, visit_date, created_at)
select tl.id, tl.clinic_id, tl.clinician_id, (tl.created_at at time zone 'UTC')::date, tl.created_at
from public.treatment_logs tl
where tl.visit_id is null
on conflict (id) do nothing;

insert into public.visit_lines (clinic_id, visit_id, procedure_id, product_id, area, quantity, created_at)
select a.clinic_id, tl.id, tl.procedure_id, a.product_id, a.area, a.quantity, a.created_at
from public.treatment_log_areas a
join public.treatment_logs tl on tl.id = a.treatment_log_id
where tl.visit_id is null;

insert into public.visit_lines (clinic_id, visit_id, procedure_id, created_at)
select tl.clinic_id, tl.id, tl.procedure_id, tl.created_at
from public.treatment_logs tl
where tl.visit_id is null
  and not exists (select 1 from public.treatment_log_areas a where a.treatment_log_id = tl.id);

update public.treatment_log_items i
set visit_id = tl.id
from public.treatment_logs tl
where i.treatment_log_id = tl.id
  and tl.visit_id is null
  and i.visit_id is null;

update public.treatment_logs set visit_id = id where visit_id is null;

-- 5. One shared FEFO deduction ------------------------------------------------
-- Oldest expiry first, batch rows locked as read; a shortfall raises, which
-- aborts the caller's whole transaction.

create function public.deduct_fefo(
  p_clinic_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_visit_id uuid,
  p_treatment_log_id uuid,
  p_visit_line_id uuid,
  p_is_sample boolean,
  p_context text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch record;
  v_remaining numeric := p_quantity;
  v_take numeric;
  v_product_name text;
begin
  for v_batch in
    select id, quantity
    from public.stock_batches
    where product_id = p_product_id
      and clinic_id = p_clinic_id
      and quantity > 0
    order by expiry_date asc nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_batch.quantity, v_remaining);

    update public.stock_batches set quantity = quantity - v_take where id = v_batch.id;

    insert into public.treatment_log_items
      (treatment_log_id, clinic_id, product_id, batch_id, quantity_deducted, is_sample, visit_id, visit_line_id)
    values
      (p_treatment_log_id, p_clinic_id, p_product_id, v_batch.id, v_take, p_is_sample, p_visit_id, p_visit_line_id);

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    select name into v_product_name from public.products where id = p_product_id and clinic_id = p_clinic_id;
    raise exception 'Not enough stock of % % (short by %).', coalesce(v_product_name, 'product'), p_context, v_remaining;
  end if;
end;
$$;

revoke execute on function public.deduct_fefo(uuid, uuid, numeric, uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.deduct_fefo(uuid, uuid, numeric, uuid, uuid, uuid, boolean, text) to authenticated;

-- 6. log_visit ----------------------------------------------------------------
-- p_lines:   [{ "procedure_id"?, "product_id"?, "area"?, "quantity"? }, ...]
-- p_billed:  [{ "procedure_id", "units_billed" }, ...]
-- p_samples: [{ "product_id", "quantity" }, ...]
--
-- Rules:
-- * The same procedure on several lines is performed once: one
--   treatment_logs row, its fixed recipe lines deducted once.
-- * If a procedure has product lines, they are the dose — its recipe's dosed
--   line is not also deducted. With none, the dosed line deducts its default.
-- * units_drawn sums only lines using the recipe's dosed product (never adds
--   different products' units together).

create function public.log_visit(
  p_clinic_id uuid,
  p_clinician_id uuid,
  p_visit_date date,
  p_lines jsonb,
  p_billed jsonb default null,
  p_samples jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_caller_clinic_id uuid;
  v_visit_id uuid;
  v_proc record;
  v_proc_name text;
  v_supply record;
  v_line record;
  v_sample record;
  v_log_id uuid;
  v_dosed_product uuid;
  v_dosed_qty numeric;
  v_has_product_lines boolean;
  v_units_drawn numeric;
  v_units_billed numeric;
begin
  select clinic_id into v_caller_clinic_id from public.profiles where id = auth.uid();
  if v_caller_clinic_id is null or v_caller_clinic_id != p_clinic_id then
    raise exception 'Not authorized for this clinic';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one line to the visit.';
  end if;

  insert into public.visits (clinic_id, clinician_id, visit_date)
  values (p_clinic_id, p_clinician_id, coalesce(p_visit_date, current_date))
  returning id into v_visit_id;

  insert into public.visit_lines (clinic_id, visit_id, procedure_id, product_id, area, quantity)
  select
    p_clinic_id,
    v_visit_id,
    nullif(l ->> 'procedure_id', '')::uuid,
    nullif(l ->> 'product_id', '')::uuid,
    nullif(l ->> 'area', ''),
    nullif(l ->> 'quantity', '')::numeric
  from jsonb_array_elements(p_lines) as l;

  -- Procedures.
  for v_proc in
    select distinct procedure_id from public.visit_lines
    where visit_id = v_visit_id and procedure_id is not null
  loop
    select name into v_proc_name from public.procedures
    where id = v_proc.procedure_id and clinic_id = p_clinic_id;

    select product_id, quantity into v_dosed_product, v_dosed_qty
    from public.procedure_supplies
    where procedure_id = v_proc.procedure_id and clinic_id = p_clinic_id and is_dosed
    limit 1;

    select exists (
      select 1 from public.visit_lines
      where visit_id = v_visit_id and procedure_id = v_proc.procedure_id and product_id is not null
    ) into v_has_product_lines;

    if v_dosed_product is null then
      v_units_drawn := null;
    elsif v_has_product_lines then
      select sum(quantity) into v_units_drawn from public.visit_lines
      where visit_id = v_visit_id and procedure_id = v_proc.procedure_id and product_id = v_dosed_product;
    else
      v_units_drawn := v_dosed_qty;
    end if;

    v_units_billed := null;
    if v_units_drawn is not null and p_billed is not null then
      select (b ->> 'units_billed')::numeric into v_units_billed
      from jsonb_array_elements(p_billed) as b
      where (b ->> 'procedure_id')::uuid = v_proc.procedure_id
      limit 1;
    end if;

    insert into public.treatment_logs (clinic_id, procedure_id, clinician_id, units_drawn, units_billed, visit_id)
    values (p_clinic_id, v_proc.procedure_id, p_clinician_id, v_units_drawn, v_units_billed, v_visit_id)
    returning id into v_log_id;

    for v_supply in
      select product_id, quantity, is_dosed from public.procedure_supplies
      where procedure_id = v_proc.procedure_id and clinic_id = p_clinic_id
    loop
      continue when v_supply.is_dosed and v_has_product_lines;
      perform public.deduct_fefo(
        p_clinic_id, v_supply.product_id, v_supply.quantity,
        v_visit_id, v_log_id, null, false,
        'for ' || coalesce(v_proc_name, 'this procedure')
      );
    end loop;

    for v_line in
      select id, product_id, quantity, area from public.visit_lines
      where visit_id = v_visit_id and procedure_id = v_proc.procedure_id and product_id is not null
    loop
      perform public.deduct_fefo(
        p_clinic_id, v_line.product_id, v_line.quantity,
        v_visit_id, v_log_id, v_line.id, false,
        case when v_line.area is not null
          then 'for the ' || replace(v_line.area, '_', ' ') || ' area'
          else 'for ' || coalesce(v_proc_name, 'this procedure') end
      );
    end loop;
  end loop;

  -- Product-only lines.
  for v_line in
    select id, product_id, quantity, area from public.visit_lines
    where visit_id = v_visit_id and procedure_id is null
  loop
    perform public.deduct_fefo(
      p_clinic_id, v_line.product_id, v_line.quantity,
      v_visit_id, null, v_line.id, false,
      case when v_line.area is not null
        then 'for the ' || replace(v_line.area, '_', ' ') || ' area'
        else 'for this visit' end
    );
  end loop;

  -- Samples.
  if p_samples is not null and jsonb_array_length(p_samples) > 0 then
    for v_sample in
      select (s ->> 'product_id')::uuid as product_id, (s ->> 'quantity')::numeric as quantity
      from jsonb_array_elements(p_samples) as s
    loop
      perform public.deduct_fefo(
        p_clinic_id, v_sample.product_id, v_sample.quantity,
        v_visit_id, null, null, true, 'to give as a sample'
      );
    end loop;
  end if;

  return v_visit_id;
end;
$$;

grant execute on function public.log_visit(uuid, uuid, date, jsonb, jsonb, jsonb) to authenticated;

commit;
