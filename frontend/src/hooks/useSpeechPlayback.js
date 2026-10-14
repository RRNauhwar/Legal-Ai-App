import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Detect gender from character name, role, context, or explicit flag.
 */
export function detectGender({ name = '', text = '', role = '', explicitGender = null }) {
  if (explicitGender === 'female' || explicitGender === 'male') return explicitGender;

  const combined = `${name} ${role}`.toLowerCase();

  // Female indicators
  const femalePatterns = [
    /\b(female|woman|lady|girl|mrs|ms|miss|smt|dr\.\s*(priya|radhika|ananya|sunita|kavita|neha|pooja|meena|deepa|shanti|lakshmi|aarti|rekha|aditi|swati))\b/i,
    /\b(ananya|priya|sunita|kavita|neha|pooja|meena|deepa|shanti|lakshmi|aarti|rekha|aditi|swati|rohini|indira|fatima|aisha|simran|tanya|rupa|sneha|geeta|seema|kamla|sudha|jaya|radha|parvati|vidya|bina|sarita|usha|leela|vandana|alka|archana|nandini|manju|anita|pallavi|divya|shreya|riya|isha|tanvi)\b/i,
    /\b(wife|daughter|sister|mother|her|she|aunt|grandmother)\b/i
  ];

  for (const pattern of femalePatterns) {
    if (pattern.test(combined)) return 'female';
  }

  // Male indicators
  const malePatterns = [
    /\b(male|man|mr|shri|sir|lordship|his|he|brother|son|husband|father)\b/i,
    /\b(rajesh|vikram|rohan|rahul|suresh|ramesh|amit|vijay|anil|sunil|deepak|sanjay|arun|manoj|ashok|mukesh|dinesh|ajay|pradeep|naresh|kamal|rakesh|vinod|santosh|pankaj|d\.?\s*k\.?|v\.?\s*k\.?|r\.?\s*k\.?|a\.?\s*k\.?)\b/i
  ];

  for (const pattern of malePatterns) {
    if (pattern.test(combined)) return 'male';
  }

  return 'unknown';
}

/**
 * Synthesize a wooden gavel double-strike using Web Audio API.
 */
export function playGavel() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    function strike(delay) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + delay + 0.12);

      gain.gain.setValueAtTime(0.65, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    }

    strike(0.0);
    strike(0.18);
  } catch {
    // AudioContext unavailable or blocked by autoplay policy
  }
}

/**
 * Intelligent voice selection matching gender, language, and role.
 */
function selectBestVoice(voices, { isHindi, isFemale, role }) {
  if (!voices || voices.length === 0) return null;

  const targetLang = isHindi ? 'hi' : 'en';

  const femaleKeywords = [
    'female', 'woman', 'girl', 'samantha', 'victoria', 'karen', 'tessa', 'veena',
    'lekha', 'sangeeta', 'zira', 'hazel', 'susan', 'catherine', 'moira', 'fiona',
    'serena', 'yuna', 'amelie', 'anna', 'helena', 'swara', 'heera', 'kalpana', 'geeta'
  ];

  const maleKeywords = [
    'male', 'man', 'daniel', 'oliver', 'rishi', 'george', 'david', 'ravi',
    'hemant', 'alex', 'fred', 'bruce', 'tom', 'prabhat', 'madhav'
  ];

  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetLang));
  const pool = langVoices.length > 0 ? langVoices : voices;

  if (isFemale) {
    const match = pool.find(v => {
      const n = v.name.toLowerCase();
      return femaleKeywords.some(kw => n.includes(kw));
    });
    if (match) return match;

    if (!isHindi) {
      const enFemale = voices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
      if (enFemale) return enFemale;
    }
  } else {
    const match = pool.find(v => {
      const n = v.name.toLowerCase();
      return maleKeywords.some(kw => n.includes(kw));
    });
    if (match) return match;

    if (!isHindi) {
      const enMale = voices.find(v => maleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
      if (enMale) return enMale;
    }
  }

  return pool.find(v => v.lang.toLowerCase().includes(isHindi ? 'hi' : 'in')) || pool[0];
}

export function useSpeechPlayback(onPlaybackEnd) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState(null); // 'judge' | 'prosecution' | 'defense' | 'witness' | null
  const isPlayingRef = useRef(false);
  const queueRef = useRef([]);
  const onPlaybackEndRef = useRef(onPlaybackEnd);

  useEffect(() => {
    onPlaybackEndRef.current = onPlaybackEnd;
  }, [onPlaybackEnd]);

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setActiveSpeaker(null);
      if (onPlaybackEndRef.current) {
        onPlaybackEndRef.current();
      }
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    const item = queueRef.current.shift();
    const { text, role, gender, name } = item;

    if (role === 'sys' || !text) {
      setActiveSpeaker(null);
      return setTimeout(processQueue, 30);
    }

    setActiveSpeaker(role);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    const isHindi = /[\u0900-\u097F]/.test(text);
    const detectedGender = gender || detectGender({ name, role, text });
    const isFemale = detectedGender === 'female';

    utterance.lang = isHindi ? 'hi-IN' : 'en-IN';

    // Find tailored voice
    const matchedVoice = selectBestVoice(voices, { isHindi, isFemale, role });
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // Gender-specific acoustic modulation
    if (isFemale) {
      utterance.pitch = 1.22; // Distinct, natural feminine pitch
      utterance.rate = 1.0;
    } else {
      utterance.pitch = role === 'judge' ? 0.85 : 0.92; // Deep, authoritative masculine pitch
      utterance.rate = role === 'judge' ? 0.94 : 0.98;
    }

    utterance.onend = () => {
      setActiveSpeaker(null);
      // Brief natural pause before next speaker in the queue
      setTimeout(processQueue, 260);
    };

    utterance.onerror = (err) => {
      console.warn('[SpeechSynthesis] Playback error/cancellation:', err);
      setActiveSpeaker(null);
      setTimeout(processQueue, 100);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const playVoice = useCallback((text, role, options = {}) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    const { interrupt = false, gender = null, name = '' } = options;

    const cleanText = (text || '')
      .replace(/[*_#`~]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    if (interrupt) {
      window.speechSynthesis.cancel();
      queueRef.current = [{ text: cleanText, role, gender, name }];
      isPlayingRef.current = false;
      setIsPlaying(false);
      setTimeout(processQueue, 40);
    } else {
      queueRef.current.push({ text: cleanText, role, gender, name });
      if (!isPlayingRef.current) {
        processQueue();
      }
    }
  }, [ttsEnabled, processQueue]);

  const stopPlayback = useCallback((cancelImmediate = true) => {
    if (window.speechSynthesis && cancelImmediate) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveSpeaker(null);
  }, []);

  const toggleTts = useCallback(() => {
    setTtsEnabled(prev => {
      if (prev) stopPlayback(true);
      return !prev;
    });
  }, [stopPlayback]);

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => stopPlayback(true);
  }, [stopPlayback]);

  return {
    isPlaying,
    ttsEnabled,
    toggleTts,
    playVoice,
    stopPlayback,
    activeSpeaker,
    playGavel
  };
}
