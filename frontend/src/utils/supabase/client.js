import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://gciafwqdlvulgxinycot.supabase.co';

const supabaseKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjaWFmd3FkbHZ1bGd4aW55Y290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzQzNjAsImV4cCI6MjEwNzY1MDM2MH0.osuFqv9xLsLD5-IjcF7gtGqx54uZsF8wkU0Qm0wdAGY';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

export default createClient;
