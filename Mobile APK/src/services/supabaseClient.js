/**
 * Guardian Desktop ERP - Supabase Client
 * Central cloud database connection using Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables (Vite exposes them via import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Disable auto-refresh and auto-detection of existing sessions
    // We're managing our own JWT tokens
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'guardian-desktop-erp',
    },
  },
});

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseKey);
};

// Helper to get current session
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
};

// Helper to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export default supabase;
