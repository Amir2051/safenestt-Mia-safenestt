'use client';
import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Search, Shield, AlertTriangle, TrendingUp } from 'lucide-react';

const G = '#00ff41'; const R = '#ff2d2d'; const A = '#ff9500';
const ic = "w-full px-3 py-2.5 rounded text-sm font-mono outline-none";
const is = { background: 'rgba(0,255,65,.03)', border: '1px solid rgba(0,255,65,.15)', color: '#c8e6c8', caretColor: G };

function RiskBar({ score }) {
  const color = score >= 70 ? R : score >= 40 ? A : G;
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1.5">
        <span style={{ color }}>Risk Score</span>
        <span style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.05)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

export default function CryptoPage() {
  const [mode,    setMode]    = useState('token');
  const [query,   setQuery]   = useState('');
  const [caseId,  setCaseId]  = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const scan = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const endpoint = mode === 'token' ? '/api/crypto/token' : '/api/crypto/wallet';
      const body = mode === 'token' ? { query, caseId: caseId || undefined } : { address: query, caseId: caseId || undefined };
      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d    = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResult(d);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>CRYPTO ANALYSIS</h1>
          <p className="text-xs font-mono opacity-40 mt-1">Public blockchain data · CoinGecko · Etherscan</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          {[['token','Token / Coin'],['wallet','Wallet Address']].map(([v,l]) => (
            <button key={v} onClick={() => { setMode(v); setResult(null); setQuery(''); }}
              className="px-4 py-2 rounded text-xs font-mono font-bold transition-all"
              style={{
                background: mode === v ? 'rgba(0,255,65,.1)' : 'transparent',
                border: `1px solid ${mode === v ? 'rgba(0,255,65,.3)' : 'rgba(0,255,65,.1)'}`,
                color: mode === v ? G : 'rgba(200,230,200,.4)',
              }}>{l}</button>
          ))}
        </div>

        {/* Input */}
        <div className="rounded p-4 space-y-3 mb-5" style={{ border: '1px solid rgba(0,255,65,.1)', background: 'rgba(0,255,65,.02)' }}>
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scan()}
              placeholder={mode === 'token' ? 'e.g. bitcoin, ethereum, usdt...' : 'ETH 0x... or BTC address'}
              className={`${ic} flex-1`} style={is} />
            <button onClick={scan} disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded font-mono text-sm font-bold transition-all"
              style={{ background: 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G, opacity: loading ? .5 : 1 }}>
              <Search size={13} /> {loading ? 'Scanning…' : 'Scan'}
            </button>
          </div>
          <div>
            <input value={caseId} onChange={e => setCaseId(e.target.value)}
              placeholder="Link to case ID (optional, e.g. SNT-2026-XXXX)"
              className={ic} style={{ ...is, fontSize: 12 }} />
          </div>
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded font-mono text-sm" style={{ background: 'rgba(255,45,45,.08)', border: '1px solid rgba(255,45,45,.2)', color: R }}>{error}</div>}

        {/* Token result */}
        {result && mode === 'token' && result.found && (
          <div className="space-y-4">
            <div className="rounded p-4" style={{ border: '1px solid rgba(0,255,65,.1)', background: 'rgba(0,255,65,.02)' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xl font-black font-mono" style={{ color: G }}>{result.token?.name}</div>
                  <div className="text-sm font-mono opacity-50">{result.token?.symbol} · Rank #{result.token?.rank || 'unranked'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black font-mono" style={{ color: G }}>${result.token?.price?.toLocaleString()}</div>
                  <div className="text-xs font-mono" style={{ color: (result.token?.change24h||0) >= 0 ? G : R }}>
                    {(result.token?.change24h||0) >= 0 ? '+' : ''}{result.token?.change24h?.toFixed(2)}% 24h
                  </div>
                </div>
              </div>
              <RiskBar score={result.score || 0} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Market Cap', `$${(result.token?.mcap||0).toLocaleString()}`],
                ['24h Volume', `$${(result.token?.volume24h||0).toLocaleString()}`],
                ['ATH', `$${result.token?.ath?.toLocaleString() || 'N/A'}`],
                ['Launched', result.token?.launchDate || 'Unknown'],
                ['Website', result.token?.homepage ? '✓ Listed' : '✗ None'],
                ['Platforms', Object.keys(result.token?.platforms||{}).join(', ') || 'None'],
              ].map(([l,v]) => (
                <div key={l} className="rounded p-3" style={{ background: 'rgba(0,255,65,.02)', border: '1px solid rgba(0,255,65,.08)' }}>
                  <div className="text-xs font-mono opacity-40 mb-0.5">{l}</div>
                  <div className="text-sm font-mono truncate">{v}</div>
                </div>
              ))}
            </div>

            {(result.flags||[]).length > 0 && (
              <div className="rounded p-4" style={{ border: '1px solid rgba(255,45,45,.2)', background: 'rgba(255,45,45,.04)' }}>
                <div className="text-xs font-mono font-bold tracking-widest mb-3" style={{ color: R }}>RISK FLAGS</div>
                {result.flags.map((f,i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <AlertTriangle size={11} style={{ color: R, marginTop: 2, shrink: 0 }} />
                    <span className="text-sm font-mono" style={{ color: R }}>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {result.token?.description && (
              <div className="rounded p-4" style={{ border: '1px solid rgba(0,255,65,.08)', background: 'rgba(0,255,65,.01)' }}>
                <div className="text-xs font-mono opacity-40 mb-2">DESCRIPTION</div>
                <p className="text-sm font-mono opacity-60 leading-relaxed">{result.token.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Wallet result */}
        {result && mode === 'wallet' && (
          <div className="space-y-4">
            <div className="rounded p-4" style={{ border: '1px solid rgba(0,255,65,.1)', background: 'rgba(0,255,65,.02)' }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-mono opacity-40 mb-1">ADDRESS</div>
                  <div className="text-sm font-mono break-all" style={{ color: G }}>{result.address}</div>
                  <div className="text-xs font-mono opacity-40 mt-1 capitalize">{result.chain}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono" style={{ color: G }}>
                    {result.balanceEth != null ? `${result.balanceEth.toFixed(4)} ETH` :
                     result.balanceBTC != null ? `${result.balanceBTC.toFixed(6)} BTC` : '—'}
                  </div>
                </div>
              </div>
              <RiskBar score={result.riskScore || 0} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['Received', result.totalReceived?.toFixed(6)],
                ['Sent',     result.totalSent?.toFixed(6)],
                ['Tx Count', result.txCount],
                ['Counterparties', result.uniqueCounterparties],
              ].filter(([,v]) => v != null).map(([l,v]) => (
                <div key={l} className="rounded p-3 text-center" style={{ background: 'rgba(0,255,65,.02)', border: '1px solid rgba(0,255,65,.08)' }}>
                  <div className="text-xs font-mono opacity-40">{l}</div>
                  <div className="text-sm font-mono font-bold mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            {(result.flags||[]).length > 0 && (
              <div className="rounded p-4" style={{ border: '1px solid rgba(255,45,45,.2)', background: 'rgba(255,45,45,.04)' }}>
                <div className="text-xs font-mono font-bold tracking-widest mb-2" style={{ color: R }}>FLAGS</div>
                {result.flags.map((f,i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle size={11} style={{ color: R }} />
                    <span className="text-sm font-mono" style={{ color: R }}>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {(result.recentTxs||[]).length > 0 && (
              <div className="rounded" style={{ border: '1px solid rgba(0,255,65,.1)' }}>
                <div className="px-4 py-2.5 text-xs font-mono font-bold tracking-widest opacity-50" style={{ color: G, borderBottom: '1px solid rgba(0,255,65,.07)' }}>
                  RECENT TRANSACTIONS
                </div>
                {result.recentTxs.map((tx,i) => (
                  <div key={tx.hash||i} className="grid items-center px-4 py-2.5 font-mono text-xs"
                    style={{ gridTemplateColumns: '80px 1fr 1fr 70px 60px', borderTop: i > 0 ? '1px solid rgba(0,255,65,.05)' : undefined }}>
                    <span className="opacity-40">{tx.date}</span>
                    <span className="opacity-50 truncate">{(tx.from||'').slice(0,12)}…</span>
                    <span className="opacity-50 truncate">{(tx.to||'').slice(0,12)}…</span>
                    <span style={{ color: G }}>{tx.ethVal || tx.value} {result.chain === 'bitcoin' ? 'BTC' : 'ETH'}</span>
                    <span style={{ color: tx.status === 'success' ? G : R }}>{tx.status || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
