'use client'

import React from 'react'

interface CyberHeaderProps {
  title: string
  subtitle?: string
  accent?: string   // hex color, e.g. '#3b82f6'
  badge?: string    // text for the top badge, e.g. 'LIVE'
  icon?: React.ReactNode
  actions?: React.ReactNode
  stats?: { label: string; value: string | number; color?: string }[]
}

export function CyberHeader({
  title, subtitle, accent = '#8b5cf6', badge, icon, actions, stats,
}: CyberHeaderProps) {
  const r = parseInt(accent.slice(1, 3), 16)
  const g = parseInt(accent.slice(3, 5), 16)
  const b = parseInt(accent.slice(5, 7), 16)
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 mb-6" style={{
      background: `linear-gradient(135deg, #060610 0%, #0a0a18 60%, #060a10 100%)`,
      border: `1px solid ${rgba(0.4)}`,
      boxShadow: `0 0 40px ${rgba(0.08)}, inset 0 1px 0 ${rgba(0.15)}`,
    }}>
      <style>{`
        @keyframes cy-scan-${r} { 0%{top:-5%} 100%{top:105%} }
        @keyframes cy-flicker { 0%,19%,21%,23%,25%,54%,56%,100%{opacity:1} 20%,24%,55%{opacity:0.4} }
        @keyframes cy-fadein { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Scanline */}
      <div className="absolute left-0 right-0 h-px pointer-events-none z-10" style={{
        background: `linear-gradient(90deg,transparent,${rgba(0.6)},transparent)`,
        animation: `cy-scan-${r} 3.5s linear infinite`,
      }} />

      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: `linear-gradient(${accent} 1px,transparent 1px),linear-gradient(90deg,${accent} 1px,transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Corner glow */}
      <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{
        background: `radial-gradient(circle at top right, ${rgba(0.12)}, transparent 70%)`,
      }} />

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
              background: `linear-gradient(135deg,${accent},${rgba(0.6)})`,
              boxShadow: `0 0 24px ${rgba(0.5)}`,
            }}>
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {badge && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold" style={{
                  background: rgba(0.15), border: `1px solid ${rgba(0.4)}`, color: accent,
                }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                  {badge}
                </div>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight" style={{
              background: `linear-gradient(135deg, #fff 0%, ${accent} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'cy-flicker 12s linear infinite',
            }}>{title}</h1>
            {subtitle && (
              <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {stats && stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center px-4 py-2 rounded-xl" style={{
              background: rgba(0.08), border: `1px solid ${rgba(0.2)}`,
              animation: `cy-fadein 0.4s ease both`, animationDelay: `${i * 0.08}s`,
            }}>
              <p className="text-2xl font-black" style={{ color: s.color ?? accent, textShadow: `0 0 16px ${s.color ?? accent}` }}>{s.value}</p>
              <p className="text-[10px] font-mono tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
            </div>
          ))}
          {actions}
        </div>
      </div>
    </div>
  )
}

export function CyberSectionLabel({ label, color = '#8b5cf6', icon }: { label: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
          background: `${color}20`, border: `1px solid ${color}40`,
        }}>{icon}</div>
      )}
      <span className="text-xs font-mono font-bold tracking-widest" style={{ color }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg,${color}40,transparent)` }} />
      <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    </div>
  )
}

export function CyberCard({ children, accent = '#8b5cf6', className }: { children: React.ReactNode; accent?: string; className?: string }) {
  const r = parseInt(accent.slice(1,3),16), g = parseInt(accent.slice(3,5),16), b = parseInt(accent.slice(5,7),16)
  const rgba = (a:number) => `rgba(${r},${g},${b},${a})`
  return (
    <div className={className} style={{
      background: rgba(0.04),
      border: `1px solid ${rgba(0.18)}`,
      borderRadius: '16px',
      padding: '20px',
    }}>{children}</div>
  )
}
