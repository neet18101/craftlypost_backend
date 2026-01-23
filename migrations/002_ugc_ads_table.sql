-- UGC Ads Table Migration
-- Stores UGC ad content generated via Gemini API

-- ============================================
-- UGC ADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ugc_ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Product Information
    product_name VARCHAR(200) NOT NULL,
    product_description TEXT NOT NULL,
    target_audience TEXT,
    
    -- Ad Configuration
    ad_type VARCHAR(50) NOT NULL, -- testimonial, before-after, unboxing, lifestyle, product-showcase, user-story
    image_format VARCHAR(50) NOT NULL, -- square, portrait, story, landscape
    visual_style VARCHAR(50) NOT NULL, -- authentic, minimal, vibrant, professional
    mood VARCHAR(50) NOT NULL, -- happy, inspiring, trustworthy, exciting
    additional_details TEXT,
    
    -- Generated Content
    image_prompt TEXT NOT NULL,
    caption TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    cta TEXT NOT NULL,
    
    -- Stats & Metadata
    estimated_reach VARCHAR(50),
    engagement_rate VARCHAR(50),
    recommended_budget VARCHAR(50),
    best_time_to_post VARCHAR(100),
    
    -- Product Images (URLs or base64)
    product_image_url TEXT,
    model_image_url TEXT,
    
   -- Tracking
    is_favorite BOOLEAN DEFAULT FALSE,
    credits_used INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ugc_ads_user_id ON ugc_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_ads_created_at ON ugc_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_ads_ad_type ON ugc_ads(ad_type);
CREATE INDEX IF NOT EXISTS idx_ugc_ads_is_favorite ON ugc_ads(is_favorite) WHERE is_favorite = TRUE;

-- Enable Row Level Security
ALTER TABLE ugc_ads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (if any)
DROP POLICY IF EXISTS "Users can view own UGC ads" ON ugc_ads;
DROP POLICY IF EXISTS "Users can insert own UGC ads" ON ugc_ads;
DROP POLICY IF EXISTS "Users can update own UGC ads" ON ugc_ads;
DROP POLICY IF EXISTS "Users can delete own UGC ads" ON ugc_ads;

-- Policies for authenticated users
CREATE POLICY "Users can view own UGC ads" ON ugc_ads
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own UGC ads" ON ugc_ads
    FOR INSERT WITH CHECK (true);  -- Allow all inserts (for testing/anonymous use)

CREATE POLICY "Users can update own UGC ads" ON ugc_ads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own UGC ads" ON ugc_ads
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updating updated_at timestamp
DROP TRIGGER IF EXISTS update_ugc_ads_updated_at ON ugc_ads;

CREATE TRIGGER update_ugc_ads_updated_at
    BEFORE UPDATE ON ugc_ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'UGC Ads table created successfully!' AS status;
