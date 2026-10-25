import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GestureClass, KioskAction, ControllerTelemetry, ScheduleItem, EventRegistration } from './types';
import { GestureControllerTS } from './gestureController';
import {
  GESTURE_DEFINITIONS,
  PAGE_ORDER,
  PageId,
  getNextPage,
  getPrevPage,
} from './campusData';
import { VERIFIED_GRAVITAS_EVENTS } from './gravitasData';
import { loadRegistrations, createOrGetRegistration, cancelRegistration } from './registrationStore';
import { gravitasService } from './gravitasService';
import { Navbar } from './components/Navbar';
import { ManualControls } from './components/ManualControls';
import { CameraSensor } from './components/CameraSensor';
import { HomeView } from './components/HomeView';
import { ScheduleView } from './components/ScheduleView';
import { VenuesView } from './components/VenuesView';
import { GalleryView } from './components/GalleryView';
import { StallsView } from './components/StallsView';
import { ContactsView } from './components/ContactsView';
import { HelpView } from './components/HelpView';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { CodeExplorerModal } from './components/CodeExplorerModal';
import { RegistrationPassModal } from './components/RegistrationPassModal';
import {
  Home,
  Calendar,
  MapPin,
  Camera,
  Store,
  Phone,
  HelpCircle,
  BarChart2,
  CheckCircle2,
  X,
  ArrowDown,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Shared State Machine Controller
  const controller = useMemo(
    () => new GestureControllerTS(0.80, 0.35, 7, 0.30, 3),
    []
  );

  // Navigation and active page state
  const [currentPage, setCurrentPage] = useState<PageId>('Home');
  const [navHistory, setNavHistory] = useState<PageId[]>(['Home']);
  const [confirmedModal, setConfirmedModal] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [codeExplorerOpen, setCodeExplorerOpen] = useState<boolean>(false);

  // Synchronized Schedule Selection & Registration State
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    () => VERIFIED_GRAVITAS_EVENTS[0]?.id || '11111111-1111-1111-1111-111111110001'
  );
  const [registrations, setRegistrations] = useState<EventRegistration[]>(() => loadRegistrations());
  const [activePassModal, setActivePassModal] = useState<{
    registration: EventRegistration;
    isNew: boolean;
  } | null>(null);

  // Scroll Container Ref for the active content viewport
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Feedback Toasts
  const [actionToast, setActionToast] = useState<{
    action: KioskAction;
    gesture: GestureClass;
    source: 'gesture' | 'manual';
    timestamp: number;
  } | null>(null);

  const [scrollToast, setScrollToast] = useState<{
    message: string;
    atBottom?: boolean;
    timestamp: number;
  } | null>(null);

  // Telemetry mirror
  const [telemetry, setTelemetry] = useState<ControllerTelemetry>(() =>
    controller.getTelemetry('NO_HAND', 0, null, performance.now() / 1000)
  );

  // Helper for scrolling content container
  const handleScrollDown = useCallback(() => {
    const el = contentScrollRef.current;
    if (!el) return;

    const scrollableDistance = el.scrollHeight - el.clientHeight;
    if (scrollableDistance > 15) {
      const current = el.scrollTop;
      const scrollStep = Math.round(el.clientHeight * 0.65);
      const target = Math.min(scrollableDistance, current + scrollStep);

      if (current >= scrollableDistance - 8) {
        setScrollToast({
          message: 'Reached end of section',
          atBottom: true,
          timestamp: Date.now(),
        });
      } else {
        el.scrollTo({ top: target, behavior: 'smooth' });
        setScrollToast({
          message: 'Scrolled down 65%',
          atBottom: target >= scrollableDistance - 8,
          timestamp: Date.now(),
        });
      }
    } else {
      setScrollToast({
        message: 'All content visible',
        atBottom: true,
        timestamp: Date.now(),
      });
    }

    setTimeout(() => {
      setScrollToast((prev) => (prev && Date.now() - prev.timestamp >= 1800 ? null : prev));
    }, 2000);
  }, []);

  // Centralized Navigation Controller
  const handleAction = useCallback(
    (
      action: KioskAction,
      source: 'gesture' | 'manual' = 'gesture',
      gesture: GestureClass = 'OPEN_PALM'
    ) => {
      // If registration pass modal is open, gestures must NOT trigger background page changes!
      if (activePassModal) {
        if (action === 'CANCEL' || action === 'BACK' || action === 'CONFIRM_OR_SELECT') {
          setActivePassModal(null);
          setActionToast({ action, gesture, source, timestamp: Date.now() });
          setTimeout(() => {
            setActionToast((prev) => (prev && Date.now() - prev.timestamp >= 2500 ? null : prev));
          }, 2600);
        }
        return;
      }

      // If generic confirmed modal is active, only CANCEL or CONFIRM_OR_SELECT can dismiss it
      if (confirmedModal) {
        if (action === 'CANCEL' || action === 'CONFIRM_OR_SELECT') {
          setConfirmedModal(null);
          setActionToast({ action, gesture, source, timestamp: Date.now() });
          setTimeout(() => {
            setActionToast((prev) => (prev && Date.now() - prev.timestamp >= 2500 ? null : prev));
          }, 2600);
        }
        return;
      }

      // Record visual action feedback toast
      setActionToast({ action, gesture, source, timestamp: Date.now() });
      setTimeout(() => {
        setActionToast((prev) => (prev && Date.now() - prev.timestamp >= 2500 ? null : prev));
      }, 2600);

      // Execute Centralized Navigation Commands
      switch (action) {
        case 'HOME':
        case 'GO_HOME': {
          if (currentPage !== 'Home') {
            setCurrentPage('Home');
            setNavHistory((prev) => [...prev, 'Home']);
            // Reset scroll position on page change
            contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        }

        case 'NEXT_PAGE':
        case 'NEXT_ITEM': {
          // REAL NEXT PAGE NAVIGATION through PAGE_ORDER sequence
          const next = getNextPage(currentPage);
          setCurrentPage(next);
          setNavHistory((prev) => [...prev, next]);
          contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        }

        case 'OPEN_SCHEDULE': {
          if (currentPage !== 'Schedule') {
            setCurrentPage('Schedule');
            setNavHistory((prev) => [...prev, 'Schedule']);
            contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        }

        case 'CONFIRM_OR_SELECT':
        case 'CONFIRM': {
          if (currentPage === 'Schedule') {
            const activeItem =
              VERIFIED_GRAVITAS_EVENTS.find(
                (it) => it.id === selectedScheduleId || it.slug === selectedScheduleId
              ) || VERIFIED_GRAVITAS_EVENTS[0];
            const result = createOrGetRegistration(activeItem);
            setRegistrations(loadRegistrations());
            setActivePassModal({ registration: result.registration, isNew: result.isNew });
            if (result.isNew && activeItem.id) {
              gravitasService.recordRegistration(activeItem.id, result.registration.registrationCode).catch(() => {});
            }
          } else {
            setCurrentPage('Schedule');
            setNavHistory((prev) => [...prev, 'Schedule']);
            contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            setActionToast({
              action: 'OPEN_SCHEDULE',
              gesture: 'THUMBS_UP',
              source,
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'BACK':
        case 'GO_BACK': {
          setNavHistory((prev) => {
            if (prev.length > 1) {
              const copy = [...prev];
              copy.pop();
              const target = copy[copy.length - 1];
              setCurrentPage(target);
              contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              return copy;
            } else {
              const prevInOrder = getPrevPage(currentPage);
              setCurrentPage(prevInOrder);
              contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              return [prevInOrder];
            }
          });
          break;
        }

        case 'SCROLL_DOWN': {
          if (currentPage === 'Schedule') {
            const curIdx = VERIFIED_GRAVITAS_EVENTS.findIndex(
              (it) => it.id === selectedScheduleId || it.slug === selectedScheduleId
            );
            const validIdx = curIdx >= 0 ? curIdx : 0;
            if (validIdx < VERIFIED_GRAVITAS_EVENTS.length - 1) {
              const nextItem = VERIFIED_GRAVITAS_EVENTS[validIdx + 1];
              setSelectedScheduleId(nextItem.id);
              setScrollToast({
                message: `Selected: ${nextItem.name}`,
                atBottom: validIdx + 1 === VERIFIED_GRAVITAS_EVENTS.length - 1,
                timestamp: Date.now(),
              });
            } else {
              setScrollToast({
                message: `End of schedule reached (${VERIFIED_GRAVITAS_EVENTS.length}/${VERIFIED_GRAVITAS_EVENTS.length} events)`,
                atBottom: true,
                timestamp: Date.now(),
              });
            }
            setTimeout(() => {
              setScrollToast((prev) => (prev && Date.now() - prev.timestamp >= 1800 ? null : prev));
            }, 2000);
          } else {
            // Dedicated scroll action on other pages
            handleScrollDown();
          }
          break;
        }

        case 'CANCEL': {
          setConfirmedModal(null);
          break;
        }

        case 'OPEN_HELP': {
          if (currentPage !== 'Help') {
            setCurrentPage('Help');
            setNavHistory((prev) => [...prev, 'Help']);
            contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        }

        default:
          break;
      }
    },
    [currentPage, confirmedModal, activePassModal, handleScrollDown, selectedScheduleId]
  );

  const navigateDirectly = (page: PageId) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      setNavHistory((prev) => [...prev, page]);
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navTabIcons: Record<PageId, React.ReactNode> = {
    Home: <Home className="w-3.5 h-3.5 stroke-[2.5]" />,
    Schedule: <Calendar className="w-3.5 h-3.5 stroke-[2.5]" />,
    Venues: <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />,
    Gallery: <Camera className="w-3.5 h-3.5 stroke-[2.5]" />,
    Stalls: <Store className="w-3.5 h-3.5 stroke-[2.5]" />,
    Contacts: <Phone className="w-3.5 h-3.5 stroke-[2.5]" />,
    Help: <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />,
    Evaluation: <BarChart2 className="w-3.5 h-3.5 stroke-[2.5]" />,
  };

  return (
    <div className="min-h-screen bg-[#FFF7E8] text-[#17151B] flex flex-col font-sans selection:bg-[#D8FF4F] selection:text-[#17151B]">
      {/* Editorial Header */}
      <Navbar
        currentPage={currentPage}
        controllerState={telemetry.state}
        onOpenCodeExplorer={() => setCodeExplorerOpen(true)}
        cameraActive={cameraActive}
        onToggleCamera={() => setCameraActive(!cameraActive)}
      />

      {/* Main Kiosk Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-3.5">
        {/* Manual Fallback Navigation Strip */}
        <ManualControls
          onAction={(act, src) => handleAction(act, src, 'OPEN_PALM')}
          lastAction={telemetry.lastAction}
        />

        {/* Action Execution Toast Feedback */}
        {actionToast && (
          <div className="p-2.5 rounded-lg bg-[#17151B] text-white border-2 border-[#17151B] ink-shadow flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#D8FF4F] text-[#17151B] font-black text-sm">
                {GESTURE_DEFINITIONS[actionToast.gesture]?.icon || '⚡'}
              </span>
              <div>
                <span className="font-extrabold text-[#D8FF4F] uppercase tracking-wider mr-2">
                  {actionToast.action.replace('_', ' ')}
                </span>
                <span className="text-slate-300">
                  Via {actionToast.source === 'gesture' ? actionToast.gesture : 'Manual Button'} (One-Shot Verified)
                </span>
              </div>
            </div>
            <button
              onClick={() => setActionToast(null)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scroll Feedback Indicator */}
        {scrollToast && (
          <div className="p-2 rounded bg-[#E9E0FF] border-2 border-[#17151B] ink-shadow text-xs font-bold text-[#17151B] flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono">
              <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
              {scrollToast.message}
            </span>
            {scrollToast.atBottom && (
              <span className="text-[10px] uppercase tracking-wider bg-[#17151B] text-[#D8FF4F] px-1.5 py-0.5 rounded font-black">
                End of Page
              </span>
            )}
          </div>
        )}

        {/* Modal Overlay for Confirmations */}
        {confirmedModal && (
          <div className="p-3.5 rounded-lg bg-[#D8FF4F] border-2 border-[#17151B] ink-shadow text-[#17151B] flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[2.5]" />
              <div>
                <strong className="block font-black text-sm">Action Confirmed</strong>
                <p className="text-xs font-medium mt-0.5">{confirmedModal}</p>
                <span className="text-[10px] text-[#655E68] font-mono mt-1 block">
                  Gesture: Make 👎 THUMBS_DOWN or click Cancel to dismiss.
                </span>
              </div>
            </div>
            <button
              onClick={() => setConfirmedModal(null)}
              className="p-1 rounded border border-[#17151B] bg-white hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Two-Column Grid: Left CV Sensor (5 cols) | Right Content Screen (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Computer Vision Sensor */}
          <div className="lg:col-span-5 space-y-3">
            <CameraSensor
              controller={controller}
              onActionTriggered={(act, gest) => handleAction(act, 'gesture', gest)}
              cameraActive={cameraActive}
              onToggleCamera={() => setCameraActive(!cameraActive)}
              onTelemetryUpdate={setTelemetry}
            />

            {/* Quick Gesture Legend */}
            <div className="bg-white border-2 border-[#17151B] rounded-lg p-3 ink-shadow text-xs space-y-2">
              <div className="flex items-center justify-between font-black uppercase text-[11px] tracking-wider text-[#17151B]">
                <span>Gesture Legend</span>
                <span className="text-[10px] font-mono text-[#655E68]">8 Canonical Poses</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>☝️ POINT_UP</strong>: Next Page
                </div>
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>👇 POINT_DOWN</strong>: Scroll
                </div>
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>✋ OPEN_PALM</strong>: Home
                </div>
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>✊ CLOSED_FIST</strong>: Back
                </div>
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>✌️ VICTORY</strong>: Schedule
                </div>
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>👍 THUMBS_UP</strong>: Confirm
                </div>
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>👎 THUMBS_DOWN</strong>: Cancel
                </div>
                <div className="p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                  <strong>🤟 LOVE_YOU</strong>: Help
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Campus Content Screen */}
          <div className="lg:col-span-7 bg-white border-2 border-[#17151B] rounded-lg p-4 sm:p-5 ink-shadow min-h-[620px] flex flex-col">
            {/* Page Navigation Tabs */}
            <nav className="flex items-center gap-1 pb-3 mb-3 border-b-2 border-[#17151B] overflow-x-auto">
              {PAGE_ORDER.map((page, idx) => {
                const isActive = currentPage === page;
                return (
                  <button
                    key={page}
                    onClick={() => navigateDirectly(page)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 border-2 border-[#17151B] ${
                      isActive
                        ? 'bg-[#D8FF4F] text-[#17151B] ink-shadow-sm scale-105'
                        : 'bg-[#FFF7E8] text-[#17151B] hover:bg-[#E9E0FF]'
                    }`}
                  >
                    {navTabIcons[page]}
                    <span>{page}</span>
                  </button>
                );
              })}
            </nav>

            {/* Scrollable Content Container (Controlled by POINTING_DOWN) */}
            <div
              ref={contentScrollRef}
              className="flex-1 overflow-y-auto max-h-[580px] pr-1 scroll-smooth"
            >
              {currentPage === 'Home' && (
                <HomeView
                  onNavigate={navigateDirectly}
                  telemetry={telemetry}
                  onStartCamera={() => setCameraActive(true)}
                  cameraActive={cameraActive}
                />
              )}

              {currentPage === 'Schedule' && (
                <ScheduleView
                  selectedId={selectedScheduleId}
                  onSelectId={setSelectedScheduleId}
                  registrations={registrations}
                  lastAction={actionToast?.action}
                  actionTimestamp={actionToast?.timestamp}
                  onRegister={(item) => {
                    const res = createOrGetRegistration(item);
                    setRegistrations(loadRegistrations());
                    setActivePassModal({ registration: res.registration, isNew: res.isNew });
                    if (res.isNew && item.id) {
                      gravitasService.recordRegistration(item.id, res.registration.registrationCode).catch(() => {});
                    }
                  }}
                  onViewPass={(reg) => {
                    setActivePassModal({ registration: reg, isNew: false });
                  }}
                  onCancelRegistration={(eventId) => {
                    const updated = cancelRegistration(eventId);
                    setRegistrations(updated);
                  }}
                />
              )}

              {currentPage === 'Venues' && <VenuesView />}
              {currentPage === 'Gallery' && (
                <GalleryView
                  onSelectEvent={(id) => {
                    setSelectedScheduleId(id);
                    setCurrentPage('Schedule');
                  }}
                />
              )}
              {currentPage === 'Stalls' && <StallsView />}
              {currentPage === 'Contacts' && <ContactsView />}
              {currentPage === 'Help' && <HelpView />}
              {currentPage === 'Evaluation' && (
                <EvaluationDashboard telemetry={telemetry} />
              )}
            </div>

            {/* Bottom Scroll Prompt Bar */}
            <div className="pt-2 mt-2 border-t-2 border-[#17151B] flex items-center justify-between text-[11px] text-[#655E68]">
              <span className="font-mono">
                {currentPage === 'Schedule' ? (
                  <>
                    Gesture: <strong>👇 POINTING_DOWN</strong> advances selected event &amp; scrolls
                  </>
                ) : (
                  <>
                    Gesture: <strong>👇 POINTING_DOWN</strong> scrolls content container
                  </>
                )}
              </span>
              <button
                onClick={() => handleAction('SCROLL_DOWN', 'manual', 'POINTING_DOWN')}
                className="px-2 py-0.5 rounded bg-[#FFF7E8] border border-[#17151B] hover:bg-[#D8FF4F] font-bold text-[#17151B] cursor-pointer flex items-center gap-1"
              >
                <span>{currentPage === 'Schedule' ? 'Next Event (👇)' : 'Scroll Down (65%)'}</span>
                <ArrowDown className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#17151B] bg-white py-3 px-4 text-center text-xs text-[#655E68] mt-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-[#17151B]">
            GestureGo HCI System • graVITas ’26 @ VIT Vellore • Edge Vision &amp; Supabase PostgreSQL
          </span>
          <button
            onClick={() => setCodeExplorerOpen(true)}
            className="text-[#17151B] font-bold underline hover:text-[#FF7048] cursor-pointer"
          >
            Inspect Python Architecture & Source Files
          </button>
        </div>
      </footer>

      {/* Registration Pass Modal */}
      <RegistrationPassModal
        isOpen={!!activePassModal}
        registration={activePassModal?.registration || null}
        isNewRegistration={activePassModal?.isNew || false}
        onClose={() => setActivePassModal(null)}
      />

      {/* Code Explorer Modal */}
      <CodeExplorerModal
        isOpen={codeExplorerOpen}
        onClose={() => setCodeExplorerOpen(false)}
      />
    </div>
  );
}
