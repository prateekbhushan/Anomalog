/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useRef, memo, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useMetricsStore } from '@/hooks/useMetricsSocket';

interface RealtimeChartProps {
  title: string;
  dataKey: 'cpu_usage' | 'memory_usage' | 'db_connections' | 'system_health';
  color: string;
  history: any[];
  containerClassName?: string;
  canvasClassName?: string;
  height?: number;
}

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

  const predictions = useMetricsStore((state) => state.predictions?.[dataKey as any]);
  const isAnomalous = useMetricsStore((state) => (state.latestMetric?.anomalies as any)?.[dataKey] ?? false);

  useEffect(() => {
    if (!chartRef.current) return;

    const initialWidth = chartRef.current.clientWidth || 350;

    const opts: uPlot.Options = {
      width: initialWidth,
      height: height,
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        { stroke: '#64748b', grid: { stroke: 'rgba(255,255,255,0.04)' } },
        { stroke: '#64748b', grid: { stroke: 'rgba(255,255,255,0.04)' } },
      ],
      series: [
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

    const initialData: [number[], number[], number[], number[], number[]] = [[], [], [], [], []];
    
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
              // Only call setSize if the width difference is more than 2px to prevent sub-pixel layout loops
              if (Math.abs(uWidth - width) > 2) {
                uplotInst.current.setSize({ width: Math.floor(width), height });
              }
            }
          });
        }, 50); // 50ms debounce layout boundary check
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

  useEffect(() => {
    if (!uplotInst.current || history.length === 0) return;

    const lastPoint = history[history.length - 1];
    const lastTime = new Date(lastPoint.timestamp).getTime() / 1000;
    const lastVal = lastPoint[dataKey];

    const xPast = history.map(h => new Date(h.timestamp).getTime() / 1000);
    const yPast = history.map(h => h[dataKey]);

    let xFuture: number[] = [];
    let yForecast: (number | null)[] = [];
    let yLower: (number | null)[] = [];
    let yUpper: (number | null)[] = [];

    const pred = predictions;
    if (pred && Array.isArray(pred.values) && pred.values.length > 0) {
      const steps = pred.values.length;
      xFuture = Array.from({ length: steps }, (_, i) => lastTime + 0.1 * (i + 1));
      
      yForecast = [
        ...Array(history.length - 1).fill(null),
        lastVal,
        ...pred.values
      ];
      yLower = [
        ...Array(history.length - 1).fill(null),
        lastVal,
        ...pred.lower
      ];
      yUpper = [
        ...Array(history.length - 1).fill(null),
        lastVal,
        ...pred.upper
      ];
    } else {
      yForecast = Array(history.length).fill(null);
      yLower = Array(history.length).fill(null);
      yUpper = Array(history.length).fill(null);
    }

    const xCombined = [...xPast, ...xFuture];
    const yActualPad = [...yPast, ...Array(xFuture.length).fill(null)];

    uplotInst.current.setData([xCombined, yActualPad, yForecast, yLower, yUpper]);

    // Force canvas re-render or layout recalculation if dimensions are zero or mismatch
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
  }, [history, predictions, dataKey, height]);

  return (
    <div className={`w-full ${containerClassName || 'chart-card'} ${isAnomalous ? 'anomaly-glow' : ''}`}>
      <h3 className={containerClassName ? "text-lg font-bold tracking-wider uppercase font-mono-tech mb-4 text-slate-200" : ""}>{title}</h3>
      {/* Parent container with strict CSS constraint to prevent infinite layout feedback loop */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, overflow: 'hidden' }}>
        <div 
          className={`${canvasClassName || "chart-wrapper"} bg-black`} 
          ref={chartRef} 
          style={{ width: '100%', height: '100%' }} 
        />
      </div>
    </div>
  );
};

export const RealtimeChart = memo(RealtimeChartComponent);

