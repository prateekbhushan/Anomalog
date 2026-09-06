'use client';

import React from 'react';
import { 
  LayoutGrid, 
  Network, 
  Rocket, 
  AlertTriangle, 
  Zap, 
  BookOpen, 
  HelpCircle,
  Activity
} from 'lucide-react';

interface SidebarProps {
  onQuickOverride?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onQuickOverride }) => {
  return (
    <aside className="w-60 flex-shrink-0 h-full border-r border-[#28231F] bg-[#110F0D] flex flex-col justify-between p-4">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 bg-[#1C1714] border border-[#2E251E] rounded-lg flex items-center justify-center text-[#E87928] shadow-sm">
            <Activity className="w-5 h-5 text-[#E87928]" />
          </div>
          <div>
            <h1 className="text-[#F0ECE6] font-bold text-base tracking-tight leading-none">AnomaLog</h1>
            <p className="text-[#8E847C] font-mono text-[11px] mt-1 leading-none">SRE Telemetry v2.4</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-8 space-y-1.5">
          {/* Overview (Active Item) */}
          <a
            href="#overview"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#E87928] text-white font-semibold text-sm transition-colors shadow-md shadow-[#E87928]/10"
          >
            <LayoutGrid className="w-4 h-4 text-white" />
            <span>Overview</span>
          </a>

          {/* Clusters */}
          <a
            href="#clusters"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9E948C] hover:text-[#F0ECE6] hover:bg-[#191614] font-medium text-sm transition-colors"
          >
            <Network className="w-4 h-4 text-[#8E847C]" />
            <span>Clusters</span>
          </a>

          {/* Deployments */}
          <a
            href="#deployments"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9E948C] hover:text-[#F0ECE6] hover:bg-[#191614] font-medium text-sm transition-colors"
          >
            <Rocket className="w-4 h-4 text-[#8E847C]" />
            <span>Deployments</span>
          </a>

          {/* Alerts */}
          <a
            href="#alerts"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9E948C] hover:text-[#F0ECE6] hover:bg-[#191614] font-medium text-sm transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-[#8E847C]" />
            <span>Alerts</span>
          </a>

          {/* Overrides */}
          <a
            href="#overrides"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9E948C] hover:text-[#F0ECE6] hover:bg-[#191614] font-medium text-sm transition-colors"
          >
            <Zap className="w-4 h-4 text-[#8E847C]" />
            <span>Overrides</span>
          </a>
        </nav>
      </div>

      {/* Bottom Utility Drawer */}
      <div className="space-y-3 pt-6 border-t border-[#1E1B18]">
        {/* Quick Override Action Button */}
        <button
          onClick={onQuickOverride}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#1D1414] border border-[#4D2626] hover:bg-[#2A1818] hover:border-[#693030] text-[#F87171] font-mono text-xs font-semibold tracking-wide transition-all active:scale-[0.98]"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#F87171]" />
          <span>Quick Override</span>
        </button>

        {/* Docs & Help */}
        <div className="space-y-1">
          <a
            href="#docs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#9E948C] hover:text-[#F0ECE6] hover:bg-[#191614] font-medium text-sm transition-colors"
          >
            <BookOpen className="w-4 h-4 text-[#8E847C]" />
            <span>Docs</span>
          </a>

          <a
            href="#help"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#9E948C] hover:text-[#F0ECE6] hover:bg-[#191614] font-medium text-sm transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#8E847C]" />
            <span>Help</span>
          </a>
        </div>
      </div>
    </aside>
  );
};
