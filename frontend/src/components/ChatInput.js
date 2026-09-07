'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Mic, MicOff, StopCircle, Volume2, VolumeX } from 'lucide-react';

export default function ChatInput({
  onSend, onStop, disabled, streaming,
  listening, speaking, muted, sttError, supported,
  onStartListening, onStopListening, onMuteToggle, onStopSpeaking,
}) {
  const [value, setValue]   = useState('');
  const textareaRef         = useRef(null);
  const transcriptRef       = useRef(''); // holds live STT transcript

  // When mic is active, update textarea with live transcript
  const handleTranscriptUpdate = useCallback((transcript) => {
    transcriptRef.current = transcript;
    setValue(transcript);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, []);

  const doSend = useCallback((text) => {
    const msg = (text ?? value).trim();
    if (!msg || disabled) return;
    // If mic is running, stop it first
    if (listening) onStopListening?.();
    transcriptRef.current = '';
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(msg);
  }, [value, disabled, listening, onSend, onStopListening]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  };

  const handleInput = (e) => {
    setValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const handleMicToggle = () => {
    if (listening) {
      onStopListening?.();
      // send what was captured
      const captured = transcriptRef.current.trim();
      if (captured) doSend(captured);
    } else {
      onStartListening?.(handleTranscriptUpdate);
    }
  };

  return (
    <div className="shrink-0 px-4 pb-5 pt-3 relative"
      style={{ borderTop: '1px solid rgba(0,255,65,.1)', background: 'rgba(0,0,0,.97)' }}
    >
      {/* Glow border */}
      <div className="absolute top-0 left-8 right-8 h-px"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(0,255,65,.35),transparent)' }} />

      {/* Status bar — listening OR speaking */}
      {(listening || speaking) && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex gap-0.5 items-end h-4">
            {(listening
              ? [4,8,14,20,14,8,4,8,14]
              : [4,8,12,16,12,8,4]
            ).map((h, i) => (
              <div key={i} className="w-0.5 rounded-full"
                style={{
                  height: h,
                  background: listening ? '#ff2d2d' : '#00ff41',
                  animation: `bar${(i % 3) + 1} ${listening ? '.28' : '.4'}s ease-in-out ${i * .04}s infinite`,
                  boxShadow: listening ? '0 0 4px #ff2d2d' : '0 0 4px rgba(0,255,65,.6)',
                }} />
            ))}
          </div>
          {listening ? (
            <>
              <span className="sys-label text-danger">Listening — speak now, click mic or Send to transmit</span>
              <div className="w-1.5 h-1.5 rounded-full bg-danger"
                style={{ animation: 'eyePulse .5s ease-in-out infinite', boxShadow: '0 0 6px #ff2d2d' }} />
            </>
          ) : (
            <>
              <span className="sys-label text-matrix">Mia is speaking</span>
              <button onClick={onStopSpeaking}
                className="sys-label text-danger hover:opacity-80 transition-opacity"
                style={{ fontSize: 9, marginLeft: 4 }}
              >[ STOP ]</button>
            </>
          )}
        </div>
      )}

      {/* STT error feedback */}
      {sttError && (
        <div className="mb-2 px-1">
          <span className="sys-label text-danger opacity-80">{sttError}</span>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <span className="text-matrix font-mono text-sm pb-3 shrink-0"
          style={{ textShadow: '0 0 8px #00ff41' }}>&gt;_</span>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder={listening ? 'Listening… (mic is on)' : 'Enter command...'}
          rows={1}
          disabled={streaming && !listening}
          className="flex-1 text-sm resize-none outline-none min-h-[44px] max-h-40 disabled:opacity-40 font-mono py-2.5 px-3"
          style={{
            background: listening ? 'rgba(255,45,45,.04)' : 'rgba(0,255,65,.03)',
            border: `1px solid ${listening ? 'rgba(255,45,45,.35)' : 'rgba(0,255,65,.15)'}`,
            borderRadius: 4,
            color: '#c8e6c8',
            caretColor: '#00ff41',
            transition: 'border-color .2s, box-shadow .2s',
          }}
          onFocus={e => {
            e.target.style.borderColor = listening ? 'rgba(255,45,45,.55)' : 'rgba(0,255,65,.45)';
            e.target.style.boxShadow   = listening ? '0 0 12px rgba(255,45,45,.12)' : '0 0 12px rgba(0,255,65,.1)';
          }}
          onBlur={e => {
            e.target.style.borderColor = listening ? 'rgba(255,45,45,.35)' : 'rgba(0,255,65,.15)';
            e.target.style.boxShadow   = 'none';
          }}
        />

        {/* Mic toggle */}
        {supported.stt && (
          <button
            onClick={handleMicToggle}
            title={listening ? 'Stop mic & send' : 'Start voice input'}
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded transition-all duration-200"
            style={listening ? {
              background: 'rgba(255,45,45,.14)',
              border: '1px solid rgba(255,45,45,.55)',
              color: '#ff2d2d',
              boxShadow: '0 0 16px rgba(255,45,45,.4)',
              animation: 'eyePulse .6s ease-in-out infinite',
            } : {
              background: 'rgba(0,255,65,.04)',
              border: '1px solid rgba(0,255,65,.2)',
              color: 'rgba(0,255,65,.6)',
            }}
          >
            {listening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        )}

        {/* Mute toggle (speaker) */}
        {supported.tts && (
          <button
            onClick={speaking ? onStopSpeaking : onMuteToggle}
            title={muted ? 'Unmute Mia' : speaking ? 'Stop speaking' : 'Mute Mia voice'}
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded transition-all duration-200"
            style={speaking ? {
              background: 'rgba(0,255,65,.1)',
              border: '1px solid rgba(0,255,65,.45)',
              color: '#00ff41',
              boxShadow: '0 0 16px rgba(0,255,65,.3)',
            } : muted ? {
              background: 'rgba(255,45,45,.05)',
              border: '1px solid rgba(255,45,45,.28)',
              color: 'rgba(255,45,45,.55)',
            } : {
              background: 'rgba(0,255,65,.04)',
              border: '1px solid rgba(0,255,65,.2)',
              color: 'rgba(0,255,65,.45)',
            }}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        )}

        {/* Send / Abort */}
        {streaming && !listening ? (
          <button onClick={onStop} title="Abort"
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded"
            style={{ background: 'rgba(255,45,45,.1)', border: '1px solid rgba(255,45,45,.4)', color: '#ff2d2d', boxShadow: '0 0 14px rgba(255,45,45,.2)' }}
          >
            <StopCircle size={15} />
          </button>
        ) : (
          <button onClick={() => doSend()} disabled={!value.trim() && !listening} title="Transmit"
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded transition-all disabled:opacity-25"
            style={{ background: 'rgba(0,255,65,.09)', border: '1px solid rgba(0,255,65,.38)', color: '#00ff41', boxShadow: '0 0 14px rgba(0,255,65,.18)' }}
          >
            <Send size={15} />
          </button>
        )}
      </div>

      <p className="sys-label text-center mt-2 opacity-30">
        Enter · transmit &nbsp;|&nbsp; Shift+Enter · new line
        {supported.stt  ? '  |  🎙 mic · hold on' : ''}
        {supported.tts  ? '  |  🔊 Mia speaks' : ''}
        &nbsp;|&nbsp; Built by Ronzoro
      </p>
    </div>
  );
}
