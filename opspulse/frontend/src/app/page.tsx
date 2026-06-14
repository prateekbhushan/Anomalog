'use client';
import { useEffect, useState } from 'react';
import { MetricsTicker } from '@/components/MetricsTicker';
import { RealtimeChart } from '@/components/RealtimeChart';
import { useMetricsSocket, useMetricsStore } from '@/hooks/useMetricsSocket';

export default function Home() {
  // Connect to WebSocket using environment variable or explicit 127.0.0.1 fallback
  const wsUrl = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL
    ? process.env.NEXT_PUBLIC_WS_URL
    : 'ws://127.0.0.1:8000/ws';
  useMetricsSocket(wsUrl);
  const history = useMetricsStore(state => state.history);

  // Selector optimized to prevent new array references on every execution loop
  const alerts = useMetricsStore((state: any) => state.alerts);
  const predictions = useMetricsStore((state: any) => state.predictions);

  // Safe fallback to handle arrays cleanly during mapping loops
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safePredictions = Array.isArray(predictions) ? predictions : [];

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
    <main className="dashboard flex flex-col min-h-screen p-8 bg-[#060913]">
      <header className="header flex justify-between items-center mb-6 pb-4 border-b border-white/5">
        <h1 className="text-3xl font-extrabold tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          AnomaLog // Predictive Telemetry
        </h1>
        <div className="header-uptime">
          SYS_STATUS: ACTIVE // {formatUptime(uptime)}
        </div>
      </header>

      {/* Cyberpunk Navigation Menu Bar */}
      <nav className="flex gap-4 p-1.5 mb-8 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl max-w-fit shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <button
          onClick={() => setActiveTab('cpu')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-300 ${
            activeTab === 'cpu'
              ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/45 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
          }`}
        >
          // CPU Telemetry
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-300 ${
            activeTab === 'memory'
              ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-500/45 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
          }`}
        >
          // Memory Allocation
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-300 ${
            activeTab === 'database'
              ? 'text-rose-400 bg-rose-950/20 border border-rose-500/45 shadow-[0_0_15px_rgba(244,63,94,0.15)] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
          }`}
        >
          // Database Pool
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-300 ${
            activeTab === 'config'
              ? 'text-indigo-400 bg-indigo-950/20 border border-indigo-500/45 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
          }`}
        >
          // System Config
        </button>
      </nav>

      {/* Focused Component Toggling Layer */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'cpu' && (
          <div className="w-full h-[55vh] min-h-[500px]">
            <RealtimeChart
              title="CPU Telemetry"
              dataKey="cpu_usage"
              color="#00e5ff"
              history={history}
            />
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="w-full h-[55vh] min-h-[500px]">
            <RealtimeChart
              title="Memory Allocation"
              dataKey="memory_usage"
              color="#00ff66"
              history={history}
            />
          </div>
        )}

        {activeTab === 'database' && (
          <div className="w-full h-[55vh] min-h-[500px]">
            <RealtimeChart
              title="Database Connection Pool"
              dataKey="db_connections"
              color="#ff0055"
              history={history}
            />
          </div>
        )}

        {activeTab === 'config' && (
          <div className="flex flex-col gap-8 w-full">
            {/* Top Row: Quick-glance metrics */}
            <MetricsTicker />

            {/* Bottom Row: Predictive Analytics Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Left Box: Statistical Anomalies Detected */}
              <div className="bg-[#0b0f19]/65 backdrop-blur-md rounded-xl p-6 border border-white/5 shadow-lg flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-rose-500 text-sm font-semibold tracking-wider uppercase font-mono-tech">
                    // Statistical Anomalies (3σ Drift)
                  </h3>
                  <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-mono-tech font-bold">LIVE_STREAM</span>
                </div>

                <div className="max-h-[220px] overflow-y-auto flex flex-col gap-3 pr-1">
                  {safeAlerts.length === 0 ? (
                    <div className="text-slate-400 text-sm italic p-4 border border-dashed border-white/10 rounded-lg font-mono-tech">
                      ✓ System stable. No 3-sigma mathematical drift detected in the current window.
                    </div>
                  ) : (
                    safeAlerts.map((alert: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.01] border-l-4 border-rose-500 p-3.5 rounded border border-white/5">
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
              <div className="bg-[#0b0f19]/65 backdrop-blur-md rounded-xl p-6 border border-white/5 shadow-lg flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-cyan-500 text-sm font-semibold tracking-wider uppercase font-mono-tech">
                    // Predictive ML Forecasts (AR model)
                  </h3>
                  <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-mono-tech font-bold">95%_CONFIDENCE</span>
                </div>

                <div className="max-h-[220px] overflow-y-auto flex flex-col gap-3 pr-1">
                  {safeAlerts.length === 0 ? (
                    <div className="text-slate-400 text-sm italic p-4 border border-dashed border-white/10 rounded-lg font-mono-tech">
                      ⏳ Telemetry matrices compiling... Running rolling Autoregressive forecast.
                    </div>
                  ) : (
                    <div className="bg-white/[0.01] border-l-4 border-cyan-500 p-3.5 rounded border border-white/5">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono-tech">
                        <span>STATSMODELS FORECAST ENGINE</span>
                        <span>ACTIVE</span>
                      </div>
                      <p className="mt-1.5 text-sm text-white font-mono-tech">
                        Projecting resource matrices 1.5 seconds into the future. Current CPU Trend: {predictions?.cpu_usage?.values?.[0] !== undefined ? `${predictions.cpu_usage.values[0].toFixed(1)}%` : 'stable'}.
                      </p>
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