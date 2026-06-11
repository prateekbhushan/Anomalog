'use client';
import React, { useEffect, useRef, memo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useMetricsStore } from '@/hooks/useMetricsSocket';

interface RealtimeChartProps {
  title: string;
  dataKey: 'cpu_usage' | 'memory_usage' | 'db_connections';
  color: string;
  history: any[];
}

const RealtimeChartComponent: React.FC<RealtimeChartProps> = ({ title, dataKey, color, history }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uplotInst = useRef<uPlot | null>(null);

  const predictions = useMetricsStore((state) => state.predictions?.[dataKey]);
  const isAnomalous = useMetricsStore((state) => state.latestMetric?.anomalies?.[dataKey] ?? false);

  useEffect(() => {
    if (!chartRef.current) return;

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        { stroke: '#94a3b8', grid: { stroke: 'rgba(255,255,255,0.05)' } },
        { stroke: '#94a3b8', grid: { stroke: 'rgba(255,255,255,0.05)' } },
      ],
      series: [
        {},
        {
          label: "Actual",
          stroke: color,
          fill: color + '10',
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
      bands: [
        {
          series: [3, 4],
          fill: color + '0F', // Shaded confidence interval band
        }
      ]
    };

    const initialData: [number[], number[], number[], number[], number[]] = [[], [], [], [], []];
    uplotInst.current = new uPlot(opts, initialData, chartRef.current);

    const handleResize = () => {
      if (uplotInst.current && chartRef.current) {
        uplotInst.current.setSize({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (uplotInst.current) {
        uplotInst.current.destroy();
      }
    };
  }, [color]);

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
  }, [history, predictions, dataKey]);

  return (
    <div className={`chart-card ${isAnomalous ? 'anomaly-glow' : ''}`}>
      <h3>{title}</h3>
      <div className="chart-wrapper" ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '200px' }} />
    </div>
  );
};

export const RealtimeChart = memo(RealtimeChartComponent);

