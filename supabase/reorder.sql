-- Opendesk: clinic-wide order cycle setting, used by the reorder forecast
-- screen to project usage forward. Existing "Users can update own clinic"
-- RLS policy (schema.sql) already covers writes to this new column.

alter table public.clinics
  add column order_cycle_days integer not null default 30 check (order_cycle_days > 0);
