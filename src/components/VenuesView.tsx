import React, { useState, useEffect } from 'react';
import { GravitasVenue } from '../types';
import { gravitasService } from '../gravitasService';
import { VERIFIED_VIT_VENUES } from '../gravitasData';
import {
  MapPin,
  Compass,
  CheckCircle2,
  ExternalLink,
  Navigation,
  Building2,
  Layers,
} from 'lucide-react';

export const VenuesView: React.FC = () => {
  const [venues, setVenues] = useState<GravitasVenue[]>(VERIFIED_VIT_VENUES);
  const [selectedVenue, setSelectedVenue] = useState<GravitasVenue>(VERIFIED_VIT_VENUES[0]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadVenues() {
      const data = await gravitasService.getVenues();
      if (data && data.length > 0) {
        setVenues(data);
        setSelectedVenue(data[0]);
      }
      setLoading(false);
    }
    loadVenues();
  }, []);

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#FF7048] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              VIT Vellore Campus Venues
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Verified auditoriums, galleries, and tournament grounds hosting graVITas ’26.
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border-2 border-[#17151B] px-2 py-0.5 rounded ink-shadow-sm">
          👇 <strong>POINTING_DOWN</strong> scrolls venues
        </div>
      </div>

      {/* Campus Overview Selector Grid */}
      <div className="bg-[#FFF7E8] border-2 border-[#17151B] rounded-lg p-3 ink-shadow space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-black uppercase text-[#17151B] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> VIT Vellore Campus Hub
          </span>
          <span className="text-[10px] font-mono text-[#655E68]">
            {venues.length} Verified Festival Venues
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
          {venues.map((v) => {
            const isSelected = v.id === selectedVenue.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVenue(v)}
                className={`p-2 rounded border-2 border-[#17151B] text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#D8FF4F] font-black text-[#17151B] ink-shadow-sm'
                    : 'bg-white hover:bg-[#E9E0FF] text-[#17151B]'
                }`}
              >
                <div className="text-[11px] font-black truncate">{v.name}</div>
                <div className="text-[9px] font-mono text-[#655E68] truncate">
                  {v.building_name || v.campus}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Venue Spotlight */}
      <div className="p-4 rounded-lg bg-[#E9E0FF] border-2 border-[#17151B] ink-shadow space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#17151B]/15 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#17151B] text-[#D8FF4F]">
                {selectedVenue.campus}
              </span>
              <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded border border-[#17151B] flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                {selectedVenue.verification_status}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#17151B] mt-1 leading-snug">
              {selectedVenue.name}
            </h3>
            <p className="text-xs font-semibold text-[#655E68] flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-[#17151B]" />
              {selectedVenue.building_name} {selectedVenue.block_name ? `• ${selectedVenue.block_name}` : ''}
            </p>
          </div>

          <div className="text-right">
            {selectedVenue.floor && (
              <div className="text-[11px] font-mono font-bold text-[#17151B] px-2 py-0.5 rounded bg-white border border-[#17151B] inline-flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Floor: {selectedVenue.floor}</span>
              </div>
            )}
            {selectedVenue.room_number && (
              <div className="text-[10px] font-mono text-[#655E68] mt-1">
                Room: <strong>{selectedVenue.room_number}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Location & Directions */}
        <div className="space-y-2 text-xs text-[#17151B]">
          {selectedVenue.address_description && (
            <div>
              <strong className="block text-[11px] font-mono text-[#655E68] uppercase">
                Facility Description:
              </strong>
              <p className="font-medium mt-0.5">{selectedVenue.address_description}</p>
            </div>
          )}

          {selectedVenue.directions && (
            <div className="pt-2 border-t border-[#17151B]/15">
              <strong className="text-[#17151B] block mb-0.5 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-[#FF7048]" />
                Walking Route & Navigation:
              </strong>
              <p className="text-[#655E68] leading-snug font-medium">
                {selectedVenue.directions}
              </p>
            </div>
          )}

          {/* Coordinates & Map Link */}
          <div className="pt-2 border-t border-[#17151B]/15 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            {selectedVenue.latitude && selectedVenue.longitude ? (
              <span className="text-[#655E68]">
                GPS Coordinates: {selectedVenue.latitude}, {selectedVenue.longitude}
              </span>
            ) : (
              <span className="text-[#655E68]">Campus Grid Location Verified</span>
            )}

            <div className="flex items-center gap-3">
              {selectedVenue.official_map_url && (
                <a
                  href={selectedVenue.official_map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-[#17151B] hover:text-[#FF7048] flex items-center gap-1"
                >
                  <span>Official Campus Map</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {selectedVenue.source_url && (
                <a
                  href={selectedVenue.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-[#655E68] hover:text-[#17151B] flex items-center gap-1"
                >
                  <span>Verification Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Directory List of All Venues */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono font-black uppercase text-[#655E68] tracking-wider">
          All Verified Campus Locations ({venues.length})
        </h4>
        <div className="space-y-2">
          {venues.map((venue) => (
            <div
              key={venue.id}
              onClick={() => setSelectedVenue(venue)}
              className={`p-3 rounded-lg border-2 border-[#17151B] transition-all cursor-pointer flex flex-wrap items-center justify-between gap-2 ${
                venue.id === selectedVenue.id
                  ? 'bg-[#FFF7E8] border-l-[6px] border-l-[#D8FF4F] ink-shadow-sm'
                  : 'bg-white hover:bg-[#FFF7E8]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-black text-[#17151B]">{venue.name}</h5>
                  <span className="text-[10px] font-mono text-[#655E68]">
                    ({venue.building_name})
                  </span>
                </div>
                <p className="text-xs text-[#655E68] line-clamp-1 mt-0.5">
                  {venue.directions}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#E9E0FF] px-2 py-0.5 rounded border border-[#17151B]">
                  {venue.floor || 'Ground'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
