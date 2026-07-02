import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';
import { PUBLIC_CASE_SOURCES, TRENDING_CASES } from '../data/legalResources.js';

const TYPES = [
  { value: '', label: 'All Types' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'civil', label: 'Civil' },
  { value: 'constitutional', label: 'Constitutional' },
  { value: 'family', label: 'Family' },
  { value: 'cyber', label: 'Cyber' }
];

const DIFFS = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

export default function Cases({ aiOnline }) {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [filterType, setType] = useState('');
  const [filterDiff, setDiff] = useState('');
  const [genType, setGenType] = useState('criminal');
  const [genDiff, setGenDiff] = useState('intermediate');
  const [generating, setGen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publicTitle, setPublicTitle] = useState('');
  const [publicCourt, setPublicCourt] = useState('');
  const [publicSummary, setPublicSummary] = useState('');

  // Rating States
  const [previewRatings, setPreviewRatings] = useState({ average: 0, count: 0, reviews: [] });
  const [submittingRating, setSubmittingRating] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userReview, setUserReview] = useState('');

  useEffect(() => {
    loadCases();
  }, [filterType, filterDiff]);

  useEffect(() => {
    if (preview) {
      loadPreviewRatings(preview.id);
      setUserRating(5);
      setUserReview('');
    }
  }, [preview]);

  async function loadCases() {
    try {
      const data = await api.getCases(filterType || undefined, filterDiff || undefined);
      const caseList = data.cases || [];

      // Fetch rating summaries for all cases in parallel
      const enrichedCases = await Promise.all(
        caseList.map(async (c) => {
          try {
            const stats = await api.getCaseRatings(c.id);
            return {
              ...c,
              ratingStats: {
                average: stats.average || 0,
                count: stats.count || 0
              }
            };
          } catch {
            return { ...c, ratingStats: { average: 0, count: 0 } };
          }
        })
      );

      setCases(enrichedCases);
    } catch (err) {
      toast.error('Failed to load cases.');
      setCases([]);
    }
  }

  async function loadPreviewRatings(caseId) {
    try {
      const data = await api.getCaseRatings(caseId);
      setPreviewRatings(data);
    } catch (err) {
      console.error('[Cases] Error loading reviews:', err);
    }
  }

  async function submitRating() {
    if (!preview) return;
    setSubmittingRating(true);
    try {
      await api.rateCase(preview.id, userRating, userReview);
      toast.success('Review submitted successfully!');
      setUserReview('');
      loadPreviewRatings(preview.id);
      loadCases(); // Refresh average rating on the main grid
    } catch (err) {
      toast.error(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function generate() {
    if (!aiOnline) {
      toast.error('AI is offline. Case generation is unavailable right now.');
      return;
    }
    setGen(true);
    setPreview(null);
    try {
      const data = await api.generateCase(genType, genDiff);
      setPreview(data.case);
      toast.success('Case generated');
    } catch (error) {
      toast.error(`Generation failed: ${error.message}`);
    } finally {
      setGen(false);
    }
  }

  async function save() {
    if (!preview) return;
    setSaving(true);
    try {
      await api.saveCase(preview);
      toast.success('Case saved');
      loadCases();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  function convertPublicCase() {
    if (!publicTitle.trim() || !publicSummary.trim()) {
      toast.error('Add at least a title and a summary for the public case.');
      return;
    }

    const derivedCase = {
      id: `public-${Date.now()}`,
      title: publicTitle.trim(),
      caseType: 'constitutional',
      difficulty: 'advanced',
      caseNumber: 'PUBLIC PRACTICE FILE',
      court: publicCourt.trim() || 'Public court record',
      summary: publicSummary.trim(),
      chargesOrClaims: ['Derived from publicly available case material'],
      relevantSections: [{ section: 'Open legal record', description: 'Review the original public judgment before arguing.' }],
      prosecutionArguments: ['State or petitioner side should be built from the original public record.'],
      defenseArguments: ['Respondent side should be built from the original public record.'],
      evidence: [],
      witnesses: [],
      learningObjectives: [
        'Translate a real public case into a practice brief',
        'Identify the strongest legal issues from the original judgment',
        'Build arguments without losing fidelity to the actual record'
      ]
    };

    navigate('/courtroom', { state: { selectedCase: derivedCase } });
  }

  function handleSelectTrending(trendingItem) {
    const found = cases.find(c => c.id === trendingItem.caseId);
    if (found) {
      setPreview(found);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Loaded Case: ${found.title}`);
    } else {
      setPublicTitle(trendingItem.title);
      setPublicCourt(trendingItem.court);
      setPublicSummary(trendingItem.why);
      toast(`Case template loaded. Click 'Convert' to practice.`, { icon: '📝' });
    }
  }

  const typeColor = { criminal: 'red', civil: 'blue', constitutional: 'gold', family: 'green', cyber: 'blue' };

  return (
    <div className="fade-up">
      <div className="pg-header">
        <div>
          <div className="eyebrow">Case library</div>
          <h1>Practice Files</h1>
          <p>Use built-in files, generate fresh simulations, follow trending public-interest litigation, and convert public case material into a practice-ready brief.</p>
        </div>
      </div>

      <div className="g3 mb-3">
        <div className="card-hi" style={{ gridColumn: 'span 1' }}>
          <div className="eyebrow">AI case generator</div>
          {!aiOnline && <div className="mode-banner offline mt-1">AI offline. Generation is disabled, but saved and public practice files still work.</div>}
          <div className="text-xs mono text-muted mt-1">Case type</div>
          <div className="flex gap-1 wrap mt-1">
            {TYPES.slice(1).map((type) => (
              <button 
                type="button" 
                key={type.value} 
                className={genType === type.value ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} 
                onClick={() => { setGenType(type.value); }}
              >
                {type.label}
              </button>
            ))}
          </div>
          <div className="text-xs mono text-muted mt-2">Difficulty</div>
          <div className="flex gap-1 wrap mt-1">
            {DIFFS.slice(1).map((diff) => (
              <button 
                type="button" 
                key={diff.value} 
                className={genDiff === diff.value ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} 
                onClick={() => { setGenDiff(diff.value); }}
              >
                {diff.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-full mt-2" onClick={generate} disabled={generating || !aiOnline}>
            {generating ? 'Generating...' : 'Generate case'}
          </button>
          {preview && (
            <div className="flex gap-1 mt-2">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/courtroom', { state: { selectedCase: preview } })}>Use now</button>
            </div>
          )}
        </div>

        <div className="card-hi" style={{ gridColumn: 'span 1' }}>
          <div className="eyebrow">Public case practice</div>
          <div className="text-sm text-muted mt-1">
            Full nationwide live ingestion of every Indian court record would need a dedicated court-data pipeline. This app now gives you a practical bridge: pick a public source, summarize the case, and turn it into a courtroom practice brief instantly.
          </div>
          <input className="input mt-2" value={publicTitle} onChange={(event) => setPublicTitle(event.target.value)} placeholder="Public case title" />
          <input className="input mt-1" value={publicCourt} onChange={(event) => setPublicCourt(event.target.value)} placeholder="Court name" />
          <textarea className="textarea mt-1" value={publicSummary} onChange={(event) => setPublicSummary(event.target.value)} placeholder="Paste a summary of the publicly available case, legal issue, or judgment notes" />
          <button className="btn btn-primary btn-full mt-2" onClick={convertPublicCase}>Convert into practice file</button>
        </div>

        <div className="card-hi" style={{ gridColumn: 'span 1' }}>
          <div className="eyebrow">Public legal sources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem', marginTop: '.8rem' }}>
            {PUBLIC_CASE_SOURCES.map((source) => (
              <a key={source.title} href={source.url} target="_blank" rel="noreferrer" className="card" style={{ textDecoration: 'none' }}>
                <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{source.title}</div>
                <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>{source.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="g2 mb-3">
        <div className="card-hi">
          <div className="eyebrow">Trending public-interest watch</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '.9rem' }}>
            {TRENDING_CASES.map((item) => (
              <div 
                key={item.title} 
                className="card" 
                style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border)' }}
                onClick={() => handleSelectTrending(item)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div className="flex between items">
                  <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{item.title}</div>
                  <span className={`badge badge-${item.type === 'criminal' ? 'red' : item.type === 'cyber' ? 'blue' : item.type === 'family' ? 'green' : 'gold'}`}>{item.type}</span>
                </div>
                <div className="text-xs mono text-muted" style={{ marginTop: '.2rem' }}>{item.court}</div>
                <div className="text-sm text-muted" style={{ marginTop: '.35rem' }}>{item.why}</div>
                <div className="text-xs text-gold mt-1" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  ⚡ Click to practice Aarushi / Landmark case file
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-hi">
          <div className="eyebrow">Search filters</div>
          <select className="select mt-2" value={filterType} onChange={(event) => setType(event.target.value)}>
            {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <select className="select mt-1" value={filterDiff} onChange={(event) => setDiff(event.target.value)}>
            {DIFFS.map((diff) => <option key={diff.value} value={diff.value}>{diff.label}</option>)}
          </select>

          <div className="assistant-card mt-2">
            <div className="eyebrow">Practice guidance</div>
            <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.45rem' }}>
              For a real public case, first extract facts, issues, relief sought, and the core statute or constitutional article. Then convert that into a practice file and argue both sides.
            </div>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="card-gold fade-up">
          <div className="flex between items mb-2">
            <div className="flex gap-1 wrap">
              <span className={`badge badge-${typeColor[preview.caseType] || 'gold'}`}>{preview.caseType}</span>
              <span className="badge badge-muted">{preview.difficulty}</span>
              <span className="text-xs mono text-muted">{preview.caseNumber}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>Close</button>
          </div>
          <h2 className="display" style={{ fontSize: '1.35rem' }}>{preview.title}</h2>
          <p className="text-sm text-muted" style={{ marginTop: '.5rem' }}>{preview.summary}</p>
          <div className="g2 mt-2">
            <div>
              <div className="eyebrow">Claims / charges</div>
              {preview.chargesOrClaims?.map((item, index) => <div key={index} className="text-sm" style={{ marginTop: '.4rem' }}>• {item}</div>)}
            </div>
            <div>
              <div className="eyebrow">Learning objectives</div>
              {preview.learningObjectives?.map((item, index) => <div key={index} className="text-sm" style={{ marginTop: '.4rem' }}>• {item}</div>)}
            </div>
          </div>
          
          <div className="mt-3 card" style={{ background: 'var(--panel-strong)', border: '1px solid var(--border-hi)', padding: '1.25rem' }}>
            <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: '1.5rem', fontSize: '1rem' }}>Timeline of Events</div>
            <div style={{ position: 'relative', marginTop: '1rem', borderLeft: '2px solid var(--border-hi)', marginLeft: '8px', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {preview.summary?.split(/(?<=\.)\s+/).filter(s => s.trim().length > 10).map((sentence, index) => (
                <div key={index} style={{ position: 'relative' }}>
                   <div style={{ position: 'absolute', left: '-30px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 10px var(--gold)' }}></div>
                   <div className="text-sm" style={{ color: 'var(--cream)' }}>{sentence}</div>
                </div>
              ))}
              <div style={{ position: 'relative' }}>
                 <div style={{ position: 'absolute', left: '-30px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 10px var(--red)' }}></div>
                 <div className="text-sm" style={{ color: 'var(--cream)' }}><strong>Prosecution Posture:</strong> {preview.prosecutionArguments?.[0]}</div>
              </div>
              <div style={{ position: 'relative' }}>
                 <div style={{ position: 'absolute', left: '-30px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--blue)', boxShadow: '0 0 10px var(--blue)' }}></div>
                 <div className="text-sm" style={{ color: 'var(--cream)' }}><strong>Defense Posture:</strong> {preview.defenseArguments?.[0]}</div>
              </div>
            </div>
          </div>

          {/* Case ratings & reviews (database connected) */}
          <div className="mt-3 card" style={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', padding: '1.25rem' }}>
            <div className="flex between items mb-2">
              <div className="eyebrow" style={{ color: 'var(--gold)', margin: 0, fontSize: '1rem' }}>User Reviews</div>
              <span className="badge badge-gold">
                {previewRatings.count > 0 ? `★ ${previewRatings.average} (${previewRatings.count} reviews)` : 'No ratings yet'}
              </span>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              {previewRatings.reviews && previewRatings.reviews.length > 0 ? (
                previewRatings.reviews.map((r) => (
                  <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(251,248,244,0.05)' }}>
                    <div className="flex between items">
                      <strong className="text-cream text-xs">{r.userName}</strong>
                      <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.reviewText && <p className="text-sm" style={{ marginTop: '0.25rem', color: 'rgba(250,248,244,0.75)', lineHeight: 1.4 }}>{r.reviewText}</p>}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                  No reviews yet. Be the first to rate this case file!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="text-xs text-muted">Submit your review</div>
              <div className="flex gap-1 items">
                <span className="text-sm">Rating:</span>
                <select className="select" style={{ width: '100px', padding: '0.2rem' }} value={userRating} onChange={(e) => setUserRating(Number(e.target.value))}>
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                </select>
              </div>
              <textarea 
                className="textarea" 
                rows="2" 
                placeholder="Share your thoughts on this case brief..."
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
              />
              <button className="btn btn-outline btn-sm mt-1" onClick={submitRating} disabled={submittingRating} style={{ alignSelf: 'flex-start' }}>
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-full btn-lg mt-3" onClick={() => navigate('/courtroom', { state: { selectedCase: preview } })}>
            Enter courtroom with this file
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
          {cases.map((item) => (
            <div key={item.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setPreview(item)}>
              <div className="flex between items">
                <div style={{ flex: 1 }}>
                  <div className="flex items gap-2">
                    <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '1.05rem' }}>{item.title}</div>
                    {item.ratingStats?.count > 0 ? (
                      <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        ★ {item.ratingStats.average} ({item.ratingStats.count})
                      </span>
                    ) : (
                      <span className="badge badge-muted" style={{ opacity: 0.6 }}>No ratings yet</span>
                    )}
                  </div>
                  <div className="flex gap-1 wrap mt-1">
                    <span className={`badge badge-${typeColor[item.caseType] || 'gold'}`}>{item.caseType}</span>
                    <span className="badge badge-muted">{item.difficulty}</span>
                    <span className="text-xs mono text-muted">{item.caseNumber}</span>
                  </div>
                  <div className="text-sm text-muted" style={{ marginTop: '.45rem' }}>{item.summary}</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginLeft: '1rem' }} onClick={(event) => { event.stopPropagation(); navigate('/courtroom', { state: { selectedCase: item } }); }}>
                  Use
                </button>
              </div>
            </div>
          ))}
          {cases.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>No cases matched the current filter.</div>}
        </div>
      )}
    </div>
  );
}
