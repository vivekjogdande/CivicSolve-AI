# RiverCare

River pollution reporting, monitoring and **citizen-verified resolution** platform, focused on the Indrayani River, Maharashtra, India.

- **Citizens** report pollution (with or without an account), track complaints, and decide whether a cleanup really happened.
- **Authorities** manage complaints, upload after-cleanup proof, and request citizen confirmation. They can never mark a complaint "citizen confirmed" themselves.
- **Public** can browse a privacy-safe pollution map and a transparency dashboard computed from real database records.

Stack: React + Vite, Leaflet/OpenStreetMap, Recharts · Express, Mongoose, MongoDB (`RiverCareDB`) · JWT + bcrypt · optional local Ollama vision model (LLaVA). No paid API keys.

## Project layout

```
backend/    Express API  (models, routes, controllers, middleware, services, utils, scripts, tests)
frontend/   React app    (pages, components, layouts, context, services, styles)
```

## Prerequisites

1. **Node.js 18+** — https://nodejs.org
2. **MongoDB** — either
   - local: install MongoDB Community Server, then `mongod` (default `mongodb://127.0.0.1:27017`), or
   - MongoDB Atlas: put the `mongodb+srv://...` string in `MONGODB_URI`.
3. **Ollama (optional)** — only for AI before/after comparison. The app works fully without it.
   ```
   ollama pull llava
   ollama serve        # listens on http://127.0.0.1:11434
   ```

## Setup and run

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # then edit: set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # use as JWT_SECRET
npm run seed                # creates departments + the first administrator (safe to repeat)
npm run dev                 # API on http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api and /uploads to :5000)
```

Production-style single server: `cd frontend && npm run build`, then `cd backend && npm start` — Express serves `frontend/dist` and the API on port 5000.

### Order to start services
1. MongoDB (`mongod`)  2. Ollama (`ollama serve`, optional)  3. backend (`npm run dev`)  4. frontend (`npm run dev`)

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (5000) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/RiverCareDB` or an Atlas URI |
| `JWT_SECRET` | **Required**, long random string |
| `JWT_EXPIRES_IN` | Token lifetime (default `2h`) |
| `CLIENT_ORIGIN` | Frontend origin for CORS |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin, used only by `npm run seed` |
| `RESOLUTION_CONFIRMATION_DAYS` | Citizen response window (7) |
| `EVIDENCE_RADIUS_METERS` | Max distance of proof photo from complaint (100) |
| `MAX_UPLOAD_SIZE_MB` | Upload limit (10) |
| `OLLAMA_BASE_URL`, `OLLAMA_VISION_MODEL`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_AUTO_COMPARE` | Local AI comparison |

Never commit `.env`; it is git-ignored.

## Roles and access

- **Citizen**: self-registers at `/citizen/register`.
- **Authority officer / senior officer**: cannot self-register. The **admin** creates these accounts in the Admin dashboard (`/admin`). Sign in via `/authority/login`.
- **Admin**: created by `npm run seed`.
- Anonymous reporters receive a complaint ID and a secret token (shown once; only its hash is stored) used to track and confirm/reject.

## Verified-resolution workflow

`SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → AWAITING_CITIZEN_CONFIRMATION → RESOLVED_CITIZEN_CONFIRMED`

- Officer must upload an after-photo. The server checks file type/signature, EXIF capture time (must be after the report) and GPS (within ~100 m). Invalid proof is rejected with a reason; unverifiable or suspicious proof is flagged for review (metadata can be forged, so it is never treated as proof of authenticity).
- Citizen **"Yes, it's fixed"** → `RESOLVED_CITIZEN_CONFIRMED`. **"No, still a problem"** (new photo + reason required) → `REOPENED`, reopen count +1, flagged for senior officer review. All attempts and photos are preserved.
- No response in 7 days → `CLOSED_UNCONFIRMED` (a scheduled job runs every 10 minutes and at startup). Never counted as confirmed.
- Community "Still polluted" observations never change a complaint's status.
- AI (Ollama) comparison is advisory only: `POLLUTION_REDUCED`, `POLLUTION_STILL_VISIBLE`, `UNCERTAIN`, `MODEL_UNAVAILABLE`.

## Tests

```bash
cd backend
npm test                                   # unit/API tests (no database needed)
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/RiverCareTest npm run test:integration   # full workflows on real MongoDB
```

The integration suite creates and drops a throw-away database.

## Metric definitions (transparency dashboard)

Computed over complaints created in the reporting period (default: all time).

- **Eligible** = complaints with a resolution attempt that is no longer awaiting the citizen.
- **Citizen-confirmed resolution rate** = confirmed ÷ eligible × 100.
- **Reopen rate** = complaints with ≥1 citizen-rejected attempt ÷ complaints with ≥1 resolution attempt × 100.
- **Unconfirmed closure rate** = closed-unconfirmed ÷ eligible × 100.

Rates show "no data" rather than a made-up number when the denominator is zero.
