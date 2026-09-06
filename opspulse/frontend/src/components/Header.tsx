'use client';

import React from 'react';
import { Radio, Bell, Settings, User } from 'lucide-react';

interface HeaderProps {
  onSimulateFailure?: () => void;
  systemStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onSimulateFailure, 
  systemStatus = 'SYS_NOMINAL' 
}) => {
  return (
    <header className="w-full bg-[#0D0C0B] border-b border-[#1E1B18] px-6 py-3.5 flex items-center justify-between selection:bg-[#E87928]/30">
      {/* Left Header Section */}
      <div className="flex items-center gap-6">
        {/* Status Pill Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#171412] border border-[#332A24] text-xs font-mono text-[#F0ECE6]">
          <span className="w-2 h-2 rounded-full bg-[#E87928] animate-status-pulse shadow-[0_0_8px_#E87928]" />
          <span className="tracking-wide">{systemStatus}</span>
        </div>

        {/* Header Tabs / Breadcrumb Navigation */}
        <nav className="flex items-center gap-5">
          <a
            href="#dashboard"
            className="text-sm font-semibold text-[#F0ECE6] border-b-2 border-[#E87928] pb-1 tracking-tight"
          >
            Dashboard
          </a>
          <a
            href="#metrics"
            className="text-sm font-medium text-[#9E948C] hover:text-[#F0ECE6] transition-colors pb-1"
          >
            Metrics
          </a>
          <a
            href="#logs"
            className="text-sm font-medium text-[#9E948C] hover:text-[#F0ECE6] transition-colors pb-1"
          >
            Logs
          </a>
          <a
            href="#traces"
            className="text-sm font-medium text-[#9E948C] hover:text-[#F0ECE6] transition-colors pb-1"
          >
            Traces
          </a>
          <div className="px-2.5 py-1 rounded-md bg-[#161412] border border-[#2D2621] text-xs font-mono text-[#9E948C]">
            Environment: Production
          </div>
        </nav>
      </div>

      {/* Right Header Section */}
      <div className="flex items-center gap-4">
        {/* Primary Action CTA Button: Simulate Failure Wave */}
        <button
          onClick={onSimulateFailure}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#221812] border border-[#59341B] hover:bg-[#2C1F16] hover:border-[#734322] text-[#FFB07C] font-mono text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
        >
          <Radio className="w-3.5 h-3.5 text-[#FFB07C]" />
          <span>Simulate Failure Wave</span>
        </button>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-[#28231F]" />

        {/* Utility Icons */}
        <button 
          className="text-[#9E948C] hover:text-[#F0ECE6] transition-colors p-1"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <button 
          className="text-[#9E948C] hover:text-[#F0ECE6] transition-colors p-1"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Avatar */}
        <div 
          className="w-7 h-7 rounded-full bg-[#241D18] border border-[#3E332A] flex items-center justify-center text-[#E87928] cursor-pointer hover:border-[#E87928] transition-colors"
          title="SRE Operator"
        >
          <User className="w-4 h-4 text-[#E87928]" />
        </div>
      </div>
    </header>
  );
};
