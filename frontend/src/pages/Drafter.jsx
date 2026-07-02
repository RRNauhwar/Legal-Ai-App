import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';

const DOCS = [
  { value:'FIR', label:'🚨 FIR', desc:'First Information Report' },
  { value:'Bail Application', label:'🔓 Bail Application', desc:'S.437/439 CrPC' },
  { value:'Writ Petition', label:'📜 Writ Petition', desc:'Art.226/32 petition' },
  { value:'Legal Notice', label:'📨 Legal Notice', desc:'Formal legal notice' },
  { value:'Affidavit', label:'📋 Affidavit', desc:'Sworn statement' },
  { value:'Contract', label:'🤝 Contract', desc:'Agreement between parties' },
];

const TEMPLATES = {
  'FIR': `FIRST INFORMATION REPORT
(Under Section 154 Cr.P.C.)

Police Station: _________________   FIR No.: _______
District: _______________________   Date: ___________

1. Type of Information: Written / Oral

2. Day and Date of Occurrence: _________________
   Time of Occurrence: _________________

3. Name of Complainant: _________________
   Address: _________________
   Phone: _________________

4. Name / Description of Accused (if known):
   _________________

5. Reasons for Delay in Reporting (if any):
   _________________

6. Particulars of Properties Stolen / Involved:
   _________________

7. Details of the Offence / Incident:
   (Describe clearly what happened, where, when, and how)
   
   _________________
   _________________
   _________________

8. Sections of Law Applied: _________________

Signature of Complainant: _________________
Name and Signature of Officer In Charge: _________________`,

  'Bail Application': `IN THE COURT OF _________________ [JUDGE / SESSIONS / HIGH COURT]
[PLACE]

BAIL APPLICATION NO. _______ OF 20___

IN THE MATTER OF:
[Name of Accused], S/o [Father's Name],
Age: _____, Occupation: _____,
R/o [Full Address]
                                        ...APPLICANT / ACCUSED

VERSUS

STATE OF [STATE NAME]
                                        ...RESPONDENT

APPLICATION UNDER SECTION 437 / 439 CrPC FOR GRANT OF BAIL

MOST RESPECTFULLY SHOWETH:

1. That the applicant has been arrested on ________ in FIR No. ________ dated ________ at Police Station ________ for offences under Section(s) ________ of the IPC.

2. That the applicant is innocent and has been falsely implicated. 

3. That the alleged offence [is bailable / the applicant is entitled to bail in the circumstances].

4. That the applicant is a permanent resident of [Address] and is not likely to abscond or misuse liberty.

5. That there is no likelihood of tampering with evidence or influencing witnesses.

6. That the applicant is [mention: family responsibilities / medical condition / employment / age].

PRAYER:
It is, therefore, most respectfully prayed that this Honourable Court may be pleased to:

(a) Grant bail to the applicant on such terms and conditions as this Court may deem fit.
(b) Pass such other orders as this Court may deem fit and proper.

Place: _________________           Advocate for Applicant
Date: _________________            Enrolment No.: _____________`,

  'Writ Petition': `IN THE HIGH COURT OF [STATE]
[OR: IN THE SUPREME COURT OF INDIA]

WRIT PETITION (CIVIL / CRIMINAL) NO. _______ OF 20___

IN THE MATTER OF:
[Full name of petitioner(s)]
[Address]
                                        ...PETITIONER(S)

VERSUS

[Full name of respondent(s)]
[Address / Ministry]
                                        ...RESPONDENT(S)

WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA
[OR ARTICLE 32 FOR SUPREME COURT]

MOST RESPECTFULLY SHOWETH:

FACTS OF THE CASE:
1. [State relevant facts chronologically]

GROUNDS:
(a) That the impugned action/order is in violation of Article ___ of the Constitution.
(b) That the respondent has acted beyond its statutory authority.
(c) That the impugned action violates the principles of natural justice — audi alteram partem.
(d) [Additional grounds]

QUESTIONS OF LAW:
(i) Whether ___________?
(ii) Whether ___________?

PRAYER:
It is prayed that this Honourable Court may be pleased to:
(a) Issue a Writ of [Mandamus / Certiorari / Habeas Corpus / Prohibition / Quo Warranto] directing...
(b) [Additional relief sought]
(c) Award costs to the petitioner.

Place: _________________           Counsel for Petitioner
Date: _________________            Enrolment No.: _____________`,
};

export default function Drafter({ aiOnline }) {
  const [docType, setDocType] = useState('FIR');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [tab, setTab]         = useState('draft');

  function loadTemplate() {
    const t = TEMPLATES[docType];
    if (t) { setContent(t); setResult(null); toast.success('Template loaded — fill in the blanks!'); }
    else toast('No template for this document type yet. Start drafting!');
  }

  async function evaluate() {
    if (content.trim().length < 100) { toast.error('Write more before evaluating (min 100 chars)'); return; }
    setLoading(true); setResult(null);
    try {
      if (aiOnline) {
        const d = await api.evaluateDraft(docType, content);
        setResult(d.evaluation);
      } else {
        // Offline evaluation based on basic checks
        const hasTitle  = content.includes(docType.split(' ')[0].toUpperCase()) || content.length > 200;
        const hasDate   = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|date/i.test(content);
        const hasSign   = /sign|signature/i.test(content);
        const wordCount = content.trim().split(/\s+/).length;
        const baseScore = Math.min(90, 45 + (wordCount > 100 ? 15 : 0) + (hasDate ? 10 : 0) + (hasSign ? 10 : 0) + (hasTitle ? 10 : 0));
        setResult({
          score: baseScore,
          formatCorrectness: { score: hasTitle?75:50, feedback: hasTitle?'Good document structure.':'Add proper document title/header.' },
          legalLanguage:     { score: 65, feedback: 'Use formal legal language. Phrases like "Respectfully Showeth", "Most humbly prayed", "Deponent sayeth" are standard.' },
          completeness:      { score: hasDate&&hasSign?75:55, feedback: hasDate&&hasSign?'Document has key components.':'Add date, signatures, and all required parties.' },
          corrections:       [{ issue:'Missing section references', fix:`Cite relevant ${docType==='FIR'?'IPC':'CrPC/Constitution'} sections explicitly.` }],
          suggestions:       ['Always cite the specific section of law you are invoking','Use party names consistently throughout','Ensure proper court/authority address is mentioned'],
          improvedOpening:   `[${docType.toUpperCase()}]\n\nIN THE MATTER OF:\n[Full party names and details]\n\n[Body of document with relevant section citations]\n\nMost respectfully submitted.`
        });
      }
      setTab('result');
      toast.success('Evaluation complete!');
    } catch (e) {
      toast.error('Evaluation failed: ' + e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="fade-up">
      <div className="pg-header">
        <h1>🖊️ Legal Drafter</h1>
        <p>Draft FIRs, petitions, bail applications and get {aiOnline?'AI':'offline'} feedback</p>
      </div>

      {!aiOnline && <div className="mode-banner offline mb-2">📚 Offline mode — basic structural evaluation available without AI.</div>}

      <div style={{display:'grid',gridTemplateColumns:'190px 1fr',gap:'1.5rem'}}>
        {/* Doc type */}
        <div style={{display:'flex',flexDirection:'column',gap:'.35rem'}}>
          <div style={{fontSize:'.68rem',color:'var(--muted)',fontFamily:'var(--f-mono)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'.25rem'}}>Document Type</div>
          {DOCS.map(d=>(
            <button key={d.value} onClick={()=>{setDocType(d.value);setResult(null);setTab('draft');}}
              style={{padding:'.6rem .75rem',borderRadius:'var(--r-sm)',border:`1px solid ${docType===d.value?'var(--gold)':'var(--border)'}`,background:docType===d.value?'var(--gold-dim)':'var(--bg2)',color:docType===d.value?'var(--gold)':'var(--muted)',cursor:'pointer',textAlign:'left',transition:'all .18s',fontSize:'.82rem'}}>
              <div style={{fontWeight:700}}>{d.label}</div>
              <div style={{fontSize:'.7rem',opacity:.8}}>{d.desc}</div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div>
          <div className="flex between items mb-2">
            <div className="tabs" style={{marginBottom:0}}>
              <button className={`tab-btn ${tab==='draft'?'active':''}`} onClick={()=>setTab('draft')}>✏️ Draft</button>
              {result && <button className={`tab-btn ${tab==='result'?'active':''}`} onClick={()=>setTab('result')}>📊 Evaluation</button>}
            </div>
            <div className="flex gap-1">
              <button className="btn btn-outline btn-sm" onClick={loadTemplate}>📋 Template</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setContent('');setResult(null);setTab('draft');}}>🗑️ Clear</button>
            </div>
          </div>

          {tab === 'draft' && (
            <div>
              <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',overflow:'hidden',marginBottom:'1rem'}}>
                <div style={{padding:'.5rem 1rem',background:'var(--bg3)',borderBottom:'1px solid var(--border)',display:'flex',gap:'1rem',alignItems:'center'}}>
                  <span style={{fontFamily:'var(--f-mono)',fontSize:'.72rem',color:'var(--muted)',textTransform:'uppercase'}}>{docType}</span>
                  <span style={{fontFamily:'var(--f-mono)',fontSize:'.7rem',color:'var(--faint)'}}>{content.length} chars</span>
                </div>
                <textarea className="textarea" value={content} onChange={e=>setContent(e.target.value)}
                  placeholder={`Start drafting your ${docType} here.\nClick "Template" to load a proper format to fill in.`}
                  style={{minHeight:480,border:'none',borderRadius:0,fontFamily:'var(--f-mono)',fontSize:'.8rem',lineHeight:1.85,padding:'1.1rem',background:'var(--bg2)'}}
                />
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={evaluate} disabled={loading||content.length<100}>
                {loading?<><span className="spin"/>Evaluating...</>:'🤖 Evaluate Draft'}
              </button>
            </div>
          )}

          {tab === 'result' && result && (
            <div className="fade-up">
              {/* Score */}
              <div className="card-hi flex items gap-3 mb-3" style={{padding:'1.5rem'}}>
                <div className="score-ring" style={{borderColor:result.score>=75?'var(--green)':result.score>=55?'var(--gold)':'var(--red)',background:result.score>=75?'var(--green-dim)':result.score>=55?'var(--gold-dim)':'var(--red-dim)'}}>
                  <span className="score-ring-val" style={{color:result.score>=75?'var(--green)':result.score>=55?'var(--gold)':'var(--red)'}}>{result.score}</span>
                  <span className="score-ring-sub">/100</span>
                </div>
                <div>
                  <h3 className="display" style={{fontSize:'1.3rem',marginBottom:'.25rem'}}>{docType} Evaluation</h3>
                  <div className="flex gap-1 wrap" style={{fontSize:'.82rem',color:'var(--muted)'}}>
                    {result.formatCorrectness && <span>Format: <strong style={{color:'var(--gold)'}}>{result.formatCorrectness.score}/100</strong></span>}
                    {result.legalLanguage && <span>Language: <strong style={{color:'var(--gold)'}}>{result.legalLanguage.score}/100</strong></span>}
                    {result.completeness && <span>Completeness: <strong style={{color:'var(--gold)'}}>{result.completeness.score}/100</strong></span>}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {['formatCorrectness','legalLanguage','completeness'].map(k => result[k] && (
                <div key={k} className="card mb-2">
                  <div className="flex between items mb-1">
                    <span style={{fontWeight:600,fontSize:'.875rem'}}>{k==='formatCorrectness'?'📐 Format':k==='legalLanguage'?'⚖️ Legal Language':'✅ Completeness'}</span>
                    <span style={{fontFamily:'var(--f-mono)',color:'var(--gold)',fontWeight:700}}>{result[k].score}/100</span>
                  </div>
                  <p style={{fontSize:'.82rem',color:'var(--muted)'}}>{result[k].feedback}</p>
                </div>
              ))}

              {/* Corrections */}
              {result.corrections?.length>0 && (
                <div className="card mb-2">
                  <h4 className="display mb-2" style={{color:'var(--red)',fontSize:'.95rem'}}>✏️ Corrections</h4>
                  {result.corrections.slice(0,4).map((c,i)=>(
                    <div key={i} style={{padding:'.5rem .75rem',background:'var(--bg1)',borderRadius:'var(--r-sm)',marginBottom:'.4rem',fontSize:'.8rem'}}>
                      <div style={{color:'var(--red)',fontFamily:'var(--f-mono)',marginBottom:'.15rem'}}>Issue: {c.issue||c.line}</div>
                      <div style={{color:'var(--green)'}}>Fix: {c.fix||c.correction}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions?.length>0 && (
                <div className="card-gold mb-2">
                  <h4 className="display mb-1" style={{color:'var(--gold)',fontSize:'.95rem'}}>💡 Tips</h4>
                  {result.suggestions.map((s,i)=><div key={i} style={{fontSize:'.82rem',color:'var(--prose)',marginBottom:'.25rem'}}>→ {s}</div>)}
                </div>
              )}

              {(result.improvedDraft||result.improvedOpening) && (
                <div>
                  <h4 className="display mb-2" style={{color:'var(--green)',fontSize:'.95rem'}}>✅ Improved Version</h4>
                  <div style={{background:'var(--bg2)',border:'1px solid rgba(76,175,125,.25)',borderRadius:'var(--r-md)',padding:'1.1rem',whiteSpace:'pre-wrap',fontFamily:'var(--f-mono)',fontSize:'.78rem',lineHeight:1.85,maxHeight:360,overflowY:'auto',marginBottom:'1rem'}}>
                    {result.improvedDraft||result.improvedOpening}
                  </div>
                  <button className="btn btn-outline" onClick={()=>{setContent(result.improvedDraft||result.improvedOpening);setTab('draft');toast.success('Improved version loaded!');}}>
                    Use Improved Version →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
