import React from 'react';
import { OFFICIAL_VIT_CONTACTS, OFFICIAL_FESTIVAL_INFO } from '../gravitasData';
import { Phone, Mail, Building, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';

export const ContactsView: React.FC = () => {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#FF7048] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              Official Festival & Campus Directory
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Verified contact details for graVITas ’26, Office of Students’ Welfare, and VIT Vellore emergency services.
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border-2 border-[#17151B] px-2 py-0.5 rounded ink-shadow-sm">
          👇 <strong>POINTING_DOWN</strong> scrolls directory
        </div>
      </div>

      {/* Campus Emergency Notice */}
      <div className="p-3.5 rounded-lg bg-[#FF7048] border-2 border-[#17151B] ink-shadow text-[#17151B] flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 shrink-0 stroke-[2.5]" />
        <div>
          <strong className="text-sm font-black uppercase tracking-wide block">
            VIT Campus Emergency & Medical Assistance
          </strong>
          <p className="text-xs font-semibold mt-0.5 leading-snug">
            Immediate assistance on campus: dial <strong>+91 416 220 9999</strong> (Health Centre) or <strong>+91 416 220 2222</strong> (Security Command Center).
          </p>
        </div>
      </div>

      {/* Directory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OFFICIAL_VIT_CONTACTS.map((c, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-lg bg-white border-2 border-[#17151B] ink-shadow space-y-2.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#17151B] text-[#D8FF4F]">
                  {c.role}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#17151B] bg-[#D8FF4F] px-1.5 py-0.2 rounded border border-[#17151B] flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Verified
                </span>
              </div>
              <h3 className="text-base font-black text-[#17151B] mt-1.5">{c.name}</h3>
              <p className="text-xs text-[#655E68] font-medium">{c.dept}</p>
            </div>

            <div className="pt-2 border-t border-[#17151B]/20 space-y-1.5 text-xs text-[#17151B]">
              <div className="flex items-start gap-2">
                <Building className="w-3.5 h-3.5 text-[#655E68] shrink-0 mt-0.5" />
                <span>Office: <strong className="font-mono">{c.office}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#655E68] shrink-0" />
                <a href={`mailto:${c.email}`} className="text-[#17151B] underline hover:text-[#FF7048] font-mono">
                  {c.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#655E68] shrink-0" />
                <a href={`tel:${c.phone}`} className="font-mono font-bold text-[#17151B] hover:underline">
                  {c.phone}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Official Website Reference Box */}
      <div className="p-3 bg-[#FFF7E8] border-2 border-[#17151B] rounded-lg ink-shadow text-xs flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-[#655E68]">
          Festival Central Web Portal: <strong>{OFFICIAL_FESTIVAL_INFO.officialUrl}</strong>
        </span>
        <a
          href={OFFICIAL_FESTIVAL_INFO.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded bg-white hover:bg-[#D8FF4F] text-[#17151B] border border-[#17151B] font-bold text-[11px] flex items-center gap-1 ink-shadow-sm"
        >
          <span>Visit graVITas Portal</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
