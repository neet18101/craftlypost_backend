# 🔧 How to Fix RLS Error

## Problem
```
new row violates row-level security policy for table "content_history"
```

This means Supabase RLS policies are blocking inserts.

---

## 🚀 Quick Fix (Choose One)

### Option 1: Run in Supabase SQL Editor (Recommended)

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Paste this and click **Run**:

```sql
-- Disable RLS for testing
ALTER TABLE content_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_ads DISABLE ROW LEVEL SECURITY;
```

### Option 2: Update RLS Policies

Run this in Supabase SQL Editor:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can insert own content" ON content_history;

-- Create permissive policy
CREATE POLICY "Allow all inserts" ON content_history
    FOR INSERT WITH CHECK (true);
```

### Option 3: Use Supabase Service Role Key

In your `.env` file, use the **service_role** key instead of **anon** key:

```env
# Change from anon key to service_role key
SUPABASE_KEY=your-service-role-key-here
```

**⚠️ Warning:** Service role bypasses RLS. Only for development!

---

## 📝 Steps:

1. **Open Supabase Dashboard:** https://app.supabase.com
2. **Select your project:** craftlypost
3. **Go to SQL Editor** (left sidebar)
4. **Paste Option 1 or 2** (above)
5. **Click RUN**
6. **Try again** from your app

---

## ✅ Verify It Worked

After running the SQL, test in your app:
1. Generate content (text/image/video)
2. Click "Save to History"
3. Should work now! ✓

---

## 🔐 Re-enable RLS Later (Production)

When you're ready for production:

```sql
-- Re-enable RLS
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;

-- Create proper policies with authentication
CREATE POLICY "Authenticated users can insert" ON content_history
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Need Help?

If still not working, check:
- ✓ Migration files run successfully?
- ✓ Using correct Supabase project?
- ✓ API keys correct in `.env`?
