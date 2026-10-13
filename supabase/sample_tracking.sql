-- Opendesk: "Samples given" stock tracking on Log a Treatment.
-- Adds a Sample product category, an is_sample marker on the audit trail,
-- and extends log_treatment to deduct sample lines in the same atomic
-- transaction as the treatment's own procedure supplies.

-- 1. New product category.
alter table public.products drop constraint products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('Injectable', 'Skincare', 'Consumable', 'Device', 'Sample', 'Other'));

-- 2. Audit-trail marker so a sample deduction can be told apart from a
--    procedure's own supplies later.
alter table public.treatment_log_items add column is_sample boolean not null default false;

-- 3. log_treatment gains an optional p_samples parameter. The signature
--    changes (new trailing param), so this drops and recreates rather than
--    create-or-replace, to avoid any stale-overload ambiguity.
drop function if exists public.log_treatment(uuid, uuid, uuid, numeric, numeric);

create function public.log_treatment(
  p_clinic_id uuid,
  p_procedure_id uuid,
  p_clinician_id uuid,
  p_units_drawn numeric default null,
  p_units_billed numeric default null,
  p_samples jsonb default null -- [{ "product_id": uuid, "quantity": numeric }, ...] or null/[]
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

  -- Sample lines — same FEFO deduction, marked is_sample = true, same
  -- all-or-nothing transaction (a shortfall here rolls back everything
  -- above too, including the treatment_logs insert).
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

  return v_log_id;
end;
$$;

grant execute on function public.log_treatment(uuid, uuid, uuid, numeric, numeric, jsonb) to authenticated;
