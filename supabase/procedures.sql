-- Opendesk: procedures (treatments a clinic performs) and the fixed/dosed
-- product recipe each one consumes.

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  price numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (id, clinic_id)
);

create unique index procedures_clinic_name_unique
  on public.procedures (clinic_id, lower(name));

alter table public.procedures enable row level security;

create policy "Users can view own clinic procedures"
  on public.procedures for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic procedures"
  on public.procedures for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic procedures"
  on public.procedures for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic procedures"
  on public.procedures for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create table public.procedure_supplies (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  procedure_id uuid not null,
  product_id uuid not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  is_dosed boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (procedure_id, clinic_id) references public.procedures (id, clinic_id) on delete cascade,
  foreign key (product_id, clinic_id) references public.products (id, clinic_id) on delete cascade
);

-- At most one dosed line per procedure (the app also enforces this in the UI).
create unique index procedure_supplies_one_dosed_per_procedure
  on public.procedure_supplies (procedure_id)
  where is_dosed;

alter table public.procedure_supplies enable row level security;

create policy "Users can view own clinic procedure supplies"
  on public.procedure_supplies for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic procedure supplies"
  on public.procedure_supplies for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic procedure supplies"
  on public.procedure_supplies for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic procedure supplies"
  on public.procedure_supplies for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

-- Atomically create a procedure + its recipe lines in one round trip, so a
-- failed second insert can never leave an orphaned procedure with no
-- supplies. security invoker: runs as the calling user, so the RLS
-- policies above are exactly what authorizes the writes; the explicit
-- clinic check below just fails fast with a clean error.
create function public.create_procedure_with_supplies(
  p_clinic_id uuid,
  p_name text,
  p_price numeric,
  p_lines jsonb -- [{ "product_id": uuid, "quantity": numeric, "is_dosed": boolean }, ...]
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

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one supply line.';
  end if;

  insert into public.procedures (clinic_id, name, price)
  values (p_clinic_id, p_name, p_price)
  returning id into v_procedure_id;

  insert into public.procedure_supplies (clinic_id, procedure_id, product_id, quantity, is_dosed)
  select
    p_clinic_id,
    v_procedure_id,
    (line ->> 'product_id')::uuid,
    (line ->> 'quantity')::numeric,
    coalesce((line ->> 'is_dosed')::boolean, false)
  from jsonb_array_elements(p_lines) as line;

  return v_procedure_id;
end;
$$;

grant execute on function public.create_procedure_with_supplies(uuid, text, numeric, jsonb) to authenticated;
