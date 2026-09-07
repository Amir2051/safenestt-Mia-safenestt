'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { Plus, Search, ArrowRight, FolderOpen } from 'lucide-react';

const G = '#00ff41'; const R = '#ff2d2d'; const A = '#ff9500';

const STATUS_COLORS = {
  open:       { bg: 'rgba(0,255,65,.1)',   text: G },
  closed:     { bg: 'rgba(100,116,139,.15)', text: '#64748b' },
  escalated:  { bg: 'rgba(255,45,45,.1)',   text: R },
  pending:    { bg: 'rgba(255,149,0,.1)',   text: A },
};

export default function CasesPage() {
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    fetch('/api/cases').then(r => r.json())
      .then(d => setCases(d.cases || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const visible = cases.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = !search || [c.title, c.id, c.victim, c.suspect, c.type]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>CASES</h1>
            <p className="text-xs font-mono opacity-40">{cases.length} total</p>
          </div>
          <Link href="/cases/new"
            className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-bold transition-all"
            style={{ background: 'rgba(0,255,65,.08)', border: '1px solid rgba(0,255,65,.25)', color: G }}
          >
            <Plus size={13} /> New Case
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded flex-1 min-w-[200px]"
            style={{ border: '1px solid rgba(0,255,65,.15)', background: 'rgba(0,255,65,.03)' }}>
            <Search size={12} style={{ color: G, opacity: .5 }} />
            <input type="text" placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm font-mono w-full"
              style={{ color: '#c8e6c8', caretColor: G }} />
          </div>
          {['all','open','escalated','closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded text-xs font-mono font-bold capitalize transition-all"
              style={{
                background: filter === s ? 'rgba(0,255,65,.1)' : 'transparent',
                border:     `1px solid ${filter === s ? 'rgba(0,255,65,.3)' : 'rgba(0,255,65,.1)'}`,
                color:      filter === s ? G : 'rgba(200,230,200,.4)',
              }}>{s}</button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 font-mono text-sm opacity-30" style={{ color: G }}>Loading...</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 font-mono">
            <FolderOpen size={32} style={{ color: G, opacity: .2, margin: '0 auto 12px' }} />
            <div className="text-sm opacity-30" style={{ color: G }}>No cases found</div>
            <Link href="/cases/new" className="mt-4 inline-block text-xs font-mono px-4 py-2 rounded"
              style={{ background: 'rgba(0,255,65,.08)', color: G, border: '1px solid rgba(0,255,65,.2)' }}>
              Open first case
            </Link>
          </div>
        ) : (
          <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(0,255,65,.1)' }}>
            <div className="grid font-mono text-xs font-bold tracking-widest px-4 py-2"
              style={{ gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1fr auto', background: 'rgba(0,255,65,.05)', color: G, opacity: .6 }}>
              <span>CASE ID</span><span>TITLE</span><span>TYPE</span><span>VICTIM</span><span>STATUS</span><span></span>
            </div>
            {visible.map((c, i) => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.open;
              return (
                <Link key={c.id} href={`/cases/${c.id}`}
                  className="grid items-center px-4 py-3 transition-colors hover:bg-white/5"
                  style={{
                    gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1fr auto',
                    borderTop: i > 0 ? '1px solid rgba(0,255,65,.05)' : undefined,
                  }}
                >
                  <span className="font-mono text-xs font-bold" style={{ color: G }}>{c.id}</span>
                  <div>
                    <div className="font-mono text-sm truncate max-w-[220px]">{c.title}</div>
                    <div className="font-mono text-xs opacity-30">{c.created_at?.split(' ')[0]}</div>
                  </div>
                  <span className="font-mono text-xs opacity-60 capitalize">{c.type}</span>
                  <span className="font-mono text-xs opacity-60 truncate max-w-[100px]">{c.victim || '—'}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded w-fit" style={{ background: sc.bg, color: sc.text }}>{c.status}</span>
                  <ArrowRight size={12} style={{ color: G, opacity: .3 }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
