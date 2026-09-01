-- Opendesk: initial auth + clinic schema.
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- 1. Clinics
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- 2. Profiles: one row per auth user, linking them to a clinic once they
--    complete first-time setup. clinic_id stays null until then.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Auto-create a profile row whenever a new auth user is created
--    (i.e. whenever you add someone in Authentication > Users).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Row Level Security: users can only ever see/touch their own profile
--    and the clinic they're linked to.
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- created_by lets a user see the clinic row immediately after creating it
-- (needed because insert...select does an INSERT...RETURNING, which is
-- itself subject to the SELECT policy) — before it's linked via profiles.
create policy "Users can view own clinic"
  on public.clinics for select
  using (
    created_by = auth.uid()
    or id in (select clinic_id from public.profiles where id = auth.uid())
  );

create policy "Authenticated users can create a clinic"
  on public.clinics for insert
  with check (created_by = auth.uid());

create policy "Users can update own clinic"
  on public.clinics for update
  using (id in (select clinic_id from public.profiles where id = auth.uid()));
