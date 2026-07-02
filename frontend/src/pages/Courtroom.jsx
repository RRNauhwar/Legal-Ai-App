import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';
import { useVoice } from '../hooks/useVoice.js';
import { useSpeechPlayback } from '../hooks/useSpeechPlayback.js';

// Inline component to format messages with simple markdown bold (**text**) and paragraphs
export function FormattedMessage({ text }) {
  if (!text) return null;
  const paragraphs = text.split('\n\n');
  return (
    <>
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        return (
          <p key={i} style={{ margin: '0.25rem 0', lineHeight: 1.5 }}>
            {lines.map((line, j) => {
              const parts = line.split(/(\*\*.*?\*\*)/);
              const elements = parts.map((part, k) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={k} style={{ color: 'var(--white)' }}>{part.slice(2, -2)}</strong>;
                }
                return part;
              });
              return (
                <React.Fragment key={j}>
                  {elements}
                  {j < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </>
  );
}

const ROLES = [
  { id: 'prosecution', label: 'Prosecution Counsel', icon: '🏛️', desc: 'Represent the State or Complainant. Argue for conviction or reliefs.' },
  { id: 'defense', label: 'Defense Counsel', icon: '⚖️', desc: 'Represent the Accused or Respondent. Mount defenses and raise doubts.' },
  { id: 'observer', label: 'Court Observer', icon: '👤', desc: 'Watch a longer AI-vs-AI trial to study litigation, objections, and bench decisions.' }
];

const ROOM_SEATS = [
  { id: 'judge', label: 'Judge Seat', icon: '⚖️' },
  { id: 'prosecution', label: 'Prosecution Counsel', icon: '🏛️' },
  { id: 'defense', label: 'Defense Counsel', icon: '⚖️' },
  { id: 'observer', label: 'Spectator Box', icon: '👤' }
];

const OBJECTIONS = ['Leading Question', 'Hearsay', 'Irrelevant', 'Speculative', 'Harassing the Witness'];

export default function Courtroom({ aiOnline }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState('setup'); // 'setup' | 'trial' | 'judgment' | 'report'
  const [sessionMode, setSessionMode] = useState('single'); // 'single' | 'multiplayer'
  const [role, setRole] = useState('prosecution'); // 'prosecution' | 'defense' | 'observer'
  const [caseData, setCaseData] = useState(location.state?.selectedCase || null);
  const [guidanceMode, setGuidanceMode] = useState(true);

  // Multiplayer variables
  const [roomCode, setRoomCode] = useState(location.state?.roomCode || '');
  const [joinCode, setJoinCode] = useState('');
  const [roomSeat, setRoomSeat] = useState('prosecution');
  const [roomData, setRoomData] = useState(null);

  // Trial variables
  const [messages, setMessages] = useState([]);
  const [userArgs, setUserArgs] = useState([]);
  const [userObjs, setUserObjs] = useState([]);
  const [sessionStart, setSessionStart] = useState(0);
  const [argText, setArgText] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [showSugg, setShowSugg] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [aiStyle, setAiStyle] = useState('Standard');
  const [language, setLanguage] = useState('en');
  const [is3D, setIs3D] = useState(false);

  // Sidebar Tabs
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'materials' | 'assistant'

  // Precedents search
  const [precedents, setPrecedents] = useState([]);
  const [precLoad, setPrecLoad] = useState(false);

  // Witness Stand
  const [activeWitness, setWitness] = useState(null);
  const [witnessQ, setWitnessQ] = useState('');
  const [wHistory, setWHistory] = useState([]);
  const [witnessLoading, setWitnessLoading] = useState(false);

  // Report & Judgment
  const [report, setReport] = useState(null);
  const [judgment, setJudgment] = useState('');
  const [objOpen, setObjOpen] = useState(true);

  // Audio, Video & ChatGPT Voice Mode
  const [voiceMode, setVoiceMode] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const displayName = localStorage.getItem('ns_user_name') || 'Advocate';

  // Callback for when voice playback finishes: restart mic in Voice Mode
  const handlePlaybackEnd = () => {
    if (voiceMode && audioOn) {
      setArgText('');
      setTimeout(() => {
        if (!voice.listening) {
          voice.start();
        }
      }, 600); // 600ms delay to prevent audio feedback
    }
  };

  const { ttsEnabled, toggleTts, playVoice, stopPlayback, isPlaying, activeSpeaker } = useSpeechPlayback(handlePlaybackEnd);

  // Custom voice transcript handler
  const handleVoiceTranscript = (text) => {
    setArgText(text);

    if (voiceMode && text.trim()) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      // Auto-submit after 1.8 seconds of silence in Voice Mode
      silenceTimerRef.current = setTimeout(() => {
        voice.stop();
        submitArgument(text.trim());
      }, 1800);
    }
  };

  const voice = useVoice(handleVoiceTranscript);

  // WebRTC camera stream handler
  useEffect(() => {
    if (videoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          setCameraStream(stream);
        })
        .catch((err) => {
          console.warn('[Webcam] Access denied or unavailable:', err);
          toast.error('Webcam not available. Showing avatar.');
          setVideoOn(false);
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoOn]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, videoOn]);

  const toggleVoiceMode = () => {
    setVoiceMode(prev => {
      const nextVal = !prev;
      if (nextVal) {
        if (!ttsEnabled) toggleTts(); // Auto enable TTS
        setArgText('');
        if (audioOn) setTimeout(() => voice.start(), 500);
      } else {
        voice.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }
      return nextVal;
    });
  };

  const toggleAudio = () => {
    setAudioOn(prev => {
      const nextVal = !prev;
      if (!nextVal) {
        voice.stop();
      } else if (voiceMode) {
        voice.start();
      }
      return nextVal;
    });
  };

  // Timer
  const [timerOn, setTimerOn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    if (!timerOn) return;
    if (timeLeft <= 0) {
      setTimerOn(false);
      toast('Time is up counsel. Conclude your statement.', { icon: '⏳' });
      return;
    }
    const t = setTimeout(() => setTimeLeft((val) => val - 1), 1000);
    return () => clearTimeout(t);
  }, [timerOn, timeLeft]);

  // Observer AI Loop
  const [observerRunning, setObsRunning] = useState(false);
  const observerLoopRef = useRef(null);

  const transcriptRef = useRef(null);
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, roomData, activeTab]);

  // Multiplayer Rooms Polling
  useEffect(() => {
    if (phase !== 'trial' || sessionMode !== 'multiplayer' || !roomCode) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getRoom(roomCode);
        setRoomData(data.room);
      } catch {}
    }, 2500);
    return () => clearInterval(interval);
  }, [phase, sessionMode, roomCode]);

  // Initial Case setup from state
  useEffect(() => {
    if (location.state?.selectedCase) {
      setCaseData(location.state.selectedCase);
    }
    if (location.state?.roomCode) {
      setRoomCode(location.state.roomCode);
      setSessionMode('multiplayer');
    }
  }, [location.state]);

  function addMsg(type, speaker, content) {
    const formatted = { id: `${Date.now()}-${Math.random()}`, type, speaker, content, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, formatted]);
  }

  async function createRoom() {
    if (!caseData) return;
    try {
      const data = await api.createRoom(caseData);
      setRoomCode(data.room.id);
      setRoomData(data.room);
      toast.success(`Room VC-${data.room.id} created!`);
    } catch {
      toast.error('Failed to create moot room.');
    }
  }

  async function joinRoom() {
    if (!joinCode.trim()) return;
    try {
      const data = await api.joinRoom(joinCode.trim().toUpperCase(), roomSeat, displayName);
      setRoomCode(data.room.id);
      setRoomData(data.room);
      setCaseData(data.room.caseData);
      toast.success('Joined successfully!');
    } catch (error) {
      toast.error(error.message || 'Seat occupied or room not found.');
    }
  }

  async function startTrial() {
    if (!caseData) return;
    setSessionStart(Date.now());
    setMessages([]);
    setUserArgs([]);
    setUserObjs([]);
    setPrecedents([]);

    if (sessionMode === 'multiplayer') {
      try {
        const data = await api.startRoom(roomCode);
        setRoomData(data.room);
        setPhase('trial');
      } catch {
        toast.error('Failed to call moot round.');
      }
      return;
    }

    setPhase('trial');

    // System details opening
    addMsg('sys', 'Court', '— IN THE SESSIONS COURT OF INDIA —');
    addMsg('sys', 'Court', `Matter: ${caseData.title} · ${caseData.caseNumber}`);
    
    setAiLoading(true);
    try {
      const opening = aiOnline
        ? (await api.judgeRespond([], `Open proceedings in ${caseData.title}. Both counsels will argue at length.`).catch(() => ({ response: caseData.offlineJudgeResponses?.default })))
        : { response: caseData.offlineJudgeResponses?.default };
      
      addMsg('judge', 'AI Judge', opening.response);
      playVoice(opening.response, 'judge');

      // AI Prosecution goes first if user is defense in single-player
      if (role === 'defense') {
        const prosecutionSeed = caseData.prosecutionArguments?.[0] || 'The prosecution submits that the accused is guilty beyond reasonable doubt.';
        let prosArgument = prosecutionSeed;
        if (aiOnline) {
          prosArgument = (await api.lawyerRespond(caseData.title, caseData.summary, [], prosecutionSeed, 'prosecution').catch(() => ({ response: prosecutionSeed }))).response;
        }
        addMsg('prosecution', 'AI opposing counsel', prosArgument);
        playVoice(prosArgument, 'prosecution');
      }
    } catch {
      const fallback = caseData.offlineJudgeResponses?.default || 'The court is now in session.';
      addMsg('judge', 'AI Judge', fallback);
      playVoice(fallback, 'judge');
    } finally {
      setAiLoading(false);
    }
  }

  // AI vs AI Spectator Loop
  useEffect(() => {
    if (phase !== 'trial' || role !== 'observer' || sessionMode === 'multiplayer') return;
    
    setObsRunning(true);
    let history = [];

    async function step() {
      if (!observerRunning) return;
      try {
        // AI Prosecution submits
        const prosSeed = caseData.prosecutionArguments?.[history.length % (caseData.prosecutionArguments?.length || 1)];
        const prosArg = aiOnline
          ? (await api.lawyerRespond(caseData.title, caseData.summary, history, prosSeed, 'prosecution')).response
          : prosSeed;
        
        addMsg('prosecution', 'AI Prosecution', prosArg);
        playVoice(prosArg, 'prosecution');
        history.push({ role: 'user', content: `AI Prosecution: ${prosArg}` });

        await new Promise(r => setTimeout(r, 6000));

        // AI Defense counters
        const defSeed = caseData.defenseArguments?.[history.length % (caseData.defenseArguments?.length || 1)];
        const defArg = aiOnline
          ? (await api.lawyerRespond(caseData.title, caseData.summary, history, defSeed, 'defense')).response
          : defSeed;
        
        addMsg('defense', 'AI Defense', defArg);
        playVoice(defArg, 'defense');
        history.push({ role: 'user', content: `AI Defense: ${defArg}` });

        await new Promise(r => setTimeout(r, 6000));

        // AI Judge intervenes
        const judgeText = aiOnline
          ? (await api.judgeRespond(history.slice(-4), `Counsel has argued. Give a realistic judicial comment.`)).response
          : caseData.offlineJudgeResponses?.default;
        
        addMsg('judge', 'AI Judge', judgeText);
        playVoice(judgeText, 'judge');
        history.push({ role: 'assistant', content: `AI Judge: ${judgeText}` });

        await new Promise(r => setTimeout(r, 8000));
        
        if (history.length < 8) {
          observerLoopRef.current = setTimeout(step, 1000);
        } else {
          setObsRunning(false);
          toast.success('AI oral arguments concluded. Delivering final verdict.');
          endTrial();
        }
      } catch {
        setObsRunning(false);
      }
    }

    observerLoopRef.current = setTimeout(step, 1500);
    return () => clearTimeout(observerLoopRef.current);
  }, [phase, role, sessionMode]);

  async function submitArgument(overrideText) {
    const text = (overrideText || argText).trim();
    if (!text) return;

    if (voice.listening) voice.stop();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    setArgText('');
    setShowSugg(false);

    // Multiplayer room submission
    if (sessionMode === 'multiplayer') {
      setAiLoading(true);
      try {
        const data = await api.roomTurn(roomCode, roomSeat, displayName, text);
        setRoomData(data.room);
      } catch (err) {
        toast.error('Failed to submit statement.');
      } finally {
        setAiLoading(false);
      }
      return;
    }

    // Single-player trial submission
    addMsg(role, displayName, text);
    setUserArgs((prev) => [...prev, text]);

    const newHist = messages
      .filter((m) => m.type !== 'sys')
      .map((m) => ({ role: m.type === 'judge' ? 'assistant' : 'user', content: `${m.speaker}: ${m.content}` }));
    newHist.push({ role: 'user', content: `${displayName}: ${text}` });

    setAiLoading(true);
    try {
      const oppSide = role === 'prosecution' ? 'defense' : 'prosecution';
      const oppSeed = caseData.defenseArguments?.[userArgs.length % (caseData.defenseArguments?.length || 1)] || 'The defense denies these allegations.';
      
      const oppArg = aiOnline
        ? (await api.lawyerRespond(caseData.title, caseData.summary + ` | Counsel Style: ${aiStyle}`, newHist.slice(-6), text, oppSide, language)).response
        : oppSeed;

      addMsg(oppSide, `AI opposing counsel`, oppArg);
      playVoice(oppArg, oppSide);
      newHist.push({ role: 'user', content: `AI opposing counsel: ${oppArg}` });

      setJudgeLoading(true);
      const judgePrompt = `Counsels have argued. Prosecution or defense has submitted: "${text}". Opposite counsel counter-argued: "${oppArg}". Offer a brief judicial intervention.`;
      
      const judgeArg = aiOnline
        ? (await api.judgeRespond(newHist.slice(-4), judgePrompt, language)).response
        : caseData.offlineJudgeResponses?.default;

      addMsg('judge', 'AI Judge', judgeArg);
      playVoice(judgeArg, 'judge');
    } catch {
      const fallback = caseData.offlineJudgeResponses?.default || 'The Court notes your argument. Proceed.';
      addMsg('judge', 'AI Judge', fallback);
      playVoice(fallback, 'judge');
    } finally {
      setAiLoading(false);
      setJudgeLoading(false);
    }
  }

  // Raise trial Objection
  async function raiseObjection(type) {
    if (sessionMode === 'multiplayer' && roomSeat === 'judge') return;
    
    // Stop recording if active
    if (voice.listening) voice.stop();

    const ctx = messages.slice(-2).map((m) => `${m.speaker}: ${m.content}`).join('\n');
    setUserObjs((prev) => [...prev, type]);

    addMsg('sys', 'Court', `${displayName} objects: "${type}"`);
    setAiLoading(true);

    try {
      const result = aiOnline 
        ? await api.handleObjection(type, ctx, sessionMode === 'multiplayer' ? roomSeat : role) 
        : { ruling: caseData.offlineJudgeResponses?.objection_hearsay || 'Objection Sustained.', sustained: true };

      addMsg('judge', 'AI Judge', result.ruling);
      playVoice(result.ruling, 'judge');
    } catch {
      addMsg('judge', 'AI Judge', 'Objection OVERRULED. Counsel, proceed.');
      playVoice('Objection OVERRULED. Counsel, proceed.', 'judge');
    } finally {
      setAiLoading(false);
    }
  }

  // Precedents retrieval
  async function getPrecedentsList() {
    const ctx = messages.slice(-3).map((m) => m.content).join('\n');
    setPrecLoad(true);
    try {
      const data = await api.getPrecedents(ctx || caseData.summary, language);
      setPrecedents(data.precedents || []);
      toast.success('Retrieved relevant precedents.');
    } catch {
      toast.error('Failed to locate precedents.');
    } finally {
      setPrecLoad(false);
    }
  }

  // Ask Witness
  async function askWitness() {
    if (!activeWitness || !witnessQ.trim()) return;
    
    // Stop mic
    if (voice.listening) voice.stop();

    const q = witnessQ.trim();
    setWitnessQ('');
    addMsg(role, displayName, `To witness: ${q}`);

    setWitnessLoading(true);
    const newHist = [...wHistory, { role: 'user', content: q }];
    try {
      const answer = aiOnline
        ? (await api.witnessAnswer(activeWitness, q, newHist.slice(-6))).answer
        : activeWitness.testimony;

      addMsg('witness', activeWitness.name, answer);
      playVoice(answer, 'witness');
      setWHistory([...newHist, { role: 'assistant', content: answer }]);
    } catch {
      addMsg('witness', activeWitness.name, activeWitness.testimony);
      playVoice(activeWitness.testimony, 'witness');
    } finally {
      setWitnessLoading(false);
    }
  }

  // Teacher suggestion hints
  async function getSuggestions() {
    if (!argText.trim()) return;
    try {
      const data = await api.getLegalSuggestions(argText, caseData.summary || caseData.title);
      setSuggestions(data.suggestions);
      setShowSugg(true);
    } catch {
      toast.error('Failed to fetch legal support suggestion.');
    }
  }

  async function endTrial() {
    setAiLoading(true);
    setObsRunning(false);
    clearTimeout(observerLoopRef.current);
    stopPlayback();
    voice.stop();

    if (sessionMode === 'multiplayer') {
      try {
        const data = await api.roomJudgment(roomCode);
        setJudgment(data.judgment);
        setPhase('judgment');
      } catch {
        setJudgment(`The Court reserves final judgment in VC-${roomCode}.`);
        setPhase('judgment');
      } finally {
        setAiLoading(false);
      }
      return;
    }

    addMsg('sys', 'Court', '— CLOSING ARGUMENTS CONCLUDED —');
    try {
      const finalJudgment = aiOnline
        ? (await api.deliverJudgment(caseData.title, caseData.prosecutionArguments || [], caseData.defenseArguments || []))
        : { judgment: `IN THE SESSIONS COURT OF INDIA\n\nCase: ${caseData.title}\n\nJUDGMENT\n\nThe court, having heard arguments, hereby rules. Accused is given the benefit of reasonable doubt and acquitted.` };
      
      setJudgment(finalJudgment.judgment);
      setPhase('judgment');
    } catch {
      setJudgment(`The Court quashes the proceedings in the case ${caseData?.title}.`);
      setPhase('judgment');
    } finally {
      setAiLoading(false);
    }
  }

  async function viewReport() {
    const duration = Math.max(1, Math.round((Date.now() - sessionStart) / 60000));
    const sessionData = { role, caseType: caseData.caseType, arguments: userArgs, objections: userObjs, duration };
    let analysis;
    try {
      if (aiOnline) {
        const res = await api.analyzePerformance(sessionData);
        analysis = res.analysis;
      } else {
        analysis = {
          overallScore: 78,
          badge: 'Sharp Thinker',
          breakdown: {
            argumentStrength: 75,
            legalKnowledge: 80,
            logicalReasoning: 74,
            speakingFluency: 82
          },
          strengths: ['Clear structure', 'Statutory citation reference'],
          weaknesses: ['Objection timings', 'Elaborating application points']
        };
      }
    } catch (err) {
      console.warn('[Courtroom] AI analysis failed, falling back to offline formula', err);
      analysis = { overallScore: 75, badge: 'Apprentice Advocate', breakdown: { argumentStrength: 70, legalKnowledge: 75, logicalReasoning: 75, speakingFluency: 80 }, strengths: ['Citing IPC codes'], weaknesses: ['Pacing arguments'] };
    }

    setReport(analysis);
    setPhase('report');

    // Save report to the backend database
    try {
      const savePayload = {
        caseId: caseData.id || 'custom',
        caseTitle: caseData.title || 'Custom Case',
        caseType: caseData.caseType || 'criminal',
        overallScore: analysis.overallScore || 0,
        breakdown: {
          argumentStrength: typeof analysis.breakdown?.argumentStrength === 'object' ? (analysis.breakdown.argumentStrength.score || 0) : (analysis.breakdown?.argumentStrength || 0),
          legalKnowledge: typeof analysis.breakdown?.legalKnowledge === 'object' ? (analysis.breakdown.legalKnowledge.score || 0) : (analysis.breakdown?.legalKnowledge || 0),
          logicalReasoning: typeof analysis.breakdown?.logicalReasoning === 'object' ? (analysis.breakdown.logicalReasoning.score || 0) : (analysis.breakdown?.logicalReasoning || 0),
          speakingFluency: typeof analysis.breakdown?.speakingFluency === 'object' ? (analysis.breakdown.speakingFluency.score || 0) : (analysis.breakdown?.speakingFluency || analysis.breakdown?.objectionHandling?.score || analysis.breakdown?.objectionHandling || 0)
        },
        badge: analysis.badge || 'Advocate'
      };
      await api.savePerformance(savePayload);
    } catch (saveErr) {
      console.error('[Courtroom] Failed to save performance log to database:', saveErr);
    }
  }

  function resetPractice() {
    setPhase('setup');
    setMessages([]);
    setUserArgs([]);
    setUserObjs([]);
    setReport(null);
    setJudgment('');
    setRoomData(null);
    setRoomCode('');
    setVoiceMode(false);
    setVideoOn(false);
    setAudioOn(true);
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    stopPlayback();
  }

  // Combined messages transcript
  const currentMessages = useMemo(() => {
    return roomData ? roomData.messages : messages;
  }, [roomData, messages]);

  const roomSeatOccupied = sessionMode === 'multiplayer' && roomData?.seats?.[roomSeat];

  // Active speaker highlighting variables
  const judgeSpeaker = activeSpeaker === 'judge';
  const prosSpeaker = activeSpeaker === 'prosecution' || (voice.listening && (role === 'prosecution' || roomSeat === 'prosecution'));
  const defSpeaker = activeSpeaker === 'defense' || (voice.listening && (role === 'defense' || roomSeat === 'defense'));
  const witnessSpeaker = activeSpeaker === 'witness';

  const userIsPros = role === 'prosecution' || roomSeat === 'prosecution';
  const userIsDef = role === 'defense' || roomSeat === 'defense';
  const userIsJudge = role === 'judge' || roomSeat === 'judge';

  const userIsSpeaking = voice.listening && argText.trim().length > 0;

  if (phase === 'setup') {
    return (
      <div className="fade-up courtroom-stage" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="pg-header">
          <div>
            <div className="eyebrow">Hearing room</div>
            <h1>Virtual Courtroom</h1>
            <p>Choose solo or multiplayer practice, select a case, and step into a hearing that feels more like a real court.</p>
          </div>
        </div>

        <div className="g2 mb-3">
          <div className="card-hi">
            <div className="eyebrow">Practice mode</div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.9rem' }}>
              {[
                { id: 'single', label: 'Single Player', desc: 'Solo practice, observer debate, AI bench.' },
                { id: 'multiplayer', label: 'Multiplayer Room', desc: 'Invite others and let AI cover empty seats.' }
              ].map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={sessionMode === option.id ? 'card-gold' : 'card'}
                  style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setSessionMode(option.id)}
                >
                  <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{option.label}</div>
                  <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card-hi">
            <div className="eyebrow">Case file</div>
            {!caseData ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '2.3rem', marginBottom: '.6rem' }}>📁</div>
                <div className="text-sm text-muted">No case selected yet.</div>
                <button className="btn btn-outline mt-2" onClick={() => navigate('/cases')}>Browse cases</button>
              </div>
            ) : (
              <div className="card-gold mt-1">
                <div className="flex between items mb-1">
                  <div className="flex gap-1 wrap">
                    <span className={`badge badge-${caseData.caseType === 'criminal' ? 'red' : caseData.caseType === 'constitutional' ? 'gold' : 'blue'}`}>{caseData.caseType}</span>
                    <span className="badge badge-muted">{caseData.difficulty}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCaseData(null)}>Change</button>
                </div>
                <h3 className="display" style={{ fontSize: '1.35rem' }}>{caseData.title}</h3>
                <div className="text-xs mono text-muted" style={{ margin: '.35rem 0 .7rem' }}>{caseData.caseNumber} · {caseData.court}</div>
                <p className="text-sm text-muted">{caseData.summary}</p>
              </div>
            )}
          </div>
        </div>

        <div className="assistant-card mb-3">
          <div className="flex between items">
            <div>
              <div className="eyebrow">Guided practice</div>
              <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.35rem' }}>
                Turn this on if you want the app to coach you while you practice and give stronger post-trial notes.
              </div>
            </div>
            <button className={guidanceMode ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} onClick={() => setGuidanceMode((value) => !value)}>
              {guidanceMode ? 'Guidance on' : 'Guidance off'}
            </button>
          </div>
        </div>

        <div className="g2">
          <div className="card-hi">
            <div className="eyebrow">{sessionMode === 'single' ? 'Role selection' : 'Seat selection'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '.9rem' }}>
              {(sessionMode === 'single' ? ROLES : ROOM_SEATS).map((item) => {
                const selected = sessionMode === 'single' ? role === item.id : roomSeat === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => sessionMode === 'single' ? setRole(item.id) : setRoomSeat(item.id)}
                    className={selected ? 'card-gold' : 'card'}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{item.icon ? `${item.icon} ${item.label}` : item.label}</div>
                    <div className="text-sm text-muted" style={{ marginTop: '.25rem' }}>{item.desc || 'Choose the seat you want to occupy in the room.'}</div>
                  </button>
                );
              })}
            </div>

            {sessionMode === 'single' && caseData && role !== 'observer' && (
              <div className="assistant-card mt-2">
                <div className="eyebrow">Your brief</div>
                {(role === 'prosecution' ? caseData.prosecutionArguments : caseData.defenseArguments)?.map((point, index) => (
                  <div key={index} className="text-sm" style={{ color: 'var(--prose)', marginTop: '.45rem' }}>• {point}</div>
                ))}
              </div>
            )}
          </div>

          <div className="card-hi">
            <div className="eyebrow">Multiplayer room</div>
            {sessionMode === 'multiplayer' ? (
              <>
                <div className="text-sm text-muted" style={{ marginTop: '.8rem' }}>
                  One person can be judge, one prosecution, one defense, and any number of observers. Empty advocate or judge seats can be backed by AI.
                </div>
                <div className="flex gap-1 mt-2">
                  <button className="btn btn-primary" onClick={createRoom} disabled={!caseData}>Create room</button>
                  {roomCode && <span className="badge badge-gold">Room {roomCode}</span>}
                </div>
                <input className="input mt-2" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Enter room code" />
                <button className="btn btn-outline mt-1" onClick={joinRoom}>Join selected seat</button>
                {roomData && (
                  <div className="assistant-card mt-2">
                    <div className="eyebrow">Current seats</div>
                    <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.55rem' }}>Judge: {roomData.seats.judge || 'AI available'}</div>
                    <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.35rem' }}>Prosecution: {roomData.seats.prosecution || 'AI available'}</div>
                    <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.35rem' }}>Defense: {roomData.seats.defense || 'AI available'}</div>
                    <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.35rem' }}>Observers: {roomData.seats.observer?.join(', ') || 'None yet'}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="assistant-card mt-2">
                <div className="eyebrow">Observer upgrade</div>
                <div className="text-sm" style={{ color: 'var(--prose)', marginTop: '.55rem' }}>
                  Observer mode now runs a longer AI-led courtroom hearing. You can study how prosecution and defense build arguments, how the judge intervenes, and how the case develops.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex center mt-3">
          <button className="btn btn-primary btn-xl" onClick={startTrial} disabled={!caseData || (sessionMode === 'multiplayer' && !roomCode) || roomSeatOccupied}>
            {sessionMode === 'multiplayer' ? 'Enter multiplayer hearing' : 'Call the court to order'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'judgment') {
    return (
      <div className="fade-up courtroom-stage" style={{ maxWidth: 860, margin: '0 auto', paddingTop: '4.8rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>⚖️</div>
          <h1 className="display" style={{ fontSize: '2rem', color: 'var(--gold)' }}>Court Judgment</h1>
          <p style={{ color: 'var(--muted)' }}>{caseData?.title}</p>
        </div>
        <div className="card-hi mb-3" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.9, fontSize: '.9rem' }}>{judgment}</div>
        <div className="flex center gap-2">
          {sessionMode === 'single' && <button className="btn btn-primary btn-lg" onClick={viewReport}>View performance report</button>}
          <button className="btn btn-outline" onClick={resetPractice}>Practice again</button>
        </div>
      </div>
    );
  }

  if (phase === 'report') {
    const totalWords = userArgs.join(' ').trim().split(/\s+/).filter(Boolean).length;
    const citationCount = userArgs.filter((item) => /section|article|ipc|crpc|evidence act|constitution/i.test(item)).length;
    const avgWords = userArgs.length ? Math.round(totalWords / userArgs.length) : 0;
    const coachingPlan = [
      citationCount < Math.max(1, Math.ceil(userArgs.length / 2)) ? 'Use statutory anchors more often. Try to mention at least one section or article in most submissions.' : 'Your citation habit is improving. Next, pair each citation with a stronger factual application.',
      avgWords < 45 ? 'Develop your submissions further. Most arguments should include issue, rule, application, and a closing ask.' : 'Your arguments have reasonable depth. Work next on sharper structure and cleaner sequencing.',
      userObjs.length === 0 ? 'Practice procedural interventions. You missed chances to object and shape the pace of the hearing.' : 'Keep refining objection timing. A good objection is short, timely, and tied to a clear evidentiary rule.',
      guidanceMode ? 'Use teacher-assistant hints to rehearse before submitting if you want stronger courtroom confidence.' : 'Turn guided practice on next time if you want live coaching during the hearing.'
    ];

    return (
      <div className="fade-up courtroom-stage" style={{ maxWidth: 840, margin: '0 auto', paddingTop: '4.8rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="eyebrow">Advocacy review</div>
          <h1 className="display" style={{ fontSize: '2rem' }}>Performance Report</h1>
          <p style={{ color: 'var(--muted)' }}>{caseData?.title} · Role: {role}</p>
        </div>
        {report && (
          <>
            <div className="card-hi mb-3" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
              <div className="score-ring">
                <span className="score-ring-val">{report.overallScore}</span>
                <span className="score-ring-sub">/100</span>
              </div>
              <div>
                <div className="display" style={{ fontSize: '1.6rem', color: report.overallScore >= 80 ? 'var(--green)' : report.overallScore >= 65 ? 'var(--gold)' : 'var(--red)' }}>
                  {report.overallScore >= 85 ? 'Outstanding' : report.overallScore >= 75 ? 'Excellent' : report.overallScore >= 65 ? 'Good' : 'Needs Practice'}
                </div>
                {report.badge && <span className="badge badge-gold mt-1">🏅 {report.badge}</span>}
              </div>
            </div>

            <div className="g2 mb-3">
              <div className="card-hi">
                <h3 className="display mb-2" style={{ fontSize: '1rem' }}>Score Breakdown</h3>
                {Object.entries(report.breakdown || {}).map(([key, value]) => {
                  const val = typeof value === 'object' ? value.score : value;
                  const feedback = typeof value === 'object' ? value.feedback : '';
                  return (
                    <div key={key} style={{ marginBottom: '1rem' }}>
                      <div className="flex between mb-1">
                        <span className="text-sm" style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="mono text-gold">{val}/100</span>
                      </div>
                      <div className="meter"><div className="meter-fill" style={{ width: `${val}%`, background: 'var(--gold)' }} /></div>
                      {feedback && <p className="text-xs text-muted" style={{ marginTop: '.3rem' }}>{feedback}</p>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card-hi">
                  <div className="eyebrow">Performance metrics</div>
                  <div className="text-sm" style={{ marginTop: '.55rem' }}>Arguments made: <strong>{userArgs.length}</strong></div>
                  <div className="text-sm" style={{ marginTop: '.35rem' }}>Average argument length: <strong>{avgWords} words</strong></div>
                  <div className="text-sm" style={{ marginTop: '.35rem' }}>Arguments with citations: <strong>{citationCount}</strong></div>
                  <div className="text-sm" style={{ marginTop: '.35rem' }}>Objections raised: <strong>{userObjs.length}</strong></div>
                </div>
                <div className="card-hi">
                  <div className="eyebrow">Strengths</div>
                  {report.strengths?.map((item, index) => <div key={index} className="text-sm" style={{ marginTop: '.45rem' }}>• {item}</div>)}
                </div>
                <div className="card-hi">
                  <div className="eyebrow">Improve next</div>
                  {report.weaknesses?.map((item, index) => <div key={index} className="text-sm" style={{ marginTop: '.45rem' }}>• {item}</div>)}
                </div>
              </div>
            </div>

            <div className="assistant-card mb-3">
              <div className="eyebrow">Detailed coaching plan</div>
              {coachingPlan.map((item, index) => (
                <div key={index} className="text-sm" style={{ color: 'var(--prose)', marginTop: '.55rem' }}>{index + 1}. {item}</div>
              ))}
            </div>
          </>
        )}
        <div className="flex center gap-2">
          <button className="btn btn-outline" onClick={resetPractice}>Practice again</button>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back home</button>
        </div>
      </div>
    );
  }

  const getAvatarChar = (msg) => {
    if (msg.type === 'judge') return '⚖️';
    if (msg.type === 'prosecution') return '🏛️';
    if (msg.type === 'defense') return '🛡️';
    if (msg.type === 'witness') return '👤';
    return '💬';
  };

  const getAvatarClass = (msg) => {
    if (msg.type === 'judge') return 'judge-chat-avatar';
    if (msg.type === 'prosecution') return 'pros-chat-avatar';
    if (msg.type === 'defense') return 'def-chat-avatar';
    if (msg.type === 'witness') return 'witness-chat-avatar';
    return 'user-chat-avatar';
  };

  return (
    <div 
      className="courtroom-shell courtroom-stage" 
      style={{ 
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(360px, 1fr)', gap: '1.25rem', height: 'calc(100vh - 4.5rem)', overflow: 'hidden', padding: '5.6rem 1rem 1rem', borderRadius: '28px', border: '1px solid var(--border-hi)',
        transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: is3D ? 'perspective(1400px) rotateX(4deg) rotateY(-4deg) scale(0.96) translateY(-15px)' : 'none',
        boxShadow: is3D ? '30px 40px 80px rgba(0,0,0,0.6), inset 0 0 40px rgba(223, 178, 107, 0.05)' : 'none'
      }}
    >
      {/* Self-contained CSS for YouTube layout grid and voice loop visualizer */}
      <style>{`
        .zoom-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.8rem;
          background: rgba(18, 34, 64, 0.35);
          padding: 0.8rem;
          border-radius: var(--r-lg);
          border: 1px solid var(--border);
          flex-shrink: 0;
          margin-bottom: 0.8rem;
        }
        .zoom-card {
          position: relative;
          background: #060a14;
          border-radius: var(--r-md);
          border: 2px solid var(--border);
          overflow: hidden;
          height: 155px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .zoom-card.speaking-glow {
          border-color: var(--gold);
          box-shadow: 0 0 16px rgba(201, 168, 76, 0.55);
          transform: translateY(-2px);
        }
        .zoom-video-container {
          flex: 1;
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #040810;
        }
        .zoom-webcam {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .zoom-avatar {
          font-size: 2.2rem;
          width: 68px;
          height: 68px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        .judge-avatar {
          background: linear-gradient(135deg, var(--gold-dim) 0%, #122240 100%);
          border: 2px solid var(--gold);
        }
        .pros-avatar {
          background: linear-gradient(135deg, rgba(139, 26, 26, 0.35) 0%, #122240 100%);
          border: 2px solid var(--crimson);
        }
        .def-avatar {
          background: linear-gradient(135deg, rgba(74, 144, 217, 0.35) 0%, #122240 100%);
          border: 2px solid var(--blue);
        }
        .witness-avatar {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, #122240 100%);
          border: 2px solid var(--text-muted);
        }
        .zoom-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(6, 10, 20, 0.85);
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255,255,255,0.06);
          color: var(--white);
        }
        .zoom-mute-icon {
          font-size: 0.8rem;
        }
        .voice-wave-indicator {
          position: absolute;
          bottom: 30px;
          right: 12px;
          display: flex;
          gap: 2.5px;
          align-items: flex-end;
          height: 14px;
        }
        .voice-wave-indicator span {
          width: 3px;
          background: var(--gold);
          border-radius: 99px;
          animation: bounce-wave 0.8s ease-in-out infinite alternate;
        }
        .voice-wave-indicator span:nth-child(1) { height: 3px; }
        .voice-wave-indicator span:nth-child(2) { animation-delay: 0.15s; height: 12px; }
        .voice-wave-indicator span:nth-child(3) { animation-delay: 0.3s; height: 7px; }
        @keyframes bounce-wave {
          0% { height: 3px; }
          100% { height: 14px; }
        }
        .voice-mode-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--panel-strong);
          border: 1px solid var(--border-hi);
          border-radius: var(--r-md);
          padding: 1.25rem;
          text-align: center;
          gap: 0.5rem;
          min-height: 150px;
        }
        .voice-wave-active {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          height: 28px;
          margin: 0.25rem 0;
        }
        .voice-wave-active span {
          width: 3px;
          height: 8px;
          background: var(--green);
          border-radius: 99px;
          animation: voice-pulse-wave 0.6s ease-in-out infinite alternate;
        }
        .voice-wave-active span:nth-child(1) { height: 6px; }
        .voice-wave-active span:nth-child(2) { animation-delay: 0.1s; height: 22px; }
        .voice-wave-active span:nth-child(3) { animation-delay: 0.2s; height: 14px; }
        .voice-wave-active span:nth-child(4) { animation-delay: 0.3s; height: 26px; }
        .voice-wave-active span:nth-child(5) { animation-delay: 0.4s; height: 6px; }
        @keyframes voice-pulse-wave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.4); }
        }

        /* YouTube chat bubble structures */
        .chat-message-row {
          display: flex;
          gap: 0.5rem;
          padding: 0.35rem 0.5rem;
          align-items: flex-start;
          transition: background-color 0.2s;
        }
        .chat-message-row:hover {
          background-color: rgba(255,255,255,0.015);
        }
        .chat-avatar-circle {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .judge-chat-avatar { background: var(--gold-dim); border: 1px solid var(--gold); }
        .pros-chat-avatar { background: rgba(139, 26, 26, 0.4); border: 1px solid var(--crimson); }
        .def-chat-avatar { background: rgba(74, 144, 217, 0.4); border: 1px solid var(--blue); }
        .witness-chat-avatar { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--text-muted); }
        .user-chat-avatar { background: rgba(201, 168, 76, 0.2); border: 1px solid var(--gold-ring); }

        .chat-bubble-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .chat-bubble-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-bottom: 0.1rem;
        }
        .chat-author-name {
          font-weight: 700;
          font-size: 0.72rem;
          color: var(--cream);
        }
        .chat-timestamp {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .chat-bubble-text {
          font-size: 0.78rem;
          color: var(--prose);
          line-height: 1.4;
        }
      `}</style>

      {/* LEFT COLUMN: Zoom Video Screen, Objections, Exhibits */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Full-width, Bold, Large Case Header */}
        <div style={{ marginBottom: '0.8rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>
          <h1 className="display" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--gold)', margin: 0, lineHeight: 1.3, letterSpacing: '-0.3px' }}>
            {caseData?.title}
          </h1>
          <div className="text-xs mono text-muted" style={{ marginTop: '0.2rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <span>{caseData?.caseNumber}</span>
            <span>·</span>
            <span>{caseData?.court}</span>
          </div>
        </div>

        {/* METADATA ACTION BAR */}
        <div className="card flex items gap-1" style={{ flexShrink: 0, marginBottom: '.6rem', padding: '.4rem .75rem', minHeight: '38px' }}>
          <span className={`badge ${sessionMode === 'multiplayer' ? 'badge-blue' : role === 'observer' ? 'badge-muted' : role === 'prosecution' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
            {sessionMode === 'multiplayer' ? `Seat: ${roomSeat}` : `Role: ${role}`}
          </span>
          <span className={`badge ${aiOnline ? 'badge-green' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>{aiOnline ? '● AI Active' : '○ Offline'}</span>
          
          <select className="select" style={{ width: 'auto', padding: '0.1rem 1.4rem 0.1rem 0.6rem', fontSize: '0.7rem', height: '24px', background: 'var(--panel-strong)' }} value={aiStyle} onChange={(e) => setAiStyle(e.target.value)}>
             <option value="Standard">Style: Standard</option>
             <option value="Aggressive Indian Litigator">Style: Aggressive</option>
             <option value="Academic & Constitutional Scholar">Style: Academic</option>
             <option value="Hyper-Defensive">Style: Defensive</option>
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
            <button className={`btn btn-sm ${is3D ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: '24px' }} onClick={() => setIs3D(b => !b)}>
               {is3D ? '🕶️ 3D On' : '🕶️ 3D Off'}
            </button>
            <button className={`btn btn-sm ${language === 'hi' ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: '24px' }} onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}>
              {language === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
            </button>
            <button className={`btn btn-sm ${ttsEnabled ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: '24px' }} onClick={toggleTts}>
              {ttsEnabled ? '🔊 Audio On' : '🔇 Audio Off'}
            </button>
          </div>
          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: '24px' }} onClick={endTrial} disabled={aiLoading || observerRunning}>End trial</button>
        </div>

        {/* WIDE ZOOM GALLERY GRID */}
        <div className="zoom-grid">
          {/* Box 1: Judge Seat */}
          <div className={`zoom-card ${judgeSpeaker || (userIsSpeaking && userIsJudge) ? 'speaking-glow' : ''}`}>
            <div className="zoom-video-container">
              {userIsJudge && videoOn && cameraStream ? (
                <video ref={videoRef} autoPlay playsInline muted className="zoom-webcam" />
              ) : (
                <div className="zoom-avatar judge-avatar">⚖️</div>
              )}
              {(judgeSpeaker || (userIsSpeaking && userIsJudge)) && (
                <div className="voice-wave-indicator"><span></span><span></span><span></span></div>
              )}
            </div>
            <div className="zoom-label">
              <span>{userIsJudge ? `${displayName} (Judge)` : 'AI Judge'}</span>
              <span className="zoom-mute-icon">{ (userIsJudge && !audioOn) ? '🔇' : '🎙️' }</span>
            </div>
          </div>

          {/* Box 2: Prosecution Box */}
          <div className={`zoom-card ${prosSpeaker ? 'speaking-glow' : ''}`}>
            <div className="zoom-video-container">
              {userIsPros && videoOn && cameraStream ? (
                <video ref={videoRef} autoPlay playsInline muted className="zoom-webcam" />
              ) : (
                <div className="zoom-avatar pros-avatar">🏛️</div>
              )}
              {prosSpeaker && (
                <div className="voice-wave-indicator"><span></span><span></span><span></span></div>
              )}
            </div>
            <div className="zoom-label">
              <span>
                {userIsPros 
                  ? `${displayName} (Pros)` 
                  : (sessionMode === 'multiplayer' && roomData?.seats?.prosecution 
                      ? `${roomData.seats.prosecution} (Pros)` 
                      : 'AI Prosecution')}
              </span>
              <span className="zoom-mute-icon">{ (userIsPros && !audioOn) ? '🔇' : '🎙️' }</span>
            </div>
          </div>

          {/* Box 3: Defense Box */}
          <div className={`zoom-card ${defSpeaker ? 'speaking-glow' : ''}`}>
            <div className="zoom-video-container">
              {userIsDef && videoOn && cameraStream ? (
                <video ref={videoRef} autoPlay playsInline muted className="zoom-webcam" />
              ) : (
                <div className="zoom-avatar def-avatar">🛡️</div>
              )}
              {defSpeaker && (
                <div className="voice-wave-indicator"><span></span><span></span><span></span></div>
              )}
            </div>
            <div className="zoom-label">
              <span>
                {userIsDef 
                  ? `${displayName} (Def)` 
                  : (sessionMode === 'multiplayer' && roomData?.seats?.defense 
                      ? `${roomData.seats.defense} (Def)` 
                      : 'AI Defense')}
              </span>
              <span className="zoom-mute-icon">{ (userIsDef && !audioOn) ? '🔇' : '🎙️' }</span>
            </div>
          </div>

          {/* Box 4: Witness Box (Renders if active witness on stand) */}
          {activeWitness && (
            <div className={`zoom-card ${witnessSpeaker ? 'speaking-glow' : ''}`}>
              <div className="zoom-video-container">
                <div className="zoom-avatar witness-avatar">👤</div>
                {witnessSpeaker && (
                  <div className="voice-wave-indicator"><span></span><span></span><span></span></div>
                )}
              </div>
              <div className="zoom-label">
                <span>{activeWitness.name} (Witness)</span>
                <span className="zoom-mute-icon">🎙️</span>
              </div>
            </div>
          )}
        </div>

        {/* WEBCAM CAMERA & AUDIO TOGGLES */}
        <div className="flex gap-1 mb-2 items" style={{ flexShrink: 0 }}>
          <button className={`btn btn-sm ${audioOn ? 'btn-outline' : 'btn-danger'}`} onClick={toggleAudio}>
            {audioOn ? '🎙️ Microphone On' : '🔇 Microphone Muted'}
          </button>
          <button className={`btn btn-sm ${videoOn ? 'btn-outline' : 'btn-danger'}`} onClick={() => setVideoOn(!videoOn)}>
            {videoOn ? '📹 Camera Connected' : '❌ Camera Stopped'}
          </button>
          <span className="text-xs text-muted font-mono ml-auto">
            {timerOn ? `⏳ speech limit: ${timeLeft}s` : 'no speech timer limit'}
          </span>
        </div>

        {/* COURT OBJECTIONS INTERACTIVE BAR */}
        {(sessionMode === 'multiplayer' ? roomSeat !== 'observer' && roomSeat !== 'judge' : role !== 'observer') && (
          <div className="card" style={{ flexShrink: 0, padding: '0.6rem 0.8rem', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="eyebrow" style={{ color: 'var(--red)', fontSize: '0.75rem', flexShrink: 0 }}>Lodge Objection:</span>
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', flex: 1, paddingBottom: '2px' }}>
                {OBJECTIONS.map((objection) => (
                  <button 
                    type="button" 
                    key={objection} 
                    className="obj-btn" 
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }} 
                    onClick={() => raiseObjection(objection)}
                  >
                    {objection}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SIDEBAR TABS SHIFTED DOWN UNDER ZOOM GRID ON MOBILE/DESKTOP LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
          {caseData?.witnesses?.length > 0 && (
            <div className="card mb-2" style={{ padding: '0.75rem' }}>
              <div className="eyebrow">Witness stand</div>
              <div className="flex gap-1 wrap mt-1">
                {caseData.witnesses.map((witness) => (
                  <button
                    type="button"
                    key={witness.id}
                    className={`btn btn-sm ${activeWitness?.id === witness.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setWitness(witness); setWHistory([]); }}
                  >
                    👤 {witness.name}
                  </button>
                ))}
              </div>
              {activeWitness && (
                <div style={{ marginTop: '.65rem', borderTop: '1px solid var(--border)', paddingTop: '.5rem' }}>
                  <div className="text-xs mono text-gold">On stand: {activeWitness.name}</div>
                  <div className="text-xs text-muted" style={{ margin: '.2rem 0 .5rem' }}>{activeWitness.testimony}</div>
                  <div className="flex gap-1">
                    <input className="input" style={{ height: '30px', fontSize: '0.8rem' }} value={witnessQ} onChange={(event) => setWitnessQ(event.target.value)} placeholder="Ask the witness..." />
                    <button className="btn btn-primary btn-sm" onClick={askWitness} disabled={witnessLoading || !witnessQ.trim()}>
                      {witnessLoading ? 'Asking...' : 'Ask'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {caseData?.evidence?.length > 0 && (
            <div className="card mb-2" style={{ padding: '0.75rem' }}>
              <div className="eyebrow" style={{ marginBottom: '.4rem' }}>Exhibits Board</div>
              <div className="evidence-scroll-container" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {caseData.evidence.map((item) => (
                  <div key={item.id} className="evidence-card" style={{ minWidth: '220px', padding: '0.5rem', background: 'var(--bg2)', borderRadius: '4px' }}>
                    <span className={`badge ${item.side === 'prosecution' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.6rem' }}>{item.side}</span>
                    <div className="text-xs text-muted mt-1">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: YouTube-Style Chat Sidebar with Tabs */}
      <div 
        style={{ 
          background: 'var(--bg2)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--r-lg)', 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          overflow: 'hidden' 
        }}
      >
        {/* YouTube Sidebar Header Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg1)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { id: 'chat', label: '💬 Live Chat' },
            { id: 'materials', label: '📁 Case Files' },
            { id: 'assistant', label: '💡 AI Help' }
          ].map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.65rem 0.4rem',
                background: activeTab === tab.id ? 'var(--panel-strong)' : 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : 'none',
                color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SCROLLABLE SIDEBAR CONTENT AREA */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* TAB 1: YOUTUBE LIVE CHAT RECORD */}
          {activeTab === 'chat' && (
            <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {currentMessages.map((message) => {
                if (message.type === 'sys') {
                  return (
                    <div key={message.id} style={{ textAlign: 'center', margin: '0.35rem 0', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '2px 8px', borderRadius: '4px' }}>
                      {message.content}
                    </div>
                  );
                }
                return (
                  <div key={message.id} className="chat-message-row">
                    <div className={`chat-avatar-circle ${getAvatarClass(message)}`}>
                      {getAvatarChar(message)}
                    </div>
                    <div className="chat-bubble-content">
                      <div className="chat-bubble-header">
                        <span className="chat-author-name" style={{ color: message.type === 'judge' ? 'var(--gold)' : message.type === 'prosecution' ? 'var(--red)' : message.type === 'defense' ? 'var(--blue)' : 'var(--cream)' }}>
                          {message.speaker}
                        </span>
                        <span className="chat-timestamp">{message.time}</span>
                      </div>
                      <div className="chat-bubble-text">
                        <FormattedMessage text={message.content} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {(aiLoading || judgeLoading || observerRunning) && (
                <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.4rem .5rem', fontSize: '0.75rem' }}>
                  <span className="spin" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                  {observerRunning ? 'AI is debating...' : judgeLoading ? 'Judge is thinking...' : 'AI Rebuttal loading...'}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CASE BRIEF / LEGAL TEXTS */}
          {activeTab === 'materials' && (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div className="card" style={{ padding: '0.6rem' }}>
                <div className="eyebrow">Brief summary</div>
                <div className="text-xs text-muted mt-1" style={{ lineHeight: 1.4 }}>{caseData?.summary}</div>
              </div>

              <div className="card" style={{ padding: '0.6rem' }}>
                <div className="eyebrow" style={{ color: 'var(--gold)' }}>Charges / legal claims</div>
                {caseData?.chargesOrClaims?.map((item, index) => (
                  <div key={index} className="text-xs text-muted mt-1">• {item}</div>
                ))}
              </div>

              {caseData?.relevantSections && (
                <div className="card" style={{ padding: '0.6rem' }}>
                  <div className="eyebrow" style={{ color: 'var(--amber)' }}>Statutory references</div>
                  {caseData.relevantSections.map((sec, index) => (
                    <div key={index} className="mt-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                      <strong className="text-xs text-gold">{sec.section}</strong>
                      <div className="text-xs text-muted">{sec.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {precedents.length > 0 && (
                <div className="card" style={{ padding: '0.6rem', borderColor: 'var(--amber)' }}>
                  <div className="eyebrow" style={{ color: 'var(--amber)' }}>precedents cited</div>
                  {precedents.map((item, index) => (
                    <div key={index} className="mt-1">
                      <div className="text-xs bold text-cream">{item.caseName}</div>
                      <div className="text-xs text-muted" style={{ fontStyle: 'italic' }}>{item.principle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BENCH PANEL & TA NOTES */}
          {activeTab === 'assistant' && (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div className="card" style={{ borderColor: 'var(--gold-ring)', background: 'var(--gold-dim)', padding: '0.6rem' }}>
                <div className="eyebrow">Bench guidance</div>
                <div className="text-xs text-muted mt-1" style={{ lineHeight: 1.4 }}>
                  Oral rounds are audio-narration enabled. Glowing rings indicate which advocate or judge is speaking in the court gallery.
                </div>
              </div>

              {guidanceMode && (
                <div className="assistant-card" style={{ padding: '0.6rem' }}>
                  <div className="eyebrow">Strategic suggestions</div>
                  <div className="text-xs text-muted mt-1" style={{ lineHeight: 1.4 }}>
                    • Match your factual points to statutory acts (e.g. S.300/302 IPC).
                  </div>
                  <div className="text-xs text-muted mt-1" style={{ lineHeight: 1.4 }}>
                    • Watch opposing counsel submissions. Object immediately under procedural rules if they cite hearsay.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INPUT PANEL FIXED AT THE BOTTOM OF THE SIDEPANEL */}
        {activeTab === 'chat' && (sessionMode === 'multiplayer' ? roomSeat !== 'observer' : role !== 'observer') && (
          <div style={{ padding: '0.5rem', background: 'var(--bg1)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {showSugg && (
              <div className="assistant-card mb-2" style={{ whiteSpace: 'pre-wrap', padding: '0.5rem', fontSize: '0.75rem' }}>
                <div className="eyebrow">TA Tip</div>
                <div>{suggestions}</div>
              </div>
            )}

            {voiceMode ? (
              // ChatGPT continuous voice loops UI
              <div className="voice-mode-overlay" style={{ minHeight: '120px', padding: '0.5rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                  <span className="status-dot" style={{ background: 'var(--green)', color: 'var(--green)', width: '6px', height: '6px' }} />
                  ChatGPT Voice Mode Active
                </div>
                <div className="voice-wave-active">
                  {voice.listening ? (
                    <>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </>
                  ) : (
                    <span style={{ animation: 'none', background: 'var(--text-muted)', transform: 'none', height: '3px', width: '15px' }}></span>
                  )}
                </div>
                <div className="text-xs text-cream" style={{ minHeight: '1.2rem', fontStyle: 'italic', color: 'var(--white)' }}>
                  {argText ? `"${argText}"` : (voice.listening ? 'Listening...' : 'Mic is paused')}
                </div>
                <div className="flex gap-1 mt-1 justify-center">
                  <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', height: '22px' }} onClick={toggleVoiceMode}>
                    ⌨️ Type
                  </button>
                  <button type="button" className={`btn btn-sm ${voice.listening ? 'btn-danger' : 'btn-primary'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', height: '22px' }} onClick={voice.toggle} disabled={!audioOn}>
                    {voice.listening ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            ) : (
              // Standard Typing UI
              <>
                <textarea
                  className="textarea"
                  value={argText}
                  onChange={(event) => setArgText(event.target.value)}
                  placeholder={sessionMode === 'multiplayer' && roomSeat === 'judge' ? 'Issue a judicial question or ruling...' : 'Type your oral argument here...'}
                  rows={2}
                  style={{ marginBottom: '.4rem', resize: 'none', fontSize: '0.78rem', padding: '0.35rem' }}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitArgument(); } }}
                />
                <div className="flex gap-1 wrap items">
                  <button type="button" className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={() => submitArgument()} disabled={aiLoading || !argText.trim()}>
                    Send
                  </button>
                  <button type="button" className={`btn btn-sm ${voice.listening ? 'btn-danger' : 'btn-outline'}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={voice.toggle} disabled={!audioOn}>
                    🎙️ {voice.listening ? 'Stop' : 'Voice'}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={toggleVoiceMode}>
                    🗣️ ChatGPT Mode
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 0.25rem', fontSize: '0.65rem' }} onClick={getSuggestions} disabled={!argText.trim()}>TA Suggest</button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 0.25rem', fontSize: '0.65rem', color: 'var(--amber)' }} onClick={getPrecedentsList} disabled={precLoad}>
                    {precLoad ? '...' : '🔍 Citations'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
