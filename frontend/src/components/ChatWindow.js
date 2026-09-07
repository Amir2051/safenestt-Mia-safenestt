'use client';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import { Volume2, Search, Globe, Cloud, BookOpen, TrendingUp, ArrowLeftRight, Cpu, CheckCircle, Loader } from 'lucide-react';
import MiaFace from './MiaFace';

const TOOL_META = {
  web_search:        { label: 'Searching the web',         icon: Search },
  read_webpage:      { label: 'Reading page',              icon: Globe },
  get_weather:       { label: 'Getting weather',           icon: Cloud },
  wikipedia_search:  { label: 'Looking up Wikipedia',      icon: BookOpen },
  get_crypto_price:  { label: 'Fetching crypto price',     icon: TrendingUp },
  get_exchange_rate: { label: 'Converting currency',       icon: ArrowLeftRight },
  get_country_info:  { label: 'Looking up country',        icon: Globe },
  get_github_info:   { label: 'Querying GitHub',           icon: Cpu },
  calculate:         { label: 'Calculating',               icon: Cpu },
  get_time:          { label: 'Getting timezone',          icon: Globe },
  get_news:          { label: 'Fetching news',             icon: Search },
  search_books:      { label: 'Searching books',           icon: BookOpen },
  search_movies:     { label: 'Searching movies',          icon: Search },
  get_joke:          { label: 'Getting a joke',            icon: Cpu },
  get_my_ip:         { label: 'Checking network',          icon: Globe },
  osint_investigate: { label: 'Running OSINT investigation', icon: Search },
};

function ToolCallBadge({ tool }) {
  const meta = TOOL_META[tool.name] || { label: tool.name, icon: Cpu };
  const Icon = tool.status === 'done' ? CheckCircle : meta.icon;
  const color = tool.status === 'done' ? '#00ff41' : '#00fff7';

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
      style={{
        background: `${color}08`,
        border:     `1px solid ${color}20`,
        fontSize:   9,
        fontFamily: 'monospace',
        letterSpacing: '0.08em',
        color,
      }}
    >
      {tool.status === 'running' ? (
        <Loader size={9} style={{ animation: 'spin 1s linear infinite', color }} />
      ) : (
        <Icon size={9} style={{ color }} />
      )}
      <span>{meta.label}</span>
      {tool.status === 'running' && (
        <span style={{ opacity: .5 }}>...</span>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-end py-1">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-full bg-amber-400"
          style={{
            width: 3, height: [6, 12, 18, 12, 6][i],
            animation: `bar${(i % 3) + 1} .5s ease-in-out ${i * .08}s infinite`,
            boxShadow: '0 0 4px rgba(255,149,0,.7)',
          }}
        />
      ))}
    </div>
  );
}

function SystemLine({ text }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,255,65,.15), transparent)' }} />
      <span className="sys-label">{text}</span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, rgba(0,255,65,.15), transparent)' }} />
    </div>
  );
}

function Message({ msg, isLast, streaming, speaking, onSpeak }) {
  const isUser = msg.role === 'user';
  const isSpeakingThis = isLast && !isUser && speaking;
  const hasTools = msg.tool_calls?.length > 0;

  return (
    <div className={clsx('flex gap-3 animate-slide-up', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded border border-amber-400/30 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5"
          style={{ background: 'rgba(255,149,0,.06)', color: '#ff9500', boxShadow: '0 0 10px rgba(255,149,0,.15)' }}>
          USR
        </div>
      ) : (
        <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 relative border"
          style={{
            background:  'rgba(0,255,65,.05)',
            color:       '#00ff41',
            borderColor: isSpeakingThis ? 'rgba(0,255,65,.8)' : 'rgba(0,255,65,.3)',
            boxShadow:   isSpeakingThis
              ? '0 0 22px rgba(0,255,65,.5), 0 0 8px rgba(0,255,65,.3) inset'
              : '0 0 10px rgba(0,255,65,.15)',
            transition: 'box-shadow .3s, border-color .3s',
          }}>
          MIA
          {isSpeakingThis && (
            <span className="absolute -inset-1 rounded border border-matrix/50"
              style={{ animation: 'eyePulse .7s ease-in-out infinite' }} />
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={clsx('max-w-[75%] rounded px-4 py-3 text-sm relative', isUser ? 'rounded-tr-none' : 'rounded-tl-none')}
        style={isUser ? {
          background: 'rgba(255,149,0,.05)',
          border: '1px solid rgba(255,149,0,.2)',
          color: '#e0c090',
        } : {
          background: 'rgba(0,255,65,.03)',
          border: '1px solid rgba(0,255,65,.12)',
          color: '#c8e6c8',
        }}
      >
        {/* Corner accent */}
        {!isUser && <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-matrix/50" />}
        {isUser  && <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-amber-400/50" />}

        {/* Tool call indicators */}
        {!isUser && hasTools && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {msg.tool_calls.map((t, i) => <ToolCallBadge key={i} tool={t} />)}
          </div>
        )}

        {/* Message content */}
        {msg.streaming && !msg.content ? (
          hasTools ? null : <TypingDots />
        ) : isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed font-mono text-xs">{msg.content}</p>
        ) : (
          <div className="mia-prose text-xs leading-relaxed">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}

        {/* Streaming cursor */}
        {msg.streaming && msg.content && (
          <span className="inline-block w-0.5 h-3 bg-matrix ml-0.5 align-middle"
            style={{ animation: 'eyePulse .6s ease-in-out infinite', boxShadow: '0 0 6px #00ff41' }} />
        )}

        {/* Footer */}
        {!msg.streaming && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="sys-label opacity-40">
              {new Date(msg.created_at || Date.now()).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {!isUser && msg.content && onSpeak && (
              <button
                onClick={() => onSpeak(msg.content)}
                title="Play this message"
                className="flex items-center gap-1 transition-opacity"
                style={{
                  color: isSpeakingThis ? '#00ff41' : 'rgba(0,255,65,.3)',
                  fontSize: 9, fontFamily: 'monospace',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(0,255,65,.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = isSpeakingThis ? '#00ff41' : 'rgba(0,255,65,.3)'; }}
              >
                <Volume2 size={10} />
                <span>{isSpeakingThis ? 'speaking' : 'play'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, streaming, speaking, onSpeak }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!messages.length) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center grid-bg relative overflow-hidden">
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-matrix/30" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-matrix/30" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-matrix/30" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-matrix/30" />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-matrix" style={{ boxShadow: '0 0 6px #00ff41', animation: 'eyePulse 1.5s ease-in-out infinite' }} />
        <span className="sys-label">System online — Neural link established</span>
        <div className="w-1.5 h-1.5 rounded-full bg-matrix" style={{ boxShadow: '0 0 6px #00ff41', animation: 'eyePulse 1.5s ease-in-out .5s infinite' }} />
      </div>

      <div className="mb-8 glitch">
        <MiaFace size={220} streaming={false} speaking={speaking} />
      </div>

      <div className="mb-1">
        <div className="sys-label mb-2">Mia · Advanced Intelligence System · v2.0</div>
        <h2 className="text-3xl font-black font-mono text-gradient mb-1 tracking-tight">NEURAL LINK ACTIVE</h2>
        <p className="text-xs font-mono" style={{ color: 'rgba(0,255,65,.5)' }}>
          ████ FULL-SPECTRUM AI — ASK ME ANYTHING ████
        </p>
      </div>

      <p className="text-xs font-mono mt-3 mb-8 max-w-md leading-relaxed" style={{ color: 'rgba(200,230,200,.5)' }}>
        Web Search · Real-time Data · Weather · Crypto · News · OSINT · Code · Science · Law · Finance · Anything
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
        {[
          { code: '01', label: 'LIVE DATA',       sub: 'Weather, crypto, news, exchange rates',  color: '#00fff7' },
          { code: '02', label: 'WEB SEARCH',      sub: 'Search web, read any URL, find info',    color: '#00ff41' },
          { code: '03', label: 'INTELLIGENCE',    sub: 'OSINT, threat intel, fraud analysis',    color: '#ff2d2d' },
          { code: '04', label: 'DO ANYTHING',     sub: 'Code, research, explain, create, plan',  color: '#ff9500' },
        ].map(s => (
          <div key={s.code}
            className="p-4 text-left relative overflow-hidden"
            style={{ background: 'rgba(0,255,65,.02)', border: `1px solid ${s.color}20`, borderRadius: 4 }}
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: s.color, opacity: .5 }} />
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: s.color }} />
            <p className="text-[10px] font-mono mb-1" style={{ color: s.color, opacity: .7 }}>[ {s.code} ]</p>
            <p className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.label}</p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(200,230,200,.4)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 right-4 sys-label text-center opacity-30">
        16 LIVE TOOLS ACTIVE · Real-time web access · All sessions encrypted · Built by RONZORO
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 relative"
      style={{ background: 'linear-gradient(180deg, #000 0%, #020502 100%)' }}
    >
      <SystemLine text="— Session active · End-to-end encrypted · 16 tools online —" />

      {messages.map((msg, i) => (
        <Message
          key={msg.id || i}
          msg={msg}
          isLast={i === messages.length - 1}
          streaming={streaming}
          speaking={speaking}
          onSpeak={onSpeak}
        />
      ))}

      {!streaming && messages.length > 0 && (
        <SystemLine text={`— ${messages.length} transmissions logged —`} />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
