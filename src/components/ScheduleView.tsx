import React, { useEffect, useRef } from 'react';
import { SCHEDULE_ITEMS } from '../campusData';
import { ScheduleItem } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ScheduleViewProps {
  selectedId: string;
  onSelectId: (id: string) => void;
  onConfirm?: (item: ScheduleItem) => void;
  registeredIds?: Set<string>;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  selectedId,
  onSelectId,
  onConfirm,
  registeredIds = new Set(),
}) => {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Ensure valid selected item or fallback to first
  const selectedIndex = SCHEDULE_ITEMS.findIndex((item) => item.id === selectedId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const currentItem = SCHEDULE_ITEMS[activeIndex] || SCHEDULE_ITEMS[0];
  const isAtEnd = activeIndex === SCHEDULE_ITEMS.length - 1;

  // Keep selection scrolled into view smoothly within the scroll container
  useEffect(() => {
    const activeEl = itemRefs.current[currentItem.id];
    if (activeEl) {
      const scrollParent = activeEl.closest('.overflow-y-auto') as HTMLElement | null;
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();

        const isFullyVisible =
          elRect.top >= parentRect.top + 16 && elRect.bottom <= parentRect.bottom - 16;

        if (!isFullyVisible) {
          if (elRect.bottom > parentRect.bottom - 16) {
            scrollParent.scrollBy({
              top: elRect.bottom - parentRect.bottom + 40,
              behavior: 'smooth',
            });
          } else if (elRect.top < parentRect.top + 16) {
            scrollParent.scrollBy({
              top: elRect.top - parentRect.top - 40,
              behavior: 'smooth',
            });
          }
        }
      } else {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentItem.id]);

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
            Apex Tech Con 2026 Keynotes, Technical Workshops & Panels
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border-2 border-[#17151B] px-2 py-0.5 rounded ink-shadow-sm flex items-center gap-1.5 flex-wrap">
          <span>👇 <strong>POINTING_DOWN</strong>: Next Event</span>
          <span className="text-[#655E68]">•</span>
          <span>👍 <strong>THUMBS_UP</strong>: Register Pass</span>
        </div>
      </div>

      {/* Selected Event Status Bar */}
      <div className="bg-[#FFF7E8] border-2 border-[#17151B] p-2.5 rounded-lg ink-shadow-sm flex items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded border border-[#17151B] shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#17151B] animate-pulse" />
            Selected Event
          </span>
          <span className="font-bold text-[#17151B] truncate text-xs">
            {currentItem.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <span className="bg-white px-2 py-0.5 rounded border border-[#17151B] font-bold text-[#17151B]">
            {activeIndex + 1} / {SCHEDULE_ITEMS.length}
          </span>
          {isAtEnd && (
            <span className="bg-[#17151B] text-[#D8FF4F] px-1.5 py-0.5 rounded text-[10px] uppercase font-black">
              End of list
            </span>
          )}
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="space-y-2.5">
        {SCHEDULE_ITEMS.map((item, idx) => {
          const isSelected = item.id === currentItem.id;
          const isRegistered = registeredIds.has(item.id);

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
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              onClick={() => onSelectId(item.id)}
              className={`p-3.5 rounded-lg border-2 border-[#17151B] transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-[#FFF7E8] border-l-[8px] border-l-[#D8FF4F] shadow-[4px_4px_0px_#17151B] ring-2 ring-[#17151B]/20'
                  : 'bg-white hover:bg-[#FFF7E8] border-l-2'
              }`}
            >
              {/* Top Row: Time, Status, Cursor Indicator, Track */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Visual Selection Cursor Badge */}
                  {isSelected && (
                    <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded border border-[#17151B] flex items-center gap-1 shadow-sm">
                      <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                      <span>CURSOR</span>
                    </span>
                  )}

                  <span className="font-mono font-black text-xs text-[#17151B] bg-white border border-[#17151B] px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3 stroke-[2.5]" />
                    {item.time}
                  </span>
                  {statusBadge}
                </div>

                <div className="flex items-center gap-2">
                  {isRegistered && (
                    <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-1.5 py-0.5 rounded border border-[#17151B] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                      Pass Registered
                    </span>
                  )}
                  <span className="text-[10px] font-mono font-bold text-[#655E68] uppercase">
                    {item.track}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-black text-[#17151B] mt-1.5 tracking-tight flex items-center gap-2">
                <span>{item.title}</span>
              </h3>

              {item.description && (
                <p className="text-xs text-[#655E68] mt-1 leading-snug">
                  {item.description}
                </p>
              )}

              {/* Footer row: speaker, location, action button */}
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectId(item.id);
                    if (onConfirm) onConfirm(item);
                  }}
                  className={`px-2.5 py-1 rounded border border-[#17151B] font-black text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                    isRegistered
                      ? 'bg-[#17151B] text-[#D8FF4F]'
                      : 'bg-[#D8FF4F] hover:bg-[#cbf53a] text-[#17151B]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isRegistered ? 'Registered (Pass Confirmed)' : 'Register Pass (👍)'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
