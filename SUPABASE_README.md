# MessMate Supabase Backend

## 🚀 Overview

The MessMate app has been migrated to **Supabase** to provide a robust, real-time cloud backend with multi-level access control.

### Key Features
- **Authentication**: Email and password login.
- **Real-time Sync**: Automatic data synchronization across all devices.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full control over users and messes.
  - **Manager**: Edit access for specific messes and specific months.
  - **Student**: Read-only access to assigned messes.
- **Row Level Security (RLS)**: Database-level protection for all data.

---

## 📁 Project Structure

| File | Purpose |
|------|---------|
| `cloud.js` | Supabase integration and state management. |
| `supabase-config.js` | Your project credentials. |
| `supabase_schema.sql` | Database tables and security policies. |
| `SUPABASE_SETUP_GUIDE.md` | Step-by-step setup instructions. |
| `admin-panel.js` | Admin interface logic. |
| `role-based-ui.js` | Role-based UI visibility. |

---

## 🛠️ Quick Start

1. **Create a Supabase Project** at [supabase.com](https://supabase.com).
2. **Run the Schema**: Copy `supabase_schema.sql` into the Supabase SQL Editor and run it.
3. **Configure the App**: Update `supabase-config.js` with your Project URL and Anon Key.
4. **Enable Real-time**: In Supabase Database → Publications, enable real-time for the `messes` table.
5. **Create Admin**: Sign up in the app, then change your role to `admin` in the `profiles` table in Supabase.

---

## 🔐 Role Management

### Granting Manager Access
Admins can grant access to managers via the **Admin Panel** in the app.
- Enter the Manager's UUID (found in Supabase `auth.users` or `profiles`).
- Enter the Mess ID.
- Enter the months (e.g., `2024-01, 2024-02`).

### Student Access
Students are automatically assigned the `student` role upon sign-up. They have read-only access to messes they are added to.

---

## 📱 Deployment

The app is ready for static hosting:
- **GitHub Pages**
- **Netlify**
- **Vercel**

Just ensure all files are included in the deployment.

---

## 🐛 Troubleshooting

- **"Supabase not configured"**: Check `supabase-config.js`.
- **"Access Denied"**: Ensure you have the correct role and (for managers) valid month access.
- **"Real-time not working"**: Ensure real-time is enabled for the `messes` table in Supabase.

---

**MessMate is now powered by Supabase! 🎉**
