import React, { useState } from 'react';
import { CAMPUS_VENUES } from '../campusData';
import { CampusVenue } from '../types';
import { MapPin, Users, Compass, Accessibility } from 'lucide-react';

export const VenuesView: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<CampusVenue>(CAMPUS_VENUES[0]);

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#FF7048] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              Campus Venues
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            North Quadrangle auditoriums, robotics labs, and accessibility guides.
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border border-[#17151B] px-2 py-0.5 rounded">
          👇 <strong>POINTING_DOWN</strong> scrolls venues
        </div>
      </div>

      {/* Schematic Overview Box */}
      <div className="bg-[#FFF7E8] border-2 border-[#17151B] rounded-lg p-3 ink-shadow space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-black uppercase text-[#17151B] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> North Quadrangle Hub
          </span>
          <span className="text-[10px] font-mono text-[#655E68]">
            {CAMPUS_VENUES.length} Campus Locations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
          {CAMPUS_VENUES.map((v) => {
            const isSelected = v.id === selectedVenue.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVenue(v)}
                className={`p-2 rounded border border-[#17151B] text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#D8FF4F] font-black text-[#17151B] ink-shadow-sm'
                    : 'bg-white hover:bg-[#E9E0FF] text-[#17151B]'
                }`}
              >
                <div className="text-[11px] font-black truncate">{v.name.split('(')[0]}</div>
                <div className="text-[9px] font-mono text-[#655E68] truncate">{v.floor}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Venue Spotlight */}
      <div className="p-4 rounded-lg bg-[#E9E0FF] border-2 border-[#17151B] ink-shadow space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#17151B] text-[#D8FF4F]">
              {selectedVenue.floor}
            </span>
            <h3 className="text-lg font-black text-[#17151B] mt-1">{selectedVenue.name}</h3>
            <p className="text-xs font-medium text-[#655E68]">{selectedVenue.building}</p>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#17151B] px-2.5 py-1 rounded bg-white border border-[#17151B]">
            <Users className="w-3.5 h-3.5" />
            <span>Capacity: {selectedVenue.capacity}</span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div>
            <strong className="text-[#17151B] block mb-1 flex items-center gap-1">
              <Accessibility className="w-3.5 h-3.5 text-[#FF7048]" />
              Accessibility & Features:
            </strong>
            <div className="flex flex-wrap gap-1">
              {selectedVenue.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-white border border-[#17151B] text-[#17151B] text-[11px] font-mono"
                >
                  ✓ {feat}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#17151B]/20">
            <strong className="text-[#17151B] block mb-0.5">Walking Route:</strong>
            <p className="text-[#655E68] leading-snug">{selectedVenue.directions}</p>
          </div>
        </div>
      </div>

      {/* All Venues Structured List */}
      <div className="space-y-2">
        {CAMPUS_VENUES.map((v) => (
          <div
            key={v.id}
            onClick={() => setSelectedVenue(v)}
            className={`p-3 rounded-lg border-2 border-[#17151B] transition-transform active:translate-y-0.5 cursor-pointer ${
              v.id === selectedVenue.id ? 'bg-[#FFF7E8] ink-shadow' : 'bg-white hover:bg-[#FFF7E8]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-black text-sm text-[#17151B]">{v.name}</h4>
                <p className="text-xs text-[#655E68] mt-0.5">{v.building} • {v.floor}</p>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#17151B] bg-white border border-[#17151B] px-2 py-0.5 rounded">
                Cap: {v.capacity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
