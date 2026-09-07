'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, Shield, Bell, Link2,
  FileText, MessageSquare, BookOpen, ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import MiaFace from './MiaFace';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',      tag: '01' },
  { href: '/cases',     icon: FolderOpen,       label: 'Cases',          tag: '02' },
  { href: '/osint',     icon: Search,            label: 'OSINT',          tag: '03' },
  { href: '/crypto',    icon: Shield,            label: 'Crypto Scan',    tag: '04' },
  { href: '/tracking',  icon: Link2,             label: 'Tracking Links', tag: '05' },
  { href: '/alerts',    icon: Bell,              label: 'Alerts',         tag: '06' },
  { href: '/reports',   icon: FileText,          label: 'Reports',        tag: '07' },
  { href: '/chat',      icon: MessageSquare,     label: 'Mia AI Chat',    tag: '08' },
  { href: '/guidance',  icon: BookOpen,          label: 'Guidance',       tag: '09' },
];

function FloatingMia() {
  const [time, setTime] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const update = () => { setTime(new Date().toLocaleTimeString('en-US', { hour12: false })); setTick(t => t + 1); };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed bottom-8 right-8 z-50 pointer-events-none select-none"
      style={{ animation: 'miaProjection 3.8s ease-in-out infinite' }}
    >
      {/* Ambient page-wide glow — large radial that bleeds across the viewport */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700, height: 700,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(0,255,247,.045) 0%, rgba(0,255,65,.02) 35%, transparent 65%)',
          borderRadius: '50%',
          animation: 'ambientGlow 5s ease-in-out infinite',
        }}
      />

      {/* Secondary halo ring */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 300, height: 300,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          border: '1px solid rgba(0,255,247,.06)',
          animation: 'sonar 4s ease-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 300, height: 300,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          border: '1px solid rgba(0,255,247,.04)',
          animation: 'sonar 4s ease-out 1.3s infinite',
        }}
      />

      {/* Holographic floor grid projection */}
      <div
        className="absolute -bottom-2 left-1/2 pointer-events-none"
        style={{
          width: 200,
          height: 44,
          transform: 'translateX(-50%)',
          backgroundImage:
            'linear-gradient(rgba(0,255,247,.07) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(0,255,247,.07) 1px, transparent 1px)',
          backgroundSize: '18px 12px',
          maskImage: 'perspective(60px) rotateX(55deg)',
          WebkitMaskImage: 'perspective(60px) rotateX(55deg)',
          opacity: 0.7,
        }}
      />

      {/* Base glow ellipse */}
      <div
        className="absolute -bottom-4 left-1/2 pointer-events-none"
        style={{
          width: 140, height: 14,
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(0,255,247,.45) 0%, rgba(0,255,65,.15) 50%, transparent 70%)',
          filter: 'blur(6px)',
        }}
      />

      <MiaFace size={160} streaming={false} speaking={false} />

      {/* Status chip */}
      <div className="text-center mt-3">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{
            background: 'rgba(0,0,0,.85)',
            border: '1px solid rgba(0,255,247,.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#00ff41', boxShadow: '0 0 6px #00ff41', animation: 'eyePulse 1.5s ease-in-out infinite' }}
          />
          <span
            className="font-mono uppercase"
            style={{ fontSize: 8, letterSpacing: '0.2em', color: '#00fff7' }}
          >
            MIA · {time}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime]           = useState('');
  const path = usePathname();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#000200', color: '#c8e6c8' }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col h-full shrink-0 transition-all duration-300 relative z-20"
        style={{
          width: collapsed ? 56 : 234,
          background: 'rgba(0,2,0,.99)',
          borderRight: '1px solid rgba(0,255,65,.14)',
          boxShadow: '6px 0 40px rgba(0,255,65,.04)',
        }}
      >
        {/* Corner accent marks */}
        <div className="absolute top-0 right-0 pointer-events-none"
          style={{ width: 16, height: 16, borderTop: '1px solid rgba(0,255,65,.45)', borderRight: '1px solid rgba(0,255,65,.45)' }} />
        <div className="absolute bottom-0 right-0 pointer-events-none"
          style={{ width: 16, height: 16, borderBottom: '1px solid rgba(0,255,65,.45)', borderRight: '1px solid rgba(0,255,65,.45)' }} />
        <div className="absolute bottom-0 left-0 pointer-events-none"
          style={{ width: 16, height: 16, borderBottom: '1px solid rgba(0,255,65,.2)', borderLeft: '1px solid rgba(0,255,65,.2)' }} />

        {/* Right-edge gradient glow */}
        <div className="absolute top-0 right-0 bottom-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 5%, rgba(0,255,65,.28) 50%, transparent 95%)' }} />

        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <div className="p-3 shrink-0" style={{ borderBottom: '1px solid rgba(0,255,65,.1)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 font-black text-xs font-mono relative"
              style={{
                background: 'rgba(0,255,65,.05)',
                border: '1px solid rgba(0,255,65,.4)',
                color: '#00ff41',
                boxShadow: '0 0 18px rgba(0,255,65,.25), inset 0 0 10px rgba(0,255,65,.05)',
              }}
            >
              S
              <div className="absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full" style={{ background: '#00ff41', opacity: .7 }} />
              <div className="absolute bottom-0.5 left-0.5 w-0.5 h-0.5 rounded-full" style={{ background: '#00ff41', opacity: .4 }} />
            </div>

            {!collapsed && (
              <div>
                <p
                  className="font-black text-xs font-mono glitch"
                  style={{ color: '#00ff41', letterSpacing: '0.18em', textShadow: '0 0 14px rgba(0,255,65,.65)' }}
                >
                  SAFENEST T
                </p>
                <p className="font-mono opacity-35" style={{ fontSize: 8, letterSpacing: '.12em', color: 'rgba(0,255,65,.5)' }}>
                  ◈ Investigation Platform
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#00ff41', boxShadow: '0 0 6px #00ff41', animation: 'eyePulse 2s ease-in-out infinite' }}
              />
              <span className="sys-label">SYS ONLINE</span>
              <div className="ml-auto sys-label opacity-40">{time}</div>
            </div>
          )}
        </div>

        {/* ── Nav ────────────────────────────────────────────────────────── */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pt-1 pb-2 sys-label opacity-20">
              ── MODULES ─────────────────
            </div>
          )}

          {NAV.map(({ href, icon: Icon, label, tag }) => {
            const active = path === href || (href !== '/dashboard' && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className="flex items-center gap-3 mx-2 my-0.5 px-2 py-2 rounded-sm transition-all duration-150 group relative overflow-hidden"
                style={{
                  color:      active ? '#00ff41' : 'rgba(200,230,200,.42)',
                  background: active ? 'rgba(0,255,65,.07)' : 'transparent',
                  borderLeft: active ? '2px solid #00ff41' : '2px solid transparent',
                  boxShadow:  active ? 'inset 0 0 24px rgba(0,255,65,.04)' : 'none',
                  fontSize: 12,
                }}
              >
                {/* Hover sweep */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,65,.05), transparent)' }}
                />

                <Icon
                  size={14}
                  style={{
                    minWidth: 14,
                    filter: active ? 'drop-shadow(0 0 5px #00ff41)' : 'none',
                    transition: 'filter .2s',
                  }}
                />
                {!collapsed && (
                  <>
                    <span className="font-mono truncate flex-1">{label}</span>
                    <span className="font-mono opacity-20" style={{ fontSize: 8 }}>{tag}</span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Neural link status ─────────────────────────────────────────── */}
        {!collapsed && (
          <div className="px-3 py-2.5" style={{ borderTop: '1px solid rgba(0,255,65,.07)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="sys-label opacity-40">NEURAL LINK</span>
              <span className="sys-label" style={{ color: '#00ff41', textShadow: '0 0 5px rgba(0,255,65,.6)' }}>
                SECURE
              </span>
            </div>
            <div className="h-px mb-2" style={{ background: 'linear-gradient(90deg, rgba(0,255,65,.35), transparent)' }} />
            <div className="sys-label opacity-20 text-center">
              MIA v2.0 · ALL SESSIONS ENCRYPTED
            </div>
          </div>
        )}

        {/* ── Collapse toggle ────────────────────────────────────────────── */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="p-3 flex items-center justify-center transition-colors"
          style={{ borderTop: '1px solid rgba(0,255,65,.08)', color: 'rgba(0,255,65,.4)' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative" style={{ background: '#000200' }}>
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,255,65,.018) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(0,255,65,.018) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="relative z-10 pb-8 pr-48">{children}</div>
      </main>

      {/* ── Floating MIA — persists on every page ─────────────────────── */}
      <FloatingMia />
    </div>
  );
}
