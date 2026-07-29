'use client';

import React from 'react';

interface AntigravityCardProps {
  children: React.ReactNode;
  glowColor?: 'copper' | 'cyan' | 'green' | 'red' | 'rose' | 'emerald' | 'yellow' | 'orange' | 'amber' | 'none';
  className?: string;
  isAnomaly?: boolean;
  severity?: 'normal' | 'warning' | 'critical' | 'danger';
}

export const AntigravityCard: React.FC<AntigravityCardProps> = ({
  children,
  glowColor = 'copper',
  className = '',
  isAnomaly = false,
  severity = 'normal',
}) => {
  // Border and shadow glow colors based on props
  const borderColors = {
    copper: 'hover:border-[#d97706]/40',
    cyan: 'hover:border-cyan-500/40',
    green: 'hover:border-emerald-500/40',
    red: 'hover:border-rose-500/40',
    rose: 'hover:border-rose-500/40',
    emerald: 'hover:border-emerald-500/40',
    yellow: 'hover:border-amber-500/40',
    orange: 'hover:border-orange-500/40',
    amber: 'hover:border-amber-500/40',
    none: 'hover:border-slate-600',
  };

  const glowShadows = {
    copper: 'shadow-[0_0_30px_rgba(217,119,6,0.01)] hover:shadow-[0_0_40px_rgba(217,119,6,0.05)]',
    cyan: 'shadow-[0_0_30px_rgba(6,182,212,0.02)] hover:shadow-[0_0_40px_rgba(6,182,212,0.08)]',
    green: 'shadow-[0_0_30px_rgba(16,185,129,0.02)] hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]',
    red: 'shadow-[0_0_30px_rgba(244,63,94,0.02)] hover:shadow-[0_0_40px_rgba(244,63,94,0.08)]',
    rose: 'shadow-[0_0_30px_rgba(244,63,94,0.02)] hover:shadow-[0_0_40px_rgba(244,63,94,0.08)]',
    emerald: 'shadow-[0_0_30px_rgba(16,185,129,0.02)] hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]',
    yellow: 'shadow-[0_0_30px_rgba(245,158,11,0.02)] hover:shadow-[0_0_40px_rgba(245,158,11,0.08)]',
    orange: 'shadow-[0_0_30px_rgba(249,115,22,0.02)] hover:shadow-[0_0_40px_rgba(249,115,22,0.08)]',
    amber: 'shadow-[0_0_30px_rgba(245,158,11,0.02)] hover:shadow-[0_0_40px_rgba(245,158,11,0.08)]',
    none: '',
  };

  // Dynamic pulsing animations based on severity
  let severityClasses = '';
  if (severity === 'danger') {
    severityClasses = 'animate-[pulse_1s_infinite_ease-in-out] border-[#dc2626]/60 shadow-[0_0_30px_rgba(220,38,38,0.2)]';
  } else if (severity === 'critical') {
    severityClasses = 'animate-[pulse_1.7s_infinite_ease-in-out] border-[#d97706]/50 shadow-[0_0_25px_rgba(217,119,6,0.15)]';
  } else if (severity === 'warning') {
    severityClasses = 'animate-[pulse_2.5s_infinite_ease-in-out] border-[#ca8a04]/40 shadow-[0_0_20px_rgba(202,138,4,0.1)]';
  } else if (isAnomaly) {
    severityClasses = 'animate-pulse border-[#dc2626]/50 shadow-[0_0_30px_rgba(220,38,38,0.15)]';
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className={`relative overflow-hidden w-full h-full rounded-xl border p-5 bg-[#151210] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60 border-[#2e211b] hover:border-[#423027] ${
          borderColors[glowColor]
        } ${glowShadows[glowColor]} ${severityClasses} ${className}`}
      >
        {/* Card Content - completely static */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AntigravityCard;
