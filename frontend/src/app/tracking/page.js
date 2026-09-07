'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Plus, Copy, Eye, Trash2, ExternalLink } from 'lucide-react';

const G = '#00ff41'; const R = '#ff2d2d'; const A = '#ff9500';
const ic = "w-full px-3 py-2.5 rounded text-sm font-mono outline-none";
const is = { background: 'rgba(0,255,65,.03)', border: '1px solid rgba(0,255,65,.15)', color: '#c8e6c8', caretColor: G };

export default function TrackingPage() {
  const [links,   setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [show,    setShow]    = useState(false);
  const [form,    setForm]    = useState({ label: '', redirectUrl: '', caseId: '' });
  const [created, setCreated] = useState(null);
  const [selected,setSelected] = useState(null);
  const [hits,    setHits]    = useState([]);

  const load = () => fetch('/api/tracking').then(r => r.json()).then(setLinks).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.label.trim()) return;
    const res = await fetch('/api/tracking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d   = await res.json();
    setCreated(d); setShow(false); setForm({ label: '', redirectUrl: '', caseId: '' }); load();
  };

  const viewStats = async (link) => {
    setSelected(link);
    const res = await fetch(`/api/tracking/${link.id}/stats`);
    const d   = await res.json();
    setHits(d.hits || []);
  };

  const del = async (id) => {
    if (!confirm('Delete this tracking link?')) return;
    await fetch(`/api/tracking/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    load();
  };

  const copy = (text) => navigator.clipboard.writeText(text);
  const trackUrl = (id) => `${window.location.origin}/t/${id}`;

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>TRACKING LINKS</h1>
            <p className="text-xs font-mono opacity-40 mt-1">Send to suspects to capture IP, device, and location metadata</p>
          </div>
          <button onClick={() => setShow(v=>!v)}
            className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-bold"
            style={{ background: 'rgba(0,255,65,.08)', border: '1px solid rgba(0,255,65,.25)', color: G }}>
            <Plus size={13} /> New Link
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mb-5 px-4 py-3 rounded font-mono text-xs leading-relaxed" style={{ background: 'rgba(255,149,0,.06)', border: '1px solid rgba(255,149,0,.2)', color: A }}>
          ⚠ For lawful investigation only. Tracking links may only be sent to suspects as part of an authorized fraud investigation.
          Do not deploy against victims, third parties, or without proper authorization. All click data is logged for evidence purposes.
        </div>

        {/* Create form */}
        {show && (
          <div className="rounded p-4 mb-5 space-y-3" style={{ border: '1px solid rgba(0,255,65,.15)', background: 'rgba(0,255,65,.02)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Label *</label>
                <input value={form.label} onChange={e => setForm(f=>({...f,label:e.target.value}))}
                  placeholder='e.g. "Sent to suspect via Telegram"' className={ic} style={is} />
              </div>
              <div>
                <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Case ID (optional)</label>
                <input value={form.caseId} onChange={e => setForm(f=>({...f,caseId:e.target.value}))}
                  placeholder="SNT-2026-XXXX" className={ic} style={is} />
              </div>
            </div>
            <div>
              <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Redirect URL (optional — where target is sent after click)</label>
              <input value={form.redirectUrl} onChange={e => setForm(f=>({...f,redirectUrl:e.target.value}))}
                placeholder="https://google.com" className={ic} style={is} />
            </div>
            <button onClick={create}
              className="px-4 py-2 rounded text-sm font-mono font-bold"
              style={{ background: 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G }}>
              Generate Link
            </button>
          </div>
        )}

        {created && (
          <div className="mb-5 px-4 py-3 rounded font-mono" style={{ background: 'rgba(0,255,65,.07)', border: '1px solid rgba(0,255,65,.3)' }}>
            <div className="text-xs opacity-50 mb-1" style={{ color: G }}>TRACKING LINK CREATED</div>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm break-all" style={{ color: G }}>{created.url}</span>
              <button onClick={() => copy(created.url)}><Copy size={13} style={{ color: G }} /></button>
            </div>
          </div>
        )}

        <div className={selected ? 'grid grid-cols-2 gap-4' : ''}>
          {/* Links list */}
          <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(0,255,65,.1)' }}>
            {loading ? (
              <div className="p-6 text-center text-xs font-mono opacity-30" style={{ color: G }}>Loading…</div>
            ) : links.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono opacity-30" style={{ color: G }}>No tracking links yet</div>
            ) : links.map((l, i) => (
              <div key={l.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                style={{
                  borderTop: i > 0 ? '1px solid rgba(0,255,65,.06)' : undefined,
                  background: selected?.id === l.id ? 'rgba(0,255,65,.07)' : 'transparent',
                }}
                onClick={() => viewStats(l)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold truncate">{l.label}</div>
                  <div className="font-mono text-xs opacity-40">{l.id} · {l.created_at?.split(' ')[0]}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-sm" style={{ color: l.clicks > 0 ? A : 'rgba(200,230,200,.3)' }}>
                    {l.clicks} click{l.clicks !== 1 ? 's' : ''}
                  </span>
                  <button onClick={e => { e.stopPropagation(); copy(trackUrl(l.id)); }}>
                    <Copy size={12} style={{ color: G, opacity: .5 }} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); del(l.id); }}>
                    <Trash2 size={12} style={{ color: R, opacity: .5 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Hit details */}
          {selected && (
            <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(255,149,0,.15)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,149,0,.1)', background: 'rgba(255,149,0,.04)' }}>
                <div>
                  <div className="text-xs font-mono font-bold tracking-widest" style={{ color: A }}>HIT LOG — {selected.label}</div>
                  <div className="text-xs font-mono opacity-40">{hits.length} hits</div>
                </div>
                <button onClick={() => viewStats(selected)} title="Refresh">
                  <Eye size={13} style={{ color: A, opacity: .6 }} />
                </button>
              </div>
              {hits.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono opacity-30" style={{ color: A }}>No hits yet. Send the link to your target.</div>
              ) : hits.map((h, i) => (
                <div key={h.id} className="px-4 py-3" style={{ borderTop: i > 0 ? '1px solid rgba(255,149,0,.08)' : undefined }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold" style={{ color: A }}>{h.ip || 'unknown IP'}</span>
                    <span className="font-mono text-xs opacity-40">{h.timestamp?.split(' ')[0]}</span>
                  </div>
                  <div className="font-mono text-xs opacity-50 break-words">{h.user_agent || 'No UA'}</div>
                  {h.referer && <div className="font-mono text-xs opacity-40 mt-0.5">Ref: {h.referer}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
