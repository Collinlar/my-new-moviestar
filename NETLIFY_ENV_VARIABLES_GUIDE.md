# How to Add Environment Variables to Netlify

## Step-by-Step Guide with Screenshots

### Step 1: Log into Netlify
1. Go to: https://app.netlify.com/
2. Sign in with your account

### Step 2: Select Your Site
1. You'll see your dashboard with all your sites
2. Find and click on **"african-reel-reviews"** (or whatever your site is named)

### Step 3: Go to Site Settings
1. Once you're on your site's dashboard, look for the top navigation
2. Click on **"Site settings"** (or **"Site configuration"** in newer UI)

### Step 4: Navigate to Environment Variables
1. In the left sidebar, look for **"Environment variables"**
2. Click on it
   - Alternatively, you might see: **"Build & deploy"** → **"Environment"** → **"Environment variables"**

### Step 5: Add New Variable
1. Click the **"Add a variable"** button (or **"Add environment variable"**)
2. You'll see a form with two fields:
   - **Key** (or **Variable name**)
   - **Value**

### Step 6: Enter Your IndexNow Key
Fill in the form:

**Key (Variable name):**
```
INDEXNOW_KEY
```

**Value:**
```
avxpJfNF2nRlcPmT6IBr87Q9OdwjKbXU
```

**Scopes:**
- Make sure **"All deployments"** is selected (usually the default)
- OR select all environments: Production, Deploy Previews, Branch deploys

### Step 7: Save the Variable
1. Click **"Create variable"** or **"Save"**
2. You should see your new variable in the list: `INDEXNOW_KEY`

### Step 8: Optional - Add Other Variables (Recommended)

While you're here, you can also add these (though they have fallbacks in the code):

**Variable 2:**
- **Key**: `BASE_URL`
- **Value**: `https://muviestars.com`

**Variable 3:**
- **Key**: `SUPABASE_URL`
- **Value**: `https://anjavnuqkkmpsnjmopou.supabase.co`

**Variable 4:**
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuamF2bnVxa2ttcHNuam1vcG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDcyMTUsImV4cCI6MjA3MDkyMzIxNX0.FO0Wj6MQoCA8-CVj172TgW37qi2xxebV0Xt16P-2scM`

### Step 9: Verify
After adding the variable:
1. You should see it listed under Environment variables
2. The value will be hidden/masked for security (showing as `•••••••••`)
3. You can click to reveal or edit it if needed

## 🎯 What It Looks Like

### Modern Netlify UI (2024-2025):
```
Site overview
├── Site configuration (or Site settings)
    ├── General
    ├── Domain management
    ├── Environment variables  ← Click here
    ├── Build & deploy
    └── ...
```

### In Environment Variables Section:
```
┌─────────────────────────────────────────┐
│  Environment variables                   │
│  ┌─────────────────────────────────┐   │
│  │ [+ Add a variable]              │   │
│  └─────────────────────────────────┘   │
│                                          │
│  Production variables:                   │
│  • INDEXNOW_KEY = •••••••••••••         │
│  • BASE_URL = https://muviestars.com    │
│  • SUPABASE_URL = https://anjavnu...    │
│  • SUPABASE_ANON_KEY = •••••••••••      │
└─────────────────────────────────────────┘
```

## 🔄 After Adding Variables

**No redeployment needed!** 

Actually, yes it is needed. When you:
1. Push your code changes (`git push`)
2. Netlify will automatically rebuild and deploy
3. The new environment variables will be available to your functions

## ✅ Confirmation

After deployment, check your Netlify function logs:
1. Go to: **Site overview** → **Functions**
2. Click on **"notify-search-engines"**
3. If you see logs with successful notifications, it's working!

## 🆘 Troubleshooting

### Can't find Environment Variables?
- Try: **Site settings** → **Build & deploy** → **Environment**
- Or search for "environment" in the settings search bar

### Variable not working?
- Make sure the key name is exactly: `INDEXNOW_KEY` (case-sensitive)
- Make sure you saved it
- Redeploy your site if it was already deployed

### Still stuck?
- Netlify UI changes occasionally
- Search for "Netlify environment variables" in their docs
- Or look for "Environment" in your site settings sidebar

---

## Quick Reference

**Your IndexNow Key:**
```
avxpJfNF2nRlcPmT6IBr87Q9OdwjKbXU
```

**Variable to add:**
- Key: `INDEXNOW_KEY`
- Value: `avxpJfNF2nRlcPmT6IBr87Q9OdwjKbXU`

**Path in Netlify:**
Dashboard → Your Site → Site Settings → Environment Variables → Add Variable

