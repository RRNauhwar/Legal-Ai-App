import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';

const PLANS = [
  {
    name: 'Free Observer',
    price: '₹0',
    note: 'For guest and local accounts',
    features: ['Practice offline case simulations', 'Basic performance scoring', 'Citations search'],
    cta: 'Current Plan'
  },
  {
    name: 'Advocate Member',
    price: '₹499',
    note: 'For serious law students',
    features: ['Unlimited practice rounds', 'AI judge evaluation', 'Save performance stats', 'Appear on leaderboards'],
    cta: 'Active Plan'
  },
  {
    name: 'College Suite',
    price: 'Custom',
    note: 'For law colleges and institutes',
    features: ['Faculty dashboard', 'Private moot tournaments', 'Bulk student seats', 'Admin audit logs'],
    cta: 'Contact Sales'
  }
];

export default function Career() {
  const { displayName, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState('billing');
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStats().then(res => res.stats),
      api.getLeaderboard().then(res => res.leaderboard || []),
      api.getAdminLogs().then(res => res.logs || [])
    ])
      .then(([statsData, board, logs]) => {
        setStats(statsData);
        setLeaderboard(board);
        setAdminLogs(logs);
      })
      .catch(err => console.error('[Career] Load error:', err))
      .finally(() => setLoading(false));
  }, [activeTab]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="flex items gap-2">
          <span className="spin" />
          Loading Billing & Recruiters portal...
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div className="pg-header">
        <div>
          <div className="eyebrow">SaaS operations</div>
          <h1>Billing, Recruiters, and Institutional Controls</h1>
          <p>Manage memberships, track career portfolios, review recruiter visibility, and audit system actions.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>Billing</button>
        <button className={`tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>Student Portfolio</button>
        <button className={`tab-btn ${activeTab === 'recruiters' ? 'active' : ''}`} onClick={() => setActiveTab('recruiters')}>Recruiter Portal</button>
        <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin Controls</button>
      </div>

      {activeTab === 'billing' && (
        <>
          <div className="billing-overview mb-3">
            <div>
              <div className="eyebrow">Current workspace</div>
              <h2>{isGuest ? 'Guest Observer is active' : 'Advocate Member is active'}</h2>
              <p>
                {isGuest 
                  ? 'Sign up or login to enable full persistent trial scoring, active rankings, and AI-powered feedback.' 
                  : 'You have unlimited access to case evaluations. Trial stats are saved and synced dynamically.'}
              </p>
            </div>
            <div className="credit-orb">
              <strong>100%</strong>
              <span>Unlimited Access</span>
            </div>
          </div>

          <div className="g3">
            {PLANS.map((plan, index) => {
              const isActive = (isGuest && index === 0) || (!isGuest && index === 1);
              return (
                <div key={plan.name} className={isActive ? 'card-gold plan-card featured' : 'card-hi plan-card'}>
                  <div className="eyebrow">{plan.note}</div>
                  <h3>{plan.name}</h3>
                  <div className="plan-price">{plan.price}<span>{plan.price.startsWith('₹') && plan.price !== '₹0' ? '/mo' : ''}</span></div>
                  {plan.features.map((feature) => <div key={feature} className="check-row">{feature}</div>)}
                  <button className={isActive ? 'btn btn-primary btn-full mt-2' : 'btn btn-outline btn-full mt-2'} disabled={isActive}>
                    {isActive ? 'Active Plan' : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'portfolio' && (
        <div className="g2">
          <div className="card-hi">
            <div className="eyebrow">Verified resume generator</div>
            <h2 className="section-title display">{displayName} · Advocacy Profile</h2>
            <p className="text-muted">A recruiter-safe portfolio compiled from actual completed courtroom sessions and drafting evaluations.</p>
            <div className="portfolio-grid mt-2">
              <div><strong>{stats?.totalSessions || 0}</strong><span>Hearings completed</span></div>
              <div><strong>{stats?.winRatio || '0:0'}</strong><span>Trial record (W:L)</span></div>
              <div><strong>{stats?.averageScore ? `${stats.averageScore}%` : '—'}</strong><span>Average advocacy score</span></div>
              <div><strong>{stats?.badges?.length || 0}</strong><span>Badges unlocked</span></div>
            </div>
            <button className="btn btn-primary mt-2" disabled={!stats?.totalSessions}>
              Generate Verified Resume
            </button>
          </div>

          <div className="card-hi">
            <div className="eyebrow">Privacy Settings</div>
            <h2 className="section-title display">Control what firms can see</h2>
            {[
              ['Public profile', isGuest ? 'Disabled in Guest Mode' : 'Enabled for verified recruiters only'],
              ['Courtroom recordings', 'Private unless shared manually'],
              ['Skill stats', 'Visible on global leaderboard'],
              ['Resume export', 'Watermarked with database verification timestamp']
            ].map(([label, value]) => (
              <div key={label} className="settings-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recruiters' && (
        <div className="g2">
          <div className="card-hi">
            <div className="eyebrow">Recruiter search</div>
            <h2 className="section-title display">Top Verified Students</h2>
            <div className="stack mt-2">
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((student) => (
                  <div key={student.userId} className="list-card passive">
                    <div>
                      <strong>{student.name}</strong>
                      <span>{student.signal}</span>
                    </div>
                    <div className="text-right">
                      <small>{student.winLoss}</small>
                      <em>{student.averageScore}%</em>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No advocate ranking profiles published yet. Complete trials to appear in the recruiter pipeline!
                </div>
              )}
            </div>
          </div>

          <div className="assistant-card premium-assistant">
            <div className="eyebrow">Skill verification</div>
            <h2 className="section-title display">Performance-Based Hiring Signal</h2>
            <p>Recruiters from top-tier law firms can filter candidates by verified courtroom advocacy scores, drafting evaluations, and competition performance stats.</p>
            <button className="btn btn-primary mt-2" disabled={leaderboard.length === 0}>
              Open Recruiter Portal
            </button>
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="g2">
          <div className="card-hi">
            <div className="eyebrow">Admin dashboard</div>
            <h2 className="section-title display">Institution Governance</h2>
            <div className="check-row">Verify student identities via domain checks</div>
            <div className="check-row">Audit trial logging and session recordings</div>
            <div className="check-row">Monitor system utilization and rate limits</div>
            <div className="check-row">Set student credit limits and tournament controls</div>
          </div>

          <div className="card-hi">
            <div className="eyebrow">Live Audit Log</div>
            {adminLogs.length > 0 ? (
              <table className="tbl">
                <tbody>
                  {adminLogs.slice(0, 10).map((log, index) => (
                    <tr key={index}>
                      <td className="mono text-muted" style={{ padding: '0.4rem 0.2rem', fontSize: '0.8rem' }}>{log.time}</td>
                      <td style={{ padding: '0.4rem 0.2rem', fontSize: '0.85rem' }}><strong>{log.event}</strong></td>
                      <td className="text-muted" style={{ padding: '0.4rem 0.2rem', fontSize: '0.8rem' }}>{log.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2rem 1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                No database request logs recorded yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
