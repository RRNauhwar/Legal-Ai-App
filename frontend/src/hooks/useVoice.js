import { useState, useRef, useCallback } from 'react';

export function useVoice(onTranscript) {
  const [listening, setListening] = useState(false);
  const [error, setError]         = useState(null);
  const ref = useRef(null);

  const supported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const start = useCallback(() => {
    if (!supported) { setError('Use Chrome or Edge for voice input.'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-IN';
    r.onstart  = () => { setListening(true); setError(null); };
    r.onresult = (e) => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      if (onTranscript) onTranscript(final || interim);
    };
    r.onerror = (e) => { setError(e.error); setListening(false); };
    r.onend   = () => setListening(false);
    ref.current = r;
    r.start();
  }, [supported, onTranscript]);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => listening ? stop() : start(), [listening, start, stop]);

  return { listening, supported, error, start, stop, toggle };
}
