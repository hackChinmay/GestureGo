import React from 'react';
import { GESTURE_DEFINITIONS } from '../campusData';
import { GestureClass } from '../types';
import { HelpCircle, Sun, Info, CheckCircle2, ArrowDown } from 'lucide-react';

export const HelpView: React.FC = () => {
  const supportedGestures: GestureClass[] = [
    'OPEN_PALM',
    'POINTING_UP',
    'POINTING_DOWN',
    'VICTORY',
    'THUMBS_UP',
    'CLOSED_FIST',
    'THUMBS_DOWN',
    'I_LOVE_YOU',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#B8A0FF] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              Gesture Guide & Instructions
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Anatomical hand poses, one-shot interaction lifecycle, and manual fallbacks.
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border border-[#17151B] px-2 py-0.5 rounded">
          👇 <strong>POINTING_DOWN</strong> scrolls guide
        </div>
      </div>

      {/* 8 Gesture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {supportedGestures.map((g) => {
          const def = GESTURE_DEFINITIONS[g];
          return (
            <div
              key={g}
              className="p-3.5 rounded-lg bg-white border-2 border-[#17151B] ink-shadow space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl p-1 rounded bg-[#FFF7E8] border border-[#17151B]">
                    {def.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-[#17151B]">
                      {g.replace('_', ' ')}
                    </h3>
                    <span className="text-[11px] font-mono font-black text-[#17151B] bg-[#D8FF4F] px-1 rounded">
                      Action: {def.action}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-[#E9E0FF] text-[#17151B] border border-[#17151B]">
                  {def.category}
                </span>
              </div>

              <p className="text-xs text-[#17151B] font-medium leading-snug">
                {def.description}
              </p>

              <div className="text-[11px] text-[#655E68] bg-[#FFF7E8] p-1.5 rounded border border-[#17151B]/20 font-mono">
                <strong className="text-[#17151B]">Form:</strong> {def.prompt}
              </div>
            </div>
          );
        })}
      </div>

      {/* One-Shot Lifecycle Explanation */}
      <div className="p-4 rounded-lg bg-[#E9E0FF] border-2 border-[#17151B] ink-shadow space-y-2">
        <h3 className="text-sm font-black text-[#17151B] uppercase tracking-wide">
          One-Shot Gesture Lifecycle: READY → CANDIDATE → EXECUTED → LOCKED_HOLD → READY
        </h3>
        <p className="text-xs text-[#17151B] font-medium leading-relaxed">
          To prevent repetitive triggers while holding a gesture, the kiosk executes your intended action <strong>exactly once</strong> and immediately locks. To execute another action, simply return your hand to a neutral position for ~0.15s to re-arm.
        </p>
      </div>

      {/* Usage Conditions */}
      <div className="p-4 rounded-lg bg-white border-2 border-[#17151B] ink-shadow space-y-2 text-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#17151B] flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-[#FF7048]" />
          <span>Optimal Usage Recommendations</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-[#FFF7E8] border border-[#17151B]">
            <strong className="block text-[#17151B] font-bold">1.5 - 3 Feet Distance</strong>
            <span className="text-[#655E68]">Keep entire hand and wrist inside the camera frame.</span>
          </div>
          <div className="p-2 rounded bg-[#FFF7E8] border border-[#17151B]">
            <strong className="block text-[#17151B] font-bold">Front Lighting</strong>
            <span className="text-[#655E68]">Avoid strong backlights directly behind your body.</span>
          </div>
          <div className="p-2 rounded bg-[#FFF7E8] border border-[#17151B]">
            <strong className="block text-[#17151B] font-bold">Manual Fallback</strong>
            <span className="text-[#655E68]">Always use the 8 manual buttons if camera is paused.</span>
          </div>
        </div>
      </div>

      {/* Static HCI vs Sign Language Disclaimer */}
      <div className="p-3.5 rounded-lg bg-[#FFF7E8] border-2 border-[#17151B] text-xs text-[#655E68] space-y-1">
        <div className="flex items-center gap-1.5 text-[#17151B] font-black uppercase text-[11px]">
          <Info className="w-3.5 h-3.5 text-[#FF7048]" />
          <span>HCI Interface Notice</span>
        </div>
        <p className="leading-relaxed">
          GestureGo uses an engineered set of 8 static poses designed specifically for touchless public kiosk navigation. It is <strong>not a Sign Language (ASL/BSL) translation system</strong> and does not track facial grammar, trajectory signs, or linguistic markers.
        </p>
      </div>
    </div>
  );
};
