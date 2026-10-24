import React, { useState } from 'react';
import { CAMPUS_VENUES } from '../campusData';
import { CampusVenue } from '../types';
import { MapPin, Users, Compass, Accessibility, Sparkles } from 'lucide-react';

export const VenuesView: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<CampusVenue>(CAMPUS_VENUES[0]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-teal-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Campus Venues & Navigation
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Floor plans, auditorium accessibility accommodations, and directions.
        </p>
      </div>

      {/* Interactive 2D Campus Map Schematic */}
      <div className="relative h-48 sm:h-56 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-4 flex flex-col justify-between">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono uppercase font-bold text-teal-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> North Quadrangle Schematic
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Interactive Pin Locator
          </span>
        </div>

        {/* Map Pins */}
        <div className="relative w-full h-full my-2">
          {CAMPUS_VENUES.map((v) => {
            const isSelected = v.id === selectedVenue.id;
            const x = v.coordinates?.x ?? 50;
            const y = v.coordinates?.y ?? 50;

            return (
              <button
                key={v.id}
                onClick={() => setSelectedVenue(v)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all p-1.5 rounded-full z-20 flex items-center gap-1 group shadow-lg ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 scale-125 ring-4 ring-teal-400/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:scale-110'
                }`}
                title={v.name}
              >
                <MapPin className="w-4 h-4 fill-current" />
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md hidden sm:inline whitespace-nowrap ${
                    isSelected ? 'bg-slate-950 text-teal-300' : 'bg-slate-900/90 text-slate-300'
                  }`}
                >
                  {v.name.split('(')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative z-10 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Active Focus: <strong className="text-white">{selectedVenue.name}</strong></span>
          <span className="text-teal-400 font-mono">Accessible Routes Marked</span>
        </div>
      </div>

      {/* Selected Venue Spotlight Card */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/40 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 font-bold">
              {selectedVenue.floor}
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{selectedVenue.name}</h3>
            <p className="text-xs text-slate-300">{selectedVenue.building}</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Capacity: {selectedVenue.capacity}</span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <strong className="text-slate-300 block mb-1 flex items-center gap-1">
              <Accessibility className="w-3.5 h-3.5 text-teal-400" />
              Accessibility & Features:
            </strong>
            <div className="flex flex-wrap gap-1.5">
              {selectedVenue.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
                >
                  ✓ {feat}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/60">
            <strong className="text-slate-300 block mb-0.5">Walking Directions:</strong>
            <p className="text-slate-400 leading-relaxed">{selectedVenue.directions}</p>
          </div>
        </div>
      </div>

      {/* All Venues Quick List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CAMPUS_VENUES.map((v) => (
          <div
            key={v.id}
            onClick={() => setSelectedVenue(v)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              v.id === selectedVenue.id
                ? 'bg-slate-800/90 border-teal-500'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <h4 className="font-bold text-sm text-white">{v.name}</h4>
            <p className="text-xs text-slate-400 mt-0.5">{v.building}</p>
            <div className="mt-2 text-[11px] text-teal-400 font-mono">
              Cap: {v.capacity} • {v.floor}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
