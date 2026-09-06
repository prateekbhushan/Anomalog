'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { KpiGrid } from '@/components/KpiCard';
import { RealtimeChart } from '@/components/RealtimeChart';
import { LiveLogStream } from '@/components/LiveLogStream';
import { useMetricsSocket, useMetricsStore } from '@/hooks/useMetricsSocket';

export default function Home() {
  // Connect to live metrics WebSocket feed
  const wsUrl = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL
    ? process.env.NEXT_PUBLIC_WS_URL
    : 'ws://127.0.0.1:8000/ws/metrics';

  useMetricsSocket(wsUrl);

  // Consume live telemetry state from Zustand store
  const latestMetric = useMetricsStore((state) => state.latestMetric);
  const history = useMetricsStore((state) => state.history);
  const actionLogs = useMetricsStore((state) => state.actionLogs || []);
  const triggerFailureWave = useMetricsStore((state) => state.triggerFailureWave);

  // Time filter state (1H, 24H, 7D)
  const [timeFilter, setTimeFilter] = useState<'1H' | '24H' | '7D'>('1H');

  // Extract live telemetry values
  const cpuVal = latestMetric?.cpu_usage !== undefined && latestMetric?.cpu_usage !== null ? latestMetric.cpu_usage : 42.8;
  const memVal = latestMetric?.memory_usage !== undefined && latestMetric?.memory_usage !== null ? latestMetric.memory_usage : 78.1;
  const dbVal = latestMetric?.db_connections !== undefined && latestMetric?.db_connections !== null ? latestMetric.db_connections : 1204;

  // Calculate dynamic system health score
  const systemHealthVal = Math.max(0, Math.min(100, Math.round(
    100 - (cpuVal * 0.35 + memVal * 0.35 + Math.min(dbVal, 1000) * 0.02) -
    ((latestMetric?.anomalies?.cpu_usage ? 12 : 0) + (latestMetric?.anomalies?.memory_usage ? 12 : 0) + (latestMetric?.anomalies?.db_connections ? 12 : 0))
  )));

  // Health Badge Text
  const healthBadgeText = systemHealthVal >= 85 ? 'OPTIMAL' : systemHealthVal >= 60 ? 'DEGRADED' : 'CRITICAL';

  // System Status Pill Text
  const systemStatusText = systemHealthVal >= 75 ? 'SYS_NOMINAL' : 'SYS_DEGRADED';

  // DB Status text indicator
  const dbStatusText = dbVal >= 700 ? 'Danger limit reached' : dbVal >= 450 ? 'High load detected' : 'Peak near limit';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0D0C0B] text-[#EDEDEC]">
      {/* 1. Sidebar (~240px width) */}
      <Sidebar onQuickOverride={triggerFailureWave} />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Header Bar */}
        <Header 
          onSimulateFailure={triggerFailureWave} 
          systemStatus={systemStatusText} 
        />

        {/* Dashboard Body Content */}
        <div className="p-6 flex flex-col gap-6 flex-1 max-w-[1700px] w-full mx-auto">
          {/* Title & Time Range Filters Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F0ECE6] tracking-tight">
                System Telemetry
              </h1>
              <p className="text-sm text-[#9E948C] mt-1 font-sans">
                Real-time anomaly detection and resource utilization.
              </p>
            </div>

            {/* Time-Range Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#161412] p-1 border border-[#28231F] rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setTimeFilter('1H')}
                className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                  timeFilter === '1H'
                    ? 'bg-[#241F1B] border border-[#3D352E] text-[#F0ECE6]'
                    : 'text-[#9E948C] hover:text-[#F0ECE6]'
                }`}
              >
                1H
              </button>
              <button
                onClick={() => setTimeFilter('24H')}
                className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                  timeFilter === '24H'
                    ? 'bg-[#241F1B] border border-[#3D352E] text-[#F0ECE6]'
                    : 'text-[#9E948C] hover:text-[#F0ECE6]'
                }`}
              >
                24H
              </button>
              <button
                onClick={() => setTimeFilter('7D')}
                className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                  timeFilter === '7D'
                    ? 'bg-[#241F1B] border border-[#3D352E] text-[#F0ECE6]'
                    : 'text-[#9E948C] hover:text-[#F0ECE6]'
                }`}
              >
                7D
              </button>
            </div>
          </div>

          {/* Top Row: KPI Cards Matrix */}
          <KpiGrid
            cpuValue={cpuVal}
            memoryValue={memVal}
            dbValue={dbVal}
            systemHealthValue={systemHealthVal}
            cpuDelta="+2.4% / hr"
            dbStatusText={dbStatusText}
            healthBadgeText={healthBadgeText}
          />

          {/* Analytics / Logs Section: 65% Chart & 35% Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
            {/* Chart Container (8 cols) */}
            <div className="lg:col-span-8 flex flex-col">
              <RealtimeChart history={history} />
            </div>

            {/* Live Log Stream (4 cols) */}
            <div className="lg:col-span-4 flex flex-col">
              <LiveLogStream logs={actionLogs} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}