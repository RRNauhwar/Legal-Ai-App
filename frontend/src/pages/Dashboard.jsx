import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { TRENDING_CASES } from '../data/legalResources.js';

export default function Dashboard({ aiOnline }) {
  const { displayName, isGuest } = useAuth();
  const navigate = useNavigate();
  
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeRooms, setActiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getCases().then(data => data.cases?.slice(0, 3) || []),
      api.getStats().then(data => data.stats),
      api.getActiveRooms().then(data => data.rooms || [])
    ])
      .then(([casesData, statsData, roomsData]) => {
        setCases(casesData);
        setStats(statsData);
        setActiveRooms(roomsData);
      })
      .catch((err) => {
        console.error('[Dashboard] Error loading data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="flex items gap-2">
          <span className="spin" />
          Loading Command Center...
        </div>
      </div>
    );
  }

  const hasHistory = stats && stats.totalSessions > 0;

  return (
    <div className="fade-up">
      <div className="pg-header">
        <div>
          <div className="eyebrow">Command center</div>
          <h1>Welcome back, {displayName}</h1>
          <p>Run practice hearings, manage case progress, review advocacy stats, and join active courtroom rooms.</p>
        </div>
        <div className="flex gap-1 wrap">
          <button className="btn btn-outline" onClick={() => navigate('/cases')}>Prepare a case</button>
          <button className="btn btn-primary" onClick={() => navigate('/courtroom')}>Enter courtroom</button>
        </div>
      </div>

      <div className="vc-hero mb-3">
        <div>
          <div className="flex gap-1 wrap mb-2">
            <span className={`badge ${aiOnline ? 'badge-green' : 'badge-muted'}`}>
              {aiOnline ? 'AI bench live' : 'Offline legal engine'}
            </span>
            <span className="badge badge-gold">
              {isGuest ? 'Guest Mode' : 'Advocate Member'}
            </span>
          </div>
          <h2>Practice inside a courtroom-grade simulation.</h2>
          <p>
            Virtual Courtroom combines AI judges, opponent counsel, witnesses, scoring, and real performance tracking into a single training dashboard.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/courtroom')}>Start live hearing</button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/cases')}>Browse Case Library</button>
          </div>
        </div>
        <div className="court-visual" aria-label="Courtroom activity overview">
          <div className="bench-line" />
          <div className="judge-seat">AI Judge</div>
          <div className="counsel-grid">
            <span>Prosecution</span>
            <span>Defense</span>
            <span>Witness</span>
            <span>Jury</span>
          </div>
          <div className="session-chip">Real-time Analytics Enabled</div>
        </div>
      </div>

      {/* Real Statistics Grid */}
      <div className="g4 mb-3">
        {[
          { label: 'Total Sessions', val: stats?.totalSessions || 0, note: 'Completed trials', accent: 'var(--gold)' },
          { label: 'Advocacy Score', val: hasHistory ? `${stats.averageScore}%` : '—', note: 'Average trial rating', accent: 'var(--green)' },
          { label: 'Win ratio', val: stats?.winRatio || '0:0', note: 'Wins vs Losses', accent: 'var(--blue)' },
          { label: 'Badges Earned', val: stats?.badges?.length || 0, note: 'Unlocked achievements', accent: 'var(--amber)' }
        ].map((item) => (
          <div key={item.label} className="stat-card premium-stat">
            <div className="text-xs mono text-muted">{item.label}</div>
            <div className="stat-card-value" style={{ color: item.accent }}>{item.val}</div>
            <div className="text-sm text-muted">{item.note}</div>
          </div>
        ))}
      </div>

      <div className="g2 mb-3">
        {/* Performance Breakdown */}
        <div className="card-hi">
          <div className="flex between items mb-2">
            <div>
              <div className="eyebrow">Performance analytics</div>
              <h3 className="display section-title">Advocacy Signal</h3>
            </div>
            {hasHistory && <span className="badge badge-green">Calculated</span>}
          </div>
          
          {hasHistory ? (
            <>
              {stats.scoreBreakdown.map((metric) => (
                <div key={metric.label} className="metric-row">
                  <div className="flex between mb-1">
                    <span>{metric.label}</span>
                    <span className={`text-${metric.tone} mono`}>{metric.value}%</span>
                  </div>
                  <div className="meter">
                    <div className={`meter-fill fill-${metric.tone}`} style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
              <div className="insight-box mt-2">
                Your average advocacy rating is <strong>{stats.averageScore}%</strong>. Keep practicing and citing relevant sections in court to improve.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              <p className="text-sm">No trial data available yet. Complete courtroom hearings to view your advocacy signal breakdown.</p>
            </div>
          )}
        </div>

        {/* Active Multiplayer Courtrooms */}
        <div className="card-hi">
          <div className="flex between items mb-2">
            <div>
              <div className="eyebrow">Active chambers</div>
              <h3 className="display section-title">Multiplayer Moot Rooms</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/courtroom')}>Moot lobby</button>
          </div>
          
          <div className="stack">
            {activeRooms.length > 0 ? (
              activeRooms.map((room) => (
                <button key={room.id} className="list-card" onClick={() => navigate('/courtroom', { state: { roomCode: room.id } })}>
                  <div>
                    <strong>{room.title}</strong>
                    <span>{room.meta}</span>
                  </div>
                  <div className="text-right">
                    <small>{room.time}</small>
                    <em>{room.seats}</em>
                  </div>
                </button>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏛️</div>
                <p className="text-sm">No active multiplayer chambers running right now.</p>
                <button className="btn btn-outline btn-sm mt-2" onClick={() => navigate('/courtroom')}>Create a room</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Trial History */}
      <div className="divider">Recent Courtroom Activity</div>
      <div className="card-hi mb-3">
        {hasHistory ? (
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem' }}>Case Title</th>
                <th style={{ padding: '0.5rem' }}>Case Type</th>
                <th style={{ padding: '0.5rem' }}>Overall Score</th>
                <th style={{ padding: '0.5rem' }}>Outcome</th>
                <th style={{ padding: '0.5rem' }}>Completed Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.history.slice(0, 3).map((session, index) => (
                <tr key={session.id || index} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <strong>{session.caseTitle}</strong>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`badge badge-${session.caseType === 'criminal' ? 'red' : session.caseType === 'constitutional' ? 'gold' : 'blue'}`}>
                      {session.caseType}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--f-mono)' }}>
                    {session.overallScore}%
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`badge ${session.outcome === 'win' ? 'badge-green' : 'badge-muted'}`}>
                      {session.outcome === 'win' ? 'WIN' : 'LOSS'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(session.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚖️</div>
            <h4>Your Trial History is Empty</h4>
            <p className="text-sm" style={{ maxWidth: '400px', margin: '0.5rem auto 1rem' }}>
              Your completed trial scores, judgment results, and performance scorecards will be saved here.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/courtroom')}>Start Your First trial</button>
          </div>
        )}
      </div>

      <div className="divider">Active Case Files</div>
      <div className="g3 mb-3">
        {cases.length > 0 ? cases.map((item) => (
          <div key={item.id} className="card-hi case-tile">
            <div className="flex gap-1 wrap mb-1">
              <span className={`badge badge-${item.caseType === 'criminal' ? 'red' : item.caseType === 'constitutional' ? 'gold' : 'blue'}`}>{item.caseType}</span>
              <span className="badge badge-muted">{item.difficulty}</span>
            </div>
            <h3 className="display">{item.title}</h3>
            <div className="text-xs mono text-muted">{item.caseNumber}</div>
            <p className="text-sm text-muted">{item.summary}</p>
            <button className="btn btn-primary btn-full mt-2" onClick={() => navigate('/courtroom', { state: { selectedCase: item } })}>
              Take this matter to court
            </button>
          </div>
        )) : (
          <div className="card-hi empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="eyebrow">Loading docket</div>
            <p>Case files are being retrieved from the file room. If the backend is offline, built-in matters will appear once the route responds.</p>
          </div>
        )}
      </div>

      <div className="divider">Market Watch</div>
      <div className="g2">
        <div className="card-hi">
          <div className="eyebrow">Trending legal issues</div>
          <div className="stack mt-2">
            {TRENDING_CASES.slice(0, 3).map((item) => (
              <div key={item.title} className="list-card passive">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.court}</span>
                  <p>{item.why}</p>
                </div>
                <span className={`badge badge-${item.type === 'criminal' ? 'red' : 'gold'}`}>{item.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="assistant-card premium-assistant">
          <div className="eyebrow">AI automation</div>
          <h3 className="display section-title">Next best action</h3>
          <p>
            Generate a constitutional challenge brief, run a 12-minute respondent argument, then send the transcript into the AI scoring engine. This builds your authenticated courtroom credentials.
          </p>
          <button className="btn btn-primary mt-2" onClick={() => navigate('/cases')}>Generate constitutional case</button>
        </div>
      </div>
    </div>
  );
}
