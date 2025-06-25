ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

DROP POLICY IF EXISTS "Users can only see non-deleted users" ON users;
CREATE POLICY "Users can only see non-deleted users"
ON users FOR SELECT
USING (is_deleted = false);
