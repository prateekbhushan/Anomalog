/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes */
'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { RealtimeChart } from '@/components/RealtimeChart';
import { useMetricsSocket, useMetricsStore } from '@/hooks/useMetricsSocket';
import { AntigravityCard } from '@/components/AntigravityCard';

const getPastTimeString = (minusSeconds: number) => {
  const t = new Date(Date.now() - minusSeconds * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
};

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
  glowColor: 'copper' | 'cyan' | 'green' | 'yellow' | 'orange' | 'red' | 'rose' | 'emerald';
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
      return { level: 'danger', colorClass: 'text-red-550', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'DANGER_CRITICAL', glowShadow: 'rgba(239, 68, 68, 0.75)' };
    }
    if (value >= 75) {
      return { level: 'critical', colorClass: 'text-orange-550', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'CRITICAL_SPIKE', glowShadow: 'rgba(249, 115, 22, 0.6)' };
    }
    if (value >= 60 || isAnomaly) {
      return { level: 'warning', colorClass: 'text-amber-500', bgClass: 'bg-amber-950/30', borderClass: 'border-amber-500/20', glowColor: 'yellow', statusText: 'WARNING_DRIFT', glowShadow: 'rgba(245, 158, 11, 0.5)' };
    }
    return { level: 'normal', colorClass: 'text-gray-300', bgClass: 'bg-[#151210]', borderClass: 'border-[#2e211b]', glowColor: 'copper', statusText: 'SYS_NOMINAL', glowShadow: 'rgba(217, 119, 6, 0.05)' };
  } else if (key === 'memory_usage') {
    if (value >= 90) {
      return { level: 'danger', colorClass: 'text-red-550', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'DANGER_LIMIT', glowShadow: 'rgba(239, 68, 68, 0.75)' };
    }
    if (value >= 75) {
      return { level: 'critical', colorClass: 'text-orange-550', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'LIMIT_WARNING', glowShadow: 'rgba(249, 115, 22, 0.6)' };
    }
    if (value >= 60 || isAnomaly) {
      return { level: 'warning', colorClass: 'text-amber-500', bgClass: 'bg-[#2b1e17]/40', borderClass: 'border-[#d97706]/20', glowColor: 'yellow', statusText: 'WARNING_DRIFT', glowShadow: 'rgba(245, 158, 11, 0.5)' };
    }
    return { level: 'normal', colorClass: 'text-gray-300', bgClass: 'bg-[#151210]', borderClass: 'border-[#2e211b]', glowColor: 'copper', statusText: 'SYS_NOMINAL', glowShadow: 'rgba(217, 119, 6, 0.05)' };
  } else {
    // db_connections
    if (value >= 650) {
      return { level: 'danger', colorClass: 'text-red-550', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'DANGER_SPIKE', glowShadow: 'rgba(239, 68, 68, 0.75)' };
    }
    if (value >= 450) {
      return { level: 'critical', colorClass: 'text-orange-550', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'POOL_WARNING', glowShadow: 'rgba(249, 115, 22, 0.6)' };
    }
    if (value >= 250 || isAnomaly) {
      return { level: 'warning', colorClass: 'text-amber-500', bgClass: 'bg-amber-950/30', borderClass: 'border-amber-500/20', glowColor: 'yellow', statusText: 'WARNING_DRIFT', glowShadow: 'rgba(245, 158, 11, 0.5)' };
    }
    return { level: 'normal', colorClass: 'text-gray-300', bgClass: 'bg-[#151210]', borderClass: 'border-[#2e211b]', glowColor: 'copper', statusText: 'SYS_NOMINAL', glowShadow: 'rgba(217, 119, 6, 0.05)' };
  }
};

const getSystemSeverity = (health: number): SeverityConfig => {
  if (health >= 85) {
    return { level: 'normal', colorClass: 'text-white', bgClass: 'bg-[#2b1e17]/85', borderClass: 'border-[#d97706]/40', glowColor: 'copper', statusText: 'OPTIMAL', glowShadow: 'rgba(217, 119, 6, 0.1)' };
  }
  if (health >= 70) {
    return { level: 'warning', colorClass: 'text-amber-400', bgClass: 'bg-amber-950/30', borderClass: 'border-amber-500/20', glowColor: 'yellow', statusText: 'DEGRADED', glowShadow: 'rgba(245, 158, 11, 0.5)' };
  }
  if (health >= 50) {
    return { level: 'critical', colorClass: 'text-orange-500', bgClass: 'bg-orange-950/40', borderClass: 'border-orange-500/30', glowColor: 'orange', statusText: 'SYS_CRITICAL', glowShadow: 'rgba(249, 115, 22, 0.6)' };
  }
  return { level: 'danger', colorClass: 'text-red-500', bgClass: 'bg-red-950/40', borderClass: 'border-red-500/30', glowColor: 'red', statusText: 'CRITICAL_FAIL', glowShadow: 'rgba(239, 68, 68, 0.75)' };
};

function renderLogLine(log: string) {
  const tsRegex = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s?[A-Z]*|\d{2}:\d{2}:\d{2})\]/;
  const tsMatch = log.match(tsRegex);
  
  let timeStr = "";
  let remainingLog = log;
  
  if (tsMatch) {
    timeStr = tsMatch[0];
    remainingLog = log.substring(timeStr.length).trim();
  } else {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    timeStr = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  }
  
  let level = "INFO";
  let levelColor = "text-[#d97706] font-bold";
  
  if (remainingLog.includes("[WARN]")) {
    level = "WARN";
    levelColor = "text-yellow-500 font-bold";
    remainingLog = remainingLog.replace("[WARN]", "").trim();
  } else if (remainingLog.includes("[ANOMALY_DETECTED]") || remainingLog.includes("[CRITICAL]") || remainingLog.includes("3σ Drift") || remainingLog.includes("Incident")) {
    level = "ANOMALY_DETECTED";
    levelColor = "text-red-500 font-bold";
    remainingLog = remainingLog.replace("[ANOMALY_DETECTED]", "").trim().replace("3σ Drift:", "").trim();
  } else if (remainingLog.includes("[INFO]")) {
    remainingLog = remainingLog.replace("[INFO]", "").trim();
  }
  
  if (remainingLog.startsWith(":")) {
    remainingLog = remainingLog.substring(1).trim();
  }
  
  return (
    <div className="flex items-start flex-wrap gap-x-1.5 font-mono text-[11px]">
      <span className="text-gray-500 select-none">{timeStr}</span>
      <span className={levelColor}>[{level}]</span>
      <span className="text-gray-300">{remainingLog}</span>
    </div>
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
  const latestMetric = useMetricsStore((state: any) => state.latestMetric);
  const triggerFailureWave = useMetricsStore((state: any) => state.triggerFailureWave);

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

  const combinedLogs = useMemo(() => {
    const formattedActionLogs = actionLogs.map((log: string) => {
      if (!log.startsWith("[")) {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}] ${log}`;
      }
      return log;
    });
    
    if (formattedActionLogs.length === 0) {
      return [
        `[${getPastTimeString(200)}] [INFO] Service mesh synchronization complete.`,
        `[${getPastTimeString(160)}] [INFO] Heartbeat received from us-east-1a.`,
        `[${getPastTimeString(110)}] [WARN] Latency spike detected on DB-read replica. (124ms)`,
        `[${getPastTimeString(90)}] [INFO] Scaling up read replicas...`,
        `[${getPastTimeString(50)}] [INFO] Container health checks passed.`
      ];
    }
    return formattedActionLogs;
  }, [actionLogs]);

  useEffect(() => {
    if (terminalScrollRef.current) {
      const container = terminalScrollRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [combinedLogs.length]);

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

  const historyWithZIndex = useMemo(() => {
    const points = history || [];
    return points.map((p, idx) => {
      if (idx < 15) {
        const baseZ = 0.5 + (p.cpu_usage % 5) * 0.1;
        return { ...p, z_index: baseZ };
      }
      const window = points.slice(idx - 15, idx + 1);
      const getStats = (key: 'cpu_usage' | 'memory_usage' | 'db_connections') => {
        const vals = window.map(w => w[key] ?? 0);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
        const std = Math.max(1.0, Math.sqrt(variance));
        return { mean, std };
      };
      
      const cpuStats = getStats('cpu_usage');
      const memStats = getStats('memory_usage');
      const dbStats = getStats('db_connections');
      
      const zCpu = Math.abs((p.cpu_usage ?? 0) - cpuStats.mean) / cpuStats.std;
      const zMem = Math.abs((p.memory_usage ?? 0) - memStats.mean) / memStats.std;
      const zDb = Math.abs((p.db_connections ?? 0) - dbStats.mean) / dbStats.std;
      
      let zIndex = Math.max(zCpu, zMem, zDb);
      if (isNaN(zIndex)) zIndex = 0.6;
      
      const hasAnomaly = p.anomalies?.cpu_usage || p.anomalies?.memory_usage || p.anomalies?.db_connections;
      if (hasAnomaly && zIndex < 3.0) {
        zIndex = 3.14 + (p.cpu_usage % 10) * 0.05;
      }
      
      return {
        ...p,
        z_index: Math.min(4.8, zIndex)
      };
    });
  }, [history]);

  return (
    <main className="min-h-screen bg-[#0c0a09] text-gray-100 flex font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-[#120f0d] border-r border-[#2e211b] flex flex-col justify-between p-6 shrink-0 h-screen sticky top-0">
        <div className="flex flex-col gap-8">
          {/* Logo & Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2e1f18] border border-[#d97706]/40 flex items-center justify-center text-[#d97706] font-bold shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider uppercase">AnomaLog</h2>
              <span className="text-[10px] text-[#ca8a04] font-mono-tech">SRE Telemetry v2.4</span>
            </div>
          </div>
          
          {/* Nav Items */}
          <nav className="flex flex-col gap-1.5">
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold bg-[#d97706] text-black transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Overview
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1a1512] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 110-4 2 2 0 010 4zM5 11a2 2 0 110-4 2 2 0 010 4zM9 21h6m-6 0a2 2 0 110-4 2 2 0 010 4zm6 0a2 2 0 110-4 2 2 0 010 4z" /></svg>
              Clusters
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1a1512] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.59 14.37a6 6 0 01-2.2 2.2m-3.95-3.95A6 6 0 007.2 14.8m3.06-8.23a10.05 10.05 0 00-2.4 2.4m8.05-8.05a10.05 10.05 0 012.4 2.4M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" /></svg>
              Deployments
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1a1512] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Alerts
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1a1512] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Overrides
            </button>
          </nav>
        </div>
        
        <div className="flex flex-col gap-6">
          <button className="flex items-center justify-center gap-2 px-4 py-3.5 border border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 text-[#f87171] rounded-xl text-xs font-bold transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Quick Override
          </button>
          
          <div className="border-t border-[#2e211b] pt-4 flex flex-col gap-2">
            <a href="#" className="flex items-center gap-3 text-xs font-semibold text-gray-400 hover:text-white px-2 py-1 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Docs
            </a>
            <a href="#" className="flex items-center gap-3 text-xs font-semibold text-gray-400 hover:text-white px-2 py-1 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Help
            </a>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="flex justify-between items-center bg-[#120f0d] border-b border-[#2e211b] px-8 py-5 shrink-0">
          <div className="flex items-center gap-6">
            {/* Status light */}
            <div className="flex items-center gap-2 bg-[#2b1e17] border border-[#d97706]/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isCpuAnomaly || isMemAnomaly || isDbAnomaly ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
              }`}></span>
              {isCpuAnomaly || isMemAnomaly || isDbAnomaly ? 'SYS_ALERT' : 'SYS_NOMINAL'}
            </div>
            
            {/* Nav tabs */}
            <nav className="flex items-center gap-6 text-sm font-semibold">
              <a href="#" className="text-white relative pb-1">
                Dashboard
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d97706]"></span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-all">Metrics</a>
              <a href="#" className="text-gray-400 hover:text-white transition-all">Logs</a>
              <a href="#" className="text-gray-400 hover:text-white transition-all">Traces</a>
            </nav>
            
            {/* Env selector */}
            <div className="text-xs bg-[#151210] border border-[#2e211b] px-3.5 py-1.5 rounded-xl text-gray-300 font-mono-tech select-none">
              Environment: Production
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Simulate failure button */}
            <button 
              onClick={() => triggerFailureWave?.()}
              className="flex items-center gap-2 border border-[#d97706]/40 bg-[#2b1e17]/80 hover:bg-[#d97706]/10 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
            >
              <svg className="w-4 h-4 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-1.414a5 5 0 010-7.07m7.07 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
              Simulate Failure Wave
            </button>
            
            {/* Header Icons */}
            <button className="text-gray-400 hover:text-white transition-all p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <button className="text-gray-400 hover:text-white transition-all p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            </button>
            
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full border border-[#ca8a04]/60 bg-[#2b1e17] flex items-center justify-center overflow-hidden">
              <svg className="w-6 h-6 text-[#ca8a04]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="p-8 flex flex-col gap-6 max-w-[1600px] w-full mx-auto flex-1 overflow-y-auto">
          {/* Title and Time-range buttons */}
          <div className="flex justify-between items-center shrink-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">System Telemetry</h1>
              <p className="text-gray-400 text-sm mt-1">Real-time anomaly detection and resource utilization.</p>
            </div>
            
            <div className="flex bg-[#120f0d] border border-[#2e211b] rounded-xl p-1 gap-1">
              <button className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-[#2b1e17] border border-[#d97706]/20">1H</button>
              <button className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-400 hover:text-white transition-all">24H</button>
              <button className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-400 hover:text-white transition-all">7D</button>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-4 gap-5 shrink-0">
            {/* CPU Card */}
            <AntigravityCard
              glowColor="copper"
              isAnomaly={isCpuAnomaly}
              severity={cpuSeverity.level}
              className="bg-[#151210] border border-[#2e211b]"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono-tech">Cluster CPU</span>
                <span className="text-gray-500">
                  <svg className="w-5 h-5 text-[#ca8a04]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path stroke="currentColor" strokeWidth="2" d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/></svg>
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{cpuVal ? cpuVal.toFixed(1) : '0.0'}</span>
                <span className="text-sm font-semibold text-gray-400">%</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-500 font-mono-tech">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                <span>+2.4% / hr</span>
              </div>
            </AntigravityCard>

            {/* Memory Card */}
            <AntigravityCard
              glowColor="copper"
              isAnomaly={isMemAnomaly}
              severity={memSeverity.level}
              className="bg-[#151210] border border-[#2e211b]"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono-tech">Memory Allocation</span>
                <span className="text-gray-500">
                  <svg className="w-5 h-5 text-[#ca8a04]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="6" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="2" y="9" width="20" height="6" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="2" y="16" width="20" height="6" rx="2" stroke="currentColor" strokeWidth="2"/><circle cx="6" cy="5" r="1" fill="currentColor"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="6" cy="19" r="1" fill="currentColor"/></svg>
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{memVal ? memVal.toFixed(1) : '0.0'}</span>
                <span className="text-sm font-semibold text-gray-400">%</span>
              </div>
              {/* Progress bar */}
              <div className="mt-4 w-full bg-[#201a17] rounded-full h-1.5 overflow-hidden border border-[#3e2c24]/30">
                <div 
                  className="h-full bg-gradient-to-r from-[#d97706] to-[#f97316] rounded-full transition-all duration-500" 
                  style={{ width: `${memVal || 0}%` }}
                />
              </div>
            </AntigravityCard>

            {/* DB Connections Card */}
            <AntigravityCard
              glowColor="copper"
              isAnomaly={isDbAnomaly}
              severity={dbSeverity.level}
              className="bg-[#151210] border border-[#2e211b]"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono-tech">Active DB Conns</span>
                <span className="text-gray-500">
                  <svg className="w-5 h-5 text-[#ca8a04]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                </span>
              </div>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{dbVal ? dbVal.toLocaleString() : '0'}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 font-mono-tech">
                <svg className="w-3.5 h-3.5 text-[#ca8a04]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                <span>Peak near limit</span>
              </div>
            </AntigravityCard>

            {/* System Health Card */}
            <AntigravityCard
              glowColor="copper"
              isAnomaly={isCpuAnomaly || isMemAnomaly || isDbAnomaly}
              severity={systemSeverity.level}
              className="bg-[#151210] border border-[#2e211b]"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono-tech">System Health</span>
                <span className="text-gray-500">
                  <svg className="w-5 h-5 text-[#ca8a04]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{systemHealthVal}%</span>
                <span className="text-[10px] px-2 py-0.5 border border-[#d97706]/40 bg-[#2b1e17] text-[#d97706] font-bold font-mono-tech rounded">OPTIMAL</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 font-mono-tech">
                AVG: {systemHealthStats.avg.toFixed(1)}% | MIN: {Math.round(systemHealthStats.min)}%
              </div>
            </AntigravityCard>
          </div>

          {/* Grid Layout for uPlot Chart and Live Logs Stream */}
          <div className="grid grid-cols-12 gap-6 items-stretch flex-1 min-h-[480px]">
            {/* Chart Area */}
            <div className="col-span-8 flex flex-col bg-[#151210] border border-[#2e211b] rounded-2xl p-6 shadow-xl relative">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ca8a04]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono-tech text-white">Anomaly Score Z-Index</h3>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-mono-tech select-none">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <span className="inline-block w-3.5 h-0.5 bg-[#e67e22]"></span>
                    Current
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <span className="inline-block w-3.5 h-0.5 border-t border-dashed border-[#fd79a8]"></span>
                    Threshold (3.0)
                  </span>
                </div>
              </div>
              
              <div className="w-full flex-1">
                <RealtimeChart
                  title=""
                  dataKey="z_index"
                  color="#e67e22"
                  history={historyWithZIndex}
                  height={380}
                  containerClassName="w-full bg-[#0c0a09] border border-[#2e211b]/80 rounded-2xl p-4 shadow-inner"
                  canvasClassName="w-full"
                />
              </div>
            </div>

            {/* Logs Area */}
            <div className="col-span-4 flex flex-col bg-[#151210] border border-[#2e211b] rounded-2xl shadow-xl overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#2e211b] px-5 py-4 bg-[#120f0d]">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ca8a04]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono-tech text-white">Live Log Stream</h3>
                </div>
                {/* Dots */}
                <div className="flex gap-1.5 select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
                </div>
              </div>
              
              {/* Terminal contents */}
              <div 
                ref={terminalScrollRef} 
                className="flex-1 overflow-y-auto p-5 bg-[#0c0a09] font-mono text-[11px] leading-relaxed space-y-2 scrollbar-thin scrollbar-thumb-amber-500/10"
              >
                {combinedLogs.length === 0 ? (
                  <div className="text-gray-500 italic">// Monitoring system telemetry...</div>
                ) : (
                  combinedLogs.map((log: string, idx: number) => {
                    const isAnomalyAlert = log.includes("[ANOMALY_DETECTED]") || log.includes("[INCIDENT_DETECTED]") || log.includes("3σ Drift:");
                    if (isAnomalyAlert) {
                      return (
                        <div key={idx} className="p-3 bg-red-950/20 border border-red-500/25 rounded-lg text-red-200 shadow-md">
                          {renderLogLine(log)}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="text-gray-300">
                        {renderLogLine(log)}
                      </div>
                    );
                  })
                )}
                
                {/* Command Line prompt */}
                <div className="flex items-center gap-1.5 text-gray-450 pt-1.5">
                  <span className="text-green-600 font-bold">root@anomalog:~#</span>
                  <span className="inline-block w-2.5 h-4 bg-[#ca8a04] animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}