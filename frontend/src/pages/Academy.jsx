import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function Academy() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('challenges');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(res => setStats(res.stats))
      .catch(err => console.error('[Academy] Stats load error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="flex items gap-2">
          <span className="spin" />
          Loading Academy...
        </div>
      </div>
    );
  }

  // Compute skill level based on completed sessions
  const sessionsCount = stats?.totalSessions || 0;
  let levelTitle = 'Novice Clerk';
  let levelVal = 'Lvl 1';
  let progressText = 'Complete your first courtroom hearing to unlock Level 2.';
  let scoreRingVal = 'Lvl 1';

  if (sessionsCount >= 6) {
    levelTitle = 'Trial Master';
    levelVal = 'Lvl 4';
    scoreRingVal = 'Lvl 4';
    progressText = 'You have unlocked the highest trial credentials!';
  } else if (sessionsCount >= 3) {
    levelTitle = 'Junior Advocate';
    levelVal = 'Lvl 3';
    scoreRingVal = 'Lvl 3';
    progressText = `Complete ${6 - sessionsCount} more hearings to unlock Trial Master (Level 4).`;
  } else if (sessionsCount >= 1) {
    levelTitle = 'Apprentice Advocate';
    levelVal = 'Lvl 2';
    scoreRingVal = 'Lvl 2';
    progressText = `Complete ${3 - sessionsCount} more hearings to unlock Junior Advocate (Level 3).`;
  }

  const earnedBadges = stats?.badges || [];

  return (
    <div className="fade-up">
      <div className="pg-header">
        <div>
          <div className="eyebrow">Learning & Training</div>
          <h1>Legal Academy</h1>
          <p>Sharpen your theoretical knowledge. Take mock tests, read landmark judgments, complete daily challenges, and earn certifications.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'challenges' ? 'active' : ''}`} onClick={() => setActiveTab('challenges')}>Daily Challenges</button>
        <button className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>Mock Tests</button>
        <button className={`tab-btn ${activeTab === 'certs' ? 'active' : ''}`} onClick={() => setActiveTab('certs')}>Certifications</button>
      </div>

      {activeTab === 'challenges' && (
        <div className="g3">
          <div className="card-hi" style={{ gridColumn: 'span 2' }}>
            <div className="flex between items mb-2">
              <h3 className="display" style={{ fontSize: '1.25rem' }}>Today's Practice Drills</h3>
              <span className="badge badge-gold">Sessions: {sessionsCount} completed</span>
            </div>
            <div className="flex col gap-1">
              <div className="card flex between items gap-2 wrap">
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className="bold text-cream">Practice Court Trial Objections</div>
                  <div className="text-sm text-muted">Enter a live courtroom simulation, raise arguments, and intercept with objections.</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate('/courtroom')}>
                  Start Chamber
                </button>
              </div>
              <div className="card flex between items gap-2 wrap">
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className="bold text-cream">Legal Drafting Practice</div>
                  <div className="text-sm text-muted">Draft bail petitions or contracts and receive legal feedback.</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate('/drafter')}>
                  Start Drafting
                </button>
              </div>
              <div className="card flex between items gap-2 wrap">
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className="bold text-cream">Study Legal Codes</div>
                  <div className="text-sm text-muted">Review IPC, CrPC sections, and constitutional articles in the Counsel suite.</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate('/study')}>
                  Study Support
                </button>
              </div>
            </div>
          </div>
          
          <div className="card-hi">
            <div className="eyebrow mb-2">Current Skill Level</div>
            <div className="score-ring mx-auto mb-2" style={{ width: '120px', height: '120px' }}>
              <div className="score-ring-val">{scoreRingVal}</div>
              <div className="score-ring-sub">{levelTitle}</div>
            </div>
            <div className="text-center text-sm text-muted">
              {progressText}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="g2">
          <div className="card-hi">
            <div className="flex between items mb-2">
              <span className="badge badge-red">Criminal Law</span>
              <span className="text-xs text-muted">Interactive Study Guide</span>
            </div>
            <h3 className="display" style={{ fontSize: '1.2rem', marginBottom: '.5rem' }}>IPC & CrPC Fundamentals</h3>
            <p className="text-sm text-muted mb-2">Take interactive drills on culpable homicide, murder, and arrest procedures inside the Counsel Assistant page.</p>
            <button className="btn btn-outline btn-full" onClick={() => navigate('/study')}>Open Study Guide</button>
          </div>
          <div className="card-hi">
            <div className="flex between items mb-2">
              <span className="badge badge-blue">Constitutional Law</span>
              <span className="text-xs text-muted">Interactive study Guide</span>
            </div>
            <h3 className="display" style={{ fontSize: '1.2rem', marginBottom: '.5rem' }}>Article 14 & 19 Challenges</h3>
            <p className="text-sm text-muted mb-2">Analyze fundamental rights, state restrictions, and proportionality tests under the Constitution.</p>
            <button className="btn btn-outline btn-full" onClick={() => navigate('/study')}>Open Study Guide</button>
          </div>
        </div>
      )}

      {activeTab === 'certs' && (
        <div className="card-hi fade-up">
          <div className="eyebrow mb-2">Your Unlocked Certifications</div>
          <div className="g3">
            <div 
              className="card flex col center" 
              style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem', 
                borderColor: earnedBadges.includes('Apprentice Advocate') ? 'var(--gold-ring)' : 'var(--border)', 
                background: earnedBadges.includes('Apprentice Advocate') ? 'var(--gold-dim)' : 'transparent',
                opacity: earnedBadges.includes('Apprentice Advocate') ? 1 : 0.5
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏅</div>
              <div className="bold text-gold">Certified Trial Advocate</div>
              <div className="text-xs text-cream mt-1">
                {earnedBadges.includes('Apprentice Advocate') ? 'Status: Unlocked' : 'Requires: Apprentice Advocate Badge'}
              </div>
            </div>
            <div 
              className="card flex col center" 
              style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem', 
                borderColor: earnedBadges.includes('Constitutional Expert') ? 'var(--gold-ring)' : 'var(--border)',
                background: earnedBadges.includes('Constitutional Expert') ? 'var(--gold-dim)' : 'transparent',
                opacity: earnedBadges.includes('Constitutional Expert') ? 1 : 0.5 
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
              <div className="bold text-gold">Appellate Master</div>
              <div className="text-xs text-cream mt-1">
                {earnedBadges.includes('Constitutional Expert') ? 'Status: Unlocked' : 'Requires: Constitutional Expert Badge'}
              </div>
            </div>
            <div 
              className="card flex col center" 
              style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem', 
                borderColor: earnedBadges.includes('Best Advocate') ? 'var(--gold-ring)' : 'var(--border)',
                background: earnedBadges.includes('Best Advocate') ? 'var(--gold-dim)' : 'transparent',
                opacity: earnedBadges.includes('Best Advocate') ? 1 : 0.5 
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
              <div className="bold">Expert Drafter</div>
              <div className="text-xs text-muted mt-1">
                {earnedBadges.includes('Best Advocate') ? 'Status: Unlocked' : 'Requires: Best Advocate Badge'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="divider">Internship Simulations</div>
      <div className="card-gold">
        <h3 className="display text-gold mb-1" style={{ fontSize: '1.2rem' }}>Law Firm Partnership: Virtual Tasks</h3>
        <p className="text-sm text-prose mb-2">Practice real-world courtroom simulations and generate custom briefs based on case law files in our library.</p>
        <button className="btn btn-primary" onClick={() => navigate('/cases')}>Browse Case Files</button>
      </div>
    </div>
  );
}
