import React from 'react';
import { KioskAction } from '../types';
import { Home, ArrowRight, Calendar, Check, CornerUpLeft, XCircle, HelpCircle } from 'lucide-react';

interface ManualControlsProps {
  onAction: (action: KioskAction, source: 'manual') => void;
  lastAction: KioskAction | null;
}

export const ManualControls: React.FC<ManualControlsProps> = ({ onAction, lastAction }) => {
  const buttons: { action: KioskAction; label: string; gestureHint: string; icon: React.ReactNode; color: string }[] = [
    {
      action: 'GO_HOME',
      label: 'Home',
      gestureHint: 'Open Palm ✋',
      icon: <Home className="w-4 h-4" />,
      color: 'hover:border-teal-500/50 hover:bg-teal-500/10 text-teal-300',
    },
    {
      action: 'NEXT_ITEM',
      label: 'Next',
      gestureHint: 'Point Up ☝️',
      icon: <ArrowRight className="w-4 h-4" />,
      color: 'hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-300',
    },
    {
      action: 'OPEN_SCHEDULE',
      label: 'Schedule',
      gestureHint: 'Victory ✌️',
      icon: <Calendar className="w-4 h-4" />,
      color: 'hover:border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-300',
    },
    {
      action: 'CONFIRM',
      label: 'Confirm',
      gestureHint: 'Thumbs Up 👍',
      icon: <Check className="w-4 h-4" />,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300',
    },
    {
      action: 'GO_BACK',
      label: 'Back',
      gestureHint: 'Closed Fist ✊',
      icon: <CornerUpLeft className="w-4 h-4" />,
      color: 'hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-300',
    },
    {
      action: 'CANCEL',
      label: 'Cancel',
      gestureHint: 'Thumbs Down 👎',
      icon: <XCircle className="w-4 h-4" />,
      color: 'hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300',
    },
    {
      action: 'OPEN_HELP',
      label: 'Help',
      gestureHint: 'I Love You 🤟',
      icon: <HelpCircle className="w-4 h-4" />,
      color: 'hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-300',
    },
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 shadow-sm">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Manual Fallback Navigation (Always Available)
        </span>
        {lastAction && (
          <span className="text-xs text-slate-400">
            Last Executed: <strong className="text-emerald-400 font-mono">{lastAction}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {buttons.map((b) => (
          <button
            key={b.action}
            onClick={() => onAction(b.action, 'manual')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 transition-all active:scale-95 group text-slate-200 ${b.color}`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              {b.icon}
              <span>{b.label}</span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-mono mt-0.5">
              {b.gestureHint}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
