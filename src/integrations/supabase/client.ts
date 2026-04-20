import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kjibbbuceipnialfgflt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaWJiYnVjZWlwbmlhbGZnZmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MjI2NTYsImV4cCI6MjA1NjQ5ODY1Nn0.mXMhSc0MyBv4BRHnS7Hxv0-uKjIXJFMFxlaBQJc-bN4";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
