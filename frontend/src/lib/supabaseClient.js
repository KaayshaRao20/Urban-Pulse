/**
 * UrbanPulse Smart City Network - Supabase Client Bridge
 * Supports both live Supabase cloud connections and resilient local fallback.
 * To activate live Supabase:
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env
 */

import { createClient } from '@supabase/supabase-js';
import { API_BASE } from '../config/api';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://gciafwqdlvulgxinycot.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjaWFmd3FkbHZ1bGd4aW55Y290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzQzNjAsImV4cCI6MjEwNzY1MDM2MH0.osuFqv9xLsLD5-IjcF7gtGqx54uZsF8wkU0Qm0wdAGY';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-supabase-project')
);

let client = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    console.info('[UrbanPulse Supabase] Connected to live Supabase project:', supabaseUrl);
  } catch (err) {
    console.warn('[UrbanPulse Supabase] Failed to initialize Supabase client:', err);
  }
} else {
  console.info(
    '[UrbanPulse Supabase] Environment keys not set. Operating in local FastAPI backend mode. ' +
    'Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect directly to Supabase.'
  );
}

// Fallback proxy to ensure no unhandled exceptions if called before keys are set
const safeSupabaseProxy = client || new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'auth') {
      return {
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured. Using local Municipal Auth.') }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      };
    }
    return () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    });
  }
});

export const supabase = safeSupabaseProxy;

/**
 * High-level civic service adapter.
 * Uses Supabase cloud if configured, otherwise connects to local FastAPI backend.
 */
const BACKEND_API = `${API_BASE}/grievances`;

export const civicService = {
  isCloudConnected: () => isSupabaseConfigured,

  async getComplaints(filter = {}) {
    if (isSupabaseConfigured && client) {
      let query = client.from('civic_complaints').select('*').order('created_at', { ascending: false });
      if (filter.status && filter.status !== 'all') query = query.eq('status', filter.status);
      if (filter.category && filter.category !== 'all') query = query.ilike('category', `%${filter.category}%`);
      if (filter.urgency && filter.urgency !== 'all') query = query.eq('urgency', filter.urgency);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      const params = new URLSearchParams();
      if (filter.status && filter.status !== 'all') params.append('status', filter.status);
      if (filter.category && filter.category !== 'all') params.append('category', filter.category);
      if (filter.urgency && filter.urgency !== 'all') params.append('urgency', filter.urgency);
      const res = await fetch(`${BACKEND_API}/authority/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load complaints from backend');
      const json = await res.json();
      return json.complaints || [];
    }
  },

  async getComplaintDossier(ticketNumber) {
    if (isSupabaseConfigured && client) {
      const { data: complaint, error } = await client
        .from('civic_complaints')
        .select('*')
        .eq('ticket_number', ticketNumber)
        .single();
      if (error) throw error;

      const { data: history } = await client
        .from('civic_complaint_audit_logs')
        .select('*')
        .eq('ticket_number', ticketNumber)
        .order('timestamp', { ascending: false });

      const { data: notifications } = await client
        .from('civic_notifications')
        .select('*')
        .eq('ticket_number', ticketNumber)
        .order('sent_at', { ascending: false });

      return {
        complaint,
        history: history || [],
        notifications: notifications || []
      };
    } else {
      const res = await fetch(`${BACKEND_API}/authority/${ticketNumber}/dossier`);
      if (!res.ok) throw new Error(`Failed to load dossier for ticket ${ticketNumber}`);
      return await res.json();
    }
  },

  async trackComplaint(ticketNumber) {
    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('civic_complaints')
        .select('ticket_number, category, title, description, status, urgency, landmark_address, ward_zone, created_at, assigned_department, assigned_squad, dispatch_eta, dispatch_notes, resolution_notes, resolution_image_url, resolution_timestamp, rejection_reason, reopen_reason, reopen_count, sla_hours')
        .eq('ticket_number', ticketNumber)
        .single();
      if (error) throw error;
      return data;
    } else {
      const res = await fetch(`${BACKEND_API}/track/${ticketNumber}`);
      if (!res.ok) throw new Error('Ticket not found or inaccessible');
      return await res.json();
    }
  }
};

export default safeSupabaseProxy;
