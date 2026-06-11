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

  useEffect(() => {
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

    ws.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting in 3s...');
      setTimeout(() => {
        // reconnect logic could go here
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [url, setLatestMetric]);
};
