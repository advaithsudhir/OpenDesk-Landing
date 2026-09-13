-- Opendesk: track brand separately from product name (e.g. "RHA 2" with
-- brand "Teoxane"), so the same product type across manufacturers/lines can
-- be grouped or filtered later. Optional — many products (generic
-- consumables, or products that already are the brand name, like Botox)
-- won't set one.

alter table public.products add column brand text;
