import React, { useState, useEffect, useRef } from 'react';
import { SCHEDULE_ITEMS } from '../campusData';
import { ScheduleItem, EventRegistration } from '../types';
import { copyToClipboard } from '../registrationStore';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  ChevronRight,
  Ticket,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ScheduleViewProps {
  selectedId: string;
  onSelectId: (id: string) => void;
  onRegister: (item: ScheduleItem) => void;
  onViewPass: (registration: EventRegistration) => void;
  registrations: EventRegistration[];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  selectedId,
  onSelectId,
  onRegister,
  onViewPass,
  registrations,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my-passes'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Map for instant O(1) lookup of existing registration by event ID
  const registrationMap = new Map<string, EventRegistration>();
  for (const reg of registrations) {
    registrationMap.set(reg.eventId, reg);
  }

  // Ensure valid selected item or fallback to first
  const selectedIndex = SCHEDULE_ITEMS.findIndex((item) => item.id === selectedId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const currentItem = SCHEDULE_ITEMS[activeIndex] || SCHEDULE_ITEMS[0];
  const isAtEnd = activeIndex === SCHEDULE_ITEMS.length - 1;

  // Keep selection scrolled into view smoothly within the scroll container
  useEffect(() => {
    if (activeTab !== 'all') return;
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
  }, [currentItem.id, activeTab]);

  const handleCopyCode = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

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

      {/* Sub-Navigation: All Sessions vs My Passes */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg border-2 border-[#17151B] text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-[#17151B] text-white ink-shadow-sm'
              : 'bg-white text-[#17151B] hover:bg-[#FFF7E8]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>All Sessions ({SCHEDULE_ITEMS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-passes')}
          className={`px-3 py-1.5 rounded-lg border-2 border-[#17151B] text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'my-passes'
              ? 'bg-[#17151B] text-[#D8FF4F] ink-shadow-sm'
              : 'bg-white text-[#17151B] hover:bg-[#FFF7E8]'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>My Registrations</span>
          {registrations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#D8FF4F] text-[#17151B] text-[10px] font-mono font-black border border-[#17151B]">
              {registrations.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL SESSIONS */}
      {activeTab === 'all' && (
        <div className="space-y-3.5">
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
            {SCHEDULE_ITEMS.map((item) => {
              const isSelected = item.id === currentItem.id;
              const existingReg = registrationMap.get(item.id);
              const isRegistered = !!existingReg;

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
                      {isRegistered && existingReg && (
                        <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded border border-[#17151B] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          Code: {existingReg.registrationCode}
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

                    <div className="flex items-center gap-2">
                      {isRegistered && existingReg ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectId(item.id);
                            onViewPass(existingReg);
                          }}
                          className="px-2.5 py-1 rounded border-2 border-[#17151B] font-black text-xs bg-[#17151B] text-[#D8FF4F] hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>View Pass ({existingReg.registrationCode})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectId(item.id);
                            onRegister(item);
                          }}
                          className="px-2.5 py-1 rounded border border-[#17151B] font-black text-xs bg-[#D8FF4F] hover:bg-[#cbf53a] text-[#17151B] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Register Pass (👍)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MY REGISTRATIONS */}
      {activeTab === 'my-passes' && (
        <div className="space-y-3.5">
          {registrations.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#17151B]/40 rounded-xl p-8 text-center space-y-2">
              <Ticket className="w-10 h-10 mx-auto text-[#655E68]" />
              <h3 className="text-base font-black text-[#17151B] uppercase tracking-tight">
                No Passes Registered Yet
              </h3>
              <p className="text-xs text-[#655E68] max-w-md mx-auto">
                Navigate to any session on the <strong>All Sessions</strong> tab and make a{' '}
                <strong>👍 THUMBS_UP</strong> gesture or click "Register Pass" to generate your
                unique delegate pass!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#D8FF4F] text-[#17151B] border-2 border-[#17151B] font-black text-xs ink-shadow-sm cursor-pointer"
              >
                Browse All Sessions
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#655E68] font-medium">
                Showing <strong>{registrations.length}</strong> confirmed registration pass{registrations.length > 1 ? 'es' : ''} saved locally on this terminal:
              </p>

              {registrations.map((reg) => (
                <div
                  key={reg.registrationId}
                  className="bg-white border-2 border-[#17151B] rounded-lg p-4 ink-shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#17151B]/15 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm bg-[#FFF7E8] text-[#17151B] border-2 border-[#17151B] px-2 py-0.5 rounded">
                        {reg.registrationCode}
                      </span>
                      <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-1.5 py-0.5 rounded border border-[#17151B]">
                        {reg.registrationStatus}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[#655E68]">
                      Registered {new Date(reg.registeredAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-[#17151B] tracking-tight">
                      {reg.eventNameSnapshot}
                    </h4>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#655E68] mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {reg.eventTime} ({reg.eventDate})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#FF7048]" />
                        {reg.venue}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#17151B]/15">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(reg.registrationCode)}
                      className="px-2.5 py-1 rounded bg-[#FFF7E8] hover:bg-slate-100 text-[#17151B] border border-[#17151B] font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCode === reg.registrationCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewPass(reg)}
                      className="px-3 py-1 rounded bg-[#17151B] hover:bg-slate-800 text-[#D8FF4F] border border-[#17151B] font-black text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>View Pass</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
