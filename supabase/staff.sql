-- Opendesk: minimal clinic staff list (names only — not tied to login
-- accounts). Used as the "clinician" picker when logging a treatment.

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (id, clinic_id)
);

create unique index staff_clinic_name_unique
  on public.staff (clinic_id, lower(name));

alter table public.staff enable row level security;

create policy "Users can view own clinic staff"
  on public.staff for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic staff"
  on public.staff for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic staff"
  on public.staff for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic staff"
  on public.staff for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));
