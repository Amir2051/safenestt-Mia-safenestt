'use client';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useVoice } from '@/hooks/useVoice';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import MiaFace from './MiaFace';
import InvestigatePanel from './InvestigatePanel';

export default function ChatLayout({ embedded = false }) {
  const { getToken }  = useAuth();
  const chat          = useChat(getToken);
  const voice         = useVoice();
  const [showInvestigate, setShowInvestigate] = useState(false);
  const [avatarVisible, setAvatarVisible]     = useState(false);
  const prevStreaming  = useRef(false);
  const hideTimer     = useRef(null);

  useEffect(() => { chat.loadConversations(); }, []);

  // Auto-speak Mia's response when streaming finishes
  useEffect(() => {
    const justFinished = prevStreaming.current && !chat.streaming;
    prevStreaming.current = chat.streaming;
    if (!justFinished) return;

    const msgs = chat.messages;
    const last = msgs[msgs.length - 1];
    if (last?.role === 'assistant' && last.content && !last.streaming) {
      voice.autoSpeak(last.content);
    }
  });

  // Show / hide the floating avatar based on speaking state
  useEffect(() => {
    clearTimeout(hideTimer.current);
    if (voice.speaking) {
      setAvatarVisible(true);
    } else {
      // Keep visible briefly then fade out
      hideTimer.current = setTimeout(() => setAvatarVisible(false), 600);
    }
    return () => clearTimeout(hideTimer.current);
  }, [voice.speaking]);

  return (
    <div className={`flex overflow-hidden bg-bg ${embedded ? 'h-full' : 'h-screen'}`}>
      {showInvestigate && <InvestigatePanel onClose={() => setShowInvestigate(false)} />}
      <Sidebar
        conversations={chat.conversations}
        activeConversation={chat.activeConversation}
        onSelect={chat.selectConversation}
        onNew={chat.newConversation}
        onDelete={chat.deleteConversation}
        onInvestigate={() => setShowInvestigate(true)}
      />

      <div className="flex flex-col flex-1 overflow-hidden relative">
        <ChatWindow
          messages={chat.messages}
          streaming={chat.streaming}
          speaking={voice.speaking}
          onSpeak={voice.speakFromUser}
        />
        <ChatInput
          onSend={chat.sendMessage}
          onStop={chat.stopStreaming}
          disabled={chat.streaming}
          streaming={chat.streaming}
          listening={voice.listening}
          speaking={voice.speaking}
          muted={voice.muted}
          sttError={voice.sttError}
          supported={voice.supported}
          onStartListening={voice.startListening}
          onStopListening={voice.stopListening}
          onMuteToggle={voice.toggleMute}
          onStopSpeaking={voice.stopSpeaking}
        />

        {/* ── Floating holographic avatar (appears when Mia speaks) ── */}
        {avatarVisible && (
          <div
            className="absolute bottom-24 right-6 pointer-events-none z-40"
            style={{
              animation: voice.speaking
                ? 'avatarIn .4s ease-out forwards, floatAvatar 2.5s ease-in-out .4s infinite'
                : 'avatarOut .6s ease-in forwards',
            }}
          >
            {/* Holographic platform / base glow */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2"
              style={{
                width: 100, height: 10,
                background: 'radial-gradient(ellipse, rgba(0,255,247,.35) 0%, transparent 70%)',
                filter: 'blur(4px)',
              }} />

            <MiaFace size={130} speaking={voice.speaking} streaming={false} />

            {/* "TRANSMITTING" label */}
            {voice.speaking && (
              <div className="text-center mt-2">
                <span className="sys-label" style={{ color: '#00fff7', fontSize: 8, letterSpacing: '0.2em' }}>
                  ◈ TRANSMITTING ◈
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
