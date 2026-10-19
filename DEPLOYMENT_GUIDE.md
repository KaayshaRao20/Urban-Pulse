# 🚀 UrbanPulse Production Deployment Guide: Supabase & Vercel

This step-by-step guide will walk you through deploying **UrbanPulse** with **Supabase (PostgreSQL Database & Auth)** and **Vercel (Frontend Hosting)**.

---

## 📋 Table of Contents
1. [Supabase Database & Auth Setup (3 Minutes)](#1-supabase-database--auth-setup)
2. [Vercel Frontend Hosting (2 Minutes)](#2-vercel-frontend-hosting)
3. [Backend API Deployment (Render / Railway)](#3-backend-api-deployment-render--railway)
4. [Official Seed Accounts & Testing](#4-official-seed-accounts--testing)

---

## 1. Supabase Database & Auth Setup

### Step 1.1: Create a Project
1. Log in to [Supabase](https://supabase.com) and click **"New Project"**.
2. Name your project (e.g., `urbanpulse-smartcity`).
3. Set a strong database password and select your closest region (e.g., `South Asia (Mumbai)`).

### Step 1.2: Execute Schema & Seed Database
1. In your Supabase Dashboard, click on **SQL Editor** (icon on the left navigation).
2. Click **"New Query"**.
3. Open the file [`supabase/schema.sql`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/supabase/schema.sql) in this repository, copy all contents, paste it into the SQL Editor, and click **RUN**.
4. This instantly sets up:
   - `users` (Officer and commander authentication registry)
   - `civic_complaints` (Citizen grievance reports with coordinates)
   - `civic_complaint_audit_logs` (Immutable lifecycle audit trail)
   - `civic_notifications` (Dispatch logs)
   - `alerts` & `alert_updates` & `alert_comments` (Persistent Authority incidents)
   - `reports` & `report_downloads` (Document generator archive)
   - Row-Level Security (RLS) policies
   - Storage Buckets: `grievance-images` and `report-files`
   - Pre-seeded Municipal Authorities and Default Officers

### Step 1.3: Copy Your Supabase Keys
Go to **Project Settings** (gear icon) -> **API**:
- Copy **Project URL**: `https://[YOUR-PROJECT-REF].supabase.co`
- Copy **anon / public key**: `eyJhbGciOi...`
- Copy **JWT Secret** (under JWT Settings)

Go to **Project Settings** -> **Database**:
- Under **Connection String**, select **URI**.
- Copy the connection string: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

---

## 2. Vercel Frontend Hosting

The repository includes both `vercel.json` in the root and `frontend/vercel.json` configured for SPA routing.

### Step 2.1: Import to Vercel
1. Go to [Vercel](https://vercel.com) and click **"Add New..."** -> **"Project"**.
2. Select your GitHub repository containing UrbanPulse.
3. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Select `frontend` (or leave as root `/`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist` (or `frontend/dist` if root)

### Step 2.2: Add Environment Variables in Vercel
In the Vercel Project Setup screen, add these **Environment Variables**:

| Variable Name | Value / Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase Project URL (`https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key (`eyJhbGciOi...`) |
| `VITE_API_BASE_URL` | Your deployed backend URL (`https://your-api.onrender.com/api`) |

4. Click **Deploy**!
5. In under 1 minute, your site will be live at `https://urbanpulse-xyz.vercel.app`!

---

## 3. Backend API Deployment (Render / Railway)

You can host the Python FastAPI backend on free/affordable cloud providers like **Render** or **Railway**:

### Option A: Render (Recommended)
1. Go to [render.com](https://render.com) and click **New Web Service**.
2. Connect your repository.
3. Configure:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables**:
   - `DATABASE_URL`: Your Supabase PostgreSQL URI (e.g. `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require`)
   - `JWT_SECRET`: Your Supabase JWT secret or custom secret.
5. Click **Create Web Service**.
6. Once deployed, copy your Render URL (e.g., `https://urbanpulse-api.onrender.com`) and paste it into Vercel's `VITE_API_BASE_URL` as `https://urbanpulse-api.onrender.com/api`.

---

## 4. Official Seed Accounts & Testing

When connecting to Supabase or testing locally, the following municipal accounts are pre-configured:

### 🛡️ Pre-Seeded Officer Credentials:
| Officer Name | Email / Badge ID | Password | Role / Department | Clearance |
|---|---|---|---|---|
| **Chief Duty Commander V. Nayak** | `admin@urbanpulse.gov.in` / `CMD-DIR-0001` | `bbmp2026` | ICCC Master Command Desk | Level 5 (Root) |
| **Executive Engineer K. S. Rao** | `engineer.rao@bbmp.gov.in` / `BBMP-ENG-8412` | `bbmp2026` | BBMP Road Infrastructure Cell | Level 4 |
| **Chief Hydrologist K. S. Murthy** | `murthy.water@bwssb.gov.in` / `BWSSB-HYD-5021` | `bbmp2026` | BWSSB Water Supply Division | Level 4 |

> [!TIP]
> **Registering New Officers:** You can also click the **"Register New Officer"** tab in the Authority Modal at any time to create custom municipal credentials with any name, badge, and department!

---

## 5. Dual-Resilient Fallback Mode

If you run the app locally without setting Supabase or backend environment variables:
- The app automatically runs in **Resilient Local Mode**.
- Local SQLite database (`urbanpulse_dev.db`) will store grievances, alerts, and user accounts.
- Once you set the Supabase variables, it switches automatically to **Supabase Cloud PostgreSQL** without needing any code edits!
