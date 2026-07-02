/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes */
'use client';
import { useEffect, useState } from 'react';
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

export default function Home() {
  // 🚀 FIXED: Fallback explicitly synced with backend API router endpoint path
  const wsUrl = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL
    ? process.env.NEXT_PUBLIC_WS_URL
    : 'ws://127.0.0.1:8000/ws/metrics';

  useMetricsSocket(wsUrl);
  const history = useMetricsStore(state => state.history);

  // Selector optimized to prevent new array references on every execution loop
  const alerts = useMetricsStore((state: any) => state.alerts);
  const predictions = useMetricsStore((state: any) => state.predictions);
  const latestMetric = useMetricsStore((state: any) => state.latestMetric);

  // Safe fallback to handle arrays cleanly during mapping loops
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  // Tab state routing engine
  const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'database'>('cpu');

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

  return (
    <main className="min-h-screen w-full flex flex-col bg-[#050b14] p-6 gap-6 overflow-y-auto">
      {/* Page Header */}
      <header className="flex justify-between items-center pb-4 border-b border-slate-800/60 mb-0 bg-[#111827] border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
        <h1 className="text-3xl font-extrabold tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          AnomaLog // Predictive Telemetry
        </h1>
        <div className="header-uptime bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono-tech tracking-wider">
          SYS_STATUS: ACTIVE // {formatUptime(uptime)}
        </div>
      </header>

      {/* Telemetry Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {/* CPU Usage Card */}
        <AntigravityCard
          glowColor={latestMetric?.anomalies?.cpu_usage ? 'red' : 'cyan'}
          isAnomaly={latestMetric?.anomalies?.cpu_usage}
          className="bg-[#111827] border border-slate-800 rounded-xl"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// CPU UTILIZATION</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech ${latestMetric?.anomalies?.cpu_usage ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black tracking-wider animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'}`}>
                {!latestMetric?.anomalies?.cpu_usage && '• '}
                {latestMetric?.anomalies?.cpu_usage ? 'ANOMALY_DETECTED' : 'SYS_NOMINAL'}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2 bg-gradient-to-r from-slate-900/60 via-slate-900/10 to-transparent p-2 rounded-lg w-max border-l border-slate-800/40">
              <span 
                className="text-4xl font-black text-[#00e5ff] font-mono-tech tracking-tight"
                style={{ textShadow: '0 0 10px rgba(0, 229, 255, 0.45)' }}
              >
                {latestMetric?.cpu_usage !== undefined && latestMetric?.cpu_usage !== null ? Math.round(latestMetric.cpu_usage) : '0'}
              </span>
              <span className="text-lg font-bold text-cyan-400 font-mono-tech">%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60">
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">FREQ</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">3.8 GHz</span>
            </div>
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">MODE</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">CORE_FREQ</span>
            </div>
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">STATUS</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">STABLE</span>
            </div>
          </div>
        </AntigravityCard>

        {/* Memory Allocation Card */}
        <AntigravityCard
          glowColor={latestMetric?.anomalies?.memory_usage ? 'red' : 'green'}
          isAnomaly={latestMetric?.anomalies?.memory_usage}
          className="bg-[#111827] border border-slate-800 rounded-xl"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// MEMORY ALLOCATION</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech ${latestMetric?.anomalies?.memory_usage ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black tracking-wider animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'}`}>
                {!latestMetric?.anomalies?.memory_usage && '• '}
                {latestMetric?.anomalies?.memory_usage ? 'LIMIT_WARNING' : 'SYS_NOMINAL'}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2 bg-gradient-to-r from-slate-900/60 via-slate-900/10 to-transparent p-2 rounded-lg w-max border-l border-slate-800/40">
              <span 
                className="text-4xl font-black text-white font-mono-tech tracking-tight"
                style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.45)' }}
              >
                {latestMetric?.memory_usage !== undefined && latestMetric?.memory_usage !== null ? Math.round(latestMetric.memory_usage) : '0'}
              </span>
              <span className="text-lg font-bold text-emerald-400 font-mono-tech">%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60">
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">TYPE</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">LPDDR5</span>
            </div>
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">POOL</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">RAM_POOL</span>
            </div>
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">STATUS</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">COMMITTED</span>
            </div>
          </div>
        </AntigravityCard>

        {/* Active Connections Card */}
        <AntigravityCard
          glowColor={latestMetric?.anomalies?.db_connections ? 'red' : 'rose'}
          isAnomaly={latestMetric?.anomalies?.db_connections}
          className="bg-[#111827] border border-slate-800 rounded-xl"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// ACTIVE DATABASE POOL</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-tech ${latestMetric?.anomalies?.db_connections ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black tracking-wider animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'}`}>
                {!latestMetric?.anomalies?.db_connections && '• '}
                {latestMetric?.anomalies?.db_connections ? 'SPIKE_DETECTED' : 'SYS_NOMINAL'}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2 bg-gradient-to-r from-slate-900/60 via-slate-900/10 to-transparent p-2 rounded-lg w-max border-l border-slate-800/40">
              <span 
                className="text-4xl font-black text-white font-mono-tech tracking-tight"
                style={{ textShadow: '0 0 10px rgba(244, 63, 94, 0.45)' }}
              >
                {latestMetric?.db_connections !== undefined && latestMetric?.db_connections !== null ? Math.round(latestMetric.db_connections) : '0'}
              </span>
              <span className="text-lg font-bold text-rose-400 font-mono-tech">CONNS</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60">
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">ENGINE</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">ATOMIC</span>
            </div>
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">LIMIT</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">800</span>
            </div>
            <div className="bg-[#0d1527] border border-slate-800/40 p-1.5 rounded text-center flex flex-col justify-between items-center">
              <span className="text-[9px] text-slate-400 font-mono-tech uppercase font-semibold">POOL</span>
              <span className="bg-slate-900 text-cyan-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md mt-1 inline-block font-bold">POOL_CAP</span>
            </div>
          </div>
        </AntigravityCard>
      </div>

      {/* Cyberpunk Navigation Menu Bar */}
      <nav className="bg-[#111827] border border-slate-800 rounded-xl p-1.5 flex gap-2 w-max shadow-xl">
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
    </main>
  );
}