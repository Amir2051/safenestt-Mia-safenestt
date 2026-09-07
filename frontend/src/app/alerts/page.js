'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { RefreshCw, CheckCheck, Zap } from 'lucide-react';

const G = '#00ff41'; const R = '#ff2d2d'; const A = '#ff9500';

const SEV = {
  critical: [R, 'rgba(255,45,45,.12)'],
  high:     [R, 'rgba(255,45,45,.08)'],
  medium:   [A, 'rgba(255,149,0,.08)'],
  low:      [G, 'rgba(0,255,65,.06)'],
};

export default function AlertsPage() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [scanning,setScanning]= useState(false);

  const load = () => {
    fetch(`/api/alerts${showAll ? '?all=true' : ''}`).then(r=>r.json()).then(setAlerts).catch(console.error).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, [showAll]);

  const ack = async (id) => {
    await fetch(`/api/alerts/${id}/ack`, { method: 'PATCH' });
    load();
  };

  const ackAll = async () => {
    await fetch('/api/alerts/ack-all', { method: 'POST' });
    load();
  };

  const scan = async () => {
    setScanning(true);
    await fetch('/api/alerts/scan', { method: 'POST' });
    setScanning(false); load();
  };

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>ALERTS</h1>
            <p className="text-xs font-mono opacity-40 mt-1">{alerts.length} {showAll ? 'total' : 'unacknowledged'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={scan} disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold"
              style={{ background: 'rgba(0,255,65,.08)', border: '1px solid rgba(0,255,65,.2)', color: G, opacity: scanning ? .5 : 1 }}>
              <Zap size={11} /> {scanning ? 'Scanning…' : 'Run Pattern Scan'}
            </button>
            <button onClick={ackAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold"
              style={{ background: 'rgba(0,255,65,.05)', border: '1px solid rgba(0,255,65,.1)', color: G }}>
              <CheckCheck size={11} /> Ack All
            </button>
            <button onClick={() => setShowAll(v=>!v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono"
              style={{ background: 'transparent', border: '1px solid rgba(0,255,65,.1)', color: 'rgba(0,255,65,.5)' }}>
              {showAll ? 'Active only' : 'Show all'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 font-mono text-sm opacity-30" style={{ color: G }}>Loading…</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 font-mono">
            <CheckCheck size={32} style={{ color: G, opacity: .2, margin: '0 auto 12px' }} />
            <div className="text-sm opacity-30" style={{ color: G }}>No alerts</div>
            <p className="text-xs opacity-20 mt-2" style={{ color: G }}>Run a pattern scan to detect cross-case connections</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => {
              const [color, bg] = SEV[a.severity] || SEV.low;
              return (
                <div key={a.id} className="rounded p-4 flex items-start gap-3"
                  style={{ border: `1px solid ${color}22`, background: bg, opacity: a.acknowledged ? .5 : 1 }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: `${color}20`, color }}>{a.severity}</span>
                      <span className="text-xs font-mono opacity-50">{a.type.replace(/_/g,' ')}</span>
                      {a.case_id && <span className="text-xs font-mono opacity-40" style={{ color: G }}>{a.case_id}</span>}
                    </div>
                    <div className="text-sm font-mono" style={{ color: '#c8e6c8' }}>{a.message}</div>
                    <div className="text-xs font-mono opacity-30 mt-1">{a.created_at}</div>
                  </div>
                  {!a.acknowledged && (
                    <button onClick={() => ack(a.id)}
                      className="shrink-0 px-2 py-1 rounded text-xs font-mono transition-all"
                      style={{ border: `1px solid ${color}33`, color, opacity: .7 }}>
                      Ack
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
