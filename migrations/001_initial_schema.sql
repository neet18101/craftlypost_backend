-- CraftlyPost Database Schema - Safe to re-run
-- This version won't fail if objects already exist

-- ============================================
-- 1. USER CREDITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    text_credits INTEGER DEFAULT 150 NOT NULL,
    image_credits INTEGER DEFAULT 25 NOT NULL,
    video_credits INTEGER DEFAULT 10 NOT NULL,
    plan VARCHAR(50) DEFAULT 'free' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index (ignore if exists)
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;

CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 2. CONTENT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS content_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    topic TEXT,
    tone VARCHAR(50),
    goal VARCHAR(50),
    caption TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    cta TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_history_user_id ON content_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_history_created_at ON content_history(created_at DESC);

-- Enable RLS
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own content" ON content_history;
DROP POLICY IF EXISTS "Users can insert own content" ON content_history;
DROP POLICY IF EXISTS "Users can delete own content" ON content_history;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON content_history;
DROP POLICY IF EXISTS "Allow all selects" ON content_history;

-- Policies for authenticated users
CREATE POLICY "Users can view own content" ON content_history
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own content" ON content_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own content" ON content_history
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. TRIGGERS (drop first, then create)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;

-- Function: Auto-create credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_credits (user_id, text_credits, image_credits, video_credits, plan)
    VALUES (NEW.id, 150, 25, 10, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see this, the migration ran successfully!
SELECT 'Migration completed successfully! Tables created: user_credits, content_history' AS status;
