'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Link2, FileText, Upload,
  Trash2, ExternalLink, Copy, RefreshCw,
} from 'lucide-react';

const G = '#00ff41'; const R = '#ff2d2d'; const A = '#ff9500';

const inputStyle = {
  background: 'rgba(0,255,65,.03)', border: '1px solid rgba(0,255,65,.15)',
  color: '#c8e6c8', caretColor: G,
};
const ic = "w-full px-3 py-2 rounded text-sm font-mono outline-none";

function Badge({ val }) {
  const map = { open: [G,'rgba(0,255,65,.1)'], closed: ['#64748b','rgba(100,116,139,.15)'], escalated: [R,'rgba(255,45,45,.1)'] };
  const [color, bg] = map[val] || [G,'rgba(0,255,65,.1)'];
  return <span className="px-2 py-0.5 rounded text-xs font-mono font-bold" style={{ color, background: bg }}>{val}</span>;
}

function Section({ title, children, action }) {
  return (
    <div className="rounded" style={{ border: '1px solid rgba(0,255,65,.1)' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(0,255,65,.07)' }}>
        <span className="text-xs font-mono font-bold tracking-widest" style={{ color: G, opacity: .6 }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function CaseDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [data,   setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [edit,    setEdit]    = useState({});
  const [showEvidence, setShowEvidence] = useState(false);
  const [evForm,   setEvForm]   = useState({ type: 'note', label: '', content: '' });
  const [evFile,   setEvFile]   = useState(null);
  const [genLink,  setGenLink]  = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [intakeUrl, setIntakeUrl] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportUrl,  setReportUrl]  = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/cases/${id}`).then(r => r.json()).then(d => {
      setData(d); setEdit({ title: d.title, type: d.type, status: d.status, victim: d.victim||'', suspect: d.suspect||'', description: d.description||'', amount_lost: d.amount_lost||'' });
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const saveEdit = async () => {
    setSaving(true);
    await fetch(`/api/cases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
    setEditing(false); setSaving(false); load();
  };

  const addEvidence = async () => {
    const fd = new FormData();
    fd.append('type',    evForm.type);
    fd.append('label',   evForm.label);
    fd.append('content', evForm.content);
    if (evFile) fd.append('file', evFile);
    const res = await fetch(`/api/cases/${id}/evidence`, { method: 'POST', body: fd });
    if (res.ok) { setShowEvidence(false); setEvForm({ type: 'note', label: '', content: '' }); setEvFile(null); load(); }
  };

  const deleteEvidence = async (evId) => {
    if (!confirm('Delete this evidence?')) return;
    await fetch(`/api/cases/${id}/evidence/${evId}`, { method: 'DELETE' });
    load();
  };

  const generateLink = async () => {
    const res = await fetch(`/api/cases/${id}/intake-link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: linkLabel }) });
    const d   = await res.json();
    setIntakeUrl(d.url); setGenLink(false); setLinkLabel(''); load();
  };

  const generateReport = async () => {
    setReportBusy(true);
    const res = await fetch(`/api/cases/${id}/report`, { method: 'POST' });
    const d   = await res.json();
    if (d.downloadPath) setReportUrl(d.downloadPath);
    setReportBusy(false);
  };

  const copy = (text) => navigator.clipboard.writeText(text);

  if (loading) return <AppShell><div className="flex items-center justify-center h-full font-mono text-sm opacity-30" style={{ color: G }}>Loading...</div></AppShell>;
  if (!data)   return <AppShell><div className="p-6 font-mono text-sm opacity-50" style={{ color: R }}>Case not found</div></AppShell>;

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href="/cases" style={{ color: G, opacity: .4 }} className="hover:opacity-80"><ArrowLeft size={16} /></Link>
            <div>
              <h1 className="text-xl font-black font-mono" style={{ color: G }}>{data.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono opacity-40">{data.id}</span>
                <Badge val={data.status} />
                <span className="text-xs font-mono opacity-40 capitalize">{data.type}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(v => !v)}
              className="px-3 py-1.5 rounded text-xs font-mono transition-all"
              style={{ background: 'rgba(0,255,65,.08)', border: '1px solid rgba(0,255,65,.2)', color: G }}>
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={generateReport} disabled={reportBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all"
              style={{ background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.2)', color: A }}>
              <FileText size={12} /> {reportBusy ? 'Generating…' : 'PDF Report'}
            </button>
            {reportUrl && (
              <a href={reportUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono"
                style={{ background: 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G }}>
                <ExternalLink size={12} /> Download
              </a>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="rounded p-4 space-y-3" style={{ border: '1px solid rgba(255,149,0,.2)', background: 'rgba(255,149,0,.03)' }}>
            <div className="grid grid-cols-2 gap-3">
              {[['title','Title'],['victim','Victim'],['suspect','Suspect']].map(([k,l]) => (
                <div key={k} className={k === 'title' ? 'col-span-2' : ''}>
                  <label className="text-xs font-mono opacity-50 mb-1 block" style={{ color: G }}>{l}</label>
                  <input value={edit[k]} onChange={e => setEdit(f=>({...f,[k]:e.target.value}))} className={ic} style={inputStyle} />
                </div>
              ))}
              <div>
                <label className="text-xs font-mono opacity-50 mb-1 block" style={{ color: G }}>Status</label>
                <select value={edit.status} onChange={e => setEdit(f=>({...f,status:e.target.value}))} className={ic} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['open','pending','escalated','closed'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono opacity-50 mb-1 block" style={{ color: G }}>Amount Lost</label>
                <input type="number" value={edit.amount_lost} onChange={e => setEdit(f=>({...f,amount_lost:e.target.value}))} className={ic} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="text-xs font-mono opacity-50 mb-1 block" style={{ color: G }}>Description</label>
              <textarea value={edit.description} onChange={e => setEdit(f=>({...f,description:e.target.value}))} rows={3} className={ic} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <button onClick={saveEdit} disabled={saving}
              className="px-4 py-2 rounded text-sm font-mono font-bold"
              style={{ background: 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Case Info */}
        <Section title="CASE DETAILS">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 p-4 font-mono text-sm">
            {[
              ['Victim',    data.victim],
              ['Suspect',   data.suspect],
              ['Type',      data.type],
              ['Loss',      data.amount_lost ? `${data.currency||'USD'} ${parseFloat(data.amount_lost).toLocaleString()}` : null],
              ['Opened',    data.created_at?.split(' ')[0]],
              ['Updated',   data.updated_at?.split(' ')[0]],
            ].map(([l,v]) => v ? (
              <div key={l}>
                <div className="text-xs opacity-40 uppercase tracking-widest">{l}</div>
                <div className="opacity-80">{v}</div>
              </div>
            ) : null)}
            {data.description && (
              <div className="col-span-2">
                <div className="text-xs opacity-40 uppercase tracking-widest mb-1">Description</div>
                <div className="opacity-70 text-sm leading-relaxed">{data.description}</div>
              </div>
            )}
          </div>
        </Section>

        {/* Evidence */}
        <Section title={`EVIDENCE (${(data.evidence||[]).length})`} action={
          <button onClick={() => setShowEvidence(v=>!v)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
            style={{ background: 'rgba(0,255,65,.08)', color: G, border: '1px solid rgba(0,255,65,.2)' }}>
            <Plus size={10} /> Add
          </button>
        }>
          {showEvidence && (
            <div className="p-4 space-y-3" style={{ borderBottom: '1px solid rgba(0,255,65,.07)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Type</label>
                  <select value={evForm.type} onChange={e => setEvForm(f=>({...f,type:e.target.value}))} className={ic} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['note','wallet','url','email','phone','screenshot','document','file','other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Label</label>
                  <input value={evForm.label} onChange={e => setEvForm(f=>({...f,label:e.target.value}))} placeholder="Brief label" className={ic} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono opacity-40 mb-1 block" style={{ color: G }}>Content / Note</label>
                <textarea value={evForm.content} onChange={e => setEvForm(f=>({...f,content:e.target.value}))} rows={2} className={ic} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono cursor-pointer"
                  style={{ background: 'rgba(0,255,65,.05)', border: '1px solid rgba(0,255,65,.15)', color: G }}>
                  <Upload size={11} /> {evFile ? evFile.name : 'Attach file'}
                  <input type="file" className="hidden" onChange={e => setEvFile(e.target.files[0])} />
                </label>
                <button onClick={addEvidence}
                  className="px-4 py-2 rounded text-xs font-mono font-bold"
                  style={{ background: 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G }}>
                  Save Evidence
                </button>
              </div>
            </div>
          )}
          {(data.evidence||[]).length === 0 && !showEvidence ? (
            <div className="p-6 text-center text-xs font-mono opacity-30" style={{ color: G }}>No evidence logged</div>
          ) : (
            (data.evidence||[]).map((e, i) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid rgba(0,255,65,.05)' : undefined }}>
                <div className="shrink-0 px-1.5 py-0.5 rounded text-xs font-mono uppercase mt-0.5"
                  style={{ background: 'rgba(0,255,65,.07)', color: G }}>{e.type}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono font-bold truncate">{e.label || e.file_name || '—'}</div>
                  {e.content && <div className="text-xs font-mono opacity-50 mt-0.5 break-all">{String(e.content).slice(0,120)}</div>}
                  <div className="text-xs opacity-30 font-mono mt-0.5">{e.submitted_by} · {e.created_at?.split(' ')[0]}</div>
                </div>
                <button onClick={() => deleteEvidence(e.id)} className="opacity-30 hover:opacity-70 transition-opacity shrink-0">
                  <Trash2 size={12} style={{ color: R }} />
                </button>
              </div>
            ))
          )}
        </Section>

        {/* Intake links */}
        <Section title="VICTIM INTAKE LINKS" action={
          <button onClick={() => setGenLink(v=>!v)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
            style={{ background: 'rgba(0,255,65,.08)', color: G, border: '1px solid rgba(0,255,65,.2)' }}>
            <Link2 size={10} /> Generate
          </button>
        }>
          {genLink && (
            <div className="p-4 flex gap-3" style={{ borderBottom: '1px solid rgba(0,255,65,.07)' }}>
              <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)}
                placeholder='Label e.g. "For Jane Doe"' className={`${ic} flex-1`} style={inputStyle} />
              <button onClick={generateLink}
                className="px-4 py-2 rounded text-xs font-mono font-bold shrink-0"
                style={{ background: 'rgba(0,255,65,.1)', border: '1px solid rgba(0,255,65,.3)', color: G }}>
                Create Link
              </button>
            </div>
          )}
          {intakeUrl && (
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(0,255,65,.07)', background: 'rgba(0,255,65,.05)' }}>
              <span className="flex-1 text-xs font-mono break-all" style={{ color: G }}>{intakeUrl}</span>
              <button onClick={() => copy(intakeUrl)} className="shrink-0"><Copy size={12} style={{ color: G, opacity: .6 }} /></button>
            </div>
          )}
          {(data.intake_links||[]).length === 0 && !genLink ? (
            <div className="p-6 text-center text-xs font-mono opacity-30" style={{ color: G }}>
              No intake links. Generate one to send to victims/witnesses.
            </div>
          ) : (
            (data.intake_links||[]).map(t => (
              <div key={t.token} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid rgba(0,255,65,.05)' }}>
                <div className="flex-1">
                  <div className="text-sm font-mono font-bold">{t.label || 'Intake Link'}</div>
                  <div className="text-xs font-mono opacity-40">{t.token} · Used: {t.used_count}×</div>
                </div>
                <button onClick={() => copy(`${window.location.origin}/intake/${t.token}`)}>
                  <Copy size={12} style={{ color: G, opacity: .5 }} />
                </button>
              </div>
            ))
          )}
        </Section>
      </div>
    </AppShell>
  );
}
