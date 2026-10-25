import React, { useState } from 'react';
import { EventRegistration } from '../types';
import { copyToClipboard, downloadPassFile } from '../registrationStore';
import { getSupabaseConfigDiagnostics } from '../supabaseClient';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Copy,
  Download,
  QrCode,
  Sparkles,
  Database,
  AlertTriangle,
} from 'lucide-react';

interface RegistrationPassModalProps {
  isOpen: boolean;
  registration: EventRegistration | null;
  onClose: () => void;
  isNewRegistration?: boolean;
}

/**
 * Deterministic SVG QR Code generator based on pass code.
 * Creates clean, sharp vector modules with standard corner finder patterns.
 */
function RenderPassQRCode({ code }: { code: string }) {
  // Generate a pseudo-random 19x19 boolean matrix seeded by the pass code
  const size = 19;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  // Helper to draw 7x7 finder pattern
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          grid[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(size - 7, 0); // Top-right
  drawFinder(0, size - 7); // Bottom-left

  // Timing patterns
  for (let i = 7; i < size - 7; i++) {
    if (i % 2 === 0) {
      grid[6][i] = true;
      grid[i][6] = true;
    }
  }

  // Hash-based data bits
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Don't overwrite finders
      const inTL = r < 8 && c < 8;
      const inTR = r < 8 && c >= size - 8;
      const inBL = r >= size - 8 && c < 8;
      if (!inTL && !inTR && !inBL && r !== 6 && c !== 6) {
        const bit = ((hash ^ (r * 31 + c * 17)) >>> ((r + c) % 16)) & 1;
        grid[r][c] = bit === 1;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-24 h-24 sm:w-28 sm:h-28 bg-white p-1 rounded border-2 border-[#17151B]"
      shapeRendering="crispEdges"
    >
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#17151B" /> : null
        )
      )}
    </svg>
  );
}

export const RegistrationPassModal: React.FC<RegistrationPassModalProps> = ({
  isOpen,
  registration,
  onClose,
  isNewRegistration = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const supabaseDiag = getSupabaseConfigDiagnostics();

  if (!isOpen || !registration) return null;

  const handleCopy = async () => {
    const ok = await copyToClipboard(registration.registrationCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadPassFile(registration);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-fade-in cursor-default"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-lg bg-[#FFF7E8] border-3 border-[#17151B] rounded-xl ink-shadow overflow-hidden flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-[#17151B] text-white p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#D8FF4F] stroke-[2.5]" />
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#D8FF4F]">
                GestureGo • graVITas ’26 @ VIT Vellore
              </span>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white leading-tight">
                Event Registration Pass
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded bg-[#FF7048] hover:bg-[#ff5722] text-[#17151B] border-2 border-[#17151B] font-black text-xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer ink-shadow-sm"
            title="Confirm registration and close modal (Thumbs Down 👎)"
          >
            <span>👎 Confirm &amp; Close</span>
          </button>
        </div>

        {/* Touchless Gesture Hint Bar - STRICTLY THUMBS DOWN */}
        <div className="bg-[#17151B] border-b-2 border-white/20 px-3.5 py-2 flex items-center justify-between text-xs font-mono text-white">
          <span className="flex items-center gap-2 font-bold">
            <span className="text-[#D8FF4F] uppercase tracking-wider font-black">Touchless Close:</span>
            <span className="bg-[#FF7048] text-[#17151B] px-2 py-0.5 rounded border border-white font-black flex items-center gap-1">
              👎 Thumbs Down
            </span>
            <span className="text-white text-[11px] sm:text-xs">Confirms Registration &amp; Closes Pass</span>
          </span>
          <span className="text-[10px] text-zinc-300 hidden sm:inline font-mono">
            Only 👎 closes window
          </span>
        </div>

        {/* Feedback Alert Banner */}
        <div
          className={`px-4 py-2 text-xs font-bold flex items-center gap-2 border-b-2 border-[#17151B] ${
            isNewRegistration
              ? 'bg-[#D8FF4F] text-[#17151B]'
              : 'bg-[#E9E0FF] text-[#17151B]'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>
            {isNewRegistration
              ? 'Registration pass generated! Show 👎 Thumbs Down to confirm and sync.'
              : 'Registration pass ready! Show 👎 Thumbs Down to confirm and sync.'}
          </span>
        </div>

        {/* Modal Body / Pass Card */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="bg-white border-2 border-[#17151B] rounded-lg p-4 ink-shadow-sm space-y-3.5 relative">
            {/* Pass Top Badge & Status */}
            <div className="flex items-center justify-between border-b-2 border-[#17151B]/15 pb-2.5">
              <span className="text-[11px] font-mono font-bold text-[#655E68] uppercase">
                Official Delegate Pass
              </span>
              <span className="bg-[#D8FF4F] text-[#17151B] font-mono font-black text-[11px] uppercase px-2 py-0.5 rounded border border-[#17151B] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                {registration.registrationStatus}
              </span>
            </div>

            {/* Event Name */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#655E68]">
                Registered Session
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#17151B] tracking-tight mt-0.5 leading-snug">
                {registration.eventNameSnapshot}
              </h3>
            </div>

            {/* Time & Location Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#FFF7E8] p-2.5 rounded border border-[#17151B]">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#17151B]">
                  <Calendar className="w-3.5 h-3.5 text-[#655E68]" />
                  <span>{registration.eventDate}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[#655E68]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{registration.eventTime}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#17151B]">
                  <MapPin className="w-3.5 h-3.5 text-[#FF7048]" />
                  <span className="truncate">{registration.venue}</span>
                </div>
                <div className="text-[11px] font-mono text-[#655E68]">
                  VIT Vellore Campus
                </div>
              </div>
            </div>

            {/* Code Box & QR Code Split */}
            <div className="pt-2 border-t-2 border-dashed border-[#17151B]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5 text-center sm:text-left w-full">
                <span className="text-[10px] font-mono font-black uppercase text-[#655E68] tracking-wider block">
                  Unique Registration Code
                </span>
                <div className="inline-block sm:block font-mono font-black text-xl sm:text-2xl text-[#17151B] bg-[#FFF7E8] border-2 border-[#17151B] px-3 py-1.5 rounded ink-shadow-sm tracking-wider">
                  {registration.registrationCode}
                </div>
                <p className="text-[10px] text-[#655E68] font-mono mt-1">
                  Registered: {new Date(registration.registeredAt).toLocaleString()}
                </p>
              </div>

              {/* QR Code Graphic */}
              <div className="flex flex-col items-center shrink-0">
                <RenderPassQRCode code={registration.registrationCode} />
                <span className="text-[9px] font-mono text-[#655E68] mt-1 text-center">
                  Local Kiosk Verification
                </span>
              </div>
            </div>
          </div>

          {/* Supabase Database Cloud Sync Status Indicator */}
          <div className="bg-white border-2 border-[#17151B] rounded-lg p-3 ink-shadow-sm text-xs font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-[#17151B]">
                <Database className="w-3.5 h-3.5 text-[#FF7048]" />
                <span>Supabase Cloud Sync:</span>
              </span>
              {supabaseDiag.isConfigured && supabaseDiag.isJwtAnon ? (
                <span className="bg-[#D8FF4F] text-[#17151B] px-2 py-0.5 rounded text-[10px] font-black border border-[#17151B] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Cloud Ready</span>
                </span>
              ) : (
                <span className="bg-[#FF7048]/20 text-[#FF7048] px-2 py-0.5 rounded text-[10px] font-black border border-[#FF7048] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Action Needed</span>
                </span>
              )}
            </div>

            {supabaseDiag.isPublishableFormat && !supabaseDiag.isJwtAnon ? (
              <div className="text-[11px] text-[#17151B] bg-[#FFF7E8] p-2.5 rounded border border-[#FF7048]/40 leading-relaxed font-sans">
                <span className="text-[#FF7048] font-black font-mono">⚠️ Supabase API Key Mismatch:</span> Your <code className="bg-white px-1 py-0.5 rounded border text-[10px] font-mono font-bold">.env</code> contains a <code className="bg-white px-1 py-0.5 rounded border text-[10px] font-mono font-bold">sb_publishable_...</code> key which Supabase PostgREST rejects with <strong>401 Invalid API Key</strong>.
                <div className="mt-1 font-semibold text-[#655E68]">
                  &rarr; Replace <code className="text-[#17151B] font-mono">VITE_SUPABASE_ANON_KEY</code> in <code className="text-[#17151B] font-mono">.env</code> with your project's <strong>JWT anon key</strong> (starts with <code className="text-[#17151B] font-mono font-bold">eyJ...</code>) from <em>Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project API Keys</em>.
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#655E68] font-sans">
                Showing <strong>👎 Thumbs Down</strong> will close this pass and record code <code className="font-mono font-bold text-[#17151B]">{registration.registrationCode}</code> into Supabase table <code className="font-mono text-[#17151B]">event_registrations</code>.
              </p>
            )}
          </div>

          <p className="text-[11px] text-[#655E68] text-center leading-relaxed font-medium">
            Saved to this device. You can revisit your registered pass at any time under the{' '}
            <strong>My Passes</strong> tab on the Schedule page.
          </p>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#FFF7E8] border-t-2 border-[#17151B] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#D8FF4F] text-[#17151B] border-2 border-[#17151B] font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ink-shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#E9E0FF] text-[#17151B] border-2 border-[#17151B] font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ink-shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Pass</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#17151B] hover:bg-[#FF7048] hover:text-[#17151B] text-[#D8FF4F] font-black text-xs transition-colors cursor-pointer border-2 border-[#17151B] ink-shadow flex items-center gap-1.5"
            title="Confirm registration and close pass (Thumbs Down 👎)"
          >
            <span className="text-base">👎</span>
            <span>Confirm &amp; Close Pass (Thumbs Down)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
