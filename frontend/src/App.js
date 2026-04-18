import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { PredictionHistoryProvider } from './context/PredictionHistory';
import { ToastProvider } from './context/ToastContext';
import HomePage      from './pages/HomePage';
import PredictPage   from './pages/PredictPage';
import TeamsPage     from './pages/TeamsPage';
import PlayersPage   from './pages/PlayersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LiveSimPage   from './pages/LiveSimPage';
import HistoryPage   from './pages/HistoryPage';
import './App.css';

const TICKER_ITEMS = [
  '🏏 V Kohli — 8,014 runs · All-time IPL top scorer',
  '🎯 YS Chahal — 213 wickets · All-time leading wicket-taker',
  '🏆 CSK — 58.2% win rate · Most successful franchise',
  '⚡ GT — 62.2% win rate · Best record since 2022',
  '📊 Ensemble Model — 58.7% accuracy · RF + XGB + LGB + LR',
  '🔥 KKR — 2024 Champions · 11 wins in 14 matches',
  '💥 CH Gayle — 175* · Highest individual IPL score',
  '🏟️ 58 IPL venues analysed · Wankhede leads for MI',
];

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="ticker-strip">
      <span className="ticker-label">LIVE</span>
      <div className="ticker-track">
        <div className="ticker-content">
          {items.map((item, i) => <span key={i} className="ticker-item">{item}</span>)}
        </div>
      </div>
    </div>
  );
}

function NavBar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const link = (to, label, end = false) => (
    <NavLink to={to} end={end}
      className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      onClick={close}>
      {label}
    </NavLink>
  );

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <NavLink to="/" className="nav-logo" onClick={close}>
          <div className="logo-icon">🏏</div>
          <span className="logo-text">Cricket<span className="logo-accent">IQ</span></span>
          <span className="logo-tag">AI Predictor</span>
        </NavLink>

        <div className={`nav-links ${open ? 'open' : ''}`}>
          {link('/',          'Home',      true)}
          {link('/predict',   'Predict')}
          {link('/teams',     'Teams')}
          {link('/players',   'Players')}
          {link('/analytics', 'Analytics')}
          {link('/live',      '🔴 Live')}
          {link('/history',   'History')}
        </div>

        <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">🏏 CricketIQ</div>
        <div className="footer-text">
          AI prediction engine · 1,095 IPL matches (2008–2024) ·
          Ensemble ML: Random Forest + XGBoost + LightGBM + Logistic Regression
        </div>
        <div className="footer-note">
          Model accuracy: 58.7% · Predictions are probabilistic estimates, not guarantees.
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            ['Predict', '/predict'],
            ['Teams',   '/teams'],
            ['Players', '/players'],
            ['Analytics', '/analytics'],
            ['Live Sim', '/live'],
            ['History', '/history'],
            ['Admin Panel', '/admin'],
          ].map(([label, path]) => (
            <a key={path} href={path}
              style={{ fontSize: 12, color: 'var(--txt3)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--orange)'}
              onMouseLeave={e => e.target.style.color = 'var(--txt3)'}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <PredictionHistoryProvider>
          <div className="app">
            <Ticker />
            <NavBar />
            <main className="main-content">
              <Routes>
                <Route path="/"          element={<HomePage />} />
                <Route path="/predict"   element={<PredictPage />} />
                <Route path="/teams"     element={<TeamsPage />} />
                <Route path="/players"   element={<PlayersPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/live"      element={<LiveSimPage />} />
                <Route path="/history"   element={<HistoryPage />} />
                <Route path="*"          element={
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🏏</div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Page not found</div>
                    <a href="/" style={{ color: 'var(--orange)' }}>← Back to home</a>
                  </div>
                } />
              </Routes>
            </main>
            <Footer />
          </div>
        </PredictionHistoryProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
