import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  { title: 'AI courtroom agents', desc: 'Practice against a judge, opponent lawyer, witness, and jury with timed submissions.' },
  { title: 'Verified college network', desc: 'Institution accounts can run tournaments, faculty judging, and private leaderboards.' },
  { title: 'Recruiter-grade signal', desc: 'Turn performance analytics into verified legal skill profiles and resumes.' },
  { title: 'Secure legal workspace', desc: 'Role-based access, privacy controls, audit logs, and encrypted document workflows.' }
];

const ROLES = ['Law student', 'Moot participant', 'Judiciary aspirant', 'Faculty / college', 'Recruiter'];

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, continueAsGuest, isSupabaseEnabled } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Law student');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await signIn(email, password);
        toast.success('Welcome back to court.');
      } else {
        if (!name.trim()) {
          setError('Please enter your name.');
          setLoading(false);
          return;
        }
        await signUp(email, password, name);
        toast.success('Account created. Please confirm your email.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <section className="auth-showcase">
          <div className="eyebrow">Virtual Courtroom</div>
          <h1 className="display" style={{ fontSize: '3.6rem', color: 'var(--white)', maxWidth: 520 }}>
            The AI courtroom operating system for legal training.
          </h1>
          <p style={{ marginTop: '0.9rem', maxWidth: 520, color: 'var(--text-muted)', fontSize: '1rem' }}>
            Enter as counsel, judge, witness, jury, or observer. Practice with AI, compete with colleges, and build a verified advocacy profile that feels ready for serious institutions.
          </p>

          <div className="auth-proof">
            <span>4.8/5 student rating</span>
            <span>12,400+ simulated hearings</span>
            <span>92 partner recruiters tracked</span>
          </div>

          <div className="auth-showcase-grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="auth-feature">
                <strong>{feature.title}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>{feature.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-logo">
            <div className="auth-logo-icon">NS</div>
            <div className="auth-logo-name">NyayaSim</div>
            <div className="auth-logo-sub">AI courtroom simulation platform</div>
          </div>

          <div className="auth-tab">
            <button className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
              Sign In
            </button>
            <button className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setError(''); }}>
              Create Account
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <>
                <div className="auth-field">
                  <label>Full Name</label>
                  <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Mehra" required />
                </div>
                <div className="auth-field">
                  <label>Primary role</label>
                  <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                    {ROLES.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </div>
                <div className="auth-field">
                  <label>College verification email</label>
                  <input className="input" type="email" value={collegeEmail} onChange={(e) => setCollegeEmail(e.target.value)} placeholder="name@lawcollege.edu" />
                </div>
              </>
            )}

            <div className="auth-field">
              <label>Email Address</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lawschool.edu" required />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'Use a strong password' : 'Your password'}
                required
                minLength={6}
              />
            </div>

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><span className="spin" />Processing</> : tab === 'login' ? 'Enter command center' : 'Create secure account'}
            </button>
          </form>

          {isSupabaseEnabled && (
            <>
              <div className="auth-divider">or continue with</div>
              <button className="btn btn-outline btn-full" onClick={handleGoogle} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {!isSupabaseEnabled && (
            <div className="auth-error" style={{ marginTop: '1rem', background: 'rgba(217,163,77,0.12)', borderColor: 'rgba(217,163,77,0.25)', color: '#f1c27a' }}>
              Authentication provider keys are not configured yet. Guest mode is available for local demos; production should enable Supabase/Auth, refresh tokens, 2FA, and verified college domains.
            </div>
          )}

          <div className="auth-security">
            <span>Role-based access</span>
            <span>Admin/recruiter 2FA</span>
            <span>Private recordings by default</span>
          </div>

          <div className="auth-guest">
            <a onClick={continueAsGuest}>Continue as guest observer</a>
          </div>
        </section>
      </div>
    </div>
  );
}
