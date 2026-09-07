'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { FileText, ExternalLink } from 'lucide-react';

const G = '#00ff41';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(setReports).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-black font-mono tracking-wide" style={{ color: G }}>REPORTS</h1>
          <p className="text-xs font-mono opacity-40 mt-1">PDF reports generated from cases</p>
        </div>

        <div className="mb-4 px-4 py-3 rounded font-mono text-xs" style={{ background: 'rgba(0,255,65,.04)', border: '1px solid rgba(0,255,65,.12)', color: 'rgba(200,230,200,.6)' }}>
          Generate reports from a case page: open any case → click "PDF Report"
        </div>

        {loading ? (
          <div className="text-center py-12 font-mono text-sm opacity-30" style={{ color: G }}>Loading…</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 font-mono">
            <FileText size={32} style={{ color: G, opacity: .2, margin: '0 auto 12px' }} />
            <div className="text-sm opacity-30" style={{ color: G }}>No reports generated yet</div>
          </div>
        ) : (
          <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(0,255,65,.1)' }}>
            {reports.map((r, i) => (
              <div key={r.name} className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid rgba(0,255,65,.06)' : undefined }}>
                <div className="flex items-center gap-3">
                  <FileText size={14} style={{ color: G, opacity: .5 }} />
                  <span className="font-mono text-sm">{r.name}</span>
                </div>
                <a href={r.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono"
                  style={{ background: 'rgba(0,255,65,.08)', border: '1px solid rgba(0,255,65,.2)', color: G }}>
                  <ExternalLink size={11} /> View PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
