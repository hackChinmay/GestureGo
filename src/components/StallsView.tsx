import React from 'react';
import { EVENT_STALLS } from '../campusData';
import { Store, Tag, Sparkles } from 'lucide-react';

export const StallsView: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Event Stalls & Innovation Exhibits
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Student makerspaces, sponsor career hubs, and AI lab demonstration booths.
        </p>
      </div>

      {/* Stalls Grid */}
      <div className="space-y-3">
        {EVENT_STALLS.map((stall) => (
          <div
            key={stall.id}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2 group"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                {stall.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {stall.booth}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                  {stall.category}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {stall.highlights}
            </p>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
              <span className="flex items-center gap-1 text-teal-400 font-mono">
                <Sparkles className="w-3 h-3" /> Live Demonstrations Ongoing
              </span>
              <span>Open 09:00 AM - 05:30 PM</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
