import React from 'react';
import { GESTURE_DEFINITIONS } from '../campusData';
import { GestureClass } from '../types';
import { HelpCircle, Sun, ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

export const HelpView: React.FC = () => {
  const supportedGestures: GestureClass[] = [
    'OPEN_PALM',
    'POINTING_UP',
    'VICTORY',
    'THUMBS_UP',
    'CLOSED_FIST',
    'THUMBS_DOWN',
    'I_LOVE_YOU',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Gesture Reference & HCI Instructions
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Detailed anatomical pose guide, action mappings, and lighting tips.
        </p>
      </div>

      {/* 7 Gestures Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {supportedGestures.map((g) => {
          const def = GESTURE_DEFINITIONS[g];
          return (
            <div
              key={g}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-1.5 rounded-lg bg-slate-800 border border-slate-700/80 shadow-sm">
                    {def.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {g.replace('_', ' ')}
                    </h3>
                    <span className="text-[11px] text-teal-400 font-mono font-semibold">
                      Action: {def.action}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                  {def.category}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium">
                {def.description}
              </p>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg">
                <strong className="text-slate-300">How to form:</strong> {def.prompt}
              </div>
            </div>
          );
        })}
      </div>

      {/* Best Practices & Lighting Guide */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Optimal Usage Conditions & Ergonomics</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <strong className="text-teal-300 block">Camera Distance</strong>
            <p className="text-slate-400">
              Stand or sit approximately <strong>1.5 to 3 feet (45–90 cm)</strong> away
              so your whole hand and wrist are visible in frame.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <strong className="text-cyan-300 block">Ambient Lighting</strong>
            <p className="text-slate-400">
              Ensure front lighting on your hand. Avoid harsh backlights (e.g. bright windows
              directly behind you) to preserve clear landmark contrast.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <strong className="text-indigo-300 block">Hold & Release</strong>
            <p className="text-slate-400">
              Hold the gesture steadily for ~0.4s until the progress bar completes. Release to
              neutral (lower hand) to re-arm for your next action.
            </p>
          </div>
        </div>
      </div>

      {/* Responsible AI & Sign Language Notice */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-bold">
          <Info className="w-4 h-4 text-teal-400" />
          <span>Important Notice: HCI Interface vs. Sign Language Translation</span>
        </div>
        <p className="leading-relaxed">
          GestureGo uses a curated set of 7 static hand poses engineered specifically for kiosk
          navigation ergonomics and high computer vision confidence. This system is
          <strong> not an American Sign Language (ASL) or British Sign Language (BSL) translation system</strong>.
          It does not recognize facial expressions, grammar, dynamic hand paths, or non-manual markers
          essential to natural sign languages.
        </p>
      </div>
    </div>
  );
};
