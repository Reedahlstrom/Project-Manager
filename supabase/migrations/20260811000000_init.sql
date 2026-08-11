-- Cadence — initial migration.
--
-- Intentionally empty. Prompt 1 establishes the migration pipeline; prompt 2
-- creates the schema, the RLS policies, the triggers, and the seed data in a
-- single subsequent migration.
--
-- Nothing in this project should ever be created through the Supabase dashboard
-- SQL editor without also landing here. The migration files are the only record
-- of why the database looks the way it does, and the RLS policies in particular
-- need to be reviewable as a diff.

select 1;
