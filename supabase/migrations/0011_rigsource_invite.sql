-- Tracks whether an admin has shared the RigSource invite link with a user
-- (RigSource is a separate app; there's no cross-app account provisioning
-- here, just a record of who's been pointed at it).
alter table profiles add column if not exists rigsource_invited_at timestamptz;
