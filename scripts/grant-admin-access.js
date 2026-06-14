#!/usr/bin/env node

/**
 * Admin Access Grant Script
 * 
 * This script grants admin access to a registered user in the African Reel Reviews application.
 * 
 * Usage:
 *   node scripts/grant-admin-access.js <user-email>
 *   node scripts/grant-admin-access.js <user-email> --role moderator
 * 
 * Examples:
 *   node scripts/grant-admin-access.js john@example.com
 *   node scripts/grant-admin-access.js jane@example.com --role moderator
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables or use hardcoded values
const SUPABASE_URL = process.env.SUPABASE_URL || "https://anjavnuqkkmpsnjmopou.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuamF2bnVxa2ttcHNuam1vcG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDcyMTUsImV4cCI6MjA3MDkyMzIxNX0.FO0Wj6MQoCA8-CVj172TgW37qi2xxebV0Xt16P-2scM";

// Check if we have the service role key
if (!process.env.SUPABASE_SERVICE_KEY && SUPABASE_SERVICE_KEY.includes('anon')) {
  console.log('⚠️  WARNING: Using anonymous key. For admin operations, you need the service role key.');
  console.log('   Set SUPABASE_SERVICE_KEY environment variable or update the script with the service key.');
  console.log('   You can find the service role key in your Supabase dashboard under Settings > API\n');
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Valid roles
const VALID_ROLES = ['user', 'moderator', 'admin'];

/**
 * Grant admin access to a user by email
 * @param {string} email - User's email address
 * @param {string} role - Role to assign (default: 'admin')
 */
async function grantAdminAccess(email, role = 'admin') {
  try {
    console.log(`🔍 Looking up user with email: ${email}`);
    
    // First, get the user from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (authError) {
      console.error('❌ Error fetching user from auth:', authError.message);
      return false;
    }
    
    if (!authUser.user) {
      console.error(`❌ User with email ${email} not found in authentication system`);
      return false;
    }
    
    console.log(`✅ Found user: ${authUser.user.email} (ID: ${authUser.user.id})`);
    
    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError.message);
      return false;
    }
    
    if (!profile) {
      console.error(`❌ User profile not found for ${email}`);
      return false;
    }
    
    console.log(`📋 Current profile role: ${profile.role || 'user'}`);
    
    // Update the user's role
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', authUser.user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating user role:', updateError.message);
      return false;
    }
    
    console.log(`✅ Successfully updated ${email} to ${role} role`);
    console.log(`📊 Updated profile:`, {
      id: updatedProfile.id,
      user_id: updatedProfile.user_id,
      display_name: updatedProfile.display_name,
      role: updatedProfile.role,
      updated_at: updatedProfile.updated_at
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

/**
 * List all users with their roles
 */
async function listUsers() {
  try {
    console.log('📋 Fetching all users...');
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        display_name,
        role,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
    }
    
    console.log(`\n📊 Found ${profiles.length} users:\n`);
    console.log('Email'.padEnd(30) + 'Display Name'.padEnd(20) + 'Role'.padEnd(10) + 'Created');
    console.log('-'.repeat(80));
    
    for (const profile of profiles) {
      // Get email from auth.users
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email || 'Unknown';
      
      console.log(
        email.padEnd(30) + 
        (profile.display_name || 'N/A').padEnd(20) + 
        (profile.role || 'user').padEnd(10) + 
        new Date(profile.created_at).toLocaleDateString()
      );
    }
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔧 African Reel Reviews - Admin Access Management\n');
    console.log('Usage:');
    console.log('  node scripts/grant-admin-access.js <user-email> [--role <role>]');
    console.log('  node scripts/grant-admin-access.js --list');
    console.log('');
    console.log('Options:');
    console.log('  --role <role>    Role to assign (user, moderator, admin) [default: admin]');
    console.log('  --list           List all users and their roles');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/grant-admin-access.js john@example.com');
    console.log('  node scripts/grant-admin-access.js jane@example.com --role moderator');
    console.log('  node scripts/grant-admin-access.js --list');
    process.exit(1);
  }
  
  if (args[0] === '--list') {
    await listUsers();
    return;
  }
  
  const email = args[0];
  let role = 'admin';
  
  // Parse role argument
  const roleIndex = args.indexOf('--role');
  if (roleIndex !== -1 && args[roleIndex + 1]) {
    role = args[roleIndex + 1];
  }
  
  if (!VALID_ROLES.includes(role)) {
    console.error(`❌ Invalid role: ${role}. Valid roles are: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }
  
  console.log('🔧 African Reel Reviews - Admin Access Management\n');
  console.log(`📧 User email: ${email}`);
  console.log(`👤 Role to assign: ${role}`);
  console.log('');
  
  const success = await grantAdminAccess(email, role);
  
  if (success) {
    console.log('\n🎉 Operation completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 Operation failed!');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
