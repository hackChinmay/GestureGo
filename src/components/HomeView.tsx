import React from 'react';
import { EVENT_INFO } from '../campusData';
import { ControllerTelemetry } from '../types';
import {
  Calendar,
  MapPin,
  Store,
  Phone,
  HelpCircle,
  ArrowRight,
  Hand,
  CheckCircle2,
  Lock,
  ArrowDown,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (page: any) => void;
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
      icon: <Calendar className="w-5 h-5 text-[#17151B] stroke-[2.5]" />,
      gesture: '✌️ VICTORY',
      accent: 'bg-[#FFF7E8] hover:bg-[#D8FF4F]',
    },
    {
      title: 'Venues & Map',
      desc: 'Hall A, Innovation Lab 204, dining atrium, and accessible routes.',
      page: 'Venues',
      icon: <MapPin className="w-5 h-5 text-[#17151B] stroke-[2.5]" />,
      gesture: '☝️ NEXT_PAGE',
      accent: 'bg-[#FFF7E8] hover:bg-[#E9E0FF]',
    },
    {
      title: 'Event Stalls',
      desc: 'Research lab demos, student makerspaces, and sponsor exhibits.',
      page: 'Stalls',
      icon: <Store className="w-5 h-5 text-[#17151B] stroke-[2.5]" />,
      gesture: '☝️ NEXT_PAGE',
      accent: 'bg-[#FFF7E8] hover:bg-[#D8FF4F]',
    },
    {
      title: 'Organizer Contacts',
      desc: 'Faculty leads, student committee chairs, and first aid desk.',
      page: 'Contacts',
      icon: <Phone className="w-5 h-5 text-[#17151B] stroke-[2.5]" />,
      gesture: '☝️ NEXT_PAGE',
      accent: 'bg-[#FFF7E8] hover:bg-[#E9E0FF]',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Editorial Hero Banner */}
      <div className="bg-[#FFF7E8] border-2 border-[#17151B] p-5 sm:p-6 rounded-lg ink-shadow relative overflow-hidden">
        <div className="space-y-3 relative z-10 max-w-xl">
          <div className="inline-block px-2.5 py-0.5 rounded bg-[#17151B] text-[#D8FF4F] font-mono text-[11px] font-black uppercase tracking-wider">
            Campus Kiosk System
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#17151B] tracking-tight leading-none uppercase">
            Touchless Campus Navigation
          </h1>

          <p className="text-xs sm:text-sm text-[#17151B] font-medium leading-relaxed">
            Welcome to <strong>{EVENT_INFO.name}</strong>. Explore keynotes, venue maps, and student innovation booths using touchless hand gestures.
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-2">
            {!cameraActive && (
              <button
                onClick={onStartCamera}
                className="px-4 py-2 rounded bg-[#D8FF4F] text-[#17151B] border-2 border-[#17151B] font-black text-xs ink-shadow transition-transform active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Hand className="w-4 h-4 stroke-[2.5]" />
                <span>Start Gesture Control</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('Schedule')}
              className="px-4 py-2 rounded bg-white hover:bg-[#E9E0FF] text-[#17151B] border-2 border-[#17151B] font-black text-xs ink-shadow transition-transform active:translate-y-0.5 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Schedule</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <button
              onClick={() => onNavigate('Help')}
              className="px-3 py-2 rounded bg-transparent hover:bg-black/5 text-[#655E68] text-xs font-bold transition-colors cursor-pointer"
            >
              Gesture Guide
            </button>
          </div>
        </div>
      </div>

      {/* State Machine Counters & Anti-Repetition Proof Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#FFF7E8] border-2 border-[#17151B] p-3 rounded-lg ink-shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[#655E68]">Actions Fired</div>
          <div className="text-2xl font-black text-[#17151B] font-mono mt-0.5">
            {telemetry.counters.totalActions}
          </div>
          <div className="text-[10px] text-[#655E68] font-mono">1 action / gesture</div>
        </div>

        <div className="bg-[#FF7048] border-2 border-[#17151B] p-3 rounded-lg ink-shadow-sm text-[#17151B]">
          <div className="text-[10px] font-mono uppercase font-black flex items-center gap-1">
            <Lock className="w-3 h-3 stroke-[2.5]" /> Repeats Blocked
          </div>
          <div className="text-2xl font-black font-mono mt-0.5">
            {telemetry.counters.repeatedPreventions}
          </div>
          <div className="text-[10px] font-bold font-mono">Zero repeat clicks</div>
        </div>

        <div className="bg-[#FFF7E8] border-2 border-[#17151B] p-3 rounded-lg ink-shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[#655E68]">Low-Conf Filtered</div>
          <div className="text-2xl font-black text-[#17151B] font-mono mt-0.5">
            {telemetry.counters.lowConfidenceRejections}
          </div>
          <div className="text-[10px] text-[#655E68] font-mono">Below 0.80 score</div>
        </div>

        <div className="bg-[#E9E0FF] border-2 border-[#17151B] p-3 rounded-lg ink-shadow-sm text-[#17151B]">
          <div className="text-[10px] font-mono uppercase font-black">Neutral Releases</div>
          <div className="text-2xl font-black font-mono mt-0.5">
            {telemetry.counters.neutralReleases}
          </div>
          <div className="text-[10px] font-mono">Re-armed cleanly</div>
        </div>
      </div>

      {/* Quick Destination Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#17151B]">
            Campus Destination Sections
          </h2>
          <span className="text-[11px] font-mono text-[#655E68]">
            Point Up ☝️ advances page
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {destinations.map((d) => (
            <div
              key={d.title}
              onClick={() => onNavigate(d.page)}
              className={`p-3.5 rounded-lg border-2 border-[#17151B] ${d.accent} ink-shadow-sm transition-transform active:translate-y-0.5 cursor-pointer group`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2 rounded bg-white border border-[#17151B]">
                  {d.icon}
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-[#17151B] text-[#17151B]">
                  {d.gesture}
                </span>
              </div>
              <h3 className="text-base font-black text-[#17151B] mt-2 group-hover:underline">
                {d.title}
              </h3>
              <p className="text-xs text-[#655E68] mt-0.5 leading-snug">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operating Instructions */}
      <div className="p-3.5 rounded-lg bg-white border-2 border-[#17151B] ink-shadow-sm space-y-1.5 text-xs text-[#17151B]">
        <div className="flex items-center gap-1.5 font-black uppercase text-[11px] tracking-wider text-[#17151B]">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>HCI Operating Instructions</span>
        </div>
        <ul className="text-[#655E68] text-xs space-y-1 pl-4 list-disc font-medium">
          <li>
            <strong>Hold Steady:</strong> Position hand in camera view for ~350ms until the stability bar completes.
          </li>
          <li>
            <strong>One-Shot Guarantee:</strong> Holding a gesture will execute the action exactly once, then lock.
          </li>
          <li>
            <strong>Release to Re-Arm:</strong> Lower your hand to neutral for 3 frames to re-arm the sensor.
          </li>
          <li>
            <strong>Scroll Down:</strong> Make a <strong>👇 POINTING_DOWN</strong> gesture to scroll long content.
          </li>
        </ul>
      </div>
    </div>
  );
};
