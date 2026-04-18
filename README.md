# 🏏 CricketIQ — AI-Powered IPL Match Prediction System

A production-ready, full-stack cricket analytics platform built with **MERN stack** and an **Ensemble ML model** trained on 17 seasons of real IPL data.

---

## 🎯 Overview

CricketIQ predicts IPL match outcomes using machine learning trained on:
- **1,095 matches** (2008–2024, 17 seasons)
- **260,920 ball-by-ball deliveries**
- **Ensemble model**: Random Forest + XGBoost + LightGBM + Logistic Regression
- **Model accuracy**: 58.7% (realistic for cricket — the sport is inherently stochastic)

---

## 🗂 Project Structure

```
cricketiq/
├── backend/                  # Node.js + Express API
│   ├── server.js             # Main server with prediction engine
│   ├── data/
│   │   └── cricket_data.json # Compiled IPL dataset (all stats)
│   └── package.json
│
├── frontend/                 # React app (mobile-first)
│   ├── public/index.html
│   ├── src/
│   │   ├── App.js            # Router + Nav + Ticker
│   │   ├── App.css           # Global dark theme
│   │   ├── pages/
│   │   │   ├── HomePage.js   # Landing + leaderboard
│   │   │   ├── PredictPage.js# Full prediction UI
│   │   │   ├── TeamsPage.js  # Team stats + season charts
│   │   │   ├── PlayersPage.js# Batting/bowling tables
│   │   │   └── AnalyticsPage.js # All dashboards
│   │   └── utils/
│   │       ├── api.js        # Axios API client
│   │       ├── constants.js  # All IPL data embedded
│   │       └── prediction.js # Client-side ML prediction engine
│   └── package.json
│
└── ml/
    └── train_model.py        # Full ML training pipeline
```

---
## ⚡ Quick Start

### 1. Backend
```bash
cd cricketiq/backend
npm install
node server.js
# API runs on http://localhost:5000
```

### 2. Frontend
```bash
cd cricketiq/frontend
npm install
npm start
# App runs on http://localhost:3000
```

### 3. Retrain ML Model
```bash
cd cricketiq/ml
pip install pandas scikit-learn xgboost lightgbm
python train_model.py ../data/matches.csv ../data/deliveries.csv
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict` | Predict match outcome |
| `GET`  | `/api/teams` | All team stats |
| `GET`  | `/api/team-stats/:name` | Single team detail |
| `GET`  | `/api/player-stats?type=batting` | Top batters/bowlers |
| `GET`  | `/api/head-to-head?team1=X&team2=Y` | H2H record |
| `GET`  | `/api/venue-stats` | Venue statistics |
| `GET`  | `/api/recent-matches` | Last 20 matches |
| `GET`  | `/api/leaderboard` | Top teams by win rate |
| `GET`  | `/api/season-performance` | Season-wise data |

### Prediction Request
```json
POST /api/predict
{
  "team1": "Mumbai Indians",
  "team2": "Chennai Super Kings",
  "venue": "Wankhede Stadium",
  "city": "Mumbai",
  "tossWinner": "Mumbai Indians",
  "tossDecision": "bat"
}
```

### Prediction Response
```json
{
  "success": true,
  "data": {
    "team1": "Mumbai Indians",
    "team2": "Chennai Super Kings",
    "team1WinProbability": 54,
    "team2WinProbability": 46,
    "confidence": 64,
    "predictedWinner": "Mumbai Indians",
    "keyFactors": [
      { "label": "Head-to-Head Dominance", "impact": "+", "value": "51% H2H wins", "weight": 22 }
    ],
    "modelBreakdown": { "h2h": 51, "scoring": 51, ... },
    "featureImportance": { ... }
  }
}
```

---

## 🧠 ML Model Details

### Features (10 engineered)
| Feature | Importance |
|---------|-----------|
| Team 2 Avg Score at Venue | 20.4% |
| Team 1 Avg Score at Venue | 18.7% |
| H2H Win Rate | 11.5% |
| Venue Win Rate | 11.2% |
| Season Context | 9.9% |
| City Factor | 9.8% |
| Team 1 Recent Form (5 matches) | 7.8% |
| Team 2 Recent Form (5 matches) | 6.3% |
| Toss Decision | 2.3% |
| Toss Advantage | 2.2% |

### Ensemble Architecture
```
Input Features → [LR + RF + XGB + LGB] → Soft Voting → Win Probability
                   ↑      ↑     ↑    ↑
                  w=1    w=2   w=2  w=2    (weights)
```

### Why 58.7% accuracy?
Cricket is fundamentally unpredictable — player form on the day, dropped catches, weather changes, powerplay performances all contribute randomness. 58.7% is significantly above random (50%) and is comparable to what professional analytics firms achieve on T20 prediction without live in-match data.

---

## 🎨 Frontend Pages

| Page | Features |
|------|---------|
| **Home** | Hero, stat overview, recent results, leaderboard, top performers |
| **Predict** | Team selector, conditions, probability circles, explainable factors, model breakdown |
| **Teams** | Franchise grid, season bar charts, win rate trends, H2H table |
| **Players** | Batting/bowling tables, player detail cards, bar charts |
| **Analytics** | Win rate bars, season trends, H2H radar, feature importance, pie chart |

---

## 🚀 Deployment

### Frontend → Vercel
```bash
cd frontend && npm run build
# Deploy /build to Vercel
```

### Backend → Render / Railway
- Set `PORT` environment variable
- Deploy `/backend` folder
- Set `NODE_ENV=production`

### Environment Variables
```
# Backend
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...  # Optional: for user data persistence

# Frontend
REACT_APP_API_URL=https://your-backend.onrender.com
```

---

## 📊 Data Sources

- **IPL Dataset**: Kaggle IPL Complete Dataset (2008–2024)
  - `matches.csv`: Match-level data (1,095 matches)
  - `deliveries.csv`: Ball-by-ball data (260,920 rows)

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Recharts, CSS Variables |
| Backend | Node.js, Express 4 |
| ML Training | Python, scikit-learn, XGBoost, LightGBM |
| Data | JSON (embedded), MongoDB (optional) |
| Deployment | Vercel (frontend), Render (backend) |

---

*Built with ❤️ for cricket analytics. Predictions are probabilistic estimates, not guarantees.*
