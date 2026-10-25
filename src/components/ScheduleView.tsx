import React, { useState, useEffect, useRef } from 'react';
import { GravitasEvent, GravitasVenue, EventRegistration, ScheduleItem, KioskAction } from '../types';
import { gravitasService } from '../gravitasService';
import { VERIFIED_GRAVITAS_EVENTS, VERIFIED_VIT_VENUES } from '../gravitasData';
import { copyToClipboard } from '../registrationStore';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Ticket,
  Copy,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  Users,
  Tag,
  Info,
  X,
  Building,
} from 'lucide-react';

interface ScheduleViewProps {
  selectedId: string;
  onSelectId: (id: string) => void;
  onRegister: (item: GravitasEvent | ScheduleItem) => void;
  onViewPass: (registration: EventRegistration) => void;
  registrations: EventRegistration[];
  lastAction?: KioskAction | null;
  actionTimestamp?: number;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  selectedId,
  onSelectId,
  onRegister,
  onViewPass,
  registrations,
  lastAction,
  actionTimestamp,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my-passes'>('all');
  const [events, setEvents] = useState<GravitasEvent[]>(VERIFIED_GRAVITAS_EVENTS);
  const [venues, setVenues] = useState<GravitasVenue[]>(VERIFIED_VIT_VENUES);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Event Details Modal
  const [detailsEvent, setDetailsEvent] = useState<GravitasEvent | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch events from Supabase with offline fallback
  useEffect(() => {
    async function fetchFestivalData() {
      setLoading(true);
      const [fetchedEvents, fetchedVenues] = await Promise.all([
        gravitasService.getEvents({
          category: categoryFilter,
          date: dateFilter,
          venueId: venueFilter,
          search: searchQuery,
        }),
        gravitasService.getVenues(),
      ]);
      setEvents(fetchedEvents);
      setVenues(fetchedVenues);
      setLoading(false);
    }
    fetchFestivalData();
  }, [categoryFilter, dateFilter, venueFilter, searchQuery]);

  // Map for instant O(1) lookup of existing registration by event ID
  const registrationMap = new Map<string, EventRegistration>();
  for (const reg of registrations) {
    registrationMap.set(reg.eventId, reg);
  }

  // Ensure valid selected item or fallback to first
  const selectedIndex = events.findIndex((item) => item.id === selectedId || item.slug === selectedId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const currentItem = events[activeIndex] || events[0];
  const isAtEnd = activeIndex === events.length - 1;

  // Advance selection when SCROLL_DOWN action is received
  useEffect(() => {
    if (!lastAction || lastAction !== 'SCROLL_DOWN') return;
    if (activeTab !== 'all' || events.length === 0) return;

    const curIdx = events.findIndex(
      (item) => item.id === selectedId || item.slug === selectedId
    );
    const validIdx = curIdx >= 0 ? curIdx : 0;
    if (validIdx < events.length - 1) {
      const nextItem = events[validIdx + 1];
      onSelectId(nextItem.id);
    }
  }, [actionTimestamp, lastAction]);

  // Keep selection scrolled into view smoothly within the scroll container
  useEffect(() => {
    if (activeTab !== 'all' || !currentItem) return;
    const activeEl = itemRefs.current[currentItem.id];
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentItem?.id, activeTab]);

  const handleCopyCode = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return 'Free / Open Entry';
    return `₹${price}`;
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#17151B] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              graVITas ’26 Event Schedule
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Official technical competitions, hackathons, workshops &amp; keynote ceremonies at VIT Vellore.
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
          <span>All Events ({events.length})</span>
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
          {/* Interactive Filters Toolbar */}
          <div className="bg-[#FFF7E8] border-2 border-[#17151B] p-3 rounded-lg ink-shadow space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono font-black text-[#17151B] uppercase">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter Schedule
              </span>
              <span className="text-[10px] text-[#655E68]">
                Festival Dates: 18–20 September 2026
              </span>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#655E68]" />
                <input
                  type="text"
                  placeholder="Search event or club..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-[#17151B] rounded pl-7 pr-2 py-1.5 font-medium text-xs text-[#17151B] placeholder:text-[#655E68] focus:outline-none"
                />
              </div>

              {/* Category */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border-2 border-[#17151B] rounded p-1.5 font-bold text-xs text-[#17151B] cursor-pointer focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="hackathon">Hackathon</option>
                <option value="competition">Competition</option>
                <option value="workshop">Workshop</option>
                <option value="entrepreneurship">Entrepreneurship</option>
                <option value="other">Ceremony / Other</option>
              </select>

              {/* Date */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border-2 border-[#17151B] rounded p-1.5 font-bold text-xs text-[#17151B] cursor-pointer focus:outline-none"
              >
                <option value="all">All Festival Days</option>
                <option value="2026-09-18">Day 1 (18 Sep 2026)</option>
                <option value="2026-09-19">Day 2 (19 Sep 2026)</option>
                <option value="2026-09-20">Day 3 (20 Sep 2026)</option>
              </select>

              {/* Venue */}
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="bg-white border-2 border-[#17151B] rounded p-1.5 font-bold text-xs text-[#17151B] cursor-pointer focus:outline-none truncate"
              >
                <option value="all">All Campus Venues</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Event Status Bar */}
          {currentItem && (
            <div className="bg-[#FFF7E8] border-2 border-[#17151B] p-2.5 rounded-lg ink-shadow-sm flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded border border-[#17151B] shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#17151B] animate-pulse" />
                  Selected Event
                </span>
                <span className="font-bold text-[#17151B] truncate text-xs">
                  {currentItem.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                <span className="bg-white px-2 py-0.5 rounded border border-[#17151B] font-bold text-[#17151B]">
                  {activeIndex + 1} / {events.length}
                </span>
                {isAtEnd && (
                  <span className="bg-[#17151B] text-[#D8FF4F] px-1.5 py-0.5 rounded text-[10px] uppercase font-black">
                    End of list
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center bg-white border-2 border-[#17151B] rounded-lg">
              <div className="w-6 h-6 border-3 border-[#17151B] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono font-bold text-[#655E68] mt-2">
                Retrieving verified graVITas ’26 records...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && events.length === 0 && (
            <div className="p-8 text-center bg-white border-2 border-dashed border-[#17151B]/40 rounded-lg space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-[#655E68]" />
              <h3 className="text-sm font-black text-[#17151B] uppercase">No Matching Events Found</h3>
              <p className="text-xs text-[#655E68]">
                Adjust your search or filter options to browse other graVITas ’26 activities.
              </p>
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setDateFilter('all');
                  setVenueFilter('all');
                  setSearchQuery('');
                }}
                className="mt-2 px-3 py-1 bg-[#D8FF4F] text-[#17151B] border border-[#17151B] font-bold text-xs rounded ink-shadow-sm cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Event Items List */}
          {!loading && events.length > 0 && (
            <div className="space-y-2.5">
              {events.map((item) => {
                const isSelected = item.id === currentItem?.id;
                const existingReg = registrationMap.get(item.id);
                const isRegistered = !!existingReg;
                const venueName = item.venue?.name || 'VIT Vellore Campus';

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
                    {/* Top Row: Category, Date/Time, Cursor, Status */}
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
                          {item.start_time ? item.start_time.slice(0, 5) : '09:00'} ({item.start_date})
                        </span>

                        <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#E9E0FF] text-[#17151B] border border-[#17151B]">
                          {item.category}
                        </span>

                        {/* Historical Event Status Pill */}
                        <span className="bg-[#17151B] text-[#D8FF4F] font-mono font-black text-[9px] uppercase px-1.5 py-0.5 rounded">
                          {item.event_status === 'completed' ? 'Completed (Past Fest)' : item.event_status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRegistered && existingReg && (
                          <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[10px] uppercase px-2 py-0.5 rounded border border-[#17151B] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            Pass: {existingReg.registrationCode}
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold text-[#655E68] bg-[#FFF7E8] px-2 py-0.5 rounded border border-[#17151B]">
                          Fee: {formatPrice(item.registration_fee_inr)}
                        </span>
                      </div>
                    </div>

                    {/* Title & Short Description */}
                    <h3 className="text-base font-black text-[#17151B] mt-1.5 tracking-tight">
                      {item.name}
                    </h3>

                    <p className="text-xs text-[#655E68] mt-1 leading-snug">
                      {item.short_description || item.description}
                    </p>

                    {/* Footer Row: Organizer, Venue, Action Buttons */}
                    <div className="mt-2.5 pt-2 border-t border-[#17151B]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 text-[#17151B] font-medium flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] font-mono">
                          <Users className="w-3.5 h-3.5 text-[#655E68]" />
                          {item.organizer_name}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-[#FF7048]" />
                          <strong>{venueName}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Event Details Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsEvent(item);
                          }}
                          className="px-2.5 py-1 rounded border border-[#17151B] font-bold text-xs bg-white hover:bg-[#E9E0FF] text-[#17151B] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {/* Official Event Link */}
                        <a
                          href={item.official_event_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 rounded border border-[#17151B] font-bold text-xs bg-[#FFF7E8] hover:bg-slate-100 text-[#17151B] transition-colors flex items-center gap-1"
                          title="Official Event Page"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {/* Registration Pass Action */}
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
                            className="px-2.5 py-1 rounded border border-[#17151B] font-black text-xs bg-[#D8FF4F] hover:bg-[#cbf53a] text-[#17151B] transition-colors flex items-center gap-1 cursor-pointer ink-shadow-sm"
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
          )}
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
                Select any session on the <strong>All Events</strong> tab and perform a{' '}
                <strong>👍 THUMBS_UP</strong> gesture or click "Register Pass" to generate your
                unique delegate pass!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#D8FF4F] text-[#17151B] border-2 border-[#17151B] font-black text-xs ink-shadow-sm cursor-pointer"
              >
                Browse Festival Events
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

      {/* EVENT DETAILS MODAL */}
      {detailsEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setDetailsEvent(null)}
        >
          <div
            className="w-full max-w-xl bg-[#FFF7E8] border-3 border-[#17151B] rounded-xl ink-shadow overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#17151B] text-white p-3 sm:p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-[#D8FF4F]">
                  graVITas ’26 Verified Event
                </span>
                <h3 className="text-base font-black uppercase text-white leading-tight">
                  {detailsEvent.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailsEvent(null)}
                className="p-1 rounded text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
              {/* Event Metadata Card */}
              <div className="bg-white border-2 border-[#17151B] rounded-lg p-4 space-y-2.5 ink-shadow-sm text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#17151B]/15 pb-2">
                  <span className="font-mono font-bold bg-[#E9E0FF] px-2 py-0.5 rounded border border-[#17151B]">
                    Category: {detailsEvent.category.toUpperCase()}
                  </span>
                  <span className="font-mono font-bold bg-[#D8FF4F] px-2 py-0.5 rounded border border-[#17151B]">
                    Fee: {formatPrice(detailsEvent.registration_fee_inr)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#655E68]">
                    Organizing Club / Association
                  </span>
                  <h4 className="font-black text-sm text-[#17151B]">{detailsEvent.organizer_name}</h4>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#655E68]">
                    Full Description
                  </span>
                  <p className="text-[#17151B] mt-0.5 leading-relaxed font-medium">
                    {detailsEvent.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#17151B]/15 font-mono">
                  <div>
                    <span className="text-[10px] text-[#655E68] uppercase block">Festival Dates</span>
                    <strong>{detailsEvent.start_date} {detailsEvent.end_date ? `to ${detailsEvent.end_date}` : ''}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#655E68] uppercase block">Schedule Times</span>
                    <strong>{detailsEvent.start_time || '09:00:00'} - {detailsEvent.end_time || '18:00:00'}</strong>
                  </div>
                </div>
              </div>

              {/* Venue Details Card */}
              {detailsEvent.venue && (
                <div className="bg-[#E9E0FF] border-2 border-[#17151B] rounded-lg p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-black text-sm text-[#17151B]">
                    <MapPin className="w-4 h-4 text-[#FF7048]" />
                    <span>Venue: {detailsEvent.venue.name}</span>
                  </div>
                  <p className="font-medium text-[#17151B]">
                    Building: {detailsEvent.venue.building_name} ({detailsEvent.venue.floor || 'Ground'})
                  </p>
                  {detailsEvent.venue.directions && (
                    <p className="text-[11px] text-[#655E68] leading-snug">
                      Directions: {detailsEvent.venue.directions}
                    </p>
                  )}
                  {detailsEvent.venue.official_map_url && (
                    <a
                      href={detailsEvent.venue.official_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#17151B] font-bold underline flex items-center gap-1 text-[11px] pt-1"
                    >
                      <span>Campus Navigation Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Official Link Reference */}
              <div className="pt-1 text-center">
                <a
                  href={detailsEvent.official_event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#17151B] underline hover:text-[#FF7048]"
                >
                  <span>Open Official graVITas Portal Listing</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#FFF7E8] border-t-2 border-[#17151B] flex items-center justify-between">
              <button
                onClick={() => {
                  setDetailsEvent(null);
                  onRegister(detailsEvent);
                }}
                className="px-3 py-1.5 bg-[#D8FF4F] text-[#17151B] border-2 border-[#17151B] font-black text-xs rounded ink-shadow-sm cursor-pointer"
              >
                Register Pass (👍)
              </button>

              <button
                onClick={() => setDetailsEvent(null)}
                className="px-4 py-1.5 bg-[#17151B] text-white font-black text-xs rounded cursor-pointer border-2 border-[#17151B]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
