import React from 'react';
import { SCHEDULE_ITEMS } from '../campusData';
import { ScheduleItem } from '../types';
import { Calendar, Clock, MapPin, User, CheckCircle2, X, Sparkles } from 'lucide-react';

interface ScheduleViewProps {
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  confirmedModal: string | null;
  onDismissModal: () => void;
  onConfirmRegistration: (item: ScheduleItem) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  selectedIndex,
  onSelectIndex,
  confirmedModal,
  onDismissModal,
  onConfirmRegistration,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Event Schedule</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Apex Tech Con 2026 Keynotes & Technical Workshops
          </p>
        </div>

        {/* Gesture control hint badge */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            ☝️ <strong>POINTING_UP:</strong> Next Item
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            👍 <strong>THUMBS_UP:</strong> Register
          </span>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmedModal && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 shadow-lg text-emerald-200 flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white">Registration Confirmed</h4>
              <p className="text-xs text-emerald-300">{confirmedModal}</p>
              <span className="text-[11px] text-emerald-400 font-mono block">
                Gesture hint: Make 👎 THUMBS_DOWN to dismiss.
              </span>
            </div>
          </div>
          <button
            onClick={onDismissModal}
            className="p-1.5 rounded-lg hover:bg-emerald-900/50 text-emerald-400 hover:text-white"
            title="Dismiss confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Schedule Items List */}
      <div className="space-y-3">
        {SCHEDULE_ITEMS.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={item.id}
              onClick={() => onSelectIndex(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-800/90 border-teal-400 ring-2 ring-teal-400/30 shadow-lg shadow-teal-500/10'
                  : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-teal-500 text-slate-950 px-3 py-0.5 rounded-bl-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  <span>Selected</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                      item.status === 'In Progress'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                        : item.status === 'Completed'
                        ? 'bg-slate-700/50 text-slate-400 border-slate-600'
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {item.track}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-2 tracking-tight">
                {item.title}
              </h3>

              {item.description && (
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {item.speaker}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    {item.location}
                  </span>
                </div>

                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmRegistration(item);
                    }}
                    className="px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Register (Thumbs Up)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
