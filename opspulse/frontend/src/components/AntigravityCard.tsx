'use client';

import React from 'react';

interface AntigravityCardProps {
  children: React.ReactNode;
  glowColor?: 'cyan' | 'green' | 'red' | 'rose' | 'emerald' | 'yellow' | 'orange' | 'amber' | 'none';
  className?: string;
  isAnomaly?: boolean;
  severity?: 'normal' | 'warning' | 'critical' | 'danger';
}

export const AntigravityCard: React.FC<AntigravityCardProps> = ({
  children,
  glowColor = 'cyan',
  className = '',
  isAnomaly = false,
  severity = 'normal',
}) => {
  // Border and shadow glow colors based on props
  const borderColors = {
    cyan: 'border-slate-800 hover:border-cyan-500/40',
    green: 'border-slate-800 hover:border-emerald-500/40',
    red: 'border-slate-800 hover:border-rose-500/40',
    rose: 'border-slate-800 hover:border-rose-500/40',
    emerald: 'border-slate-800 hover:border-emerald-500/40',
    yellow: 'border-slate-800 hover:border-amber-500/40',
    orange: 'border-slate-800 hover:border-orange-500/40',
    amber: 'border-slate-800 hover:border-amber-500/40',
    none: 'border-slate-800 hover:border-slate-700',
  };

  const glowShadows = {
    cyan: 'shadow-[0_0_30px_rgba(6,182,212,0.02)] hover:shadow-[0_0_40px_rgba(6,182,212,0.08)]',
    green: 'shadow-[0_0_30px_rgba(16,185,129,0.02)] hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]',
    red: 'shadow-[0_0_30px_rgba(244,63,94,0.02)] hover:shadow-[0_0_40px_rgba(244,63,94,0.08)]',
    rose: 'shadow-[0_0_30px_rgba(244,63,94,0.02)] hover:shadow-[0_0_40px_rgba(244,63,94,0.08)]',
    emerald: 'shadow-[0_0_30px_rgba(16,185,129,0.02)] hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]',
    yellow: 'shadow-[0_0_30px_rgba(245,158,11,0.02)] hover:shadow-[0_0_40px_rgba(245,158,11,0.08)]',
    orange: 'shadow-[0_0_30px_rgba(249,115,22,0.02)] hover:shadow-[0_0_40px_rgba(249,115,22,0.08)]',
    amber: 'shadow-[0_0_30px_rgba(245,158,11,0.02)] hover:shadow-[0_0_40px_rgba(245,158,11,0.08)]',
    none: 'shadow-2xl',
  };

  // Dynamic pulsing animations based on severity
  let severityClasses = '';
  if (severity === 'danger') {
    severityClasses = 'animate-[pulse_1s_infinite_ease-in-out] border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.3)]';
  } else if (severity === 'critical') {
    severityClasses = 'animate-[pulse_1.7s_infinite_ease-in-out] border-orange-500/50 shadow-[0_0_25px_rgba(249,115,22,0.2)]';
  } else if (severity === 'warning') {
    severityClasses = 'animate-[pulse_2.5s_infinite_ease-in-out] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]';
  } else if (isAnomaly) {
    severityClasses = 'animate-pulse border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.25)]';
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className={`relative overflow-hidden w-full h-full rounded-xl border p-6 bg-[#111827] backdrop-blur-xl ${
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
