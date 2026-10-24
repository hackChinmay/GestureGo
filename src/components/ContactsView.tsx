import React from 'react';
import { ORGANIZER_CONTACTS } from '../campusData';
import { Phone, Mail, Building, ShieldAlert, LifeBuoy } from 'lucide-react';

export const ContactsView: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Organizer & Emergency Support Directory
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Campus security, event committee chairs, medical response, and kiosk engineering.
        </p>
      </div>

      {/* Emergency Notice Card */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-sm font-bold block text-white">Campus Emergency Desk</strong>
          <p className="mt-0.5 text-amber-300">
            For urgent safety or medical assistance, dial <strong>+1 (555) 019-9911</strong> or visit
            the First Response tent at North Portal Gate.
          </p>
        </div>
      </div>

      {/* Contacts Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {ORGANIZER_CONTACTS.map((c, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
          >
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                {c.role}
              </span>
              <h3 className="text-base font-bold text-white mt-1.5">{c.name}</h3>
              <p className="text-xs text-slate-400">{c.dept}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Office: <strong className="text-slate-200">{c.office}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${c.email}`} className="text-teal-400 hover:underline">
                  {c.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${c.phone}`} className="text-cyan-400 hover:underline font-mono">
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
