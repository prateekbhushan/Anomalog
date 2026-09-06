'use client';

import React, { useEffect, useRef, memo, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { Activity } from 'lucide-react';
import { useMetricsStore } from '@/hooks/useMetricsSocket';

interface RealtimeChartProps {
  title?: string;
  dataKey?: 'cpu_usage' | 'memory_usage' | 'db_connections' | 'system_health' | 'z_score';
  history: any[];
  height?: number;
}

const RealtimeChartComponent: React.FC<RealtimeChartProps> = ({
  title = "Anomaly Score Z-Index",
  dataKey = "z_score",
  history,
  height = 360
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uplotInst = useRef<uPlot | null>(null);
  const isConnected = useMetricsStore((state) => state.isConnected);

  // Simulated fallback data generator if backend is connecting
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected && history && history.length > 0) {
      if (localHistory.length > 0) setLocalHistory([]);
      return;
    }

    // Prefill 60 seconds of realistic Z-score history
    const nowSecs = Math.floor(Date.now() / 1000);
    const initial: any[] = [];
    for (let i = 60; i >= 0; i--) {
      const t = nowSecs - i;
      const baseZ = 0.8 + 0.4 * Math.sin(t * 0.05) + 0.2 * Math.cos(t * 0.12);
      initial.push({
        timestamp: new Date(t * 1000).toISOString(),
        cpu_usage: 42.8,
        memory_usage: 78.1,
        db_connections: 1204,
        z_score: Math.max(0.2, Math.min(3.4, baseZ))
      });
    }
    setLocalHistory(initial);

    const interval = setInterval(() => {
      const nextTime = Math.floor(Date.now() / 1000);
      const baseZ = 0.8 + 0.5 * Math.sin(nextTime * 0.05) + (Math.random() - 0.5) * 0.3;
      setLocalHistory((prev) => [
        ...prev,
        {
          timestamp: new Date(nextTime * 1000).toISOString(),
          cpu_usage: 42.8,
          memory_usage: 78.1,
          db_connections: 1204,
          z_score: Math.max(0.2, Math.min(3.8, baseZ))
        }
      ].slice(-300));
    }, 1000);

    return () => clearInterval(interval);
  }, [history, isConnected]);

  const activeData = isConnected && history && history.length > 0 ? history : localHistory;

  // Setup uPlot Chart
  useEffect(() => {
    if (!chartRef.current) return;

    const initialWidth = chartRef.current.clientWidth || 600;

    // Threshold plugin to draw dashed Z=3.0 horizontal reference line
    const thresholdPlugin: uPlot.Plugin = {
      hooks: {
        draw: (u) => {
          const ctx = u.ctx;
          const yPos = u.valToPos(3.0, 'y', true);

          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#F87171'; // Red/amber threshold line
          ctx.lineWidth = 1;
          ctx.moveTo(u.bbox.left, yPos);
          ctx.lineTo(u.bbox.left + u.bbox.width, yPos);
          ctx.stroke();

          // Text label Z=3.0 on top of the dashed threshold line
          ctx.fillStyle = '#F87171';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText('Z=3.0', u.bbox.left + u.bbox.width - 8, yPos - 6);
          ctx.restore();
        }
      }
    };

    const opts: uPlot.Options = {
      width: initialWidth,
      height: height,
      plugins: [thresholdPlugin],
      scales: {
        x: { time: true },
        y: { auto: true, range: [0, 4.5] }
      },
      axes: [
        {
          stroke: '#8E847C',
          grid: { stroke: 'rgba(255, 255, 255, 0.04)', width: 1 },
          font: '10px "JetBrains Mono", monospace',
          ticks: { stroke: '#28231F' }
        },
        {
          stroke: '#8E847C',
          grid: { stroke: 'rgba(255, 255, 255, 0.04)', width: 1 },
          font: '10px "JetBrains Mono", monospace',
          ticks: { stroke: '#28231F' }
        }
      ],
      series: [
        {},
        {
          label: "Current",
          stroke: "#E87928", // Industrial Warm Amber
          width: 2,
          fill: "rgba(232, 121, 40, 0.04)"
        }
      ]
    };

    if (uplotInst.current) {
      uplotInst.current.destroy();
    }
    uplotInst.current = new uPlot(opts, [[], []], chartRef.current);

    const handleResize = () => {
      if (uplotInst.current && chartRef.current) {
        const width = chartRef.current.clientWidth;
        if (width > 0) {
          uplotInst.current.setSize({ width, height });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (uplotInst.current) {
        uplotInst.current.destroy();
        uplotInst.current = null;
      }
    };
  }, [height]);

  // Update Data Effect
  useEffect(() => {
    if (!uplotInst.current || activeData.length === 0) return;

    const xVals = activeData.map((h) => new Date(h.timestamp).getTime() / 1000);
    const yVals = activeData.map((h) => {
      if (dataKey === 'z_score') {
        if (h.z_score !== undefined) return h.z_score;
        const cpu = h.cpu_usage ?? 30;
        const mem = h.memory_usage ?? 40;
        const z = 0.8 + ((cpu - 30) / 25) + ((mem - 40) / 30);
        return Math.max(0.1, z);
      }
      return h[dataKey] ?? 0;
    });

    uplotInst.current.setData([xVals, yVals]);

    if (chartRef.current) {
      const width = chartRef.current.clientWidth;
      if (width > 0 && Math.abs((uplotInst.current as any).width - width) > 2) {
        uplotInst.current.setSize({ width, height });
      }
    }
  }, [activeData, dataKey, height]);

  return (
    <div className="bg-[#161412] border border-[#28231F] rounded-xl p-4 flex flex-col justify-between shadow-sm h-full w-full">
      {/* Header & Legend */}
      <div className="flex items-center justify-between pb-3 border-b border-[#24201D] mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#E87928]" />
          <h3 className="font-semibold text-base text-[#EDEDED] tracking-tight">{title}</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-[#9E948C]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#E87928] rounded" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-[#F87171]" />
            <span>Threshold (3.0)</span>
          </div>
        </div>
      </div>

      {/* uPlot Canvas Container */}
      <div className="w-full flex-1 min-h-[340px] relative">
        <div ref={chartRef} className="w-full h-full min-h-[340px]" />
      </div>
    </div>
  );
};

export const RealtimeChart = memo(RealtimeChartComponent);
