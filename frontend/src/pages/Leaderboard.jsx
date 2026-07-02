import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';

const BADGES_INFO = [
  { icon: '⚖️', name: 'Apprentice Advocate',   desc: 'Complete your first session',    color: 'var(--gold)'  },
  { icon: '🧠', name: 'Sharp Thinker',          desc: 'Score 80+ in arguments',         color: 'var(--blue)'  },
  { icon: '🦅', name: 'Legal Eagle',            desc: 'Complete 10 sessions',           color: 'var(--green)' },
  { icon: '🏛️', name: 'Constitutional Expert',  desc: 'Win a constitutional case',      color: 'var(--amber)' },
  { icon: '🏅', name: 'Best Advocate',          desc: 'Score >=80 on 3 trials',         color: 'var(--gold)'  },
];

export default function Leaderboard() {
  const { displayName, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getLeaderboard().then(res => res.leaderboard || []),
      api.getStats().then(res => res.stats)
    ])
      .then(([board, statsData]) => {
        setLeaderboard(board);
        setStats(statsData);
      })
      .catch((err) => {
        console.error('[Leaderboard] Load error:', err);
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
          Calculating Courtroom Rankings...
        </div>
      </div>
    );
  }

  // Find user's rank in global rankings
  const userRankIndex = leaderboard.findIndex(item => item.userId === user?.id);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : '—';
  
  // Get active badges list
  const earnedBadgeNames = stats?.badges || [];

  return (
    <div className="fade-up">
      <div className="pg-header">
        <h1>🏆 Leaderboard</h1>
        <p>Rankings are calculated from real trial performance scores and courtroom advocate verdicts.</p>
      </div>

      {/* User's own Rank Row */}
      <div className="card-gold mb-3" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          👤
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--prose)', fontSize: '.95rem' }}>{displayName} (You)</div>
          <div style={{ fontSize: '.75rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
            Rank #{userRank} · {stats?.totalSessions || 0} sessions completed
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)' }}>
            {stats?.totalSessions > 0 ? `${stats.averageScore}%` : '—'}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
            {stats?.totalSessions > 0 ? 'Average Score' : 'No trials yet'}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card-hi mb-4">
        {leaderboard.length > 0 ? (
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Rank</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Advocate Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Completed Sessions</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Average Score</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Win Record</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Advocacy Signal</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((item, index) => (
                <tr key={item.userId} style={{ borderBottom: '1px solid var(--border)', background: item.userId === user?.id ? 'var(--bg-active)' : 'transparent' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                    {index === 0 ? '🥇 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `#${index + 1}`}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <strong>{item.name}</strong> {item.userId === user?.id && '(You)'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--f-mono)' }}>
                    {item.totalSessions}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--f-mono)' }}>
                    {item.averageScore}%
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                    {item.winLoss}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className="badge badge-muted">{item.signal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏆</div>
            <h3 className="display" style={{ fontSize: '1.4rem', marginBottom: '.5rem' }}>Leaderboard is Empty</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem', maxWidth: 380, margin: '0 auto' }}>
              Complete courtroom trial sessions to earn advocacy scores and rank in the global advocate charts.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '.75rem' }}>
              {['🥇 1st', '🥈 2nd', '🥉 3rd'].map(p => (
                <div key={p} style={{ padding: '.6rem 1.1rem', background: 'var(--bg3)', borderRadius: 'var(--r-md)', fontSize: '.8rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                  {p} place · —
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="divider">How Rankings Work</div>
      <div className="g3 mb-4">
        {[
          { icon: '⚖️', title: 'Complete Sessions',   desc: 'Finish courtroom trials to earn a performance score card.' },
          { icon: '📊', title: 'Performance Score',    desc: 'Scored on argument strength, legal citations, objections, and persuasion.' },
          { icon: '🏅', title: 'Earn Badges',          desc: 'Special badges unlock automatically based on your real career statistics.' },
        ].map(item => (
          <div key={item.title} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '.5rem' }}>{item.icon}</div>
            <div style={{ fontWeight: 700, color: 'var(--prose)', fontSize: '.875rem', marginBottom: '.25rem' }}>{item.title}</div>
            <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="divider">Badges to Earn</div>
      <div className="g3">
        {BADGES_INFO.map(badge => {
          const isUnlocked = earnedBadgeNames.includes(badge.name);
          return (
            <div 
              key={badge.name} 
              className="card flex gap-2 items" 
              style={{ 
                opacity: isUnlocked ? 1 : 0.55, 
                border: isUnlocked ? '1px solid var(--gold)' : '1px solid var(--border)',
                background: isUnlocked ? 'var(--gold-dim)' : 'transparent'
              }}
            >
              <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>
                {isUnlocked ? badge.icon : '🔒'}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: isUnlocked ? badge.color : 'var(--muted)', fontSize: '.82rem' }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                  {badge.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
