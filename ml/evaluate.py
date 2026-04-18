"""
CricketIQ — ML Model Evaluation
Generates a full diagnostics report: accuracy, AUC, confusion matrix,
learning curves, calibration, and per-team accuracy breakdown.

Usage:
    python ml/evaluate.py
    python ml/evaluate.py --matches=data/matches.csv --deliveries=data/deliveries.csv
"""

import sys, os, json, warnings, argparse
import numpy  as np
import pandas as pd
import pickle
from pathlib import Path

warnings.filterwarnings('ignore')

# ─── Try optional imports ───────────────────────────────────────────────────
try:
    from sklearn.metrics import (
        accuracy_score, classification_report, roc_auc_score,
        confusion_matrix, brier_score_loss, log_loss
    )
    from sklearn.calibration import calibration_curve
    from sklearn.model_selection import cross_val_score, StratifiedKFold
    SKLEARN = True
except ImportError:
    SKLEARN = False
    print("⚠  scikit-learn not installed — running basic evaluation only")

BASE = Path(__file__).parent

# ─── Argument parsing ───────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description='CricketIQ Model Evaluator')
parser.add_argument('--matches',     default=str(BASE.parent / 'data' / 'matches.csv'))
parser.add_argument('--deliveries',  default=str(BASE.parent / 'data' / 'deliveries.csv'))
parser.add_argument('--model',       default=str(BASE / 'model.pkl'))
parser.add_argument('--output',      default=str(BASE / 'evaluation_report.json'))
args = parser.parse_args()

print('\n🏏 CricketIQ — Model Evaluation\n' + '='*52)

# ─── Load artefacts ─────────────────────────────────────────────────────────
if not Path(args.model).exists():
    print(f'❌  Model not found at {args.model}')
    print('   Run python ml/train_model.py first.')
    sys.exit(1)

with open(args.model, 'rb') as f:
    model = pickle.load(f)

le_path = BASE / 'le_city.pkl'
if le_path.exists():
    with open(le_path, 'rb') as f:
        le_city = pickle.load(f)
else:
    le_city = None

print(f'✅  Model loaded: {type(model).__name__}')

# ─── Re-engineer features (same as train_model.py) ─────────────────────────
if not Path(args.matches).exists():
    print(f'⚠   matches.csv not found at {args.matches} — using stored results only')
    sys.exit(0)

print('   Loading data...')
matches    = pd.read_csv(args.matches)
deliveries = pd.read_csv(args.deliveries)
matches    = matches.dropna(subset=['winner'])
matches['date'] = pd.to_datetime(matches['date'])
matches    = matches.sort_values('date').reset_index(drop=True)

print(f'   {len(matches)} matches, {len(deliveries):,} deliveries')

# Feature engineering (copy of train_model.py logic — compact version)
def h2h_rate(df):
    rates = []
    for i, row in df.iterrows():
        past = df[(df.index < i) & (
            ((df['team1']==row['team1'])&(df['team2']==row['team2'])) |
            ((df['team1']==row['team2'])&(df['team2']==row['team1']))
        )]
        rates.append(past[past['winner']==row['team1']].shape[0]/len(past) if len(past) else 0.5)
    return rates

def form(df, col, n=5):
    f = []
    for i, row in df.iterrows():
        team = row[col]
        past = df[(df.index < i) & ((df['team1']==team)|(df['team2']==team))].tail(n)
        f.append(past[past['winner']==team].shape[0]/len(past) if len(past) else 0.5)
    return f

print('   Engineering features...')
matches['toss_won_by_team1']   = (matches['toss_winner']==matches['team1']).astype(int)
matches['toss_bat_decision']   = (matches['toss_decision']=='bat').astype(int)
matches['h2h_team1_win_rate']  = h2h_rate(matches)
matches['team1_form']          = form(matches,'team1')
matches['team2_form']          = form(matches,'team2')

matches['venue_team1_win_rate'] = 0.5
for i, row in matches.iterrows():
    past = matches[(matches.index < i) & (matches['venue']==row['venue']) &
                   ((matches['team1']==row['team1'])|(matches['team2']==row['team1']))]
    if len(past):
        matches.at[i,'venue_team1_win_rate'] = past[past['winner']==row['team1']].shape[0]/len(past)

m2     = deliveries.merge(matches[['id','venue']], left_on='match_id', right_on='id')
scores = m2.groupby(['match_id','batting_team','venue'])['total_runs'].sum().reset_index()
avg    = scores.groupby(['batting_team','venue'])['total_runs'].mean().to_dict()
matches['team1_venue_avg_score'] = matches.apply(lambda r: avg.get((r['team1'],r['venue']),150), axis=1)
matches['team2_venue_avg_score'] = matches.apply(lambda r: avg.get((r['team2'],r['venue']),150), axis=1)
matches['season_num']            = pd.Categorical(matches['season'], ordered=True).codes
if le_city:
    matches['city_enc'] = matches['city'].fillna('Unknown').apply(
        lambda c: int(le_city.transform([c])[0]) if c in le_city.classes_ else 0)
else:
    matches['city_enc'] = 0
matches['target'] = (matches['winner']==matches['team1']).astype(int)

FEATURES = ['toss_won_by_team1','toss_bat_decision','h2h_team1_win_rate',
            'team1_form','team2_form','venue_team1_win_rate',
            'team1_venue_avg_score','team2_venue_avg_score','season_num','city_enc']

X = matches[FEATURES].values
y = matches['target'].values

print('   Running evaluation...')

# ─── Evaluation ─────────────────────────────────────────────────────────────
report = {
    'model':          type(model).__name__,
    'n_samples':      int(len(X)),
    'n_features':     len(FEATURES),
    'feature_names':  FEATURES,
}

if SKLEARN:
    # 5-fold cross-validation
    cv   = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cvsc = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
    print(f'\n📊 Cross-Validation (5-fold):')
    print(f'   Accuracy: {cvsc.mean():.4f} ± {cvsc.std():.4f}')
    for i, s in enumerate(cvsc):
        print(f'   Fold {i+1}: {s:.4f}')

    # Hold-out (last 20%)
    split  = int(len(X) * 0.8)
    X_tr, X_te, y_tr, y_te = X[:split], X[split:], y[:split], y[split:]
    y_pred = model.predict(X_te)
    y_prob = model.predict_proba(X_te)[:, 1]

    acc   = accuracy_score(y_te, y_pred)
    auc   = roc_auc_score(y_te, y_prob)
    brier = brier_score_loss(y_te, y_prob)
    ll    = log_loss(y_te, y_prob)
    cm    = confusion_matrix(y_te, y_pred)

    print(f'\n📈 Hold-out Metrics (last 20% = {len(X_te)} matches):')
    print(f'   Accuracy:    {acc:.4f}  ({acc*100:.1f}%)')
    print(f'   AUC-ROC:     {auc:.4f}')
    print(f'   Brier Score: {brier:.4f}  (lower = better; random = 0.25)')
    print(f'   Log Loss:    {ll:.4f}')
    print(f'\n   Confusion Matrix:')
    print(f'              Pred Team2  Pred Team1')
    print(f'   True Team2   {cm[0][0]:6d}      {cm[0][1]:6d}')
    print(f'   True Team1   {cm[1][0]:6d}      {cm[1][1]:6d}')
    print(f'\n{classification_report(y_te, y_pred, target_names=["Team2 Wins","Team1 Wins"])}')

    # Per-team accuracy
    print('📊 Per-team accuracy (as team1):')
    team_acc = {}
    te_matches = matches.iloc[split:].copy()
    te_matches['pred'] = y_pred
    for team in sorted(matches['team1'].unique()):
        tm = te_matches[te_matches['team1'] == team]
        if len(tm) < 3: continue
        a = accuracy_score(tm['target'], tm['pred'])
        team_acc[team] = round(float(a), 3)
        print(f'   {team:<35s}  {a:.3f}  (n={len(tm)})')

    # Calibration
    frac_pos, mean_pred = calibration_curve(y_te, y_prob, n_bins=8, strategy='uniform')
    calibration = [{'mean_pred': round(float(mp), 3), 'frac_pos': round(float(fp), 3)}
                   for mp, fp in zip(mean_pred, frac_pos)]

    report.update({
        'cv_accuracy_mean': round(float(cvsc.mean()), 4),
        'cv_accuracy_std':  round(float(cvsc.std()),  4),
        'cv_folds':         list(map(lambda x: round(float(x),4), cvsc)),
        'holdout_accuracy': round(float(acc), 4),
        'holdout_auc':      round(float(auc), 4),
        'brier_score':      round(float(brier), 4),
        'log_loss':         round(float(ll), 4),
        'confusion_matrix': cm.tolist(),
        'team_accuracy':    team_acc,
        'calibration':      calibration,
    })

# Season-by-season accuracy
print('\n📅 Season-by-season accuracy:')
season_acc = {}
for season in sorted(matches['season'].unique()):
    sm = matches[matches['season'] == season]
    if len(sm) < 5: continue
    Xs = sm[FEATURES].values
    ys = sm['target'].values
    yp = model.predict(Xs)
    a  = accuracy_score(ys, yp)
    season_acc[season] = round(float(a), 3)
    print(f'   {season}: {a:.3f}  (n={len(sm)})')

report['season_accuracy'] = season_acc

# ─── Save report ────────────────────────────────────────────────────────────
with open(args.output, 'w') as f:
    json.dump(report, f, indent=2)

print(f'\n✅  Evaluation report saved → {args.output}')
print('='*52)
