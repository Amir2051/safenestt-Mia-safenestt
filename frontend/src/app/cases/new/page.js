'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

const G = '#00ff41';

const TYPES = ['fraud','romance','investment','phishing','cyber','identity_theft','crypto','other'];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-mono font-bold tracking-widest mb-1.5" style={{ color: G, opacity: .6 }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded text-sm font-mono outline-none transition-all";
const inputStyle = {
  background: 'rgba(0,255,65,.03)',
  border: '1px solid rgba(0,255,65,.15)',
  color: '#c8e6c8',
  caretColor: G,
};

export default function NewCasePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', type: 'fraud', victim: '', suspect: '', description: '', amount_lost: '', currency: 'USD' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { setError('Case title is required'); return; }
    setSaving(true); setError('');
    try {
      const body = { ...form };
      if (!body.amount_lost) delete body.amount_lost;
      const res = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d   = await res.json();
      if (!res.ok) { setError(d.error || 'Failed'); return; }
      router.push(`/cases/${d.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/cases" className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: G }}>
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>NEW CASE</h1>
        </div>

        <div className="rounded p-6 space-y-5" style={{ border: '1px solid rgba(0,255,65,.1)', background: 'rgba(0,255,65,.02)' }}>
          <Field label="Case Title *">
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Romance Scam — Jane Doe" className={inputClass} style={inputStyle} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Case Type">
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputClass} style={{ ...inputStyle, cursor: 'pointer' }}>
                {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Currency">
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputClass} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['USD','GBP','EUR','NGN','CAD','AUD','BTC','ETH'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Victim Name / ID">
            <input value={form.victim} onChange={e => set('victim', e.target.value)}
              placeholder="Full name or alias" className={inputClass} style={inputStyle} />
          </Field>

          <Field label="Suspect Name / Handle">
            <input value={form.suspect} onChange={e => set('suspect', e.target.value)}
              placeholder="Known name, username, or 'Unknown'" className={inputClass} style={inputStyle} />
          </Field>

          <Field label="Financial Loss">
            <input type="number" value={form.amount_lost} onChange={e => set('amount_lost', e.target.value)}
              placeholder="0.00" className={inputClass} style={inputStyle} />
          </Field>

          <Field label="Incident Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Summarize what happened. Include timeline, platforms used, methods of contact..."
              className={inputClass} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {error && <p className="text-sm font-mono" style={{ color: '#ff2d2d' }}>{error}</p>}

          <button onClick={submit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded font-mono font-bold text-sm transition-all"
            style={{
              background: saving ? 'rgba(0,255,65,.05)' : 'rgba(0,255,65,.1)',
              border: '1px solid rgba(0,255,65,.3)',
              color: G,
              opacity: saving ? .6 : 1,
            }}>
            <Plus size={14} /> {saving ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
