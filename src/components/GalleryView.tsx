import React, { useState, useEffect } from 'react';
import { GravitasPhoto, GravitasEvent } from '../types';
import { gravitasService } from '../gravitasService';
import {
  Image as ImageIcon,
  Filter,
  Maximize2,
  X,
  ExternalLink,
  Camera,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface GalleryViewProps {
  onSelectEvent?: (eventId: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ onSelectEvent }) => {
  const [photos, setPhotos] = useState<GravitasPhoto[]>([]);
  const [events, setEvents] = useState<GravitasEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeModalPhoto, setActiveModalPhoto] = useState<GravitasPhoto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [fetchedPhotos, fetchedEvents] = await Promise.all([
        gravitasService.getEventPhotos(),
        gravitasService.getEvents(),
      ]);
      setPhotos(fetchedPhotos);
      setEvents(fetchedEvents);
      setLoading(false);
    }
    loadData();
  }, []);

  const eventMap = new Map<string, GravitasEvent>();
  for (const ev of events) {
    eventMap.set(ev.id, ev);
  }

  // Filter photos
  const filteredPhotos = photos.filter((p) => {
    if (selectedEventId !== 'all') {
      if (selectedEventId === 'general') {
        if (p.event_id) return false;
      } else if (p.event_id !== selectedEventId) {
        return false;
      }
    }
    if (selectedType !== 'all' && p.image_type !== selectedType) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#17151B] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              graVITas ’26 Photo Archive & Gallery
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Verified event posters, festival photo logs, and campus media from VIT Vellore.
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border-2 border-[#17151B] px-2 py-0.5 rounded ink-shadow-sm">
          👇 <strong>POINTING_DOWN</strong> scrolls gallery
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FFF7E8] border-2 border-[#17151B] p-3 rounded-lg ink-shadow space-y-2.5">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="font-mono font-black text-[#17151B] flex items-center gap-1.5 uppercase text-[11px]">
            <Filter className="w-3.5 h-3.5" /> Filter Media ({filteredPhotos.length} records)
          </span>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {['all', 'poster', 'event_photo', 'gallery_photo'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border border-[#17151B] cursor-pointer transition-colors ${
                  selectedType === t
                    ? 'bg-[#17151B] text-[#D8FF4F]'
                    : 'bg-white hover:bg-[#E9E0FF] text-[#17151B]'
                }`}
              >
                {t === 'all' ? 'All Types' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Event Filter Select */}
        <div className="flex items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full text-xs font-bold bg-white border-2 border-[#17151B] rounded p-1.5 ink-shadow-sm cursor-pointer text-[#17151B] focus:outline-none"
          >
            <option value="all">All Events & Campus Atmosphere</option>
            <option value="general">General Campus Atmosphere (No Event)</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center bg-white border-2 border-[#17151B] rounded-lg space-y-2">
          <div className="w-6 h-6 border-3 border-[#17151B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold text-[#655E68]">
            Loading verified graVITas ’26 media from Supabase Storage...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPhotos.length === 0 && (
        <div className="p-8 text-center bg-white border-2 border-dashed border-[#17151B]/40 rounded-lg space-y-2">
          <ImageIcon className="w-10 h-10 mx-auto text-[#655E68]" />
          <h3 className="text-base font-black text-[#17151B] uppercase">No Matching Media Found</h3>
          <p className="text-xs text-[#655E68]">
            Try clearing active filters to view all verified festival photographs.
          </p>
          <button
            onClick={() => {
              setSelectedEventId('all');
              setSelectedType('all');
            }}
            className="mt-2 px-3 py-1 bg-[#D8FF4F] text-[#17151B] border border-[#17151B] font-bold text-xs rounded ink-shadow-sm cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Gallery Grid */}
      {!loading && filteredPhotos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredPhotos.map((photo) => {
            const relEvent = photo.event_id ? eventMap.get(photo.event_id) : null;
            return (
              <div
                key={photo.id}
                className="bg-white border-2 border-[#17151B] rounded-lg overflow-hidden ink-shadow flex flex-col group transition-transform hover:-translate-y-0.5"
              >
                {/* Visual Thumbnail Frame */}
                <div
                  className="h-44 bg-[#FFF7E8] border-b-2 border-[#17151B] relative flex items-center justify-center overflow-hidden cursor-pointer p-3"
                  onClick={() => setActiveModalPhoto(photo)}
                >
                  {/* Decorative Banner Background */}
                  <div className="absolute inset-0 bg-linear-to-br from-[#FFF7E8] via-[#E9E0FF]/40 to-[#D8FF4F]/20 flex flex-col justify-between p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#17151B] text-[#D8FF4F]">
                        {photo.image_type.replace('_', ' ')}
                      </span>
                      {photo.is_primary && (
                        <span className="font-mono font-black text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#D8FF4F] text-[#17151B] border border-[#17151B] flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Primary
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[#655E68] block truncate">
                        {photo.filename}
                      </span>
                      <p className="text-xs font-black text-[#17151B] line-clamp-2 leading-tight">
                        {photo.caption || photo.alt_text}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#655E68]">
                      <span>VIT Vellore Media</span>
                      <span className="group-hover:text-[#FF7048] font-bold flex items-center gap-1">
                        View <Maximize2 className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Metadata Footer */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    {relEvent ? (
                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#17151B]">
                        <Calendar className="w-3 h-3 text-[#FF7048]" />
                        <span className="truncate">Event: {relEvent.name}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-[#655E68]">
                        Campus Festival Grounds
                      </div>
                    )}
                    <p className="text-xs text-[#17151B] font-medium leading-snug line-clamp-2">
                      {photo.alt_text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#17151B]/15 flex items-center justify-between text-[10px] font-mono text-[#655E68]">
                    <span className="truncate max-w-[170px]">Credit: {photo.credit || 'Official VIT Media'}</span>
                    <a
                      href={photo.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#17151B] hover:text-[#FF7048] font-bold flex items-center gap-0.5 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Source</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeModalPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setActiveModalPhoto(null)}
        >
          <div
            className="w-full max-w-lg bg-[#FFF7E8] border-3 border-[#17151B] rounded-xl ink-shadow overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#17151B] text-white p-3 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D8FF4F]" />
                <span className="text-xs font-mono font-black uppercase text-[#D8FF4F]">
                  graVITas ’26 Media Archive
                </span>
              </div>
              <button
                onClick={() => setActiveModalPhoto(null)}
                className="p-1 rounded text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
              {/* Media Preview Plate */}
              <div className="bg-white border-2 border-[#17151B] rounded-lg p-5 text-center ink-shadow-sm space-y-2 bg-linear-to-b from-[#FFF7E8] to-white">
                <div className="w-16 h-16 rounded-full bg-[#D8FF4F] border-2 border-[#17151B] flex items-center justify-center mx-auto text-[#17151B]">
                  <Camera className="w-8 h-8 stroke-[2]" />
                </div>
                <h3 className="text-base font-black text-[#17151B] uppercase tracking-tight">
                  {activeModalPhoto.caption || activeModalPhoto.alt_text}
                </h3>
                <span className="inline-block px-2 py-0.5 rounded bg-[#17151B] text-[#D8FF4F] font-mono text-[10px] font-bold uppercase">
                  {activeModalPhoto.image_type.replace('_', ' ')}
                </span>
              </div>

              {/* Media Metadata Details */}
              <div className="bg-white border-2 border-[#17151B] rounded-lg p-3.5 space-y-2 text-xs font-mono text-[#17151B]">
                <div>
                  <span className="text-[#655E68] text-[10px] uppercase block">Filename</span>
                  <strong>{activeModalPhoto.filename}</strong>
                </div>
                <div>
                  <span className="text-[#655E68] text-[10px] uppercase block">Storage Path (Supabase Bucket)</span>
                  <span className="text-[#655E68] break-all">
                    {activeModalPhoto.bucket_name}/{activeModalPhoto.storage_path}
                  </span>
                </div>
                <div>
                  <span className="text-[#655E68] text-[10px] uppercase block">Accessible Description</span>
                  <p className="font-sans text-xs text-[#17151B]">{activeModalPhoto.alt_text}</p>
                </div>
                {activeModalPhoto.credit && (
                  <div>
                    <span className="text-[#655E68] text-[10px] uppercase block">Photo Credit</span>
                    <span>{activeModalPhoto.credit}</span>
                  </div>
                )}
                <div>
                  <span className="text-[#655E68] text-[10px] uppercase block">Official Verification Source</span>
                  <a
                    href={activeModalPhoto.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF7048] underline flex items-center gap-1 font-bold break-all"
                  >
                    <span>{activeModalPhoto.source_url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#FFF7E8] border-t-2 border-[#17151B] flex justify-end">
              <button
                onClick={() => setActiveModalPhoto(null)}
                className="px-4 py-1.5 rounded bg-[#17151B] text-white font-black text-xs cursor-pointer border-2 border-[#17151B]"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
