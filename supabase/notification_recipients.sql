-- Opendesk: clinic-wide list of email addresses that receive the weekly
-- expiry/reorder digest. Not tied to staff — a recipient might be a shared
-- inbox (front desk) rather than a named clinician.

create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (id, clinic_id)
);

create unique index notification_recipients_clinic_email_unique
  on public.notification_recipients (clinic_id, lower(email));

alter table public.notification_recipients enable row level security;

create policy "Users can view own clinic notification recipients"
  on public.notification_recipients for select
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can insert own clinic notification recipients"
  on public.notification_recipients for insert
  with check (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can update own clinic notification recipients"
  on public.notification_recipients for update
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));

create policy "Users can delete own clinic notification recipients"
  on public.notification_recipients for delete
  using (clinic_id in (select clinic_id from public.profiles where id = auth.uid()));
