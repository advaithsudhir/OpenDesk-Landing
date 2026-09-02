-- Opendesk: treatment logging + FEFO stock deduction + audit trail.

-- stock_batches predates this file and is missing the composite-FK anchor
-- that treatment_log_items needs, and its quantity column needs to support
-- fractional/dosed amounts (e.g. "50 units" drawn from a vial). Both
-- changes are additive/lossless.
alter table public.stock_batches
  add constraint stock_batches_id_clinic_id_unique unique (id, clinic_id);

alter table public.stock_batches
  alter column quantity type numeric(10, 2);

create table public.treatment_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  procedure_id uuid not null,
  clinician_id uuid not null,
  units_drawn numeric(10, 2),
  units_billed numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (id, clinic_id),
  foreign key (procedure_id, clinic_id) references public.procedures (id, clinic_id),
  foreign key (clinician_id, clinic_id) references public.staff (id, clinic_id)
);

alter table public.treatment_logs enable row level security;

create policy "Users can view own clinic treatment logs"
  on public.treatment_logs for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic treatment logs"
  on public.treatment_logs for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic treatment logs"
  on public.treatment_logs for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic treatment logs"
  on public.treatment_logs for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create table public.treatment_log_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  treatment_log_id uuid not null,
  product_id uuid not null,
  batch_id uuid not null,
  quantity_deducted numeric(10, 2) not null check (quantity_deducted > 0),
  created_at timestamptz not null default now(),
  foreign key (treatment_log_id, clinic_id) references public.treatment_logs (id, clinic_id) on delete cascade,
  foreign key (product_id, clinic_id) references public.products (id, clinic_id),
  foreign key (batch_id, clinic_id) references public.stock_batches (id, clinic_id)
);

alter table public.treatment_log_items enable row level security;

create policy "Users can view own clinic treatment log items"
  on public.treatment_log_items for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic treatment log items"
  on public.treatment_log_items for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic treatment log items"
  on public.treatment_log_items for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic treatment log items"
  on public.treatment_log_items for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

-- Atomic: insert the log row, then walk every recipe line for the
-- procedure, deducting FEFO (expiry_date asc, nulls last) across as many
-- batches as needed, recording each deduction. `for update` locks each
-- batch row as it's read so two concurrent treatment logs against the
-- same batch serialize instead of racing to negative stock. Any
-- shortfall raises an exception, which aborts the whole transaction —
-- including the treatment_logs insert and any deductions already made
-- for earlier lines in this same call.
create function public.log_treatment(
  p_clinic_id uuid,
  p_procedure_id uuid,
  p_clinician_id uuid,
  p_units_drawn numeric default null,
  p_units_billed numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_caller_clinic_id uuid;
  v_log_id uuid;
  v_line record;
  v_batch record;
  v_needed numeric;
  v_remaining numeric;
  v_take numeric;
  v_product_name text;
begin
  select clinic_id into v_caller_clinic_id from public.profiles where id = auth.uid();
  if v_caller_clinic_id is null or v_caller_clinic_id != p_clinic_id then
    raise exception 'Not authorized for this clinic';
  end if;

  insert into public.treatment_logs (clinic_id, procedure_id, clinician_id, units_drawn, units_billed)
  values (p_clinic_id, p_procedure_id, p_clinician_id, p_units_drawn, p_units_billed)
  returning id into v_log_id;

  for v_line in
    select product_id, quantity, is_dosed
    from public.procedure_supplies
    where procedure_id = p_procedure_id and clinic_id = p_clinic_id
  loop
    v_needed := case when v_line.is_dosed then coalesce(p_units_drawn, v_line.quantity) else v_line.quantity end;
    v_remaining := v_needed;

    for v_batch in
      select id, quantity
      from public.stock_batches
      where product_id = v_line.product_id
        and clinic_id = p_clinic_id
        and quantity > 0
      order by expiry_date asc nulls last, created_at asc
      for update
    loop
      exit when v_remaining <= 0;
      v_take := least(v_batch.quantity, v_remaining);

      update public.stock_batches
      set quantity = quantity - v_take
      where id = v_batch.id;

      insert into public.treatment_log_items (treatment_log_id, clinic_id, product_id, batch_id, quantity_deducted)
      values (v_log_id, p_clinic_id, v_line.product_id, v_batch.id, v_take);

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      select name into v_product_name from public.products where id = v_line.product_id and clinic_id = p_clinic_id;
      raise exception 'Not enough stock of % to log this treatment (short by %).', coalesce(v_product_name, 'product'), v_remaining;
    end if;
  end loop;

  return v_log_id;
end;
$$;

grant execute on function public.log_treatment(uuid, uuid, uuid, numeric, numeric) to authenticated;
