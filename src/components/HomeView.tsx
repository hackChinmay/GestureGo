import React from 'react';
import { EVENT_INFO } from '../campusData';
import { ControllerTelemetry } from '../types';
import {
  Calendar,
  MapPin,
  Camera,
  Phone,
  ArrowRight,
  Hand,
  CheckCircle2,
  Lock,
  ArrowDown,
  Sparkles,
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
      desc: 'EnergyThon, RoboWars, HackVerse, Edge AI workshops, and ceremonies.',
      page: 'Schedule',
      icon: <Calendar className="w-5 h-5 text-[#17151B] stroke-[2.5]" />,
      gesture: '✌️ VICTORY',
      accent: 'bg-[#FFF7E8] hover:bg-[#D8FF4F]',
    },
    {
      title: 'Campus Venues',
      desc: 'SJT (Bhagat Singh Gallery), Anna Auditorium, Technology Tower, and MB.',
      page: 'Venues',
      icon: <MapPin className="w-5 h-5 text-[#17151B] stroke-[2.5]" />,
      gesture: '☝️ NEXT_PAGE',
      accent: 'bg-[#FFF7E8] hover:bg-[#E9E0FF]',
    },
    {
      title: 'Photo Gallery',
      desc: 'Official event posters, inaugurals, awards gala, and campus media archive.',
      page: 'Gallery',
      icon: <Camera className="w-5 h-5 text-[#17151B] stroke-[2.5]" />,
      gesture: '☝️ NEXT_PAGE',
      accent: 'bg-[#FFF7E8] hover:bg-[#D8FF4F]',
    },
    {
      title: 'Festival Directory',
      desc: 'Office of Students\' Welfare (VIT Vellore) and emergency support contacts.',
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block px-2.5 py-0.5 rounded bg-[#17151B] text-[#D8FF4F] font-mono text-[11px] font-black uppercase tracking-wider">
              Touchless Campus Kiosk
            </span>
            <span className="inline-block px-2 py-0.5 rounded bg-[#D8FF4F] text-[#17151B] font-mono text-[10px] font-bold uppercase border border-[#17151B]">
              VIT Vellore Festival Archive
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#17151B] tracking-tight leading-none uppercase">
            graVITas ’26 Assistant
          </h1>

          <p className="text-xs sm:text-sm text-[#17151B] font-medium leading-relaxed">
            Welcome to the official <strong>{EVENT_INFO.name}</strong> touchless kiosk directory.
            Navigate verified hackathons, competitions, workshops, and VIT Vellore campus venues
            using real-time computer vision hand gestures.
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
              onClick={() => onNavigate('Gallery')}
              className="px-4 py-2 rounded bg-[#E9E0FF] hover:bg-[#D8FF4F] text-[#17151B] border-2 border-[#17151B] font-black text-xs ink-shadow transition-transform active:translate-y-0.5 flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Photo Gallery</span>
            </button>
          </div>
        </div>

        {/* Decorative Watermark */}
        <div className="absolute right-[-20px] bottom-[-20px] text-[120px] font-black text-[#17151B]/5 select-none pointer-events-none font-mono">
          VIT'26
        </div>
      </div>

      {/* Touchless Navigation Fast Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {destinations.map((dest) => (
          <div
            key={dest.page}
            onClick={() => onNavigate(dest.page)}
            className={`p-4 rounded-lg border-2 border-[#17151B] ink-shadow transition-all cursor-pointer ${dest.accent} flex flex-col justify-between space-y-3 group`}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded bg-white border border-[#17151B] ink-shadow-sm">
                {dest.icon}
              </div>
              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#17151B] bg-white/80 px-2 py-0.5 rounded border border-[#17151B]">
                {dest.gesture}
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-[#17151B] uppercase tracking-tight flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>{dest.title}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </h3>
              <p className="text-xs text-[#655E68] font-medium mt-1 leading-snug">
                {dest.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Historical Status & Live Sensor Telemetry Strip */}
      <div className="p-3.5 rounded-lg bg-white border-2 border-[#17151B] ink-shadow flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-[#D8FF4F] text-[#17151B]">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
          <span className="font-bold text-[#17151B]">
            Festival Archive Status: <strong>Completed (18–20 Sep 2026)</strong>
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] text-[#655E68]">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Supabase PostgreSQL Ready
          </span>
          <span>
            Sensor: <strong>{cameraActive ? 'Online (30 FPS)' : 'Standby'}</strong>
          </span>
          <span>
            FSM: <strong>{telemetry.state}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
