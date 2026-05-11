# MessMate Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Enter project name: **`messmate-student-app`**
4. Set a strong database password
5. Choose your region and click **"Create new project"**

---

## Step 2: Set Up Database Schema

1. In the Supabase sidebar, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire content from `supabase_schema.sql` and paste it into the editor
4. Click **"Run"**

This will create:
- `profiles` table for user roles
- `messes` table for app data
- `mess_members` for access control
- `manager_access` for month-wise manager control
- Row Level Security (RLS) policies
- Trigger to auto-create profiles on sign-up
- Real-time publication for live updates

---

## Step 3: Enable Real-time

1. Go to **Database** → **Publications**
2. Click **"Create Publication"** (or edit existing `supabase_realtime`)
3. Select the **`messes`** table
4. Enable **Insert**, **Update**, and **Delete**
5. Save

---

## Step 4: Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy the **Project URL**
3. Copy the **anon public** API Key

---

## Step 5: Configure the App

1. Create or update `supabase-config.js` in your app folder:

```javascript
window.MESSMATE_SUPABASE_CONFIG = {
  url: "YOUR_SUPABASE_URL",
  key: "YOUR_SUPABASE_ANON_KEY"
};
```

---

## Step 6: Deploy Edge Functions (Optional but Recommended)

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-id`
4. Deploy functions: `supabase functions deploy manage-roles`

This enables secure role management that can't be bypassed from the frontend.

---

## Step 7: Create Admin User

1. Open your app and **Sign Up** with your email
2. Go back to Supabase **Table Editor** → **profiles** table
3. Find your user record and change the **role** from `student` to `admin`
4. Now you have full administrative access!

---

## User Roles

- **Admin**: Full access to all messes and user management
- **Manager**: Edit access to assigned messes for specific months
- **Student**: Read-only access to assigned messes

---

## Security Policies (RLS)

The system uses Postgres Row Level Security to ensure:
- Users only see their own profiles
- Only members/admins can read mess data
- Only admins/managers (with valid month access) can edit data
- Admins have override access for everything
