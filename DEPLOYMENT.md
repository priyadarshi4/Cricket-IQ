# 🚀 CricketIQ — Deployment Guide

## Option A: Local Development (fastest)

```bash
# 1. Clone and enter project
git clone <your-repo> cricketiq && cd cricketiq

# 2. One-command start
bash start.sh dev
```

Opens:
- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:5000/api
- **Admin Panel** → open `admin/index.html` in browser

---

## Option B: Docker (recommended for production)

```bash
# Build and start all 5 services
docker-compose up --build -d

# View logs
docker-compose logs -f backend
docker-compose logs -f ml-service

# Stop
docker-compose down
```

Services started:
| Service    | Port | Description                          |
|------------|------|--------------------------------------|
| nginx      | 80   | Reverse proxy (routes all traffic)   |
| frontend   | 3000 | React app (served via nginx)         |
| backend    | 5000 | Node.js API                          |
| ml-service | 8000 | Python FastAPI ML predictor          |
| mongo      | 27017| MongoDB (optional persistence)       |

---

## Option C: Cloud Deployment

### Frontend → Vercel (free tier)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Set environment variable in Vercel dashboard:
```
REACT_APP_API_URL = https://your-backend.onrender.com
```

### Backend → Render (free tier)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo → select `backend/` folder
4. Set:
   - **Build**: `npm install`
   - **Start**: `node server.js`
   - **Env vars**:
     ```
     NODE_ENV=production
     MONGODB_URI=mongodb+srv://...   # from MongoDB Atlas
     ADMIN_API_KEY=your-secret-key
     CORS_ORIGIN=https://your-app.vercel.app
     ```

### ML Service → Render (or Railway)

1. New Web Service → select `ml/` folder
2. Set:
   - **Build**: `pip install -r api/requirements.txt`
   - **Start**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### MongoDB → Atlas (free tier)

1. Create cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Get connection string → set as `MONGODB_URI` in backend env vars
3. Whitelist `0.0.0.0/0` for Render IP flexibility

---

## Data Pipeline

### Refresh data from new CSV files

```bash
# After downloading updated IPL dataset from Kaggle:
python scripts/build_data.py \
  --matches=data/matches.csv \
  --deliveries=data/deliveries.csv \
  --output=backend/data/cricket_data.json
```

### Retrain the ML model

```bash
cd ml
python train_model.py ../data/matches.csv ../data/deliveries.csv
# Outputs: model.pkl, le_city.pkl (copy to ml/ dir)
```

### Evaluate model performance

```bash
python ml/evaluate.py \
  --matches=data/matches.csv \
  --deliveries=data/deliveries.csv
# Outputs: ml/evaluation_report.json
```

### Seed MongoDB from CSV

```bash
cd backend
MONGODB_URI=mongodb://localhost:27017/cricketiq node seed.js \
  --matches=../data/matches.csv
```

---

## Backend Tests

```bash
cd backend
npm test
# Runs 15 tests: data validation, prediction engine, middleware, routes, models
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable         | Required | Default   | Description                         |
|------------------|----------|-----------|-------------------------------------|
| `PORT`           | No       | 5000      | Server port                         |
| `NODE_ENV`       | No       | development | `production` disables stack traces |
| `MONGODB_URI`    | No       | —         | MongoDB connection string           |
| `CORS_ORIGIN`    | No       | `*`       | Frontend URL for CORS               |
| `ADMIN_API_KEY`  | No       | —         | API key for `/api/admin/*` routes   |
| `ML_API_URL`     | No       | —         | Python ML service URL               |

### Frontend (`frontend/.env`)

| Variable              | Required | Default                     | Description      |
|-----------------------|----------|-----------------------------|------------------|
| `REACT_APP_API_URL`   | No       | `http://localhost:5000`     | Backend API URL  |

---

## API Quick Reference

```bash
# Health check
curl http://localhost:5000/api/health

# Predict a match
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "team1": "Mumbai Indians",
    "team2": "Chennai Super Kings",
    "venue": "Wankhede Stadium",
    "tossWinner": "Mumbai Indians",
    "tossDecision": "bat"
  }'

# Get all teams
curl http://localhost:5000/api/teams

# Leaderboard
curl http://localhost:5000/api/leaderboard

# Head-to-head
curl "http://localhost:5000/api/h2h?team1=Mumbai+Indians&team2=CSK"

# ML service
curl http://localhost:8000/health
curl http://localhost:8000/model-info
```

---

## Monitoring

The admin panel at `admin/index.html` provides:
- Real-time API status
- Prediction log with accuracy tracking
- Model performance metrics
- Retrain controls
- System logs

---

## Project Structure

```
cricketiq/
├── backend/          Node.js + Express API
│   ├── data/         cricket_data.json (compiled IPL stats)
│   ├── models/       MongoDB schemas (Match, Prediction, Player)
│   ├── routes/       predict.js · stats.js · admin.js
│   ├── middleware/   rate limiter · logger · auth · error handler
│   ├── tests/        run.js (15 backend tests)
│   ├── seed.js       CSV → MongoDB importer
│   └── server.js     main entry point
│
├── frontend/         React 18 SPA
│   ├── public/       index.html · manifest.json · service-worker.js
│   └── src/
│       ├── pages/    Home · Predict · Teams · Players · Analytics · Live · History
│       ├── components/ TeamBadge · MatchCard · StatCard · WinGauge · SearchBar
│       ├── context/  PredictionHistory · ToastContext
│       ├── hooks/    useApi · usePrediction · useLocalStorage · useUtils
│       └── utils/    api.js · constants.js · prediction.js
│
├── ml/               Python ML pipeline
│   ├── train_model.py  Ensemble training (RF+XGB+LGB+LR)
│   ├── evaluate.py     Full model evaluation + per-team accuracy
│   ├── model.pkl       Trained ensemble model
│   └── api/
│       ├── main.py     FastAPI ML microservice
│       └── requirements.txt
│
├── admin/            Standalone admin dashboard (no build needed)
│   └── index.html    Open in any browser
│
├── docker/           Container configs
│   ├── docker-compose.yml
│   ├── Dockerfile.{backend,frontend,ml}
│   └── nginx.conf
│
└── scripts/
    └── build_data.py   Rebuild cricket_data.json from raw CSVs
```
