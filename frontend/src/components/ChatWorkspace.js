// A focused, polished chat workspace for MIA — RZ / Ronzoro AI.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronRight, Plus, MoreVertical, Settings, MessageCircle,
  Send, Loader2, AlertCircle, Palette, User, Sun, Moon,
  ArrowLeft, Mic, Volume2, X
} from 'lucide-react';
import clsx from 'clsx';

const SUGGESTED_PROMPTS = [
  'Help me plan today.',
  'Where did I leave off with my projects?',
  'Help me think through a decision.',
  'What do you remember about my work?',
];

const MIAAVATAR = (
  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm select-none"
    style={{
      background: 'linear-gradient(135deg, #1b2432 0%, #0f1722 100%)',
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.35)',
      color: '#e8eef5',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}
  >
    M
  </div>
);

export default function ChatWorkspace() {
  const { getToken } = useAuth();
  const chat = useChat(getToken);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [modelError, setModelError] = useState('');
  const [sidebarRef, setSidebarRef] = useState(null);

  // Poll model status so the UI shows real provider/model and connectivity.
  useEffect(() => {
    let ignore = false;
    const timer = setInterval(() => {
      if (ignore) return;
      fetch('/api/chat/model/status', { headers: { 'Content-Type': 'application/json' } })
        .then((r) => r.json())
        .then((data) => { if (!ignore) setModelStatus(data); })
        .catch((err) => { if (!ignore) setModelError('Connection to the AI service failed.'); });
    }, 6000);
    return () => { ignore = true; clearInterval(timer); };
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);

  const handlePrompt = useCallback((text) => {
    chat.sendMessage(text);
  }, [chat]);

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const v = e.currentTarget.value.trim();
      if (v) chat.sendMessage(v);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05080c', color: '#e8eef5' }}>
      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside
        ref={(el) => setSidebarRef(el)}
        className={clsx('flex flex-col h-full shrink-0 transition-all duration-300 z-30', {
          'w-64': !sidebarCollapsed,
          'w-16': sidebarCollapsed,
        })}
        style={{ background: 'rgba(4,8,14,0.96)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-3 shrink-0">
          {sidebarCollapsed ? (
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-white/8">
              <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, rgba(120,200,255,0.18), rgba(90,160,220,0.10))',
                border: '1px solid rgba(120,200,255,0.25)',
                boxShadow: '0 0 12px rgba(120,200,255,0.08)',
              }}>
                <MessageCircle size={15} style={{ color: '#88c8ff' }} />
              </div>
              <div>
                <p className="font-bold text-xs font-mono leading-tight" style={{ color: '#88c8ff' }}>MIA</p>
                <p className="text-[10px]" style={{ color: 'rgba(200,220,240,0.35)', letterSpacing: '.1em' }}>RZ · Ronzoro AI</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav: New chat + sections */}
        <div className="px-2 pt-2 pb-1">
          <button
            onClick={() => { chat.newConversation(); setSidebarCollapsed(false); }}
            className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all mb-1',
              'bg-cyan-500/10 text-cyan-300 border border-cyan-500/15',
              sidebarCollapsed && 'justify-center px-0')}
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            <Plus size={13} />
            {!sidebarCollapsed && <span>New chat</span>}
          </button>

          <div className="sys-label mt-3 px-2 pb-1 opacity-25" style={{ fontFamily: 'ui-monospace, monospace' }}>
            Sessions
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {chat.conversations.length === 0 && (
            <p className="sys-label px-2 py-3 text-[11px]" style={{ color: 'rgba(200,220,240,0.28)' }}>
              No sessions yet.
            </p>
          )}
          {chat.conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { chat.selectConversation(conv); setSidebarCollapsed(false); }}
              className={clsx('w-full text-left px-2 py-1.5 rounded-md text-xs font-mono transition-all mb-0.5',
                chat.activeConversation?.id === conv.id
                  ? 'bg-white/7 text-white border border-cyan-500/20'
                  : 'text-white/55 hover:bg-white/5 hover:text-white/80',
                sidebarCollapsed && 'justify-center')
              }
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              <span className="truncate block" style={{ maxWidth: sidebarCollapsed ? 0 : '100%' }}>
                {conv.title || 'Untitled session'}
              </span>
            </button>
          ))}
        </div>

        {/* Sidebar footer: settings + profile */}
        <div className="px-2 pb-3 pt-1">
          <button
            onClick={() => setSettingsOpen(o => !o)}
            className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all mb-1',
              'border border-white/8',
              sidebarCollapsed && 'justify-center px-0',
              settingsOpen ? 'bg-white/8 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/80')}
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            <Settings size={13} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>

          <div className="mt-1 px-2">
            <div className="flex items-center gap-2 text-[10px]" style={{ color: 'rgba(200,220,240,0.28)' }}>
              <User size={10} />
              {!sidebarCollapsed && <span>MIA assistant</span>}
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN PANEL ──────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: '#05080c' }}>
        {/* Panel header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/7 shrink-0" style={{ background: 'rgba(6,12,22,0.9)' }}>
          <button onClick={() => setSidebarCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-white/8">
            {sidebarCollapsed ? <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.5)' }} /> : <ArrowLeft size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />}
          </button>
          <h1 className="font-bold text-sm truncate" style={{ color: '#88c8ff' }}>MIA — RZ / Ronzoro AI</h1>
          <div className="ml-auto flex items-center gap-2">
            {modelStatus && (
              <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono',
                modelStatus.configured?.[modelStatus.aiProvider] ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15' : 'bg-amber-500/10 text-amber-300 border border-amber-500/15')}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', modelStatus.configured?.[modelStatus.aiProvider] ? 'bg-emerald-400' : 'bg-amber-400')} />
                {modelStatus.aiProvider === 'ollama'
                  ? `Local ${modelStatus.aiModel} · Ollama running`
                  : modelStatus.aiProvider === 'anthropic'
                    ? `Claude ${modelStatus.aiModel}`
                    : modelStatus.aiProvider}
              </div>
            )}
            {modelStatus && !modelStatus.configured?.[modelStatus.aiProvider] && (
              <span className="text-[10px]" style={{ color: 'rgba(255,150,0,0.8)' }}>(config needed)</span>
            )}
            <button onClick={() => setSettingsOpen(s => !s)} className="p-1.5 rounded-lg hover:bg-white/8">
              <Settings size={14} style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
          </div>
        </header>

        {/* View: welcome vs conversation */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#05080c' }}>
          {/* Welcome / empty state */}
          {chat.messages.length === 0 && (
            <div className="max-w-xl mx-auto px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(120,200,255,0.16), rgba(90,160,220,0.10))', border: '1px solid rgba(120,200,255,0.2)' }}>
                <MessageCircle size={24} style={{ color: '#88c8ff' }} />
              </div>
              <h2 className="font-bold text-lg leading-tight" style={{ color: '#e8eef5' }}>
                Hello, R Z. I'm MIA.
              </h2>
              <p className="sys-label mt-1" style={{ color: 'rgba(180,205,225,0.7)', fontSize: 13 }}>
                I answer from your uploaded work books and can help plan, decide, and keep track of projects.
              </p>

              <div className="sys-label mt-5" style={{ color: 'rgba(180,205,225,0.55)', fontSize: 11 }}>
                Suggested questions
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePrompt(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 bg-white/4"
                    style={{ color: 'rgba(200,220,240,0.7)' }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Model status */}
              {modelError && (
                <p className="sys-label mt-4 text-xs" style={{ color: 'rgba(255,150,0,0.8)' }}>
                  <AlertCircle size={10} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
                  {modelError}
                </p>
              )}
              {modelStatus && !modelStatus.configured?.[modelStatus.aiProvider] && (
                <p className="sys-label mt-2 text-[10px]" style={{ color: 'rgba(255,150,0,0.7)' }}>
                  Model is not configured — switch provider in Settings.
                </p>
              )}
            </div>
          )}

          {/* Messages list */}
          {chat.messages.length > 0 && (
            <div className="px-5 py-4 md:px-8 max-w-3xl mx-auto space-y-4">
              {chat.messages.map((msg, i) => (
                <MessageBubble key={msg.id || i} msg={msg} />
              ))}
              {chat.streaming && <TypingDots />}
              {chat.error && chat.messages.some(m => m.id === chat.errorId) && (
                <div className="text-center">
                  <p className="sys-label text-xs text-red-400">{chat.error}</p>
                  <button
                    onClick={() => chat.sendMessage(chat.retryMessage || '')}
                    className="sys-label mt-2 text-xs text-amber-400 border border-amber-500/25 px-3 py-1.5 rounded-md"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <Composer
          disabled={chat.streaming}
          listening={false}
          onSend={(t) => chat.sendMessage(t)}
          onStop={chat.stopStreaming}
        />
      </div>

      {/* ── SETTINGS DRAWER ────────────────────── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-80 max-w-full h-full p-5 overflow-y-auto"
            style={{ background: '#080c14', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm" style={{ color: '#88c8ff' }}>Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="p-1 rounded-lg hover:bg-white/8">
                <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="sys-label text-xs mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>AI model</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(90,160,220,0.15)', border: '1px solid rgba(120,200,255,0.2)' }}>
                    <span className="text-xs font-mono" style={{ color: '#88c8ff' }}>AI</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {modelStatus?.aiProvider === 'ollama' ? 'Ollama (local Qwen)' : 'Anthropic (Claude)'}
                    </p>
                    <p className="sys-label text-[10px]" style={{ color: 'rgba(200,220,240,0.5)' }}>
                      {modelStatus?.aiModel || 'Not configured'}
                      {modelStatus && !modelStatus.configured?.[modelStatus.aiProvider] && ' — model key needed'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="sys-label text-xs mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Connection</p>
                <div className={clsx('w-full rounded-md py-2 px-3 text-xs font-mono',
                  modelStatus?.configured?.[modelStatus.aiProvider]
                    ? 'bg-emerald-500/5 text-emerald-300 border border-emerald-500/10'
                    : 'bg-amber-500/5 text-amber-300 border border-amber-500/10')}>
                  {modelStatus
                    ? `${modelStatus.aiProvider === 'ollama' ? 'Local Ollama' : modelStatus.aiProvider} · ${modelStatus.aiModel} · connected`
                    : 'No connection'}
                </div>
              </div>

              <div className="pt-1 border-t border-white/6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="sys-label text-xs font-mono mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Model status</p>
                <div className="space-y-1.5 text-[11px]" style={{ color: 'rgba(200,220,240,0.7)' }}>
                  <p>· Provider: {modelStatus?.aiProvider ?? '—'}</p>
                  <p>· Model: {modelStatus?.aiModel ?? '—'}</p>
                  <p>· Ollama endpoint: {modelStatus?.ollamaBase ?? '—'}</p>
                  <p>· Backend reachable: {modelStatus ? 'yes' : 'no'}</p>
                </div>
              </div>

              <p className="sys-label text-[10px]" style={{ color: 'rgba(200,220,240,0.35)' }}>
                Model settings are read from the backend config. Changing provider/model requires a server restart.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MESSAGE BUBBLE ─────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono shrink-0"
          style={{ background: 'rgba(255,149,0,0.12)', color: '#ff9500', border: '1px solid rgba(255,149,0,0.2)', fontFamily: 'ui-monospace, monospace' }}>
          U
        </div>
      ) : (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono shrink-0"
          style={{ background: 'rgba(0,200,255,0.08)', color: 'rgba(120,200,255,0.7)', border: '1px solid rgba(120,200,255,0.15)', fontFamily: 'ui-monospace, monospace' }}>
          M
        </div>
      )}
      <div
        className={clsx('max-w-[80%] md:max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative',
          isUser ? 'rounded-bl-none' : 'rounded-tl-none')}
      >
        {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {msg.tool_calls.map((t, i) => (
              <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(120,200,255,0.15)', color: 'rgba(120,200,255,0.8)', border: '1px solid rgba(120,200,255,0.15)' }}>
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div
          className="text-sm leading-relaxed"
          style={{ color: isUser ? 'rgba(200,205,200,0.92)' : 'rgba(200,230,235,0.95)' }}
        >
          {msg.content}
        </div>
        {!isUser && <span className="sys-label mt-1 block text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>AI</span>}
      </div>
    </div>
  );
}

// ── TYPING DOTS ────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center px-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'rgba(120,200,255,0.5)', animation: `pulse ${0.4 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ── COMPOSER ───────────────────────────────────────────────────────────────────
function Composer({ disabled, listening, onSend, onStop }) {
  const [value, setValue] = useState('');

  const doSend = () => {
    const v = value.trim();
    if (!v || disabled) return;
    setValue('');
    onSend(v);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); setValue(prev => prev + '\n'); }
  };

  return (
    <div className="shrink-0 border-t border-white/7 px-4 py-3"
      style={{ background: 'rgba(6,12,22,0.85)' }}>
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message MIA (Enter to send, Shift+Enter for new line)"
          className="flex-1 max-h-32 min-h-[40px] resize-none border-none outline-none bg-white/5 text-sm"
          style={{
            color: '#e8eef5',
            caretColor: 'rgba(120,200,255,0.8)',
            fontFamily: 'ui-monospace, monospace',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={doSend}
          disabled={!value.trim() || disabled}
          className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-25 transition"
          style={{ background: value.trim() && !disabled ? 'rgba(120,200,255,0.18)' : 'rgba(120,200,255,0.08)', border: '1px solid rgba(120,200,255,0.15)', color: value.trim() && !disabled ? '#88c8ff' : 'rgba(120,200,255,0.5)' }}
        >
          {disabled ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
      <p className="sys-label text-[9px] font-mono mt-1.5" style={{ color: 'rgba(200,220,240,0.3)' }}>
        Enter to send · Shift+Enter for new line · Model: local Qwen 7b
      </p>
    </div>
  );
}
