-- The seed script upserts vendors by name to stay idempotent, but vendors.name
-- had no unique constraint for it to conflict on. Add one — it's also a
-- reasonable production rule (no duplicate vendor entries by name).
alter table vendors add constraint vendors_name_key unique (name);
