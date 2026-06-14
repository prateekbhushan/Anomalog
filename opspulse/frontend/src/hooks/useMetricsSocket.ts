import { useEffect, useRef } from 'react';
import { create } from 'zustand';

interface Metric {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  db_connections: number;
  anomalies?: {
    cpu_usage: boolean;
    memory_usage: boolean;
    db_connections: boolean;
  };
}

interface MetricsStore {
  latestMetric: Metric | null;
  history: Metric[];
  alerts: any[];
  predictions: any;
  setLatestMetric: (payload: any) => void;
}

export const useMetricsStore = create<MetricsStore>((set) => ({
  latestMetric: null,
  history: [],
  alerts: [],
  predictions: {},
  setLatestMetric: (payload) => set((state) => {
    if (payload.type === 'history' && Array.isArray(payload.data)) {
      const historyMetrics = payload.data.map((p: any) => ({
        timestamp: p.timestamp,
        cpu_usage: p.cpu_usage,
        memory_usage: p.memory_usage,
        db_connections: p.db_connections,
        anomalies: p.anomalies
      }));
      const latestMetric = historyMetrics[historyMetrics.length - 1] || null;
      const incomingAlerts = Array.isArray(payload.alerts) ? payload.alerts : [];
      const newAlerts = [...incomingAlerts, ...state.alerts].slice(0, 20);
      return {
        latestMetric,
        history: historyMetrics.slice(-300),
        alerts: newAlerts,
        predictions: payload.predictions || {}
      };
    }

    const metric: Metric = {
      timestamp: payload.timestamp,
      cpu_usage: payload.cpu_usage,
      memory_usage: payload.memory_usage,
      db_connections: payload.db_connections,
      anomalies: payload.anomalies
    };

    // Prepend new alerts and keep last 20
    const incomingAlerts = Array.isArray(payload.alerts) ? payload.alerts : [];
    const newAlerts = [...incomingAlerts, ...state.alerts].slice(0, 20);

    const newHistory = [...state.history, metric].slice(-300); // Keep last 300 points
    return { 
      latestMetric: metric, 
      history: newHistory,
      alerts: newAlerts,
      predictions: payload.predictions || {}
    };
  }),
}));


export const useMetricsSocket = (url: string) => {
  const setLatestMetric = useMetricsStore((state) => state.setLatestMetric);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      console.log(`Connecting to WebSocket: ${url}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatestMetric(data);
        } catch (e) {
          console.error("Failed to parse metric", e);
        }
      };

      ws.onclose = (event) => {
        if (!isMounted) return;
        console.log('WebSocket disconnected. Reconnecting in 3s...', event.reason);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url, setLatestMetric]);
};
