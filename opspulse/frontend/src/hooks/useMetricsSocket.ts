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
  actionLogs: string[];
  isAnomalyPredicted: boolean;
  metricWindow: { cpu: number; memory: number }[];
  customLogs: string[];
  setLatestMetric: (payload: any) => void;
}

const mergeLogs = (backendLogs: string[], customLogs: string[]): string[] => {
  const allLogs = [...(backendLogs || []), ...customLogs];
  const uniqueLogs = Array.from(new Set(allLogs));
  
  const getLogTime = (log: string): number => {
    const match = log.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC\]/);
    if (match) {
      const isoStr = match[1].replace(' ', 'T') + 'Z';
      return new Date(isoStr).getTime();
    }
    return 0;
  };
  
  return uniqueLogs.sort((a, b) => getLogTime(a) - getLogTime(b));
};

export const useMetricsStore = create<MetricsStore>((set) => ({
  latestMetric: null,
  history: [],
  alerts: [],
  predictions: {},
  actionLogs: [],
  isAnomalyPredicted: false,
  metricWindow: [],
  customLogs: [],
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
      
      const newWindow = historyMetrics.slice(-5).map((h: any) => ({
        cpu: h.cpu_usage,
        memory: h.memory_usage
      }));

      let isAnomalyPredicted = state.isAnomalyPredicted;
      let customLogs = state.customLogs;

      if (newWindow.length >= 4) {
        const current = newWindow[newWindow.length - 1];
        const prev3 = newWindow[newWindow.length - 4];
        const cpuDiff = current.cpu - prev3.cpu;
        const memDiff = current.memory - prev3.memory;
        const shouldPredict = cpuDiff > 15 || memDiff > 15;

        if (shouldPredict && !state.isAnomalyPredicted) {
          isAnomalyPredicted = true;
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const ts = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
          const newLog = `[${ts}] [AI_PREDICTIVE_ENGINE]: High growth trajectory detected. Forecasting system failure condition within 15 cycles.`;
          customLogs = [...state.customLogs, newLog];
        } else if (!shouldPredict) {
          isAnomalyPredicted = false;
        }
      }

      const incomingLogs = Array.isArray(payload.action_logs) ? payload.action_logs : state.actionLogs;
      const mergedLogs = mergeLogs(incomingLogs, customLogs);

      return {
        latestMetric,
        history: historyMetrics.slice(-300),
        alerts: newAlerts,
        predictions: payload.predictions || {},
        actionLogs: mergedLogs,
        isAnomalyPredicted,
        metricWindow: newWindow,
        customLogs
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
      const allIncomingAlerts = payload.flatMap((p: any) =>
        Array.isArray(p.alerts) ? p.alerts : []
      );

      const newAlerts = [...allIncomingAlerts, ...state.alerts].slice(0, 20);
      const newHistory = [...state.history, ...newMetrics].slice(-300);

      let latestPredictions = {};
      for (let i = payload.length - 1; i >= 0; i--) {
        if (payload[i].predictions && Object.keys(payload[i].predictions).length > 0) {
          latestPredictions = payload[i].predictions;
          break;
        }
      }

      let latestActionLogs = state.actionLogs;
      for (let i = payload.length - 1; i >= 0; i--) {
        if (payload[i].action_logs) {
          latestActionLogs = payload[i].action_logs;
          break;
        }
      }

      const newWindow = [...state.metricWindow, ...newMetrics.map((h: any) => ({
        cpu: h.cpu_usage,
        memory: h.memory_usage
      }))].slice(-5);

      let isAnomalyPredicted = state.isAnomalyPredicted;
      let customLogs = state.customLogs;

      if (newWindow.length >= 4) {
        const current = newWindow[newWindow.length - 1];
        const prev3 = newWindow[newWindow.length - 4];
        const cpuDiff = current.cpu - prev3.cpu;
        const memDiff = current.memory - prev3.memory;
        const shouldPredict = cpuDiff > 15 || memDiff > 15;

        if (shouldPredict && !state.isAnomalyPredicted) {
          isAnomalyPredicted = true;
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const ts = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
          const newLog = `[${ts}] [AI_PREDICTIVE_ENGINE]: High growth trajectory detected. Forecasting system failure condition within 15 cycles.`;
          customLogs = [...state.customLogs, newLog];
        } else if (!shouldPredict) {
          isAnomalyPredicted = false;
        }
      }

      const mergedLogs = mergeLogs(latestActionLogs, customLogs);

      return {
        latestMetric,
        history: newHistory,
        alerts: newAlerts,
        predictions: Object.keys(latestPredictions).length > 0 ? latestPredictions : state.predictions,
        actionLogs: mergedLogs,
        isAnomalyPredicted,
        metricWindow: newWindow,
        customLogs
      };
    }

    const metric: Metric = {
      timestamp: payload.timestamp,
      cpu_usage: payload.cpu_usage,
      memory_usage: payload.memory_usage,
      db_connections: payload.db_connections,
      anomalies: payload.anomalies
    };

    const incomingAlerts = Array.isArray(payload.alerts) ? payload.alerts : [];
    const newAlerts = [...incomingAlerts, ...state.alerts].slice(0, 20);
    const newHistory = [...state.history, metric].slice(-300);

    const newWindow = [...state.metricWindow, { cpu: metric.cpu_usage, memory: metric.memory_usage }].slice(-5);

    let isAnomalyPredicted = state.isAnomalyPredicted;
    let customLogs = state.customLogs;

    if (newWindow.length >= 4) {
      const current = newWindow[newWindow.length - 1];
      const prev3 = newWindow[newWindow.length - 4];
      const cpuDiff = current.cpu - prev3.cpu;
      const memDiff = current.memory - prev3.memory;
      const shouldPredict = cpuDiff > 15 || memDiff > 15;

      if (shouldPredict && !state.isAnomalyPredicted) {
        isAnomalyPredicted = true;
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const ts = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
        const newLog = `[${ts}] [AI_PREDICTIVE_ENGINE]: High growth trajectory detected. Forecasting system failure condition within 15 cycles.`;
        customLogs = [...state.customLogs, newLog];
      } else if (!shouldPredict) {
        isAnomalyPredicted = false;
      }
    }

    const incomingLogs = payload.action_logs || state.actionLogs;
    const mergedLogs = mergeLogs(incomingLogs, customLogs);

    return {
      latestMetric: metric,
      history: newHistory,
      alerts: newAlerts,
      predictions: payload.predictions || {},
      actionLogs: mergedLogs,
      isAnomalyPredicted,
      metricWindow: newWindow,
      customLogs
    };
  }),
}));

export const useMetricsSocket = (url: string) => {
  const setLatestMetric = useMetricsStore((state) => state.setLatestMetric);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

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

          // Direct real-time updates without artificial throttling delays
          setLatestMetric(data);
        } catch (e) {
          console.error("Failed to parse metric", e);
        }
      };

      ws.onclose = (event) => {
        if (!isMounted) return;

        const attempt = retryCountRef.current + 1;
        if (attempt <= 5) {
          retryCountRef.current = attempt;
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
    };
  }, [url, setLatestMetric]);
};