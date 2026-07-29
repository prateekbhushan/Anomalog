/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useRef, memo, useState, useMemo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useMetricsStore } from '@/hooks/useMetricsSocket';

interface RealtimeChartProps {
  title: string;
  dataKey: 'cpu_usage' | 'memory_usage' | 'db_connections' | 'system_health' | 'z_index';
  color: string;
  history: any[];
  containerClassName?: string;
  canvasClassName?: string;
  height?: number;
}

// Helper functions for generating realistic telemetry waves
const getCpuVal = (t: number) => {
  const base = 35;
  const wave = 12 * Math.sin(t * 0.04) + 4 * Math.cos(t * 0.09);
  const noise = (Math.sin(t * 0.7) * 3) + (Math.sin(t * 1.5) * 1.5);
  const val = base + wave + noise;
  return Math.max(10, Math.min(95, val));
};

const getMemVal = (t: number) => {
  const base = 55;
  const wave = 8 * Math.cos(t * 0.015) + 3 * Math.sin(t * 0.05);
  const noise = Math.sin(t * 0.4) * 0.8;
  const val = base + wave + noise;
  return Math.max(20, Math.min(90, val));
};

const getDbVal = (t: number) => {
  const base = 160;
  const wave = 35 * Math.sin(t * 0.025);
  const noise = Math.floor(Math.sin(t * 0.9) * 8);
  const val = base + wave + noise;
  return Math.max(10, Math.floor(val));
};

const getHealthVal = (cpu: number, mem: number, db: number) => {
  const baseHealth = 96;
  const cpuDeduction = cpu > 60 ? (cpu - 60) * 0.2 : 0;
  const memDeduction = mem > 70 ? (mem - 70) * 0.3 : 0;
  const dbDeduction = db > 220 ? (db - 220) * 0.05 : 0;
  const health = Math.round(baseHealth - cpuDeduction - memDeduction - dbDeduction);
  return Math.max(80, Math.min(100, health));
};

const RealtimeChartComponent: React.FC<RealtimeChartProps> = ({ 
  title, 
  dataKey, 
  color, 
  history, 
  containerClassName, 
  canvasClassName,
  height = 480 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uplotInst = useRef<uPlot | null>(null);
  const [resizeTrigger, setResizeTrigger] = useState(0);
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  const isConnected = useMetricsStore((state) => state.isConnected);
  const predictions = useMetricsStore((state) => state.predictions?.[dataKey as any]);
  const isAnomalous = useMetricsStore((state) => (state.latestMetric?.anomalies as any)?.[dataKey] ?? false);

  // Fallback Interval implementation
  useEffect(() => {
    // If the server is connected and provides real history, turn off the fallback generator
    if (isConnected && history && history.length > 0) {
      if (localHistory.length > 0) {
        setLocalHistory([]);
      }
      return;
    }

    // Pre-populate with 60 seconds of historical data points for smooth mounting
    const nowSecs = Math.floor(Date.now() / 1000);
    const initialHistory: any[] = [];
    const prefillCount = 60;
    for (let i = prefillCount; i >= 0; i--) {
      const t = nowSecs - i;
      const cpu = getCpuVal(t);
      const mem = getMemVal(t);
      const db = getDbVal(t);
      initialHistory.push({
        timestamp: new Date(t * 1000).toISOString(),
        cpu_usage: cpu,
        memory_usage: mem,
        db_connections: db,
        system_health: getHealthVal(cpu, mem, db),
        anomalies: {
          cpu_usage: cpu > 80,
          memory_usage: mem > 85,
          db_connections: db > 400
        }
      });
    }
    setLocalHistory(initialHistory);

    // Simulated data stream interval
    const interval = setInterval(() => {
      const nextTime = Math.floor(Date.now() / 1000);
      const cpu = getCpuVal(nextTime);
      const mem = getMemVal(nextTime);
      const db = getDbVal(nextTime);
      const newPoint = {
        timestamp: new Date(nextTime * 1000).toISOString(),
        cpu_usage: cpu,
        memory_usage: mem,
        db_connections: db,
        system_health: getHealthVal(cpu, mem, db),
        anomalies: {
          cpu_usage: cpu > 80,
          memory_usage: mem > 85,
          db_connections: db > 400
        }
      };

      setLocalHistory((prev) => [...prev, newPoint].slice(-300));
    }, 1000);

    return () => clearInterval(interval);
  }, [history, isConnected]);

  // Determine active data sources
  const dataToRender = isConnected && history && history.length > 0 ? history : localHistory;

  // Generate realistic mock predictions in fallback mode
  const mockPredictions = useMemo(() => {
    if (dataToRender.length === 0) return null;
    const lastPoint = dataToRender[dataToRender.length - 1];
    const lastVal = lastPoint[dataKey];
    
    const values: number[] = [];
    const lower: number[] = [];
    const upper: number[] = [];
    
    for (let i = 1; i <= 15; i++) {
      let trendVal = lastVal;
      if (dataKey === 'cpu_usage') {
        trendVal = lastVal * 0.9 + 30 * 0.1 + (Math.random() - 0.5) * 2;
        trendVal = Math.max(10, Math.min(95, trendVal));
      } else if (dataKey === 'memory_usage') {
        trendVal = lastVal * 0.95 + 50 * 0.05 + (Math.random() - 0.5) * 1;
        trendVal = Math.max(20, Math.min(90, trendVal));
      } else if (dataKey === 'db_connections') {
        trendVal = lastVal * 0.9 + 150 * 0.1 + (Math.random() - 0.5) * 5;
        trendVal = Math.max(10, trendVal);
      } else {
        trendVal = lastVal * 0.9 + 90 * 0.1 + (Math.random() - 0.5) * 1;
        trendVal = Math.max(80, Math.min(100, trendVal));
      }
      values.push(trendVal);
      lower.push(trendVal - (2 + i * 0.5));
      upper.push(trendVal + (2 + i * 0.5));
    }
    
    return { values, lower, upper };
  }, [dataToRender, dataKey]);

  const predictionsToRender = isConnected && history && history.length > 0 ? predictions : mockPredictions;

  const lastLocalPoint = localHistory[localHistory.length - 1];
  const isLocalAnomalous = lastLocalPoint?.anomalies?.[dataKey] ?? false;
  const isAnomalousToRender = isConnected && history && history.length > 0 ? isAnomalous : isLocalAnomalous;

  // Chart setup
  useEffect(() => {
    if (!chartRef.current) return;

    const initialWidth = chartRef.current.clientWidth || 350;

    const isZIndex = dataKey === 'z_index';
    const opts: uPlot.Options = {
      width: initialWidth,
      height: height,
      scales: {
        x: { time: true },
        y: isZIndex ? { auto: false, range: [0, 5] } : { auto: true },
      },
      axes: [
        { stroke: '#8a7465', grid: { stroke: 'rgba(138,116,101,0.08)' } },
        { stroke: '#8a7465', grid: { stroke: 'rgba(138,116,101,0.08)' } },
      ],
      series: isZIndex ? [
        {},
        {
          label: "Current",
          stroke: '#e67e22',
          width: 2,
        },
        {
          label: "Threshold (3.0)",
          stroke: '#fd79a8',
          width: 1.5,
          dash: [4, 4],
        }
      ] : [
        {},
        {
          label: "Actual",
          stroke: color,
          width: 2,
        },
        {
          label: "Forecast",
          stroke: color,
          width: 1.5,
          dash: [5, 5],
        },
        {
          label: "Lower Bound",
          stroke: "transparent",
          width: 0,
          show: false,
        },
        {
          label: "Upper Bound",
          stroke: "transparent",
          width: 0,
          show: false,
        }
      ],
      bands: []
    };

    const initialData: any = isZIndex ? [[], [], []] : [[], [], [], [], []];
    
    if (uplotInst.current) {
      uplotInst.current.destroy();
    }
    uplotInst.current = new uPlot(opts, initialData, chartRef.current);

    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: any = null;

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver((entries) => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            if (!uplotInst.current || !chartRef.current) return;
            const width = chartRef.current.clientWidth;
            if (width > 0) {
              const uWidth = (uplotInst.current as any).width;
              if (Math.abs(uWidth - width) > 2) {
                uplotInst.current.setSize({ width: Math.floor(width), height });
              }
            }
          });
        }, 50);
      });
      resizeObserver.observe(chartRef.current);
    }

    const handleResize = () => {
      if (uplotInst.current && chartRef.current) {
        const width = chartRef.current.clientWidth;
        if (width > 0) {
          const uWidth = (uplotInst.current as any).width;
          if (Math.abs(uWidth - width) > 2) {
            uplotInst.current.setSize({ width: Math.floor(width), height });
          }
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (uplotInst.current) {
        uplotInst.current.destroy();
        uplotInst.current = null;
      }
    };
  }, [color, height, resizeTrigger]);

  // Data update effect
  useEffect(() => {
    if (!uplotInst.current || dataToRender.length === 0) return;

    const lastPoint = dataToRender[dataToRender.length - 1];
    const lastTime = new Date(lastPoint.timestamp).getTime() / 1000;

    if (dataKey === 'z_index') {
      const xPast = dataToRender.map(h => new Date(h.timestamp).getTime() / 1000);
      const yPast = dataToRender.map(h => h[dataKey] ?? 0);
      const yThreshold = Array(dataToRender.length).fill(3.0);
      uplotInst.current.setData([xPast, yPast, yThreshold]);
    } else {
      const lastVal = lastPoint[dataKey];
      const xPast = dataToRender.map(h => new Date(h.timestamp).getTime() / 1000);
      const yPast = dataToRender.map(h => h[dataKey]);

      let xFuture: number[] = [];
      let yForecast: (number | null)[] = [];
      let yLower: (number | null)[] = [];
      let yUpper: (number | null)[] = [];

      const pred = predictionsToRender;
      if (pred && Array.isArray(pred.values) && pred.values.length > 0) {
        const steps = pred.values.length;
        xFuture = Array.from({ length: steps }, (_, i) => lastTime + 0.1 * (i + 1));
        
        yForecast = [
          ...Array(dataToRender.length - 1).fill(null),
          lastVal,
          ...pred.values
        ];
        yLower = [
          ...Array(dataToRender.length - 1).fill(null),
          lastVal,
          ...pred.lower
        ];
        yUpper = [
          ...Array(dataToRender.length - 1).fill(null),
          lastVal,
          ...pred.upper
        ];
      } else {
        yForecast = Array(dataToRender.length).fill(null);
        yLower = Array(dataToRender.length).fill(null);
        yUpper = Array(dataToRender.length).fill(null);
      }

      const xCombined = [...xPast, ...xFuture];
      const yActualPad = [...yPast, ...Array(xFuture.length).fill(null)];

      uplotInst.current.setData([xCombined, yActualPad, yForecast, yLower, yUpper]);
    }

    if (chartRef.current) {
      const width = chartRef.current.clientWidth;

      if (width === 0) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
        }
        setResizeTrigger(prev => prev + 1);
      } else {
        const uWidth = (uplotInst.current as any).width;
        const uHeight = (uplotInst.current as any).height;
        if (uWidth === 0 || uHeight !== height || Math.abs(uWidth - width) > 2) {
          uplotInst.current.setSize({ width, height });
        }
      }
    }
  }, [dataToRender, predictionsToRender, dataKey, height]);

  return (
    <div className={`w-full ${containerClassName || 'chart-card'} ${isAnomalousToRender ? 'anomaly-glow' : ''} min-h-[320px]`}>
      <h3 className={containerClassName ? "text-lg font-bold tracking-wider uppercase font-mono-tech mb-4 text-slate-200" : ""}>{title}</h3>
      <div 
        className="min-h-[320px] w-full" 
        style={{ position: 'relative', width: '100%', height: `${height}px`, minHeight: '320px', overflow: 'hidden' }}
      >
        <div 
          className={`${canvasClassName || "chart-wrapper"} bg-black min-h-[320px]`} 
          ref={chartRef} 
          style={{ width: '100%', height: '100%', minHeight: '320px' }} 
        />
      </div>
    </div>
  );
};

export const RealtimeChart = memo(RealtimeChartComponent);

