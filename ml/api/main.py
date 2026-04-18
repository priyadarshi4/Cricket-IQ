"""
CricketIQ — FastAPI ML Service
Serves the trained ensemble model via REST.
Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import pickle, json, os, logging, time
import numpy as np
import pandas as pd
from pathlib import Path

# ─── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("cricketiq-ml")

# ─── App ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CricketIQ ML Service",
    description="Ensemble ML prediction engine for IPL match outcomes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model loading ─────────────────────────────────────────────────────────
BASE = Path(__file__).parent
MODEL_PATH = BASE / "model.pkl"
LE_PATH    = BASE / "le_city.pkl"
DATA_PATH  = BASE.parent / "backend" / "data" / "cricket_data.json"

_model    = None
_le_city  = None
_data     = None
_load_time = None

def load_artifacts():
    global _model, _le_city, _data, _load_time
    t = time.time()
    with open(MODEL_PATH, "rb") as f: _model   = pickle.load(f)
    with open(LE_PATH,    "rb") as f: _le_city = pickle.load(f)
    with open(DATA_PATH,  "r")  as f: _data    = json.load(f)
    _load_time = time.time() - t
    log.info(f"✅ Artifacts loaded in {_load_time:.2f}s")

# Load on startup
@app.on_event("startup")
async def startup():
    try:
        load_artifacts()
    except FileNotFoundError as e:
        log.warning(f"Model file not found: {e}. Running in rule-based fallback mode.")

# ─── Schemas ───────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    team1:         str                  = Field(..., example="Mumbai Indians")
    team2:         str                  = Field(..., example="Chennai Super Kings")
    venue:         Optional[str]        = Field("Wankhede Stadium")
    city:          Optional[str]        = Field("Mumbai")
    toss_winner:   Optional[str]        = Field(None)
    toss_decision: Optional[str]        = Field("bat")   # bat | field
    match_type:    Optional[str]        = Field("league") # league | playoff | final
    season:        Optional[str]        = Field("2024")

class Factor(BaseModel):
    label:  str
    impact: str   # positive | negative | neutral
    value:  str
    weight: float
    icon:   str

class PredictResponse(BaseModel):
    team1:                 str
    team2:                 str
    team1_win_probability: int
    team2_win_probability: int
    predicted_winner:      str
    confidence:            int
    key_factors:           List[Factor]
    model_breakdown:       Dict[str, float]
    feature_importance:    Dict[str, float]
    model_used:            str
    inference_ms:          float

# ─── Feature engineering ───────────────────────────────────────────────────
def engineer_features(req: PredictRequest) -> np.ndarray:
    """
    Reproduce the same 10 features used during training.
    Falls back to sensible defaults when historical data is missing.
    """
    d  = _data
    ts = d.get("team_stats", {})
    s1 = ts.get(req.team1, {"win_rate": 50, "avg_score": 155})
    s2 = ts.get(req.team2, {"win_rate": 50, "avg_score": 155})

    # 1. Toss advantage
    toss_winner   = req.toss_winner or req.team1
    toss_won_t1   = float(toss_winner == req.team1)
    toss_bat      = float(req.toss_decision == "bat")

    # 2. H2H win rate
    k1 = f"{req.team1}|{req.team2}"
    k2 = f"{req.team2}|{req.team1}"
    h2h = d.get("h2h", {}).get(k1) or d.get("h2h", {}).get(k2)
    if h2h and h2h.get("total", 0) > 0:
        t1wins = h2h["t1_wins"] if k1 in d.get("h2h", {}) else h2h["t2_wins"]
        h2h_rate = t1wins / h2h["total"]
    else:
        h2h_rate = 0.5

    # 3. Recent form (last 5 from recent_matches)
    recent = d.get("recent_matches", [])
    def form(team):
        tm = [m for m in recent if m.get("team1") == team or m.get("team2") == team][-5:]
        return sum(1 for m in tm if m.get("winner") == team) / len(tm) if tm else 0.5
    f1, f2 = form(req.team1), form(req.team2)

    # 4. Venue win rate
    vm = [m for m in recent if m.get("venue") == req.venue]
    t1vm = [m for m in vm if m.get("team1") == req.team1 or m.get("team2") == req.team1]
    venue_wr = sum(1 for m in t1vm if m.get("winner") == req.team1) / len(t1vm) if t1vm else 0.5

    # 5. Venue avg scores
    all_venues = d.get("venue_stats", [])
    t1_avg = s1.get("avg_score", 155)
    t2_avg = s2.get("avg_score", 155)

    # 6. Season num (proxy)
    try:    season_num = int(str(req.season)[:4]) - 2008
    except: season_num = 10

    # 7. City encoding
    city = req.city or "Unknown"
    try:    city_enc = int(_le_city.transform([city])[0])
    except: city_enc = 0

    return np.array([[
        toss_won_t1, toss_bat, h2h_rate,
        f1, f2, venue_wr,
        t1_avg, t2_avg,
        season_num, city_enc
    ]], dtype=float)

# ─── Rule-based fallback (no model loaded) ─────────────────────────────────
def rule_based_predict(req: PredictRequest) -> dict:
    d  = _data or {}
    ts = d.get("team_stats", {})
    s1 = ts.get(req.team1, {"win_rate": 50, "avg_score": 155})
    s2 = ts.get(req.team2, {"win_rate": 50, "avg_score": 155})
    k1 = f"{req.team1}|{req.team2}"
    k2 = f"{req.team2}|{req.team1}"
    h2h_raw = (d.get("h2h") or {}).get(k1) or (d.get("h2h") or {}).get(k2)
    h2h_rate = 0.5
    if h2h_raw and h2h_raw.get("total", 0) > 0:
        t1w = h2h_raw["t1_wins"] if k1 in (d.get("h2h") or {}) else h2h_raw["t2_wins"]
        h2h_rate = t1w / h2h_raw["total"]
    score_pow = s1.get("avg_score", 155) / (s1.get("avg_score", 155) + s2.get("avg_score", 155))
    wr_comp   = s1.get("win_rate", 50)   / (s1.get("win_rate", 50)   + s2.get("win_rate", 50))
    raw  = h2h_rate * 0.30 + score_pow * 0.35 + wr_comp * 0.35
    logit = (raw - 0.5) * 6
    p1 = min(0.84, max(0.16, 1 / (1 + np.exp(-logit))))
    return p1, "rule-based-fallback"

# ─── Main prediction endpoint ──────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    t_start = time.perf_counter()

    if req.team1 == req.team2:
        raise HTTPException(400, "Teams must be different")

    # Run model (or fallback)
    if _model is not None:
        try:
            X   = engineer_features(req)
            p1  = float(_model.predict_proba(X)[0][1])
            model_used = "ensemble-rf-xgb-lgb-lr"
        except Exception as e:
            log.warning(f"Model inference failed: {e}. Using fallback.")
            p1, model_used = rule_based_predict(req)
    else:
        p1, model_used = rule_based_predict(req)

    p1   = min(0.84, max(0.16, p1))
    conf = min(97, int(50 + abs(p1 - 0.5) * 100))

    # Build factors
    d  = _data or {}
    ts = d.get("team_stats", {})
    s1 = ts.get(req.team1, {"win_rate": 50, "avg_score": 155})
    s2 = ts.get(req.team2, {"win_rate": 50, "avg_score": 155})

    factors: List[Factor] = []
    k1 = f"{req.team1}|{req.team2}"
    k2 = f"{req.team2}|{req.team1}"
    h2h_raw = (d.get("h2h") or {}).get(k1) or (d.get("h2h") or {}).get(k2)
    if h2h_raw and h2h_raw.get("total", 0) > 0:
        t1w = h2h_raw["t1_wins"] if k1 in (d.get("h2h") or {}) else h2h_raw["t2_wins"]
        hr  = t1w / h2h_raw["total"]
        if hr > 0.55:
            factors.append(Factor(label="Head-to-Head Dominance", impact="positive", value=f"{round(hr*100)}% H2H win rate", weight=20, icon="⚔️"))
        elif hr < 0.45:
            factors.append(Factor(label="H2H Disadvantage", impact="negative", value=f"Only {round(hr*100)}% H2H wins", weight=20, icon="⚔️"))

    if s1.get("avg_score", 155) > s2.get("avg_score", 155) + 5:
        factors.append(Factor(label="Batting Firepower Lead", impact="positive",
            value=f"Avg {round(s1['avg_score'])} vs {round(s2['avg_score'])}", weight=22, icon="🏏"))
    elif s2.get("avg_score", 155) > s1.get("avg_score", 155) + 5:
        factors.append(Factor(label="Lower Batting Firepower", impact="negative",
            value=f"Avg {round(s1['avg_score'])} vs {round(s2['avg_score'])}", weight=22, icon="🏏"))

    if s1.get("win_rate", 50) > s2.get("win_rate", 50) + 4:
        factors.append(Factor(label="Historical Win Rate Lead", impact="positive",
            value=f"{s1['win_rate']}% vs {s2['win_rate']}%", weight=18, icon="📈"))
    elif s2.get("win_rate", 50) > s1.get("win_rate", 50) + 4:
        factors.append(Factor(label="Lower Historical Win Rate", impact="negative",
            value=f"{s1['win_rate']}% vs {s2['win_rate']}%", weight=18, icon="📈"))

    toss_winner = req.toss_winner or req.team1
    if toss_winner == req.team1:
        bat = req.toss_decision == "bat"
        factors.append(Factor(label=f"Toss Win — {'Batting' if bat else 'Fielding'}", impact="positive",
            value="Setting target" if bat else "Chasing", weight=7, icon="🪙"))

    inf_ms = (time.perf_counter() - t_start) * 1000

    return PredictResponse(
        team1                 = req.team1,
        team2                 = req.team2,
        team1_win_probability = round(p1 * 100),
        team2_win_probability = round((1 - p1) * 100),
        predicted_winner      = req.team1 if p1 >= 0.5 else req.team2,
        confidence            = conf,
        key_factors           = factors[:5],
        model_breakdown       = {
            "h2h_rate":    round((h2h_raw["t1_wins"]/h2h_raw["total"] if h2h_raw and h2h_raw.get("total") else 0.5) * 100, 1),
            "score_power": round(s1.get("avg_score",155) / (s1.get("avg_score",155)+s2.get("avg_score",155)) * 100, 1),
            "win_rate":    round(s1.get("win_rate",50) / (s1.get("win_rate",50)+s2.get("win_rate",50)) * 100, 1),
        },
        feature_importance    = d.get("feature_importance", {}),
        model_used            = model_used,
        inference_ms          = round(inf_ms, 2),
    )

# ─── Live ball-by-ball simulation ──────────────────────────────────────────
class SimRequest(BaseModel):
    team1:       str
    team2:       str
    inning:      int   = 1          # 1 or 2
    over:        int   = 0          # 0-19
    ball:        int   = 0          # 0-5
    runs_scored: int   = 0
    wickets:     int   = 0
    target:      Optional[int] = None

@app.post("/simulate")
async def simulate(req: SimRequest):
    """
    Update win probability as a match progresses ball-by-ball.
    Uses a Duckworth-Lewis-style linear model.
    """
    balls_remaining = (20 - req.over) * 6 - req.ball
    balls_total     = 120

    if req.inning == 1:
        # First innings: project final score and compute win prob
        if req.over == 0 and req.ball == 0:
            rr = 8.5
        else:
            balls_used = req.over * 6 + req.ball
            rr = req.runs_scored / balls_used * 6 if balls_used > 0 else 8.5
        projected   = req.runs_scored + (rr * balls_remaining / 6)
        p1_batting  = min(0.82, max(0.18, 0.35 + (projected - 155) * 0.004 - req.wickets * 0.03))
    else:
        # Second innings: chase analysis
        target      = req.target or 170
        runs_needed = target - req.runs_scored
        wrr         = runs_needed / (balls_remaining / 6) if balls_remaining > 0 else 99
        # Winning if on track (WRR < current achievable ~8.5) and wickets in hand
        wickets_rem = 10 - req.wickets
        p1_batting  = min(0.88, max(0.05,
            0.5 + (8.5 - wrr) * 0.06 + (wickets_rem - 5) * 0.025
        ))
        p1_batting  = 1 - p1_batting   # team1 = bowling in inning 2 here means team1 set target

    conf = min(95, int(50 + abs(p1_batting - 0.5) * 110))

    return {
        "team1_win_probability": round(p1_batting * 100),
        "team2_win_probability": round((1 - p1_batting) * 100),
        "confidence": conf,
        "inning": req.inning,
        "over": req.over,
        "ball": req.ball,
        "runs_scored": req.runs_scored,
        "wickets": req.wickets,
        "balls_remaining": balls_remaining,
        "required_run_rate": round((req.target - req.runs_scored) / (balls_remaining / 6), 2) if req.inning == 2 and balls_remaining > 0 and req.target else None,
    }

# ─── Model info ─────────────────────────────────────────────────────────────
@app.get("/model-info")
def model_info():
    return {
        "model_loaded":    _model is not None,
        "load_time_s":     round(_load_time or 0, 3),
        "model_type":      "VotingClassifier (RF + XGB + LGB + LR)" if _model else "rule-based",
        "accuracy":        0.587,
        "features":        ["toss_won_by_team1","toss_bat_decision","h2h_win_rate","team1_form",
                            "team2_form","venue_win_rate","team1_venue_avg","team2_venue_avg",
                            "season_num","city_enc"],
        "training_data":   "1,095 IPL matches (2008–2024)",
        "version":         "1.0.0",
    }

@app.get("/health")
def health():
    return {"status": "ok", "model": "loaded" if _model else "fallback", "service": "CricketIQ ML"}
