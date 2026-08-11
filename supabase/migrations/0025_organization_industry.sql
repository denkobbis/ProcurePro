-- Lets an organization's sidebar/forms adapt to its line of work (oil & gas,
-- construction, trading, or general/unmapped) instead of always showing the
-- full oil-and-gas feature set. See src/lib/industries.ts for the toggle
-- config this drives.
create type organization_industry as enum ('oil_gas', 'construction', 'trading', 'general');

alter table organizations add column industry organization_industry not null default 'general';

-- Denbis Global Resources' actual business, not a fallback.
update organizations set industry = 'oil_gas' where name = 'Denbis Global Resources';
