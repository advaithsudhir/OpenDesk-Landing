-- Opendesk: edit an existing procedure's name, price, and recipe.
-- Mirrors create_procedure_with_supplies but replaces the supply lines
-- atomically (delete then re-insert) rather than only adding to them, so
-- removing or changing a line works the same as adding one.

create function public.update_procedure_with_supplies(
  p_clinic_id uuid,
  p_procedure_id uuid,
  p_name text,
  p_price numeric,
  p_lines jsonb -- [{ "product_id": uuid, "quantity": numeric, "is_dosed": boolean }, ...] or [] / null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_caller_clinic_id uuid;
begin
  select clinic_id into v_caller_clinic_id from public.profiles where id = auth.uid();
  if v_caller_clinic_id is null or v_caller_clinic_id != p_clinic_id then
    raise exception 'Not authorized for this clinic';
  end if;

  update public.procedures
  set name = p_name, price = p_price
  where id = p_procedure_id and clinic_id = p_clinic_id;

  if not found then
    raise exception 'Procedure not found';
  end if;

  delete from public.procedure_supplies
  where procedure_id = p_procedure_id and clinic_id = p_clinic_id;

  if p_lines is not null and jsonb_array_length(p_lines) > 0 then
    insert into public.procedure_supplies (clinic_id, procedure_id, product_id, quantity, is_dosed)
    select
      p_clinic_id,
      p_procedure_id,
      (line ->> 'product_id')::uuid,
      (line ->> 'quantity')::numeric,
      coalesce((line ->> 'is_dosed')::boolean, false)
    from jsonb_array_elements(p_lines) as line;
  end if;
end;
$$;

grant execute on function public.update_procedure_with_supplies(uuid, uuid, text, numeric, jsonb) to authenticated;
