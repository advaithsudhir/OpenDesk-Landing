-- Opendesk: visits, step 2 of 2.
-- Run only AFTER the visits version of the app is deployed. Migrates anything
-- the old app logged between step 1 and the deploy, then removes the
-- single-procedure path.

begin;

-- Same backfill as visits.sql, for logs created since then.
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

-- Everything now belongs to a visit.
alter table public.treatment_logs alter column visit_id set not null;
alter table public.treatment_log_items alter column visit_id set not null;

-- The single-procedure path is gone; visit_lines replaces the area table.
drop function if exists public.log_treatment(uuid, uuid, uuid, numeric, numeric, jsonb, jsonb);
drop table public.treatment_log_areas;

commit;
