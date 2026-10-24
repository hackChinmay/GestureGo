import React, { useState } from 'react';
import { SCHEDULE_ITEMS } from '../campusData';
import { ScheduleItem } from '../types';
import { Calendar, Clock, MapPin, User, CheckCircle2, ArrowDown } from 'lucide-react';

interface ScheduleViewProps {
  onConfirm?: (item: ScheduleItem) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ onConfirm }) => {
  const [selectedId, setSelectedId] = useState<string>(SCHEDULE_ITEMS[0].id);

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#17151B] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              Event Schedule
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Apex Tech Con 2026 Keynotes & Technical Workshops
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border border-[#17151B] px-2 py-0.5 rounded">
          👇 <strong>POINTING_DOWN</strong> scrolls schedule
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="space-y-2.5">
        {SCHEDULE_ITEMS.map((item, idx) => {
          const isSelected = item.id === selectedId;

          const statusBadge =
            item.status === 'In Progress' ? (
              <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-1.5 py-0.5 rounded border border-[#17151B]">
                Live Now
              </span>
            ) : item.status === 'Completed' ? (
              <span className="bg-[#E9E0FF] text-[#655E68] font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border border-[#17151B]">
                Finished
              </span>
            ) : (
              <span className="bg-white text-[#17151B] font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border border-[#17151B]">
                Upcoming
              </span>
            );

          return (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`p-3.5 rounded-lg border-2 border-[#17151B] transition-transform active:translate-y-0.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#FFF7E8] ink-shadow'
                  : 'bg-white hover:bg-[#FFF7E8]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs text-[#17151B] bg-white border border-[#17151B] px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3 stroke-[2.5]" />
                    {item.time}
                  </span>
                  {statusBadge}
                </div>

                <span className="text-[10px] font-mono font-bold text-[#655E68] uppercase">
                  {item.track}
                </span>
              </div>

              <h3 className="text-base font-black text-[#17151B] mt-1.5 tracking-tight">
                {item.title}
              </h3>

              {item.description && (
                <p className="text-xs text-[#655E68] mt-1 leading-snug">
                  {item.description}
                </p>
              )}

              <div className="mt-2.5 pt-2 border-t border-[#17151B]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-[#17151B] font-medium flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#655E68]" />
                    {item.speaker}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#FF7048]" />
                    {item.location}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onConfirm) onConfirm(item);
                  }}
                  className="px-2.5 py-1 rounded bg-[#D8FF4F] hover:bg-[#cbf53a] text-[#17151B] border border-[#17151B] font-black text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Register Pass</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
