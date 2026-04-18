"""
CricketIQ — ML Pipeline
Ensemble: Logistic Regression + Random Forest + XGBoost + LightGBM
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import xgboost as xgb
import lightgbm as lgb
import pickle, json, warnings
warnings.filterwarnings('ignore')

# ─────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────
def load_data(matches_path, deliveries_path):
    matches = pd.read_csv(matches_path)
    deliveries = pd.read_csv(deliveries_path)
    matches = matches.dropna(subset=['winner'])
    matches['date'] = pd.to_datetime(matches['date'])
    return matches.sort_values('date').reset_index(drop=True), deliveries

# ─────────────────────────────────────────
# FEATURE ENGINEERING
# ─────────────────────────────────────────
def engineer_features(matches, deliveries):
    # Toss features
    matches['toss_won_by_team1'] = (matches['toss_winner'] == matches['team1']).astype(int)
    matches['toss_bat_decision'] = (matches['toss_decision'] == 'bat').astype(int)

    # H2H win rate
    def h2h(df):
        rates = []
        for i, row in df.iterrows():
            past = df[(df.index < i) & (
                ((df['team1'] == row['team1']) & (df['team2'] == row['team2'])) |
                ((df['team1'] == row['team2']) & (df['team2'] == row['team1']))
            )]
            rates.append(past[past['winner'] == row['team1']].shape[0] / len(past) if len(past) else 0.5)
        return rates
    matches['h2h_team1_win_rate'] = h2h(matches)

    # Team form (last 5)
    def form(df, col, n=5):
        f = []
        for i, row in df.iterrows():
            team = row[col]
            past = df[(df.index < i) & ((df['team1'] == team) | (df['team2'] == team))].tail(n)
            f.append(past[past['winner'] == team].shape[0] / len(past) if len(past) else 0.5)
        return f
    matches['team1_form'] = form(matches, 'team1')
    matches['team2_form'] = form(matches, 'team2')

    # Venue win rate for team1
    matches['venue_team1_win_rate'] = 0.5
    for i, row in matches.iterrows():
        past = matches[(matches.index < i) & (matches['venue'] == row['venue']) &
                       ((matches['team1'] == row['team1']) | (matches['team2'] == row['team1']))]
        if len(past) > 0:
            matches.at[i, 'venue_team1_win_rate'] = past[past['winner'] == row['team1']].shape[0] / len(past)

    # Venue avg score
    m2 = deliveries.merge(matches[['id', 'venue']], left_on='match_id', right_on='id')
    scores = m2.groupby(['match_id', 'batting_team', 'venue'])['total_runs'].sum().reset_index()
    avg = scores.groupby(['batting_team', 'venue'])['total_runs'].mean().to_dict()
    matches['team1_venue_avg_score'] = matches.apply(lambda r: avg.get((r['team1'], r['venue']), 150), axis=1)
    matches['team2_venue_avg_score'] = matches.apply(lambda r: avg.get((r['team2'], r['venue']), 150), axis=1)

    # Season + city encodings
    matches['season_num'] = pd.Categorical(matches['season'], ordered=True).codes
    le_city = LabelEncoder()
    matches['city_enc'] = le_city.fit_transform(matches['city'].fillna('Unknown'))

    # Target
    matches['target'] = (matches['winner'] == matches['team1']).astype(int)

    FEATURES = ['toss_won_by_team1', 'toss_bat_decision', 'h2h_team1_win_rate',
                'team1_form', 'team2_form', 'venue_team1_win_rate',
                'team1_venue_avg_score', 'team2_venue_avg_score', 'season_num', 'city_enc']
    return matches[FEATURES].values, matches['target'].values, le_city, FEATURES

# ─────────────────────────────────────────
# MODEL TRAINING
# ─────────────────────────────────────────
def train(X, y):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    estimators = [
        ('lr',  LogisticRegression(max_iter=1000, C=0.5, random_state=42)),
        ('rf',  RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=5, random_state=42)),
        ('xgb', xgb.XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.03,
                                   subsample=0.8, colsample_bytree=0.8,
                                   use_label_encoder=False, eval_metric='logloss', random_state=42)),
        ('lgb', lgb.LGBMClassifier(n_estimators=300, max_depth=4, learning_rate=0.03,
                                    num_leaves=31, subsample=0.8, verbose=-1, random_state=42)),
    ]
    ensemble = VotingClassifier(estimators=estimators, voting='soft', weights=[1,2,2,2])
    ensemble.fit(X_train, y_train)
    y_pred = ensemble.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cv = cross_val_score(ensemble, X, y, cv=5, scoring='accuracy')
    print(f"Test Accuracy:  {acc:.4f}")
    print(f"CV Accuracy:    {cv.mean():.4f} ± {cv.std():.4f}")
    print(classification_report(y_test, y_pred, target_names=['Team2 Wins', 'Team1 Wins']))
    return ensemble, acc

# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
if __name__ == '__main__':
    import sys
    matches_path = sys.argv[1] if len(sys.argv) > 1 else 'matches.csv'
    deliveries_path = sys.argv[2] if len(sys.argv) > 2 else 'deliveries.csv'

    print("Loading data...")
    matches, deliveries = load_data(matches_path, deliveries_path)
    print(f"Matches: {len(matches)}")

    print("Engineering features...")
    X, y, le_city, feature_names = engineer_features(matches, deliveries)

    print("Training ensemble model...")
    model, acc = train(X, y)

    print("Saving artifacts...")
    with open('model.pkl', 'wb') as f: pickle.dump(model, f)
    with open('le_city.pkl', 'wb') as f: pickle.dump(le_city, f)
    with open('feature_names.json', 'w') as f: json.dump(feature_names, f)
    print(f"✅ Done! Accuracy: {acc:.4f}")
