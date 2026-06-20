/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes */
'use client';
import { useEffect, useState } from 'react';
import { RealtimeChart } from '@/components/RealtimeChart';
import { useMetricsSocket, useMetricsStore } from '@/hooks/useMetricsSocket';

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
  const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'database' | 'config'>('cpu');

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
    <main className="h-screen overflow-hidden flex flex-col bg-[#050b14] p-6 gap-6">
      {/* Page Header */}
      <header className="flex justify-between items-center pb-4 border-b border-slate-800/60 mb-0">
        <h1 className="text-3xl font-extrabold tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          AnomaLog // Predictive Telemetry
        </h1>
        <div className="header-uptime">
          SYS_STATUS: ACTIVE // {formatUptime(uptime)}
        </div>
      </header>

      {/* Cyberpunk Navigation Menu Bar */}
      <nav className="bg-[#0b132b]/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-1.5 flex gap-2 w-max shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <button
          onClick={() => setActiveTab('cpu')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'cpu'
            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // CPU Telemetry
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'memory'
            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // Memory Allocation
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'database'
            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // Database Pool
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 border ${activeTab === 'config'
            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-transparent'
            }`}
        >
          // System Config
        </button>
      </nav>

      {/* Focused Component Toggling Layer */}
      <div className="flex-1 flex flex-col min-h-[350px] w-full">
        {activeTab === 'cpu' && (
          <RealtimeChart
            title="CPU Telemetry"
            dataKey="cpu_usage"
            color="#00e5ff"
            history={history}
            containerClassName="h-[60vh] min-h-[350px] w-full bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 relative flex flex-col"
            canvasClassName="flex-1 w-full min-h-[300px]"
          />
        )}

        {activeTab === 'memory' && (
          <RealtimeChart
            title="Memory Allocation"
            dataKey="memory_usage"
            color="#00ff66"
            history={history}
            containerClassName="h-[60vh] min-h-[350px] w-full bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 relative flex flex-col"
            canvasClassName="flex-1 w-full min-h-[300px]"
          />
        )}

        {activeTab === 'database' && (
          <RealtimeChart
            title="Database Connection Pool"
            dataKey="db_connections"
            color="#ff0055"
            history={history}
            containerClassName="h-[60vh] min-h-[350px] w-full bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 relative flex flex-col"
            canvasClassName="flex-1 w-full min-h-[300px]"
          />
        )}

        {activeTab === 'config' && (
          <div className="flex-1 flex flex-col gap-6 min-h-0 w-full">
            {/* Top Row: 3 analytical telemetry monitoring cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {/* CPU Usage Card */}
              <div className={`relative overflow-hidden bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.08)] ${latestMetric?.anomalies?.cpu_usage ? 'animate-pulse border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// CPU UTILIZATION</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono-tech ${latestMetric?.anomalies?.cpu_usage ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                    {latestMetric?.anomalies?.cpu_usage ? 'ANOMALY_DETECTED' : 'SYS_NOMINAL'}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white font-mono-tech">
                    {latestMetric?.cpu_usage !== undefined && latestMetric?.cpu_usage !== null ? Math.round(latestMetric.cpu_usage) : '0'}
                  </span>
                  <span className="text-lg font-semibold text-cyan-400 font-mono-tech">%</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-mono-tech tracking-wider uppercase">
                  CORE_FREQ // STABLE // 3.8 GHz
                </div>
              </div>

              {/* Memory Allocation Card */}
              <div className={`relative overflow-hidden bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] ${latestMetric?.anomalies?.memory_usage ? 'animate-pulse border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// MEMORY ALLOCATION</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono-tech ${latestMetric?.anomalies?.memory_usage ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {latestMetric?.anomalies?.memory_usage ? 'LIMIT_WARNING' : 'SYS_NOMINAL'}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white font-mono-tech">
                    {latestMetric?.memory_usage !== undefined && latestMetric?.memory_usage !== null ? Math.round(latestMetric.memory_usage) : '0'}
                  </span>
                  <span className="text-lg font-semibold text-emerald-400 font-mono-tech">%</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-mono-tech tracking-wider uppercase">
                  RAM_POOL // COMMITTED // LPDDR5
                </div>
              </div>

              {/* Active Connections Card */}
              <div className={`relative overflow-hidden bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.08)] ${latestMetric?.anomalies?.db_connections ? 'animate-pulse border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono-tech">// ACTIVE DATABASE POOL</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono-tech ${latestMetric?.anomalies?.db_connections ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {latestMetric?.anomalies?.db_connections ? 'SPIKE_DETECTED' : 'SYS_NOMINAL'}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white font-mono-tech">
                    {latestMetric?.db_connections !== undefined && latestMetric?.db_connections !== null ? Math.round(latestMetric.db_connections) : '0'}
                  </span>
                  <span className="text-lg font-semibold text-rose-400 font-mono-tech">CONNS</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-mono-tech tracking-wider uppercase">
                  POOL_CAP // LIMIT_800 // ATOMIC
                </div>
              </div>
            </div>

            {/* Bottom Row: Predictive Analytics Panels */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full mt-2 min-h-0 flex-1">
              {/* Left Box: Statistical Anomalies Detected */}
              <div className="bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-rose-500 text-sm font-semibold tracking-wider uppercase font-mono-tech">
                    // Statistical Anomalies (3Σ Drift)
                  </h3>
                  <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-mono-tech font-bold">LIVE_STREAM</span>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                  {safeAlerts.length === 0 ? (
                    <div className="text-slate-400 text-sm italic p-4 border border-dashed border-slate-800/60 rounded-lg font-mono-tech">
                      ✓ System stable. No 3-sigma mathematical drift detected in the current window.
                    </div>
                  ) : (
                    safeAlerts.map((alert: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.01] border-l-4 border-rose-500 p-3.5 rounded border border-slate-800/60">
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono-tech">
                          <span>{alert.metric?.toUpperCase()} COMPONENT</span>
                          <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just Now'}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-white font-mono-tech">{alert.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Box: Predictive ML Forecasts */}
              <div className="bg-[#070d19] border border-slate-800/80 rounded-2xl p-6 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-cyan-500 text-sm font-semibold tracking-wider uppercase font-mono-tech">
                    // Predictive ML Forecasts (AR model)
                  </h3>
                  <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-mono-tech font-bold">95%_CONFIDENCE</span>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                  {safeAlerts.length === 0 ? (
                    <div className="text-slate-400 text-sm italic p-4 border border-dashed border-slate-800/60 rounded-lg font-mono-tech">
                      ⏳ Telemetry matrices compiling... Running rolling Autoregressive forecast.
                    </div>
                  ) : (
                    <div className="bg-white/[0.01] border-l-4 border-cyan-500 p-3.5 rounded border border-slate-800/60 flex flex-col gap-3">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono-tech">
                        <span>STATSMODELS FORECAST ENGINE</span>
                        <span>ACTIVE</span>
                      </div>
                      <p className="text-sm text-white font-mono-tech font-bold">
                        Projecting resource matrices 1.5 seconds into the future.
                      </p>
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex justify-between items-center text-xs font-mono-tech border-b border-slate-800/40 pb-1">
                          <span className="text-slate-400">CPU Usage Forecast:</span>
                          <span className="text-cyan-400 font-bold">
                            {predictions?.cpu_usage?.values?.[0] !== undefined ? `${predictions.cpu_usage.values[0].toFixed(1)}%` : 'STABLE'}
                          </span>
                        </div>
                        {predictions?.memory_usage?.values?.[0] !== undefined && (
                          <div className="flex justify-between items-center text-xs font-mono-tech border-b border-slate-800/40 pb-1">
                            <span className="text-slate-400">Memory Allocation Forecast:</span>
                            <span className="text-emerald-400 font-bold">
                              {predictions.memory_usage.values[0].toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {predictions?.db_connections?.values?.[0] !== undefined && (
                          <div className="flex justify-between items-center text-xs font-mono-tech pb-1">
                            <span className="text-slate-400">Active Pool Forecast:</span>
                            <span className="text-rose-400 font-bold">
                              {predictions.db_connections.values[0].toFixed(0)} CONNS
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}