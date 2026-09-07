'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  FolderOpen, Shield, Bell, TrendingUp, Plus,
  ArrowRight, AlertTriangle, Activity, Cpu, Database,
  Zap, Eye, Radio,
} from 'lucide-react';

const G = '#00ff41';
const C = '#00fff7';
const A = '#ff9500';
const R = '#ff2d2d';

function CyberCorner({ color = G, size = 12 }) {
  const s = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
  return (
    <>
      <div style={{ ...s, top: -1, left: -1,   borderTop: `1px solid ${color}99`, borderLeft:  `1px solid ${color}99` }} />
      <div style={{ ...s, top: -1, right: -1,  borderTop: `1px solid ${color}55`, borderRight: `1px solid ${color}55` }} />
      <div style={{ ...s, bottom: -1, left: -1,  borderBottom: `1px solid ${color}55`, borderLeft:  `1px solid ${color}55` }} />
      <div style={{ ...s, bottom: -1, right: -1, borderBottom: `1px solid ${color}99`, borderRight: `1px solid ${color}99` }} />
    </>
  );
}

function StatCard({ label, value, icon: Icon, color = G, sub, tag }) {
  return (
    <div
      className="stat-card rounded-sm p-4 font-mono relative overflow-hidden"
      style={{
        background: `rgba(${color === G ? '0,255,65' : color === A ? '255,149,0' : color === R ? '255,45,45' : '0,255,247'},.03)`,
        border: `1px solid ${color}22`,
      }}
    >
      <CyberCorner color={color} />

      {/* Ambient fill on hover */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(circle at 0% 0%, ${color}06 0%, transparent 60%)`,
      }} />

      <div className="flex items-center justify-between mb-3 relative">
        <span className="sys-label opacity-50 tracking-widest">{label}</span>
        <div className="flex items-center gap-1.5">
          {tag && <span className="sys-label opacity-20">{tag}</span>}
          <Icon size={13} style={{ color, opacity: .6, filter: `drop-shadow(0 0 4px ${color})` }} />
        </div>
      </div>

      <div
        className="text-3xl font-black num-glitch relative"
        style={{ color, textShadow: `0 0 20px ${color}55` }}
      >
        {value ?? '—'}
      </div>

      {sub && <div className="text-xs opacity-35 mt-1.5 font-mono">{sub}</div>}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
      }} />
    </div>
  );
}

function ThreatMeter({ level = 0, max = 10 }) {
  const pct = Math.min(100, (level / max) * 100);
  const col = pct > 70 ? R : pct > 40 ? A : G;
  return (
    <div className="flex items-center gap-2">
      <span className="sys-label opacity-40">THREAT</span>
      <div className="flex-1 h-1 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: col, boxShadow: `0 0 8px ${col}` }}
        />
      </div>
      <span className="font-mono" style={{ fontSize: 9, color: col }}>{level}/{max}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [stats,   setStats]   = useState(null);
  const [alerts,  setAlerts]  = useState([]);
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [time,    setTime]    = useState('');
  const [date,    setDate]    = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/cases/stats').then(r => r.json()),
      fetch('/api/alerts').then(r => r.json()),
      fetch('/api/cases?limit=5').then(r => r.json()),
    ]).then(([s, al, cs]) => {
      setStats(s);
      setAlerts(al);
      setCases((cs.cases || []).slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const threatLevel = Math.min(10, (alerts.length || 0) + (stats?.escalated || 0));

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center h-full">
        <div className="text-center font-mono" style={{ color: G }}>
          <div className="text-xs tracking-[0.4em] opacity-40 mb-2">INITIALIZING NEURAL LINK</div>
          <div className="flex gap-1.5 justify-center">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-1 h-4 rounded-full" style={{
                background: G,
                animation: `bar${(i % 3) + 1} ${0.3 + i * 0.08}s ease-in-out infinite`,
                boxShadow: `0 0 6px ${G}`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="p-6 space-y-6">

        {/* ── Command header ───────────────────────────────────────────── */}
        <div
          className="rounded-sm p-4 relative overflow-hidden"
          style={{
            background: 'rgba(0,255,65,.025)',
            border: '1px solid rgba(0,255,65,.12)',
            boxShadow: 'inset 0 0 60px rgba(0,255,65,.02)',
          }}
        >
          <CyberCorner color={G} size={16} />

          {/* Horizontal scan beam */}
          <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden pointer-events-none">
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, transparent, ${G}60, transparent)`,
              animation: 'scanline 6s linear infinite',
            }} />
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Radio size={10} style={{ color: G, filter: `drop-shadow(0 0 4px ${G})`, animation: 'eyePulse 1.5s ease-in-out infinite' }} />
                <span className="sys-label opacity-30">LIVE</span>
              </div>
              <h1
                className="font-black font-mono tracking-[0.14em] sys-boot"
                style={{ fontSize: 22, color: G, textShadow: `0 0 24px ${G}55` }}
              >
                INVESTIGATION DASHBOARD
              </h1>
              <p className="font-mono opacity-30 mt-0.5" style={{ fontSize: 10 }}>
                SafeNestT · Mia Platform · {date}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="font-mono font-black" style={{ fontSize: 28, color: G, textShadow: `0 0 20px ${G}55`, letterSpacing: '0.05em' }}>
                {time}
              </div>
              <ThreatMeter level={threatLevel} />
            </div>
          </div>
        </div>

        {/* ── Stat row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Cases"   value={stats?.total || 0}    icon={Database}      color={G} tag="T-01" sub="All time" />
          <StatCard label="Open"          value={stats?.open || 0}     icon={Activity}      color={A} tag="T-02" sub="Pending review" />
          <StatCard label="Escalated"     value={stats?.escalated || 0} icon={AlertTriangle} color={R} tag="T-03" sub="Requires action" />
          <StatCard label="Active Alerts" value={alerts.length}        icon={Bell}          color={alerts.length > 0 ? R : C} tag="T-04" sub="Real-time" />
        </div>

        {/* ── Losses banner ────────────────────────────────────────────── */}
        {stats?.total_losses > 0 && (
          <div
            className="rounded-sm p-4 relative overflow-hidden"
            style={{ background: `${R}08`, border: `1px solid ${R}30` }}
          >
            <CyberCorner color={R} />
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} style={{ color: R, filter: `drop-shadow(0 0 6px ${R})`, animation: 'threatPulse 2s ease-in-out infinite' }} />
              <div>
                <div className="sys-label opacity-40">TOTAL REPORTED LOSSES</div>
                <div className="font-black font-mono text-2xl mt-0.5" style={{ color: R, textShadow: `0 0 18px ${R}55` }}>
                  ${parseFloat(stats.total_losses).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Cases + Alerts ───────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Recent cases */}
          <div className="rounded-sm relative" style={{ border: '1px solid rgba(0,255,65,.12)', background: 'rgba(0,255,65,.02)' }}>
            <CyberCorner color={G} />

            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(0,255,65,.08)' }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen size={12} style={{ color: G, opacity: .7 }} />
                <span className="sys-label" style={{ color: G }}>RECENT CASES</span>
              </div>
              <Link
                href="/cases/new"
                className="flex items-center gap-1 font-mono px-2.5 py-1 rounded-sm transition-all"
                style={{ background: 'rgba(0,255,65,.08)', color: G, fontSize: 10, border: '1px solid rgba(0,255,65,.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,65,.14)'; e.currentTarget.style.boxShadow = `0 0 10px rgba(0,255,65,.1)`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,65,.08)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Plus size={10} /> NEW CASE
              </Link>
            </div>

            {cases.length === 0 ? (
              <div className="p-8 text-center sys-label opacity-20">NO CASES RECORDED</div>
            ) : (
              cases.map(c => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 group transition-all"
                  style={{ borderBottom: '1px solid rgba(0,255,65,.04)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,65,.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div>
                    <div className="text-sm font-mono font-bold truncate max-w-[200px]" style={{ color: 'rgba(200,230,200,.85)' }}>
                      {c.title}
                    </div>
                    <div className="sys-label opacity-30 mt-0.5">{c.id} · {c.type}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono px-2 py-0.5 rounded-sm uppercase"
                      style={{
                        fontSize: 9,
                        background: c.status === 'open' ? 'rgba(0,255,65,.1)'  : 'rgba(255,45,45,.1)',
                        color:      c.status === 'open' ? G : R,
                        border:     `1px solid ${c.status === 'open' ? 'rgba(0,255,65,.2)' : 'rgba(255,45,45,.2)'}`,
                      }}
                    >
                      {c.status}
                    </span>
                    <ArrowRight size={11} style={{ color: G, opacity: .35 }} />
                  </div>
                </Link>
              ))
            )}

            <div className="px-4 py-2.5">
              <Link href="/cases" className="sys-label opacity-25 hover:opacity-70 transition-opacity" style={{ color: G }}>
                VIEW ALL CASES →
              </Link>
            </div>
          </div>

          {/* Active alerts */}
          <div className="rounded-sm relative" style={{ border: `1px solid ${R}22`, background: `${R}03` }}>
            <CyberCorner color={R} />

            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: `1px solid ${R}12` }}
            >
              <div className="flex items-center gap-2">
                <Bell size={12} style={{ color: R, opacity: .8 }} />
                <span className="sys-label" style={{ color: R }}>ACTIVE ALERTS</span>
              </div>
              <Link href="/alerts" className="sys-label opacity-40 hover:opacity-90 transition-opacity" style={{ color: R }}>
                VIEW ALL →
              </Link>
            </div>

            {alerts.length === 0 ? (
              <div className="p-8 text-center sys-label opacity-20">NO ACTIVE ALERTS</div>
            ) : (
              alerts.slice(0, 5).map(a => (
                <div key={a.id} className="px-4 py-3" style={{ borderBottom: `1px solid ${R}08` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-mono uppercase px-1.5 py-0.5 rounded-sm"
                      style={{
                        fontSize: 9,
                        background: a.severity === 'high' || a.severity === 'critical' ? `${R}20` : `${A}18`,
                        color:      a.severity === 'high' || a.severity === 'critical' ? R : A,
                        border:     `1px solid ${a.severity === 'high' || a.severity === 'critical' ? R : A}30`,
                      }}
                    >
                      {a.severity}
                    </span>
                    <span className="sys-label opacity-40">{a.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-sm font-mono opacity-75">{a.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Quick actions ────────────────────────────────────────────── */}
        <div>
          <div className="sys-label opacity-20 mb-2">── QUICK ACCESS ────────────────────────────────</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: '/cases/new', label: 'New Case',    icon: Plus,      color: G },
              { href: '/crypto',    label: 'Crypto Scan', icon: Shield,    color: C },
              { href: '/tracking',  label: 'Track Link',  icon: Zap,       color: A },
              { href: '/guidance',  label: 'IC3 Guide',   icon: Eye,       color: G },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-4 py-3 rounded-sm font-mono transition-all relative overflow-hidden group"
                style={{
                  border: `1px solid ${color}20`,
                  color,
                  background: `${color}04`,
                  fontSize: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}0a`; e.currentTarget.style.boxShadow = `0 0 14px ${color}15`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${color}04`; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${color}06 0%, transparent 60%)` }} />
                <Icon size={13} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── System signature ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid rgba(0,255,65,.06)' }}>
          <Cpu size={10} style={{ color: G, opacity: .3 }} />
          <span className="sys-label opacity-20">
            SAFENEST T INTELLIGENCE NETWORK · MIA NEURAL ENGINE v2.0 · ALL CONNECTIONS MONITORED
          </span>
        </div>

      </div>
    </AppShell>
  );
}
