import React, { useState, useEffect } from 'react';
import { ControllerState } from '../types';
import { EVENT_INFO } from '../campusData';
import { ShieldCheck, Clock, Terminal, Camera, Hand } from 'lucide-react';

interface NavbarProps {
  controllerState: ControllerState;
  onOpenCodeExplorer: () => void;
  cameraActive: boolean;
  onToggleCamera: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  controllerState,
  onOpenCodeExplorer,
  cameraActive,
  onToggleCamera,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const stateBadgeConfig: Record<ControllerState, { bg: string; text: string; label: string; desc: string }> = {
    IDLE: {
      bg: 'bg-slate-700/80 border-slate-600',
      text: 'text-slate-200',
      label: 'IDLE',
      desc: 'Awaiting gesture',
    },
    CANDIDATE: {
      bg: 'bg-amber-500/20 border-amber-500',
      text: 'text-amber-400',
      label: 'CANDIDATE',
      desc: 'Stabilizing pose...',
    },
    CONFIRMED: {
      bg: 'bg-emerald-500/20 border-emerald-500',
      text: 'text-emerald-400',
      label: 'CONFIRMED',
      desc: 'Action triggered once',
    },
    LOCKED: {
      bg: 'bg-rose-500/20 border-rose-500',
      text: 'text-rose-400',
      label: 'LOCKED',
      desc: 'Hold blocked (release to re-arm)',
    },
    REARMED: {
      bg: 'bg-cyan-500/20 border-cyan-500',
      text: 'text-cyan-400',
      label: 'REARMED',
      desc: 'Ready for next input',
    },
  };

  const badge = stateBadgeConfig[controllerState] || stateBadgeConfig.IDLE;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Event Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20 ring-2 ring-teal-400/30">
            <Hand className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">GestureGo</span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                Touchless AI Kiosk
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-md">
              {EVENT_INFO.name}
            </p>
          </div>
        </div>

        {/* Center & Right Telemetry and Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Controller State Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${badge.bg} ${badge.text}`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  controllerState === 'CONFIRMED'
                    ? 'bg-emerald-400'
                    : controllerState === 'LOCKED'
                    ? 'bg-rose-400'
                    : 'bg-cyan-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  controllerState === 'CONFIRMED'
                    ? 'bg-emerald-500'
                    : controllerState === 'LOCKED'
                    ? 'bg-rose-500'
                    : 'bg-cyan-500'
                }`}
              ></span>
            </span>
            <span className="font-mono uppercase">{badge.label}</span>
            <span className="text-[11px] opacity-80 hidden md:inline">({badge.desc})</span>
          </div>

          {/* Privacy badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Local CV Processing</span>
          </div>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeStr}</span>
          </div>

          {/* Camera Toggle Button */}
          <button
            onClick={onToggleCamera}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              cameraActive
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle webcam sensor feed"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{cameraActive ? 'Camera ON' : 'Start Camera'}</span>
          </button>

          {/* Python Code Explorer Button */}
          <button
            onClick={onOpenCodeExplorer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-900/60 to-slate-800 border border-indigo-500/40 text-indigo-300 hover:text-white hover:border-indigo-400 transition-all shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Python Files</span>
          </button>
        </div>
      </div>
    </header>
  );
};
