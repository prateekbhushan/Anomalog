/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes */
'use client';
import { useEffect, useState, useRef } from 'react';
import { RealtimeChart } from '@/components/RealtimeChart';
import { useMetricsSocket, useMetricsStore } from '@/hooks/useMetricsSocket';
import { AntigravityCard } from '@/components/AntigravityCard';
function parseAlertMessage(message: string) {
  const regex = /3σ Drift:\s*(.*?)\s+spiked to\s+([\d.]+)\s*\(μ:\s*([\d.]+),\s*σ:\s*([\d.]+)\)/i;
  const match = message.match(regex);
  if (match) {
    return {
      metric: match[1],
      value: match[2],
      mean: match[3],
      std: match[4]
    };
  }
  return null;
}interface SeverityConfig {
  level: 'normal' | 'warning' | 'critical' | 'danger';
  colorClass: string;
  bgClass: string;
  borderClass: string;
  glowColor: 'cyan' | 'green' | 'yellow' | 'orange' | 'red' | 'rose' | 'emerald';
  statusText: string;
  glowShadow: string;
}

const getMetricSeverity = (
  value: number,
  key: 'cpu_usage' | 'memory_usage' | 'db_connections',
  isAnomaly: boolean
): SeverityConfig => {
  if (key === 'cpu_usage') {
    if (value >= 90) {
      return { level: 'danger', colorClass: 'text-red-500', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'DANGER_CRITICAL', glowShadow: 'rgba(239, 68, 68, 0.75)' };
    }
    if (value >= 75) {
      return { level: 'critical', colorClass: 'text-orange-500', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'CRITICAL_SPIKE', glowShadow: 'rgba(249, 115, 22, 0.6)' };
    }
    if (value >= 60 || isAnomaly) {
      return { level: 'warning', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-950/30', borderClass: 'border-yellow-500/20', glowColor: 'yellow', statusText: 'WARNING_DRIFT', glowShadow: 'rgba(245, 158, 11, 0.5)' };
    }
    return { level: 'normal', colorClass: 'text-cyan-400', bgClass: 'bg-cyan-950/20', borderClass: 'border-cyan-500/20', glowColor: 'cyan', statusText: 'SYS_NOMINAL', glowShadow: 'rgba(0, 229, 255, 0.45)' };
  } else if (key === 'memory_usage') {
    if (value >= 90) {
      return { level: 'danger', colorClass: 'text-red-500', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'DANGER_LIMIT', glowShadow: 'rgba(239, 68, 68, 0.75)' };
    }
    if (value >= 75) {
      return { level: 'critical', colorClass: 'text-orange-500', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'LIMIT_WARNING', glowShadow: 'rgba(249, 115, 22, 0.6)' };
    }
    if (value >= 60 || isAnomaly) {
      return { level: 'warning', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-950/30', borderClass: 'border-yellow-500/20', glowColor: 'yellow', statusText: 'WARNING_DRIFT', glowShadow: 'rgba(245, 158, 11, 0.5)' };
    }
    return { level: 'normal', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-950/20', borderClass: 'border-emerald-500/20', glowColor: 'green', statusText: 'SYS_NOMINAL', glowShadow: 'rgba(16, 185, 129, 0.45)' };
  } else {
    // db_connections
    if (value >= 650) {
      return { level: 'danger', colorClass: 'text-red-500', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'DANGER_SPIKE', glowShadow: 'rgba(239, 68, 68, 0.75)' };
    }
    if (value >= 450) {
      return { level: 'critical', colorClass: 'text-orange-500', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'POOL_WARNING', glowShadow: 'rgba(249, 115, 22, 0.6)' };
    }
    if (value >= 250 || isAnomaly) {
      return { level: 'warning', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-950/30', borderClass: 'border-yellow-500/20', glowColor: 'yellow', statusText: 'WARNING_DRIFT', glowShadow: 'rgba(245, 158, 11, 0.5)' };
    }
    return { level: 'normal', colorClass: 'text-rose-400', bgClass: 'bg-rose-950/20', borderClass: 'border-rose-500/20', glowColor: 'rose', statusText: 'SYS_NOMINAL', glowShadow: 'rgba(244, 63, 94, 0.45)' };
  }
};

const getSystemSeverity = (health: number): SeverityConfig => {
  if (health >= 85) {
    return { level: 'normal', colorClass: 'text-cyan-400', bgClass: 'bg-cyan-950/20', borderClass: 'border-cyan-500/20', glowColor: 'cyan', statusText: 'HEALTHY', glowShadow: 'rgba(0, 229, 255, 0.45)' };
  }
  if (health >= 70) {
    return { level: 'warning', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-950/30', borderClass: 'border-yellow-500/20', glowColor: 'yellow', statusText: 'DEGRADED', glowShadow: 'rgba(245, 158, 11, 0.5)' };
  }
  if (health >= 50) {
    return { level: 'critical', colorClass: 'text-orange-500', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'SYS_CRITICAL', glowShadow: 'rgba(249, 115, 22, 0.6)' };
  }
  return { level: 'danger', colorClass: 'text-red-500', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'CRITICAL_FAIL', glowShadow: 'rgba(239, 68, 68, 0.75)' };
};

function renderLogLine(log: string) {
  const tokenRegex = /(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [A-Z]+\]|\[\d{2}:\d{2}:\d{2}\]|\[INCIDENT_DETECTED\]|\[CRITICAL\]|\[AI_AGENT_ORCHESTRATOR\]|\[EXECUTION_SUCCESS\])/g;
  const parts = log.split(tokenRegex);

  return (
    <span className="flex items-center flex-wrap">
      {parts.map((part, index) => {
        if (/^(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [A-Z]+\]|\[\d{2}:\d{2}:\d{2}\])$/.test(part)) {
          return (
            <span key={index} className="text-slate-500 font-mono text-xs mr-2">
              {part}
            </span>
          );
        }
        if (part === "[INCIDENT_DETECTED]" || part === "[CRITICAL]") {
          return (
            <span key={index} className="text-rose-400 animate-pulse mr-1">
              {part}
            </span>
          );
        }
        if (part === "[AI_AGENT_ORCHESTRATOR]") {
          return (
            <span key={index} className="text-cyan-400 mr-1">
              {part}
            </span>
          );
        }
        if (part === "[EXECUTION_SUCCESS]") {
          return (
            <span key={index} className="text-emerald-400 font-bold mr-1">
              {part}
            </span>
          );
        }
        return (
          <span key={index} className="text-emerald-400">
            {part}
          </span>
        );
      })}
    </span>
  );
}

export default function Home() {
  // 🚀 FIXED: Fallback explicitly synced with backend API router endpoint path
  const wsUrl = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL
    ? process.env.NEXT_PUBLIC_WS_URL
    : 'ws://127.0.0.1:8000/ws/metrics';

  useMetricsSocket(wsUrl);
  const history = useMetricsStore(state => state.history);
  const actionLogs = useMetricsStore((state: any) => state.actionLogs || []);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [actionLogs]);


  // Selector optimized to prevent new array references on every execution loop
  const alerts = useMetricsStore((state: any) => state.alerts);
  const predictions = useMetricsStore((state: any) => state.predictions);
  const latestMetric = useMetricsStore((state: any) => state.latestMetric);

  const cpuVal = latestMetric?.cpu_usage !== undefined && latestMetric?.cpu_usage !== null ? latestMetric.cpu_usage : 0;
  const memVal = latestMetric?.memory_usage !== undefined && latestMetric?.memory_usage !== null ? latestMetric.memory_usage : 0;
  const dbVal = latestMetric?.db_connections !== undefined && latestMetric?.db_connections !== null ? latestMetric.db_connections : 0;

  const systemHealthVal = Math.max(0, Math.min(100, Math.round(
    100 - (cpuVal * 0.4 + memVal * 0.4 + Math.min(dbVal, 1000) * 0.02) -
    ((latestMetric?.anomalies?.cpu_usage ? 10 : 0) + (latestMetric?.anomalies?.memory_usage ? 10 : 0) + (latestMetric?.anomalies?.db_connections ? 10 : 0))
  )));

  // Safe fallback to handle arrays cleanly during mapping loops
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  // Tab state routing engine
  const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'database' | 'system'>('system');

  // Live connection uptime tracker
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const getHistoryStats = (key: 'cpu_usage' | 'memory_usage' | 'db_connections' | 'system_health') => {
    const mappedHistory = (history || []).map(h => {
      const cpu = h.cpu_usage ?? 0;
      const mem = h.memory_usage ?? 0;
      const db = h.db_connections ?? 0;
      const system_health = Math.max(0, Math.min(100, Math.round(
        100 - (cpu * 0.4 + mem * 0.4 + Math.min(db, 1000) * 0.02) -
        ((h.anomalies?.cpu_usage ? 10 : 0) + (h.anomalies?.memory_usage ? 10 : 0) + (h.anomalies?.db_connections ? 10 : 0))
      )));
      return { ...h, system_health };
    });

    if (mappedHistory.length === 0) {
      const currentVal = key === 'system_health' ? systemHealthVal : (latestMetric?.[key] ?? 0);
      return { min: currentVal, max: currentVal, avg: currentVal, volatility: 0 };
    }
    const vals = mappedHistory.map(h => h[key]).filter(v => v !== undefined && v !== null);
    if (vals.length === 0) {
      const currentVal = key === 'system_health' ? systemHealthVal : (latestMetric?.[key] ?? 0);
      return { min: currentVal, max: currentVal, avg: currentVal, volatility: 0 };
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / vals.length;
    const volatility = Math.sqrt(variance);
    return { min, max, avg, volatility };
  };

  const cpuSeverity = getMetricSeverity(cpuVal, 'cpu_usage', !!latestMetric?.anomalies?.cpu_usage);
  const memSeverity = getMetricSeverity(memVal, 'memory_usage', !!latestMetric?.anomalies?.memory_usage);
  const dbSeverity = getMetricSeverity(dbVal, 'db_connections', !!latestMetric?.anomalies?.db_connections);
  const systemSeverity = getSystemSeverity(systemHealthVal);

  const cpuStats = getHistoryStats('cpu_usage');
  const memStats = getHistoryStats('memory_usage');
  const dbStats = getHistoryStats('db_connections');
  const systemHealthStats = getHistoryStats('system_health');

  const systemHealthHistory = (history || []).map(h => {
    const cpu = h.cpu_usage ?? 0;
    const mem = h.memory_usage ?? 0;
    const db = h.db_connections ?? 0;
    const system_health = Math.max(0, Math.min(100, Math.round(
      100 - (cpu * 0.4 + mem * 0.4 + Math.min(db, 1000) * 0.02) -
      ((h.anomalies?.cpu_usage ? 10 : 0) + (h.anomalies?.memory_usage ? 10 : 0) + (h.anomalies?.db_connections ? 10 : 0))
    )));
    return { ...h, system_health };
  });

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-slate-950">
      {/* Top Pane - Independent Analytics Workspace */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Page Header */}
      <header className="flex justify-between items-center pb-4 border-b border-slate-800/60 mb-0 bg-[#111827] border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
        <h1 className="text-3xl font-extrabold tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          AnomaLog // Predictive Telemetry
        </h1>
        <div className="flex items-center gap-3">
          {/* AI-SRE Active Badge with Breathing Animation */}
          <div className="flex items-center gap-2 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono-tech tracking-wider animate-sre-breathe shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            AI-SRE AGENT: ACTIVE
          </div>
          <div className="header-uptime bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono-tech tracking-wider">
            SYS_STATUS: ACTIVE // {formatUptime(uptime)}
          </div>
        </div>
      </header>

      {/* Telemetry Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {/* CPU Usage Card */}
        <AntigravityCard
          glowColor={cpuSeverity.glowColor}
          isAnomaly={!!latestMetric?.anomalies?.cpu_usage}
          severity={cpuSeverity.level}
          className="bg-[#111827] border border-slate-800 rounded-xl"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// CPU UTILIZATION</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                cpuSeverity.level !== 'normal' 
                  ? `${cpuSeverity.bgClass} ${cpuSeverity.colorClass} ${cpuSeverity.borderClass} font-black tracking-wider animate-pulse` 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
              }`}>
                {cpuSeverity.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2 bg-gradient-to-r from-slate-900/60 via-slate-900/10 to-transparent p-2 rounded-lg w-max border-l border-slate-800/40">
              <span 
                className={`text-5xl font-black font-mono-tech tracking-tight transition-all duration-300 ${cpuSeverity.colorClass}`}
                style={{ textShadow: `0 0 15px ${cpuSeverity.glowShadow.replace('0.75', '0.45').replace('0.6', '0.45').replace('0.5', '0.45')}` }}
              >
                {cpuVal !== 0 ? Math.round(cpuVal) : '0'}
              </span>
              <span className={`text-xl font-bold font-mono-tech ${cpuSeverity.colorClass}`}>%</span>
            </div>
          </div>
          {/* Multi-Row Analytics Matrix Sub-Section */}
          <div className="mt-4 pt-3 border-t border-slate-800/40">
            <span className="text-[10px] font-semibold font-mono-tech text-slate-500 uppercase tracking-widest">// PRECISION STATISTICS</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {/* [PEAK_LOAD] Badge */}
              <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2 rounded flex flex-col justify-between items-center shadow-[0_0_8px_rgba(245,158,11,0.05)]">
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">PEAK LOAD</span>
                <span className="font-mono text-xs font-black mt-0.5 text-amber-400">
                  {Math.round(cpuStats.max)}%
                </span>
              </div>

              {/* [RUNNING_AVG] Badge */}
              <div className="bg-slate-900 text-slate-300 border border-slate-800 p-2 rounded flex flex-col justify-between items-center shadow-md">
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">RUNNING AVG (μ)</span>
                <span className="font-mono text-xs font-black mt-0.5 text-slate-300">
                  {cpuStats.avg.toFixed(1)}%
                </span>
              </div>

              {/* [VOLATILITY_INDEX] Badge */}
              <div className={`p-2 rounded flex flex-col justify-between items-center border transition-all duration-300 ${
                cpuStats.volatility > 8
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.15)] animate-pulse'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}>
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">VOLATILITY</span>
                <span className={`font-mono text-xs mt-0.5 ${cpuStats.volatility > 8 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                  {cpuStats.volatility.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/60">
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MIN</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(cpuStats.min)}%</span>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MAX</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(cpuStats.max)}%</span>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">AVG</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{cpuStats.avg.toFixed(1)}%</span>
            </div>
            <div className={`p-2 rounded text-center flex flex-col justify-between items-center transition-all duration-300 ${
              cpuSeverity.level !== 'normal' 
                ? `${cpuSeverity.bgClass} ${cpuSeverity.borderClass} shadow-[0_0_10px_${cpuSeverity.glowShadow.replace('0.75', '0.25').replace('0.6', '0.25').replace('0.5', '0.25')}]`
                : 'bg-cyan-950/20 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
            }`}>
              <span className={`text-[9px] font-mono-tech uppercase font-semibold ${cpuSeverity.level !== 'normal' ? cpuSeverity.colorClass : 'text-cyan-300/70'}`}>STATUS</span>
              <span className={`font-mono text-[9px] px-1 py-0.5 rounded font-extrabold mt-1 inline-block uppercase text-center ${cpuSeverity.level !== 'normal' ? cpuSeverity.colorClass : 'text-cyan-400'}`}>{cpuSeverity.level}</span>
            </div>
          </div>
        </AntigravityCard>

        {/* Memory Allocation Card */}
        <AntigravityCard
          glowColor={memSeverity.glowColor}
          isAnomaly={!!latestMetric?.anomalies?.memory_usage}
          severity={memSeverity.level}
          className="bg-[#111827] border border-slate-800 rounded-xl"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// MEMORY ALLOCATION</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                memSeverity.level !== 'normal' 
                  ? `${memSeverity.bgClass} ${memSeverity.colorClass} ${memSeverity.borderClass} font-black tracking-wider animate-pulse` 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
              }`}>
                {memSeverity.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2 bg-gradient-to-r from-slate-900/60 via-slate-900/10 to-transparent p-2 rounded-lg w-max border-l border-slate-800/40">
              <span 
                className={`text-5xl font-black font-mono-tech tracking-tight transition-all duration-300 ${memSeverity.colorClass}`}
                style={{ textShadow: `0 0 15px ${memSeverity.glowShadow.replace('0.75', '0.45').replace('0.6', '0.45').replace('0.5', '0.45')}` }}
              >
                {memVal !== 0 ? Math.round(memVal) : '0'}
              </span>
              <span className={`text-xl font-bold font-mono-tech ${memSeverity.colorClass}`}>%</span>
            </div>
          </div>
          {/* Multi-Row Analytics Matrix Sub-Section */}
          <div className="mt-4 pt-3 border-t border-slate-800/40">
            <span className="text-[10px] font-semibold font-mono-tech text-slate-500 uppercase tracking-widest">// PRECISION STATISTICS</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {/* [PEAK_LOAD] Badge */}
              <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2 rounded flex flex-col justify-between items-center shadow-[0_0_8px_rgba(245,158,11,0.05)]">
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">PEAK LOAD</span>
                <span className="font-mono text-xs font-black mt-0.5 text-amber-400">
                  {Math.round(memStats.max)}%
                </span>
              </div>

              {/* [RUNNING_AVG] Badge */}
              <div className="bg-slate-900 text-slate-300 border border-slate-800 p-2 rounded flex flex-col justify-between items-center shadow-md">
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">RUNNING AVG (μ)</span>
                <span className="font-mono text-xs font-black mt-0.5 text-slate-300">
                  {memStats.avg.toFixed(1)}%
                </span>
              </div>

              {/* [VOLATILITY_INDEX] Badge */}
              <div className={`p-2 rounded flex flex-col justify-between items-center border transition-all duration-300 ${
                memStats.volatility > 3
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.15)] animate-pulse'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}>
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">VOLATILITY</span>
                <span className={`font-mono text-xs mt-0.5 ${memStats.volatility > 3 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                  {memStats.volatility.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/60">
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MIN</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(memStats.min)}%</span>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MAX</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(memStats.max)}%</span>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">AVG</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{memStats.avg.toFixed(1)}%</span>
            </div>
            <div className={`p-2 rounded text-center flex flex-col justify-between items-center transition-all duration-300 ${
              memSeverity.level !== 'normal' 
                ? `${memSeverity.bgClass} ${memSeverity.borderClass} shadow-[0_0_10px_${memSeverity.glowShadow.replace('0.75', '0.25').replace('0.6', '0.25').replace('0.5', '0.25')}]`
                : 'bg-cyan-950/20 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
            }`}>
              <span className={`text-[9px] font-mono-tech uppercase font-semibold ${memSeverity.level !== 'normal' ? memSeverity.colorClass : 'text-cyan-300/70'}`}>STATUS</span>
              <span className={`font-mono text-[9px] px-1 py-0.5 rounded font-extrabold mt-1 inline-block uppercase text-center ${memSeverity.level !== 'normal' ? memSeverity.colorClass : 'text-cyan-400'}`}>{memSeverity.level}</span>
            </div>
          </div>
        </AntigravityCard>

        {/* Active Connections Card */}
        <AntigravityCard
          glowColor={dbSeverity.glowColor}
          isAnomaly={!!latestMetric?.anomalies?.db_connections}
          severity={dbSeverity.level}
          className="bg-[#111827] border border-slate-800 rounded-xl"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// ACTIVE DATABASE POOL</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                dbSeverity.level !== 'normal' 
                  ? `${dbSeverity.bgClass} ${dbSeverity.colorClass} ${dbSeverity.borderClass} font-black tracking-wider animate-pulse` 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
              }`}>
                {dbSeverity.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2 bg-gradient-to-r from-slate-900/60 via-slate-900/10 to-transparent p-2 rounded-lg w-max border-l border-slate-800/40">
              <span 
                className={`text-5xl font-black font-mono-tech tracking-tight transition-all duration-300 ${dbSeverity.colorClass}`}
                style={{ textShadow: `0 0 15px ${dbSeverity.glowShadow.replace('0.75', '0.45').replace('0.6', '0.45').replace('0.5', '0.45')}` }}
              >
                {dbVal !== 0 ? Math.round(dbVal) : '0'}
              </span>
              <span className={`text-lg font-bold font-mono-tech ${dbSeverity.colorClass}`}>CONNS</span>
            </div>
          </div>
          {/* Multi-Row Analytics Matrix Sub-Section */}
          <div className="mt-4 pt-3 border-t border-slate-800/40">
            <span className="text-[10px] font-semibold font-mono-tech text-slate-500 uppercase tracking-widest">// PRECISION STATISTICS</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {/* [PEAK_LOAD] Badge */}
              <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2 rounded flex flex-col justify-between items-center shadow-[0_0_8px_rgba(245,158,11,0.05)]">
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">PEAK LOAD</span>
                <span className="font-mono text-xs font-black mt-0.5 text-amber-400">
                  {Math.round(dbStats.max)}
                </span>
              </div>

              {/* [RUNNING_AVG] Badge */}
              <div className="bg-slate-900 text-slate-300 border border-slate-800 p-2 rounded flex flex-col justify-between items-center shadow-md">
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">RUNNING AVG (μ)</span>
                <span className="font-mono text-xs font-black mt-0.5 text-slate-300">
                  {dbStats.avg.toFixed(0)}
                </span>
              </div>

              {/* [VOLATILITY_INDEX] Badge */}
              <div className={`p-2 rounded flex flex-col justify-between items-center border transition-all duration-300 ${
                dbStats.volatility > 20
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.15)] animate-pulse'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}>
                <span className="text-[8px] text-slate-500 font-mono-tech uppercase tracking-wider font-semibold">VOLATILITY</span>
                <span className={`font-mono text-xs mt-0.5 ${dbStats.volatility > 20 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                  {dbStats.volatility.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/60">
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MIN</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(dbStats.min)}</span>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MAX</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(dbStats.max)}</span>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
              <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">AVG</span>
              <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(dbStats.avg)}</span>
            </div>
            <div className={`p-2 rounded text-center flex flex-col justify-between items-center transition-all duration-300 ${
              dbSeverity.level !== 'normal' 
                ? `${dbSeverity.bgClass} ${dbSeverity.borderClass} shadow-[0_0_10px_${dbSeverity.glowShadow.replace('0.75', '0.25').replace('0.6', '0.25').replace('0.5', '0.25')}]`
                : 'bg-cyan-950/20 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
            }`}>
              <span className={`text-[9px] font-mono-tech uppercase font-semibold ${dbSeverity.level !== 'normal' ? dbSeverity.colorClass : 'text-cyan-300/70'}`}>STATUS</span>
              <span className={`font-mono text-[9px] px-1 py-0.5 rounded font-extrabold mt-1 inline-block uppercase text-center ${dbSeverity.level !== 'normal' ? dbSeverity.colorClass : 'text-cyan-400'}`}>{dbSeverity.level}</span>
            </div>
          </div>
        </AntigravityCard>
      </div>

      {/* Cyberpunk Navigation Menu Bar */}
      <nav className="bg-[#111827] border border-slate-800 rounded-xl p-1.5 flex gap-2 w-max shadow-xl">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'system'
            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // System Health
        </button>
        <button
          onClick={() => setActiveTab('cpu')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'cpu'
            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // CPU Telemetry
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'memory'
            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // Memory Allocation
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'database'
            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // Database Pool
        </button>
      </nav>

      {/* Focused Component Toggling Layer */}
      <div className="flex-1 flex flex-col min-h-[350px] w-full">
        {activeTab === 'system' && (
          <div className="flex flex-col gap-6 w-full">
            {/* Top row of system tab: Composite score + individual values */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Composite Health Box (2/3 width) */}
              <div className="lg:col-span-2">
                <AntigravityCard
                  glowColor={systemSeverity.glowColor}
                  isAnomaly={!!latestMetric?.anomalies?.cpu_usage || !!latestMetric?.anomalies?.memory_usage || !!latestMetric?.anomalies?.db_connections}
                  severity={systemSeverity.level}
                  className="bg-[#111827] border border-slate-800 rounded-xl"
                >
                  <div className="flex flex-col gap-2 h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// OVERALL SYSTEM HEALTH</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                          systemSeverity.level !== 'normal' 
                            ? `${systemSeverity.bgClass} ${systemSeverity.colorClass} ${systemSeverity.borderClass} font-black tracking-wider animate-pulse` 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
                        }`}>
                          {systemSeverity.statusText}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">// Weighted telemetry composite. Active anomalies trigger metric penalties.</p>
                    </div>

                    <div className="my-6 flex items-baseline gap-2 bg-gradient-to-r from-slate-900/60 via-slate-900/10 to-transparent p-4 rounded-lg w-max border-l border-slate-800/40">
                      <span 
                        className={`text-6xl font-black font-mono-tech tracking-tight transition-all duration-300 ${systemSeverity.colorClass}`}
                        style={{ textShadow: `0 0 15px ${systemSeverity.glowShadow.replace('0.75', '0.45').replace('0.6', '0.45').replace('0.5', '0.45')}` }}
                      >
                        {systemHealthVal}
                      </span>
                      <span className={`text-2xl font-bold font-mono-tech ${systemSeverity.colorClass}`}>%</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/60">
                      <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                        <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MIN HEALTH</span>
                        <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(systemHealthStats.min)}%</span>
                      </div>
                      <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                        <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">MAX HEALTH</span>
                        <span className="text-cyan-400 font-mono text-xs font-black mt-1">{Math.round(systemHealthStats.max)}%</span>
                      </div>
                      <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded text-center flex flex-col justify-between items-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                        <span className="text-[9px] text-cyan-300/70 font-mono-tech uppercase font-semibold">AVG HEALTH</span>
                        <span className="text-cyan-400 font-mono text-xs font-black mt-1">{systemHealthStats.avg.toFixed(1)}%</span>
                      </div>
                      <div className={`p-2 rounded text-center flex flex-col justify-between items-center transition-all duration-300 ${
                        systemSeverity.level !== 'normal' 
                          ? `${systemSeverity.bgClass} ${systemSeverity.borderClass} shadow-[0_0_10px_${systemSeverity.glowShadow.replace('0.75', '0.25').replace('0.6', '0.25').replace('0.5', '0.25')}]`
                          : 'bg-cyan-950/20 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                      }`}>
                        <span className={`text-[9px] font-mono-tech uppercase font-semibold ${systemSeverity.level !== 'normal' ? systemSeverity.colorClass : 'text-cyan-300/70'}`}>STATUS</span>
                        <span className={`font-mono text-[9px] px-1 py-0.5 rounded font-extrabold mt-1 inline-block uppercase text-center ${systemSeverity.level !== 'normal' ? systemSeverity.colorClass : 'text-cyan-400'}`}>{systemSeverity.level}</span>
                      </div>
                    </div>
                  </div>
                </AntigravityCard>
              </div>

              {/* Individual Metrics Panel (1/3 width) */}
              <div className="flex flex-col gap-4">
                {/* CPU */}
                <div className="w-full flex flex-col">
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden shadow-lg group transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40 hover:border-slate-700">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono-tech text-slate-400">// CPU</span>
                      <span className={`text-xl font-bold font-mono-tech mt-1 ${cpuSeverity.colorClass}`}>{cpuVal !== 0 ? Math.round(cpuVal) : '0'}%</span>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono-tech border uppercase ${
                      cpuSeverity.level !== 'normal' ? `${cpuSeverity.bgClass} ${cpuSeverity.colorClass} ${cpuSeverity.borderClass} animate-pulse` : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {cpuSeverity.statusText}
                    </span>
                  </div>
                </div>

                {/* Memory */}
                <div className="w-full flex flex-col">
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden shadow-lg group transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40 hover:border-slate-700">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono-tech text-slate-400">// RAM</span>
                      <span className={`text-xl font-bold font-mono-tech mt-1 ${memSeverity.colorClass}`}>{memVal !== 0 ? Math.round(memVal) : '0'}%</span>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono-tech border uppercase ${
                      memSeverity.level !== 'normal' ? `${memSeverity.bgClass} ${memSeverity.colorClass} ${memSeverity.borderClass} animate-pulse` : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {memSeverity.statusText}
                    </span>
                  </div>
                </div>

                {/* Connections */}
                <div className="w-full flex flex-col">
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden shadow-lg group transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40 hover:border-slate-700">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono-tech text-slate-400">// DB POOL</span>
                      <span className={`text-xl font-bold font-mono-tech mt-1 ${dbSeverity.colorClass}`}>{dbVal !== 0 ? Math.round(dbVal) : '0'} conns</span>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono-tech border uppercase ${
                      dbSeverity.level !== 'normal' ? `${dbSeverity.bgClass} ${dbSeverity.colorClass} ${dbSeverity.borderClass} animate-pulse` : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {dbSeverity.statusText}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Trend Graph */}
            <RealtimeChart
              title="System Health Score Trend Graph"
              dataKey="system_health"
              color="#00e5ff"
              history={systemHealthHistory}
              containerClassName="h-[40vh] min-h-[350px] w-full bg-[#111827] border border-slate-800 rounded-xl p-6 relative flex flex-col shadow-lg"
              canvasClassName="flex-1 w-full min-h-[300px]"
            />
          </div>
        )}

        {activeTab === 'cpu' && (
          <RealtimeChart
            title="CPU Telemetry Graph"
            dataKey="cpu_usage"
            color="#00e5ff"
            history={history}
            containerClassName="h-[45vh] min-h-[350px] w-full bg-[#111827] border border-slate-800 rounded-xl p-6 relative flex flex-col shadow-lg"
            canvasClassName="flex-1 w-full min-h-[300px]"
          />
        )}

        {activeTab === 'memory' && (
          <RealtimeChart
            title="Memory Allocation Graph"
            dataKey="memory_usage"
            color="#00ff66"
            history={history}
            containerClassName="h-[45vh] min-h-[350px] w-full bg-[#111827] border border-slate-800 rounded-xl p-6 relative flex flex-col shadow-lg"
            canvasClassName="flex-1 w-full min-h-[300px]"
          />
        )}

        {activeTab === 'database' && (
          <RealtimeChart
            title="Database Connection Pool Graph"
            dataKey="db_connections"
            color="#ff0055"
            history={history}
            containerClassName="h-[45vh] min-h-[350px] w-full bg-[#111827] border border-slate-800 rounded-xl p-6 relative flex flex-col shadow-lg"
            canvasClassName="flex-1 w-full min-h-[300px]"
          />
        )}
      </div>

      {/* Symmetrical individual grid widgets for analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full mt-2">
        {/* Left Widget: Statistical Anomalies */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col h-[280px] shadow-lg">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
            <h3 className="text-rose-500 text-sm font-bold tracking-wider uppercase font-mono-tech">
              // Statistical Anomalies (3Σ Drift)
            </h3>
            <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-mono-tech font-bold animate-pulse">LIVE_STREAM</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {safeAlerts.length === 0 ? (
              <div className="text-slate-400 text-xs italic p-4 border border-dashed border-slate-800/60 rounded-lg font-mono-tech">
                ✓ System stable. No 3-sigma mathematical drift detected in the current window.
              </div>
            ) : (
              <table className="w-full text-left font-mono-tech border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-1.5 font-semibold text-left">TIMESTAMP</th>
                    <th className="pb-1.5 font-semibold text-left">METRIC</th>
                    <th className="pb-1.5 font-semibold text-right">VALUE</th>
                    <th className="pb-1.5 font-semibold text-right">MEAN (μ)</th>
                    <th className="pb-1.5 font-semibold text-right">STD (σ)</th>
                  </tr>
                </thead>
                <tbody>
                  {safeAlerts.map((alert: any, idx: number) => {
                    const parsed = parseAlertMessage(alert.message);
                    const timeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'NOW';
                    if (parsed) {
                      return (
                        <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                          <td className="py-2 text-slate-400 font-semibold">{timeStr}</td>
                          <td className="py-2 font-bold text-rose-400 uppercase">{parsed.metric}</td>
                          <td className="py-2 text-right font-extrabold text-white">{parsed.value}</td>
                          <td className="py-2 text-right text-slate-300 font-semibold">{parsed.mean}</td>
                          <td className="py-2 text-right text-slate-400">{parsed.std}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                        <td className="py-2 text-slate-400 font-semibold">{timeStr}</td>
                        <td className="py-2 font-bold text-rose-400 uppercase">{alert.metric || 'SYSTEM'}</td>
                        <td colSpan={3} className="py-2 text-white">{alert.message}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Widget: Predictive ML Forecasts */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col h-[280px] shadow-lg">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
            <h3 className="text-cyan-500 text-sm font-bold tracking-wider uppercase font-mono-tech">
              // Predictive ML Forecasts (AR model)
            </h3>
            <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-mono-tech font-bold animate-pulse">95%_CONFIDENCE</span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {safeAlerts.length === 0 ? (
              <div className="text-slate-400 text-sm italic p-4 border border-dashed border-slate-800/60 rounded-lg font-mono-tech">
                ⏳ Telemetry matrices compiling... Running rolling Autoregressive forecast.
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono-tech border-b border-slate-800/60 pb-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
                    <span>ENGINE: STATSMODELS AR</span>
                  </div>
                  <span>LOOKAHEAD: +1.5S</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-[#0d1527] border border-slate-800/60 p-2 px-3 rounded-lg">
                    <span className="text-[11.5px] font-mono-tech text-slate-300 font-semibold">CPU Vector Forecast</span>
                    <div className="bg-cyan-500/10 border border-cyan-500/80 text-cyan-400 font-bold px-2.5 py-0.5 rounded text-[11px] font-mono-tech shadow-[0_0_8px_rgba(6,182,212,0.15)] min-w-[80px] text-center">
                      {predictions?.cpu_usage?.values?.[0] !== undefined ? `${predictions.cpu_usage.values[0].toFixed(1)}%` : 'STABLE'}
                    </div>
                  </div>
                  {predictions?.memory_usage?.values?.[0] !== undefined && (
                    <div className="flex justify-between items-center bg-[#0d1527] border border-slate-800/60 p-2 px-3 rounded-lg">
                      <span className="text-[11.5px] font-mono-tech text-slate-300 font-semibold">Memory Vector Forecast</span>
                      <div className="bg-emerald-500/10 border border-emerald-500/80 text-emerald-400 font-bold px-2.5 py-0.5 rounded text-[11px] font-mono-tech shadow-[0_0_8px_rgba(16,185,129,0.15)] min-w-[80px] text-center">
                        {predictions.memory_usage.values[0].toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {predictions?.db_connections?.values?.[0] !== undefined && (
                    <div className="flex justify-between items-center bg-[#0d1527] border border-slate-800/60 p-2 px-3 rounded-lg">
                      <span className="text-[11.5px] font-mono-tech text-slate-300 font-semibold">Database Vector Forecast</span>
                      <div className="bg-rose-500/10 border border-rose-500/80 text-rose-400 font-bold px-2.5 py-0.5 rounded text-[11px] font-mono-tech shadow-[0_0_8px_rgba(244,63,94,0.15)] min-w-[80px] text-center">
                        {predictions.db_connections.values[0].toFixed(0)} CONNS
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      </div>

      {/* Real-Time Action Resolution Terminal */}
      <footer className="h-64 border-t border-slate-800 bg-black/95 w-full flex flex-col text-emerald-400 relative overflow-hidden group transition-all duration-300">
        <div className="flex justify-between items-center border-b border-slate-800/80 px-4 py-2 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs uppercase tracking-widest font-bold font-mono">// AI-SRE PLATFORM INCIDENT COMMAND CENTER</span>
          </div>
          <span className="text-[10px] text-emerald-500/60 font-semibold tracking-wider font-mono">STATUS: MONITORING_REMEDIATION</span>
        </div>
        <div className="overflow-y-auto flex-1 p-4 font-mono text-sm overscroll-contain flex flex-col gap-1 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
          {actionLogs.length === 0 ? (
            <div className="text-emerald-500/50 italic py-2 font-mono">// Safe-Heal agent active. Monitoring telemetry matrices...</div>
          ) : (
            actionLogs.map((log: string, idx: number) => {
              let lineClass = "whitespace-pre-wrap py-0.5";
              if (log.includes("[EXECUTION_SUCCESS]")) {
                lineClass += " border-l-2 border-emerald-500/40 pl-2 bg-emerald-950/10";
              }
              return (
                <div key={idx} className={lineClass} style={{ contentVisibility: 'auto' }}>
                  {renderLogLine(log)}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} className="h-0 w-0 opacity-0 pointer-events-none" aria-hidden="true" />
        </div>
      </footer>
    </main>
  );
}