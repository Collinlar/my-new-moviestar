# Admin Access Management Scripts

This directory contains scripts to manage user roles and admin access in the African Reel Reviews application.

## Available Scripts

### 1. Node.js Script (`grant-admin-access.js`)

A comprehensive Node.js script that can grant admin access, list users, and manage roles.

#### Prerequisites

```bash
cd scripts
npm install
```

#### Usage

```bash
# Grant admin access to a user
node grant-admin-access.js user@example.com

# Grant moderator access to a user
node grant-admin-access.js user@example.com --role moderator

# List all users and their roles
node grant-admin-access.js --list

# Show help
node grant-admin-access.js
```

#### Environment Variables (Optional)

You can set these environment variables to override the default Supabase configuration:

```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

### 2. SQL Script (`grant-admin-access.sql`)

A SQL script that can be executed directly in the Supabase SQL editor or via psql.

#### Usage

1. Open the Supabase SQL editor
2. Copy the contents of `grant-admin-access.sql`
3. Replace `'user@example.com'` with the actual email address
4. Optionally change `'admin'` to `'moderator'` for moderator access
5. Execute the script

#### Features

- Grant admin access to a specific user
- Grant moderator access to a specific user
- List all users and their roles
- Grant access to multiple users at once
- Revoke admin access (set back to user)

## User Roles

The application supports three user roles:

- **`user`** - Regular user (default)
- **`moderator`** - Can moderate content and reviews
- **`admin`** - Full administrative access

## Security Notes

- The Node.js script uses the service role key for admin operations
- The SQL script should only be run by database administrators
- Always verify the user exists before granting elevated privileges
- Consider using the SQL script for one-time operations and the Node.js script for regular administration

## Examples

### Grant Admin Access to John Doe

**Node.js:**
```bash
node grant-admin-access.js john.doe@example.com
```

**SQL:**
```sql
-- Change the email in the script
DO $$
DECLARE
    target_email TEXT := 'john.doe@example.com';
    target_role TEXT := 'admin';
    -- ... rest of the script
```

### List All Users

**Node.js:**
```bash
node grant-admin-access.js --list
```

**SQL:**
```sql
SELECT 
    au.email,
    p.display_name,
    COALESCE(p.role, 'user') as role,
    p.created_at,
    p.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
ORDER BY p.created_at DESC;
```

### Grant Moderator Access

**Node.js:**
```bash
node grant-admin-access.js jane.smith@example.com --role moderator
```

**SQL:**
```sql
-- Change the email and role in the script
DO $$
DECLARE
    target_email TEXT := 'jane.smith@example.com';
    target_role TEXT := 'moderator';
    -- ... rest of the script
```

## Troubleshooting

### Common Issues

1. **"User not found"** - Verify the email address is correct and the user has registered
2. **"Profile not found"** - The user may not have completed their profile setup
3. **"Permission denied"** - Ensure you're using the correct Supabase credentials

### Getting Help

If you encounter issues:

1. Check the Supabase logs for detailed error messages
2. Verify the user exists in both `auth.users` and `public.profiles` tables
3. Ensure the service role key has the necessary permissions
4. Check that RLS policies allow the operations you're trying to perform
