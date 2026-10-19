# UrbanPulse Smart City Network — Supabase Production Integration Guide

This guide details how to link your **Supabase Cloud Project** to the UrbanPulse Smart City Platform.

---

## 1. Quick Setup (2 Minutes)

### Step 1: Create or Open Your Supabase Project
1. Go to [supabase.com](https://supabase.com) and create or open your project.
2. In the Supabase Dashboard, navigate to **Project Settings** -> **API**.
3. Copy your:
   - **Project URL** (e.g. `https://xyzproject.supabase.co`)
   - **anon / public key** (e.g. `eyJhbGciOi...`)
   - **Database Connection String** (under **Database** -> **Connection string** -> **URI**)

---

### Step 2: Initialize Database Schema in Supabase
1. In the Supabase Dashboard, click on **SQL Editor** from the left navigation.
2. Open the file [`supabase/schema.sql`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/supabase/schema.sql) in this repository.
3. Paste the entire SQL content into the SQL Editor and click **Run**.
4. This instantly creates:
   - `civic_complaints` table (geotagged grievances with PostGIS / coordinates)
   - `civic_audit_logs` table (immutable chronological audit trail)
   - `civic_notifications` table (outbound alerts log)
   - `municipal_departments` and `municipal_officers` tables
   - Row-Level Security (RLS) policies protecting citizen PII while enabling public submissions and tracking
   - Storage buckets: `civic-complaint-photos` and `civic-resolution-photos`

---

### Step 3: Configure Environment Variables

#### Frontend (`frontend/.env`)
Create or edit `frontend/.env`:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Backend (`backend/.env`)
Create or edit `backend/.env`:
```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
```

---

## 2. Architecture & Resilience

UrbanPulse features a dual-resilient architecture:
- **Cloud Mode:** When Supabase keys are provided, the frontend communicates with Supabase RLS and the FastAPI engine connects to PostgreSQL with automatic connection pooling.
- **Local Fallback Mode:** If Supabase keys are not set, UrbanPulse operates seamlessly against the local SQLite database and FastAPI grievance router without crashing or requiring external internet access.

---

## 3. Security & Access Control

- **Citizen Privacy:** Direct public selects from `civic_complaints` only return non-sensitive fields (`ticket_number`, `category`, `title`, `description`, `status`, `urgency`, `ward_zone`). Sensitive citizen names, phone numbers, and emails are restricted to municipal officers with verified clearance (`SEC-LEVEL 4`).
- **Audit Immutability:** Audit trail records cannot be updated or deleted by public users.
