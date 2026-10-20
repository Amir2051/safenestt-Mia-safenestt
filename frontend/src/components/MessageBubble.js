// A clean, readable message renderer with tool-call badges and error states.
'use client';

import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isError = !isUser && msg.content?.startsWith('❌');

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
        {/* Tool-call badges */}
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

        {/* Error state */}
        {isError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <AlertCircle size={12} style={{ color: '#ff9500', marginTop: 2 }} />
            <p className="text-sm" style={{ color: 'rgba(255,150,0,0.92)' }}>{msg.content.replace('❌ ', '')}</p>
          </div>
        )}

        {/* Normal message */}
        {!isError && (
          <div
            className="text-sm leading-relaxed"
            style={{ color: isUser ? 'rgba(200,205,200,0.92)' : 'rgba(200,230,235,0.95)' }}
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}

        {!isUser && <span className="sys-label mt-1.5 block text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>MIA</span>}
      </div>
    </div>
  );
}
