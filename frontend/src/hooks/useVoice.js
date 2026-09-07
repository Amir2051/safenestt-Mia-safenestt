'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[>\-*+•]\s+/gm, '')
    .replace(/━+/g, '. ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function useVoice() {
  const [listening,  setListening]  = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [muted,      setMuted]      = useState(false);
  const [sttError,   setSttError]   = useState(''); // user-visible STT error

  const audioRef    = useRef(null);
  const recRef      = useRef(null);
  const mutedRef    = useRef(false); // sync ref so speak() always sees latest muted
  const listeningRef = useRef(false);

  // Keep mutedRef in sync
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Restore muted state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mia-muted');
    if (saved === 'true') {
      setMuted(true);
      mutedRef.current = true;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  // TTS via backend edge-tts (Microsoft Neural voices, no API key)
  const speak = useCallback(async (text) => {
    if (mutedRef.current) return;
    stopSpeaking();

    const clean = stripMarkdown(text);
    if (!clean) return;

    setSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice: 'en-US-AriaNeural' }),
      });

      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }, [stopSpeaking]);

  // speakFromUser and autoSpeak are the same now — no unlock gate needed
  const speakFromUser = useCallback((text) => speak(text), [speak]);
  const autoSpeak     = useCallback((text) => speak(text), [speak]);

  // ── STT: continuous mode with auto-restart ────────────────────────────────
  const onUpdateRef = useRef(null); // persist callback across restarts

  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.lang           = 'en-US';
    r.continuous     = true;
    r.interimResults = true;

    r.onstart = () => {
      setListening(true);
      listeningRef.current = true;
      setSttError('');
    };

    r.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(x => x[0].transcript)
        .join(' ');
      onUpdateRef.current?.(transcript);
    };

    r.onerror = (e) => {
      if (e.error === 'aborted') return;
      if (e.error === 'not-allowed') {
        setSttError('Microphone access denied — allow it in browser settings');
        listeningRef.current = false;
        setListening(false);
        return;
      }
      if (e.error === 'network') {
        setSttError('Network error — check internet connection');
      }
      // other errors: let onend handle restart
    };

    r.onend = () => {
      // Auto-restart if still supposed to be listening
      if (listeningRef.current) {
        try { r.start(); } catch { /* already restarting */ }
      } else {
        setListening(false);
      }
    };

    r.start();
    recRef.current = r;
  }, []);

  const startListening = useCallback((onUpdate) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSttError('Speech recognition not supported in this browser');
      return false;
    }
    stopSpeaking();
    onUpdateRef.current = onUpdate;
    listeningRef.current = true;
    startRecognition();
    return true;
  }, [stopSpeaking, startRecognition]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    if (recRef.current) {
      recRef.current.stop();
      recRef.current = null;
    }
    setListening(false);
    onUpdateRef.current = null;
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      mutedRef.current = next;
      localStorage.setItem('mia-muted', String(next));
      if (next) stopSpeaking();
      return next;
    });
  }, [stopSpeaking]);

  const hasStt = typeof window !== 'undefined'
    && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return {
    listening, speaking, muted, sttError,
    supported: { stt: hasStt, tts: true }, // TTS always available via backend
    speak, speakFromUser, autoSpeak, stopSpeaking,
    startListening, stopListening,
    toggleMute,
  };
}
