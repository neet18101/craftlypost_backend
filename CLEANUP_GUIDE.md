# Python Files Cleanup Guide

## ✅ Safe to Delete

The following Python files can now be safely removed since the Node.js backend is working:

### Main Files
- `main.py` - Old FastAPI entry point
- `requirements.txt` - Python dependencies

### App Directory (entire folder)
- `app/__init__.py`
- `app/config.py`
- `app/models/__init__.py`
- `app/models/schemas.py`
- `app/routers/__init__.py`
- `app/routers/content.py`
- `app/routers/credits.py`
- `app/routers/dashboard.py`
- `app/routers/generate.py`
- `app/services/__init__.py`
- `app/services/gemini_service.py`
- `app/services/openai_service.py`
- `app/services/supabase_service.py`

### Virtual Environment
- `venv/` - Python virtual environment (entire folder)
- `__pycache__/` - Python cache files

---

## ⚠️ Before You Delete

**IMPORTANT:** Test your Node.js backend first!

1. **Test the health endpoint:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Test content generation from your frontend:**
   - Open your frontend application
   - Try generating a text post
   - Try generating an image post
   - Try generating a UGC ad
   - Check that content saves to history

3. **Verify all features work:**
   - Credits system
   - Dashboard statistics
   - Content history

---

## 🗑️ Cleanup Commands

### Option 1: Delete Everything at Once (Recommended)

```powershell
# Navigate to backend directory
cd e:\2026\craftlypost\backend

# Remove Python files and directories
Remove-Item -Recurse -Force app, venv, __pycache__
Remove-Item main.py, requirements.txt
```

### Option 2: Delete One by One (Safer)

```powershell
# Remove virtual environment (largest)
Remove-Item -Recurse -Force venv

# Remove app directory
Remove-Item -Recurse -Force app

# Remove cache
Remove-Item -Recurse -Force __pycache__

# Remove main files
Remove-Item main.py
Remove-Item requirements.txt
```

### Option 3: Move to Archive First (Safest)

```powershell
# Create archive folder
New-Item -ItemType Directory -Path ../backend-python-archive

# Move Python files to archive
Move-Item app, venv, main.py, requirements.txt ../backend-python-archive/

# If everything works after a few days, delete the archive
```

---

## 📊 Space Savings

Removing these files will free up approximately:
- `venv/` - ~500-800 MB
- `app/` - ~50 KB
- `__pycache__/` - ~10-50 KB
- Other files - ~10 KB

**Total:** ~500-800 MB

---

## ✅ What to Keep

**DO NOT DELETE:**
- `.env` - Environment variables (used by Node.js)
- `.gitignore` - Already updated for Node.js
- `migrations/` - Database migration files
- `node_modules/` - Node.js dependencies
- All `.js` files - Your new Node.js backend

---

## 🎯 After Cleanup

Your backend directory will look like this:

```
backend/
├── server.js                    ✅ Node.js server
├── package.json                 ✅ Dependencies
├── .env                         ✅ Environment (kept)
├── .gitignore                   ✅ Updated
├── config/
│   └── index.js
├── models/
│   └── schemas.js
├── services/
│   ├── openaiService.js
│   ├── geminiService.js
│   └── supabaseService.js
├── routes/
│   ├── content.js
│   ├── credits.js
│   └── dashboard.js
├── middleware/
│   └── errorHandler.js
├── migrations/                  ✅ Kept
│   └── 002_ugc_ads_table.sql
└── node_modules/                ✅ Node.js packages
```

---

## 🚀 Quick Test & Delete Script

```powershell
# 1. Make sure server is running
# (In one terminal, keep this running)
npm start

# 2. In another terminal, test the API
curl http://localhost:8000/health

# 3. If successful (Status 200), proceed with cleanup
cd e:\2026\craftlypost\backend
Remove-Item -Recurse -Force app, venv, __pycache__ -ErrorAction SilentlyContinue
Remove-Item main.py, requirements.txt -ErrorAction SilentlyContinue

# 4. Verify deletion
Get-ChildItem
```

---

## ✅ Recommendation

**I recommend:** Use **Option 3** (Move to Archive) first, then delete the archive after confirming everything works for a day or two. This gives you a safety net in case you need to reference any old code.
