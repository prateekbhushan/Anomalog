'use client';
import { useEffect, useState } from 'react';
import { MetricsTicker } from '@/components/MetricsTicker';
import { RealtimeChart } from '@/components/RealtimeChart';
import { useMetricsSocket, useMetricsStore } from '@/hooks/useMetricsSocket';

export default function Home() {
  // Connect to websocket (100% Intact)
  useMetricsSocket('ws://localhost:8000/ws/metrics');
  const history = useMetricsStore(state => state.history);

  // Selector optimized to prevent new array references on every execution loop
  const alerts = useMetricsStore((state: any) => state.alerts);
  const predictions = useMetricsStore((state: any) => state.predictions);

  // Safe fallback to handle arrays cleanly during mapping loops
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safePredictions = Array.isArray(predictions) ? predictions : [];

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
    <main className="dashboard">
      <header className="header">
        <h1>AnomaLog // Predictive Telemetry</h1>
        <div className="header-uptime">
          SYS_STATUS: ACTIVE // {formatUptime(uptime)}
        </div>
      </header>

      <MetricsTicker />

      {/* Your 3 Beautiful uPlot Charts */}
      <div className="charts-grid">
        <RealtimeChart
          title="CPU Telemetry"
          dataKey="cpu_usage"
          color="#00e5ff"
          history={history}
        />
        <RealtimeChart
          title="Memory Allocation"
          dataKey="memory_usage"
          color="#00ff66"
          history={history}
        />
        <RealtimeChart
          title="Database Connection Pool"
          dataKey="db_connections"
          color="#ff0055"
          history={history}
        />
      </div>

      {/* Horizontal Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', margin: '2rem 0' }} />

      {/* 🧠 THE MAIN GOAL: REAL-TIME MATHEMATICAL ANOMALY & PREDICTION PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '0 0 20px 0' }}>

        {/* Left Box: Statistical Anomalies Detected */}
        <div style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(16px)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-red)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              // Statistical Anomalies (3σ Drift)
            </h3>
            <span style={{ fontSize: '10px', background: 'rgba(255, 0, 85, 0.15)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 0, 85, 0.3)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>LIVE_STREAM</span>
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {safeAlerts.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic', padding: '12px', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '6px', fontFamily: 'var(--font-mono)' }}>
                ✓ System stable. No 3-sigma mathematical drift detected in the current window.
              </div>
            ) : (
              safeAlerts.map((alert: any, idx: number) => (
                <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', borderLeft: '4px solid var(--accent-red)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255, 0, 85, 0.1)', borderLeftWidth: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    <span>{alert.metric?.toUpperCase()} COMPONENT</span>
                    <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just Now'}</span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Box: Predictive ML Forecasts */}
        <div style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(16px)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              // Predictive ML Forecasts (AR model)
            </h3>
            <span style={{ fontSize: '10px', background: 'rgba(0, 229, 255, 0.15)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.3)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>95%_CONFIDENCE</span>
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {safeAlerts.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic', padding: '12px', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '6px', fontFamily: 'var(--font-mono)' }}>
                ⏳ Telemetry matrices compiling... Running rolling Autoregressive forecast.
              </div>
            ) : (
              // Display rolling forecast messages dynamically from CPU prediction
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderLeft: '4px solid var(--accent-blue)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.1)', borderLeftWidth: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  <span>STATSMODELS FORECAST ENGINE</span>
                  <span>ACTIVE</span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  Projecting resource matrices 1.5 seconds into the future. Current CPU Trend: {predictions?.cpu_usage?.values?.[0] !== undefined ? `${predictions.cpu_usage.values[0].toFixed(1)}%` : 'stable'}.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}