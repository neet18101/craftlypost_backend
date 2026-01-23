-- Quick Fix: Disable RLS for Testing
-- Run this in Supabase SQL Editor

-- Option 1: Disable RLS completely (for testing only)
ALTER TABLE content_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_ads DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OR Option 2: Update policies to allow all operations
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own content" ON content_history;
DROP POLICY IF EXISTS "Users can insert own content" ON content_history;
DROP POLICY IF EXISTS "Users can delete own content" ON content_history;

-- Create permissive policies (allow everything for testing)
CREATE POLICY "Allow all selects" ON content_history
    FOR SELECT USING (true);

CREATE POLICY "Allow all inserts" ON content_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all updates" ON content_history
    FOR UPDATE USING (true);

CREATE POLICY "Allow all deletes" ON content_history
    FOR DELETE USING (true);

-- Same for ugc_ads
DROP POLICY IF EXISTS "Users can view own UGC ads" ON ugc_ads;
DROP POLICY IF EXISTS "Users can insert own UGC ads" ON ugc_ads;
DROP POLICY IF EXISTS "Users can update own UGC ads" ON ugc_ads;
DROP POLICY IF EXISTS "Users can delete own UGC ads" ON ugc_ads;

CREATE POLICY "Allow all selects" ON ugc_ads
    FOR SELECT USING (true);

CREATE POLICY "Allow all inserts" ON ugc_ads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all updates" ON ugc_ads
    FOR UPDATE USING (true);

CREATE POLICY "Allow all deletes" ON ugc_ads
    FOR DELETE USING (true);

SELECT 'RLS policies updated! All operations now allowed.' AS status;
