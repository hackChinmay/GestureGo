import React from 'react';
import { EVENT_INFO, GESTURE_DEFINITIONS } from '../campusData';
import { ControllerTelemetry } from '../types';
import {
  Calendar,
  MapPin,
  Store,
  Phone,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Hand,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (page: string) => void;
  telemetry: ControllerTelemetry;
  onStartCamera: () => void;
  cameraActive: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  telemetry,
  onStartCamera,
  cameraActive,
}) => {
  const destinations = [
    {
      title: 'Event Schedule',
      desc: 'Keynotes, AI workshops, robotics tracks, and ceremony times.',
      page: 'Schedule',
      icon: <Calendar className="w-5 h-5 text-indigo-400" />,
      gesture: 'VICTORY (✌️)',
      color: 'hover:border-indigo-500/40 from-indigo-500/10',
    },
    {
      title: 'Venues & Campus Map',
      desc: 'Hall A, Innovation Lab 204, dining atrium, and accessibility paths.',
      page: 'Venues',
      icon: <MapPin className="w-5 h-5 text-teal-400" />,
      gesture: 'NEXT_ITEM (☝️)',
      color: 'hover:border-teal-500/40 from-teal-500/10',
    },
    {
      title: 'Event Stalls & Sponsors',
      desc: 'Research lab demos, student makerspace booths, and partner hubs.',
      page: 'Stalls',
      icon: <Store className="w-5 h-5 text-cyan-400" />,
      gesture: 'NEXT_ITEM (☝️)',
      color: 'hover:border-cyan-500/40 from-cyan-500/10',
    },
    {
      title: 'Organizer Directory',
      desc: 'Faculty chairs, student leads, medical desk, and technical support.',
      page: 'Contacts',
      icon: <Phone className="w-5 h-5 text-amber-400" />,
      gesture: 'NEXT_ITEM (☝️)',
      color: 'hover:border-amber-500/40 from-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 border border-slate-700/80 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Interactive Kiosk</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Touchless Campus Assistant
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Navigate the annual <strong>{EVENT_INFO.name}</strong> without touching the screen.
            Powered by real-time computer vision, confidence gating, and a 5-state one-shot
            controller that prevents accidental or repeated actions.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {!cameraActive && (
              <button
                onClick={onStartCamera}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <Hand className="w-4 h-4" />
                <span>Start Gesture Control</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('Schedule')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-sm transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Explore Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('Help')}
              className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-sm font-medium transition-all flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Gesture Guide</span>
            </button>
          </div>
        </div>

        {/* Ambient glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Anti-Repetition & Telemetry Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Actions Executed</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {telemetry.counters.totalActions}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Strictly 1 action per pose</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Repeats Blocked</span>
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
            {telemetry.counters.repeatedPreventions}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Prevented by LOCKED state</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Low-Conf Filtered</div>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
            {telemetry.counters.lowConfidenceRejections}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Below 0.80 threshold</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Neutral Releases</div>
          <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
            {telemetry.counters.neutralReleases}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">FSM re-armed safely</div>
        </div>
      </div>

      {/* Quick Destinations Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white tracking-wide">
            Kiosk Information Centers
          </h3>
          <span className="text-xs text-slate-400">
            Navigate with gestures or click to select
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {destinations.map((d) => (
            <div
              key={d.title}
              onClick={() => onNavigate(d.page)}
              className={`p-4 rounded-xl bg-gradient-to-r ${d.color} to-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group hover:shadow-lg`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700/80 shadow-sm">
                  {d.icon}
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-300">
                  {d.gesture}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mt-3 group-hover:text-teal-300 transition-colors">
                {d.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works & Responsible AI Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>HCI Operating Instructions & Privacy Protection</span>
        </div>
        <ul className="text-slate-400 space-y-1.5 pl-6 list-disc">
          <li>
            <strong>Hold Steady:</strong> Position your hand 1.5–3 feet in front of the
            webcam and maintain the pose for ~0.4s until the action fires.
          </li>
          <li>
            <strong>Release to Re-Arm:</strong> After an action triggers, pull your hand back or
            relax to a neutral pose. This re-arms the sensor for your next command.
          </li>
          <li>
            <strong>Local Processing:</strong> Video frames are processed in memory and are
            never recorded, streamed to a server, or shared.
          </li>
          <li>
            <strong>Disclaimer:</strong> {EVENT_INFO.disclaimer}
          </li>
        </ul>
      </div>
    </div>
  );
};
