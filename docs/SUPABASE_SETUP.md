# Guardian Desktop ERP - Supabase Setup Guide

## Overview

This guide will help you set up Supabase as the central cloud database for Guardian Desktop ERP.

## Prerequisites

1. A Supabase account (free tier available at https://supabase.com)
2. Node.js 18+ installed
3. Guardian Desktop ERP codebase

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Organization**: Select or create one
   - **Project name**: `guardian-erp`
   - **Database password**: Create a strong password (save it!)
   - **Region**: Choose the closest to your users
4. Click "Create new project" and wait for setup (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJ...` (use this for VITE_SUPABASE_ANON_KEY)

## Step 3: Update Environment Variables

Update your `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Run the Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `database/supabase-schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. Wait for "Success" message

## Step 5: Seed the Admin User

1. In SQL Editor, click **New Query**
2. Copy the contents of `database/seed-admin.sql`
3. Paste and run
4. This creates:
   - Admin user: `admin@guardian.com` / `Admin@123`
   - Sample employees, tasks, expenses, and revenue

## Step 6: Enable Row Level Security (Optional but Recommended)

RLS policies are included in the schema. To verify:

1. Go to **Authentication** → **Policies**
2. You should see policies for each table
3. These ensure users can only access their own data

## Step 7: Configure Storage (For File Uploads)

1. Go to **Storage** in sidebar
2. Click **New Bucket**
3. Name it `files`
4. Toggle **Public bucket** to ON (or configure access policies)
5. Click **Create bucket**

## Step 8: Install Dependencies

In your project folder, run:

```bash
npm install
```

This will install `@supabase/supabase-js` and other dependencies.

## Step 9: Start the Application

```bash
npm run electron:dev
```

## Step 10: Test Login

1. Open the app
2. Login with:
   - Email: `admin@guardian.com`
   - Password: `Admin@123`

## Troubleshooting

### "Supabase is not configured" Error
- Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after changing `.env`

### "Invalid email or password" Error
- Make sure you ran `seed-admin.sql`
- Check the users table in Supabase Table Editor

### "Permission denied" Errors
- Check RLS policies are properly configured
- Verify the user role matches the required permissions

### Connection Issues
- Check your internet connection
- Verify Supabase project is active (not paused)
- Check for any firewall blocking supabase.co

## Database Tables

| Table | Description |
|-------|-------------|
| users | Authentication accounts |
| employees | Employee profiles |
| attendance | Clock in/out records |
| tasks | Task assignments |
| expenses | Business expenses |
| revenue | Income tracking |
| leaves | Leave requests |
| notifications | User notifications |
| settings | User preferences |
| chat_conversations | Chat threads |
| chat_messages | Chat messages |
| files | Uploaded documents |
| vob_custom_fields | Custom form fields |
| vob_records | VOB/BOB records |
| roles | Role definitions |

## Security Notes

1. **Never expose the service_role key** in frontend code
2. The anon key is safe for frontend use with RLS enabled
3. Change the default admin password after first login
4. Enable 2FA on your Supabase account

## Support

For issues:
1. Check Supabase docs: https://supabase.com/docs
2. Review error messages in browser console
3. Check Supabase logs in Dashboard → Logs

---

**Default Admin Credentials:**
- Email: `admin@guardian.com`
- Password: `Admin@123`

⚠️ **Change this password immediately after first login!**
