'use client';
import { useMemo } from 'react';

const FLOAT_PARTICLES = 12;

export default function MiaFace({ size = 220, streaming = false, speaking = false }) {
  const particles = useMemo(() => Array.from({ length: FLOAT_PARTICLES }, (_, i) => ({
    id: i,
    speed:  (1.5 + Math.random() * 2.5).toFixed(2),
    delay:  (Math.random() * 4).toFixed(2),
    x:      15 + Math.random() * 70,
    sz:     1 + Math.random() * 3,
    orbitT: (1.5 + Math.random() * 2).toFixed(2),
  })), []);

  const active = streaming || speaking;
  const bars   = active
    ? [5, 9, 15, 22, 18, 12, 7, 13, 8]
    : [2,  2,  3,  2,  3,  2, 2,  2, 2];

  const cyan   = '#00fff7';
  const matrix = '#00ff41';
  const ringColor = active ? `rgba(0,255,247,0.45)` : `rgba(0,255,247,0.15)`;
  const glowSize  = active ? '0 0 80px rgba(0,255,247,.55), inset 0 0 40px rgba(0,255,247,.1)'
                           : '0 0 30px rgba(0,255,247,.2), inset 0 0 15px rgba(0,255,247,.04)';

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>

      {/* ── Holographic sonar rings ──────────────────────────────── */}
      {[0, 0.9, 1.8].map((delay, i) => (
        <div key={i} className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `1px solid ${ringColor}`,
            animation: `sonar ${active ? '2.5s' : '3.5s'} ease-out ${delay}s infinite`,
          }} />
      ))}

      {/* ── Spinning orbital ring (outer) ────────────────────────── */}
      <div className="absolute inset-5 rounded-full pointer-events-none"
        style={{
          border: `1px dashed rgba(0,255,247,${active ? '0.35' : '0.12'})`,
          animation: `spin ${active ? '4s' : '14s'} linear infinite`,
          transition: 'border-color .4s',
        }} />

      {/* ── Counter-spin ring (inner) ────────────────────────────── */}
      <div className="absolute inset-9 rounded-full pointer-events-none"
        style={{
          border: `1px solid rgba(0,255,65,${active ? '0.3' : '0.1'})`,
          animation: `spinReverse ${active ? '6s' : '20s'} linear infinite`,
          transition: 'border-color .4s',
        }} />

      {/* ── Glow aura ───────────────────────────────────────────── */}
      <div className="absolute inset-4 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(0,255,247,${active ? '.08' : '.04'}) 0%, transparent 70%)`,
          boxShadow: glowSize,
          animation: active ? 'holoPulse 1.5s ease-in-out infinite' : 'breathe 4s ease-in-out infinite',
          transition: 'box-shadow .5s',
        }} />

      {/* ── Main face ───────────────────────────────────────────── */}
      <div className="absolute inset-4 overflow-hidden"
        style={{
          borderRadius: '46% 54% 52% 48% / 50% 46% 54% 50%',
          background: 'radial-gradient(circle at 42% 36%, #001515, #000a0a, #000000)',
          border: `1px solid rgba(0,255,247,${active ? '0.6' : '0.3'})`,
          boxShadow: glowSize,
          transition: 'border-color .4s, box-shadow .5s',
        }}
      >
        {/* Hex grid texture */}
        <div className="absolute inset-0" style={{
          opacity: active ? 0.12 : 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Cpath d='M11 2L20 7v10L11 20 2 15V7z' fill='none' stroke='%2300fff7' stroke-width='.4'/%3E%3C/svg%3E")`,
          transition: 'opacity .4s',
        }} />

        {/* Scanlines */}
        <div className="absolute inset-0 opacity-15" style={{
          background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.22) 3px,rgba(0,0,0,.22) 4px)',
        }} />

        {/* ── Eyes (diamond/rhombus shape) ────────────────────── */}
        {[{ left: '19%', top: '32%' }, { right: '19%', top: '32%' }].map((pos, i) => (
          <div key={i} className="absolute" style={{ ...pos, width: '16%', height: '12%' }}>
            <div className="w-full h-full"
              style={{
                background: cyan,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                animation: `eyePulse ${active ? '0.7s' : '2.5s'} ease-in-out ${i * 0.35}s infinite`,
                boxShadow: `0 0 18px 6px rgba(0,255,247,.9), 0 0 35px 10px rgba(0,255,247,.4)`,
                filter: active ? 'brightness(1.4) saturate(1.3)' : 'brightness(1)',
                transition: 'filter .3s',
              }}
            />
          </div>
        ))}

        {/* ── Nose bridge ─────────────────────────────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2"
          style={{ top: '47%', width: 1, height: '10%', background: 'rgba(0,255,247,.2)' }} />

        {/* ── Mouth / audio visualizer ────────────────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-[3px] items-end"
          style={{ bottom: '20%', height: 26 }}
        >
          {bars.map((h, i) => (
            <div key={i} className="rounded-full"
              style={{
                width: 3, height: h,
                background: active ? cyan : `rgba(0,255,247,0.35)`,
                transformOrigin: 'bottom',
                animation: active ? `bar${(i % 3) + 1} ${0.18 + i * 0.035}s ease-in-out infinite` : 'none',
                boxShadow: active ? `0 0 8px rgba(0,255,247,.9)` : 'none',
                transition: 'height .2s, box-shadow .3s',
              }}
            />
          ))}
        </div>

        {/* ── Circuit traces ──────────────────────────────────── */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: active ? 0.22 : 0.1, transition: 'opacity .4s' }} viewBox="0 0 100 100">
          <path d="M7 50L24 50L30 37L44 37"     stroke={cyan} strokeWidth=".5" fill="none"/>
          <path d="M93 50L76 50L70 63L56 63"    stroke={cyan} strokeWidth=".5" fill="none"/>
          <circle cx="44" cy="37" r="1.5"        fill={cyan} />
          <circle cx="56" cy="63" r="1.5"        fill={cyan} />
          <path d="M50 88L50 74L57 67"           stroke={cyan} strokeWidth=".5" fill="none"/>
          <path d="M50 12L50 26L43 33"           stroke={matrix} strokeWidth=".5" fill="none"/>
          <circle cx="50" cy="12" r="1"          fill={matrix} />
        </svg>
      </div>

      {/* ── Orbiting data nodes (active only) ───────────────────── */}
      {active && [0, 1, 2].map(i => (
        <div key={i} className="absolute pointer-events-none rounded-full"
          style={{
            width: 5, height: 5,
            background: i === 2 ? matrix : cyan,
            left: '50%', top: '50%',
            boxShadow: `0 0 8px ${i === 2 ? matrix : cyan}`,
            animation: `orbit${i + 1} ${particles[i].orbitT}s linear infinite`,
          }}
        />
      ))}

      {/* ── Rising data particles ────────────────────────────────── */}
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full pointer-events-none"
          style={{
            width: p.sz, height: p.sz,
            background: p.id % 3 === 0 ? matrix : cyan,
            left: `${p.x}%`,
            bottom: '14%',
            opacity: 0,
            animation: `floatUp ${p.speed}s ease-out ${p.delay}s ${active ? 'infinite' : 'paused'}`,
            boxShadow: `0 0 4px rgba(0,255,247,.7)`,
          }}
        />
      ))}

      {/* ── Status badge ────────────────────────────────────────── */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full border bg-black/90"
        style={{
          borderColor: 'rgba(0,255,247,.3)',
          boxShadow: '0 0 14px rgba(0,255,247,.2)',
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full"
          style={{
            background: streaming ? '#ff9500' : speaking ? cyan : matrix,
            boxShadow: streaming ? '0 0 6px #ff9500' : speaking ? `0 0 8px ${cyan}` : `0 0 6px ${matrix}`,
            animation: 'eyePulse 1s ease-in-out infinite',
          }}
        />
        <span className="text-[8px] font-mono tracking-widest uppercase"
          style={{ color: streaming ? '#ff9500' : speaking ? cyan : matrix }}
        >
          {streaming ? 'Processing...' : speaking ? 'Transmitting...' : 'Neural link active'}
        </span>
      </div>
    </div>
  );
}
