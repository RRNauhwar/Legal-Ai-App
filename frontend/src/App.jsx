import React, { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext.jsx';
import { api } from './utils/api.js';
import CommandPalette from './components/CommandPalette.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Cases from './pages/Cases.jsx';
import Courtroom from './pages/Courtroom.jsx';
import StudyGuide from './pages/StudyGuide.jsx';
import Drafter from './pages/Drafter.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Academy from './pages/Academy.jsx';
import Community from './pages/Community.jsx';
import Career from './pages/Career.jsx';
import JudgeBeaksPath from './pages/JudgeBeaksPath.jsx';

const NAV = [
  { path: '/', label: 'Command Center', icon: 'VC', group: 'practice' },
  { path: '/cases', label: 'Case Library', icon: 'CL', group: 'practice' },
  { path: '/courtroom', label: 'Live Courtroom', icon: 'LC', group: 'practice' },
  { path: '/academy', label: 'Academy', icon: 'AC', group: 'learn' },
  { path: '/study', label: 'Legal Assistant', icon: 'LA', group: 'learn' },
  { path: '/drafter', label: 'Drafting Desk', icon: 'DD', group: 'learn' },
  { path: '/community', label: 'Community', icon: 'CM', group: 'community' },
  { path: '/leaderboard', label: 'Rankings', icon: 'RK', group: 'community' },
  { path: '/career', label: 'Billing & Recruiters', icon: 'BR', group: 'pro' }
];

const GROUP_LABELS = {
  practice: 'Simulation Suite',
  learn: 'AI Workflows',
  community: 'Growth Network',
  pro: 'SaaS Operations'
};

const PAGE_META = {
  '/': { title: 'Command Center', note: 'Your subscription, practice calendar, skills graph, AI usage, and next courtroom sessions.' },
  '/cases': { title: 'Case Library', note: 'Criminal, civil, constitutional, and AI-generated matters with court-ready files.' },
  '/courtroom': { title: 'Virtual Courtroom', note: 'Live AI and multiplayer hearings with witnesses, objections, voice, timing, and scoring.' },
  '/academy': { title: 'Legal Academy', note: 'Mock tests, daily challenges, and milestone certifications.' },
  '/study': { title: 'AI Legal Assistant', note: 'Research, IPC and Constitution explainers, citations, drafting prompts, and study drills.' },
  '/drafter': { title: 'Drafting Desk', note: 'Petitions, bail applications, contracts, notices, and structured legal drafting feedback.' },
  '/community': { title: 'Community Arena', note: 'College competitions, tournaments, public profiles, clips, and achievement badges.' },
  '/leaderboard': { title: 'Courtroom Rankings', note: 'Confidence, accuracy, fluency, win ratio, and verified performance rankings.' },
  '/career': { title: 'Billing & Recruiter Portal', note: 'Plans, AI credits, recruiter visibility, verified resumes, and institutional controls.' }
};

function StatusText({ aiOnline }) {
  if (aiOnline === null) {
    return (
      <div className="status-row">
        <span className="spin" style={{ width: 14, height: 14, borderWidth: 1.6 }} />
        Checking AI services
      </div>
    );
  }

  const live = aiOnline === true;
  return (
    <>
      <div className="status-row" style={{ color: live ? 'var(--green)' : 'var(--amber)' }}>
        <span className="status-dot" style={{ color: live ? 'var(--green)' : 'var(--amber)', background: live ? 'var(--green)' : 'var(--amber)' }} />
        {live ? 'AI bench online' : 'Offline training mode'}
      </div>
      <div className="text-sm" style={{ color: 'var(--muted)' }}>
        {live
          ? 'Judge, opposing counsel, drafting feedback, and learning support are ready.'
          : 'Core simulations still work with the offline legal engine while AI services are unavailable.'}
      </div>
    </>
  );
}

export default function App() {
  const { user, loading, signOut, displayName, isGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [aiOnline, setAiOnline] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('ns_theme') || 'black');
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ns_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    api.health()
      .then((data) => setAiOnline(data.aiEnabled === true))
      .catch(() => setAiOnline(false));
  }, [user]);

  const currentMeta = useMemo(() => PAGE_META[location.pathname] || PAGE_META['/'], [location.pathname]);
  const xp = 72;

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="card-hi flex items gap-2">
          <span className="spin" />
          Preparing your chamber
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="layout">
      {/* ============ TOP NAVIGATION ============ */}
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="nav-seal">
            <svg viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="#C9A84C" strokeWidth="1"/>
              <circle cx="18" cy="18" r="13" stroke="#C9A84C" strokeWidth="0.5" strokeDasharray="2 2"/>
              <circle cx="18" cy="18" r="8" fill="none" stroke="#C9A84C" strokeWidth="1"/>
              <text x="18" y="22" textAnchor="middle" fill="#C9A84C" fontFamily="serif" fontSize="8" fontWeight="bold">NS</text>
            </svg>
          </div>
          <span className="nav-wordmark">Nyaya<span>Sim</span></span>
        </div>

        <ul className="nav-links">
          {[
            { path: '/', label: 'Simulation' },
            { path: '/cases', label: 'Cases' },
            { path: '/courtroom', label: 'Courtroom' },
            { path: '/academy', label: 'Academy' },
            { path: '/study', label: 'Counsel' },
            { path: '/drafter', label: 'Drafting' },
            { path: '/leaderboard', label: 'Rankings' }
          ].map((item) => (
            <li key={item.path}>
              <button
                className={location.pathname === item.path ? 'active' : ''}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            </li>
          ))}
          <li>
            <button className="nav-cta" onClick={() => navigate('/courtroom')}>
              Enter Chamber
            </button>
          </li>
        </ul>

        <div className="nav-right">
          <span className="badge badge-muted">{isGuest ? 'Guest' : 'Advocate'}</span>
          <button className="btn-ghost btn-sm" onClick={signOut} style={{ fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Exit
          </button>
        </div>
      </nav>

      {/* ============ PAGE HEADER ============ */}
      <div className="page-topbar">
        <div className="page-topbar-copy">
          <h2>{currentMeta.title}</h2>
          <p>{currentMeta.note}</p>
        </div>
        <div className="page-topbar-badges">
          {installPrompt && <button className="btn-primary btn-sm" onClick={installApp}>Install App</button>}
          <span className={`badge ${aiOnline ? 'badge-green' : 'badge-muted'}`}>
            {aiOnline ? '● AI Active' : '○ Offline'}
          </span>
          <span className="badge badge-gold">Student Pro</span>
        </div>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <main className="main-area">
        <div className="main-inner">
          <Routes>
            <Route path="/" element={<Dashboard aiOnline={aiOnline} />} />
            <Route path="/cases" element={<Cases aiOnline={aiOnline} />} />
            <Route path="/courtroom" element={<Courtroom aiOnline={aiOnline} />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/study" element={<StudyGuide />} />
            <Route path="/judge-beaks" element={<JudgeBeaksPath />} />
            <Route path="/drafter" element={<Drafter aiOnline={aiOnline} />} />
            <Route path="/community" element={<Community />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/career" element={<Career />} />
          </Routes>
        </div>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(18,34,64,0.95)',
            color: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: '2px',
            fontFamily: 'var(--f-body)',
            fontSize: '13px',
            backdropFilter: 'blur(12px)'
          }
        }}
      />
      <CommandPalette />
    </div>
  );
}
