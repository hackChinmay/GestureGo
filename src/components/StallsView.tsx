import React from 'react';
import { EVENT_STALLS } from '../campusData';
import { Store, Tag, Sparkles } from 'lucide-react';

export const StallsView: React.FC = () => {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#B8A0FF] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              Innovation Stalls & Exhibits
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Student makerspaces, robotics projects, and research exhibits.
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border border-[#17151B] px-2 py-0.5 rounded">
          👇 <strong>POINTING_DOWN</strong> scrolls stalls
        </div>
      </div>

      {/* Stalls Cards */}
      <div className="space-y-2.5">
        {EVENT_STALLS.map((stall, idx) => (
          <div
            key={stall.id}
            className="p-3.5 rounded-lg bg-white border-2 border-[#17151B] ink-shadow space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-black text-[#17151B]">
                {stall.name}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-[#D8FF4F] text-[#17151B] border border-[#17151B]">
                  {stall.booth}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#E9E0FF] text-[#17151B] border border-[#17151B]">
                  {stall.category}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#17151B] font-medium leading-snug">
              {stall.highlights}
            </p>

            <div className="pt-2 flex items-center justify-between text-[11px] text-[#655E68] border-t border-[#17151B]/20 font-mono">
              <span className="flex items-center gap-1 text-[#17151B] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#FF7048]" /> Live Interactive Demos
              </span>
              <span>Open 09:00 AM – 05:30 PM</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
