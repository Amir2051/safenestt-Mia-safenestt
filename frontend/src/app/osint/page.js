'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Search, Globe, Mail, User, Phone, Link2, Hash, Shield, Copy, ChevronDown, ChevronRight, Zap, BookOpen } from 'lucide-react';

const G = '#00ff41'; const R = '#ff2d2d'; const A = '#ff9500'; const C = '#00e5ff';

const TYPES = [
  { id: 'ip',       label: 'IP Address',   icon: Globe,   placeholder: '8.8.8.8 or 192.168.1.1',       color: C },
  { id: 'domain',   label: 'Domain',       icon: Globe,   placeholder: 'example.com (no http)',         color: G },
  { id: 'email',    label: 'Email',        icon: Mail,    placeholder: 'target@example.com',            color: A },
  { id: 'username', label: 'Username',     icon: User,    placeholder: 'john_doe123',                   color: '#b388ff' },
  { id: 'phone',    label: 'Phone',        icon: Phone,   placeholder: '+12125551234',                  color: G },
  { id: 'url',      label: 'URL',          icon: Link2,   placeholder: 'https://suspicious-site.com',  color: A },
  { id: 'hash',     label: 'File Hash',    icon: Hash,    placeholder: 'MD5, SHA1, or SHA256',          color: R },
  { id: 'person',   label: 'Person Name',  icon: User,    placeholder: 'John Smith',                   color: C },
];

function ResultCard({ result }) {
  const [open, setOpen] = useState(true);

  if (result.skipped) return (
    <div className="rounded p-3 mb-2" style={{ border: '1px solid rgba(255,149,0,.15)', background: 'rgba(255,149,0,.04)' }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: A }}>{result.tool}</span>
        <span className="text-xs font-mono opacity-50" style={{ color: A }}>— Skipped: {result.reason}</span>
      </div>
    </div>
  );

  if (result.error) return (
    <div className="rounded p-3 mb-2" style={{ border: '1px solid rgba(255,45,45,.15)', background: 'rgba(255,45,45,.04)' }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: R }}>{result.tool}</span>
        <span className="text-xs font-mono opacity-50" style={{ color: R }}>— {result.error}</span>
      </div>
    </div>
  );

  return (
    <div className="rounded mb-2 overflow-hidden" style={{ border: '1px solid rgba(0,255,65,.12)', background: 'rgba(0,255,65,.02)' }}>
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-white/5"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-xs font-mono font-bold tracking-wide" style={{ color: G }}>{result.tool}</span>
        {open ? <ChevronDown size={12} style={{ color: G, opacity: .5 }} /> : <ChevronRight size={12} style={{ color: G, opacity: .5 }} />}
      </button>
      {open && <DataView data={result.data} />}
    </div>
  );
}

function DataView({ data, depth = 0 }) {
  if (!data) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="px-4 py-2 text-xs font-mono opacity-30" style={{ color: G }}>Empty</div>;
    return (
      <div className="px-4 pb-3">
        {data.map((item, i) => (
          <div key={i} className="mb-1">
            {typeof item === 'object' ? (
              <div className="pl-2 border-l" style={{ borderColor: 'rgba(0,255,65,.15)' }}>
                <DataView data={item} depth={depth + 1} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono opacity-50" style={{ color: G }}>•</span>
                <span className="text-sm font-mono opacity-80 break-all">{String(item)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    return (
      <div className="px-4 pb-3">
        {Object.entries(data).filter(([,v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)).map(([key, val]) => (
          <div key={key} className="flex items-start gap-3 py-0.5">
            <span className="text-xs font-mono shrink-0 mt-0.5 opacity-40 min-w-[120px] capitalize"
              style={{ color: G }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            {Array.isArray(val) ? (
              <div className="flex-1">
                {val.map((v, i) => (
                  <div key={i} className="text-xs font-mono opacity-70 break-all">
                    {typeof v === 'object' ? (
                      <div className="pl-2 border-l mb-1" style={{ borderColor: 'rgba(0,255,65,.15)' }}>
                        <DataView data={v} depth={depth+1} />
                      </div>
                    ) : String(v)}
                  </div>
                ))}
              </div>
            ) : typeof val === 'object' ? (
              <div className="flex-1">
                <DataView data={val} depth={depth+1} />
              </div>
            ) : (
              <span className={`text-sm font-mono break-all flex-1 ${
                key.toLowerCase().includes('flag') || key.toLowerCase().includes('malicious') ? 'text-red-400' :
                key.toLowerCase().includes('suspicious') ? 'text-yellow-400' :
                String(val) === 'true' ? 'text-green-400' :
                String(val) === 'false' ? 'opacity-40' : 'opacity-80'
              }`}>{String(val)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return <div className="px-4 py-2 text-sm font-mono opacity-80">{String(data)}</div>;
}

function UsernameResults({ result }) {
  if (!result?.data) return null;
  const { found, unverified, notFound } = result.data;
  return (
    <div className="px-4 pb-3">
      {found?.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-mono font-bold mb-2" style={{ color: G }}>CONFIRMED ({found.length})</div>
          <div className="grid grid-cols-2 gap-1.5">
            {found.map(r => (
              <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
                className="flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono"
                style={{ background: 'rgba(0,255,65,.07)', border: '1px solid rgba(0,255,65,.2)', color: G }}>
                <span className="font-bold">{r.name}</span>
                {r.karma && <span className="opacity-50">{r.karma} karma</span>}
                {r.followers !== undefined && <span className="opacity-50">{r.followers} followers</span>}
              </a>
            ))}
          </div>
        </div>
      )}
      {unverified?.length > 0 && (
        <div>
          <div className="text-xs font-mono font-bold mb-2 opacity-50" style={{ color: A }}>CHECK MANUALLY ({unverified.length})</div>
          <div className="grid grid-cols-3 gap-1">
            {unverified.map(r => (
              <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
                className="px-2 py-1 rounded text-xs font-mono opacity-60 hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(255,149,0,.06)', border: '1px solid rgba(255,149,0,.15)', color: A }}>
                {r.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OsintPage() {
  const [type,    setType]    = useState('ip');
  const [target,  setTarget]  = useState('');
  const [caseId,  setCaseId]  = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [tools,   setTools]   = useState(null);
  const [dorksTarget, setDorksTarget] = useState('');
  const [dorks,   setDorks]   = useState(null);
  const [tab,     setTab]     = useState('investigate'); // investigate | dorks | tools

  useEffect(() => {
    fetch('/api/osint/tools').then(r => r.json()).then(setTools).catch(console.error);
  }, []);

  const investigate = async () => {
    if (!target.trim()) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await fetch('/api/osint/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), type, caseId: caseId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResults(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const buildDorks = async () => {
    if (!dorksTarget.trim()) return;
    const res = await fetch('/api/osint/dorks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: dorksTarget, type }),
    });
    const d = await res.json();
    setDorks(d.data);
  };

  const copy = t => navigator.clipboard.writeText(t);
  const selectedType = TYPES.find(t => t.id === type);

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>OSINT INVESTIGATION HUB</h1>
            <p className="text-xs font-mono opacity-40 mt-1">Open source intelligence — all free tools, zero setup required</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[['investigate','Investigate'],['dorks','Google Dorks'],['tools','Tool Index']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-4 py-2 rounded text-xs font-mono font-bold transition-all"
              style={{
                background: tab === id ? 'rgba(0,255,65,.1)' : 'transparent',
                border:     `1px solid ${tab === id ? 'rgba(0,255,65,.3)' : 'rgba(0,255,65,.1)'}`,
                color:      tab === id ? G : 'rgba(200,230,200,.4)',
              }}>{label}</button>
          ))}
        </div>

        {/* ── INVESTIGATE TAB ── */}
        {tab === 'investigate' && (
          <>
            {/* Type selector */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
              {TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => { setType(t.id); setResults(null); setTarget(''); }}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded transition-all"
                    style={{
                      background: type === t.id ? `${t.color}12` : 'rgba(0,255,65,.02)',
                      border:     `1px solid ${type === t.id ? t.color + '40' : 'rgba(0,255,65,.1)'}`,
                    }}>
                    <Icon size={14} style={{ color: type === t.id ? t.color : 'rgba(200,230,200,.4)' }} />
                    <span className="text-xs font-mono text-center leading-tight"
                      style={{ color: type === t.id ? t.color : 'rgba(200,230,200,.4)', fontSize: 10 }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Input */}
            <div className="rounded p-4 mb-5 space-y-3" style={{ border: '1px solid rgba(0,255,65,.12)', background: 'rgba(0,255,65,.02)' }}>
              <div className="flex gap-2">
                <input
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && investigate()}
                  placeholder={selectedType?.placeholder}
                  className="flex-1 px-3 py-2.5 rounded text-sm font-mono outline-none"
                  style={{ background: 'rgba(0,255,65,.03)', border: `1px solid ${selectedType?.color || G}33`, color: '#c8e6c8', caretColor: G }}
                />
                <button onClick={investigate} disabled={loading || !target.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded font-mono font-bold text-sm transition-all"
                  style={{ background: loading ? 'rgba(0,255,65,.05)' : 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G, opacity: loading ? .5 : 1 }}>
                  {loading ? <><Zap size={13} className="animate-pulse" /> Running…</> : <><Search size={13} /> Investigate</>}
                </button>
              </div>
              <input
                value={caseId}
                onChange={e => setCaseId(e.target.value)}
                placeholder="Link to case ID (optional — saves results as evidence)"
                className="w-full px-3 py-2 rounded text-xs font-mono outline-none"
                style={{ background: 'rgba(0,255,65,.02)', border: '1px solid rgba(0,255,65,.1)', color: '#c8e6c8', caretColor: G }}
              />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded font-mono text-sm" style={{ background: 'rgba(255,45,45,.08)', border: '1px solid rgba(255,45,45,.2)', color: R }}>
                {error}
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded p-3 animate-pulse" style={{ background: 'rgba(0,255,65,.03)', border: '1px solid rgba(0,255,65,.08)', height: 44 }} />
                ))}
              </div>
            )}

            {/* Results */}
            {results && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-xs opacity-40" style={{ color: G }}>
                    {results.toolCount} tools · {results.timestamp?.split('T')[1]?.slice(0,8)}
                    {caseId && <span className="ml-2" style={{ color: A }}>· Saved to {caseId}</span>}
                  </div>
                </div>

                {/* Username has custom renderer */}
                {type === 'username' && results.results?.[0]?.data ? (
                  <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(0,255,65,.12)' }}>
                    <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(0,255,65,.08)', background: 'rgba(0,255,65,.04)' }}>
                      <span className="text-xs font-mono font-bold tracking-wide" style={{ color: G }}>
                        {results.results[0].tool}
                      </span>
                    </div>
                    <UsernameResults result={results.results[0]} />
                  </div>
                ) : (
                  results.results?.map((r, i) => <ResultCard key={i} result={r} />)
                )}
              </div>
            )}
          </>
        )}

        {/* ── DORKS TAB ── */}
        {tab === 'dorks' && (
          <div className="space-y-4">
            <div className="rounded p-4 space-y-3" style={{ border: '1px solid rgba(0,255,65,.12)', background: 'rgba(0,255,65,.02)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Target</label>
                  <input value={dorksTarget} onChange={e => setDorksTarget(e.target.value)}
                    placeholder='e.g. "John Smith" or example.com'
                    className="w-full px-3 py-2.5 rounded text-sm font-mono outline-none"
                    style={{ background: 'rgba(0,255,65,.03)', border: '1px solid rgba(0,255,65,.15)', color: '#c8e6c8', caretColor: G }} />
                </div>
                <div>
                  <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Target Type</label>
                  <select value={type} onChange={e => setType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded text-sm font-mono outline-none cursor-pointer"
                    style={{ background: 'rgba(0,255,65,.03)', border: '1px solid rgba(0,255,65,.15)', color: '#c8e6c8' }}>
                    {['person','domain','email','username','company'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={buildDorks}
                className="flex items-center gap-2 px-4 py-2.5 rounded font-mono font-bold text-sm"
                style={{ background: 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G }}>
                <BookOpen size={13} /> Build Dorks
              </button>
            </div>

            {dorks && (
              <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(0,255,65,.12)' }}>
                <div className="px-4 py-2.5 text-xs font-mono font-bold tracking-widest opacity-50" style={{ color: G, borderBottom: '1px solid rgba(0,255,65,.08)' }}>
                  GOOGLE DORKS — {dorks.target} ({dorks.type})
                </div>
                {dorks.dorks?.map((dork, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 group"
                    style={{ borderTop: i > 0 ? '1px solid rgba(0,255,65,.06)' : undefined }}>
                    <code className="flex-1 text-sm font-mono opacity-80 break-all">{dork}</code>
                    <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copy(dork)} title="Copy dork">
                        <Copy size={12} style={{ color: G, opacity: .6 }} />
                      </button>
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(dork)}`}
                        target="_blank" rel="noreferrer" title="Search Google">
                        <Search size={12} style={{ color: G, opacity: .6 }} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TOOLS TAB ── */}
        {tab === 'tools' && tools && (
          <div className="space-y-4">
            {/* API key status */}
            <div className="rounded p-4" style={{ border: '1px solid rgba(255,149,0,.15)', background: 'rgba(255,149,0,.04)' }}>
              <div className="text-xs font-mono font-bold tracking-widest mb-3" style={{ color: A }}>API KEY STATUS</div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(tools.apiKeys || {}).map(([key, set]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: set ? G : R }} />
                    <span className="text-xs font-mono opacity-60">{key}</span>
                    <span className="text-xs font-mono" style={{ color: set ? G : R }}>{set ? 'SET' : 'NOT SET'}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-mono opacity-40 mt-3" style={{ color: A }}>
                Add API keys to backend/.env for premium tools. All tools marked with * are free — just require registration.
              </p>
            </div>

            {/* Tool list by type */}
            {Object.entries(tools.tools || {}).map(([toolType, toolList]) => (
              <div key={toolType} className="rounded overflow-hidden" style={{ border: '1px solid rgba(0,255,65,.1)' }}>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,255,65,.08)', background: 'rgba(0,255,65,.03)' }}>
                  <span className="text-xs font-mono font-bold tracking-widest uppercase" style={{ color: G }}>{toolType}</span>
                  <span className="text-xs font-mono opacity-30" style={{ color: G }}>({toolList.length} tools)</span>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {toolList.map(tool => (
                    <span key={tool} className="px-2 py-1 rounded text-xs font-mono"
                      style={{ background: tool.includes('*') ? 'rgba(255,149,0,.08)' : 'rgba(0,255,65,.06)', border: `1px solid ${tool.includes('*') ? 'rgba(255,149,0,.2)' : 'rgba(0,255,65,.15)'}`, color: tool.includes('*') ? A : G }}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
