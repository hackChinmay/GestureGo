import React from 'react';
import { ControllerState } from '../types';
import { PAGE_ORDER, PageId } from '../campusData';
import { Camera, CameraOff, Terminal, Video } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  controllerState: ControllerState;
  onOpenCodeExplorer: () => void;
  cameraActive: boolean;
  onToggleCamera: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  controllerState,
  onOpenCodeExplorer,
  cameraActive,
  onToggleCamera,
}) => {
  const pageIndex = PAGE_ORDER.indexOf(currentPage as PageId) + 1;
  const totalPages = PAGE_ORDER.length;

  return (
    <header className="bg-[#FFF7E8] border-b-2 border-[#17151B] sticky top-0 z-40 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark & short descriptor */}
        <div className="flex items-baseline gap-3 shrink-0">
          <span className="text-2xl font-black tracking-tight text-[#17151B] select-none">
            GestureGo
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#655E68] hidden sm:inline">
            Touchless Campus Guide
          </span>
        </div>

        {/* Zone 2: Current Page & Progress Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#17151B] text-[#D8FF4F] rounded-md font-mono text-xs font-bold ink-shadow-sm">
            <span>{String(pageIndex).padStart(2, '0')}</span>
            <span className="text-[#655E68]">/</span>
            <span>{String(totalPages).padStart(2, '0')}</span>
            <span className="ml-1 text-white uppercase">{currentPage}</span>
          </div>

          {/* Controller state indicator */}
          <div
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold border-2 border-[#17151B] ${
              controllerState === 'LOCKED_HOLD' || controllerState === 'LOCKED'
                ? 'bg-[#FF7048] text-[#17151B]'
                : controllerState === 'CANDIDATE'
                ? 'bg-[#B8A0FF] text-[#17151B]'
                : controllerState === 'EXECUTED' || controllerState === 'CONFIRMED'
                ? 'bg-[#D8FF4F] text-[#17151B]'
                : 'bg-white text-[#17151B]'
            }`}
          >
            <span className="uppercase text-[11px]">{controllerState}</span>
          </div>
        </div>

        {/* Zone 3: Camera Control & Python Inspector */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleCamera}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-transform active:translate-y-0.5 border-2 border-[#17151B] ink-shadow flex items-center gap-1.5 ${
              cameraActive
                ? 'bg-[#D8FF4F] text-[#17151B] hover:bg-[#cbf53a]'
                : 'bg-[#FF7048] text-[#17151B] hover:bg-[#ff5d31]'
            }`}
            title="Toggle camera input"
          >
            {cameraActive ? (
              <>
                <Video className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="whitespace-nowrap">Camera Active</span>
              </>
            ) : (
              <>
                <CameraOff className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="whitespace-nowrap">Start Camera</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenCodeExplorer}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-bold bg-white text-[#17151B] border-2 border-[#17151B] ink-shadow hover:bg-[#E9E0FF] transition-all flex items-center gap-1"
            title="View Python source files"
          >
            <Terminal className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Python</span>
          </button>
        </div>
      </div>
    </header>
  );
};
