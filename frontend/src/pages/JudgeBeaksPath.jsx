import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';

const RANKS = [
  { id: 'law_intern', label: 'Law Intern' },
  { id: 'junior_associate', label: 'Junior Associate' },
  { id: 'associate', label: 'Associate' },
  { id: 'senior_associate', label: 'Senior Associate' },
  { id: 'independent_advocate', label: 'Independent Advocate' },
  { id: 'high_court_advocate', label: 'High Court Advocate' },
  { id: 'supreme_court_advocate', label: 'Supreme Court Advocate' },
  { id: 'senior_counsel', label: 'Senior Counsel' },
  { id: 'legendary_advocate', label: 'Legendary Advocate' }
];

export default function JudgeBeaksPath() {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMetrics, setShowMetrics] = useState(false);

  // Active Lesson States
  const [activeLesson, setActiveLesson] = useState(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [quizResult, setQuizResult] = useState(null); // 'correct' | 'wrong'

  // AI Tutor Panel States
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorHistory, setTutorHistory] = useState([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Fetch all initial data
  useEffect(() => {
    Promise.all([
      api.getAcademyLessons(),
      api.getAcademyProgress(),
      api.getAcademyCampaign(),
      api.getAcademyAnalyticsSummary()
    ])
      .then(([resLessons, resProgress, resCampaign, resAnalytics]) => {
        setLessons(resLessons.lessons || []);
        setProgress(resProgress.progress || null);
        setCampaign(resCampaign.campaign || null);
        setAnalytics(resAnalytics.analytics || null);
      })
      .catch((err) => {
        console.error('[Academy] Load error:', err);
        toast.error('Failed to load academy components.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Scroll AI chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorHistory]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="flex items gap-2">
          <span className="spin" />
          Loading Judge Beaks' Academy 3.0...
        </div>
      </div>
    );
  }

  // Calculate unlock flags for lessons list
  const completedIds = progress?.completedLessons?.map((c) => c.lessonId) || [];
  const unlockedLessons = lessons.map((lesson, idx) => {
    if (idx === 0) return { ...lesson, isUnlocked: true, isCompleted: completedIds.includes(lesson.id) };
    const precedingCompleted = lessons.slice(0, idx).every(l => completedIds.includes(l.id));
    return {
      ...lesson,
      isUnlocked: precedingCompleted,
      isCompleted: completedIds.includes(lesson.id)
    };
  });

  // Handle specialization updates
  function selectSpecialization(spec) {
    toast.promise(
      api.updateAcademySpecialization(spec),
      {
        loading: 'Updating specialization...',
        success: (res) => {
          setProgress(res.progress);
          return `Specialization unlocked: ${spec.toUpperCase()} LITIGATION`;
        },
        error: 'Failed to update specialization.'
      }
    );
  }

  // Handle Bar promotion
  function triggerPromotion() {
    toast.promise(
      api.promoteAcademyCampaign(),
      {
        loading: 'Submitting Bar promotion board evaluation...',
        success: (res) => {
          if (res.promoted) {
            setCampaign(res.campaign);
            return `Congratulations! Promoted to ${RANKS.find(r => r.id === res.campaign.rank)?.label}!`;
          } else {
            return 'Promotion board requires more completed cases.';
          }
        },
        error: 'Evaluation failed.'
      }
    );
  }

  // Handle starting a lesson
  function startLesson(lesson, meta) {
    if (!meta.isUnlocked) {
      toast.error('This lesson is locked! Complete preceding case nodes.', { icon: '🔒' });
      return;
    }
    setActiveLesson(lesson);
    setDialogueIndex(0);
    setQuizMode(false);
    setSelectedOpt(null);
    setQuizResult(null);
    setTutorHistory([]);
  }

  // Dialogue traversal
  function advanceDialogue() {
    if (dialogueIndex < activeLesson.dialogue.length - 1) {
      setDialogueIndex((prev) => prev + 1);
    } else {
      setQuizMode(true);
    }
  }

  // Quiz submission & completion triggers
  function submitAnswer(optIdx) {
    setSelectedOpt(optIdx);
    if (optIdx === activeLesson.exercise.correct) {
      setQuizResult('correct');
      api.completeAcademyLesson(activeLesson.id, {
        difficulty: activeLesson.difficulty,
        attempts: selectedOpt === null ? 1 : 2,
        score: selectedOpt === null ? 100 : 50
      })
      .then((res) => {
        setProgress(res.progress);
        if (res.leveledUp) {
          toast.success(`🎉 LEVEL UP! You are now Level ${res.progress.level}!`, { duration: 5000 });
        } else {
          toast.success(`Lesson complete! +${res.xpEarned} XP earned.`, { icon: '🔥' });
        }
      })
      .catch((err) => console.error('[Academy] Save error:', err));
    } else {
      setQuizResult('wrong');
    }
  }

  // Real-Time SSE Tutor Chat Streaming
  async function askTutor(e) {
    e.preventDefault();
    if (!tutorInput.trim() || tutorLoading) return;

    const userMsg = { role: 'user', content: tutorInput };
    setTutorHistory(prev => [...prev, userMsg]);
    setTutorInput('');
    setTutorLoading(true);

    const botMsg = { role: 'assistant', content: '' };
    setTutorHistory(prev => [...prev, botMsg]);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
        : '/api';

      const token = localStorage.getItem('ns_access_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams({
        question: userMsg.content,
        lessonContext: JSON.stringify(activeLesson || { topic: 'General Litigation' }),
        historyJson: JSON.stringify(tutorHistory.slice(-4))
      });

      const response = await fetch(`${BASE_URL}/ai/academy/tutor/stream?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              setTutorLoading(false);
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                setTutorHistory(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  last.content += parsed.text;
                  return updated;
                });
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (err) {
              console.error('Failed to parse SSE JSON:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Tutor Stream] Error:', err);
      setTutorHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Failed to load tutor explanation. Please try again.';
        return updated;
      });
      setTutorLoading(false);
    }
  }

  // Group lessons by World
  const worlds = unlockedLessons.reduce((acc, lesson) => {
    if (!acc[lesson.world]) {
      acc[lesson.world] = {
        id: lesson.world,
        title: lesson.worldTitle || `World ${lesson.world}`,
        lessons: []
      };
    }
    acc[lesson.world].lessons.push(lesson);
    return acc;
  }, {});

  const currentRankIdx = RANKS.findIndex(r => r.id === campaign?.rank);

  // Active playing view
  if (activeLesson) {
    return (
      <div className="fade-up" style={styles.playingLayout}>
        <div style={{ maxWidth: '640px', width: '100%', padding: '1rem' }}>
          
          {/* Top Bar */}
          <div className="flex between items mb-3" style={{ gap: '15px' }}>
            <button className="btn btn-ghost" onClick={() => setActiveLesson(null)}>❌ Quit</button>
            <div className="meter" style={{ flex: 1, height: '10px' }}>
              <div 
                className="meter-fill" 
                style={{ 
                  width: quizMode ? '100%' : `${((dialogueIndex + 1) / activeLesson.dialogue.length) * 100}%`, 
                  background: 'var(--gold)',
                  transition: 'width 0.3s'
                }} 
              />
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setTutorOpen(true)}>🦉 Ask Mentor</button>
          </div>

          {/* Dialog bubble */}
          <div className="card-hi flex col gap-2 mb-3" style={styles.bubbleCard}>
            <div className="flex items gap-2">
              <span style={{ fontSize: '2.5rem' }}>🦉</span>
              <div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gold)' }}>JUDGE BEAKS</div>
                <div className="text-xs text-muted">Specialist Legal Mentor</div>
              </div>
            </div>

            <div className="speech-bubble" style={styles.speechBubble}>
              {quizMode ? (
                quizResult === 'correct' ? (
                  <strong style={{ color: 'var(--green)', fontSize: '1.15rem' }}>Perfect! Ratio Decidendi unlocked below.</strong>
                ) : quizResult === 'wrong' ? (
                  <strong style={{ color: 'var(--red)', fontSize: '1.15rem' }}>Not quite correct. Click "Ask Mentor" for Socratic guidance!</strong>
                ) : (
                  <div style={{ fontSize: '1.1rem', color: 'var(--white)', lineHeight: 1.6 }}>{activeLesson.exercise.question}</div>
                )
              ) : (
                <div style={{ fontSize: '1.1rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                  "{activeLesson.dialogue[dialogueIndex]}"
                </div>
              )}
            </div>
          </div>

          {/* Input selection */}
          {quizMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {quizResult !== 'correct' ? (
                activeLesson.exercise.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => submitAnswer(i)}
                    className="card text-left"
                    style={{
                      ...styles.optBtn,
                      ...(selectedOpt === i ? (quizResult === 'wrong' ? styles.optBtnWrong : styles.optBtnSelected) : {})
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', marginRight: '10px' }}>
                      {selectedOpt === i ? (quizResult === 'wrong' ? '❌' : '⚡') : '⚖️'}
                    </span>
                    {opt}
                  </button>
                ))
              ) : (
                <div className="card-gold fade-up" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div className="eyebrow mb-1 text-gold-deep">RATIO DECIDENDI & FEEDBACK</div>
                  <p className="text-sm mb-3" style={{ color: 'var(--wood)', lineHeight: 1.5 }}>
                    {activeLesson.exercise.explanation}
                  </p>
                  <button className="btn btn-primary btn-lg btn-full" onClick={() => setActiveLesson(null)}>
                    Continue Campaign
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-lg btn-full" onClick={advanceDialogue}>
              Next Statement →
            </button>
          )}

        </div>

        {/* Collapsible Slide-Out AI Tutor Tray */}
        {tutorOpen && (
          <div style={styles.tutorTray}>
            <div style={styles.tutorHeader}>
              <div className="flex items gap-2">
                <span style={{ fontSize: '1.8rem' }}>🦉</span>
                <div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gold)' }}>AI MENTOR CHAT</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>SSE Streaming enabled</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTutorOpen(false)}>❌</button>
            </div>

            <div style={styles.tutorHistory}>
              <div style={styles.botMsg}>
                Greetings, candidate! Ask me about this topic. I will provide hints, stories, and guidance, but will never reveal the answer directly.
              </div>
              {tutorHistory.map((m, idx) => (
                m.content && (
                  <div key={idx} style={m.role === 'user' ? styles.userMsg : styles.botMsg}>
                    {m.content}
                  </div>
                )
              ))}
              {tutorLoading && tutorHistory[tutorHistory.length - 1]?.content === '' && (
                <div style={styles.botMsg}>Typing... 🦉</div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={askTutor} style={styles.tutorForm}>
              <input
                type="text"
                placeholder="Ask Mentor a query..."
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                style={styles.tutorInput}
              />
              <button type="submit" disabled={tutorLoading} className="btn btn-primary btn-sm">Ask</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Dashboard Map Overview
  return (
    <div className="fade-up" style={{ paddingBottom: '4rem' }}>
      
      {/* Top metrics bar */}
      <div className="pg-header text-center" style={{ maxWidth: '700px', margin: '0 auto 1.5rem' }}>
        <div>
          <div className="eyebrow">RPG ADVOCACY STRATEGY PATH</div>
          <h1>Judge Beaks' Academy 3.0</h1>
          <p>Complete progressive legal modules, level up your career rank, and consult your real-time streaming tutor.</p>
        </div>
        <div className="flex center gap-2 wrap mt-2">
          <span className="badge badge-gold">🔥 Streak: {progress?.streakDays || 0} Days</span>
          <span className="badge badge-blue">⭐ {progress?.xpTotal || 0} XP</span>
          <span className="badge badge-red" style={{ textTransform: 'capitalize' }}>Rank: {campaign?.rank?.replace('_', ' ')}</span>
          <button className="btn btn-outline btn-sm" onClick={() => setShowMetrics(prev => !prev)}>
            {showMetrics ? '📊 Hide Analytics' : '📊 View Analytics'}
          </button>
        </div>
      </div>

      {/* Campaign progression ribbon */}
      <div style={styles.ribbonContainer}>
        <div style={styles.ribbonTitle}>CAMPAIGN ADVOCACY HIERARCHY</div>
        <div style={styles.ribbonScroll}>
          {RANKS.map((r, idx) => {
            const isCompleted = idx < currentRankIdx;
            const isActive = idx === currentRankIdx;
            return (
              <div key={r.id} style={styles.ribbonNode}>
                <div 
                  style={{
                    ...styles.ribbonDot,
                    ...(isCompleted ? styles.dotCompleted : {}),
                    ...(isActive ? styles.dotActive : {})
                  }}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div style={{
                  ...styles.ribbonLabel,
                  ...(isActive ? styles.labelActive : {})
                }}>
                  {r.label}
                </div>
              </div>
            );
          })}
        </div>
        {currentRankIdx < RANKS.length - 1 && (
          <button className="btn btn-primary btn-sm mt-2" onClick={triggerPromotion}>
            ⚖️ Request Bar Promotion Board Review
          </button>
        )}
      </div>

      {/* Collapsible Analytics Summary Dashboard */}
      {showMetrics && analytics && (
        <div className="card-hi mb-3 fade-up" style={{ maxWidth: '800px', margin: '0 auto 2rem', padding: '1.5rem' }}>
          <div className="eyebrow mb-1">LEARNER PROFILE ANALYTICS</div>
          <h3 className="display" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Legal Competency Index</h3>
          
          <div className="g3 mb-3">
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>⏱️</div>
              <div className="bold">{analytics.studyHours} Hrs</div>
              <div className="text-xs text-muted">Study Time Logged</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🎯</div>
              <div className="bold">{analytics.readinessScore}%</div>
              <div className="text-xs text-muted">Bar Readiness Index</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🏆</div>
              <div className="bold">+{campaign?.reputationScore || 0} Points</div>
              <div className="text-xs text-muted">Reputation Score</div>
            </div>
          </div>

          <div className="g2">
            <div>
              <div className="eyebrow mb-2">Subject Mastery Ratings</div>
              {Object.entries(analytics.masteryScores || {}).map(([sub, score]) => (
                <div key={sub} style={{ marginBottom: '12px' }}>
                  <div className="flex between text-sm mb-1">
                    <span style={{ textTransform: 'capitalize' }}>{sub.replace('_', ' ')}</span>
                    <span className="bold">{score}%</span>
                  </div>
                  <div className="meter" style={{ height: '8px' }}>
                    <div className="meter-fill" style={{ width: `${score}%`, background: 'var(--gold)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="eyebrow mb-2">Top Concept Misconceptions</div>
              <div className="flex col gap-1">
                {analytics.mistakeLog?.map((m, idx) => (
                  <div key={idx} className="card flex between items" style={{ padding: '8px 12px', background: 'rgba(211,109,93,0.05)', borderColor: 'rgba(211,109,93,0.2)' }}>
                    <span className="text-sm bold" style={{ color: 'var(--red)' }}>⚠️ {m.concept}</span>
                    <span className="badge badge-red">{m.count} Errors</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specialization selection banner */}
      {progress?.specialization === 'general' && (
        <div className="card-gold mb-3 fade-up" style={{ maxWidth: '800px', margin: '0 auto 2rem', padding: '1.5rem' }}>
          <div className="eyebrow mb-1">Specialization Focus Selection</div>
          <h3 className="display text-gold" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Unlock Target Practice Modules</h3>
          <div className="g4">
            <button className="btn btn-outline btn-sm" onClick={() => selectSpecialization('criminal')}>⚖️ Criminal Trial</button>
            <button className="btn btn-outline btn-sm" onClick={() => selectSpecialization('civil')}>📜 Civil Litigation</button>
            <button className="btn btn-outline btn-sm" onClick={() => selectSpecialization('constitutional')}>🏛️ Appellate Writ</button>
            <button className="btn btn-outline btn-sm" onClick={() => selectSpecialization('corporate')}>🏢 Transactional</button>
          </div>
        </div>
      )}

      {/* snaking map of Worlds */}
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {Object.values(worlds).map((world) => (
          <div key={world.id} style={styles.worldSection}>
            <div style={styles.worldTitleRow}>
              <div style={styles.worldBadge}>WORLD {world.id}</div>
              <h2 className="display" style={{ fontSize: '1.3rem', color: 'var(--text-main)' }}>{world.title}</h2>
            </div>

            <div style={styles.worldLessonsCol}>
              {world.lessons.map((lesson, idx) => {
                const offset = Math.sin(idx * 1.6) * 50;

                let icon = '🔒';
                let stateStyle = styles.nodeLocked;

                if (lesson.isCompleted) {
                  icon = '✅';
                  stateStyle = styles.nodeCompleted;
                } else if (lesson.isUnlocked) {
                  icon = '⭐';
                  stateStyle = styles.nodeUnlocked;
                }

                return (
                  <div
                    key={lesson.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transform: `translateX(${offset}px)`,
                      transition: 'transform 0.2s',
                      opacity: lesson.isUnlocked ? 1 : 0.6
                    }}
                  >
                    <button
                      onClick={() => startLesson(lesson, lesson)}
                      style={{
                        ...styles.lessonNode,
                        ...stateStyle
                      }}
                      className={lesson.isUnlocked && !lesson.isCompleted ? 'pulse-node' : ''}
                    >
                      {icon}
                    </button>
                    <div style={styles.nodeLabel}>{lesson.title}</div>
                    <div style={styles.nodeSub}>{lesson.difficulty.toUpperCase()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Scoped CSS styles matching the NyayaSim theme
const styles = {
  playingLayout: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'start',
    minHeight: '70vh',
    position: 'relative'
  },
  bubbleCard: {
    background: 'var(--navy-mid)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem'
  },
  speechBubble: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '1.25rem',
    color: 'var(--text-main)'
  },
  optBtn: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '1rem',
    background: 'var(--navy-mid)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--text-main)',
    fontSize: '14px',
    transition: 'background 0.2s, border 0.2s'
  },
  optBtnSelected: {
    background: 'rgba(201, 168, 76, 0.1)',
    borderColor: 'var(--gold)'
  },
  optBtnWrong: {
    background: 'rgba(211, 109, 93, 0.1)',
    borderColor: 'var(--red)'
  },
  tutorTray: {
    position: 'fixed',
    top: 0, right: 0, bottom: 0,
    width: '320px',
    background: 'var(--navy-mid)',
    borderLeft: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out'
  },
  tutorHeader: {
    padding: '1rem',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'between',
    alignItems: 'center'
  },
  tutorHistory: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  userMsg: {
    alignSelf: 'end',
    background: 'rgba(201, 168, 76, 0.15)',
    border: '1px solid var(--border)',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    maxWidth: '85%',
    color: 'var(--white)'
  },
  botMsg: {
    alignSelf: 'start',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border)',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    maxWidth: '85%',
    color: 'var(--text-main)',
    lineHeight: 1.4
  },
  tutorForm: {
    padding: '1rem',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    gap: '8px'
  },
  tutorInput: {
    flex: 1,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '2px',
    padding: '4px 8px',
    color: 'var(--white)',
    fontSize: '12px',
    outline: 'none'
  },
  worldSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    borderBottom: '1px dashed var(--border)',
    paddingBottom: '2.5rem'
  },
  worldTitleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  worldBadge: {
    alignSelf: 'start',
    fontSize: '9px',
    fontFamily: 'var(--f-mono)',
    color: 'var(--gold)',
    letterSpacing: '0.1em',
    background: 'rgba(201, 168, 76, 0.1)',
    border: '1px solid var(--border)',
    padding: '2px 6px',
    borderRadius: '2px'
  },
  worldLessonsCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3rem',
    padding: '1rem 0'
  },
  lessonNode: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    cursor: 'pointer',
    border: '4px solid transparent',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  nodeLocked: {
    background: 'rgba(255,255,255,0.02)',
    borderColor: 'var(--border)',
    cursor: 'not-allowed'
  },
  nodeUnlocked: {
    background: 'var(--navy-mid)',
    borderColor: 'var(--gold)',
    boxShadow: '0 0 15px rgba(201, 168, 76, 0.4)'
  },
  nodeCompleted: {
    background: 'rgba(82, 196, 26, 0.1)',
    borderColor: 'var(--green)'
  },
  nodeLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--text-main)',
    marginTop: '8px',
    textAlign: 'center',
    maxWidth: '120px'
  },
  nodeSub: {
    fontSize: '9px',
    fontFamily: 'var(--f-mono)',
    color: 'var(--text-muted)',
    marginTop: '2px'
  },

  // Ribbon
  ribbonContainer: {
    maxWidth: '800px',
    margin: '0 auto 2rem',
    background: 'var(--navy-mid)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center'
  },
  ribbonTitle: {
    fontSize: '10px',
    fontFamily: 'var(--f-mono)',
    color: 'var(--gold)',
    letterSpacing: '0.1em',
    marginBottom: '1rem'
  },
  ribbonScroll: {
    display: 'flex',
    overflowX: 'auto',
    gap: '20px',
    padding: '10px 0',
    justifyContent: 'flex-start',
    alignItems: 'center',
    scrollbarWidth: 'none'
  },
  ribbonNode: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '90px'
  },
  ribbonDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border)',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    marginBottom: '6px'
  },
  dotCompleted: {
    background: 'var(--green-dim)',
    borderColor: 'var(--green)',
    color: 'var(--green)'
  },
  dotActive: {
    background: 'var(--gold-dim)',
    borderColor: 'var(--gold)',
    color: 'var(--gold)',
    boxShadow: '0 0 10px var(--gold)'
  },
  ribbonLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap'
  },
  labelActive: {
    color: 'var(--white)',
    fontWeight: 'bold'
  }
};
