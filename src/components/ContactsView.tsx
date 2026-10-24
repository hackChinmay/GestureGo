import React from 'react';
import { ORGANIZER_CONTACTS } from '../campusData';
import { Phone, Mail, Building, ShieldAlert } from 'lucide-react';

export const ContactsView: React.FC = () => {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="border-b-2 border-[#17151B] pb-2.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#FF7048] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#17151B] uppercase tracking-tight">
              Organizers & Emergency Directory
            </h2>
          </div>
          <p className="text-xs text-[#655E68] mt-0.5">
            Faculty advisors, student leadership, security HQ, and technical support.
          </p>
        </div>

        <div className="text-[11px] font-mono text-[#17151B] bg-[#FFF7E8] border border-[#17151B] px-2 py-0.5 rounded">
          👇 <strong>POINTING_DOWN</strong> scrolls directory
        </div>
      </div>

      {/* Campus Emergency Notice */}
      <div className="p-3.5 rounded-lg bg-[#FF7048] border-2 border-[#17151B] ink-shadow text-[#17151B] flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 shrink-0 stroke-[2.5]" />
        <div>
          <strong className="text-sm font-black uppercase tracking-wide block">
            Emergency & Medical Response
          </strong>
          <p className="text-xs font-semibold mt-0.5 leading-snug">
            Immediate assistance: dial <strong>+1 (555) 019-9911</strong> or report to North Gate Security Pavilion.
          </p>
        </div>
      </div>

      {/* Directory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ORGANIZER_CONTACTS.map((c, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-lg bg-white border-2 border-[#17151B] ink-shadow space-y-2"
          >
            <div>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#17151B] text-[#D8FF4F]">
                {c.role}
              </span>
              <h3 className="text-base font-black text-[#17151B] mt-1.5">{c.name}</h3>
              <p className="text-xs text-[#655E68] font-medium">{c.dept}</p>
            </div>

            <div className="pt-2 border-t border-[#17151B]/20 space-y-1 text-xs text-[#17151B]">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-[#655E68]" />
                <span>Office: <strong className="font-mono">{c.office}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#655E68]" />
                <a href={`mailto:${c.email}`} className="text-[#17151B] underline hover:text-[#FF7048]">
                  {c.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#655E68]" />
                <a href={`tel:${c.phone}`} className="font-mono font-bold text-[#17151B] hover:underline">
                  {c.phone}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
