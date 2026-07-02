import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONSTITUTION_CATEGORIES } from '../data/legalResources.js';

const MODULES = {
  IPC: {
    title: 'Indian Penal Code',
    icon: '⚔️',
    desc: 'Learn how facts become offences, how mental state changes liability, and how courts distinguish similar-looking charges.',
    teacher: 'Start by identifying the act, then the mental state, then the exact statutory ingredients. Good advocacy comes from precision, not just memory.',
    articles: [
      {
        id: 's299',
        citation: 'S.299 IPC',
        title: 'Culpable Homicide',
        summary: 'The foundational section for unlawful killing where intention or knowledge exists.',
        explanation: 'In argument, this is usually your starting point before deciding whether the facts become murder under Section 300 or remain at the lower level of culpable homicide.',
        example: 'A person strikes another during a fight knowing the blow is likely to cause death. Even if the prosecution struggles to prove murder, Section 299 still frames the basic offence.',
        teacherTip: 'Always compare S.299 and S.300 side by side. The courtroom battle often turns on whether the case crosses that higher threshold.'
      },
      {
        id: 's300',
        citation: 'S.300 IPC',
        title: 'Murder',
        summary: 'The aggravated form of culpable homicide with stricter intent and injury standards.',
        explanation: 'Use this section to argue that the accused intended death, intended a fatal injury, or acted in a manner so dangerous that death was the probable result.',
        example: 'If someone repeatedly attacks a victim with a deadly weapon at close range targeting vital organs, the prosecution will argue Section 300 rather than merely Section 299.',
        teacherTip: 'Do not forget the exceptions. Grave and sudden provocation and similar exceptions can move the case back toward Section 304.'
      },
      {
        id: 's304',
        citation: 'S.304 IPC',
        title: 'Culpable Homicide Not Amounting to Murder',
        summary: 'The fallback section when death occurs but the facts do not fully satisfy murder.',
        explanation: 'This is often the defense’s battleground. You concede seriousness but argue the legal threshold for murder is not met.',
        example: 'A sudden fight with no premeditation and one fatal blow may support a Section 304 argument instead of Section 302.',
        teacherTip: 'This section is powerful because it gives the court a middle path between conviction for murder and full acquittal.'
      }
    ]
  },
  CrPC: {
    title: 'Code of Criminal Procedure',
    icon: '⚖️',
    desc: 'Follow the life of a criminal case from FIR to arrest, remand, trial, and bail.',
    teacher: 'When you read CrPC, think in sequence: how did the case start, what happened during custody, and what procedural rights were triggered at each stage?',
    articles: [
      {
        id: 's154',
        citation: 'S.154 CrPC',
        title: 'First Information Report',
        summary: 'The statutory gateway for recording information relating to a cognizable offence.',
        explanation: 'In court, FIR arguments often focus on delay, omission, embellishment, and whether the prosecution story has changed over time.',
        example: 'If a complainant reports assault two days later with no explanation, the defense may argue the delay creates doubt and invites fabrication.',
        teacherTip: 'Do not treat the FIR as the whole case. It starts the process, but it is not a substitute for full proof at trial.'
      },
      {
        id: 's167',
        citation: 'S.167 CrPC',
        title: 'Remand',
        summary: 'Controls custody when investigation cannot be completed within the initial period.',
        explanation: 'This section becomes crucial in custody challenges, illegal detention questions, and arguments over whether police acted within lawful timelines.',
        example: 'If the police keep an accused beyond the lawful period without proper remand orders, the defense can attack the detention as illegal.',
        teacherTip: 'Always pair this with constitutional protections under Article 22 when arguing unlawful detention.'
      },
      {
        id: 's437439',
        citation: 'S.437 / S.439 CrPC',
        title: 'Bail Powers',
        summary: 'These provisions guide when courts can grant bail in non-bailable offences.',
        explanation: 'Bail advocacy is practical lawyering: gravity, flight risk, witness influence, custody duration, and parity all matter.',
        example: 'A student advocate may argue that continued custody is unnecessary because investigation is complete and the accused has roots in the community.',
        teacherTip: 'A strong bail argument sounds balanced. Acknowledge the accusation, then show why custody is no longer needed.'
      }
    ]
  },
  Constitution: {
    title: 'Constitution of India',
    icon: '🏛️',
    desc: 'Understand how rights, State power, fairness, and remedies are argued in real constitutional litigation.',
    teacher: 'Constitutional advocacy is not just about quoting rights. It is about showing how State action fails legality, fairness, proportionality, or due process.',
    articles: [
      {
        id: 'a14',
        citation: 'Art.14',
        title: 'Equality Before Law',
        summary: 'The constitutional shield against arbitrariness and unfair State action.',
        explanation: 'Article 14 is the court’s language for saying power must be exercised rationally, consistently, and not by whim.',
        example: 'If licenses are cancelled for one group of traders but not others without any intelligible basis, Article 14 becomes central.',
        teacherTip: 'Whenever something feels arbitrary, ask whether Article 14 can be your first doorway.'
      },
      {
        id: 'a19',
        citation: 'Art.19',
        title: 'Freedoms and Restrictions',
        summary: 'Protects core civil freedoms while allowing only limited and lawful restrictions.',
        explanation: 'Your argument should identify the freedom first, then attack or defend the restriction by testing its reasonableness and legal basis.',
        example: 'A blanket executive ban on a lawful business activity may be challenged as violating Article 19(1)(g) unless the State justifies it under Article 19(6).',
        teacherTip: 'Do not stop at “this is a right.” Move quickly to “is the restriction lawful, necessary, and proportionate?”'
      },
      {
        id: 'a21',
        citation: 'Art.21',
        title: 'Life and Personal Liberty',
        summary: 'The broad guarantee of dignity, liberty, and fair procedure.',
        explanation: 'Article 21 often becomes the moral and procedural center of a case, especially where detention, surveillance, reputation, or dignity is affected.',
        example: 'Keeping a person in detention without fair process or access to counsel can be framed as a direct violation of Article 21.',
        teacherTip: 'When facts involve unfairness, dignity, or liberty, Article 21 is often your strongest constitutional foundation.'
      }
    ]
  },
  Evidence: {
    title: 'Indian Evidence Act',
    icon: '🔍',
    desc: 'Study how courts decide relevance, admissibility, burden of proof, and documentary value.',
    teacher: 'Evidence advocacy is about discipline. Ask: Is it relevant? Is it admissible? Who must prove it? How reliable is it?',
    articles: [
      {
        id: 's45',
        citation: 'S.45 Evidence Act',
        title: 'Expert Opinion',
        summary: 'Lets courts rely on specialized knowledge where ordinary reasoning is not enough.',
        explanation: 'Forensic, medical, and technical experts can strongly influence the result, but cross-examination can still expose limits, assumptions, or bias.',
        example: 'A forensic report may support the prosecution, but the defense can challenge chain of custody, lab method, or overstatement by the expert.',
        teacherTip: 'Never treat expert evidence as unanswerable. Strong cross-examination often narrows its impact.'
      },
      {
        id: 's65b',
        citation: 'S.65B Evidence Act',
        title: 'Electronic Records',
        summary: 'A key provision for the admissibility of digital material such as chats, CCTV, and emails.',
        explanation: 'Modern litigation frequently rises or falls on whether digital evidence is properly certified and introduced.',
        example: 'If the prosecution produces WhatsApp screenshots without the required certification, the defense may attack admissibility under Section 65B.',
        teacherTip: 'Whenever you see digital evidence, ask immediately: where is the certificate and who produced the device record?'
      },
      {
        id: 's101',
        citation: 'S.101 Evidence Act',
        title: 'Burden of Proof',
        summary: 'Whoever asserts a fact must prove it.',
        explanation: 'This section is the structural backbone of trial advocacy. It tells you who must move first and who suffers if the evidence remains uncertain.',
        example: 'In a criminal case, the prosecution carries the main burden. The defense does not need to prove innocence; it often only needs to create doubt.',
        teacherTip: 'Use burden of proof as a courtroom weapon. It helps you keep the bench focused on who truly had to establish what.'
      }
    ]
  }
};

const QUIZ = [
  { q: 'If you want to argue illegal detention after 24 hours without production before a magistrate, your strongest constitutional hook is:', opts: ['Art.14', 'Art.19', 'Art.21 and Art.22', 'S.45 Evidence Act'], ans: 2, exp: 'Article 21 and Article 22 work together strongly in detention and arrest cases.' },
  { q: 'Which provision usually becomes the defense fallback when death occurred but murder is not fully established?', opts: ['S.302 IPC', 'S.304 IPC', 'S.154 CrPC', 'S.65B Evidence Act'], ans: 1, exp: 'Section 304 is the common fallback when the case does not fully satisfy murder.' },
  { q: 'What should you ask first when you see a screenshot or chat log in a case file?', opts: ['Who took the screenshot?', 'Where is the Section 65B foundation?', 'Was the witness emotional?', 'Did the FIR mention it?'], ans: 1, exp: 'Digital evidence arguments often begin with the Section 65B foundation.' },
  { q: 'A good constitutional argument under Article 19 should usually identify:', opts: ['Only the right', 'Only the judge', 'The right and whether the restriction is lawful and proportionate', 'Only damages'], ans: 2, exp: 'Constitutional advocacy needs both the right and a reasoned attack or defense of the restriction.' }
];

export default function StudyGuide() {
  const navigate = useNavigate();
  const [moduleKey, setModuleKey] = useState('IPC');
  const [search, setSearch] = useState('');
  const [activeArticle, setActiveArticle] = useState(MODULES.IPC.articles[0]);
  const [quizMode, setQuizMode] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const module = MODULES[moduleKey];
  const filteredArticles = useMemo(
    () => module.articles.filter((article) => `${article.citation} ${article.title} ${article.summary} ${article.explanation} ${article.example}`.toLowerCase().includes(search.toLowerCase())),
    [module, search]
  );

  function switchModule(nextKey) {
    setModuleKey(nextKey);
    setSearch('');
    setActiveArticle(MODULES[nextKey].articles[0]);
  }

  function startQuiz() {
    setQuizMode(true);
    setQuestionIndex(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }

  function answer(index) {
    if (selected !== null) return;
    setSelected(index);
    if (index === QUIZ[questionIndex].ans) setScore((value) => value + 1);
  }

  function next() {
    if (questionIndex === QUIZ.length - 1) {
      setDone(true);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelected(null);
  }

  if (quizMode) {
    const q = QUIZ[questionIndex];
    return (
      <div className="fade-up" style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="pg-header">
          <div>
            <div className="eyebrow">Teacher drill</div>
            <h1>Argument Practice Quiz</h1>
            <p>Quick revision designed to teach you how lawyers think, not just what they memorize.</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setQuizMode(false)}>Back to learning</button>
        </div>

        {done ? (
          <div className="card-gold" style={{ textAlign: 'center', padding: '2.6rem' }}>
            <div className="eyebrow">Result</div>
            <h2 className="display" style={{ fontSize: '2.5rem', marginTop: '.4rem' }}>Score {score}/{QUIZ.length}</h2>
            <p style={{ maxWidth: 500, margin: '.8rem auto 0', color: 'var(--muted)' }}>
              {score >= 3 ? 'Strong work. Your instincts are moving toward argument strategy, not just section recall.' : 'Keep going. The aim is to think like counsel: issue, rule, application, and response.'}
            </p>
            <div className="flex center gap-1 mt-2">
              <button className="btn btn-primary" onClick={startQuiz}>Retry quiz</button>
              <button className="btn btn-outline" onClick={() => setQuizMode(false)}>Return</button>
            </div>
          </div>
        ) : (
          <div className="card-hi">
            <div className="flex between items mb-2">
              <span className="badge badge-muted">Question {questionIndex + 1} / {QUIZ.length}</span>
              <span className="badge badge-gold">Score {score}</span>
            </div>
            <h2 className="display" style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{q.q}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {q.opts.map((option, index) => {
                const correct = index === q.ans;
                const chosen = index === selected;
                const style = selected === null ? {} : correct ? {
                  borderColor: 'rgba(120,182,144,0.5)',
                  background: 'rgba(120,182,144,0.16)'
                } : chosen ? {
                  borderColor: 'rgba(211,109,93,0.5)',
                  background: 'rgba(211,109,93,0.16)'
                } : {};
                return (
                  <button key={option} className="card" style={{ textAlign: 'left', cursor: 'pointer', ...style }} onClick={() => answer(index)}>
                    <span className="badge badge-muted" style={{ marginRight: '.5rem' }}>{'ABCD'[index]}</span>
                    {option}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <>
                <div className="assistant-card mt-2">
                  <div className="eyebrow">Teacher explanation</div>
                  <div className="text-sm" style={{ marginTop: '.45rem', color: 'var(--prose)' }}>{q.exp}</div>
                </div>
                <button className="btn btn-primary btn-full mt-2" onClick={next}>{questionIndex === QUIZ.length - 1 ? 'See result' : 'Next question'}</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div className="pg-header">
        <div>
          <div className="eyebrow">Teacher assistant</div>
          <h1>Learn How To Argue A Case</h1>
          <p>The learning section now teaches argument structure, detailed article understanding, practical courtroom use, and real-world style examples.</p>
        </div>
        <button className="btn btn-primary" onClick={startQuiz}>Start teacher quiz</button>
      </div>

      <div className="card-hi flex between items mb-3" style={{ background: 'var(--panel-strong)', border: '2px solid var(--gold-ring)', padding: '1.5rem', borderRadius: '16px' }}>
         <div className="flex gap-2 items">
            <img src="/judge_beaks.png" alt="Judge Beaks" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--gold)' }} />
            <div>
               <h3 className="display text-gold" style={{ fontSize: '1.4rem' }}>Play Judge Beaks Interactive Mode!</h3>
               <p className="text-sm text-prose mt-1">Want to learn with our interactive Gamified Skill Tree? Drop the textbook and step into the Interactive Path to unlock badges and XP.</p>
            </div>
         </div>
         <button className="btn btn-primary btn-lg" onClick={() => navigate('/judge-beaks')}>Play Gamified Route</button>
      </div>

      <div className="g2 mb-3">
        <div className="hero-panel">
          <span className="badge badge-gold">Learning mode</span>
          <h2 className="display" style={{ fontSize: '2rem', marginTop: '.75rem', color: 'var(--cream)' }}>{module.icon} {module.title}</h2>
          <p style={{ marginTop: '.55rem', color: 'var(--muted)' }}>{module.desc}</p>
        </div>
        <div className="assistant-card">
          <div className="eyebrow">Teacher assistant says</div>
          <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.65rem', lineHeight: 1.8 }}>{module.teacher}</div>
        </div>
      </div>

      {moduleKey === 'Constitution' && (
        <div className="card-hi mb-3">
          <div className="eyebrow">Constitution by practice category</div>
          <div className="g2 mt-2">
            {CONSTITUTION_CATEGORIES.map((category) => (
              <div key={category.id} className="card">
                <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{category.title}</div>
                <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>{category.desc}</div>
                <div className="flex gap-1 wrap mt-1">
                  {category.articles.map((article) => (
                    <span key={article.citation} className="badge badge-gold">{article.citation}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <a href="https://www.indiacode.nic.in/" target="_blank" rel="noreferrer" className="btn btn-outline mt-2">
            Open official full constitution source
          </a>
        </div>
      )}

      <div className="g2">
        <div className="card-hi">
          <div className="eyebrow">Modules</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', marginTop: '.8rem' }}>
            {Object.entries(MODULES).map(([key, value]) => (
              <button key={key} className={moduleKey === key ? 'card-gold' : 'card'} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => switchModule(key)}>
                <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{value.icon} {value.title}</div>
                <div className="text-sm text-muted" style={{ marginTop: '.2rem' }}>{value.desc}</div>
              </button>
            ))}
          </div>

          <div className="divider">Article Search</div>
          <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search inside ${module.title}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', marginTop: '.9rem' }}>
            {filteredArticles.map((article) => (
              <button key={article.id} className={activeArticle.id === article.id ? 'card-gold' : 'card'} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setActiveArticle(article)}>
                <div className="flex between items">
                  <span className="badge badge-gold">{article.citation}</span>
                  <span className="text-xs mono text-muted">Open</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--cream)', marginTop: '.45rem' }}>{article.title}</div>
                <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>{article.summary}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-hi">
            <div className="eyebrow">Detailed article view</div>
            <h2 className="display" style={{ fontSize: '1.9rem', marginTop: '.5rem' }}>{activeArticle.citation} · {activeArticle.title}</h2>
            <p style={{ marginTop: '.7rem', color: 'var(--muted)' }}>{activeArticle.summary}</p>
            <div className="assistant-card mt-2">
              <div className="eyebrow">What it means in court</div>
              <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.45rem' }}>{activeArticle.explanation}</div>
            </div>
            <div className="card mt-2">
              <div className="eyebrow">Real-life style example</div>
              <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.45rem' }}>{activeArticle.example}</div>
            </div>
            <div className="learning-callout mt-2">
              <strong style={{ color: 'var(--cream)' }}>Teacher tip</strong>
              <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.35rem' }}>{activeArticle.teacherTip}</div>
            </div>
          </div>

          <div className="card-hi">
            <div className="eyebrow">How to argue better</div>
            <div className="card mt-1">
              <div style={{ fontWeight: 700, color: 'var(--cream)' }}>1. Identify the issue</div>
              <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>Tell the court what legal question is actually being decided.</div>
            </div>
            <div className="card mt-1">
              <div style={{ fontWeight: 700, color: 'var(--cream)' }}>2. Cite the rule</div>
              <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>Use the section, article, or principle before you start describing feelings or conclusions.</div>
            </div>
            <div className="card mt-1">
              <div style={{ fontWeight: 700, color: 'var(--cream)' }}>3. Apply facts carefully</div>
              <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>Show how the exact facts satisfy or fail the statutory ingredients.</div>
            </div>
            <div className="card mt-1">
              <div style={{ fontWeight: 700, color: 'var(--cream)' }}>4. Ask for a result</div>
              <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>End with what the court should do: convict, acquit, quash, grant bail, or allow the petition.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
