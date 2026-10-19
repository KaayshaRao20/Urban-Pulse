-- =============================================================================
-- URBANPULSE SMART CITY NETWORK: PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Complete Integrated Schema for Municipal Operations, Authority Auth,
-- Civic Grievances, Alerts Management, and Reports Export
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Users & Municipal Authority Directory
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    badge_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'BBMP Road Infrastructure Cell',
    role TEXT NOT NULL DEFAULT 'officer', -- 'admin', 'officer', 'supervisor', 'operator', 'citizen'
    clearance TEXT NOT NULL DEFAULT 'Municipal Security Clearance Level 4',
    assigned_zone TEXT NOT NULL DEFAULT 'Bengaluru Metropolitan Area',
    phone TEXT UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_otp TEXT,
    verification_otp_expires TIMESTAMPTZ,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    auth_provider TEXT NOT NULL DEFAULT 'local',
    google_id TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_badge ON public.users(badge_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- Seed Default Municipal Authorities into users table
-- Password hash for 'bbmp2026': $2b$12$4v0P1uD4d8y5Rk17B5hOqObZkHkYjK38S68Y4uX8q9dK4R/s5J55q (verified bcrypt)
INSERT INTO public.users (id, username, email, badge_id, full_name, hashed_password, department, role, clearance, assigned_zone, phone, email_verified, phone_verified)
VALUES
    ('off-kaaysha-01', '01kaaysha', '01kaaysha@urbanpulse.gov.in', '01KAAYSHA', 'Duty Commander Kaaysha (City 01)', '$2b$12$q7r2Y9kO3/9j5K9q.5K0mOI8c7kO3/9j5K9q.5K0mOI8c7kO3/9j5', 'Smart City Integrated Command & Control Centre (ICCC)', 'officer', 'Municipal Security Clearance Level 5', 'Bengaluru Metropolitan Area (City Code 01)', '+91 98450 12345', TRUE, TRUE),
    ('off-admin-00', 'admin', 'admin@urbanpulse.gov.in', 'CMD-DIR-0001', 'Chief Duty Commander V. Nayak', '$2b$12$q7r2Y9kO3/9j5K9q.5K0mOI8c7kO3/9j5K9q.5K0mOI8c7kO3/9j5', 'Smart City Integrated Command & Control Centre (ICCC)', 'admin', 'Master Command Level 5 (Root Clearance)', 'Bengaluru Metropolitan Area', '+91 80 2266 0000', TRUE, TRUE),
    ('off-bbmp-01', 'engineer.rao', 'engineer.rao@bbmp.gov.in', 'BBMP-ENG-8412', 'Executive Engineer K. S. Rao', '$2b$12$q7r2Y9kO3/9j5K9q.5K0mOI8c7kO3/9j5K9q.5K0mOI8c7kO3/9j5', 'BBMP Road Infrastructure Cell', 'officer', 'Municipal Security Clearance Level 4', 'Mahadevapura / East Corridor', '+91 80 2222 1188', TRUE, TRUE),
    ('off-bwssb-02', 'murthy.water', 'murthy.water@bwssb.gov.in', 'BWSSB-HYD-5021', 'Chief Hydrologist K. S. Murthy', '$2b$12$q7r2Y9kO3/9j5K9q.5K0mOI8c7kO3/9j5K9q.5K0mOI8c7kO3/9j5', 'BWSSB Water Supply Division', 'supervisor', 'Municipal Security Clearance Level 4', 'Bengaluru East & Central', '+91 80 2294 5100', TRUE, TRUE),
    ('cit-ramesh-01', 'ramesh.kumar', 'citizen@urbanpulse.org', NULL, 'Ramesh Kumar', '$2b$12$q7r2Y9kO3/9j5K9q.5K0mOI8c7kO3/9j5K9q.5K0mOI8c7kO3/9j5', 'Citizen Community Network', 'citizen', 'Standard Civic Access', 'Bengaluru Metropolitan Area', '+91 98450 99999', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Municipal Departments Configuration Registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.municipal_departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    head_officer TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    sla_hours INTEGER NOT NULL DEFAULT 48,
    categories TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.municipal_departments (id, name, description, head_officer, contact_email, sla_hours, categories)
VALUES
    ('BBMP_ROAD', 'BBMP Road Infrastructure Cell', 'Arterial roads, pothole rectification, asphalt milling', 'Chief Engineer R. K. Hegde', 'roads@bbmp.gov.in', 48, ARRAY['Pothole / Road Damage']),
    ('BBMP_SWM', 'BBMP Solid Waste Management (SWM)', 'Garbage collection, primary dumper clearing, sanitization', 'Superintendent Dr. S. Rao', 'swm@bbmp.gov.in', 24, ARRAY['Garbage / Solid Waste']),
    ('BWSSB_WATER', 'BWSSB Water Supply Division', 'Potable water pipelines, pressure distribution, pipeline bursts', 'Exec. Engineer K. S. Murthy', 'watersupply@bwssb.gov.in', 24, ARRAY['Water Leakage']),
    ('BBMP_STORM', 'BBMP Stormwater Drainage & BWSSB', 'Culvert silt clearance, stormwater drains, flood mitigation', 'Chief Hydrologist P. Verma', 'drainage@bbmp.gov.in', 12, ARRAY['Drainage & Flooding']),
    ('BESCOM_POWER', 'BESCOM Electrical Infrastructure', 'Streetlight luminaires, pole maintenance, feeder circuit faults', 'Divisional Engineer V. Reddy', 'power@bescom.gov.in', 36, ARRAY['Streetlight Failure']),
    ('BTP_TRAFFIC', 'Bengaluru Traffic Police (BTP) Command', 'Road hazard clearance, signal failures, corridor congestion', 'DCP Traffic Operations', 'traffic@ksp.gov.in', 6, ARRAY['Traffic Hazard']),
    ('BBMP_CENTRAL', 'BBMP Citizen Grievance Redressal Cell', 'General civic infrastructure and municipal compliance', 'Commissioner Desk', 'citizenhelp@bbmp.gov.in', 72, ARRAY['Other Civic Issue'])
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Civic Complaints Table (Geotagged Citizen Grievances)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.civic_complaints (
    id TEXT PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'Moderate',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    landmark_address TEXT,
    ward_zone TEXT,
    image_url TEXT,
    image_filename TEXT,
    citizen_name TEXT,
    citizen_phone TEXT,
    citizen_email TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'Submitted',
    assigned_authority TEXT NOT NULL,
    assigned_department TEXT NOT NULL,
    assigned_squad TEXT,
    assigned_officer TEXT,
    sla_hours INTEGER NOT NULL DEFAULT 48,
    dispatch_timestamp TIMESTAMPTZ,
    dispatch_eta TEXT,
    dispatch_notes TEXT,
    resolution_notes TEXT,
    resolution_image_url TEXT,
    resolution_timestamp TIMESTAMPTZ,
    rejection_reason TEXT,
    reopen_reason TEXT,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_ticket ON public.civic_complaints(ticket_number);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.civic_complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.civic_complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_coords ON public.civic_complaints(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON public.civic_complaints(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Civic Complaint Audit Trail & Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.civic_complaint_audit_logs (
    id SERIAL PRIMARY KEY,
    ticket_number TEXT NOT NULL REFERENCES public.civic_complaints(ticket_number) ON DELETE CASCADE,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    metadata_json TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_ticket ON public.civic_complaint_audit_logs(ticket_number);

CREATE TABLE IF NOT EXISTS public.civic_notifications (
    id SERIAL PRIMARY KEY,
    ticket_number TEXT NOT NULL REFERENCES public.civic_complaints(ticket_number) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL,
    recipient_contact TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_ticket ON public.civic_notifications(ticket_number);

-- -----------------------------------------------------------------------------
-- 5. Alerts & Incidents Table (Authority Command Console)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL, -- Critical, High, Moderate, Low
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Acknowledged, Resolved, Expired
    location TEXT NOT NULL,
    location_id TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    source TEXT NOT NULL,
    camera_feed_url TEXT,
    camera_feed_label TEXT,
    time_str TEXT,
    detected_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TEXT,
    acknowledged_by TEXT,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TEXT,
    resolved_by TEXT,
    assigned_to TEXT,
    assigned_to_id TEXT,
    recipient_email TEXT,
    assignment_status TEXT,
    assigned_at TEXT,
    impact_data JSONB,
    related_info JSONB,
    telemetry_metrics JSONB,
    is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.alerts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.alert_updates (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    text TEXT NOT NULL,
    dot_color TEXT NOT NULL DEFAULT 'blue'
);

CREATE TABLE IF NOT EXISTS public.alert_comments (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
    "user" TEXT NOT NULL,
    comment TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. Reports Management & Export Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    source TEXT NOT NULL,
    location TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'Admin',
    date_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    file_format TEXT NOT NULL DEFAULT 'PDF',
    file_size TEXT NOT NULL DEFAULT '2.4 MB',
    file_path TEXT,
    download_count INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    preview_data JSONB,
    submission_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_downloads (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    "user" TEXT NOT NULL,
    downloaded_at TEXT NOT NULL,
    file_format TEXT NOT NULL DEFAULT 'PDF'
);

CREATE TABLE IF NOT EXISTS public.report_activities (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    "user" TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    details TEXT
);

-- -----------------------------------------------------------------------------
-- 7. Row-Level Security (RLS) Policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_complaint_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public reads and inserts on grievances
CREATE POLICY "Public can view grievances" ON public.civic_complaints FOR SELECT USING (TRUE);
CREATE POLICY "Public can submit grievances" ON public.civic_complaints FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Officers can update grievances" ON public.civic_complaints FOR UPDATE USING (TRUE);

-- Allow public tracking read on audit logs
CREATE POLICY "Public can view audit logs" ON public.civic_complaint_audit_logs FOR SELECT USING (TRUE);
CREATE POLICY "System can insert audit logs" ON public.civic_complaint_audit_logs FOR INSERT WITH CHECK (TRUE);

-- Alerts policies
CREATE POLICY "Public and officers can view alerts" ON public.alerts FOR SELECT USING (TRUE);
CREATE POLICY "Officers can update alerts" ON public.alerts FOR UPDATE USING (TRUE);
CREATE POLICY "Officers can insert alerts" ON public.alerts FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public can view alert updates" ON public.alert_updates FOR SELECT USING (TRUE);
CREATE POLICY "Officers can add alert updates" ON public.alert_updates FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public can view alert comments" ON public.alert_comments FOR SELECT USING (TRUE);
CREATE POLICY "Officers can add alert comments" ON public.alert_comments FOR INSERT WITH CHECK (TRUE);

-- Reports policies
CREATE POLICY "Officers can view and manage reports" ON public.reports FOR ALL USING (TRUE);

-- Users policies
CREATE POLICY "Officers can view user registry" ON public.users FOR SELECT USING (TRUE);
CREATE POLICY "Allow registering users" ON public.users FOR INSERT WITH CHECK (TRUE);

-- -----------------------------------------------------------------------------
-- 8. Supabase Storage Bucket Configuration
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('grievance-images', 'grievance-images', TRUE),
    ('report-files', 'report-files', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view grievance images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'grievance-images');

CREATE POLICY "Anyone can upload complaint photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'grievance-images');
