import React, { useState, useMemo, useCallback } from 'react';
import { GestureClass, KioskAction, ControllerTelemetry, ScheduleItem } from './types';
import { GestureControllerTS } from './gestureController';
import { GESTURE_DEFINITIONS, SCHEDULE_ITEMS } from './campusData';
import { Navbar } from './components/Navbar';
import { ManualControls } from './components/ManualControls';
import { CameraSensor } from './components/CameraSensor';
import { HomeView } from './components/HomeView';
import { ScheduleView } from './components/ScheduleView';
import { VenuesView } from './components/VenuesView';
import { StallsView } from './components/StallsView';
import { ContactsView } from './components/ContactsView';
import { HelpView } from './components/HelpView';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { CodeExplorerModal } from './components/CodeExplorerModal';
import {
  Sparkles,
  Calendar,
  MapPin,
  Store,
  Phone,
  HelpCircle,
  BarChart2,
  Home,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function App() {
  // Shared State Machine Controller
  const controller = useMemo(
    () => new GestureControllerTS(0.8, 0.4, 8, 0.35),
    []
  );

  // UI State
  const [currentPage, setCurrentPage] = useState<string>('Home');
  const [navHistory, setNavHistory] = useState<string[]>(['Home']);
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<number>(0);
  const [confirmedModal, setConfirmedModal] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [codeExplorerOpen, setCodeExplorerOpen] = useState<boolean>(false);

  // Live Toast for Executed Actions
  const [actionToast, setActionToast] = useState<{
    action: KioskAction;
    gesture: GestureClass;
    source: 'gesture' | 'manual';
    timestamp: number;
  } | null>(null);

  // Telemetry mirror
  const [telemetry, setTelemetry] = useState<ControllerTelemetry>(() =>
    controller.getTelemetry('NO_HAND', 0, null, performance.now() / 1000)
  );

  // Central Action Dispatcher
  const handleAction = useCallback(
    (action: KioskAction, source: 'gesture' | 'manual' = 'gesture', gesture: GestureClass = 'OPEN_PALM') => {
      // Trigger toast
      setActionToast({
        action,
        gesture,
        source,
        timestamp: Date.now(),
      });

      // Clear toast after 2.8s
      setTimeout(() => {
        setActionToast((prev) => (prev?.timestamp ? (Date.now() - prev.timestamp >= 2700 ? null : prev) : null));
      }, 2800);

      if (action === 'GO_HOME') {
        setCurrentPage('Home');
        setNavHistory((prev) => [...prev, 'Home']);
        setConfirmedModal(null);
      } else if (action === 'NEXT_ITEM') {
        if (currentPage === 'Schedule') {
          setSelectedScheduleIndex((prev) => (prev + 1) % SCHEDULE_ITEMS.length);
        } else {
          const pages = ['Home', 'Schedule', 'Venues', 'Stalls', 'Contacts', 'Help'];
          const curIdx = pages.indexOf(currentPage);
          const next = pages[(curIdx + 1) % pages.length];
          setCurrentPage(next);
          setNavHistory((prev) => [...prev, next]);
        }
      } else if (action === 'OPEN_SCHEDULE') {
        setCurrentPage('Schedule');
        setNavHistory((prev) => [...prev, 'Schedule']);
      } else if (action === 'CONFIRM') {
        if (currentPage === 'Schedule') {
          const item = SCHEDULE_ITEMS[selectedScheduleIndex];
          setConfirmedModal(`Successfully registered for: ${item.title} (${item.location})`);
        } else {
          setConfirmedModal(`Confirmed action on ${currentPage} section.`);
        }
      } else if (action === 'GO_BACK') {
        setNavHistory((prev) => {
          if (prev.length > 1) {
            const copy = [...prev];
            copy.pop();
            const backPage = copy[copy.length - 1];
            setCurrentPage(backPage);
            return copy;
          } else {
            setCurrentPage('Home');
            return ['Home'];
          }
        });
        setConfirmedModal(null);
      } else if (action === 'CANCEL') {
        setConfirmedModal(null);
      } else if (action === 'OPEN_HELP') {
        setCurrentPage('Help');
        setNavHistory((prev) => [...prev, 'Help']);
      }
    },
    [currentPage, selectedScheduleIndex]
  );

  const navigateToPage = (page: string) => {
    setCurrentPage(page);
    setNavHistory((prev) => [...prev, page]);
  };

  const navTabs = [
    { id: 'Home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'Schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
    { id: 'Venues', label: 'Venues', icon: <MapPin className="w-4 h-4" /> },
    { id: 'Stalls', label: 'Stalls', icon: <Store className="w-4 h-4" /> },
    { id: 'Contacts', label: 'Contacts', icon: <Phone className="w-4 h-4" /> },
    { id: 'Help', label: 'Help', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'Evaluation', label: 'Evaluation', icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        controllerState={telemetry.state}
        onOpenCodeExplorer={() => setCodeExplorerOpen(true)}
        cameraActive={cameraActive}
        onToggleCamera={() => setCameraActive(!cameraActive)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Manual Navigation Bar Fallback (Always Accessible) */}
        <ManualControls
          onAction={(act, src) => handleAction(act, src, 'OPEN_PALM')}
          lastAction={telemetry.lastAction}
        />

        {/* Action Fired Toast Banner */}
        {actionToast && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-teal-900/90 to-slate-900 border border-teal-400/80 shadow-xl flex items-center justify-between text-xs text-white animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold text-base">
                {GESTURE_DEFINITIONS[actionToast.gesture]?.icon || '⚡'}
              </span>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-teal-300">
                  <span>Action Executed:</span>
                  <span className="font-mono bg-teal-500/20 px-2 py-0.5 rounded text-white">
                    {actionToast.action}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Source: <strong>{actionToast.source === 'gesture' ? actionToast.gesture : 'Manual Button'}</strong> (One-Shot Verified)
                </div>
              </div>
            </div>
            <button
              onClick={() => setActionToast(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Kiosk Layout: Camera & HUD Left | Content Screen Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Computer Vision Sensor & HUD (5 Cols on LG) */}
          <div className="lg:col-span-5 space-y-4">
            <CameraSensor
              controller={controller}
              onActionTriggered={(act, gest) => handleAction(act, 'gesture', gest)}
              cameraActive={cameraActive}
              onToggleCamera={() => setCameraActive(!cameraActive)}
              onTelemetryUpdate={setTelemetry}
            />
          </div>

          {/* Right Column: Campus Content Screen (7 Cols on LG) */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl min-h-[580px] flex flex-col">
            {/* View Navigation Tabs */}
            <div className="flex items-center gap-1.5 pb-4 mb-4 border-b border-slate-800 overflow-x-auto">
              {navTabs.map((tab) => {
                const isActive = currentPage === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateToPage(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Screen Content */}
            <div className="flex-1">
              {currentPage === 'Home' && (
                <HomeView
                  onNavigate={navigateToPage}
                  telemetry={telemetry}
                  onStartCamera={() => setCameraActive(true)}
                  cameraActive={cameraActive}
                />
              )}

              {currentPage === 'Schedule' && (
                <ScheduleView
                  selectedIndex={selectedScheduleIndex}
                  onSelectIndex={setSelectedScheduleIndex}
                  confirmedModal={confirmedModal}
                  onDismissModal={() => setConfirmedModal(null)}
                  onConfirmRegistration={(item) =>
                    setConfirmedModal(`Registered for: ${item.title} (${item.location})`)
                  }
                />
              )}

              {currentPage === 'Venues' && <VenuesView />}
              {currentPage === 'Stalls' && <StallsView />}
              {currentPage === 'Contacts' && <ContactsView />}
              {currentPage === 'Help' && <HelpView />}
              {currentPage === 'Evaluation' && (
                <EvaluationDashboard telemetry={telemetry} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            GestureGo HCI Architecture • 5-State Finite State Machine • Zero Cloud Video Stream
          </span>
          <button
            onClick={() => setCodeExplorerOpen(true)}
            className="text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>Explore Standalone Python Codebase</span>
          </button>
        </div>
      </footer>

      {/* Code Explorer Modal */}
      <CodeExplorerModal
        isOpen={codeExplorerOpen}
        onClose={() => setCodeExplorerOpen(false)}
      />
    </div>
  );
}
