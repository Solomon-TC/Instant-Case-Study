-- Enable Row-Level Security on case_studies table
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only read their own case studies
DROP POLICY IF EXISTS "Users can view own case studies" ON case_studies;
CREATE POLICY "Users can view own case studies"
ON case_studies FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can only insert case studies with their own user_id
DROP POLICY IF EXISTS "Users can insert own case studies" ON case_studies;
CREATE POLICY "Users can insert own case studies"
ON case_studies FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can only update their own case studies
DROP POLICY IF EXISTS "Users can update own case studies" ON case_studies;
CREATE POLICY "Users can update own case studies"
ON case_studies FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can only delete their own case studies
DROP POLICY IF EXISTS "Users can delete own case studies" ON case_studies;
CREATE POLICY "Users can delete own case studies"
ON case_studies FOR DELETE
USING (auth.uid() = user_id);