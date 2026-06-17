/* eslint-disable @typescript-eslint/no-explicit-any */
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

    if (Array.isArray(payload)) {
      if (payload.length === 0) return {};

      const newMetrics = payload.map((p: any) => ({
        timestamp: p.timestamp,
        cpu_usage: p.cpu_usage,
        memory_usage: p.memory_usage,
        db_connections: p.db_connections,
        anomalies: p.anomalies
      }));

      const latestMetric = newMetrics[newMetrics.length - 1];

      // Gather alerts from all items in chronological order
      const allIncomingAlerts = payload.flatMap((p: any) =>
        Array.isArray(p.alerts) ? p.alerts : []
      );

      const newAlerts = [...allIncomingAlerts, ...state.alerts].slice(0, 20);
      const newHistory = [...state.history, ...newMetrics].slice(-300);

      // Find the most recent prediction payload in the batch
      let latestPredictions = {};
      for (let i = payload.length - 1; i >= 0; i--) {
        if (payload[i].predictions && Object.keys(payload[i].predictions).length > 0) {
          latestPredictions = payload[i].predictions;
          break;
        }
      }

      return {
        latestMetric,
        history: newHistory,
        alerts: newAlerts,
        predictions: Object.keys(latestPredictions).length > 0 ? latestPredictions : state.predictions
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
  const retryCountRef = useRef<number>(0);

  // Throttling logic refs
  const messageBufferRef = useRef<any[]>([]);
  const lastDispatchTimeRef = useRef<number>(0);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const flushBuffer = () => {
      if (!isMounted) return;
      if (messageBufferRef.current.length > 0) {
        const batch = [...messageBufferRef.current];
        messageBufferRef.current = [];
        setLatestMetric(batch);
        lastDispatchTimeRef.current = Date.now();
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
    };

    const connect = () => {
      if (!isMounted) return;

      console.log(`Connecting to WebSocket: ${url}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        console.log('WebSocket connection established.');
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'history') {
            // Flush any pending individual metrics first to maintain chronological order
            flushBuffer();
            setLatestMetric(data);
          } else {
            messageBufferRef.current.push(data);
            
            if (!throttleTimeoutRef.current) {
              const now = Date.now();
              const timeSinceLastDispatch = now - lastDispatchTimeRef.current;
              const delay = Math.max(0, 1000 - timeSinceLastDispatch);
              
              throttleTimeoutRef.current = setTimeout(flushBuffer, delay);
            }
          }
        } catch (e) {
          console.error("Failed to parse metric", e);
        }
      };

      ws.onclose = (event) => {
        if (!isMounted) return;
        
        const attempt = retryCountRef.current + 1;
        if (attempt <= 5) {
          retryCountRef.current = attempt;
          // strict exponential backoff (1s, 2s, 4s, 8s, 16s)
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.warn(`WebSocket disconnected. Reconnect attempt ${attempt}/5 in ${delay}ms...`, event.reason);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('WebSocket disconnected. Maximum reconnect attempts (5) reached. Stopping retries.');
        }
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
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [url, setLatestMetric]);
};
