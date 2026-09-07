'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Upload, Send, CheckCircle } from 'lucide-react';

const G = '#00ff41';

const ic = "w-full px-3 py-2.5 rounded text-sm font-mono outline-none";
const is = { background: '#0a140a', border: '1px solid rgba(0,255,65,.2)', color: '#c8e6c8', caretColor: G };

export default function IntakePage() {
  const { token } = useParams();
  const [info,     setInfo]     = useState(null);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [form, setForm] = useState({ description: '', wallets: '', urls: '', contact: '' });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch(`/api/cases/intake/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }))
      .then(d => setInfo(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!form.description.trim() && !form.wallets.trim() && !form.urls.trim() && files.length === 0) {
      setError('Please provide at least one piece of information.'); return;
    }
    setSending(true); setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    files.forEach(f => fd.append('files', f));
    const res = await fetch(`/api/intake/${token}`, { method: 'POST', body: fd });
    const d   = await res.json();
    if (!res.ok) { setError(d.error); setSending(false); return; }
    setSuccess(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-mono text-sm" style={{ background: '#000400', color: G, opacity: .4 }}>
      Loading...
    </div>
  );

  if (error && !info) return (
    <div className="min-h-screen flex items-center justify-center font-mono" style={{ background: '#000400' }}>
      <div className="text-center">
        <Shield size={40} style={{ color: '#ff2d2d', margin: '0 auto 16px', opacity: .6 }} />
        <div className="text-lg font-bold" style={{ color: '#ff2d2d' }}>Invalid or Expired Link</div>
        <div className="text-sm opacity-50 mt-2" style={{ color: '#c8e6c8' }}>{error}</div>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center font-mono" style={{ background: '#000400' }}>
      <div className="text-center max-w-md px-6">
        <CheckCircle size={48} style={{ color: G, margin: '0 auto 16px' }} />
        <div className="text-xl font-black" style={{ color: G }}>Evidence Received</div>
        <div className="text-sm opacity-60 mt-3" style={{ color: '#c8e6c8' }}>
          Your submission has been securely logged. An investigator will review it as part of the case.
          You may close this window.
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#000400' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield size={28} style={{ color: G }} />
            <span className="text-xl font-black font-mono tracking-widest" style={{ color: G }}>SAFENEST T</span>
          </div>
          <div className="text-sm font-mono opacity-50" style={{ color: '#c8e6c8' }}>Evidence Intake Portal</div>
          {info?.caseTitle && (
            <div className="mt-3 px-4 py-2 rounded font-mono text-sm" style={{ background: 'rgba(0,255,65,.05)', border: '1px solid rgba(0,255,65,.15)', color: '#c8e6c8' }}>
              {info.label || `Case: ${info.caseTitle}`}
            </div>
          )}
        </div>

        <div className="rounded p-6 space-y-5" style={{ background: '#010901', border: '1px solid rgba(0,255,65,.12)' }}>
          <p className="text-xs font-mono leading-relaxed opacity-60" style={{ color: '#c8e6c8' }}>
            Submit any evidence securely and confidentially. All submissions are timestamped and linked to your case.
            Only provide information you are authorized to share.
          </p>

          <div>
            <label className="text-xs font-mono font-bold tracking-widest mb-2 block opacity-60" style={{ color: G }}>YOUR ACCOUNT / STATEMENT *</label>
            <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
              rows={5} placeholder="Describe what happened in as much detail as possible. Include dates, platforms used, what was said, how money was sent..."
              className={ic} style={{ ...is, resize: 'vertical' }} />
          </div>

          <div>
            <label className="text-xs font-mono font-bold tracking-widest mb-2 block opacity-60" style={{ color: G }}>WALLET ADDRESSES (one per line)</label>
            <textarea value={form.wallets} onChange={e => setForm(f=>({...f,wallets:e.target.value}))}
              rows={2} placeholder="0x... or bc1... or BTC address"
              className={ic} style={{ ...is, resize: 'vertical' }} />
          </div>

          <div>
            <label className="text-xs font-mono font-bold tracking-widest mb-2 block opacity-60" style={{ color: G }}>SUSPICIOUS URLS / LINKS (one per line)</label>
            <textarea value={form.urls} onChange={e => setForm(f=>({...f,urls:e.target.value}))}
              rows={2} placeholder="https://..."
              className={ic} style={{ ...is, resize: 'vertical' }} />
          </div>

          <div>
            <label className="text-xs font-mono font-bold tracking-widest mb-2 block opacity-60" style={{ color: G }}>ATTACH FILES (screenshots, docs, chat exports)</label>
            <label className="flex items-center gap-3 px-4 py-3 rounded cursor-pointer transition-colors"
              style={{ background: 'rgba(0,255,65,.04)', border: '1px dashed rgba(0,255,65,.2)' }}>
              <Upload size={16} style={{ color: G, opacity: .6 }} />
              <span className="font-mono text-sm opacity-60" style={{ color: '#c8e6c8' }}>
                {files.length > 0 ? `${files.length} file(s) selected` : 'Click to select files (max 20MB each)'}
              </span>
              <input type="file" multiple className="hidden"
                onChange={e => setFiles(Array.from(e.target.files))}
                accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.csv,.json,.log,.mp4" />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f,i) => (
                  <div key={i} className="text-xs font-mono opacity-50" style={{ color: '#c8e6c8' }}>• {f.name}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-mono font-bold tracking-widest mb-2 block opacity-60" style={{ color: G }}>YOUR CONTACT (optional, for follow-up)</label>
            <input value={form.contact} onChange={e => setForm(f=>({...f,contact:e.target.value}))}
              placeholder="Email or phone — only investigators can see this"
              className={ic} style={is} />
          </div>

          {error && <p className="text-sm font-mono" style={{ color: '#ff2d2d' }}>{error}</p>}

          <button onClick={submit} disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded font-mono font-bold text-sm transition-all"
            style={{
              background: sending ? 'rgba(0,255,65,.05)' : 'rgba(0,255,65,.1)',
              border: '1px solid rgba(0,255,65,.3)',
              color: G,
              opacity: sending ? .6 : 1,
            }}>
            <Send size={14} /> {sending ? 'Submitting…' : 'Submit Evidence Securely'}
          </button>

          <p className="text-xs font-mono text-center opacity-30" style={{ color: '#c8e6c8' }}>
            Your submission is encrypted in transit and stored securely. This portal is operated by SafeNestT for lawful fraud investigation only.
          </p>
        </div>
      </div>
    </div>
  );
}
