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
}

interface SeverityConfig {
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
  const tokenRegex = /(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [A-Z]+\]|\[\d{2}:\d{2}:\d{2}\]|\[INCIDENT_DETECTED\]|\[CRITICAL\]|\[AI_AGENT_ORCHESTRATOR\]|\[AI_DIAGNOSTIC_ENGINE\]|\[AI_PREDICTIVE_ENGINE\]|\[EXECUTION_SUCCESS\]|\[AI_ORCHESTRATOR_EXECUTOR\])/g;
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
        if (part === "[AI_DIAGNOSTIC_ENGINE]") {
          return (
            <span key={index} className="text-cyan-400 font-medium mr-1">
              {part}
            </span>
          );
        }
        if (part === "[AI_PREDICTIVE_ENGINE]") {
          return (
            <span key={index} className="text-fuchsia-400 font-bold mr-1 animate-pulse">
              {part}
            </span>
          );
        }
        if (part === "[AI_ORCHESTRATOR_EXECUTOR]") {
          return (
            <span key={index} className="text-emerald-400 font-extrabold mr-1 animate-pulse">
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
          <span key={index} className={log.includes("[AI_DIAGNOSTIC_ENGINE]") ? "text-cyan-400 font-medium" : (log.includes("[AI_PREDICTIVE_ENGINE]") ? "text-fuchsia-300 font-semibold" : (log.includes("[AI_ORCHESTRATOR_EXECUTOR]") ? "text-emerald-300 font-mono" : "text-emerald-400"))}>
            {part}
          </span>
        );
      })}
    </span>
  );
}

export default function Home() {
  const wsUrl = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL
    ? process.env.NEXT_PUBLIC_WS_URL
    : 'ws://127.0.0.1:8000/ws/metrics';

  useMetricsSocket(wsUrl);
  const history = useMetricsStore(state => state.history);

  const actionLogs = useMetricsStore((state: any) => state.actionLogs || []);
  const terminalScrollRef = useRef<HTMLDivElement | null>(null);

  const alerts = useMetricsStore((state: any) => state.alerts);
  const predictions = useMetricsStore((state: any) => state.predictions);
  const latestMetric = useMetricsStore((state: any) => state.latestMetric);
  const triggerFailureWave = useMetricsStore((state: any) => state.triggerFailureWave);
  const isAutonomous = useMetricsStore((state: any) => state.isAutonomous);

  // Side Interface Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'anomalies' | 'forecasts' | 'risk' | 'terminal'>('anomalies');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const baseCpu = latestMetric?.cpu_usage !== undefined && latestMetric?.cpu_usage !== null ? latestMetric.cpu_usage : 0;
  const baseMem = latestMetric?.memory_usage !== undefined && latestMetric?.memory_usage !== null ? latestMetric.memory_usage : 0;
  const baseDb = latestMetric?.db_connections !== undefined && latestMetric?.db_connections !== null ? latestMetric.db_connections : 0;

  const cpuVal = baseCpu;
  const memVal = baseMem;
  const dbVal = baseDb;

  const systemHealthVal = Math.max(0, Math.min(100, Math.round(
    100 - (cpuVal * 0.4 + memVal * 0.4 + Math.min(dbVal, 1000) * 0.02) -
    ((latestMetric?.anomalies?.cpu_usage ? 10 : 0) + (latestMetric?.anomalies?.memory_usage ? 10 : 0) + (latestMetric?.anomalies?.db_connections ? 10 : 0))
  )));

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const isCpuAnomaly = !!(latestMetric?.anomalies?.cpu_usage || safeAlerts.some((a: any) => a.metric === 'cpu_usage'));
  const isMemAnomaly = !!(latestMetric?.anomalies?.memory_usage || safeAlerts.some((a: any) => a.metric === 'memory_usage'));
  const isDbAnomaly = !!(latestMetric?.anomalies?.db_connections || safeAlerts.some((a: any) => a.metric === 'db_connections'));

  const getRiskWeight = (
    value: number,
    isAnomaly: boolean,
    warningThreshold: number,
    criticalThreshold: number,
    baseMin: number
  ) => {
    if (isAnomaly || value >= criticalThreshold) {
      const range = 100 - 76;
      const progress = Math.min(1, (value - criticalThreshold) / (criticalThreshold * 0.5 || 1));
      return Math.round(76 + Math.max(0, progress * range));
    }
    if (value >= warningThreshold) {
      const range = 75 - 50;
      const progress = Math.min(1, (value - warningThreshold) / (criticalThreshold - warningThreshold));
      return Math.round(50 + progress * range);
    }
    const range = 49 - baseMin;
    const progress = Math.min(1, value / warningThreshold);
    return Math.round(baseMin + progress * range);
  };

  const dbRisk = getRiskWeight(dbVal, isDbAnomaly, 250, 450, 15);
  const memRisk = getRiskWeight(memVal, isMemAnomaly, 60, 75, 12);
  const netRisk = getRiskWeight(cpuVal, isCpuAnomaly, 60, 75, 10);
  const threadRisk = getRiskWeight(cpuVal, isCpuAnomaly, 65, 85, 8);

  const combinedLogs = actionLogs;

  useEffect(() => {
    if (terminalScrollRef.current) {
      const container = terminalScrollRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [combinedLogs.length]);

  const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'database' | 'system'>('system');
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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 🚀 Main Clean Dashboard Container */}
      <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-[1800px] w-full mx-auto">
        
        {/* Top Header */}
        <header className="flex flex-wrap justify-between items-center bg-[#0e1424]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-400">
              AnomaLog // Telemetry
            </h1>
            <span className="text-xs bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-md font-mono-tech border border-slate-700/50 hidden sm:inline-block">
              CORE v2.4
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono-tech tracking-wider shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AI-SRE: ACTIVE
            </div>

            <div className="bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono-tech tracking-wider hidden sm:block">
              SYS_ACTIVE // {formatUptime(uptime)}
            </div>

            {/* ⚡ Drawer Trigger Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white font-mono-tech text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-95 ml-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              ⚡ ANALYTICS & TERMINAL
            </button>
          </div>
        </header>

        {/* 📊 Key Status Cards Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
          {/* CPU Card */}
          <AntigravityCard
            glowColor={cpuSeverity.glowColor}
            isAnomaly={!!latestMetric?.anomalies?.cpu_usage}
            severity={cpuSeverity.level}
            className="bg-[#0e1424]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold text-xs tracking-wider uppercase font-mono-tech">// CPU UTIL</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                cpuSeverity.level !== 'normal' 
                  ? `${cpuSeverity.bgClass} ${cpuSeverity.colorClass} ${cpuSeverity.borderClass} font-black animate-pulse` 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
              }`}>
                {cpuSeverity.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold font-mono tracking-tight text-white">
                {cpuVal !== 0 ? Math.round(cpuVal) : '0'}
              </span>
              <span className={`text-lg font-bold font-mono-tech ${cpuSeverity.colorClass}`}>%</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-between text-[10px] text-slate-400 font-mono-tech">
              <span>AVG: {cpuStats.avg.toFixed(1)}%</span>
              <span>PEAK: {Math.round(cpuStats.max)}%</span>
            </div>
          </AntigravityCard>

          {/* Memory Card */}
          <AntigravityCard
            glowColor={memSeverity.glowColor}
            isAnomaly={!!latestMetric?.anomalies?.memory_usage}
            severity={memSeverity.level}
            className="bg-[#0e1424]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold text-xs tracking-wider uppercase font-mono-tech">// RAM ALLOC</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                memSeverity.level !== 'normal' 
                  ? `${memSeverity.bgClass} ${memSeverity.colorClass} ${memSeverity.borderClass} font-black animate-pulse` 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
              }`}>
                {memSeverity.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold font-mono tracking-tight text-white">
                {memVal !== 0 ? Math.round(memVal) : '0'}
              </span>
              <span className={`text-lg font-bold font-mono-tech ${memSeverity.colorClass}`}>%</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-between text-[10px] text-slate-400 font-mono-tech">
              <span>AVG: {memStats.avg.toFixed(1)}%</span>
              <span>PEAK: {Math.round(memStats.max)}%</span>
            </div>
          </AntigravityCard>

          {/* DB Pool Card */}
          <AntigravityCard
            glowColor={dbSeverity.glowColor}
            isAnomaly={!!latestMetric?.anomalies?.db_connections}
            severity={dbSeverity.level}
            className="bg-[#0e1424]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold text-xs tracking-wider uppercase font-mono-tech">// DB POOL</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                dbSeverity.level !== 'normal' 
                  ? `${dbSeverity.bgClass} ${dbSeverity.colorClass} ${dbSeverity.borderClass} font-black animate-pulse` 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
              }`}>
                {dbSeverity.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold font-mono tracking-tight text-white">
                {dbVal !== 0 ? Math.round(dbVal) : '0'}
              </span>
              <span className={`text-sm font-bold font-mono-tech ${dbSeverity.colorClass}`}>CONNS</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-between text-[10px] text-slate-400 font-mono-tech">
              <span>AVG: {Math.round(dbStats.avg)}</span>
              <span>PEAK: {Math.round(dbStats.max)}</span>
            </div>
          </AntigravityCard>

          {/* Overall Health Card */}
          <AntigravityCard
            glowColor={systemSeverity.glowColor}
            isAnomaly={!!latestMetric?.anomalies?.cpu_usage || !!latestMetric?.anomalies?.memory_usage || !!latestMetric?.anomalies?.db_connections}
            severity={systemSeverity.level}
            className="bg-[#0e1424]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold text-xs tracking-wider uppercase font-mono-tech">// SYS HEALTH</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech border ${
                systemSeverity.level !== 'normal' 
                  ? `${systemSeverity.bgClass} ${systemSeverity.colorClass} ${systemSeverity.borderClass} font-black animate-pulse` 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
              }`}>
                {systemSeverity.statusText}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold font-mono tracking-tight text-white">
                {systemHealthVal}
              </span>
              <span className={`text-lg font-bold font-mono-tech ${systemSeverity.colorClass}`}>%</span>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-between text-[10px] text-slate-400 font-mono-tech">
              <span>AVG: {systemHealthStats.avg.toFixed(1)}%</span>
              <span>MIN: {Math.round(systemHealthStats.min)}%</span>
            </div>
          </AntigravityCard>

          {/* Failure Wave Trigger Card */}
          <div className="bg-[#0e1424]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 font-bold text-xs tracking-wider uppercase font-mono-tech">ORCHESTRATION</span>
              <div className="mt-1">
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono-tech font-bold">
                  MANUAL OVERRIDE
                </span>
              </div>
            </div>
            <button 
              onClick={() => triggerFailureWave?.()}
              className="w-full mt-4 bg-gradient-to-r from-rose-950/80 to-red-950/80 hover:from-rose-900 hover:to-red-900 border border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-white font-mono-tech text-[11px] font-bold tracking-wider py-2.5 px-3 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md uppercase"
            >
              SIMULATE FAILURE WAVE
            </button>
          </div>
        </div>

        {/* 📈 Clean Navigation & Massive Hero Chart */}
        <div className="flex flex-col gap-4 w-full flex-1">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <nav className="bg-[#0e1424] border border-slate-800 rounded-2xl p-1.5 flex gap-2 w-max shadow-xl">
              <button
                onClick={() => setActiveTab('system')}
                className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'system'
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
                  }`}
              >
                // System Health
              </button>
              <button
                onClick={() => setActiveTab('cpu')}
                className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'cpu'
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
                  }`}
              >
                // CPU Telemetry
              </button>
              <button
                onClick={() => setActiveTab('memory')}
                className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'memory'
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
                  }`}
              >
                // Memory Allocation
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'database'
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/20 hover:bg-slate-800/30 border-transparent'
                  }`}
              >
                // Database Pool
              </button>
            </nav>

            <div className="flex items-center gap-2 text-xs font-mono-tech text-slate-400 bg-[#0e1424] border border-slate-800 px-4 py-2 rounded-2xl">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>SAMPLING RATE: 100MS HIGH-VELOCITY</span>
            </div>
          </div>

          {/* Hero Chart Container */}
          <div className="w-full flex-1 min-h-[580px]">
            {activeTab === 'system' && (
              <RealtimeChart
                title="System Health Score Trend Graph (Realtime)"
                dataKey="system_health"
                color="#00e5ff"
                history={systemHealthHistory}
                height={560}
                containerClassName="w-full bg-[#080c14] border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative"
                canvasClassName="w-full"
              />
            )}

            {activeTab === 'cpu' && (
              <RealtimeChart
                title="CPU Telemetry Graph (Realtime)"
                dataKey="cpu_usage"
                color="#00e5ff"
                history={history}
                height={560}
                containerClassName="w-full bg-[#080c14] border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative"
                canvasClassName="w-full"
              />
            )}

            {activeTab === 'memory' && (
              <RealtimeChart
                title="Memory Allocation Graph (Realtime)"
                dataKey="memory_usage"
                color="#00ff66"
                history={history}
                height={560}
                containerClassName="w-full bg-[#080c14] border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative"
                canvasClassName="w-full"
              />
            )}

            {activeTab === 'database' && (
              <RealtimeChart
                title="Database Connection Pool Graph (Realtime)"
                dataKey="db_connections"
                color="#ff0055"
                history={history}
                height={560}
                containerClassName="w-full bg-[#080c14] border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative"
                canvasClassName="w-full"
              />
            )}
          </div>
        </div>
      </div>

      {/* 🗂️ SLIDE-OVER SIDE DRAWER INTERFACE */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Right Slide-Over Panel */}
          <aside className="relative z-50 w-full max-w-3xl bg-[#090d16] border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 bg-[#0e1424] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-wider uppercase font-mono-tech flex items-center gap-2">
                  <span className="text-cyan-400">⚡</span> Detailed Telemetry & Command Center
                </h2>
                <p className="text-xs text-slate-400 font-mono-tech mt-1">
                  Full precision matrices, 3σ drift logs, ML vector forecasts, & terminal.
                </p>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700 transition-all text-sm font-mono font-bold"
                title="Close (Esc)"
              >
                ✕ ESC
              </button>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-[#0b0f19] px-6 gap-2 pt-3">
              <button
                onClick={() => setDrawerTab('anomalies')}
                className={`pb-3 px-4 text-xs font-bold tracking-wider uppercase font-mono-tech border-b-2 transition-all ${
                  drawerTab === 'anomalies'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 3Σ Drift Anomalies
              </button>
              <button
                onClick={() => setDrawerTab('forecasts')}
                className={`pb-3 px-4 text-xs font-bold tracking-wider uppercase font-mono-tech border-b-2 transition-all ${
                  drawerTab === 'forecasts'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🔮 ML Vector Forecasts
              </button>
              <button
                onClick={() => setDrawerTab('risk')}
                className={`pb-3 px-4 text-xs font-bold tracking-wider uppercase font-mono-tech border-b-2 transition-all ${
                  drawerTab === 'risk'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🎯 RCA Risk Radar
              </button>
              <button
                onClick={() => setDrawerTab('terminal')}
                className={`pb-3 px-4 text-xs font-bold tracking-wider uppercase font-mono-tech border-b-2 transition-all ${
                  drawerTab === 'terminal'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                💻 Incident Terminal
              </button>
            </div>

            {/* Drawer Body Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Tab 1: 3Σ Drift Anomalies */}
              {drawerTab === 'anomalies' && (
                <div className="flex flex-col gap-6">
                  {/* Detailed Precision Stats Grid */}
                  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-wider font-mono-tech mb-4">
                      // PRECISION STATISTICAL MATRICES
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {/* CPU Stats */}
                      <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] text-slate-500 font-mono-tech uppercase">CPU PEAK / AVG</span>
                        <span className="font-mono text-sm font-bold text-white mt-1">
                          {Math.round(cpuStats.max)}% / {cpuStats.avg.toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-cyan-400 font-mono mt-1">VOLATILITY: {cpuStats.volatility.toFixed(2)}</span>
                      </div>
                      {/* Mem Stats */}
                      <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] text-slate-500 font-mono-tech uppercase">MEM PEAK / AVG</span>
                        <span className="font-mono text-sm font-bold text-white mt-1">
                          {Math.round(memStats.max)}% / {memStats.avg.toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-emerald-400 font-mono mt-1">VOLATILITY: {memStats.volatility.toFixed(2)}</span>
                      </div>
                      {/* DB Stats */}
                      <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] text-slate-500 font-mono-tech uppercase">DB PEAK / AVG</span>
                        <span className="font-mono text-sm font-bold text-white mt-1">
                          {Math.round(dbStats.max)} / {Math.round(dbStats.avg)}
                        </span>
                        <span className="text-[9px] text-rose-400 font-mono mt-1">VOLATILITY: {dbStats.volatility.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Sigma Anomaly Drift Table */}
                  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                      <h3 className="text-rose-400 text-xs font-bold tracking-wider uppercase font-mono-tech">
                        // Statistical Anomalies (3Σ Mathematical Drift)
                      </h3>
                      <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-mono-tech font-bold">LIVE</span>
                    </div>

                    {safeAlerts.length === 0 ? (
                      <div className="text-slate-400 text-xs italic p-4 border border-dashed border-slate-800 rounded-xl font-mono-tech text-center">
                        ✓ System stable. No 3-sigma mathematical drift detected in current window.
                      </div>
                    ) : (
                      <table className="w-full text-left font-mono-tech text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 uppercase">
                            <th className="pb-2">TIME</th>
                            <th className="pb-2">METRIC</th>
                            <th className="pb-2 text-right">VALUE</th>
                            <th className="pb-2 text-right">MEAN (μ)</th>
                            <th className="pb-2 text-right">STD (σ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeAlerts.map((alert: any, idx: number) => {
                            const parsed = parseAlertMessage(alert.message);
                            const timeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'NOW';
                            if (parsed) {
                              return (
                                <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                                  <td className="py-2.5 text-slate-400">{timeStr}</td>
                                  <td className="py-2.5 font-bold text-rose-400 uppercase">{parsed.metric}</td>
                                  <td className="py-2.5 text-right text-white font-black">{parsed.value}</td>
                                  <td className="py-2.5 text-right text-slate-300">{parsed.mean}</td>
                                  <td className="py-2.5 text-right text-slate-400">{parsed.std}</td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                                <td className="py-2.5 text-slate-400">{timeStr}</td>
                                <td className="py-2.5 font-bold text-rose-400 uppercase">{alert.metric || 'SYSTEM'}</td>
                                <td colSpan={3} className="py-2.5 text-white">{alert.message}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Predictive ML Forecasts */}
              {drawerTab === 'forecasts' && (
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <h3 className="text-cyan-400 text-xs font-bold uppercase font-mono-tech tracking-wider">
                      // Predictive ML Autoregressive Vector Forecasts
                    </h3>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-mono-tech">
                      95% CONFIDENCE INTERVAL
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-[#0b0f19] border border-slate-800 p-3 rounded-xl">
                      <span className="text-xs font-mono-tech text-slate-300 font-semibold">CPU Vector Forecast</span>
                      <div className="bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-bold px-3 py-1 rounded text-xs font-mono">
                        {predictions?.cpu_usage?.values?.[0] !== undefined ? `${predictions.cpu_usage.values[0].toFixed(1)}%` : 'STABLE NOMINAL'}
                      </div>
                    </div>
                    {predictions?.memory_usage?.values?.[0] !== undefined && (
                      <div className="flex justify-between items-center bg-[#0b0f19] border border-slate-800 p-3 rounded-xl">
                        <span className="text-xs font-mono-tech text-slate-300 font-semibold">Memory Vector Forecast</span>
                        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-bold px-3 py-1 rounded text-xs font-mono">
                          {predictions.memory_usage.values[0].toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {predictions?.db_connections?.values?.[0] !== undefined && (
                      <div className="flex justify-between items-center bg-[#0b0f19] border border-slate-800 p-3 rounded-xl">
                        <span className="text-xs font-mono-tech text-slate-300 font-semibold">Database Connection Vector Forecast</span>
                        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 font-bold px-3 py-1 rounded text-xs font-mono">
                          {predictions.db_connections.values[0].toFixed(0)} CONNS
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: RCA Risk Radar */}
              {drawerTab === 'risk' && (
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                  <h3 className="text-cyan-400 text-xs font-bold uppercase font-mono-tech tracking-wider pb-2 border-b border-slate-800">
                    // AI PROACTIVE RISK RADAR & RCA ENGINE
                  </h3>
                  
                  <div className="flex flex-col gap-4">
                    {/* DB Pool */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-mono-tech">
                        <span className="text-slate-300 font-semibold">Database Pool Load</span>
                        <span className={dbRisk > 75 ? "text-rose-400 font-bold" : dbRisk >= 50 ? "text-amber-400" : "text-emerald-400"}>
                          Risk: {dbRisk}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${dbRisk > 75 ? 'bg-rose-500' : dbRisk >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${dbRisk}%` }} />
                      </div>
                    </div>

                    {/* Heap Memory */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-mono-tech">
                        <span className="text-slate-300 font-semibold">Heap Memory Trajectory</span>
                        <span className={memRisk > 75 ? "text-rose-400 font-bold" : memRisk >= 50 ? "text-amber-400" : "text-emerald-400"}>
                          Risk: {memRisk}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${memRisk > 75 ? 'bg-rose-500' : memRisk >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${memRisk}%` }} />
                      </div>
                    </div>

                    {/* Network Saturation */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-mono-tech">
                        <span className="text-slate-300 font-semibold">Network Saturation</span>
                        <span className={netRisk > 75 ? "text-rose-400 font-bold" : netRisk >= 50 ? "text-amber-400" : "text-emerald-400"}>
                          Risk: {netRisk}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${netRisk > 75 ? 'bg-rose-500' : netRisk >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${netRisk}%` }} />
                      </div>
                    </div>

                    {/* Thread Pool */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-mono-tech">
                        <span className="text-slate-300 font-semibold">Thread Pool Utilization</span>
                        <span className={threadRisk > 75 ? "text-rose-400 font-bold" : threadRisk >= 50 ? "text-amber-400" : "text-emerald-400"}>
                          Risk: {threadRisk}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${threadRisk > 75 ? 'bg-rose-500' : threadRisk >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${threadRisk}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Terminal Console Logs */}
              {drawerTab === 'terminal' && (
                <div className="bg-black border border-slate-800 rounded-2xl flex flex-col h-[550px] text-emerald-400 font-mono text-xs overflow-hidden shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800 px-4 py-3 bg-[#0d1322]">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="font-bold text-white uppercase tracking-wider">// INCIDENT COMMAND CENTER TERMINAL</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/70 font-bold">LIVE_STREAM</span>
                  </div>
                  
                  <div ref={terminalScrollRef} className="overflow-y-auto flex-1 p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-emerald-500/20">
                    {combinedLogs.length === 0 ? (
                      <div className="text-emerald-500/50 italic py-2 font-mono">// Safe-Heal agent active. Monitoring telemetry matrices...</div>
                    ) : (
                      combinedLogs.map((log: string, idx: number) => {
                        let lineClass = "whitespace-pre-wrap py-0.5";
                        if (log.includes("[EXECUTION_SUCCESS]")) {
                          lineClass += " border-l-2 border-emerald-500/40 pl-2 bg-emerald-950/20";
                        }
                        return (
                          <div key={idx} className={lineClass}>
                            {renderLogLine(log)}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>
          </aside>
        </div>
      )}

    </main>
  );
}