# CivicSolve AI

> **"From Public Problems to Verified Solutions."**  
> An intelligent civic grievance intake, prioritization, responder matching, and citizen-verified resolution platform built for national-level civic technology evaluation.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet%20%2B%20OSM-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![AI Engine](https://img.shields.io/badge/AI%20Triage-Ollama%20%2B%20Heuristics-0D9488)](https://ollama.ai)

---

## 🏛️ Executive Summary

Modern urban centers struggle with fragmented civic complaint systems: citizen reports get lost across disconnected department portals, lack urgent hazard prioritization, experience delayed officer dispatch, and are frequently closed without verifiable proof.

**CivicSolve AI** solves this end-to-end through a transparent, evidence-based grievance pipeline:
1. **Citizen reports** an issue (potholes, garbage accumulation, open manholes, water bursts, streetlight failures, sewage overflow) with photo and GPS location pin.
2. **AI Civic Intelligence** immediately categorizes the complaint, assesses hazard severity, calculates confidence, and checks for nearby spatial duplicates within 400 meters.
3. **Smart Responder Matching** scores available department officers based on category expertise (35%), geographic proximity (30%), active workload capacity (20%), and role seniority (15%).
4. **Evidence-Based Resolution** requires officers to submit on-site after-repair photographic proof with verified EXIF timestamp and GPS coordinates.
5. **Citizen Verification & Public Transparency** — The citizen who raised the grievance confirms whether the issue is genuinely fixed. No authority can mark a grievance "citizen confirmed" on their own.

---

## 🚀 Key Features

### 1. Citizen Reporting Experience
- **Interactive Map Pin Drop & Geolocation**: Report issues via browser GPS or interactive OpenStreetMap pin placement.
- **✨ AI Auto-Classify**: Citizens can click a single button to auto-detect category, urgency, and safety hazards from their problem description.
- **Real-Time Spatial Duplicate Detection**: Warns citizens if a similar issue was reported within a 400-meter radius, preventing backlog bloating.
- **Anonymous Reporting**: Generates a cryptographically hashed secret tracking token (never stored in plain text).

### 2. Multi-Tier AI Civic Intelligence
- **Resilient AI Pipeline**: Attempts inference via local Ollama LLM / LLaVA (`http://127.0.0.1:11434`), falling back seamlessly to an offline-safe rule engine with sub-millisecond response times.
- **Safety Hazard Detection**: Flags electrical shocks, child fall risks, severe sanitation hazards, and road collision threats.
- **Structured JSON Schema**: Strict validation with confidence scores and explainable rationale.

### 3. Explainable Smart Responder Matching
Transparent weighted scoring model:
$$\text{Match Score} = \text{Category Expertise (35\%)} + \text{Proximity (30\%)} + \text{Workload (20\%)} + \text{Role Seniority (15\%)}$$
- Officers receive actionable dispatch recommendations with clear justification displayed in the dispatch panel.

### 4. Evidence-Based Verification Pipeline
$$\text{SUBMITTED} \longrightarrow \text{UNDER\_REVIEW} \longrightarrow \text{ASSIGNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{AWAITING\_CITIZEN\_CONFIRMATION} \longrightarrow \text{RESOLVED\_CITIZEN\_CONFIRMED}$$
- **EXIF Analysis**: Verifies photo metadata, ensuring proof photos were captured after the report date and within 100 meters of the incident site.
- **Citizen Accountability**: If the citizen rejects the resolution, the grievance is immediately marked `REOPENED`, escalated, and flagged for Senior Officer review.
- **Auto-Closure Timer**: Unconfirmed grievances transition to `CLOSED_UNCONFIRMED` after 7 days via automated background cron jobs.

### 5. Role-Based Dashboards & Transparency
- **Citizen Portal**: View active grievances, status timeline, and confirmation action cards.
- **Authority / Officer Dashboard**: Priority queue, one-click assignment with AI recommendations, and evidence submission.
- **Senior Officer / Admin Panel**: Workload balancing, department management, and audit logs.
- **Public Impact & Transparency**: Metrics calculated exclusively from live database records with zero fabricated statistics.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5.4, React Router 6, Leaflet & React-Leaflet, Lucide Icons, Recharts |
| **Backend** | Node.js (v18+), Express 4.19, Mongoose 8.5, Zod (Schema Validation), Multer, Exifr |
| **Database** | MongoDB (`CivicSolveDB` or MongoDB Atlas Cluster) |
| **AI / ML** | Ollama Vision (LLaVA) + Offline-Safe Heuristic Rule Engine |
| **Security** | Helmet, Express Rate Limit, JWT, bcryptjs, Input sanitization, Privacy-safe geospatial projections |

---

## 📋 System Prerequisites

1. **Node.js 18+** — [Download Node.js](https://nodejs.org)
2. **MongoDB Community Server** (or MongoDB Atlas URI) running on `127.0.0.1:27017`
3. *(Optional)* **Ollama** for local vision model inference:
   ```bash
   ollama pull llava
   ollama serve        # Runs on http://127.0.0.1:11434
   ```

---

## ⚡ Quick Start & Installation

### Step 1: Clone and Configure Backend
```bash
cd backend
npm install
cp .env.example .env
```
Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Paste the generated secret into `backend/.env`.

### Step 2: Seed Departments and Hackathon Demo Accounts
```bash
npm run seed:civicsolve
```
*Creates all municipal departments (`PWD`, `WATER`, `ELECTRICITY`, `DISASTER`, `MUNICIPAL`, `MPCB`) and pre-seeds demo accounts and realistic civic issues across all lifecycle stages.*

### Step 3: Start the Backend API
```bash
npm run dev
# Server listening on http://localhost:5000
```

### Step 4: Start Frontend Dev Server
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
# Application live on http://localhost:5173
```

---

## 🧪 Evaluation & Demo Credentials

Use these pre-seeded accounts with password `DemoPass123`:

| Role | Email | Password | Department / Description |
|---|---|---|---|
| **Senior Officer** | `senior.sharma@civicsolve.gov` | `DemoPass123` | Municipal Corporation (Full dispatch & oversight) |
| **Roads Officer** | `officer.pwd@civicsolve.gov` | `DemoPass123` | Public Works Department (PWD - Roads & Bridges) |
| **Sanitation Officer** | `officer.sanitation@civicsolve.gov` | `DemoPass123` | Municipal Corporation (Solid Waste & Sanitation) |
| **Water Board Officer**| `officer.water@civicsolve.gov` | `DemoPass123` | Water Supply & Sewerage Drainage Board |
| **System Admin** | `admin@civicsolve.gov` | `DemoPass123` | Global Administration & Master Control |
| **Citizen** | `citizen.aarav@gmail.com` | `DemoPass123` | Citizen Reporter & Verification account |

---

## 🎯 Hackathon Live Demo Scenario (Judge Walkthrough)

To experience the full journey in under 3 minutes:

1. **Explore the Landing Page (`http://localhost:5173`)**:
   - Scroll through live database statistics.
   - Test the **Live AI Civic Scanner** interactive widget: click the preset *"Critical: Open Manhole"* and hit **Analyze Grievance with AI** to view real-time triage.
2. **Submit a Grievance (`/report`)**:
   - Enter title: *"Deep crater pothole near Hinjewadi junction"*.
   - Click **✨ AI Auto-Classify** to watch the form auto-populate category, priority, and hazard flags.
   - Choose a location on the map pin or use browser GPS.
3. **Inspect the Civic Map (`/map`)**:
   - Toggle between **Map View** and **List View**.
   - Filter by category (`POTHOLES_ROAD_DAMAGE`) or priority (`CRITICAL`).
4. **Authority Dispatch & Smart Matching (`/portal`)**:
   - Log in as **Senior Officer** (`senior.sharma@civicsolve.gov` / `DemoPass123`).
   - Open complaint **`CS-2026-DEMO01`**.
   - Review the **AI Problem Triage & Hazard Analysis** panel.
   - Scroll to **Smart Responder Matching**: observe candidate scores (e.g. Anil Deshmukh with 90% score and breakdown: Category 35%, Proximity 28%, Workload 17%, Role Fit 10%).
   - Click **Assign Officer** to execute instant dispatch.
5. **Resolution & Evidence Check**:
   - Log in as the assigned officer (`officer.pwd@civicsolve.gov`), inspect assigned complaints, and view the EXIF/GPS evidence verification gate.
6. **Community Impact & Transparency (`/transparency`)**:
   - View resolution rates, reopen frequencies, and department workload distributions derived from database records.

---

## 🔒 Security, Privacy & Responsible AI

- **No Fabricated Statistics**: All metrics and analytics reflect database state. Empty states are displayed when no data exists.
- **Privacy-Safe Public Projections**: Public map and complaint endpoints obscure exact citizen identities and contact details.
- **EXIF Verification as Advisory**: Photos are checked for valid capture time and distance radius, but metadata is never treated as unfalsifiable proof.
- **Human-in-the-Loop Safeguards**: AI recommendations never automatically close or resolve a complaint. Only citizen confirmation can transition an issue to `RESOLVED_CITIZEN_CONFIRMED`.
- **Zero Exposed Secrets**: Sensitive keys and tokens are managed via environment variables and never logged or exposed to the client.

---

## 🧪 Testing Suite

### Unit & API Tests (No external database required)
```bash
cd backend
npm test
# Runs 6 test suites with 61 tests (including civicAi.test.js)
```

### Full Integration Test Suite (Real MongoDB)
```bash
cd backend
npm run test:integration
# Runs 12 end-to-end lifecycle integration tests
```

### Frontend Production Build Validation
```bash
cd frontend
npm run build
# Compiles React app into production bundle in frontend/dist
```

---

## 📄 License
This project is open-source under the MIT License. Developed for the National Civic Technology Innovation Challenge.
