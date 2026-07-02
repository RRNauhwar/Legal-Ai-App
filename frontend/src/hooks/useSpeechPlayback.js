import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeechPlayback(onPlaybackEnd) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true); // Default true so AI speaks automatically
  const [activeSpeaker, setActiveSpeaker] = useState(null); // 'judge' | 'prosecution' | 'defense' | 'witness' | null
  const queueRef = useRef([]);
  const onPlaybackEndRef = useRef(onPlaybackEnd);

  useEffect(() => {
    onPlaybackEndRef.current = onPlaybackEnd;
  }, [onPlaybackEnd]);

  const playVoice = useCallback((text, role) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    // Interrupt any active speaking immediately for instant feedback
    window.speechSynthesis.cancel();
    
    // Remove markdown for speech
    const cleanText = text.replace(/[*_#]/g, '').trim();

    // Replace queue with the fresh speech item
    queueRef.current = [{ text: cleanText, role }];
    setIsPlaying(false);
    
    setTimeout(processQueue, 50);
  }, [ttsEnabled]);

  const processQueue = () => {
    if (queueRef.current.length === 0) {
      setIsPlaying(false);
      setActiveSpeaker(null);
      if (onPlaybackEndRef.current) {
        onPlaybackEndRef.current();
      }
      return;
    }
    
    setIsPlaying(true);
    const { text, role } = queueRef.current.shift();
    
    // Skip system messages
    if (role === 'sys') {
      setActiveSpeaker(null);
      return processQueue();
    }

    setActiveSpeaker(role);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voices might load asynchronously
    let voices = window.speechSynthesis.getVoices();
    
    // Auto-detect Hindi based on characters (Devanagari script)
    const isHindi = /[\u0900-\u097F]/.test(text);
    utterance.lang = isHindi ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Different voices for different roles if available
    if (role === 'judge') {
      utterance.pitch = 0.8;
      utterance.rate = 0.95;
      const judgeVoice = voices.find(v => v.lang === (isHindi ? 'hi-IN' : 'en-GB') && v.name.toLowerCase().includes('male'))
                      || voices.find(v => v.lang.includes(isHindi ? 'hi' : 'GB'));
      if (judgeVoice) utterance.voice = judgeVoice;
    } else if (role === 'prosecution' || role === 'defense') {
      utterance.pitch = role === 'prosecution' ? 1.0 : 1.2;
      const inVoice = voices.find(v => v.lang.includes(isHindi ? 'hi' : 'IN'));
      if (inVoice) utterance.voice = inVoice;
    }

    utterance.onend = () => {
      setActiveSpeaker(null);
      // Slight pause between speakers
      setTimeout(processQueue, 300);
    };
    
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setActiveSpeaker(null);
      processQueue();
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopPlayback = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    setIsPlaying(false);
    setActiveSpeaker(null);
  }, []);
  
  const toggleTts = useCallback(() => {
    setTtsEnabled(prev => {
      if (prev) stopPlayback();
      return !prev;
    });
  }, [stopPlayback]);
  
  // Make sure voices are loaded initially
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => stopPlayback();
  }, [stopPlayback]);

  return { isPlaying, ttsEnabled, toggleTts, playVoice, stopPlayback, activeSpeaker };
}
