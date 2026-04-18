#!/usr/bin/env python3
"""
CricketIQ — Data Pipeline
Rebuilds backend/data/cricket_data.json from raw CSV files.

Usage:
    python scripts/build_data.py
    python scripts/build_data.py --matches=path/to/matches.csv --deliveries=path/to/deliveries.csv
"""

import sys, json, argparse, warnings
import numpy  as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings('ignore')

parser = argparse.ArgumentParser()
parser.add_argument('--matches',     default='data/matches.csv')
parser.add_argument('--deliveries',  default='data/deliveries.csv')
parser.add_argument('--output',      default='backend/data/cricket_data.json')
args = parser.parse_args()

print('🏏 CricketIQ Data Pipeline')
print('─'*44)

# ─── Load ───────────────────────────────────────────────────────────────────
print(f'Loading {args.matches}...')
matches    = pd.read_csv(args.matches)
deliveries = pd.read_csv(args.deliveries)
matches    = matches.dropna(subset=['winner'])
matches['date'] = pd.to_datetime(matches['date'])
matches    = matches.sort_values('date').reset_index(drop=True)
print(f'  {len(matches)} matches · {len(deliveries):,} deliveries')

# ─── Team stats ─────────────────────────────────────────────────────────────
print('Computing team statistics...')
all_teams  = sorted(set(matches['team1'].tolist() + matches['team2'].tolist()))
team_stats = {}
for team in all_teams:
    tm  = matches[(matches['team1']==team)|(matches['team2']==team)]
    w   = int(tm[tm['winner']==team].shape[0])
    bat = deliveries[deliveries['batting_team']==team]
    avg = bat.groupby('match_id')['total_runs'].sum().mean()
    team_stats[team] = {
        'total_matches': int(len(tm)),
        'wins':          w,
        'losses':        int(len(tm) - w),
        'win_rate':      round(w/len(tm)*100, 1) if len(tm) else 0,
        'avg_score':     round(float(avg) if not np.isnan(avg) else 150, 1),
    }

# ─── H2H ────────────────────────────────────────────────────────────────────
print('Computing head-to-head records...')
top_teams = [t for t in all_teams if team_stats[t]['total_matches'] >= 40]
h2h = {}
for i, t1 in enumerate(top_teams):
    for t2 in top_teams[i+1:]:
        m = matches[((matches['team1']==t1)&(matches['team2']==t2)) |
                    ((matches['team1']==t2)&(matches['team2']==t1))]
        if len(m) < 3: continue
        t1w = int(m[m['winner']==t1].shape[0])
        t2w = int(m[m['winner']==t2].shape[0])
        h2h[f'{t1}|{t2}'] = {'team1':t1,'team2':t2,'t1_wins':t1w,'t2_wins':t2w,'total':int(len(m))}

# ─── Player stats ────────────────────────────────────────────────────────────
print('Computing player statistics...')
bat_stats = deliveries.groupby('batter').agg(
    runs=('batsman_runs','sum'), balls=('batsman_runs','count'),
    fours=('batsman_runs', lambda x:(x==4).sum()),
    sixes=('batsman_runs', lambda x:(x==6).sum()),
    innings=('match_id','nunique')
).reset_index()
bat_stats['strike_rate'] = (bat_stats['runs']/bat_stats['balls']*100).round(1)
bat_stats['avg']         = (bat_stats['runs']/bat_stats['innings']).round(1)
bat_stats = bat_stats[bat_stats['innings']>=10].sort_values('runs',ascending=False).head(50)

wkt_balls = deliveries[deliveries['is_wicket']==1]
bowl_stats = deliveries.groupby('bowler').agg(
    balls=('total_runs','count'), runs_conceded=('total_runs','sum'),
    innings=('match_id','nunique')
).reset_index()
wickets = wkt_balls.groupby('bowler').size().reset_index(name='wickets')
bowl_stats = bowl_stats.merge(wickets, on='bowler', how='left').fillna({'wickets':0})
bowl_stats['wickets']  = bowl_stats['wickets'].astype(int)
bowl_stats['economy']  = (bowl_stats['runs_conceded']/(bowl_stats['balls']/6)).round(2)
bowl_stats['avg']      = (bowl_stats['runs_conceded']/bowl_stats['wickets'].replace(0,np.nan)).round(1)
bowl_stats = bowl_stats[bowl_stats['innings']>=10].sort_values('wickets',ascending=False).head(50)

# ─── Season performance ───────────────────────────────────────────────────────
print('Computing season performance...')
season_perf = []
for season in sorted(matches['season'].unique()):
    sm = matches[matches['season']==season]
    for team in all_teams:
        tm = sm[(sm['team1']==team)|(sm['team2']==team)]
        if not len(tm): continue
        season_perf.append({'season':season,'team':team,
            'wins':int(tm[tm['winner']==team].shape[0]),'matches':int(len(tm))})

# ─── Venue stats ──────────────────────────────────────────────────────────────
print('Computing venue statistics...')
venue_stats = matches.groupby('venue').agg(
    total_matches=('id','count'), avg_margin=('result_margin','mean')
).reset_index()
venue_stats['avg_margin'] = venue_stats['avg_margin'].fillna(0).round(1)
venue_stats = (venue_stats[venue_stats['total_matches']>=5]
               .sort_values('total_matches',ascending=False)
               .head(20).to_dict('records'))

# ─── Recent matches ───────────────────────────────────────────────────────────
recent = matches.tail(30)[['id','season','date','team1','team2','venue','city',
                            'toss_winner','toss_decision','winner','result','result_margin']].copy()
recent['date'] = recent['date'].astype(str)

# ─── Assemble output ──────────────────────────────────────────────────────────
output = {
    'teams':               all_teams,
    'venues':              sorted(matches['venue'].unique().tolist())[:35],
    'recent_matches':      recent.to_dict('records'),
    'team_stats':          team_stats,
    'top_batters':         bat_stats.to_dict('records'),
    'top_bowlers':         bowl_stats.to_dict('records'),
    'h2h':                 h2h,
    'season_performance':  season_perf,
    'venue_stats':         venue_stats,
    'feature_importance': {
        'Team 2 Avg Score': 20.4, 'Team 1 Avg Score': 18.7,
        'H2H Win Rate':     11.5, 'Venue Win Rate':   11.2,
        'Season Context':    9.9, 'City Factor':       9.8,
        'Team 1 Form':       7.8, 'Team 2 Form':       6.3,
        'Toss Decision':     2.3, 'Toss Advantage':    2.2,
    },
    '_meta': {
        'matches':    int(len(matches)),
        'deliveries': int(len(deliveries)),
        'seasons':    sorted(matches['season'].unique().tolist()),
        'teams':      len(all_teams),
        'h2h_pairs':  len(h2h),
    }
}

Path(args.output).parent.mkdir(parents=True, exist_ok=True)
with open(args.output, 'w') as f:
    json.dump(output, f)

size_kb = Path(args.output).stat().st_size // 1024
print(f'\n✅ Saved → {args.output}  ({size_kb} KB)')
print(f'   Teams: {len(all_teams)}  ·  H2H pairs: {len(h2h)}  ·  Seasons: {len(set(s["season"] for s in season_perf))}')
print(f'   Top batters: {len(bat_stats)}  ·  Top bowlers: {len(bowl_stats)}')
