import React from 'react';
import { KioskAction } from '../types';
import {
  Home,
  ArrowRight,
  Calendar,
  Check,
  CornerUpLeft,
  ArrowDown,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface ManualControlsProps {
  onAction: (action: KioskAction, source: 'manual') => void;
  lastAction: KioskAction | null;
}

export const ManualControls: React.FC<ManualControlsProps> = ({ onAction, lastAction }) => {
  const controls: {
    action: KioskAction;
    label: string;
    gestureLabel: string;
    icon: React.ReactNode;
    bgHover: string;
  }[] = [
    {
      action: 'HOME',
      label: 'Home',
      gestureLabel: 'Open Palm ✋',
      icon: <Home className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#D8FF4F]',
    },
    {
      action: 'NEXT_PAGE',
      label: 'Next Page',
      gestureLabel: 'Point Up ☝️',
      icon: <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#D8FF4F]',
    },
    {
      action: 'OPEN_SCHEDULE',
      label: 'Schedule',
      gestureLabel: 'Victory ✌️',
      icon: <Calendar className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#E9E0FF]',
    },
    {
      action: 'CONFIRM_OR_SELECT',
      label: 'Confirm',
      gestureLabel: 'Thumbs Up 👍',
      icon: <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#D8FF4F]',
    },
    {
      action: 'BACK',
      label: 'Back',
      gestureLabel: 'Closed Fist ✊',
      icon: <CornerUpLeft className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#E9E0FF]',
    },
    {
      action: 'SCROLL_DOWN',
      label: 'Scroll Down',
      gestureLabel: 'Point Down 👇',
      icon: <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#D8FF4F]',
    },
    {
      action: 'CANCEL',
      label: 'Close Window',
      gestureLabel: 'Thumbs Down 👎',
      icon: <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#FF7048]',
    },
    {
      action: 'OPEN_HELP',
      label: 'Help',
      gestureLabel: 'Love You 🤟',
      icon: <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />,
      bgHover: 'hover:bg-[#B8A0FF]',
    },
  ];

  return (
    <div className="bg-white border-2 border-[#17151B] p-2.5 rounded-lg ink-shadow">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#17151B]">
          Manual Fallback Navigation (Always Available)
        </span>
        {lastAction && (
          <span className="text-[11px] font-mono text-[#655E68]">
            Last Action: <strong className="text-[#17151B] bg-[#D8FF4F] px-1 py-0.5 rounded border border-[#17151B]">{lastAction}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
        {controls.map((c) => (
          <button
            key={c.action}
            onClick={() => onAction(c.action, 'manual')}
            className={`p-2 rounded border-2 border-[#17151B] bg-[#FFF7E8] ${c.bgHover} text-[#17151B] transition-transform active:translate-y-0.5 flex flex-col items-center justify-center text-center cursor-pointer`}
          >
            <div className="flex items-center gap-1 font-extrabold text-xs">
              {c.icon}
              <span className="truncate">{c.label}</span>
            </div>
            <span className="text-[10px] font-mono text-[#655E68] mt-0.5 whitespace-nowrap">
              {c.gestureLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
