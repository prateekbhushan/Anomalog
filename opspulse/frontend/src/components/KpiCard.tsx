'use client';

import React from 'react';
import { Cpu, Server, Layers, ShieldCheck } from 'lucide-react';

interface KpiCardProps {
  cpuValue: number;
  memoryValue: number;
  dbValue: number;
  systemHealthValue: number;
  cpuDelta?: string;
  dbStatusText?: string;
  healthBadgeText?: string;
}

export const KpiGrid: React.FC<KpiCardProps> = ({
  cpuValue,
  memoryValue,
  dbValue,
  systemHealthValue,
  cpuDelta = '+2.4% / hr',
  dbStatusText = 'Peak near limit',
  healthBadgeText = 'OPTIMAL'
}) => {
  // Format numbers nicely
  const formattedCpu = cpuValue !== undefined && cpuValue !== null ? cpuValue.toFixed(1) : '0.0';
  const formattedMem = memoryValue !== undefined && memoryValue !== null ? memoryValue.toFixed(1) : '0.0';
  const formattedDb = dbValue !== undefined && dbValue !== null ? Math.round(dbValue).toLocaleString() : '0';
  const formattedHealth = systemHealthValue !== undefined && systemHealthValue !== null ? systemHealthValue.toFixed(1) : '100.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
      {/* 1. Cluster CPU */}
      <div className="bg-[#161412] border border-[#28231F] hover:border-[#3D352E] rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#9E948C] font-mono text-xs tracking-tight">Cluster CPU</span>
          <Cpu className="w-4 h-4 text-[#9E948C]" />
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold font-mono text-[#F0ECE6] tracking-tight">{formattedCpu}</span>
          <span className="text-sm font-normal font-mono text-[#8E847C]">%</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-[#8E847C]">
          <span>📈</span>
          <span>{cpuDelta}</span>
        </div>
      </div>

      {/* 2. Memory Allocation */}
      <div className="bg-[#161412] border border-[#28231F] hover:border-[#3D352E] rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#9E948C] font-mono text-xs tracking-tight">Memory Allocation</span>
          <Server className="w-4 h-4 text-[#9E948C]" />
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold font-mono text-[#F0ECE6] tracking-tight">{formattedMem}</span>
          <span className="text-sm font-normal font-mono text-[#8E847C]">%</span>
        </div>
        {/* Dynamic Progress Bar */}
        <div className="mt-4 w-full h-1.5 bg-[#2A231D] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#E87928] to-[#FF8A3D] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, memoryValue))}%` }}
          />
        </div>
      </div>

      {/* 3. Active DB Conns */}
      <div className="bg-[#161412] border border-[#28231F] hover:border-[#3D352E] rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#9E948C] font-mono text-xs tracking-tight">Active DB Conns</span>
          <Layers className="w-4 h-4 text-[#9E948C]" />
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold font-mono text-[#F0ECE6] tracking-tight">{formattedDb}</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-[#8E847C]">
          <span>⇅</span>
          <span>{dbStatusText}</span>
        </div>
      </div>

      {/* 4. System Health */}
      <div className="bg-[#161412] border border-[#28231F] hover:border-[#3D352E] rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#9E948C] font-mono text-xs tracking-tight">System Health</span>
          <ShieldCheck className="w-4 h-4 text-[#9E948C]" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-mono text-[#F0ECE6] tracking-tight">{formattedHealth}</span>
            <span className="text-sm font-normal font-mono text-[#8E847C]">%</span>
          </div>

          {/* Dynamic Badge */}
          <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase border ${
            systemHealthValue >= 85
              ? 'bg-[#241A14] border-[#4D331F] text-[#D97706]'
              : systemHealthValue >= 60
              ? 'bg-[#2B2313] border-[#5E4A1E] text-[#EAB308]'
              : 'bg-[#2F1517] border-[#692429] text-[#F87171] animate-pulse'
          }`}>
            {healthBadgeText}
          </div>
        </div>
      </div>
    </div>
  );
};
