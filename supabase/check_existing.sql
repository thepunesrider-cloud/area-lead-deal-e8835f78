-- Check what tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check what types exist
SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check what functions exist
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- Check what triggers exist
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
