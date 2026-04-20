import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://cvieojhwmzfdzqzsgadk.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x5PYeh9z_PoU0CFKQer-XQ_ShCqvg4K';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
