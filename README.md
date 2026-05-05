# PitWall — F1 Strategy Intelligence Platform

Lap-by-lap race strategy analysis. Tire degradation modeling. Undercut/overcut windows. Built for data science portfolios and F1 nerds.

---

## Modules (roadmap)

- [x] **Historical Strategy Replayer** — Gantt-style stint map + lap time chart + tire degradation
- [ ] **Live Race Tracker** — real-time pit window analysis (OpenF1 API)
- [ ] **Driver DNA Fingerprints** — per-driver telemetry radar charts
- [ ] **Championship Probability Engine** — Bayesian title odds model

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, TailwindCSS, D3.js |
| Backend | Python 3.11, FastAPI, FastF1 |
| Data | FastF1 (Ergast + F1 timing), OpenF1 API |
| ML | scikit-learn, scipy, numpy |
| DB | Supabase (Postgres) |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Local Setup

### 1. Backend

```bash
cd backend

# Create venv
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Copy env
cp .env.example .env
# Edit .env with your Supabase credentials (optional for local dev)

# Run
uvicorn app.main:app --reload --port 8000
```

The first time you fetch a race it will download data from FastF1 (can take 30–60s). After that it's cached at `FF1_CACHE_DIR`.

**API docs:** http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

**App:** http://localhost:3000

---

## API Endpoints

```
GET /races/seasons/{year}              — Season calendar
GET /races/{year}/{round}/laps         — Lap-by-lap data
GET /races/{year}/{round}/degradation  — Tire deg curves
GET /races/{year}/{round}/strategy     — Undercut analysis
```

---

## Deploy

### Backend → Railway

1. Push to GitHub
2. Create new Railway project → Deploy from GitHub
3. Set env vars: `FF1_CACHE_DIR`, `SUPABASE_URL`, `SUPABASE_KEY`
4. Railway auto-detects Python + `requirements.txt`
5. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

1. `vercel --prod` from `/frontend`
2. Set env var: `NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app`

---

## Project Structure

```
pitwall/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry
│   │   ├── routers/
│   │   │   └── races.py             # All race endpoints
│   │   └── services/
│   │       └── fastf1_service.py    # Data + ML logic
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx                 # Race selector
    │   └── race/[year]/[round]/     # Strategy replayer
    └── components/
        ├── StrategyTimeline.tsx     # Stint Gantt chart
        ├── LapChart.tsx             # Lap time D3 chart
        └── TireDegChart.tsx         # Degradation curves
```

---

## Next Steps (contributing to yourself)

1. **Add OpenF1 live data** — swap `fastf1_service` for real-time feed during race weekends
2. **Driver DNA module** — `GET /drivers/{driver}/fingerprint` using qualifying sector deltas
3. **Championship model** — Bayesian update with `scipy.stats` after each round
4. **Supabase caching** — persist parsed lap data to avoid re-fetching FastF1 every time
5. **What-if replayer** — "pit 1 lap earlier" counterfactual simulation
