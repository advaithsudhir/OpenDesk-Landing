-- Opendesk: allow a procedure to be saved as a name-only "shell" — no price,
-- no supply lines yet — for clinics defining their treatment list before
-- they have real pricing/stock data to attach. Previously the function
-- hard-rejected an empty p_lines array; now it just skips the supply-line
-- insert when there's nothing to insert. Same signature, so this replaces
-- the existing function in place (no drop/re-grant needed).

create or replace function public.create_procedure_with_supplies(
  p_clinic_id uuid,
  p_name text,
  p_price numeric,
  p_lines jsonb -- [{ "product_id": uuid, "quantity": numeric, "is_dosed": boolean }, ...] or [] / null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_caller_clinic_id uuid;
  v_procedure_id uuid;
begin
  select clinic_id into v_caller_clinic_id from public.profiles where id = auth.uid();
  if v_caller_clinic_id is null or v_caller_clinic_id != p_clinic_id then
    raise exception 'Not authorized for this clinic';
  end if;

  insert into public.procedures (clinic_id, name, price)
  values (p_clinic_id, p_name, p_price)
  returning id into v_procedure_id;

  if p_lines is not null and jsonb_array_length(p_lines) > 0 then
    insert into public.procedure_supplies (clinic_id, procedure_id, product_id, quantity, is_dosed)
    select
      p_clinic_id,
      v_procedure_id,
      (line ->> 'product_id')::uuid,
      (line ->> 'quantity')::numeric,
      coalesce((line ->> 'is_dosed')::boolean, false)
    from jsonb_array_elements(p_lines) as line;
  end if;

  return v_procedure_id;
end;
$$;
