import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { LESSON_TREE } from '../data/lessons.js';

export default function JudgeBeaksPath() {
  const [completed, setCompleted] = useState(() => {
    const saved = localStorage.getItem('ns_lessons');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeLesson, setActiveLesson] = useState(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [quizResult, setQuizResult] = useState(null); // 'correct' or 'wrong'

  // Update localStorage when completed changes
  useEffect(() => {
    localStorage.setItem('ns_lessons', JSON.stringify(completed));
  }, [completed]);

  const currentLevel = Math.max(1, ...completed) + (completed.length > 0 && !completed.includes(LESSON_TREE.length) ? 1 : 0);
  const highestUnlocked = completed.length === 0 ? 1 : Math.min(LESSON_TREE.length, Math.max(...completed) + 1);

  function startLesson(lesson) {
    if (lesson.id > highestUnlocked) {
      toast.error("This lesson is locked! Complete previous lessons first.");
      return;
    }
    setActiveLesson(lesson);
    setDialogueIndex(0);
    setQuizMode(false);
    setSelectedOpt(null);
    setQuizResult(null);
  }

  function advanceDialogue() {
    if (dialogueIndex < activeLesson.dialogue.length - 1) {
      setDialogueIndex((prev) => prev + 1);
    } else {
      setQuizMode(true);
    }
  }

  function submitAnswer(index) {
    setSelectedOpt(index);
    if (index === activeLesson.exercise.correct) {
      setQuizResult('correct');
      // Mark as completed
      if (!completed.includes(activeLesson.id)) {
        setCompleted([...completed, activeLesson.id]);
        toast.success("Lesson Complete! +50 XP", { icon: '🔥' });
      }
    } else {
      setQuizResult('wrong');
    }
  }

  function exitLesson() {
    setActiveLesson(null);
  }

  if (activeLesson) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', paddingTop: '2rem' }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          
          <div className="flex between items mb-3">
             <button className="btn btn-ghost" onClick={exitLesson}>❌ Exit</button>
             <div className="meter" style={{ width: '60%', height: '12px' }}>
                <div className="meter-fill" style={{ width: quizMode ? '100%' : `${((dialogueIndex + 1) / activeLesson.dialogue.length) * 100}%`, background: 'var(--gold)' }} />
             </div>
          </div>

          <div className="card-hi flex items gap-2 mb-3" style={{ background: 'var(--panel-strong)', border: '2px solid var(--border)', borderRadius: '24px', padding: '2rem', minHeight: '200px' }}>
             <img src="/judge_beaks.png" alt="Judge Beaks" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--gold-ring)', boxShadow: '0 0 20px rgba(223, 178, 107, 0.4)' }} />
             <div className="speech-bubble" style={{ flex: 1, position: 'relative', background: 'var(--bg1)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                {quizMode ? (
                  quizResult === 'correct' ? <strong style={{color: 'var(--green)', fontSize: '1.2rem'}}>Brilliant! Absolutely correct.</strong> :
                  quizResult === 'wrong' ? <strong style={{color: 'var(--red)', fontSize: '1.2rem'}}>Not quite. Think like a lawyer!</strong> :
                  <div className="text-lg text-cream">{activeLesson.exercise.question}</div>
                ) : (
                  <div className="text-lg text-cream" style={{ lineHeight: 1.6 }}>"{activeLesson.dialogue[dialogueIndex]}"</div>
                )}
             </div>
          </div>

          {quizMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {quizResult === null || quizResult === 'wrong' ? (
                 activeLesson.exercise.options.map((opt, i) => (
                   <button 
                     key={i} 
                     className="card text-left" 
                     onClick={() => submitAnswer(i)}
                     style={{
                       background: selectedOpt === i ? 'rgba(211,109,93,0.1)' : 'var(--bg0)',
                       borderColor: selectedOpt === i ? 'var(--red)' : 'var(--border)',
                       cursor: 'pointer',
                       fontSize: '1.1rem',
                       transition: 'all 0.2s ease'
                     }}
                   >
                     {opt}
                   </button>
                 ))
               ) : (
                 <div className="card-gold fade-up" style={{ textAlign: 'center' }}>
                    <div className="eyebrow mb-1 text-gold-deep">Feedback</div>
                    <div className="text-sm mb-2" style={{ color: 'var(--wood)' }}>{activeLesson.exercise.explanation}</div>
                    <button className="btn btn-primary btn-lg btn-full" onClick={exitLesson}>Continue Journey</button>
                 </div>
               )}
            </div>
          ) : (
            <button className="btn btn-primary btn-lg btn-full" onClick={advanceDialogue}>Continue</button>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="pg-header text-center" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
        <div>
          <div className="eyebrow">Interactive Learning</div>
          <h1>Judge Beaks' Path</h1>
          <p>Master courtroom rules step-by-step. Let Judge Beaks guide you from a Junior clerk to a Master Advocate.</p>
        </div>
        <div className="flex center gap-2 wrap mt-2">
           <span className="badge badge-gold" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>🔥 Streak: {completed.length > 5 ? 2 : 1} Days</span>
           <span className="badge badge-blue" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>⭐ {completed.length * 50} XP</span>
        </div>
      </div>

      <div style={{ position: 'relative', padding: '2rem 0', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4rem' }}>
         <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '4px', background: 'var(--border)', zIndex: 0, marginLeft: '-2px' }}></div>
         
         {LESSON_TREE.map((lesson, index) => {
            const isCompleted = completed.includes(lesson.id);
            const isLocked = lesson.id > highestUnlocked;
            const isCurrent = lesson.id === highestUnlocked;
            
            // Snake effect calculation
            const offset = Math.sin(index * 1.5) * 80;

            let bgColor = 'var(--bg0)';
            let borderColor = 'var(--border)';
            let icon = '🔒';

            if (isCompleted) {
               bgColor = 'var(--green-dim)';
               borderColor = 'var(--green)';
               icon = '✅';
            } else if (isCurrent) {
               bgColor = 'var(--gold-dim)';
               borderColor = 'var(--gold)';
               icon = '⭐';
            }

            return (
              <div 
                key={lesson.id} 
                style={{ 
                  position: 'relative', 
                  zIndex: 2, 
                  transform: `translateX(${offset}px)`,
                  transition: 'transform 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: isLocked ? 0.5 : 1
                }}
              >
                <div className="eyebrow mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Lesson {lesson.id}</div>
                <button 
                  onClick={() => startLesson(lesson)}
                  className={`lesson-node ${isCurrent ? 'pulse-node' : ''}`}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: bgColor,
                    border: `4px solid ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    boxShadow: isCurrent ? '0 0 20px var(--gold)' : '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {icon}
                </button>
                <div className="bold text-sm text-center mt-1" style={{ maxWidth: '140px', color: isLocked ? 'var(--muted)' : 'var(--cream)' }}>
                  {lesson.title}
                </div>
              </div>
            );
         })}
      </div>
    </div>
  );
}
