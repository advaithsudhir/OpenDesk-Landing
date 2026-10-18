-- Opendesk: area-based dosing on Log a Treatment.
-- Adds a face-region breakdown as an alternative to typing a single dosed
-- number — click a region, pick a product and a quantity, add as many as
-- needed. Deduction still happens batch-by-batch in treatment_log_items,
-- exactly like everything else; treatment_log_areas is a pure audit/display
-- record of what was entered per region, independent of how many batches a
-- quantity happened to be split across.
--
-- No patient data: this only ever ties to a treatment_log row, which already
-- carries no patient name or ID.

create table public.treatment_log_areas (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  treatment_log_id uuid not null,
  area text not null check (area in (
    'forehead', 'glabella', 'crows_feet_left', 'crows_feet_right',
    'cheek_left', 'cheek_right', 'nasolabial_folds', 'lips', 'chin',
    'jawline_left', 'jawline_right'
  )),
  product_id uuid not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  foreign key (treatment_log_id, clinic_id) references public.treatment_logs (id, clinic_id) on delete cascade,
  foreign key (product_id, clinic_id) references public.products (id, clinic_id)
);

alter table public.treatment_log_areas enable row level security;

create policy "Users can view own clinic treatment log areas"
  on public.treatment_log_areas for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic treatment log areas"
  on public.treatment_log_areas for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic treatment log areas"
  on public.treatment_log_areas for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic treatment log areas"
  on public.treatment_log_areas for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

-- log_treatment gains a trailing p_areas jsonb parameter. The signature
-- changes (new trailing param), so this drops and recreates rather than
-- create-or-replace, matching the convention used for the samples feature.
drop function if exists public.log_treatment(uuid, uuid, uuid, numeric, numeric, jsonb);

create function public.log_treatment(
  p_clinic_id uuid,
  p_procedure_id uuid,
  p_clinician_id uuid,
  p_units_drawn numeric default null,
  p_units_billed numeric default null,
  p_samples jsonb default null, -- [{ "product_id": uuid, "quantity": numeric }, ...] or null/[]
  p_areas jsonb default null -- [{ "area": text, "product_id": uuid, "quantity": numeric }, ...] or null/[]
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
  v_sample record;
  v_area record;
begin
  select clinic_id into v_caller_clinic_id from public.profiles where id = auth.uid();
  if v_caller_clinic_id is null or v_caller_clinic_id != p_clinic_id then
    raise exception 'Not authorized for this clinic';
  end if;

  insert into public.treatment_logs (clinic_id, procedure_id, clinician_id, units_drawn, units_billed)
  values (p_clinic_id, p_procedure_id, p_clinician_id, p_units_drawn, p_units_billed)
  returning id into v_log_id;

  -- Procedure recipe lines (unchanged from before this migration).
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

      insert into public.treatment_log_items (treatment_log_id, clinic_id, product_id, batch_id, quantity_deducted, is_sample)
      values (v_log_id, p_clinic_id, v_line.product_id, v_batch.id, v_take, false);

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      select name into v_product_name from public.products where id = v_line.product_id and clinic_id = p_clinic_id;
      raise exception 'Not enough stock of % to log this treatment (short by %).', coalesce(v_product_name, 'product'), v_remaining;
    end if;
  end loop;

  -- Sample lines (unchanged from before this migration).
  if p_samples is not null and jsonb_array_length(p_samples) > 0 then
    for v_sample in
      select
        (s ->> 'product_id')::uuid as product_id,
        (s ->> 'quantity')::numeric as quantity
      from jsonb_array_elements(p_samples) as s
    loop
      v_remaining := v_sample.quantity;

      for v_batch in
        select id, quantity
        from public.stock_batches
        where product_id = v_sample.product_id
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

        insert into public.treatment_log_items (treatment_log_id, clinic_id, product_id, batch_id, quantity_deducted, is_sample)
        values (v_log_id, p_clinic_id, v_sample.product_id, v_batch.id, v_take, true);

        v_remaining := v_remaining - v_take;
      end loop;

      if v_remaining > 0 then
        select name into v_product_name from public.products where id = v_sample.product_id and clinic_id = p_clinic_id;
        raise exception 'Not enough stock of % to give as a sample (short by %).', coalesce(v_product_name, 'product'), v_remaining;
      end if;
    end loop;
  end if;

  -- Area entries from the face diagram — same FEFO deduction as samples
  -- (is_sample = false: this is real procedure cost, not a giveaway), plus
  -- one treatment_log_areas row per entry purely for the area breakdown.
  if p_areas is not null and jsonb_array_length(p_areas) > 0 then
    for v_area in
      select
        (a ->> 'area') as area,
        (a ->> 'product_id')::uuid as product_id,
        (a ->> 'quantity')::numeric as quantity
      from jsonb_array_elements(p_areas) as a
    loop
      v_remaining := v_area.quantity;

      for v_batch in
        select id, quantity
        from public.stock_batches
        where product_id = v_area.product_id
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

        insert into public.treatment_log_items (treatment_log_id, clinic_id, product_id, batch_id, quantity_deducted, is_sample)
        values (v_log_id, p_clinic_id, v_area.product_id, v_batch.id, v_take, false);

        v_remaining := v_remaining - v_take;
      end loop;

      if v_remaining > 0 then
        select name into v_product_name from public.products where id = v_area.product_id and clinic_id = p_clinic_id;
        raise exception 'Not enough stock of % for the % area (short by %).', coalesce(v_product_name, 'product'), v_area.area, v_remaining;
      end if;

      insert into public.treatment_log_areas (treatment_log_id, clinic_id, area, product_id, quantity)
      values (v_log_id, p_clinic_id, v_area.area, v_area.product_id, v_area.quantity);
    end loop;
  end if;

  return v_log_id;
end;
$$;

grant execute on function public.log_treatment(uuid, uuid, uuid, numeric, numeric, jsonb, jsonb) to authenticated;
