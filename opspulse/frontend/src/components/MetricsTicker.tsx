'use client';
import { memo } from 'react';
import { useMetricsStore } from '@/hooks/useMetricsSocket';

const MetricsTickerComponent = () => {
  const latest = useMetricsStore((state) => state.latestMetric);

  if (!latest) {
    return (
      <div style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>
        Waiting for telemetry streams...
      </div>
    );
  }

  return (
    <div className="ticker-container">
      {/* CPU Usage Card */}
      <div className={`ticker-item ${latest?.anomalies?.cpu_usage ? 'anomaly-glow' : ''}`}>
        <div className="ticker-label">CPU Usage</div>
        <div className="ticker-value">
          {latest?.cpu_usage !== undefined && latest?.cpu_usage !== null
            ? Number(latest.cpu_usage).toFixed(1)
            : "0.0"} <span className="ticker-unit">%</span>
        </div>
      </div>

      {/* Memory Allocation Card */}
      <div className={`ticker-item ${latest?.anomalies?.memory_usage ? 'anomaly-glow' : ''}`}>
        <div className="ticker-label">Memory Allocation</div>
        <div className="ticker-value">
          {latest?.memory_usage !== undefined && latest?.memory_usage !== null
            ? Number(latest.memory_usage).toFixed(1)
            : "0.0"} <span className="ticker-unit">%</span>
        </div>
      </div>

      {/* Active DB Connections Card */}
      <div className={`ticker-item ${latest?.anomalies?.db_connections ? 'anomaly-glow' : ''}`}>
        <div className="ticker-label">Active DB Connections</div>
        <div className="ticker-value">
          {latest?.db_connections !== undefined && latest?.db_connections !== null
            ? Number(latest.db_connections).toFixed(0)
            : "0"} <span className="ticker-unit">conns</span>
        </div>
      </div>
    </div>
  );
};

export const MetricsTicker = memo(MetricsTickerComponent);