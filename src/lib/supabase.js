import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return !!(supabaseUrl && supabaseAnonKey &&
        supabaseUrl !== 'your_project_url_here' &&
        supabaseAnonKey !== 'your_anon_key_here');
};

// Disable navigator.locks usage which can hang auth.getSession() in some browsers
const noLock = async (_name, _acquireTimeout, fn) => await fn();

// Create Supabase client (will be null if not configured)
export const supabase = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            lock: noLock,
        },
    })
    : null;
