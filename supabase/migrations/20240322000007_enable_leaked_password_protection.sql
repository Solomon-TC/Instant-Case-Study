-- Enable leaked password protection in Supabase Auth
-- This will check passwords against HaveIBeenPwned.org database

-- IMPORTANT: Password policies and HaveIBeenPwned integration must be configured
-- through the Supabase Dashboard at:
-- Project Settings > Authentication > Password Policy
--
-- The following settings should be configured in the dashboard:
-- 1. Minimum password length: 6 characters
-- 2. Require letters: enabled
-- 3. Require numbers: enabled
-- 4. Require symbols: disabled (optional)
-- 5. Require uppercase: disabled (optional)
-- 6. Require lowercase: disabled (optional)
-- 7. HaveIBeenPwned breach detection: enabled
--
-- These settings cannot be configured via SQL migrations as they require
-- Supabase's internal configuration system.

-- This migration serves as documentation of the intended password policy
-- No SQL commands are executed as configuration is done through the dashboard
