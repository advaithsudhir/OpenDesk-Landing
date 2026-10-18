-- Opendesk: pack sizes on products.
-- Products are bought in one size (a 100-unit vial, a box of 100 needles)
-- and used in another (units drawn, pieces used). Adds a pack name and the
-- amount per pack so receiving stock and entering cost can happen in packs
-- while everything downstream (deduction, margin, reorder) keeps working in
-- the existing measuring unit, unchanged.
--
-- Defaults to pack_name = 'unit', pack_size = 1 for every existing product,
-- i.e. "1 pack = 1 unit" — identical to today's behaviour until a product is
-- updated by hand with its real pack.

alter table public.products
  add column pack_name text not null default 'unit',
  add column pack_size numeric(10, 2) not null default 1 check (pack_size > 0);
