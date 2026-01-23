-- Fix: Make user_id nullable OR create a dummy user
-- Run this in Supabase SQL Editor

-- ============================================
-- OPTION 1: Make user_id nullable (Recommended)
-- ============================================
ALTER TABLE content_history ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE ugc_ads ALTER COLUMN user_id DROP NOT NULL;

SELECT 'user_id is now nullable in content_history and ugc_ads!' AS status;

-- ============================================
-- OPTION 2: Create a dummy test user (Alternative)
-- ============================================
-- First, insert into auth.users (if you want a real user)
-- Note: This requires proper auth setup

-- Use this UUID in your backend code if you choose this option:
-- const userId = 'a0000000-0000-0000-0000-000000000001';

SELECT 'Database updated successfully!' AS status;
