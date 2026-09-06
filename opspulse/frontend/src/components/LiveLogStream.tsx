'use client';

import React, { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface LiveLogStreamProps {
  logs: string[];
}

export const LiveLogStream: React.FC<LiveLogStreamProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Fallback demo logs if no live logs are present yet
  const defaultLogs = [
    "[11:02:41] [INFO] Service mesh synchronization complete.",
    "[11:02:45] [INFO] Heartbeat received from us-east-1a.",
    "[11:03:12] [WARN] Latency spike detected on DB-read replica. (124ms)",
    "[11:03:15] [INFO] Scaling up read replicas...",
    "[11:04:02] [INFO] Container health checks passed.",
    "[11:05:22] [ANOMALY_DETECTED] Z-score threshold exceeded (3.14). Probable memory leak in auth-service pod.",
    "[11:05:23] [INFO] Triggering automated dump & isolate...",
    "[11:05:28] [WARN] Re-routing traffic to fallback nodes."
  ];

  const logsToRender = logs && logs.length > 0 ? logs : defaultLogs;

  const renderLogLine = (logLine: string, index: number) => {
    const isAnomalyLine = logLine.includes('[ANOMALY_DETECTED]') || logLine.includes('[CRITICAL]') || logLine.includes('[INCIDENT_DETECTED]');

    if (isAnomalyLine) {
      return (
        <div
          key={index}
          className="bg-[#35151A] border border-[#6B2129] rounded-md p-2.5 my-1.5 text-[#FFA0A0] leading-relaxed shadow-sm font-mono text-[12px]"
        >
          {parseLogText(logLine)}
        </div>
      );
    }

    return (
      <div key={index} className="py-0.5 leading-relaxed text-[#D6CEC7] font-mono text-[12px]">
        {parseLogText(logLine)}
      </div>
    );
  };

  const parseLogText = (log: string) => {
    const timestampRegex = /^(\[\d{2}:\d{2}:\d{2}\]|\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?: [A-Z]+)?\])/;
    const matchTime = log.match(timestampRegex);
    let timePart = '';
    let rest = log;

    if (matchTime) {
      timePart = matchTime[1];
      rest = log.slice(timePart.length).trim();
    }

    let tag = '';
    let tagColor = 'text-[#E87928]';

    if (rest.startsWith('[INFO]')) {
      tag = '[INFO]';
      tagColor = 'text-[#E87928] font-bold';
      rest = rest.slice('[INFO]'.length);
    } else if (rest.startsWith('[WARN]')) {
      tag = '[WARN]';
      tagColor = 'text-[#D97706] font-bold';
      rest = rest.slice('[WARN]'.length);
    } else if (rest.startsWith('[ANOMALY_DETECTED]')) {
      tag = '[ANOMALY_DETECTED]';
      tagColor = 'text-[#FFFFFF] font-bold';
      rest = rest.slice('[ANOMALY_DETECTED]'.length);
    }

    return (
      <span>
        {timePart && <span className="text-[#8E847C] mr-2">{timePart}</span>}
        {tag && <span className={`${tagColor} mr-2`}>{tag}</span>}
        <span>{rest}</span>
      </span>
    );
  };

  return (
    <div className="bg-[#161412] border border-[#28231F] rounded-xl p-4 flex flex-col h-full justify-between shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#24201D] mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#EDEDED]" />
          <h3 className="font-semibold text-base text-[#EDEDED] tracking-tight">Live Log Stream</h3>
        </div>
        {/* Window control dots */}
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3D352E]" />
          <span className="w-2 h-2 rounded-full bg-[#3D352E]" />
          <span className="w-2 h-2 rounded-full bg-[#3D352E]" />
        </div>
      </div>

      {/* Log Output Stream Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto max-h-[360px] font-mono text-[12px] space-y-1 pr-1"
      >
        {logsToRender.map((log, idx) => renderLogLine(log, idx))}
      </div>

      {/* Terminal Prompt Footer */}
      <div className="mt-4 pt-3 border-t border-[#24201D] flex items-center font-mono text-[12px] text-[#9E948C]">
        <span>root@anomalog:~# </span>
        <span className="w-2 h-4 bg-[#EDEDED] inline-block animate-blink-cursor align-middle ml-1.5" />
      </div>
    </div>
  );
};
